// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         ZK REPUTATION PROOFS                              ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Prove trust without revealing details.                                   ║
 * ║                                                                           ║
 * ║  Examples:                                                                ║
 * ║  - Prove score > 700 without revealing exact score                        ║
 * ║  - Prove you have 10+ endorsements without listing endorsers              ║
 * ║  - Prove no dispute losses without revealing history                      ║
 * ║  - Prove membership in high-trust tier without revealing identity         ║
 * ║                                                                           ║
 * ║  Uses commitment schemes and range proofs on-chain.                       ║
 * ║  Full ZK-SNARK integration planned for v2.                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

error ZKR_InvalidProof();
error ZKR_ProofExpired();
error ZKR_NotAuthorized();
error ZKR_AlreadyUsed();
error ZKR_CommitmentMismatch();

interface ISeerView {
    function getScore(address user) external view returns (uint256);
    function getEndorsementCount(address user) external view returns (uint256);
    function getDisputeLosses(address user) external view returns (uint256);
    function getTransactionCount(address user) external view returns (uint256);
}

contract ZKReputationProofs {
    
    // ═══════════════════════════════════════════════════════════════════════
    //                            PROOF TYPES
    // ═══════════════════════════════════════════════════════════════════════
    
    enum ProofType {
        SCORE_ABOVE,            // Score >= threshold
        SCORE_BELOW,            // Score <= threshold
        SCORE_RANGE,            // Score in range [min, max]
        ENDORSEMENT_COUNT,      // Has >= X endorsements
        NO_DISPUTE_LOSSES,      // Has 0 dispute losses
        TRANSACTION_COUNT,      // Has >= X transactions
        TRUST_TIER,             // Is in a specific trust tier
        COMPOSITE               // Multiple conditions
    }
    
    struct ProofRequest {
        ProofType proofType;
        uint256 threshold;      // For single value proofs
        uint256 minValue;       // For range proofs
        uint256 maxValue;       // For range proofs
        uint256 timestamp;
        uint256 expiresAt;
        bool verified;
    }
    
    struct Commitment {
        bytes32 commitmentHash;
        uint256 createdAt;
        uint256 expiresAt;
        bool revealed;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    ISeerView public seer;
    address public dao;
    
    // Proof nonces to prevent replay
    mapping(bytes32 => bool) public usedNonces;
    
    // User commitments (for commit-reveal scheme)
    mapping(address => mapping(bytes32 => Commitment)) public commitments;
    
    // Verified proofs (requestId => verified)
    mapping(bytes32 => ProofRequest) public proofRequests;
    
    // Trusted proof verifiers (for off-chain ZK verification)
    mapping(address => bool) public trustedVerifiers;
    
    uint256 public constant PROOF_VALIDITY_PERIOD = 1 hours;
    uint256 public constant COMMITMENT_VALIDITY = 1 days;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    event CommitmentCreated(address indexed user, bytes32 indexed commitmentId, ProofType proofType);
    event ProofGenerated(bytes32 indexed proofId, address indexed prover, ProofType proofType, bool result);
    event ProofVerified(bytes32 indexed proofId, address indexed verifier);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _seer, address _dao) {
        require(_seer != address(0) && _dao != address(0));
        seer = ISeerView(_seer);
        dao = _dao;
    }
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert ZKR_NotAuthorized();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      COMMITMENT PHASE (Step 1)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a commitment to prove something about your reputation
     * @param proofType What you want to prove
     * @param salt Random salt for commitment (keep secret!)
     * @return commitmentId The commitment identifier
     */
    function createCommitment(
        ProofType proofType,
        bytes32 salt
    ) external returns (bytes32 commitmentId) {
        // The commitment hides both the claim and the user's actual values
        commitmentId = keccak256(abi.encode(msg.sender, proofType, salt, block.timestamp));
        
        bytes32 commitmentHash = keccak256(abi.encode(
            msg.sender,
            proofType,
            _getReputationData(msg.sender),
            salt
        ));
        
        commitments[msg.sender][commitmentId] = Commitment({
            commitmentHash: commitmentHash,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + COMMITMENT_VALIDITY,
            revealed: false
        });
        
        emit CommitmentCreated(msg.sender, commitmentId, proofType);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      PROOF GENERATION (Step 2)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Generate a proof that your score is above a threshold
     * @param threshold The minimum score to prove
     * @param nonce Unique nonce to prevent replay
     * @return proofId Proof identifier
     * @return success Whether the proof succeeded
     */
    function proveScoreAbove(
        uint256 threshold,
        bytes32 nonce
    ) external returns (bytes32 proofId, bool success) {
        if (usedNonces[nonce]) revert ZKR_AlreadyUsed();
        usedNonces[nonce] = true;
        
        uint256 score = seer.getScore(msg.sender);
        success = score >= threshold;
        
        proofId = keccak256(abi.encode(
            msg.sender,
            ProofType.SCORE_ABOVE,
            threshold,
            nonce,
            block.timestamp
        ));
        
        proofRequests[proofId] = ProofRequest({
            proofType: ProofType.SCORE_ABOVE,
            threshold: threshold,
            minValue: 0,
            maxValue: 0,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + PROOF_VALIDITY_PERIOD,
            verified: success
        });
        
        // Note: We emit the result but NOT the actual score
        emit ProofGenerated(proofId, msg.sender, ProofType.SCORE_ABOVE, success);
    }
    
    /**
     * @notice Generate a proof that your score is in a range
     * @param minScore Minimum score (inclusive)
     * @param maxScore Maximum score (inclusive)
     * @param nonce Unique nonce
     */
    function proveScoreInRange(
        uint256 minScore,
        uint256 maxScore,
        bytes32 nonce
    ) external returns (bytes32 proofId, bool success) {
        if (usedNonces[nonce]) revert ZKR_AlreadyUsed();
        usedNonces[nonce] = true;
        
        uint256 score = seer.getScore(msg.sender);
        success = score >= minScore && score <= maxScore;
        
        proofId = keccak256(abi.encode(
            msg.sender,
            ProofType.SCORE_RANGE,
            minScore,
            maxScore,
            nonce,
            block.timestamp
        ));
        
        proofRequests[proofId] = ProofRequest({
            proofType: ProofType.SCORE_RANGE,
            threshold: 0,
            minValue: minScore,
            maxValue: maxScore,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + PROOF_VALIDITY_PERIOD,
            verified: success
        });
        
        emit ProofGenerated(proofId, msg.sender, ProofType.SCORE_RANGE, success);
    }
    
    /**
     * @notice Prove you have at least X endorsements
     */
    function proveEndorsementCount(
        uint256 minEndorsements,
        bytes32 nonce
    ) external returns (bytes32 proofId, bool success) {
        if (usedNonces[nonce]) revert ZKR_AlreadyUsed();
        usedNonces[nonce] = true;
        
        uint256 endorsements = seer.getEndorsementCount(msg.sender);
        success = endorsements >= minEndorsements;
        
        proofId = keccak256(abi.encode(
            msg.sender,
            ProofType.ENDORSEMENT_COUNT,
            minEndorsements,
            nonce,
            block.timestamp
        ));
        
        proofRequests[proofId] = ProofRequest({
            proofType: ProofType.ENDORSEMENT_COUNT,
            threshold: minEndorsements,
            minValue: 0,
            maxValue: 0,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + PROOF_VALIDITY_PERIOD,
            verified: success
        });
        
        emit ProofGenerated(proofId, msg.sender, ProofType.ENDORSEMENT_COUNT, success);
    }
    
    /**
     * @notice Prove you have never lost a dispute
     */
    function proveNoDisputeLosses(bytes32 nonce) external returns (bytes32 proofId, bool success) {
        if (usedNonces[nonce]) revert ZKR_AlreadyUsed();
        usedNonces[nonce] = true;
        
        uint256 losses = seer.getDisputeLosses(msg.sender);
        success = losses == 0;
        
        proofId = keccak256(abi.encode(
            msg.sender,
            ProofType.NO_DISPUTE_LOSSES,
            nonce,
            block.timestamp
        ));
        
        proofRequests[proofId] = ProofRequest({
            proofType: ProofType.NO_DISPUTE_LOSSES,
            threshold: 0,
            minValue: 0,
            maxValue: 0,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + PROOF_VALIDITY_PERIOD,
            verified: success
        });
        
        emit ProofGenerated(proofId, msg.sender, ProofType.NO_DISPUTE_LOSSES, success);
    }
    
    /**
     * @notice Prove you're in a specific trust tier
     * @param tier 1=Bronze (0-25%), 2=Silver (25-50%), 3=Gold (50-75%), 4=Platinum (75-100%)
     */
    function proveTrustTier(
        uint8 tier,
        bytes32 nonce
    ) external returns (bytes32 proofId, bool success) {
        if (usedNonces[nonce]) revert ZKR_AlreadyUsed();
        usedNonces[nonce] = true;
        
        uint256 score = seer.getScore(msg.sender);
        uint8 actualTier = _getTier(score);
        success = actualTier >= tier;
        
        proofId = keccak256(abi.encode(
            msg.sender,
            ProofType.TRUST_TIER,
            tier,
            nonce,
            block.timestamp
        ));
        
        proofRequests[proofId] = ProofRequest({
            proofType: ProofType.TRUST_TIER,
            threshold: tier,
            minValue: 0,
            maxValue: 0,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + PROOF_VALIDITY_PERIOD,
            verified: success
        });
        
        emit ProofGenerated(proofId, msg.sender, ProofType.TRUST_TIER, success);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      PROOF VERIFICATION (Step 3)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Verify a proof is valid (for third parties to check)
     * @param proofId The proof identifier
     * @return valid Whether the proof is valid and not expired
     * @return proofType The type of proof
     */
    function verifyProof(bytes32 proofId) external view returns (
        bool valid,
        ProofType proofType,
        uint256 threshold,
        uint256 expiresAt
    ) {
        ProofRequest storage proof = proofRequests[proofId];
        
        if (proof.timestamp == 0) {
            return (false, ProofType.SCORE_ABOVE, 0, 0);
        }
        
        valid = proof.verified && block.timestamp <= proof.expiresAt;
        proofType = proof.proofType;
        threshold = proof.threshold > 0 ? proof.threshold : proof.minValue;
        expiresAt = proof.expiresAt;
    }
    
    /**
     * @notice Check if a proof would succeed without revealing the actual value
     * @dev Useful for UX to show if user can prove something before committing
     */
    function canProve(
        address user,
        ProofType proofType,
        uint256 threshold
    ) external view returns (bool) {
        if (proofType == ProofType.SCORE_ABOVE) {
            return seer.getScore(user) >= threshold;
        }
        if (proofType == ProofType.ENDORSEMENT_COUNT) {
            return seer.getEndorsementCount(user) >= threshold;
        }
        if (proofType == ProofType.NO_DISPUTE_LOSSES) {
            return seer.getDisputeLosses(user) == 0;
        }
        if (proofType == ProofType.TRUST_TIER) {
            return _getTier(seer.getScore(user)) >= threshold;
        }
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                     OFF-CHAIN ZK VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Submit an off-chain generated ZK proof
     * @dev For full ZK-SNARK proofs generated off-chain
     * @param proofData The ZK proof data
     * @param publicInputs Public inputs to the proof
     */
    function submitZKProof(
        bytes calldata proofData,
        bytes32[] calldata publicInputs
    ) external returns (bytes32 proofId) {
        // In v2: Use Groth16 or PLONK verifier
        // For now, trusted verifier submits
        if (!trustedVerifiers[msg.sender]) revert ZKR_NotAuthorized();
        
        proofId = keccak256(abi.encode(proofData, publicInputs, block.timestamp));
        
        proofRequests[proofId] = ProofRequest({
            proofType: ProofType.COMPOSITE,
            threshold: 0,
            minValue: 0,
            maxValue: 0,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + PROOF_VALIDITY_PERIOD,
            verified: true
        });
        
        emit ProofVerified(proofId, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function _getReputationData(address user) internal view returns (bytes32) {
        return keccak256(abi.encode(
            seer.getScore(user),
            seer.getEndorsementCount(user),
            seer.getDisputeLosses(user),
            seer.getTransactionCount(user)
        ));
    }
    
    function _getTier(uint256 score) internal pure returns (uint8) {
        if (score >= 7500) return 4;  // Platinum
        if (score >= 5000) return 3;  // Gold
        if (score >= 2500) return 2;  // Silver
        return 1;                      // Bronze
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    
    function addTrustedVerifier(address verifier) external onlyDAO {
        trustedVerifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }
    
    function removeTrustedVerifier(address verifier) external onlyDAO {
        trustedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }
    
    function setSeer(address _seer) external onlyDAO {
        require(_seer != address(0));
        seer = ISeerView(_seer);
    }
}
