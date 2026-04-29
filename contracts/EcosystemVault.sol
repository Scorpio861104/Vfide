// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20, ISeer, ICouncilManager, ISwapRouter, SafeERC20, Ownable, ReentrancyGuard } from "./SharedInterfaces.sol";
import { EcosystemVaultLib } from "./EcosystemVaultLib.sol";

/// @dev Minimal interface for real token burn (H-10 fix)
interface IVFIDEBurnable {
    function burn(uint256 amount) external;
}

interface IVaultHubReferral_ECO {
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
 */

error ECO_NotAuthorized();
error ECO_InsufficientFunds();
error ECO_Zero();
error ECO_NotEligible();
error ECO_TooEarly();
error ECO_ArrayCapReached();
/// @notice Permanently reverts — token rewards for referrals or merchant ranking are not available (Howey compliance)
error ECO_RewardsNotAvailable();
error ECO_CouncilBelowMinimum();
error ECO_MerchantBelowMinimum();
error ECO_HeadhunterBelowMinimum();
error ECO_AlreadyExecuted();
error ECO_AlreadyCancelled();
error ECO_TimelockNotPassed();
error ECO_InvalidConfig();
error ECO_ExceedsMax();
error ECO_NoPendingChange();
error ECO_ChangeNotReady();
error ECO_ExpenseCapExceeded();
error ECO_BpsTooHigh();
error ECO_MerchantEpochCapExceeded();
error ECO_HeadhunterEpochCapExceeded();

contract EcosystemVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    event PaymentMade(address indexed recipient, uint256 amount, string reason);
    event FundsBurned(uint256 amount);
    event ManagerSet(address manager, bool active);
    event CouncilDistributed(uint256 totalAmount, uint8 memberCount, uint256 perMember);
    event HeadhunterQuarterEnded(uint256 year, uint256 quarter, uint256 totalPool);
    event ReferralRecorded(address indexed referrer, address indexed referred, bool isMerchant, uint16 points);
    event AllocationUpdated(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps, uint16 operationsBps);
    event MerchantPeriodEnded(uint256 period, uint256 poolSnapshot);
    event SeerUpdated(address indexed oldSeer, address indexed newSeer);
    event PendingReferralRegistered(address indexed referred, address indexed referrer, bool isMerchant);
    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
    event ReferralVaultHubUpdated(address indexed oldHub, address indexed newHub);
    event WorkRewardPaid(address indexed worker, uint256 amount, string program, string reason);
    event ManagerChangeQueued(address indexed manager, bool active, uint256 executeAfter);
    event ManagerChangeCancelled(address indexed manager, bool active);
    event AllocationChangeQueued(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps, uint16 operationsBps, uint256 executeAfter);
    event AllocationChangeCancelled(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps, uint16 operationsBps);
    event CouncilManagerChangeQueued(address indexed councilManager, uint256 executeAfter);
    event CouncilManagerChangeCancelled(address indexed councilManager);
    event CouncilManagerUpdated(address indexed oldCouncilManager, address indexed newCouncilManager);
    event OperationsWalletChangeQueued(address indexed wallet, uint256 executeAfter);
    event OperationsWalletChangeCancelled(address indexed wallet);
    event OperationsWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event ExpenseEpochRolled(uint256 startedAt, uint256 baseOperationsPool, uint256 capAmount);
    event OperationsCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event WithdrawRequested(uint256 indexed id, address to, uint256 amount);
    event WithdrawCancelled(uint256 indexed id);
    event WithdrawExecuted(uint256 indexed id, address to, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    uint16 public constant MAX_BPS = 10000;
    uint8 public constant MAX_COUNCIL_MEMBERS = 12;
    uint8 public constant HEADHUNTER_RANKS = 20;
    uint8 public constant MERCHANT_RANKS = 100;
    uint256 public constant MONTH = 30 days;
    uint256 public constant QUARTER = 90 days;
    uint256 public constant SENSITIVE_CHANGE_DELAY = 2 days;
    uint256 public constant EXPENSE_EPOCH_DURATION = 7 days;
    uint16 public constant EXPENSE_EPOCH_CAP_BPS = 2500;
    
    // Points for referrals
    uint16 public constant POINTS_USER_REFERRAL = 1;
    uint16 public constant POINTS_MERCHANT_REFERRAL = 3;
    
    // Minimum score to participate in headhunter program (60%)
    uint16 public constant HEADHUNTER_MIN_SCORE = 6000;
    
    // Minimum activity for referral to count
    uint8 public constant MIN_MERCHANT_TX = 3;        // Merchant needs 3 transactions
    uint256 public constant MIN_USER_VAULT_USD = 25;  // User needs $25 worth in vault
    uint256 public constant MIN_USER_VAULT_BALANCE = 25e18;

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

    // Array caps to prevent O(n²) gas issues
    uint256 public constant MAX_MERCHANTS_PER_PERIOD = 500;
    uint256 public constant MAX_REFERRERS_PER_YEAR = 200;
    uint256 public constant MAX_RANK_ITERATIONS = 200;  // Max iterations for ranking calculation
    uint256 public constant MAX_COUNCIL_DISTRIBUTION_BATCH = 200;

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    IERC20 public vfide;
    IERC20 public rewardToken;
    ISeer public seer;
    ICouncilManager public councilManager;
    IVaultHubReferral_ECO public referralVaultHub;
    
    mapping(address => bool) public isManager;

    // Emergency withdrawal queue (timelocked owner-only withdrawals)
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
    uint256 public maxWithdrawBps = 1000;
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

    PendingManagerChange public pendingManagerChange;
    PendingAllocationChange public pendingAllocationChange;
    PendingCouncilManagerChange public pendingCouncilManagerChange;
    PendingOperationsWalletChange public pendingOperationsWalletChange;

    // Allocation buckets (council + merchant + headhunter + operations = 10000)
    uint16 public councilBps = 2500;      // 25% - DAO council
    uint16 public merchantBps = 2500;     // 25% - Merchant rewards
    uint16 public headhunterBps = 2500;   // 25% - Referral rewards
    uint16 public operationsBps = 2500;   // 25% - Team operations/sustainability
    
    uint16 public constant MIN_ALLOCATION_BPS = 500; // Reduced to 5% to allow 4-way split
    
    // Operations wallet for team sustainability
    address public operationsWallet;
    uint256 public lastOperationsWithdrawal;
    uint256 public operationsWithdrawalCooldown = 30 days;

    // Pool balances
    uint256 public councilPool;
    uint256 public merchantPool;
    uint256 public headhunterPool;
    // H-11 FIX: Per-epoch caps to prevent a compromised manager from draining pools in one call.
    // Default: 10% of pool per 30-day epoch; DAO can adjust via setEpochCaps().
    uint16 public merchantEpochCapBps = 1000;     // 10% of merchantPool per epoch
    uint16 public headhunterEpochCapBps = 1000;   // 10% of headhunterPool per epoch
    uint256 public constant EPOCH_DURATION = 30 days;
    uint256 public merchantEpochStart;
    uint256 public headhunterEpochStart;
    uint256 public merchantPaidThisEpoch;
    uint256 public headhunterPaidThisEpoch;
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
    mapping(address => uint256) public merchantLifetimeTxCount;

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
    //                   STABLECOIN WORK-COMPENSATION (Howey-safe)
    // ═══════════════════════════════════════════════════════════════════════
    // DEX router for VFIDE → Stablecoin swaps when paying rewards
    address public swapRouter;
    address public preferredStablecoin;  // e.g., USDC
    bool public autoSwapEnabled;         // Disabled by default; enable after liquidity is established
    uint16 public maxSlippageBps = 100;  // 1% max slippage (default)

    // Admin-set floor price: stablecoin units per 1e18 VFIDE, used as minAmountOut in DEX swaps.
    // Protects against sandwich attacks without requiring a live on-chain oracle.
    // Example: 950000 = 0.95 USDC (6-decimal) per 1 VFIDE.  Must be set before enabling auto-swap.
    uint256 public minOutputPerVfide;

    // HOWEY FIX: Direct stablecoin reserve — owner/manager pre-funds with USDC/USDT.
    // Work rewards are drawn directly from this reserve with no DEX swap required.
    // This eliminates both the sandwich-attack risk and any expectation-of-profit argument:
    // workers receive a fixed-dollar service fee, not an appreciating VFIDE token.
    mapping(address => uint256) public stablecoinReserves;

    // HOWEY FIX: When true, ALL work reward payments (merchant, referral, level payouts)
    // are paid in stablecoin — first from the direct reserve, then via DEX swap if needed.
    // Receiving a potentially-appreciating VFIDE token as "work compensation" creates a
    // profit expectation (Howey Prong 3). A fixed stablecoin service fee is unambiguous.
    // Requires preferredStablecoin to be set before enabling; swapRouter is optional when
    // the direct reserve is funded.
    bool public stablecoinOnlyMode;

    event AutoSwapConfigured(address router, address stablecoin, bool enabled, uint16 maxSlippageBps);
    event MinOutputPerVfideSet(uint256 minOutput);
    event StablecoinOnlyModeSet(bool enabled);
    event StablecoinDeposited(address indexed token, address indexed from, uint256 amount);
    event StablecoinReserveWithdrawn(address indexed token, uint256 amount, address indexed recipient);
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
    //                     SPENDING HISTORY TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    uint256 public totalCouncilPaid;
    uint256 public totalMerchantBonusPaid;
    uint256 public totalHeadhunterPaid;
    uint256 public totalBurned;
    uint256 public totalExpensesPaid;
    uint256 public operationsExpenseEpochStartedAt;
    uint256 public operationsExpenseEpochBase;
    uint256 public operationsSpentInEpoch;

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
    // slither-disable-next-line missing-zero-check
    constructor(address _vfide, address _seer, address _operationsWallet) {
        if (_vfide == address(0) || _seer == address(0)) revert ECO_Zero();
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
        if (_ownerGovernanceMediated()) {
            _applyManagerChange(manager, active);
            return;
        }

        pendingManagerChange = PendingManagerChange({
            manager: manager,
            active: active,
            executeAfter: block.timestamp + SENSITIVE_CHANGE_DELAY
        });

        emit ManagerChangeQueued(manager, active, block.timestamp + SENSITIVE_CHANGE_DELAY);
    }

    /// @notice H-11 FIX: DAO can adjust per-epoch payout caps (in bps of pool).
    function setEpochCaps(uint16 _merchantCapBps, uint16 _headhunterCapBps) external onlyOwner {
        if (_merchantCapBps > MAX_BPS || _headhunterCapBps > MAX_BPS) revert ECO_BpsTooHigh();
        merchantEpochCapBps = _merchantCapBps;
        headhunterEpochCapBps = _headhunterCapBps;
    }

    function executeManagerChange() external onlyOwner {
        PendingManagerChange memory pending = pendingManagerChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < pending.executeAfter) revert ECO_ChangeNotReady();

        delete pendingManagerChange;
        _applyManagerChange(pending.manager, pending.active);
    }

