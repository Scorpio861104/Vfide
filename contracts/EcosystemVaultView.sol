// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "./SharedInterfaces.sol";

/**
 * EcosystemVaultView — Read-only companion for EcosystemVault.
 * Extracted to reduce EcosystemVault's deployed bytecode below 24576 bytes.
 * All external view/pure functions that were gas-heavy in bytecode live here.
 * @notice IEcosystemVaultView
 * @title IEcosystemVaultView
 * @author Vfide
 */

interface IEcosystemVaultView {
    /// @notice councilPool
    /// @return _uint256 _uint256
    function councilPool() external view returns (uint256);
    /// @notice merchantPool
    /// @return _uint256 _uint256
    function merchantPool() external view returns (uint256);
    /// @notice headhunterPool
    /// @return _uint256 _uint256
    function headhunterPool() external view returns (uint256);
    /// @notice operationsPool
    /// @return _uint256 _uint256
    function operationsPool() external view returns (uint256);
    /// @notice rewardToken
    /// @return _arg _arg
    function rewardToken() external view returns (IERC20);
    /// @notice currentMerchantPeriod
    /// @return _uint256 _uint256
    function currentMerchantPeriod() external view returns (uint256);
    /// @notice currentYear
    /// @return _uint256 _uint256
    function currentYear() external view returns (uint256);
    /// @notice currentQuarter
    /// @return _uint256 _uint256
    function currentQuarter() external view returns (uint256);
    /// @notice yearStartTime
    /// @return _uint256 _uint256
    function yearStartTime() external view returns (uint256);
    /// @notice totalCouncilPaid
    /// @return _uint256 _uint256
    function totalCouncilPaid() external view returns (uint256);
    /// @notice totalMerchantBonusPaid
    /// @return _uint256 _uint256
    function totalMerchantBonusPaid() external view returns (uint256);
    /// @notice totalHeadhunterPaid
    /// @return _uint256 _uint256
    function totalHeadhunterPaid() external view returns (uint256);
    /// @notice totalBurned
    /// @return _uint256 _uint256
    function totalBurned() external view returns (uint256);
    /// @notice totalExpensesPaid
    /// @return _uint256 _uint256
    function totalExpensesPaid() external view returns (uint256);
    /// @notice periodMerchantTxCount
    /// @return _uint256 _uint256
    function periodMerchantTxCount(uint256, address) external view returns (uint256);
    /// @notice periodMerchantTier
    /// @return _uint16 _uint16
    function periodMerchantTier(uint256, address) external view returns (uint16);
    /// @notice merchantPeriodClaimed
    /// @return _bool _bool
    function merchantPeriodClaimed(uint256, address) external view returns (bool);
    /// @notice merchantPeriodEnded
    /// @return _bool _bool
    function merchantPeriodEnded(uint256) external view returns (bool);
    /// @notice merchantPeriodPoolSnapshot
    /// @return _uint256 _uint256
    function merchantPeriodPoolSnapshot(uint256) external view returns (uint256);
    /// @notice yearPoints
    /// @return _uint16 _uint16
    function yearPoints(uint256, address) external view returns (uint16);
    /// @notice quarterClaimed
    /// @return _bool _bool
    function quarterClaimed(uint256, uint256, address) external view returns (bool);
    /// @notice quarterEnded
    /// @return _bool _bool
    function quarterEnded(uint256, uint256) external view returns (bool);
    /// @notice quarterPoolSnapshot
    /// @return _uint256 _uint256
    function quarterPoolSnapshot(uint256, uint256) external view returns (uint256);
    /// @notice pendingMerchantReferrer
    /// @return _address _address
    function pendingMerchantReferrer(address) external view returns (address);
    /// @notice pendingUserReferrer
    /// @return _address _address
    function pendingUserReferrer(address) external view returns (address);
    /// @notice referralCredited
    /// @return _bool _bool
    function referralCredited(address) external view returns (bool);
    /// @notice totalMerchantBonusesPaid
    /// @return _uint256 _uint256
    function totalMerchantBonusesPaid(address) external view returns (uint256);
    /// @notice periodMerchants
    /// @return _address _address
    function periodMerchants(uint256, uint256) external view returns (address);
    /// @notice yearReferrers
    /// @return _address _address
    function yearReferrers(uint256, uint256) external view returns (address);
    /// @notice operationsWallet
    /// @return _address _address
    function operationsWallet() external view returns (address);
    /// @notice lastOperationsWithdrawal
    /// @return _uint256 _uint256
    function lastOperationsWithdrawal() external view returns (uint256);
    /// @notice operationsWithdrawalCooldown
    /// @return _uint256 _uint256
    function operationsWithdrawalCooldown() external view returns (uint256);
    /// @notice referralLevelPaid
    /// @return _uint8 _uint8
    function referralLevelPaid(uint256, address) external view returns (uint8);
    /// @notice referralLevel1Points
    /// @return _uint16 _uint16
    function referralLevel1Points() external view returns (uint16);
    /// @notice referralLevel2Points
    /// @return _uint16 _uint16
    function referralLevel2Points() external view returns (uint16);
    /// @notice referralLevel3Points
    /// @return _uint16 _uint16
    function referralLevel3Points() external view returns (uint16);
    /// @notice referralLevel4Points
    /// @return _uint16 _uint16
    function referralLevel4Points() external view returns (uint16);
    /// @notice referralLevel1Reward
    /// @return _uint256 _uint256
    function referralLevel1Reward() external view returns (uint256);
    /// @notice referralLevel2Reward
    /// @return _uint256 _uint256
    function referralLevel2Reward() external view returns (uint256);
    /// @notice referralLevel3Reward
    /// @return _uint256 _uint256
    function referralLevel3Reward() external view returns (uint256);
    /// @notice referralLevel4Reward
    /// @return _uint256 _uint256
    function referralLevel4Reward() external view returns (uint256);
}

