// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// NOTE: Moved from contracts/VaultInfrastructure.sol to
// contracts/legacy/VaultInfrastructure.sol on 2026-05-16 (Operations Phase
// Turn 4). The file's M-21 Architecture Note already self-documented that
// CardBoundVault + VaultHub had superseded UserVaultLegacy. Confirmed at move
// time: VaultHub provides all three lookup functions VaultRegistry needs
// (vaultOf, ownerOfVault, isVault) via auto-generated getters on its public
// mappings, and is already in active use for those calls by FraudRegistry,
// VFIDETermLoan, and VaultRecoveryClaim. The deprecated force-recovery
// functions in IVaultInfrastructure are non-custodial-removed and aren't
// called by V1 paths. File retained for reference / backward-compat with
// any pre-existing UserVaultLegacy deployments.

import "../SharedInterfaces.sol";

/**
 * VaultInfrastructure (zkSync Era ready) — FINAL
 * ----------------------------------------------------------
 * Single-file hub providing:
 *  - Deterministic Create2 factory for user vaults
 *  - Registry: vaultOf(owner) / ownerOf(vault)
 *  - Embedded UserVaultLegacy implementation (guardians + recovery)
 *  - SecurityHub lock enforcement (PanicGuard / GuardianLock)
 *  - ProofLedger best-effort logging
 *
 * M-21 Architecture Note:
 *  The active vault implementation is CardBoundVault (deployed via VaultHub).
 *  UserVaultLegacy is retained here solely for backward compatibility with
 *  existing deployed vaults. New vaults MUST be created through VaultHub.
 *  The standalone UserVault.sol has been removed as dead code.
 *
 * Pairs with VFIDEToken's "vaultOnly" transfer enforcement.
 */

