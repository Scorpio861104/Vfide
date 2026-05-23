// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SUPPLY-CHAIN NOTE: This contract intentionally uses OpenZeppelin imports
 * because it relies on AccessControl role semantics for verifier workflows.
 * OZ version baseline: 5.1.0. Review OZ advisories on dependency updates.
 */

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// F-38 FIX: minimal interface used to cross-check the DAO state before recording attestation.
/// @notice IDAO_WA
/// @title IDAO_WA
/// @author Vfide
interface IDAO_WA {
    /// @notice hasVoted
    /// @param proposalId proposalId
    /// @param voter voter
    /// @return _bool _bool
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
}

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
/// @author Vfide
contract SeerWorkAttestation is AccessControl, ReentrancyGuard {
    /// @notice SEER_CORE_ROLE
    bytes32 public constant SEER_CORE_ROLE = keccak256("SEER_CORE_ROLE");
    /// @notice VERIFIER_ROLE
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    /// @notice MODULE_CHANGE_DELAY
    uint64 public constant MODULE_CHANGE_DELAY = 48 hours;

    // ═══════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════

    struct TaskRecord {
        address worker; // Who performed the work
        uint8 category; // ServiceCategory enum value
        bytes32 taskId; // Unique task identifier
        bytes32 evidenceHash; // Hash of on-chain evidence (tx hash, state proof)
        uint256 completedAt; // When work was verified as complete
        bool attested; // Whether attestation was generated
        address verifiedBy; // Which verifier confirmed the work
    }

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════

    // All verified task records
    /// @notice tasks
    mapping(bytes32 => TaskRecord) public tasks;

    // Worker task history
    /// @notice workerTasks
    mapping(address => bytes32[]) public workerTasks;

    // Track unique task IDs to prevent duplicates
    /// @notice taskExists
    mapping(bytes32 => bool) public taskExists;

    // Connected protocol contracts for automated verification
    /// @notice daoContract
    address public daoContract;
    /// @notice merchantPortal
    address public merchantPortal;
    /// @notice bridgeModule
    address public bridgeModule;
    /// @notice seerSocial
    address public seerSocial;
    /// @notice panicGuard
    address public panicGuard;
    /// @notice workPaymentManager
    address public workPaymentManager;

    struct PendingProtocolContracts {
        address dao;
        address merchant;
        address bridge;
        address social;
        address panic;
        address workPayment;
        uint64 effectiveAt;
    }
    /// @notice pendingProtocolContracts
    PendingProtocolContracts public pendingProtocolContracts;

    // Counters
    /// @notice totalTasksVerified
    uint256 public totalTasksVerified;
    /// @notice categoryTaskCount
    mapping(uint8 => uint256) public categoryTaskCount;

    // F-72 FIX: Fraud-flag attestations are queued first, then finalized by an
    // independent verifier after a review delay.
    /// @notice FRAUD_FLAG_ATTESTATION_DELAY
    uint64 public constant FRAUD_FLAG_ATTESTATION_DELAY = 48 hours;
    struct PendingFraudAttestation {
        address flagger;
        uint64 readyAt;
    }
    /// @notice pendingFraudAttestation
    mapping(bytes32 => PendingFraudAttestation) public pendingFraudAttestation;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    /// @notice TaskVerified
    /// @param worker worker
    /// @param category category
    /// @param taskId taskId
    /// @param evidenceHash evidenceHash
    /// @param verifiedBy verifiedBy
    event TaskVerified(address indexed worker, uint8 indexed category, bytes32 indexed taskId, bytes32 evidenceHash, address verifiedBy);
    /// @notice DuplicateTaskSkipped
    /// @param worker worker
    /// @param category category
    /// @param taskId taskId
    /// @param caller caller
    event DuplicateTaskSkipped(address indexed worker, uint8 indexed category, bytes32 indexed taskId, address caller);
    /// @notice TaskAttested
    /// @param worker worker
    /// @param taskId taskId
    event TaskAttested(address indexed worker, bytes32 indexed taskId);
    /// @notice FraudFlagAttestationQueued
    /// @param flagger flagger
    /// @param flagId flagId
    /// @param readyAt readyAt
    event FraudFlagAttestationQueued(address indexed flagger, bytes32 indexed flagId, uint64 readyAt);
    /// @notice FraudFlagAttestationFinalized
    /// @param flagger flagger
    /// @param flagId flagId
    /// @param verifier verifier
    event FraudFlagAttestationFinalized(address indexed flagger, bytes32 indexed flagId, address indexed verifier);
    /// @notice ProtocolContractUpdated
    /// @param name name
    /// @param newAddress newAddress
    event ProtocolContractUpdated(string name, address newAddress);
    /// @notice ProtocolContractsChangeProposed
    /// @param dao dao
    /// @param merchant merchant
    /// @param bridge bridge
    /// @param social social
    /// @param panic panic
    /// @param workPayment workPayment
    /// @param effectiveAt effectiveAt
    event ProtocolContractsChangeProposed(address dao, address merchant, address bridge, address social, address panic, address workPayment, uint64 effectiveAt);
    /// @notice ProtocolContractsChangeCancelled
    event ProtocolContractsChangeCancelled();

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    /// @notice ZeroAddress
    error ZeroAddress();
    /// @notice TaskAlreadyExists
    error TaskAlreadyExists();
    /// @notice TaskNotFound
    error TaskNotFound();
    /// @notice TaskAlreadyAttested
    error TaskAlreadyAttested();
    /// @notice InvalidCategory
    error InvalidCategory();
    /// @notice InvalidEvidence
    error InvalidEvidence();
    /// @notice PendingChangeExists
    error PendingChangeExists();
    /// @notice NoPendingChange
    error NoPendingChange();
    /// @notice ChangeNotReady
    error ChangeNotReady();

    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    /// @notice constructor
    /// @param _admin _admin
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
    function verifyTaskCompletion(address worker, uint8 category, bytes32 taskId, bytes32 evidenceHash) external onlyRole(VERIFIER_ROLE) {
        if (worker == address(0)) revert ZeroAddress();
        if (category >= 8) revert InvalidCategory();
        if (evidenceHash == bytes32(0)) revert InvalidEvidence();

        // Build unique key from worker + category + taskId
        bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));

        if (taskExists[key]) revert TaskAlreadyExists();

        _recordTask(key, worker, category, taskId, evidenceHash, msg.sender);
    }

    /// @notice Batch verify multiple task completions.
    /// @param workers workers
    /// @param categories categories
    /// @param taskIds taskIds
    /// @param evidenceHashes evidenceHashes
    function batchVerifyTasks(address[] calldata workers, uint8[] calldata categories, bytes32[] calldata taskIds, bytes32[] calldata evidenceHashes) external onlyRole(VERIFIER_ROLE) {
        uint256 len = workers.length;
        require(len == categories.length && len == taskIds.length && len == evidenceHashes.length, "Array length mismatch");
        require(len <= 50, "Batch too large");

        for (uint256 i = 0; i < len; ) {
            address worker = workers[i];
            uint8 category = categories[i];
            bytes32 taskId = taskIds[i];
            bytes32 evidenceHash = evidenceHashes[i];
            bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));

            if (!taskExists[key] && worker != address(0) && category < 8 && evidenceHash != bytes32(0)) {
                _recordTask(key, worker, category, taskId, evidenceHash, msg.sender);
            }

            unchecked {
                ++i;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // AUTOMATED VERIFICATION HOOKS
    // These are called by connected protocol contracts when
    // verifiable work events occur on-chain.
    // ═══════════════════════════════════════════════════════════

    /// @notice Called by DAO when a governance vote is cast.
    /// @param voter voter
    /// @param proposalId proposalId
    function onGovernanceVote(address voter, bytes32 proposalId) external {
        require(msg.sender == daoContract, "Only DAO");
        // F-38 FIX: cross-check that voter actually voted; prevents caller bugs from polluting attestations.
        require(IDAO_WA(daoContract).hasVoted(uint256(proposalId), voter), "SWA: voter did not vote on proposal");
        bytes32 evidence = keccak256(abi.encodePacked("gov_vote", proposalId, voter, block.number));
        _autoVerify(voter, 0, proposalId, evidence);
    }

    /// @notice Called by MerchantPortal on payment settlement.
    /// @param processor processor
    /// @param settlementId settlementId
    function onMerchantSettlement(address processor, bytes32 settlementId) external {
        require(msg.sender == merchantPortal, "Only MerchantPortal");
        bytes32 evidence = keccak256(abi.encodePacked("merchant_settle", settlementId, block.number));
        _autoVerify(processor, 2, settlementId, evidence);
    }

    /// @notice Called by BridgeSecurityModule on relay validation.
    /// @param validator validator
    /// @param relayId relayId
    function onBridgeRelayValidated(address validator, bytes32 relayId) external {
        require(msg.sender == bridgeModule, "Only BridgeModule");
        bytes32 evidence = keccak256(abi.encodePacked("bridge_relay", relayId, block.number));
        _autoVerify(validator, 3, relayId, evidence);
    }

    /// @notice Called by SeerSocial when mentorship is endorsed by mentee.
    /// @param mentor mentor
    /// @param sessionId sessionId
    function onMentorshipCompleted(address mentor, bytes32 sessionId) external {
        require(msg.sender == seerSocial, "Only SeerSocial");
        bytes32 evidence = keccak256(abi.encodePacked("mentorship", sessionId, block.number));
        _autoVerify(mentor, 4, sessionId, evidence);
    }

    /// @notice Called by PanicGuard when a fraud flag is confirmed valid.
    /// @param flagger flagger
    /// @param flagId flagId
    function onFraudFlagConfirmed(address flagger, bytes32 flagId) external {
        require(msg.sender == panicGuard, "Only PanicGuard");
        // F-72 FIX: Do not attest immediately from the fraud pipeline hook.
        // Queue first, then require independent verifier finalization after delay.
        PendingFraudAttestation storage pending = pendingFraudAttestation[flagId];
        require(pending.flagger == address(0), "SWA: fraud attestation already queued");
        uint64 readyAt = uint64(block.timestamp + FRAUD_FLAG_ATTESTATION_DELAY);
        pendingFraudAttestation[flagId] = PendingFraudAttestation({flagger: flagger, readyAt: readyAt});
        emit FraudFlagAttestationQueued(flagger, flagId, readyAt);
    }

    /// @notice Finalize a queued fraud-flag attestation after review delay.
    /// @dev Requires independent verifier role to reduce single-pipeline farming risk.
    /// @param flagId flagId
    function finalizeFraudFlagAttestation(bytes32 flagId) external nonReentrant onlyRole(VERIFIER_ROLE) {
        PendingFraudAttestation memory pending = pendingFraudAttestation[flagId];
        require(pending.flagger != address(0), "SWA: no pending fraud attestation");
        require(block.timestamp >= pending.readyAt, "SWA: review delay active");

        delete pendingFraudAttestation[flagId];

        bytes32 evidence = keccak256(abi.encodePacked("fraud_flag_finalized", flagId, pending.readyAt, msg.sender));
        _autoVerify(pending.flagger, 5, flagId, evidence);
        emit FraudFlagAttestationFinalized(pending.flagger, flagId, msg.sender);
    }

    /// @dev Internal automated verification — called by protocol hooks.
    /// @notice _autoVerify
    /// @param worker worker
    /// @param category category
    /// @param taskId taskId
    /// @param evidenceHash evidenceHash
    function _autoVerify(address worker, uint8 category, bytes32 taskId, bytes32 evidenceHash) internal {
        bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));

        if (taskExists[key]) {
            // F-39 FIX: Emit explicit signal when duplicate key is skipped.
            emit DuplicateTaskSkipped(worker, category, taskId, msg.sender);
            return;
        }

        _recordTask(key, worker, category, taskId, evidenceHash, msg.sender);
    }

    /// @notice _recordTask
    /// @param key key
    /// @param worker worker
    /// @param category category
    /// @param taskId taskId
    /// @param evidenceHash evidenceHash
    /// @param verifier verifier
    function _recordTask(bytes32 key, address worker, uint8 category, bytes32 taskId, bytes32 evidenceHash, address verifier) internal {
        tasks[key] = TaskRecord({worker: worker, category: category, taskId: taskId, evidenceHash: evidenceHash, completedAt: block.timestamp, attested: false, verifiedBy: verifier});

        taskExists[key] = true;
        workerTasks[worker].push(key);
        ++totalTasksVerified;
        ++categoryTaskCount[category];

        emit TaskVerified(worker, category, taskId, evidenceHash, verifier);
    }

    // ═══════════════════════════════════════════════════════════
    // ATTESTATION MARKING
    // ═══════════════════════════════════════════════════════════

    /// @notice Mark a task as attested (payment was claimed or authorized).
    ///         Called by WorkPaymentManager after successful payment.
    /// @param key key
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

    /// @notice setProtocolContracts
    /// @param _dao _dao
    /// @param _merchant _merchant
    /// @param _bridge _bridge
    /// @param _social _social
    /// @param _panic _panic
    /// @param _workPayment _workPayment
    function setProtocolContracts(address _dao, address _merchant, address _bridge, address _social, address _panic, address _workPayment) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pendingProtocolContracts.effectiveAt != 0) revert PendingChangeExists();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingProtocolContracts = PendingProtocolContracts({dao: _dao, merchant: _merchant, bridge: _bridge, social: _social, panic: _panic, workPayment: _workPayment, effectiveAt: effectiveAt});
        emit ProtocolContractsChangeProposed(_dao, _merchant, _bridge, _social, _panic, _workPayment, effectiveAt);
    }

    /// @notice applyProtocolContracts
    function applyProtocolContracts() external onlyRole(DEFAULT_ADMIN_ROLE) {
        PendingProtocolContracts memory p = pendingProtocolContracts;
        if (p.effectiveAt == 0) revert NoPendingChange();
        if (block.timestamp < p.effectiveAt) revert ChangeNotReady();

        if (p.dao != address(0)) {
            daoContract = p.dao;
            emit ProtocolContractUpdated("DAO", p.dao);
        }
        if (p.merchant != address(0)) {
            merchantPortal = p.merchant;
            emit ProtocolContractUpdated("MerchantPortal", p.merchant);
        }
        if (p.bridge != address(0)) {
            bridgeModule = p.bridge;
            emit ProtocolContractUpdated("BridgeModule", p.bridge);
        }
        if (p.social != address(0)) {
            seerSocial = p.social;
            emit ProtocolContractUpdated("SeerSocial", p.social);
        }
        if (p.panic != address(0)) {
            panicGuard = p.panic;
            emit ProtocolContractUpdated("PanicGuard", p.panic);
        }
        if (p.workPayment != address(0)) {
            workPaymentManager = p.workPayment;
            emit ProtocolContractUpdated("WorkPaymentManager", p.workPayment);
        }

        delete pendingProtocolContracts;
    }

    /// @notice cancelProtocolContractsChange
    function cancelProtocolContractsChange() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pendingProtocolContracts.effectiveAt == 0) revert NoPendingChange();
        delete pendingProtocolContracts;
        emit ProtocolContractsChangeCancelled();
    }

    /// @notice addVerifier
    /// @param verifier verifier
    function addVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    /// @notice removeVerifier
    /// @param verifier verifier
    function removeVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Get all task keys for a worker.
    /// @param worker worker
    /// @return _arg _arg
    function getWorkerTaskKeys(address worker) external view returns (bytes32[] memory) {
        return workerTasks[worker];
    }

    /// @notice Get task details by key.
    /// @param key key
    /// @return _arg _arg
    function getTask(bytes32 key) external view returns (TaskRecord memory) {
        return tasks[key];
    }

    /// @notice Check if a specific task has been verified.
    /// @param worker worker
    /// @param category category
    /// @param taskId taskId
    /// @return _bool _bool
    function isTaskVerified(address worker, uint8 category, bytes32 taskId) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(worker, category, taskId));
        return taskExists[key];
    }

    /// @notice Get total tasks verified for a specific category.
    /// @param category category
    /// @return _uint256 _uint256
    function getCategoryCount(uint8 category) external view returns (uint256) {
        return categoryTaskCount[category];
    }

    /// @notice N-M37 FIX: Return the total number of attested tasks for a worker.
    ///         Used by ServicePool.seerAttestation gate to confirm a worker has
    ///         at least one verified task before crediting contribution score.
    /// @param worker worker
    /// @return _uint256 _uint256
    function workerTaskCount(address worker) external view returns (uint256) {
        return workerTasks[worker].length;
    }
}
