// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title UserVault
 * @notice Non-custodial vault for VFIDE token with guardian recovery and security features
 * @dev Extracted from VaultInfrastructure to reduce contract size
 *      Uses Clones pattern - this is the implementation contract
 */
contract UserVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// Immutable references (set in initialize, not constructor for clone pattern)
    address public hub;
    address public vfideToken;
    ISecurityHub public securityHub;
    IProofLedger public ledger;

    /// State
    address public owner;
    mapping(address => bool) public isGuardian;
    uint8 public guardianCount;

    // Track guardian list for enumeration
    address[] private guardianList;

    address public nextOfKin;

    /// Withdrawal friction layer
    uint64 public lastWithdrawalTime;
    uint64 public withdrawalCooldown;
    uint256 public largeTransferThreshold;

    // H-18 Fix: Execute cooldown to prevent rapid malicious calls
    uint64 public lastExecuteTime;
    uint64 public executeCooldown;

    // M-7 Fix: Maximum ETH value for execute() calls
    uint256 public maxExecuteValue;

    /// User-controlled security features
    bool public frozen;

    // Flexible abnormal transaction detection
    bool public usePercentageThreshold;
    uint256 public abnormalTransactionThreshold;
    uint16 public abnormalTransactionPercentageBps;
    bool public useBalanceSnapshot;
    uint256 public balanceSnapshot;

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
        uint8 approvals;
        uint64 readyTime;
        uint64 expiryTime;
        uint8 guardianCountSnapshot;
        uint256 nonce;
        mapping(address => mapping(uint256 => bool)) voted;
    }
    Recovery private _recovery;
    uint64 public constant RECOVERY_MIN_DELAY = 7 days;
    uint64 public constant RECOVERY_EXPIRY = 30 days;

    struct Inheritance {
        bool active;
        uint8 approvals;
        uint8 cancelApprovals;
        uint64 readyTime;
        uint64 expiryTime;
        uint8 guardianCountSnapshot;
        bool ownerDenied;
        uint256 nonce;
        mapping(address => mapping(uint256 => bool)) voted;
        mapping(address => mapping(uint256 => bool)) cancelVoted;
    }
    Inheritance private _inheritance;
    uint64 public constant INHERITANCE_MIN_DELAY = 7 days;
    uint64 public constant INHERITANCE_EXPIRY = 30 days;

    // H-1 & H-17 Fix: Track guardian add time for flash endorsement protection
    mapping(address => uint64) public guardianAddTime;
    uint64 public constant GUARDIAN_MATURITY_PERIOD = 7 days;

    /// Initialization flag for clone pattern
    bool private initialized;

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
    error UV_InheritanceActive();
    error UV_ClaimInProgress();
    error UV_AlreadyInitialized();

    /**
     * @notice Constructor for CREATE2 deployment via VaultHub
     * @param _hub The VaultHub address
     * @param _vfide The VFIDE token address
     * @param _owner The vault owner
     * @param _securityHub The SecurityHub address
     * @param _ledger The ProofLedger address
     */
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
        
        // Set defaults
        withdrawalCooldown = 24 hours;
        largeTransferThreshold = 10000 * 1e18;
        executeCooldown = 1 hours;
        maxExecuteValue = 1 ether;
        abnormalTransactionThreshold = 50000 * 1e18;
        abnormalTransactionPercentageBps = 5000;
        
        _logSys("vault_created");
        emit OwnerSet(_owner);
    }

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

    modifier noActiveClaims() {
        _checkNoActiveClaims();
        _;
    }

    function _checkNoActiveClaims() internal view {
        if (_recovery.proposedOwner != address(0) || _inheritance.active) revert UV_ClaimInProgress();
    }

    /**
     * @notice Initialize the vault (used instead of constructor for clone pattern)
     * @param _hub The VaultInfrastructure hub address
     * @param _vfide The VFIDE token address
     * @param _owner The vault owner
     * @param _securityHub The SecurityHub address
     * @param _ledger The ProofLedger address
     */
    function initialize(
        address _hub,
        address _vfide,
        address _owner,
        address _securityHub,
        address _ledger
    ) external {
        if (initialized) revert UV_AlreadyInitialized();
        require(_hub != address(0) && _vfide != address(0) && _owner != address(0), "UV:zero");
        
        initialized = true;
        hub = _hub;
        vfideToken = _vfide;
        owner = _owner;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        
        // Set defaults
        withdrawalCooldown = 24 hours;
        largeTransferThreshold = 10000 * 1e18;
        executeCooldown = 1 hours;
        maxExecuteValue = 1 ether;
        abnormalTransactionThreshold = 50000 * 1e18;
        abnormalTransactionPercentageBps = 5000;
        
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
    function setGuardian(address g, bool active) external onlyOwner notLocked {
        if (g == address(0)) revert UV_Zero();

        if (_recovery.proposedOwner != address(0)) {
            revert UV_RecoveryActive();
        }
        if (_inheritance.active) {
            revert UV_InheritanceActive();
        }

        if (isGuardian[g] != active) {
            isGuardian[g] = active;
            if (active) {
                guardianCount++;
                guardianList.push(g);
                guardianAddTime[g] = uint64(block.timestamp);
            } else {
                guardianCount--;
                _removeFromGuardianList(g);
                delete guardianAddTime[g];
            }
            emit GuardianSet(g, active);
            _logSys(active ? "guardian_added" : "guardian_removed");
        }
    }

    function _removeFromGuardianList(address g) internal {
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardianList[i] == g) {
                guardianList[i] = guardianList[guardianList.length - 1];
                guardianList.pop();
                break;
            }
        }
    }

    function isGuardianMature(address g) public view returns (bool) {
        if (!isGuardian[g]) return false;
        uint64 addTime = guardianAddTime[g];
        if (addTime == 0) return true;
        return block.timestamp >= addTime + GUARDIAN_MATURITY_PERIOD;
    }

    function setNextOfKin(address kin) external onlyOwner notLocked {
        nextOfKin = kin;
        emit NextOfKinSet(kin);
        _logSys("nextofkin_set");
    }

    function setFrozen(bool _frozen) external onlyOwner {
        frozen = _frozen;
        emit VaultFrozen(_frozen);
        _logSys(_frozen ? "vault_frozen" : "vault_unfrozen");
    }

    function setWithdrawalCooldown(uint64 _cooldown) external onlyOwner {
        require(_cooldown >= 1 hours && _cooldown <= 7 days, "UV:invalid");
        withdrawalCooldown = _cooldown;
    }

    function setExecuteCooldown(uint64 _cooldown) external onlyOwner {
        require(_cooldown >= 1 hours && _cooldown <= 24 hours, "UV:invalid");
        executeCooldown = _cooldown;
    }

    function setMaxExecuteValue(uint256 _max) external onlyOwner {
        require(_max >= 0.1 ether && _max <= 10 ether, "UV:invalid");
        maxExecuteValue = _max;
    }

    // ——— Transfers
    function transferVFIDE(address toVault, uint256 amount) external onlyOwner notLocked notFrozen noActiveClaims nonReentrant {
        if (toVault == address(0)) revert UV_Zero();
        require(block.timestamp >= lastWithdrawalTime + withdrawalCooldown, "UV:cooldown");

        if (_isAbnormalTransaction(amount)) {
            uint256 txId = pendingTxCount++;
            pendingTransactions[txId] = PendingTransaction({
                toVault: toVault,
                amount: amount,
                requestTime: uint64(block.timestamp),
                approved: false,
                executed: false
            });
            emit AbnormalTransactionDetected(txId, toVault, amount);
            _logSys("abnormal_tx_detected");
            return;
        }

        lastWithdrawalTime = uint64(block.timestamp);
        IERC20(vfideToken).safeTransfer(toVault, amount);
        emit VaultTransfer(toVault, amount);
        _logTx(toVault, amount, "transfer");
    }

    function _isAbnormalTransaction(uint256 amount) internal view returns (bool) {
        if (usePercentageThreshold) {
            uint256 balance = useBalanceSnapshot ? balanceSnapshot : IERC20(vfideToken).balanceOf(address(this));
            if (balance == 0) return false;
            uint256 threshold = (balance * abnormalTransactionPercentageBps) / 10000;
            return amount > threshold;
        } else {
            return amount > abnormalTransactionThreshold;
        }
    }

    function setAbnormalThresholdMode(bool _usePercentage, uint256 _fixedAmount, uint16 _percentageBps) external onlyOwner {
        require(_percentageBps <= 10000, "UV:invalid");
        usePercentageThreshold = _usePercentage;
        abnormalTransactionThreshold = _fixedAmount;
        abnormalTransactionPercentageBps = _percentageBps;
        emit AbnormalThresholdSet(_usePercentage, _fixedAmount, _percentageBps);
    }

    function setBalanceSnapshotMode(bool _useSnapshot) external onlyOwner {
        useBalanceSnapshot = _useSnapshot;
        if (_useSnapshot) {
            balanceSnapshot = IERC20(vfideToken).balanceOf(address(this));
        }
    }

    function updateBalanceSnapshot() external onlyOwner {
        balanceSnapshot = IERC20(vfideToken).balanceOf(address(this));
    }

    function approvePendingTransaction(uint256 txId) external onlyOwner {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.toVault == address(0)) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();
        if (block.timestamp > ptx.requestTime + PENDING_TX_EXPIRY) revert UV_NoPendingTx();

        ptx.approved = true;
        emit TransactionApproved(txId, msg.sender);
    }

    function executePendingTransaction(uint256 txId) external onlyOwner notLocked notFrozen noActiveClaims nonReentrant {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.toVault == address(0)) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();
        if (!ptx.approved) revert UV_NoPendingTx();
        if (block.timestamp > ptx.requestTime + PENDING_TX_EXPIRY) revert UV_NoPendingTx();

        ptx.executed = true;
        lastWithdrawalTime = uint64(block.timestamp);
        IERC20(vfideToken).safeTransfer(ptx.toVault, ptx.amount);
        emit TransactionExecuted(txId, ptx.toVault, ptx.amount);
        _logTx(ptx.toVault, ptx.amount, "pending_tx_executed");
    }

    function denyPendingTransaction(uint256 txId) external onlyOwner {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.toVault == address(0)) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();

        ptx.executed = true;
        emit TransactionDenied(txId, msg.sender);
    }

    function cleanupExpiredTransaction(uint256 txId) external {
        PendingTransaction storage ptx = pendingTransactions[txId];
        if (ptx.toVault == address(0)) revert UV_NoPendingTx();
        if (ptx.executed) revert UV_TxAlreadyProcessed();
        require(block.timestamp > ptx.requestTime + PENDING_TX_EXPIRY, "UV:not-expired");

        ptx.executed = true;
        _logSys("expired_tx_cleaned");
    }

    // ——— Recovery (guardian-initiated)
    function requestRecovery(address proposed) external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        require(isGuardianMature(msg.sender), "UV:immature");
        if (proposed == address(0)) revert UV_Zero();

        _recovery.proposedOwner = proposed;
        _recovery.approvals = 1;
        _recovery.readyTime = uint64(block.timestamp + RECOVERY_MIN_DELAY);
        _recovery.expiryTime = uint64(block.timestamp + RECOVERY_EXPIRY);
        _recovery.guardianCountSnapshot = guardianCount;
        _recovery.nonce++;
        _recovery.voted[msg.sender][_recovery.nonce] = true;

        emit RecoveryRequested(proposed);
        emit RecoveryApproved(msg.sender, proposed, 1);
        _logSys("recovery_requested");
    }

    function approveRecovery() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        require(isGuardianMature(msg.sender), "UV:immature");
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        if (block.timestamp > _recovery.expiryTime) revert UV_NoRecovery();
        if (_recovery.voted[msg.sender][_recovery.nonce]) revert UV_AlreadyVoted();

        _recovery.voted[msg.sender][_recovery.nonce] = true;
        _recovery.approvals++;

        emit RecoveryApproved(msg.sender, _recovery.proposedOwner, _recovery.approvals);
        _logSys("recovery_approved");
    }

    function cancelRecovery() external onlyOwner notLocked {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();

        delete _recovery.proposedOwner;
        delete _recovery.approvals;
        delete _recovery.readyTime;
        delete _recovery.expiryTime;
        _recovery.nonce++;

        emit RecoveryCancelled(msg.sender);
        _logSys("recovery_cancelled");
    }

    function finalizeRecovery() external notLocked {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        require(block.timestamp >= _recovery.readyTime, "UV:timelock");
        if (block.timestamp > _recovery.expiryTime) revert UV_NoRecovery();

        // H-3 Fix: Require minimum 2 guardians for recovery to prevent single guardian takeover
        require(_recovery.guardianCountSnapshot >= 2, "UV:min-2-guardians");
        
        uint8 threshold = (_recovery.guardianCountSnapshot / 2) + 1;
        require(_recovery.approvals >= threshold, "UV:threshold");

        address newOwner = _recovery.proposedOwner;

        delete _recovery.proposedOwner;
        delete _recovery.approvals;
        delete _recovery.readyTime;
        delete _recovery.expiryTime;
        _recovery.nonce++;

        owner = newOwner;
        emit RecoveryFinalized(newOwner);
        emit OwnerSet(newOwner);
        _logSys("recovery_finalized");
    }

    // ——— Inheritance (next-of-kin)
    function requestInheritance() external notLocked {
        if (msg.sender != nextOfKin) revert UV_NotNextOfKin();
        if (_inheritance.ownerDenied) revert UV_InheritanceDenied();

        _inheritance.active = true;
        _inheritance.approvals = 0;
        _inheritance.cancelApprovals = 0;
        _inheritance.readyTime = uint64(block.timestamp + INHERITANCE_MIN_DELAY);
        _inheritance.expiryTime = uint64(block.timestamp + INHERITANCE_EXPIRY);
        _inheritance.guardianCountSnapshot = guardianCount;
        _inheritance.nonce++;

        emit InheritanceRequested(msg.sender);
        _logSys("inheritance_requested");
    }

    function approveInheritance() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        require(isGuardianMature(msg.sender), "UV:immature");
        if (!_inheritance.active) revert UV_NoInheritance();
        if (block.timestamp > _inheritance.expiryTime) revert UV_NoInheritance();
        if (_inheritance.voted[msg.sender][_inheritance.nonce]) revert UV_AlreadyVoted();

        _inheritance.voted[msg.sender][_inheritance.nonce] = true;
        _inheritance.approvals++;

        emit InheritanceApproved(msg.sender, _inheritance.approvals);
        _logSys("inheritance_approved");
    }

    function denyInheritance() external onlyOwner {
        _inheritance.ownerDenied = true;
        _inheritance.active = false;
        _inheritance.cancelApprovals = 0;
        _inheritance.readyTime = 0;
        _inheritance.guardianCountSnapshot = 0;
        emit InheritanceDenied(msg.sender);
        _logSys("inheritance_denied");
    }

    function cancelInheritance() external onlyOwner notLocked {
        if (!_inheritance.active) revert UV_NoInheritance();

        _inheritance.active = false;
        _inheritance.cancelApprovals = 0;
        _inheritance.readyTime = 0;
        _inheritance.guardianCountSnapshot = 0;
        _inheritance.nonce++;

        emit InheritanceCancelled(msg.sender);
        _logSys("inheritance_cancelled");
    }

    function guardianCancelInheritance() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        require(isGuardianMature(msg.sender), "UV:immature");
        if (!_inheritance.active) revert UV_NoInheritance();
        if (_inheritance.cancelVoted[msg.sender][_inheritance.nonce]) revert UV_AlreadyVoted();

        uint8 threshold = (_inheritance.guardianCountSnapshot / 2) + 1;
        _inheritance.cancelVoted[msg.sender][_inheritance.nonce] = true;
        _inheritance.cancelApprovals++;

        if (_inheritance.cancelApprovals >= threshold) {
            uint8 finalCancelApprovals = _inheritance.cancelApprovals;
            _inheritance.active = false;
            _inheritance.cancelApprovals = 0;
            _inheritance.readyTime = 0;
            _inheritance.guardianCountSnapshot = 0;
            _inheritance.nonce++;
            emit InheritanceCancelledByGuardians(msg.sender, finalCancelApprovals);
            _logSys("inheritance_cancelled_by_guardians");
        }
    }

    function finalizeInheritance() external notLocked nonReentrant {
        if (msg.sender != nextOfKin) revert UV_NotNextOfKin();
        if (!_inheritance.active) revert UV_NoInheritance();
        require(block.timestamp >= _inheritance.readyTime, "UV:timelock");
        if (block.timestamp > _inheritance.expiryTime) revert UV_NoInheritance();
        if (_inheritance.ownerDenied) revert UV_InheritanceDenied();

        uint8 threshold = (_inheritance.guardianCountSnapshot / 2) + 1;
        require(_inheritance.approvals >= threshold, "UV:threshold");

        _inheritance.active = false;
        _inheritance.cancelApprovals = 0;
        _inheritance.readyTime = 0;
        _inheritance.guardianCountSnapshot = 0;
        _inheritance.nonce++;

        uint256 balance = IERC20(vfideToken).balanceOf(address(this));
        address inheritorVault = IVaultHub(hub).vaultOf(nextOfKin);
        require(inheritorVault != address(0), "UV:no-vault");

        IERC20(vfideToken).safeTransfer(inheritorVault, balance);

        emit InheritanceFinalized(nextOfKin, inheritorVault, balance);
        _logSys("inheritance_finalized");
    }

    // ——— Execute arbitrary calls (limited)
    function execute(address target, bytes calldata data) external payable onlyOwner notLocked notFrozen noActiveClaims nonReentrant returns (bytes memory) {
        require(target != vfideToken, "UV:no-token");
        require(target != hub, "UV:no-hub");
        require(msg.value <= maxExecuteValue, "UV:value");
        require(block.timestamp >= lastExecuteTime + executeCooldown, "UV:cooldown");

        lastExecuteTime = uint64(block.timestamp);
        (bool success, bytes memory result) = target.call{value: msg.value}(data);
        require(success, "UV:call-failed");

        _logSys("execute");
        return result;
    }

    // ——— View functions
    function getBalance() external view returns (uint256) {
        return IERC20(vfideToken).balanceOf(address(this));
    }

    function getGuardians() external view returns (address[] memory guardians, bool[] memory mature) {
        guardians = guardianList;
        mature = new bool[](guardians.length);
        for (uint256 i = 0; i < guardians.length; i++) {
            mature[i] = isGuardianMature(guardians[i]);
        }
    }

    function getRecoveryStatus() external view returns (
        address proposedOwner,
        uint8 approvals,
        uint8 threshold,
        uint64 expiryTime,
        bool active
    ) {
        proposedOwner = _recovery.proposedOwner;
        approvals = _recovery.approvals;
        threshold = (_recovery.guardianCountSnapshot / 2) + 1;
        expiryTime = _recovery.expiryTime;
        active = proposedOwner != address(0) && block.timestamp <= expiryTime;
    }

    function getInheritanceStatus() external view returns (
        bool active,
        uint8 approvals,
        uint8 threshold,
        uint64 expiryTime,
        bool denied
    ) {
        active = _inheritance.active && block.timestamp <= _inheritance.expiryTime;
        approvals = _inheritance.approvals;
        threshold = (_inheritance.guardianCountSnapshot / 2) + 1;
        expiryTime = _inheritance.expiryTime;
        denied = _inheritance.ownerDenied;
    }

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

    // ——— Logging helpers
    function _logSys(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }

    function _logTx(address /*to*/, uint256 amount, string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(address(this), action, amount, "") {} catch {}
        }
    }

    receive() external payable {}
}
