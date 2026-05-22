// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Seer } from "../Seer.sol";
import { BadgeRegistry } from "./BadgeRegistry.sol";
import { IBadgeQualificationRules } from "./BadgeQualificationRules.sol";

/**
 * @title BadgeManager
 * @notice Automatic badge awarding based on user actions
 * @dev Integrates with Seer to grant badges and boost ProofScore automatically
 * 
 * Philosophy: Badges are earned through ACTIONS, not purchased.
 * Each badge comes with ProofScore boost, creating a transparent reputation ladder.
 * @author Vfide
 */
contract BadgeManager {
    
    // ════════════════════════════════════════════════════════════════════════
    //                           STATE VARIABLES
    // ════════════════════════════════════════════════════════════════════════
    
    /// @notice dao
    address public dao;
    /// @notice seer
    Seer public seer;
    /// @notice qualificationRules
    IBadgeQualificationRules public qualificationRules;
    
    /// @notice Track user statistics for badge qualification
    struct UserStats {
        uint32 commerceTxCount;           // Total commerce transactions
        uint32 consecutiveDays;           // Current streak of daily activity
        uint32 governanceVotes;           // Total governance votes cast
        uint32 successfulTrades;          // Successful (non-disputed) trades
        uint32 endorsementsReceived;      // Endorsements from others
        uint32 referralsMade;             // Users referred
        uint32 referralsQualified;        // Referred users who reached 600+ score
        uint32 disputesMediated;          // Disputes resolved through mediation
        uint32 fraudReports;              // Confirmed fraud reports
        uint32 educationalContent;        // Educational pieces created
        uint64 lastActivityDay;           // Last day of activity (for streak tracking)
        uint64 firstActivity;             // First interaction timestamp
        uint64 lastScoreDropBelow700;     // Last time score dropped below 700
        bool hasContributed;              // Made code/design contribution
        bool hasTranslated;               // Translated docs
    }
    
    /// @notice userStats
    mapping(address => UserStats) public userStats;
    
    /// @notice Track badge checks to avoid redundant processing
    mapping(address => mapping(bytes32 => uint64)) public lastBadgeCheck;
    
    /// @notice Authorized callers (Commerce, DAO, etc.)
    mapping(address => bool) public operators;
    // H-33 FIX: Per-selector operator authorization.
    // If a selector has ANY per-selector entry, only those explicitly approved may call it.
    // This lets DAO restrict, e.g., an operator to only awardBadge and not awardPioneer.
    /// @notice selectorOperators
    mapping(bytes4 => mapping(address => bool)) public selectorOperators;
    /// @notice selectorRestricted
    mapping(bytes4 => bool) public selectorRestricted; // true = use per-selector whitelist
    /// @notice _guardLock
    uint256 private _guardLock;
    
    /// @notice Pioneer counter (first 10,000 users)
    uint32 public pioneerCount;
    /// @notice MAX_PIONEERS
    uint32 public constant MAX_PIONEERS = 10_000;
    
    /// @notice Founding member counter (first 1,000 to reach 800+)
    uint32 public foundingMemberCount;
    /// @notice MAX_FOUNDING_MEMBERS
    uint32 public constant MAX_FOUNDING_MEMBERS = 1_000;

    /// @notice pendingOperatorStatus
    mapping(address => bool) public pendingOperatorStatus;
    /// @notice pendingOperatorAt
    mapping(address => uint256) public pendingOperatorAt;
    /// @notice OPERATOR_CHANGE_DELAY
    uint256 public constant OPERATOR_CHANGE_DELAY = 24 hours;

    /// @notice pendingQualificationRules
    address public pendingQualificationRules;
    /// @notice pendingQualificationRulesAt
    uint256 public pendingQualificationRulesAt;
    /// @notice QUALIFICATION_RULES_DELAY
    uint256 public constant QUALIFICATION_RULES_DELAY = 48 hours;
    
    // ════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ════════════════════════════════════════════════════════════════════════
    
    /// @notice BadgeEarned
    /// @param user user
    /// @param badge badge
    /// @param expiry expiry
    /// @param scoreBoost scoreBoost
    event BadgeEarned(address indexed user, bytes32 indexed badge, uint256 expiry, uint16 scoreBoost);
    /// @notice BadgeRevoked
    /// @param user user
    /// @param badge badge
    /// @param reason reason
    event BadgeRevoked(address indexed user, bytes32 indexed badge, string reason);
    /// @notice BadgeRenewed
    /// @param user user
    /// @param badge badge
    /// @param newExpiry newExpiry
    event BadgeRenewed(address indexed user, bytes32 indexed badge, uint256 newExpiry);
    /// @notice OperatorSet
    /// @param operator operator
    /// @param authorized authorized
    event OperatorSet(address indexed operator, bool authorized);
    /// @notice OperatorChangeProposed
    /// @param operator operator
    /// @param authorized authorized
    /// @param effectiveAt effectiveAt
    event OperatorChangeProposed(address indexed operator, bool authorized, uint256 effectiveAt);
    /// @notice StatsUpdated
    /// @param user user
    /// @param metric metric
    /// @param newValue newValue
    event StatsUpdated(address indexed user, string metric, uint32 newValue);
    /// @notice QualificationRulesSet
    /// @param oldRules oldRules
    /// @param newRules newRules
    event QualificationRulesSet(address indexed oldRules, address indexed newRules);
    /// @notice QualificationRulesChangeProposed
    /// @param newRules newRules
    /// @param effectiveAt effectiveAt
    event QualificationRulesChangeProposed(address indexed newRules, uint256 effectiveAt);
    
    // ════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ════════════════════════════════════════════════════════════════════════
    
    /// @notice BM_NotDAO
    error BM_NotDAO();
    /// @notice BM_NotOperator
    error BM_NotOperator();
    /// @notice BM_Zero
    error BM_Zero();
    /// @notice BM_InvalidBadge
    error BM_InvalidBadge();
    /// @notice BM_ReentrantCall
    error BM_ReentrantCall();
    /// @notice BM_NotPending
    error BM_NotPending();
    /// @notice BM_Timelocked
    /// @param effectiveAt effectiveAt
    error BM_Timelocked(uint256 effectiveAt);
    
    // ════════════════════════════════════════════════════════════════════════
    //                           MODIFIERS
    // ════════════════════════════════════════════════════════════════════════
    
    /// @notice onlyDAO
    modifier onlyDAO() {
        if (msg.sender != dao) revert BM_NotDAO();
        _;
    }
    
    /// @notice onlyOperator
    modifier onlyOperator() {
        bytes4 sel = msg.sig;
        if (selectorRestricted[sel]) {
            // Per-selector mode: only DAO or an explicitly selector-approved operator.
            if (msg.sender != dao && !selectorOperators[sel][msg.sender]) revert BM_NotOperator();
        } else {
            // Global operator mode.
            if (msg.sender != dao && !operators[msg.sender]) revert BM_NotOperator();
        }
        _;
    }

    /// @notice nonReentrantBM
    modifier nonReentrantBM() {
        if (_guardLock != 0) revert BM_ReentrantCall();
        _guardLock = 1;
        _;
        _guardLock = 0;
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ════════════════════════════════════════════════════════════════════════
    
    /// @notice constructor
    /// @param _dao _dao
    /// @param _seer _seer
    /// @param _qualificationRules _qualificationRules
    constructor(address _dao, address _seer, address _qualificationRules) {
        if (_dao == address(0) || _seer == address(0) || _qualificationRules == address(0)) revert BM_Zero();
        dao = _dao;
        seer = Seer(_seer);
        qualificationRules = IBadgeQualificationRules(_qualificationRules);
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                          ADMIN FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════
    
    /// @notice setDAO
    /// @param newDAO newDAO
    function setDAO(address newDAO) external onlyDAO nonReentrantBM {
        if (newDAO == address(0)) revert BM_Zero();
        dao = newDAO;
    }
    
    /// @notice setSeer
    /// @param newSeer newSeer
    function setSeer(address newSeer) external onlyDAO nonReentrantBM {
        if (newSeer == address(0)) revert BM_Zero();
        seer = Seer(newSeer);
    }
    
    /// @notice setOperator
    /// @param operator operator
    /// @param authorized authorized
    function setOperator(address operator, bool authorized) external onlyDAO nonReentrantBM {
        if (operator == address(0)) revert BM_Zero();
        pendingOperatorStatus[operator] = authorized;
        pendingOperatorAt[operator] = block.timestamp + OPERATOR_CHANGE_DELAY;
        emit OperatorChangeProposed(operator, authorized, pendingOperatorAt[operator]);
    }

    /// @notice applyOperator
    /// @param operator operator
    function applyOperator(address operator) external onlyDAO nonReentrantBM {
        uint256 effectiveAt = pendingOperatorAt[operator];
        if (effectiveAt == 0) revert BM_NotPending();
        if (block.timestamp < effectiveAt) revert BM_Timelocked(effectiveAt);

        bool authorized = pendingOperatorStatus[operator];
        operators[operator] = authorized;
        pendingOperatorAt[operator] = 0;
        emit OperatorSet(operator, authorized);
    }

    /// @notice H-33 FIX: DAO can restrict a function selector to per-approved operators only.
    /// @param selector selector
    /// @param operator operator
    /// @param authorized authorized
    function setSelectorOperator(bytes4 selector, address operator, bool authorized) external onlyDAO nonReentrantBM {
        selectorOperators[selector][operator] = authorized;
        selectorRestricted[selector] = true; // once any per-selector entry exists, use per-selector mode
    }

    /// @notice H-33 FIX: DAO can revert a selector back to global operator mode.
    /// @param selector selector
    function clearSelectorRestriction(bytes4 selector) external onlyDAO nonReentrantBM {
        selectorRestricted[selector] = false;
    }

    /// @notice setQualificationRules
    /// @param newRules newRules
    function setQualificationRules(address newRules) external onlyDAO nonReentrantBM {
        if (newRules == address(0)) revert BM_Zero();
        pendingQualificationRules = newRules;
        pendingQualificationRulesAt = block.timestamp + QUALIFICATION_RULES_DELAY;
        emit QualificationRulesChangeProposed(newRules, pendingQualificationRulesAt);
    }

    /// @notice applyQualificationRules
    function applyQualificationRules() external onlyDAO nonReentrantBM {
        uint256 effectiveAt = pendingQualificationRulesAt;
        if (effectiveAt == 0) revert BM_NotPending();
        if (block.timestamp < effectiveAt) revert BM_Timelocked(effectiveAt);

        address newRules = pendingQualificationRules;
        address oldRules = address(qualificationRules);
        qualificationRules = IBadgeQualificationRules(newRules);
        pendingQualificationRules = address(0);
        pendingQualificationRulesAt = 0;
        emit QualificationRulesSet(oldRules, newRules);
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                      BADGE AWARDING LOGIC
    // ════════════════════════════════════════════════════════════════════════
    
    // slither-disable-next-line reentrancy-benign,reentrancy-events
    /**
     * @notice Award a badge to a user and boost their ProofScore
     * @param user The user address
     * @param badge The badge ID
     */
    function awardBadge(address user, bytes32 badge) public onlyOperator nonReentrantBM {
        // Skip if user already has this badge
        if (seer.hasBadge(user, badge)) {
            // Check if renewable and needs renewal
            _checkRenewal(user, badge);
            return;
        }
        
        // Determine expiry (0 = permanent)
        uint256 expiry = 0;
        if (!BadgeRegistry.isPermanent(badge)) {
            uint256 duration = BadgeRegistry.getRecommendedDuration(badge);
            expiry = block.timestamp + duration;
        }
        
        // Award badge in Seer
        try seer.setBadge(user, badge, true, expiry) {
            // Boost ProofScore by badge weight
            uint16 scoreBoost = BadgeRegistry.getRecommendedWeight(badge);
            if (scoreBoost > 0) {
                string memory reason = string(abi.encodePacked("Badge: ", BadgeRegistry.getName(badge)));
                try seer.reward(user, scoreBoost, reason) {} catch {}
            }

            emit BadgeEarned(user, badge, expiry, scoreBoost);
        } catch {}
    }

    // #497 FIX: badge revocation has a 7-day notice period before score penalty fires.
    /// @notice REVOKE_NOTICE_DELAY
    uint64 public constant REVOKE_NOTICE_DELAY = 7 days;
    /// @notice pendingRevocationAt
    mapping(address => mapping(bytes32 => uint64)) public pendingRevocationAt;
    /// @notice BadgeRevocationQueued
    /// @param user user
    /// @param badge badge
    /// @param effectiveAt effectiveAt
    /// @param reason reason
    event BadgeRevocationQueued(address indexed user, bytes32 indexed badge, uint64 effectiveAt, string reason);
    /// @notice BadgeRevocationCancelled
    /// @param user user
    /// @param badge badge
    event BadgeRevocationCancelled(address indexed user, bytes32 indexed badge);

    // slither-disable-next-line reentrancy-benign,reentrancy-events
    /// @notice revokeBadge
    /// @param user user
    /// @param badge badge
    /// @param reason reason
    function revokeBadge(address user, bytes32 badge, string calldata reason) external onlyDAO nonReentrantBM {
        if (!seer.hasBadge(user, badge)) return;
        require(pendingRevocationAt[user][badge] == 0, "BM: revocation already queued");
        uint64 effectiveAt = uint64(block.timestamp) + REVOKE_NOTICE_DELAY;
        pendingRevocationAt[user][badge] = effectiveAt;
        emit BadgeRevocationQueued(user, badge, effectiveAt, reason);
    }

    /// @notice applyRevokeBadge
    /// @param user user
    /// @param badge badge
    /// @param reason reason
    function applyRevokeBadge(address user, bytes32 badge, string calldata reason) external onlyDAO nonReentrantBM {
        require(pendingRevocationAt[user][badge] != 0 && block.timestamp >= pendingRevocationAt[user][badge], "BM: notice period");
        delete pendingRevocationAt[user][badge];
        if (!seer.hasBadge(user, badge)) return;
        try seer.setBadge(user, badge, false, 0) {
            uint16 scorePenalty = BadgeRegistry.getRecommendedWeight(badge);
            if (scorePenalty > 0) {
                try seer.punish(user, scorePenalty, reason) {} catch {}
            }
            emit BadgeRevoked(user, badge, reason);
        } catch {}
    }

    /// @notice cancelRevokeBadge
    /// @param user user
    /// @param badge badge
    function cancelRevokeBadge(address user, bytes32 badge) external onlyDAO nonReentrantBM {
        require(pendingRevocationAt[user][badge] != 0, "BM: no pending revocation");
        delete pendingRevocationAt[user][badge];
        emit BadgeRevocationCancelled(user, badge);
    }
    
    /**
     * @notice Check and renew renewable badges if still qualified
     * @param user The user address
     * @param badge The badge ID
     */
    function _checkRenewal(address user, bytes32 badge) internal {
        // Skip if badge is permanent
        if (BadgeRegistry.isPermanent(badge)) return;
        
        uint256 expiry = seer.badgeExpiry(user, badge);
        
        // Check if expired
        if (expiry > 0 && block.timestamp > expiry) {
            // User needs to re-qualify
            _recheckQualification(user, badge);
        } else if (expiry > 0 && block.timestamp > expiry - 7 days) {
            // Badge expiring soon, check if user still qualifies for early renewal
            _recheckQualification(user, badge);
        }
    }
    
    // slither-disable-next-line reentrancy-benign,reentrancy-events
    /**
     * @notice Re-check if user still qualifies for a renewable badge
     * @param user The user address
     * @param badge The badge ID
     */
    function _recheckQualification(address user, bytes32 badge) internal {
        bool stillQualified = _checkBadgeQualification(user, badge);
        
        if (stillQualified) {
            // Renew badge
            uint256 duration = BadgeRegistry.getRecommendedDuration(badge);
            uint256 newExpiry = block.timestamp + duration;
            
            try seer.setBadge(user, badge, true, newExpiry) {
                emit BadgeRenewed(user, badge, newExpiry);
            } catch {}
        } else {
            // Revoke expired badge
            try seer.setBadge(user, badge, false, 0) {
                uint16 scorePenalty = BadgeRegistry.getRecommendedWeight(badge);
                if (scorePenalty > 0) {
                    try seer.punish(user, scorePenalty, "Badge expired - not re-qualified") {} catch {}
                }
                emit BadgeRevoked(user, badge, "Failed to re-qualify");
            } catch {}
        }
    }
    
    /**
     * @notice Check if user qualifies for a specific badge
     * @param user The user address
     * @param badge The badge ID
     * @return qualified True if user meets requirements
     */
    function _checkBadgeQualification(address user, bytes32 badge) internal view returns (bool qualified) {
        UserStats memory stats = userStats[user];
        uint16 score = seer.getScore(user);

        return qualificationRules.checkQualification(
            stats.commerceTxCount,
            stats.consecutiveDays,
            stats.governanceVotes,
            stats.successfulTrades,
            stats.endorsementsReceived,
            stats.referralsMade,
            stats.referralsQualified,
            stats.fraudReports,
            stats.educationalContent,
            stats.lastScoreDropBelow700,
            score,
            badge,
            block.timestamp
        );
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                      STAT TRACKING FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Record a commerce transaction
     * @param user The user address
     * @param successful Whether transaction was successful (no dispute)
     */
    function recordCommerceTx(address user, bool successful) external onlyOperator nonReentrantBM {
        UserStats storage stats = userStats[user];
        ++stats.commerceTxCount;
        if (successful) {
            ++stats.successfulTrades;
        }
        
        _updateActivity(user);
        _checkBadgeEligibility(user);

        emit StatsUpdated(user, "commerceTx", stats.commerceTxCount);
    }
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Record a governance vote
     * @param user The user address
     */
    function recordGovernanceVote(address user) external onlyOperator nonReentrantBM {
        UserStats storage stats = userStats[user];
        ++stats.governanceVotes;
        
        _updateActivity(user);
        _checkBadgeEligibility(user);

        emit StatsUpdated(user, "governanceVotes", stats.governanceVotes);
    }
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Record an endorsement received
     * @param user The user address
     */
    function recordEndorsement(address user) external onlyOperator nonReentrantBM {
        UserStats storage stats = userStats[user];
        ++stats.endorsementsReceived;
        
        _checkBadgeEligibility(user);

        emit StatsUpdated(user, "endorsements", stats.endorsementsReceived);
    }
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Record a referral
     * @param referrer The referrer address
     * @param qualified Whether referred user reached 600+ score
     * @param _address _address
     */
    function recordReferral(address referrer, address /*referred*/, bool qualified) external onlyOperator nonReentrantBM {
        UserStats storage stats = userStats[referrer];
        ++stats.referralsMade;
        if (qualified) {
            ++stats.referralsQualified;
        }
        
        _checkBadgeEligibility(referrer);

        emit StatsUpdated(referrer, "referrals", stats.referralsMade);
    }
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Record fraud report confirmation
     * @param reporter The reporter address
     */
    function recordFraudReport(address reporter) external onlyOperator nonReentrantBM {
        UserStats storage stats = userStats[reporter];
        ++stats.fraudReports;
        
        _checkBadgeEligibility(reporter);

        emit StatsUpdated(reporter, "fraudReports", stats.fraudReports);
    }
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Record educational content creation
     * @param creator The creator address
     */
    function recordEducationalContent(address creator) external onlyOperator nonReentrantBM {
        UserStats storage stats = userStats[creator];
        ++stats.educationalContent;
        
        _checkBadgeEligibility(creator);

        emit StatsUpdated(creator, "education", stats.educationalContent);
    }
    
    /**
     * @notice Record contribution (code/design/content)
     * @param contributor The contributor address
     */
    function recordContribution(address contributor) external onlyDAO nonReentrantBM {
        UserStats storage stats = userStats[contributor];
        if (!stats.hasContributed) {
            stats.hasContributed = true;
            
            // Auto-award Contributor badge
            awardBadge(contributor, BadgeRegistry.CONTRIBUTOR);
        }
    }
    
    /**
     * @notice Record translation work
     * @param translator The translator address
     */
    function recordTranslation(address translator) external onlyDAO nonReentrantBM {
        UserStats storage stats = userStats[translator];
        if (!stats.hasTranslated) {
            stats.hasTranslated = true;
            
            // Auto-award Translator badge
            awardBadge(translator, BadgeRegistry.TRANSLATOR);
        }
    }
    
    /**
     * @notice Award Pioneer badge (first 10,000 users)
     * @param user The user address
     */
    function awardPioneer(address user) external onlyOperator nonReentrantBM {
        if (pioneerCount >= MAX_PIONEERS) return;
        if (seer.hasBadge(user, BadgeRegistry.PIONEER)) return;
        
        ++pioneerCount;
        awardBadge(user, BadgeRegistry.PIONEER);
    }
    
    /**
     * @notice Award Founding Member badge (first 1,000 to reach 800+)
     * @param user The user address
     */
    function awardFoundingMember(address user) external onlyOperator nonReentrantBM {
        if (foundingMemberCount >= MAX_FOUNDING_MEMBERS) return;
        if (seer.hasBadge(user, BadgeRegistry.FOUNDING_MEMBER)) return;
        if (seer.getScore(user) < 8000) return; // 800 on 0-10000 scale
        
        ++foundingMemberCount;
        awardBadge(user, BadgeRegistry.FOUNDING_MEMBER);
    }
    
    /**
     * @notice Update daily activity streak
     * @param user The user address
     */
    function _updateActivity(address user) internal {
        UserStats storage stats = userStats[user];
        
        // Initialize first activity
        if (stats.firstActivity == 0) {
            stats.firstActivity = uint64(block.timestamp);
        }
        
        // Calculate current day
        uint64 currentDay = uint64(block.timestamp / 1 days);
        
        // Check if this is a new day
        if (stats.lastActivityDay == 0) {
            // First activity
            stats.consecutiveDays = 1;
            stats.lastActivityDay = currentDay;
        } else if (currentDay == stats.lastActivityDay) {
            // Same day, no change
            return;
        } else if (currentDay == stats.lastActivityDay + 1) {
            // Consecutive day, increment streak
            ++stats.consecutiveDays;
            stats.lastActivityDay = currentDay;
        } else {
            // Streak broken
            stats.consecutiveDays = 1;
            stats.lastActivityDay = currentDay;
        }
        
        emit StatsUpdated(user, "consecutiveDays", stats.consecutiveDays);
    }
    
    /**
     * @notice Check all badge eligibility after stat update
     * @param user The user address
     */
    function _checkBadgeEligibility(address user) internal {
        bytes32[10] memory badges = [
            BadgeRegistry.ACTIVE_TRADER,
            BadgeRegistry.GOVERNANCE_VOTER,
            BadgeRegistry.POWER_USER,
            BadgeRegistry.DAILY_CHAMPION,
            BadgeRegistry.VERIFIED_MERCHANT,
            BadgeRegistry.ELITE_ACHIEVER,
            BadgeRegistry.COMMUNITY_BUILDER,
            BadgeRegistry.FRAUD_HUNTER,
            BadgeRegistry.EDUCATOR,
            BadgeRegistry.MENTOR
        ];

        for (uint256 i = 0; i < badges.length; ++i) {
            _checkAndAwardBadge(user, badges[i]);
        }
    }

    /// @notice _checkAndAwardBadge
    /// @param user user
    /// @param badge badge
    function _checkAndAwardBadge(address user, bytes32 badge) internal {
        if (_checkBadgeQualification(user, badge)) {
            awardBadge(user, badge);
        }
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get user statistics
     * @param user The user address
     * @return stats The user's statistics
     * @return _arg _arg
     */
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }

    /**
     * @notice Public qualification check for external view helpers
     * @param user The user address
     * @param badge The badge ID
     * @return qualified True if user meets requirements
     */
    function checkBadgeQualification(address user, bytes32 badge) external view returns (bool qualified) {
        return _checkBadgeQualification(user, badge);
    }
    
}
