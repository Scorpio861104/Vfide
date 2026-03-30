// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20 } from "./SharedInterfaces.sol";

/**
 * EcosystemVaultView — Read-only companion for EcosystemVault.
 * Extracted to reduce EcosystemVault's deployed bytecode below 24576 bytes.
 * All external view/pure functions that were gas-heavy in bytecode live here.
 */

interface IEcosystemVaultView {
    function councilPool() external view returns (uint256);
    function merchantPool() external view returns (uint256);
    function headhunterPool() external view returns (uint256);
    function operationsPool() external view returns (uint256);
    function rewardToken() external view returns (IERC20);
    function currentMerchantPeriod() external view returns (uint256);
    function currentYear() external view returns (uint256);
    function currentQuarter() external view returns (uint256);
    function yearStartTime() external view returns (uint256);
    function totalCouncilPaid() external view returns (uint256);
    function totalMerchantBonusPaid() external view returns (uint256);
    function totalHeadhunterPaid() external view returns (uint256);
    function totalBurned() external view returns (uint256);
    function totalExpensesPaid() external view returns (uint256);
    function periodMerchantTxCount(uint256, address) external view returns (uint256);
    function periodMerchantTier(uint256, address) external view returns (uint16);
    function merchantPeriodClaimed(uint256, address) external view returns (bool);
    function merchantPeriodEnded(uint256) external view returns (bool);
    function merchantPeriodPoolSnapshot(uint256) external view returns (uint256);
    function yearPoints(uint256, address) external view returns (uint16);
    function quarterClaimed(uint256, uint256, address) external view returns (bool);
    function quarterEnded(uint256, uint256) external view returns (bool);
    function quarterPoolSnapshot(uint256, uint256) external view returns (uint256);
    function pendingMerchantReferrer(address) external view returns (address);
    function pendingUserReferrer(address) external view returns (address);
    function referralCredited(address) external view returns (bool);
    function totalMerchantBonusesPaid(address) external view returns (uint256);
    function periodMerchants(uint256, uint256) external view returns (address);
    function yearReferrers(uint256, uint256) external view returns (address);
    function operationsWallet() external view returns (address);
    function lastOperationsWithdrawal() external view returns (uint256);
    function operationsWithdrawalCooldown() external view returns (uint256);
    function referralLevelPaid(uint256, address) external view returns (uint8);
    function referralLevel1Points() external view returns (uint16);
    function referralLevel2Points() external view returns (uint16);
    function referralLevel3Points() external view returns (uint16);
    function referralLevel4Points() external view returns (uint16);
    function referralLevel1Reward() external view returns (uint256);
    function referralLevel2Reward() external view returns (uint256);
    function referralLevel3Reward() external view returns (uint256);
    function referralLevel4Reward() external view returns (uint256);
}

/// @dev Minimal ISeer subset for view-only calls.
interface ISeerView {
    function getScore(address) external view returns (uint16);
}

