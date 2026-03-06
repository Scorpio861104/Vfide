// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./BadgeRegistry.sol";

interface IBadgeQualificationRules {
    function checkQualification(
        uint32 commerceTxCount,
        uint32 consecutiveDays,
        uint32 governanceVotes,
        uint32 successfulTrades,
        uint32 endorsementsReceived,
        uint32 referralsMade,
        uint32 referralsQualified,
        uint32 fraudReports,
        uint32 educationalContent,
        uint64 lastScoreDropBelow700,
        uint16 score,
        bytes32 badge,
        uint256 currentTimestamp
    ) external pure returns (bool);
}

contract BadgeQualificationRules is IBadgeQualificationRules {
    function checkQualification(
        uint32 commerceTxCount,
        uint32 consecutiveDays,
        uint32 governanceVotes,
        uint32 successfulTrades,
        uint32 endorsementsReceived,
        uint32 referralsMade,
        uint32 referralsQualified,
        uint32 fraudReports,
        uint32 educationalContent,
        uint64 lastScoreDropBelow700,
        uint16 score,
        bytes32 badge,
        uint256 currentTimestamp
    ) external pure returns (bool) {
        if (badge == BadgeRegistry.ACTIVE_TRADER) {
            return commerceTxCount >= 50;
        }

        if (badge == BadgeRegistry.GOVERNANCE_VOTER) {
            return governanceVotes >= 10;
        }

        if (badge == BadgeRegistry.POWER_USER) {
            uint8 activityTypes = 0;
            if (commerceTxCount > 0) activityTypes++;
            if (governanceVotes > 0) activityTypes++;
            if (endorsementsReceived > 0) activityTypes++;
            if (referralsMade > 0) activityTypes++;
            return activityTypes >= 3;
        }

        if (badge == BadgeRegistry.DAILY_CHAMPION) {
            return consecutiveDays >= 30;
        }

        if (badge == BadgeRegistry.VERIFIED_MERCHANT) {
            return successfulTrades >= 100 && score >= 700;
        }

        if (badge == BadgeRegistry.CLEAN_RECORD) {
            if (lastScoreDropBelow700 == 0) return false;
            return currentTimestamp >= uint256(lastScoreDropBelow700) + 365 days;
        }

        if (badge == BadgeRegistry.ELITE_ACHIEVER) {
            return score >= 9000;
        }

        if (badge == BadgeRegistry.COMMUNITY_BUILDER) {
            return referralsQualified >= 10;
        }

        if (badge == BadgeRegistry.FRAUD_HUNTER) {
            return fraudReports >= 3;
        }

        if (badge == BadgeRegistry.EDUCATOR) {
            return educationalContent >= 5;
        }

        if (badge == BadgeRegistry.MENTOR) {
            return referralsQualified >= 5;
        }

        return false;
    }
}