    function cancelManagerChange() external onlyOwner {
        PendingManagerChange memory pending = pendingManagerChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();

        delete pendingManagerChange;
    }

    function setSeer(address _seer) external onlyOwner {
        if (_seer == address(0)) revert ECO_Zero();
        address oldSeer = address(seer);
        seer = ISeer(_seer);
        emit SeerUpdated(oldSeer, _seer);
    }

    function setRewardToken(address token) external onlyOwner {
        if (token == address(0)) revert ECO_Zero();
        if (councilPool != 0 || merchantPool != 0 || headhunterPool != 0 || operationsPool != 0) revert ECO_InvalidConfig();
        address oldToken = address(rewardToken);
        rewardToken = IERC20(token);
        emit RewardTokenUpdated(oldToken, token);
    }

    function setReferralVaultHub(address hub) external onlyOwner {
        address oldHub = address(referralVaultHub);
        referralVaultHub = IVaultHubReferral_ECO(hub);
        emit ReferralVaultHubUpdated(oldHub, hub);
    }

    /// @notice Migrate to a new reward token while preserving pool accounting.
    /// @dev Owner must pre-fund this contract with at least the outstanding pool amount of the new token.
    // slither-disable-next-line reentrancy-no-eth
    function migrateRewardToken(address token, address oldTokenSink) external onlyOwner nonReentrant {
        if (token == address(0)) revert ECO_Zero();
        address oldToken = address(rewardToken);
        if (token == oldToken) revert ECO_InvalidConfig();

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

    function setCouncilManager(address _councilManager) external onlyOwner {
        if (_ownerGovernanceMediated()) {
            _applyCouncilManagerChange(_councilManager);
            return;
        }

        pendingCouncilManagerChange = PendingCouncilManagerChange({
            councilManager: _councilManager,
            executeAfter: block.timestamp + SENSITIVE_CHANGE_DELAY
        });

        emit CouncilManagerChangeQueued(_councilManager, block.timestamp + SENSITIVE_CHANGE_DELAY);
    }

    function executeCouncilManagerChange() external onlyOwner {
        PendingCouncilManagerChange memory pending = pendingCouncilManagerChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < pending.executeAfter) revert ECO_ChangeNotReady();

        delete pendingCouncilManagerChange;
        _applyCouncilManagerChange(pending.councilManager);
    }

