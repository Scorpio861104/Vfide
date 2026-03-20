// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDETrust.sol";
import "./BadgeRegistry.sol";
import "./SharedInterfaces.sol";
import "./BadgeQualificationRules.sol";

/**
 * @title BadgeManager
 * @notice Automatic badge awarding based on user actions
 * @dev Integrates with Seer to grant badges and boost ProofScore automatically
 * 
 * Philosophy: Badges are earned through ACTIONS, not purchased.
 * Each badge comes with ProofScore boost, creating a transparent reputation ladder.
 */
contract BadgeManager {
    
    // ════════════════════════════════════════════════════════════════════════
    //                           STATE VARIABLES
    // ════════════════════════════════════════════════════════════════════════
    
    address public dao;
    Seer public seer;
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
        bool hasPresaleParticipation;     // Participated in presale
        bool hasContributed;              // Made code/design contribution
        bool hasTranslated;               // Translated docs
    }
    
    mapping(address => UserStats) public userStats;
    
    /// @notice Track badge checks to avoid redundant processing
    mapping(address => mapping(bytes32 => uint64)) public lastBadgeCheck;
    
    /// @notice Authorized callers (Commerce, DAO, etc.)
    mapping(address => bool) public operators;
    
    /// @notice Pioneer counter (first 10,000 users)
    uint32 public pioneerCount;
    uint32 public constant MAX_PIONEERS = 10_000;
    
    /// @notice Founding member counter (first 1,000 to reach 800+)
    uint32 public foundingMemberCount;
    uint32 public constant MAX_FOUNDING_MEMBERS = 1_000;
    
    // ════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ════════════════════════════════════════════════════════════════════════
    
    event BadgeEarned(address indexed user, bytes32 indexed badge, uint256 expiry, uint16 scoreBoost);
    event BadgeRevoked(address indexed user, bytes32 indexed badge, string reason);
    event BadgeRenewed(address indexed user, bytes32 indexed badge, uint256 newExpiry);
    event OperatorSet(address indexed operator, bool authorized);
    event StatsUpdated(address indexed user, string metric, uint32 newValue);
    
    // ════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ════════════════════════════════════════════════════════════════════════
    
    error BM_NotDAO();
    error BM_NotOperator();
    error BM_Zero();
    error BM_InvalidBadge();
    
    // ════════════════════════════════════════════════════════════════════════
    //                           MODIFIERS
    // ════════════════════════════════════════════════════════════════════════
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert BM_NotDAO();
        _;
    }
    
    modifier onlyOperator() {
        if (msg.sender != dao && !operators[msg.sender]) revert BM_NotOperator();
        _;
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ════════════════════════════════════════════════════════════════════════
    
    constructor(address _dao, address _seer, address _qualificationRules) {
        if (_dao == address(0) || _seer == address(0) || _qualificationRules == address(0)) revert BM_Zero();
        dao = _dao;
        seer = Seer(_seer);
        qualificationRules = IBadgeQualificationRules(_qualificationRules);
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                          ADMIN FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════
    
    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert BM_Zero();
        dao = newDAO;
    }
    
    function setSeer(address newSeer) external onlyDAO {
        if (newSeer == address(0)) revert BM_Zero();
        seer = Seer(newSeer);
    }
    
    function setOperator(address operator, bool authorized) external onlyDAO {
        if (operator == address(0)) revert BM_Zero();
        operators[operator] = authorized;
        emit OperatorSet(operator, authorized);
    }

    function setQualificationRules(address newRules) external onlyDAO {
        if (newRules == address(0)) revert BM_Zero();
        qualificationRules = IBadgeQualificationRules(newRules);
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                      BADGE AWARDING LOGIC
    // ════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Award a badge to a user and boost their ProofScore
     * @param user The user address
     * @param badge The badge ID
     */
    function awardBadge(address user, bytes32 badge) public onlyOperator {
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
    
    /**
     * @notice Revoke a badge from a user and penalize ProofScore
     * @param user The user address
     * @param badge The badge ID
     * @param reason Reason for revocation
     */
    function revokeBadge(address user, bytes32 badge, string calldata reason) external onlyDAO {
        if (!seer.hasBadge(user, badge)) return;
        
        // Revoke badge in Seer
        try seer.setBadge(user, badge, false, 0) {
            // Penalize ProofScore by badge weight
            uint16 scorePenalty = BadgeRegistry.getRecommendedWeight(badge);
            if (scorePenalty > 0) {
                try seer.punish(user, scorePenalty, reason) {} catch {}
            }

            emit BadgeRevoked(user, badge, reason);
        } catch {}
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
    
    /**
     * @notice Record a commerce transaction
     * @param user The user address
     * @param successful Whether transaction was successful (no dispute)
     */
    function recordCommerceTx(address user, bool successful) external onlyOperator {
        UserStats storage stats = userStats[user];
        stats.commerceTxCount++;
        if (successful) {
            stats.successfulTrades++;
        }
        
        _updateActivity(user);
        _checkBadgeEligibility(user);

        emit StatsUpdated(user, "commerceTx", stats.commerceTxCount);
    }
    
    /**
     * @notice Record a governance vote
     * @param user The user address
     */
    function recordGovernanceVote(address user) external onlyOperator {
        UserStats storage stats = userStats[user];
        stats.governanceVotes++;
        
        _updateActivity(user);
        _checkBadgeEligibility(user);

        emit StatsUpdated(user, "governanceVotes", stats.governanceVotes);
    }
    
    /**
     * @notice Record an endorsement received
     * @param user The user address
     */
    function recordEndorsement(address user) external onlyOperator {
        UserStats storage stats = userStats[user];
        stats.endorsementsReceived++;
        
        _checkBadgeEligibility(user);

        emit StatsUpdated(user, "endorsements", stats.endorsementsReceived);
    }
    
    /**
     * @notice Record a referral
     * @param referrer The referrer address
     * @param qualified Whether referred user reached 600+ score
     */
    function recordReferral(address referrer, address /*referred*/, bool qualified) external onlyOperator {
        UserStats storage stats = userStats[referrer];
        stats.referralsMade++;
        if (qualified) {
            stats.referralsQualified++;
        }
        
        _checkBadgeEligibility(referrer);

        emit StatsUpdated(referrer, "referrals", stats.referralsMade);
    }
    
    /**
     * @notice Record fraud report confirmation
     * @param reporter The reporter address
     */
    function recordFraudReport(address reporter) external onlyOperator {
        UserStats storage stats = userStats[reporter];
        stats.fraudReports++;
        
        _checkBadgeEligibility(reporter);

        emit StatsUpdated(reporter, "fraudReports", stats.fraudReports);
    }
    
    /**
     * @notice Record educational content creation
     * @param creator The creator address
     */
    function recordEducationalContent(address creator) external onlyOperator {
        UserStats storage stats = userStats[creator];
        stats.educationalContent++;
        
        _checkBadgeEligibility(creator);

        emit StatsUpdated(creator, "education", stats.educationalContent);
    }
    
    /**
     * @notice Record presale participation
     * @param user The user address
     */
    function recordPresaleParticipation(address user) external onlyOperator {
        UserStats storage stats = userStats[user];
        if (!stats.hasPresaleParticipation) {
            stats.hasPresaleParticipation = true;
            
            // Auto-award Genesis Presale badge
            awardBadge(user, BadgeRegistry.GENESIS_PRESALE);
        }
    }
    
    /**
     * @notice Record contribution (code/design/content)
     * @param contributor The contributor address
     */
    function recordContribution(address contributor) external onlyDAO {
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
    function recordTranslation(address translator) external onlyDAO {
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
    function awardPioneer(address user) external onlyOperator {
        if (pioneerCount >= MAX_PIONEERS) return;
        if (seer.hasBadge(user, BadgeRegistry.PIONEER)) return;
        
        pioneerCount++;
        awardBadge(user, BadgeRegistry.PIONEER);
    }
    
    /**
     * @notice Award Founding Member badge (first 1,000 to reach 800+)
     * @param user The user address
     */
    function awardFoundingMember(address user) external onlyOperator {
        if (foundingMemberCount >= MAX_FOUNDING_MEMBERS) return;
        if (seer.hasBadge(user, BadgeRegistry.FOUNDING_MEMBER)) return;
        if (seer.getScore(user) < 8000) return; // 800 on 0-10000 scale
        
        foundingMemberCount++;
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
            stats.consecutiveDays++;
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

        for (uint256 i = 0; i < badges.length; i++) {
            _checkAndAwardBadge(user, badges[i]);
        }
    }

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