/// @dev Minimal ISeer subset for view-only calls.
/// @notice ISeerView
/// @title ISeerView
/// @author Vfide
interface ISeerView {
    /// @notice getScore
    /// @return _uint16 _uint16
    function getScore(address) external view returns (uint16);
}

// ReentrancyGuard intentionally omitted: read-only view adapter with immutable references and no transfers.
/// @notice EcosystemVaultView
/// @title EcosystemVaultView
/// @author Vfide
contract EcosystemVaultView {
    /// @notice vault
    IEcosystemVaultView public immutable vault;
    /// @notice seer
    ISeerView public immutable seer;

    /// @notice MERCHANT_RANKS
    uint8 public constant MERCHANT_RANKS = 100;
    /// @notice QUARTER
    uint256 public constant QUARTER = 90 days;
    /// @notice MAX_RANK_ITERATIONS
    uint256 public constant MAX_RANK_ITERATIONS = 200;
    /// @notice HEADHUNTER_RANKS
    uint8 public constant HEADHUNTER_RANKS = 20;
    /// @notice TIER1_THRESHOLD
    uint16 public constant TIER1_THRESHOLD = 9500;
    /// @notice TIER2_THRESHOLD
    uint16 public constant TIER2_THRESHOLD = 9000;
    /// @notice TIER3_THRESHOLD
    uint16 public constant TIER3_THRESHOLD = 8500;
    /// @notice TIER4_THRESHOLD
    uint16 public constant TIER4_THRESHOLD = 8000;
    /// @notice TIER1_MULTIPLIER
    uint16 public constant TIER1_MULTIPLIER = 5;
    /// @notice TIER2_MULTIPLIER
    uint16 public constant TIER2_MULTIPLIER = 4;
    /// @notice TIER3_MULTIPLIER
    uint16 public constant TIER3_MULTIPLIER = 3;
    /// @notice TIER4_MULTIPLIER
    uint16 public constant TIER4_MULTIPLIER = 2;

    /// @notice constructor
    /// @param _vault _vault
    /// @param _seer _seer
    constructor(address _vault, address _seer) {
        vault = IEcosystemVaultView(_vault);
        seer = ISeerView(_seer);
    }

    /// @notice getPoolBalances
    /// @return council council
    /// @return merchant merchant
    /// @return headhunter headhunter
    /// @return total total
    function getPoolBalances() external view returns (
        uint256 council, uint256 merchant, uint256 headhunter, uint256 total
    ) {
        council = vault.councilPool();
        merchant = vault.merchantPool();
        headhunter = vault.headhunterPool();
        total = vault.rewardToken().balanceOf(address(vault));
    }

    /// @notice getMerchantStats
    /// @param merchant merchant
    /// @return txCount txCount
    /// @return bonusesPaid bonusesPaid
    /// @return currentTier currentTier
    /// @return currentPeriodRank currentPeriodRank
    function getMerchantStats(address merchant) external view returns (
        uint256 txCount, uint256 bonusesPaid, uint16 currentTier, uint8 currentPeriodRank
    ) {
        uint256 period = vault.currentMerchantPeriod();
        txCount = vault.periodMerchantTxCount(period, merchant);
        bonusesPaid = vault.totalMerchantBonusesPaid(merchant);
        currentTier = _getMerchantBonusTier(seer.getScore(merchant));
        currentPeriodRank = 0; // Rank requires iteration — callers should use off-chain indexing
    }

    /// @notice getHeadhunterStats
    /// @param referrer referrer
    /// @return currentYearPoints currentYearPoints
    /// @return estimatedRank estimatedRank
    /// @return currentYearNumber currentYearNumber
    /// @return currentQuarterNumber currentQuarterNumber
    /// @return quarterEndsAt quarterEndsAt
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

    /// @notice getReferralLevelStatus
    /// @param referrer referrer
    /// @param year year
    /// @return points points
    /// @return unlockedLevel unlockedLevel
    /// @return highestPaidLevel highestPaidLevel
    /// @return nextLevel nextLevel
    /// @return nextLevelRequiredPoints nextLevelRequiredPoints
    /// @return nextLevelReward nextLevelReward
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

    /// @notice getPendingReferral
    /// @param referred referred
    /// @return merchantReferrer merchantReferrer
    /// @return userReferrer userReferrer
    /// @return credited credited
    function getPendingReferral(address referred) external view returns (
        address merchantReferrer, address userReferrer, bool credited
    ) {
        merchantReferrer = vault.pendingMerchantReferrer(referred);
        userReferrer = vault.pendingUserReferrer(referred);
        credited = vault.referralCredited(referred);
    }

    /// @notice getSpendingSummary
    /// @return councilTotal councilTotal
    /// @return merchantTotal merchantTotal
    /// @return headhunterTotal headhunterTotal
    /// @return burnedTotal burnedTotal
    /// @return expensesTotal expensesTotal
    /// @return grandTotal grandTotal
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

    /// @notice getVaultHealth
    /// @return currentBalance currentBalance
    /// @return totalIn totalIn
    /// @return totalOut totalOut
    /// @return councilPoolBalance councilPoolBalance
    /// @return merchantPoolBalance merchantPoolBalance
    /// @return headhunterPoolBalance headhunterPoolBalance
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

    /// @notice previewMerchantReward
    /// @param period period
    /// @param merchant merchant
    /// @return txCount txCount
    /// @return bestTier bestTier
    /// @return claimed claimed
    /// @return periodEnded periodEnded
    /// @return poolSnapshot poolSnapshot
    function previewMerchantReward(uint256 period, address merchant) external view returns (
        uint256 txCount, uint16 bestTier, bool claimed, bool periodEnded, uint256 poolSnapshot
    ) {
        txCount = vault.periodMerchantTxCount(period, merchant);
        bestTier = vault.periodMerchantTier(period, merchant);
        claimed = vault.merchantPeriodClaimed(period, merchant);
        periodEnded = vault.merchantPeriodEnded(period);
        poolSnapshot = vault.merchantPeriodPoolSnapshot(period);
    }

    /// @notice previewHeadhunterReward
    /// @param year year
    /// @param quarter quarter
    /// @param referrer referrer
    /// @return referrerPoints referrerPoints
    /// @return claimed claimed
    /// @return quarterEndedFlag quarterEndedFlag
    /// @return poolSnapshot poolSnapshot
    function previewHeadhunterReward(uint256 year, uint256 quarter, address referrer) external view returns (
        uint16 referrerPoints, bool claimed, bool quarterEndedFlag, uint256 poolSnapshot
    ) {
        referrerPoints = vault.yearPoints(year, referrer);
        claimed = vault.quarterClaimed(year, quarter, referrer);
        quarterEndedFlag = vault.quarterEnded(year, quarter);
        poolSnapshot = vault.quarterPoolSnapshot(year, quarter);
    }

    /// @notice getOperationsStatus
    /// @return wallet wallet
    /// @return pool pool
    /// @return lastWithdrawal lastWithdrawal
    /// @return cooldown cooldown
    /// @return canWithdraw canWithdraw
    function getOperationsStatus() external view returns (
        address wallet, uint256 pool, uint256 lastWithdrawal,
        uint256 cooldown, bool canWithdraw
    ) {
        wallet = vault.operationsWallet();
        pool = vault.operationsPool();
        lastWithdrawal = vault.lastOperationsWithdrawal();
        cooldown = vault.operationsWithdrawalCooldown();
        canWithdraw = wallet != address(0) && pool > 0 && block.timestamp >= lastWithdrawal + cooldown;
    }

    /// @notice getMerchantTierMultipliers
    /// @return tier1Threshold tier1Threshold
    /// @return tier1Multiplier tier1Multiplier
    /// @return tier2Threshold tier2Threshold
    /// @return tier2Multiplier tier2Multiplier
    /// @return tier3Threshold tier3Threshold
    /// @return tier3Multiplier tier3Multiplier
    /// @return tier4Threshold tier4Threshold
    /// @return tier4Multiplier tier4Multiplier
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

    /// @notice _getMerchantBonusTier
    /// @param score score
    /// @return _uint16 _uint16
    function _getMerchantBonusTier(uint16 score) internal pure returns (uint16) {
        if (score >= TIER1_THRESHOLD) return TIER1_MULTIPLIER;
        if (score >= TIER2_THRESHOLD) return TIER2_MULTIPLIER;
        if (score >= TIER3_THRESHOLD) return TIER3_MULTIPLIER;
        if (score >= TIER4_THRESHOLD) return TIER4_MULTIPLIER;
        return 0;
    }

    /// @notice _getReferralWorkLevel
    /// @param points points
    /// @return _uint8 _uint8
    function _getReferralWorkLevel(uint16 points) internal view returns (uint8) {
        if (points >= vault.referralLevel4Points()) return 4;
        if (points >= vault.referralLevel3Points()) return 3;
        if (points >= vault.referralLevel2Points()) return 2;
        if (points >= vault.referralLevel1Points()) return 1;
        return 0;
    }

    /// @notice _getReferralLevelReward
    /// @param level level
    /// @return _uint256 _uint256
    function _getReferralLevelReward(uint8 level) internal view returns (uint256) {
        if (level == 1) return vault.referralLevel1Reward();
        if (level == 2) return vault.referralLevel2Reward();
        if (level == 3) return vault.referralLevel3Reward();
        if (level == 4) return vault.referralLevel4Reward();
        return 0;
    }

    /// @notice _getReferralLevelRequiredPoints
    /// @param level level
    /// @return _uint16 _uint16
    function _getReferralLevelRequiredPoints(uint8 level) internal view returns (uint16) {
        if (level == 1) return vault.referralLevel1Points();
        if (level == 2) return vault.referralLevel2Points();
        if (level == 3) return vault.referralLevel3Points();
        if (level == 4) return vault.referralLevel4Points();
        return 0;
    }
}
