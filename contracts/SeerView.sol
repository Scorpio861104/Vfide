// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice ISeerViewTarget
/// @title ISeerViewTarget
/// @author Vfide
interface ISeerViewTarget {
    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16);
    /// @notice NEUTRAL
    /// @return _uint16 _uint16
    function NEUTRAL() external view returns (uint16);
    /// @notice lowTrustThreshold
    /// @return _uint16 _uint16
    function lowTrustThreshold() external view returns (uint16);
    /// @notice highTrustThreshold
    /// @return _uint16 _uint16
    function highTrustThreshold() external view returns (uint16);
    /// @notice minForGovernance
    /// @return _uint16 _uint16
    function minForGovernance() external view returns (uint16);
    /// @notice minForMerchant
    /// @return _uint16 _uint16
    function minForMerchant() external view returns (uint16);

    /// @notice mentors
    /// @param account account
    /// @return _bool _bool
    function mentors(address account) external view returns (bool);
    /// @notice mentorOf
    /// @param account account
    /// @return _address _address
    function mentorOf(address account) external view returns (address);
    /// @notice getMentees
    /// @param mentor mentor
    /// @return _arg _arg
    function getMentees(address mentor) external view returns (address[] memory);
    /// @notice minScoreToMentor
    /// @return _uint16 _uint16
    function minScoreToMentor() external view returns (uint16);

    /// @notice endorsements
    /// @param subject subject
    /// @param endorser endorser
    /// @return expiry expiry
    /// @return weight weight
    /// @return timestamp timestamp
    function endorsements(address subject, address endorser) external view returns (
        uint64 expiry,
        uint16 weight,
        uint64 timestamp
    );
    /// @notice getEndorserCount
    /// @param subject subject
    /// @return _uint256 _uint256
    function getEndorserCount(address subject) external view returns (uint256);
    /// @notice getEndorserAt
    /// @param subject subject
    /// @param index index
    /// @return _address _address
    function getEndorserAt(address subject, uint256 index) external view returns (address);
}

/// @notice ISeerCoreSocialRef
/// @title ISeerCoreSocialRef
/// @author Vfide
interface ISeerCoreSocialRef {
    /// @notice seerSocial
    /// @return _address _address
    function seerSocial() external view returns (address);
}

/// @notice ISeerSocialViewTarget
/// @title ISeerSocialViewTarget
/// @author Vfide
interface ISeerSocialViewTarget {
    /// @notice mentors
    /// @param account account
    /// @return _bool _bool
    function mentors(address account) external view returns (bool);
    /// @notice mentorOf
    /// @param account account
    /// @return _address _address
    function mentorOf(address account) external view returns (address);
    /// @notice getMentees
    /// @param mentor mentor
    /// @return _arg _arg
    function getMentees(address mentor) external view returns (address[] memory);
    /// @notice minScoreToMentor
    /// @return _uint16 _uint16
    function minScoreToMentor() external view returns (uint16);
    /// @notice endorsements
    /// @param subject subject
    /// @param endorser endorser
    /// @return expiry expiry
    /// @return weight weight
    /// @return timestamp timestamp
    function endorsements(address subject, address endorser) external view returns (
        uint64 expiry,
        uint16 weight,
        uint64 timestamp
    );
    /// @notice getEndorserCount
    /// @param subject subject
    /// @return _uint256 _uint256
    function getEndorserCount(address subject) external view returns (uint256);
    /// @notice getEndorserAt
    /// @param subject subject
    /// @param index index
    /// @return _address _address
    function getEndorserAt(address subject, uint256 index) external view returns (address);
}

/// @dev Minimal read interface for SeerAutonomous monitoring state.
/// @notice ISeerAutonomousMonitor
/// @title ISeerAutonomousMonitor
/// @author Vfide
interface ISeerAutonomousMonitor {
    /// @notice ecosystemVault
    /// @return _address _address
    function ecosystemVault() external view returns (address);
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
    );
}

/// @dev Minimal read interface for the ecosystem scheduler (EcosystemVault).
/// @notice IEcosystemSchedulerView
/// @title IEcosystemSchedulerView
/// @author Vfide
interface IEcosystemSchedulerView {
    /// @notice checkUpkeep
    /// @return upkeepNeeded upkeepNeeded
    /// @return performData performData
    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData);
}

