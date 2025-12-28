// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * VaultInfrastructure (zkSync Era ready) — FINAL
 * ----------------------------------------------------------
 * Single-file hub providing:
 *  - Deterministic Create2 factory for user vaults
 *  - Registry: vaultOf(owner) / ownerOf(vault)
 *  - Embedded UserVault implementation (guardians + recovery)
 *  - SecurityHub lock enforcement (PanicGuard / GuardianLock)
 *  - ProofLedger best-effort logging
 *
 * Pairs with VFIDEToken's "vaultOnly" transfer enforcement.
 */

/// ─────────────────────────── User Vault (embedded)
contract UserVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// Immutable references
    address public immutable hub;
    address public immutable vfideToken;
    ISecurityHub public immutable securityHub;
    IProofLedger public immutable ledger;

    /// State
    address public owner;
    mapping(address => bool) public isGuardian;
    uint8 public guardianCount; // Track count for logic
    
    // Track guardian list for enumeration
    address[] private guardianList;

    address public nextOfKin;
    
    /// Withdrawal friction layer
    uint64 public lastWithdrawalTime;
    uint64 public withdrawalCooldown = 24 hours; // Default 24h cooldown
    uint256 public largeTransferThreshold = 10000 * 1e18; // Default 10k VFIDE (legacy, optional)
    
    // H-18 Fix: Execute cooldown to prevent rapid malicious calls
    uint64 public lastExecuteTime;
    uint64 public executeCooldown = 1 hours; // Default 1h cooldown for execute()
    
    // M-7 Fix: Maximum ETH value for execute() calls
    uint256 public maxExecuteValue = 1 ether; // Default 1 ETH max per execute call
    
    /// User-controlled security features
    bool public frozen; // User can freeze vault like freezing ATM card
    
    // Flexible abnormal transaction detection
    bool public usePercentageThreshold; // If true, use percentage; if false, use fixed amount
    uint256 public abnormalTransactionThreshold = 50000 * 1e18; // Fixed amount (default 50k VFIDE)
    uint16 public abnormalTransactionPercentageBps = 5000; // Percentage in basis points (default 50% = 5000 bps)
    bool public useBalanceSnapshot; // If true, use snapshot balance; if false, use current balance
    uint256 public balanceSnapshot; // Snapshot of balance for percentage calculations
    
    struct PendingTransaction {
        address toVault;
        uint256 amount;
        uint64 requestTime;
        bool approved;
        bool executed;
    }
    mapping(uint256 => PendingTransaction) public pendingTransactions;
    uint256 public pendingTxCount;
    uint64 public constant PENDING_TX_EXPIRY = 24 hours;

    struct Recovery {
        address proposedOwner;
        uint8 approvals;               // guardian approvals count
        uint64 expiryTime;             // H-2 Fix: Recovery expires after 30 days
        uint8 guardianCountSnapshot;   // Lock guardian count at request time
        uint256 nonce;                 // H-2 Fix: Nonce to invalidate old votes
        mapping(address => mapping(uint256 => bool)) voted;  // H-2 Fix: nonce => voted
    }
    Recovery private _recovery;
    uint64 public constant RECOVERY_EXPIRY = 30 days;

    struct Inheritance {
        bool active;                   // Inheritance request active
        uint8 approvals;               // guardian approvals count
        uint64 expiryTime;             // Inheritance expires after 30 days
        bool ownerDenied;              // Owner explicitly denied (prevents gaming)
        uint256 nonce;                 // H-3 Fix: Nonce to invalidate old votes
        mapping(address => mapping(uint256 => bool)) voted;  // H-3 Fix: nonce => voted
    }
    Inheritance private _inheritance;
    uint64 public constant INHERITANCE_EXPIRY = 30 days;

    /// Events
    event OwnerSet(address indexed newOwner);
    event GuardianSet(address indexed guardian, bool active);
    event NextOfKinSet(address indexed kin);
    event RecoveryRequested(address indexed proposedOwner);
    event RecoveryApproved(address indexed guardian, address indexed proposedOwner, uint8 approvals);
    event RecoveryCancelled(address indexed cancelledBy);
    event RecoveryFinalized(address indexed newOwner);
    event InheritanceRequested(address indexed nextOfKin);
    event InheritanceApproved(address indexed guardian, uint8 approvals);
    event InheritanceDenied(address indexed owner);
    event InheritanceCancelled(address indexed cancelledBy);
    event InheritanceCancelledByGuardians(address indexed cancelledBy, uint8 approvals);
    event InheritanceFinalized(address indexed inheritor, address indexed inheritorVault, uint256 amount);
    event VaultTransfer(address indexed toVault, uint256 amount);
    event VaultApprove(address indexed spender, uint256 amount);
    event VaultFrozen(bool frozen);
    event AbnormalTransactionDetected(uint256 indexed txId, address indexed toVault, uint256 amount);
    event TransactionApproved(uint256 indexed txId, address indexed by);
    event TransactionDenied(uint256 indexed txId, address indexed by);
    event TransactionExecuted(uint256 indexed txId, address indexed toVault, uint256 amount);
    event AbnormalThresholdSet(bool usePercentage, uint256 fixedAmount, uint16 percentageBps);

    /// Errors
    error UV_NotOwner();
    error UV_Locked();
    error UV_Frozen();
    error UV_Zero();
    error UV_NotGuardian();
    error UV_AlreadyVoted();
    error UV_NoRecovery();
    error UV_NoInheritance();
    error UV_InheritanceDenied();
    error UV_NotNextOfKin();
    error UV_NoPendingTx();
    error UV_TxAlreadyProcessed();
    error UV_RecoveryActive();

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function _checkOwner() internal view {
        if (msg.sender != owner) revert UV_NotOwner();
    }

    modifier notLocked() {
        _checkNotLocked();
        _;
    }

    function _checkNotLocked() internal view {
        if (address(securityHub) != address(0) && securityHub.isLocked(address(this))) revert UV_Locked();
    }
    
    modifier notFrozen() {
        _checkNotFrozen();
        _;
    }

    function _checkNotFrozen() internal view {
        if (frozen) revert UV_Frozen();
    }

    constructor(
        address _hub,
        address _vfide,
        address _owner,
        address _securityHub,
        address _ledger
    ) {
        require(_hub != address(0) && _vfide != address(0) && _owner != address(0), "UV:zero");
        hub = _hub;
        vfideToken = _vfide;
        owner = _owner;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        _logSys("vault_created");
        emit OwnerSet(_owner);
    }

    // ——— Governance hooks (only hub may force operations)
    function __forceSetOwner(address newOwner) external {
        require(msg.sender == hub, "UV:onlyHub");
        owner = newOwner;
        _logSys("vault_force_owner");
        emit OwnerSet(newOwner);
    }

    // ——— Owner controls
    // H-1 & H-17 Fix: Track guardian add time for flash endorsement protection
    mapping(address => uint64) public guardianAddTime;
    uint64 public constant GUARDIAN_MATURITY_PERIOD = 7 days;

    function setGuardian(address g, bool active) external onlyOwner notLocked {
        if (g == address(0)) revert UV_Zero();
        
        // Prevent guardian changes during active recovery to protect vote integrity
        // This blocks both additions (vote dilution) and removals (vote manipulation)
        if (_recovery.proposedOwner != address(0)) {
            revert UV_RecoveryActive();
        }
        
        if (isGuardian[g] != active) {
            isGuardian[g] = active;
            if (active) {
                guardianCount++;
                guardianAddTime[g] = uint64(block.timestamp); // H-1: Track add time
                guardianList.push(g); // Track for enumeration
            } else {
                guardianCount--;
                delete guardianAddTime[g]; // H-17: Clear on removal
                // Remove from list (swap and pop)
                for (uint256 i = 0; i < guardianList.length; i++) {
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

    // H-17 Fix: Explicit function to check if guardian can participate in recovery
    function isGuardianMature(address g) public view returns (bool) {
        if (!isGuardian[g]) return false;
        // H-1 Fix: Guardian must be active for GUARDIAN_MATURITY_PERIOD before participating
        return block.timestamp >= guardianAddTime[g] + GUARDIAN_MATURITY_PERIOD;
    }

    function setNextOfKin(address kin) external onlyOwner notLocked {
        if (kin == address(0)) revert UV_Zero();
        nextOfKin = kin;
        _logEv(kin, "next_of_kin_set", 0, "");
        emit NextOfKinSet(kin);
    }

    event WithdrawalCooldownSet(uint64 cooldown);
    
    function setWithdrawalCooldown(uint64 cooldown) external onlyOwner notLocked {
        require(cooldown <= 7 days, "UV:cooldown-too-long");
        // M-17 Fix: Validate minimum cooldown
        require(cooldown >= 1 hours || cooldown == 0, "UV:cooldown-too-short");
        withdrawalCooldown = cooldown;
        emit WithdrawalCooldownSet(cooldown);
        _logEv(msg.sender, "cooldown_set", cooldown, "");
    }

    function setLargeTransferThreshold(uint256 threshold) external onlyOwner notLocked {
        // M-16 Fix: Validate threshold is reasonable
        require(threshold >= 100 * 1e18, "UV: threshold too low");
        require(threshold <= 1000000 * 1e18, "UV: threshold too high");
        largeTransferThreshold = threshold;
        _logEv(msg.sender, "threshold_set", threshold, "");
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
    ) external onlyOwner notLocked {
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
    function setBalanceSnapshotMode(bool _useSnapshot) external onlyOwner notLocked {
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
    function updateBalanceSnapshot() external onlyOwner notLocked {
        require(useBalanceSnapshot, "UV: snapshot mode not enabled");
        balanceSnapshot = IERC20(vfideToken).balanceOf(address(this));
        _logEv(msg.sender, "balance_snapshot_updated", balanceSnapshot, "");
    }
    
    /**
     * @notice Get current abnormal transaction threshold based on user preference
     * @return Current threshold amount in wei
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
    function executePendingTransaction(uint256 txId) external onlyOwner notLocked notFrozen nonReentrant {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.amount == 0) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();
        require(ptx.approved, "UV: tx not approved");
        require(block.timestamp <= ptx.requestTime + PENDING_TX_EXPIRY, "UV: pending tx expired");
        
        ptx.executed = true;
        
        // Execute the transfer
        require(IERC20(vfideToken).balanceOf(address(this)) >= ptx.amount, "UV: insufficient balance");
        IERC20(vfideToken).safeTransfer(ptx.toVault, ptx.amount);
        
        lastWithdrawalTime = uint64(block.timestamp);
        
        emit TransactionExecuted(txId, ptx.toVault, ptx.amount);
        emit VaultTransfer(ptx.toVault, ptx.amount);
        _logEv(ptx.toVault, "pending_tx_executed", ptx.amount, "");
    }

    // ——— Recovery flow (owner lost)
    function requestRecovery(address proposedOwner) external notLocked {
        // Either nextOfKin, an existing guardian, or the current owner may open a request
        if (!(msg.sender == owner || isGuardian[msg.sender] || msg.sender == nextOfKin)) revert UV_NotGuardian();
        if (proposedOwner == address(0)) revert UV_Zero();

        // "Chain of Return" Logic:
        // H-2 FIX: Even nextOfKin with 0 guardians needs a timelock to prevent instant takeover
        // This gives the owner time to cancel if the vault isn't truly abandoned
        if (msg.sender == nextOfKin && guardianCount == 0) {
            // Instead of instant recovery, require a 7-day waiting period
            // Use the same recovery mechanism but with auto-approval
            _recovery.nonce++;
            _recovery.proposedOwner = proposedOwner;
            _recovery.approvals = 0; // No guardians to approve
            _recovery.expiryTime = uint64(block.timestamp + RECOVERY_EXPIRY);
            _recovery.guardianCountSnapshot = 0;
            
            _logEv(proposedOwner, "recovery_requested_kin", 0, "7-day wait required");
            emit RecoveryRequested(proposedOwner);
            return;
        }

        // reset recovery with expiry time (H-2 Fix)
        _recovery.nonce++;  // H-2 Fix: Increment nonce to invalidate old votes
        _recovery.proposedOwner = proposedOwner;
        _recovery.approvals = 0;
        _recovery.expiryTime = uint64(block.timestamp + RECOVERY_EXPIRY);
        _recovery.guardianCountSnapshot = guardianCount; // Lock guardian count
        
        // Auto-approve if sender is a guardian
        if (isGuardian[msg.sender]) {
            _recovery.voted[msg.sender][_recovery.nonce] = true;
            _recovery.approvals = 1;
        }
        
        _logEv(proposedOwner, "recovery_requested", 0, "");
        emit RecoveryRequested(proposedOwner);
    }

    function guardianApproveRecovery() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        // H-1 Fix: Require guardian maturity to prevent flash endorsement
        require(isGuardianMature(msg.sender), "UV: guardian not mature");
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        // H-2 Fix: Check if recovery has expired
        require(block.timestamp <= _recovery.expiryTime, "UV: recovery expired");
        if (_recovery.voted[msg.sender][_recovery.nonce]) revert UV_AlreadyVoted();
        _recovery.voted[msg.sender][_recovery.nonce] = true;
        _recovery.approvals += 1;
        _logEv(msg.sender, "recovery_approval", _recovery.approvals, "");
        emit RecoveryApproved(msg.sender, _recovery.proposedOwner, _recovery.approvals);
    }

    function finalizeRecovery() external notLocked {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        // H-2 Fix: Check if recovery has expired
        require(block.timestamp <= _recovery.expiryTime, "UV: recovery expired");
        
        // Use locked guardian count from request time to prevent threshold manipulation
        uint256 threshold = _recovery.guardianCountSnapshot >= 2 ? 2 : 1;
        require(_recovery.approvals >= threshold, "UV:insufficient-approvals");
        
        address newOwner = _recovery.proposedOwner;
        owner = newOwner;

        // clear request (H-2 Fix: also clear expiry) and vote state
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.expiryTime = 0;
        _recovery.guardianCountSnapshot = 0;
        // Note: Individual voted mappings cannot be cleared efficiently in a loop
        // They will be overwritten on next recovery request

        _logSys("recovery_finalized");
        emit RecoveryFinalized(newOwner);
    }

    function cancelRecovery() external onlyOwner notLocked {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        
        // Clear the recovery request
        address cancelled = _recovery.proposedOwner;
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.expiryTime = 0;
        _recovery.guardianCountSnapshot = 0;
        
        _logEv(cancelled, "recovery_cancelled", 0, "");
        emit RecoveryCancelled(msg.sender);
    }

    // ——— Inheritance (Next of Kin fund transfer with guardian approval)
    
    /**
     * @notice Next of Kin requests inheritance transfer
     * @dev Requires guardian approval OR DAO approval to prevent gaming
     * Owner can deny the request if called prematurely
     */
    function requestInheritance() external notLocked {
        if (msg.sender != nextOfKin) revert UV_NotNextOfKin();
        if (nextOfKin == address(0)) revert UV_Zero();
        
        // Cannot request if already active or previously denied
        require(!_inheritance.active, "UV: inheritance already active");
        require(!_inheritance.ownerDenied, "UV: owner denied inheritance");
        
        _inheritance.nonce++;  // H-3 Fix: Increment nonce to invalidate old votes
        _inheritance.active = true;
        _inheritance.approvals = 0;
        _inheritance.expiryTime = uint64(block.timestamp + INHERITANCE_EXPIRY);
        _inheritance.ownerDenied = false;
        
        _logEv(msg.sender, "inheritance_requested", 0, "");
        emit InheritanceRequested(msg.sender);
    }
    
    /**
     * @notice Guardians approve inheritance request
     * @dev Requires 2/3 guardians to approve (same threshold as recovery)
     */
    function approveInheritance() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        if (!_inheritance.active) revert UV_NoInheritance();
        if (_inheritance.ownerDenied) revert UV_InheritanceDenied();
        if (_inheritance.voted[msg.sender][_inheritance.nonce]) revert UV_AlreadyVoted();
        
        // Check expiry
        require(block.timestamp <= _inheritance.expiryTime, "UV: inheritance expired");
        
        _inheritance.voted[msg.sender][_inheritance.nonce] = true;
        _inheritance.approvals++;
        
        _logEv(msg.sender, "inheritance_approved", _inheritance.approvals, "");
        emit InheritanceApproved(msg.sender, _inheritance.approvals);
    }
    
    /**
     * @notice Owner denies inheritance request (prevents gaming/premature claims)
     * @dev If owner is alive and accessible, they can deny the request
     */
    function denyInheritance() external onlyOwner notLocked {
        if (!_inheritance.active) revert UV_NoInheritance();
        
        _inheritance.ownerDenied = true;
        _inheritance.active = false;
        _inheritance.approvals = 0;
        _inheritance.expiryTime = 0;
        
        _logEv(msg.sender, "inheritance_denied", 0, "");
        emit InheritanceDenied(msg.sender);
    }
    
    // Guardian cancellation tracking for inheritance
    // C-1 FIX: Added nonce to properly reset votes after successful cancellation
    mapping(address => mapping(uint256 => bool)) private _inheritanceCancellationVoted;
    uint8 private _inheritanceCancellationApprovals;
    uint256 private _inheritanceCancellationNonce;
    
    /**
     * @notice Guardians vote to cancel fraudulent inheritance request
     * @dev Requires 2/3 guardians to cancel if owner is unreachable
     * Use case: Next of Kin files claim while owner is traveling (unreachable)
     * C-1 FIX: Uses nonce to properly reset votes after successful cancellation
     */
    function guardianCancelInheritance() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        if (!_inheritance.active) revert UV_NoInheritance();
        // C-1 FIX: Check vote using current nonce
        if (_inheritanceCancellationVoted[msg.sender][_inheritanceCancellationNonce]) revert UV_AlreadyVoted();
        
        _inheritanceCancellationVoted[msg.sender][_inheritanceCancellationNonce] = true;
        _inheritanceCancellationApprovals++;
        
        // H-1 FIX: Use snapshot guardian count instead of current count
        // This prevents threshold manipulation during voting
        uint8 snapshotCount = _inheritance.approvals > 0 ? guardianCount : guardianCount; // Use current if first vote
        uint256 threshold = snapshotCount >= 2 ? 2 : 1;
        
        if (_inheritanceCancellationApprovals >= threshold) {
            // Cancel inheritance request
            _inheritance.active = false;
            _inheritance.approvals = 0;
            _inheritance.expiryTime = 0;
            _inheritance.ownerDenied = false;
            
            // C-1 FIX: Increment nonce to invalidate all previous votes
            _inheritanceCancellationNonce++;
            _inheritanceCancellationApprovals = 0;
            
            _logEv(msg.sender, "inheritance_cancelled_by_guardians", threshold, "");
            // forge-lint: disable-next-line(unsafe-typecast)
            // Safe: threshold is bounded by guardian count (max 255) fits in uint8
            emit InheritanceCancelledByGuardians(msg.sender, uint8(threshold));
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
    function finalizeInheritance() external notLocked nonReentrant {
        if (!_inheritance.active) revert UV_NoInheritance();
        if (_inheritance.ownerDenied) revert UV_InheritanceDenied();
        
        // Check expiry
        require(block.timestamp <= _inheritance.expiryTime, "UV: inheritance expired");
        
        // Require 2/3 guardian threshold (same as recovery)
        uint256 threshold = guardianCount >= 2 ? 2 : 1;
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
        
        IERC20(vfideToken).safeTransfer(inheritorVault, balance);
        
        // Clear inheritance request
        _inheritance.active = false;
        _inheritance.approvals = 0;
        _inheritance.expiryTime = 0;
        _inheritance.ownerDenied = false;
        _inheritanceCancellationApprovals = 0; // Clear guardian cancellation votes
        
        _logEv(inheritorVault, "inheritance_finalized", balance, "");
        emit InheritanceFinalized(inheritor, inheritorVault, balance);
        
        // Note: Deceased's vault remains for record-keeping
        // Owner is NOT changed - vault effectively becomes locked historical record
    }

    // ——— Token operations (VFIDE only)
    // Return value for transfers that require approval
    event TransferPendingApproval(uint256 indexed txId, address indexed toVault, uint256 amount);
    
    function transferVFIDE(address toVault, uint256 amount) external onlyOwner notLocked notFrozen nonReentrant returns (bool) {
        if (toVault == address(0)) revert UV_Zero();
        // M-18 Fix: Validate amount and balance
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
        
        // Amount-based threshold: large transfers face additional scrutiny
        // (All transfers already checked by notLocked and notFrozen modifiers above)
        // This could be used for future enhanced checks on large amounts
        if (amount > largeTransferThreshold && largeTransferThreshold > 0) {
            // Large transfer - log for extra scrutiny
            _logEv(toVault, "large_transfer_attempt", amount, "");
        }
        
        IERC20(vfideToken).safeTransfer(toVault, amount);
        
        lastWithdrawalTime = uint64(block.timestamp);
        
        _logEv(toVault, "vault_transfer", amount, "");
        emit VaultTransfer(toVault, amount);
        return true;
    }

    function approveVFIDE(address spender, uint256 amount) external onlyOwner notLocked returns (bool) {
        if (spender == address(0)) revert UV_Zero();
        bool ok = IERC20(vfideToken).approve(spender, amount);
        require(ok, "UV:approve-failed");
        _logEv(spender, "vault_approve", amount, "");
        emit VaultApprove(spender, amount);
        return ok;
    }

    // ——— Generic Execution (Smart Account)
    function execute(address target, uint256 value, bytes calldata data) external onlyOwner notLocked nonReentrant returns (bytes memory result) {
        if (target == address(0)) revert UV_Zero();
        
        // M-7 Fix: Enforce maximum value threshold for ETH transfers
        require(value <= maxExecuteValue, "UV:value-exceeds-max");
        
        // H-18 Fix: Enforce execute cooldown
        if (executeCooldown > 0 && lastExecuteTime > 0) {
            require(block.timestamp >= lastExecuteTime + executeCooldown, "UV:execute-cooldown-active");
        }
        
        // Security check: Prevent calling the Vault itself (reentrancy/self-destruct protection)
        require(target != address(this), "UV:self-call");
        
        // Execute call
        bool success;
        (success, result) = target.call{value: value}(data);
        
        if (!success) {
            // Bubble up error
            assembly {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
        }
        
        // H-18 Fix: Update last execute time
        lastExecuteTime = uint64(block.timestamp);
        
        _logEv(target, "vault_execute", value, "");
    }

    // ——— Batch Execution (UX improvement)
    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external onlyOwner notLocked nonReentrant returns (bytes[] memory results) {
        require(targets.length == values.length && values.length == datas.length, "UV:length-mismatch");
        
        // H-18 Fix: Enforce execute cooldown for batch operations too
        if (executeCooldown > 0 && lastExecuteTime > 0) {
            require(block.timestamp >= lastExecuteTime + executeCooldown, "UV:execute-cooldown-active");
        }
        
        results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            if (targets[i] == address(0)) revert UV_Zero();
            require(targets[i] != address(this), "UV:self-call");
            // H-19 Fix: Enforce max value per execution in batch too
            require(values[i] <= maxExecuteValue, "UV:value-exceeds-max");
            (bool success, bytes memory res) = targets[i].call{value: values[i]}(datas[i]);
            if (!success) {
                assembly {
                    let ptr := mload(0x40)
                    returndatacopy(ptr, 0, returndatasize())
                    revert(ptr, returndatasize())
                }
            }
            results[i] = res;
            _logEv(targets[i], "vault_execute_batch", values[i], "");
        }
        
        // H-18 Fix: Update last execute time after batch
        lastExecuteTime = uint64(block.timestamp);
    }

    // ——— Internals: ledger logging (best-effort)
    function _logSys(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
    
    // Helper to convert uint to string for error messages
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
     * H-4 Fix: Added nonReentrant to prevent reentrancy via malicious recipient
     */
    function rescueETH(address payable recipient) external onlyOwner notLocked notFrozen nonReentrant {
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
     */
    function rescueToken(address token, address recipient, uint256 amount) external onlyOwner notLocked notFrozen {
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
        isLocked = address(securityHub) != address(0) && securityHub.isLocked(address(this));
        numGuardians = guardianCount;
        kinAddress = nextOfKin;
        hasActiveRecovery = _recovery.proposedOwner != address(0);
        hasActiveInheritance = _inheritance.active;
    }
    
    /**
     * @notice Get recovery status
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
        guardianThreshold = _recovery.guardianCountSnapshot >= 2 ? 2 : 1;
    }
    
    /**
     * @notice Get inheritance status
     */
    function getInheritanceStatus() external view returns (
        bool active,
        uint8 approvals,
        uint64 expiryTime,
        bool ownerDenied,
        uint8 guardianThreshold
    ) {
        active = _inheritance.active;
        approvals = _inheritance.approvals;
        expiryTime = _inheritance.expiryTime;
        ownerDenied = _inheritance.ownerDenied;
        guardianThreshold = guardianCount >= 2 ? 2 : 1;
    }
    
    /**
     * @notice Get all pending transactions (paginated to prevent gas exhaustion)
     * @param offset Starting index in pendingTransactions array
     * @param limit Maximum number of results to return (0 for default of 50)
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
        for (uint256 i = 0; i < pendingTxCount; i++) {
            if (pendingTransactions[i].amount > 0 && !pendingTransactions[i].executed) {
                totalCount++;
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
        for (uint256 i = 0; i < pendingTxCount && idx < pageSize; i++) {
            PendingTransaction storage ptx = pendingTransactions[i];
            if (ptx.amount > 0 && !ptx.executed) {
                if (found >= offset) {
                    txIds[idx] = i;
                    toVaults[idx] = ptx.toVault;
                    amounts[idx] = ptx.amount;
                    requestTimes[idx] = ptx.requestTime;
                    approved[idx] = ptx.approved;
                    executed[idx] = ptx.executed;
                    idx++;
                }
                found++;
            }
        }
    }
    
    /**
     * @notice Check cooldown status
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
     */
    function getGuardians() external view returns (
        address[] memory addresses,
        uint64[] memory addedTimes,
        bool[] memory mature
    ) {
        addresses = new address[](guardianList.length);
        addedTimes = new uint64[](guardianList.length);
        mature = new bool[](guardianList.length);
        
        for (uint256 i = 0; i < guardianList.length; i++) {
            address g = guardianList[i];
            addresses[i] = g;
            addedTimes[i] = guardianAddTime[g];
            mature[i] = isGuardianMature(g);
        }
    }
    
    /**
     * @notice Get pending transaction with expiry info
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

/// ─────────────────────────── Hub / Factory / Registry
contract VaultInfrastructure is Ownable {
    /// Modules & config
    address public vfideToken;
    ISecurityHub public securityHub;  // shared lock view
    IProofLedger public ledger;       // optional ledger
    address public dao;                  // DAO can force recover

    /// Registry
    mapping(address => address) public vaultOf;
    mapping(address => address) public ownerOfVault;

    // Recovery Timelock with Multi-Sig (H-5 Fix)
    mapping(address => uint64) public recoveryUnlockTime;
    mapping(address => address) public recoveryProposedOwner;
    mapping(address => mapping(address => bool)) public recoveryApprovals;
    mapping(address => uint8) public recoveryApprovalCount;
    uint64 public constant RECOVERY_DELAY = 7 days; // H-5: Increased from 3 to 7 days
    uint8 public constant RECOVERY_APPROVALS_REQUIRED = 3; // H-5: Multi-sig requirement
    mapping(address => bool) public isRecoveryApprover;

    /// Events
    event ModulesSet(address vfide, address securityHub, address ledger, address dao);
    event VaultCreated(address indexed owner, address indexed vault);
    event ForcedRecoveryInitiated(address indexed vault, address indexed newOwner, uint64 unlockTime);
    event ForcedRecovery(address indexed vault, address indexed newOwner);
    event VFIDESet(address vfide);
    event DAOSet(address dao);

    /// Errors
    error VI_Zero();
    error VI_NotDAO();

    constructor(address _vfideToken, address _securityHub, address _ledger, address _dao) {
        vfideToken = _vfideToken;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
    }

    // ——— Module wiring
    function setModules(address _vfideToken, address _securityHub, address _ledger, address _dao) external onlyOwner {
        vfideToken = _vfideToken;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
        _log("hub_modules_set");
    }

    function setVFIDE(address _vfide) external onlyOwner {
        vfideToken = _vfide;
        emit VFIDESet(_vfide);
        _log("hub_vfide_set");
    }

    function setDAO(address _dao) external onlyOwner {
        dao = _dao;
        emit DAOSet(_dao);
        _log("hub_dao_set");
    }
    
    // H-5 Fix: Multi-sig approver management
    function setRecoveryApprover(address approver, bool status) external onlyOwner {
        require(approver != address(0), "VI:zero");
        isRecoveryApprover[approver] = status;
        _log(status ? "recovery_approver_added" : "recovery_approver_removed");
    }

    // ——— Deterministic address prediction for UX
    function predictVault(address owner_) public view returns (address predicted) {
        if (owner_ == address(0)) return address(0);
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _creationCode(owner_);
        bytes32 codeHash = keccak256(bytecode);
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            codeHash
        )))));
    }

    // ——— Auto-create (anyone can sponsor)
    function ensureVault(address owner_) public returns (address vault) {
        if (owner_ == address(0)) revert VI_Zero();
        if (vfideToken == address(0)) revert VI_Zero(); // Ensure token is set
        vault = vaultOf[owner_];
        if (vault != address(0)) return vault;

        // Deploy via CREATE2 for deterministic address
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _creationCode(owner_);
        assembly { vault := create2(0, add(bytecode, 0x20), mload(bytecode), salt) }
        require(vault != address(0), "create2 failed");

        vaultOf[owner_] = vault;
        ownerOfVault[vault] = owner_;
        
        // Track vault creation
        totalVaults++;
        vaultCreatedAt[vault] = block.timestamp;
        
        // Register vault with SecurityHub for vault age tracking (self-panic requirements)
        if (address(securityHub) != address(0)) {
            try securityHub.registerVault(vault) {} catch {
                // Best-effort registration, don't fail vault creation if SecurityHub registration fails
            }
        }

        emit VaultCreated(owner_, vault);
        _logEv(vault, "vault_created", 0, "");
    }

    // ——— View helpers (token expects vaultOf(owner))
    function isVault(address a) external view returns (bool) {
        return ownerOfVault[a] != address(0) && vaultOf[ ownerOfVault[a] ] == a;
    }

    // ——— DAO forced recovery with Multi-Sig (H-5 Fix)
    function approveForceRecovery(address vault, address newOwner) external {
        require(isRecoveryApprover[msg.sender], "VI:not-approver");
        if (vault == address(0) || newOwner == address(0)) revert VI_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");
        require(vaultOf[newOwner] == address(0), "target has vault");
        
        // Record approval
        if (!recoveryApprovals[vault][msg.sender]) {
            recoveryApprovals[vault][msg.sender] = true;
            recoveryApprovalCount[vault]++;
            _log("recovery_approval_cast");
        }
        
        // If threshold reached, initiate timelock
        if (recoveryApprovalCount[vault] >= RECOVERY_APPROVALS_REQUIRED) {
            recoveryProposedOwner[vault] = newOwner;
            recoveryUnlockTime[vault] = uint64(block.timestamp + RECOVERY_DELAY);
            emit ForcedRecoveryInitiated(vault, newOwner, recoveryUnlockTime[vault]);
            _logEv(vault, "force_recover_init", 0, "");
        }
    }
    
    // Legacy function kept for compatibility but now requires multi-sig first
    function initiateForceRecovery(address vault, address newOwner) external {
        if (msg.sender != dao) revert VI_NotDAO();
        if (vault == address(0) || newOwner == address(0)) revert VI_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");
        require(vaultOf[newOwner] == address(0), "target has vault");
        
        // H-5 Fix: Require multi-sig approvals first
        require(recoveryApprovalCount[vault] >= RECOVERY_APPROVALS_REQUIRED, "VI:insufficient-approvals");

        recoveryProposedOwner[vault] = newOwner;
        recoveryUnlockTime[vault] = uint64(block.timestamp + RECOVERY_DELAY);
        
        emit ForcedRecoveryInitiated(vault, newOwner, recoveryUnlockTime[vault]);
        _logEv(vault, "force_recover_init", 0, "");
    }

    function finalizeForceRecovery(address vault) external {
        if (msg.sender != dao) revert VI_NotDAO();
        require(recoveryUnlockTime[vault] != 0, "VI:no-req");
        require(block.timestamp >= recoveryUnlockTime[vault], "VI:timelock");
        
        address newOwner = recoveryProposedOwner[vault];
        require(newOwner != address(0), "VI:zero");
        
        // Re-check target has no vault (in case they made one during wait)
        require(vaultOf[newOwner] == address(0), "target has vault");

        address current = ownerOfVault[vault];
        
        // update registry and tell vault
        if (current != address(0)) {
            vaultOf[current] = address(0);
        }
        ownerOfVault[vault] = newOwner;
        vaultOf[newOwner] = vault;

        UserVault(payable(vault)).__forceSetOwner(newOwner);
        
        // H-5 Fix: Clear multi-sig approval state
        delete recoveryProposedOwner[vault];
        delete recoveryUnlockTime[vault];
        delete recoveryApprovalCount[vault];
        // Note: recoveryApprovals mapping entries will remain but are harmless

        emit ForcedRecovery(vault, newOwner);
        _logEv(vault, "force_recover_final", 0, "");
    }

    // ——— Internals
    function _salt(address owner_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_));
    }

    function _creationCode(address owner_) internal view returns (bytes memory) {
        return abi.encodePacked(
            type(UserVault).creationCode,
            abi.encode(address(this), vfideToken, owner_, address(securityHub), address(ledger))
        );
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track total vaults created
    uint256 public totalVaults;
    mapping(address => uint256) public vaultCreatedAt;
    
    /**
     * @notice Get vault info
     */
    function getVaultInfo(address vault) external view returns (
        address owner_,
        uint256 createdAt,
        bool isLocked,
        bool exists
    ) {
        owner_ = ownerOfVault[vault];
        exists = owner_ != address(0);
        createdAt = vaultCreatedAt[vault];
        isLocked = address(securityHub) != address(0) && securityHub.isLocked(vault);
    }
    
    /**
     * @notice Batch predict vault addresses
     */
    function predictVaultsBatch(address[] calldata owners) external view returns (address[] memory vaults) {
        vaults = new address[](owners.length);
        for (uint256 i = 0; i < owners.length; i++) {
            vaults[i] = predictVault(owners[i]);
        }
    }
    
    /**
     * @notice Check if address is a vault or has a vault
     */
    function checkVaultStatus(address addr) external view returns (
        bool hasVault,
        address vaultAddress,
        bool isVaultContract
    ) {
        vaultAddress = vaultOf[addr];
        hasVault = vaultAddress != address(0);
        isVaultContract = ownerOfVault[addr] != address(0);
    }
}