contract EcosystemVaultView {
    IEcosystemVaultView public immutable vault;
    ISeerView public immutable seer;

    uint8 public constant MERCHANT_RANKS = 100;
    uint256 public constant QUARTER = 90 days;
    uint256 public constant MAX_RANK_ITERATIONS = 200;
    uint8 public constant HEADHUNTER_RANKS = 20;
    uint16 public constant TIER1_THRESHOLD = 9500;
    uint16 public constant TIER2_THRESHOLD = 9000;
    uint16 public constant TIER3_THRESHOLD = 8500;
    uint16 public constant TIER4_THRESHOLD = 8000;
    uint16 public constant TIER1_MULTIPLIER = 5;
    uint16 public constant TIER2_MULTIPLIER = 4;
    uint16 public constant TIER3_MULTIPLIER = 3;
    uint16 public constant TIER4_MULTIPLIER = 2;

    constructor(address _vault, address _seer) {
        vault = IEcosystemVaultView(_vault);
        seer = ISeerView(_seer);
    }

    function getPoolBalances() external view returns (
        uint256 council, uint256 merchant, uint256 headhunter, uint256 total
    ) {
        council = vault.councilPool();
        merchant = vault.merchantPool();
        headhunter = vault.headhunterPool();
        total = vault.rewardToken().balanceOf(address(vault));
    }

    function getMerchantStats(address merchant) external view returns (
        uint256 txCount, uint256 bonusesPaid, uint16 currentTier, uint8 currentPeriodRank
    ) {
        uint256 period = vault.currentMerchantPeriod();
        txCount = vault.periodMerchantTxCount(period, merchant);
        bonusesPaid = vault.totalMerchantBonusesPaid(merchant);
        currentTier = _getMerchantBonusTier(seer.getScore(merchant));
        currentPeriodRank = 0; // Rank requires iteration — callers should use off-chain indexing
    }

    function getHeadhunterStats(address referrer) external view returns (
        uint16 currentYearPoints, uint8 estimatedRank,
        uint256 currentYearNumber, uint256 currentQuarterNumber, uint256 quarterEndsAt
    ) {
        uint256 year = vault.currentYear();
        uint256 qtr = vault.currentQuarter();
        currentYearPoints = vault.yearPoints(year, referrer);
        estimatedRank = 0; // Rank requires iteration — callers should use off-chain indexing
        currentYearNumber = year;
        currentQuarterNumber = qtr;
        quarterEndsAt = vault.yearStartTime() + (QUARTER * qtr);
    }

    function getReferralLevelStatus(address referrer, uint256 year) external view returns (
        uint16 points, uint8 unlockedLevel, uint8 highestPaidLevel,
        uint8 nextLevel, uint16 nextLevelRequiredPoints, uint256 nextLevelReward
    ) {
        points = vault.yearPoints(year, referrer);
        unlockedLevel = _getReferralWorkLevel(points);
        highestPaidLevel = vault.referralLevelPaid(year, referrer);
        nextLevel = highestPaidLevel >= 4 ? 0 : highestPaidLevel + 1;
        nextLevelRequiredPoints = _getReferralLevelRequiredPoints(nextLevel);
        nextLevelReward = _getReferralLevelReward(nextLevel);
    }

    function getPendingReferral(address referred) external view returns (
        address merchantReferrer, address userReferrer, bool credited
    ) {
        merchantReferrer = vault.pendingMerchantReferrer(referred);
        userReferrer = vault.pendingUserReferrer(referred);
        credited = vault.referralCredited(referred);
    }

    function getSpendingSummary() external view returns (
        uint256 councilTotal, uint256 merchantTotal, uint256 headhunterTotal,
        uint256 burnedTotal, uint256 expensesTotal, uint256 grandTotal
    ) {
        councilTotal = vault.totalCouncilPaid();
        merchantTotal = vault.totalMerchantBonusPaid();
        headhunterTotal = vault.totalHeadhunterPaid();
        burnedTotal = vault.totalBurned();
        expensesTotal = vault.totalExpensesPaid();
        grandTotal = councilTotal + merchantTotal + headhunterTotal + burnedTotal + expensesTotal;
    }

    function getVaultHealth() external view returns (
        uint256 currentBalance, uint256 totalIn, uint256 totalOut,
        uint256 councilPoolBalance, uint256 merchantPoolBalance, uint256 headhunterPoolBalance
    ) {
        currentBalance = vault.rewardToken().balanceOf(address(vault));
        uint256 cp = vault.councilPool();
        uint256 mp = vault.merchantPool();
        uint256 hp = vault.headhunterPool();
        uint256 op = vault.operationsPool();
        uint256 tcp = vault.totalCouncilPaid();
        uint256 tmp = vault.totalMerchantBonusPaid();
        uint256 thp = vault.totalHeadhunterPaid();
        uint256 tb = vault.totalBurned();
        uint256 te = vault.totalExpensesPaid();
        totalIn = cp + mp + hp + op + tcp + tmp + thp + tb + te;
        totalOut = tcp + tmp + thp + tb + te;
        councilPoolBalance = cp;
        merchantPoolBalance = mp;
        headhunterPoolBalance = hp;
    }

    function previewMerchantReward(uint256 period, address merchant) external view returns (
        uint256 txCount, uint16 bestTier, bool claimed, bool periodEnded, uint256 poolSnapshot
    ) {
        txCount = vault.periodMerchantTxCount(period, merchant);
        bestTier = vault.periodMerchantTier(period, merchant);
        claimed = vault.merchantPeriodClaimed(period, merchant);
        periodEnded = vault.merchantPeriodEnded(period);
        poolSnapshot = vault.merchantPeriodPoolSnapshot(period);
    }

    function previewHeadhunterReward(uint256 year, uint256 quarter, address referrer) external view returns (
        uint16 referrerPoints, bool claimed, bool quarterEndedFlag, uint256 poolSnapshot
    ) {
        referrerPoints = vault.yearPoints(year, referrer);
        claimed = vault.quarterClaimed(year, quarter, referrer);
        quarterEndedFlag = vault.quarterEnded(year, quarter);
        poolSnapshot = vault.quarterPoolSnapshot(year, quarter);
    }

    function getOperationsStatus() external view returns (
        address wallet, uint256 pool, uint256 lastWithdrawal,
        uint256 cooldown, bool canWithdraw
    ) {
        wallet = vault.operationsWallet();
        pool = vault.operationsPool();
        lastWithdrawal = vault.lastOperationsWithdrawal();
        cooldown = vault.operationsWithdrawalCooldown();
        canWithdraw = wallet != address(0) && pool > 0
            && block.timestamp >= lastWithdrawal + cooldown;
    }

    function getMerchantTierMultipliers() external pure returns (
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

    // ── Internal helpers ──

    function _getMerchantBonusTier(uint16 score) internal pure returns (uint16) {
        if (score >= TIER1_THRESHOLD) return TIER1_MULTIPLIER;
        if (score >= TIER2_THRESHOLD) return TIER2_MULTIPLIER;
        if (score >= TIER3_THRESHOLD) return TIER3_MULTIPLIER;
        if (score >= TIER4_THRESHOLD) return TIER4_MULTIPLIER;
        return 0;
    }

    function _getReferralWorkLevel(uint16 points) internal view returns (uint8) {
        if (points >= vault.referralLevel4Points()) return 4;
        if (points >= vault.referralLevel3Points()) return 3;
        if (points >= vault.referralLevel2Points()) return 2;
        if (points >= vault.referralLevel1Points()) return 1;
        return 0;
    }

    function _getReferralLevelReward(uint8 level) internal view returns (uint256) {
        if (level == 1) return vault.referralLevel1Reward();
        if (level == 2) return vault.referralLevel2Reward();
        if (level == 3) return vault.referralLevel3Reward();
        if (level == 4) return vault.referralLevel4Reward();
        return 0;
    }

    function _getReferralLevelRequiredPoints(uint8 level) internal view returns (uint16) {
        if (level == 1) return vault.referralLevel1Points();
        if (level == 2) return vault.referralLevel2Points();
        if (level == 3) return vault.referralLevel3Points();
        if (level == 4) return vault.referralLevel4Points();
        return 0;
    }
}
