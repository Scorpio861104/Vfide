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
    function getMerchantRankShare(uint8 rank) internal pure returns (uint16) {
        if (rank == 0 || rank > 100) return 0;
        if (rank <= 5) return 500;
        if (rank <= 10) return 300;
        if (rank <= 20) return 200;
        if (rank <= 40) return 100;
        if (rank <= 60) return 50;
        return 25;
    }

    function getMerchantBonusTier(uint16 score) internal pure returns (uint16) {
        if (score >= TIER1_THRESHOLD) return TIER1_MULTIPLIER;
        if (score >= TIER2_THRESHOLD) return TIER2_MULTIPLIER;
        if (score >= TIER3_THRESHOLD) return TIER3_MULTIPLIER;
        if (score >= TIER4_THRESHOLD) return TIER4_MULTIPLIER;
        return 0;
    }

    function getSpendablePoolBalance(uint256 poolBalance, uint16 reserveBps) internal pure returns (uint256) {
        if (poolBalance < 1) return 0;
        if (reserveBps == 0) return poolBalance;
        uint256 reserveAmount = (poolBalance * reserveBps) / MAX_BPS;
        return poolBalance > reserveAmount ? poolBalance - reserveAmount : 0;
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
