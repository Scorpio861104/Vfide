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

    struct Profile {
        uint16 score;
        bool flagged;
        uint64 lastUpdate;
    }

    address public dao;
    IProofLedger_SEER public ledger;
    IPanicGuard_SEER public panicGuard;
    IProofScoreBurnRouter_SEER public burnRouter;

    uint16 public baseScore = 500;
    uint16 public minScore = 100;
    uint16 public maxScore = 1000;

    mapping(address => Profile) public profiles;

    modifier onlyDAO() {
        if (msg.sender != dao) revert SEER_NotDAO();
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

    function getScore(address user) public view returns (uint16) {
        uint16 s = profiles[user].score;
        return s == 0 ? baseScore : s;
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
            newScore = old > delta ? old - delta : minScore;
        }
        profiles[user].score = newScore;
        profiles[user].lastUpdate = uint64(block.timestamp);
        emit ScoreSet(user, old, newScore);
        _logEv(user, increase ? "seer_inc" : "seer_dec", delta, reason);

        if (address(burnRouter) != address(0)) {
            try burnRouter.adjustScore(user, delta, increase) {} catch {}
        }
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}