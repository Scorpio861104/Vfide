// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISeerViewTarget {
    function getScore(address subject) external view returns (uint16);
    function getStoredScore(address subject) external view returns (uint16);
    function NEUTRAL() external view returns (uint16);
    function lowTrustThreshold() external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function minForGovernance() external view returns (uint16);
    function minForMerchant() external view returns (uint16);

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
        uint256 total = useSocial
            ? ISeerSocialViewTarget(social).getEndorserCount(subject)
            : target.getEndorserCount(subject);
        uint256 activeCount = 0;

        for (uint256 i = 0; i < total; i++) {
            address endorser = useSocial
                ? ISeerSocialViewTarget(social).getEndorserAt(subject, i)
                : target.getEndorserAt(subject, i);
            // slither-disable-next-line unused-return
            (uint64 expiry, uint16 weight, ) = useSocial
                ? ISeerSocialViewTarget(social).endorsements(subject, endorser)
                : target.endorsements(subject, endorser);
            if (expiry > block.timestamp && weight > 0) {
                activeCount++;
            }
        }

        endorsers = new address[](activeCount);
        weights = new uint16[](activeCount);
        expiries = new uint64[](activeCount);
        timestamps = new uint64[](activeCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
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
                idx++;
            }
        }
    }

    function getScores(address seer, address[] calldata subjects) external view returns (uint16[] memory scores) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        uint16 neutral = target.NEUTRAL();
        uint256 len = subjects.length;

        scores = new uint16[](len);
        for (uint256 i = 0; i < len; i++) {
            uint16 stored = target.getStoredScore(subjects[i]);
            scores[i] = stored == 0 ? neutral : stored;
        }
    }

    function getScoresBatch(address seer, address[] calldata subjects) external view returns (uint16[] memory scores) {
        ISeerViewTarget target = ISeerViewTarget(seer);
        uint256 len = subjects.length;
        require(len > 0 && len <= 100, "SEER: invalid batch size");

        scores = new uint16[](len);
        for (uint256 i = 0; i < len; i++) {
            scores[i] = target.getScore(subjects[i]);
        }
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
}