    function cancelCouncilManagerChange() external onlyOwner {
        PendingCouncilManagerChange memory pending = pendingCouncilManagerChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();

        delete pendingCouncilManagerChange;
    }

    function setAllocations(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) external onlyOwner {
        _validateAllocationConfig(_councilBps, _merchantBps, _headhunterBps);

        if (_ownerGovernanceMediated()) {
            _applyAllocationChange(_councilBps, _merchantBps, _headhunterBps);
            return;
        }

        uint16 operationsAllocation = MAX_BPS - (_councilBps + _merchantBps + _headhunterBps);
        pendingAllocationChange = PendingAllocationChange({
            councilBps: _councilBps,
            merchantBps: _merchantBps,
            headhunterBps: _headhunterBps,
            executeAfter: block.timestamp + SENSITIVE_CHANGE_DELAY
        });

        emit AllocationChangeQueued(
            _councilBps,
            _merchantBps,
            _headhunterBps,
            operationsAllocation,
            block.timestamp + SENSITIVE_CHANGE_DELAY
        );
    }

    function executeAllocationChange() external onlyOwner {
        PendingAllocationChange memory pending = pendingAllocationChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < pending.executeAfter) revert ECO_ChangeNotReady();

        delete pendingAllocationChange;
        _applyAllocationChange(pending.councilBps, pending.merchantBps, pending.headhunterBps);
    }

    function cancelAllocationChange() external onlyOwner {
        PendingAllocationChange memory pending = pendingAllocationChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();

        delete pendingAllocationChange;
    }
    
    /**
     * @notice Set operations wallet for team sustainability
     */
    function setOperationsWallet(address _wallet) external onlyOwner {
        if (_wallet == address(0)) revert ECO_Zero();
        uint256 executeAfter = block.timestamp + SENSITIVE_CHANGE_DELAY;
        pendingOperationsWalletChange = PendingOperationsWalletChange({
            wallet: _wallet,
            executeAfter: executeAfter
        });
        emit OperationsWalletChangeQueued(_wallet, executeAfter);
    }

    function cancelOperationsWalletChange() external onlyOwner {
        PendingOperationsWalletChange memory pending = pendingOperationsWalletChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();

        delete pendingOperationsWalletChange;
    }

    function applyOperationsWalletChange() external onlyOwner {
        PendingOperationsWalletChange memory pending = pendingOperationsWalletChange;
        if (pending.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < pending.executeAfter) revert ECO_ChangeNotReady();

        address oldWallet = operationsWallet;
        operationsWallet = pending.wallet;
        delete pendingOperationsWalletChange;
        emit OperationsWalletUpdated(oldWallet, pending.wallet);
    }
    
    /**
     * @notice Set operations allocation percentage
     */
    function setOperationsAllocation(uint16 _operationsBps) external onlyOwner {
        if (_operationsBps < MIN_ALLOCATION_BPS) revert ECO_InvalidConfig();
        if (_operationsBps > MAX_BPS - (3 * MIN_ALLOCATION_BPS)) revert ECO_ExceedsMax();

        uint16 remaining = MAX_BPS - _operationsBps;
        if (councilBps < MIN_ALLOCATION_BPS) revert ECO_CouncilBelowMinimum();
        if (merchantBps < MIN_ALLOCATION_BPS) revert ECO_MerchantBelowMinimum();
        if (headhunterBps < MIN_ALLOCATION_BPS) revert ECO_HeadhunterBelowMinimum();
        if (councilBps + merchantBps + headhunterBps != remaining) revert ECO_InvalidConfig();
        operationsBps = _operationsBps;
        emit AllocationUpdated(councilBps, merchantBps, headhunterBps, _operationsBps);
    }
    
    /**
     * @notice Set operations withdrawal cooldown
     */
    function setOperationsCooldown(uint256 _cooldown) external onlyOwner {
        if (_cooldown < 1 hours) revert ECO_InvalidConfig();
        if (_cooldown > 90 days) revert ECO_InvalidConfig();
        operationsWithdrawalCooldown = _cooldown;
    }
    
    /**
     * @notice Configure automatic VFIDE to stablecoin conversion for reward payments.
     * @dev Safe to enable once the VFIDE/stablecoin liquidity pool is established (phased
     *      deployment guarantees this before rewards go live).  minOutputPerVfide must be set
     *      first to prevent sandwich attacks without requiring a live oracle.
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
        if (_maxSlippageBps > 500) revert ECO_InvalidConfig(); // Max 5%
        if (_enabled) {
            if (_router == address(0)) revert ECO_Zero();
            if (_stablecoin == address(0)) revert ECO_Zero();
            if (minOutputPerVfide == 0) revert ECO_InvalidConfig();
        }
        swapRouter = _router;
        preferredStablecoin = _stablecoin;
        autoSwapEnabled = _enabled;
        maxSlippageBps = _maxSlippageBps;
        emit AutoSwapConfigured(_router, _stablecoin, _enabled, _maxSlippageBps);
    }

    /**
     * @notice Set the floor price used as minAmountOut in DEX swaps to prevent sandwich attacks.
     * @dev Express in stablecoin units per 1e18 VFIDE.
     *      Example: 950000 means 0.95 USDC (6 decimals) per 1 VFIDE.
     *      Keep this value current; if VFIDE price falls significantly, lower the floor so swaps
     *      are not blocked.  Must be called before configureAutoSwap can be enabled.
     * @param _minOutput Floor price in stablecoin units per 1e18 VFIDE.
     */
    function setMinOutputPerVfide(uint256 _minOutput) external onlyOwner {
        if (_minOutput == 0) revert ECO_Zero();
        minOutputPerVfide = _minOutput;
        emit MinOutputPerVfideSet(_minOutput);
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
    * @param _enabled True to require stablecoin payments for non-reward payouts; false to allow
    *        those non-reward paths to use VFIDE again.
     */
    function setStablecoinOnlyMode(bool _enabled) external onlyOwner {
        if (_enabled) {
            if (preferredStablecoin == address(0) || (stablecoinReserves[preferredStablecoin] == 0 && !autoSwapEnabled)) {
                revert ECO_InvalidConfig();
            }
        }
        stablecoinOnlyMode = _enabled;
        emit StablecoinOnlyModeSet(_enabled);
    }

    /**
     * @notice Deposit stablecoin into the direct work-compensation reserve.
     * @dev HOWEY FIX — recommended path: pre-fund this reserve with USDC/USDT so that all
     *      merchant and headhunter work rewards are paid as fixed-dollar service fees with no
     *      DEX swap required. The depositor must have approved this contract first.
     * @param stablecoin Address of the stablecoin to deposit (must match preferredStablecoin
     *        when stablecoinOnlyMode is active, or any token otherwise for future use).
     * @param amount Amount to deposit (in stablecoin's native decimals).
     */
    // slither-disable-next-line reentrancy-benign
    function depositStablecoinReserve(address stablecoin, uint256 amount) external onlyManager nonReentrant {
        if (stablecoin == address(0)) revert ECO_Zero();
        if (amount == 0) revert ECO_Zero();
        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), amount);
        stablecoinReserves[stablecoin] += amount;
        emit StablecoinDeposited(stablecoin, msg.sender, amount);
    }

    /**
     * @notice Emergency withdrawal of stablecoin reserve (owner only).
     * @param stablecoin Token to withdraw.
     * @param amount Amount to withdraw.
     * @param recipient Destination address.
     */
    function withdrawStablecoinReserve(address stablecoin, uint256 amount, address recipient) external onlyOwner nonReentrant {
        if (stablecoin == address(0) || recipient == address(0)) revert ECO_Zero();
        if (amount == 0 || amount > stablecoinReserves[stablecoin]) revert ECO_InsufficientFunds();
        stablecoinReserves[stablecoin] -= amount;
        IERC20(stablecoin).safeTransfer(recipient, amount);
        emit StablecoinReserveWithdrawn(stablecoin, amount, recipient);
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
        if (merchantReserve > 9000) revert ECO_ExceedsMax();
        if (headhunterReserve > 9000) revert ECO_ExceedsMax();
        if (maxAutoPayout == 0 || maxAutoPayout > 5000) revert ECO_InvalidConfig();

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
        if (level1Points == 0) revert ECO_InvalidConfig();
        if (level1Points >= level2Points) revert ECO_InvalidConfig();
        if (level2Points >= level3Points) revert ECO_InvalidConfig();
        if (level3Points >= level4Points) revert ECO_InvalidConfig();

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
        if (!isManager[msg.sender] && msg.sender != owner && msg.sender != address(this)) {
            revert ECO_NotAuthorized();
        }
        _allocateIncoming();
    }

    function _allocateIncoming() internal {
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
        merchantLifetimeTxCount[merchant]++;
        
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

        merchantPool -= amount;
        merchantPaidThisEpoch += amount;
        totalMerchantBonusPaid += amount;
        _deliverWorkReward(worker, amount, reason);
    }

    // _calculateMerchantRank moved to EcosystemVaultView.sol (off-chain indexing)

    function _getMerchantBonusTier(uint16 score) internal pure returns (uint16) {
        return EcosystemVaultLib.getMerchantBonusTier(score);
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
        if (merchantLifetimeTxCount[merchant] < MIN_MERCHANT_TX) return;
        
        // Referrer must still have minimum score at credit time
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
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
        if (seer.getScore(referrer) < HEADHUNTER_MIN_SCORE) return;
        
        referralCredited[user] = true;
        _awardPoints(referrer, POINTS_USER_REFERRAL, user, false);
        _tryAutoWorkPayout(referrer, autoUserReferralReward, false, "verified_user_referral");
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

        _allocateIncoming();

        if (useMerchantPool) {
            uint256 merchantSpendable = _getSpendablePoolBalance(merchantPool, merchantPoolReserveBps);
            uint256 merchantAutoCap = (merchantPool * maxAutoPayoutBps) / MAX_BPS;
            if (amount > merchantSpendable || amount > merchantAutoCap) return false;

            merchantPool -= amount;
            totalMerchantBonusPaid += amount;
            _deliverWorkReward(worker, amount, reason);
            return true;
        }

        uint256 headhunterSpendable = _getSpendablePoolBalance(headhunterPool, headhunterPoolReserveBps);
        uint256 headhunterAutoCap = (headhunterPool * maxAutoPayoutBps) / MAX_BPS;
        if (amount > headhunterSpendable || amount > headhunterAutoCap) return false;

        headhunterPool -= amount;
        totalHeadhunterPaid += amount;
        _deliverWorkReward(worker, amount, reason);
        return true;
    }

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
     * @notice Pay fixed compensation for verified referral/acquisition work
     * @dev Uses headhunter pool only; not a rank/percentage payout.
     *      HOWEY FIX: Work compensation is always paid in stablecoin.
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

        headhunterPool -= amount;
        headhunterPaidThisEpoch += amount;
        totalHeadhunterPaid += amount;
        _deliverWorkReward(worker, amount, reason);
    }

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
        operationsSpentInEpoch += amount;

        operationsPool -= amount;
        totalExpensesPaid += amount;

        _payoutConfiguredReward(recipient, amount);

        reason;
    }

    /// @notice Permanently remove tokens from circulating supply.
    /// @dev I-10 Note: Sends to 0xdEaD ("soft burn") because VFIDEToken has no public burn()
    ///      function — transfer to address(0) reverts.  totalBurned tracks the removed amount
    ///      so off-chain supply calculations can subtract it from totalSupply().
    // slither-disable-next-line reentrancy-events
    function burnFunds(uint256 amount) external onlyManager {
        if (amount == 0) revert ECO_Zero();

        _allocateIncoming();
        if (operationsPool < amount) revert ECO_InsufficientFunds();

        operationsPool -= amount;
        totalBurned += amount;

        // C-9 FIX: Call VFIDEToken.burn() so totalSupply is correctly decremented.
        // The dead-address "soft burn" path is removed — it left totalSupply unchanged,
        // making the deflationary narrative false.
        IVFIDEBurnable(address(rewardToken)).burn(amount);
        emit FundsBurned(amount);
    }

    function requestWithdraw(address to, uint256 amount) external onlyOwner returns (uint256 id) {
        if (to == address(0)) revert ECO_Zero();
        if (amount == 0) revert ECO_Zero();
        uint256 bal = rewardToken.balanceOf(address(this));
        if (amount + pendingWithdrawTotal > bal * maxWithdrawBps / 10_000) revert ECO_ExceedsMax();
        
        id = ++withdrawRequestCount;
        withdrawRequests[id] = WithdrawRequest({
            to: to,
            amount: amount,
            requestedAt: block.timestamp,
            executed: false,
            cancelled: false
        });
        pendingWithdrawTotal += amount;
        
        emit WithdrawRequested(id, to, amount);
    }
    
    function cancelWithdraw(uint256 id) external onlyOwner {
        WithdrawRequest storage req = withdrawRequests[id];
        if (req.executed) revert ECO_AlreadyExecuted();
        if (req.cancelled) revert ECO_AlreadyCancelled();
        req.cancelled = true;
        pendingWithdrawTotal -= req.amount;
        emit WithdrawCancelled(id);
    }
    
    function executeWithdraw(uint256 id) external onlyOwner nonReentrant {
        WithdrawRequest storage req = withdrawRequests[id];
        if (req.executed) revert ECO_AlreadyExecuted();
        if (req.cancelled) revert ECO_AlreadyCancelled();
        if (block.timestamp < req.requestedAt + WITHDRAW_TIMELOCK) revert ECO_TimelockNotPassed();

        req.executed = true;
        pendingWithdrawTotal -= req.amount;
        rewardToken.safeTransfer(req.to, req.amount);
        emit WithdrawExecuted(id, req.to, req.amount);
    }

    /// @notice Allow owner to adjust max withdrawal percentage (in basis points, max 5000 = 50%)
    function setMaxWithdrawBps(uint256 _bps) external onlyOwner {
        if (_bps == 0 || _bps > 5000) revert ECO_InvalidConfig();
        maxWithdrawBps = _bps;
    }

    function _ownerGovernanceMediated() internal view returns (bool) {
        return owner.code.length > 0;
    }

    function _applyManagerChange(address manager, bool active) internal {
        isManager[manager] = active;
        emit ManagerSet(manager, active);
    }

    function _applyCouncilManagerChange(address _councilManager) internal {
        address oldManager = address(councilManager);
        councilManager = ICouncilManager(_councilManager);
        emit CouncilManagerUpdated(oldManager, _councilManager);
    }

    function _applyAllocationChange(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) internal {
        uint16 nonOps = _councilBps + _merchantBps + _headhunterBps;
        councilBps = _councilBps;
        merchantBps = _merchantBps;
        headhunterBps = _headhunterBps;
        operationsBps = MAX_BPS - nonOps;
        emit AllocationUpdated(_councilBps, _merchantBps, _headhunterBps, MAX_BPS - nonOps);
    }

    function _validateAllocationConfig(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) internal pure {
        uint16 nonOps = _councilBps + _merchantBps + _headhunterBps;
        if (nonOps > MAX_BPS) revert ECO_InvalidConfig();
        if (_councilBps < MIN_ALLOCATION_BPS) revert ECO_CouncilBelowMinimum();
        if (_merchantBps < MIN_ALLOCATION_BPS) revert ECO_MerchantBelowMinimum();
        if (_headhunterBps < MIN_ALLOCATION_BPS) revert ECO_HeadhunterBelowMinimum();
        if (MAX_BPS - nonOps < MIN_ALLOCATION_BPS) revert ECO_InvalidConfig();
    }

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

        for (uint256 i = 0; i < memberCount; i++) {
            if (members[i] != address(0)) {
                _payoutStablecoin(members[i], preferredStablecoin, perMember);
            }
        }

        emit CouncilDistributed(distributed, uint8(memberCount), perMember);
        return true;
    }

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

    function _payoutConfiguredReward(address recipient, uint256 amount) internal {
        if (stablecoinOnlyMode) {
            _payoutStablecoin(recipient, preferredStablecoin, amount);
            return;
        }

        rewardToken.safeTransfer(recipient, amount);
    }

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

    function _endMerchantPeriodIfDue(bool strict) internal returns (bool) {
        if (block.timestamp < lastMerchantDistribution + MONTH) {
            if (strict) revert ECO_TooEarly();
            return false;
        }

        _allocateIncoming();
        merchantPeriodPoolSnapshot[currentMerchantPeriod] = merchantPool;
        merchantPeriodEnded[currentMerchantPeriod] = true;
        merchantPool = 0;

        emit MerchantPeriodEnded(currentMerchantPeriod, merchantPeriodPoolSnapshot[currentMerchantPeriod]);

        lastMerchantDistribution = block.timestamp;
        currentMerchantPeriod++;
        return true;
    }

    function _endHeadhunterQuarterIfDue(bool strict) internal returns (bool) {
        if (block.timestamp < yearStartTime + (QUARTER * currentQuarter)) {
            if (strict) revert ECO_TooEarly();
            return false;
        }

        _allocateIncoming();
        quarterPoolSnapshot[currentYear][currentQuarter] = headhunterPool;
        quarterEnded[currentYear][currentQuarter] = true;
        headhunterPool = 0;

        emit HeadhunterQuarterEnded(currentYear, currentQuarter, quarterPoolSnapshot[currentYear][currentQuarter]);

        if (currentQuarter == 4) {
            currentQuarter = 1;
            currentYear++;
            yearStartTime = block.timestamp;
        } else {
            currentQuarter++;
        }
        lastQuarterPayout = block.timestamp;
        return true;
    }

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
