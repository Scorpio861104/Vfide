// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * EcosystemVault — Growth Incentive Treasury (Percentage-Based)
 * ----------------------------------------------------------
 * Receives the "Ecosystem Fee" (0.2%) from ProofScoreBurnRouter.
 * 
 * Three equal buckets (33.3% each), distributed as PERCENTAGES not fixed amounts:
 * 
 * 1. COUNCIL REWARDS (33.3%)
 *    - Split evenly between active council members (1-12)
 *    - Distributed monthly
 *    - Each member gets: councilPool / activeMembers
 * 
 * 2. MERCHANT BONUS (33.3%)
 *    - Tiered percentage based on ProofScore
 *    - Paid as % of merchantPool per transaction
 *    - Higher trust = higher bonus tier
 * 
 * 3. HEADHUNTER FUND (33.3%)
 *    - 20 rank levels, distributed quarterly
 *    - Points: 1pt per user referral, 3pt per merchant referral
 *    - Pool split by rank position (top ranks get larger %)
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

    function setCouncilManager(address _councilManager) external onlyOwner {
        councilManager = ICouncilManager(_councilManager);
    }

    function setAllocations(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) external onlyOwner {
        require(_councilBps + _merchantBps + _headhunterBps == MAX_BPS, "must total 100%");
        // M-5 Fix: Enforce minimum allocation thresholds
        require(_councilBps >= MIN_ALLOCATION_BPS, "ECO: council below minimum");
        require(_merchantBps >= MIN_ALLOCATION_BPS, "ECO: merchant below minimum");
        require(_headhunterBps >= MIN_ALLOCATION_BPS, "ECO: headhunter below minimum");
        councilBps = _councilBps;
        merchantBps = _merchantBps;
        headhunterBps = _headhunterBps;
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

    // ═══════════════════════════════════════════════════════════════════════
    //                         RECEIVE & ALLOCATE
    // ═══════════════════════════════════════════════════════════════════════
    
    function allocateIncoming() public {
        uint256 balance = vfide.balanceOf(address(this));
        uint256 allocated = councilPool + merchantPool + headhunterPool + operationsPool;
        uint256 unallocated = balance > allocated ? balance - allocated : 0;
        
        if (unallocated > 0) {
            uint256 toCouncil = (unallocated * councilBps) / MAX_BPS;
            uint256 toMerchant = (unallocated * merchantBps) / MAX_BPS;
            uint256 toHeadhunter = (unallocated * headhunterBps) / MAX_BPS;
            uint256 toOperations = unallocated - toCouncil - toMerchant - toHeadhunter;
            
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
        
        vfide.safeTransfer(operationsWallet, amount);
        
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
                vfide.safeTransfer(members[i], perMember);
            }
        }
        
        lastCouncilDistribution = block.timestamp;
        emit CouncilDistributed(amount - councilPool, memberCount, perMember);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         2. MERCHANT BONUS (Monthly, Proportional)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Record merchant transaction for this month's distribution
     * @dev Tracks tx count and tier, actual payout happens monthly
     */
    function recordMerchantTransaction(address merchant) external onlyManager {
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
    }

    /**
     * @notice End merchant period and snapshot for claiming
     * @dev Called monthly, merchants then claim based on their rank
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
     * @param period The period number to claim from
     */
    function claimMerchantReward(uint256 period) external nonReentrant {
        if (!merchantPeriodEnded[period]) revert ECO_NotEligible();
        if (merchantPeriodClaimed[period][msg.sender]) revert ECO_AlreadyClaimed();
        if (periodMerchantTxCount[period][msg.sender] == 0) revert ECO_NotEligible();
        
        // Calculate rank (1-based)
        uint8 rank = _calculateMerchantRank(period, msg.sender);
        if (rank == 0 || rank > MERCHANT_RANKS) revert ECO_InvalidRank();
        
        // Get share based on rank tier
        uint16 shareBps = _getMerchantRankShare(rank);
        uint256 pool = merchantPeriodPoolSnapshot[period];
        uint256 reward = (pool * shareBps) / MAX_BPS;
        
        merchantPeriodClaimed[period][msg.sender] = true;
        totalMerchantBonusesPaid[msg.sender] += reward;
        vfide.safeTransfer(msg.sender, reward);
        
        emit MerchantBonusPaid(msg.sender, reward, periodMerchantTier[period][msg.sender]);
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
    //                         3. HEADHUNTER FUND (Quarterly, Ranked)
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
    function creditMerchantReferral(address merchant) external onlyManager {
        address referrer = pendingMerchantReferrer[merchant];
        if (referrer == address(0)) return;
        if (referralCredited[merchant]) return;
        
        // Referrer must still have minimum score at credit time
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        referralCredited[merchant] = true;
        _awardPoints(referrer, POINTS_MERCHANT_REFERRAL, merchant, true);
    }

    /**
     * @notice Credit user referral after user has $25+ worth in vault
     * @param user The user who met the threshold
     */
    function creditUserReferral(address user) external onlyManager {
        address referrer = pendingUserReferrer[user];
        if (referrer == address(0)) return;
        if (referralCredited[user]) return;
        
        // Referrer must still have minimum score at credit time
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        referralCredited[user] = true;
        _awardPoints(referrer, POINTS_USER_REFERRAL, user, false);
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
     * @param year The year to claim from
     * @param quarter The quarter to claim from (1-4)
     */
    function claimHeadhunterReward(uint256 year, uint256 quarter) external nonReentrant {
        if (quarter == 0 || quarter > 4) revert ECO_InvalidRank();
        if (!quarterEnded[year][quarter]) revert ECO_NotEligible();
        if (quarterClaimed[year][quarter][msg.sender]) revert ECO_AlreadyClaimed();
        if (yearPoints[year][msg.sender] == 0) revert ECO_NotEligible();
        
        // Must maintain minimum score to claim (prevents score tanking after referrals)
        if (seer.getScore(msg.sender) < HEADHUNTER_MIN_SCORE) revert ECO_NotEligible();
        
        // Calculate rank based on year-accumulated points
        uint8 rank = _calculateHeadhunterRank(year, msg.sender);
        if (rank == 0 || rank > HEADHUNTER_RANKS) revert ECO_InvalidRank();
        
        // Calculate reward based on rank
        uint256 pool = quarterPoolSnapshot[year][quarter];
        uint256 reward = (pool * HEADHUNTER_RANK_SHARE_BPS[rank - 1]) / MAX_BPS;
        
        quarterClaimed[year][quarter][msg.sender] = true;
        vfide.safeTransfer(msg.sender, reward);
        
        emit HeadhunterRewardClaimed(msg.sender, year, quarter, reward, rank);
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
        // No-op: rewards are now claimed quarterly via claimHeadhunterReward
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         LEGACY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function payExpense(address recipient, uint256 amount, string calldata reason) external onlyManager {
        if (vfide.balanceOf(address(this)) < amount) revert ECO_InsufficientFunds();
        vfide.safeTransfer(recipient, amount);
        emit PaymentMade(recipient, amount, reason);
    }

    function burnFunds(uint256 amount) external onlyManager {
        if (vfide.balanceOf(address(this)) < amount) revert ECO_InsufficientFunds();
        address dead = 0x000000000000000000000000000000000000dEaD;
        vfide.safeTransfer(dead, amount);
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
        vfide.safeTransfer(req.to, req.amount);
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
        total = vfide.balanceOf(address(this));
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
        currentBalance = IERC20(vfide).balanceOf(address(this));
        totalIn = councilPool + merchantPool + headhunterPool + totalCouncilPaid + totalMerchantBonusPaid + totalHeadhunterPaid;
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
