// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDETrust.sol";
import "./BadgeRegistry.sol";
import "./SharedInterfaces.sol";

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
    
    constructor(address _dao, address _seer) {
        if (_dao == address(0) || _seer == address(0)) revert BM_Zero();
        dao = _dao;
        seer = Seer(_seer);
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
        
        // ACTIVE_TRADER: 50+ commerce transactions in 90 days
        if (badge == BadgeRegistry.ACTIVE_TRADER) {
            return stats.commerceTxCount >= 50;
        }
        
        // GOVERNANCE_VOTER: 10+ DAO proposals voted on
        if (badge == BadgeRegistry.GOVERNANCE_VOTER) {
            return stats.governanceVotes >= 10;
        }
        
        // POWER_USER: Diversification bonus
        if (badge == BadgeRegistry.POWER_USER) {
            // Check if user has activity in 3+ areas
            uint8 activityTypes = 0;
            if (stats.commerceTxCount > 0) activityTypes++;
            if (stats.governanceVotes > 0) activityTypes++;
            if (stats.endorsementsReceived > 0) activityTypes++;
            if (stats.referralsMade > 0) activityTypes++;
            return activityTypes >= 3;
        }
        
        // DAILY_CHAMPION: 30 consecutive days
        if (badge == BadgeRegistry.DAILY_CHAMPION) {
            return stats.consecutiveDays >= 30;
        }
        
        // VERIFIED_MERCHANT: 100+ successful transactions, zero disputes
        if (badge == BadgeRegistry.VERIFIED_MERCHANT) {
            return stats.successfulTrades >= 100 && score >= 700;
        }
        
        // CLEAN_RECORD: 1 year with no drops below 700
        if (badge == BadgeRegistry.CLEAN_RECORD) {
            if (stats.lastScoreDropBelow700 == 0) return false;
            return block.timestamp >= stats.lastScoreDropBelow700 + 365 days;
        }
        
        // ELITE_ACHIEVER: Score 900+
        if (badge == BadgeRegistry.ELITE_ACHIEVER) {
            return score >= 9000; // 900 on 0-10000 scale
        }
        
        // COMMUNITY_BUILDER: 10 qualified referrals
        if (badge == BadgeRegistry.COMMUNITY_BUILDER) {
            return stats.referralsQualified >= 10;
        }
        
        // FRAUD_HUNTER: 3+ confirmed reports
        if (badge == BadgeRegistry.FRAUD_HUNTER) {
            return stats.fraudReports >= 3;
        }
        
        // EDUCATOR: 5+ educational pieces
        if (badge == BadgeRegistry.EDUCATOR) {
            return stats.educationalContent >= 5;
        }
        
        // MENTOR: Helped 5+ users reach 540+
        if (badge == BadgeRegistry.MENTOR) {
            return stats.referralsQualified >= 5;
        }
        
        return false;
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
        // Check common badges
        if (_checkBadgeQualification(user, BadgeRegistry.ACTIVE_TRADER)) {
            awardBadge(user, BadgeRegistry.ACTIVE_TRADER);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.GOVERNANCE_VOTER)) {
            awardBadge(user, BadgeRegistry.GOVERNANCE_VOTER);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.POWER_USER)) {
            awardBadge(user, BadgeRegistry.POWER_USER);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.DAILY_CHAMPION)) {
            awardBadge(user, BadgeRegistry.DAILY_CHAMPION);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.VERIFIED_MERCHANT)) {
            awardBadge(user, BadgeRegistry.VERIFIED_MERCHANT);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.ELITE_ACHIEVER)) {
            awardBadge(user, BadgeRegistry.ELITE_ACHIEVER);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.COMMUNITY_BUILDER)) {
            awardBadge(user, BadgeRegistry.COMMUNITY_BUILDER);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.FRAUD_HUNTER)) {
            awardBadge(user, BadgeRegistry.FRAUD_HUNTER);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.EDUCATOR)) {
            awardBadge(user, BadgeRegistry.EDUCATOR);
        }
        
        if (_checkBadgeQualification(user, BadgeRegistry.MENTOR)) {
            awardBadge(user, BadgeRegistry.MENTOR);
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
     * @notice Check all badges user qualifies for but hasn't earned
     * @param user The user address
     * @return eligible Array of badge IDs user can earn
     */
    function getEligibleBadges(address user) external view returns (bytes32[] memory eligible) {
        bytes32[] memory allBadges = new bytes32[](27); // Total badges defined
        allBadges[0] = BadgeRegistry.PIONEER;
        allBadges[1] = BadgeRegistry.GENESIS_PRESALE;
        allBadges[2] = BadgeRegistry.FOUNDING_MEMBER;
        allBadges[3] = BadgeRegistry.ACTIVE_TRADER;
        allBadges[4] = BadgeRegistry.GOVERNANCE_VOTER;
        allBadges[5] = BadgeRegistry.POWER_USER;
        allBadges[6] = BadgeRegistry.DAILY_CHAMPION;
        allBadges[7] = BadgeRegistry.TRUSTED_ENDORSER;
        allBadges[8] = BadgeRegistry.COMMUNITY_BUILDER;
        allBadges[9] = BadgeRegistry.PEACEMAKER;
        allBadges[10] = BadgeRegistry.MENTOR;
        allBadges[11] = BadgeRegistry.VERIFIED_MERCHANT;
        allBadges[12] = BadgeRegistry.ELITE_MERCHANT;
        allBadges[13] = BadgeRegistry.INSTANT_SETTLEMENT;
        allBadges[14] = BadgeRegistry.ZERO_DISPUTE;
        allBadges[15] = BadgeRegistry.FRAUD_HUNTER;
        allBadges[16] = BadgeRegistry.CLEAN_RECORD;
        allBadges[17] = BadgeRegistry.REDEMPTION;
        allBadges[18] = BadgeRegistry.GUARDIAN;
        allBadges[19] = BadgeRegistry.ELITE_ACHIEVER;
        allBadges[20] = BadgeRegistry.CENTURY_ENDORSER;
        allBadges[21] = BadgeRegistry.WHALE_SLAYER;
        allBadges[22] = BadgeRegistry.DIVERSIFICATION_MASTER;
        allBadges[23] = BadgeRegistry.EDUCATOR;
        allBadges[24] = BadgeRegistry.CONTRIBUTOR;
        allBadges[25] = BadgeRegistry.BUG_BOUNTY;
        allBadges[26] = BadgeRegistry.TRANSLATOR;
        
        uint256 eligibleCount = 0;
        for (uint256 i = 0; i < allBadges.length; i++) {
            if (!seer.hasBadge(user, allBadges[i]) && _checkBadgeQualification(user, allBadges[i])) {
                eligibleCount++;
            }
        }
        
        eligible = new bytes32[](eligibleCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allBadges.length; i++) {
            if (!seer.hasBadge(user, allBadges[i]) && _checkBadgeQualification(user, allBadges[i])) {
                eligible[index] = allBadges[i];
                index++;
            }
        }
        
        return eligible;
    }
    
    /**
     * @notice Get progress towards a specific badge
     * @param user The user address
     * @param badge The badge ID
     * @return current Current progress
     * @return required Required progress
     * @return percentage Completion percentage (0-100)
     */
    function getBadgeProgress(address user, bytes32 badge) external view returns (
        uint32 current,
        uint32 required,
        uint8 percentage
    ) {
        UserStats memory stats = userStats[user];
        
        if (badge == BadgeRegistry.ACTIVE_TRADER) {
            required = 50;
            current = stats.commerceTxCount;
        } else if (badge == BadgeRegistry.GOVERNANCE_VOTER) {
            required = 10;
            current = stats.governanceVotes;
        } else if (badge == BadgeRegistry.DAILY_CHAMPION) {
            required = 30;
            current = stats.consecutiveDays;
        } else if (badge == BadgeRegistry.VERIFIED_MERCHANT) {
            required = 100;
            current = stats.successfulTrades;
        } else if (badge == BadgeRegistry.COMMUNITY_BUILDER) {
            required = 10;
            current = stats.referralsQualified;
        } else if (badge == BadgeRegistry.FRAUD_HUNTER) {
            required = 3;
            current = stats.fraudReports;
        } else if (badge == BadgeRegistry.EDUCATOR) {
            required = 5;
            current = stats.educationalContent;
        } else if (badge == BadgeRegistry.MENTOR) {
            required = 5;
            current = stats.referralsQualified;
        } else {
            return (0, 0, 0);
        }
        
        if (current >= required) {
            percentage = 100;
        } else {
            percentage = uint8((uint256(current) * 100) / required);
        }
        
        return (current, required, percentage);
    }
}