// ReentrancyGuard intentionally omitted: read-only analytics surface over Seer state.
/// @notice SeerView
/// @title SeerView
/// @author Vfide
contract SeerView {
    /// @notice getMentorInfo
    /// @param seer seer
    /// @param subject subject
    /// @return isMentorUser isMentorUser
    /// @return mentor mentor
    /// @return menteeCount menteeCount
    /// @return hasMentor hasMentor
    /// @return canBecome canBecome
    /// @return minScore minScore
    /// @return currentScore currentScore
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

    /// @notice getActiveEndorsements
    /// @param seer seer
    /// @param subject subject
    /// @return endorsers endorsers
    /// @return weights weights
    /// @return expiries expiries
    /// @return timestamps timestamps
    function getActiveEndorsements(address seer, address subject) external view returns (
        address[] memory endorsers,
        uint16[] memory weights,
        uint64[] memory expiries,
        uint64[] memory timestamps
    ) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        address social = address(0);
        try ISeerCoreSocialRef(seer).seerSocial() returns (address configuredSocial) {
            social = configuredSocial;
        } catch {}

        bool useSocial = social != address(0);
        uint256 total = useSocial ? ISeerSocialViewTarget(social).getEndorserCount(subject) : target.getEndorserCount(subject);
        uint256 activeCount = 0;

        for (uint256 i = 0; i < total; ++i) {
            address endorser = useSocial
                ? ISeerSocialViewTarget(social).getEndorserAt(subject, i)
                : target.getEndorserAt(subject, i);
            (uint64 expiry, uint16 weight, ) = useSocial
                ? ISeerSocialViewTarget(social).endorsements(subject, endorser)
                : target.endorsements(subject, endorser);
            if (expiry > block.timestamp && weight > 0) {
                ++activeCount;
            }
        }

        endorsers = new address[](activeCount);
        weights = new uint16[](activeCount);
        expiries = new uint64[](activeCount);
        timestamps = new uint64[](activeCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < total; ++i) {
            address endorser = useSocial
                ? ISeerSocialViewTarget(social).getEndorserAt(subject, i)
                : target.getEndorserAt(subject, i);
            (uint64 expiry, uint16 weight, uint64 ts) = useSocial
                ? ISeerSocialViewTarget(social).endorsements(subject, endorser)
                : target.endorsements(subject, endorser);
            if (expiry > block.timestamp && weight > 0) {
                endorsers[idx] = endorser;
                weights[idx] = weight;
                expiries[idx] = expiry;
                timestamps[idx] = ts;
                ++idx;
            }
        }
    }

    /// @notice getScores
    /// @param seer seer
    /// @param subjects subjects
    /// @return scores scores
    function getScores(address seer, address[] calldata subjects) external view returns (uint16[] memory scores) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        uint256 len = subjects.length;

        scores = new uint16[](len);
        for (uint256 i = 0; i < len; ++i) {
            scores[i] = target.getScore(subjects[i]);
        }
    }

    /// @notice getScoresBatch
    /// @param seer seer
    /// @param subjects subjects
    /// @return scores scores
    function getScoresBatch(address seer, address[] calldata subjects) external view returns (uint16[] memory scores) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        uint256 len = subjects.length;
        require(len > 0 && len <= 100, "SEER: invalid batch size");

        scores = new uint16[](len);
        for (uint256 i = 0; i < len; ++i) {
            scores[i] = target.getScore(subjects[i]);
        }
    }

    /// @notice getTrustLevel
    /// @param seer seer
    /// @param subject subject
    /// @return level level
    /// @return levelName levelName
    /// @return canVote canVote
    /// @return canBeMerchant canBeMerchant
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
    function getMonitorStatus(address seerAutonomous) external view returns (address vault, bool tasksReady, uint8 tasksBitmask, uint256 totalActions, uint256 violationRate, uint16 sensitivity) {
        ISeerAutonomousMonitor sa = ISeerAutonomousMonitor(seerAutonomous);
        vault = sa.ecosystemVault();

        (totalActions, , violationRate, sensitivity) = sa.getNetworkHealth();

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
