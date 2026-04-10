// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

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
    ISecurityHub public securityHub;              // lock checks (optional)
    IProofLedger public ledger;                   // event logging (optional)
    IProofScoreBurnRouterToken public burnRouter; // fee calculator (optional)

    /// Policy settings
    bool public vaultOnly = true;                 // VAULT-ONLY ON BY DEFAULT (user security)
    bool public policyLocked = false;             // once locked, cannot disable vault-only
    bool public circuitBreaker = false;           // H-02 FIX: emergency status flag; does NOT implicitly bypass fees/security (use setSecurityBypass/setFeeBypass separately)
    uint256 public circuitBreakerExpiry = 0;      // auto-disable timestamp (0 = indefinite)
    uint256 public constant MAX_CIRCUIT_BREAKER_DURATION = 7 days; // maximum allowed duration
    bool public securityBypass = false;           // bypass SecurityHub lock checks only
    uint256 public securityBypassExpiry = 0;
    uint64 public securityBypassActivatedAt = 0;  // L-3 FIX: cooldown anchor
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
    address public pendingSecurityHub;
    uint64  public pendingSecurityHubAt;
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
    
    // Sanctions / Compliance
    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isFrozen;
    mapping(address => uint64) public freezeTime;
    uint64 public constant FREEZE_DELAY = 1 hours; // Time frozen before blacklist allowed
    
    event BlacklistSet(address indexed user, bool status, address indexed setBy);
    event FrozenSet(address indexed user, bool frozen, address indexed setBy);

    // EIP-2612 Permit
    bytes32 private immutable _cachedDomainSeparator;
    uint256 private immutable _cachedChainId;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    /// Events
    event VaultHubSet(address indexed hub);
    event VaultHubScheduled(address indexed hub, uint64 effectiveAt);
    event SecurityHubSet(address indexed hub);
    event SecurityHubScheduled(address indexed hub, uint64 effectiveAt);
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
    event SecurityBypassSet(bool active, uint256 expiry); // T-12 FIX: emit on bypass change
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
    error VF_SanctionedAddress();
    error VF_FrozenAddress();
    error VF_InsufficientBalance();
    error VF_NotContract();
    error VF_AllowanceExceeded();
    error VF_InvalidPermit();
    error VF_PendingExists();
    error VF_InvalidConfig();
    error VF_MustFreezeFirst();

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
        if (size == 0) revert VF_NotContract();
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

        // Mint full 200M supply at genesis and distribute through the standard mint path.
        // 50M to Dev Reserve Vesting Vault (locked)
        _mint(devReserveVestingVault, DEV_RESERVE_SUPPLY);
        _logEv(devReserveVestingVault, "pdv", DEV_RESERVE_SUPPLY, "50m");
        
        // 150M to Treasury (operations, liquidity, DEX seeding, CEX, ecosystem: 200M - 50M dev)
        uint256 treasuryAmount = MAX_SUPPLY - DEV_RESERVE_SUPPLY;
        _mint(treasury, treasuryAmount);
        _logEv(treasury, "ptr", treasuryAmount, "150m");
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
        if (cur < subtracted) revert VF_AllowanceExceeded();
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

    function permit(address tokenOwner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        // T-09 FIX: Check owner is not frozen or blacklisted (blacklisted owner could otherwise approve via permit)
        if (isFrozen[tokenOwner]) revert VF_FrozenAddress();
        if (isBlacklisted[tokenOwner] || isBlacklisted[spender]) revert VF_SanctionedAddress();
        if (block.timestamp > deadline) revert VF_InvalidPermit();
        // F-01 FIX: Reject malleable signatures (EIP-2 / secp256k1 upper bound on s)
        if (
            uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0 ||
            (v != 27 && v != 28)
        ) revert VF_InvalidPermit();
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, tokenOwner, spender, value, nonces[tokenOwner]++));
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0) || signer != tokenOwner) revert VF_InvalidPermit();
        _approve(tokenOwner, spender, value);
    }

    function transfer(address to, uint256 amount) external nonReentrant returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external nonReentrant returns (bool) {
        // System-exempt protocol modules must remain operable even if accidentally sanctioned.
        if (!systemExempt[msg.sender] && (isBlacklisted[msg.sender] || isFrozen[msg.sender])) {
            revert VF_SanctionedAddress();
        }
        uint256 cur = _allowances[from][msg.sender];
        if (cur < amount) revert VF_AllowanceExceeded();
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
        if (!systemExempt[msg.sender] && (isBlacklisted[msg.sender] || isFrozen[msg.sender])) {
            revert VF_SanctionedAddress();
        }
        uint256 bal = _balances[msg.sender];
        if (bal < amount) revert VF_InsufficientBalance();
        unchecked { _balances[msg.sender] = bal - amount; }
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
        _logEv(msg.sender, "burn", amount, "");
    }

    function _requireNoPending(uint64 pendingAt) internal pure {
        if (pendingAt != 0) revert VF_PendingExists();
    }

    function _requirePending(uint64 pendingAt) internal pure {
        if (pendingAt == 0) revert VF_NoPending();
    }

    function _requirePendingReady(uint64 pendingAt) internal view {
        _requirePending(pendingAt);
        if (block.timestamp < pendingAt) revert VF_TimelockActive();
    }

    function _queueEffectiveAt() internal view returns (uint64) {
        return uint64(block.timestamp) + SINK_CHANGE_DELAY;
    }

    // ─────────────────────────── Admin / Modules

    function setVaultHub(address hub) external onlyOwner {
        if (hub == address(0)) revert VF_ZeroAddress();
        _requireNoPending(pendingVaultHubAt);
        uint64 effectiveAt = _queueEffectiveAt();
        pendingVaultHub = hub;
        pendingVaultHubAt = effectiveAt;
        emit VaultHubScheduled(hub, effectiveAt);
        _log("vh_q");
    }

    function applyVaultHub() external onlyOwner {
        _requirePendingReady(pendingVaultHubAt);
        vaultHub = IVaultHub(pendingVaultHub);
        emit VaultHubSet(pendingVaultHub);
        delete pendingVaultHub;
        delete pendingVaultHubAt;
        _log("vh_set");
    }

    function cancelVaultHub() external onlyOwner {
        _requirePending(pendingVaultHubAt);
        delete pendingVaultHub;
        delete pendingVaultHubAt;
        _log("vh_x");
    }

    function setSecurityHub(address hub) external onlyOwner {
        if (hub == address(0)) revert VF_ZeroAddress();
        _requireNoPending(pendingSecurityHubAt);
        uint64 effectiveAt = _queueEffectiveAt();
        pendingSecurityHub = hub;
        pendingSecurityHubAt = effectiveAt;
        emit SecurityHubScheduled(hub, effectiveAt);
        _log("sh_q");
    }

    function applySecurityHub() external onlyOwner {
        _requirePendingReady(pendingSecurityHubAt);
        securityHub = ISecurityHub(pendingSecurityHub);
        emit SecurityHubSet(pendingSecurityHub);
        delete pendingSecurityHub;
        delete pendingSecurityHubAt;
        _log("sh_set");
    }

    function cancelSecurityHub() external onlyOwner {
        _requirePending(pendingSecurityHubAt);
        delete pendingSecurityHub;
        delete pendingSecurityHubAt;
        _log("sh_x");
    }

    /// F-05 FIX: setLedger now uses 48h timelock (matches all other module setters)
    function setLedger(address _ledger) external onlyOwner {
        if (policyLocked && _ledger == address(0)) revert VF_POLICY_LOCKED();
        _requireNoPending(pendingLedgerAt);
        uint64 effectiveAt = _queueEffectiveAt();
        pendingLedger = _ledger;
        pendingLedgerAt = effectiveAt;
        emit LedgerScheduled(_ledger, effectiveAt);
        _log("ld_q");
    }

    function applyLedger() external onlyOwner {
        _requirePendingReady(pendingLedgerAt);
        ledger = IProofLedger(pendingLedger);
        emit LedgerSet(pendingLedger);
        delete pendingLedger;
        delete pendingLedgerAt;
        _log("ld_set");
    }

    function cancelLedger() external onlyOwner {
        _requirePending(pendingLedgerAt);
        delete pendingLedger;
        delete pendingLedgerAt;
        _log("ld_x");
    }

    function setBurnRouter(address router) external onlyOwner {
        if (policyLocked && router == address(0)) revert VF_POLICY_LOCKED();
        _requireNoPending(pendingBurnRouterAt);
        uint64 effectiveAt = _queueEffectiveAt();
        pendingBurnRouter = router;
        pendingBurnRouterAt = effectiveAt;
        emit BurnRouterScheduled(router, effectiveAt);
        _log("br_q");
    }

    function applyBurnRouter() external onlyOwner {
        _requirePendingReady(pendingBurnRouterAt);
        burnRouter = IProofScoreBurnRouterToken(pendingBurnRouter);
        emit BurnRouterSet(pendingBurnRouter);
        delete pendingBurnRouter;
        delete pendingBurnRouterAt;
        _log("br_set");
    }

    function cancelBurnRouter() external onlyOwner {
        _requirePending(pendingBurnRouterAt);
        delete pendingBurnRouter;
        delete pendingBurnRouterAt;
        _log("br_x");
    }

    function setTreasurySink(address sink) external onlyOwner {
        if (policyLocked && sink == address(0)) revert VF_POLICY_LOCKED();
        _requireNoPending(pendingTreasurySinkAt);
        uint64 effectiveAt = _queueEffectiveAt();
        pendingTreasurySink = sink;
        pendingTreasurySinkAt = effectiveAt;
        emit TreasurySinkScheduled(sink, effectiveAt);
        _log("ts_q");
    }

    function applyTreasurySink() external onlyOwner {
        _requirePendingReady(pendingTreasurySinkAt);
        treasurySink = pendingTreasurySink;
        emit TreasurySinkSet(pendingTreasurySink);
        delete pendingTreasurySink;
        delete pendingTreasurySinkAt;
        _log("ts_set");
    }

    function cancelTreasurySink() external onlyOwner {
        _requirePending(pendingTreasurySinkAt);
        delete pendingTreasurySink;
        delete pendingTreasurySinkAt;
        _log("ts_x");
    }

    function setSanctumSink(address _sanctum) external onlyOwner {
        if (policyLocked && _sanctum == address(0)) revert VF_POLICY_LOCKED();
        _requireNoPending(pendingSanctumSinkAt);
        uint64 effectiveAt = _queueEffectiveAt();
        pendingSanctumSink = _sanctum;
        pendingSanctumSinkAt = effectiveAt;
        emit SanctumSinkScheduled(_sanctum, effectiveAt);
        _log("ss_q");
    }

    function applySanctumSink() external onlyOwner {
        _requirePendingReady(pendingSanctumSinkAt);
        sanctumSink = pendingSanctumSink;
        emit SanctumSinkSet(pendingSanctumSink);
        delete pendingSanctumSink;
        delete pendingSanctumSinkAt;
        _log("ss_set");
    }

    function cancelSanctumSink() external onlyOwner {
        _requirePending(pendingSanctumSinkAt);
        delete pendingSanctumSink;
        delete pendingSanctumSinkAt;
        _log("ss_x");
    }

    /// @notice Propose system exemption with 48-hour timelock (grants bypass of ALL fees and vault rules)
    function proposeSystemExempt(address who, bool isExempt) external onlyOwner {
        if (who == address(0)) revert VF_ZeroAddress();
        // F-06 FIX: Revert if a pending proposal already exists (prevents silent override)
        _requireNoPending(pendingExemptAt);
        pendingExemptAddr = who;
        pendingExemptStatus = isExempt;
        pendingExemptAt = _queueEffectiveAt();
        emit SystemExemptProposed(who, isExempt, pendingExemptAt);
        _logEv(who, "x_q", 0, "");
    }

    /// @notice Cancel a pending system exempt proposal (F-06 FIX added)
    function cancelPendingExempt() external onlyOwner {
        _requirePending(pendingExemptAt);
        delete pendingExemptAddr;
        delete pendingExemptStatus;
        delete pendingExemptAt;
    }

    /// @notice Confirm a pending system exempt after timelock elapses
    function confirmSystemExempt() external onlyOwner {
        _requirePendingReady(pendingExemptAt);
        address who = pendingExemptAddr;
        bool status = pendingExemptStatus;
        systemExempt[who] = status;
        emit SystemExemptSet(who, status);
        delete pendingExemptAddr;
        delete pendingExemptStatus;
        delete pendingExemptAt;
        _logEv(who, status ? "x_on" : "x_off", 0, "");
    }

    /// @notice Propose whitelist entry with 48-hour timelock (grants bypass of vault-only)
    function proposeWhitelist(address addr, bool status) external onlyOwner {
        if (addr == address(0)) revert VF_ZeroAddress();
        _requireNoPending(pendingWhitelistAt);
        pendingWhitelistAddr = addr;
        pendingWhitelistStatus = status;
        pendingWhitelistAt = _queueEffectiveAt();
        emit WhitelistProposed(addr, status, pendingWhitelistAt);
        _logEv(addr, "wl_q", 0, "");
    }

    /// @notice Cancel a pending whitelist proposal
    function cancelPendingWhitelist() external onlyOwner {
        _requirePending(pendingWhitelistAt);
        delete pendingWhitelistAddr;
        delete pendingWhitelistStatus;
        delete pendingWhitelistAt;
    }

    /// @notice Confirm a pending whitelist change after timelock elapses
    function confirmWhitelist() external onlyOwner {
        _requirePendingReady(pendingWhitelistAt);
        address addr = pendingWhitelistAddr;
        bool status = pendingWhitelistStatus;
        whitelisted[addr] = status;
        emit Whitelisted(addr, status);
        delete pendingWhitelistAddr;
        delete pendingWhitelistStatus;
        delete pendingWhitelistAt;
        _logEv(addr, status ? "wl_on" : "wl_off", 0, "");
    }

    function setVaultOnly(bool enabled) external onlyOwner {
        if (policyLocked && !enabled) revert VF_POLICY_LOCKED();
        vaultOnly = enabled;
        emit VaultOnlySet(enabled);
        _log(enabled ? "vo_on" : "vo_off");
    }

    /// One-way switch that makes policy non-optional post-launch.
    function lockPolicy() external onlyOwner {
        policyLocked = true;
        emit PolicyLocked();
        _log("pol");
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
            _log("cb_off");
        } else {
            // Activation requires a 48-hour timelock
            if (_duration == 0 || _duration > MAX_CIRCUIT_BREAKER_DURATION) revert VF_InvalidDuration();
            pendingCircuitBreakerActive = true;
            pendingCircuitBreakerDuration = _duration;
            pendingCircuitBreakerAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
            emit CircuitBreakerProposed(true, _duration, pendingCircuitBreakerAt);
            _log("cb_q");
        }
    }

    /// @notice Apply a pending circuit breaker activation after the 48-hour timelock.
    function confirmCircuitBreaker() external onlyOwner {
        _requirePendingReady(pendingCircuitBreakerAt);
        _syncEmergencyFlags();
        circuitBreaker = true;
        circuitBreakerExpiry = block.timestamp + pendingCircuitBreakerDuration;
        pendingCircuitBreakerAt = 0;
        emit CircuitBreakerSet(true, circuitBreakerExpiry);
        _log("cb_on");
    }

    /// @notice Bypass SecurityHub lock checks only (does not disable fees)
    /// @dev L-3 FIX: Re-activation requires a 1-day cooldown from the previous activation.
    function setSecurityBypass(bool _active, uint256 _duration) external onlyOwner {
        _syncEmergencyFlags();
        if (_active) {
            if (_duration == 0 || _duration > MAX_CIRCUIT_BREAKER_DURATION) revert VF_InvalidDuration();
            if (securityBypassActivatedAt > 0 && block.timestamp < uint256(securityBypassActivatedAt) + 1 days)
                revert VF_TimelockActive();
            securityBypassActivatedAt = uint64(block.timestamp);
            securityBypass = true;
            securityBypassExpiry = block.timestamp + _duration;
        } else {
            securityBypass = false;
            securityBypassExpiry = 0;
        }
        emit SecurityBypassSet(_active, securityBypassExpiry); // T-12 FIX: emit event
        _log(_active ? "sb_on" : "sb_off");
    }

    /// @notice Bypass BurnRouter fees only (does not disable security locks)
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
        _log(_active ? "fb_on" : "fb_off");
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

    /// @notice Check if security bypass is active (independent of fee bypass and circuit breaker).
    /// @dev H-02 FIX: Circuit breaker no longer implicitly enables security bypass.
    ///      Use setSecurityBypass() to explicitly disable SecurityHub checks.
    ///      This prevents the circuit breaker from silently overriding security controls.
    function isSecurityBypassed() public view returns (bool) {
        if (!securityBypass) return false;
        if (securityBypassExpiry > 0 && block.timestamp >= securityBypassExpiry) return false;
        return true;
    }

    /// @notice Check if fee bypass is active (independent of security bypass and circuit breaker).
    /// @dev H-02 FIX: Circuit breaker no longer implicitly enables fee bypass.
    ///      Use setFeeBypass() to explicitly disable BurnRouter fee collection.
    ///      Keeping bypasses independent means each must be explicitly activated.
    function isFeeBypassed() public view returns (bool) {
        if (!feeBypass) return false;
        if (feeBypassExpiry > 0 && block.timestamp >= feeBypassExpiry) return false;
        return true;
    }

    /**
     * @notice Freeze an address before blacklisting (prevents front-running)
     * @param user Address to freeze
     * @param frozen True to freeze, false to unfreeze
     */
    function setFrozen(address user, bool frozen) external onlyOwner {
        isFrozen[user] = frozen;
        if (frozen) {
            freezeTime[user] = uint64(block.timestamp);
        } else {
            freezeTime[user] = 0;
        }
        emit FrozenSet(user, frozen, msg.sender);
    }
    
    /**
     * @notice Blacklist an address (must be frozen for FREEZE_DELAY first)
     * @dev Requires freeze period to prevent front-running
     * @param user Address to blacklist
     * @param status True to blacklist, false to remove
     */
    function setBlacklist(address user, bool status) external onlyOwner {
        if (status) {
            // To add to blacklist, must be frozen first for FREEZE_DELAY
            if (!isFrozen[user]) revert VF_MustFreezeFirst();
            if (block.timestamp < freezeTime[user] + FREEZE_DELAY) revert VF_TimelockActive();
        }
        isBlacklisted[user] = status;
        // Auto-unfreeze when blacklisting
        if (status) {
            isFrozen[user] = false;
            freezeTime[user] = 0;
        }
        emit BlacklistSet(user, status, msg.sender);
    }

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
        if (
            (_maxTransfer > 0 && _maxTransfer < 100_000e18) ||
            (_maxWallet > 0 && _maxWallet < 200_000e18) ||
            (_dailyLimit > 0 && _dailyLimit < 500_000e18) ||
            (_cooldown > 1 hours)
        ) revert VF_InvalidConfig();
        
        maxTransferAmount = _maxTransfer;
        maxWalletBalance = _maxWallet;
        dailyTransferLimit = _dailyLimit;
        transferCooldown = _cooldown;
        
        emit AntiWhaleSet(_maxTransfer, _maxWallet, _dailyLimit, _cooldown);
        _log("aw_upd");
    }
    
    /**
     * @notice Exempt address from whale limits (for exchanges, liquidity pools, etc.)
     */
    function setWhaleLimitExempt(address addr, bool exempt) external onlyOwner {
        whaleLimitExempt[addr] = exempt;
        emit WhaleLimitExemptSet(addr, exempt);
    }

    // ─────────────────────────── Internal core

    // Slither note: the public entry points that reach this path (`transfer` and `transferFrom`)
    // are both `nonReentrant`, and the external module hooks here are intentional protocol wiring.
    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign
    function _transfer(address from, address to, uint256 amount) internal {
        _syncEmergencyFlags();
        if (from == address(0) || to == address(0)) revert VF_ZERO();
        if (amount == 0) revert VF_ZERO();

        address logicalTo = to;
        address custodyTo = to;

        // 1. Sanctions check (system-exempt protocol contracts remain operable)
        if (isBlacklisted[from] && !systemExempt[from]) revert VF_SanctionedAddress();
        if (isBlacklisted[to] && !systemExempt[to]) revert VF_SanctionedAddress();
        if (isFrozen[from] && !systemExempt[from]) revert VF_FrozenAddress();
        if (isFrozen[to] && !systemExempt[to]) revert VF_FrozenAddress();

        // Route EOA receipts into the recipient's vault without changing the fee/scoring context.
        if (vaultOnly && address(vaultHub) != address(0)) {
            if (!_isContract(logicalTo) && !systemExempt[logicalTo] && !whitelisted[logicalTo]) {
                if (!_hasVault(logicalTo)) {
                    try vaultHub.ensureVault(logicalTo) returns (address vault) {
                        _logEv(vault, "vault_a", 0, "");
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

        // Optimization: Fetch vaults once if needed for SecurityHub
        address fromVault = address(0);
        address toVault = address(0);
        if (address(securityHub) != address(0)) {
            fromVault = _vaultOfAddr(from);
            toVault   = _isVault(custodyTo) ? custodyTo : _vaultOfAddr(logicalTo);
        }

        // SecurityHub lock check (if set and not bypassed)
        if (address(securityHub) != address(0) && !isSecurityBypassed()) {
            if ((fromVault != address(0) && _locked(fromVault)) ||
                (toVault   != address(0) && _locked(toVault))) {
                revert VF_LOCKED();
            }
        }

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
                if (_burnAmt + _sanctumAmt + _ecoAmt > amount) revert VF_InvalidConfig();

                // F-17/C-01 FIX: Validate all returned sink addresses against token-level configuration.
                if (
                    (_sanctumSink != address(0) && _sanctumSink != sanctumSink && _sanctumSink != treasurySink) ||
                    (_ecoSink != address(0) && _ecoSink != treasurySink && _ecoSink != sanctumSink) ||
                    (_burnSink != address(0) && _burnSink != treasurySink && _burnSink != sanctumSink)
                ) revert VF_InvalidConfig();

                if (_burnAmt > 0) {
                    address sink = (_burnSink == address(0)) ? address(0) : _burnSink;
                    _applyBurn(from, sink, _burnAmt);
                    remaining -= _burnAmt;
                }
                if (_sanctumAmt > 0) {
                    address sink2 = (_sanctumSink == address(0)) ? treasurySink : _sanctumSink;
                    if (sink2 == address(0)) revert VF_ZeroAddress();
                    _balances[sink2] += _sanctumAmt;
                    emit Transfer(from, sink2, _sanctumAmt);
                    remaining -= _sanctumAmt;
                }
                if (_ecoAmt > 0) {
                    address sink3 = (_ecoSink == address(0)) ? treasurySink : _ecoSink;
                    if (sink3 == address(0)) revert VF_ZeroAddress();
                    _balances[sink3] += _ecoAmt;
                    emit Transfer(from, sink3, _ecoAmt);
                    remaining -= _ecoAmt;
                }

                if (_burnAmt > 0 || _sanctumAmt > 0 || _ecoAmt > 0) {
                    emit FeeApplied(from, logicalTo, _burnAmt, _sanctumAmt, _ecoAmt, (_sanctumSink == address(0) ? treasurySink : _sanctumSink), (_ecoSink == address(0) ? treasurySink : _ecoSink));
                }

                // Record volume for adaptive fee tracking (sustainability)
                try IProofScoreBurnRouter(address(burnRouter)).recordVolume(amount) {} catch (bytes memory reason) { emit ExternalCallFailed("rv", reason); }
            } catch (bytes memory reason) {
                emit ExternalCallFailed("cfr", reason);
            }
        } else {
            // If policy is locked we require a router be present so fees cannot be bypassed
            if (policyLocked && !isFeeBypassed() && address(burnRouter) == address(0)) {
                revert VF_InvalidConfig();
            }
        }

        if (!whaleLimitExempt[from] && !whaleLimitExempt[custodyTo] &&
            !systemExempt[from] && !systemExempt[logicalTo]) {
            _recordActualDailyTransfer(from, remaining);
        }

        // Deliver net to receiver
        _balances[custodyTo] += remaining;
        emit Transfer(from, custodyTo, remaining);

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
        if (owner_ == address(0) || spender == address(0)) revert VF_ZeroAddress();
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
    
    function _hasVault(address account) internal view returns (bool) {
        if (address(vaultHub) == address(0)) return false;
        try vaultHub.vaultOf(account) returns (address vault) {
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

        try vaultHub.ownerOfVault(from) returns (address vaultOwner) {
            if (vaultOwner != address(0)) feeFrom = vaultOwner;
        } catch {}
    }

    function _locked(address vault) internal view returns (bool) {
        // Fail closed: if lock status cannot be determined, treat vault as locked.
        try securityHub.isLocked(vault) returns (bool isVaultLocked) {
            return isVaultLocked;
        } catch {
            return true;
        }
    }

    function _syncEmergencyFlags() internal {
        if (circuitBreaker && circuitBreakerExpiry > 0 && block.timestamp >= circuitBreakerExpiry) {
            circuitBreaker = false;
            circuitBreakerExpiry = 0;
        }
        if (securityBypass && securityBypassExpiry > 0 && block.timestamp >= securityBypassExpiry) {
            securityBypass = false;
            securityBypassExpiry = 0;
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
        try burnRouter.computeFees(feeFrom, to, amount) returns (
            uint256 burnAmt,
            uint256 sanctumAmt,
            uint256 ecoAmt,
            address expectedSanctumSink,
            address expectedEcoSink,
            address expectedBurnSink
        ) {
            if (
                (burnAmt != 0 && expectedBurnSink == address(0)) ||
                (sanctumAmt != 0 && expectedSanctumSink == address(0)) ||
                (ecoAmt != 0 && expectedEcoSink == address(0))
            ) {
                return (false, 0);
            }

            uint256 totalFees = burnAmt + sanctumAmt + ecoAmt;
            if (totalFees > amount) return (false, 0);
            return (true, amount - totalFees);
        } catch {
            return (false, 0);
        }
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
        if (windowStart < 1 || block.timestamp >= windowStart + 1 days) {
            dailyTransferred[from] = 0;
            dailyResetTime[from] = block.timestamp;
        }

        dailyTransferred[from] += actualAmount;
        if (dailyTransferLimit > 0 && dailyTransferred[from] > dailyTransferLimit) {
            revert VF_DailyLimitExceeded();
        }
    }
    
    /// @notice T-02 FIX: Helper to compute expected net amount after fees
    function getExpectedNetAmount(address from, address to, uint256 amount) external view returns (uint256) {
        if (address(burnRouter) == address(0) || isFeeBypassed() || systemExempt[from] || systemExempt[to]) {
            return amount; // No fees
        }

        (bool ok, uint256 expectedNet) = _tryExpectedNetAmount(from, to, amount);
        if (!ok) revert VF_InvalidConfig();
        return expectedNet;
    }
    
    /**
     * @dev View function to check remaining daily allowance
     */
    function remainingDailyLimit(address account) external view returns (uint256) {
        if (dailyTransferLimit == 0) return type(uint256).max; // No limit

        uint256 windowStart = dailyResetTime[account];
        if (windowStart < 1 || block.timestamp >= windowStart + 1 days) {
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
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch {}
        }
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
        if (isFrozen[from] && !systemExempt[from]) return (false, "Sender frozen");
        if (isFrozen[to] && !systemExempt[to]) return (false, "Recipient frozen");
        if (isBlacklisted[from] && !systemExempt[from]) return (false, "Sender blacklisted");
        if (isBlacklisted[to] && !systemExempt[to]) return (false, "Recipient blacklisted");
        
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
        if (address(securityHub) != address(0) && !isSecurityBypassed()) {
            address fromVault = _vaultOfAddr(from);
            address toVault = _vaultOfAddr(to);
            
            if (fromVault != address(0) && _locked(fromVault)) {
                return (false, "Sender vault is locked");
            }
            if (toVault != address(0) && _locked(toVault)) {
                return (false, "Recipient vault is locked");
            }
        }
        
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
        address sanctumSinkPreview;
        address ecosystemSinkPreview;
        address burnSinkPreview;
        (
            burnAmount,
            sanctumAmount,
            ecosystemAmount,
            sanctumSinkPreview,
            ecosystemSinkPreview,
            burnSinkPreview
        ) = burnRouter.computeFees(feeFrom, to, amount);
        if (
            burnAmount == 0 && sanctumAmount == 0 && ecosystemAmount == 0
                && sanctumSinkPreview == address(0) && ecosystemSinkPreview == address(0) && burnSinkPreview == address(0)
        ) {
            return (0, 0, 0, amount);
        }

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
                if (windowStart < 1 || block.timestamp >= windowStart + 1 days) {
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

        if (windowStart < 1 || block.timestamp >= windowStart + 1 days) {
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
