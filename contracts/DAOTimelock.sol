// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

error TL_NotAdmin();
error TL_AlreadyQueued();
error TL_NotQueued();
error TL_TooEarly();
error TL_AlreadyExecuted(); // TL-02 FIX: distinct error for already-executed ops
error TL_OnlyTimelock();

interface IDAOExecutionTracker {
    function markExecuted(uint256 id) external;
}

/// @dev #454/#455: Interface for notifying DAO of cancellation/expiry
interface IDAOCancellationTracker {
    function expireQueuedProposal(uint256 id) external;
}

contract DAOTimelock is ReentrancyGuard {
    event AdminSet(address admin);
    event DelaySet(uint64 delay);
    event LedgerSet(address ledger);
    event PanicGuardSet(address panicGuard);
    event Queued(bytes32 id, address target, uint256 value, bytes data, uint64 eta);
    event Cancelled(bytes32 id);
    event CancelledBySecondary(bytes32 indexed id);
    event Executed(bytes32 id);
    event GracePeriodExpired(bytes32 id);
    /// @notice TL-02 FIX: Events for secondary executor role
    event SecondaryExecutorSet(address indexed executor);
    event SecondaryExecutorEOAWarning(address indexed executor);
    event ExecutedBySecondary(bytes32 indexed id);

    address public admin;
    /// @notice TL-02 FIX: Secondary executor that can execute txs after an extended grace period.
    ///         This provides a backup execution path if the primary admin is unable to execute.
    address public secondaryExecutor;
    /// @notice TL-02 FIX: Additional delay on top of ETA before secondary executor can act.
    uint64  public constant SECONDARY_EXECUTOR_DELAY = 3 days;
    uint64  public delay = 48 hours;
    uint64  public constant EXPIRY_WINDOW = 7 days; // H-15: Transactions expire 7 days after ETA
    IProofLedger public ledger;      // optional
    IPanicGuard  public panicGuard;  // optional

    struct Op { address target; uint256 value; bytes data; uint64 eta; bool done; }
    mapping(bytes32 => Op) public queue;
    mapping(bytes32 => uint256) public daoProposalForTx;
    uint256 public nonce; // Nonce to ensure unique transaction IDs

    modifier onlyAdmin() {
        _checkAdmin();
        _;
    }

    /// @dev #454/#455 FIX: Allows cancel/cleanupExpired to be called by admin OR by this contract
    ///      itself (i.e. via a governance-queued call routed through execute/executeBySecondary).
    ///      Without this, post-rotation DAO-as-admin cannot cancel timelock ops through its own
    ///      proposal flow because the inner call arrives as msg.sender == address(this).
    modifier onlyAdminOrSelf() {
        if (msg.sender != admin && msg.sender != address(this)) revert TL_NotAdmin();
        _;
    }

    modifier onlyTimelockSelf() {
        if (msg.sender != address(this)) revert TL_OnlyTimelock();
        _;
    }

    function _checkAdmin() internal view {
        if (msg.sender != admin) revert TL_NotAdmin();
    }

    constructor(address _admin){ require(_admin!=address(0),"admin=0"); admin=_admin; emit AdminSet(_admin); }

    // AUDIT: Minimum delay to prevent timelock bypass
    uint64 public constant MIN_DELAY = 12 hours;
    uint64 public constant MAX_DELAY = 30 days;
    
    function setAdmin(address _admin) external onlyTimelockSelf { require(_admin!=address(0),"admin=0"); admin=_admin; emit AdminSet(_admin); _log("tl_admin_set"); }
    /// @notice TL-02 FIX: Set or remove the secondary executor (backup execution role).
    function setSecondaryExecutor(address _executor) external onlyTimelockSelf {
        // F-78 FIX: warn (do not block) if executor is an EOA.
        if (_executor != address(0) && _executor.code.length == 0) {
            emit SecondaryExecutorEOAWarning(_executor);
        }
        secondaryExecutor = _executor;
        emit SecondaryExecutorSet(_executor);
        _log("tl_secondary_executor_set");
    }
    function setDelay(uint64 _delay) external onlyTimelockSelf { 
        // C-1 FIX: Enforce minimum and maximum delay to prevent timelock bypass
        require(_delay >= MIN_DELAY, "TL: delay below minimum");
        require(_delay <= MAX_DELAY, "TL: delay above maximum");
        emergencyDelayReduced = false;
        delay=_delay; 
        emit DelaySet(_delay); 
        _log("tl_delay_set"); 
    }

    /// @notice Emergency delay reduction — admin can reduce delay directly without timelock
    /// @dev Can only REDUCE delay (never increase), bounded by MIN_DELAY, max 50% reduction per call
    uint64 public lastEmergencyReduceTime;
    uint64 public constant ABSOLUTE_MIN_DELAY = 24 hours;
    uint64 public constant EMERGENCY_REDUCTION_RESET = 30 days;
    bool public emergencyDelayReduced;

    function emergencyReduceDelay(uint64 _newDelay) external onlyAdmin {
        if (emergencyDelayReduced && block.timestamp >= lastEmergencyReduceTime + EMERGENCY_REDUCTION_RESET) {
            emergencyDelayReduced = false;
        }
        require(!emergencyDelayReduced, "TL: emergency reduction already used");
        require(_newDelay >= ABSOLUTE_MIN_DELAY, "TL: below absolute minimum");
        require(_newDelay < delay, "TL: must reduce");
        require(_newDelay >= delay / 2, "TL: max 50% reduction per call");
        require(block.timestamp >= lastEmergencyReduceTime + 24 hours, "TL: reduce cooldown");
        lastEmergencyReduceTime = uint64(block.timestamp);
        emergencyDelayReduced = true;
        delay = _newDelay;
        emit DelaySet(_newDelay);
        _log("tl_emergency_delay_reduce");
    }
    function setLedger(address _ledger) external onlyTimelockSelf { ledger=IProofLedger(_ledger); emit LedgerSet(_ledger); _log("tl_ledger_set"); }
    function setPanicGuard(address _pg) external onlyTimelockSelf { panicGuard=IPanicGuard(_pg); emit PanicGuardSet(_pg); _log("tl_panicguard_set"); }

    function queueTx(address target,uint256 value,bytes calldata data) external onlyAdmin returns(bytes32 id){
        id = _queueTracked(target, value, data);
    }

    /// @notice N-C6 FIX: Queue a tx linked to a DAO proposal id so execute() can mark it executed.
    function queueTxFromDAO(address target, uint256 value, bytes calldata data, uint256 daoProposalId)
        external
        onlyAdmin
        returns (bytes32 id)
    {
        require(daoProposalId > 0, "TL: daoProposalId=0");
        id = _queueTracked(target, value, data);
        daoProposalForTx[id] = daoProposalId;
    }

    function cancel(bytes32 id) external onlyAdminOrSelf {
        if(queue[id].eta==0) revert TL_NotQueued();
        // #454 FIX: notify DAO of cancellation so proposal doesn't stay stuck in "queued" state
        _notifyDaoCancelledIfTracked(id);
        delete queue[id];
        delete daoProposalForTx[id];
        _removeFromQueuedIds(id);
        emit Cancelled(id);
        _log("tl_cancelled");
    }

    function cancelBySecondary(bytes32 id) external {
        require(secondaryExecutor != address(0), "TL: secondary executor not set");
        require(msg.sender == secondaryExecutor, "TL: not secondary executor");

        Op storage op = queue[id];
        if (op.eta == 0) revert TL_NotQueued();
        if (op.done) revert TL_AlreadyExecuted();
        require(block.timestamp >= op.eta + SECONDARY_EXECUTOR_DELAY, "TL: secondary delay not elapsed");

        delete queue[id];
        delete daoProposalForTx[id];
        _removeFromQueuedIds(id);
        emit CancelledBySecondary(id);
        _log("tl_cancelled_by_secondary");
    }

    function execute(bytes32 id) external payable nonReentrant returns(bytes memory res){
        // H-23: Only admin (DAO) can execute to prevent front-running
        require(msg.sender == admin, "TL: only admin can execute");
        
        Op storage op=queue[id];
        if(op.eta==0) revert TL_NotQueued();
        if(op.done)   revert TL_AlreadyExecuted();
        
        // H-15: Check transaction hasn't expired
        require(block.timestamp <= op.eta + EXPIRY_WINDOW, "TL: transaction expired");

        if(address(panicGuard)!=address(0) && panicGuard.globalRisk()){
            require(block.timestamp>=op.eta+6 hours,"risk delay");
        } else {
            require(block.timestamp>=op.eta,"too early");
        }

        op.done=true;
        (bool ok, bytes memory r) = op.target.call{value:op.value}(op.data);
        if (!ok) {
            _revertWithReason(r, "TL: execute failed");
        }

        _validateERC20BoolReturn(op.data, r);
        _markDaoExecutedIfTracked(id);

        _removeFromQueuedIds(id);
        delete daoProposalForTx[id];

        emit Executed(id); _log("tl_executed");
        return r;
    }

    /**
     * @notice TL-02 FIX: Secondary executor path — can run a queued tx after `eta + effectiveSecondaryDelay`.
     * @dev This is a backup in case the primary admin is unable to execute. Requires the secondary executor
     *      role, which must be set by governance via setSecondaryExecutor().
     *
     * H-8 FIX: The secondary delay is now proportional: min(SECONDARY_EXECUTOR_DELAY, EXPIRY_WINDOW/2).
     * This ensures the secondary executor always has at least half the expiry window to act,
     * regardless of how short the original ETA window was.
     */
    function executeBySecondary(bytes32 id) external payable nonReentrant returns (bytes memory res) {
        require(secondaryExecutor != address(0), "TL: secondary executor not set");
        require(msg.sender == secondaryExecutor, "TL: not secondary executor");

        Op storage op = queue[id];
        if (op.eta == 0) revert TL_NotQueued();
        if (op.done)     revert TL_AlreadyExecuted();

        // H-8 FIX: Use the smaller of fixed 3-day delay and half the expiry window so that
        // short-ETA urgent operations are still reachable by the secondary executor.
        uint64 effectiveDelay = SECONDARY_EXECUTOR_DELAY < EXPIRY_WINDOW / 2
            ? SECONDARY_EXECUTOR_DELAY
            : uint64(EXPIRY_WINDOW / 2);
        require(block.timestamp >= op.eta + effectiveDelay, "TL: secondary delay not elapsed");
        // Transaction must not have expired
        require(block.timestamp <= op.eta + EXPIRY_WINDOW, "TL: transaction expired");

        op.done = true;
        (bool ok, bytes memory r) = op.target.call{value: op.value}(op.data);
        if (!ok) {
            _revertWithReason(r, "TL: secondary execute failed");
        }

        // Keep parity with primary execution path for ERC20 bool-returning calls.
        _validateERC20BoolReturn(op.data, r);
        _markDaoExecutedIfTracked(id);

        _removeFromQueuedIds(id);
        delete daoProposalForTx[id];

        emit ExecutedBySecondary(id);
        _log("tl_executed_by_secondary");
        return r;
    }

    function _validateERC20BoolReturn(bytes memory callData, bytes memory returnData) internal pure {
        // Only validate bool return for transfer/transferFrom/approve selectors.
        if (returnData.length == 32 && callData.length >= 4) {
            bytes4 selector;
            assembly {
                selector := mload(add(callData, 32))
            }
            if (
                selector == bytes4(0xa9059cbb) || // transfer
                selector == bytes4(0x23b872dd) || // transferFrom
                selector == bytes4(0x095ea7b3)    // approve
            ) {
                bool returnValue = abi.decode(returnData, (bool));
                require(returnValue, "TL: ERC20 call returned false");
            }
        }
    }

    function _markDaoExecutedIfTracked(bytes32 id) internal {
        uint256 daoProposalId = daoProposalForTx[id];
        if (daoProposalId == 0) return;
        IDAOExecutionTracker(admin).markExecuted(daoProposalId);
    }

    /// @dev #454/#455 FIX: When a linked tx is cancelled/expired, expire the DAO proposal
    ///      so it doesn't stay permanently stuck in "queued" state. Uses DAO.expireQueuedProposal()
    ///      if available; fails silently to not block cancellation.
    function _notifyDaoCancelledIfTracked(bytes32 id) internal {
        uint256 daoProposalId = daoProposalForTx[id];
        if (daoProposalId == 0) return;
        // Try to expire the DAO proposal; ignore failures (DAO may not have this method or proposal
        // may already be expired/executed)
        try IDAOCancellationTracker(admin).expireQueuedProposal(daoProposalId) {} catch {}
    }

    function _revertWithReason(bytes memory returndata, string memory fallbackMessage) internal pure {
        if (returndata.length > 0) {
            assembly {
                revert(add(returndata, 0x20), mload(returndata))
            }
        }

        revert(fallbackMessage);
    }

    function _log(string memory action) internal {
        if(address(ledger)!=address(0)){ try ledger.logSystemEvent(address(this),action,msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get all queued transaction IDs
     * @dev Returns all IDs that are queued but not yet executed or expired
     */
    bytes32[] private queuedIds;

    /**
     * @notice 1-indexed position of each tracked ID in queuedIds (0 = not tracked).
     * @dev    Used for O(1) swap-and-pop removal.
     */
    mapping(bytes32 => uint256) private queuedIdIndex;

    /**
     * @notice Queue transaction with tracking
     * FLOW-5 FIX: Use nonce for unique ID (consistent with queueTx)
     */
    function queueTxWithTracking(address target, uint256 value, bytes calldata data) external onlyAdmin returns(bytes32 id) {
        id = _queueTracked(target, value, data);
    }

    function _queueTracked(address target, uint256 value, bytes calldata data) internal returns (bytes32 id) {
        require(target != address(0), "TL: target=0");
        uint64 eta = uint64(block.timestamp) + delay;
        uint256 currentNonce = nonce++; // FLOW-5 FIX: Use nonce for uniqueness
        id = keccak256(abi.encode(target, value, data, eta, currentNonce));
        if(queue[id].eta != 0) revert TL_AlreadyQueued();
        queue[id] = Op({target: target, value: value, data: data, eta: eta, done: false});
        require(queuedIds.length < 500, "TL: queue full"); // I-11: Cap pending operations
        queuedIds.push(id);
        queuedIdIndex[id] = queuedIds.length; // 1-indexed
        emit Queued(id, target, value, data, eta);
        _log("tl_queued");
    }
    
    /**
     * @notice Get all queued transactions
     */
    function getQueuedTransactions() external view returns (
        bytes32[] memory ids,
        address[] memory targets,
        uint256[] memory values,
        uint64[] memory etas,
        bool[] memory done,
        bool[] memory expired
    ) {
        uint256 len = queuedIds.length;
        ids = new bytes32[](len);
        targets = new address[](len);
        values = new uint256[](len);
        etas = new uint64[](len);
        done = new bool[](len);
        expired = new bool[](len);
        
        for (uint256 i = 0; i < len; i++) {
            bytes32 id = queuedIds[i];
            Op storage op = queue[id];
            ids[i] = id;
            targets[i] = op.target;
            values[i] = op.value;
            etas[i] = op.eta;
            done[i] = op.done;
            expired[i] = op.eta > 0 && block.timestamp > op.eta + EXPIRY_WINDOW;
        }
    }
    
    /**
     * @notice Preview ETA for a new transaction
     */
    function previewETA() external view returns (uint64) {
        return uint64(block.timestamp) + delay;
    }
    
    /**
     * @notice Get transaction status
     */
    function getTransactionStatus(bytes32 id) external view returns (
        bool queued,
        bool executed,
        bool expired,
        bool executable,
        uint64 eta,
        uint256 timeUntilExecutable,
        uint256 timeUntilExpiry
    ) {
        Op storage op = queue[id];
        queued = op.eta > 0;
        executed = op.done;
        
        if (queued && !executed) {
            expired = block.timestamp > op.eta + EXPIRY_WINDOW;
            eta = op.eta;
            
            bool riskDelay = address(panicGuard) != address(0) && panicGuard.globalRisk();
            uint64 executableTime = riskDelay ? op.eta + 6 hours : op.eta;
            
            executable = block.timestamp >= executableTime && !expired;
            timeUntilExecutable = block.timestamp >= executableTime ? 0 : executableTime - block.timestamp;
            timeUntilExpiry = expired ? 0 : (op.eta + EXPIRY_WINDOW) - block.timestamp;
        }
    }
    
    /**
     * @notice Clean up expired transaction (anyone can call to free storage)
     * @param id Transaction ID to clean up
     */
    function cleanupExpired(bytes32 id) external onlyAdminOrSelf { // TL-03 + #455 FIX: also callable by self (DAO proposal flow)
        Op storage op = queue[id];
        require(op.eta > 0, "TL: not queued");
        require(!op.done, "TL: already executed");
        require(block.timestamp > op.eta + EXPIRY_WINDOW, "TL: not expired");
        // #455 FIX: notify DAO so expired-proposal state is cleared
        _notifyDaoCancelledIfTracked(id);
        delete queue[id];
        delete daoProposalForTx[id];
        _removeFromQueuedIds(id);
        emit Cancelled(id);
        _log("tl_cleanup_expired");
    }
    
    /**
     * @notice Re-queue an expired transaction with new ETA
     * @param oldId The expired transaction ID
     * FLOW-4 FIX: Use nonce in new ID to prevent hash collisions
     */
    function requeueExpired(bytes32 oldId) external onlyAdmin returns (bytes32 newId) {
        Op storage op = queue[oldId];
        require(op.eta > 0, "TL: not queued");
        require(!op.done, "TL: already executed");
        require(block.timestamp > op.eta + EXPIRY_WINDOW, "TL: not expired");
        
        // Get old data
        address target = op.target;
        uint256 value = op.value;
        bytes memory data = op.data;
        
        // Delete old and remove from tracking array
        delete queue[oldId];
        _removeFromQueuedIds(oldId);
        
        // Create new with fresh ETA and unique nonce
        uint64 eta = uint64(block.timestamp) + delay;
        uint256 currentNonce = nonce++; // FLOW-4 FIX: Use nonce to ensure unique ID
        newId = keccak256(abi.encode(target, value, data, eta, currentNonce));
        require(queue[newId].eta == 0, "TL: already queued");
        
        queue[newId] = Op({target: target, value: value, data: data, eta: eta, done: false});
        queuedIds.push(newId);
        queuedIdIndex[newId] = queuedIds.length; // 1-indexed
        
        emit Cancelled(oldId);
        emit Queued(newId, target, value, data, eta);
        _log("tl_requeued");
    }

    /**
     * @notice Remove an ID from the queuedIds tracking array in O(1) using swap-and-pop.
     * @dev    Uses queuedIdIndex to locate the element directly.
     *         Safe to call with IDs not in the array (no-op).
     */
    function _removeFromQueuedIds(bytes32 id) internal {
        uint256 idx = queuedIdIndex[id];
        if (idx < 1) return; // not tracked — safe no-op

        uint256 arrayIdx = idx - 1;            // convert 1-indexed → 0-indexed
        uint256 lastIdx  = queuedIds.length - 1;

        if (arrayIdx != lastIdx) {
            // Move the last element into the vacated slot and update its index
            bytes32 lastId = queuedIds[lastIdx];
            queuedIds[arrayIdx] = lastId;
            queuedIdIndex[lastId] = idx;       // keep 1-indexed
        }

        queuedIds.pop();
        delete queuedIdIndex[id];
    }

    /// @notice N-L19 FIX: Dry-run pre-flight check for secondary-executor rotation.
    /// @return ok          True if the handover preconditions are satisfied.
    /// @return reason      Human-readable failure reason (empty string when ok=true).
    /// @dev    Ops runbook: before calling setSecondaryExecutor via governance, run this
    ///         view to confirm the new executor address is non-zero, is a contract (not EOA),
    ///         and the current secondary slot is already filled (preventing accidental clear).
    ///         Governance flow: queue setSecondaryExecutor → wait delay → execute →
    ///         run canRotateSecondaryExecutor() to confirm the new address is live.
    function canRotateSecondaryExecutor(address newExecutor)
        external
        view
        returns (bool ok, string memory reason)
    {
        if (newExecutor == address(0)) {
            return (false, "new executor is zero address");
        }
        if (newExecutor == admin) {
            return (false, "new executor equals admin; rotation would not add redundancy");
        }
        if (newExecutor == secondaryExecutor) {
            return (false, "new executor is already the current secondary executor");
        }
        if (newExecutor.code.length == 0) {
            return (false, "new executor is an EOA; a multisig contract is recommended");
        }
        return (true, "");
    }
}