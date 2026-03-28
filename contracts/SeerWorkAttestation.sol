// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SeerWorkAttestation — The Seer's work verification module
/// @notice Records verified task completions and generates attestation proofs
///         that the WorkPaymentManager requires before releasing any payment.
///         The Seer verifies work through on-chain evidence (tx receipts, state
///         changes, signed confirmations from counterparties) — not self-reports.
///
/// @dev This contract does NOT hold or transfer tokens. It only records
///      proof-of-work and generates the signed attestation that the
///      WorkPaymentManager validates before payment.
///
///      VERIFICATION METHODS PER CATEGORY:
///      - GOVERNANCE_REVIEW:    DAO.vote() was called by worker for proposalId
///      - SECURITY_REPORT:      SeerGuardian confirmed report validity
///      - MERCHANT_PROCESSING:  MerchantPortal.settlePayment() completed
///      - BRIDGE_RELAY:         BridgeSecurityModule confirmed relay
///      - COMMUNITY_MENTORSHIP: Mentee signed endorsement via SeerSocial
///      - FRAUD_FLAGGING:       PanicGuard confirmed flag accuracy
///      - CONTENT_MODERATION:   Moderation queue item resolved
///      - PROTOCOL_MAINTENANCE: On-chain maintenance tx confirmed
contract SeerWorkAttestation is AccessControl, ReentrancyGuard {

    bytes32 public constant SEER_CORE_ROLE = keccak256("SEER_CORE_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ═══════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════

    struct TaskRecord {
        address worker;             // Who performed the work
        uint8 category;             // ServiceCategory enum value
        bytes32 taskId;             // Unique task identifier
        bytes32 evidenceHash;       // Hash of on-chain evidence (tx hash, state proof)
        uint256 completedAt;        // When work was verified as complete
        bool attested;              // Whether attestation was generated
        address verifiedBy;         // Which verifier confirmed the work
    }

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════

    // All verified task records
    mapping(bytes32 => TaskRecord) public tasks;

    // Worker task history
    mapping(address => bytes32[]) public workerTasks;

    // Track unique task IDs to prevent duplicates
    mapping(bytes32 => bool) public taskExists;

    // Connected protocol contracts for automated verification
    address public daoContract;
    address public merchantPortal;
    address public bridgeModule;
    address public seerSocial;
    address public panicGuard;
    address public workPaymentManager;

    // Counters
    uint256 public totalTasksVerified;
    mapping(uint8 => uint256) public categoryTaskCount;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event TaskVerified(
        address indexed worker,
        uint8 indexed category,
        bytes32 indexed taskId,
        bytes32 evidenceHash,
        address verifiedBy
    );
    event TaskAttested(
        address indexed worker,
        bytes32 indexed taskId
    );
    event ProtocolContractUpdated(string name, address newAddress);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error ZeroAddress();
    error TaskAlreadyExists();
    error TaskNotFound();
    error TaskAlreadyAttested();
    error InvalidCategory();
    error InvalidEvidence();

    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    constructor(address _admin) {
        if (_admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SEER_CORE_ROLE, _admin);
    }

    // ═══════════════════════════════════════════════════════════
    // TASK VERIFICATION — Called by Seer when work is verified
    // ═══════════════════════════════════════════════════════════

    /// @notice Record that a worker completed a verified task.
    ///         Called by the Seer after verifying on-chain evidence.
    /// @param worker Address that performed the work
    /// @param category Service category (0-7)
    /// @param taskId Unique task identifier (e.g. proposalId, reportHash)
    /// @param evidenceHash Hash of the on-chain evidence proving work completion
    function verifyTaskCompletion(
        address worker,
        uint8 category,
        bytes32 taskId,
        bytes32 evidenceHash
    ) external onlyRole(VERIFIER_ROLE) {
        if (worker == address(0)) revert ZeroAddress();
        if (category >= 8) revert InvalidCategory();
        if (evidenceHash == bytes32(0)) revert InvalidEvidence();

        // Build unique key from worker + category + taskId
        bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));

        if (taskExists[key]) revert TaskAlreadyExists();

        _recordTask(key, worker, category, taskId, evidenceHash, msg.sender);
    }

    /// @notice Batch verify multiple task completions.
    function batchVerifyTasks(
        address[] calldata workers,
        uint8[] calldata categories,
        bytes32[] calldata taskIds,
        bytes32[] calldata evidenceHashes
    ) external onlyRole(VERIFIER_ROLE) {
        uint256 len = workers.length;
        require(
            len == categories.length && len == taskIds.length && len == evidenceHashes.length,
            "Array length mismatch"
        );
        require(len <= 50, "Batch too large");

        for (uint256 i = 0; i < len;) {
            address worker = workers[i];
            uint8 category = categories[i];
            bytes32 taskId = taskIds[i];
            bytes32 evidenceHash = evidenceHashes[i];
            bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));

            if (!taskExists[key] && worker != address(0) && category < 8 && evidenceHash != bytes32(0)) {
                _recordTask(key, worker, category, taskId, evidenceHash, msg.sender);
            }

            unchecked { i++; }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // AUTOMATED VERIFICATION HOOKS
    // These are called by connected protocol contracts when
    // verifiable work events occur on-chain.
    // ═══════════════════════════════════════════════════════════

    /// @notice Called by DAO when a governance vote is cast.
    function onGovernanceVote(address voter, bytes32 proposalId) external {
        require(msg.sender == daoContract, "Only DAO");
        bytes32 evidence = keccak256(abi.encodePacked("gov_vote", proposalId, voter, block.number));
        _autoVerify(voter, 0, proposalId, evidence);
    }

    /// @notice Called by MerchantPortal on payment settlement.
    function onMerchantSettlement(address processor, bytes32 settlementId) external {
        require(msg.sender == merchantPortal, "Only MerchantPortal");
        bytes32 evidence = keccak256(abi.encodePacked("merchant_settle", settlementId, block.number));
        _autoVerify(processor, 2, settlementId, evidence);
    }

    /// @notice Called by BridgeSecurityModule on relay validation.
    function onBridgeRelayValidated(address validator, bytes32 relayId) external {
        require(msg.sender == bridgeModule, "Only BridgeModule");
        bytes32 evidence = keccak256(abi.encodePacked("bridge_relay", relayId, block.number));
        _autoVerify(validator, 3, relayId, evidence);
    }

    /// @notice Called by SeerSocial when mentorship is endorsed by mentee.
    function onMentorshipCompleted(address mentor, bytes32 sessionId) external {
        require(msg.sender == seerSocial, "Only SeerSocial");
        bytes32 evidence = keccak256(abi.encodePacked("mentorship", sessionId, block.number));
        _autoVerify(mentor, 4, sessionId, evidence);
    }

    /// @notice Called by PanicGuard when a fraud flag is confirmed valid.
    function onFraudFlagConfirmed(address flagger, bytes32 flagId) external {
        require(msg.sender == panicGuard, "Only PanicGuard");
        bytes32 evidence = keccak256(abi.encodePacked("fraud_flag", flagId, block.number));
        _autoVerify(flagger, 5, flagId, evidence);
    }

    /// @dev Internal automated verification — called by protocol hooks.
    function _autoVerify(
        address worker,
        uint8 category,
        bytes32 taskId,
        bytes32 evidenceHash
    ) internal {
        bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));

        if (taskExists[key]) return; // Skip if already verified (idempotent)

        _recordTask(key, worker, category, taskId, evidenceHash, msg.sender);
    }

    function _recordTask(
        bytes32 key,
        address worker,
        uint8 category,
        bytes32 taskId,
        bytes32 evidenceHash,
        address verifier
    ) internal {
        tasks[key] = TaskRecord({
            worker: worker,
            category: category,
            taskId: taskId,
            evidenceHash: evidenceHash,
            completedAt: block.timestamp,
            attested: false,
            verifiedBy: verifier
        });

        taskExists[key] = true;
        workerTasks[worker].push(key);
        totalTasksVerified++;
        categoryTaskCount[category]++;

        emit TaskVerified(worker, category, taskId, evidenceHash, verifier);
    }

    // ═══════════════════════════════════════════════════════════
    // ATTESTATION MARKING
    // ═══════════════════════════════════════════════════════════

    /// @notice Mark a task as attested (payment was claimed or authorized).
    ///         Called by WorkPaymentManager after successful payment.
    function markAttested(bytes32 key) external {
        require(msg.sender == workPaymentManager, "Only WorkPaymentManager");
        if (!taskExists[key]) revert TaskNotFound();
        if (tasks[key].attested) revert TaskAlreadyAttested();
        tasks[key].attested = true;
        emit TaskAttested(tasks[key].worker, tasks[key].taskId);
    }

    // ═══════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════

    function setProtocolContracts(
        address _dao,
        address _merchant,
        address _bridge,
        address _social,
        address _panic,
        address _workPayment
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_dao != address(0)) { daoContract = _dao; emit ProtocolContractUpdated("DAO", _dao); }
        if (_merchant != address(0)) { merchantPortal = _merchant; emit ProtocolContractUpdated("MerchantPortal", _merchant); }
        if (_bridge != address(0)) { bridgeModule = _bridge; emit ProtocolContractUpdated("BridgeModule", _bridge); }
        if (_social != address(0)) { seerSocial = _social; emit ProtocolContractUpdated("SeerSocial", _social); }
        if (_panic != address(0)) { panicGuard = _panic; emit ProtocolContractUpdated("PanicGuard", _panic); }
        if (_workPayment != address(0)) { workPaymentManager = _workPayment; emit ProtocolContractUpdated("WorkPaymentManager", _workPayment); }
    }

    function addVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    function removeVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Get all task keys for a worker.
    function getWorkerTaskKeys(address worker) external view returns (bytes32[] memory) {
        return workerTasks[worker];
    }

    /// @notice Get task details by key.
    function getTask(bytes32 key) external view returns (TaskRecord memory) {
        return tasks[key];
    }

    /// @notice Check if a specific task has been verified.
    function isTaskVerified(
        address worker,
        uint8 category,
        bytes32 taskId
    ) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));
        return taskExists[key];
    }

    /// @notice Get total tasks verified for a specific category.
    function getCategoryCount(uint8 category) external view returns (uint256) {
        return categoryTaskCount[category];
    }
}
