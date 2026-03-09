// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * VFIDEToken (zkSync Era ready)
 * ----------------------------------------------------------
 * SUPPLY (ALL MINTED AT GENESIS):
 * - Total supply: 200,000,000 VFIDE (18 decimals)
 * - Dev reserve: 50,000,000 → DevReserveVestingVault (locked)
 * - Presale allocation: 35,000,000 → PresaleContract (no bonus pool)
 * - Treasury/Operations: 115,000,000 → Treasury (liquidity, CEX, operations)
 * 
 * VAULT-ONLY (ON BY DEFAULT):
 * - Users MUST use vaults for transfers (enables recovery/ProofScore)
 * - Exchanges/contracts can be whitelisted by owner
 * - System contracts (presale, sinks) auto-exempt
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
    uint256 public constant PRESALE_CAP = 35_000_000e18;

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
    bool public circuitBreaker = false;           // emergency bypass
    uint256 public circuitBreakerExpiry = 0;      // auto-disable timestamp (0 = indefinite)
    uint256 public constant MAX_CIRCUIT_BREAKER_DURATION = 7 days; // maximum allowed duration
    
    /// Exemptions
    mapping(address => bool) public systemExempt; // bypass all checks (presale, sinks, etc)
    mapping(address => bool) public whitelisted;  // bypass vault-only (exchanges)

    // Presale control (set at genesis, receives 35M tokens)
    address public presaleContract;

    // Sinks (fallbacks if router is unset or returns zero sinks)
    address public treasurySink;  // sanctuary/treasury receiver for charity share
    address public sanctumSink; // Optional: Burn to Sanctum instead of 0x0

    // VFIDE-H-03 Fix: 48-hour timelock for fee-sink and burn-router changes
    uint64 public constant SINK_CHANGE_DELAY = 48 hours;
    address public pendingBurnRouter;
    uint64  public pendingBurnRouterAt;
    address public pendingTreasurySink;
    uint64  public pendingTreasurySinkAt;
    address public pendingSanctumSink;
    uint64  public pendingSanctumSinkAt;
    
    // Sanctions / Compliance
    mapping(address => bool) public isBlacklisted;
    // C-1 Fix: Freeze-before-blacklist to prevent front-running
    mapping(address => bool) public isFrozen;
    mapping(address => uint64) public freezeTime;
    uint64 public constant FREEZE_DELAY = 1 hours; // Time frozen before blacklist allowed
    
    // L-1 Fix: Enhanced events with caller for audit trail
    event BlacklistSet(address indexed user, bool status, address indexed setBy);
    event FrozenSet(address indexed user, bool frozen, address indexed setBy);

    // EIP-2612 Permit
    bytes32 public immutable DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    /// Events
    event VaultHubSet(address indexed hub);
    event SecurityHubSet(address indexed hub);
    event LedgerSet(address indexed ledger);
    event BurnRouterSet(address indexed router);
    event BurnRouterScheduled(address indexed router, uint64 effectiveAt);
    event TreasurySinkSet(address indexed sink);
    event TreasurySinkScheduled(address indexed sink, uint64 effectiveAt);
    event SanctumSinkSet(address indexed sink);
    event SanctumSinkScheduled(address indexed sink, uint64 effectiveAt);
    event SystemExemptSet(address indexed who, bool isExempt);
    event Whitelisted(address indexed addr, bool status);
    event VaultOnlySet(bool enabled);
    event ExemptSet(address indexed target, bool exempt);
    event PolicyLocked();
    event CircuitBreakerSet(bool active, uint256 expiry);
    event PresaleContractSet(address indexed presale);
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

    /// Constructor: mint full supply and distribute at genesis
    constructor(
        address devReserveVestingVault, // MUST be deployed before token (receives 50M locked)
        address _presaleContract,       // MUST be deployed before token (receives 35M for sale)
        address treasury,               // Treasury/Owner address (receives 115M for operations/liquidity)
        address _vaultHub,              // MAY be zero at deploy; can be set later
        address _ledger,                // optional
        address _treasurySink           // recommended: EcoTreasuryVault
    ) {
        if (devReserveVestingVault == address(0)) revert VF_ZERO();
        if (_presaleContract == address(0)) revert VF_ZERO();
        if (treasury == address(0)) revert VF_ZERO();

        // Require dev vault and presale are contracts to prevent misconfig
        uint256 size;
        assembly { size := extcodesize(devReserveVestingVault) }
        require(size > 0, "devVault !contract");
        assembly { size := extcodesize(_presaleContract) }
        require(size > 0, "presale !contract");
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

        // Set presale contract
        presaleContract = _presaleContract;
        systemExempt[_presaleContract] = true;
        emit PresaleContractSet(_presaleContract);
        emit SystemExemptSet(_presaleContract, true);
        
        // Exempt genesis allocation addresses from whale limits
        whaleLimitExempt[devReserveVestingVault] = true;
        whaleLimitExempt[_presaleContract] = true;
        whaleLimitExempt[treasury] = true;

        // EIP-712 Domain Separator
        uint256 chainId;
        assembly { chainId := chainid() }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );

        // Mint full 200M supply at genesis and distribute
        totalSupply = MAX_SUPPLY;
        
        // 50M to Dev Reserve Vesting Vault (locked)
        _balances[devReserveVestingVault] = DEV_RESERVE_SUPPLY;
        emit Transfer(address(0), devReserveVestingVault, DEV_RESERVE_SUPPLY);
        _logEv(devReserveVestingVault, "premint_dev_reserve", DEV_RESERVE_SUPPLY, "50M locked");
        
        // 35M to Presale Contract (no bonus pool — rewards are not available)
        _balances[_presaleContract] = PRESALE_CAP;
        emit Transfer(address(0), _presaleContract, PRESALE_CAP);
        _logEv(_presaleContract, "premint_presale", PRESALE_CAP, "35M for presale");
        
        // 115M to Treasury (operations, liquidity, CEX, trading: 200M - 50M dev - 35M presale)
        uint256 treasuryAmount = MAX_SUPPLY - DEV_RESERVE_SUPPLY - PRESALE_CAP;
        _balances[treasury] = treasuryAmount;
        emit Transfer(address(0), treasury, treasuryAmount);
        _logEv(treasury, "premint_treasury", treasuryAmount, "115M for operations");
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

    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        // M-4 Fix: Add upper bound on deadline to prevent indefinite approvals
        require(block.timestamp <= deadline, "VFIDE: expired deadline");
        require(deadline <= block.timestamp + 30 days, "VFIDE: deadline too far");
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++));
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0) && signer == owner, "VFIDE: invalid signature");
        _approve(owner, spender, value);
    }

    function transfer(address to, uint256 amount) external nonReentrant returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external nonReentrant returns (bool) {
        // Spender must not be blacklisted
        require(!isBlacklisted[msg.sender], "Sanctioned");
        uint256 cur = _allowances[from][msg.sender];
        require(cur >= amount, "allow");
        _approve(from, msg.sender, cur - amount);
        _transfer(from, to, amount);
        return true;
    }

    // ─────────────────────────── Admin / Modules

    function setVaultHub(address hub) external onlyOwner {
        require(hub != address(0), "VF: zero address");
        vaultHub = IVaultHub(hub);
        emit VaultHubSet(hub);
        _log("vault_hub_set");
    }

    function setSecurityHub(address hub) external onlyOwner {
        securityHub = ISecurityHub(hub);
        emit SecurityHubSet(hub);
        _log("security_hub_set");
    }

    function setLedger(address _ledger) external onlyOwner {
        ledger = IProofLedger(_ledger);
        emit LedgerSet(_ledger);
        _log("ledger_set");
    }

    function setBurnRouter(address router) external onlyOwner {
        if (policyLocked && router == address(0)) revert VF_POLICY_LOCKED();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingBurnRouter = router;
        pendingBurnRouterAt = effectiveAt;
        emit BurnRouterScheduled(router, effectiveAt);
        _log("burn_router_scheduled");
    }

    function applyBurnRouter() external onlyOwner {
        require(pendingBurnRouterAt != 0, "VF: no pending");
        require(block.timestamp >= pendingBurnRouterAt, "VF: timelock");
        burnRouter = IProofScoreBurnRouterToken(pendingBurnRouter);
        emit BurnRouterSet(pendingBurnRouter);
        _log("burn_router_set");
        delete pendingBurnRouter;
        delete pendingBurnRouterAt;
    }

    function setTreasurySink(address sink) external onlyOwner {
        if (policyLocked && sink == address(0)) revert VF_POLICY_LOCKED();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingTreasurySink = sink;
        pendingTreasurySinkAt = effectiveAt;
        emit TreasurySinkScheduled(sink, effectiveAt);
        _log("treasury_sink_scheduled");
    }

    function applyTreasurySink() external onlyOwner {
        require(pendingTreasurySinkAt != 0, "VF: no pending");
        require(block.timestamp >= pendingTreasurySinkAt, "VF: timelock");
        treasurySink = pendingTreasurySink;
        emit TreasurySinkSet(pendingTreasurySink);
        _log("treasury_sink_set");
        delete pendingTreasurySink;
        delete pendingTreasurySinkAt;
    }

    function setSanctumSink(address _sanctum) external onlyOwner {
        if (policyLocked) require(_sanctum != address(0), "VF: cannot set zero when locked");
        require(_sanctum != address(0), "VF: zero address");
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingSanctumSink = _sanctum;
        pendingSanctumSinkAt = effectiveAt;
        emit SanctumSinkScheduled(_sanctum, effectiveAt);
        _log("sanctum_sink_scheduled");
    }

    function applySanctumSink() external onlyOwner {
        require(pendingSanctumSinkAt != 0, "VF: no pending");
        require(block.timestamp >= pendingSanctumSinkAt, "VF: timelock");
        sanctumSink = pendingSanctumSink;
        emit SanctumSinkSet(pendingSanctumSink);
        _log("sanctum_sink_set");
        delete pendingSanctumSink;
        delete pendingSanctumSinkAt;
    }

    /// @notice Exempt address from all checks (fees + vault-only) - use for system contracts
    function setSystemExempt(address who, bool isExempt) external onlyOwner {
        require(who != address(0), "VF: zero address");
        systemExempt[who] = isExempt;
        emit SystemExemptSet(who, isExempt);
        _logEv(who, isExempt ? "exempt_on" : "exempt_off", 0, "");
    }
    
    /// @notice Whitelist address to bypass vault-only rule - use for exchanges/DEXs
    function setWhitelist(address addr, bool status) external onlyOwner {
        require(addr != address(0), "VF: zero address");
        whitelisted[addr] = status;
        emit Whitelisted(addr, status);
        _logEv(addr, status ? "whitelist_add" : "whitelist_remove", 0, "");
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
     * @notice Emergency switch to bypass external calls if they fail
     * @dev Can be toggled even if policyLocked is true to ensure liveness
     * @dev Circuit breaker auto-disables after duration to prevent abuse
     * @param _active True to enable circuit breaker, false to disable
     * @param _duration Duration in seconds (max 7 days). Ignored when disabling.
     */
    function setCircuitBreaker(bool _active, uint256 _duration) external onlyOwner {
        if (_active) {
            require(_duration > 0 && _duration <= MAX_CIRCUIT_BREAKER_DURATION, "VF: invalid duration");
            circuitBreaker = true;
            circuitBreakerExpiry = block.timestamp + _duration;
        } else {
            circuitBreaker = false;
            circuitBreakerExpiry = 0;
        }
        emit CircuitBreakerSet(_active, circuitBreakerExpiry);
        _log(_active ? "circuit_breaker_on" : "circuit_breaker_off");
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
     * @dev C-1 Fix: Requires freeze period to prevent front-running
     * @param user Address to blacklist
     * @param status True to blacklist, false to remove
     */
    function setBlacklist(address user, bool status) external onlyOwner {
        if (status) {
            // To add to blacklist, must be frozen first for FREEZE_DELAY
            require(isFrozen[user], "VF: must freeze first");
            require(block.timestamp >= freezeTime[user] + FREEZE_DELAY, "VF: freeze delay not met");
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
        // 1. Sanctions check
        require(!isBlacklisted[from] && !isBlacklisted[to], "Sanctioned");

        // 2. Anti-whale checks (skip for exempt addresses like exchanges, mints, burns)
        if (!whaleLimitExempt[from] && !whaleLimitExempt[to] && 
            !systemExempt[from] && !systemExempt[to] &&
            from != address(0) && to != address(0)) {
            _checkWhaleProtection(from, to, amount);
        }

        // 3. Auto-create vaults if needed (vault-only enforcement)
        if (vaultOnly && address(vaultHub) != address(0)) {
            // Auto-create vault for recipient if needed (EOA receiving first tokens)
            if (!_isContract(to) && to != address(0) && !systemExempt[to] && !whitelisted[to]) {
                // Check if recipient owns a vault (handles recovery scenarios)
                if (!_hasVault(to)) {
                    // Try to create vault - will revert if vaultHub not set or fails
                    try vaultHub.ensureVault(to) returns (address vault) {
                        // Vault created or already exists
                        _logEv(vault, "vault_auto_created", 0, "");
                    } catch {
                        // Creation failed - revert
                        revert Token_NotVault();
                    }
                }
            }
            
            // 3. Vault-only enforcement
            // FROM must be: mint, system exempt, whitelisted, vault, or owns a vault
            bool fromOk = (from == address(0) || systemExempt[from] || whitelisted[from] || 
                          _isVault(from) || _hasVault(from));
            
            // TO must be: burn, sink, system exempt, whitelisted, vault, or owns a vault
            bool toOk = (to == address(0) || to == treasurySink || to == sanctumSink || 
                        systemExempt[to] || whitelisted[to] || _isVault(to) || _hasVault(to));
            
            if (!fromOk) revert Token_NotVault();
            if (!toOk) revert Token_NotVault();
        }

        if (from == address(0) || to == address(0)) revert VF_ZERO();
        if (amount == 0) revert VF_ZERO();  // H-2 Fix: Reject zero amount transfers

        // Optimization: Fetch vaults once if needed for SecurityHub
        address fromVault;
        address toVault;
        if (address(securityHub) != address(0)) {
            fromVault = _vaultOfAddr(from);
            toVault   = _vaultOfAddr(to);
        }

        // SecurityHub lock check (if set and not bypassed)
        if (address(securityHub) != address(0) && !isCircuitBreakerActive()) {
            if ((fromVault != address(0) && _locked(fromVault)) ||
                (toVault   != address(0) && _locked(toVault))) {
                revert VF_LOCKED();
            }
        }

        // Balance update: pull from sender
        uint256 bal = _balances[from];
        require(bal >= amount, "balance");
        unchecked { _balances[from] = bal - amount; }

        uint256 remaining = amount;

        // Dynamic fees via burn router (if present and not exempt and not bypassed)
        if (address(burnRouter) != address(0) && !isCircuitBreakerActive() && !(systemExempt[from] || systemExempt[to])) {
            (uint256 _burnAmt, uint256 _sanctumAmt, uint256 _ecoAmt, address _sanctumSink, address _ecoSink, address _burnSink) =
                burnRouter.computeFees(from, to, amount);

            if (_burnAmt > 0) {
                address sink = (_burnSink == address(0)) ? address(0) : _burnSink;
                _applyBurn(from, sink, _burnAmt);
                remaining -= _burnAmt;
                
                // Record burn for daily cap tracking (sustainability)
                try IProofScoreBurnRouter(address(burnRouter)).recordBurn(_burnAmt) {} catch {}
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
                emit FeeApplied(from, to, _burnAmt, _sanctumAmt, _ecoAmt, (_sanctumSink == address(0) ? treasurySink : _sanctumSink), (_ecoSink == address(0) ? treasurySink : _ecoSink));
            }
            
            // Record volume for adaptive fee tracking (sustainability)
            try IProofScoreBurnRouter(address(burnRouter)).recordVolume(amount) {} catch {}
        } else {
            // If policy is locked we require a router be present so fees cannot be bypassed
            if (policyLocked) {
                require(address(burnRouter) != address(0), "router required");
            }
        }

        // Deliver net to receiver
        _balances[to] += remaining;
        emit Transfer(from, to, remaining);

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
        return size > 0;
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
        return vaultHub.vaultOf(a);
    }

    function _locked(address vault) internal view returns (bool) {
        (bool ok, bytes memory d) = address(securityHub).staticcall(abi.encodeWithSelector(ISecurityHub.isLocked.selector, vault));
        // H-1 Fix: Default to unlocked on call failure to prevent fund lockout
        if (!ok || d.length < 32) return false;
        return abi.decode(d, (bool));
    }
    
    // ─────────────────────────── Anti-Whale Protection Logic
    
    /**
     * @dev Check and enforce all anti-whale protections
     * Reverts if any limit is exceeded
     */
    function _checkWhaleProtection(address from, address to, uint256 amount) internal {
        // 1. Max transfer amount check
        if (maxTransferAmount > 0 && amount > maxTransferAmount) {
            revert VF_MaxTransferExceeded();
        }
        
        // 2. Max wallet balance check (for recipient)
        if (maxWalletBalance > 0) {
            uint256 recipientNewBalance = _balances[to] + amount;
            if (recipientNewBalance > maxWalletBalance) {
                revert VF_MaxWalletExceeded();
            }
        }
        
        // 3. Daily transfer limit check (for sender)
        if (dailyTransferLimit > 0) {
            // Reset daily counter if 24h has passed
            // H-3 Fix: Align to consistent 24-hour periods to prevent gaming
            uint256 currentDay = block.timestamp / 1 days;
            uint256 lastResetDay = dailyResetTime[from] / 1 days;
            if (currentDay > lastResetDay) {
                dailyTransferred[from] = 0;
                dailyResetTime[from] = currentDay * 1 days; // Align to day boundary
            }
            
            if (dailyTransferred[from] + amount > dailyTransferLimit) {
                revert VF_DailyLimitExceeded();
            }
            
            // Update daily transferred amount
            dailyTransferred[from] += amount;
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
    
    /**
     * @dev View function to check remaining daily allowance
     */
    function remainingDailyLimit(address account) external view returns (uint256) {
        if (dailyTransferLimit == 0) return type(uint256).max; // No limit
        
        // If reset time has passed, return full limit
        // H-3 Fix: Use day boundary check for consistency
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = dailyResetTime[account] / 1 days;
        if (currentDay > lastResetDay) {
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
        if (lastTransferTime[account] == 0) return 0;
        
        uint256 unlockTime = lastTransferTime[account] + transferCooldown;
        if (block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
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
        // Sanctions check
        if (isBlacklisted[from]) return (false, "Sender blacklisted");
        if (isBlacklisted[to]) return (false, "Recipient blacklisted");
        
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
            if (maxWalletBalance > 0 && (_balances[to] + amount) > maxWalletBalance) {
                return (false, "Exceeds max wallet balance");
            }
            
            // Daily limit
            if (dailyTransferLimit > 0) {
                uint256 transferred = dailyTransferred[from];
                // H-3 Fix: Use day boundary check for consistency
                uint256 currentDay = block.timestamp / 1 days;
                uint256 lastResetDay = dailyResetTime[from] / 1 days;
                if (currentDay == lastResetDay) {
                    if (transferred + amount > dailyTransferLimit) {
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
        if (address(securityHub) != address(0) && !isCircuitBreakerActive()) {
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
        if (systemExempt[from] || systemExempt[to] || address(burnRouter) == address(0) || isCircuitBreakerActive()) {
            return (0, 0, 0, amount);
        }
        
        // Get fees from router
        (burnAmount, sanctumAmount, ecosystemAmount, , , ) = burnRouter.computeFees(from, to, amount);
        
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
            
            // Calculate daily remaining
            if (dailyTransferLimit > 0) {
                // H-3 Fix: Use day boundary check for consistency
                uint256 currentDay = block.timestamp / 1 days;
                uint256 lastResetDay = dailyResetTime[account] / 1 days;
                if (currentDay > lastResetDay) {
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
        
        // H-3 FIX: Use day-boundary logic consistent with enforcement
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = dailyResetTime[user] / 1 days;
        
        if (currentDay > lastResetDay) {
            // New day - counter would reset on next transfer
            transferred = 0;
            remaining = limit;
            resetTime = currentDay * 1 days;
            nextResetTime = resetTime + 24 hours;
        } else {
            transferred = dailyTransferred[user];
            remaining = transferred >= limit ? 0 : limit - transferred;
            resetTime = lastResetDay * 1 days;
            nextResetTime = resetTime + 24 hours;
        }
    }
}
