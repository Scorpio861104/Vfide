// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

using SafeERC20 for IERC20;

/**
 * VFIDEPresale - Fair Launch Presale with Tiered Pricing
 * 
 * PRICING MODEL: Fixed USD price tiers
 * - PAYMENT: Stablecoins preferred (USDC, USDT, DAI) - exact USD pricing
 * - ETH also accepted with configurable conversion rate
 * - Optional lock periods for release scheduling
 * 
 * SUPPLY BREAKDOWN:
 * - VFIDEToken allocates: 35M VFIDE to presale contract at genesis
 * - Base Supply: 35M VFIDE — no bonus pool (rewards are not available)
 * - Total Presale Distribution: 35M VFIDE
 * - LP tokens come from Treasury allocation (not presale)
 * - Max Raise: $2.45M (35M × $0.07 if 100% sells)
 * 
 * DYNAMIC LISTING PRICE:
 * - Listing price scales with presale results
 * 
 * HOWEY COMPLIANCE:
 * - Lock bonuses and referral bonuses are permanently disabled
 */

// IStablecoinRegistry already defined in SharedInterfaces.sol

error PS_NotDAO();
error PS_Zero();
error PS_Paused();
error PS_NotStarted();
error PS_Ended();
error PS_SoldOut();
error PS_MaxPerWallet();
error PS_MinPurchase();
error PS_InvalidLockPeriod();
error PS_NoTokens();
error PS_AlreadyClaimed();
error PS_LockNotExpired();
error PS_AlreadyFinalized();
error PS_NotFinalized();
error PS_MinimumGoalNotMet();
error PS_GoalAlreadyMet();
error PS_RefundsNotEnabled();
error PS_NoRefundAvailable();
error PS_AlreadyExtended();
error PS_CannotExtend();
error PS_GasPriceTooHigh();
error PS_TooManyPurchases();
error PS_InvalidStablecoin();
error PS_ETHNotAccepted();
error PS_InvalidTier();
error PS_TierDisabled();
error PS_TierSoldOut();
error PS_TierLockRequired();