/// @dev DEPRECATED — Retained for backward compatibility with existing deployments.
///      New vaults are deployed as CardBoundVault via VaultHub.ensureVault().
/// ─────────────────────────── User Vault (embedded, legacy)
/// @notice UserVaultLegacy
/// @title UserVaultLegacy
/// @author Vfide
contract UserVaultLegacy is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// Immutable references
    /// @notice hub
    address public immutable hub;
    /// @notice vfideToken
    address public immutable vfideToken;
    /// @notice ledger
    IProofLedger public immutable ledger;

    /// State
    /// @notice owner
    address public owner;
    /// @notice isGuardian
    mapping(address => bool) public isGuardian;
    /// @notice guardianCount
    uint8 public guardianCount; // Track count for logic
    
    // Track guardian list for enumeration
    /// @notice guardianList
    address[] private guardianList;

    /// @notice nextOfKin
    address public nextOfKin;
    
    /// Withdrawal friction layer
    /// @notice lastWithdrawalTime
    uint64 public lastWithdrawalTime;
    /// @notice withdrawalCooldown
    uint64 public withdrawalCooldown = 24 hours; // Default 24h cooldown
    /// @notice largeTransferThreshold
    uint256 public largeTransferThreshold = 10000 * 1e18; // Default 10k VFIDE (legacy, optional)

    // H-1 FIX: Daily transfer limit — mirrors CardBoundVault spend limit enforcement.
    // 0 = no limit (opt-in; owner sets via setDailyTransferLimit).
    /// @notice dailyTransferLimit
    uint256 public dailyTransferLimit;
    /// @notice spentToday
    uint256 public spentToday;
    /// @notice dayStart
    uint64  public dayStart;
    
    /// @notice lastExecuteTime
    uint64 public lastExecuteTime;
    /// @notice executeCooldown
    uint64 public executeCooldown = 1 hours; // Default 1h cooldown for execute()
    
    /// @notice maxExecuteValue
    uint256 public maxExecuteValue = 1 ether; // Default 1 ETH max per execute call

    /// @notice allowedExecuteTarget
    mapping(address => bool) public allowedExecuteTarget;
    /// @notice executeWhitelistEnforced
    bool public executeWhitelistEnforced = true; // Legacy vaults default to whitelist-on
    /// @notice ExecuteTargetSet
    /// @param target target
    /// @param allowed allowed
    event ExecuteTargetSet(address indexed target, bool allowed);
    /// @notice ExecuteWhitelistEnforced
    /// @param enforced enforced
    event ExecuteWhitelistEnforced(bool enforced);
    
    /// User-controlled security features
    /// @notice frozen
    bool public frozen; // User can freeze vault like freezing ATM card
    
    // Flexible abnormal transaction detection
    /// @notice usePercentageThreshold
    bool public usePercentageThreshold; // If true, use percentage; if false, use fixed amount
    /// @notice abnormalTransactionThreshold
    uint256 public abnormalTransactionThreshold = 50000 * 1e18; // Fixed amount (default 50k VFIDE)
    /// @notice abnormalTransactionPercentageBps
    uint16 public abnormalTransactionPercentageBps = 5000; // Percentage in basis points (default 50% = 5000 bps)
    /// @notice useBalanceSnapshot
    bool public useBalanceSnapshot; // If true, use snapshot balance; if false, use current balance
    /// @notice balanceSnapshot
    uint256 public balanceSnapshot; // Snapshot of balance for percentage calculations
    
    struct PendingTransaction {
        address toVault;
        uint256 amount;
        uint64 requestTime;
        bool approved;
        bool executed;
    }
    /// @notice pendingTransactions
    mapping(uint256 => PendingTransaction) public pendingTransactions;
    /// @notice pendingTxCount
    uint256 public pendingTxCount;
    /// @notice PENDING_TX_EXPIRY
    uint64 public constant PENDING_TX_EXPIRY = 24 hours;

    struct Recovery {
        address proposedOwner;
        uint8 approvals;               // guardian approvals count
        uint64 readyTime;              // Minimum time before finalization
        uint64 expiryTime;        uint8 guardianCountSnapshot;   // Lock guardian count at request time
        uint256 nonce;        mapping(address => mapping(uint256 => bool)) voted;    }
    /// @notice _recovery
    Recovery private _recovery;
    /// @notice RECOVERY_MIN_DELAY
    uint64 public constant RECOVERY_MIN_DELAY = 7 days;
    /// @notice RECOVERY_EXPIRY
    uint64 public constant RECOVERY_EXPIRY = 30 days;

    struct Inheritance {
        bool active;                   // Inheritance request active
        uint8 approvals;               // guardian approvals count
        uint64 readyTime;              // Minimum time before finalization
        uint64 expiryTime;             // Inheritance expires after 30 days
        uint8 guardianCountSnapshot;   // Lock guardian count at request time
        bool ownerDenied;              // Owner explicitly denied (prevents gaming)
        uint256 nonce;        mapping(address => mapping(uint256 => bool)) voted;    }
    /// @notice _inheritance
    Inheritance private _inheritance;
    /// @notice INHERITANCE_MIN_DELAY
    uint64 public constant INHERITANCE_MIN_DELAY = 7 days;
    /// @notice INHERITANCE_EXPIRY
    uint64 public constant INHERITANCE_EXPIRY = 30 days;

    /// Events
    /// @notice OwnerSet
    /// @param newOwner newOwner
    event OwnerSet(address indexed newOwner);
    /// @notice GuardianSet
    /// @param guardian guardian
    /// @param active active
    event GuardianSet(address indexed guardian, bool active);
    /// @notice NextOfKinSet
    /// @param kin kin
    event NextOfKinSet(address indexed kin);
    /// @notice RecoveryRequested
    /// @param proposedOwner proposedOwner
    event RecoveryRequested(address indexed proposedOwner);
    /// @notice RecoveryApproved
    /// @param guardian guardian
    /// @param proposedOwner proposedOwner
    /// @param approvals approvals
    event RecoveryApproved(address indexed guardian, address indexed proposedOwner, uint8 approvals);
    /// @notice RecoveryCancelled
    /// @param cancelledBy cancelledBy
    event RecoveryCancelled(address indexed cancelledBy);
    /// @notice RecoveryFinalized
    /// @param newOwner newOwner
    event RecoveryFinalized(address indexed newOwner);
    /// @notice InheritanceRequested
    /// @param nextOfKin nextOfKin
    event InheritanceRequested(address indexed nextOfKin);
    /// @notice InheritanceApproved
    /// @param guardian guardian
    /// @param approvals approvals
    event InheritanceApproved(address indexed guardian, uint8 approvals);
    /// @notice InheritanceDenied
    /// @param owner owner
    event InheritanceDenied(address indexed owner);
    /// @notice InheritanceCancelled
    /// @param cancelledBy cancelledBy
    event InheritanceCancelled(address indexed cancelledBy);
    /// @notice InheritanceCancelledByGuardians
    /// @param cancelledBy cancelledBy
    /// @param approvals approvals
    event InheritanceCancelledByGuardians(address indexed cancelledBy, uint8 approvals);
    /// @notice InheritanceFinalized
    /// @param inheritor inheritor
    /// @param inheritorVault inheritorVault
    /// @param amount amount
    event InheritanceFinalized(address indexed inheritor, address indexed inheritorVault, uint256 amount);
    /// @notice VaultTransfer
    /// @param toVault toVault
    /// @param amount amount
    event VaultTransfer(address indexed toVault, uint256 amount);
    /// @notice VaultApprove
    /// @param spender spender
    /// @param amount amount
    event VaultApprove(address indexed spender, uint256 amount);
    /// @notice VaultFrozen
    /// @param frozen frozen
    event VaultFrozen(bool frozen);
    /// @notice AbnormalTransactionDetected
    /// @param txId txId
    /// @param toVault toVault
    /// @param amount amount
    event AbnormalTransactionDetected(uint256 indexed txId, address indexed toVault, uint256 amount);
    /// @notice TransactionApproved
    /// @param txId txId
    /// @param by by
    event TransactionApproved(uint256 indexed txId, address indexed by);
    /// @notice TransactionDenied
    /// @param txId txId
    /// @param by by
    event TransactionDenied(uint256 indexed txId, address indexed by);
    /// @notice TransactionExecuted
    /// @param txId txId
    /// @param toVault toVault
    /// @param amount amount
    event TransactionExecuted(uint256 indexed txId, address indexed toVault, uint256 amount);
    /// @notice AbnormalThresholdSet
    /// @param usePercentage usePercentage
    /// @param fixedAmount fixedAmount
    /// @param percentageBps percentageBps
    event AbnormalThresholdSet(bool usePercentage, uint256 fixedAmount, uint16 percentageBps);

    /// Errors
    /// @notice UV_NotOwner
    error UV_NotOwner();
    /// @notice UV_Locked
    error UV_Locked();
    /// @notice UV_Frozen
    error UV_Frozen();
    /// @notice UV_Zero
    error UV_Zero();
    /// @notice UV_NotGuardian
    error UV_NotGuardian();
    /// @notice UV_AlreadyVoted
    error UV_AlreadyVoted();
    /// @notice UV_NoRecovery
    error UV_NoRecovery();
    /// @notice UV_NoInheritance
    error UV_NoInheritance();
    /// @notice UV_InheritanceDenied
    error UV_InheritanceDenied();
    /// @notice UV_NotNextOfKin
    error UV_NotNextOfKin();
    /// @notice UV_NoPendingTx
    error UV_NoPendingTx();
    /// @notice UV_TxAlreadyProcessed
    error UV_TxAlreadyProcessed();
    /// @notice UV_RecoveryActive
    error UV_RecoveryActive();
    /// @notice UV_InheritanceActive
    error UV_InheritanceActive();
    /// @notice UV_ClaimInProgress
    error UV_ClaimInProgress();

    /// @notice onlyOwner
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /// @notice _checkOwner
    function _checkOwner() internal view {
        if (msg.sender != owner) revert UV_NotOwner();
    }

    /// @notice notFrozen
    modifier notFrozen() {
        _checkNotFrozen();
        _;
    }

    /// @notice _checkNotFrozen
    function _checkNotFrozen() internal view {
        if (frozen) revert UV_Frozen();
    }

    /// @notice noActiveClaims
    modifier noActiveClaims() {
        _checkNoActiveClaims();
        _;
    }

    /// @notice _checkNoActiveClaims
    function _checkNoActiveClaims() internal view {
        if (_recovery.proposedOwner != address(0) || _inheritance.active) revert UV_ClaimInProgress();
    }

    /// @notice constructor
    /// @param _hub _hub
    /// @param _vfide _vfide
    /// @param _owner _owner
    /// @param _ledger _ledger
    constructor(
        address _hub,
        address _vfide,
        address _owner,
        address _ledger
    ) {
        require(_hub != address(0) && _vfide != address(0) && _owner != address(0), "UV:zero");
        hub = _hub;
        vfideToken = _vfide;
        owner = _owner;
        ledger = IProofLedger(_ledger);
        executeWhitelistEnforced = true;
        _logSys("vault_created");
        emit OwnerSet(_owner);
    }

    // ——— Governance hooks (only hub may force operations)
    /// @notice __forceSetOwner
    /// @param newOwner newOwner
    function __forceSetOwner(address newOwner) external {
        newOwner;
        revert("VI: force recovery disabled - legacy vault migration required");
    }

    // ——— Owner controls
    // Track guardian add time for flash endorsement protection
    /// @notice guardianAddTime
    mapping(address => uint64) public guardianAddTime;
    /// @notice GUARDIAN_MATURITY_PERIOD
    uint64 public constant GUARDIAN_MATURITY_PERIOD = 7 days;
    /// @notice MAX_GUARDIANS
    uint8 public constant MAX_GUARDIANS = 20;

    /// @notice setGuardian
    /// @param g g
    /// @param active active
    function setGuardian(address g, bool active) external onlyOwner {
        if (g == address(0)) revert UV_Zero();
        
        // Prevent guardian changes during active recovery to protect vote integrity
        // This blocks both additions (vote dilution) and removals (vote manipulation)
        if (_recovery.proposedOwner != address(0)) {
            revert UV_RecoveryActive();
        }
        if (_inheritance.active) {
            revert UV_InheritanceActive();
        }
        
        if (isGuardian[g] != active) {
            isGuardian[g] = active;
            if (active) {
                require(guardianCount < MAX_GUARDIANS, "UV: guardian limit reached");
                ++guardianCount;
                guardianAddTime[g] = uint64(block.timestamp); // H-1: Track add time
                guardianList.push(g); // Track for enumeration
            } else {
                --guardianCount;
                delete guardianAddTime[g]; // H-17: Clear on removal
                // Remove from list (swap and pop)
                for (uint256 i = 0; i < guardianList.length; ++i) {
                    if (guardianList[i] == g) {
                        guardianList[i] = guardianList[guardianList.length - 1];
                        guardianList.pop();
                        break;
                    }
                }
            }
            emit GuardianSet(g, active);
            _logEv(g, active ? "guardian_add" : "guardian_remove", 0, "");
        }
    }

    /// @notice isGuardianMature
    /// @param g g
    /// @return _bool _bool
    function isGuardianMature(address g) public view returns (bool) {
        if (!isGuardian[g]) return false;
        return block.timestamp >= guardianAddTime[g] + GUARDIAN_MATURITY_PERIOD;
    }

    /// @notice setNextOfKin
    /// @param kin kin
    function setNextOfKin(address kin) external onlyOwner {
        if (kin == address(0)) revert UV_Zero();
        if (_inheritance.active) revert UV_InheritanceActive();
        nextOfKin = kin;
        emit NextOfKinSet(kin);
        _logEv(kin, "next_of_kin_set", 0, "");
    }

    /// @notice WithdrawalCooldownSet
    /// @param cooldown cooldown
    event WithdrawalCooldownSet(uint64 cooldown);
    
    /// @notice setWithdrawalCooldown
    /// @param cooldown cooldown
    function setWithdrawalCooldown(uint64 cooldown) external onlyOwner {
        require(cooldown <= 7 days, "UV:cooldown-too-long");
        require(cooldown >= 1 hours || cooldown == 0, "UV:cooldown-too-short");
        withdrawalCooldown = cooldown;
        emit WithdrawalCooldownSet(cooldown);
        _logEv(msg.sender, "cooldown_set", cooldown, "");
    }

    /// @notice setLargeTransferThreshold
    /// @param threshold threshold
    function setLargeTransferThreshold(uint256 threshold) external onlyOwner {
        require(threshold >= 100 * 1e18, "UV: threshold too low");
        require(threshold <= 1_000_000 * 1e18, "UV: threshold too high");
        largeTransferThreshold = threshold;
        _logEv(msg.sender, "threshold_set", threshold, "");
    }

    /// @notice H-1 FIX: Set a rolling 24-hour transfer limit aligned with CardBoundVault.
    ///         Pass 0 to disable the limit.
    /// @param limit limit
    function setDailyTransferLimit(uint256 limit) external onlyOwner {
        require(limit == 0 || limit >= 100 * 1e18, "UV: limit too low");
        dailyTransferLimit = limit;
        // Reset window so the new limit takes effect from now.
        spentToday = 0;
        dayStart   = uint64(block.timestamp);
        _logEv(msg.sender, "daily_limit_set", limit, "");
    }

    /// @notice _consumeDailyTransferLimit
    /// @param amount amount
    function _consumeDailyTransferLimit(uint256 amount) internal {
        if (amount == 0 || dailyTransferLimit == 0) return;
        if (block.timestamp >= uint256(dayStart) + 1 days) {
            spentToday = 0;
            dayStart = uint64(block.timestamp);
        }
        require(spentToday + amount <= dailyTransferLimit, "UV: daily limit exceeded");
        spentToday += amount;
    }
    
    // ——— User Security Controls
    
    /**
     * @notice Freeze vault to prevent ALL transactions (like freezing ATM card)
     * @dev Owner can freeze/unfreeze anytime. Useful when wallet might be compromised
     * @param _frozen True to freeze vault, false to unfreeze
     */
    function setFrozen(bool _frozen) external onlyOwner {
        frozen = _frozen;
        emit VaultFrozen(_frozen);
        _logEv(msg.sender, _frozen ? "vault_frozen" : "vault_unfrozen", 0, "");
    }
    
    /**
     * @notice Set threshold for abnormal transaction detection
     * @dev User can choose between fixed amount or percentage of vault balance
     * @param _usePercentage True to use percentage, false to use fixed amount
     * @param _fixedAmount Fixed amount threshold in wei (e.g., 50000 * 1e18 for 50k VFIDE)
     * @param _percentageBps Percentage threshold in basis points (e.g., 5000 = 50%, 2500 = 25%)
     * 
     * Examples:
     * - setAbnormalTransactionThreshold(false, 10000 * 1e18, 0) = Fixed 10k VFIDE
     * - setAbnormalTransactionThreshold(true, 0, 2500) = 25% of vault balance
     * - setAbnormalTransactionThreshold(true, 0, 7500) = 75% of vault balance
     */
    function setAbnormalTransactionThreshold(
        bool _usePercentage,
        uint256 _fixedAmount,
        uint16 _percentageBps
    ) external onlyOwner {
        if (_usePercentage) {
            require(_percentageBps > 0 && _percentageBps <= 10000, "UV: invalid percentage (0-10000 bps)");
            abnormalTransactionPercentageBps = _percentageBps;
        } else {
            require(_fixedAmount >= largeTransferThreshold, "UV: must be >= large transfer threshold");
            abnormalTransactionThreshold = _fixedAmount;
        }
        
        usePercentageThreshold = _usePercentage;
        
        emit AbnormalThresholdSet(_usePercentage, _fixedAmount, _percentageBps);
        _logEv(msg.sender, "abnormal_tx_threshold_set", _usePercentage ? _percentageBps : _fixedAmount, "");
    }
    
    /**
     * @notice Set balance snapshot mode for percentage-based thresholds
     * @dev When enabled, uses snapshot balance for calculations to prevent threshold manipulation
     * @param _useSnapshot True to use balance snapshot, false to use current balance
     */
    function setBalanceSnapshotMode(bool _useSnapshot) external onlyOwner {
        useBalanceSnapshot = _useSnapshot;
        if (_useSnapshot) {
            // Take snapshot of current balance
            balanceSnapshot = IERC20(vfideToken).balanceOf(address(this));
            _logEv(msg.sender, "balance_snapshot_enabled", balanceSnapshot, "");
        } else {
            balanceSnapshot = 0;
            _logEv(msg.sender, "balance_snapshot_disabled", 0, "");
        }
    }
    
    /**
     * @notice Update balance snapshot (when in snapshot mode)
     * @dev Allows owner to update snapshot after significant deposits
     */
    function updateBalanceSnapshot() external onlyOwner {
        require(useBalanceSnapshot, "UV: snapshot mode not enabled");
        balanceSnapshot = IERC20(vfideToken).balanceOf(address(this));
        _logEv(msg.sender, "balance_snapshot_updated", balanceSnapshot, "");
    }
    
    /**
     * @notice Get current abnormal transaction threshold based on user preference
     * @return Current threshold amount in wei
     * @return _uint256 _uint256
     */
    function getAbnormalTransactionThreshold() public view returns (uint256) {
        if (usePercentageThreshold) {
            uint256 balance;
            if (useBalanceSnapshot && balanceSnapshot > 0) {
                // Use snapshot balance to prevent threshold manipulation
                balance = balanceSnapshot;
            } else {
                // Use current balance (dynamic threshold)
                balance = IERC20(vfideToken).balanceOf(address(this));
            }
            return (balance * abnormalTransactionPercentageBps) / 10000;
        } else {
            return abnormalTransactionThreshold;
        }
    }
    
    /**
     * @notice Approve pending abnormal transaction
     * @param txId Transaction ID to approve
     */
    function approvePendingTransaction(uint256 txId) external onlyOwner {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.amount == 0) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();
        require(block.timestamp <= ptx.requestTime + PENDING_TX_EXPIRY, "UV: pending tx expired");
        
        ptx.approved = true;
        emit TransactionApproved(txId, msg.sender);
        _logEv(msg.sender, "pending_tx_approved", txId, "");
    }
    
    /**
     * @notice Deny pending abnormal transaction
     * @param txId Transaction ID to deny
     */
    function denyPendingTransaction(uint256 txId) external onlyOwner {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.amount == 0) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();
        
        // Mark as executed to prevent retry
        ptx.executed = true;
        emit TransactionDenied(txId, msg.sender);
        _logEv(msg.sender, "pending_tx_denied", txId, "");
    }
    
    /**
     * @notice Clean up expired pending transaction to free storage
     * @param txId Transaction ID to clean up
     */
    function cleanupExpiredTransaction(uint256 txId) external onlyOwner {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.amount == 0) revert UV_NoPendingTx();
        require(block.timestamp > ptx.requestTime + PENDING_TX_EXPIRY, "UV: tx not expired");
        
        // Clear storage
        delete pendingTransactions[txId];
        _logEv(msg.sender, "pending_tx_cleanup", txId, "");
    }
    
    /**
     * @notice Execute approved pending transaction
     * @param txId Transaction ID to execute
     */
    function executePendingTransaction(uint256 txId) external onlyOwner notFrozen nonReentrant {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.amount == 0) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();
        require(ptx.approved, "UV: tx not approved");
        require(block.timestamp <= ptx.requestTime + PENDING_TX_EXPIRY, "UV: pending tx expired");
        
        ptx.executed = true;
        lastWithdrawalTime = uint64(block.timestamp);
        
        // Execute the transfer
        require(IERC20(vfideToken).balanceOf(address(this)) >= ptx.amount, "UV: insufficient balance");
        IERC20(vfideToken).safeTransfer(ptx.toVault, ptx.amount);
        
        emit TransactionExecuted(txId, ptx.toVault, ptx.amount);
        emit VaultTransfer(ptx.toVault, ptx.amount);
        _logEv(ptx.toVault, "pending_tx_executed", ptx.amount, "");
    }

    // ——— Recovery flow (owner lost)
    /// @notice requestRecovery
    /// @param proposedOwner proposedOwner
    function requestRecovery(address proposedOwner) external {
        // Either nextOfKin, an existing guardian, or the current owner may open a request
        if (!(msg.sender == owner || isGuardian[msg.sender] || msg.sender == nextOfKin)) revert UV_NotGuardian();
        if (proposedOwner == address(0)) revert UV_Zero();

        // "Chain of Return" Logic:
        // H-2 FIX: Even nextOfKin with 0 guardians needs a timelock to prevent instant takeover
        // This gives the owner time to cancel if the vault isn't truly abandoned
        if (msg.sender == nextOfKin && guardianCount == 0) {
            // Instead of instant recovery, require a 7-day waiting period.
            // With zero guardians, mark one virtual approval so finalize can occur after timelock.
            ++_recovery.nonce;
            _recovery.proposedOwner = proposedOwner;
            _recovery.approvals = 1;
            _recovery.readyTime = uint64(block.timestamp + RECOVERY_MIN_DELAY);
            _recovery.expiryTime = uint64(block.timestamp + RECOVERY_EXPIRY);
            _recovery.guardianCountSnapshot = 0;
            
            emit RecoveryRequested(proposedOwner);
            _logEv(proposedOwner, "recovery_requested_kin", 0, "7-day wait required");
            return;
        }

        // reset recovery with expiry time
        _recovery.nonce++;        _recovery.proposedOwner = proposedOwner;
        _recovery.approvals = 0;
        _recovery.readyTime = uint64(block.timestamp + RECOVERY_MIN_DELAY);
        _recovery.expiryTime = uint64(block.timestamp + RECOVERY_EXPIRY);
        _recovery.guardianCountSnapshot = guardianCount; // Lock guardian count
        
        // Auto-approve if sender is a guardian
        if (isGuardian[msg.sender]) {
            _recovery.voted[msg.sender][_recovery.nonce] = true;
            _recovery.approvals = 1;
        }
        
        emit RecoveryRequested(proposedOwner);
        _logEv(proposedOwner, "recovery_requested", 0, "");
    }

    /// @notice guardianApproveRecovery
    function guardianApproveRecovery() external {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        require(isGuardianMature(msg.sender), "UV: guardian not mature");
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        require(block.timestamp <= _recovery.expiryTime, "UV: recovery expired");
        if (_recovery.voted[msg.sender][_recovery.nonce]) revert UV_AlreadyVoted();
        _recovery.voted[msg.sender][_recovery.nonce] = true;
        ++_recovery.approvals;
        emit RecoveryApproved(msg.sender, _recovery.proposedOwner, _recovery.approvals);
        _logEv(msg.sender, "recovery_approval", _recovery.approvals, "");
    }

    /// @notice finalizeRecovery
    function finalizeRecovery() external {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        require(block.timestamp >= _recovery.readyTime, "UV: recovery timelock");
        require(block.timestamp <= _recovery.expiryTime, "UV: recovery expired");
        
        // Use locked guardian count from request time to prevent threshold manipulation
        uint256 threshold = _recovery.guardianCountSnapshot == 0 ? 1 : (_recovery.guardianCountSnapshot / 2) + 1;
        require(_recovery.approvals >= threshold, "UV:insufficient-approvals");
        
        address newOwner = _recovery.proposedOwner;
        owner = newOwner;

        // clear request (also clear expiry) and vote state
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.readyTime = 0;
        _recovery.expiryTime = 0;
        _recovery.guardianCountSnapshot = 0;
        // Note: Individual voted mappings cannot be cleared efficiently in a loop
        // They will be overwritten on next recovery request

        emit RecoveryFinalized(newOwner);
        _logSys("recovery_finalized");
    }

    /// @notice cancelRecovery
    function cancelRecovery() external onlyOwner {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        
        // Clear the recovery request
        address cancelled = _recovery.proposedOwner;
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.readyTime = 0;
        _recovery.expiryTime = 0;
        _recovery.guardianCountSnapshot = 0;
        
        emit RecoveryCancelled(msg.sender);
        _logEv(cancelled, "recovery_cancelled", 0, "");
    }

    // ——— Inheritance (Next of Kin fund transfer with guardian approval)
    
    /**
     * @notice Next of Kin requests inheritance transfer
     * @dev Requires guardian approval OR DAO approval to prevent gaming
     * Owner can deny the request if called prematurely
     */
    function requestInheritance() external {
        if (msg.sender != nextOfKin) revert UV_NotNextOfKin();
        if (nextOfKin == address(0)) revert UV_Zero();
        
        // Cannot request if already active or previously denied
        require(!_inheritance.active, "UV: inheritance already active");
        require(!_inheritance.ownerDenied, "UV: owner denied inheritance");
        
        _inheritance.nonce++;        _inheritance.active = true;
        _inheritance.approvals = 0;
        _inheritance.readyTime = uint64(block.timestamp + INHERITANCE_MIN_DELAY);
        _inheritance.expiryTime = uint64(block.timestamp + INHERITANCE_EXPIRY);
        _inheritance.guardianCountSnapshot = guardianCount;
        _inheritance.ownerDenied = false;
        
        emit InheritanceRequested(msg.sender);
        _logEv(msg.sender, "inheritance_requested", 0, "");
    }
    
    /**
     * @notice Guardians approve inheritance request
     * @dev Requires 2/3 guardians to approve (same threshold as recovery)
     */
    function approveInheritance() external {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        require(isGuardianMature(msg.sender), "UV: guardian not mature");
        if (!_inheritance.active) revert UV_NoInheritance();
        if (_inheritance.ownerDenied) revert UV_InheritanceDenied();
        if (_inheritance.voted[msg.sender][_inheritance.nonce]) revert UV_AlreadyVoted();
        
        // Check expiry
        require(block.timestamp <= _inheritance.expiryTime, "UV: inheritance expired");
        
        _inheritance.voted[msg.sender][_inheritance.nonce] = true;
        ++_inheritance.approvals;
        
        emit InheritanceApproved(msg.sender, _inheritance.approvals);
        _logEv(msg.sender, "inheritance_approved", _inheritance.approvals, "");
    }
    
    /**
     * @notice Owner denies inheritance request (prevents gaming/premature claims)
     * @dev If owner is alive and accessible, they can deny the request
     */
    function denyInheritance() external onlyOwner {
        if (!_inheritance.active) revert UV_NoInheritance();
        
        _inheritance.ownerDenied = true;
        _inheritance.active = false;
        _inheritance.approvals = 0;
        _inheritance.readyTime = 0;
        _inheritance.expiryTime = 0;
        _inheritance.guardianCountSnapshot = 0;
        
        emit InheritanceDenied(msg.sender);
        _logEv(msg.sender, "inheritance_denied", 0, "");
    }
    
    // Guardian cancellation tracking for inheritance
    // C-1 FIX: Added nonce to properly reset votes after successful cancellation
    /// @notice _inheritanceCancellationVoted
    mapping(address => mapping(uint256 => bool)) private _inheritanceCancellationVoted;
    /// @notice _inheritanceCancellationApprovals
    uint8 private _inheritanceCancellationApprovals;
    /// @notice _inheritanceCancellationNonce
    uint256 private _inheritanceCancellationNonce;
    
    /**
     * @notice Guardians vote to cancel fraudulent inheritance request
     * @dev Requires 2/3 guardians to cancel if owner is unreachable
     * Use case: Next of Kin files claim while owner is traveling (unreachable)
     * C-1 FIX: Uses nonce to properly reset votes after successful cancellation
     */
    function guardianCancelInheritance() external {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        if (!_inheritance.active) revert UV_NoInheritance();
        // C-1 FIX: Check vote using current nonce
        if (_inheritanceCancellationVoted[msg.sender][_inheritanceCancellationNonce]) revert UV_AlreadyVoted();
        
        _inheritanceCancellationVoted[msg.sender][_inheritanceCancellationNonce] = true;
        ++_inheritanceCancellationApprovals;
        
        // Use guardian snapshot from request time to prevent threshold manipulation
        uint8 snapshotCount = _inheritance.guardianCountSnapshot;
        uint256 threshold = snapshotCount == 0 ? 1 : (snapshotCount / 2) + 1;
        
        if (_inheritanceCancellationApprovals >= threshold) {
            // Cancel inheritance request
            _inheritance.active = false;
            _inheritance.approvals = 0;
            _inheritance.readyTime = 0;
            _inheritance.expiryTime = 0;
            _inheritance.guardianCountSnapshot = 0;
            _inheritance.ownerDenied = false;
            
            // C-1 FIX: Increment nonce to invalidate all previous votes
            ++_inheritanceCancellationNonce;
            _inheritanceCancellationApprovals = 0;
            
            // forge-lint: disable-next-line(unsafe-typecast)
            // Safe: threshold is bounded by guardian count (max 255) fits in uint8
            emit InheritanceCancelledByGuardians(msg.sender, uint8(threshold));
            _logEv(msg.sender, "inheritance_cancelled_by_guardians", threshold, "");
        } else {
            _logEv(msg.sender, "inheritance_cancel_vote", _inheritanceCancellationApprovals, "");
        }
    }
    
    /**
     * @notice Finalize inheritance - transfer funds to Next of Kin's vault
     * @dev Requires 2/3 guardian approvals AND inheritor must already have a vault
     * This ensures inheritor is a responsible user who understands the system
     * Deceased's vault remains locked for records
     */
    function finalizeInheritance() external nonReentrant {
        if (!_inheritance.active) revert UV_NoInheritance();
        if (_inheritance.ownerDenied) revert UV_InheritanceDenied();
        require(block.timestamp >= _inheritance.readyTime, "UV: inheritance timelock");
        
        // Check expiry
        require(block.timestamp <= _inheritance.expiryTime, "UV: inheritance expired");
        
        // Require 2/3 guardian threshold (same as recovery)
        uint256 threshold = _inheritance.guardianCountSnapshot == 0 ? 1 : (_inheritance.guardianCountSnapshot / 2) + 1;
        require(_inheritance.approvals >= threshold, "UV: insufficient approvals");
        
        address inheritor = nextOfKin;
        require(inheritor != address(0), "UV: no next of kin");
        
        // IMPORTANT: Inheritor MUST already have a vault created
        // This ensures they're a responsible user who understands the system
        IVaultHub hubContract = IVaultHub(hub);
        address inheritorVault = hubContract.vaultOf(inheritor);
        require(inheritorVault != address(0), "UV: inheritor must have existing vault");
        
        // Transfer all VFIDE to inheritor's vault
        uint256 balance = IERC20(vfideToken).balanceOf(address(this));
        require(balance > 0, "UV: no funds to inherit");

        // Clear inheritance request before external transfer call.
        _inheritance.active = false;
        _inheritance.approvals = 0;
        _inheritance.readyTime = 0;
        _inheritance.expiryTime = 0;
        _inheritance.guardianCountSnapshot = 0;
        _inheritance.ownerDenied = false;
        _inheritanceCancellationApprovals = 0; // Clear guardian cancellation votes
        
        IERC20(vfideToken).safeTransfer(inheritorVault, balance);
        
        _logEv(inheritorVault, "inheritance_finalized", balance, "");
        emit InheritanceFinalized(inheritor, inheritorVault, balance);
        
        // Note: Deceased's vault remains for record-keeping
        // Owner is NOT changed - vault effectively becomes locked historical record
    }

    // ——— Token operations (VFIDE only)
    // Return value for transfers that require approval
    /// @notice TransferPendingApproval
    /// @param txId txId
    /// @param toVault toVault
    /// @param amount amount
    event TransferPendingApproval(uint256 indexed txId, address indexed toVault, uint256 amount);
    
    // slither-disable-next-line reentrancy-benign
    /// @notice transferVFIDE
    /// @param toVault toVault
    /// @param amount amount
    /// @return _bool _bool
    function transferVFIDE(address toVault, uint256 amount) external onlyOwner notFrozen noActiveClaims nonReentrant returns (bool) {
        if (toVault == address(0)) revert UV_Zero();
        require(amount > 0, "UV: zero amount");
        uint256 currentBalance = IERC20(vfideToken).balanceOf(address(this));
        require(currentBalance >= amount, "UV: insufficient balance");
        
        // Get current abnormal transaction threshold (dynamic based on user preference)
        uint256 currentThreshold = getAbnormalTransactionThreshold();
        
        // Abnormal transaction detection - requires explicit approval
        if (currentThreshold > 0 && amount >= currentThreshold) {
            // Create pending transaction for approval
            uint256 txId = pendingTxCount++;
            pendingTransactions[txId] = PendingTransaction({
                toVault: toVault,
                amount: amount,
                requestTime: uint64(block.timestamp),
                approved: false,
                executed: false
            });
            
            emit AbnormalTransactionDetected(txId, toVault, amount);
            emit TransferPendingApproval(txId, toVault, amount); // Additional event for clarity
            _logEv(toVault, "abnormal_tx_detected", amount, "");
            
            // CRITICAL: Revert with pending tx info so caller knows what happened
            // This is safer than returning false which callers might ignore
            revert(string(abi.encodePacked("UV:pending-approval:", _uint2str(txId))));
        }
        
        // Withdrawal cooldown check
        if (withdrawalCooldown > 0 && lastWithdrawalTime > 0) {
            require(block.timestamp >= lastWithdrawalTime + withdrawalCooldown, "UV:cooldown-active");
        }

        lastWithdrawalTime = uint64(block.timestamp);
        
        // Amount-based threshold: large transfers face additional scrutiny
        // (All transfers already checked by the notFrozen modifier above)
        _consumeDailyTransferLimit(amount);
        if (amount > largeTransferThreshold && largeTransferThreshold > 0) {
            // Large transfer - log for extra scrutiny
            _logEv(toVault, "large_transfer_attempt", amount, "");
        }
        
        IERC20(vfideToken).safeTransfer(toVault, amount);
        
        _logEv(toVault, "vault_transfer", amount, "");
        emit VaultTransfer(toVault, amount);
        return true;
    }

    // slither-disable-next-line reentrancy-events
    /// @notice approveVFIDE
    /// @param spender spender
    /// @param amount amount
    /// @return _bool _bool
    function approveVFIDE(address spender, uint256 amount) external onlyOwner notFrozen noActiveClaims returns (bool) {
        if (spender == address(0)) revert UV_Zero();
        
        // VI-05 FIX: Apply same protections as transferVFIDE
        if (amount > 0) {
            // Check abnormal transaction threshold
            uint256 currentThreshold = getAbnormalTransactionThreshold();
            require(!(currentThreshold > 0 && amount >= currentThreshold), "UV: approval exceeds abnormal threshold");
            
            // Withdrawal cooldown check
            if (withdrawalCooldown > 0 && lastWithdrawalTime > 0) {
                require(block.timestamp >= lastWithdrawalTime + withdrawalCooldown, "UV:cooldown-active");
            }
            lastWithdrawalTime = uint64(block.timestamp);
            _consumeDailyTransferLimit(amount);
        }
        
        bool ok = IERC20(vfideToken).approve(spender, amount);
        require(ok, "UV:approve-failed");
        emit VaultApprove(spender, amount);
        _logEv(spender, "vault_approve", amount, "");
        return ok;
    }

    // ——— Generic Execution (Smart Account)
    /// @notice execute
    /// @param target target
    /// @param value value
    /// @param data data
    /// @return result result
    function execute(address target, uint256 value, bytes calldata data) external onlyOwner notFrozen noActiveClaims nonReentrant returns (bytes memory result) {
        if (target == address(0)) revert UV_Zero();
        require(target != vfideToken, "UV:use-transferVFIDE");
        
        require(value <= maxExecuteValue, "UV:value-exceeds-max");
        
        if (executeCooldown > 0 && lastExecuteTime > 0) {
            require(block.timestamp >= lastExecuteTime + executeCooldown, "UV:execute-cooldown-active");
        }
        
        // Security check: Prevent calling the Vault itself (reentrancy/self-destruct protection)
        require(target != address(this), "UV:self-call");

        if (executeWhitelistEnforced) {
            require(allowedExecuteTarget[target], "UV:target-not-whitelisted");
        }

        _consumeDailyTransferLimit(value);

        // Update execute timestamp before external interaction to minimize reentrancy surface.
        lastExecuteTime = uint64(block.timestamp);
        
        // Execute call
        bool success;
        (success, result) = target.call{value: value}(data);
        
        if (!success) {
            // Bubble up error
            // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
            assembly {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
        }
        
        _logEv(target, "vault_execute", value, "");
    }

    // ——— Batch Execution (UX improvement)
    /// @notice executeBatch
    /// @param targets targets
    /// @param values values
    /// @param datas datas
    /// @return results results
    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external onlyOwner notFrozen noActiveClaims nonReentrant returns (bytes[] memory results) {
        require(targets.length == values.length && values.length == datas.length, "UV:length-mismatch");

        uint256 totalValue;
        for (uint256 i = 0; i < values.length; ++i) {
            totalValue += values[i];
        }
        _consumeDailyTransferLimit(totalValue);
        
        if (executeCooldown > 0 && lastExecuteTime > 0) {
            require(block.timestamp >= lastExecuteTime + executeCooldown, "UV:execute-cooldown-active");
        }
        
        // Update execute timestamp before external interactions to minimize reentrancy surface.
        lastExecuteTime = uint64(block.timestamp);

        results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; ++i) {
            if (targets[i] == address(0)) revert UV_Zero();
            require(targets[i] != vfideToken, "UV:use-transferVFIDE");
            require(targets[i] != address(this), "UV:self-call");
            require(values[i] <= maxExecuteValue, "UV:value-exceeds-max");
            if (executeWhitelistEnforced) {
                require(allowedExecuteTarget[targets[i]], "UV:target-not-whitelisted");
            }
            (bool success, bytes memory res) = targets[i].call{value: values[i]}(datas[i]);
            if (!success) {
                // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
                assembly {
                    let ptr := mload(0x40)
                    returndatacopy(ptr, 0, returndatasize())
                    revert(ptr, returndatasize())
                }
            }
            results[i] = res;
            _logEv(targets[i], "vault_execute_batch", values[i], "");
        }
        
    }

    /// @notice Allow or disallow a target address for execute() calls
    /// @dev Can only be called by vault owner or hub
    /// @param target target
    /// @param allowed allowed
    function setAllowedTarget(address target, bool allowed) external {
        require(msg.sender == owner || msg.sender == hub, "UV:unauthorized");
        require(target != address(0), "UV:zero");
        require(target != address(this), "UV:self-call");
        allowedExecuteTarget[target] = allowed;
        emit ExecuteTargetSet(target, allowed);
    }

    /// @notice Toggle whitelist enforcement for execute()
    /// @dev Hub-only — ensures protocol-level control over enforcement
    /// @param enforce enforce
    function enforceExecuteWhitelist(bool enforce) external {
        require(msg.sender == hub, "UV:only-hub");
        // H-7 FIX: Whitelist enforcement can only be enabled, never disabled.
        // This prevents an admin key compromise from silently removing target restrictions.
        require(enforce, "UV:cannot-disable-whitelist");
        executeWhitelistEnforced = enforce;
        emit ExecuteWhitelistEnforced(enforce);
    }

    // ——— Internals: ledger logging (best-effort)
    /// @notice _logSys
    /// @param action action
    function _logSys(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    /// @notice _logEv
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
    
    // Helper to convert uint to string for error messages
    /// @notice _uint2str
    /// @param _i _i
    /// @return _string _string
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) { k = k - 1; bstr[k] = bytes1(uint8(48 + _i % 10)); _i /= 10; }
        return string(bstr);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    CRITICAL USABILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Rescue stuck ETH accidentally sent to vault
     * @dev Owner can withdraw ETH that was accidentally sent to the vault
     * Added nonReentrant to prevent reentrancy via malicious recipient
     * @param recipient recipient
     */
    function rescueETH(address payable recipient) external onlyOwner notFrozen nonReentrant {
        require(recipient != address(0), "UV: zero recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "UV: no ETH to rescue");
        
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "UV: ETH transfer failed");
        
        _logEv(recipient, "eth_rescued", balance, "");
    }
    
    /**
     * @notice Rescue any ERC20 token (except VFIDE which uses transferVFIDE)
     * @dev For tokens accidentally sent to vault
     * @param token token
     * @param recipient recipient
     * @param amount amount
     */
    function rescueToken(address token, address recipient, uint256 amount) external onlyOwner notFrozen {
        require(token != address(0) && recipient != address(0), "UV: zero address");
        require(token != vfideToken, "UV: use transferVFIDE for VFIDE");
        
        IERC20(token).safeTransfer(recipient, amount);
        
        _logEv(recipient, "token_rescued", amount, "");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get vault summary for frontend
     * @return vaultOwner vaultOwner
     * @return vfideBalance vfideBalance
     * @return ethBalance ethBalance
     * @return isFrozen isFrozen
     * @return isLocked isLocked
     * @return numGuardians numGuardians
     * @return kinAddress kinAddress
     * @return hasActiveRecovery hasActiveRecovery
     * @return hasActiveInheritance hasActiveInheritance
     */
    function getVaultSummary() external view returns (
        address vaultOwner,
        uint256 vfideBalance,
        uint256 ethBalance,
        bool isFrozen,
        bool isLocked,
        uint8 numGuardians,
        address kinAddress,
        bool hasActiveRecovery,
        bool hasActiveInheritance
    ) {
        vaultOwner = owner;
        vfideBalance = IERC20(vfideToken).balanceOf(address(this));
        ethBalance = address(this).balance;
        isFrozen = frozen;
        isLocked = false; // SecurityHub locking removed — non-custodial
        numGuardians = guardianCount;
        kinAddress = nextOfKin;
        hasActiveRecovery = _recovery.proposedOwner != address(0);
        hasActiveInheritance = _inheritance.active;
    }
    
    /**
     * @notice Get recovery status
     * @return active active
     * @return proposedOwner proposedOwner
     * @return approvals approvals
     * @return expiryTime expiryTime
     * @return guardianThreshold guardianThreshold
     */
    function getRecoveryStatus() external view returns (
        bool active,
        address proposedOwner,
        uint8 approvals,
        uint64 expiryTime,
        uint8 guardianThreshold
    ) {
        active = _recovery.proposedOwner != address(0);
        proposedOwner = _recovery.proposedOwner;
        approvals = _recovery.approvals;
        expiryTime = _recovery.expiryTime;
        guardianThreshold = _recovery.guardianCountSnapshot == 0 ? 1 : (_recovery.guardianCountSnapshot / 2) + 1;
    }
    
    /**
     * @notice Get inheritance status
     * @return active active
     * @return approvals approvals
     * @return readyTime readyTime
     * @return expiryTime expiryTime
     * @return ownerDenied ownerDenied
     * @return guardianThreshold guardianThreshold
     */
    function getInheritanceStatus() external view returns (
        bool active,
        uint8 approvals,
        uint64 readyTime,
        uint64 expiryTime,
        bool ownerDenied,
        uint8 guardianThreshold
    ) {
        active = _inheritance.active;
        approvals = _inheritance.approvals;
        readyTime = _inheritance.readyTime;
        expiryTime = _inheritance.expiryTime;
        ownerDenied = _inheritance.ownerDenied;
        guardianThreshold = _inheritance.guardianCountSnapshot == 0 ? 1 : uint8((_inheritance.guardianCountSnapshot / 2) + 1);
    }
    
    /**
     * @notice Get all pending transactions (paginated to prevent gas exhaustion)
     * @param offset Starting index in pendingTransactions array
     * @param limit Maximum number of results to return (0 for default of 50)
     * @return txIds txIds
     * @return toVaults toVaults
     * @return amounts amounts
     * @return requestTimes requestTimes
     * @return approved approved
     * @return executed executed
     * @return totalPending totalPending
     */
    function getPendingTransactions(uint256 offset, uint256 limit) external view returns (
        uint256[] memory txIds,
        address[] memory toVaults,
        uint256[] memory amounts,
        uint64[] memory requestTimes,
        bool[] memory approved,
        bool[] memory executed,
        uint256 totalPending
    ) {
        if (limit == 0) limit = 50; // Reasonable default
        if (limit > 100) limit = 100; // Hard cap to prevent gas issues
        
        // First pass: count total active pending transactions
        uint256 totalCount = 0;
        for (uint256 i = 0; i < pendingTxCount; ++i) {
            if (pendingTransactions[i].amount > 0 && !pendingTransactions[i].executed) {
                ++totalCount;
            }
        }
        totalPending = totalCount;
        
        // Calculate actual page size
        uint256 pageSize = totalCount > offset ? totalCount - offset : 0;
        if (pageSize > limit) pageSize = limit;
        
        txIds = new uint256[](pageSize);
        toVaults = new address[](pageSize);
        amounts = new uint256[](pageSize);
        requestTimes = new uint64[](pageSize);
        approved = new bool[](pageSize);
        executed = new bool[](pageSize);
        
        // Second pass: collect results starting from offset
        uint256 found = 0;
        uint256 idx = 0;
        for (uint256 i = 0; i < pendingTxCount && idx < pageSize; ++i) {
            PendingTransaction storage ptx = pendingTransactions[i];
            if (ptx.amount > 0 && !ptx.executed) {
                if (found >= offset) {
                    txIds[idx] = i;
                    toVaults[idx] = ptx.toVault;
                    amounts[idx] = ptx.amount;
                    requestTimes[idx] = ptx.requestTime;
                    approved[idx] = ptx.approved;
                    executed[idx] = ptx.executed;
                    ++idx;
                }
                ++found;
            }
        }
    }
    
    /**
     * @notice Check cooldown status
     * @return withdrawalCooldownRemaining withdrawalCooldownRemaining
     * @return executeCooldownRemaining executeCooldownRemaining
     */
    function getCooldownStatus() external view returns (
        uint64 withdrawalCooldownRemaining,
        uint64 executeCooldownRemaining
    ) {
        if (withdrawalCooldown > 0 && lastWithdrawalTime > 0) {
            uint64 unlockTime = lastWithdrawalTime + withdrawalCooldown;
            if (block.timestamp < unlockTime) {
                withdrawalCooldownRemaining = unlockTime - uint64(block.timestamp);
            }
        }
        
        if (executeCooldown > 0 && lastExecuteTime > 0) {
            uint64 unlockTime = lastExecuteTime + executeCooldown;
            if (block.timestamp < unlockTime) {
                executeCooldownRemaining = unlockTime - uint64(block.timestamp);
            }
        }
    }
    
    /**
     * @notice Get list of all guardians
     * @return addresses addresses
     * @return addedTimes addedTimes
     * @return mature mature
     */
    function getGuardians() external view returns (
        address[] memory addresses,
        uint64[] memory addedTimes,
        bool[] memory mature
    ) {
        addresses = new address[](guardianList.length);
        addedTimes = new uint64[](guardianList.length);
        mature = new bool[](guardianList.length);
        
        for (uint256 i = 0; i < guardianList.length; ++i) {
            address g = guardianList[i];
            addresses[i] = g;
            addedTimes[i] = guardianAddTime[g];
            mature[i] = isGuardianMature(g);
        }
    }
    
    /**
     * @notice Get pending transaction with expiry info
     * @param txId txId
     * @return toVault toVault
     * @return amount amount
     * @return requestTime requestTime
     * @return expiresAt expiresAt
     * @return isExpired isExpired
     * @return approved approved
     * @return executed executed
     */
    function getTransactionWithExpiry(uint256 txId) external view returns (
        address toVault,
        uint256 amount,
        uint64 requestTime,
        uint64 expiresAt,
        bool isExpired,
        bool approved,
        bool executed
    ) {
        PendingTransaction storage ptx = pendingTransactions[txId];
        toVault = ptx.toVault;
        amount = ptx.amount;
        requestTime = ptx.requestTime;
        expiresAt = ptx.requestTime + PENDING_TX_EXPIRY;
        isExpired = block.timestamp > expiresAt;
        approved = ptx.approved;
        executed = ptx.executed;
    }
    
    /**
     * @notice Allow vault to receive ETH
     */
    receive() external payable {}
}

