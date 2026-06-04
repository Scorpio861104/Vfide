// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20, ISeer, ICouncilManager, ISwapRouter, SafeERC20, Ownable, ReentrancyGuard } from "./SharedInterfaces.sol";
import { EcosystemVaultLib } from "./EcosystemVaultLib.sol";

/// @dev Minimal interface for token decimals discovery (F-SC-030 fix).
///      Used by migrateRewardToken to require old- and new-token decimals
///      match before swapping the reward token, since pool balances are
///      tracked in raw token units.
/// @notice IERC20MetadataDecimals
/// @title IERC20MetadataDecimals
/// @author Vfide
interface IERC20MetadataDecimals {
    /// @notice decimals
    /// @return _uint8 _uint8
    function decimals() external view returns (uint8);
}

/// @notice IVaultHubReferral_ECO
/// @title IVaultHubReferral_ECO
/// @author Vfide
interface IVaultHubReferral_ECO {
    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address);
}

/**
 * EcosystemVault — Growth Incentive Treasury (Howey-safe)
 * ----------------------------------------------------------
 * Receives 50% of all transfer fees from ProofScoreBurnRouter.
 * 
 * Active buckets:
 * 
 * 1. COUNCIL REWARDS (50%)
 *    - Split evenly between active council members (1-12)
 *    - Distributed every 120 days via CouncilSalary contract
 *    - Each member gets: councilPool / activeMembers
 * 
 * 2. MERCHANT WORK REWARDS (fixed payouts for verified merchant work)
 * 3. REFERRAL WORK REWARDS (fixed payouts for verified acquisition work)
 * 4. OPERATIONS
 *    - Reserved for protocol operations and upgrades
 * 
 * NOTE: Percentage/rank-based merchant and headhunter claims remain disabled.
 * Fixed payout compensation for verified work remains available.
 *
 * Owner-controlled pre-mainnet, DAO-controlled post-mainnet.
 * @notice ECO_NotAuthorized
 */

error ECO_NotAuthorized();
/// @notice ECO_InsufficientFunds
error ECO_InsufficientFunds();
/// @notice ECO_Zero
error ECO_Zero();
/// @notice ECO_NotEligible
error ECO_NotEligible();
/// @notice ECO_TooEarly
error ECO_TooEarly();
/// @notice ECO_ArrayCapReached
error ECO_ArrayCapReached();
/// @notice Permanently reverts — token rewards for referrals or merchant ranking are not available (Howey compliance)
error ECO_CouncilBelowMinimum();
/// @notice ECO_MerchantBelowMinimum
error ECO_MerchantBelowMinimum();
/// @notice ECO_HeadhunterBelowMinimum
error ECO_HeadhunterBelowMinimum();
/// @notice ECO_AlreadyExecuted
error ECO_AlreadyExecuted();
/// @notice ECO_AlreadyCancelled
error ECO_AlreadyCancelled();
/// @notice ECO_TimelockNotPassed
error ECO_TimelockNotPassed();
/// @notice ECO_InvalidConfig
error ECO_InvalidConfig();
/// @notice ECO_ExceedsMax
error ECO_ExceedsMax();
/// @notice ECO_NoPendingChange
error ECO_NoPendingChange();
/// @notice ECO_ChangeNotReady
error ECO_ChangeNotReady();
/// @notice ECO_ExpenseCapExceeded
error ECO_ExpenseCapExceeded();
/// @notice ECO_BpsTooHigh
error ECO_BpsTooHigh();
/// @notice ECO_MerchantEpochCapExceeded
error ECO_MerchantEpochCapExceeded();
/// @notice ECO_HeadhunterEpochCapExceeded
error ECO_HeadhunterEpochCapExceeded();

