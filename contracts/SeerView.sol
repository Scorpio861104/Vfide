// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISeerViewTarget {
    function getScore(address subject) external view returns (uint16);
    function getScoresBatch(address[] calldata subjects) external view returns (uint16[] memory scores);
    function NEUTRAL() external view returns (uint16);
    function lowTrustThreshold() external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function minForGovernance() external view returns (uint16);
    function minForMerchant() external view returns (uint16);
    function lastActivity(address subject) external view returns (uint64);
    function scoreHistoryCount(address subject) external view returns (uint8);
    function operators(address subject) external view returns (bool);
    function decayEnabled() external view returns (bool);
    function decayStartDays() external view returns (uint64);
    function decayPerMonth() external view returns (uint16);
    function scoreDisputes(address subject) external view returns (
        address requester,
        string memory reason,
        uint64 timestamp,
        bool resolved,
        bool approved
    );

    function mentors(address account) external view returns (bool);
    function mentorOf(address account) external view returns (address);
    function getMentees(address mentor) external view returns (address[] memory);
    function minScoreToMentor() external view returns (uint16);

    function endorsements(address subject, address endorser) external view returns (
        uint64 expiry,
        uint16 weight,
        uint64 timestamp
    );
    function getEndorserCount(address subject) external view returns (uint256);
    function getEndorserAt(address subject, uint256 index) external view returns (address);
}

interface ISeerCoreSocialRef {
    function seerSocial() external view returns (address);
}

interface ISeerSocialViewTarget {
    function mentors(address account) external view returns (bool);
    function mentorOf(address account) external view returns (address);
    function getMentees(address mentor) external view returns (address[] memory);
    function minScoreToMentor() external view returns (uint16);
    function endorsements(address subject, address endorser) external view returns (
        uint64 expiry,
        uint16 weight,
        uint64 timestamp
    );
    function getEndorserCount(address subject) external view returns (uint256);
    function getEndorserAt(address subject, uint256 index) external view returns (address);
}

/// @dev Minimal read interface for SeerAutonomous monitoring state.
interface ISeerAutonomousMonitor {
    function ecosystemVault() external view returns (address);
    function getNetworkHealth() external view returns (
        uint256 totalActions,
        uint256 totalViolations,
        uint256 violationRate,
        uint16 currentSensitivity
    );
}

/// @dev Minimal read interface for the ecosystem scheduler (EcosystemVault).
interface IEcosystemSchedulerView {
    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData);
}