contract VFIDEPresale is ReentrancyGuard {
    // Events
    event Purchase(address indexed buyer, uint256 indexed lockPeriod, uint256 ethSpent, uint256 baseTokens, uint256 bonusTokens, uint256 purchaseIndex);
    event StablePurchase(address indexed buyer, address indexed stablecoin, uint256 indexed lockPeriod, uint256 stableAmount, uint256 baseTokens, uint256 bonusTokens, uint256 purchaseIndex);
    event TieredPurchase(address indexed buyer, uint8 tier, uint256 baseTokens, uint256 usdPaid);
    event ClaimImmediate(address indexed user, uint256 amount);
    event ClaimLocked(address indexed user, uint256 amount);
    event PresaleFinalized(uint256 ethRaised, uint256 lpVfide, uint256 listingPrice);
    event EmergencyPause(bool paused);
    event SaleExtended(uint256 newEndTime, uint256 additionalDays);
    event RefundsEnabled(uint256 timestamp);
    event RefundClaimed(address indexed user, uint256 amount);
    event MaxGasPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event ETHPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event StablecoinRegistryUpdated(address oldRegistry, address newRegistry);
    event TierEnabled(uint8 tier, bool enabled);
    event PurchaseCancelled(address indexed buyer, uint256 indexed index, uint256 tokensReturned);
    event SubscriptionCancelled(uint256 indexed index); // Kept for backwards compatibility

    // Immutable config
    address public immutable DAO;
    address public immutable TREASURY;
    IERC20 public immutable vfideToken;

    // Supply constants
    uint256 public constant BASE_SUPPLY = 35_000_000 * 1e18;    // 35M base tokens
    uint256 public constant TOTAL_SUPPLY = 35_000_000 * 1e18;   // 35M total (no bonus pool — rewards are not available)
    uint256 public constant MAX_PER_WALLET = 500_000 * 1e18;    // 500K per wallet
    uint256 public constant MIN_PURCHASE_USD = 10 * 1e6;         // Min $10 (6 decimals for USDC/USDT)
    uint256 public constant MIN_PURCHASE_ETH = 0.01 ether;       // Min 0.01 ETH (if ETH accepted)
    
    // Three USD Price Tiers (microUSD where 1e6 = $1)
    uint256 public constant TIER_0_PRICE = 30_000;   // $0.03 per VFIDE - Founding Tier
    uint256 public constant TIER_1_PRICE = 50_000;   // $0.05 per VFIDE - Oath Tier
    uint256 public constant TIER_2_PRICE = 70_000;   // $0.07 per VFIDE - Public Tier
    
    // Tier supply caps (how many base tokens per tier)
    uint256 public constant TIER_0_CAP = 10_000_000 * 1e18;  // 10M at $0.03
    uint256 public constant TIER_1_CAP = 10_000_000 * 1e18;  // 10M at $0.05
    uint256 public constant TIER_2_CAP = 15_000_000 * 1e18;  // 15M at $0.07
    
    // Tier sold tracking
    uint256 public tier0Sold;
    uint256 public tier1Sold;
    uint256 public tier2Sold;
    
    // Tier enable flags
    bool public tier0Enabled = true;
    bool public tier1Enabled = true;
    bool public tier2Enabled = true;
    
    // ETH pricing (optional, can be disabled)
    bool public ethAccepted = true;                              // Can disable ETH to force stablecoin only
    uint256 public ethPriceUsd = 3500;                           // ETH/USD rate (updatable by DAO)
    uint256 public ethPriceLastUpdated;                          // Timestamp of last price update
    uint256 public constant ETH_PRICE_STALENESS = 24 hours;      // Max age before price considered stale
    
    // Stablecoin registry
    IStablecoinRegistry public stablecoinRegistry;
    
    // Immediate unlock percentages (lock bonuses are not offered — VFIDE is a utility token, not investment)
    uint256 public constant IMMEDIATE_180_DAYS = 10;             // 10% immediate (tier 0 & 1 mandatory lock)
    uint256 public constant IMMEDIATE_90_DAYS = 20;              // 20% immediate (tier 1 mandatory lock)
    uint256 public constant IMMEDIATE_NO_LOCK = 100;             // 100% immediate
    
    // Lock periods
    uint256 public constant LOCK_180_DAYS = 180 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_NONE = 0;
    
    // Timing
    uint256 public saleStartTime;
    uint256 public saleEndTime;
    uint256 public constant SALE_DURATION = 30 days;
    
    // State variables
    uint256 public totalBaseSold;
    uint256 public totalSold;
    uint256 public totalClaimed;     // Track total tokens claimed for accurate _pendingClaims
    bool public paused;
    bool public finalized;
    uint256 public listingPrice;
    uint256 public lpVfideAmount;
    uint256 public totalUsdRaised;   // Total USD raised (in 6 decimals, like USDC)
    uint256 public totalEthRaised;   // ETH raised (for mixed payment tracking)
    
    // Minimum goal and refunds (in USD, 6 decimals)
    uint256 public constant MINIMUM_GOAL_USD = 612_500 * 1e6;  // $612,500 (25% of $2.45M)
    uint256 public constant MINIMUM_GOAL = 8_750_000 * 1e18;   // 8.75M base tokens (legacy)
    bool public refundsEnabled;
    mapping(address => uint256) public usdContributed;  // Track USD per user for refunds (6 decimals)
    mapping(address => uint256) public ethContributed;  // Track ETH per user for refunds
    mapping(address => mapping(address => uint256)) public stableContributed; // user => stablecoin => amount
    
    // Sale extension
    bool public saleExtended;
    uint256 public constant MAX_EXTENSION = 30 days;
    
    // Circuit breakers
    uint256 public maxGasPrice = 500 gwei;
    uint256 public constant MAX_PURCHASES_PER_WALLET = 100;
    
    // Purchase tracking
    struct PurchaseRecord {
        uint256 baseAmount;         // Base tokens purchased
        uint256 bonusAmount;        // Bonus tokens earned
        uint256 immediateAmount;    // Unlocked immediately
        uint256 lockedAmount;       // Locked until unlockTime
        uint256 lockPeriod;         // 0, 90, or 180 days
        uint256 unlockTime;         // When locked portion unlocks
        uint8 tier;                 // Which tier (0, 1, or 2) for cancelPurchase tracking
        bool immediateClaimed;      // Immediate portion claimed?
        bool lockedClaimed;         // Locked portion claimed?
    }
    
    mapping(address => PurchaseRecord[]) public purchases;
    mapping(address => uint256) public totalAllocated;
    mapping(address => uint256) public lastPurchaseTime;
    
    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != DAO) revert PS_NotDAO();
    }
    
    modifier whenNotPaused() {
        _checkNotPaused();
        _;
    }

    function _checkNotPaused() internal view {
        if (paused) revert PS_Paused();
    }
    
    // Track if tokens have been deposited
    bool public tokensDeposited;
    
    constructor(
        address _dao,
        address _token,
        address _treasury,
        address _stablecoinRegistry,
        uint256 _startTime
    ) {
        if (_dao == address(0) || _token == address(0) || _treasury == address(0)) revert PS_Zero();
        require(_startTime >= block.timestamp, "PS: start in past");
        
        DAO = _dao;
        vfideToken = IERC20(_token);
        TREASURY = _treasury;
        if (_stablecoinRegistry != address(0)) {
            stablecoinRegistry = IStablecoinRegistry(_stablecoinRegistry);
        }
        
        saleStartTime = _startTime;
        saleEndTime = _startTime + SALE_DURATION;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                              ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set stablecoin registry
     */
    function setStablecoinRegistry(address _registry) external onlyDAO {
        address old = address(stablecoinRegistry);
        stablecoinRegistry = IStablecoinRegistry(_registry);
        emit StablecoinRegistryUpdated(old, _registry);
    }
    
    /**
     * @notice Update ETH/USD price for ETH purchases
     * @param newPrice New ETH price in USD (e.g., 3500 = $3,500)
     */
    function setEthPrice(uint256 newPrice) external onlyDAO {
        require(newPrice >= 1000 && newPrice <= 100000, "PS: price out of range"); // $1k - $100k
        uint256 old = ethPriceUsd;
        ethPriceUsd = newPrice;
        ethPriceLastUpdated = block.timestamp;
        emit ETHPriceUpdated(old, newPrice);
    }
    
    /**
     * @notice Check if ETH price is stale (not updated within 24 hours)
     */
    function isEthPriceStale() public view returns (bool) {
        if (ethPriceLastUpdated == 0) return true; // Never set
        return block.timestamp > ethPriceLastUpdated + ETH_PRICE_STALENESS;
    }
    
    /**
     * @notice Enable/disable ETH purchases (stablecoin-only mode)
     */
    function setEthAccepted(bool accepted) external onlyDAO {
        ethAccepted = accepted;
    }
    
    /**
     * @notice Enable/disable a tier
     * @param tier 0=Founding, 1=Oath, 2=Public
     * @param enabled Whether tier is enabled
     */
    function setTierEnabled(uint8 tier, bool enabled) external onlyDAO {
        if (tier == 0) tier0Enabled = enabled;
        else if (tier == 1) tier1Enabled = enabled;
        else if (tier == 2) tier2Enabled = enabled;
        else revert PS_InvalidTier();
        emit TierEnabled(tier, enabled);
    }
    
    /**
     * @notice Get price for a tier in microUSD (1e6 = $1)
     * @param tier 0=Founding ($0.03), 1=Oath ($0.05), 2=Public ($0.07)
     * @return price Price in microUSD
     */
    function getTierPrice(uint8 tier) public pure returns (uint256 price) {
        if (tier == 0) return TIER_0_PRICE;
        if (tier == 1) return TIER_1_PRICE;
        if (tier == 2) return TIER_2_PRICE;
        revert PS_InvalidTier();
    }
    
    /**
     * @notice Get remaining supply for a tier
     * @param tier 0=Founding, 1=Oath, 2=Public
     * @return remaining Tokens remaining in tier
     */
    function getTierRemaining(uint8 tier) public view returns (uint256 remaining) {
        if (tier == 0) return TIER_0_CAP - tier0Sold;
        if (tier == 1) return TIER_1_CAP - tier1Sold;
        if (tier == 2) return TIER_2_CAP - tier2Sold;
        revert PS_InvalidTier();
    }
    
    /**
     * @notice Check if tier is available
     * @param tier 0=Founding, 1=Oath, 2=Public
     * @return available Whether tier is enabled and has supply
     */
    function isTierAvailable(uint8 tier) public view returns (bool available) {
        if (tier == 0) return tier0Enabled && tier0Sold < TIER_0_CAP;
        if (tier == 1) return tier1Enabled && tier1Sold < TIER_1_CAP;
        if (tier == 2) return tier2Enabled && tier2Sold < TIER_2_CAP;
        return false;
    }
    
    /**
     * @notice Calculate base tokens from USD amount for a specific tier
     * @param usdAmount Amount in USD (6 decimals, like USDC)
     * @param tier 0=Founding ($0.03), 1=Oath ($0.05), 2=Public ($0.07)
     * @return baseTokens Tokens in 18 decimals
     */
    function calculateTokensFromUsdTier(uint256 usdAmount, uint8 tier) public pure returns (uint256 baseTokens) {
        uint256 price = getTierPrice(tier);
        // usdAmount is in 6 decimals (1e6 = $1)
        // price is in microUSD (e.g., 30000 = $0.03)
        // baseTokens = (usdAmount * 1e18) / price
        baseTokens = (usdAmount * 1e18) / price;
    }
    
    /**
     * @notice Calculate base tokens from USD amount (uses tier 2 - public price)
     * @param usdAmount Amount in USD (6 decimals, like USDC)
     * @return baseTokens Tokens in 18 decimals
     * @dev Legacy function for backward compatibility, defaults to tier 2
     */
    function calculateTokensFromUsd(uint256 usdAmount) public pure returns (uint256 baseTokens) {
        baseTokens = calculateTokensFromUsdTier(usdAmount, 2); // Default to tier 2 (public)
    }
    
    /**
     * @notice Calculate base tokens from ETH amount using current ETH/USD rate
     * @param ethAmount Amount in ETH (18 decimals)
     * @return baseTokens Tokens in 18 decimals
     * @dev Uses tier 2 (public) price
     */
    function calculateTokensFromEth(uint256 ethAmount) public view returns (uint256 baseTokens) {
        // Convert ETH to USD (6 decimals)
        // ethAmount is 18 decimals, ethPriceUsd is USD (e.g., 3500)
        // usdAmount = ethAmount * ethPriceUsd / 1e12 (to get 6 decimals)
        uint256 usdAmount = (ethAmount * ethPriceUsd) / 1e12;
        baseTokens = calculateTokensFromUsd(usdAmount);
    }
    
    /**
     * @notice Calculate base tokens from ETH for a specific tier
     * @param ethAmount Amount in ETH (18 decimals)
     * @param tier 0=Founding, 1=Oath, 2=Public
     * @return baseTokens Tokens in 18 decimals
     */
    function calculateTokensFromEthTier(uint256 ethAmount, uint8 tier) public view returns (uint256 baseTokens) {
        uint256 usdAmount = (ethAmount * ethPriceUsd) / 1e12;
        baseTokens = calculateTokensFromUsdTier(usdAmount, tier);
    }
    
    /**
     * @notice Get required lock period for a tier
     * @param tier 0=Founding (180 days), 1=Oath (90 days), 2=Public (none)
     * @return requiredLock The minimum lock period required for this tier
     */
    function getTierRequiredLock(uint8 tier) public pure returns (uint256 requiredLock) {
        if (tier == 0) return LOCK_180_DAYS;  // Founding requires 180-day lock
        if (tier == 1) return LOCK_90_DAYS;   // Oath requires 90-day lock
        if (tier == 2) return LOCK_NONE;      // Public has no lock requirement
        revert PS_InvalidTier();
    }
    
    /**
     * @notice Validate that lock period meets tier requirements
     * @param tier The purchase tier
     * @param lockPeriod The requested lock period
     * @dev Tier 0 requires 180 days, Tier 1 requires 90 days, Tier 2 is optional
     */
    function _validateTierLock(uint8 tier, uint256 lockPeriod) internal pure {
        uint256 requiredLock = getTierRequiredLock(tier);
        if (lockPeriod < requiredLock) revert PS_TierLockRequired();
    }
    
    /**
     * @notice Verify VFIDE tokens are available in presale contract
     * @dev VFIDEToken pre-mints 35M to this contract at genesis.
     *      This function verifies the pre-mint and marks deposit complete.
     */
    function depositTokens() external onlyDAO {
        require(!tokensDeposited, "Already deposited");
        require(block.timestamp < saleStartTime, "Sale already started");
        
        // Verify VFIDEToken pre-minted tokens to this contract
        uint256 balance = vfideToken.balanceOf(address(this));
        require(balance >= TOTAL_SUPPLY, "Insufficient pre-minted balance");
        
        tokensDeposited = true;
    }
    
    /**
     * @notice Withdraw unsold tokens after finalization (goes to treasury/burn)
     * @dev Can only be called after finalization, sends unsold presale allocation
     */
    function withdrawUnsold(address recipient) external onlyDAO {
        require(finalized, "Not finalized");
        require(recipient != address(0), "Invalid recipient");
        
        uint256 unsold = TOTAL_SUPPLY - totalSold;
        if (unsold > 0) {
            vfideToken.safeTransfer(recipient, unsold);
        }
    }

    // ──────────────────────────── Purchase Functions ────────────────────────────
    
    /**
     * @notice Purchase VFIDE tokens with stablecoin (USDC, USDT, DAI, etc.)
     * @param stablecoin Address of the stablecoin to use
     * @param amount Amount of stablecoin to spend (in stablecoin decimals)
     * @param tier Price tier: 0=Founding ($0.03), 1=Oath ($0.05), 2=Public ($0.07)
     * @param lockPeriod Lock duration: 0 (no lock), 90 days, or 180 days
     * @dev PREFERRED METHOD - exact USD pricing, no volatility
     *      Requires prior approval of stablecoin to this contract
     */
    function buyWithStable(address stablecoin, uint256 amount, uint8 tier, uint256 lockPeriod) external nonReentrant whenNotPaused {
        require(tokensDeposited, "PS: tokens not yet deposited");
        require(address(stablecoinRegistry) != address(0), "PS: no registry");
        if (!stablecoinRegistry.isWhitelisted(stablecoin)) revert PS_InvalidStablecoin();
        if (!isTierAvailable(tier)) revert PS_TierDisabled();
        
        uint8 decimals = stablecoinRegistry.tokenDecimals(stablecoin);
        
        // Normalize to 6 decimals (USDC/USDT standard)
        uint256 usdAmount;
        if (decimals == 6) {
            usdAmount = amount;
        } else if (decimals == 18) {
            usdAmount = amount / 1e12;  // DAI: 18 → 6 decimals
        } else {
            usdAmount = (amount * 1e6) / (10 ** decimals);
        }
        
        require(usdAmount >= MIN_PURCHASE_USD, "Below minimum ($10)");
        
        // Transfer stablecoin from buyer to treasury (SafeERC20 for non-standard tokens)
        IERC20(stablecoin).safeTransferFrom(msg.sender, TREASURY, amount);
        
        // Track contribution for potential refunds
        stableContributed[msg.sender][stablecoin] += amount;
        usdContributed[msg.sender] += usdAmount;
        totalUsdRaised += usdAmount;
        
        // Process purchase with tier pricing
        uint256 baseTokens = calculateTokensFromUsdTier(usdAmount, tier);
        
        // Check tier capacity
        _checkAndUpdateTierSold(tier, baseTokens);
        _processPurchase(msg.sender, baseTokens, tier, lockPeriod, 0, usdAmount);
        
        emit StablePurchase(msg.sender, stablecoin, lockPeriod, amount, baseTokens, 0, purchases[msg.sender].length - 1);
        emit TieredPurchase(msg.sender, tier, baseTokens, usdAmount);
    }
    
    /**
     * @notice Purchase VFIDE tokens with ETH (legacy support, uses tier 2 public price)
     * @param lockPeriod Lock duration: 0 (no lock), 90 days, or 180 days
     * @dev Stablecoins preferred for exact USD pricing
     *      ETH uses tier 2 (public) at $0.07 + configurable ethPriceUsd rate
     */
    function buyTokens(uint256 lockPeriod) external payable nonReentrant whenNotPaused {
        if (!ethAccepted) revert PS_ETHNotAccepted();
        if (!isTierAvailable(2)) revert PS_TierDisabled(); // ETH uses tier 2 (public)
        require(msg.value >= MIN_PURCHASE_ETH, "Below minimum");
        require(!isEthPriceStale(), "PS: ETH price stale - use stablecoin or wait for DAO update");
        
        // Circuit breakers
        if (tx.gasprice > maxGasPrice) revert PS_GasPriceTooHigh();
        
        // Calculate USD equivalent (6 decimals)
        uint256 usdAmount = (msg.value * ethPriceUsd) / 1e12;
        totalEthRaised += msg.value;
        totalUsdRaised += usdAmount;
        usdContributed[msg.sender] += usdAmount;
        ethContributed[msg.sender] += msg.value;  // Track for refunds
        
        // Forward ETH to treasury
        (bool success, ) = TREASURY.call{value: msg.value}("");
        require(success, "ETH transfer failed");
        
        // Calculate tokens using tier 2 (public) price and update tier
        uint256 baseTokens = calculateTokensFromEthTier(msg.value, 2);
        _checkAndUpdateTierSold(2, baseTokens);
        _processPurchase(msg.sender, baseTokens, 2, lockPeriod, 0, usdAmount);
        
        emit Purchase(msg.sender, lockPeriod, msg.value, baseTokens, 0, purchases[msg.sender].length - 1);
        emit TieredPurchase(msg.sender, 2, baseTokens, usdAmount);
    }
    
    /**
     * @notice Internal function to check tier capacity and update sold amount
     * @param tier The tier being purchased (0, 1, or 2)
     * @param baseTokens Amount of base tokens being purchased
     */
    function _checkAndUpdateTierSold(uint8 tier, uint256 baseTokens) internal {
        if (tier == 0) {
            if (tier0Sold + baseTokens > TIER_0_CAP) revert PS_TierSoldOut();
            tier0Sold += baseTokens;
        } else if (tier == 1) {
            if (tier1Sold + baseTokens > TIER_1_CAP) revert PS_TierSoldOut();
            tier1Sold += baseTokens;
        } else if (tier == 2) {
            if (tier2Sold + baseTokens > TIER_2_CAP) revert PS_TierSoldOut();
            tier2Sold += baseTokens;
        } else {
            revert PS_InvalidTier();
        }
    }
    
    /**
     * @notice Internal function to process a purchase
     * @param buyer Address of the buyer
     * @param baseTokens Base tokens purchased
     * @param tier Price tier (0=Founding, 1=Oath, 2=Public)
     * @param lockPeriod Lock period chosen
     */
    function _processPurchase(
        address buyer, 
        uint256 baseTokens, 
        uint8 tier,
        uint256 lockPeriod,
        uint256,
        uint256 /*usdAmount*/
    ) internal {
        require(tokensDeposited, "Tokens not deposited");
        require(block.timestamp >= saleStartTime, "Not started");
        require(block.timestamp <= saleEndTime, "Ended");
        require(totalBaseSold < BASE_SUPPLY, "Sold out");
        if (purchases[buyer].length >= MAX_PURCHASES_PER_WALLET) revert PS_TooManyPurchases();
        
        // Validate tier lock requirements
        _validateTierLock(tier, lockPeriod);
        
        // Determine immediate unlock percentage (no bonuses — VFIDE is a utility token)
        uint256 immediatePercentage;
        
        if (tier == 0) {
            // Founding: 180-day lock required, 10% immediate
            immediatePercentage = IMMEDIATE_180_DAYS;
        } else if (tier == 1) {
            // Oath: 90-day lock required, 20% immediate
            immediatePercentage = IMMEDIATE_90_DAYS;
        } else {
            // Tier 2 (Public): optional lock, immediate percentage by lock period
            if (lockPeriod == LOCK_180_DAYS) {
                immediatePercentage = IMMEDIATE_180_DAYS;
            } else if (lockPeriod == LOCK_90_DAYS) {
                immediatePercentage = IMMEDIATE_90_DAYS;
            } else if (lockPeriod == LOCK_NONE) {
                immediatePercentage = IMMEDIATE_NO_LOCK;
            } else {
                revert PS_InvalidLockPeriod();
            }
        }

        // No bonus tokens — rewards are not offered
        uint256 totalTokens = baseTokens;
        
        // Per-transaction limit
        require(totalTokens <= 50_000 * 1e18, "Exceeds per-tx limit");
        
        // Calculate immediate vs locked amounts
        uint256 immediateAmount = (totalTokens * immediatePercentage) / 100;
        uint256 lockedAmount = totalTokens - immediateAmount;
        
        // Check limits
        require(totalAllocated[buyer] + totalTokens <= MAX_PER_WALLET, "Exceeds wallet cap");
        require(totalBaseSold + baseTokens <= BASE_SUPPLY, "Base supply exceeded");
        
        // Update state
        totalBaseSold += baseTokens;
        totalSold += totalTokens;
        totalAllocated[buyer] += totalTokens;
        lastPurchaseTime[buyer] = block.timestamp;
        
        // Calculate unlock time
        uint256 unlockTime = lockPeriod == LOCK_NONE 
            ? block.timestamp 
            : block.timestamp + lockPeriod;
        
        // Record purchase with tier for cancelPurchase tracking
        purchases[buyer].push(PurchaseRecord({
            baseAmount: baseTokens,
            bonusAmount: 0,
            immediateAmount: immediateAmount,
            lockedAmount: lockedAmount,
            lockPeriod: lockPeriod,
            unlockTime: unlockTime,
            tier: tier,
            immediateClaimed: false,
            lockedClaimed: false
        }));
    }
    // ──────────────────────────── Claim Functions ────────────────────────────

    /**
     * @notice Claim immediately unlocked tokens from purchases
     * @param indices Array of purchase indices to claim from
     * @dev Each purchase has an immediate unlock portion based on lock period
     */
    function claimImmediate(uint256[] calldata indices) external nonReentrant {
        require(indices.length > 0, "Empty indices");
        require(indices.length <= 50, "Too many indices"); // Gas limit protection
        uint256 totalClaimable = 0;
        
        for (uint256 i = 0; i < indices.length; i++) {
            uint256 idx = indices[i];
            require(idx < purchases[msg.sender].length, "Invalid index");
            
            // Prevent duplicate indices in same call
            for (uint256 j = i + 1; j < indices.length; j++) {
                require(indices[i] != indices[j], "Duplicate index");
            }
            
            PurchaseRecord storage p = purchases[msg.sender][idx];
            
            if (!p.immediateClaimed && p.immediateAmount > 0) {
                p.immediateClaimed = true;
                totalClaimable += p.immediateAmount;
            }
        }
        
        if (totalClaimable == 0) revert PS_NoTokens();
        
        totalClaimed += totalClaimable; // C-11 Fix: Update totalClaimed for proper accounting
        vfideToken.safeTransfer(msg.sender, totalClaimable);
        emit ClaimImmediate(msg.sender, totalClaimable);
    }

    /**
     * @notice Claim locked tokens that have passed their unlock time
     * @param indices Array of purchase indices to claim from
     * @dev Reverts if lock period hasn't expired yet
     */
    function claimLocked(uint256[] calldata indices) external nonReentrant {
        require(indices.length > 0, "Empty indices");
        require(indices.length <= 50, "Too many indices"); // Gas limit protection
        uint256 totalClaimable = 0;
        
        for (uint256 i = 0; i < indices.length; i++) {
            uint256 idx = indices[i];
            require(idx < purchases[msg.sender].length, "Invalid index");
            
            // Prevent duplicate indices in same call
            for (uint256 j = i + 1; j < indices.length; j++) {
                require(indices[i] != indices[j], "Duplicate index");
            }
            
            PurchaseRecord storage p = purchases[msg.sender][idx];
            
            if (!p.lockedClaimed && p.lockedAmount > 0) {
                if (block.timestamp < p.unlockTime) revert PS_LockNotExpired();
                
                p.lockedClaimed = true;
                totalClaimable += p.lockedAmount;
            }
        }
        
        if (totalClaimable == 0) revert PS_NoTokens();
        
        totalClaimed += totalClaimable;
        vfideToken.safeTransfer(msg.sender, totalClaimable);
        emit ClaimLocked(msg.sender, totalClaimable);
    }
    
    /**
     * @notice Claim ALL unlocked tokens in one transaction (gas efficient batch claim)
     * @dev Claims both immediate and locked (if unlocked) for all purchases
     */
    function claimAll() external nonReentrant {
        uint256 totalClaimable = 0;
        uint256 purchaseCount = purchases[msg.sender].length;
        
        require(purchaseCount > 0, "No purchases");
        
        for (uint256 i = 0; i < purchaseCount; i++) {
            PurchaseRecord storage p = purchases[msg.sender][i];
            
            // Claim immediate if not claimed
            if (!p.immediateClaimed && p.immediateAmount > 0) {
                p.immediateClaimed = true;
                totalClaimable += p.immediateAmount;
            }
            
            // Claim locked if unlocked and not claimed
            if (!p.lockedClaimed && p.lockedAmount > 0 && block.timestamp >= p.unlockTime) {
                p.lockedClaimed = true;
                totalClaimable += p.lockedAmount;
            }
        }
        
        if (totalClaimable == 0) revert PS_NoTokens();
        
        totalClaimed += totalClaimable;
        vfideToken.safeTransfer(msg.sender, totalClaimable);
        emit ClaimImmediate(msg.sender, totalClaimable);
    }
    
    /**
     * @notice Cancel a purchase before claiming (only if not yet claimed)
     * @param index Index of the purchase to cancel
     * @dev Returns tokens to presale pool, does NOT return payment (that goes to treasury)
     *      Users get credit that can be used for a new purchase or tracked for refund
     */
    function cancelPurchase(uint256 index) external nonReentrant {
        require(index < purchases[msg.sender].length, "Invalid index");
        
        PurchaseRecord storage p = purchases[msg.sender][index];
        
        // Can only cancel if nothing has been claimed yet
        require(!p.immediateClaimed && !p.lockedClaimed, "Already claimed");
        require(p.baseAmount > 0, "Already cancelled");
        
        // Return tokens to pool (bonusAmount is always 0)
        uint256 totalTokens = p.baseAmount;
        
        // Update state
        totalBaseSold -= p.baseAmount;
        totalSold -= totalTokens;
        totalAllocated[msg.sender] -= totalTokens;
        
        // Update tier-specific sold counters (fix: these were not being updated)
        if (p.tier == 0) {
            tier0Sold -= p.baseAmount;
        } else if (p.tier == 1) {
            tier1Sold -= p.baseAmount;
        } else if (p.tier == 2) {
            tier2Sold -= p.baseAmount;
        }
        
        // Clear the purchase record (tier preserved for audit trail)
        p.baseAmount = 0;
        p.bonusAmount = 0;
        p.immediateAmount = 0;
        p.lockedAmount = 0;
        p.immediateClaimed = true; // Mark as claimed to prevent double-cancel
        p.lockedClaimed = true;
        
        // Note: Payment is NOT refunded here - it was sent to treasury
        // User must wait for refund mechanism if applicable
        
        emit PurchaseCancelled(msg.sender, index, totalTokens);
    }

    // ──────────────────────────── View Functions ────────────────────────────

    function getPurchaseDetails(address user, uint256 index) external view returns (
        uint256 baseAmount,
        uint256 bonusAmount,
        uint256 immediateAmount,
        uint256 lockedAmount,
        uint256 lockPeriod,
        uint256 unlockTime,
        bool immediateClaimed,
        bool lockedClaimed
    ) {
        require(index < purchases[user].length, "Invalid index");
        PurchaseRecord memory p = purchases[user][index];
        return (
            p.baseAmount,
            p.bonusAmount,
            p.immediateAmount,
            p.lockedAmount,
            p.lockPeriod,
            p.unlockTime,
            p.immediateClaimed,
            p.lockedClaimed
        );
    }

    function getUserInfo(address user) external view returns (
        uint256 purchaseCount,
        uint256 totalAmount,
        uint256 totalBase,
        uint256 totalBonus,
        uint256 claimableImmediate,
        uint256 claimableLocked,
        uint256 stillLocked
    ) {
        purchaseCount = purchases[user].length;
        
        for (uint256 i = 0; i < purchaseCount; i++) {
            PurchaseRecord memory p = purchases[user][i];
            
            totalAmount += p.baseAmount + p.bonusAmount;
            totalBase += p.baseAmount;
            totalBonus += p.bonusAmount;
            
            if (!p.immediateClaimed) {
                claimableImmediate += p.immediateAmount;
            }
            
            if (!p.lockedClaimed) {
                if (block.timestamp >= p.unlockTime) {
                    claimableLocked += p.lockedAmount;
                } else {
                    stillLocked += p.lockedAmount;
                }
            }
        }
    }
    
    /**
     * @notice Get all purchases for a user with full details
     * @param user Address to query
     * @return records Array of all purchase records
     */
    function getAllPurchases(address user) external view returns (PurchaseRecord[] memory records) {
        return purchases[user];
    }
    
    /**
     * @notice Get user's stablecoin contributions
     * @param user Address to query
     * @param stablecoins Array of stablecoin addresses to check
     * @return amounts Array of contribution amounts for each stablecoin
     */
    function getUserStableContributions(
        address user, 
        address[] calldata stablecoins
    ) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](stablecoins.length);
        for (uint256 i = 0; i < stablecoins.length; i++) {
            amounts[i] = stableContributed[user][stablecoins[i]];
        }
    }
    
    /**
     * @notice Get comprehensive user dashboard data
     * @param user Address to query
     */
    function getUserDashboard(address user) external view returns (
        uint256 purchaseCount,
        uint256 totalAllocatedTokens,
        uint256 ethContributedAmt,
        uint256 usdContributedAmt
    ) {
        purchaseCount = purchases[user].length;
        totalAllocatedTokens = totalAllocated[user];
        ethContributedAmt = ethContributed[user];
        usdContributedAmt = usdContributed[user];
    }

    /**
     * @notice Calculate tokens for a USD amount (stablecoin purchase preview)
     * @param usdAmount Amount in USD (6 decimals, e.g., 100e6 = $100)
     * @param tier Price tier: 0=Founding ($0.03), 1=Oath ($0.05), 2=Public ($0.07)
     */
    function calculateTokensFromUsdPreview(uint256 usdAmount, uint8 tier) external pure returns (
        uint256 base180, uint256 bonus180, uint256 total180,
        uint256 base90, uint256 bonus90, uint256 total90,
        uint256 baseNoLock, uint256 bonusNoLock, uint256 totalNoLock
    ) {
        uint256 baseTokens = calculateTokensFromUsdTier(usdAmount, tier);
        
        // No bonuses — rewards are not offered
        base180 = baseTokens; bonus180 = 0; total180 = baseTokens;
        base90 = baseTokens; bonus90 = 0; total90 = baseTokens;
        baseNoLock = baseTokens; bonusNoLock = 0; totalNoLock = baseTokens;
    }

    /**
     * @notice Calculate tokens for an ETH amount (uses current ETH/USD rate)
     * @param ethAmount Amount in ETH (18 decimals)
     */
    function calculateTokens(uint256 ethAmount) external view returns (
        uint256 base180,
        uint256 bonus180,
        uint256 total180,
        uint256 base90,
        uint256 bonus90,
        uint256 total90,
        uint256 baseNoLock,
        uint256 bonusNoLock,
        uint256 totalNoLock
    ) {
        uint256 baseTokens = calculateTokensFromEth(ethAmount);
        
        // No bonuses — rewards are not offered
        base180 = baseTokens; bonus180 = 0; total180 = baseTokens;
        base90 = baseTokens; bonus90 = 0; total90 = baseTokens;
        baseNoLock = baseTokens; bonusNoLock = 0; totalNoLock = baseTokens;
    }

    function getPresaleStats() external view returns (
        uint256 sold,
        uint256 remaining,
        uint256 raisedUsd
    ) {
        sold = totalSold;
        remaining = TOTAL_SUPPLY > totalSold ? TOTAL_SUPPLY - totalSold : 0;
        // Return total USD raised (6 decimals)
        raisedUsd = totalUsdRaised;
    }

    // ──────────────────────────── Finalization & Listing ────────────────────────────

    /**
     * @notice Calculate listing price based on presale results
     * @dev Listing price scales with presale success (in USD terms):
     *      - < 50% sold ($1.225M) → $0.10 listing (minimum)
     *      - >= 50% sold → Price scales from $0.10 to $0.14
     * @return priceUsd Price in microUSD (1e6 = $1)
     * @return lpVfide Suggested LP allocation in tokens
     */
    function calculateListingPrice() public view returns (uint256 priceUsd, uint256 lpVfide) {
        // Total USD raised (6 decimals)
        uint256 fundsRaisedUsd = totalUsdRaised;
        
        // Thresholds in USD (6 decimals)
        uint256 halfRaise = 1_225_000 * 1e6;    // $1.225M
        uint256 fullRaise = 2_450_000 * 1e6;    // $2.45M
        
        // Prices in microUSD
        uint256 minListingPrice = 100_000;       // $0.10
        uint256 maxListingPrice = 140_000;       // $0.14
        
        if (fundsRaisedUsd <= halfRaise) {
            priceUsd = minListingPrice;
        } else if (fundsRaisedUsd >= fullRaise) {
            priceUsd = maxListingPrice;
        } else {
            // Linear scale from $0.10 to $0.14
            uint256 excess = fundsRaisedUsd - halfRaise;
            uint256 range = fullRaise - halfRaise;
            priceUsd = minListingPrice + ((maxListingPrice - minListingPrice) * excess) / range;
        }
        
        // Calculate LP allocation: use raised USD / listing price
        // lpVfide = (fundsRaisedUsd * 1e18) / priceUsd
        lpVfide = (fundsRaisedUsd * 1e18) / priceUsd;
        
        // Cap at 40M VFIDE for LP
        if (lpVfide > 40_000_000 * 1e18) {
            lpVfide = 40_000_000 * 1e18;
        }
    }

    /**
     * @notice Finalize presale and calculate listing price
     * @dev LP tokens come from Treasury, not presale contract
     *      Unsold tokens are returned to treasury
     */
    function finalizePresale() external onlyDAO {
        if (finalized) revert PS_AlreadyFinalized();
        require(block.timestamp > saleEndTime || totalBaseSold >= BASE_SUPPLY, "Sale ongoing");
        
        // Check minimum goal ($612.5K in USD, or 8.75M base tokens as fallback)
        if (totalUsdRaised < MINIMUM_GOAL_USD && totalBaseSold < MINIMUM_GOAL) {
            revert PS_MinimumGoalNotMet();
        }
        
        // Calculate listing price (for reference/events)
        (uint256 price, uint256 lpVfide) = calculateListingPrice();
        
        listingPrice = price;
        lpVfideAmount = lpVfide;
        finalized = true;
        
        // Return any unsold tokens to treasury
        uint256 unsold = vfideToken.balanceOf(address(this)) - _pendingClaims();
        if (unsold > 0) {
            vfideToken.safeTransfer(TREASURY, unsold);
        }
        
        // Emit with USD raised (more meaningful than ETH)
        emit PresaleFinalized(totalUsdRaised, lpVfide, price);
    }
    
    /// @notice Calculate total tokens still owed to buyers (not yet claimed)
    function _pendingClaims() internal view returns (uint256 pending) {
        // Accurate pending = totalSold - totalClaimed (fixed from approximation)
        pending = totalSold > totalClaimed ? totalSold - totalClaimed : 0;
    }
    
    function getFinalizationDetails() external view returns (
        bool isFinalized,
        uint256 totalRaisedUsd,
        uint256 lpTokens,
        uint256 priceUsd
    ) {
        isFinalized = finalized;
        // Return total USD raised (6 decimals)
        totalRaisedUsd = totalUsdRaised;
        (priceUsd, lpTokens) = calculateListingPrice();
    }
    
    /**
     * @notice Get detailed raise stats
     */
    function getRaiseStats() external view returns (
        uint256 usdRaised,
        uint256 ethRaised,
        uint256 tokensSold,
        uint256 tokensRemaining,
        bool goalMet
    ) {
        usdRaised = totalUsdRaised;
        ethRaised = totalEthRaised;
        tokensSold = totalSold;
        tokensRemaining = TOTAL_SUPPLY > totalSold ? TOTAL_SUPPLY - totalSold : 0;
        goalMet = totalUsdRaised >= MINIMUM_GOAL_USD || totalBaseSold >= MINIMUM_GOAL;
    }

    // ──────────────────────────── Refund Mechanism ────────────────────────────

    /**
     * @notice Enable refunds if minimum goal not met
     * @dev Can only be called by DAO after sale ends and minimum goal not reached
     */
    function enableRefunds() external onlyDAO {
        require(block.timestamp > saleEndTime, "Sale not ended");
        require(!finalized, "Already finalized");
        
        // Can only enable refunds if minimum goal NOT met
        if (totalBaseSold >= MINIMUM_GOAL) revert PS_GoalAlreadyMet();
        
        refundsEnabled = true;
        refundDeadline = uint64(block.timestamp + 90 days); // 90-day refund window
        emit RefundsEnabled(block.timestamp);
    }

    /**
     * @notice Check if user can claim refund
     * @param user Address to check
     * @return canClaim Whether user has refund available
     * @return amount Refund amount in ETH
     */
    function canClaimRefund(address user) external view returns (bool canClaim, uint256 amount) {
        amount = ethContributed[user];
        canClaim = refundsEnabled && amount > 0;
    }
    
    /**
     * @notice Check if refunds should be enabled (automatic check)
     * @return shouldEnable True if sale ended and goal not met
     */
    function shouldEnableRefunds() external view returns (bool shouldEnable) {
        shouldEnable = block.timestamp > saleEndTime 
            && !finalized 
            && !refundsEnabled 
            && totalBaseSold < MINIMUM_GOAL;
    }

    /**
     * @notice Claim refund if presale failed to meet minimum goal
     * @dev Users can claim back their ETH contribution
     */
    function claimRefund() external nonReentrant {
        if (!refundsEnabled) revert PS_RefundsNotEnabled();
        
        uint256 refundAmount = ethContributed[msg.sender];
        if (refundAmount == 0) revert PS_NoRefundAvailable();
        
        // Reset contribution before transfer (reentrancy protection)
        ethContributed[msg.sender] = 0;
        
        // Treasury must have called fundRefunds() to send ETH back to contract
        // Contract needs ETH balance to process refund
        require(address(this).balance >= refundAmount, "Insufficient balance - treasury must fund refunds first");
        
        // C-3 Fix: Use .call() instead of .transfer() for smart contract wallet compatibility
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");
        emit RefundClaimed(msg.sender, refundAmount);
    }
    
    /**
     * @notice Claim stablecoin refund if presale failed to meet minimum goal
     * @param stablecoin Address of the stablecoin to refund
     * @dev Users can claim back their stablecoin contribution
     */
    function claimStableRefund(address stablecoin) external nonReentrant {
        if (!refundsEnabled) revert PS_RefundsNotEnabled();
        
        uint256 refundAmount = stableContributed[msg.sender][stablecoin];
        if (refundAmount == 0) revert PS_NoRefundAvailable();
        
        // Reset contribution before transfer (reentrancy protection)
        stableContributed[msg.sender][stablecoin] = 0;
        
        // Treasury must have sent stablecoins back to contract for refunds
        require(IERC20(stablecoin).balanceOf(address(this)) >= refundAmount, 
            "Insufficient balance - treasury must fund refunds first");
        
        IERC20(stablecoin).safeTransfer(msg.sender, refundAmount);
        
        emit RefundClaimed(msg.sender, refundAmount);
    }
    
    /**
     * @notice Check if user can claim stablecoin refund
     * @param user Address to check
     * @param stablecoin Stablecoin address
     * @return canClaim Whether user has refund available
     * @return amount Refund amount
     */
    function canClaimStableRefund(address user, address stablecoin) external view returns (bool canClaim, uint256 amount) {
        amount = stableContributed[user][stablecoin];
        canClaim = refundsEnabled && amount > 0;
    }

    // ──────────────────────────── Admin Functions ────────────────────────────

    function setPaused(bool _paused) external onlyDAO {
        paused = _paused;
        emit EmergencyPause(_paused);
    }
    
    /**
     * @notice Extend sale duration (one-time only)
     * @param additionalDays Number of days to extend (max 30)
     */
    function extendSale(uint256 additionalDays) external onlyDAO {
        if (saleExtended) revert PS_AlreadyExtended();
        if (block.timestamp >= saleEndTime) revert PS_CannotExtend();
        require(additionalDays > 0 && additionalDays <= 30, "Invalid extension");
        
        saleExtended = true;
        saleEndTime += additionalDays * 1 days;
        
        emit SaleExtended(saleEndTime, additionalDays);
    }
    
    /**
     * @notice Update max gas price for circuit breaker
     * @param newMaxGasPrice New maximum gas price in wei
     */
    function setMaxGasPrice(uint256 newMaxGasPrice) external onlyDAO {
        require(newMaxGasPrice >= 100 gwei && newMaxGasPrice <= 2000 gwei, "Invalid gas price");
        uint256 oldPrice = maxGasPrice;
        maxGasPrice = newMaxGasPrice;
        emit MaxGasPriceUpdated(oldPrice, newMaxGasPrice);
    }

    /**
     * @notice Emergency withdraw of contract balance (ONLY before sale or after finalization)
     * @dev Cannot be used during sale, during refund period, or if refunds enabled
     * H-25 Fix: Use call instead of deprecated transfer() for better gas handling
     */
    function emergencyWithdraw() external onlyDAO {
        require(block.timestamp < saleStartTime || (finalized && !refundsEnabled), "Cannot withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool success, ) = payable(DAO).call{value: balance}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @notice DAO can fund refunds by sending ETH back to contract
     * @dev Allows treasury to return ETH for refund claims
     */
    function fundRefunds() external payable onlyDAO {
        require(refundsEnabled, "Refunds not enabled");
        // DAO sends ETH to contract for refund claims
    }
    
    /**
     * @notice DAO can fund stablecoin refunds by sending tokens back
     * @dev Allows treasury to return stablecoins for refund claims
     * @param stablecoin The stablecoin address to fund
     * @param amount The amount to send (from treasury)
     * H-24 Fix: Use SafeERC20 for non-standard tokens like USDT
     */
    function fundStableRefunds(address stablecoin, uint256 amount) external onlyDAO {
        require(refundsEnabled, "Refunds not enabled");
        require(address(stablecoinRegistry) != address(0) && stablecoinRegistry.isWhitelisted(stablecoin), "Invalid stablecoin");
        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), amount);
    }
    
    // Refund deadline - users have 90 days after refunds enabled to claim
    uint64 public refundDeadline;
    
    /**
     * @notice Get refund status for a user
     * @param user Address to check
     * @return ethRefund ETH amount available
     * @return deadline When refund period expires
     * @return expired Whether refund period has ended
     */
    function getRefundStatus(address user) external view returns (
        uint256 ethRefund,
        uint64 deadline,
        bool expired
    ) {
        ethRefund = ethContributed[user];
        deadline = refundDeadline;
        expired = refundDeadline > 0 && block.timestamp > refundDeadline;
    }
    
    /**
     * @notice Recover unclaimed refund funds after deadline (treasury use)
     * @dev Only after 90-day refund window closes
     */
    function recoverUnclaimedRefunds() external onlyDAO {
        require(refundsEnabled, "Refunds not enabled");
        require(refundDeadline > 0 && block.timestamp > refundDeadline, "Refund period not expired");
        
        // Send remaining ETH to DAO
        if (address(this).balance > 0) {
            (bool success, ) = DAO.call{value: address(this).balance}("");
            require(success, "ETH transfer failed");
        }
    }
}
