// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ReentrancyGuard, ISeer } from "./SharedInterfaces.sol";

/**
 * @title SeerAutonomous
 * @notice Fully automatic, self-triggering enforcement system
 * 
 * This contract makes Seer a FULLY AUTONOMOUS guardian:
 * 
 * 1. AUTOMATIC TRIGGERS - No manual calls needed:
 *    - Every transfer triggers enforcement check
 *    - Every vault action triggers enforcement check
 *    - Every governance action triggers enforcement check
 *    - Score changes cascade to restrictions immediately
 * 
 * 2. DYNAMIC THRESHOLDS - Self-adjusting based on network:
 *    - Thresholds adjust based on network health
 *    - Penalty severity scales with violation frequency
 *    - Recovery rates adjust based on user behavior
 * 
 * 3. PATTERN DETECTION - Automated anomaly detection:
 *    - Detects unusual transfer patterns
 *    - Identifies governance manipulation attempts
 *    - Flags wash trading/self-endorsement
 * 
 * 4. CASCADING ENFORCEMENT:
 *    - Restriction in one area affects all areas
 *    - Reputation flows across system components
 *    - Cross-module synchronization
 * 
 * All automatic actions can still be overridden by DAO vote.
 */

/// ═══════════════════════════════════════════════════════════════════════════
///                              INTERFACES
/// ═══════════════════════════════════════════════════════════════════════════

/// @notice Optional risk oracle for off-chain anomaly scoring
interface IRiskOracle_Auto {
    /// @dev Bounded to 0-100 (percentage risk)
    function getRiskScore(address subject) external view returns (uint8);
}

interface IProofLedger_Auto {
    function logSystemEvent(address who, string calldata action, address by) external;
}

/// ═══════════════════════════════════════════════════════════════════════════
///                                ERRORS
/// ═══════════════════════════════════════════════════════════════════════════

error SA_NotAuthorized();
error SA_Zero();
error SA_Restricted(string reason);
error SA_RateLimited();

/// ═══════════════════════════════════════════════════════════════════════════
///                         SEER AUTONOMOUS
/// ═══════════════════════════════════════════════════════════════════════════

