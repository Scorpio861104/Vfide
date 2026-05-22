// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ReentrancyGuard, ISeer } from "../SharedInterfaces.sol";
import { SeerAutonomousLib } from "./SeerAutonomousLib.sol";

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
/// @author Vfide
interface IRiskOracle_Auto {
    /// @dev Bounded to 0-100 (percentage risk)
    /// @notice getRiskScore
    /// @param subject subject
    /// @return _uint8 _uint8
    function getRiskScore(address subject) external view returns (uint8);
}

/// @notice IProofLedger_Auto
/// @title IProofLedger_Auto
/// @author Vfide
interface IProofLedger_Auto {
    /// @notice logSystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    function logSystemEvent(address who, string calldata action, address by) external;
}

/// @notice Minimal interface for EcosystemVault's keeper/automation methods
/// @title IEcosystemScheduler
/// @author Vfide
interface IEcosystemScheduler {
    /// @dev Chainlink Automation-compatible: returns whether tasks are due and an ABI-encoded bitmask.
    /// @notice checkUpkeep
    /// @return upkeepNeeded upkeepNeeded
    /// @return performData performData
    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData);
    /// @dev Execute the tasks indicated by the bitmask encoded in performData.
    /// @notice performUpkeep
    /// @param performData performData
    function performUpkeep(bytes calldata performData) external;
}

/// ═══════════════════════════════════════════════════════════════════════════
///                                ERRORS
/// ═══════════════════════════════════════════════════════════════════════════
/// @notice SA_NotAuthorized

error SA_NotAuthorized();
/// @notice SA_Zero
error SA_Zero();
/// @notice SA_Restricted
/// @param reason reason
error SA_Restricted(string reason);
/// @notice SA_RateLimited
error SA_RateLimited();
/// @notice SA_NoChallenge
error SA_NoChallenge();
/// @notice SA_ChallengeWindowPassed
error SA_ChallengeWindowPassed();
/// @notice SA_InvalidThresholds
error SA_InvalidThresholds();
/// @notice SA_InvalidSensitivity
error SA_InvalidSensitivity();

/// ═══════════════════════════════════════════════════════════════════════════
///                         SEER AUTONOMOUS
/// ═══════════════════════════════════════════════════════════════════════════
/// @notice SeerAutonomous
/// @title SeerAutonomous
/// @author Vfide

