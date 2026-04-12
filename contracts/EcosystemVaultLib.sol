// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * EcosystemVaultLib — Pure helper functions extracted from EcosystemVault
 * to reduce deployed bytecode below the 24576-byte EIP-170 limit.
 */
library EcosystemVaultLib {
    uint16 internal constant MAX_BPS = 10000;

    // Tier thresholds (ProofScore) and multipliers
    uint16 internal constant TIER1_THRESHOLD = 9500;
    uint16 internal constant TIER2_THRESHOLD = 9000;
    uint16 internal constant TIER3_THRESHOLD = 8500;
    uint16 internal constant TIER4_THRESHOLD = 8000;
    uint16 internal constant TIER1_MULTIPLIER = 5;
    uint16 internal constant TIER2_MULTIPLIER = 4;
    uint16 internal constant TIER3_MULTIPLIER = 3;
    uint16 internal constant TIER4_MULTIPLIER = 2;

    /**
     * @notice Get merchant rank share based on rank position
     * @dev Rank 1-5: 500bps, 6-10: 300bps, 11-20: 200bps, 21-40: 100bps, 41-60: 50bps, 61-100: 25bps
     */
    function getMerchantRankShare(uint8 rank) public pure returns (uint16) {
        if (rank == 0 || rank > 100) return 0;
        if (rank <= 5) return 500;
        if (rank <= 10) return 300;
        if (rank <= 20) return 200;
        if (rank <= 40) return 100;
        if (rank <= 60) return 50;
        return 25;
    }

    function getMerchantBonusTier(uint16 score) public pure returns (uint16) {
        if (score >= TIER1_THRESHOLD) return TIER1_MULTIPLIER;
        if (score >= TIER2_THRESHOLD) return TIER2_MULTIPLIER;
        if (score >= TIER3_THRESHOLD) return TIER3_MULTIPLIER;
        if (score >= TIER4_THRESHOLD) return TIER4_MULTIPLIER;
        return 0;
    }

    function getSpendablePoolBalance(uint256 poolBalance, uint16 reserveBps) public pure returns (uint256) {
        if (poolBalance < 1) return 0;
        if (reserveBps == 0) return poolBalance;
        uint256 reserveAmount = (poolBalance * reserveBps) / MAX_BPS;
        return poolBalance > reserveAmount ? poolBalance - reserveAmount : 0;
    }

    function getReferralWorkLevel(
        uint16 points,
        uint16 referralLevel1Points,
        uint16 referralLevel2Points,
        uint16 referralLevel3Points,
        uint16 referralLevel4Points
    ) public pure returns (uint8) {
        if (points >= referralLevel4Points) return 4;
        if (points >= referralLevel3Points) return 3;
        if (points >= referralLevel2Points) return 2;
        if (points >= referralLevel1Points) return 1;
        return 0;
    }

    function getReferralLevelReward(
        uint8 level,
        uint256 referralLevel1Reward,
        uint256 referralLevel2Reward,
        uint256 referralLevel3Reward,
        uint256 referralLevel4Reward
    ) public pure returns (uint256) {
        if (level == 1) return referralLevel1Reward;
        if (level == 2) return referralLevel2Reward;
        if (level == 3) return referralLevel3Reward;
        if (level == 4) return referralLevel4Reward;
        return 0;
    }

    function getReferralLevelRequiredPoints(
        uint8 level,
        uint16 referralLevel1Points,
        uint16 referralLevel2Points,
        uint16 referralLevel3Points,
        uint16 referralLevel4Points
    ) public pure returns (uint16) {
        if (level == 1) return referralLevel1Points;
        if (level == 2) return referralLevel2Points;
        if (level == 3) return referralLevel3Points;
        if (level == 4) return referralLevel4Points;
        return 0;
    }

    function vfideToStable(uint256 amount, uint256 minOutputPerVfide) public pure returns (uint256 stableAmount) {
        if (minOutputPerVfide == 0) return 0;
        stableAmount = amount * minOutputPerVfide / 1e18;
    }

    function getMerchantTierMultipliers() internal pure returns (
        uint16 tier1Threshold, uint16 tier1Multiplier,
        uint16 tier2Threshold, uint16 tier2Multiplier,
        uint16 tier3Threshold, uint16 tier3Multiplier,
        uint16 tier4Threshold, uint16 tier4Multiplier
    ) {
        return (
            TIER1_THRESHOLD, TIER1_MULTIPLIER,
            TIER2_THRESHOLD, TIER2_MULTIPLIER,
            TIER3_THRESHOLD, TIER3_MULTIPLIER,
            TIER4_THRESHOLD, TIER4_MULTIPLIER
        );
    }
}
