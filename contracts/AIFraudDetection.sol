// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     AI FRAUD DETECTION HOOKS                              ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  On-chain hooks for off-chain AI fraud detection systems.                 ║
 * ║                                                                           ║
 * ║  How it works:                                                            ║
 * ║  1. Transactions emit detailed events with behavior patterns              ║
 * ║  2. Off-chain AI monitors events and detects anomalies                    ║
 * ║  3. AI submits fraud signals through authorized oracles                   ║
 * ║  4. Signals trigger automatic protections (holds, reviews, limits)        ║
 * ║  5. Users can appeal through governance                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

error AFD_NotOracle();
error AFD_NotDAO();
error AFD_InvalidRiskLevel();
error AFD_UserFrozen();
error AFD_AppealActive();
error AFD_NoActiveFlag();
error AFD_CooldownActive();

interface ISeerPenalty {
    function applyPenalty(address user, uint256 amount, string calldata reason) external;
    function getScore(address user) external view returns (uint256);
}

contract AIFraudDetection {
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           RISK LEVELS
    // ═══════════════════════════════════════════════════════════════════════
    
    enum RiskLevel {
        NONE,           // 0 - No risk detected
        LOW,            // 1 - Minor anomaly, monitor only
        MEDIUM,         // 2 - Reduce limits temporarily
        HIGH,           // 3 - Hold transactions for review
        CRITICAL        // 4 - Freeze account pending investigation
    }
    
    enum FraudType {
        VELOCITY_ABUSE,         // Too many transactions in short time
        AMOUNT_ANOMALY,         // Unusual transaction amounts
        NETWORK_MANIPULATION,   // Coordinated endorsement farming
        DISPUTE_PATTERN,        // Suspicious dispute behavior
        WASH_TRADING,           // Circular transactions
        SYBIL_ATTACK,           // Multiple accounts same actor
        SCORE_MANIPULATION,     // Gaming the ProofScore system
        SOCIAL_ENGINEERING      // Unusual recovery/guardian changes
    }
    
    struct FraudSignal {
        FraudType fraudType;
        RiskLevel riskLevel;
        uint256 confidence;     // 0-10000 (basis points)
        uint256 timestamp;
        string evidence;        // IPFS hash or description
        address reportingOracle;
    }
    
    struct UserFraudState {
        RiskLevel currentRisk;
        uint256 flaggedAt;
        uint256 expiresAt;
        bool frozen;
        bool appealActive;
        uint256 appealDeadline;
        uint256 flagCount;      // Lifetime flag count
        FraudSignal[] signals;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    
    uint256 public constant LOW_RISK_DURATION = 1 days;
    uint256 public constant MEDIUM_RISK_DURATION = 3 days;
    uint256 public constant HIGH_RISK_DURATION = 7 days;
    uint256 public constant CRITICAL_RISK_DURATION = 30 days;
    
    uint256 public constant APPEAL_WINDOW = 7 days;
    uint256 public constant MIN_CONFIDENCE = 6000;  // 60% confidence required
    
    uint256 public constant SCORE_PENALTY_LOW = 50;
    uint256 public constant SCORE_PENALTY_MEDIUM = 200;
    uint256 public constant SCORE_PENALTY_HIGH = 500;
    uint256 public constant SCORE_PENALTY_CRITICAL = 1000;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    ISeerPenalty public seer;
    address public dao;
    
    mapping(address => bool) public authorizedOracles;
    mapping(address => UserFraudState) public userStates;
    
    // Transaction patterns for AI analysis (emitted as events)
    mapping(address => uint256) public lastTransactionTime;
    mapping(address => uint256) public transactionCount24h;
    mapping(address => uint256) public volumeLast24h;
    
    uint256 public totalFlagsIssued;
    uint256 public totalAppealsSucceeded;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Events for AI monitoring
    event TransactionPattern(
        address indexed user,
        address indexed counterparty,
        uint256 amount,
        uint256 timestamp,
        uint256 userScore,
        uint256 counterpartyScore,
        bytes32 transactionType
    );
    
    event EndorsementPattern(
        address indexed endorser,
        address indexed endorsed,
        uint256 endorserScore,
        uint256 endorsedScore,
        uint256 timeSinceLastEndorsement,
        uint256 totalEndorsements
    );
    
    event DisputePattern(
        address indexed initiator,
        address indexed counterparty,
        uint256 amount,
        uint256 initiatorDisputes,
        uint256 counterpartyDisputes,
        bytes32 disputeType
    );
    
    // Fraud detection events
    event FraudFlagged(
        address indexed user,
        FraudType indexed fraudType,
        RiskLevel riskLevel,
        uint256 confidence,
        address indexed oracle
    );
    
    event RiskLevelUpdated(address indexed user, RiskLevel oldLevel, RiskLevel newLevel);
    event UserFrozen(address indexed user, string reason);
    event UserUnfrozen(address indexed user);
    event AppealFiled(address indexed user, uint256 deadline);
    event AppealResolved(address indexed user, bool success);
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _seer, address _dao) {
        require(_seer != address(0) && _dao != address(0));
        seer = ISeerPenalty(_seer);
        dao = _dao;
    }
    
    modifier onlyOracle() {
        if (!authorizedOracles[msg.sender]) revert AFD_NotOracle();
        _;
    }
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert AFD_NotDAO();
        _;
    }
    
    modifier notFrozen(address user) {
        if (userStates[user].frozen) revert AFD_UserFrozen();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                     PATTERN EMISSION (for AI)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Emit transaction pattern for AI analysis
     * @dev Called by VFIDEToken, EscrowManager, etc.
     */
    function emitTransactionPattern(
        address user,
        address counterparty,
        uint256 amount,
        bytes32 transactionType
    ) external {
        // Update velocity tracking
        if (block.timestamp > lastTransactionTime[user] + 1 days) {
            transactionCount24h[user] = 0;
            volumeLast24h[user] = 0;
        }
        
        transactionCount24h[user]++;
        volumeLast24h[user] += amount;
        lastTransactionTime[user] = block.timestamp;
        
        emit TransactionPattern(
            user,
            counterparty,
            amount,
            block.timestamp,
            seer.getScore(user),
            counterparty != address(0) ? seer.getScore(counterparty) : 0,
            transactionType
        );
    }
    
    /**
     * @notice Emit endorsement pattern for AI analysis
     */
    function emitEndorsementPattern(
        address endorser,
        address endorsed,
        uint256 timeSinceLastEndorsement,
        uint256 totalEndorsements
    ) external {
        emit EndorsementPattern(
            endorser,
            endorsed,
            seer.getScore(endorser),
            seer.getScore(endorsed),
            timeSinceLastEndorsement,
            totalEndorsements
        );
    }
    
    /**
     * @notice Emit dispute pattern for AI analysis
     */
    function emitDisputePattern(
        address initiator,
        address counterparty,
        uint256 amount,
        uint256 initiatorDisputes,
        uint256 counterpartyDisputes,
        bytes32 disputeType
    ) external {
        emit DisputePattern(
            initiator,
            counterparty,
            amount,
            initiatorDisputes,
            counterpartyDisputes,
            disputeType
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      FRAUD SIGNAL SUBMISSION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Submit a fraud signal from an authorized AI oracle
     * @param user Address flagged for suspicious activity
     * @param fraudType Type of fraud detected
     * @param riskLevel Severity of the risk
     * @param confidence Confidence score (0-10000)
     * @param evidence IPFS hash or description of evidence
     */
    function submitFraudSignal(
        address user,
        FraudType fraudType,
        RiskLevel riskLevel,
        uint256 confidence,
        string calldata evidence
    ) external onlyOracle {
        if (riskLevel == RiskLevel.NONE) revert AFD_InvalidRiskLevel();
        if (confidence < MIN_CONFIDENCE) revert AFD_InvalidRiskLevel();
        
        UserFraudState storage state = userStates[user];
        
        // Can't flag if appeal is active
        if (state.appealActive) revert AFD_AppealActive();
        
        // Store signal
        state.signals.push(FraudSignal({
            fraudType: fraudType,
            riskLevel: riskLevel,
            confidence: confidence,
            timestamp: block.timestamp,
            evidence: evidence,
            reportingOracle: msg.sender
        }));
        
        // Update risk level (highest wins)
        RiskLevel oldLevel = state.currentRisk;
        if (uint8(riskLevel) > uint8(state.currentRisk)) {
            state.currentRisk = riskLevel;
            state.flaggedAt = block.timestamp;
            state.expiresAt = block.timestamp + _getRiskDuration(riskLevel);
        }
        
        state.flagCount++;
        totalFlagsIssued++;
        
        // Apply automatic actions based on risk level
        _applyRiskActions(user, riskLevel);
        
        emit FraudFlagged(user, fraudType, riskLevel, confidence, msg.sender);
        
        if (oldLevel != state.currentRisk) {
            emit RiskLevelUpdated(user, oldLevel, state.currentRisk);
        }
    }
    
    /**
     * @notice Apply automatic protections based on risk level
     */
    function _applyRiskActions(address user, RiskLevel risk) internal {
        UserFraudState storage state = userStates[user];
        
        if (risk == RiskLevel.LOW) {
            // Just monitoring, minor score penalty
            seer.applyPenalty(user, SCORE_PENALTY_LOW, "AI: Low risk anomaly detected");
        } else if (risk == RiskLevel.MEDIUM) {
            // Reduce limits (handled by checking getRiskLevel in other contracts)
            seer.applyPenalty(user, SCORE_PENALTY_MEDIUM, "AI: Medium risk pattern detected");
        } else if (risk == RiskLevel.HIGH) {
            // Hold transactions for review
            seer.applyPenalty(user, SCORE_PENALTY_HIGH, "AI: High risk behavior detected");
        } else if (risk == RiskLevel.CRITICAL) {
            // Freeze account
            state.frozen = true;
            seer.applyPenalty(user, SCORE_PENALTY_CRITICAL, "AI: Critical fraud risk - frozen");
            emit UserFrozen(user, "Critical fraud risk detected");
        }
    }
    
    function _getRiskDuration(RiskLevel risk) internal pure returns (uint256) {
        if (risk == RiskLevel.LOW) return LOW_RISK_DURATION;
        if (risk == RiskLevel.MEDIUM) return MEDIUM_RISK_DURATION;
        if (risk == RiskLevel.HIGH) return HIGH_RISK_DURATION;
        if (risk == RiskLevel.CRITICAL) return CRITICAL_RISK_DURATION;
        return 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           APPEALS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice File an appeal against fraud flag
     */
    function fileAppeal() external {
        UserFraudState storage state = userStates[msg.sender];
        if (state.currentRisk == RiskLevel.NONE) revert AFD_NoActiveFlag();
        if (state.appealActive) revert AFD_AppealActive();
        
        state.appealActive = true;
        state.appealDeadline = block.timestamp + APPEAL_WINDOW;
        
        emit AppealFiled(msg.sender, state.appealDeadline);
    }
    
    /**
     * @notice DAO resolves appeal
     * @param user User who appealed
     * @param success True if appeal is granted
     */
    function resolveAppeal(address user, bool success) external onlyDAO {
        UserFraudState storage state = userStates[user];
        if (!state.appealActive) revert AFD_NoActiveFlag();
        
        state.appealActive = false;
        
        if (success) {
            // Clear all flags
            state.currentRisk = RiskLevel.NONE;
            state.frozen = false;
            state.expiresAt = 0;
            delete state.signals;
            totalAppealsSucceeded++;
            
            emit UserUnfrozen(user);
        }
        
        emit AppealResolved(user, success);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get current risk level for a user
     * @dev Used by other contracts to check if user is restricted
     */
    function getRiskLevel(address user) external view returns (RiskLevel) {
        UserFraudState storage state = userStates[user];
        
        // Check if expired
        if (state.expiresAt != 0 && block.timestamp > state.expiresAt) {
            return RiskLevel.NONE;
        }
        
        return state.currentRisk;
    }
    
    /**
     * @notice Check if user is frozen
     */
    function isFrozen(address user) external view returns (bool) {
        return userStates[user].frozen;
    }
    
    /**
     * @notice Get user's full fraud state
     */
    function getUserFraudState(address user) external view returns (
        RiskLevel currentRisk,
        bool frozen,
        bool appealActive,
        uint256 flagCount,
        uint256 expiresAt,
        uint256 signalCount
    ) {
        UserFraudState storage state = userStates[user];
        return (
            state.currentRisk,
            state.frozen,
            state.appealActive,
            state.flagCount,
            state.expiresAt,
            state.signals.length
        );
    }
    
    /**
     * @notice Get transaction velocity for a user
     */
    function getVelocity(address user) external view returns (
        uint256 txCount24h,
        uint256 volume24h,
        uint256 lastTx
    ) {
        // Check if data is stale
        if (block.timestamp > lastTransactionTime[user] + 1 days) {
            return (0, 0, lastTransactionTime[user]);
        }
        return (transactionCount24h[user], volumeLast24h[user], lastTransactionTime[user]);
    }
    
    /**
     * @notice Calculate limit multiplier based on risk level
     * @dev Other contracts use this to reduce limits for risky users
     */
    function getLimitMultiplier(address user) external view returns (uint256) {
        RiskLevel risk = this.getRiskLevel(user);
        
        if (risk == RiskLevel.NONE) return 100;     // 100% = normal limits
        if (risk == RiskLevel.LOW) return 80;       // 80% limits
        if (risk == RiskLevel.MEDIUM) return 50;    // 50% limits
        if (risk == RiskLevel.HIGH) return 20;      // 20% limits
        return 0;                                    // CRITICAL = no transactions
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    
    function authorizeOracle(address oracle) external onlyDAO {
        authorizedOracles[oracle] = true;
        emit OracleAuthorized(oracle);
    }
    
    function revokeOracle(address oracle) external onlyDAO {
        authorizedOracles[oracle] = false;
        emit OracleRevoked(oracle);
    }
    
    function manualUnfreeze(address user) external onlyDAO {
        userStates[user].frozen = false;
        emit UserUnfrozen(user);
    }
    
    function setSeer(address _seer) external onlyDAO {
        require(_seer != address(0));
        seer = ISeerPenalty(_seer);
    }
}
