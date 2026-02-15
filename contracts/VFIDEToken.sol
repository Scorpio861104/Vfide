// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * VFIDEToken (zkSync Era ready)
 * ----------------------------------------------------------
 * SUPPLY (ALL MINTED AT GENESIS):
 * - Total supply: 200,000,000 VFIDE (18 decimals)
 * - Dev reserve: 50,000,000 → DevReserveVestingVault (locked)
 * - Presale allocation: 50,000,000 → PresaleContract (35M base + 15M bonus)
 * - Treasury/Operations: 100,000,000 → Treasury (liquidity, CEX, operations)
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
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }

    /// Constants
    string public constant name = "VFIDE Token";  // WHITEPAPER: "VFIDE Token"
    string public constant symbol = "VFIDE";
    uint8  public constant decimals = 18;

    uint256 public constant MAX_SUPPLY = 200_000_000e18;
    uint256 public constant DEV_RESERVE_SUPPLY = 50_000_000e18;
    uint256 public constant PRESALE_CAP = 50_000_000e18;

    // ─────────────────────────── Anti-Whale Protection
    // All limits configurable by owner, can be disabled by setting to 0
    uint256 public maxTransferAmount = 2_000_000e18;     // 2M VFIDE max per transfer (1% of supply)
    uint256 public maxWalletBalance = 4_000_000e18;      // 4M VFIDE max per wallet (2% of supply)
    uint256 public dailyTransferLimit = 5_000_000e18;    // 5M VFIDE max per 24h (2.5% of supply)
    uint256 public transferCooldown = 0;                  // Seconds between transfers (0 = disabled)
    uint256 public constant MAX_COOLDOWN = 1 hours;       // Upper bound for transfer cooldown

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

    // Governance delegation & checkpoints
    mapping(address => address) public delegates;
    mapping(address => Checkpoint[]) public checkpoints;
    mapping(address => uint32) public numCheckpoints;

    /// Modules & config
    IVaultHub public vaultHub;                    // vault registry (required)
    ISecurityHub public securityHub;              // lock checks (optional)
    IProofLedger public ledger;                   // event logging (optional)
    IProofScoreBurnRouterToken public burnRouter; // fee calculator (optional)
    address public pendingBurnRouter;                     // two-step: proposed router
    uint256 public burnRouterProposalTime;                // two-step: proposal timestamp
    uint256 public constant BURN_ROUTER_DELAY = 2 days;  // two-step: mandatory delay

    // Two-step timelock for module changes (VaultHub, SecurityHub, Ledger)
    uint256 public constant MODULE_CHANGE_DELAY = 2 days;
    address public pendingVaultHub;
    uint256 public vaultHubProposalTime;
    address public pendingSecurityHub;
    uint256 public securityHubProposalTime;
    address public pendingLedger;
    uint256 public ledgerProposalTime;

    /// Policy settings
    bool public vaultOnly = true;                 // VAULT-ONLY ON BY DEFAULT (user security)
    bool public policyLocked = false;             // once locked, cannot disable vault-only
    bool public circuitBreaker = false;           // emergency bypass
    uint256 public circuitBreakerExpiry = 0;      // auto-disable timestamp (0 = indefinite)
    uint256 public constant MAX_CIRCUIT_BREAKER_DURATION = 7 days; // maximum allowed duration
    
    /// Exemptions
    mapping(address => bool) public systemExempt; // bypass all checks (presale, sinks, etc)
    mapping(address => bool) public whitelisted;  // bypass vault-only (exchanges)

    // Two-step timelock for exemption changes (prevent instant rug)
    uint256 public constant EXEMPT_CHANGE_DELAY = 1 days;
    struct PendingExemption {
        bool isExempt;
        uint256 proposalTime;
    }
    mapping(address => PendingExemption) public pendingExemptions;
    mapping(address => PendingExemption) public pendingWhitelist;

    // Presale control (set at genesis, receives 50M tokens)
    address public presaleContract;

    // Sinks (fallbacks if router is unset or returns zero sinks)
    address public treasurySink;  // sanctuary/treasury receiver for charity share
    address public sanctumSink; // Optional: Burn to Sanctum instead of 0x0

    // Two-step timelock for sink changes (prevent instant fee redirection)
    uint256 public constant SINK_CHANGE_DELAY = 2 days;
    address public pendingTreasurySink;
    uint256 public treasurySinkProposalTime;
    address public pendingSanctumSink;
    uint256 public sanctumSinkProposalTime;
    
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
    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    /// Events
    event VaultHubSet(address indexed hub);
    event VaultHubProposed(address indexed hub, uint256 effectiveTime);
    event SecurityHubSet(address indexed hub);
    event SecurityHubProposed(address indexed hub, uint256 effectiveTime);
    event LedgerSet(address indexed ledger);
    event LedgerProposed(address indexed ledger, uint256 effectiveTime);
    event BurnRouterSet(address indexed router);
    event BurnRouterProposed(address indexed router, uint256 effectiveTime);
    event BurnRouterConfirmed(address indexed router);
    event TreasurySinkSet(address indexed sink);
    event TreasurySinkProposed(address indexed sink, uint256 effectiveTime);
    event SanctumSinkSet(address indexed sink);
    event SanctumSinkProposed(address indexed sink, uint256 effectiveTime);
    event SystemExemptSet(address indexed who, bool isExempt);
    event SystemExemptProposed(address indexed who, bool isExempt, uint256 effectiveTime);
    event Whitelisted(address indexed addr, bool status);
    event WhitelistProposed(address indexed addr, bool status, uint256 effectiveTime);
    event VaultOnlySet(bool enabled);
    event ExemptSet(address indexed target, bool exempt);
    event PolicyLocked();
    event CircuitBreakerSet(bool active, uint256 expiry);
    event PresaleContractSet(address indexed presale);
    event FeeApplied(address indexed from, address indexed to, uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, address indexed sanctumSink, address ecosystemSink);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

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
        address _presaleContract,       // MUST be deployed before token (receives 50M for sale)
        address treasury,               // Treasury/Owner address (receives 100M for operations/liquidity)
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
        
        // 50M to Presale Contract (35M base + 15M bonus)
        _balances[_presaleContract] = PRESALE_CAP;
        emit Transfer(address(0), _presaleContract, PRESALE_CAP);
        _logEv(_presaleContract, "premint_presale", PRESALE_CAP, "50M for presale");
        
        // 100M to Treasury (operations, liquidity, CEX, trading)
        uint256 treasuryAmount = MAX_SUPPLY - DEV_RESERVE_SUPPLY - PRESALE_CAP;
        _balances[treasury] = treasuryAmount;
        emit Transfer(address(0), treasury, treasuryAmount);
        _logEv(treasury, "premint_treasury", treasuryAmount, "100M for operations");
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

    /// @notice Batch transfer to multiple recipients
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external nonReentrant returns (bool) {
        require(recipients.length == amounts.length, "length mismatch");
        require(recipients.length <= 100, "too many recipients");

        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }

        return true;
    }

    /// @notice Batch approve multiple spenders
    function batchApprove(address[] calldata spenders, uint256[] calldata amounts) external returns (bool) {
        require(spenders.length == amounts.length, "length mismatch");
        require(spenders.length <= 100, "too many spenders");

        for (uint256 i = 0; i < spenders.length; i++) {
            _approve(msg.sender, spenders[i], amounts[i]);
        }

        return true;
    }

    /// @notice Delegate voting power to another address
    function delegate(address delegatee) external {
        _delegate(msg.sender, delegatee);
    }

    /// @notice Get current votes for an account
    function getCurrentVotes(address account) external view returns (uint256) {
        uint32 nCheckpoints = numCheckpoints[account];
        return nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : 0;
    }

    /// @notice Get votes for an account at a prior block
    function getPriorVotes(address account, uint256 blockNumber) external view returns (uint224) {
        require(blockNumber < block.number, "VFIDE: not yet determined");

        uint32 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) {
            return 0;
        }

        if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            return checkpoints[account][nCheckpoints - 1].votes;
        }

        if (checkpoints[account][0].fromBlock > blockNumber) {
            return 0;
        }

        uint32 lower = 0;
        uint32 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = checkpoints[account][center];

            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }

        return checkpoints[account][lower].votes;
    }

    // ─────────────────────────── Admin / Modules

    /// @notice Propose a new VaultHub (two-step with MODULE_CHANGE_DELAY)
    function proposeVaultHub(address hub) external onlyOwner {
        require(hub != address(0), "VF: zero address");
        pendingVaultHub = hub;
        vaultHubProposalTime = block.timestamp;
        emit VaultHubProposed(hub, block.timestamp + MODULE_CHANGE_DELAY);
        _log("vault_hub_proposed");
    }

    /// @notice Confirm the pending VaultHub after delay
    function confirmVaultHub() external onlyOwner {
        require(vaultHubProposalTime > 0, "VF: no proposal");
        require(block.timestamp >= vaultHubProposalTime + MODULE_CHANGE_DELAY, "VF: delay not met");
        address hub = pendingVaultHub;
        vaultHub = IVaultHub(hub);
        emit VaultHubSet(hub);
        pendingVaultHub = address(0);
        vaultHubProposalTime = 0;
        _log("vault_hub_confirmed");
    }

    /// @notice Propose a new SecurityHub (two-step with MODULE_CHANGE_DELAY)
    function proposeSecurityHub(address hub) external onlyOwner {
        pendingSecurityHub = hub;
        securityHubProposalTime = block.timestamp;
        emit SecurityHubProposed(hub, block.timestamp + MODULE_CHANGE_DELAY);
        _log("security_hub_proposed");
    }

    /// @notice Confirm the pending SecurityHub after delay
    function confirmSecurityHub() external onlyOwner {
        require(securityHubProposalTime > 0, "VF: no proposal");
        require(block.timestamp >= securityHubProposalTime + MODULE_CHANGE_DELAY, "VF: delay not met");
        address hub = pendingSecurityHub;
        securityHub = ISecurityHub(hub);
        emit SecurityHubSet(hub);
        pendingSecurityHub = address(0);
        securityHubProposalTime = 0;
        _log("security_hub_confirmed");
    }

    /// @notice Propose a new Ledger (two-step with MODULE_CHANGE_DELAY)
    function proposeLedger(address _ledger) external onlyOwner {
        pendingLedger = _ledger;
        ledgerProposalTime = block.timestamp;
        emit LedgerProposed(_ledger, block.timestamp + MODULE_CHANGE_DELAY);
        _log("ledger_proposed");
    }

    /// @notice Confirm the pending Ledger after delay
    function confirmLedger() external onlyOwner {
        require(ledgerProposalTime > 0, "VF: no proposal");
        require(block.timestamp >= ledgerProposalTime + MODULE_CHANGE_DELAY, "VF: delay not met");
        address _ledger = pendingLedger;
        ledger = IProofLedger(_ledger);
        emit LedgerSet(_ledger);
        pendingLedger = address(0);
        ledgerProposalTime = 0;
        _log("ledger_confirmed");
    }

    /// @notice Propose a new burn router (two-step: propose then confirm after delay)
    /// @param router Address of the proposed burn router
    function proposeBurnRouter(address router) external onlyOwner {
        if (policyLocked && router == address(0)) revert VF_POLICY_LOCKED();
        pendingBurnRouter = router;
        burnRouterProposalTime = block.timestamp;
        emit BurnRouterProposed(router, block.timestamp + BURN_ROUTER_DELAY);
        _log("burn_router_proposed");
    }

    /// @notice Confirm the pending burn router after BURN_ROUTER_DELAY has elapsed
    function confirmBurnRouter() external onlyOwner {
        require(burnRouterProposalTime > 0, "VF: no proposal");
        require(block.timestamp >= burnRouterProposalTime + BURN_ROUTER_DELAY, "VF: delay not met");
        address router = pendingBurnRouter;
        burnRouter = IProofScoreBurnRouterToken(router);
        emit BurnRouterSet(router);
        emit BurnRouterConfirmed(router);
        pendingBurnRouter = address(0);
        burnRouterProposalTime = 0;
        _log("burn_router_confirmed");
    }

    /// @notice Propose a new treasury sink (2-day delay to prevent instant fee redirection)
    function proposeTreasurySink(address sink) external onlyOwner {
        if (policyLocked && sink == address(0)) revert VF_POLICY_LOCKED();
        pendingTreasurySink = sink;
        treasurySinkProposalTime = block.timestamp;
        emit TreasurySinkProposed(sink, block.timestamp + SINK_CHANGE_DELAY);
        _log("treasury_sink_proposed");
    }

    /// @notice Confirm the pending treasury sink after SINK_CHANGE_DELAY has elapsed
    function confirmTreasurySink() external onlyOwner {
        require(treasurySinkProposalTime > 0, "VF: no proposal");
        require(block.timestamp >= treasurySinkProposalTime + SINK_CHANGE_DELAY, "VF: delay not met");
        address sink = pendingTreasurySink;
        treasurySink = sink;
        pendingTreasurySink = address(0);
        treasurySinkProposalTime = 0;
        emit TreasurySinkSet(sink);
        _log("treasury_sink_set");
    }

    /// @notice Propose a new sanctum sink (2-day delay to prevent instant fee redirection)
    function proposeSanctumSink(address _sanctum) external onlyOwner {
        if (policyLocked) require(_sanctum != address(0), "VF: cannot set zero when locked");
        require(_sanctum != address(0), "VF: zero address");
        pendingSanctumSink = _sanctum;
        sanctumSinkProposalTime = block.timestamp;
        emit SanctumSinkProposed(_sanctum, block.timestamp + SINK_CHANGE_DELAY);
        _log("sanctum_sink_proposed");
    }

    /// @notice Confirm the pending sanctum sink after SINK_CHANGE_DELAY has elapsed
    function confirmSanctumSink() external onlyOwner {
        require(sanctumSinkProposalTime > 0, "VF: no proposal");
        require(block.timestamp >= sanctumSinkProposalTime + SINK_CHANGE_DELAY, "VF: delay not met");
        address sink = pendingSanctumSink;
        require(sink != address(0), "VF: zero address");
        sanctumSink = sink;
        pendingSanctumSink = address(0);
        sanctumSinkProposalTime = 0;
        emit SanctumSinkSet(sink);
        _log("sanctum_sink_set");
    }

    /// @notice Propose exemption change (1-day delay to prevent instant rug)
    function proposeSystemExempt(address who, bool isExempt) external onlyOwner {
        require(who != address(0), "VF: zero address");
        pendingExemptions[who] = PendingExemption(isExempt, block.timestamp);
        emit SystemExemptProposed(who, isExempt, block.timestamp + EXEMPT_CHANGE_DELAY);
        _logEv(who, isExempt ? "exempt_proposed_on" : "exempt_proposed_off", 0, "");
    }

    /// @notice Confirm pending exemption change after delay
    function confirmSystemExempt(address who) external onlyOwner {
        PendingExemption memory p = pendingExemptions[who];
        require(p.proposalTime > 0, "VF: no proposal");
        require(block.timestamp >= p.proposalTime + EXEMPT_CHANGE_DELAY, "VF: delay not met");
        systemExempt[who] = p.isExempt;
        delete pendingExemptions[who];
        emit SystemExemptSet(who, p.isExempt);
        _logEv(who, p.isExempt ? "exempt_on" : "exempt_off", 0, "");
    }

    /// @notice Propose whitelist change (1-day delay)
    function proposeWhitelist(address addr, bool status) external onlyOwner {
        require(addr != address(0), "VF: zero address");
        pendingWhitelist[addr] = PendingExemption(status, block.timestamp);
        emit WhitelistProposed(addr, status, block.timestamp + EXEMPT_CHANGE_DELAY);
        _logEv(addr, status ? "whitelist_proposed_add" : "whitelist_proposed_remove", 0, "");
    }

    /// @notice Confirm pending whitelist change after delay
    function confirmWhitelist(address addr) external onlyOwner {
        PendingExemption memory p = pendingWhitelist[addr];
        require(p.proposalTime > 0, "VF: no proposal");
        require(block.timestamp >= p.proposalTime + EXEMPT_CHANGE_DELAY, "VF: delay not met");
        whitelisted[addr] = p.isExempt;
        delete pendingWhitelist[addr];
        emit Whitelisted(addr, p.isExempt);
        _logEv(addr, p.isExempt ? "whitelist_add" : "whitelist_remove", 0, "");
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
        // Unconditional floors: prevent honeypotting by removing limits entirely
        require(_maxTransfer >= 100e18, "min 100 VFIDE");
        require(_dailyLimit >= 1000e18, "min 1000 VFIDE");
        // Conditional: wallet limit can be disabled (0) but has a floor if enabled
        if (_maxWallet > 0) require(_maxWallet >= 200_000e18, "min 200k");
        require(_cooldown <= MAX_COOLDOWN, "exceeds MAX_COOLDOWN");

        maxTransferAmount = _maxTransfer;
        maxWalletBalance = _maxWallet;
        dailyTransferLimit = _dailyLimit;
        transferCooldown = _cooldown;

        emit AntiWhaleSet(_maxTransfer, _maxWallet, _dailyLimit, _cooldown);
        _log("anti_whale_updated");
    }
    
    /**
     * @notice Exempt address from whale limits (for exchanges, liquidity pools, etc.)
     * @dev Only contracts may be granted exemption (guard against self-destructed addresses)
     */
    function setWhaleLimitExempt(address addr, bool exempt) external onlyOwner {
        if (exempt) {
            uint256 size;
            assembly { size := extcodesize(addr) }
            require(size > 0, "VF: must be contract");
        }
        whaleLimitExempt[addr] = exempt;
        emit WhaleLimitExemptSet(addr, exempt);
    }

    /**
     * @notice Set transfer cooldown independently
     * @param _cooldown Seconds between transfers (0 = disabled, max MAX_COOLDOWN)
     */
    function setTransferCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown <= MAX_COOLDOWN, "exceeds MAX_COOLDOWN");
        transferCooldown = _cooldown;
        emit AntiWhaleSet(maxTransferAmount, maxWalletBalance, dailyTransferLimit, _cooldown);
        _log("transfer_cooldown_updated");
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
                _moveDelegates(delegates[from], delegates[sink2], _sanctumAmt);
                remaining -= _sanctumAmt;
            }
            if (_ecoAmt > 0) {
                address sink3 = (_ecoSink == address(0)) ? treasurySink : _ecoSink;
                require(sink3 != address(0), "eco sink=0");
                _balances[sink3] += _ecoAmt;
                emit Transfer(from, sink3, _ecoAmt);
                _moveDelegates(delegates[from], delegates[sink3], _ecoAmt);
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
        _moveDelegates(delegates[from], delegates[to], remaining);

        _logEv(from, "transfer", amount, "");
    }

    function _applyBurn(address from, address sink, uint256 burnAmt) internal {
        if (sink == address(0)) {
            // Hard burn
            totalSupply -= burnAmt;
            emit Transfer(from, address(0), burnAmt);
            _moveDelegates(delegates[from], address(0), burnAmt);
        } else {
            // Soft burn sink (e.g., dead vault, dedicated burner)
            _balances[sink] += burnAmt;
            emit Transfer(from, sink, burnAmt);
            _moveDelegates(delegates[from], delegates[sink], burnAmt);
        }
    }

    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert VF_ZERO();
        if (totalSupply + amount > MAX_SUPPLY) revert VF_CAP();
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
        _moveDelegates(address(0), delegates[to], amount);
    }

    function _approve(address owner_, address spender, uint256 amount) internal {
        require(owner_ != address(0) && spender != address(0), "approve 0");
        _allowances[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        uint256 delegatorBalance = _balances[delegator];
        delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }

    function _moveDelegates(address srcRep, address dstRep, uint256 amount) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint32 srcRepNum = numCheckpoints[srcRep];
                uint256 srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].votes : 0;
                uint256 srcRepNew = srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNum, srcRepOld, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint32 dstRepNum = numCheckpoints[dstRep];
                uint256 dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].votes : 0;
                uint256 dstRepNew = dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepNum, dstRepOld, dstRepNew);
            }
        }
    }

    function _writeCheckpoint(
        address delegatee,
        uint32 nCheckpoints,
        uint256 oldVotes,
        uint256 newVotes
    ) internal {
        uint32 blockNumber = safe32(block.number, "VFIDE: block number exceeds 32 bits");

        if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints - 1].fromBlock == blockNumber) {
            checkpoints[delegatee][nCheckpoints - 1].votes = safe224(newVotes, "VFIDE: votes exceed 224 bits");
        } else {
            checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, safe224(newVotes, "VFIDE: votes exceed 224 bits"));
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }

        emit DelegateVotesChanged(delegatee, oldVotes, newVotes);
    }

    function safe32(uint n, string memory errorMessage) internal pure returns (uint32) {
        require(n < (1 << 32), errorMessage);
        return uint32(n);
    }

    function safe224(uint n, string memory errorMessage) internal pure returns (uint224) {
        require(n < (1 << 224), errorMessage);
        return uint224(n);
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