// ReentrancyGuard intentionally omitted: read-only analytics surface over Seer state.
contract SeerView {
    function getMentorInfo(address seer, address subject) external view returns (
        bool isMentorUser,
        address mentor,
        uint16 menteeCount,
        bool hasMentor,
        bool canBecome,
        uint16 minScore,
        uint16 currentScore
    ) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        currentScore = target.getScore(subject);

        address social = address(0);
        try ISeerCoreSocialRef(seer).seerSocial() returns (address configuredSocial) {
            social = configuredSocial;
        } catch {}

        if (social != address(0)) {
            ISeerSocialViewTarget socialTarget = ISeerSocialViewTarget(social);
            minScore = socialTarget.minScoreToMentor();
            isMentorUser = socialTarget.mentors(subject);
            mentor = socialTarget.mentorOf(subject);
            hasMentor = mentor != address(0);
            menteeCount = uint16(socialTarget.getMentees(subject).length);
            canBecome = !isMentorUser && currentScore >= minScore;
            return (isMentorUser, mentor, menteeCount, hasMentor, canBecome, minScore, currentScore);
        }

        minScore = target.minScoreToMentor();
        isMentorUser = target.mentors(subject);
        mentor = target.mentorOf(subject);
        hasMentor = mentor != address(0);
        menteeCount = uint16(target.getMentees(subject).length);
        canBecome = !isMentorUser && currentScore >= minScore;
    }

    function _resolveSocial(address seer) internal view returns (address social) {
        try ISeerCoreSocialRef(seer).seerSocial() returns (address configuredSocial) {
            social = configuredSocial;
        } catch {}
    }

    function _loadEndorsement(
        ISeerViewTarget target,
        address social,
        bool useSocial,
        address subject,
        uint256 index
    ) internal view returns (address endorser, uint64 expiry, uint16 weight, uint64 ts) {
        if (useSocial) {
            ISeerSocialViewTarget socialTarget = ISeerSocialViewTarget(social);
            endorser = socialTarget.getEndorserAt(subject, index);
            (expiry, weight, ts) = socialTarget.endorsements(subject, endorser);
            return (endorser, expiry, weight, ts);
        }

        endorser = target.getEndorserAt(subject, index);
        (expiry, weight, ts) = target.endorsements(subject, endorser);
    }

    function _isActiveEndorsement(uint64 expiry, uint16 weight, uint64 currentTime) internal pure returns (bool) {
        return expiry > currentTime && weight > 0;
    }

    function getActiveEndorsements(address seer, address subject) external view returns (
        address[] memory endorsers,
        uint16[] memory weights,
        uint64[] memory expiries,
        uint64[] memory timestamps
    ) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        address social = _resolveSocial(seer);
        bool useSocial = social != address(0);
        uint256 total = useSocial
            ? ISeerSocialViewTarget(social).getEndorserCount(subject)
            : target.getEndorserCount(subject);
        uint64 currentTime = uint64(block.timestamp);
        uint256 activeCount = 0;

        for (uint256 i = 0; i < total; i++) {
            (, uint64 expiry, uint16 weight, ) = _loadEndorsement(target, social, useSocial, subject, i);
            if (_isActiveEndorsement(expiry, weight, currentTime)) {
                activeCount++;
            }
        }

        endorsers = new address[](activeCount);
        weights = new uint16[](activeCount);
        expiries = new uint64[](activeCount);
        timestamps = new uint64[](activeCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
            (address endorser, uint64 expiry, uint16 weight, uint64 ts) =
                _loadEndorsement(target, social, useSocial, subject, i);
            if (_isActiveEndorsement(expiry, weight, currentTime)) {
                endorsers[idx] = endorser;
                weights[idx] = weight;
                expiries[idx] = expiry;
                timestamps[idx] = ts;
                idx++;
            }
        }
    }

    function getScores(address seer, address[] calldata subjects) external view returns (uint16[] memory scores) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        return target.getScoresBatch(subjects);
    }

    function getScoresBatch(address seer, address[] calldata subjects) external view returns (uint16[] memory scores) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        uint256 len = subjects.length;
        require(len > 0 && len <= 100, "SEER: invalid batch size");
        return target.getScoresBatch(subjects);
    }

    function getTrustLevel(address seer, address subject) external view returns (
        uint8 level,
        string memory levelName,
        bool canVote,
        bool canBeMerchant
    ) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        uint16 score = target.getScore(subject);

        if (score <= target.lowTrustThreshold()) {
            level = 0;
            levelName = "Low Trust";
        } else if (score >= target.highTrustThreshold()) {
            level = 2;
            levelName = "High Trust";
        } else {
            level = 1;
            levelName = "Medium Trust";
        }

        canVote = score >= target.minForGovernance();
        canBeMerchant = score >= target.minForMerchant();
    }

    function getUserStatus(address seer, address subject) external view returns (
        uint16 currentScore,
        uint16 decayAdjustedScore,
        uint64 daysInactive,
        uint64 lastActivityTime,
        uint256 historyCount,
        bool hasPendingDispute,
        bool isOperator
    ) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        currentScore = target.getScore(subject);
        lastActivityTime = target.lastActivity(subject);
        historyCount = target.scoreHistoryCount(subject);
        isOperator = target.operators(subject);

        (, , uint64 disputeTimestamp, bool resolved, ) = target.scoreDisputes(subject);
        hasPendingDispute = disputeTimestamp > 0 && !resolved;

        decayAdjustedScore = currentScore;
        if (!target.decayEnabled() || lastActivityTime == 0) {
            return (currentScore, decayAdjustedScore, daysInactive, lastActivityTime, historyCount, hasPendingDispute, isOperator);
        }

        daysInactive = uint64(block.timestamp - lastActivityTime) / 1 days;
        uint64 decayStart = target.decayStartDays();
        if (daysInactive < decayStart) {
            return (currentScore, decayAdjustedScore, daysInactive, lastActivityTime, historyCount, hasPendingDispute, isOperator);
        }

        uint16 neutral = target.NEUTRAL();
        uint16 decayAmount = uint16((uint256(daysInactive - decayStart) * target.decayPerMonth()) / 30);
        if (decayAdjustedScore > neutral) {
            decayAdjustedScore = decayAmount > decayAdjustedScore - neutral ? neutral : decayAdjustedScore - decayAmount;
        } else if (decayAdjustedScore < neutral) {
            decayAdjustedScore = decayAmount > neutral - decayAdjustedScore ? neutral : decayAdjustedScore + decayAmount;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //                  SEER AUTONOMOUS MONITORING VIEW
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns the Seer autonomous monitoring status in a single call.
     * @param seerAutonomous Address of the deployed SeerAutonomous contract.
     * @return vault            Address of the configured EcosystemVault (zero = not set).
     * @return tasksReady       Whether EcosystemVault has at least one task ready to run.
     * @return tasksBitmask     Bitmask of tasks currently due (0 when vault not set or none due).
     * @return totalActions     Network actions counted in the current period.
     * @return violationRate    Network violation rate (basis points, 0–10000).
     * @return sensitivity      Current pattern-detection sensitivity (0–100).
     */
    function getMonitorStatus(address seerAutonomous) external view returns (
        address vault,
        bool tasksReady,
        uint8 tasksBitmask,
        uint256 totalActions,
        uint256 violationRate,
        uint16 sensitivity
    ) {
        ISeerAutonomousMonitor sa = ISeerAutonomousMonitor(seerAutonomous);
        vault = sa.ecosystemVault();

        uint256 successfulActions;
        (totalActions, successfulActions, violationRate, sensitivity) = sa.getNetworkHealth();
        if (successfulActions > totalActions) {
            totalActions = successfulActions;
        }

        if (vault != address(0)) {
            try IEcosystemSchedulerView(vault).checkUpkeep("") returns (bool needed, bytes memory performData) {
                tasksReady = needed;
                if (needed && performData.length >= 32) {
                    tasksBitmask = abi.decode(performData, (uint8));
                }
            } catch {}
        }
    }
}
