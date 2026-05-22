// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { LedgerLogFailed, IVaultHub, IProofLedger, IProofScoreBurnRouterToken, IProofScoreBurnRouter, IEmergencyBreaker, Ownable, ReentrancyGuard } from "./SharedInterfaces.sol";

/// @dev Fraud registry interface for community-driven fraud flagging
/// @notice IFraudRegistry
/// @title IFraudRegistry
/// @author Vfide
interface IFraudRegistry {
    /// @notice requiresEscrow
    /// @param user user
    /// @return _bool _bool
    function requiresEscrow(address user) external view returns (bool);
    /// @notice escrowTransfer
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _uint256 _uint256
    function escrowTransfer(address from, address to, uint256 amount) external returns (uint256);
}

/// @dev C-1 FIX: Interface for FeeDistributor.receiveFee() — called after eco fees are credited
/// @notice IEcosystemDistributor
/// @title IEcosystemDistributor
/// @author Vfide
interface IEcosystemDistributor {
    /// @notice receiveFee
    /// @param amount amount
    function receiveFee(uint256 amount) external;
}

/// @notice ISeerAutonomousToken
/// @title ISeerAutonomousToken
/// @author Vfide
interface ISeerAutonomousToken {
    /// @notice beforeAction
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
    /// @return _uint8 _uint8
    function beforeAction(address subject, uint8 action, uint256 amount, address counterparty) external returns (uint8);
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
 * - FraudRegistry community-driven 30-day escrow (not a freeze)
 * - ProofLedger event logging
 * - Policy lock (makes vault-only permanent)
 * - Circuit breaker (emergency bypass)
 * - Anti-whale protection (configurable limits)
 * - EIP-2612 permit
 */

/// ─────────────────────────── ERC20 (no OZ deps; 0.8.x checked math)
/// @notice VFIDEToken
/// @title VFIDEToken
/// @author Vfide
contract VFIDEToken is Ownable, ReentrancyGuard {
    /// Constants
    /// @notice name
    string public constant name = "VFIDE Token";  // WHITEPAPER: "VFIDE Token"
    /// @notice symbol
    string public constant symbol = "VFIDE";
    /// @notice decimals
    uint8  public constant decimals = 18;

    /// @notice MAX_SUPPLY
    uint256 public constant MAX_SUPPLY = 200_000_000e18;
    /// @notice DEV_RESERVE_SUPPLY
    uint256 public constant DEV_RESERVE_SUPPLY = 50_000_000e18;
    /// @notice ECDSA_S_UPPER_BOUND
    uint256 private constant ECDSA_S_UPPER_BOUND = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;
    /// @notice EMPTY_CODE_HASH
    bytes32 private constant EMPTY_CODE_HASH = keccak256("");

    // ─────────────────────────── Anti-Whale Protection
    // All limits configurable by owner, can be disabled by setting to 0
    /// @notice maxTransferAmount
    uint256 public maxTransferAmount = 2_000_000e18;     // 2M VFIDE max per transfer (1% of supply)
    /// @notice maxWalletBalance
    uint256 public maxWalletBalance = 4_000_000e18;      // 4M VFIDE max per wallet (2% of supply)
    /// @notice dailyTransferLimit
    uint256 public dailyTransferLimit = 5_000_000e18;    // 5M VFIDE max per 24h (2.5% of supply)
    /// @notice transferCooldown
    uint256 public transferCooldown = 0;                  // Seconds between transfers (0 = disabled)
    
    // Tracking for daily limits and cooldowns
    /// @notice dailyTransferred
    mapping(address => uint256) public dailyTransferred;
    /// @notice dailyResetTime
    mapping(address => uint256) public dailyResetTime;
    /// @notice lastTransferTime
    mapping(address => uint256) public lastTransferTime;
    
    // Exemptions from whale limits (exchanges, contracts, etc.)
    /// @notice whaleLimitExempt
    mapping(address => bool) public whaleLimitExempt;

    /// @notice pendingMaxTransfer
    uint256 public pendingMaxTransfer;
    /// @notice pendingMaxWallet
    uint256 public pendingMaxWallet;
    /// @notice pendingDailyLimit
    uint256 public pendingDailyLimit;
    /// @notice pendingCooldown
    uint256 public pendingCooldown;
    /// @notice pendingAntiWhaleAt
    uint64  public pendingAntiWhaleAt;
    
    /// @notice AntiWhaleSet
    /// @param maxTransfer maxTransfer
    /// @param maxWallet maxWallet
    /// @param dailyLimit dailyLimit
    /// @param cooldown cooldown
    event AntiWhaleSet(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown);
    /// @notice AntiWhaleProposed
    /// @param maxTransfer maxTransfer
    /// @param maxWallet maxWallet
    /// @param dailyLimit dailyLimit
    /// @param cooldown cooldown
    /// @param effectiveAt effectiveAt
    event AntiWhaleProposed(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown, uint64 effectiveAt);
    /// @notice WhaleLimitExemptSet
    /// @param addr addr
    /// @param exempt exempt
    event WhaleLimitExemptSet(address indexed addr, bool exempt);

    /// Storage
    /// @notice totalSupply
    uint256 public totalSupply;

    /// @notice _balances
    mapping(address => uint256) private _balances;
    /// @notice _allowances
    mapping(address => mapping(address => uint256)) private _allowances;

    /// Modules & config
    /// @notice vaultHub
    IVaultHub public vaultHub;                    // vault registry (required)
    /// @notice ledger
    IProofLedger public ledger;                   // event logging (optional)
    /// @notice burnRouter
    IProofScoreBurnRouterToken public burnRouter; // fee calculator (optional)
    /// @notice emergencyBreaker
    IEmergencyBreaker public emergencyBreaker;    // global emergency halt gate
    /// @notice seerAutonomous
    ISeerAutonomousToken public seerAutonomous;   // optional proactive transfer enforcement

    /// Fraud registry — community-driven fraud flagging
    /// Flagged addresses (3+ complaints) have transfers escrowed for 30 days
    /// @notice fraudRegistry
    IFraudRegistry public fraudRegistry;

    // 48-hour timelock for fraud registry changes
    /// @notice pendingFraudRegistry
    address public pendingFraudRegistry;
    /// @notice pendingFraudRegistryAt
    uint64  public pendingFraudRegistryAt;
    /// @notice FraudRegistryScheduled
    /// @param registry registry
    /// @param effectiveAt effectiveAt
    event FraudRegistryScheduled(address indexed registry, uint64 effectiveAt);
    /// @notice FraudRegistrySet
    /// @param registry registry
    event FraudRegistrySet(address indexed registry);

    /// Policy settings
    /// @notice vaultOnly
    bool public vaultOnly = true;                 // VAULT-ONLY ON BY DEFAULT (user security)
    /// @notice policyLocked
    bool public policyLocked = false;             // once locked, cannot disable vault-only
    /// @notice MAX_CIRCUIT_BREAKER_DURATION
    uint256 public constant MAX_CIRCUIT_BREAKER_DURATION = 7 days; // maximum allowed duration
    /// @notice feeBypass
    bool public feeBypass = false;                // bypass BurnRouter fee calculation only
    /// @notice feeBypassExpiry
    uint256 public feeBypassExpiry = 0;
    /// @notice feeBypassActivatedAt
    uint64 public feeBypassActivatedAt = 0;       // L-3 FIX: cooldown anchor for fee bypass
    /// @notice FEE_BYPASS_COOLDOWN
    uint64 public constant FEE_BYPASS_COOLDOWN = 7 days;
    
    /// Exemptions
    /// @notice systemExempt
    mapping(address => bool) public systemExempt; // bypass all checks (sinks, etc)
    /// @notice whitelisted
    mapping(address => bool) public whitelisted;  // bypass vault-only (exchanges)

    // Sinks (fallbacks if router is unset or returns zero sinks)
    /// @notice treasurySink
    address public treasurySink;  // sanctuary/treasury receiver for charity share
    /// @notice sanctumSink
    address public sanctumSink; // Optional: Burn to Sanctum instead of 0x0
    // C-1 FIX: FeeDistributor wiring — eco fees route here; triggers receiveFee() notification
    /// @notice ecosystemDistributor
    address public ecosystemDistributor;

    // 48-hour timelock for fee-sink and burn-router changes
    /// @notice SINK_CHANGE_DELAY
    uint64 public constant SINK_CHANGE_DELAY = 48 hours;
    /// @notice pendingBurnRouter
    address public pendingBurnRouter;
    /// @notice pendingBurnRouterAt
    uint64  public pendingBurnRouterAt;
    /// @notice pendingTreasurySink
    address public pendingTreasurySink;
    /// @notice pendingTreasurySinkAt
    uint64  public pendingTreasurySinkAt;
    /// @notice pendingSanctumSink
    address public pendingSanctumSink;
    /// @notice pendingSanctumSinkAt
    uint64  public pendingSanctumSinkAt;
    // C-1 FIX: Pending state for ecosystemDistributor timelock
    /// @notice pendingEcosystemDistributor
    address public pendingEcosystemDistributor;
    /// @notice pendingEcosystemDistributorAt
    uint64  public pendingEcosystemDistributorAt;

    /// @notice pendingVaultHub
    address public pendingVaultHub;
    /// @notice pendingVaultHubAt
    uint64  public pendingVaultHubAt;

    /// @notice pendingEmergencyBreaker
    address public pendingEmergencyBreaker;
    /// @notice pendingEmergencyBreakerAt
    uint64  public pendingEmergencyBreakerAt;

    /// F-05 FIX: Add timelock state for ledger changes (matches other module setters)
    /// @notice pendingLedger
    address public pendingLedger;
    /// @notice pendingLedgerAt
    uint64  public pendingLedgerAt;
    // TL-308 FIX: Timelocked seerAutonomous setter (#308)
    /// @notice pendingSeerAutonomous
    address public pendingSeerAutonomous;
    /// @notice pendingSeerAutonomousAt
    uint64  public pendingSeerAutonomousAt;

    /// @notice pendingExemptAddr
    address public pendingExemptAddr;
    /// @notice pendingExemptStatus
    bool    public pendingExemptStatus;
    /// @notice pendingExemptAt
    uint64  public pendingExemptAt;
    /// @notice pendingWhitelistAddr
    address public pendingWhitelistAddr;
    /// @notice pendingWhitelistStatus
    bool    public pendingWhitelistStatus;
    /// @notice pendingWhitelistAt
    uint64  public pendingWhitelistAt;

    /// H-2 FIX: Timelock for vault-only disablement (48-hour delay; re-enabling is always instant).
    /// @notice pendingVaultOnlyDisableAt
    uint64  public pendingVaultOnlyDisableAt;

    // L-1 FIX: Per-address pending state for whale limit exemption timelock
    /// @notice pendingWhaleExemptStatus
    mapping(address => bool)   public pendingWhaleExemptStatus;
    /// @notice pendingWhaleExemptAt
    mapping(address => uint64) public pendingWhaleExemptAt;

    /// H-6 FIX: Timelock for fee bypass activation (48-hour delay; deactivation remains instant).
        /// @notice WhaleLimitExemptProposed
        /// @param addr addr
        /// @param exempt exempt
        /// @param effectiveAt effectiveAt
        event WhaleLimitExemptProposed(address indexed addr, bool exempt, uint64 effectiveAt); // L-1 FIX
    /// @notice pendingFeeBypassActive
    bool    public pendingFeeBypassActive;
    /// @notice pendingFeeBypassDuration
    uint256 public pendingFeeBypassDuration;
    /// @notice pendingFeeBypassAt
    uint64  public pendingFeeBypassAt;
    

    // EIP-2612 Permit
    // NOTE: These two fields cannot be `immutable` even though they are set in the constructor:
    // EIP-712 requires recomputing the domain separator if the chain id changes (e.g. hard-fork
    // chain split). The `DOMAIN_SEPARATOR()` accessor recomputes and re-caches both values when
    // `block.chainid != _cachedChainId`. Marking them immutable would break that contract.
    // Slither's `immutable-states` detector cannot model this fork-aware caching pattern.
    // slither-disable-next-line immutable-states
    /// @notice _cachedDomainSeparator
    bytes32 private _cachedDomainSeparator;
    // slither-disable-next-line immutable-states
    /// @notice _cachedChainId
    uint256 private _cachedChainId;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    /// @notice PERMIT_TYPEHASH
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    /// @notice nonces
    mapping(address => uint256) public nonces;

    /// Events
    /// @notice VaultHubSet
    /// @param hub hub
    event VaultHubSet(address indexed hub);
    /// @notice VaultHubScheduled
    /// @param hub hub
    /// @param effectiveAt effectiveAt
    event VaultHubScheduled(address indexed hub, uint64 effectiveAt);
    /// @notice EmergencyBreakerSet
    /// @param breaker breaker
    event EmergencyBreakerSet(address indexed breaker);
    /// @notice EmergencyBreakerScheduled
    /// @param breaker breaker
    /// @param effectiveAt effectiveAt
    event EmergencyBreakerScheduled(address indexed breaker, uint64 effectiveAt);
    /// @notice SeerAutonomousSet
    /// @param seerAutonomous seerAutonomous
    event SeerAutonomousSet(address indexed seerAutonomous);

    /// @notice LedgerSet
    /// @param ledger ledger
    event LedgerSet(address indexed ledger);
    /// @notice LedgerScheduled
    /// @param ledger ledger
    /// @param effectiveAt effectiveAt
    event LedgerScheduled(address indexed ledger, uint64 effectiveAt);
    /// @notice BurnRouterSet
    /// @param router router
    event BurnRouterSet(address indexed router);
    /// @notice BurnRouterScheduled
    /// @param router router
    /// @param effectiveAt effectiveAt
    event BurnRouterScheduled(address indexed router, uint64 effectiveAt);
    /// @notice TreasurySinkSet
    /// @param sink sink
    event TreasurySinkSet(address indexed sink);
    /// @notice TreasurySinkScheduled
    /// @param sink sink
    /// @param effectiveAt effectiveAt
    event TreasurySinkScheduled(address indexed sink, uint64 effectiveAt);
    /// @notice SanctumSinkSet
    /// @param sink sink
    event SanctumSinkSet(address indexed sink);
    /// @notice SanctumSinkScheduled
    /// @param sink sink
    /// @param effectiveAt effectiveAt
    event SanctumSinkScheduled(address indexed sink, uint64 effectiveAt);
    // C-1 FIX: Events for ecosystemDistributor timelock
    /// @notice EcosystemDistributorSet
    /// @param distributor distributor
    event EcosystemDistributorSet(address indexed distributor);
    /// @notice EcosystemDistributorScheduled
    /// @param distributor distributor
    /// @param effectiveAt effectiveAt
    event EcosystemDistributorScheduled(address indexed distributor, uint64 effectiveAt);
    /// @notice SystemExemptSet
    /// @param who who
    /// @param isExempt isExempt
    event SystemExemptSet(address indexed who, bool isExempt);
    /// @notice SystemExemptProposed
    /// @param who who
    /// @param isExempt isExempt
    /// @param effectiveAt effectiveAt
    event SystemExemptProposed(address indexed who, bool isExempt, uint64 effectiveAt);
    /// @notice WhitelistProposed
    /// @param addr addr
    /// @param status status
    /// @param effectiveAt effectiveAt
    event WhitelistProposed(address indexed addr, bool status, uint64 effectiveAt);
    /// @notice Whitelisted
    /// @param addr addr
    /// @param status status
    event Whitelisted(address indexed addr, bool status);
    /// @notice VaultOnlySet
    /// @param enabled enabled
    event VaultOnlySet(bool enabled);
    /// @notice VaultOnlyDisableProposed
    /// @param effectiveAt effectiveAt
    event VaultOnlyDisableProposed(uint64 effectiveAt);
    /// @notice VaultOnlyDisableCancelled
    event VaultOnlyDisableCancelled();
    /// @notice PolicyLocked
    event PolicyLocked();
    /// @notice FeeBypassSet
    /// @param active active
    /// @param expiry expiry
    event FeeBypassSet(bool active, uint256 expiry);      // T-12 FIX: emit on bypass change
    /// @notice FeeBypassProposed
    /// @param active active
    /// @param duration duration
    /// @param effectiveAt effectiveAt
    event FeeBypassProposed(bool active, uint256 duration, uint64 effectiveAt); // H-6 FIX
    /// @notice ExternalCallFailed
    /// @param context context
    /// @param reason reason
    event ExternalCallFailed(string indexed context, bytes reason);
    /// @notice Emitted when SeerAutonomous returned Warned (1). The transfer proceeds.
    ///         Off-chain monitors should index this to surface advisories to the user.
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
    event SeerWarned(address indexed subject, uint8 action, uint256 amount, address counterparty);
    /// @notice FeeApplied
    /// @param from from
    /// @param to to
    /// @param burnAmount burnAmount
    /// @param sanctumAmount sanctumAmount
    /// @param ecosystemAmount ecosystemAmount
    /// @param sanctumSink sanctumSink
    /// @param ecosystemSink ecosystemSink
    event FeeApplied(address indexed from, address indexed to, uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, address indexed sanctumSink, address ecosystemSink);
    /// @notice Transfer
    /// @param from from
    /// @param to to
    /// @param value value
    event Transfer(address indexed from, address indexed to, uint256 value);
    /// @notice Approval
    /// @param owner owner
    /// @param spender spender
    /// @param value value
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// Errors
    /// @notice VF_ZERO
    error VF_ZERO();
    /// @notice VF_CAP
    error VF_CAP();
    /// @notice VF_POLICY_LOCKED
    error VF_POLICY_LOCKED();
    /// @notice Token_NotVault
    error Token_NotVault();
    /// @notice VF_MaxTransferExceeded
    error VF_MaxTransferExceeded();
    /// @notice VF_MaxWalletExceeded
    error VF_MaxWalletExceeded();
    /// @notice VF_DailyLimitExceeded
    error VF_DailyLimitExceeded();
    /// @notice VF_TransferCooldown
    error VF_TransferCooldown();
    /// @notice VF_ZeroAddress
    error VF_ZeroAddress();
    /// @notice VF_NoPending
    error VF_NoPending();
        /// @notice VF_Timelock
        error VF_Timelock();
    /// @notice VF_TimelockActive
    error VF_TimelockActive();
    /// @notice VF_InvalidDuration
    error VF_InvalidDuration();
    /// @notice VF_InsufficientBalance
    error VF_InsufficientBalance();
    /// @notice VF_NotContract
    error VF_NotContract();
    /// @notice VF_InsufficientAllowance
    error VF_InsufficientAllowance();
    /// @notice VF_PermitExpired
    error VF_PermitExpired();
    /// @notice VF_InvalidPermit
    error VF_InvalidPermit();
    /// @notice VF_PendingExists
    error VF_PendingExists();
    /// @notice VF_InvalidAntiWhaleConfig
    error VF_InvalidAntiWhaleConfig();
    /// @notice VF_FeesExceedAmount
    error VF_FeesExceedAmount();
    /// @notice VF_InvalidFeeSink
    error VF_InvalidFeeSink();
    /// @notice VF_RouterRequired
    error VF_RouterRequired();
    /// @notice VF_FeeBypassCooldown
    error VF_FeeBypassCooldown();
    /// @notice VF_SeerBlocked
    error VF_SeerBlocked();

    /// Constructor: mint full supply and distribute at genesis
    /// @notice constructor
    /// @param devReserveVestingVault devReserveVestingVault
    /// @param treasury treasury
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

        // Harden treasury custody: require a contract (multisig/DAO), not an EOA.
        assembly { size := extcodesize(treasury) }
        if (size == 0) revert VF_NotContract();

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
        _logEv(devReserveVestingVault, "pmd", DEV_RESERVE_SUPPLY, "");
        
        // 150M to Treasury (operations, liquidity, DEX seeding, CEX, ecosystem: 200M - 50M dev)
        uint256 treasuryAmount = MAX_SUPPLY - DEV_RESERVE_SUPPLY;
        _balances[treasury] = treasuryAmount;
        emit Transfer(address(0), treasury, treasuryAmount);
        _logEv(treasury, "pmt", treasuryAmount, "");
    }