contract SeerAutonomous is ReentrancyGuard {
    uint16 private constant RC_CRITICAL_SCORE = 100;
    uint16 private constant RC_VERY_LOW_SCORE = 101;
    uint16 private constant RC_LOW_SCORE = 102;
    uint16 private constant RC_BELOW_RATE_THRESHOLD = 103;
    uint16 private constant RC_REPEATED_PATTERN = 120;
    uint16 private constant RC_PATTERN_VIOLATION = 121;
    uint16 private constant RC_SUSPICIOUS_PATTERN = 122;
    uint16 private constant RC_PATTERN_DETECTED = 123;
    uint16 private constant RC_ORACLE_HIGH_RISK = 130;
    uint16 private constant RC_ORACLE_MEDIUM_RISK = 131;
    uint16 private constant RC_PROGRESSIVE_UNFREEZE = 140;
    uint64 private constant DAO_OVERRIDE_DURATION = 30 days;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    event ModulesSet(address seer, address dao, address ledger);
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event OperatorSet(address indexed operator, bool authorized);
    
    // Automatic enforcement
    event AutoEnforced(address indexed subject, ActionType action, EnforcementResult result);
    event PatternDetected(address indexed subject, PatternType pattern, uint8 severity);
    event DynamicThresholdAdjusted(ThresholdType ttype, uint16 oldValue, uint16 newValue);
    event ReputationCascade(address indexed subject, int16 change, string source);
    event DAOThresholdsUpdated(
        uint16 oldAutoRestrict,
        uint16 newAutoRestrict,
        uint16 oldAutoLift,
        uint16 newAutoLift,
        uint16 oldRateLimit,
        uint16 newRateLimit,
        uint16 oldSensitivity,
        uint16 newSensitivity
    );
    event DAORateLimitUpdated(
        RestrictionLevel level,
        ActionType action,
        uint16 oldLimit,
        uint16 newLimit
    );
    event DAOMaxAutonomyProfileApplied(address indexed by);
    
    // Restrictions
    event RestrictionApplied(address indexed subject, RestrictionLevel level, uint64 duration, string reason);
    event RestrictionAppliedCode(address indexed subject, RestrictionLevel level, uint16 indexed reasonCode, string reason);
    event RestrictionLifted(address indexed subject, RestrictionLevel oldLevel);
    event DAOOverride(address indexed subject, string reason);
    event ChallengeCreated(address indexed subject, RestrictionLevel target, uint64 deadline, string reason);
    event ChallengeResolved(address indexed subject, bool upheld, string reason);
    event ChallengeResolvedCode(address indexed subject, bool upheld, uint16 indexed reasonCode, string reason);
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ENUMS
    // ═══════════════════════════════════════════════════════════════════════
    
    enum ActionType {
        Transfer,
        VaultDeposit,
        VaultWithdraw,
        GovernanceVote,
        GovernancePropose,
        Endorse,
        Stake,
        Trade
    }
    
    enum EnforcementResult {
        Allowed,
        Warned,
        Delayed,
        Blocked,
        Penalized
    }
    
    enum PatternType {
        None,
        RapidTransfers,      // Many transfers in short time
        CircularTransfers,   // A→B→C→A patterns
        SelfEndorsement,     // Endorsing connected addresses
        VoteManipulation,    // Suspicious voting patterns
        WashTrading,         // Fake volume generation
        SybilActivity        // Multiple wallets, one actor
    }
    
    enum RestrictionLevel {
        None,           // 0: No restrictions
        Monitored,      // 1: Extra logging, no blocks
        Limited,        // 2: Rate limits applied
        Restricted,     // 3: Governance + large transfer blocked
        Suspended,      // 4: Most actions blocked
        Frozen          // 5: All actions blocked (DAO review required)
    }
    
    enum ThresholdType {
        AutoRestrict,
        AutoLift,
        RateLimitTrigger,
        PatternSensitivity
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    address public dao;
    ISeer public seer;
    IProofLedger_Auto public ledger;
    IRiskOracle_Auto public riskOracle;
    
    // Operator permissions (trusted contracts that can trigger checks)
    mapping(address => bool) public operators;
    
    // ─────────────────────────────────────────────────────────────────
    //                    USER RESTRICTION STATE
    // ─────────────────────────────────────────────────────────────────
    
    mapping(address => RestrictionLevel) public restrictionLevel;
    mapping(address => uint64) public restrictionExpiry;
    mapping(address => bool) public daoOverridden;
    mapping(address => uint64) public daoOverrideExpiry;
    mapping(address => string) public restrictionReason;

    struct PendingChallenge {
        uint64 deadline;
        RestrictionLevel targetLevel;
        string reason;
        bool exists;
    }
    mapping(address => PendingChallenge) public pendingChallenge;
    
    // ─────────────────────────────────────────────────────────────────
    //                    ACTIVITY TRACKING (for patterns)
    // ─────────────────────────────────────────────────────────────────
    
    struct ActivityWindow {
        uint64 windowStart;
        uint16 transferCount;
        uint16 voteCount;
        uint16 endorseCount;
        uint256 transferVolume;
        address[] recentCounterparties;
    }
    
    mapping(address => ActivityWindow) public activityWindows;
    uint64 public constant WINDOW_DURATION = 1 hours;
    
    // ─────────────────────────────────────────────────────────────────
    //                    VIOLATION TRACKING
    // ─────────────────────────────────────────────────────────────────
    
    mapping(address => mapping(PatternType => uint8)) public patternViolations;
    mapping(address => uint64) public lastViolationTime;
    mapping(address => uint16) public totalViolationScore; // Weighted sum
    
    // ─────────────────────────────────────────────────────────────────
    //                    DYNAMIC THRESHOLDS (auto-adjusting)
    // ─────────────────────────────────────────────────────────────────
    
    uint16 public autoRestrictThreshold = 3000;    // Score below = restrict
    uint16 public autoLiftThreshold = 5000;        // Score above = lift
    uint16 public rateLimitThreshold = 4000;       // Score below = rate limit
    uint16 public patternSensitivity = 50;         // 0-100 sensitivity
    uint64 public challengeWindow = 1 days;        // Time to contest severe actions
    
    // Network health metrics (for dynamic adjustment)
    uint256 public networkViolationCount;
    uint256 public networkActionCount;
    uint256 public networkBlockedCount;
    uint64 public lastThresholdAdjustment;
    uint64 public constant ADJUSTMENT_INTERVAL = 1 days;
    
    // ─────────────────────────────────────────────────────────────────
    //                    RATE LIMITING
    // ─────────────────────────────────────────────────────────────────
    
    mapping(address => mapping(ActionType => uint64)) public lastActionTime;
    mapping(address => mapping(ActionType => uint16)) public actionCountToday;
    mapping(address => uint64) public dailyResetTime;
    
    // Rate limits per restriction level (actions per day)
    mapping(RestrictionLevel => mapping(ActionType => uint16)) public rateLimits;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                            MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert SA_NotAuthorized();
        _;
    }
    
    modifier onlyOperator() {
        if (msg.sender != dao && !operators[msg.sender]) revert SA_NotAuthorized();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != address(riskOracle)) revert SA_NotAuthorized();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _dao, address _seer, address _ledger) {
        if (_dao == address(0) || _seer == address(0)) revert SA_Zero();
        dao = _dao;
        seer = ISeer(_seer);
        if (_ledger != address(0)) ledger = IProofLedger_Auto(_ledger);
        
        // Initialize default rate limits
        _initializeRateLimits();
        
        emit ModulesSet(_seer, _dao, _ledger);
    }

    /// @notice Set optional risk oracle (DAO only)
    function setRiskOracle(address _oracle) external onlyDAO {
        riskOracle = IRiskOracle_Auto(_oracle);
    }
    
    function _initializeRateLimits() internal {
        // None: unlimited
        rateLimits[RestrictionLevel.None][ActionType.Transfer] = 1000;
        rateLimits[RestrictionLevel.None][ActionType.VaultDeposit] = 1000;
        rateLimits[RestrictionLevel.None][ActionType.VaultWithdraw] = 1000;
        rateLimits[RestrictionLevel.None][ActionType.GovernanceVote] = 100;
        rateLimits[RestrictionLevel.None][ActionType.GovernancePropose] = 20;
        rateLimits[RestrictionLevel.None][ActionType.Endorse] = 100;
        rateLimits[RestrictionLevel.None][ActionType.Stake] = 200;
        rateLimits[RestrictionLevel.None][ActionType.Trade] = 1000;
        
        // Monitored: normal limits
        rateLimits[RestrictionLevel.Monitored][ActionType.Transfer] = 100;
        rateLimits[RestrictionLevel.Monitored][ActionType.VaultDeposit] = 100;
        rateLimits[RestrictionLevel.Monitored][ActionType.VaultWithdraw] = 100;
        rateLimits[RestrictionLevel.Monitored][ActionType.GovernanceVote] = 50;
        rateLimits[RestrictionLevel.Monitored][ActionType.GovernancePropose] = 10;
        rateLimits[RestrictionLevel.Monitored][ActionType.Endorse] = 50;
        rateLimits[RestrictionLevel.Monitored][ActionType.Stake] = 50;
        rateLimits[RestrictionLevel.Monitored][ActionType.Trade] = 100;
        
        // Limited: reduced
        rateLimits[RestrictionLevel.Limited][ActionType.Transfer] = 20;
        rateLimits[RestrictionLevel.Limited][ActionType.VaultDeposit] = 20;
        rateLimits[RestrictionLevel.Limited][ActionType.VaultWithdraw] = 20;
        rateLimits[RestrictionLevel.Limited][ActionType.GovernanceVote] = 10;
        rateLimits[RestrictionLevel.Limited][ActionType.GovernancePropose] = 3;
        rateLimits[RestrictionLevel.Limited][ActionType.Endorse] = 10;
        rateLimits[RestrictionLevel.Limited][ActionType.Stake] = 10;
        rateLimits[RestrictionLevel.Limited][ActionType.Trade] = 20;
        
        // Restricted: minimal
        rateLimits[RestrictionLevel.Restricted][ActionType.Transfer] = 5;
        rateLimits[RestrictionLevel.Restricted][ActionType.VaultDeposit] = 2;
        rateLimits[RestrictionLevel.Restricted][ActionType.VaultWithdraw] = 2;
        rateLimits[RestrictionLevel.Restricted][ActionType.GovernanceVote] = 0;
        rateLimits[RestrictionLevel.Restricted][ActionType.GovernancePropose] = 0;
        rateLimits[RestrictionLevel.Restricted][ActionType.Endorse] = 2;
        rateLimits[RestrictionLevel.Restricted][ActionType.Stake] = 2;
        rateLimits[RestrictionLevel.Restricted][ActionType.Trade] = 5;
        
        // Suspended: emergency only
        rateLimits[RestrictionLevel.Suspended][ActionType.Transfer] = 1;
        rateLimits[RestrictionLevel.Suspended][ActionType.VaultDeposit] = 0;
        rateLimits[RestrictionLevel.Suspended][ActionType.VaultWithdraw] = 0;
        rateLimits[RestrictionLevel.Suspended][ActionType.GovernanceVote] = 0;
        rateLimits[RestrictionLevel.Suspended][ActionType.GovernancePropose] = 0;
        rateLimits[RestrictionLevel.Suspended][ActionType.Endorse] = 0;
        rateLimits[RestrictionLevel.Suspended][ActionType.Stake] = 0;
        rateLimits[RestrictionLevel.Suspended][ActionType.Trade] = 0;
        
        // Frozen: nothing
        rateLimits[RestrictionLevel.Frozen][ActionType.Transfer] = 0;
        rateLimits[RestrictionLevel.Frozen][ActionType.VaultDeposit] = 0;
        rateLimits[RestrictionLevel.Frozen][ActionType.VaultWithdraw] = 0;
        rateLimits[RestrictionLevel.Frozen][ActionType.GovernanceVote] = 0;
        rateLimits[RestrictionLevel.Frozen][ActionType.GovernancePropose] = 0;
        rateLimits[RestrictionLevel.Frozen][ActionType.Endorse] = 0;
        rateLimits[RestrictionLevel.Frozen][ActionType.Stake] = 0;
        rateLimits[RestrictionLevel.Frozen][ActionType.Trade] = 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    MAIN ENTRY POINT - AUTO ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check and enforce before ANY action - called by other contracts
     * @dev This is the main hook - integrate into Token, Vault, DAO, etc.
     * @param subject The user attempting the action
     * @param action Type of action being attempted
     * @param amount Value/amount for the action (for volume tracking)
     * @param counterparty Other party involved (for pattern detection)
     * @return result The enforcement decision
     */
    function beforeAction(
        address subject,
        ActionType action,
        uint256 amount,
        address counterparty
    ) external onlyOperator nonReentrant returns (EnforcementResult result) {
        // 1. Check if DAO has overridden - allow if so
        if (daoOverridden[subject]) {
            if (block.timestamp < daoOverrideExpiry[subject]) {
                return EnforcementResult.Allowed;
            }
            daoOverridden[subject] = false;
            daoOverrideExpiry[subject] = 0;
        }

        _decayViolationScore(subject);

        // If a severe restriction is pending challenge and window passed, finalize
        _maybeFinalizeChallenge(subject);
        
        // 2. Check restriction level and rate limits
        result = _checkRestrictions(subject, action);
        if (result == EnforcementResult.Blocked) {
            networkBlockedCount++;
            emit AutoEnforced(subject, action, result);
            return result;
        }
        
        // 3. Update activity window and detect patterns
        _updateActivityWindow(subject, action, amount, counterparty);
        PatternType pattern = _detectPatterns(subject, action, counterparty);
        
        if (pattern != PatternType.None) {
            result = _handlePattern(subject, pattern);
            emit PatternDetected(subject, pattern, uint8(restrictionLevel[subject]));
        }

        // Incorporate oracle risk score as an additional soft signal
        if (address(riskOracle) != address(0)) {
            uint8 risk = riskOracle.getRiskScore(subject);
            if (risk > 80) {
                // High risk: escalate to at least Restricted for a short period
                _applyRestriction(subject, RestrictionLevel.Restricted, 3 days, "oracle_high_risk", RC_ORACLE_HIGH_RISK);
                result = EnforcementResult.Delayed;
            } else if (risk > 50 && restrictionLevel[subject] < RestrictionLevel.Limited) {
                _applyRestriction(subject, RestrictionLevel.Limited, 1 days, "oracle_medium_risk", RC_ORACLE_MEDIUM_RISK);
                if (result == EnforcementResult.Allowed) result = EnforcementResult.Warned;
            }
        }
        
        // 4. Check score and auto-adjust restrictions
        _autoAdjustRestriction(subject);
        
        // 5. Update rate limit counters
        _updateRateLimits(subject, action);
        
        // 6. Periodic dynamic threshold adjustment
        _maybeAdjustThresholds();
        
        // 7. Increment network counters
        networkActionCount++;
        
        emit AutoEnforced(subject, action, result);
        return result;
    }
    
    /**
     * @notice Called after score changes to cascade effects
     * @param subject The user whose score changed
     * @param oldScore Previous score
     * @param newScore New score
     */
    function onScoreChange(address subject, uint16 oldScore, uint16 newScore) external onlyOperator nonReentrant {
        // Immediate restriction adjustment based on new score
        _autoAdjustRestriction(subject);
        
        // Calculate reputation cascade
        int16 change = int16(newScore) - int16(oldScore);
        emit ReputationCascade(subject, change, "score_change");
        
        // Significant drop triggers investigation
        if (oldScore > newScore && (oldScore - newScore) > 500) {
            _recordViolation(subject, PatternType.None, "rapid_score_drop");
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    RESTRICTION CHECKING
    // ═══════════════════════════════════════════════════════════════════════
    
    function _checkRestrictions(address subject, ActionType action) internal view returns (EnforcementResult) {
        RestrictionLevel level = restrictionLevel[subject];
        
        // Check if restriction has expired
        if (level != RestrictionLevel.None && block.timestamp >= restrictionExpiry[subject]) {
            // Expired - would be lifted, treat as None for this check
            level = RestrictionLevel.None;
        }
        
        // Frozen = block everything
        if (level == RestrictionLevel.Frozen) {
            return EnforcementResult.Blocked;
        }
        
        // Check rate limits
        uint16 limit = rateLimits[level][action];
        if (limit == 0 && level >= RestrictionLevel.Restricted) {
            return EnforcementResult.Blocked;
        } else if (limit == 0) {
            return EnforcementResult.Allowed;
        }
        
        // Check daily count
        uint16 count = actionCountToday[subject][action];
        if (count >= limit) {
            return EnforcementResult.Blocked;
        }
        
        // Suspended = warn
        if (level == RestrictionLevel.Suspended) {
            return EnforcementResult.Warned;
        }
        
        return EnforcementResult.Allowed;
    }
    
    function _updateRateLimits(address subject, ActionType action) internal {
        // Reset daily counters if needed
        if (block.timestamp >= dailyResetTime[subject] + 1 days) {
            dailyResetTime[subject] = uint64(block.timestamp);
            // Reset all action counts
            actionCountToday[subject][ActionType.Transfer] = 0;
            actionCountToday[subject][ActionType.VaultDeposit] = 0;
            actionCountToday[subject][ActionType.VaultWithdraw] = 0;
            actionCountToday[subject][ActionType.GovernanceVote] = 0;
            actionCountToday[subject][ActionType.GovernancePropose] = 0;
            actionCountToday[subject][ActionType.Endorse] = 0;
            actionCountToday[subject][ActionType.Stake] = 0;
            actionCountToday[subject][ActionType.Trade] = 0;
        }
        
        actionCountToday[subject][action]++;
        lastActionTime[subject][action] = uint64(block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    PATTERN DETECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function _updateActivityWindow(
        address subject,
        ActionType action,
        uint256 amount,
        address counterparty
    ) internal {
        ActivityWindow storage window = activityWindows[subject];
        
        // Reset window if expired
        if (block.timestamp >= window.windowStart + WINDOW_DURATION) {
            window.windowStart = uint64(block.timestamp);
            window.transferCount = 0;
            window.voteCount = 0;
            window.endorseCount = 0;
            window.transferVolume = 0;
            delete window.recentCounterparties;
        }
        
        // Update counters
        if (action == ActionType.Transfer) {
            window.transferCount++;
            window.transferVolume += amount;
        } else if (action == ActionType.GovernanceVote) {
            window.voteCount++;
        } else if (action == ActionType.Endorse) {
            window.endorseCount++;
        }
        
        // Track counterparties (limit to 20 for gas)
        if (counterparty != address(0) && window.recentCounterparties.length < 20) {
            window.recentCounterparties.push(counterparty);
        }
    }
    
    function _detectPatterns(
        address subject,
        ActionType action,
        address counterparty
    ) internal view returns (PatternType) {
        ActivityWindow storage window = activityWindows[subject];
        uint16 sensitivity = patternSensitivity;
        
        // Rapid transfers (more than 10 in an hour at 50% sensitivity)
        if (action == ActionType.Transfer) {
            uint16 threshold = 20 - uint16((sensitivity * 15) / 100); // 5-20 range
            if (window.transferCount > threshold) {
                return PatternType.RapidTransfers;
            }
        }
        
        // Check for circular patterns (A<->B recurring both directions), not normal repeated merchant payments.
        if (action == ActionType.Transfer && counterparty != address(0)) {
            ActivityWindow storage cpWindow = activityWindows[counterparty];
            bool seenCounterpartyBefore = false;
            bool seenSubjectFromCounterparty = false;
            for (uint256 i = 0; i < window.recentCounterparties.length; i++) {
                if (window.recentCounterparties[i] == counterparty) {
                    seenCounterpartyBefore = true;
                    break;
                }
            }
            for (uint256 j = 0; j < cpWindow.recentCounterparties.length; j++) {
                if (cpWindow.recentCounterparties[j] == subject) {
                    seenSubjectFromCounterparty = true;
                    break;
                }
            }
            if (seenCounterpartyBefore && seenSubjectFromCounterparty) {
                return PatternType.CircularTransfers;
            }
        }
        
        // Excessive endorsements in short time
        if (action == ActionType.Endorse) {
            uint16 threshold = 10 - uint16((sensitivity * 8) / 100); // 2-10 range
            if (window.endorseCount > threshold) {
                return PatternType.SelfEndorsement;
            }
        }
        
        // Vote manipulation (too many votes in short window)
        if (action == ActionType.GovernanceVote) {
            uint16 threshold = 15 - uint16((sensitivity * 10) / 100); // 5-15 range
            if (window.voteCount > threshold) {
                return PatternType.VoteManipulation;
            }
        }
        
        return PatternType.None;
    }
    
    function _handlePattern(address subject, PatternType pattern) internal returns (EnforcementResult) {
        // Increment violation count
        patternViolations[subject][pattern]++;
        uint8 count = patternViolations[subject][pattern];
        lastViolationTime[subject] = uint64(block.timestamp);
        networkViolationCount++;
        
        // Calculate severity-weighted violation score
        uint16 severity = 0;
        if (pattern == PatternType.RapidTransfers) severity = 10;
        else if (pattern == PatternType.CircularTransfers) severity = 30;
        else if (pattern == PatternType.SelfEndorsement) severity = 50;
        else if (pattern == PatternType.VoteManipulation) severity = 70;
        else if (pattern == PatternType.WashTrading) severity = 80;
        else if (pattern == PatternType.SybilActivity) severity = 100;
        
        totalViolationScore[subject] += severity;

        // Blend oracle risk if available
        if (address(riskOracle) != address(0)) {
            uint8 risk = riskOracle.getRiskScore(subject);
            if (risk > 0) {
                totalViolationScore[subject] += risk; // bounded by uint16 per design
                severity += risk > 50 ? 20 : 0; // bump severity for high risk
            }
        }
        
        // Escalating response based on violation count
        if (count >= 5) {
            _applyRestriction(subject, RestrictionLevel.Suspended, 7 days, "repeated_pattern_violation", RC_REPEATED_PATTERN);
            _punish(subject, 200, "repeated_pattern_violation");
            return EnforcementResult.Blocked;
        } else if (count >= 3) {
            _applyRestriction(subject, RestrictionLevel.Restricted, 3 days, "pattern_violation", RC_PATTERN_VIOLATION);
            _punish(subject, 100, "pattern_violation");
            return EnforcementResult.Blocked;
        } else if (count >= 2) {
            _applyRestriction(subject, RestrictionLevel.Limited, 1 days, "suspicious_pattern", RC_SUSPICIOUS_PATTERN);
            _punish(subject, 50, "suspicious_pattern");
            return EnforcementResult.Delayed;
        } else {
            _applyRestriction(subject, RestrictionLevel.Monitored, 6 hours, "pattern_detected", RC_PATTERN_DETECTED);
            return EnforcementResult.Warned;
        }
    }
    
    function _recordViolation(address subject, PatternType pattern, string memory reason) internal {
        _decayViolationScore(subject);
        if (pattern != PatternType.None) {
            patternViolations[subject][pattern]++;
        }
        lastViolationTime[subject] = uint64(block.timestamp);
        totalViolationScore[subject] += 20;
        networkViolationCount++;
        _log(reason);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    AUTO RESTRICTION ADJUSTMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    function _autoAdjustRestriction(address subject) internal {
        if (daoOverridden[subject]) {
            if (block.timestamp < daoOverrideExpiry[subject]) {
                return;
            }
            daoOverridden[subject] = false;
            daoOverrideExpiry[subject] = 0;
        }
        
        uint16 score = seer.getScore(subject);
        RestrictionLevel current = restrictionLevel[subject];
        
        // Check if current restriction has expired
        if (current != RestrictionLevel.None && block.timestamp >= restrictionExpiry[subject]) {
            _liftRestriction(subject);
            current = RestrictionLevel.None;
        }
        
        // Score-based automatic adjustment
        if (score < 1000 && current < RestrictionLevel.Frozen) {
            _applyRestriction(subject, RestrictionLevel.Frozen, 30 days, "critical_score", RC_CRITICAL_SCORE);
        } else if (score < 2000 && current < RestrictionLevel.Suspended) {
            _applyRestriction(subject, RestrictionLevel.Suspended, 14 days, "very_low_score", RC_VERY_LOW_SCORE);
        } else if (score < autoRestrictThreshold && current < RestrictionLevel.Restricted) {
            _applyRestriction(subject, RestrictionLevel.Restricted, 7 days, "low_score", RC_LOW_SCORE);
        } else if (score < rateLimitThreshold && current < RestrictionLevel.Limited) {
            _applyRestriction(subject, RestrictionLevel.Limited, 3 days, "below_rate_threshold", RC_BELOW_RATE_THRESHOLD);
        } else if (score >= autoLiftThreshold && current != RestrictionLevel.None) {
            // Good score - lift restrictions
            _liftRestriction(subject);
        }
    }
    
    function _applyRestriction(
        address subject,
        RestrictionLevel level,
        uint64 duration,
        string memory reason,
        uint16 reasonCode
    ) internal {
        // Only escalate, never downgrade automatically
        if (level <= restrictionLevel[subject]) return;
        // Severe restrictions go through a challenge window first
        if (level >= RestrictionLevel.Suspended) {
            PendingChallenge storage ch = pendingChallenge[subject];
            if (!ch.exists) {
                ch.targetLevel = level;
                ch.deadline = uint64(block.timestamp + challengeWindow);
                ch.reason = reason;
                ch.exists = true;
                emit ChallengeCreated(subject, level, ch.deadline, reason);
                return; // wait for challenge window to pass
            }
        }

        restrictionLevel[subject] = level;
        restrictionExpiry[subject] = uint64(block.timestamp) + duration;
        restrictionReason[subject] = reason;

        emit RestrictionApplied(subject, level, duration, reason);
        emit RestrictionAppliedCode(subject, level, reasonCode, reason);

        // Higher restrictions = score penalty
        if (level >= RestrictionLevel.Restricted) {
            _punish(subject, 50, reason);
        }
    }
    
    function _liftRestriction(address subject) internal {
        RestrictionLevel old = restrictionLevel[subject];
        if (old == RestrictionLevel.None) return;

        uint16 score = seer.getScore(subject);
        RestrictionLevel target = RestrictionLevel.None;

        if (score < 1000) {
            target = RestrictionLevel.Frozen;
        } else if (score < 2000) {
            target = RestrictionLevel.Suspended;
        } else if (score < autoRestrictThreshold) {
            target = RestrictionLevel.Restricted;
        } else if (score < rateLimitThreshold) {
            target = RestrictionLevel.Limited;
        } else if (score < autoLiftThreshold) {
            target = RestrictionLevel.Monitored;
        }

        if (target == RestrictionLevel.None) {
            restrictionLevel[subject] = RestrictionLevel.None;
            restrictionExpiry[subject] = 0;
            restrictionReason[subject] = "";
            emit RestrictionLifted(subject, old);
            return;
        }

        restrictionLevel[subject] = target;
        restrictionExpiry[subject] = uint64(block.timestamp + 1 days);
        restrictionReason[subject] = "score_recalibrated";
        emit RestrictionApplied(subject, target, 1 days, "score_recalibrated");
        emit RestrictionAppliedCode(subject, target, RC_PROGRESSIVE_UNFREEZE, "score_recalibrated");
    }

    function _decayViolationScore(address subject) internal {
        uint64 last = lastViolationTime[subject];
        if (last == 0 || block.timestamp <= last) return;

        uint256 elapsed = block.timestamp - last;
        uint16 decay = uint16(elapsed / 30 days);
        if (decay == 0) return;

        uint16 raw = totalViolationScore[subject];
        totalViolationScore[subject] = decay >= raw ? 0 : raw - decay;
        lastViolationTime[subject] = uint64(block.timestamp);
    }

    function getEffectiveViolationScore(address subject) public view returns (uint16) {
        uint16 raw = totalViolationScore[subject];
        uint64 last = lastViolationTime[subject];
        if (raw == 0 || last == 0 || block.timestamp <= last) return raw;

        uint256 elapsed = block.timestamp - last;
        uint16 decay = uint16(elapsed / 30 days);
        return decay >= raw ? 0 : raw - decay;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    DYNAMIC THRESHOLD ADJUSTMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    function _maybeAdjustThresholds() internal {
        if (block.timestamp < lastThresholdAdjustment + ADJUSTMENT_INTERVAL) return;
        lastThresholdAdjustment = uint64(block.timestamp);
        
        // Calculate network health (violation rate)
        uint256 totalActions = networkActionCount + networkBlockedCount;
        if (totalActions == 0) return;
        
        uint256 violationRate = (networkViolationCount * 10000) / totalActions;
        
        // High violation rate = tighten thresholds
        if (violationRate > 500) { // >5% violation rate
            _adjustThreshold(ThresholdType.AutoRestrict, true, 200);
            _adjustThreshold(ThresholdType.PatternSensitivity, true, 10);
        }
        // Low violation rate = relax thresholds slightly
        else if (violationRate < 100) { // <1% violation rate
            _adjustThreshold(ThresholdType.AutoRestrict, false, 100);
            _adjustThreshold(ThresholdType.PatternSensitivity, false, 5);
        }
        
        // Reset counters for next period
        networkViolationCount = 0;
        networkActionCount = 0;
        networkBlockedCount = 0;
    }

    /// @notice Finalize a pending challenge if window has elapsed
    function _maybeFinalizeChallenge(address subject) internal {
        PendingChallenge storage ch = pendingChallenge[subject];
        if (!ch.exists) return;
        if (block.timestamp < ch.deadline) return;

        // Apply the target restriction now
        restrictionLevel[subject] = ch.targetLevel;
        restrictionExpiry[subject] = uint64(block.timestamp + 7 days);
        restrictionReason[subject] = ch.reason;
        emit RestrictionApplied(subject, ch.targetLevel, 7 days, ch.reason);
        emit RestrictionAppliedCode(subject, ch.targetLevel, 0, ch.reason);
        emit ChallengeResolved(subject, true, ch.reason);
        emit ChallengeResolvedCode(subject, true, 0, ch.reason);
        delete pendingChallenge[subject];
    }

    /**
     * @notice DAO resolves a pending challenge explicitly
     * @param subject The user under challenge
     * @param uphold True to apply restriction, false to dismiss
     */
    function resolveChallenge(address subject, bool uphold) external onlyDAO {
        PendingChallenge storage ch = pendingChallenge[subject];
        require(ch.exists, "SA: no challenge");

        if (uphold) {
            restrictionLevel[subject] = ch.targetLevel;
            restrictionExpiry[subject] = uint64(block.timestamp + 7 days);
            restrictionReason[subject] = ch.reason;
            emit RestrictionApplied(subject, ch.targetLevel, 7 days, ch.reason);
            emit RestrictionAppliedCode(subject, ch.targetLevel, 0, ch.reason);
            emit ChallengeResolved(subject, true, ch.reason);
            emit ChallengeResolvedCode(subject, true, 0, ch.reason);
        } else {
            emit ChallengeResolved(subject, false, ch.reason);
            emit ChallengeResolvedCode(subject, false, 0, ch.reason);
        }
        delete pendingChallenge[subject];
    }

    // _reasonCode removed: challenge-derived codes use 0; direct calls pass RC_ constants
    
    function _adjustThreshold(ThresholdType ttype, bool increase, uint16 delta) internal {
        uint16 oldValue = 0;
        uint16 newValue = 0;
        
        if (ttype == ThresholdType.AutoRestrict) {
            oldValue = autoRestrictThreshold;
            if (increase) {
                newValue = oldValue + delta > 5000 ? 5000 : oldValue + delta;
            } else {
                newValue = oldValue < delta + 1000 ? 1000 : oldValue - delta;
            }
            autoRestrictThreshold = newValue;
        } else if (ttype == ThresholdType.PatternSensitivity) {
            oldValue = patternSensitivity;
            if (increase) {
                newValue = oldValue + delta > 100 ? 100 : oldValue + delta;
            } else {
                newValue = oldValue < delta ? 0 : oldValue - delta;
            }
            patternSensitivity = newValue;
        }
        
        if (oldValue != newValue) {
            emit DynamicThresholdAdjusted(ttype, oldValue, newValue);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    DAO OVERSIGHT (Override capability)
    // ═══════════════════════════════════════════════════════════════════════
    
    function daoOverride(address subject, string calldata reason) external onlyDAO {
        daoOverridden[subject] = true;
        daoOverrideExpiry[subject] = uint64(block.timestamp + DAO_OVERRIDE_DURATION);

        RestrictionLevel old = restrictionLevel[subject];
        restrictionLevel[subject] = RestrictionLevel.None;
        restrictionExpiry[subject] = 0;
        restrictionReason[subject] = "dao_override";
        if (old != RestrictionLevel.None) {
            emit RestrictionLifted(subject, old);
        }
        
        emit DAOOverride(subject, reason);
        _log("dao_override");
    }
    
    function daoRemoveOverride(address subject) external onlyDAO {
        daoOverridden[subject] = false;
        daoOverrideExpiry[subject] = 0;
        // Re-evaluate immediately
        _autoAdjustRestriction(subject);
    }
    
    function daoSetThresholds(
        uint16 _autoRestrict,
        uint16 _autoLift,
        uint16 _rateLimit,
        uint16 _sensitivity
    ) external onlyDAO {
        require(_autoRestrict < _autoLift, "SA: invalid thresholds");
        require(_sensitivity <= 100, "SA: sensitivity 0-100");

        uint16 oldAutoRestrict = autoRestrictThreshold;
        uint16 oldAutoLift = autoLiftThreshold;
        uint16 oldRateLimit = rateLimitThreshold;
        uint16 oldSensitivity = patternSensitivity;
        
        autoRestrictThreshold = _autoRestrict;
        autoLiftThreshold = _autoLift;
        rateLimitThreshold = _rateLimit;
        patternSensitivity = _sensitivity;

        emit DAOThresholdsUpdated(
            oldAutoRestrict,
            _autoRestrict,
            oldAutoLift,
            _autoLift,
            oldRateLimit,
            _rateLimit,
            oldSensitivity,
            _sensitivity
        );
    }
    
    function daoSetRateLimit(RestrictionLevel level, ActionType action, uint16 limit) external onlyDAO {
        _setRateLimitWithEvent(level, action, limit);
    }

    /// @notice Apply a strict autonomy profile in one governance call.
    /// @dev Raises sensitivity and tightens rate limits to maximize automated enforcement.
    function daoApplyMaxAutonomyProfile() external onlyDAO {
        uint16 oldAutoRestrict = autoRestrictThreshold;
        uint16 oldAutoLift = autoLiftThreshold;
        uint16 oldRateLimit = rateLimitThreshold;
        uint16 oldSensitivity = patternSensitivity;

        // Strict threshold profile
        autoRestrictThreshold = 4500;
        autoLiftThreshold = 6200;
        rateLimitThreshold = 5200;
        patternSensitivity = 100;

        emit DAOThresholdsUpdated(
            oldAutoRestrict,
            autoRestrictThreshold,
            oldAutoLift,
            autoLiftThreshold,
            oldRateLimit,
            rateLimitThreshold,
            oldSensitivity,
            patternSensitivity
        );

        // Tighten rate limits across all restriction levels and action types.
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.Transfer, 300);
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.VaultDeposit, 300);
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.VaultWithdraw, 300);
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.GovernanceVote, 30);
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.GovernancePropose, 6);
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.Endorse, 30);
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.Stake, 60);
        _setRateLimitWithEvent(RestrictionLevel.None, ActionType.Trade, 300);

        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.Transfer, 40);
        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.VaultDeposit, 40);
        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.VaultWithdraw, 40);
        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.GovernanceVote, 15);
        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.GovernancePropose, 3);
        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.Endorse, 15);
        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.Stake, 15);
        _setRateLimitWithEvent(RestrictionLevel.Monitored, ActionType.Trade, 40);

        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.Transfer, 8);
        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.VaultDeposit, 8);
        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.VaultWithdraw, 8);
        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.GovernanceVote, 3);
        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.GovernancePropose, 1);
        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.Endorse, 4);
        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.Stake, 4);
        _setRateLimitWithEvent(RestrictionLevel.Limited, ActionType.Trade, 8);

        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.Transfer, 2);
        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.VaultDeposit, 1);
        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.VaultWithdraw, 1);
        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.GovernanceVote, 0);
        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.GovernancePropose, 0);
        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.Endorse, 1);
        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.Stake, 1);
        _setRateLimitWithEvent(RestrictionLevel.Restricted, ActionType.Trade, 2);

        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.Transfer, 0);
        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.VaultDeposit, 0);
        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.VaultWithdraw, 0);
        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.GovernanceVote, 0);
        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.GovernancePropose, 0);
        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.Endorse, 0);
        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.Stake, 0);
        _setRateLimitWithEvent(RestrictionLevel.Suspended, ActionType.Trade, 0);

        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.Transfer, 0);
        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.VaultDeposit, 0);
        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.VaultWithdraw, 0);
        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.GovernanceVote, 0);
        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.GovernancePropose, 0);
        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.Endorse, 0);
        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.Stake, 0);
        _setRateLimitWithEvent(RestrictionLevel.Frozen, ActionType.Trade, 0);

        emit DAOMaxAutonomyProfileApplied(msg.sender);
    }

    function _setRateLimitWithEvent(RestrictionLevel level, ActionType action, uint16 limit) internal {
        uint16 oldLimit = rateLimits[level][action];
        rateLimits[level][action] = limit;
        if (oldLimit != limit) {
            emit DAORateLimitUpdated(level, action, oldLimit, limit);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    
    function setDAO(address _newDAO) external onlyDAO {
        if (_newDAO == address(0)) revert SA_Zero();
        address old = dao;
        dao = _newDAO;
        emit DAOSet(old, _newDAO);
    }
    
    function setModules(address _seer, address _ledger) external onlyDAO {
        if (_seer == address(0)) revert SA_Zero();
        seer = ISeer(_seer);
        if (_ledger != address(0)) ledger = IProofLedger_Auto(_ledger);
        emit ModulesSet(_seer, dao, _ledger);
    }
    
    function setOperator(address operator, bool authorized) external onlyDAO {
        operators[operator] = authorized;
        emit OperatorSet(operator, authorized);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if an action would be allowed (without modifying state)
     */
    function canPerformAction(address subject, ActionType action) external view returns (bool allowed, string memory reason) {
        if (daoOverridden[subject]) {
            return (true, "dao_override");
        }
        
        RestrictionLevel level = restrictionLevel[subject];
        
        // Check expiry
        if (level != RestrictionLevel.None && block.timestamp >= restrictionExpiry[subject]) {
            level = RestrictionLevel.None;
        }
        
        if (level == RestrictionLevel.Frozen) {
            return (false, "frozen");
        }
        
        uint16 limit = rateLimits[level][action];
        if (limit == 0 && level >= RestrictionLevel.Restricted) {
            return (false, "action_blocked");
        } else if (limit == 0) {
            return (true, "allowed");
        }
        
        uint16 count = actionCountToday[subject][action];
        if (count >= limit) {
            return (false, "rate_limited");
        }
        
        return (true, "allowed");
    }
    
    function getRestrictionInfo(address subject) external view returns (
        RestrictionLevel level,
        uint64 expiry,
        bool overridden,
        string memory reason,
        uint16 violationScore
    ) {
        return (
            restrictionLevel[subject],
            restrictionExpiry[subject],
            daoOverridden[subject],
            restrictionReason[subject],
            totalViolationScore[subject]
        );
    }

    /// @notice Get the aggregate violation score for weighting endorsements
    function getViolationScore(address subject) external view returns (uint16) {
        return totalViolationScore[subject];
    }
    
    function getActivitySummary(address subject) external view returns (
        uint16 transferCount,
        uint16 voteCount,
        uint16 endorseCount,
        uint256 transferVolume,
        uint64 windowStart
    ) {
        ActivityWindow storage w = activityWindows[subject];
        return (w.transferCount, w.voteCount, w.endorseCount, w.transferVolume, w.windowStart);
    }
    
    function getNetworkHealth() external view returns (
        uint256 totalActions,
        uint256 totalViolations,
        uint256 violationRate,
        uint16 currentSensitivity
    ) {
        totalActions = networkActionCount;
        totalViolations = networkViolationCount;
        violationRate = networkActionCount > 0 ? (networkViolationCount * 10000) / networkActionCount : 0;
        currentSensitivity = patternSensitivity;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                            INTERNAL
    // ═══════════════════════════════════════════════════════════════════════
    
    function _punish(address subject, uint16 delta, string memory reason) internal {
        try seer.punish(subject, delta, reason) {} catch {}
    }
    
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }
}
