// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDETrust.sol";
import "./BadgeRegistry.sol";
import "./SharedInterfaces.sol";

/**
 * @title BadgeManagerLite
 * @notice Lightweight badge manager - core awarding logic only
 * @dev Split from original to meet 24KB limit. Uses external view helper.
 */
contract BadgeManagerLite {
    
    // ════════════════════════════════════════════════════════════════════════
    //                           STATE VARIABLES
    // ════════════════════════════════════════════════════════════════════════
    
    address public dao;
    Seer public seer;
    
    /// @notice Compact user stats (64 bytes = 2 slots)
    struct UserStats {
        uint32 commerceTxCount;
        uint32 consecutiveDays;
        uint32 governanceVotes;
        uint32 successfulTrades;
        uint32 endorsementsReceived;
        uint32 referralsMade;
        uint32 referralsQualified;
        uint32 disputesMediated;
        uint32 fraudReports;
        uint32 educationalContent;
        uint64 lastActivityDay;
        uint64 firstActivity;
        uint64 lastScoreDropBelow700;
        uint8 flags; // bit flags: presale, contributed, translated
    }
    
    mapping(address => UserStats) public userStats;
    mapping(address => bool) public operators;
    
    uint32 public pioneerCount;
    uint32 public foundingMemberCount;
    uint32 public constant MAX_PIONEERS = 10_000;
    uint32 public constant MAX_FOUNDING_MEMBERS = 1_000;
    
    // Bit flags
    uint8 private constant FLAG_PRESALE = 1;
    uint8 private constant FLAG_CONTRIBUTED = 2;
    uint8 private constant FLAG_TRANSLATED = 4;
    
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
    
    // ════════════════════════════════════════════════════════════════════════
    //                            MODIFIERS
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
    //                       BADGE AWARDING LOGIC
    // ════════════════════════════════════════════════════════════════════════
    
    function awardBadge(address user, bytes32 badge) public onlyOperator {
        if (seer.hasBadge(user, badge)) {
            _checkRenewal(user, badge);
            return;
        }
        
        uint256 expiry = 0;
        if (!BadgeRegistry.isPermanent(badge)) {
            expiry = block.timestamp + BadgeRegistry.getRecommendedDuration(badge);
        }
        
        try seer.setBadge(user, badge, true, expiry) {
            uint16 scoreBoost = BadgeRegistry.getRecommendedWeight(badge);
            if (scoreBoost > 0) {
                try seer.reward(user, scoreBoost, "Badge earned") {} catch {}
            }
            emit BadgeEarned(user, badge, expiry, scoreBoost);
        } catch {}
    }
    
    function revokeBadge(address user, bytes32 badge, string calldata reason) external onlyDAO {
        if (!seer.hasBadge(user, badge)) return;
        
        try seer.setBadge(user, badge, false, 0) {
            uint16 penalty = BadgeRegistry.getRecommendedWeight(badge);
            if (penalty > 0) {
                try seer.punish(user, penalty, reason) {} catch {}
            }
            emit BadgeRevoked(user, badge, reason);
        } catch {}
    }
    
    function _checkRenewal(address user, bytes32 badge) internal {
        if (BadgeRegistry.isPermanent(badge)) return;
        
        uint256 expiry = seer.badgeExpiry(user, badge);
        if (expiry > 0 && block.timestamp > expiry - 7 days) {
            if (_checkQual(user, badge)) {
                uint256 newExpiry = block.timestamp + BadgeRegistry.getRecommendedDuration(badge);
                try seer.setBadge(user, badge, true, newExpiry) {
                    emit BadgeRenewed(user, badge, newExpiry);
                } catch {}
            } else if (block.timestamp > expiry) {
                try seer.setBadge(user, badge, false, 0) {
                    emit BadgeRevoked(user, badge, "Expired");
                } catch {}
            }
        }
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                       STAT TRACKING
    // ════════════════════════════════════════════════════════════════════════
    
    function recordCommerceTx(address user, bool successful) external onlyOperator {
        UserStats storage s = userStats[user];
        s.commerceTxCount++;
        if (successful) s.successfulTrades++;
        _updateActivity(user);
        _checkEligibility(user);
        emit StatsUpdated(user, "commerceTx", s.commerceTxCount);
    }
    
    function recordGovernanceVote(address user) external onlyOperator {
        UserStats storage s = userStats[user];
        s.governanceVotes++;
        _updateActivity(user);
        _checkEligibility(user);
        emit StatsUpdated(user, "votes", s.governanceVotes);
    }
    
    function recordEndorsement(address user) external onlyOperator {
        userStats[user].endorsementsReceived++;
        _checkEligibility(user);
    }
    
    function recordReferral(address referrer, bool qualified) external onlyOperator {
        UserStats storage s = userStats[referrer];
        s.referralsMade++;
        if (qualified) s.referralsQualified++;
        _checkEligibility(referrer);
    }
    
    function recordFraudReport(address reporter) external onlyOperator {
        userStats[reporter].fraudReports++;
        _checkEligibility(reporter);
    }
    
    function recordEducationalContent(address creator) external onlyOperator {
        userStats[creator].educationalContent++;
        _checkEligibility(creator);
    }
    
    function recordPresaleParticipation(address user) external onlyOperator {
        UserStats storage s = userStats[user];
        if ((s.flags & FLAG_PRESALE) == 0) {
            s.flags |= FLAG_PRESALE;
            awardBadge(user, BadgeRegistry.GENESIS_PRESALE);
        }
    }
    
    function recordContribution(address contributor) external onlyDAO {
        UserStats storage s = userStats[contributor];
        if ((s.flags & FLAG_CONTRIBUTED) == 0) {
            s.flags |= FLAG_CONTRIBUTED;
            awardBadge(contributor, BadgeRegistry.CONTRIBUTOR);
        }
    }
    
    function recordTranslation(address translator) external onlyDAO {
        UserStats storage s = userStats[translator];
        if ((s.flags & FLAG_TRANSLATED) == 0) {
            s.flags |= FLAG_TRANSLATED;
            awardBadge(translator, BadgeRegistry.TRANSLATOR);
        }
    }
    
    function awardPioneer(address user) external onlyOperator {
        if (pioneerCount >= MAX_PIONEERS) return;
        if (seer.hasBadge(user, BadgeRegistry.PIONEER)) return;
        pioneerCount++;
        awardBadge(user, BadgeRegistry.PIONEER);
    }
    
    function awardFoundingMember(address user) external onlyOperator {
        if (foundingMemberCount >= MAX_FOUNDING_MEMBERS) return;
        if (seer.hasBadge(user, BadgeRegistry.FOUNDING_MEMBER)) return;
        if (seer.getScore(user) < 8000) return;
        foundingMemberCount++;
        awardBadge(user, BadgeRegistry.FOUNDING_MEMBER);
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                          INTERNAL
    // ════════════════════════════════════════════════════════════════════════
    
    function _updateActivity(address user) internal {
        UserStats storage s = userStats[user];
        if (s.firstActivity == 0) s.firstActivity = uint64(block.timestamp);
        
        uint64 currentDay = uint64(block.timestamp / 1 days);
        
        if (s.lastActivityDay == 0) {
            s.consecutiveDays = 1;
        } else if (currentDay == s.lastActivityDay) {
            return;
        } else if (currentDay == s.lastActivityDay + 1) {
            s.consecutiveDays++;
        } else {
            s.consecutiveDays = 1;
        }
        s.lastActivityDay = currentDay;
    }
    
    function _checkEligibility(address user) internal {
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
        
        for (uint i = 0; i < 10; i++) {
            if (!seer.hasBadge(user, badges[i]) && _checkQual(user, badges[i])) {
                awardBadge(user, badges[i]);
            }
        }
    }
    
    function _checkQual(address user, bytes32 badge) internal view returns (bool) {
        UserStats memory s = userStats[user];
        uint16 score = seer.getScore(user);
        
        if (badge == BadgeRegistry.ACTIVE_TRADER) return s.commerceTxCount >= 50;
        if (badge == BadgeRegistry.GOVERNANCE_VOTER) return s.governanceVotes >= 10;
        if (badge == BadgeRegistry.DAILY_CHAMPION) return s.consecutiveDays >= 30;
        if (badge == BadgeRegistry.VERIFIED_MERCHANT) return s.successfulTrades >= 100 && score >= 700;
        if (badge == BadgeRegistry.ELITE_ACHIEVER) return score >= 9000;
        if (badge == BadgeRegistry.COMMUNITY_BUILDER) return s.referralsQualified >= 10;
        if (badge == BadgeRegistry.FRAUD_HUNTER) return s.fraudReports >= 3;
        if (badge == BadgeRegistry.EDUCATOR) return s.educationalContent >= 5;
        if (badge == BadgeRegistry.MENTOR) return s.referralsQualified >= 5;
        
        if (badge == BadgeRegistry.POWER_USER) {
            uint8 types = 0;
            if (s.commerceTxCount > 0) types++;
            if (s.governanceVotes > 0) types++;
            if (s.endorsementsReceived > 0) types++;
            if (s.referralsMade > 0) types++;
            return types >= 3;
        }
        
        return false;
    }
    
    // ════════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════
    
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }
    
    function getBadgeProgress(address user, bytes32 badge) external view returns (
        uint32 current,
        uint32 required,
        uint8 percentage
    ) {
        UserStats memory s = userStats[user];
        
        if (badge == BadgeRegistry.ACTIVE_TRADER) { required = 50; current = s.commerceTxCount; }
        else if (badge == BadgeRegistry.GOVERNANCE_VOTER) { required = 10; current = s.governanceVotes; }
        else if (badge == BadgeRegistry.DAILY_CHAMPION) { required = 30; current = s.consecutiveDays; }
        else if (badge == BadgeRegistry.VERIFIED_MERCHANT) { required = 100; current = s.successfulTrades; }
        else if (badge == BadgeRegistry.COMMUNITY_BUILDER) { required = 10; current = s.referralsQualified; }
        else if (badge == BadgeRegistry.FRAUD_HUNTER) { required = 3; current = s.fraudReports; }
        else if (badge == BadgeRegistry.EDUCATOR) { required = 5; current = s.educationalContent; }
        else if (badge == BadgeRegistry.MENTOR) { required = 5; current = s.referralsQualified; }
        else return (0, 0, 0);
        
        percentage = current >= required ? 100 : uint8((uint256(current) * 100) / required);
    }
}
