// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/// @dev Fraud registry interface for community-driven fraud flagging
interface IFraudRegistry {
    function isServiceBanned(address user) external view returns (bool);
    function requiresEscrow(address user) external view returns (bool);
    function escrowTransfer(address from, address to, uint256 amount) external returns (uint256);
}

/**
 * VFIDEToken (zkSync Era ready)
 * ----------------------------------------------------------
 * SUPPLY (ALL MINTED AT GENESIS):
 * - Total supply: 200,000,000 VFIDE (18 decimals)
 * - Dev reserve: 50,000,000 → DevReserveVestingVault (locked)
 * - Treasury/Operations: 150,000,000 → Treasury (liquidity, DEX, CEX, operations, ecosystem)
 * 
 * VAULT-ONLY (ON BY DEFAULT):
 * - Users MUST use vaults for transfers (enables recovery/ProofScore)
 * - Exchanges/contracts can be whitelisted by owner
 * - System contracts (sinks) auto-exempt
 * - Mints/burns always allowed
 * 
 * FEATURES:
 * - ProofScore-aware fees/burns via BurnRouter
 * - SecurityHub lock checks (PanicGuard/Guardian)
 * - ProofLedger event logging
 * - Policy lock (makes vault-only permanent)
 * - Circuit breaker (emergency bypass)
 * - Blacklist support
 * - EIP-2612 permit
 */