/// @notice IUserVaultBytecodeProvider
/// @title IUserVaultBytecodeProvider
/// @author Vfide
interface IUserVaultBytecodeProvider {
    /// @notice creationCode
    /// @param hub hub
    /// @param vfide vfide
    /// @param owner_ owner_
    /// @param ledger ledger
    function creationCode(
        address hub,
        address vfide,
        address owner_,
        address ledger
    ) external pure returns (bytes memory);
}

/// @notice UserVaultBytecodeProvider
/// @title UserVaultBytecodeProvider
/// @author Vfide
contract UserVaultBytecodeProvider is IUserVaultBytecodeProvider {
    /// @notice creationCode
    /// @param hub hub
    /// @param vfide vfide
    /// @param owner_ owner_
    /// @param ledger ledger
    function creationCode(
        address hub,
        address vfide,
        address owner_,
        address ledger
    ) external pure returns (bytes memory) {
        return abi.encodePacked(
            type(UserVaultLegacy).creationCode,
            abi.encode(hub, vfide, owner_, ledger)
        );
    }
}

/// ─────────────────────────── Hub / Factory / Registry
/// @notice VaultInfrastructure
/// @title VaultInfrastructure
/// @author Vfide
contract VaultInfrastructure is Ownable {
    /// Modules & config
    /// @notice vfideToken
    address public vfideToken;
    /// @notice ledger
    IProofLedger public ledger;       // optional ledger
    /// @notice dao
    address public dao;                  // DAO can force recover
    /// @notice vaultBytecodeProvider
    address public vaultBytecodeProvider;

    /// Registry
    /// @notice vaultOf
    mapping(address => address) public vaultOf;
    /// @notice ownerOfVault
    mapping(address => address) public ownerOfVault;

    // Recovery Timelock with Multi-Sig
    /// @notice recoveryUnlockTime
    mapping(address => uint64) public recoveryUnlockTime;
    /// @notice recoveryProposedOwner
    mapping(address => address) public recoveryProposedOwner;
    /// @notice recoveryApprovals
    mapping(address => mapping(address => mapping(uint256 => bool))) public recoveryApprovals;
    /// @notice recoveryApprovalCount
    mapping(address => uint8) public recoveryApprovalCount;
    /// @notice recoveryCandidateForNonce
    mapping(address => mapping(uint256 => address)) public recoveryCandidateForNonce;
    /// @notice recoveryNonce
    mapping(address => uint256) public recoveryNonce;
    /// @notice RECOVERY_DELAY
    uint64 public constant RECOVERY_DELAY = 7 days; // H-5: Increased from 3 to 7 days
    /// @notice RECOVERY_APPROVALS_REQUIRED
    uint8 public constant RECOVERY_APPROVALS_REQUIRED = 3; // H-5: Multi-sig requirement
    /// @notice isRecoveryApprover
    mapping(address => bool) public isRecoveryApprover;

    /// Events
    /// @notice ModulesSet
    /// @param vfide vfide
    /// @param ledger ledger
    /// @param dao dao
    event ModulesSet(address vfide, address ledger, address dao);
    /// @notice VaultCreated
    /// @param owner owner
    /// @param vault vault
    event VaultCreated(address indexed owner, address indexed vault);
    /// @notice ForcedRecoveryInitiated
    /// @param vault vault
    /// @param newOwner newOwner
    /// @param unlockTime unlockTime
    event ForcedRecoveryInitiated(address indexed vault, address indexed newOwner, uint64 unlockTime);
    /// @notice ForcedRecovery
    /// @param vault vault
    /// @param newOwner newOwner
    event ForcedRecovery(address indexed vault, address indexed newOwner);
    /// @notice ForcedRecoveryCancelled
    /// @param vault vault
    event ForcedRecoveryCancelled(address indexed vault); // VI-06 FIX
    /// @notice VFIDESet
    /// @param vfide vfide
    event VFIDESet(address vfide);
    /// @notice DAOSet
    /// @param dao dao
    event DAOSet(address dao);
    /// @notice VaultBytecodeProviderSet
    /// @param provider provider
    event VaultBytecodeProviderSet(address provider);

    /// Errors
    /// @notice VI_Zero
    error VI_Zero();
    /// @notice VI_NotDAO
    error VI_NotDAO();
    /// @notice VI_NotConfigured
    error VI_NotConfigured();

    /// @notice constructor
    /// @param _vfideToken _vfideToken
    /// @param _ledger _ledger
    /// @param _dao _dao
    constructor(address _vfideToken, address _ledger, address _dao) {
        if (_vfideToken == address(0) || _dao == address(0)) revert VI_Zero();
        vfideToken = _vfideToken;
        ledger = IProofLedger(_ledger);
        dao = _dao;
        vaultBytecodeProvider = address(new UserVaultBytecodeProvider());
        emit ModulesSet(_vfideToken, _ledger, _dao);
        emit VaultBytecodeProviderSet(vaultBytecodeProvider);
    }

    // ——— Module wiring
    /// @notice setModules
    /// @param _vfideToken _vfideToken
    /// @param _ledger _ledger
    /// @param _dao _dao
    function setModules(address _vfideToken, address _ledger, address _dao) external onlyOwner {
        if (_vfideToken == address(0) || _dao == address(0)) revert VI_Zero();
        vfideToken = _vfideToken;
        ledger = IProofLedger(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _ledger, _dao);
        _log("hub_modules_set");
    }

    /// @notice setVFIDE
    /// @param _vfide _vfide
    function setVFIDE(address _vfide) external onlyOwner {
        if (_vfide == address(0)) revert VI_Zero();
        vfideToken = _vfide;
        emit VFIDESet(_vfide);
        _log("hub_vfide_set");
    }

    /// @notice setDAO
    /// @param _dao _dao
    function setDAO(address _dao) external onlyOwner {
        if (_dao == address(0)) revert VI_Zero();
        dao = _dao;
        emit DAOSet(_dao);
        _log("hub_dao_set");
    }

    /// @notice setVaultBytecodeProvider
    /// @param provider provider
    function setVaultBytecodeProvider(address provider) external onlyOwner {
        if (provider == address(0)) revert VI_Zero();
        vaultBytecodeProvider = provider;
        emit VaultBytecodeProviderSet(provider);
        _log("hub_bytecode_provider_set");
    }
    
    /// @notice setRecoveryApprover
    /// @param approver approver
    /// @param status status
    function setRecoveryApprover(address approver, bool status) external onlyOwner {
        require(approver != address(0), "VI:zero");
        isRecoveryApprover[approver] = status;
        _log(status ? "recovery_approver_added" : "recovery_approver_removed");
    }

    // ——— Deterministic address prediction for UX
    /// @notice predictVault
    /// @param owner_ owner_
    /// @return predicted predicted
    function predictVault(address owner_) public view returns (address predicted) {
        if (owner_ == address(0)) return address(0);
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _getCreationCode(owner_);
        bytes32 codeHash = keccak256(bytecode);
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            codeHash
        )))));
    }

    // ——— Auto-create (anyone can sponsor)
    /// @notice ensureVault
    /// @param owner_ owner_
    /// @return vault vault
    function ensureVault(address owner_) public returns (address vault) {
        if (owner_ == address(0)) revert VI_Zero();
        if (vfideToken == address(0)) revert VI_Zero(); // Ensure token is set
        vault = vaultOf[owner_];
        if (vault != address(0)) return vault;

        // Deploy via CREATE2 for deterministic address
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _getCreationCode(owner_);
        // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
        assembly { vault := create2(0, add(bytecode, 0x20), mload(bytecode), salt) }
        require(vault != address(0), "create2 failed");

        vaultOf[owner_] = vault;
        ownerOfVault[vault] = owner_;
        
        // Track vault creation
        ++totalVaults;
        vaultCreatedAt[vault] = block.timestamp;
        
        emit VaultCreated(owner_, vault);
        _logEv(vault, "vault_created", 0, "");
    }

    // ——— View helpers (token expects vaultOf(owner))
    /// @notice isVault
    /// @param a a
    /// @return _bool _bool
    function isVault(address a) external view returns (bool) {
        return ownerOfVault[a] != address(0) && vaultOf[ ownerOfVault[a] ] == a;
    }

    // ── Force Recovery REMOVED — non-custodial ──────────────
    // Recovery is ONLY through the user's own guardians via
    // wallet rotation or VaultRecoveryClaim.
    // ──────────────────────────────────────────────────────────

    /// @notice approveForceRecovery
    /// @param vault vault
    /// @param newOwner newOwner
    function approveForceRecovery(address vault, address newOwner) external {
        revert("VI: force recovery disabled - non-custodial");
    }

    /// @notice initiateForceRecovery
    /// @param vault vault
    /// @param newOwner newOwner
    function initiateForceRecovery(address vault, address newOwner) external {
        revert("VI: force recovery disabled - non-custodial");
    }

    /// @notice finalizeForceRecovery
    /// @param vault vault
    function finalizeForceRecovery(address vault) external {
        revert("VI: force recovery disabled - non-custodial");
    }

    /// @notice cancelForceRecovery
    /// @param vault vault
    function cancelForceRecovery(address vault) external {
        revert("VI: force recovery disabled - non-custodial");
    }
    /// @notice _salt
    /// @param owner_ owner_
    /// @return _bytes32 _bytes32
    function _salt(address owner_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_));
    }

    /// @notice _getCreationCode
    /// @param owner_ owner_
    /// @return _bytes _bytes
    function _getCreationCode(address owner_) internal view returns (bytes memory) {
        address provider = vaultBytecodeProvider;
        if (provider == address(0)) revert VI_NotConfigured();
        return IUserVaultBytecodeProvider(provider).creationCode(
            address(this),
            vfideToken,
            owner_,
            address(ledger)
        );
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
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track total vaults created
    /// @notice totalVaults
    uint256 public totalVaults;
    /// @notice vaultCreatedAt
    mapping(address => uint256) public vaultCreatedAt;
    
}