/// @notice EcosystemVault
/// @title EcosystemVault
/// @author Vfide
contract EcosystemVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Admin Facet — delegatecall target for all onlyOwner config setters ───
    address public immutable adminFacet;

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice ManagerSet
    /// @param manager manager
    /// @param active active
    event ManagerSet(address manager, bool active);
    /// @notice CouncilDistributed
    /// @param totalAmount totalAmount
    /// @param memberCount memberCount
    /// @param perMember perMember
    event CouncilDistributed(uint256 totalAmount, uint8 memberCount, uint256 perMember);
    /// @notice HeadhunterQuarterEnded
    /// @param year year
    /// @param quarter quarter
    /// @param totalPool totalPool
    event HeadhunterQuarterEnded(uint256 year, uint256 quarter, uint256 totalPool);
    /// @notice ReferralRecorded
    /// @param referrer referrer
    /// @param referred referred
    /// @param isMerchant isMerchant
    /// @param points points
    event ReferralRecorded(address indexed referrer, address indexed referred, bool isMerchant, uint16 points);
    /// @notice AllocationUpdated
    /// @param councilBps councilBps
    /// @param merchantBps merchantBps
    /// @param headhunterBps headhunterBps
    /// @param operationsBps operationsBps
    event AllocationUpdated(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps, uint16 operationsBps);
    /// @notice MerchantPeriodEnded
    /// @param period period
    /// @param poolSnapshot poolSnapshot
    event MerchantPeriodEnded(uint256 period, uint256 poolSnapshot);
    /// @notice SeerUpdated
    /// @param oldSeer oldSeer
    /// @param newSeer newSeer
    event SeerUpdated(address indexed oldSeer, address indexed newSeer);
    /// @notice PendingReferralRegistered
    /// @param referred referred
    /// @param referrer referrer
    /// @param isMerchant isMerchant
    event PendingReferralRegistered(address indexed referred, address indexed referrer, bool isMerchant);
    /// @notice RewardTokenUpdated
    /// @param oldToken oldToken
    /// @param newToken newToken
    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
    /// @notice OperationsCooldownSet
    /// @param oldCooldown oldCooldown
    /// @param newCooldown newCooldown
    event OperationsCooldownSet(uint256 oldCooldown, uint256 newCooldown);
    /// @notice ReferralVaultHubUpdated
    /// @param oldHub oldHub
    /// @param newHub newHub
    event ReferralVaultHubUpdated(address indexed oldHub, address indexed newHub);
    /// @notice ManagerChangeQueued
    /// @param manager manager
    /// @param active active
    /// @param executeAfter executeAfter
    event ManagerChangeQueued(address indexed manager, bool active, uint256 executeAfter);
    /// @notice AllocationChangeQueued
    /// @param councilBps councilBps
    /// @param merchantBps merchantBps
    /// @param headhunterBps headhunterBps
    /// @param operationsBps operationsBps
    /// @param executeAfter executeAfter
    event AllocationChangeQueued(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps, uint16 operationsBps, uint256 executeAfter);
    /// @notice CouncilManagerChangeQueued
    /// @param councilManager councilManager
    /// @param executeAfter executeAfter
    event CouncilManagerChangeQueued(address indexed councilManager, uint256 executeAfter);
    /// @notice CouncilManagerUpdated
    /// @param oldCouncilManager oldCouncilManager
    /// @param newCouncilManager newCouncilManager
    event CouncilManagerUpdated(address indexed oldCouncilManager, address indexed newCouncilManager);
    /// @notice OperationsWalletChangeQueued
    /// @param wallet wallet
    /// @param executeAfter executeAfter
    event OperationsWalletChangeQueued(address indexed wallet, uint256 executeAfter);
    /// @notice OperationsWalletUpdated
    /// @param oldWallet oldWallet
    /// @param newWallet newWallet
    event OperationsWalletUpdated(address indexed oldWallet, address indexed newWallet);
    /// @notice ExpenseEpochRolled
    /// @param startedAt startedAt
    /// @param baseOperationsPool baseOperationsPool
    /// @param capAmount capAmount
    event ExpenseEpochRolled(uint256 startedAt, uint256 baseOperationsPool, uint256 capAmount);
    /// @notice WithdrawRequested
    /// @param id id
    /// @param to to
    /// @param amount amount
    event WithdrawRequested(uint256 indexed id, address to, uint256 amount);
    /// @notice WithdrawCancelled
    /// @param id id
    event WithdrawCancelled(uint256 indexed id);
    /// @notice WithdrawExecuted
    /// @param id id
    /// @param to to
    /// @param amount amount
    event WithdrawExecuted(uint256 indexed id, address to, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice MAX_BPS
    uint16 public constant MAX_BPS = 10000;
    /// @notice MAX_COUNCIL_MEMBERS
    uint8 public constant MAX_COUNCIL_MEMBERS = 12;
    /// @notice HEADHUNTER_RANKS
    uint8 public constant HEADHUNTER_RANKS = 20;
    /// @notice MERCHANT_RANKS
    uint8 public constant MERCHANT_RANKS = 100;
    /// @notice MONTH
    uint256 public constant MONTH = 30 days;
    /// @notice QUARTER
    uint256 public constant QUARTER = 90 days;
    /// @notice SENSITIVE_CHANGE_DELAY
    uint256 public constant SENSITIVE_CHANGE_DELAY = 2 days;
    /// @notice EXPENSE_EPOCH_DURATION
    uint256 public constant EXPENSE_EPOCH_DURATION = 7 days;
    /// @notice EXPENSE_EPOCH_CAP_BPS
    uint16 public constant EXPENSE_EPOCH_CAP_BPS = 2500;
    
    // Points for referrals
    /// @notice POINTS_USER_REFERRAL
    uint16 public constant POINTS_USER_REFERRAL = 1;
    /// @notice POINTS_MERCHANT_REFERRAL
    uint16 public constant POINTS_MERCHANT_REFERRAL = 3;
    
    // Minimum score to participate in headhunter program (60%)
    /// @notice HEADHUNTER_MIN_SCORE
    uint16 public constant HEADHUNTER_MIN_SCORE = 6000;
    
    // Minimum activity for referral to count
    /// @notice MIN_MERCHANT_TX
    uint8 public constant MIN_MERCHANT_TX = 3;        // Merchant needs 3 transactions
    /// @notice MIN_USER_VAULT_USD
    uint256 public constant MIN_USER_VAULT_USD = 25;  // User needs $25 worth in vault
    /// @notice MIN_USER_VAULT_BALANCE
    uint256 public constant MIN_USER_VAULT_BALANCE = 25e18;

    // Merchant tier multipliers (weight for ranking, not direct payout)
    // Higher tier = more weight per transaction
    /// @notice TIER1_THRESHOLD
    uint16 public constant TIER1_THRESHOLD = 9500;  // 95%+ ProofScore
    /// @notice TIER2_THRESHOLD
    uint16 public constant TIER2_THRESHOLD = 9000;  // 90-94%
    /// @notice TIER3_THRESHOLD
    uint16 public constant TIER3_THRESHOLD = 8500;  // 85-89%
    /// @notice TIER4_THRESHOLD
    uint16 public constant TIER4_THRESHOLD = 8000;  // 80-84%
    /// @notice TIER1_MULTIPLIER
    uint16 public constant TIER1_MULTIPLIER = 5;    // 5x weight
    /// @notice TIER2_MULTIPLIER
    uint16 public constant TIER2_MULTIPLIER = 4;    // 4x weight
    /// @notice TIER3_MULTIPLIER
    uint16 public constant TIER3_MULTIPLIER = 3;    // 3x weight
    /// @notice TIER4_MULTIPLIER
    uint16 public constant TIER4_MULTIPLIER = 2;    // 2x weight

    // Merchant rank share distribution (100 ranks, total = 10000 bps = 100%)
    // Rank 1-5:    500 bps each = 25%
    // Rank 6-10:   300 bps each = 15%
    // Rank 11-20:  200 bps each = 20%
    // Rank 21-40:  100 bps each = 20%
    // Rank 41-60:   50 bps each = 10%
    // Rank 61-100:  25 bps each = 10%
    // Total: 25 + 15 + 20 + 20 + 10 + 10 = 100%

    // Array caps to prevent O(n²) gas issues
    /// @notice MAX_MERCHANTS_PER_PERIOD
    uint256 public constant MAX_MERCHANTS_PER_PERIOD = 500;
    /// @notice MAX_REFERRERS_PER_YEAR
    uint256 public constant MAX_REFERRERS_PER_YEAR = 200;
    /// @notice MAX_RANK_ITERATIONS
    uint256 public constant MAX_RANK_ITERATIONS = 200;  // Max iterations for ranking calculation
    /// @notice MAX_COUNCIL_DISTRIBUTION_BATCH
    uint256 public constant MAX_COUNCIL_DISTRIBUTION_BATCH = 200;

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice vfide
    IERC20 public immutable vfide;
    /// @notice rewardToken
    IERC20 public rewardToken;
    /// @notice seer
    ISeer public seer;
    /// @notice councilManager
    ICouncilManager public councilManager;
    /// @notice referralVaultHub
    IVaultHubReferral_ECO public referralVaultHub;
    
    /// @notice isManager
    mapping(address => bool) public isManager;

    // Emergency withdrawal queue (timelocked owner-only withdrawals)
    struct WithdrawRequest {
        address to;
        uint256 amount;
        uint256 requestedAt;
        bool executed;
        bool cancelled;
    }
    /// @notice withdrawRequestCount
    uint256 public withdrawRequestCount;
    /// @notice withdrawRequests
    mapping(uint256 => WithdrawRequest) public withdrawRequests;
    /// @notice WITHDRAW_TIMELOCK
    uint256 public constant WITHDRAW_TIMELOCK = 2 days;
    /// @notice maxWithdrawBps
    uint256 public maxWithdrawBps = 1000;
    /// @notice pendingWithdrawTotal
    uint256 public pendingWithdrawTotal;

    struct PendingManagerChange {
        address manager;
        bool active;
        uint256 executeAfter;
    }

    struct PendingAllocationChange {
        uint16 councilBps;
        uint16 merchantBps;
        uint16 headhunterBps;
        uint256 executeAfter;
    }

    struct PendingCouncilManagerChange {
        address councilManager;
        uint256 executeAfter;
    }

    struct PendingOperationsWalletChange {
        address wallet;
        uint256 executeAfter;
    }

    /// @notice pendingManagerChange
    PendingManagerChange public pendingManagerChange;
    /// @notice pendingAllocationChange
    PendingAllocationChange public pendingAllocationChange;
    /// @notice pendingCouncilManagerChange
    PendingCouncilManagerChange public pendingCouncilManagerChange;
    /// @notice pendingOperationsWalletChange
    PendingOperationsWalletChange public pendingOperationsWalletChange;

    // Allocation buckets (council + merchant + headhunter + operations = 10000)
    /// @notice councilBps
    uint16 public councilBps = 2500;      // 25% - DAO council
    /// @notice merchantBps
    uint16 public merchantBps = 2500;     // 25% - Merchant rewards
    /// @notice headhunterBps
    uint16 public headhunterBps = 2500;   // 25% - Referral rewards
    /// @notice operationsBps
    uint16 public operationsBps = 2500;   // 25% - Team operations/sustainability
    
    /// @notice MIN_ALLOCATION_BPS
    uint16 public constant MIN_ALLOCATION_BPS = 500; // Reduced to 5% to allow 4-way split
    
    // Operations wallet for team sustainability
    /// @notice operationsWallet
    address public operationsWallet;
    /// @notice lastOperationsWithdrawal
    uint256 public lastOperationsWithdrawal;
    /// @notice operationsWithdrawalCooldown
    uint256 public operationsWithdrawalCooldown = 30 days;

    // Pool balances
    /// @notice councilPool
    uint256 public councilPool;
    /// @notice merchantPool
    uint256 public merchantPool;
    /// @notice headhunterPool
    uint256 public headhunterPool;
    // H-11 FIX: Per-epoch caps to prevent a compromised manager from draining pools in one call.
    // Default: 10% of pool per 30-day epoch; DAO can adjust via setEpochCaps().
    /// @notice merchantEpochCapBps
    uint16 public merchantEpochCapBps = 1000;     // 10% of merchantPool per epoch
    /// @notice headhunterEpochCapBps
    uint16 public headhunterEpochCapBps = 1000;   // 10% of headhunterPool per epoch
    /// @notice EPOCH_DURATION
    uint256 public constant EPOCH_DURATION = 30 days;
    /// @notice merchantEpochStart
    uint256 public merchantEpochStart;
    /// @notice headhunterEpochStart
    uint256 public headhunterEpochStart;
    /// @notice merchantPaidThisEpoch
    uint256 public merchantPaidThisEpoch;
    /// @notice headhunterPaidThisEpoch
    uint256 public headhunterPaidThisEpoch;
    /// @notice operationsPool
    uint256 public operationsPool;
    /// @notice totalReceived
    uint256 public totalReceived;

    // Council distribution tracking
    /// @notice lastCouncilDistribution
    uint256 public lastCouncilDistribution;

    // Merchant bonus tracking (monthly competition, top 100 ranks)
    /// @notice lastMerchantDistribution
    uint256 public lastMerchantDistribution;
    /// @notice currentMerchantPeriod
    uint256 public currentMerchantPeriod;
    /// @notice periodMerchantTxCount
    mapping(uint256 => mapping(address => uint256)) public periodMerchantTxCount; // period => merchant => txCount
    /// @notice periodMerchantTier
    mapping(uint256 => mapping(address => uint16)) public periodMerchantTier; // period => merchant => best tier
    /// @notice periodMerchants
    mapping(uint256 => address[]) public periodMerchants; // period => list of merchants
    /// @notice merchantPeriodPoolSnapshot
    mapping(uint256 => uint256) public merchantPeriodPoolSnapshot; // period => pool at end
    /// @notice merchantPeriodEnded
    mapping(uint256 => bool) public merchantPeriodEnded; // period => ended
    /// @notice merchantPeriodClaimed
    mapping(uint256 => mapping(address => bool)) public merchantPeriodClaimed; // period => merchant => claimed
    /// @notice totalMerchantBonusesPaid
    mapping(address => uint256) public totalMerchantBonusesPaid;
    /// @notice merchantLifetimeTxCount
    mapping(address => uint256) public merchantLifetimeTxCount;

    // Headhunter tracking (year-long accumulation, quarterly payouts)
    /// @notice currentYear
    uint256 public currentYear;
    /// @notice currentQuarter
    uint256 public currentQuarter; // 1-4
    /// @notice yearStartTime
    uint256 public yearStartTime;
    /// @notice lastQuarterPayout
    uint256 public lastQuarterPayout;
    /// @notice yearPoints
    mapping(uint256 => mapping(address => uint16)) public yearPoints; // year => referrer => points (accumulates all year)
    /// @notice yearReferrers
    mapping(uint256 => address[]) public yearReferrers; // year => list of referrers
    /// @notice POW-4 cached denominator for headhunter claim calculation.
    ///         Sum of all yearPoints[year][*]. Updated incrementally in
    ///         `_awardPoints` and read O(1) by `claimHeadhunterQuarterReward`.
    mapping(uint256 => uint256) public totalYearPoints;
    /// @notice quarterPoolSnapshot
    mapping(uint256 => mapping(uint256 => uint256)) public quarterPoolSnapshot; // year => quarter => pool amount
    /// @notice quarterClaimed
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public quarterClaimed; // year => quarter => referrer => claimed
    /// @notice quarterEnded
    mapping(uint256 => mapping(uint256 => bool)) public quarterEnded; // year => quarter => ended
    
    // Pending referrals (awaiting activity threshold)
    /// @notice pendingMerchantReferrer
    mapping(address => address) public pendingMerchantReferrer; // merchant => who referred them
    /// @notice pendingUserReferrer
    mapping(address => address) public pendingUserReferrer;     // user => who referred them
    /// @notice referralCredited
    mapping(address => bool) public referralCredited;           // referred => already credited

    // ═══════════════════════════════════════════════════════════════════════
    //                   STABLECOIN WORK-COMPENSATION (Howey-safe)
    // ═══════════════════════════════════════════════════════════════════════
    // DEX router for VFIDE → Stablecoin swaps when paying rewards
    /// @notice swapRouter
    address public swapRouter;
    /// @notice preferredStablecoin
    address public preferredStablecoin;  // e.g., USDC
    /// @notice autoSwapEnabled
    bool public autoSwapEnabled;         // Disabled by default; enable after liquidity is established
    /// @notice maxSlippageBps
    uint16 public maxSlippageBps = 100;  // 1% max slippage (default)

    // Admin-set floor price: stablecoin units per 1e18 VFIDE, used as minAmountOut in DEX swaps.
    // Protects against sandwich attacks without requiring a live on-chain oracle.
    // Example: 950000 = 0.95 USDC (6-decimal) per 1 VFIDE.  Must be set before enabling auto-swap.
    /// @notice minOutputPerVfide
    uint256 public minOutputPerVfide;

    // HOWEY FIX: Direct stablecoin reserve — owner/manager pre-funds with USDC/USDT.
    // Work rewards are drawn directly from this reserve with no DEX swap required.
    // This eliminates both the sandwich-attack risk and any expectation-of-profit argument:
    // workers receive a fixed-dollar service fee, not an appreciating VFIDE token.
    /// @notice stablecoinReserves
    mapping(address => uint256) public stablecoinReserves;

    // HOWEY FIX: When true, ALL work reward payments (merchant, referral, level payouts)
    // are paid in stablecoin — first from the direct reserve, then via DEX swap if needed.
    // Receiving a potentially-appreciating VFIDE token as "work compensation" creates a
    // profit expectation (Howey Prong 3). A fixed stablecoin service fee is unambiguous.
    // Requires preferredStablecoin to be set before enabling; swapRouter is optional when
    // the direct reserve is funded.
    /// @notice stablecoinOnlyMode
    bool public stablecoinOnlyMode;

    /// @notice AutoSwapConfigured
    /// @param router router
    /// @param stablecoin stablecoin
    /// @param enabled enabled
    /// @param maxSlippageBps maxSlippageBps
    event AutoSwapConfigured(address router, address stablecoin, bool enabled, uint16 maxSlippageBps);
    /// @notice MinOutputPerVfideSet
    /// @param minOutput minOutput
    event MinOutputPerVfideSet(uint256 minOutput);
    /// @notice StablecoinOnlyModeSet
    /// @param enabled enabled
    event StablecoinOnlyModeSet(bool enabled);
    /// @notice StablecoinDeposited
    /// @param token token
    /// @param from from
    /// @param amount amount
    event StablecoinDeposited(address indexed token, address indexed from, uint256 amount);
    /// @notice StablecoinReserveWithdrawn
    /// @param token token
    /// @param amount amount
    /// @param recipient recipient
    event StablecoinReserveWithdrawn(address indexed token, uint256 amount, address indexed recipient);
    /// @notice AutoWorkPayoutConfigured
    /// @param enabled enabled
    /// @param merchantTxReward merchantTxReward
    /// @param merchantReferralReward merchantReferralReward
    /// @param userReferralReward userReferralReward
    event AutoWorkPayoutConfigured(
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    );
    /// @notice AutoPayoutSustainabilityConfigured
    /// @param merchantReserveBps merchantReserveBps
    /// @param headhunterReserveBps headhunterReserveBps
    /// @param maxAutoPayoutBps maxAutoPayoutBps
    event AutoPayoutSustainabilityConfigured(
        uint16 merchantReserveBps,
        uint16 headhunterReserveBps,
        uint16 maxAutoPayoutBps
    );
    /// @notice ReferralWorkLevelsConfigured
    /// @param level1Points level1Points
    /// @param level2Points level2Points
    /// @param level3Points level3Points
    /// @param level4Points level4Points
    /// @param level1Reward level1Reward
    /// @param level2Reward level2Reward
    /// @param level3Reward level3Reward
    /// @param level4Reward level4Reward
    event ReferralWorkLevelsConfigured(
        uint16 level1Points,
        uint16 level2Points,
        uint16 level3Points,
        uint16 level4Points,
        uint256 level1Reward,
        uint256 level2Reward,
        uint256 level3Reward,
        uint256 level4Reward
    );

    // Automatic fixed work-payout configuration
    /// @notice autoWorkPayoutEnabled
    bool public autoWorkPayoutEnabled;
    /// @notice autoMerchantTxReward
    uint256 public autoMerchantTxReward;
    /// @notice autoMerchantReferralReward
    uint256 public autoMerchantReferralReward;
    /// @notice autoUserReferralReward
    uint256 public autoUserReferralReward;

    // Sustainability guardrails for burn-fee funded reward pools.
    // Reserve bps protect a minimum pool balance from reward payouts.
    /// @notice merchantPoolReserveBps
    uint16 public merchantPoolReserveBps = 2000;   // Keep 20% reserve in merchant pool.
    /// @notice headhunterPoolReserveBps
    uint16 public headhunterPoolReserveBps = 2000; // Keep 20% reserve in headhunter pool.
    // Auto payouts cannot exceed this fraction of current pool in a single execution.
    /// @notice maxAutoPayoutBps
    uint16 public maxAutoPayoutBps = 1000;         // Max 10% per auto payout.

    // Howey-safe referral work milestones (absolute thresholds, no ranking/profit share)
    /// @notice referralLevel1Points
    uint16 public referralLevel1Points = 10;
    /// @notice referralLevel2Points
    uint16 public referralLevel2Points = 25;
    /// @notice referralLevel3Points
    uint16 public referralLevel3Points = 50;
    /// @notice referralLevel4Points
    uint16 public referralLevel4Points = 100;

    // Fixed payout per milestone level; zero means disabled until configured by owner.
    /// @notice referralLevel1Reward
    uint256 public referralLevel1Reward;
    /// @notice referralLevel2Reward
    uint256 public referralLevel2Reward;
    /// @notice referralLevel3Reward
    uint256 public referralLevel3Reward;
    /// @notice referralLevel4Reward
    uint256 public referralLevel4Reward;

    // Highest referral-work level already paid for a referrer in a given year.
    /// @notice referralLevelPaid
    mapping(uint256 => mapping(address => uint8)) public referralLevelPaid;

    // ═══════════════════════════════════════════════════════════════════════
    //                     SPENDING HISTORY TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice totalCouncilPaid
    uint256 public totalCouncilPaid;
    /// @notice totalMerchantBonusPaid
    uint256 public totalMerchantBonusPaid;
    /// @notice totalHeadhunterPaid
    uint256 public totalHeadhunterPaid;
    /// @notice totalExpensesPaid
    uint256 public totalExpensesPaid;
    /// @notice operationsExpenseEpochStartedAt
    uint256 public operationsExpenseEpochStartedAt;
    /// @notice operationsExpenseEpochBase
    uint256 public operationsExpenseEpochBase;
    /// @notice operationsSpentInEpoch
    uint256 public operationsSpentInEpoch;

    // ── Claim reservation (prevents period/quarter snapshots from being re-absorbed by _allocateIncoming) ──
    // Appended at the storage tail: the AdminFacet delegatecall mirror writes only the config prefix and
    // never these slots, so appending here does not disturb its layout.
    /// @notice reservedForClaims — total rewardToken value reserved for outstanding period/quarter claims.
    uint256 public reservedForClaims;
    /// @notice merchantPeriodReserved — per-period remaining reserved (snapshot minus claimed); swept after the window.
    mapping(uint256 => uint256) public merchantPeriodReserved;
    /// @notice quarterReserved — per (year => quarter) remaining reserved; swept after the window.
    mapping(uint256 => mapping(uint256 => uint256)) public quarterReserved;
    /// @notice merchantPeriodEndedAt — timestamp a merchant period ended (for the claim window / sweep).
    mapping(uint256 => uint64) public merchantPeriodEndedAt;
    /// @notice quarterEndedAt — timestamp a headhunter quarter ended (for the claim window / sweep).
    mapping(uint256 => mapping(uint256 => uint64)) public quarterEndedAt;
    /// @notice CLAIM_WINDOW — after this elapses past a period/quarter end, unclaimed residue may be swept back.
    uint256 public constant CLAIM_WINDOW = 365 days;

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice onlyManager
    modifier onlyManager() {
        if (!isManager[msg.sender] && msg.sender != owner) revert ECO_NotAuthorized();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    // slither-disable-next-line missing-zero-check
    /// @notice constructor
    /// @param _vfide _vfide
    /// @param _seer _seer
    /// @param _operationsWallet _operationsWallet
    constructor(address _vfide, address _seer, address _operationsWallet, address _adminFacet) {
        if (_vfide == address(0) || _seer == address(0)) revert ECO_Zero();
        if (_adminFacet == address(0)) revert ECO_Zero();
        adminFacet = _adminFacet;
        vfide = IERC20(_vfide);
        rewardToken = IERC20(_vfide);
        seer = ISeer(_seer);
        operationsWallet = _operationsWallet; // Can be address(0), must be set before withdrawals
        yearStartTime = block.timestamp;
        currentYear = 1;
        currentQuarter = 1;
        currentMerchantPeriod = 1;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ADMIN FACET — fallback delegates all onlyOwner config calls to
    //  EcosystemVaultAdminFacet via delegatecall. address(this) inside the
    //  facet = this contract's address, so storage writes land here.
    // ═══════════════════════════════════════════════════════════════════════
    fallback() external {
        address facet = adminFacet;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }


    /// @notice H-11 FIX: DAO can adjust per-epoch payout caps (in bps of pool).
    /// @dev T20 FIX: cap individual epoch caps at 5000 bps (50%). Allowing up to MAX_BPS
    ///      (10000 = 100%) would let a single epoch drain the entire pool to one channel,
    ///      defeating the purpose of per-epoch limits. 5000 bps matches the conservative
    ///      EXPENSE_EPOCH_CAP_BPS=2500 hardcoded ceiling for operations spend.
    uint16 public constant MAX_INDIVIDUAL_EPOCH_CAP_BPS = 5000;







    // slither-disable-next-line reentrancy-no-eth
    /// @notice Migrate to a new reward token while preserving pool accounting.
    /// @dev Owner must pre-fund this contract with at least the outstanding pool amount of the new token.
    /// @dev F-SC-030 FIX: The pool balances (councilPool, merchantPool, etc.)
    ///      are denominated in the OLD reward token's smallest unit. When
    ///      migrating to a new token the comparison
    ///      `IERC20(token).balanceOf(this) < outstanding` was a raw-units
    ///      comparison that silently moved value if the two tokens had
    ///      different decimals. Example: oldToken has 18 decimals, newToken
    ///      has 6 decimals; pool of "1000 oldToken units" (1000e18) compared
    ///      against "1000 newToken units" (1000e6) would be a 12-orders-of-
    ///      magnitude undercount. We now require the two tokens to have the
    ///      same decimals AND require the owner to explicitly acknowledge
    ///      this is a same-decimals migration via a require-with-error.
    ///      Cross-decimal migration is intentionally not supported here —
    ///      it requires re-denominating every pool balance, which is a
    ///      separate, higher-risk operation that should go through a
    ///      dedicated function with explicit per-pool conversion factors.
    /// @param token token
    /// @param oldTokenSink oldTokenSink
    function migrateRewardToken(address token, address oldTokenSink) external onlyOwner nonReentrant {
        if (token == address(0)) revert ECO_Zero();
        address oldToken = address(rewardToken);
        if (token == oldToken) revert ECO_InvalidConfig();

        // F-SC-030: enforce decimal-match. Both tokens must expose decimals()
        // and they must be equal, else the pool-balance comparison below is
        // not unit-consistent and tokens may be silently lost.
        uint8 oldDecimals = IERC20MetadataDecimals(oldToken).decimals();
        uint8 newDecimals = IERC20MetadataDecimals(token).decimals();
        if (oldDecimals != newDecimals) revert ECO_InvalidConfig();

        _allocateIncoming();
        uint256 outstanding = councilPool + merchantPool + headhunterPool + operationsPool;
        if (IERC20(token).balanceOf(address(this)) < outstanding) revert ECO_InsufficientFunds();

        address sink = oldTokenSink == address(0) ? owner : oldTokenSink;
        uint256 oldBalance = IERC20(oldToken).balanceOf(address(this));
        if (oldBalance > 0) {
            IERC20(oldToken).safeTransfer(sink, oldBalance);
        }

        rewardToken = IERC20(token);
        emit RewardTokenUpdated(oldToken, token);
    }














    /**
     * @notice Enable or disable stablecoin-only mode for non-reward payouts.
     * @dev HOWEY FIX: Work and council reward compensation are always paid in stablecoin.
     *      This toggle remains for non-reward paths such as expenses.
     *
    *      Payment routing: direct reserve first, then automatic VFIDE swap when auto-swap is
    *      configured. This keeps payouts in fixed-dollar terms while still allowing the vault
    *      to operate without a manually pre-funded reserve.
     *
     *      Distributing a potentially-appreciating VFIDE token as "compensation" creates an
     *      implicit profit expectation (Howey Prong 3). Fixed stablecoin service fees make
     *      the work-for-pay relationship legally unambiguous.
     *
    *      REQUIREMENTS before enabling:
    *      - preferredStablecoin must be set
    *      - Either the direct reserve must already be funded, or autoSwapEnabled must be active
     *


    // slither-disable-next-line reentrancy-benign
    /**
     * @notice Deposit stablecoin into the direct work-compensation reserve.
     * @dev HOWEY FIX — recommended path: pre-fund this reserve with USDC/USDT so that all
     *      merchant and headhunter work rewards are paid as fixed-dollar service fees with no
     *      DEX swap required. The depositor must have approved this contract first.
     * @param stablecoin Address of the stablecoin to deposit (must match preferredStablecoin
     *        when stablecoinOnlyMode is active, or any token otherwise for future use).
     * @param amount Amount to deposit (in stablecoin's native decimals).
     */
    function depositStablecoinReserve(address stablecoin, uint256 amount) external onlyManager nonReentrant {
        if (stablecoin == address(0)) revert ECO_Zero();
        if (amount == 0) revert ECO_Zero();
        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), amount);
        stablecoinReserves[stablecoin] += amount;
        emit StablecoinDeposited(stablecoin, msg.sender, amount);
    }





    // ═══════════════════════════════════════════════════════════════════════
    //                         RECEIVE & ALLOCATE
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice allocateIncoming
    function allocateIncoming() public {
        if (!isManager[msg.sender] && msg.sender != owner && msg.sender != address(this)) {
            revert ECO_NotAuthorized();
        }
        _allocateIncoming();
    }

    /// @notice _allocateIncoming
    function _allocateIncoming() internal {
        uint256 balance = rewardToken.balanceOf(address(this));
        uint256 allocated = councilPool + merchantPool + headhunterPool + operationsPool + reservedForClaims;
        uint256 unallocated = balance > allocated ? balance - allocated : 0;
        
        if (unallocated > 0) {
            uint256 toCouncil = (unallocated * councilBps) / MAX_BPS;
            uint256 toMerchant = (unallocated * merchantBps) / MAX_BPS;
            uint256 toHeadhunter = (unallocated * headhunterBps) / MAX_BPS;
            uint256 toOperations = (unallocated * operationsBps) / MAX_BPS;

            // Handle rounding dust (typically 0-3 wei max)
            uint256 chunkAllocated = toCouncil + toMerchant + toHeadhunter + toOperations;
            if (chunkAllocated < unallocated) {
                toOperations += unallocated - chunkAllocated;
            }

            councilPool += toCouncil;
            merchantPool += toMerchant;
            headhunterPool += toHeadhunter;
            operationsPool += toOperations;
            totalReceived += unallocated;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         OPERATIONS WITHDRAWAL (Team Sustainability)
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice OperationsWithdrawal
    /// @param wallet wallet
    /// @param amount amount
    event OperationsWithdrawal(address indexed wallet, uint256 amount);
    
    /**
     * @notice Withdraw operations pool to team wallet
     * @dev Can only be called by owner (DAO), enforces expense epoch cap
     *      M-8 FIX: Now applies EXPENSE_EPOCH_CAP_BPS to ensure the expense guardrail remains effective
     */
    function withdrawOperations() external onlyOwner nonReentrant {
        _withdrawOperationsIfDue(true);
    }

    // getOperationsStatus moved to EcosystemVaultView.sol

    // ═══════════════════════════════════════════════════════════════════════
    //                         1. COUNCIL REWARDS (Monthly)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Distribute council pool evenly to active council members
     * @dev Called monthly, splits pool equally among active members
     */
    function distributeCouncilRewards() external onlyManager nonReentrant {
        _distributeCouncilRewardsIfDue(true);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         2. MERCHANT WORK PROGRAM (Monthly Tracking)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Record merchant transaction for this month's distribution
     * @dev Tracks tx count and tier, actual payout happens monthly
     * @param merchant merchant
     */
    function recordMerchantTransaction(address merchant) external onlyManager nonReentrant {
        uint16 score = seer.getCachedScore(merchant);
        uint16 tier = _getMerchantBonusTier(score);
        
        if (tier == 0) return; // Below 80%, no bonus eligibility
        
        // First tx this period? Add to list (with cap check)
        if (periodMerchantTxCount[currentMerchantPeriod][merchant] == 0) {
            if (periodMerchants[currentMerchantPeriod].length >= MAX_MERCHANTS_PER_PERIOD) revert ECO_ArrayCapReached();
            periodMerchants[currentMerchantPeriod].push(merchant);
        }
        
        ++periodMerchantTxCount[currentMerchantPeriod][merchant];
        ++merchantLifetimeTxCount[merchant];
        
        // Store best tier achieved this period
        if (tier > periodMerchantTier[currentMerchantPeriod][merchant]) {
            periodMerchantTier[currentMerchantPeriod][merchant] = tier;
        }

        _tryAutoWorkPayout(merchant, autoMerchantTxReward, true, "qualified_merchant_tx");
    }

    /**
     * @notice End merchant period and snapshot for claiming
    * @dev Called monthly to snapshot pool/accounting for program management
     */
    function endMerchantPeriod() external onlyManager {
        _endMerchantPeriodIfDue(true);
    }

    /**
     * @notice Pay fixed compensation for verified merchant work
     * @dev Uses merchant pool only; not a rank/percentage payout.
     *      HOWEY FIX: Work compensation is always paid in stablecoin.
     * @param worker worker
     * @param amount amount
     * @param reason reason
     */
    function payMerchantWorkReward(address worker, uint256 amount, string calldata reason) external onlyManager nonReentrant {
        if (worker == address(0) || amount == 0) revert ECO_Zero();

        _allocateIncoming();
        // H-11 FIX: Reset epoch counter if 30 days have elapsed.
        if (block.timestamp >= merchantEpochStart + EPOCH_DURATION) {
            merchantEpochStart = block.timestamp;
            merchantPaidThisEpoch = 0;
        }
        uint256 epochCap = (merchantPool * merchantEpochCapBps) / 10000;
        if (merchantPaidThisEpoch + amount > epochCap) revert ECO_MerchantEpochCapExceeded();

        uint256 spendable = _getSpendablePoolBalance(merchantPool, merchantPoolReserveBps);
        if (amount > spendable) revert ECO_InsufficientFunds();

        // slither-disable-next-line events-maths -- WorkRewardPaid is emitted below with full context
        merchantPool -= amount;
        merchantPaidThisEpoch += amount;
        totalMerchantBonusPaid += amount;
        _deliverWorkReward(worker, amount, reason);
        emit WorkRewardPaid(worker, amount, true, reason);
    }

    // _calculateMerchantRank moved to EcosystemVaultView.sol (off-chain indexing)

    /// @notice _getMerchantBonusTier
    /// @param score score
    /// @return _uint16 _uint16
    function _getMerchantBonusTier(uint16 score) internal pure returns (uint16) {
        return EcosystemVaultLib.getMerchantBonusTier(score);
    }

    /// @notice _tierWeight — period-bonus weight per qualifying tx for a merchant's tier (0 if ineligible).
    /// @param tier merchant bonus tier (1-4 from _getMerchantBonusTier; 0 = below threshold)
    /// @return _uint256 tier multiplier used as the claim weight basis
    function _tierWeight(uint16 tier) internal pure returns (uint256) {
        if (tier == 1) return TIER1_MULTIPLIER;
        if (tier == 2) return TIER2_MULTIPLIER;
        if (tier == 3) return TIER3_MULTIPLIER;
        if (tier == 4) return TIER4_MULTIPLIER;
        return 0;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         3. HEADHUNTER FUND (Quarterly, Work Tracking)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Register a pending merchant referral (points awarded after 3 tx)
     * @param merchant The new merchant who was referred
     * @param referrer Who made the referral
     */
    function registerMerchantReferral(address merchant, address referrer) external onlyManager {
        if (referrer == address(0) || referrer == merchant) return;
        if (pendingMerchantReferrer[merchant] != address(0)) return; // Already has referrer
        if (referralCredited[merchant]) return; // Already credited
        
        // Referrer must have minimum ProofScore
        if (seer.getCachedScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        pendingMerchantReferrer[merchant] = referrer;
        emit PendingReferralRegistered(merchant, referrer, true);
    }

    /**
     * @notice Register a pending user referral (points awarded after $25 in vault)
     * @param referrer Who made the referral
     * @param user The new user who was referred
     */
    function registerUserReferral(address referrer, address user) external onlyManager {
        if (referrer == address(0) || referrer == user) return;
        if (pendingUserReferrer[user] != address(0)) return; // Already has referrer
        if (referralCredited[user]) return; // Already credited
        
        // Referrer must have minimum ProofScore
        if (seer.getCachedScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        pendingUserReferrer[user] = referrer;
        emit PendingReferralRegistered(user, referrer, false);
    }

    /**
     * @notice Credit merchant referral after merchant completes 3+ transactions
     * @param merchant The merchant who met the threshold
     */
    function creditMerchantReferral(address merchant) external onlyManager nonReentrant {
        address referrer = pendingMerchantReferrer[merchant];
        if (referrer == address(0)) return;
        if (referralCredited[merchant]) return;
        if (merchantLifetimeTxCount[merchant] < MIN_MERCHANT_TX) return;
        
        // Referrer must still have minimum score at credit time
        if (seer.getCachedScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        referralCredited[merchant] = true;
        _awardPoints(referrer, POINTS_MERCHANT_REFERRAL, merchant, true);
        _tryAutoWorkPayout(referrer, autoMerchantReferralReward, false, "verified_merchant_referral");
    }

    /**
     * @notice Credit user referral after user has $25+ worth in vault
     * @param user The user who met the threshold
     */
    function creditUserReferral(address user) external onlyManager nonReentrant {
        address referrer = pendingUserReferrer[user];
        if (referrer == address(0)) return;
        if (referralCredited[user]) return;
        if (!_meetsUserReferralThreshold(user)) return;
        
        // Referrer must still have minimum score at credit time
        if (seer.getCachedScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        referralCredited[user] = true;
        _awardPoints(referrer, POINTS_USER_REFERRAL, user, false);
        _tryAutoWorkPayout(referrer, autoUserReferralReward, false, "verified_user_referral");
    }

    /// @notice _awardPoints
    /// @param referrer referrer
    /// @param points points
    /// @param referred referred
    /// @param isMerchant isMerchant
    function _awardPoints(address referrer, uint16 points, address referred, bool isMerchant) internal {
        // POW-4 FIX: removed MAX_REFERRERS_PER_YEAR check at insertion. The
        // cap was placed because `claimHeadhunterQuarterReward` summed
        // `yearReferrers[year]` to compute the denominator, and an
        // unbounded array would have caused gas-amplification on claim.
        // We now maintain `totalYearPoints[year]` as an incrementally-
        // updated denominator (see below), so the claim function does
        // O(1) work and the on-insertion cap is no longer needed. The
        // 201st-referrer-of-the-year hard wall — which would have shut
        // out new referrers from earning anything for the rest of the
        // year — is removed as a side effect.
        if (yearPoints[currentYear][referrer] == 0) {
            yearReferrers[currentYear].push(referrer);
        }
        yearPoints[currentYear][referrer] += points;
        totalYearPoints[currentYear] += uint256(points);

        emit ReferralRecorded(referrer, referred, isMerchant, points);
    }

    /// @notice WorkRewardPaid — emitted on every merchant/referral work-reward and auto-payout.
    /// @param worker worker
    /// @param amount amount
    /// @param fromMerchantPool fromMerchantPool — true = merchant pool, false = headhunter pool
    /// @param reason reason
    event WorkRewardPaid(address indexed worker, uint256 amount, bool fromMerchantPool, string reason);

    /// @notice ExpensePaid — emitted on every operations expense payout.
    /// @param recipient recipient
    /// @param amount amount
    /// @param reason reason
    event ExpensePaid(address indexed recipient, uint256 amount, string reason);

    /// @notice _tryAutoWorkPayout
    /// @param worker worker
    /// @param amount amount
    /// @param useMerchantPool useMerchantPool
    /// @param reason reason
    /// @return paid paid
    function _tryAutoWorkPayout(
        address worker,
        uint256 amount,
        bool useMerchantPool,
        string memory reason
    ) internal returns (bool paid) {
        if (!autoWorkPayoutEnabled || worker == address(0) || amount == 0) {
            return false;
        }

        _allocateIncoming();

        if (useMerchantPool) {
            // H-11: subject auto-payouts to the SAME cumulative per-epoch cap as the manual path.
            if (block.timestamp >= merchantEpochStart + EPOCH_DURATION) {
                merchantEpochStart = block.timestamp;
                merchantPaidThisEpoch = 0;
            }
            uint256 merchantSpendable = _getSpendablePoolBalance(merchantPool, merchantPoolReserveBps);
            uint256 merchantAutoCap = (merchantPool * maxAutoPayoutBps) / MAX_BPS;
            uint256 merchantEpochCap = (merchantPool * merchantEpochCapBps) / 10000;
            if (amount > merchantSpendable || amount > merchantAutoCap) return false;
            if (merchantPaidThisEpoch + amount > merchantEpochCap) return false; // best-effort skip, not revert

            merchantPool -= amount;
            merchantPaidThisEpoch += amount;
            totalMerchantBonusPaid += amount;
            _deliverWorkReward(worker, amount, reason);
            emit WorkRewardPaid(worker, amount, true, reason);
            return true;
        }

        // H-11: subject auto-payouts to the SAME cumulative per-epoch cap as the manual path.
        if (block.timestamp >= headhunterEpochStart + EPOCH_DURATION) {
            headhunterEpochStart = block.timestamp;
            headhunterPaidThisEpoch = 0;
        }
        uint256 headhunterSpendable = _getSpendablePoolBalance(headhunterPool, headhunterPoolReserveBps);
        uint256 headhunterAutoCap = (headhunterPool * maxAutoPayoutBps) / MAX_BPS;
        uint256 headhunterEpochCap = (headhunterPool * headhunterEpochCapBps) / 10000;
        if (amount > headhunterSpendable || amount > headhunterAutoCap) return false;
        if (headhunterPaidThisEpoch + amount > headhunterEpochCap) return false; // best-effort skip, not revert

        headhunterPool -= amount;
        headhunterPaidThisEpoch += amount;
        totalHeadhunterPaid += amount;
        _deliverWorkReward(worker, amount, reason);
        emit WorkRewardPaid(worker, amount, false, reason);
        return true;
    }

    /// @notice _meetsUserReferralThreshold
    /// @param user user
    /// @return _bool _bool
    function _meetsUserReferralThreshold(address user) internal view returns (bool) {
        address hub = address(referralVaultHub);
        if (hub == address(0)) {
            return false;
        }

        address vault = referralVaultHub.vaultOf(user);
        if (vault == address(0)) {
            return false;
        }

        return vfide.balanceOf(vault) >= MIN_USER_VAULT_BALANCE;
    }

    /**
     * @notice Internal: deliver a work reward in stablecoin.
     * @dev Reward compensation never falls back to VFIDE.
     * @param worker worker
     * @param amount amount
     * @param reason reason
     */
    function _deliverWorkReward(
        address worker,
        uint256 amount,
        string memory reason
    ) internal {
        reason;
        _payoutStablecoin(worker, preferredStablecoin, amount);
    }

    /**
     * @notice End the current quarter and snapshot the pool
     * @dev Called quarterly, locks in rankings and pool amount for claims
     */
    function endHeadhunterQuarter() external onlyManager {
        _endHeadhunterQuarterIfDue(true);
    }

    /**
     * @notice Claim the caller's proportional share of an ended quarter's
     *         headhunter pool snapshot.
     *
     * @dev    F-SC-034 FIX: Previously the contract had ZERO writers to
     *         `quarterClaimed`, while `previewHeadhunterReward` (in the View
     *         contract) read it as if a claim path existed. The result was
     *         that `endHeadhunterQuarter` snapshotted the pool and zeroed
     *         `headhunterPool` (line 1378), but no path delivered tokens to
     *         referrers. The snapshot funds remained inside this contract's
     *         token balance and were re-absorbed by the next `_allocateIncoming`
     *         call (75% redistributed across the other pools), permanently
     *         denying headhunters their accrued rewards.
     *
     *         This claim function:
     *           1. requires the (year, quarter) has been ended via
     *              endHeadhunterQuarter,
     *           2. requires the caller earned points in `year`,
     *           3. requires the caller has not already claimed the same
     *              (year, quarter),
     *           4. computes share = poolSnapshot * referrerPoints / totalYearPoints
     *              (totalYearPoints is read from the incrementally-
     *              maintained `totalYearPoints[year]` mapping; constant-
     *              time read, no loop, no cap),
     *           5. flips `quarterClaimed` BEFORE transferring tokens (CEI),
     *           6. delivers tokens via the same stablecoin payout path used
     *              by `_deliverWorkReward` so claims and work-rewards behave
     *              identically and Howey-fix invariants hold.
     *
     *         Note: this function reads the live snapshot. Because all four
     *         quarters in the same year share the same `yearPoints[year][r]`
     *         denominator and snapshot pool, a referrer who earned points
     *         in year Y can claim a share from each of the four quarters in
     *         that year independently. This matches the existing
     *         `previewHeadhunterReward` view shape (year, quarter, referrer).
     * @param year year
     * @param quarter quarter
     */
    function claimHeadhunterQuarterReward(uint256 year, uint256 quarter)
        external
        nonReentrant
    {
        if (quarter < 1 || quarter > 4) revert ECO_InvalidConfig();
        if (!quarterEnded[year][quarter]) revert ECO_TooEarly();
        if (quarterClaimed[year][quarter][msg.sender]) revert ECO_AlreadyExecuted();

        uint16 callerPoints = yearPoints[year][msg.sender];
        if (callerPoints == 0) revert ECO_NotEligible();

        uint256 poolSnapshot = quarterPoolSnapshot[year][quarter];
        if (poolSnapshot == 0) revert ECO_InsufficientFunds();

        // POW-4: O(1) denominator read via the cached `totalYearPoints[year]`
        // that `_awardPoints` increments on every credit. This replaces the
        // previous loop over `yearReferrers[year]` (which was O(n) up to
        // MAX_REFERRERS_PER_YEAR=200 and required the on-insertion cap).
        uint256 totalPoints = totalYearPoints[year];
        if (totalPoints == 0) revert ECO_NotEligible();

        uint256 share = (poolSnapshot * uint256(callerPoints)) / totalPoints;
        if (share == 0) revert ECO_InsufficientFunds();
        // Guard: never exceed this quarter's remaining reservation (also blocks claims after a sweep).
        if (share > quarterReserved[year][quarter]) revert ECO_InsufficientFunds();

        // CEI: flip claimed flag + release reservation BEFORE delivery to defend against any
        // re-entry from token callbacks downstream.
        quarterClaimed[year][quarter][msg.sender] = true;
        reservedForClaims -= share;
        quarterReserved[year][quarter] -= share;

        // Deliver via the same stablecoin path used by _deliverWorkReward
        // so all referrer payouts go through one auditable channel.
        _deliverWorkReward(msg.sender, share, "headhunter_quarter_claim");

        emit HeadhunterQuarterClaimed(year, quarter, msg.sender, callerPoints, totalPoints, share);
    }

    /// @notice HeadhunterQuarterClaimed
    /// @param year year
    /// @param quarter quarter
    /// @param referrer referrer
    /// @param referrerPoints referrerPoints
    /// @param totalYearPoints totalYearPoints
    /// @param amountClaimed amountClaimed
    event HeadhunterQuarterClaimed(
        uint256 indexed year,
        uint256 indexed quarter,
        address indexed referrer,
        uint16 referrerPoints,
        uint256 totalYearPoints,
        uint256 amountClaimed
    );

    /**
     * @notice Claim the caller's tier-weighted share of an ended merchant period's pool snapshot.
     *
     * @dev Merchant side of F-SC-034: previously `_endMerchantPeriodIfDue` snapshotted the merchant
     *      pool into `merchantPeriodPoolSnapshot` and zeroed `merchantPool`, and the View's
     *      `previewMerchantReward` exposed `claimed`/`poolSnapshot` as if a claim path existed — but
     *      there was NO writer to `merchantPeriodClaimed` and no delivery path, so the rank-competition
     *      bonus was never paid. This mirrors `claimHeadhunterQuarterReward`:
     *        1. requires the period has ended (`endMerchantPeriod`),
     *        2. requires the caller earned weight in the period (txCount × tier multiplier > 0),
     *        3. requires the caller has not already claimed this period,
     *        4. computes share = poolSnapshot * callerWeight / totalWeight, where totalWeight sums every
     *           listed merchant's (txCount × tier multiplier). The denominator is derived by iterating
     *           `periodMerchants[period]` (bounded by MAX_MERCHANTS_PER_PERIOD = 500) — gas-bounded and
     *           suited to the L2 (Base) target. A cached denominator would be cheaper but is deferred to
     *           avoid mid-layout storage changes under the AdminFacet delegatecall mirror.
     *        5. flips `merchantPeriodClaimed` BEFORE transferring (CEI), and
     *        6. delivers via the same stablecoin path as `_deliverWorkReward`.
     *
     *      NOTE: like the headhunter claim, the snapshot is not reserved against `_allocateIncoming`
     *      re-absorption — see the ledger finding on snapshot reservation (affects both claims).
     * @param period merchant period to claim from
     */
    function claimMerchantPeriodReward(uint256 period) external nonReentrant {
        if (!merchantPeriodEnded[period]) revert ECO_TooEarly();
        if (merchantPeriodClaimed[period][msg.sender]) revert ECO_AlreadyExecuted();

        uint256 callerWeight = periodMerchantTxCount[period][msg.sender]
            * _tierWeight(periodMerchantTier[period][msg.sender]);
        if (callerWeight == 0) revert ECO_NotEligible();

        uint256 poolSnapshot = merchantPeriodPoolSnapshot[period];
        if (poolSnapshot == 0) revert ECO_InsufficientFunds();

        // O(periodMerchants) denominator, bounded by MAX_MERCHANTS_PER_PERIOD (500).
        address[] memory periodList = periodMerchants[period];
        uint256 totalWeight = 0;
        uint256 len = periodList.length;
        for (uint256 i = 0; i < len; ++i) {
            address mAddr = periodList[i];
            totalWeight += periodMerchantTxCount[period][mAddr]
                * _tierWeight(periodMerchantTier[period][mAddr]);
        }
        if (totalWeight == 0) revert ECO_NotEligible();

        uint256 share = (poolSnapshot * callerWeight) / totalWeight;
        if (share == 0) revert ECO_InsufficientFunds();
        // Guard: never exceed this period's remaining reservation (also blocks claims after a sweep).
        if (share > merchantPeriodReserved[period]) revert ECO_InsufficientFunds();

        // CEI: flip claimed + release reservation BEFORE delivery to defend against re-entry.
        merchantPeriodClaimed[period][msg.sender] = true;
        reservedForClaims -= share;
        merchantPeriodReserved[period] -= share;

        _deliverWorkReward(msg.sender, share, "merchant_period_claim");

        emit MerchantPeriodClaimed(period, msg.sender, callerWeight, totalWeight, share);
    }

    /// @notice MerchantPeriodClaimed
    /// @param period period
    /// @param merchant merchant
    /// @param merchantWeight merchantWeight
    /// @param totalWeight totalWeight
    /// @param amountClaimed amountClaimed
    event MerchantPeriodClaimed(
        uint256 indexed period,
        address indexed merchant,
        uint256 merchantWeight,
        uint256 totalWeight,
        uint256 amountClaimed
    );

    /// @notice ReservationSwept — unclaimed reservation residue released back into circulation after CLAIM_WINDOW.
    /// @param key period (merchant) or (year*10 + quarter) (headhunter)
    /// @param residue residue
    /// @param isMerchant isMerchant
    event ReservationSwept(uint256 indexed key, uint256 residue, bool isMerchant);

    /**
     * @notice Release a merchant period's unclaimed reserved residue after the claim window.
     * @dev Permissionless. After CLAIM_WINDOW past the period end, the still-reserved remainder is
     *      released from `reservedForClaims` so the next `_allocateIncoming` re-absorbs it. Zeroing
     *      `merchantPeriodReserved` also blocks any further claim for the period (claim guard reverts).
     * @param period merchant period to sweep
     */
    function sweepMerchantPeriodReserve(uint256 period) external {
        if (!merchantPeriodEnded[period]) revert ECO_TooEarly();
        uint64 endedAt = merchantPeriodEndedAt[period];
        if (endedAt == 0 || block.timestamp < uint256(endedAt) + CLAIM_WINDOW) revert ECO_TooEarly();
        uint256 residue = merchantPeriodReserved[period];
        if (residue == 0) return;
        merchantPeriodReserved[period] = 0;
        reservedForClaims -= residue;
        emit ReservationSwept(period, residue, true);
    }

    /**
     * @notice Release a headhunter quarter's unclaimed reserved residue after the claim window.
     * @dev Permissionless. Mirrors sweepMerchantPeriodReserve for the headhunter quarter snapshot.
     * @param year year
     * @param quarter quarter
     */
    function sweepHeadhunterQuarterReserve(uint256 year, uint256 quarter) external {
        if (!quarterEnded[year][quarter]) revert ECO_TooEarly();
        uint64 endedAt = quarterEndedAt[year][quarter];
        if (endedAt == 0 || block.timestamp < uint256(endedAt) + CLAIM_WINDOW) revert ECO_TooEarly();
        uint256 residue = quarterReserved[year][quarter];
        if (residue == 0) return;
        quarterReserved[year][quarter] = 0;
        reservedForClaims -= residue;
        emit ReservationSwept((year * 10) + quarter, residue, false);
    }

    /**
     * @notice Pay fixed compensation for verified referral/acquisition work
     * @dev Uses headhunter pool only; not a rank/percentage payout.
     *      HOWEY FIX: Work compensation is always paid in stablecoin.
     * @param worker worker
     * @param amount amount
     * @param reason reason
     */
    function payReferralWorkReward(address worker, uint256 amount, string calldata reason) external onlyManager nonReentrant {
        if (worker == address(0) || amount == 0) revert ECO_Zero();

        _allocateIncoming();
        // H-11 FIX: Reset epoch counter if 30 days have elapsed.
        if (block.timestamp >= headhunterEpochStart + EPOCH_DURATION) {
            headhunterEpochStart = block.timestamp;
            headhunterPaidThisEpoch = 0;
        }
        uint256 epochCap = (headhunterPool * headhunterEpochCapBps) / 10000;
        if (headhunterPaidThisEpoch + amount > epochCap) revert ECO_HeadhunterEpochCapExceeded();

        uint256 spendable = _getSpendablePoolBalance(headhunterPool, headhunterPoolReserveBps);
        if (amount > spendable) revert ECO_InsufficientFunds();

        // slither-disable-next-line events-maths -- WorkRewardPaid is emitted below with full context
        headhunterPool -= amount;
        headhunterPaidThisEpoch += amount;
        totalHeadhunterPaid += amount;
        _deliverWorkReward(worker, amount, reason);
        emit WorkRewardPaid(worker, amount, false, reason);
    }

    /// @notice _getSpendablePoolBalance
    /// @param poolBalance poolBalance
    /// @param reserveBps reserveBps
    /// @return _uint256 _uint256
    function _getSpendablePoolBalance(uint256 poolBalance, uint16 reserveBps) internal pure returns (uint256) {
        return EcosystemVaultLib.getSpendablePoolBalance(poolBalance, reserveBps);
    }

    // _calculateHeadhunterRank moved to EcosystemVaultView.sol (off-chain indexing)

    // ═══════════════════════════════════════════════════════════════════════
    //                         UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Pay expense from ecosystem vault
     * @dev Stablecoin-only mode pays from reserve first and automatically swaps VFIDE when the
     *      configured reserve is short.
     * @param recipient Address to receive payment
     * @param amount Amount of VFIDE to pay (or stablecoin amount in stablecoin-only mode)
     * @param reason Description of the payment
     */
    function payExpense(address recipient, uint256 amount, string calldata reason) external onlyManager nonReentrant {
        if (recipient == address(0) || amount == 0) revert ECO_Zero();

        _allocateIncoming();
        if (operationsPool < amount) revert ECO_InsufficientFunds();
        _rollExpenseEpochIfNeeded();

        uint256 expenseCap = operationsExpenseEpochBase * EXPENSE_EPOCH_CAP_BPS / MAX_BPS;
        if (operationsSpentInEpoch + amount > expenseCap) revert ECO_ExpenseCapExceeded();
        // slither-disable-next-line events-maths -- ExpensePaid is emitted below with full context
        operationsSpentInEpoch += amount;

        operationsPool -= amount;
        totalExpensesPaid += amount;

        _payoutConfiguredReward(recipient, amount);

        emit ExpensePaid(recipient, amount, reason);
    }

    // REMOVED — non-custodial (soul commitment):
    // burnFunds() was a manual manager-level burn pathway inside EcosystemVault.
    // Burning is handled exclusively by ProofScoreBurnRouter on every transfer.
    // No secondary burn pathway exists anywhere in the protocol.
    // function burnFunds(uint256 amount) external onlyManager { ... }





    /// @notice _ownerGovernanceMediated
    /// @return _bool _bool
    function _ownerGovernanceMediated() internal view returns (bool) {
        return owner.code.length > 0;
    }





    /// @notice _rollExpenseEpochIfNeeded
    function _rollExpenseEpochIfNeeded() internal {
        if (
            operationsExpenseEpochStartedAt == 0
            || block.timestamp >= operationsExpenseEpochStartedAt + EXPENSE_EPOCH_DURATION
        ) {
            operationsExpenseEpochStartedAt = block.timestamp;
            operationsExpenseEpochBase = operationsPool;
            operationsSpentInEpoch = 0;
            emit ExpenseEpochRolled(
                block.timestamp,
                operationsExpenseEpochBase,
                operationsExpenseEpochBase * EXPENSE_EPOCH_CAP_BPS / MAX_BPS
            );
        }
    }

    /// @notice _distributeCouncilRewardsIfDue
    /// @param strict strict
    /// @return _bool _bool
    function _distributeCouncilRewardsIfDue(bool strict) internal returns (bool) {
        if (block.timestamp < lastCouncilDistribution + MONTH) {
            if (strict) revert ECO_TooEarly();
            return false;
        }
        if (address(councilManager) == address(0)) {
            if (strict) revert ECO_Zero();
            return false;
        }

        _allocateIncoming();

        uint256 amount = councilPool;
        if (amount < 1) {
            if (strict) revert ECO_InsufficientFunds();
            lastCouncilDistribution = block.timestamp;
            return true;
        }

        address[] memory members = councilManager.getActiveMembers();
        uint256 memberCount = members.length;
        if (memberCount == 0 || memberCount > type(uint8).max) {
            if (strict) revert ECO_Zero();
            return false;
        }
        if (memberCount > MAX_COUNCIL_DISTRIBUTION_BATCH) {
            if (strict) revert ECO_ArrayCapReached();
            return false;
        }

        uint256 perMember = amount / memberCount;
        councilPool = amount % memberCount;
        uint256 distributed = amount - councilPool;

        totalCouncilPaid += distributed;
        lastCouncilDistribution = block.timestamp;

        for (uint256 i = 0; i < memberCount; ++i) {
            if (members[i] != address(0)) {
                _payoutStablecoin(members[i], preferredStablecoin, perMember);
            }
        }

        emit CouncilDistributed(distributed, uint8(memberCount), perMember);
        return true;
    }

    /// @notice _payoutStablecoin
    /// @param recipient recipient
    /// @param payoutToken payoutToken
    /// @param amount amount
    function _payoutStablecoin(address recipient, address payoutToken, uint256 amount) internal {
        if (payoutToken == address(0)) revert ECO_InvalidConfig();
        uint256 reserveBalance = stablecoinReserves[payoutToken];
        if (reserveBalance >= amount) {
            stablecoinReserves[payoutToken] = reserveBalance - amount;
            IERC20(payoutToken).safeTransfer(recipient, amount);
            return;
        }

        if (reserveBalance != 0) {
            stablecoinReserves[payoutToken] = 0;
            IERC20(payoutToken).safeTransfer(recipient, reserveBalance);
            amount -= reserveBalance;
        }

        if (!autoSwapEnabled) revert ECO_InsufficientFunds();

        _swapRewardTokenToStablecoin(recipient, payoutToken, amount);
    }

    /// @notice _payoutConfiguredReward
    /// @param recipient recipient
    /// @param amount amount
    function _payoutConfiguredReward(address recipient, uint256 amount) internal {
        if (stablecoinOnlyMode) {
            _payoutStablecoin(recipient, preferredStablecoin, amount);
            return;
        }

        rewardToken.safeTransfer(recipient, amount);
    }

    /// @notice _swapRewardTokenToStablecoin
    /// @param recipient recipient
    /// @param payoutToken payoutToken
    /// @param amountIn amountIn
    function _swapRewardTokenToStablecoin(address recipient, address payoutToken, uint256 amountIn) internal {
        address router = swapRouter;

        address[] memory path = new address[](2);
        path[0] = address(rewardToken);
        path[1] = payoutToken;

        uint256 minAmountOut = (amountIn * minOutputPerVfide + 1e18 - 1) / 1e18;
        if (minAmountOut == 0) revert ECO_InvalidConfig();

        rewardToken.forceApprove(router, amountIn);
        uint256[] memory amounts = ISwapRouter(router).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            recipient,
            block.timestamp
        );
        rewardToken.forceApprove(router, 0);

        if (amounts[amounts.length - 1] == 0) revert ECO_InsufficientFunds();
    }

    /// @notice _endMerchantPeriodIfDue
    /// @param strict strict
    /// @return _bool _bool
    function _endMerchantPeriodIfDue(bool strict) internal returns (bool) {
        if (block.timestamp < lastMerchantDistribution + MONTH) {
            if (strict) revert ECO_TooEarly();
            return false;
        }

        _allocateIncoming();
        merchantPeriodPoolSnapshot[currentMerchantPeriod] = merchantPool;
        merchantPeriodEnded[currentMerchantPeriod] = true;
        // Reserve the snapshot so it is not re-absorbed by the next _allocateIncoming; release on claim/sweep.
        merchantPeriodEndedAt[currentMerchantPeriod] = uint64(block.timestamp);
        reservedForClaims += merchantPool;
        merchantPeriodReserved[currentMerchantPeriod] = merchantPool;
        merchantPool = 0;

        emit MerchantPeriodEnded(currentMerchantPeriod, merchantPeriodPoolSnapshot[currentMerchantPeriod]);

        lastMerchantDistribution = block.timestamp;
        ++currentMerchantPeriod;
        return true;
    }

    /// @notice _endHeadhunterQuarterIfDue
    /// @param strict strict
    /// @return _bool _bool
    function _endHeadhunterQuarterIfDue(bool strict) internal returns (bool) {
        if (block.timestamp < yearStartTime + (QUARTER * currentQuarter)) {
            if (strict) revert ECO_TooEarly();
            return false;
        }

        _allocateIncoming();
        quarterPoolSnapshot[currentYear][currentQuarter] = headhunterPool;
        quarterEnded[currentYear][currentQuarter] = true;
        // Reserve the snapshot so it is not re-absorbed by the next _allocateIncoming; release on claim/sweep.
        quarterEndedAt[currentYear][currentQuarter] = uint64(block.timestamp);
        reservedForClaims += headhunterPool;
        quarterReserved[currentYear][currentQuarter] = headhunterPool;
        headhunterPool = 0;

        emit HeadhunterQuarterEnded(currentYear, currentQuarter, quarterPoolSnapshot[currentYear][currentQuarter]);

        if (currentQuarter == 4) {
            currentQuarter = 1;
            ++currentYear;
            yearStartTime = block.timestamp;
        } else {
            ++currentQuarter;
        }
        lastQuarterPayout = block.timestamp;
        return true;
    }

    /// @notice _withdrawOperationsIfDue
    /// @param strict strict
    /// @return _bool _bool
    function _withdrawOperationsIfDue(bool strict) internal returns (bool) {
        if (operationsWallet == address(0)) {
            if (strict) revert ECO_Zero();
            return false;
        }
        if (block.timestamp < lastOperationsWithdrawal + operationsWithdrawalCooldown) {
            if (strict) revert ECO_TooEarly();
            return false;
        }

        _allocateIncoming();
        uint256 amount = operationsPool;
        if (amount == 0) {
            if (strict) revert ECO_InsufficientFunds();
            return false;
        }

        _rollExpenseEpochIfNeeded();
        uint256 expenseCap = operationsExpenseEpochBase * EXPENSE_EPOCH_CAP_BPS / MAX_BPS;
        if (operationsSpentInEpoch + amount > expenseCap) revert ECO_ExpenseCapExceeded();
        operationsSpentInEpoch += amount;

        operationsPool = 0;
        lastOperationsWithdrawal = block.timestamp;

        rewardToken.safeTransfer(operationsWallet, amount);
        emit OperationsWithdrawal(operationsWallet, amount);
        return true;
    }

}