/// ─────────────────────────── ERC20 (no OZ deps; 0.8.x checked math)
contract VFIDEToken is Ownable, ReentrancyGuard {
    /// Constants
    string public constant name = "VFIDE Token";  // WHITEPAPER: "VFIDE Token"
    string public constant symbol = "VFIDE";
    uint8  public constant decimals = 18;

    uint256 public constant MAX_SUPPLY = 200_000_000e18;
    uint256 public constant DEV_RESERVE_SUPPLY = 50_000_000e18;
    bytes32 private constant EMPTY_CODE_HASH = keccak256("");

    // ─────────────────────────── Anti-Whale Protection
    // All limits configurable by owner, can be disabled by setting to 0
    uint256 public maxTransferAmount = 2_000_000e18;     // 2M VFIDE max per transfer (1% of supply)
    uint256 public maxWalletBalance = 4_000_000e18;      // 4M VFIDE max per wallet (2% of supply)
    uint256 public dailyTransferLimit = 5_000_000e18;    // 5M VFIDE max per 24h (2.5% of supply)
    uint256 public transferCooldown = 0;                  // Seconds between transfers (0 = disabled)
    
    // Tracking for daily limits and cooldowns
    mapping(address => uint256) public dailyTransferred;
    mapping(address => uint256) public dailyResetTime;
    mapping(address => uint256) public lastTransferTime;
    
    // Exemptions from whale limits (exchanges, contracts, etc.)
    mapping(address => bool) public whaleLimitExempt;
    
    event AntiWhaleSet(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown);
    event WhaleLimitExemptSet(address indexed addr, bool exempt);

    /// Storage
    uint256 public totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    /// Modules & config
    IVaultHub public vaultHub;                    // vault registry (required)
    IProofLedger public ledger;                   // event logging (optional)
    IProofScoreBurnRouterToken public burnRouter; // fee calculator (optional)

    /// Fraud registry — community-driven fraud flagging
    /// Flagged addresses (3+ complaints) have transfers escrowed for 30 days
    IFraudRegistry public fraudRegistry;

    // 48-hour timelock for fraud registry changes
    address public pendingFraudRegistry;
    uint64  public pendingFraudRegistryAt;
    event FraudRegistryScheduled(address indexed registry, uint64 effectiveAt);
    event FraudRegistrySet(address indexed registry);

    /// Policy settings
    bool public vaultOnly = true;                 // VAULT-ONLY ON BY DEFAULT (user security)
    bool public policyLocked = false;             // once locked, cannot disable vault-only
    bool public circuitBreaker = false;           // H-02 FIX: emergency status flag; does NOT implicitly bypass fees (use setFeeBypass separately)
    uint256 public circuitBreakerExpiry = 0;      // auto-disable timestamp (0 = indefinite)
    uint256 public constant MAX_CIRCUIT_BREAKER_DURATION = 7 days; // maximum allowed duration
    bool public feeBypass = false;                // bypass BurnRouter fee calculation only
    uint256 public feeBypassExpiry = 0;
    uint64 public feeBypassActivatedAt = 0;       // L-3 FIX: cooldown anchor for fee bypass
    
    /// Exemptions
    mapping(address => bool) public systemExempt; // bypass all checks (sinks, etc)
    mapping(address => bool) public whitelisted;  // bypass vault-only (exchanges)

    // Sinks (fallbacks if router is unset or returns zero sinks)
    address public treasurySink;  // sanctuary/treasury receiver for charity share
    address public sanctumSink; // Optional: Burn to Sanctum instead of 0x0

    // 48-hour timelock for fee-sink and burn-router changes
    uint64 public constant SINK_CHANGE_DELAY = 48 hours;
    address public pendingBurnRouter;
    uint64  public pendingBurnRouterAt;
    address public pendingTreasurySink;
    uint64  public pendingTreasurySinkAt;
    address public pendingSanctumSink;
    uint64  public pendingSanctumSinkAt;

    address public pendingVaultHub;
    uint64  public pendingVaultHubAt;

    /// F-05 FIX: Add timelock state for ledger changes (matches other module setters)
    address public pendingLedger;
    uint64  public pendingLedgerAt;

    address public pendingExemptAddr;
    bool    public pendingExemptStatus;
    uint64  public pendingExemptAt;
    address public pendingWhitelistAddr;
    bool    public pendingWhitelistStatus;
    uint64  public pendingWhitelistAt;

    /// H-01 FIX: Timelock for circuit-breaker activation (48-hour delay to prevent surprise bypass).
    bool    public pendingCircuitBreakerActive;
    uint256 public pendingCircuitBreakerDuration;
    uint64  public pendingCircuitBreakerAt;
    
    

    // EIP-2612 Permit
    bytes32 private _cachedDomainSeparator;
    uint256 private _cachedChainId;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    /// Events
    event VaultHubSet(address indexed hub);
    event VaultHubScheduled(address indexed hub, uint64 effectiveAt);

    event LedgerSet(address indexed ledger);
    event LedgerScheduled(address indexed ledger, uint64 effectiveAt);
    event BurnRouterSet(address indexed router);
    event BurnRouterScheduled(address indexed router, uint64 effectiveAt);
    event TreasurySinkSet(address indexed sink);
    event TreasurySinkScheduled(address indexed sink, uint64 effectiveAt);
    event SanctumSinkSet(address indexed sink);
    event SanctumSinkScheduled(address indexed sink, uint64 effectiveAt);
    event SystemExemptSet(address indexed who, bool isExempt);
    event SystemExemptProposed(address indexed who, bool isExempt, uint64 effectiveAt);
    event WhitelistProposed(address indexed addr, bool status, uint64 effectiveAt);
    event Whitelisted(address indexed addr, bool status);
    event VaultOnlySet(bool enabled);
    event ExemptSet(address indexed target, bool exempt);
    event PolicyLocked();
    event CircuitBreakerSet(bool active, uint256 expiry);
    event CircuitBreakerProposed(bool active, uint256 duration, uint64 effectiveAt); // H-01 FIX
    event FeeBypassSet(bool active, uint256 expiry);      // T-12 FIX: emit on bypass change
    event ExternalCallFailed(string indexed context, bytes reason);
    event FeeApplied(address indexed from, address indexed to, uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, address indexed sanctumSink, address ecosystemSink);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// Errors
    error VF_ZERO();
    error VF_CAP();
    error VF_LOCKED();
    error VF_POLICY_LOCKED();
    error Token_NotVault();
    error VF_MaxTransferExceeded();
    error VF_MaxWalletExceeded();
    error VF_DailyLimitExceeded();
    error VF_TransferCooldown();
    error VF_ZeroAddress();
    error VF_NoPending();
    error VF_TimelockActive();
    error VF_InvalidDuration();
    error VF_InsufficientBalance();

    /// Constructor: mint full supply and distribute at genesis
    constructor(
        address devReserveVestingVault, // MUST be deployed before token (receives 50M locked)
        address treasury,               // Treasury/Owner address (receives 150M for operations/liquidity)
        address _vaultHub,              // MAY be zero at deploy; can be set later
        address _ledger,                // optional
        address _treasurySink           // recommended: EcoTreasuryVault
    ) {
        if (devReserveVestingVault == address(0)) revert VF_ZERO();
        if (treasury == address(0)) revert VF_ZERO();

        // Require dev vault is a contract to prevent misconfig
        uint256 size;
        assembly { size := extcodesize(devReserveVestingVault) }
        require(size > 0, "devVault !contract");
        // Treasury can be EOA or contract (for multisig/DAO)

        // Optional modules (can be set later)
        if (_vaultHub != address(0)) {
            vaultHub = IVaultHub(_vaultHub);
            emit VaultHubSet(_vaultHub);
        }
        if (_ledger != address(0)) {
            ledger = IProofLedger(_ledger);
            emit LedgerSet(_ledger);
        }
        if (_treasurySink != address(0)) {
            treasurySink = _treasurySink;
            emit TreasurySinkSet(_treasurySink);
        }

        // Exempt genesis allocation addresses from whale limits
        whaleLimitExempt[devReserveVestingVault] = true;
        whaleLimitExempt[treasury] = true;

        // EIP-712 Domain Separator (cached + dynamic)
        _cachedChainId = block.chainid;
        _cachedDomainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );

        // Mint full 200M supply at genesis and distribute
        totalSupply = MAX_SUPPLY;
        
        // 50M to Dev Reserve Vesting Vault (locked)
        _balances[devReserveVestingVault] = DEV_RESERVE_SUPPLY;
        emit Transfer(address(0), devReserveVestingVault, DEV_RESERVE_SUPPLY);
        _logEv(devReserveVestingVault, "premint_dev_reserve", DEV_RESERVE_SUPPLY, "50M locked");
        
        // 150M to Treasury (operations, liquidity, DEX seeding, CEX, ecosystem: 200M - 50M dev)
        uint256 treasuryAmount = MAX_SUPPLY - DEV_RESERVE_SUPPLY;
        _balances[treasury] = treasuryAmount;
        emit Transfer(address(0), treasury, treasuryAmount);
        _logEv(treasury, "premint_treasury", treasuryAmount, "150M for operations");
    }

    // ─────────────────────────── ERC20 standard

    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }
    function allowance(address owner_, address spender) external view returns (uint256) { return _allowances[owner_][spender]; }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 added) external returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + added);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtracted) external returns (bool) {
        uint256 cur = _allowances[msg.sender][spender];
        require(cur >= subtracted, "allow underflow");
        _approve(msg.sender, spender, cur - subtracted);
        return true;
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        if (block.chainid == _cachedChainId) {
            return _cachedDomainSeparator;
        }
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(block.timestamp <= deadline, "VFIDE: expired deadline");
        // F-01 FIX: Reject malleable signatures (EIP-2 / secp256k1 upper bound on s)
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            "VFIDE: invalid s value"
        );
        require(v == 27 || v == 28, "VFIDE: invalid v value");
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++));
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0) && signer == owner, "VFIDE: invalid signature");
        _approve(owner, spender, value);
    }

    function transfer(address to, uint256 amount) external nonReentrant returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external nonReentrant returns (bool) {
        // System-exempt protocol modules must remain operable even if accidentally sanctioned.
        uint256 cur = _allowances[from][msg.sender];
        require(cur >= amount, "allow");
        _approve(from, msg.sender, cur - amount);
        _transfer(from, to, amount);
        return true;
    }

    /// @notice Permanently remove tokens from circulation, reducing totalSupply.
    /// @dev Hard-burns the caller's own tokens by decrementing their balance and totalSupply,
    ///      then emitting Transfer(..., address(0), ...).  Exchange trackers (CoinGecko,
    ///      CoinMarketCap, DEX Screener) read totalSupply() directly.
    function burn(uint256 amount) external nonReentrant {
        if (amount == 0) revert VF_ZERO();
        uint256 bal = _balances[msg.sender];
        if (bal < amount) revert VF_InsufficientBalance();
        unchecked { _balances[msg.sender] = bal - amount; }
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
        _logEv(msg.sender, "burn", amount, "");
    }

    // ─────────────────────────── Admin / Modules

    function setVaultHub(address hub) external onlyOwner {
        if (hub == address(0)) revert VF_ZeroAddress();
        require(pendingVaultHubAt == 0, "VF: pending vault hub exists");
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingVaultHub = hub;
        pendingVaultHubAt = effectiveAt;
        emit VaultHubScheduled(hub, effectiveAt);
        _log("vault_hub_scheduled");
    }

    function applyVaultHub() external onlyOwner {
        if (pendingVaultHubAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingVaultHubAt) revert VF_TimelockActive();
        vaultHub = IVaultHub(pendingVaultHub);
        emit VaultHubSet(pendingVaultHub);
        delete pendingVaultHub;
        delete pendingVaultHubAt;
        _log("vault_hub_set");
    }

    function cancelVaultHub() external onlyOwner {
        if (pendingVaultHubAt == 0) revert VF_NoPending();
        delete pendingVaultHub;
        delete pendingVaultHubAt;
        _log("vault_hub_cancelled");
    }

    // ── SecurityHub functions REMOVED — non-custodial, no third-party locks ──

    /// F-05 FIX: setLedger now uses 48h timelock (matches all other module setters)
    function setLedger(address _ledger) external onlyOwner {
        if (policyLocked && _ledger == address(0)) revert VF_POLICY_LOCKED();
        require(pendingLedgerAt == 0, "VF: pending ledger exists");
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingLedger = _ledger;
        pendingLedgerAt = effectiveAt;
        emit LedgerScheduled(_ledger, effectiveAt);
        _log("ledger_scheduled");
    }

    function applyLedger() external onlyOwner {
        if (pendingLedgerAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingLedgerAt) revert VF_TimelockActive();
        ledger = IProofLedger(pendingLedger);
        emit LedgerSet(pendingLedger);
        delete pendingLedger;
        delete pendingLedgerAt;
        _log("ledger_set");
    }

    function cancelLedger() external onlyOwner {
        if (pendingLedgerAt == 0) revert VF_NoPending();
        delete pendingLedger;
        delete pendingLedgerAt;
        _log("ledger_cancelled");
    }

    function setBurnRouter(address router) external onlyOwner {
        if (policyLocked && router == address(0)) revert VF_POLICY_LOCKED();
        require(pendingBurnRouterAt == 0, "VF: pending burn router exists");
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingBurnRouter = router;
        pendingBurnRouterAt = effectiveAt;
        emit BurnRouterScheduled(router, effectiveAt);
        _log("burn_router_scheduled");
    }

    function applyBurnRouter() external onlyOwner {
        if (pendingBurnRouterAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingBurnRouterAt) revert VF_TimelockActive();
        burnRouter = IProofScoreBurnRouterToken(pendingBurnRouter);
        emit BurnRouterSet(pendingBurnRouter);
        delete pendingBurnRouter;
        delete pendingBurnRouterAt;
        _log("burn_router_set");
    }

    function cancelBurnRouter() external onlyOwner {
        if (pendingBurnRouterAt == 0) revert VF_NoPending();
        delete pendingBurnRouter;
        delete pendingBurnRouterAt;
        _log("burn_router_cancelled");
    }

    function setTreasurySink(address sink) external onlyOwner {
        if (policyLocked && sink == address(0)) revert VF_POLICY_LOCKED();
        require(pendingTreasurySinkAt == 0, "VF: pending treasury sink exists");
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingTreasurySink = sink;
        pendingTreasurySinkAt = effectiveAt;
        emit TreasurySinkScheduled(sink, effectiveAt);
        _log("treasury_sink_scheduled");
    }

    function applyTreasurySink() external onlyOwner {
        if (pendingTreasurySinkAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingTreasurySinkAt) revert VF_TimelockActive();
        treasurySink = pendingTreasurySink;
        emit TreasurySinkSet(pendingTreasurySink);
        delete pendingTreasurySink;
        delete pendingTreasurySinkAt;
        _log("treasury_sink_set");
    }

    function cancelTreasurySink() external onlyOwner {
        if (pendingTreasurySinkAt == 0) revert VF_NoPending();
        delete pendingTreasurySink;
        delete pendingTreasurySinkAt;
        _log("treasury_sink_cancelled");
    }

    function setSanctumSink(address _sanctum) external onlyOwner {
        if (policyLocked && _sanctum == address(0)) revert VF_POLICY_LOCKED();
        require(pendingSanctumSinkAt == 0, "VF: pending sanctum sink exists");
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingSanctumSink = _sanctum;
        pendingSanctumSinkAt = effectiveAt;
        emit SanctumSinkScheduled(_sanctum, effectiveAt);
        _log("sanctum_sink_scheduled");
    }

    function applySanctumSink() external onlyOwner {
        if (pendingSanctumSinkAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingSanctumSinkAt) revert VF_TimelockActive();
        sanctumSink = pendingSanctumSink;
        emit SanctumSinkSet(pendingSanctumSink);
        delete pendingSanctumSink;
        delete pendingSanctumSinkAt;
        _log("sanctum_sink_set");
    }

    function cancelSanctumSink() external onlyOwner {
        if (pendingSanctumSinkAt == 0) revert VF_NoPending();
        delete pendingSanctumSink;
        delete pendingSanctumSinkAt;
        _log("sanctum_sink_cancelled");
    }

    function setFraudRegistry(address _registry) external onlyOwner {
        require(pendingFraudRegistryAt == 0, "VF: pending fraud registry exists");
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingFraudRegistry = _registry;
        pendingFraudRegistryAt = effectiveAt;
        emit FraudRegistryScheduled(_registry, effectiveAt);
        _log("fraud_registry_scheduled");
    }

    function applyFraudRegistry() external onlyOwner {
        if (pendingFraudRegistryAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingFraudRegistryAt) revert VF_TimelockActive();
        fraudRegistry = IFraudRegistry(pendingFraudRegistry);
        emit FraudRegistrySet(pendingFraudRegistry);
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        _log("fraud_registry_set");
    }

    function cancelFraudRegistry() external onlyOwner {
        if (pendingFraudRegistryAt == 0) revert VF_NoPending();
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        _log("fraud_registry_cancelled");
    }

    /// @notice Propose system exemption with 48-hour timelock (grants bypass of ALL fees and vault rules)
    function proposeSystemExempt(address who, bool isExempt) external onlyOwner {
        if (who == address(0)) revert VF_ZeroAddress();
        // F-06 FIX: Revert if a pending proposal already exists (prevents silent override)
        require(pendingExemptAt == 0, "VF: existing proposal pending");
        pendingExemptAddr = who;
        pendingExemptStatus = isExempt;
        pendingExemptAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        emit SystemExemptProposed(who, isExempt, pendingExemptAt);
        _logEv(who, "exempt_proposed", 0, "");
    }

    /// @notice Cancel a pending system exempt proposal (F-06 FIX added)
    function cancelPendingExempt() external onlyOwner {
        require(pendingExemptAt != 0, "VF: nothing pending");
        delete pendingExemptAddr;
        delete pendingExemptStatus;
        delete pendingExemptAt;
    }

    /// @notice Confirm a pending system exempt after timelock elapses
    function confirmSystemExempt() external onlyOwner {
        if (pendingExemptAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingExemptAt) revert VF_TimelockActive();
        address who = pendingExemptAddr;
        bool status = pendingExemptStatus;
        systemExempt[who] = status;
        emit SystemExemptSet(who, status);
        _logEv(who, status ? "exempt_on" : "exempt_off", 0, "");
        delete pendingExemptAddr;
        delete pendingExemptStatus;
        delete pendingExemptAt;
    }

    /// @notice Propose whitelist entry with 48-hour timelock (grants bypass of vault-only)
    function proposeWhitelist(address addr, bool status) external onlyOwner {
        if (addr == address(0)) revert VF_ZeroAddress();
        require(pendingWhitelistAt == 0, "VF: pending whitelist exists");
        pendingWhitelistAddr = addr;
        pendingWhitelistStatus = status;
        pendingWhitelistAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        emit WhitelistProposed(addr, status, pendingWhitelistAt);
        _logEv(addr, "whitelist_proposed", 0, "");
    }

    /// @notice Cancel a pending whitelist proposal
    function cancelPendingWhitelist() external onlyOwner {
        require(pendingWhitelistAt != 0, "VF: nothing pending");
        delete pendingWhitelistAddr;
        delete pendingWhitelistStatus;
        delete pendingWhitelistAt;
    }

    /// @notice Confirm a pending whitelist change after timelock elapses
    function confirmWhitelist() external onlyOwner {
        if (pendingWhitelistAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingWhitelistAt) revert VF_TimelockActive();
        address addr = pendingWhitelistAddr;
        bool status = pendingWhitelistStatus;
        whitelisted[addr] = status;
        emit Whitelisted(addr, status);
        _logEv(addr, status ? "whitelist_add" : "whitelist_remove", 0, "");
        delete pendingWhitelistAddr;
        delete pendingWhitelistStatus;
        delete pendingWhitelistAt;
    }

    function setVaultOnly(bool enabled) external onlyOwner {
        if (policyLocked && !enabled) revert VF_POLICY_LOCKED();
        vaultOnly = enabled;
        emit VaultOnlySet(enabled);
        _log(enabled ? "vault_only_on" : "vault_only_off");
    }

    /// One-way switch that makes policy non-optional post-launch.
    function lockPolicy() external onlyOwner {
        policyLocked = true;
        emit PolicyLocked();
        _log("policy_locked");
    }

    /// Emergency switch to bypass external calls (SecurityHub/BurnRouter) if they fail.
    /// Can be toggled even if policyLocked is true, to ensure liveness.
    /**
     * @notice H-01 FIX: Propose activating the circuit breaker with a 48-hour timelock.
     * @dev Deactivation remains instant for liveness. Only activation requires a timelock.
     * @param _active True to propose enabling; false to immediately disable.
     * @param _duration Duration in seconds (max 7 days). Ignored when disabling.
     */
    function setCircuitBreaker(bool _active, uint256 _duration) external onlyOwner {
        _syncEmergencyFlags();
        if (!_active) {
            // Immediate disable is always allowed for liveness
            circuitBreaker = false;
            circuitBreakerExpiry = 0;
            pendingCircuitBreakerAt = 0;
            emit CircuitBreakerSet(false, 0);
            _log("circuit_breaker_off");
        } else {
            // Activation requires a 48-hour timelock
            if (_duration == 0 || _duration > MAX_CIRCUIT_BREAKER_DURATION) revert VF_InvalidDuration();
            pendingCircuitBreakerActive = true;
            pendingCircuitBreakerDuration = _duration;
            pendingCircuitBreakerAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
            emit CircuitBreakerProposed(true, _duration, pendingCircuitBreakerAt);
            _log("circuit_breaker_proposed");
        }
    }

    /// @notice Apply a pending circuit breaker activation after the 48-hour timelock.
    function confirmCircuitBreaker() external onlyOwner {
        if (pendingCircuitBreakerAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingCircuitBreakerAt) revert VF_TimelockActive();
        _syncEmergencyFlags();
        circuitBreaker = true;
        circuitBreakerExpiry = block.timestamp + pendingCircuitBreakerDuration;
        pendingCircuitBreakerAt = 0;
        emit CircuitBreakerSet(true, circuitBreakerExpiry);
        _log("circuit_breaker_on");
    }

    // ── setSecurityBypass REMOVED — no SecurityHub lock checks to bypass ──

    /// @notice Bypass BurnRouter fees only
    /// @dev L-3 FIX: Re-activation requires a 1-day cooldown from the previous activation.
    function setFeeBypass(bool _active, uint256 _duration) external onlyOwner {
        _syncEmergencyFlags();
        if (_active) {
            if (_duration == 0 || _duration > MAX_CIRCUIT_BREAKER_DURATION) revert VF_InvalidDuration();
            if (feeBypassActivatedAt > 0 && block.timestamp < uint256(feeBypassActivatedAt) + 1 days)
                revert VF_TimelockActive();
            feeBypassActivatedAt = uint64(block.timestamp);
            feeBypass = true;
            feeBypassExpiry = block.timestamp + _duration;
        } else {
            feeBypass = false;
            feeBypassExpiry = 0;
        }
        emit FeeBypassSet(_active, feeBypassExpiry); // T-12 FIX: emit event
        _log(_active ? "fee_bypass_on" : "fee_bypass_off");
    }
    
    /**
     * @notice Check if circuit breaker is currently active (respects expiry)
     * @return True if circuit breaker is active and not expired
     */
    function isCircuitBreakerActive() public view returns (bool) {
        if (!circuitBreaker) return false;
        if (circuitBreakerExpiry > 0 && block.timestamp >= circuitBreakerExpiry) return false;
        return true;
    }

    /// @notice Check if fee bypass is active (independent of circuit breaker).
    /// @dev H-02 FIX: Circuit breaker no longer implicitly enables fee bypass.
    ///      Use setFeeBypass() to explicitly disable BurnRouter fee collection.
    ///      Keeping bypasses independent means each must be explicitly activated.
    function isFeeBypassed() public view returns (bool) {
        if (!feeBypass) return false;
        if (feeBypassExpiry > 0 && block.timestamp >= feeBypassExpiry) return false;
        return true;
    }

    /**
    // ── Freeze/Blacklist REMOVED ──────────────────────────────
    // VFIDE is non-custodial. No entity — not the deployer, not
    // the DAO, not any contract — can freeze, blacklist, or
    // control another user's tokens. Users protect themselves
    // through their vault: guardians, spend limits, pause,
    // withdrawal queue. Third-party fund control does not exist.
    // ─────────────────────────────────────────────────────────

    // ─────────────────────────── Anti-Whale Admin Functions
    
    /**
     * @notice Set anti-whale limits (set to 0 to disable any limit)
     * @param _maxTransfer Max tokens per single transfer (0 = disabled)
     * @param _maxWallet Max tokens per wallet (0 = disabled)
     * @param _dailyLimit Max tokens transferred per 24h (0 = disabled)
     * @param _cooldown Seconds between transfers (0 = disabled)
     */
    function setAntiWhale(
        uint256 _maxTransfer,
        uint256 _maxWallet,
        uint256 _dailyLimit,
        uint256 _cooldown
    ) external onlyOwner {
        // Sanity checks: limits should be reasonable if enabled
        if (_maxTransfer > 0) require(_maxTransfer >= 100_000e18, "min 100k");
        if (_maxWallet > 0) require(_maxWallet >= 200_000e18, "min 200k");
        if (_dailyLimit > 0) require(_dailyLimit >= 500_000e18, "min 500k");
        if (_cooldown > 0) require(_cooldown <= 1 hours, "max 1 hour cooldown");
        
        maxTransferAmount = _maxTransfer;
        maxWalletBalance = _maxWallet;
        dailyTransferLimit = _dailyLimit;
        transferCooldown = _cooldown;
        
        emit AntiWhaleSet(_maxTransfer, _maxWallet, _dailyLimit, _cooldown);
        _log("anti_whale_updated");
    }
    
    /**
     * @notice Exempt address from whale limits (for exchanges, liquidity pools, etc.)
     */
    function setWhaleLimitExempt(address addr, bool exempt) external onlyOwner {
        whaleLimitExempt[addr] = exempt;
        emit WhaleLimitExemptSet(addr, exempt);
    }

    // ─────────────────────────── Internal core

    function _transfer(address from, address to, uint256 amount) internal {
        _syncEmergencyFlags();
        if (from == address(0) || to == address(0)) revert VF_ZERO();
        if (amount == 0) revert VF_ZERO();

        address logicalTo = to;
        address custodyTo = to;


        // Route EOA receipts into the recipient's vault without changing the fee/scoring context.
        if (vaultOnly && address(vaultHub) != address(0)) {
            if (!_isContract(logicalTo) && !systemExempt[logicalTo] && !whitelisted[logicalTo]) {
                if (!_hasVault(logicalTo)) {
                    try vaultHub.ensureVault(logicalTo) returns (address vault) {
                        _logEv(vault, "vault_auto_created", 0, "");
                    } catch {
                        revert Token_NotVault();
                    }
                }

                custodyTo = _vaultOfAddr(logicalTo);
                if (custodyTo == address(0)) revert Token_NotVault();
            }
        }

        // 2. Anti-whale checks (skip for exempt addresses like exchanges, mints, burns)
        if (!whaleLimitExempt[from] && !whaleLimitExempt[custodyTo] && 
            !systemExempt[from] && !systemExempt[logicalTo]) {
            _checkWhaleProtection(from, custodyTo, amount);
        }

        // 3. Auto-create vaults if needed (vault-only enforcement)
        if (vaultOnly && address(vaultHub) != address(0)) {
            // 3. Vault-only enforcement
            // FROM must be: mint, system exempt, whitelisted, vault, or owns a vault
            bool fromOk = (from == address(0) || systemExempt[from] || whitelisted[from] || 
                          _isVault(from) || _hasVault(from));
            
            // TO must be: burn, sink, system exempt, whitelisted, vault, or owns a vault
            bool toOk = (logicalTo == address(0) || logicalTo == treasurySink || logicalTo == sanctumSink || 
                        systemExempt[logicalTo] || whitelisted[logicalTo] || _isVault(custodyTo) || _hasVault(logicalTo));
            
            if (!fromOk) revert Token_NotVault();
            if (!toOk) revert Token_NotVault();
        }

        // (Zero address and amount checks were moved to the top of _transfer)

        // ── SecurityHub lock check REMOVED ──────────────────────
        // No external contract can block a user's transfer.
        // Vault protection is through the user's own guardians
        // (pause, spend limits, withdrawal queue).
        // ────────────────────────────────────────────────────────

        // Balance update: pull from sender
        uint256 bal = _balances[from];
        if (bal < amount) revert VF_InsufficientBalance();
        unchecked { _balances[from] = bal - amount; }

        uint256 remaining = amount;

        // Dynamic fees via burn router (if present and not exempt and not bypassed)
        if (address(burnRouter) != address(0) && !isFeeBypassed() && !(systemExempt[from] || systemExempt[logicalTo])) {
            address feeFrom = _resolveFeeScoringAddress(from);
            try burnRouter.computeFeesAndReserve(feeFrom, logicalTo, amount) returns (
                uint256 _burnAmt,
                uint256 _sanctumAmt,
                uint256 _ecoAmt,
                address _sanctumSink,
                address _ecoSink,
                address _burnSink
            ) {
                // Validate fee sum cannot exceed transfer amount (prevents malicious router DoS)
                require(_burnAmt + _sanctumAmt + _ecoAmt <= amount, "VF: fees exceed amount");

                // F-17/C-01 FIX: Validate all returned sink addresses against token-level configuration.
                if (_sanctumSink != address(0)) {
                    require(
                        _sanctumSink == sanctumSink || _sanctumSink == treasurySink,
                        "VF: invalid sanctum sink"
                    );
                }
                if (_ecoSink != address(0)) {
                    require(
                        _ecoSink == treasurySink || _ecoSink == sanctumSink,
                        "VF: invalid eco sink"
                    );
                }
                if (_burnSink != address(0)) {
                    require(
                        _burnSink == treasurySink || _burnSink == sanctumSink,
                        "VF: invalid burn sink"
                    );
                }

                if (_burnAmt > 0) {
                    address sink = (_burnSink == address(0)) ? address(0) : _burnSink;
                    _applyBurn(from, sink, _burnAmt);
                    remaining -= _burnAmt;
                }
                if (_sanctumAmt > 0) {
                    address sink2 = (_sanctumSink == address(0)) ? treasurySink : _sanctumSink;
                    require(sink2 != address(0), "sanctum sink=0");
                    _balances[sink2] += _sanctumAmt;
                    emit Transfer(from, sink2, _sanctumAmt);
                    remaining -= _sanctumAmt;
                }
                if (_ecoAmt > 0) {
                    address sink3 = (_ecoSink == address(0)) ? treasurySink : _ecoSink;
                    require(sink3 != address(0), "eco sink=0");
                    _balances[sink3] += _ecoAmt;
                    emit Transfer(from, sink3, _ecoAmt);
                    remaining -= _ecoAmt;
                }

                if (_burnAmt > 0 || _sanctumAmt > 0 || _ecoAmt > 0) {
                    emit FeeApplied(from, logicalTo, _burnAmt, _sanctumAmt, _ecoAmt, (_sanctumSink == address(0) ? treasurySink : _sanctumSink), (_ecoSink == address(0) ? treasurySink : _ecoSink));
                }

                // Record volume for adaptive fee tracking (sustainability)
                try IProofScoreBurnRouter(address(burnRouter)).recordVolume(amount) {} catch (bytes memory reason) { emit ExternalCallFailed("recordVolume", reason); }
            } catch (bytes memory reason) {
                emit ExternalCallFailed("computeFeesAndReserve", reason);
            }
        } else {
            // If policy is locked we require a router be present so fees cannot be bypassed
            if (policyLocked && !isFeeBypassed()) {
                require(address(burnRouter) != address(0), "router required");
            }
        }

        if (!whaleLimitExempt[from] && !whaleLimitExempt[custodyTo] &&
            !systemExempt[from] && !systemExempt[logicalTo]) {
            _recordActualDailyTransfer(from, remaining);
        }

        // ── Fraud escrow: flagged senders get 30-day delay ─────
        // Not a freeze. Tokens are held for 30 days then delivered.
        // Community-driven: requires 3 complaints from trusted users.
        if (address(fraudRegistry) != address(0) &&
            !systemExempt[from] && !systemExempt[logicalTo] &&
            fraudRegistry.requiresEscrow(from)) {
            // Send tokens to FraudRegistry contract (it holds them for 30 days)
            _balances[address(fraudRegistry)] += remaining;
            emit Transfer(from, address(fraudRegistry), remaining);
            // Register the escrow (tracks recipient + release time)
            try fraudRegistry.escrowTransfer(from, custodyTo, remaining) {} catch {}
        } else {
            // Normal delivery — tokens go directly to receiver
            _balances[custodyTo] += remaining;
            emit Transfer(from, custodyTo, remaining);
        }

    // F-31 FIX: Basic transfer invariant check for defense-in-depth monitoring.
    // The receiver's net amount can never exceed the original transfer amount.
    assert(remaining <= amount);

        _logEv(from, "transfer", amount, "");
    }

    function _applyBurn(address from, address sink, uint256 burnAmt) internal {
        if (sink == address(0)) {
            // Hard burn
            totalSupply -= burnAmt;
            emit Transfer(from, address(0), burnAmt);
        } else {
            // Soft burn sink (e.g., dead vault, dedicated burner)
            _balances[sink] += burnAmt;
            emit Transfer(from, sink, burnAmt);
        }
    }

    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert VF_ZERO();
        if (totalSupply + amount > MAX_SUPPLY) revert VF_CAP();
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _approve(address owner_, address spender, uint256 amount) internal {
        require(owner_ != address(0) && spender != address(0), "approve 0");
        _allowances[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    // ─────────────────────────── Helpers
    
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        if (size > 0) return true;

        // Distinguish deployed contracts from EOAs/non-existent accounts.
        bytes32 codeHash;
        assembly { codeHash := extcodehash(addr) }
        return codeHash != bytes32(0) && codeHash != EMPTY_CODE_HASH;
    }
    
    function _isVault(address addr) internal view returns (bool) {
        if (address(vaultHub) == address(0)) return false;
        try vaultHub.isVault(addr) returns (bool v) {
            return v;
        } catch {
            return false;
        }
    }
    
    function _hasVault(address owner) internal view returns (bool) {
        if (address(vaultHub) == address(0)) return false;
        try vaultHub.vaultOf(owner) returns (address vault) {
            return vault != address(0);
        } catch {
            return false;
        }
    }

    function _vaultOfAddr(address a) internal view returns (address) {
        if (address(vaultHub) == address(0)) return address(0);
        try vaultHub.vaultOf(a) returns (address vault) {
            return vault;
        } catch {
            return address(0);
        }
    }

    function _resolveFeeScoringAddress(address from) internal view returns (address feeFrom) {
        feeFrom = from;
        if (address(vaultHub) == address(0) || !_isVault(from)) return feeFrom;

        (bool ok, bytes memory data) = address(vaultHub).staticcall(
            abi.encodeWithSignature("ownerOfVault(address)", from)
        );
        if (ok && data.length >= 32) {
            address vaultOwner = abi.decode(data, (address));
            if (vaultOwner != address(0)) feeFrom = vaultOwner;
        }
    }

    // _locked() REMOVED — no third-party locking of user vaults

    function _syncEmergencyFlags() internal {
        if (circuitBreaker && circuitBreakerExpiry > 0 && block.timestamp >= circuitBreakerExpiry) {
            circuitBreaker = false;
            circuitBreakerExpiry = 0;
        }
        if (feeBypass && feeBypassExpiry > 0 && block.timestamp >= feeBypassExpiry) {
            feeBypass = false;
            feeBypassExpiry = 0;
        }
    }

    /// @notice T-07 FIX: Permissionless state cleanup — clears stale circuit breaker / bypass
    ///         storage flags so that off-chain reads of the public variables reflect reality.
    ///         Safe to call by anyone; no funds are moved and no access is granted.
    function syncEmergencyFlags() external {
        _syncEmergencyFlags();
    }

    function _tryExpectedNetAmount(address from, address to, uint256 amount) internal view returns (bool ok, uint256 expectedNet) {
        address feeFrom = _resolveFeeScoringAddress(from);
        (bool success, bytes memory data) = address(burnRouter).staticcall(
            abi.encodeWithSelector(IProofScoreBurnRouterToken.computeFees.selector, feeFrom, to, amount)
        );
        if (!success || data.length < 192) return (false, 0);

        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) =
            abi.decode(data, (uint256, uint256, uint256, address, address, address));

        uint256 totalFees = burnAmt + sanctumAmt + ecoAmt;
        if (totalFees > amount) return (false, 0);
        return (true, amount - totalFees);
    }
    
    // ─────────────────────────── Anti-Whale Protection Logic
    
    /**
     * @dev Check and enforce all anti-whale protections
     * Reverts if any limit is exceeded
     */
    function _checkWhaleProtection(address from, address to, uint256 amount) internal {
        uint256 trackedAmount = amount;

        // Track recipient impact and daily usage using expected post-fee net amount.
        if (address(burnRouter) != address(0) && !isFeeBypassed() && !(systemExempt[from] || systemExempt[to])) {
            (bool ok, uint256 expectedNet) = _tryExpectedNetAmount(from, to, amount);
            if (ok) {
                trackedAmount = expectedNet;
            } else {
                // On preview failure, fall back to conservative 5% fee ceiling assumption.
                trackedAmount = (amount * 9500) / 10000;
            }
        }

        // 1. Max transfer amount check
        if (maxTransferAmount > 0 && amount > maxTransferAmount) {
            revert VF_MaxTransferExceeded();
        }
        
        // 2. Max wallet balance check (for recipient)
        // T-02/T-08 FIX: Check against expected net impact, not gross amount.
        if (maxWalletBalance > 0) {
            uint256 recipientNewBalance = _balances[to] + trackedAmount;
            if (recipientNewBalance > maxWalletBalance) {
                revert VF_MaxWalletExceeded();
            }
        }
        
        // 3. Daily transfer limit tracking: validate using projected post-fee flow,
        // but persist the actual delivered amount later in _transfer().
        // Use a rolling 24-hour window instead of UTC day boundaries.
        uint256 windowStart = dailyResetTime[from];
        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            dailyTransferred[from] = 0;
            dailyResetTime[from] = block.timestamp;
        }

        if (dailyTransferLimit > 0) {
            uint256 projectedTransferred = dailyTransferred[from] + trackedAmount;
            if (projectedTransferred > dailyTransferLimit) {
                revert VF_DailyLimitExceeded();
            }
        }
        
        // 4. Transfer cooldown check (for sender)
        if (transferCooldown > 0) {
            if (lastTransferTime[from] > 0 && 
                block.timestamp < lastTransferTime[from] + transferCooldown) {
                revert VF_TransferCooldown();
            }
            lastTransferTime[from] = block.timestamp;
        }
    }

    function _recordActualDailyTransfer(address from, uint256 actualAmount) internal {
        uint256 windowStart = dailyResetTime[from];
        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            dailyTransferred[from] = 0;
            dailyResetTime[from] = block.timestamp;
        }

        dailyTransferred[from] += actualAmount;
        if (dailyTransferLimit > 0 && dailyTransferred[from] > dailyTransferLimit) {
            revert VF_DailyLimitExceeded();
        }
    }
    
    /// @notice T-02 FIX: Helper to compute expected net amount after fees
    function getExpectedNetAmount(address from, address to, uint256 amount) public view returns (uint256) {
        if (address(burnRouter) == address(0) || isFeeBypassed() || systemExempt[from] || systemExempt[to]) {
            return amount; // No fees
        }

        (bool ok, uint256 expectedNet) = _tryExpectedNetAmount(from, to, amount);
        require(ok, "VF: fee preview failed");
        return expectedNet;
    }
    
    /**
     * @dev View function to check remaining daily allowance
     */
    function remainingDailyLimit(address account) external view returns (uint256) {
        if (dailyTransferLimit == 0) return type(uint256).max; // No limit

        uint256 windowStart = dailyResetTime[account];
        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            return dailyTransferLimit;
        }
        
        // Return remaining
        if (dailyTransferred[account] >= dailyTransferLimit) return 0;
        return dailyTransferLimit - dailyTransferred[account];
    }
    
    /**
     * @dev View function to check time until next transfer allowed
     */
    function cooldownRemaining(address account) external view returns (uint256) {
        if (transferCooldown == 0) return 0;
        if (lastTransferTime[account] < 1) return 0;
        
        uint256 unlockTime = lastTransferTime[account] + transferCooldown;
        if (block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch { emit LedgerLogFailed(who, action); } }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW/PREVIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if a transfer can be executed
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     * @return canDo Whether transfer would succeed
     * @return reason Failure reason if canDo is false
     */
    function canTransfer(address from, address to, uint256 amount) external view returns (bool canDo, string memory reason) {
        // Sanctions check (mirrors live transfer rules for system-exempt contracts)
        
        // Balance check
        if (_balances[from] < amount) return (false, "Insufficient balance");
        
        // Anti-whale checks
        if (!whaleLimitExempt[from] && !whaleLimitExempt[to] && 
            !systemExempt[from] && !systemExempt[to] &&
            from != address(0) && to != address(0)) {
            
            // Max transfer
            if (maxTransferAmount > 0 && amount > maxTransferAmount) {
                return (false, "Exceeds max transfer amount");
            }
            
            // Max wallet
            // T-02 FIX: Use net amount estimate (matching _transfer() behaviour) so view reports correctly
            if (maxWalletBalance > 0) {
                uint256 netEstimate = amount;
                if (address(burnRouter) != address(0) && !isFeeBypassed() &&
                    !whaleLimitExempt[from] && !whaleLimitExempt[to] &&
                    !systemExempt[from] && !systemExempt[to]) {
                    // Approximate: use 95% of gross as worst-case net (5% fee ceiling)
                    (bool ok, uint256 expectedNet) = _tryExpectedNetAmount(from, to, amount);
                    if (ok) {
                        netEstimate = expectedNet;
                    } else {
                        netEstimate = (amount * 9500) / 10000;
                    }
                }
                if (_balances[to] + netEstimate > maxWalletBalance) {
                    return (false, "Exceeds max wallet balance");
                }
            }
            
            // Daily limit (rolling 24-hour window)
            if (dailyTransferLimit > 0) {
                uint256 transferred = dailyTransferred[from];
                uint256 windowStart = dailyResetTime[from];
                if (windowStart != 0 && block.timestamp < windowStart + 1 days) {
                    uint256 trackedEstimate = amount;
                    if (address(burnRouter) != address(0) && !isFeeBypassed() &&
                        !systemExempt[from] && !systemExempt[to]) {
                        (bool ok, uint256 expectedNet) = _tryExpectedNetAmount(from, to, amount);
                        if (ok) {
                            trackedEstimate = expectedNet;
                        } else {
                            trackedEstimate = (amount * 9500) / 10000;
                        }
                    }

                    if (transferred + trackedEstimate > dailyTransferLimit) {
                        return (false, "Exceeds daily transfer limit");
                    }
                }
            }
            
            // Cooldown
            if (transferCooldown > 0 && lastTransferTime[from] > 0) {
                if (block.timestamp < lastTransferTime[from] + transferCooldown) {
                    return (false, "Transfer cooldown active");
                }
            }
        }
        
        // Vault-only check
        if (vaultOnly && address(vaultHub) != address(0)) {
            bool fromOk = (from == address(0) || systemExempt[from] || whitelisted[from] || 
                          _isVault(from) || _hasVault(from));
            bool toOk = (to == address(0) || to == treasurySink || to == sanctumSink || 
                        systemExempt[to] || whitelisted[to] || _isVault(to) || _hasVault(to));
            
            if (!fromOk) return (false, "Sender must use vault");
            if (!toOk) return (false, "Recipient must use vault");
        }
        
        // SecurityHub lock check
        // SecurityHub lock check removed — non-custodial, no third-party locks
        
        return (true, "");
    }
    
    /**
     * @notice Preview fees that would be applied to a transfer
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     * @return burnAmount Amount that would be burned
     * @return sanctumAmount Amount sent to sanctum/charity
     * @return ecosystemAmount Amount sent to ecosystem treasury
     * @return netReceived Net amount recipient would receive
     */
    function previewTransferFees(address from, address to, uint256 amount) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        uint256 netReceived
    ) {
        // No fees for exempt addresses or if router not set
        if (systemExempt[from] || systemExempt[to] || address(burnRouter) == address(0) || isFeeBypassed()) {
            return (0, 0, 0, amount);
        }

        address feeFrom = _resolveFeeScoringAddress(from);
        
        // Get fees from router
        (burnAmount, sanctumAmount, ecosystemAmount, , , ) = burnRouter.computeFees(feeFrom, to, amount);
        
        netReceived = amount - burnAmount - sanctumAmount - ecosystemAmount;
    }
    
    /**
     * @notice Get comprehensive transfer limits for an address
     * @param account Address to check
     * @return maxPerTransfer Maximum allowed per transfer
     * @return maxWallet Maximum wallet balance
     * @return dailyLimit Daily transfer limit
     * @return dailyRemaining Remaining daily allowance
     * @return cooldownSecs Cooldown between transfers
     * @return cooldownRemain Time until next transfer allowed
     * @return isExempt Whether address is exempt from limits
     */
    function getTransferLimitsFor(address account) external view returns (
        uint256 maxPerTransfer,
        uint256 maxWallet,
        uint256 dailyLimit,
        uint256 dailyRemaining,
        uint256 cooldownSecs,
        uint256 cooldownRemain,
        bool isExempt
    ) {
        isExempt = whaleLimitExempt[account] || systemExempt[account];
        
        if (isExempt) {
            maxPerTransfer = type(uint256).max;
            maxWallet = type(uint256).max;
            dailyLimit = type(uint256).max;
            dailyRemaining = type(uint256).max;
            cooldownSecs = 0;
            cooldownRemain = 0;
        } else {
            maxPerTransfer = maxTransferAmount > 0 ? maxTransferAmount : type(uint256).max;
            maxWallet = maxWalletBalance > 0 ? maxWalletBalance : type(uint256).max;
            dailyLimit = dailyTransferLimit > 0 ? dailyTransferLimit : type(uint256).max;
            
            // Calculate daily remaining using the rolling 24-hour window.
            if (dailyTransferLimit > 0) {
                uint256 windowStart = dailyResetTime[account];
                if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
                    dailyRemaining = dailyTransferLimit;
                } else if (dailyTransferred[account] >= dailyTransferLimit) {
                    dailyRemaining = 0;
                } else {
                    dailyRemaining = dailyTransferLimit - dailyTransferred[account];
                }
            } else {
                dailyRemaining = type(uint256).max;
            }
            
            cooldownSecs = transferCooldown;
            
            // Calculate cooldown remaining
            if (transferCooldown > 0 && lastTransferTime[account] > 0) {
                uint256 unlockTime = lastTransferTime[account] + transferCooldown;
                cooldownRemain = block.timestamp >= unlockTime ? 0 : unlockTime - block.timestamp;
            } else {
                cooldownRemain = 0;
            }
        }
    }
    
    /**
     * @notice Get daily transfer statistics for a user
     * @param user Address to query
     * @return transferred Amount transferred today
     * @return limit Daily limit
     * @return remaining Remaining allowance
     * @return resetTime When current period started
     * @return nextResetTime When limit resets
     */
    function getDailyTransferStats(address user) external view returns (
        uint256 transferred,
        uint256 limit,
        uint256 remaining,
        uint256 resetTime,
        uint256 nextResetTime
    ) {
        if (whaleLimitExempt[user] || systemExempt[user]) {
            limit = type(uint256).max;
            remaining = type(uint256).max;
            return (0, limit, remaining, 0, 0);
        }
        
        limit = dailyTransferLimit;
        
        uint256 windowStart = dailyResetTime[user];

        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            transferred = 0;
            remaining = limit;
            resetTime = block.timestamp;
            nextResetTime = block.timestamp + 24 hours;
        } else {
            transferred = dailyTransferred[user];
            remaining = transferred >= limit ? 0 : limit - transferred;
            resetTime = windowStart;
            nextResetTime = windowStart + 24 hours;
        }
    }

    /// @dev Internal burn accounting helper. Use transactionFeesProcessed() for public reads.
    function _totalBurnedInternal() private view returns (uint256) {
        return MAX_SUPPLY - totalSupply;
    }

    /// @notice DEPRECATED: Use transactionFeesProcessed() instead.
    /// @dev Retained for ABI backwards compatibility but hidden from public indexers.
    ///      HOWEY NOTE: Exposing a "burned to date" metric encourages scarcity narratives
    ///      which create an implicit profit expectation (Howey Prong 3). The preferred
    ///      alias transactionFeesProcessed() frames the metric as a network cost, not
    ///      as a value-accrual signal.
    function totalBurnedToDate() external view returns (uint256) {
        return _totalBurnedInternal();
    }

    /// @notice Howey-neutral alias for totalBurnedToDate().
    /// @dev Preferred name for public-facing displays and integrations.
    ///      Frames the metric as cumulative network processing fees paid, not as
    ///      a measure of token scarcity or value accrual.
    function transactionFeesProcessed() external view returns (uint256) {
        return _totalBurnedInternal();
    }

    /// @notice T-14 FIX: Prevent accidental renounceOwnership which would permanently lock the contract
    function renounceOwnership() external view onlyOwner {
        revert("VFIDEToken: renounce disabled");
    }
}