    // ─────────────────────────── ERC20 standard

    /// @notice balanceOf
    /// @param account account
    /// @return _uint256 _uint256
    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }
    /// @notice allowance
    /// @param owner_ owner_
    /// @param spender spender
    /// @return _uint256 _uint256
    function allowance(address owner_, address spender) external view returns (uint256) { return _allowances[owner_][spender]; }

    /// @notice approve
    /// @param spender spender
    /// @param amount amount
    /// @return _bool _bool
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @notice increaseAllowance
    /// @param spender spender
    /// @param added added
    /// @return _bool _bool
    function increaseAllowance(address spender, uint256 added) external returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + added);
        return true;
    }

    /// @notice decreaseAllowance
    /// @param spender spender
    /// @param subtracted subtracted
    /// @return _bool _bool
    function decreaseAllowance(address spender, uint256 subtracted) external returns (bool) {
        uint256 cur = _allowances[msg.sender][spender];
        if (cur < subtracted) revert VF_InsufficientAllowance();
        _approve(msg.sender, spender, cur - subtracted);
        return true;
    }

    /// @notice DOMAIN_SEPARATOR
    /// @return _bytes32 _bytes32
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

    // slither-disable-next-line shadowing-local  // 'owner' parameter mandated by EIP-2612 spec
    /// @notice permit
    /// @param owner owner
    /// @param spender spender
    /// @param value value
    /// @param deadline deadline
    /// @param v v
    /// @param r r
    /// @param s s
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        if (block.timestamp > deadline) revert VF_PermitExpired();
        // F-01 FIX: Reject malleable signatures (EIP-2 / secp256k1 upper bound on s)
        if (uint256(s) > ECDSA_S_UPPER_BOUND) revert VF_InvalidPermit();
        if (v != 27 && v != 28) revert VF_InvalidPermit();
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline));
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0) || signer != owner) revert VF_InvalidPermit();
        _approve(owner, spender, value);
    }

    /// @notice transfer
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transfer(address to, uint256 amount) external nonReentrant returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice transferFrom
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transferFrom(address from, address to, uint256 amount) external nonReentrant returns (bool) {
        // System-exempt protocol modules must remain operable even if accidentally sanctioned.
        uint256 cur = _allowances[from][msg.sender];
        if (cur < amount) revert VF_InsufficientAllowance();
        _approve(from, msg.sender, cur - amount);
        _transfer(from, to, amount);
        return true;
    }

    /// @notice Permanently remove tokens from circulation, reducing totalSupply.
    /// @dev Hard-burns the caller's own tokens by decrementing their balance and totalSupply,
    ///      then emitting Transfer(..., address(0), ...).  Exchange trackers (CoinGecko,
    ///      CoinMarketCap, DEX Screener) read totalSupply() directly.
    /// @param amount amount
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

    /// @notice setVaultHub
    /// @param hub hub
    function setVaultHub(address hub) external onlyOwner {
        if (hub == address(0)) revert VF_ZeroAddress();
        if (pendingVaultHubAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingVaultHub = hub;
        pendingVaultHubAt = effectiveAt;
        emit VaultHubScheduled(hub, effectiveAt);
        _log("vhs");
    }

    /// @notice applyVaultHub
    function applyVaultHub() external onlyOwner {
        if (pendingVaultHubAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingVaultHubAt) revert VF_TimelockActive();
        vaultHub = IVaultHub(pendingVaultHub);
        emit VaultHubSet(pendingVaultHub);
        delete pendingVaultHub;
        delete pendingVaultHubAt;
        _log("vh=");
    }

    /// @notice cancelVaultHub
    function cancelVaultHub() external onlyOwner {
        if (pendingVaultHubAt == 0) revert VF_NoPending();
        delete pendingVaultHub;
        delete pendingVaultHubAt;
        _log("vhx");
    }

    /// @notice Configure global emergency breaker used to halt non-exempt token transfers.
    /// @param _breaker _breaker
    function setEmergencyBreaker(address _breaker) external onlyOwner {
        if (_breaker == address(0)) revert VF_ZeroAddress();
        if (pendingEmergencyBreakerAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingEmergencyBreaker = _breaker;
        pendingEmergencyBreakerAt = effectiveAt;
        emit EmergencyBreakerScheduled(_breaker, effectiveAt);
        _log("ebs");
    }

    /// @notice applyEmergencyBreaker
    function applyEmergencyBreaker() external onlyOwner {
        if (pendingEmergencyBreakerAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingEmergencyBreakerAt) revert VF_TimelockActive();
        emergencyBreaker = IEmergencyBreaker(pendingEmergencyBreaker);
        emit EmergencyBreakerSet(pendingEmergencyBreaker);
        delete pendingEmergencyBreaker;
        delete pendingEmergencyBreakerAt;
        _log("eb=");
    }

    /// @notice cancelEmergencyBreaker
    function cancelEmergencyBreaker() external onlyOwner {
        if (pendingEmergencyBreakerAt == 0) revert VF_NoPending();
        delete pendingEmergencyBreaker;
        delete pendingEmergencyBreakerAt;
        _log("ebx");
    }

    /// @notice TL-308 FIX: Propose a seerAutonomous change (48h timelock). (#308)
    /// @param _seerAutonomous _seerAutonomous
    function setSeerAutonomous(address _seerAutonomous) external onlyOwner {
        if (_seerAutonomous == address(0)) revert VF_ZeroAddress();
        if (pendingSeerAutonomousAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingSeerAutonomous = _seerAutonomous;
        pendingSeerAutonomousAt = effectiveAt;
        emit SeerAutonomousSet(_seerAutonomous); // proposal event reuses existing event
    }

    /// @notice Apply a pending seerAutonomous change after the 48h timelock.
    function applySeerAutonomous() external onlyOwner {
        if (pendingSeerAutonomousAt == 0 || block.timestamp < pendingSeerAutonomousAt) revert VF_Timelock();
        seerAutonomous = ISeerAutonomousToken(pendingSeerAutonomous);
        delete pendingSeerAutonomous;
        delete pendingSeerAutonomousAt;
        _log("seer_auto_applied");
    }

    /// @notice Cancel a pending seerAutonomous change.
    function cancelSeerAutonomous() external onlyOwner {
        if (pendingSeerAutonomousAt == 0) revert VF_NoPending();
        delete pendingSeerAutonomous;
        delete pendingSeerAutonomousAt;
    }

    // ── SecurityHub functions REMOVED — non-custodial, no third-party locks ──

    /// F-05 FIX: setLedger now uses 48h timelock (matches all other module setters)
    /// @notice setLedger
    /// @param _ledger _ledger
    function setLedger(address _ledger) external onlyOwner {
        if (policyLocked && _ledger == address(0)) revert VF_POLICY_LOCKED();
        if (pendingLedgerAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingLedger = _ledger;
        pendingLedgerAt = effectiveAt;
        emit LedgerScheduled(_ledger, effectiveAt);
        _log("lds");
    }

    /// @notice applyLedger
    function applyLedger() external onlyOwner {
        if (pendingLedgerAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingLedgerAt) revert VF_TimelockActive();
        ledger = IProofLedger(pendingLedger);
        emit LedgerSet(pendingLedger);
        delete pendingLedger;
        delete pendingLedgerAt;
        _log("ld=");
    }

    /// @notice cancelLedger
    function cancelLedger() external onlyOwner {
        if (pendingLedgerAt == 0) revert VF_NoPending();
        delete pendingLedger;
        delete pendingLedgerAt;
        _log("ldx");
    }

    /// @notice setBurnRouter
    /// @param router router
    function setBurnRouter(address router) external onlyOwner {
        if (policyLocked && router == address(0)) revert VF_POLICY_LOCKED();
        if (pendingBurnRouterAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingBurnRouter = router;
        pendingBurnRouterAt = effectiveAt;
        emit BurnRouterScheduled(router, effectiveAt);
        _log("brs");
    }

    /// @notice applyBurnRouter
    function applyBurnRouter() external onlyOwner {
        if (pendingBurnRouterAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingBurnRouterAt) revert VF_TimelockActive();
        burnRouter = IProofScoreBurnRouterToken(pendingBurnRouter);
        emit BurnRouterSet(pendingBurnRouter);
        delete pendingBurnRouter;
        delete pendingBurnRouterAt;
        _log("br=");
    }

    /// @notice cancelBurnRouter
    function cancelBurnRouter() external onlyOwner {
        if (pendingBurnRouterAt == 0) revert VF_NoPending();
        delete pendingBurnRouter;
        delete pendingBurnRouterAt;
        _log("brx");
    }

    /// @notice setTreasurySink
    /// @param sink sink
    function setTreasurySink(address sink) external onlyOwner {
        if (policyLocked && sink == address(0)) revert VF_POLICY_LOCKED();
        if (pendingTreasurySinkAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingTreasurySink = sink;
        pendingTreasurySinkAt = effectiveAt;
        emit TreasurySinkScheduled(sink, effectiveAt);
        _log("tss");
    }

    /// @notice applyTreasurySink
    function applyTreasurySink() external onlyOwner {
        if (pendingTreasurySinkAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingTreasurySinkAt) revert VF_TimelockActive();
        treasurySink = pendingTreasurySink;
        emit TreasurySinkSet(pendingTreasurySink);
        delete pendingTreasurySink;
        delete pendingTreasurySinkAt;
        _log("ts=");
    }

    /// @notice cancelTreasurySink
    function cancelTreasurySink() external onlyOwner {
        if (pendingTreasurySinkAt == 0) revert VF_NoPending();
        delete pendingTreasurySink;
        delete pendingTreasurySinkAt;
        _log("tsx");
    }

    /// @notice setSanctumSink
    /// @param _sanctum _sanctum
    function setSanctumSink(address _sanctum) external onlyOwner {
        if (policyLocked && _sanctum == address(0)) revert VF_POLICY_LOCKED();
        if (pendingSanctumSinkAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingSanctumSink = _sanctum;
        pendingSanctumSinkAt = effectiveAt;
        emit SanctumSinkScheduled(_sanctum, effectiveAt);
        _log("sss");
    }

    /// @notice applySanctumSink
    function applySanctumSink() external onlyOwner {
        if (pendingSanctumSinkAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingSanctumSinkAt) revert VF_TimelockActive();
        sanctumSink = pendingSanctumSink;
        emit SanctumSinkSet(pendingSanctumSink);
        delete pendingSanctumSink;
        delete pendingSanctumSinkAt;
        _log("ss=");
    }

    /// @notice cancelSanctumSink
    function cancelSanctumSink() external onlyOwner {
        if (pendingSanctumSinkAt == 0) revert VF_NoPending();
        delete pendingSanctumSink;
        delete pendingSanctumSinkAt;
        _log("ssx");
    }

    // C-1 FIX: Timelocked setter for FeeDistributor wiring
    /// @notice setEcosystemDistributor
    /// @param distributor distributor
    function setEcosystemDistributor(address distributor) external onlyOwner {
        if (distributor == address(0)) revert VF_ZeroAddress();
        if (pendingEcosystemDistributorAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingEcosystemDistributor = distributor;
        pendingEcosystemDistributorAt = effectiveAt;
        emit EcosystemDistributorScheduled(distributor, effectiveAt);
        _log("eds");
    }

    /// @notice applyEcosystemDistributor
    function applyEcosystemDistributor() external onlyOwner {
        if (pendingEcosystemDistributorAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingEcosystemDistributorAt) revert VF_TimelockActive();
        ecosystemDistributor = pendingEcosystemDistributor;
        emit EcosystemDistributorSet(pendingEcosystemDistributor);
        delete pendingEcosystemDistributor;
        delete pendingEcosystemDistributorAt;
        _log("ed=");
    }

    /// @notice cancelEcosystemDistributor
    function cancelEcosystemDistributor() external onlyOwner {
        if (pendingEcosystemDistributorAt == 0) revert VF_NoPending();
        delete pendingEcosystemDistributor;
        delete pendingEcosystemDistributorAt;
        _log("edx");
    }

    /// @notice setFraudRegistry
    /// @param _registry _registry
    function setFraudRegistry(address _registry) external onlyOwner {
        if (_registry == address(0)) revert VF_ZeroAddress();
        if (pendingFraudRegistryAt != 0) revert VF_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingFraudRegistry = _registry;
        pendingFraudRegistryAt = effectiveAt;
        emit FraudRegistryScheduled(_registry, effectiveAt);
        _log("frs");
    }

    /// @notice applyFraudRegistry
    function applyFraudRegistry() external onlyOwner {
        if (pendingFraudRegistryAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingFraudRegistryAt) revert VF_TimelockActive();
        fraudRegistry = IFraudRegistry(pendingFraudRegistry);
        emit FraudRegistrySet(pendingFraudRegistry);
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        _log("fr=");
    }

    /// @notice cancelFraudRegistry
    function cancelFraudRegistry() external onlyOwner {
        if (pendingFraudRegistryAt == 0) revert VF_NoPending();
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        _log("frx");
    }

    /// @notice Propose system exemption with 48-hour timelock (grants bypass of ALL fees and vault rules)
    /// @param who who
    /// @param isExempt isExempt
    function proposeSystemExempt(address who, bool isExempt) external onlyOwner {
        if (who == address(0)) revert VF_ZeroAddress();
        // F-06 FIX: Revert if a pending proposal already exists (prevents silent override)
        if (pendingExemptAt != 0) revert VF_PendingExists();
        pendingExemptAddr = who;
        pendingExemptStatus = isExempt;
        pendingExemptAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        emit SystemExemptProposed(who, isExempt, pendingExemptAt);
        _logEv(who, "exp", 0, "");
    }

    /// @notice Cancel a pending system exempt proposal (F-06 FIX added)
    function cancelPendingExempt() external onlyOwner {
        if (pendingExemptAt == 0) revert VF_NoPending();
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
        delete pendingExemptAddr;
        delete pendingExemptStatus;
        delete pendingExemptAt;
        _logEv(who, status ? "ex+" : "ex-", 0, "");
    }

    /// @notice Propose whitelist entry with 48-hour timelock (grants bypass of vault-only)
    /// @param addr addr
    /// @param status status
    function proposeWhitelist(address addr, bool status) external onlyOwner {
        if (addr == address(0)) revert VF_ZeroAddress();
        if (pendingWhitelistAt != 0) revert VF_PendingExists();
        pendingWhitelistAddr = addr;
        pendingWhitelistStatus = status;
        pendingWhitelistAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        emit WhitelistProposed(addr, status, pendingWhitelistAt);
        _logEv(addr, "wlp", 0, "");
    }

    /// @notice Cancel a pending whitelist proposal
    function cancelPendingWhitelist() external onlyOwner {
        if (pendingWhitelistAt == 0) revert VF_NoPending();
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
        delete pendingWhitelistAddr;
        delete pendingWhitelistStatus;
        delete pendingWhitelistAt;
        _logEv(addr, status ? "wl+" : "wl-", 0, "");
    }

    /// @notice setVaultOnly
    /// @param enabled enabled
    function setVaultOnly(bool enabled) external onlyOwner {
        if (policyLocked && !enabled) revert VF_POLICY_LOCKED();
        if (enabled) {
            // Enabling vault-only is always instant (more restrictive — safe to apply immediately)
            vaultOnly = true;
            pendingVaultOnlyDisableAt = 0;
            emit VaultOnlySet(true);
            _log("vo+");
        } else {
            // H-2 FIX: Disabling vault-only requires a 48-hour timelock so that token holders
            // have time to react before unrestricted transfers are permitted.
            if (pendingVaultOnlyDisableAt != 0) revert VF_PendingExists();
            pendingVaultOnlyDisableAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
            emit VaultOnlyDisableProposed(pendingVaultOnlyDisableAt);
            _log("vop");
        }
    }

    /// @notice Apply a pending vault-only disable after the 48-hour timelock.
    function applyVaultOnlyDisable() external onlyOwner {
        if (pendingVaultOnlyDisableAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingVaultOnlyDisableAt) revert VF_TimelockActive();
        pendingVaultOnlyDisableAt = 0;
        vaultOnly = false;
        emit VaultOnlySet(false);
        _log("vo-");
    }

    /// @notice Cancel a pending vault-only disable.
    function cancelVaultOnlyDisable() external onlyOwner {
        if (pendingVaultOnlyDisableAt == 0) revert VF_NoPending();
        pendingVaultOnlyDisableAt = 0;
        emit VaultOnlyDisableCancelled();
        _log("vox");
    }

    /// One-way switch that makes policy non-optional post-launch.
    /// @notice lockPolicy
    function lockPolicy() external onlyOwner {
        policyLocked = true;
        emit PolicyLocked();
        _log("plk");
    }

    /// @notice setCircuitBreaker
    function setCircuitBreaker(bool, uint256) external view onlyOwner {
        // #311: Circuit-breaker transfer halts were removed from token policy.
        // Keep this ABI method as a no-op for backward compatibility with existing tooling.
    }

    /// @notice confirmCircuitBreaker
    function confirmCircuitBreaker() external pure {
        // #311: No pending circuit-breaker state exists after removing token-side halts.
        revert VF_NoPending();
    }

    /// @notice Propose or immediately deactivate BurnRouter fee bypass.
    /// @dev H-6 FIX: Activation now requires a 48-hour timelock (same as circuit breaker).
    ///      Deactivation remains instant for liveness. Call confirmFeeBypass() after delay to apply.
    /// @param _active _active
    /// @param _duration _duration
    function setFeeBypass(bool _active, uint256 _duration) external onlyOwner {
        _syncEmergencyFlags();
        if (_active) {
            if (_duration == 0 || _duration > MAX_CIRCUIT_BREAKER_DURATION) revert VF_InvalidDuration();
            if (feeBypassActivatedAt != 0 && block.timestamp < feeBypassActivatedAt + FEE_BYPASS_COOLDOWN) {
                revert VF_FeeBypassCooldown();
            }
            // H-6 FIX: Propose activation with 48-hour delay instead of instant enable
            pendingFeeBypassActive = true;
            pendingFeeBypassDuration = _duration;
            pendingFeeBypassAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
            emit FeeBypassProposed(true, _duration, pendingFeeBypassAt);
            _log("fbp");
        } else {
            // Immediate deactivation always allowed
            feeBypass = false;
            feeBypassExpiry = 0;
            pendingFeeBypassAt = 0;
            emit FeeBypassSet(false, 0);
            _log("fb-");
        }
    }

    /// @notice Apply a pending fee bypass activation after the 48-hour timelock.
    function confirmFeeBypass() external onlyOwner {
        if (pendingFeeBypassAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingFeeBypassAt) revert VF_TimelockActive();
        _syncEmergencyFlags();
        feeBypassActivatedAt = uint64(block.timestamp);
        feeBypass = true;
        feeBypassExpiry = block.timestamp + pendingFeeBypassDuration;
        pendingFeeBypassAt = 0;
        emit FeeBypassSet(true, feeBypassExpiry);
        _log("fb+");
    }
    
    /// @notice isCircuitBreakerActive
    /// @return _bool _bool
    function isCircuitBreakerActive() public pure returns (bool) {
        return false;
    }

    /// @notice Check if fee bypass is active (independent of circuit breaker).
    /// @dev H-02 FIX: Circuit breaker no longer implicitly enables fee bypass.
    ///      Use setFeeBypass() to explicitly disable BurnRouter fee collection.
    ///      Keeping bypasses independent means each must be explicitly activated.
    /// @return _bool _bool
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
        // Once policy is locked, whale limits must remain active (non-zero).
        // Allowing a full disable post-lock would silently remove the anti-whale
        // guarantee that was part of the published policy at lock time.
        if (policyLocked) {
            if (_maxTransfer == 0 || _maxWallet == 0 || _dailyLimit == 0) revert VF_POLICY_LOCKED();
        }
        // Sanity checks: limits should be reasonable if enabled
        if (_maxTransfer > 0 && _maxTransfer < 100_000e18) revert VF_InvalidAntiWhaleConfig();
        if (_maxWallet > 0 && _maxWallet < 200_000e18) revert VF_InvalidAntiWhaleConfig();
        if (_dailyLimit > 0 && _dailyLimit < 500_000e18) revert VF_InvalidAntiWhaleConfig();
        if (_cooldown > 0 && _cooldown > 1 hours) revert VF_InvalidAntiWhaleConfig();
        if (pendingAntiWhaleAt != 0) revert VF_PendingExists();

        pendingMaxTransfer = _maxTransfer;
        pendingMaxWallet = _maxWallet;
        pendingDailyLimit = _dailyLimit;
        pendingCooldown = _cooldown;
        pendingAntiWhaleAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;

        emit AntiWhaleProposed(_maxTransfer, _maxWallet, _dailyLimit, _cooldown, pendingAntiWhaleAt);
        _log("awp");
    }

    /// @notice applyAntiWhale
    function applyAntiWhale() external onlyOwner {
        if (pendingAntiWhaleAt == 0) revert VF_NoPending();
        if (block.timestamp < pendingAntiWhaleAt) revert VF_TimelockActive();

        maxTransferAmount = pendingMaxTransfer;
        maxWalletBalance = pendingMaxWallet;
        dailyTransferLimit = pendingDailyLimit;
        transferCooldown = pendingCooldown;

        emit AntiWhaleSet(pendingMaxTransfer, pendingMaxWallet, pendingDailyLimit, pendingCooldown);
        delete pendingMaxTransfer;
        delete pendingMaxWallet;
        delete pendingDailyLimit;
        delete pendingCooldown;
        delete pendingAntiWhaleAt;
        _log("awa");
    }

    /// @notice cancelAntiWhale
    function cancelAntiWhale() external onlyOwner {
        if (pendingAntiWhaleAt == 0) revert VF_NoPending();
        delete pendingMaxTransfer;
        delete pendingMaxWallet;
        delete pendingDailyLimit;
        delete pendingCooldown;
        delete pendingAntiWhaleAt;
        _log("awx");
    }
    
    /**
     * @notice Exempt address from whale limits (for exchanges, liquidity pools, etc.)
     * @param addr addr
     * @param exempt exempt
     */
    function setWhaleLimitExempt(address addr, bool exempt) external onlyOwner {
        // L-1 FIX: Timelocked — call applyWhaleLimitExempt(addr) after SINK_CHANGE_DELAY.
        if (addr == address(0)) revert VF_ZeroAddress();
        uint64 effectiveAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
        pendingWhaleExemptStatus[addr] = exempt;
        pendingWhaleExemptAt[addr] = effectiveAt;
        emit WhaleLimitExemptProposed(addr, exempt, effectiveAt);
    }

    /// @notice applyWhaleLimitExempt
    /// @param addr addr
    function applyWhaleLimitExempt(address addr) external onlyOwner {
        if (pendingWhaleExemptAt[addr] == 0) revert VF_NoPending();
        if (block.timestamp < pendingWhaleExemptAt[addr]) revert VF_TimelockActive();
        whaleLimitExempt[addr] = pendingWhaleExemptStatus[addr];
        delete pendingWhaleExemptAt[addr];
        delete pendingWhaleExemptStatus[addr];
        emit WhaleLimitExemptSet(addr, whaleLimitExempt[addr]);
    }

    /// @notice cancelWhaleLimitExempt
    /// @param addr addr
    function cancelWhaleLimitExempt(address addr) external onlyOwner {
        if (pendingWhaleExemptAt[addr] == 0) revert VF_NoPending();
        delete pendingWhaleExemptAt[addr];
        delete pendingWhaleExemptStatus[addr];
    }

    // ─────────────────────────── Internal core

    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign
    /// @notice _transfer
    /// @param from from
    /// @param to to
    /// @param amount amount
    function _transfer(address from, address to, uint256 amount) internal {
        _syncEmergencyFlags();
        if (from == address(0) || to == address(0)) revert VF_ZERO();
        if (amount == 0) revert VF_ZERO();

        address scoringFrom = _resolveFeeScoringAddress(from);

        address logicalTo = to;
        address custodyTo = to;

        _enforceSeerAction(scoringFrom, 0, amount, _resolveFeeScoringAddress(logicalTo));


        // Route EOA receipts into the recipient's vault without changing the fee/scoring context.
        if (vaultOnly && address(vaultHub) != address(0)) {
            if (!_isContract(logicalTo) && !systemExempt[logicalTo] && !whitelisted[logicalTo]) {
                if (!_hasVault(logicalTo)) {
                    try vaultHub.ensureVault(logicalTo) returns (address vault) {
                        _logEv(vault, "vac", 0, "");
                    } catch {
                        revert Token_NotVault();
                    }
                }

                custodyTo = _vaultOfAddr(logicalTo);
                if (custodyTo == address(0)) revert Token_NotVault();
            }
        }

        address fraudCheckAddr = scoringFrom;
        bool escrowTransferRequired =
            address(fraudRegistry) != address(0) &&
            !systemExempt[from] &&
            !systemExempt[logicalTo] &&
            fraudRegistry.requiresEscrow(fraudCheckAddr);

        // 2. Anti-whale checks (skip for exempt addresses like exchanges, mints, burns)
        // EE-1 GAS FIX: _checkWhaleProtection now returns the daily window state it read from
        // storage so _recordActualDailyTransfer (called after fees) can reuse the cached values
        // and avoid re-reading the same slots (~2 100–4 200 gas saved per non-exempt transfer).
        uint256 _cachedWindowStart = 0;
        uint256 _cachedStoredUsed = 0;
        bool    _dailyExempt = whaleLimitExempt[from] || whaleLimitExempt[custodyTo] ||
                                systemExempt[from] || systemExempt[logicalTo];
        if (!_dailyExempt) {
            (_cachedWindowStart, _cachedStoredUsed) = _checkWhaleProtection(from, custodyTo, amount);
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
        if (
            !escrowTransferRequired &&
            address(burnRouter) != address(0) &&
            !isFeeBypassed() &&
            !(systemExempt[from] || systemExempt[logicalTo])
        ) {
            try burnRouter.computeFeesAndReserve(scoringFrom, logicalTo, amount) returns (
                uint256 _burnAmt,
                uint256 _sanctumAmt,
                uint256 _ecoAmt,
                address _sanctumSink,
                address _ecoSink,
                address _burnSink
            ) {
                // Validate fee sum cannot exceed transfer amount (prevents malicious router DoS)
                if (_burnAmt + _sanctumAmt + _ecoAmt > amount) revert VF_FeesExceedAmount();

                // F-17/C-01 FIX: Validate all returned sink addresses against token-level configuration.
                if (_sanctumSink != address(0)) {
                    if (_sanctumSink != sanctumSink && _sanctumSink != treasurySink) revert VF_InvalidFeeSink();
                }
                if (_ecoSink != address(0)) {
                    // C-1 FIX: Also accept ecosystemDistributor as a valid eco sink
                    if (_ecoSink != treasurySink && _ecoSink != sanctumSink && _ecoSink != ecosystemDistributor) revert VF_InvalidFeeSink();
                }
                if (_burnSink != address(0)) {
                    // H-8 FIX: ecosystemDistributor must NOT be a valid burn sink; only treasurySink/sanctumSink are valid burn destinations
                    if (_burnSink != treasurySink && _burnSink != sanctumSink) revert VF_InvalidFeeSink();
                }

                if (_burnAmt > 0) {
                    address sink = (_burnSink == address(0)) ? address(0) : _burnSink;
                    _applyBurn(from, sink, _burnAmt);
                    remaining -= _burnAmt;
                }
                if (_sanctumAmt > 0) {
                    address sink2 = (_sanctumSink == address(0)) ? treasurySink : _sanctumSink;
                    if (sink2 == address(0)) revert VF_InvalidFeeSink();
                    _balances[sink2] += _sanctumAmt;
                    emit Transfer(from, sink2, _sanctumAmt);
                    remaining -= _sanctumAmt;
                }
                if (_ecoAmt > 0) {
                    address sink3 = (_ecoSink == address(0)) ? (ecosystemDistributor != address(0) ? ecosystemDistributor : treasurySink) : _ecoSink;
                    if (sink3 == address(0)) revert VF_InvalidFeeSink();
                    _balances[sink3] += _ecoAmt;
                    emit Transfer(from, sink3, _ecoAmt);
                    remaining -= _ecoAmt;
                    // #311 (cross): FeeDistributor notification must not halt transfers.
                    // Emit telemetry on failures and continue transfer execution.
                    if (sink3 == ecosystemDistributor) {
                        try IEcosystemDistributor(sink3).receiveFee(_ecoAmt) {} catch (bytes memory reason) {
                            emit ExternalCallFailed("fd", reason);
                        }
                    }
                }

                if (_burnAmt > 0 || _sanctumAmt > 0 || _ecoAmt > 0) {
                    emit FeeApplied(from, logicalTo, _burnAmt, _sanctumAmt, _ecoAmt, (_sanctumSink == address(0) ? treasurySink : _sanctumSink), (_ecoSink == address(0) ? treasurySink : _ecoSink));
                }

                // Record volume for adaptive fee tracking (sustainability)
                try IProofScoreBurnRouter(address(burnRouter)).recordVolume(amount) {} catch (bytes memory reason) { emit ExternalCallFailed("rv", reason); }
                // #353 FIX: Record burn amount for daily cap tracking
                if (_burnAmt > 0) {
                    try IProofScoreBurnRouter(address(burnRouter)).recordBurn(_burnAmt) {} catch (bytes memory reason) { emit ExternalCallFailed("rb", reason); }
                }
            } catch (bytes memory reason) {
                emit ExternalCallFailed("cfr", reason);
                // C-2 FIX: When policy is locked and the router reverts, the transfer must also
                // revert rather than silently proceeding zero-fee. This closes the DoS/bypass gap.
                if (policyLocked && !isFeeBypassed()) revert VF_RouterRequired();
            }
        } else {
            // If policy is locked we require a router be present so fees cannot be bypassed
            if (policyLocked && !isFeeBypassed()) {
                if (address(burnRouter) == address(0)) revert VF_RouterRequired();
            }
        }

        if (!_dailyExempt) {
            // M-7 FIX: Record gross `amount` for daily whale-limit accounting, not `remaining`.
            // The whale check at step 2 uses `amount` (gross), so daily tracking must use the
            // same value to ensure the limit is consistently enforced.  Using `remaining` (post-fee)
            // let users exceed the daily cap by a fee fraction on every transfer.
            // EE-1 GAS FIX: Pass cached window state to avoid re-reading the same storage slots.
            _recordActualDailyTransfer(from, amount, _cachedWindowStart, _cachedStoredUsed);
        }

        // ── Fraud escrow: flagged senders get 30-day delay ─────
        // Not a freeze. Tokens are held for 30 days then delivered.
        // Community-driven: requires 3 complaints from trusted users.
        if (escrowTransferRequired) {
            // C-1 FIX: Credit balance AND register escrow atomically.
            // If escrowTransfer reverts (e.g., 500-escrow limit), the entire
            // transfer reverts — no silent token loss.
            _balances[address(fraudRegistry)] += remaining;
            emit Transfer(from, address(fraudRegistry), remaining);
            // slither-disable-next-line unused-return  // escrowTransfer reverts on failure; bool not consumed by design
            fraudRegistry.escrowTransfer(from, custodyTo, remaining);
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

    /// @notice _enforceSeerAction
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
    function _enforceSeerAction(address subject, uint8 action, uint256 amount, address counterparty) internal {
        if (address(seerAutonomous) == address(0)) return;
        try seerAutonomous.beforeAction(subject, action, amount, counterparty) returns (uint8 r) {
            // NON-CUSTODIAL ALIGNMENT: match DAO._enforceSeerAction semantics.
            // 0 = Allowed → proceed silently
            // 1 = Warned  → proceed and emit signal (do not block)
            // ≥2 (Delayed / Blocked / Penalized) → revert; these are explicit
            //      "do not proceed" responses from Seer's policy layer, not
            //      advisories. Per protocol non-custodial doctrine we never
            //      block on advisory signals; only on explicit deny responses.
            if (r == 1) {
                emit SeerWarned(subject, action, amount, counterparty);
            } else if (r >= 2) {
                revert VF_SeerBlocked();
            }
        } catch (bytes memory reason) {
            // SEER-04 FIX (#179): Unexpected SeerAutonomous failures should fail open.
            emit ExternalCallFailed("seerAutonomous.beforeAction", reason);
            return;
        }
    }

    /// @notice _applyBurn
    /// @param from from
    /// @param sink sink
    /// @param burnAmt burnAmt
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

    /// @notice _mint
    /// @param to to
    /// @param amount amount
    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert VF_ZERO();
        if (totalSupply + amount > MAX_SUPPLY) revert VF_CAP();
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice _approve
    /// @param owner_ owner_
    /// @param spender spender
    /// @param amount amount
    function _approve(address owner_, address spender, uint256 amount) internal {
        if (owner_ == address(0) || spender == address(0)) revert VF_ZeroAddress();
        _allowances[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    // ─────────────────────────── Helpers
    
    /// @notice _isContract
    /// @param addr addr
    /// @return _bool _bool
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        if (size > 0) return true;

        // Distinguish deployed contracts from EOAs/non-existent accounts.
        bytes32 codeHash;
        assembly { codeHash := extcodehash(addr) }
        return codeHash != bytes32(0) && codeHash != EMPTY_CODE_HASH;
    }
    
    /// @notice _isVault
    /// @param addr addr
    /// @return _bool _bool
    function _isVault(address addr) internal view returns (bool) {
        if (address(vaultHub) == address(0)) return false;
        try vaultHub.isVault(addr) returns (bool v) {
            return v;
        } catch {
            return false;
        }
    }
    
    /// @notice _hasVault
    /// @param account account
    /// @return _bool _bool
    function _hasVault(address account) internal view returns (bool) {
        if (address(vaultHub) == address(0)) return false;
        try vaultHub.vaultOf(account) returns (address vault) {
            return vault != address(0);
        } catch {
            return false;
        }
    }

    /// @notice _vaultOfAddr
    /// @param a a
    /// @return _address _address
    function _vaultOfAddr(address a) internal view returns (address) {
        if (address(vaultHub) == address(0)) return address(0);
        try vaultHub.vaultOf(a) returns (address vault) {
            return vault;
        } catch {
            return address(0);
        }
    }

    /// @notice _resolveFeeScoringAddress
    /// @param from from
    /// @return feeFrom feeFrom
    function _resolveFeeScoringAddress(address from) internal view returns (address feeFrom) {
        feeFrom = from;
        if (address(vaultHub) == address(0) || !_isVault(from)) return feeFrom;

        try vaultHub.ownerOfVault(from) returns (address vaultOwner) {
            if (vaultOwner != address(0)) feeFrom = vaultOwner;
        } catch {}
    }

    // _locked() REMOVED — no third-party locking of user vaults

    /// @notice _syncEmergencyFlags
    function _syncEmergencyFlags() internal {
        if (feeBypass && feeBypassExpiry > 0 && block.timestamp >= feeBypassExpiry) {
            feeBypass = false;
            feeBypassExpiry = 0;
        }
    }

    /// @notice T-07 FIX: Permissionless state cleanup for time-bounded emergency policy flags.
    ///         Safe to call by anyone; no funds are moved and no access is granted.
    function syncEmergencyFlags() external {
        _syncEmergencyFlags();
    }

    /// @notice _tryExpectedNetAmount
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return ok ok
    /// @return expectedNet expectedNet
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
     * @dev Check and enforce all anti-whale protections.
     * Reverts if any limit is exceeded.
     *
     * EE-1 GAS FIX: Returns the daily window state already read from storage so the
     * caller can pass it straight to _recordActualDailyTransfer, avoiding a second
     * SLOAD of dailyResetTime[from] and dailyTransferred[from] per transfer
     * (~2 100–4 200 gas saved on non-exempt transfers).
     *
     * @return cachedWindowStart  The dailyResetTime[from] value read here.
     * @return cachedStoredUsed   The dailyTransferred[from] value read here
     *                            (0 if the window has expired or limit is disabled).
     * @notice _checkWhaleProtection
     * @param from from
     * @param to to
     * @param amount amount
     */
    function _checkWhaleProtection(address from, address to, uint256 amount)
        internal
        returns (uint256 cachedWindowStart, uint256 cachedStoredUsed)
    {
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
        // H-2 FIX: Window check does NOT mutate dailyTransferred/dailyResetTime here.
        // Note: lastTransferTime[from] IS mutated below for the cooldown check.
        // State mutations of dailyTransferred belong solely in _recordActualDailyTransfer.
        cachedWindowStart = dailyResetTime[from];
        bool windowExpired = (cachedWindowStart == 0 || block.timestamp >= cachedWindowStart + 1 days);
        if (dailyTransferLimit > 0) {
            cachedStoredUsed = windowExpired ? 0 : dailyTransferred[from];
            uint256 projectedTransferred = cachedStoredUsed + trackedAmount;
            if (projectedTransferred > dailyTransferLimit) {
                revert VF_DailyLimitExceeded();
            }
        }
        // Note: when dailyTransferLimit == 0, cachedStoredUsed stays 0 and cachedWindowStart
        // holds the last reset timestamp.  _recordActualDailyTransfer uses only the cached
        // parameters — no storage re-reads happen there under any code path.
        
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
     * @dev Record daily transfer amount, using cached storage values from _checkWhaleProtection
     *      to avoid a redundant second SLOAD of dailyResetTime[from]/dailyTransferred[from].
     *
     * @param from              Sender address.
     * @param actualAmount      Gross amount to record (M-7: always use gross, not post-fee).
     * @param cachedWindowStart dailyResetTime[from] already read in _checkWhaleProtection.
     * @param cachedStoredUsed  dailyTransferred[from] already read in _checkWhaleProtection
     *                          (0 if window was expired or limit disabled at check time).
     * @notice _recordActualDailyTransfer
     */
    function _recordActualDailyTransfer(
        address from,
        uint256 actualAmount,
        uint256 cachedWindowStart,
        uint256 cachedStoredUsed
    ) internal {
        bool windowExpired = (cachedWindowStart == 0 || block.timestamp >= cachedWindowStart + 1 days);
        if (windowExpired) {
            // EE-1 GAS FIX: Directly assign actualAmount instead of zeroing then incrementing —
            // eliminates the extra SLOAD produced by the old `dailyTransferred[from] += 0;` pattern.
            dailyTransferred[from] = actualAmount;
            dailyResetTime[from] = block.timestamp;
        } else {
            // Use cached storedUsed to avoid re-reading the slot.
            dailyTransferred[from] = cachedStoredUsed + actualAmount;
        }
    }
    
    /// @notice T-02 FIX: Helper to compute expected net amount after fees
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _uint256 _uint256
    function getExpectedNetAmount(address from, address to, uint256 amount) public view returns (uint256) {
        if (address(burnRouter) == address(0) || isFeeBypassed() || systemExempt[from] || systemExempt[to]) {
            return amount; // No fees
        }

        (bool ok, uint256 expectedNet) = _tryExpectedNetAmount(from, to, amount);
        if (!ok) {
            return (amount * 9500) / 10000;
        }
        return expectedNet;
    }
    
    /**
     * @dev View function to check remaining daily allowance
     * @notice remainingDailyLimit
     * @param account account
     * @return _uint256 _uint256
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
     * @notice cooldownRemaining
     * @param account account
     * @return _uint256 _uint256
     */
    function cooldownRemaining(address account) external view returns (uint256) {
        if (transferCooldown == 0) return 0;
        if (lastTransferTime[account] < 1) return 0;
        
        uint256 unlockTime = lastTransferTime[account] + transferCooldown;
        if (block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }

    // slither-disable-next-line reentrancy-events
    /// @notice _log
    /// @param action action
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
    // slither-disable-next-line reentrancy-events
    /// @notice _logEv
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
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
        if (_balances[from] < amount) return (false, "BALANCE");

        bool exempt = whaleLimitExempt[from] || whaleLimitExempt[to] || systemExempt[from] || systemExempt[to] || from == address(0) || to == address(0);
        if (!exempt && maxTransferAmount > 0 && amount > maxTransferAmount) {
            return (false, "MAX_TRANSFER");
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

        // Lightweight preview path for bytecode-size safety:
        // derive total expected fee from net estimator and report as ecosystem component.
        // Exact split is still applied by burnRouter in _transfer().
        netReceived = getExpectedNetAmount(from, to, amount);
        ecosystemAmount = amount - netReceived;
        burnAmount = 0;
        sanctumAmount = 0;
    }
    
    // NOTE: Detailed transfer-limit and daily-stats helper views were removed to keep
    // VFIDEToken runtime under EIP-170. Off-chain indexers should derive these values
    // from existing public state (maxTransferAmount/maxWalletBalance/dailyTransferLimit,
    // dailyTransferred/dailyResetTime/lastTransferTime) and helper views.

    /// @dev Internal burn accounting helper. Use transactionFeesProcessed() for public reads.
    /// @notice _totalBurnedInternal
    /// @return _uint256 _uint256
    function _totalBurnedInternal() private view returns (uint256) {
        return MAX_SUPPLY - totalSupply;
    }

    /// @notice DEPRECATED: Use transactionFeesProcessed() instead.
    /// @dev Retained for ABI backwards compatibility but hidden from public indexers.
    ///      HOWEY NOTE: Exposing a "burned to date" metric encourages scarcity narratives
    ///      which create an implicit profit expectation (Howey Prong 3). The preferred
    ///      alias transactionFeesProcessed() frames the metric as a network cost, not
    ///      as a value-accrual signal.
    /// @return _uint256 _uint256
    function totalBurnedToDate() external view returns (uint256) {
        return _totalBurnedInternal();
    }

    /// @notice Howey-neutral alias for totalBurnedToDate().
    /// @dev Preferred name for public-facing displays and integrations.
    ///      Frames the metric as cumulative network processing fees paid, not as
    ///      a measure of token scarcity or value accrual.
    /// @return _uint256 _uint256
    function transactionFeesProcessed() external view returns (uint256) {
        return _totalBurnedInternal();
    }

    /// @notice T-14 FIX: Prevent accidental renounceOwnership which would permanently lock the contract
    function renounceOwnership() public view override onlyOwner {
        revert("VFIDEToken: renounce disabled");
    }
}
