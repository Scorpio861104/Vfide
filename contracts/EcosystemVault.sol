// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20, ISeer, ICouncilManager, ISwapRouter, SafeERC20, Ownable, ReentrancyGuard } from "./SharedInterfaces.sol";

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
 */

error ECO_NotAuthorized();
error ECO_InsufficientFunds();
error ECO_Zero();
error ECO_NotEligible();
error ECO_AlreadyClaimed();
error ECO_TooEarly();
error ECO_InvalidRank();
error ECO_ArrayCapReached();
/// @notice Permanently reverts — token rewards for referrals or merchant ranking are not available (Howey compliance)
error ECO_RewardsNotAvailable();

contract EcosystemVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    event PaymentMade(address indexed recipient, uint256 amount, string reason);
    event FundsBurned(uint256 amount);
    event ManagerSet(address manager, bool active);
    event MerchantBonusPaid(address indexed merchant, uint256 amount, uint16 tier);
    event CouncilDistributed(uint256 totalAmount, uint8 memberCount, uint256 perMember);
    event HeadhunterQuarterEnded(uint256 year, uint256 quarter, uint256 totalPool);
    event HeadhunterRewardClaimed(address indexed referrer, uint256 year, uint256 quarter, uint256 amount, uint8 rank);
    event ReferralRecorded(address indexed referrer, address indexed referred, bool isMerchant, uint16 points);
    event AllocationUpdated(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps);
    event MerchantPeriodEnded(uint256 period, uint256 poolSnapshot);
    event MerchantRewardClaimed(address indexed merchant, uint256 period, uint256 reward, uint8 rank);
    event SeerUpdated(address indexed oldSeer, address indexed newSeer);
    event PendingReferralRegistered(address indexed referred, address indexed referrer, bool isMerchant);
    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
    event WorkRewardPaid(address indexed worker, uint256 amount, string program, string reason);

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    uint16 public constant MAX_BPS = 10000;
    uint8 public constant MAX_COUNCIL_MEMBERS = 12;
    uint8 public constant HEADHUNTER_RANKS = 20;
    uint8 public constant MERCHANT_RANKS = 100;
    uint256 public constant MONTH = 30 days;
    uint256 public constant QUARTER = 90 days;
    
    // Points for referrals
    uint16 public constant POINTS_USER_REFERRAL = 1;
    uint16 public constant POINTS_MERCHANT_REFERRAL = 3;
    
    // Minimum score to participate in headhunter program (60%)
    uint16 public constant HEADHUNTER_MIN_SCORE = 6000;
    
    // Minimum activity for referral to count
    uint8 public constant MIN_MERCHANT_TX = 3;        // Merchant needs 3 transactions
    uint256 public constant MIN_USER_VAULT_USD = 25;  // User needs $25 worth in vault

    // Merchant tier multipliers (weight for ranking, not direct payout)
    // Higher tier = more weight per transaction
    uint16 public constant TIER1_THRESHOLD = 9500;  // 95%+ ProofScore
    uint16 public constant TIER2_THRESHOLD = 9000;  // 90-94%
    uint16 public constant TIER3_THRESHOLD = 8500;  // 85-89%
    uint16 public constant TIER4_THRESHOLD = 8000;  // 80-84%
    uint16 public constant TIER1_MULTIPLIER = 5;    // 5x weight
    uint16 public constant TIER2_MULTIPLIER = 4;    // 4x weight
    uint16 public constant TIER3_MULTIPLIER = 3;    // 3x weight
    uint16 public constant TIER4_MULTIPLIER = 2;    // 2x weight

    // Merchant rank share distribution (100 ranks, total = 10000 bps = 100%)
    // Rank 1-5:    500 bps each = 25%
    // Rank 6-10:   300 bps each = 15%
    // Rank 11-20:  200 bps each = 20%
    // Rank 21-40:  100 bps each = 20%
    // Rank 41-60:   50 bps each = 10%
    // Rank 61-100:  25 bps each = 10%
    // Total: 25 + 15 + 20 + 20 + 10 + 10 = 100%

    // Headhunter rank percentages (out of 10000 = 100%)
    // Rank 1 gets most, rank 20 gets least
    // Distribution: 1500, 1200, 1000, 800, 700, 600, 500, 450, 400, 350, 
    //               300, 280, 260, 240, 220, 200, 180, 160, 140, 120 = 10000
    uint16[20] public HEADHUNTER_RANK_SHARE_BPS = [
        1500, 1200, 1000, 800, 700, 600, 500, 450, 400, 350,
        300, 280, 260, 240, 220, 200, 180, 160, 140, 120
    ];
    
    // Array caps to prevent O(n²) gas issues
    uint256 public constant MAX_MERCHANTS_PER_PERIOD = 500;
    uint256 public constant MAX_REFERRERS_PER_YEAR = 200;
    uint256 public constant MAX_RANK_ITERATIONS = 200;  // Max iterations for ranking calculation

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    IERC20 public vfide;
    IERC20 public rewardToken;
    ISeer public seer;
    ICouncilManager public councilManager;
    
    mapping(address => bool) public isManager;

    // Allocation buckets (council + merchant + headhunter + operations = 10000)
    uint16 public councilBps = 2500;      // 25% - DAO council
    uint16 public merchantBps = 2500;     // 25% - Merchant rewards
    uint16 public headhunterBps = 2500;   // 25% - Referral rewards
    uint16 public operationsBps = 2500;   // 25% - Team operations/sustainability
    
    // M-5 Fix: Minimum allocation thresholds (10% = 1000 bps)
    uint16 public constant MIN_ALLOCATION_BPS = 500; // Reduced to 5% to allow 4-way split
    
    // Operations wallet for team sustainability
    address public operationsWallet;
    uint256 public lastOperationsWithdrawal;
    uint256 public operationsWithdrawalCooldown = 30 days;

    // Pool balances
    uint256 public councilPool;
    uint256 public merchantPool;
    uint256 public headhunterPool;
    uint256 public operationsPool;
    uint256 public totalReceived;

    // Council distribution tracking
    uint256 public lastCouncilDistribution;

    // Merchant bonus tracking (monthly competition, top 100 ranks)
    uint256 public lastMerchantDistribution;
    uint256 public currentMerchantPeriod;
    mapping(uint256 => mapping(address => uint256)) public periodMerchantTxCount; // period => merchant => txCount
    mapping(uint256 => mapping(address => uint16)) public periodMerchantTier; // period => merchant => best tier
    mapping(uint256 => address[]) public periodMerchants; // period => list of merchants
    mapping(uint256 => uint256) public merchantPeriodPoolSnapshot; // period => pool at end
    mapping(uint256 => bool) public merchantPeriodEnded; // period => ended
    mapping(uint256 => mapping(address => bool)) public merchantPeriodClaimed; // period => merchant => claimed
    mapping(address => uint256) public totalMerchantBonusesPaid;

    // Headhunter tracking (year-long accumulation, quarterly payouts)
    uint256 public currentYear;
    uint256 public currentQuarter; // 1-4
    uint256 public yearStartTime;
    uint256 public lastQuarterPayout;
    mapping(uint256 => mapping(address => uint16)) public yearPoints; // year => referrer => points (accumulates all year)
    mapping(uint256 => address[]) public yearReferrers; // year => list of referrers
    mapping(uint256 => mapping(uint256 => uint256)) public quarterPoolSnapshot; // year => quarter => pool amount
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public quarterClaimed; // year => quarter => referrer => claimed
    mapping(uint256 => mapping(uint256 => bool)) public quarterEnded; // year => quarter => ended
    
    // Pending referrals (awaiting activity threshold)
    mapping(address => address) public pendingMerchantReferrer; // merchant => who referred them
    mapping(address => address) public pendingUserReferrer;     // user => who referred them
    mapping(address => bool) public referralCredited;           // referred => already credited

    // ═══════════════════════════════════════════════════════════════════════
    //                   AUTO-SWAP TO STABLECOIN (for Rewards)
    // ═══════════════════════════════════════════════════════════════════════
    // DEX router for VFIDE → Stablecoin swaps when paying rewards
    address public swapRouter;
    address public preferredStablecoin;  // e.g., USDC
    bool public autoSwapEnabled;         // Enable/disable auto-swap
    uint16 public maxSlippageBps = 100;  // 1% max slippage (default)
    
    event AutoSwapConfigured(address router, address stablecoin, bool enabled, uint16 maxSlippageBps);
    event RewardPaidInStable(address indexed recipient, uint256 vfideAmount, uint256 stableAmount, string reason);
    event SwapFailed(address indexed recipient, uint256 vfideAmount, string reason);
    event AutoWorkPayoutConfigured(
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    );
    event AutoPayoutSustainabilityConfigured(
        uint16 merchantReserveBps,
        uint16 headhunterReserveBps,
        uint16 maxAutoPayoutBps
    );
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
    event ReferralWorkLevelRewardPaid(address indexed worker, uint256 indexed year, uint8 level, uint256 amount, string reason);

    // Automatic fixed work-payout configuration
    bool public autoWorkPayoutEnabled;
    uint256 public autoMerchantTxReward;
    uint256 public autoMerchantReferralReward;
    uint256 public autoUserReferralReward;

    // Sustainability guardrails for burn-fee funded reward pools.
    // Reserve bps protect a minimum pool balance from reward payouts.
    uint16 public merchantPoolReserveBps = 2000;   // Keep 20% reserve in merchant pool.
    uint16 public headhunterPoolReserveBps = 2000; // Keep 20% reserve in headhunter pool.
    // Auto payouts cannot exceed this fraction of current pool in a single execution.
    uint16 public maxAutoPayoutBps = 1000;         // Max 10% per auto payout.

    // Howey-safe referral work milestones (absolute thresholds, no ranking/profit share)
    uint16 public referralLevel1Points = 10;
    uint16 public referralLevel2Points = 25;
    uint16 public referralLevel3Points = 50;
    uint16 public referralLevel4Points = 100;

    // Fixed payout per milestone level; zero means disabled until configured by owner.
    uint256 public referralLevel1Reward;
    uint256 public referralLevel2Reward;
    uint256 public referralLevel3Reward;
    uint256 public referralLevel4Reward;

    // Highest referral-work level already paid for a referrer in a given year.
    mapping(uint256 => mapping(address => uint8)) public referralLevelPaid;

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    modifier onlyManager() {
        if (!isManager[msg.sender] && msg.sender != owner) revert ECO_NotAuthorized();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    constructor(address _vfide, address _seer, address _operationsWallet) {
        if (_vfide == address(0)) revert ECO_Zero();
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
    //                              ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    function setManager(address manager, bool active) external onlyOwner {
        isManager[manager] = active;
        emit ManagerSet(manager, active);
    }

    function setSeer(address _seer) external onlyOwner {
        if (_seer == address(0)) revert ECO_Zero();
        address oldSeer = address(seer);
        seer = ISeer(_seer);
        emit SeerUpdated(oldSeer, _seer);
    }

    function setRewardToken(address token) external onlyOwner {
        if (token == address(0)) revert ECO_Zero();
        address oldToken = address(rewardToken);
        rewardToken = IERC20(token);
        emit RewardTokenUpdated(oldToken, token);
    }

    function setCouncilManager(address _councilManager) external onlyOwner {
        councilManager = ICouncilManager(_councilManager);
    }

    function setAllocations(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) external onlyOwner {
        uint16 nonOps = _councilBps + _merchantBps + _headhunterBps;
        require(nonOps <= MAX_BPS, "allocations exceed 100%");
        // M-5 Fix: Enforce minimum allocation thresholds
        require(_councilBps >= MIN_ALLOCATION_BPS, "ECO: council below minimum");
        require(_merchantBps >= MIN_ALLOCATION_BPS, "ECO: merchant below minimum");
        require(_headhunterBps >= MIN_ALLOCATION_BPS, "ECO: headhunter below minimum");
        require(MAX_BPS - nonOps >= MIN_ALLOCATION_BPS, "ECO: operations below minimum");
        councilBps = _councilBps;
        merchantBps = _merchantBps;
        headhunterBps = _headhunterBps;
        operationsBps = MAX_BPS - nonOps;
        emit AllocationUpdated(_councilBps, _merchantBps, _headhunterBps);
    }
    
    /**
     * @notice Set operations wallet for team sustainability
     */
    function setOperationsWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "ECO: zero wallet");
        operationsWallet = _wallet;
    }
    
    /**
     * @notice Set operations allocation percentage
     */
    function setOperationsAllocation(uint16 _operationsBps) external onlyOwner {
        require(_operationsBps >= MIN_ALLOCATION_BPS && _operationsBps <= 4000, "ECO: invalid bps");
        
        // Recalculate other allocations to maintain 100% total
        uint16 remaining = MAX_BPS - _operationsBps;
        councilBps = remaining / 3;
        merchantBps = remaining / 3;
        headhunterBps = remaining - councilBps - merchantBps;
        operationsBps = _operationsBps;
    }
    
    /**
     * @notice Set operations withdrawal cooldown
     */
    function setOperationsCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown <= 90 days, "ECO: cooldown too long");
        operationsWithdrawalCooldown = _cooldown;
    }
    
    /**
     * @notice Configure automatic VFIDE to stablecoin conversion for reward payments
     * @param _router DEX router address (Uniswap V2 compatible)
     * @param _stablecoin Preferred stablecoin address (USDC, USDT, DAI, etc.)
     * @param _enabled Whether to enable automatic conversion
     * @param _maxSlippageBps Maximum slippage tolerance in basis points (100 = 1%)
     */
    function configureAutoSwap(
        address _router,
        address _stablecoin,
        bool _enabled,
        uint16 _maxSlippageBps
    ) external onlyOwner {
        require(_maxSlippageBps <= 500, "ECO: slippage too high"); // Max 5%
        swapRouter = _router;
        preferredStablecoin = _stablecoin;
        autoSwapEnabled = _enabled;
        maxSlippageBps = _maxSlippageBps;
        emit AutoSwapConfigured(_router, _stablecoin, _enabled, _maxSlippageBps);
    }

    /**
     * @notice Configure automatic fixed work payouts
     * @dev Automatic payouts are best-effort and will skip when the relevant pool has insufficient balance.
     */
    function configureAutoWorkPayout(
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    ) external onlyOwner {
        autoWorkPayoutEnabled = enabled;
        autoMerchantTxReward = merchantTxReward;
        autoMerchantReferralReward = merchantReferralReward;
        autoUserReferralReward = userReferralReward;

        emit AutoWorkPayoutConfigured(enabled, merchantTxReward, merchantReferralReward, userReferralReward);
    }

    /**
     * @notice Configure sustainability guardrails for reward payouts.
     * @dev Reserve bps prevent reward pools from draining to zero during burst activity.
     */
    function configureAutoPayoutSustainability(
        uint16 merchantReserve,
        uint16 headhunterReserve,
        uint16 maxAutoPayout
    ) external onlyOwner {
        require(merchantReserve <= 9000, "ECO: merchant reserve too high");
        require(headhunterReserve <= 9000, "ECO: headhunter reserve too high");
        require(maxAutoPayout > 0 && maxAutoPayout <= 5000, "ECO: invalid auto payout bps");

        merchantPoolReserveBps = merchantReserve;
        headhunterPoolReserveBps = headhunterReserve;
        maxAutoPayoutBps = maxAutoPayout;

        emit AutoPayoutSustainabilityConfigured(merchantReserve, headhunterReserve, maxAutoPayout);
    }

    /**
     * @notice Configure fixed referral-work levels and payouts.
     * @dev Uses absolute point thresholds and fixed amounts; this avoids rank/profit distribution mechanics.
     */
    function configureReferralWorkLevels(
        uint16 level1Points,
        uint16 level2Points,
        uint16 level3Points,
        uint16 level4Points,
        uint256 level1Reward,
        uint256 level2Reward,
        uint256 level3Reward,
        uint256 level4Reward
    ) external onlyOwner {
        require(level1Points > 0, "ECO: invalid level1 points");
        require(level1Points < level2Points, "ECO: levels not ascending");
        require(level2Points < level3Points, "ECO: levels not ascending");
        require(level3Points < level4Points, "ECO: levels not ascending");

        referralLevel1Points = level1Points;
        referralLevel2Points = level2Points;
        referralLevel3Points = level3Points;
        referralLevel4Points = level4Points;

        referralLevel1Reward = level1Reward;
        referralLevel2Reward = level2Reward;
        referralLevel3Reward = level3Reward;
        referralLevel4Reward = level4Reward;

        emit ReferralWorkLevelsConfigured(
            level1Points,
            level2Points,
            level3Points,
            level4Points,
            level1Reward,
            level2Reward,
            level3Reward,
            level4Reward
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         RECEIVE & ALLOCATE
    // ═══════════════════════════════════════════════════════════════════════
    
    function allocateIncoming() public {
        uint256 balance = rewardToken.balanceOf(address(this));
        uint256 allocated = councilPool + merchantPool + headhunterPool + operationsPool;
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
    
    event OperationsWithdrawal(address indexed wallet, uint256 amount);
    
    /**
     * @notice Withdraw operations pool to team wallet
     * @dev Can only be called monthly by owner (DAO), ensures transparent team funding
     */
    function withdrawOperations() external onlyOwner nonReentrant {
        require(operationsWallet != address(0), "ECO: no ops wallet");
        require(block.timestamp >= lastOperationsWithdrawal + operationsWithdrawalCooldown, "ECO: cooldown");
        
        allocateIncoming(); // Ensure pool is up to date
        
        uint256 amount = operationsPool;
        require(amount > 0, "ECO: no funds");
        
        operationsPool = 0;
        lastOperationsWithdrawal = block.timestamp;
        
        rewardToken.safeTransfer(operationsWallet, amount);
        
        emit OperationsWithdrawal(operationsWallet, amount);
    }
    
    /**
     * @notice View operations pool status
     */
    function getOperationsStatus() external view returns (
        uint256 poolBalance,
        address wallet,
        uint256 lastWithdrawal,
        uint256 nextWithdrawalTime,
        bool canWithdraw
    ) {
        poolBalance = operationsPool;
        wallet = operationsWallet;
        lastWithdrawal = lastOperationsWithdrawal;
        nextWithdrawalTime = lastOperationsWithdrawal + operationsWithdrawalCooldown;
        canWithdraw = block.timestamp >= nextWithdrawalTime && wallet != address(0) && poolBalance > 0;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         1. COUNCIL REWARDS (Monthly)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Distribute council pool evenly to active council members
     * @dev Called monthly, splits pool equally among active members
     */
    function distributeCouncilRewards() external onlyManager nonReentrant {
        if (block.timestamp < lastCouncilDistribution + MONTH) revert ECO_TooEarly();
        if (address(councilManager) == address(0)) revert ECO_Zero();
        
        allocateIncoming(); // Ensure pool is up to date
        
        uint256 amount = councilPool;
        if (amount == 0) revert ECO_InsufficientFunds();
        
        // Get active council members from CouncilManager
        address[] memory members = councilManager.getActiveMembers();
        uint8 memberCount = uint8(members.length);
        if (memberCount == 0) revert ECO_Zero();
        
        uint256 perMember = amount / memberCount;
        councilPool = amount % memberCount; // Keep remainder for next distribution
        
        for (uint8 i = 0; i < memberCount; i++) {
            if (members[i] != address(0)) {
                rewardToken.safeTransfer(members[i], perMember);
            }
        }

        totalCouncilPaid += amount - councilPool;
        
        lastCouncilDistribution = block.timestamp;
        emit CouncilDistributed(amount - councilPool, memberCount, perMember);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         2. MERCHANT WORK PROGRAM (Monthly Tracking)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Record merchant transaction for this month's distribution
     * @dev Tracks tx count and tier, actual payout happens monthly
     */
    function recordMerchantTransaction(address merchant) external onlyManager nonReentrant {
        uint16 score = seer.getScore(merchant);
        uint16 tier = _getMerchantBonusTier(score);
        
        if (tier == 0) return; // Below 80%, no bonus eligibility
        
        // First tx this period? Add to list (with cap check)
        if (periodMerchantTxCount[currentMerchantPeriod][merchant] == 0) {
            if (periodMerchants[currentMerchantPeriod].length >= MAX_MERCHANTS_PER_PERIOD) revert ECO_ArrayCapReached();
            periodMerchants[currentMerchantPeriod].push(merchant);
        }
        
        periodMerchantTxCount[currentMerchantPeriod][merchant]++;
        
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
        if (block.timestamp < lastMerchantDistribution + MONTH) revert ECO_TooEarly();
        
        allocateIncoming();
        
        // Snapshot the pool for this period
        merchantPeriodPoolSnapshot[currentMerchantPeriod] = merchantPool;
        merchantPeriodEnded[currentMerchantPeriod] = true;
        merchantPool = 0; // Reset for next period
        
        emit MerchantPeriodEnded(currentMerchantPeriod, merchantPeriodPoolSnapshot[currentMerchantPeriod]);
        
        lastMerchantDistribution = block.timestamp;
        currentMerchantPeriod++;
    }

    /**
     * @notice Claim merchant reward for a completed period based on rank
     */
    function claimMerchantReward(uint256) external pure {
        // Permanently disabled: distributing tokens based on merchant ranking
        // creates an expectation of profit, conflicting with Howey Test compliance.
        revert ECO_RewardsNotAvailable();
    }

    /**
     * @notice Pay fixed compensation for verified merchant work
     * @dev Uses merchant pool only; not a rank/percentage payout
     */
    function payMerchantWorkReward(address worker, uint256 amount, string calldata reason) external onlyManager nonReentrant {
        if (worker == address(0) || amount == 0) revert ECO_Zero();

        allocateIncoming();
        uint256 spendable = _getSpendablePoolBalance(merchantPool, merchantPoolReserveBps);
        if (amount > spendable) revert ECO_InsufficientFunds();

        merchantPool -= amount;
        totalMerchantBonusPaid += amount;
        rewardToken.safeTransfer(worker, amount);

        emit WorkRewardPaid(worker, amount, "merchant_work", reason);
    }

    function _calculateMerchantRank(uint256 period, address merchant) internal view returns (uint8) {
        uint256 myWeight = periodMerchantTxCount[period][merchant] * periodMerchantTier[period][merchant];
        if (myWeight == 0) return 0;
        
        uint8 rank = 1;
        address[] storage merchants = periodMerchants[period];
        
        // C-8 Fix: If more merchants than MAX_RANK_ITERATIONS, we can't accurately rank
        // Instead of returning wrong rank, cap rank at MERCHANT_RANKS (100) for unranked merchants
        if (merchants.length > MAX_RANK_ITERATIONS) {
            // For large merchant counts, we need to sample or use a different approach
            // As a safety measure, anyone outside top MAX_RANK_ITERATIONS gets rank 100 (lowest tier)
            // This ensures they don't get unfairly high rewards
            
            // First, check if we're likely in top 200 by sampling
            uint256 higherCount = 0;
            uint256 step = merchants.length / MAX_RANK_ITERATIONS + 1;
            
            for (uint256 i = 0; i < merchants.length && higherCount < MERCHANT_RANKS; i += step) {
                address m = merchants[i];
                if (m != merchant) {
                    uint256 theirWeight = periodMerchantTxCount[period][m] * periodMerchantTier[period][m];
                    if (theirWeight > myWeight) {
                        higherCount++;
                    }
                }
            }
            
            // Scale the sampled count to estimate actual rank
            rank = uint8(higherCount * step + 1);
            if (rank > MERCHANT_RANKS) return MERCHANT_RANKS;
            return rank;
        }
        
        // Original logic for smaller merchant lists
        for (uint256 i = 0; i < merchants.length && rank <= MERCHANT_RANKS; i++) {
            address m = merchants[i];
            if (m != merchant) {
                uint256 theirWeight = periodMerchantTxCount[period][m] * periodMerchantTier[period][m];
                if (theirWeight > myWeight) {
                    rank++;
                }
            }
        }
        
        return rank;
    }

    /**
     * @notice Get merchant rank share based on rank position
     * @dev Rank 1-5: 500bps, 6-10: 300bps, 11-20: 200bps, 21-40: 100bps, 41-60: 50bps, 61-100: 25bps
     */
    function _getMerchantRankShare(uint8 rank) internal pure returns (uint16) {
        if (rank == 0 || rank > 100) return 0;
        if (rank <= 5) return 500;   // 5.0% each, ranks 1-5
        if (rank <= 10) return 300;  // 3.0% each, ranks 6-10
        if (rank <= 20) return 200;  // 2.0% each, ranks 11-20
        if (rank <= 40) return 100;  // 1.0% each, ranks 21-40
        if (rank <= 60) return 50;   // 0.5% each, ranks 41-60
        return 25;                    // 0.25% each, ranks 61-100
    }

    function _getMerchantBonusTier(uint16 score) internal pure returns (uint16) {
        // Returns tier multiplier (higher = better)
        if (score >= TIER1_THRESHOLD) return TIER1_MULTIPLIER; // 95%+ = 5x weight
        if (score >= TIER2_THRESHOLD) return TIER2_MULTIPLIER; // 90-94% = 4x
        if (score >= TIER3_THRESHOLD) return TIER3_MULTIPLIER; // 85-89% = 3x
        if (score >= TIER4_THRESHOLD) return TIER4_MULTIPLIER; // 80-84% = 2x
        return 0; // Below 80% = not eligible
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
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
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
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
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
        
        // Referrer must still have minimum score at credit time
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        referralCredited[merchant] = true;
        _awardPoints(referrer, POINTS_MERCHANT_REFERRAL, merchant, true);
        _tryAutoWorkPayout(referrer, autoMerchantReferralReward, false, "verified_merchant_referral");
        if (autoWorkPayoutEnabled) {
            _processReferralLevelPayouts(referrer, currentYear, "auto_referral_level_progress", false);
        }
    }

    /**
     * @notice Credit user referral after user has $25+ worth in vault
     * @param user The user who met the threshold
     */
    function creditUserReferral(address user) external onlyManager nonReentrant {
        address referrer = pendingUserReferrer[user];
        if (referrer == address(0)) return;
        if (referralCredited[user]) return;
        
        // Referrer must still have minimum score at credit time
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        referralCredited[user] = true;
        _awardPoints(referrer, POINTS_USER_REFERRAL, user, false);
        _tryAutoWorkPayout(referrer, autoUserReferralReward, false, "verified_user_referral");
        if (autoWorkPayoutEnabled) {
            _processReferralLevelPayouts(referrer, currentYear, "auto_referral_level_progress", false);
        }
    }

    function _awardPoints(address referrer, uint16 points, address referred, bool isMerchant) internal {
        // Add to year tracking (points accumulate all year)
        if (yearPoints[currentYear][referrer] == 0) {
            // Cap array to prevent gas issues
            if (yearReferrers[currentYear].length >= MAX_REFERRERS_PER_YEAR) revert ECO_ArrayCapReached();
            yearReferrers[currentYear].push(referrer);
        }
        yearPoints[currentYear][referrer] += points;
        
        emit ReferralRecorded(referrer, referred, isMerchant, points);
    }

    function _tryAutoWorkPayout(
        address worker,
        uint256 amount,
        bool useMerchantPool,
        string memory reason
    ) internal returns (bool paid) {
        if (!autoWorkPayoutEnabled || worker == address(0) || amount == 0) {
            return false;
        }

        allocateIncoming();

        if (useMerchantPool) {
            uint256 merchantSpendable = _getSpendablePoolBalance(merchantPool, merchantPoolReserveBps);
            uint256 merchantAutoCap = (merchantPool * maxAutoPayoutBps) / MAX_BPS;
            if (amount > merchantSpendable || amount > merchantAutoCap) return false;

            merchantPool -= amount;
            totalMerchantBonusPaid += amount;
            rewardToken.safeTransfer(worker, amount);
            emit WorkRewardPaid(worker, amount, "merchant_work", reason);
            return true;
        }

        uint256 headhunterSpendable = _getSpendablePoolBalance(headhunterPool, headhunterPoolReserveBps);
        uint256 headhunterAutoCap = (headhunterPool * maxAutoPayoutBps) / MAX_BPS;
        if (amount > headhunterSpendable || amount > headhunterAutoCap) return false;

        headhunterPool -= amount;
        totalHeadhunterPaid += amount;
        rewardToken.safeTransfer(worker, amount);
        emit WorkRewardPaid(worker, amount, "referral_work", reason);
        return true;
    }

    /**
     * @notice End the current quarter and snapshot the pool
     * @dev Called quarterly, locks in rankings and pool amount for claims
     */
    function endHeadhunterQuarter() external onlyManager {
        if (block.timestamp < yearStartTime + (QUARTER * currentQuarter)) revert ECO_TooEarly();
        
        allocateIncoming();
        
        quarterPoolSnapshot[currentYear][currentQuarter] = headhunterPool;
        quarterEnded[currentYear][currentQuarter] = true;
        headhunterPool = 0; // Reset for next quarter
        
        emit HeadhunterQuarterEnded(currentYear, currentQuarter, quarterPoolSnapshot[currentYear][currentQuarter]);
        
        // Advance to next quarter (or next year)
        if (currentQuarter == 4) {
            currentQuarter = 1;
            currentYear++;
            yearStartTime = block.timestamp;
        } else {
            currentQuarter++;
        }
        lastQuarterPayout = block.timestamp;
    }

    /**
     * @notice Claim headhunter reward for a completed quarter
     */
    function claimHeadhunterReward(uint256, uint256) external pure {
        // Permanently disabled: distributing tokens based on referral ranking
        // creates an expectation of profit, conflicting with Howey Test compliance.
        revert ECO_RewardsNotAvailable();
    }

    /**
     * @notice Pay fixed compensation for verified referral/acquisition work
     * @dev Uses headhunter pool only; not a rank/percentage payout
     */
    function payReferralWorkReward(address worker, uint256 amount, string calldata reason) external onlyManager nonReentrant {
        if (worker == address(0) || amount == 0) revert ECO_Zero();

        allocateIncoming();
        uint256 spendable = _getSpendablePoolBalance(headhunterPool, headhunterPoolReserveBps);
        if (amount > spendable) revert ECO_InsufficientFunds();

        headhunterPool -= amount;
        totalHeadhunterPaid += amount;
        rewardToken.safeTransfer(worker, amount);

        emit WorkRewardPaid(worker, amount, "referral_work", reason);
    }

    /**
     * @notice Pay the next unlocked referral-work level reward for a referrer in a year.
     * @dev Only objective point milestones are used (no leaderboard rank, no percentage share).
     */
    function payReferralLevelReward(address worker, uint256 year, string calldata reason) external onlyManager nonReentrant {
        _processReferralLevelPayouts(worker, year, reason, true);
    }

    /**
     * @notice Self-claim unlocked referral work levels for the caller.
     * @dev Enables autonomous user claims from objective milestones without manager intervention.
     */
    function claimReferralLevelRewards(uint256 year, string calldata reason) external nonReentrant returns (uint8 levelsPaid, uint256 totalAmount) {
        (levelsPaid, totalAmount) = _processReferralLevelPayouts(msg.sender, year, reason, true);
    }

    /**
     * @notice Permissionless processor for objective referral level payouts.
     * @dev Anyone can trigger, but payout always goes to `worker`.
     */
    function processReferralLevelRewards(address worker, uint256 year, string calldata reason) external nonReentrant returns (uint8 levelsPaid, uint256 totalAmount) {
        if (worker == address(0)) revert ECO_Zero();
        (levelsPaid, totalAmount) = _processReferralLevelPayouts(worker, year, reason, false);
    }

    function _processReferralLevelPayouts(
        address worker,
        uint256 year,
        string memory reason,
        bool strict
    ) internal returns (uint8 levelsPaid, uint256 totalAmount) {
        if (worker == address(0)) {
            if (strict) revert ECO_Zero();
            return (0, 0);
        }

        // Keep eligibility tied to minimum trust threshold at payout time.
        if (seer.getScore(worker) < HEADHUNTER_MIN_SCORE) {
            if (strict) revert ECO_NotEligible();
            return (0, 0);
        }

        uint16 points = yearPoints[year][worker];
        uint8 unlockedLevel = _getReferralWorkLevel(points);
        if (unlockedLevel == 0) {
            if (strict) revert ECO_NotEligible();
            return (0, 0);
        }

        uint8 alreadyPaidLevel = referralLevelPaid[year][worker];
        if (alreadyPaidLevel >= unlockedLevel) {
            if (strict) revert ECO_AlreadyClaimed();
            return (0, 0);
        }

        allocateIncoming();

        uint8 nextLevel = alreadyPaidLevel + 1;
        uint8 finalPaidLevel = alreadyPaidLevel;

        while (nextLevel <= unlockedLevel) {
            uint256 levelReward = _getReferralLevelReward(nextLevel);
            if (levelReward == 0) {
                if (strict && levelsPaid == 0) revert ECO_NotEligible();
                break;
            }

            uint256 spendable = _getSpendablePoolBalance(headhunterPool, headhunterPoolReserveBps);
            if (levelReward > spendable) {
                if (strict && levelsPaid == 0) revert ECO_InsufficientFunds();
                break;
            }

            headhunterPool -= levelReward;
            totalHeadhunterPaid += levelReward;
            totalAmount += levelReward;
            levelsPaid++;
            finalPaidLevel = nextLevel;

            emit ReferralWorkLevelRewardPaid(worker, year, nextLevel, levelReward, reason);

            nextLevel++;
        }

        if (levelsPaid == 0) {
            if (strict) revert ECO_AlreadyClaimed();
            return (0, 0);
        }

        referralLevelPaid[year][worker] = finalPaidLevel;
        rewardToken.safeTransfer(worker, totalAmount);
        emit WorkRewardPaid(worker, totalAmount, "referral_work_level", reason);
    }

    function _getReferralWorkLevel(uint16 points) internal view returns (uint8) {
        if (points >= referralLevel4Points) return 4;
        if (points >= referralLevel3Points) return 3;
        if (points >= referralLevel2Points) return 2;
        if (points >= referralLevel1Points) return 1;
        return 0;
    }

    function _getReferralLevelReward(uint8 level) internal view returns (uint256) {
        if (level == 1) return referralLevel1Reward;
        if (level == 2) return referralLevel2Reward;
        if (level == 3) return referralLevel3Reward;
        if (level == 4) return referralLevel4Reward;
        return 0;
    }

    function _getSpendablePoolBalance(uint256 poolBalance, uint16 reserveBps) internal pure returns (uint256) {
        if (poolBalance == 0) return 0;
        if (reserveBps == 0) return poolBalance;
        uint256 reserveAmount = (poolBalance * reserveBps) / MAX_BPS;
        return poolBalance > reserveAmount ? poolBalance - reserveAmount : 0;
    }

    function _getReferralLevelRequiredPoints(uint8 level) internal view returns (uint16) {
        if (level == 1) return referralLevel1Points;
        if (level == 2) return referralLevel2Points;
        if (level == 3) return referralLevel3Points;
        if (level == 4) return referralLevel4Points;
        return 0;
    }

    function _calculateHeadhunterRank(uint256 year, address referrer) internal view returns (uint8) {
        uint16 myPoints = yearPoints[year][referrer];
        if (myPoints == 0) return 0;
        
        uint8 rank = 1;
        address[] storage referrers = yearReferrers[year];
        
        // Limit iterations to prevent gas issues on large arrays
        uint256 maxIterations = referrers.length > MAX_RANK_ITERATIONS ? MAX_RANK_ITERATIONS : referrers.length;
        
        for (uint256 i = 0; i < maxIterations && rank <= HEADHUNTER_RANKS; i++) {
            if (referrers[i] != referrer && yearPoints[year][referrers[i]] > myPoints) {
                rank++;
            }
        }
        
        return rank;
    }

    // Keep checkHeadhunterReward for interface compatibility (no-op now)
    function checkHeadhunterReward(address) external onlyManager {
        // No-op: rank/percentage claims are disabled; use fixed work reward payouts.
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         LEGACY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Pay expense from ecosystem vault
     * @dev If autoSwapEnabled, automatically converts VFIDE to stablecoin before payment
     * @param recipient Address to receive payment
     * @param amount Amount of VFIDE to pay (will be converted if autoSwap enabled)
     * @param reason Description of the payment
     */
    function payExpense(address recipient, uint256 amount, string calldata reason) external onlyManager {
        if (recipient == address(0) || amount == 0) revert ECO_Zero();

        allocateIncoming();
        if (operationsPool < amount) revert ECO_InsufficientFunds();

        operationsPool -= amount;
        totalExpensesPaid += amount;
        
        // If auto-swap is enabled and configured, convert VFIDE to stablecoin
        if (autoSwapEnabled && swapRouter != address(0) && preferredStablecoin != address(0)) {
            uint256 stableReceived = _swapToStable(amount);
            if (stableReceived > 0) {
                // Successfully swapped, transfer stablecoin to recipient
                IERC20(preferredStablecoin).safeTransfer(recipient, stableReceived);
                emit RewardPaidInStable(recipient, amount, stableReceived, reason);
                return;
            } else {
                // Swap failed, emit event and fallback to VFIDE payment
                emit SwapFailed(recipient, amount, reason);
            }
        }
        
        // Default: pay in VFIDE (no swap or swap failed)
        rewardToken.safeTransfer(recipient, amount);
        emit PaymentMade(recipient, amount, reason);
    }
    
    /**
     * @notice Internal: Swap VFIDE to preferred stablecoin via DEX
     * @dev Uses Uniswap V2-compatible router interface
     * @param vfideAmount Amount of VFIDE to swap
     * @return stableAmount Amount of stablecoin received (0 if swap fails)
     */
    function _swapToStable(uint256 vfideAmount) internal returns (uint256) {
        if (vfideAmount == 0) return 0;
        
        // Approve router to spend VFIDE
        rewardToken.approve(swapRouter, vfideAmount);
        
        // Calculate minimum output with slippage protection
        address[] memory path = new address[](2);
        path[0] = address(rewardToken);  // VFIDE
        path[1] = preferredStablecoin;   // e.g., USDC
        
        try ISwapRouter(swapRouter).getAmountsOut(vfideAmount, path) returns (uint256[] memory amountsOut) {
            uint256 expectedOut = amountsOut[amountsOut.length - 1];
            uint256 minAmountOut = expectedOut * (10000 - maxSlippageBps) / 10000;
            
            // Perform swap with slippage protection
            try ISwapRouter(swapRouter).swapExactTokensForTokens(
                vfideAmount,
                minAmountOut,
                path,
                address(this),
                block.timestamp + 300 // 5 min deadline
            ) returns (uint256[] memory amounts) {
                // Revoke leftover approval for security
                rewardToken.approve(swapRouter, 0);
                return amounts[amounts.length - 1];
            } catch {
                // Swap failed, revoke approval
                rewardToken.approve(swapRouter, 0);
                return 0;
            }
        } catch {
            // getAmountsOut failed (no liquidity?), revoke approval
            rewardToken.approve(swapRouter, 0);
            return 0;
        }
    }

    function burnFunds(uint256 amount) external onlyManager {
        if (amount == 0) revert ECO_Zero();

        allocateIncoming();
        if (operationsPool < amount) revert ECO_InsufficientFunds();

        operationsPool -= amount;
        totalBurned += amount;

        address dead = 0x000000000000000000000000000000000000dEaD;
        rewardToken.safeTransfer(dead, amount);
        emit FundsBurned(amount);
    }

    // Emergency withdrawal - requires timelock for security
    struct WithdrawRequest {
        address to;
        uint256 amount;
        uint256 requestedAt;
        bool executed;
        bool cancelled;
    }
    
    uint256 public withdrawRequestCount;
    mapping(uint256 => WithdrawRequest) public withdrawRequests;
    uint256 public constant WITHDRAW_TIMELOCK = 2 days;
    
    event WithdrawRequested(uint256 indexed id, address to, uint256 amount);
    event WithdrawCancelled(uint256 indexed id);
    event WithdrawExecuted(uint256 indexed id, address to, uint256 amount);

    function requestWithdraw(address to, uint256 amount) external onlyOwner returns (uint256 id) {
        require(to != address(0), "zero to");
        require(amount > 0, "zero amount");
        
        id = ++withdrawRequestCount;
        withdrawRequests[id] = WithdrawRequest({
            to: to,
            amount: amount,
            requestedAt: block.timestamp,
            executed: false,
            cancelled: false
        });
        
        emit WithdrawRequested(id, to, amount);
    }
    
    function cancelWithdraw(uint256 id) external onlyOwner {
        WithdrawRequest storage req = withdrawRequests[id];
        require(!req.executed, "already executed");
        require(!req.cancelled, "already cancelled");
        
        req.cancelled = true;
        emit WithdrawCancelled(id);
    }
    
    function executeWithdraw(uint256 id) external onlyOwner nonReentrant {
        WithdrawRequest storage req = withdrawRequests[id];
        require(!req.executed, "already executed");
        require(!req.cancelled, "cancelled");
        require(block.timestamp >= req.requestedAt + WITHDRAW_TIMELOCK, "timelock not passed");
        
        req.executed = true;
        rewardToken.safeTransfer(req.to, req.amount);
        emit WithdrawExecuted(id, req.to, req.amount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function getPoolBalances() external view returns (
        uint256 council,
        uint256 merchant,
        uint256 headhunter,
        uint256 total
    ) {
        council = councilPool;
        merchant = merchantPool;
        headhunter = headhunterPool;
        total = rewardToken.balanceOf(address(this));
    }

    function getMerchantStats(address merchant) external view returns (
        uint256 txCount,
        uint256 bonusesPaid,
        uint16 currentTier,
        uint8 currentPeriodRank
    ) {
        txCount = periodMerchantTxCount[currentMerchantPeriod][merchant];
        bonusesPaid = totalMerchantBonusesPaid[merchant];
        currentTier = _getMerchantBonusTier(seer.getScore(merchant));
        currentPeriodRank = _calculateMerchantRank(currentMerchantPeriod, merchant);
    }

    function getHeadhunterStats(address referrer) external view returns (
        uint16 currentYearPoints,
        uint8 estimatedRank,
        uint256 currentYearNumber,
        uint256 currentQuarterNumber,
        uint256 quarterEndsAt
    ) {
        currentYearPoints = yearPoints[currentYear][referrer];
        estimatedRank = _calculateHeadhunterRank(currentYear, referrer);
        currentYearNumber = currentYear;
        currentQuarterNumber = currentQuarter;
        quarterEndsAt = yearStartTime + (QUARTER * currentQuarter);
    }

    /**
     * @notice Returns current referral-work level progress for a referrer in a year.
     */
    function getReferralLevelStatus(address referrer, uint256 year) external view returns (
        uint16 points,
        uint8 unlockedLevel,
        uint8 highestPaidLevel,
        uint8 nextLevel,
        uint16 nextLevelRequiredPoints,
        uint256 nextLevelReward
    ) {
        points = yearPoints[year][referrer];
        unlockedLevel = _getReferralWorkLevel(points);
        highestPaidLevel = referralLevelPaid[year][referrer];

        nextLevel = highestPaidLevel >= 4 ? 0 : highestPaidLevel + 1;

        nextLevelRequiredPoints = _getReferralLevelRequiredPoints(nextLevel);

        nextLevelReward = _getReferralLevelReward(nextLevel);
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

    /**
     * @notice Get pending referral status for an address
     * @param referred The referred address to check
     */
    function getPendingReferral(address referred) external view returns (
        address merchantReferrer,
        address userReferrer,
        bool credited
    ) {
        merchantReferrer = pendingMerchantReferrer[referred];
        userReferrer = pendingUserReferrer[referred];
        credited = referralCredited[referred];
    }
    
    /**
     * @notice Get paginated list of merchants for a period
     * @param period The merchant period to query
     * @param offset Starting index
     * @param limit Maximum merchants to return
     * @return merchants Array of merchant addresses
     * @return total Total number of merchants in the period
     */
    function getMerchantsPaginated(uint256 period, uint256 offset, uint256 limit) external view returns (
        address[] memory merchants,
        uint256 total
    ) {
        address[] storage all = periodMerchants[period];
        total = all.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 length = end - offset;
        
        merchants = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            merchants[i] = all[offset + i];
        }
    }
    
    /**
     * @notice Get paginated list of referrers for a year
     * @param year The year to query
     * @param offset Starting index
     * @param limit Maximum referrers to return
     * @return referrers Array of referrer addresses
     * @return total Total number of referrers in the year
     */
    function getReferrersPaginated(uint256 year, uint256 offset, uint256 limit) external view returns (
        address[] memory referrers,
        uint256 total
    ) {
        address[] storage all = yearReferrers[year];
        total = all.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 length = end - offset;
        
        referrers = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            referrers[i] = all[offset + i];
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                     SPENDING HISTORY TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track spending by category
    uint256 public totalCouncilPaid;
    uint256 public totalMerchantBonusPaid;
    uint256 public totalHeadhunterPaid;
    uint256 public totalBurned;
    uint256 public totalExpensesPaid;
    
    /**
     * @notice Get spending summary by category
     */
    function getSpendingSummary() external view returns (
        uint256 councilTotal,
        uint256 merchantTotal,
        uint256 headhunterTotal,
        uint256 burnedTotal,
        uint256 expensesTotal,
        uint256 grandTotal
    ) {
        councilTotal = totalCouncilPaid;
        merchantTotal = totalMerchantBonusPaid;
        headhunterTotal = totalHeadhunterPaid;
        burnedTotal = totalBurned;
        expensesTotal = totalExpensesPaid;
        grandTotal = councilTotal + merchantTotal + headhunterTotal + burnedTotal + expensesTotal;
    }
    
    /**
     * @notice Get vault health metrics
     */
    function getVaultHealth() external view returns (
        uint256 currentBalance,
        uint256 totalIn,
        uint256 totalOut,
        uint256 councilPoolBalance,
        uint256 merchantPoolBalance,
        uint256 headhunterPoolBalance
    ) {
        currentBalance = rewardToken.balanceOf(address(this));
        totalIn = councilPool + merchantPool + headhunterPool + operationsPool + totalCouncilPaid + totalMerchantBonusPaid + totalHeadhunterPaid + totalBurned + totalExpensesPaid;
        totalOut = totalCouncilPaid + totalMerchantBonusPaid + totalHeadhunterPaid + totalBurned + totalExpensesPaid;
        councilPoolBalance = councilPool;
        merchantPoolBalance = merchantPool;
        headhunterPoolBalance = headhunterPool;
    }
    
    /**
     * @notice Preview merchant reward before claiming
     */
    function previewMerchantReward(uint256 period, address merchant) external view returns (
        uint256 txCount,
        uint16 bestTier,
        bool claimed,
        bool periodEnded,
        uint256 poolSnapshot
    ) {
        txCount = periodMerchantTxCount[period][merchant];
        bestTier = periodMerchantTier[period][merchant];
        claimed = merchantPeriodClaimed[period][merchant];
        periodEnded = merchantPeriodEnded[period];
        poolSnapshot = merchantPeriodPoolSnapshot[period];
    }
    
    /**
     * @notice Preview headhunter reward before claiming
     */
    function previewHeadhunterReward(uint256 year, uint256 quarter, address referrer) external view returns (
        uint16 referrerPoints,
        bool claimed,
        bool quarterEndedFlag,
        uint256 poolSnapshot
    ) {
        referrerPoints = yearPoints[year][referrer];
        claimed = quarterClaimed[year][quarter][referrer];
        quarterEndedFlag = quarterEnded[year][quarter];
        poolSnapshot = quarterPoolSnapshot[year][quarter];
    }
}