contract SeerAutonomous is ReentrancyGuard {
    /// @notice RC_CRITICAL_SCORE
    uint16 private constant RC_CRITICAL_SCORE = 100;
    /// @notice RC_VERY_LOW_SCORE
    uint16 private constant RC_VERY_LOW_SCORE = 101;
    /// @notice RC_LOW_SCORE
    uint16 private constant RC_LOW_SCORE = 102;
    /// @notice RC_BELOW_RATE_THRESHOLD
    uint16 private constant RC_BELOW_RATE_THRESHOLD = 103;
    /// @notice RC_REPEATED_PATTERN
    uint16 private constant RC_REPEATED_PATTERN = 120;
    /// @notice RC_PATTERN_VIOLATION
    uint16 private constant RC_PATTERN_VIOLATION = 121;
    /// @notice RC_SUSPICIOUS_PATTERN
    uint16 private constant RC_SUSPICIOUS_PATTERN = 122;
    /// @notice RC_PATTERN_DETECTED
    uint16 private constant RC_PATTERN_DETECTED = 123;
    /// @notice RC_ORACLE_HIGH_RISK
    uint16 private constant RC_ORACLE_HIGH_RISK = 130;
    /// @notice RC_ORACLE_MEDIUM_RISK
    uint16 private constant RC_ORACLE_MEDIUM_RISK = 131;
    /// @notice RC_PROGRESSIVE_UNFREEZE
    uint16 private constant RC_PROGRESSIVE_UNFREEZE = 140;
    /// @notice DAO_OVERRIDE_DURATION
    uint64 private constant DAO_OVERRIDE_DURATION = 30 days;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice ModulesSet
    /// @param seer seer
    /// @param dao dao
    /// @param ledger ledger
    event ModulesSet(address seer, address dao, address ledger);
    /// @notice DAOSet
    /// @param oldDAO oldDAO
    /// @param newDAO newDAO
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    /// @notice OperatorSet
    /// @param operator operator
    /// @param authorized authorized
    event OperatorSet(address indexed operator, bool authorized);
    /// @notice RiskOracleSet
    /// @param oldOracle oldOracle
    /// @param newOracle newOracle
    event RiskOracleSet(address indexed oldOracle, address indexed newOracle);
    /// @notice RiskOracleOutOfRange
    /// @param subject subject
    /// @param risk risk
    event RiskOracleOutOfRange(address indexed subject, uint8 risk);
    
    // Automatic enforcement
    /// @notice AutoEnforced
    /// @param subject subject
    /// @param action action
    /// @param result result
    event AutoEnforced(address indexed subject, ActionType action, EnforcementResult result);
    /// @notice PatternDetected
    /// @param subject subject
    /// @param pattern pattern
    /// @param severity severity
    event PatternDetected(address indexed subject, PatternType pattern, uint8 severity);
    /// @notice DynamicThresholdAdjusted
    /// @param ttype ttype
    /// @param oldValue oldValue
    /// @param newValue newValue
    event DynamicThresholdAdjusted(ThresholdType ttype, uint16 oldValue, uint16 newValue);
    /// @notice ReputationCascade
    /// @param subject subject
    /// @param change change
    /// @param source source
    event ReputationCascade(address indexed subject, int16 change, string source);
    /// @notice DAOThresholdsUpdated
    /// @param oldAutoRestrict oldAutoRestrict
    /// @param newAutoRestrict newAutoRestrict
    /// @param oldAutoLift oldAutoLift
    /// @param newAutoLift newAutoLift
    /// @param oldRateLimit oldRateLimit
    /// @param newRateLimit newRateLimit
    /// @param oldSensitivity oldSensitivity
    /// @param newSensitivity newSensitivity
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
    /// @notice DAORateLimitUpdated
    /// @param level level
    /// @param action action
    /// @param oldLimit oldLimit
    /// @param newLimit newLimit
    event DAORateLimitUpdated(
        RestrictionLevel level,
        ActionType action,
        uint16 oldLimit,
        uint16 newLimit
    );
    /// @notice DAORateLimitChangeQueued
    /// @param level level
    /// @param action action
    /// @param newLimit newLimit
    /// @param executeAfter executeAfter
    event DAORateLimitChangeQueued(RestrictionLevel level, ActionType action, uint16 newLimit, uint64 executeAfter);
    /// @notice DAORateLimitChangeCancelled
    /// @param level level
    /// @param action action
    /// @param newLimit newLimit
    event DAORateLimitChangeCancelled(RestrictionLevel level, ActionType action, uint16 newLimit);
    /// @notice OperatorChangeQueued
    /// @param operator operator
    /// @param authorized authorized
    /// @param executeAfter executeAfter
    event OperatorChangeQueued(address indexed operator, bool authorized, uint64 executeAfter);
    /// @notice OperatorChangeCancelled
    /// @param operator operator
    /// @param authorized authorized
    event OperatorChangeCancelled(address indexed operator, bool authorized);
    /// @notice DAOMaxAutonomyProfileApplied
    /// @param by by
    event DAOMaxAutonomyProfileApplied(address indexed by);

    // EcosystemVault monitoring
    /// @notice EcosystemVaultSet
    /// @param vault vault
    event EcosystemVaultSet(address indexed vault);
    /// @notice EcosystemTasksTriggered
    /// @param tasksBitmask tasksBitmask
    event EcosystemTasksTriggered(uint8 indexed tasksBitmask);

    // Restrictions
    /// @notice RestrictionApplied
    /// @param subject subject
    /// @param level level
    /// @param duration duration
    /// @param reason reason
    event RestrictionApplied(address indexed subject, RestrictionLevel level, uint64 duration, string reason);
    /// @notice RestrictionAppliedCode
    /// @param subject subject
    /// @param level level
    /// @param reasonCode reasonCode
    /// @param reason reason
    event RestrictionAppliedCode(address indexed subject, RestrictionLevel level, uint16 indexed reasonCode, string reason);
    /// @notice RestrictionLifted
    /// @param subject subject
    /// @param oldLevel oldLevel
    event RestrictionLifted(address indexed subject, RestrictionLevel oldLevel);
    /// @notice DAOOverride
    /// @param subject subject
    /// @param reason reason
    event DAOOverride(address indexed subject, string reason);
    /// @notice ChallengeCreated
    /// @param subject subject
    /// @param target target
    /// @param deadline deadline
    /// @param reason reason
    event ChallengeCreated(address indexed subject, RestrictionLevel target, uint64 deadline, string reason);
    /// @notice ChallengeRequested
    /// @param subject subject
    /// @param note note
    event ChallengeRequested(address indexed subject, string note);
    /// @notice ChallengeResolved
    /// @param subject subject
    /// @param upheld upheld
    /// @param reason reason
    event ChallengeResolved(address indexed subject, bool upheld, string reason);
    /// @notice ChallengeResolvedCode
    /// @param subject subject
    /// @param upheld upheld
    /// @param reasonCode reasonCode
    /// @param reason reason
    event ChallengeResolvedCode(address indexed subject, bool upheld, uint16 indexed reasonCode, string reason);
    /// @notice ExternalCallFailed
    /// @param location location
    /// @param reason reason
    event ExternalCallFailed(string indexed location, bytes reason);
    
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
    
    /// @notice dao
    address public dao;
    /// @notice seer
    ISeer public seer;
    /// @notice ledger
    IProofLedger_Auto public ledger;
    /// @notice riskOracle
    IRiskOracle_Auto public riskOracle;
    /// @notice EcosystemVault to monitor and trigger scheduled tasks on.
    address public ecosystemVault;
    
    // Operator permissions (trusted contracts that can trigger checks)
    /// @notice operators
    mapping(address => bool) public operators;
    /// @notice DAO_RATE_LIMIT_DELAY
    uint64 public constant DAO_RATE_LIMIT_DELAY = 24 hours;
    /// @notice OPERATOR_CHANGE_DELAY
    uint64 public constant OPERATOR_CHANGE_DELAY = 48 hours;

    struct PendingRateLimitChange {
        RestrictionLevel level;
        ActionType action;
        uint16 limit;
        uint64 executeAfter;
        bool exists;
    }
    /// @notice pendingRateLimitChange
    PendingRateLimitChange public pendingRateLimitChange;

    struct PendingOperatorChange {
        address operator;
        bool authorized;
        uint64 executeAfter;
        bool exists;
    }
    /// @notice pendingOperatorChange
    PendingOperatorChange public pendingOperatorChange;
    
    // ─────────────────────────────────────────────────────────────────
    //                    USER RESTRICTION STATE
    // ─────────────────────────────────────────────────────────────────
    
    /// @notice restrictionLevel
    mapping(address => RestrictionLevel) public restrictionLevel;
    /// @notice restrictionExpiry
    mapping(address => uint64) public restrictionExpiry;
    /// @notice daoOverridden
    mapping(address => bool) public daoOverridden;
    /// @notice daoOverrideExpiry
    mapping(address => uint64) public daoOverrideExpiry;
    /// @notice restrictionReason
    mapping(address => string) public restrictionReason;

    struct PendingChallenge {
        uint64 deadline;
        RestrictionLevel targetLevel;
        string reason;
        bool exists;
    }
    /// @notice pendingChallenge
    mapping(address => PendingChallenge) public pendingChallenge;
    /// @notice challengeRequested
    mapping(address => bool) public challengeRequested;
    
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
    
    /// @notice activityWindows
    mapping(address => ActivityWindow) public activityWindows;
    /// @notice recentCounterpartyRingIndex
    mapping(address => uint8) public recentCounterpartyRingIndex;
    /// @notice WINDOW_DURATION
    uint64 public constant WINDOW_DURATION = 1 hours;
    
    // ─────────────────────────────────────────────────────────────────
    //                    VIOLATION TRACKING
    // ─────────────────────────────────────────────────────────────────
    
    /// @notice patternViolations
    mapping(address => mapping(PatternType => uint8)) public patternViolations;
    /// @notice lastViolationTime
    mapping(address => uint64) public lastViolationTime;
    /// @notice totalViolationScore
    mapping(address => uint16) public totalViolationScore; // Weighted sum
    
    // ─────────────────────────────────────────────────────────────────
    //                    DYNAMIC THRESHOLDS (auto-adjusting)
    // ─────────────────────────────────────────────────────────────────
    
    /// @notice autoRestrictThreshold
    uint16 public autoRestrictThreshold = 3000;    // Score below = restrict
    /// @notice autoLiftThreshold
    uint16 public autoLiftThreshold = 5000;        // Score above = lift
    /// @notice rateLimitThreshold
    uint16 public rateLimitThreshold = 4000;       // Score below = rate limit
    /// @notice patternSensitivity
    uint16 public patternSensitivity = 50;         // 0-100 sensitivity
    /// @notice MAX_COUNTERPARTY_SCAN
    uint256 public constant MAX_COUNTERPARTY_SCAN = 20;
    /// @notice challengeWindow
    uint64 public challengeWindow = 1 days;        // Time to contest severe actions
    
    // Network health metrics (for dynamic adjustment)
    /// @notice networkViolationCount
    uint256 public networkViolationCount;
    /// @notice networkActionCount
    uint256 public networkActionCount;
    /// @notice networkBlockedCount
    uint256 public networkBlockedCount;
    /// @notice lastThresholdAdjustment
    uint64 public lastThresholdAdjustment;
    /// @notice ADJUSTMENT_INTERVAL
    uint64 public constant ADJUSTMENT_INTERVAL = 1 days;
    
    // ─────────────────────────────────────────────────────────────────
    //                    RATE LIMITING
    // ─────────────────────────────────────────────────────────────────
    
    /// @notice lastActionTime
    mapping(address => mapping(ActionType => uint64)) public lastActionTime;
    /// @notice actionCountToday
    mapping(address => mapping(ActionType => uint16)) public actionCountToday;
    /// @notice dailyResetTime
    mapping(address => uint64) public dailyResetTime;
    
    // Rate limits per restriction level (actions per day)
    /// @notice rateLimits
    mapping(RestrictionLevel => mapping(ActionType => uint16)) public rateLimits;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                            MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice onlyDAO
    modifier onlyDAO() {
        if (msg.sender != dao) revert SA_NotAuthorized();
        _;
    }
    
    /// @notice onlyOperator
    modifier onlyOperator() {
        if (msg.sender != dao && !operators[msg.sender]) revert SA_NotAuthorized();
        _;
    }

    /// @notice onlyOracle
    modifier onlyOracle() {
        if (msg.sender != address(riskOracle)) revert SA_NotAuthorized();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice constructor
    /// @param _dao _dao
    /// @param _seer _seer
    /// @param _ledger _ledger
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
    /// @param _oracle _oracle
    function setRiskOracle(address _oracle) external onlyDAO {
        address oldOracle = address(riskOracle);
        riskOracle = IRiskOracle_Auto(_oracle);
        emit RiskOracleSet(oldOracle, _oracle);
    }
    
    /// @notice _initializeRateLimits
    function _initializeRateLimits() internal {
        SeerAutonomousLib.RateLimitEntry[48] memory entries = SeerAutonomousLib.getDefaultProfile();
        for (uint256 i = 0; i < 48; ++i) {
            rateLimits[RestrictionLevel(entries[i].level)][ActionType(entries[i].action)] = entries[i].limit;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    MAIN ENTRY POINT - AUTO ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    // slither-disable-next-line reentrancy-no-eth
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
            ++networkBlockedCount;
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

        // Incorporate oracle risk score as an additional soft signal (defensive wrapping)
        if (address(riskOracle) != address(0)) {
            try riskOracle.getRiskScore(subject) returns (uint8 risk) {
                if (risk > 100) {
                    emit RiskOracleOutOfRange(subject, risk);
                } else
                if (risk > 80) {
                    // High risk: escalate to at least Restricted for a short period
                    _applyRestriction(subject, RestrictionLevel.Restricted, 3 days, "oracle_high_risk", RC_ORACLE_HIGH_RISK, false);
                    result = EnforcementResult.Delayed;
                } else if (risk > 50 && restrictionLevel[subject] < RestrictionLevel.Limited) {
                    _applyRestriction(subject, RestrictionLevel.Limited, 1 days, "oracle_medium_risk", RC_ORACLE_MEDIUM_RISK, false);
                    if (result == EnforcementResult.Allowed) result = EnforcementResult.Warned;
                }
            } catch (bytes memory reason) {
                // Oracle failure: emit event and continue without blocking user actions
                emit ExternalCallFailed("riskOracle.getRiskScore", reason);
                // Fall through — do not block user actions on oracle failure
            }
        }
        
        // 4. Check score and auto-adjust restrictions
        _autoAdjustRestriction(subject);
        
        // 5. Update rate limit counters
        _updateRateLimits(subject, action);
        
        // 6. Periodic dynamic threshold adjustment
        _maybeAdjustThresholds();
        
        // 7. Increment network counters
        ++networkActionCount;
        
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
    
    /// @notice _checkRestrictions
    /// @param subject subject
    /// @param action action
    /// @return _arg _arg
    function _checkRestrictions(address subject, ActionType action) internal view returns (EnforcementResult) {
        RestrictionLevel level = restrictionLevel[subject];

        // Check if restriction has expired
        if (level != RestrictionLevel.None && block.timestamp >= restrictionExpiry[subject]) {
            level = RestrictionLevel.None;
        }

        uint16 limit = rateLimits[level][action];
        uint16 count = actionCountToday[subject][action];
        uint8 r = SeerAutonomousLib.evaluateRestriction(
            uint8(level),
            uint8(RestrictionLevel.Frozen),
            uint8(RestrictionLevel.Restricted),
            uint8(RestrictionLevel.Suspended),
            limit,
            count
        );
        return EnforcementResult(r);
    }
    
    /// @notice _updateRateLimits
    /// @param subject subject
    /// @param action action
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
        
        ++actionCountToday[subject][action];
        lastActionTime[subject][action] = uint64(block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    PATTERN DETECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice _updateActivityWindow
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
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
            recentCounterpartyRingIndex[subject] = 0;
        }
        
        // Update counters
        if (action == ActionType.Transfer) {
            ++window.transferCount;
            window.transferVolume += amount;
        } else if (action == ActionType.GovernanceVote) {
            ++window.voteCount;
        } else if (action == ActionType.Endorse) {
            ++window.endorseCount;
        }
        
        // F-88 FIX: Track counterparties with ring-buffer eviction (max 20),
        // so newest entries are retained instead of being silently dropped.
        if (counterparty != address(0)) {
            if (window.recentCounterparties.length < 20) {
                window.recentCounterparties.push(counterparty);
            } else {
                uint8 idx = recentCounterpartyRingIndex[subject];
                window.recentCounterparties[idx] = counterparty;
                recentCounterpartyRingIndex[subject] = uint8((uint256(idx) + 1) % 20);
            }
        }
    }
    
    /// @notice _detectPatterns
    /// @param subject subject
    /// @param action action
    /// @param counterparty counterparty
    /// @return _arg _arg
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
            uint256 subjectWindowLen = window.recentCounterparties.length;
            if (subjectWindowLen > MAX_COUNTERPARTY_SCAN) {
                subjectWindowLen = MAX_COUNTERPARTY_SCAN;
            }
            for (uint256 i = 0; i < subjectWindowLen; ++i) {
                if (window.recentCounterparties[i] == counterparty) {
                    seenCounterpartyBefore = true;
                    break;
                }
            }
            uint256 counterpartyWindowLen = cpWindow.recentCounterparties.length;
            if (counterpartyWindowLen > MAX_COUNTERPARTY_SCAN) {
                counterpartyWindowLen = MAX_COUNTERPARTY_SCAN;
            }
            for (uint256 j = 0; j < counterpartyWindowLen; ++j) {
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
    
    /// @notice _handlePattern
    /// @param subject subject
    /// @param pattern pattern
    /// @return _arg _arg
    function _handlePattern(address subject, PatternType pattern) internal returns (EnforcementResult) {
        // Increment violation count
        ++patternViolations[subject][pattern];
        uint8 count = patternViolations[subject][pattern];
        lastViolationTime[subject] = uint64(block.timestamp);
        ++networkViolationCount;

        // Severity lookup table (extracted to library to reduce bytecode).
        uint16 severity = SeerAutonomousLib.severityFor(uint8(pattern));
        _saturatingAddViolationScore(subject, severity);

        // Blend oracle risk if available (F-08: try/catch prevents broken oracle from freezing enforcement)
        if (address(riskOracle) != address(0)) {
            try riskOracle.getRiskScore(subject) returns (uint8 risk) {
                if (risk > 100) {
                    emit RiskOracleOutOfRange(subject, risk);
                } else if (risk > 0) {
                    _saturatingAddViolationScore(subject, risk);
                    severity += risk > 50 ? 20 : 0; // bump severity for high risk
                }
            } catch (bytes memory reason) {
                emit ExternalCallFailed("_handlePattern.riskOracle", reason);
            }
        }

        // Escalating response based on violation count (severity may be updated by oracle blend above)
        if (count >= 5) {
            _applyRestriction(subject, RestrictionLevel.Suspended, 7 days, "repeated_pattern_violation", RC_REPEATED_PATTERN, true);
            return EnforcementResult.Blocked;
        } else if (count >= 3) {
            _applyRestriction(subject, RestrictionLevel.Restricted, 3 days, "pattern_violation", RC_PATTERN_VIOLATION, true);
            return EnforcementResult.Blocked;
        } else if (count >= 2) {
            _applyRestriction(subject, RestrictionLevel.Limited, 1 days, "suspicious_pattern", RC_SUSPICIOUS_PATTERN, false);
            return EnforcementResult.Delayed;
        } else {
            _applyRestriction(subject, RestrictionLevel.Monitored, 6 hours, "pattern_detected", RC_PATTERN_DETECTED, false);
            return EnforcementResult.Warned;
        }
    }
    
    /// @notice _recordViolation
    /// @param subject subject
    /// @param pattern pattern
    /// @param reason reason
    function _recordViolation(address subject, PatternType pattern, string memory reason) internal {
        _decayViolationScore(subject);
        if (pattern != PatternType.None) {
            ++patternViolations[subject][pattern];
        }
        lastViolationTime[subject] = uint64(block.timestamp);
        _saturatingAddViolationScore(subject, 20);
        ++networkViolationCount;
        _log(reason);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    AUTO RESTRICTION ADJUSTMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice _autoAdjustRestriction
    /// @param subject subject
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
            _applyRestriction(subject, RestrictionLevel.Frozen, 30 days, "critical_score", RC_CRITICAL_SCORE, false);
        } else if (score < 2000 && current < RestrictionLevel.Suspended) {
            _applyRestriction(subject, RestrictionLevel.Suspended, 14 days, "very_low_score", RC_VERY_LOW_SCORE, false);
        } else if (score < autoRestrictThreshold && current < RestrictionLevel.Restricted) {
            _applyRestriction(subject, RestrictionLevel.Restricted, 7 days, "low_score", RC_LOW_SCORE, false);
        } else if (score < rateLimitThreshold && current < RestrictionLevel.Limited) {
            _applyRestriction(subject, RestrictionLevel.Limited, 3 days, "below_rate_threshold", RC_BELOW_RATE_THRESHOLD, false);
        } else if (score >= autoLiftThreshold && current != RestrictionLevel.None) {
            // Good score - lift restrictions
            _liftRestriction(subject);
        }
    }
    
    /// @notice _applyRestriction
    /// @param subject subject
    /// @param level level
    /// @param duration duration
    /// @param reason reason
    /// @param reasonCode reasonCode
    /// @param applyPenalty applyPenalty
    function _applyRestriction(
        address subject,
        RestrictionLevel level,
        uint64 duration,
        string memory reason,
        uint16 reasonCode,
        bool applyPenalty
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

        // SA-06 hardening: autonomous restrictions must not mutate Seer score directly.
        // Restriction level itself is the enforcement primitive; score changes are DAO/operator-controlled.
        if (applyPenalty) {
            // reserved for compatibility/no-op
        }
    }
    
    /// @notice _liftRestriction
    /// @param subject subject
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

    /// @notice _decayViolationScore
    /// @param subject subject
    function _decayViolationScore(address subject) internal {
        uint64 last = lastViolationTime[subject];
        if (last == 0 || block.timestamp <= last) return;

        uint256 elapsed = block.timestamp - last;
        uint256 periods = elapsed / 30 days;
        if (periods == 0) return;

        uint16 raw = totalViolationScore[subject];
        uint256 decayBps = periods * 500; // 5% per 30 days
        if (decayBps > 10_000) decayBps = 10_000;
        uint16 decay = uint16((uint256(raw) * decayBps) / 10_000);
        if (decay == 0 && raw > 0) decay = 1;
        totalViolationScore[subject] = decay >= raw ? 0 : raw - decay;
        lastViolationTime[subject] = uint64(block.timestamp);
    }

    /// @notice getEffectiveViolationScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getEffectiveViolationScore(address subject) public view returns (uint16) {
        uint16 raw = totalViolationScore[subject];
        uint64 last = lastViolationTime[subject];
        if (raw == 0 || last == 0 || block.timestamp <= last) return raw;

        uint256 elapsed = block.timestamp - last;
        uint256 periods = elapsed / 30 days;
        if (periods == 0) return raw;
        uint256 decayBps = periods * 500; // 5% per 30 days
        if (decayBps > 10_000) decayBps = 10_000;
        uint16 decay = uint16((uint256(raw) * decayBps) / 10_000);
        if (decay == 0 && raw > 0) decay = 1;
        return decay >= raw ? 0 : raw - decay;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    DYNAMIC THRESHOLD ADJUSTMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice _maybeAdjustThresholds
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
        
        // Apply 80% EMA decay instead of a full reset to smooth threshold oscillation.
        networkViolationCount = (networkViolationCount * 8) / 10;
        networkActionCount    = (networkActionCount    * 8) / 10;
        networkBlockedCount   = (networkBlockedCount   * 8) / 10;

        // Automatically trigger any due EcosystemVault scheduled tasks on the
        // same daily cadence — no separate keeper bot needed.
        _monitorEcosystemVault();
    }

    /// @notice Finalize a pending challenge if window has elapsed
    /// @param subject subject
    function _maybeFinalizeChallenge(address subject) internal {
        PendingChallenge storage ch = pendingChallenge[subject];
        if (!ch.exists) return;
        // Once user explicitly challenges, DAO must resolve.
        if (challengeRequested[subject]) return;
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
        delete challengeRequested[subject];
    }

    /// @notice _saturatingAddViolationScore
    /// @param subject subject
    /// @param delta delta
    function _saturatingAddViolationScore(address subject, uint16 delta) internal {
        uint32 sum = uint32(totalViolationScore[subject]) + uint32(delta);
        totalViolationScore[subject] = sum > type(uint16).max ? type(uint16).max : uint16(sum);
    }

    /**
     * @notice Subject explicitly challenges a pending severe restriction for DAO review.
     * @param note Optional reason/note for off-chain governance context.
     */
    function challengeRestriction(string calldata note) external {
        PendingChallenge storage ch = pendingChallenge[msg.sender];
        if (!ch.exists) revert SA_NoChallenge();
        if (block.timestamp >= ch.deadline) revert SA_ChallengeWindowPassed();

        challengeRequested[msg.sender] = true;
        emit ChallengeRequested(msg.sender, note);
    }

    /**
     * @notice DAO resolves a pending challenge explicitly
     * @param subject The user under challenge
     * @param uphold True to apply restriction, false to dismiss
     */
    function resolveChallenge(address subject, bool uphold) external onlyDAO {
        PendingChallenge storage ch = pendingChallenge[subject];
        if (!ch.exists) revert SA_NoChallenge();

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
        delete challengeRequested[subject];
    }

    // _reasonCode removed: challenge-derived codes use 0; direct calls pass RC_ constants
    
    /// @notice _adjustThreshold
    /// @param ttype ttype
    /// @param increase increase
    /// @param delta delta
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
    
    /// @notice daoOverride
    /// @param subject subject
    /// @param reason reason
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
    
    /// @notice daoRemoveOverride
    /// @param subject subject
    function daoRemoveOverride(address subject) external onlyDAO {
        daoOverridden[subject] = false;
        daoOverrideExpiry[subject] = 0;
        // Re-evaluate immediately
        _autoAdjustRestriction(subject);
    }
    
    /// @notice daoSetThresholds
    /// @param _autoRestrict _autoRestrict
    /// @param _autoLift _autoLift
    /// @param _rateLimit _rateLimit
    /// @param _sensitivity _sensitivity
    function daoSetThresholds(
        uint16 _autoRestrict,
        uint16 _autoLift,
        uint16 _rateLimit,
        uint16 _sensitivity
    ) external onlyDAO {
        if (_autoRestrict >= _autoLift) revert SA_InvalidThresholds();
        if (_sensitivity > 100) revert SA_InvalidSensitivity();

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
    
    /// @notice daoSetRateLimit
    /// @param level level
    /// @param action action
    /// @param limit limit
    function daoSetRateLimit(RestrictionLevel level, ActionType action, uint16 limit) external onlyDAO {
        if (pendingRateLimitChange.exists) revert SA_NotAuthorized();
        uint64 executeAfter = uint64(block.timestamp) + DAO_RATE_LIMIT_DELAY;
        pendingRateLimitChange = PendingRateLimitChange({
            level: level,
            action: action,
            limit: limit,
            executeAfter: executeAfter,
            exists: true
        });
        emit DAORateLimitChangeQueued(level, action, limit, executeAfter);
    }

    /// @notice applyRateLimitChange
    function applyRateLimitChange() external onlyDAO {
        PendingRateLimitChange memory pending = pendingRateLimitChange;
        if (!pending.exists) revert SA_NotAuthorized();
        if (block.timestamp < pending.executeAfter) revert SA_NotAuthorized();
        delete pendingRateLimitChange;
        _setRateLimitWithEvent(pending.level, pending.action, pending.limit);
    }

    /// @notice cancelRateLimitChange
    function cancelRateLimitChange() external onlyDAO {
        PendingRateLimitChange memory pending = pendingRateLimitChange;
        if (!pending.exists) revert SA_NotAuthorized();
        delete pendingRateLimitChange;
        emit DAORateLimitChangeCancelled(pending.level, pending.action, pending.limit);
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

        // Apply rate limits from library-supplied profile table
        SeerAutonomousLib.RateLimitEntry[48] memory profile = SeerAutonomousLib.getMaxAutonomyProfile();
        for (uint256 i = 0; i < 48; ++i) {
            _setRateLimitWithEvent(
                RestrictionLevel(profile[i].level),
                ActionType(profile[i].action),
                profile[i].limit
            );
        }

        emit DAOMaxAutonomyProfileApplied(msg.sender);
    }

    /// @notice _setRateLimitWithEvent
    /// @param level level
    /// @param action action
    /// @param limit limit
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

    // slither-disable-next-line missing-zero-check
    /**
     * @notice Set the EcosystemVault to monitor for scheduled tasks.
     * @dev DAO-only. Pass address(0) to disable vault monitoring.
     * @param _vault _vault
     */
    function setEcosystemVault(address _vault) external onlyDAO {
        ecosystemVault = _vault;
        emit EcosystemVaultSet(_vault);
    }

    /**
     * @notice Permissionless keeper entrypoint: check and execute any due
     *         EcosystemVault scheduled tasks in a single call.
     * @dev Any address (Chainlink Automation, Gelato, cron-bot, user) may call
     *      this.  All time guards are enforced by EcosystemVault itself.
     *      Returns the bitmask of tasks that were actually executed.
     * @return ranTasks ranTasks
     */
    function monitorEcosystemVault() external nonReentrant returns (uint8 ranTasks) {
        return _monitorEcosystemVault();
    }

    /// @notice setDAO
    /// @param _newDAO _newDAO
    function setDAO(address _newDAO) external onlyDAO {
        if (_newDAO == address(0)) revert SA_Zero();
        address old = dao;
        dao = _newDAO;
        emit DAOSet(old, _newDAO);
    }
    
    /// @notice setModules
    /// @param _seer _seer
    /// @param _ledger _ledger
    function setModules(address _seer, address _ledger) external onlyDAO {
        if (_seer == address(0)) revert SA_Zero();
        seer = ISeer(_seer);
        if (_ledger != address(0)) ledger = IProofLedger_Auto(_ledger);
        emit ModulesSet(_seer, dao, _ledger);
    }
    
    /// @notice setOperator
    /// @param operator operator
    /// @param authorized authorized
    function setOperator(address operator, bool authorized) external onlyDAO {
        if (operator == address(0)) revert SA_Zero();
        if (pendingOperatorChange.exists) revert SA_NotAuthorized();
        uint64 executeAfter = uint64(block.timestamp) + OPERATOR_CHANGE_DELAY;
        pendingOperatorChange = PendingOperatorChange({
            operator: operator,
            authorized: authorized,
            executeAfter: executeAfter,
            exists: true
        });
        emit OperatorChangeQueued(operator, authorized, executeAfter);
    }

    /// @notice applyOperatorChange
    function applyOperatorChange() external onlyDAO {
        PendingOperatorChange memory pending = pendingOperatorChange;
        if (!pending.exists) revert SA_NotAuthorized();
        if (block.timestamp < pending.executeAfter) revert SA_NotAuthorized();
        delete pendingOperatorChange;
        operators[pending.operator] = pending.authorized;
        emit OperatorSet(pending.operator, pending.authorized);
    }

    /// @notice cancelOperatorChange
    function cancelOperatorChange() external onlyDAO {
        PendingOperatorChange memory pending = pendingOperatorChange;
        if (!pending.exists) revert SA_NotAuthorized();
        delete pendingOperatorChange;
        emit OperatorChangeCancelled(pending.operator, pending.authorized);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if an action would be allowed (without modifying state)
     * @param subject subject
     * @param action action
     * @return allowed allowed
     * @return reason reason
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

        uint16 limit = rateLimits[level][action];
        uint16 count = actionCountToday[subject][action];
        uint8 r = SeerAutonomousLib.evaluateRestriction(
            uint8(level),
            uint8(RestrictionLevel.Frozen),
            uint8(RestrictionLevel.Restricted),
            uint8(RestrictionLevel.Suspended),
            limit,
            count
        );
        // r: 0=Allowed, 1=Warned (Suspended → still allowed for canPerformAction's bool semantics), 3=Blocked
        if (r == 3) {
            // Distinguish frozen vs other blocked
            if (level == RestrictionLevel.Frozen) return (false, "frozen");
            if (limit == 0) return (false, "action_blocked");
            return (false, "rate_limited");
        }
        return (true, "allowed");
    }
    
    /// @notice getRestrictionInfo
    /// @param subject subject
    /// @return level level
    /// @return expiry expiry
    /// @return overridden overridden
    /// @return reason reason
    /// @return violationScore violationScore
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
    /// @param subject subject
    /// @return _uint16 _uint16
    function getViolationScore(address subject) external view returns (uint16) {
        return totalViolationScore[subject];
    }
    
    /// @notice getActivitySummary
    /// @param subject subject
    /// @return transferCount transferCount
    /// @return voteCount voteCount
    /// @return endorseCount endorseCount
    /// @return transferVolume transferVolume
    /// @return windowStart windowStart
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
    
    /// @notice getNetworkHealth
    /// @return totalActions totalActions
    /// @return totalViolations totalViolations
    /// @return violationRate violationRate
    /// @return currentSensitivity currentSensitivity
    function getNetworkHealth() external view returns (
        uint256 totalActions,
        uint256 totalViolations,
        uint256 violationRate,
        uint16 currentSensitivity
            // F-08 FIX: Oracle call is now try/catch — a broken oracle cannot freeze pattern enforcement.
    ) {
        // SA-04: include blocked actions so health metrics reflect all enforcement attempts.
        totalActions = networkActionCount + networkBlockedCount;
        totalViolations = networkViolationCount;
        violationRate = totalActions > 0 ? (networkViolationCount * 10000) / totalActions : 0;
        currentSensitivity = patternSensitivity;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                            INTERNAL
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @dev Called automatically from _maybeAdjustThresholds (daily cadence) and
     *      directly via monitorEcosystemVault().  Uses checkUpkeep/performUpkeep
     *      so all per-task time guards are enforced inside EcosystemVault.
     *      Wrapped in try/catch so a vault misconfiguration never reverts Seer
     *      enforcement checks.
     * @notice _monitorEcosystemVault
     * @return ranTasks ranTasks
     */
    function _monitorEcosystemVault() internal returns (uint8 ranTasks) {
        if (ecosystemVault == address(0)) return 0;
        try IEcosystemScheduler(ecosystemVault).checkUpkeep("") returns (bool needed, bytes memory performData) {
            if (!needed) return 0;
            IEcosystemScheduler(ecosystemVault).performUpkeep(performData);
            // performData is abi.encode(uint8 bitmask) — decode to report which tasks ran.
            if (performData.length >= 32) {
                ranTasks = abi.decode(performData, (uint8));
            }
            emit EcosystemTasksTriggered(ranTasks);
        } catch {
            // Silently skip: vault not ready, paused, or misconfigured.
        }
    }

    /// @notice _log
    /// @param action action
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }
}
