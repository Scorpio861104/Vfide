// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDE Seer — Trust Intelligence System
 * -------------------------------------------------------
 * Core behavior analytics and reputation management.
 * Calculates and maintains ProofScores, issues flags,
 * and integrates with PanicGuard, DAO, and BurnRouter.
 */

interface IProofLedger_SEER {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

interface IPanicGuard_SEER {
    function reportRisk(address vault, uint64 duration, uint8 severity, string calldata reason) external;
}

interface IProofScoreBurnRouter_SEER {
    function adjustScore(address user, uint16 delta, bool increase) external;
}

error SEER_NotDAO();
error SEER_NotVault();
error SEER_Zero();

contract Seer {
    event ModulesSet(address dao, address ledger, address panicGuard, address burnRouter);
    event ScoreSet(address indexed user, uint16 oldScore, uint16 newScore);
    event Flagged(address indexed user, string reason, uint8 severity);
    event PolicySet(uint16 baseScore, uint16 minScore, uint16 maxScore);
    event SubScoreAdjusted(address indexed user, string category, uint16 oldScore, uint16 newScore);
    event PolicyChangeRecommended(uint16 newBase, uint16 newMin, uint16 newMax, string reason);

    /**
     * Notify users of significant score changes
     */
    event ScoreChangeNotified(address indexed user, uint16 oldScore, uint16 newScore);

    /**
     * Auto-update metrics upon dispute resolution or transaction completion
     */
    event MetricsAutoUpdated(address indexed user, uint16 financialScore, uint16 governanceScore, uint16 securityScore);

    struct Profile {
        uint16 financialScore;
        uint16 governanceScore;
        uint16 securityScore;
        uint64 lastUpdate;
        bool flagged;
    }

    address public dao;
    IProofLedger_SEER public ledger;
    IPanicGuard_SEER public panicGuard;
    IProofScoreBurnRouter_SEER public burnRouter;

    uint16 public baseScore = 500;
    uint16 public minScore = 100;
    uint16 public maxScore = 1000;

    mapping(address => Profile) public profiles;

    /**
     * Introduce cooldown for frequent score adjustments
     */
    mapping(address => uint64) public lastScoreAdjustment;
    uint64 public cooldownPeriod = 1 days;

    modifier onlyDAO() {
        if (msg.sender != dao) revert SEER_NotDAO();
        _;
    }

    modifier cooldownCheck(address user) {
        require(block.timestamp >= lastScoreAdjustment[user] + cooldownPeriod, "Cooldown active");
        _;
    }

    constructor(address _dao, address _ledger, address _panic, address _burn) {
        if (_dao == address(0)) revert SEER_Zero();
        dao = _dao;
        ledger = IProofLedger_SEER(_ledger);
        panicGuard = IPanicGuard_SEER(_panic);
        burnRouter = IProofScoreBurnRouter_SEER(_burn);
        emit ModulesSet(_dao, _ledger, _panic, _burn);
    }

    function setModules(address _dao, address _ledger, address _panic, address _burn) external onlyDAO {
        dao = _dao;
        ledger = IProofLedger_SEER(_ledger);
        panicGuard = IPanicGuard_SEER(_panic);
        burnRouter = IProofScoreBurnRouter_SEER(_burn);
        emit ModulesSet(_dao, _ledger, _panic, _burn);
        _log("seer_modules_set");
    }

    function setPolicy(uint16 _base, uint16 _min, uint16 _max) external onlyDAO {
        baseScore = _base;
        minScore = _min;
        maxScore = _max;
        emit PolicySet(_base, _min, _max);
        _log("seer_policy_set");
    }

    function recommendPolicyChange(uint16 newBase, uint16 newMin, uint16 newMax, string calldata reason) external onlyDAO {
        emit PolicyChangeRecommended(newBase, newMin, newMax, reason);
        // DAO can review and approve/reject the recommendation
    }

    function getScore(address user) public view returns (uint16) {
        Profile memory p = profiles[user];
        uint16 overallScore = (p.financialScore * 40 / 100) + 
                              (p.governanceScore * 30 / 100) + 
                              (p.securityScore * 30 / 100);
        return overallScore == 0 ? baseScore : overallScore;
    }

    function minForGovernance() external view returns (uint16) {
        return baseScore + 100;
    }

    function flag(address user, uint8 severity, string calldata reason) external onlyDAO {
        if (user == address(0)) revert SEER_Zero();
        profiles[user].flagged = true;
        emit Flagged(user, reason, severity);
        _logEv(user, "seer_flag", severity, reason);
        if (address(panicGuard) != address(0)) {
            uint64 duration = uint64(severity) * 6 hours;
            try panicGuard.reportRisk(user, duration, severity, reason) {} catch {}
        }
    }

    function adjustScore(address user, uint16 delta, bool increase, string calldata reason) external onlyDAO {
        if (user == address(0)) revert SEER_Zero();
        uint16 old = getScore(user);
        uint16 newScore;
        if (increase) {
            newScore = old + delta > maxScore ? maxScore : old + delta;
        } else {
            newScore = old < delta ? minScore : old - delta;
        }
        profiles[user].financialScore = newScore;
        profiles[user].lastUpdate = uint64(block.timestamp);
        emit ScoreSet(user, old, newScore);
        emit ScoreChangeNotified(user, old, newScore);
        _logEv(user, "seer_adjust_score", newScore, reason);
    }

    function adjustScoreWithCooldown(address user, uint16 delta, bool increase, string calldata reason) external onlyDAO cooldownCheck(user) {
        adjustScore(user, delta, increase, reason);
        lastScoreAdjustment[user] = uint64(block.timestamp);
    }

    function getScoreBreakdown(address user) public view returns (uint16 financial, uint16 governance, uint16 security) {
        Profile memory p = profiles[user];
        return (p.financialScore, p.governanceScore, p.securityScore);
    }

    function adjustFinancialScore(address user, uint16 delta, bool increase) external onlyDAO {
        if (user == address(0)) revert SEER_Zero();
        uint16 oldScore = profiles[user].financialScore;
        profiles[user].financialScore = increase 
            ? (profiles[user].financialScore + delta > 1000 ? 1000 : profiles[user].financialScore + delta)
            : (profiles[user].financialScore > delta ? profiles[user].financialScore - delta : 0);
        emit SubScoreAdjusted(user, "financial", oldScore, profiles[user].financialScore);
    }

    function adjustGovernanceScore(address user, uint16 delta, bool increase) external onlyDAO {
        if (user == address(0)) revert SEER_Zero();
        uint16 oldScore = profiles[user].governanceScore;
        profiles[user].governanceScore = increase 
            ? (profiles[user].governanceScore + delta > 1000 ? 1000 : profiles[user].governanceScore + delta)
            : (profiles[user].governanceScore > delta ? profiles[user].governanceScore - delta : 0);
        emit SubScoreAdjusted(user, "governance", oldScore, profiles[user].governanceScore);
    }

    function adjustSecurityScore(address user, uint16 delta, bool increase) external onlyDAO {
        if (user == address(0)) revert SEER_Zero();
        uint16 oldScore = profiles[user].securityScore;
        profiles[user].securityScore = increase 
            ? (profiles[user].securityScore + delta > 1000 ? 1000 : profiles[user].securityScore + delta)
            : (profiles[user].securityScore > delta ? profiles[user].securityScore - delta : 0);
        emit SubScoreAdjusted(user, "security", oldScore, profiles[user].securityScore);
    }

    function autoUpdateMetrics(
        address user,
        uint16 financialDelta,
        uint16 governanceDelta,
        uint16 securityDelta,
        bool increase
    ) external onlyDAO {
        require(user != address(0), "Invalid user address");

        Profile storage profile = profiles[user];

        // Update financial score
        if (increase) {
            profile.financialScore = profile.financialScore + financialDelta > maxScore
                ? maxScore
                : profile.financialScore + financialDelta;
        } else {
            profile.financialScore = profile.financialScore < financialDelta
                ? minScore
                : profile.financialScore - financialDelta;
        }

        // Update governance score
        if (increase) {
            profile.governanceScore = profile.governanceScore + governanceDelta > maxScore
                ? maxScore
                : profile.governanceScore + governanceDelta;
        } else {
            profile.governanceScore = profile.governanceScore < governanceDelta
                ? minScore
                : profile.governanceScore - governanceDelta;
        }

        // Update security score
        if (increase) {
            profile.securityScore = profile.securityScore + securityDelta > maxScore
                ? maxScore
                : profile.securityScore + securityDelta;
        } else {
            profile.securityScore = profile.securityScore < securityDelta
                ? minScore
                : profile.securityScore - securityDelta;
        }

        emit MetricsAutoUpdated(user, profile.financialScore, profile.governanceScore, profile.securityScore);
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch {}
        }
    }
}