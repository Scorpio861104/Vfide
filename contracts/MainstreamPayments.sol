// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IVaultHub, IProofLedger, ISeer, ISwapRouter, ReentrancyGuard} from "./SharedInterfaces.sol";

/**
 * MainstreamPayments.sol - Infrastructure for Mainstream Crypto Payment Adoption
 * ===============================================================================
 *
 * LEGAL ARCHITECTURE: These contracts are designed to operate WITHOUT on-chain identity checks:
 *
 * - NO CUSTODY: VFIDE never holds user funds during fiat conversion
 * - NO EXCHANGE: VFIDE never swaps tokens - users interact directly with DEXs
 * - REGISTRY ONLY: Fiat ramps are EXTERNAL licensed providers (MoonPay, Transak)
 * - ROUTING ONLY: Multi-currency routes users directly to DEX, no intermediary custody
 *
 * All fiat/exchange operations happen via third-party licensed providers.
 * VFIDE only provides registry, routing, and record-keeping.
 *
 * This module provides:
 * 1. Fiat Ramp Registry - Directory of licensed fiat providers (no custody)
 * 2. Price Oracle - Display prices in USD with VFIDE equivalent
 * 3. Session Keys - Mobile wallet one-tap payments
 * 4. NFC/Terminal Support - Contactless hardware integration
 * 5. Multi-Currency Router - Route to DEX for swaps (no custody)
 */

// ═══════════════════════════════════════════════════════════════════════════
//                          1. FIAT RAMP REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @title FiatRampRegistry
 * @notice Registry of licensed fiat on/off ramp providers - NO CUSTODY
 * @dev VFIDE never touches fiat or holds tokens during ramp. Users interact
 *      directly with licensed providers (MoonPay, Transak, Ramp Network).
 *      This is purely a discovery and record-keeping layer.
 * @author Vfide
 */
contract FiatRampRegistry is ReentrancyGuard {
    /// @notice RampProviderRegistered
    /// @param provider provider
    /// @param name name
    /// @param licenseInfo licenseInfo
    event RampProviderRegistered(address indexed provider, string name, string licenseInfo);
    /// @notice RampProviderRemoved
    /// @param provider provider
    event RampProviderRemoved(address indexed provider);
    /// @notice RampTransactionRecorded
    /// @param user user
    /// @param provider provider
    /// @param txHash txHash
    /// @param isOnRamp isOnRamp
    event RampTransactionRecorded(address indexed user, address indexed provider, bytes32 txHash, bool isOnRamp);
    
    /// @notice dao
    address public dao;
    /// @notice seer
    ISeer public seer;
    /// @notice ledger
    IProofLedger public ledger;

    struct RampProvider {
        bool registered;
        string name;
        string licenseInfo; // "MSB #12345, State MTLs: CA, NY, TX"
        string widgetUrl; // Frontend integration URL
        uint256 txCount;
        uint64 registeredAt;
    }

    // Record of ramp transactions (for trust scoring, no custody)
    struct RampRecord {
        address user;
        address provider;
        bytes32 externalTxHash; // Provider's transaction ID
        bool isOnRamp; // true = fiat→crypto, false = crypto→fiat
        uint64 timestamp;
    }
    
    /// @notice providers
    mapping(address => RampProvider) public providers;
    /// @notice providerList
    address[] public providerList;
    /// @notice rampRecords
    mapping(bytes32 => RampRecord) public rampRecords;
    /// @notice userRampHistory
    mapping(address => bytes32[]) public userRampHistory;

    // Trust score bonuses for verified ramp users
    /// @notice FIRST_RAMP_BONUS
    uint16 public constant FIRST_RAMP_BONUS = 50;
    /// @notice RAMP_TX_BONUS
    uint16 public constant RAMP_TX_BONUS = 5;
    /// @notice MAX_RAMP_REWARDS_PER_PROVIDER_USER
    uint256 public constant MAX_RAMP_REWARDS_PER_PROVIDER_USER = 5;
    /// @notice MAX_RAMP_REWARDS_PER_USER
    uint256 public constant MAX_RAMP_REWARDS_PER_USER = 5;
    /// @notice rampRewardCount
    mapping(address => mapping(address => uint256)) public rampRewardCount;
    /// @notice userRampRewardCount
    mapping(address => uint256) public userRampRewardCount;
    /// @notice lastRampTime
    mapping(address => mapping(address => uint64)) public lastRampTime;
    /// @notice RAMP_COOLDOWN
    uint64 public constant RAMP_COOLDOWN = 1 hours;
    
    /// @notice onlyDAO
    modifier onlyDAO() {
        require(msg.sender == dao, "FRR: not DAO");
        _;
    }
    
    /// @notice onlyProvider
    modifier onlyProvider() {
        require(providers[msg.sender].registered, "FRR: not provider");
        _;
    }
    
    /// @notice constructor
    /// @param _dao _dao
    /// @param _seer _seer
    /// @param _ledger _ledger
    constructor(address _dao, address _seer, address _ledger) {
        require(_dao != address(0), "FRR: zero DAO");
        dao = _dao;
        seer = ISeer(_seer);
        ledger = IProofLedger(_ledger);
    }

    /**
     * @notice Register a licensed fiat ramp provider
     * @param provider Provider's signing address
     * @param name Display name (e.g., "MoonPay", "Transak")
     * @param licenseInfo Provider's license information for transparency
     * @param widgetUrl URL for frontend widget integration
     */
    function registerProvider(address provider, string calldata name, string calldata licenseInfo, string calldata widgetUrl) external onlyDAO nonReentrant {
        require(provider != address(0), "FRR: zero provider");
        require(!providers[provider].registered, "FRR: already registered");

        providers[provider] = RampProvider({registered: true, name: name, licenseInfo: licenseInfo, widgetUrl: widgetUrl, txCount: 0, registeredAt: uint64(block.timestamp)});
        require(providerList.length < 200, "FRR: provider cap"); // I-11
        providerList.push(provider);

        emit RampProviderRegistered(provider, name, licenseInfo);
    }

    /**
     * @notice Remove a ramp provider
     * @param provider provider
     */
    function removeProvider(address provider) external onlyDAO nonReentrant {
        require(providers[provider].registered, "FRR: not registered");
        providers[provider].registered = false;
        // MP-07: keep providerList compact via swap-and-pop.
        for (uint256 i = 0; i < providerList.length; ++i) {
            if (providerList[i] == provider) {
                providerList[i] = providerList[providerList.length - 1];
                providerList.pop();
                break;
            }
        }
        emit RampProviderRemoved(provider);
    }

    /**
     * @notice Provider records a completed ramp transaction
     * @dev NO CUSTODY - this is purely for record-keeping and trust scoring.
     *      The actual fiat↔crypto exchange happened entirely on the provider's
     *      platform. User sent fiat to provider, provider sent crypto to user's
     *      wallet (or vice versa). VFIDE never touched anything.
     * @param user User who completed the ramp
     * @param externalTxHash Provider's internal transaction reference
     * @param isOnRamp True if fiat→crypto, false if crypto→fiat
     */
    function recordRampTransaction(address user, bytes32 externalTxHash, bool isOnRamp) external onlyProvider nonReentrant {
        require(user != address(0), "FRR: zero user");
        require(block.timestamp >= lastRampTime[msg.sender][user] + RAMP_COOLDOWN, "FRR: ramp cooldown active");
        lastRampTime[msg.sender][user] = uint64(block.timestamp);

        bytes32 recordId = keccak256(abi.encode(msg.sender, externalTxHash));
        require(rampRecords[recordId].timestamp == 0, "FRR: already recorded");

        rampRecords[recordId] = RampRecord({user: user, provider: msg.sender, externalTxHash: externalTxHash, isOnRamp: isOnRamp, timestamp: uint64(block.timestamp)});

        require(userRampHistory[user].length < 1000, "FRR: history full");
        userRampHistory[user].push(recordId);
        ++providers[msg.sender].txCount;
        
        // Reward trust score for completed ramp activity (no on-chain identity tracking)
        _rewardRampUser(user);

        emit RampTransactionRecorded(user, msg.sender, externalTxHash, isOnRamp);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice getProviderCount
    /// @return _uint256 _uint256
    function getProviderCount() external view returns (uint256) {
        return providerList.length;
    }
    
    /// @notice getActiveProviders
    /// @return addresses addresses
    /// @return names names
    /// @return widgetUrls widgetUrls
    function getActiveProviders() external view returns (
        address[] memory addresses,
        string[] memory names,
        string[] memory widgetUrls
    ) {
        uint256 count = 0;
        for (uint256 i = 0; i < providerList.length; ++i) {
            if (providers[providerList[i]].registered) ++count;
        }

        addresses = new address[](count);
        names = new string[](count);
        widgetUrls = new string[](count);

        uint256 idx = 0;
        for (uint256 i = 0; i < providerList.length; ++i) {
            if (providers[providerList[i]].registered) {
                addresses[idx] = providerList[i];
                names[idx] = providers[providerList[i]].name;
                widgetUrls[idx] = providers[providerList[i]].widgetUrl;
                ++idx;
            }
        }
    }
    
    /// @notice getUserRampHistory
    /// @param user user
    function getUserRampHistory(address user) external view returns (bytes32[] memory) {
        return userRampHistory[user];
    }
    
    /// @notice getUserRampCount
    /// @param user user
    /// @return onRamps onRamps
    /// @return offRamps offRamps
    function getUserRampCount(address user) external view returns (uint256 onRamps, uint256 offRamps) {
        bytes32[] memory history = userRampHistory[user];
        for (uint256 i = 0; i < history.length; ++i) {
            if (rampRecords[history[i]].isOnRamp) {
                ++onRamps;
            } else {
                ++offRamps;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                           INTERNAL
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice _rewardRampUser
    /// @param user user
    function _rewardRampUser(address user) internal {
        if (address(seer) == address(0)) return;
        if (rampRewardCount[msg.sender][user] >= MAX_RAMP_REWARDS_PER_PROVIDER_USER) return;
        if (userRampRewardCount[user] >= MAX_RAMP_REWARDS_PER_USER) return;
        ++rampRewardCount[msg.sender][user];
        ++userRampRewardCount[user];
        
        uint16 currentScore = seer.getScore(user);
        if (currentScore < 100) {
            try seer.reward(user, FIRST_RAMP_BONUS, "first_ramp") {} catch {}
        } else {
            try seer.reward(user, RAMP_TX_BONUS, "ramp_complete") {} catch {}
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          2. PRICE ORACLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @title MainstreamPriceOracle
 * @notice Provides VFIDE/USD pricing for fiat display at checkout
 * @dev Supports multiple price sources with fallback
 * @author Vfide
 */
contract MainstreamPriceOracle is ReentrancyGuard {
    /// @notice PriceUpdated
    /// @param vfidePerUsd vfidePerUsd
    /// @param timestamp timestamp
    /// @param updater updater
    event PriceUpdated(uint256 vfidePerUsd, uint256 timestamp, address indexed updater);
    /// @notice PriceSourceAdded
    /// @param source source
    /// @param name name
    /// @param priority priority
    event PriceSourceAdded(address indexed source, string name, uint8 priority);
    /// @notice PriceSourceRemoved
    /// @param source source
    event PriceSourceRemoved(address indexed source);
    /// @notice PriceSourceReported
    /// @param source source
    /// @param price price
    /// @param timestamp timestamp
    event PriceSourceReported(address indexed source, uint256 price, uint256 timestamp);
    /// @notice StalenessThresholdUpdated
    /// @param oldThreshold oldThreshold
    /// @param newThreshold newThreshold
    event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    /// @notice UpdaterChangeProposed
    /// @param updater updater
    /// @param status status
    /// @param effectiveAt effectiveAt
    event UpdaterChangeProposed(address indexed updater, bool status, uint256 effectiveAt);
    /// @notice UpdaterChangeApplied
    /// @param updater updater
    /// @param status status
    event UpdaterChangeApplied(address indexed updater, bool status);
    /// @notice ForcePriceProposed
    /// @param newPrice newPrice
    /// @param effectiveAt effectiveAt
    event ForcePriceProposed(uint256 newPrice, uint256 effectiveAt);
    
    /// @notice dao
    address public dao;

    // Price in VFIDE per 1 USD (18 decimals)
    // If VFIDE = $0.10, then vfidePerUsd = 10e18 (10 VFIDE per $1)
    /// @notice vfidePerUsd
    uint256 public vfidePerUsd;
    /// @notice lastUpdateTime
    uint256 public lastUpdateTime;
    /// @notice stalenessThreshold
    uint256 public stalenessThreshold = 1 hours;
    /// @notice MIN_PRICE_UPDATE_INTERVAL
    uint256 public constant MIN_PRICE_UPDATE_INTERVAL = 5 minutes;
    /// @notice MIN_UPDATER_UPDATE_INTERVAL
    uint256 public constant MIN_UPDATER_UPDATE_INTERVAL = 15 minutes;
    /// @notice MIN_ABSOLUTE_VFIDE_PER_USD
    uint256 public constant MIN_ABSOLUTE_VFIDE_PER_USD = 1e12;
    /// @notice MAX_STANDARD_PRICE_CHANGE_BPS
    uint256 public constant MAX_STANDARD_PRICE_CHANGE_BPS = 5000;
    /// @notice MAX_FORCE_PRICE_INCREASE_BPS
    uint256 public constant MAX_FORCE_PRICE_INCREASE_BPS = 90000;
    /// @notice MAX_FORCE_PRICE_DECREASE_BPS
    uint256 public constant MAX_FORCE_PRICE_DECREASE_BPS = 5000;
    /// @notice MAX_SOURCE_DEVIATION_BPS
    uint256 public constant MAX_SOURCE_DEVIATION_BPS = 5000;
    /// @notice FORCE_PRICE_DELAY
    uint256 public constant FORCE_PRICE_DELAY = 24 hours;
    /// @notice UPDATER_CHANGE_DELAY
    uint256 public constant UPDATER_CHANGE_DELAY = 24 hours;

    struct PriceSource {
        bool active;
        string name;
        uint8 priority; // Lower = higher priority
        uint256 lastPrice;
        uint256 lastUpdate;
    }
    
    /// @notice priceSources
    mapping(address => PriceSource) public priceSources;
    /// @notice sourceList
    address[] public sourceList;

    // Authorized updaters (keepers, oracles)
    /// @notice isUpdater
    mapping(address => bool) public isUpdater;
    /// @notice lastUpdaterUpdateAt
    mapping(address => uint256) public lastUpdaterUpdateAt;
    /// @notice pendingUpdaterStatus
    mapping(address => bool) public pendingUpdaterStatus;
    /// @notice pendingUpdaterAt
    mapping(address => uint256) public pendingUpdaterAt;
    /// @notice pendingForcePrice
    uint256 public pendingForcePrice;
    /// @notice pendingForcePriceAt
    uint256 public pendingForcePriceAt;
    
    /// @notice onlyDAO
    modifier onlyDAO() {
        require(msg.sender == dao, "PO: not DAO");
        _;
    }
    
    /// @notice onlyUpdater
    modifier onlyUpdater() {
        require(isUpdater[msg.sender] || msg.sender == dao, "PO: not updater");
        _;
    }
    
    /// @notice constructor
    /// @param _dao _dao
    /// @param initialPrice initialPrice
    constructor(address _dao, uint256 initialPrice) {
        require(_dao != address(0), "PO: zero DAO");
        _requireValidAbsolutePrice(initialPrice);
        dao = _dao;
        vfidePerUsd = initialPrice;
        lastUpdateTime = block.timestamp;
        isUpdater[_dao] = true;
    }

    /// @notice _requireValidAbsolutePrice
    /// @param price price
    function _requireValidAbsolutePrice(uint256 price) internal pure {
        require(price >= MIN_ABSOLUTE_VFIDE_PER_USD, "PO: price below minimum");
    }

    /// @notice _validatePriceWindow
    /// @param currentPrice currentPrice
    /// @param newPrice newPrice
    /// @param maxIncreaseBps maxIncreaseBps
    /// @param maxDecreaseBps maxDecreaseBps
    function _validatePriceWindow(
        uint256 currentPrice,
        uint256 newPrice,
        uint256 maxIncreaseBps,
        uint256 maxDecreaseBps
    ) internal pure {
        uint256 minPrice = (currentPrice * (10_000 - maxDecreaseBps)) / 10_000;
        uint256 maxPrice = (currentPrice * (10_000 + maxIncreaseBps)) / 10_000;
        require(newPrice >= minPrice && newPrice <= maxPrice, "PO: price change too large");
    }

    /// @notice _enforceUpdateCooldown
    function _enforceUpdateCooldown() internal view {
        require(block.timestamp >= lastUpdateTime + MIN_PRICE_UPDATE_INTERVAL, "PO: update cooldown active");
    }

    /// @notice _enforceUpdaterCooldown
    /// @param updater updater
    function _enforceUpdaterCooldown(address updater) internal {
        require(block.timestamp >= lastUpdaterUpdateAt[updater] + MIN_UPDATER_UPDATE_INTERVAL, "PO: updater cooldown active");
        lastUpdaterUpdateAt[updater] = block.timestamp;
    }

    /// @notice _requireFreshPrice
    function _requireFreshPrice() internal view {
        require(vfidePerUsd > 0, "PO: price not set");
        require(block.timestamp <= lastUpdateTime + stalenessThreshold, "PO: price stale");
    }

    /**
     * @notice Update VFIDE/USD price
     * @param newPrice VFIDE amount per 1 USD (18 decimals)
     */
    function updatePrice(uint256 newPrice) external onlyUpdater nonReentrant {
        _requireValidAbsolutePrice(newPrice);
        _enforceUpdateCooldown();
        _enforceUpdaterCooldown(msg.sender);
        _validatePriceWindow(vfidePerUsd, newPrice, MAX_STANDARD_PRICE_CHANGE_BPS, MAX_STANDARD_PRICE_CHANGE_BPS);

        vfidePerUsd = newPrice;
        lastUpdateTime = block.timestamp;

        emit PriceUpdated(newPrice, block.timestamp, msg.sender);
    }

    /**
     * @notice Queue a force price change (DAO only), applied after delay.
     * @param newPrice newPrice
     */
    function forceSetPrice(uint256 newPrice) external onlyDAO nonReentrant {
        _requireValidAbsolutePrice(newPrice);
        _validatePriceWindow(vfidePerUsd, newPrice, MAX_FORCE_PRICE_INCREASE_BPS, MAX_FORCE_PRICE_DECREASE_BPS);
        pendingForcePrice = newPrice;
        pendingForcePriceAt = block.timestamp + FORCE_PRICE_DELAY;
        emit ForcePriceProposed(newPrice, pendingForcePriceAt);
    }

    /// @notice applyForceSetPrice
    function applyForceSetPrice() external onlyDAO nonReentrant {
        require(pendingForcePriceAt > 0, "PO: no pending force price");
        require(block.timestamp >= pendingForcePriceAt, "PO: force price timelocked");
        _enforceUpdateCooldown();

        uint256 newPrice = pendingForcePrice;
        pendingForcePrice = 0;
        pendingForcePriceAt = 0;

        vfidePerUsd = newPrice;
        lastUpdateTime = block.timestamp;
        emit PriceUpdated(newPrice, block.timestamp, msg.sender);
    }

    /**
     * @notice Add/update a price source
     * @param source source
     * @param name name
     * @param priority priority
     */
    function setPriceSource(address source, string calldata name, uint8 priority) external onlyDAO nonReentrant {
        require(source != address(0), "PO: zero source");

        if (!priceSources[source].active) {
            sourceList.push(source);
        }

        priceSources[source] = PriceSource({active: true, name: name, priority: priority, lastPrice: 0, lastUpdate: 0});

        emit PriceSourceAdded(source, name, priority);
    }

    /**
     * @notice Remove a price source
     * @param source source
     */
    function removePriceSource(address source) external onlyDAO nonReentrant {
        require(priceSources[source].active, "PO: source not active");
        priceSources[source].active = false;

        uint256 len = sourceList.length;
        for (uint256 i = 0; i < len; ++i) {
            if (sourceList[i] == source) {
                sourceList[i] = sourceList[len - 1];
                sourceList.pop();
                break;
            }
        }

        emit PriceSourceRemoved(source);
    }

    /**
     * @notice Queue authorized updater change
     * @param updater updater
     * @param status status
     */
    function setUpdater(address updater, bool status) external onlyDAO nonReentrant {
        require(updater != address(0), "PO: zero updater");
        pendingUpdaterStatus[updater] = status;
        pendingUpdaterAt[updater] = block.timestamp + UPDATER_CHANGE_DELAY;
        emit UpdaterChangeProposed(updater, status, pendingUpdaterAt[updater]);
    }

    /// @notice applyUpdater
    /// @param updater updater
    function applyUpdater(address updater) external onlyDAO nonReentrant {
        uint256 effectiveAt = pendingUpdaterAt[updater];
        require(effectiveAt > 0, "PO: no pending updater");
        require(block.timestamp >= effectiveAt, "PO: updater timelocked");

        bool status = pendingUpdaterStatus[updater];
        isUpdater[updater] = status;
        pendingUpdaterAt[updater] = 0;
        emit UpdaterChangeApplied(updater, status);
    }

    /// @notice Fallback — any updater can push a price from a registered source
    /// @dev Reads `lastPrice` from the registered PriceSource and applies it (with sanity check)
    /// @param source source
    function updatePriceFromSource(address source) external onlyUpdater nonReentrant {
        PriceSource storage ps = priceSources[source];
        require(ps.active, "PO: source not active");
        require(ps.lastPrice > 0, "PO: source has no price");
        require(ps.lastUpdate + stalenessThreshold >= block.timestamp, "PO: source stale");

        uint256 newPrice = ps.lastPrice;
        _enforceUpdateCooldown();
        _enforceUpdaterCooldown(msg.sender);
        _validatePriceWindow(vfidePerUsd, newPrice, MAX_STANDARD_PRICE_CHANGE_BPS, MAX_STANDARD_PRICE_CHANGE_BPS);

        vfidePerUsd = newPrice;
        lastUpdateTime = block.timestamp;
        emit PriceUpdated(newPrice, block.timestamp, source);
    }

    /// @notice Allow a registered price source to push its latest price
    /// @param price price
    function reportSourcePrice(uint256 price) external nonReentrant {
        PriceSource storage ps = priceSources[msg.sender];
        require(ps.active, "PO: not a source");
        _requireValidAbsolutePrice(price);
        _validatePriceWindow(vfidePerUsd, price, MAX_SOURCE_DEVIATION_BPS, MAX_SOURCE_DEVIATION_BPS);
        ps.lastPrice = price;
        ps.lastUpdate = block.timestamp;
        emit PriceSourceReported(msg.sender, price, block.timestamp);
    }

    /**
     * @notice Set staleness threshold
     * @param threshold threshold
     */
    function setStalenessThreshold(uint256 threshold) external onlyDAO nonReentrant {
        require(threshold >= 5 minutes && threshold <= 24 hours, "PO: invalid threshold");
        uint256 old = stalenessThreshold;
        stalenessThreshold = threshold;
        emit StalenessThresholdUpdated(old, threshold);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Convert USD amount to VFIDE
     * @param usdAmount Amount in USD (6 decimals, like USDC)
     * @return vfideAmount Amount in VFIDE (18 decimals)
     */
    function usdToVfide(uint256 usdAmount) external view returns (uint256 vfideAmount) {
        _requireFreshPrice();
        // usdAmount is in 6 decimals, vfidePerUsd is in 18 decimals
        // vfideAmount = usdAmount * vfidePerUsd / 1e6
        vfideAmount = (usdAmount * vfidePerUsd) / 1e6;
    }

    /**
     * @notice Convert VFIDE amount to USD
     * @param vfideAmount Amount in VFIDE (18 decimals)
     * @return usdAmount Amount in USD (6 decimals)
     */
    function vfideToUsd(uint256 vfideAmount) external view returns (uint256 usdAmount) {
        _requireFreshPrice();
        // usdAmount = vfideAmount * 1e6 / vfidePerUsd
        usdAmount = (vfideAmount * 1e6) / vfidePerUsd;
    }

    /**
     * @notice Get current price with freshness info
     * @return price price
     * @return lastUpdate lastUpdate
     * @return isStale isStale
     */
    function getPrice() external view returns (uint256 price, uint256 lastUpdate, bool isStale) {
        price = vfidePerUsd;
        lastUpdate = lastUpdateTime;
        isStale = block.timestamp > lastUpdateTime + stalenessThreshold;
    }

    /**
     * @notice Get VFIDE price in USD (inverted)
     * @return priceUsd VFIDE price in USD (6 decimals)
     */
    function getVfidePriceUsd() external view returns (uint256 priceUsd) {
        _requireFreshPrice();
        // If vfidePerUsd = 10e18 (10 VFIDE per $1), then 1 VFIDE = $0.10
        // priceUsd = 1e6 * 1e18 / vfidePerUsd = 1e24 / vfidePerUsd
        priceUsd = 1e24 / vfidePerUsd;
    }

    /**
     * @notice Preview checkout price for display
     * @param usdPrice Product price in USD cents (e.g., 9999 = $99.99)
     * @return vfidePrice Price in VFIDE (18 decimals)
     * @return usdDisplay Price in USD for display (6 decimals)
     * @return vfideFormatted Human-readable VFIDE amount (2 decimal places)
     */
    function previewCheckoutPrice(uint256 usdPrice) external view returns (uint256 vfidePrice, uint256 usdDisplay, uint256 vfideFormatted) {
        _requireFreshPrice();
        // usdPrice is in cents, convert to 6 decimals
        usdDisplay = usdPrice * 1e4; // cents to 6 decimals

        // Calculate VFIDE amount
        vfidePrice = (usdDisplay * vfidePerUsd) / 1e6;

        // Format for display (2 decimal places = divide by 1e16)
        vfideFormatted = vfidePrice / 1e16;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          3. SESSION KEY MANAGER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @title SessionKeyManager
 * @notice Enables one-tap mobile payments via temporary session keys
 * @dev Session keys can make limited transactions without main wallet signature
 * @author Vfide
 */
interface ISeerAutonomous_SKM {
    /// @notice beforeAction
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
    /// @return _uint8 _uint8
    function beforeAction(address subject, uint8 action, uint256 amount, address counterparty) external returns (uint8);
}

/// @notice SessionKeyManager
/// @title SessionKeyManager
/// @author Vfide
contract SessionKeyManager is ReentrancyGuard {
    /// @notice SessionCreated
    /// @param owner owner
    /// @param sessionKey sessionKey
    /// @param spendLimit spendLimit
    /// @param expiry expiry
    event SessionCreated(address indexed owner, address indexed sessionKey, uint256 spendLimit, uint64 expiry);
    /// @notice SessionRevoked
    /// @param owner owner
    /// @param sessionKey sessionKey
    event SessionRevoked(address indexed owner, address indexed sessionKey);
    /// @notice SessionUsed
    /// @param owner owner
    /// @param sessionKey sessionKey
    /// @param amount amount
    /// @param remaining remaining
    event SessionUsed(address indexed owner, address indexed sessionKey, uint256 amount, uint256 remaining);
    /// @notice DefaultLimitsUpdated
    /// @param spendLimit spendLimit
    /// @param duration duration
    event DefaultLimitsUpdated(uint256 spendLimit, uint64 duration);
    /// @notice DefaultLimitsChangeProposed
    /// @param spendLimit spendLimit
    /// @param duration duration
    /// @param maxPerTx maxPerTx
    /// @param effectiveAt effectiveAt
    event DefaultLimitsChangeProposed(uint256 spendLimit, uint64 duration, uint256 maxPerTx, uint256 effectiveAt);
    /// @notice SessionActionDelayed
    /// @param owner owner
    /// @param recorder recorder
    /// @param action action
    /// @param amount amount
    event SessionActionDelayed(address indexed owner, address indexed recorder, uint8 action, uint256 amount);
    /// @notice SeerAutonomousSet
    /// @param seerAutonomous seerAutonomous
    event SeerAutonomousSet(address indexed seerAutonomous);
    /// @notice SessionRecorderPermissionSet
    /// @param owner owner
    /// @param sessionKey sessionKey
    /// @param recorder recorder
    /// @param allowed allowed
    event SessionRecorderPermissionSet(address indexed owner, address indexed sessionKey, address indexed recorder, bool allowed);

    /// @notice SKM_ActionBlocked
    /// @param result result
    error SKM_ActionBlocked(uint8 result);
    
    /// @notice dao
    address public dao;
    /// @notice vaultHub
    IVaultHub public vaultHub;
    /// @notice seerAutonomous
    ISeerAutonomous_SKM public seerAutonomous;
    
    struct Session {
        address owner;           // Vault owner who created session
        uint256 spendLimit;      // Max VFIDE per session
        uint256 spent;           // Amount already spent
        uint64 expiry;           // Session expiry time
        bool revoked;            // Manually revoked
        uint256 maxPerTx;        // Max per transaction
    }
    
    /// @notice sessions
    mapping(address => Session) public sessions;  // sessionKey => Session
    /// @notice ownerSessions
    mapping(address => address[]) private ownerSessions; // owner => sessionKeys
    
    /// @notice authorizedSpendRecorders
    mapping(address => bool) public authorizedSpendRecorders;
    /// @notice sessionRecorderAllowed
    mapping(address => mapping(address => bool)) public sessionRecorderAllowed; // sessionKey => recorder => allowed
    
    // Default limits
    /// @notice defaultSpendLimit
    uint256 public defaultSpendLimit = 1000 * 1e18;  // 1000 VFIDE
    /// @notice defaultDuration
    uint64 public defaultDuration = 24 hours;
    /// @notice defaultMaxPerTx
    uint256 public defaultMaxPerTx = 100 * 1e18;     // 100 VFIDE per tx

    /// @notice pendingDefaultSpendLimit
    uint256 public pendingDefaultSpendLimit;
    /// @notice pendingDefaultDuration
    uint64 public pendingDefaultDuration;
    /// @notice pendingDefaultMaxPerTx
    uint256 public pendingDefaultMaxPerTx;
    /// @notice pendingDefaultLimitsAt
    uint256 public pendingDefaultLimitsAt;
    /// @notice DEFAULT_LIMITS_DELAY
    uint256 public constant DEFAULT_LIMITS_DELAY = 24 hours;
    
    /// @notice onlyDAO
    modifier onlyDAO() {
        require(msg.sender == dao, "SKM: not DAO");
        _;
    }
    
    /// @notice onlyAuthorizedRecorder
    modifier onlyAuthorizedRecorder() {
        require(authorizedSpendRecorders[msg.sender], "SKM: not authorized recorder");
        _;
    }
    
    /// @notice constructor
    /// @param _dao _dao
    /// @param _vaultHub _vaultHub
    constructor(address _dao, address _vaultHub) {
        require(_dao != address(0) && _vaultHub != address(0), "SKM: zero");
        dao = _dao;
        vaultHub = IVaultHub(_vaultHub);
    }

    /**
     * @notice Set authorized spend recorders (MerchantPortal, etc.)
     * @param recorder recorder
     * @param authorized authorized
     */
    function setAuthorizedRecorder(address recorder, bool authorized) external onlyDAO nonReentrant {
        require(recorder != address(0), "SKM: zero address");
        authorizedSpendRecorders[recorder] = authorized;
    }

    /// @notice setSeerAutonomous
    /// @param _seerAutonomous _seerAutonomous
    function setSeerAutonomous(address _seerAutonomous) external onlyDAO nonReentrant {
        seerAutonomous = ISeerAutonomous_SKM(_seerAutonomous);
        emit SeerAutonomousSet(_seerAutonomous);
    }

    /**
     * @notice Allow or revoke a specific authorized recorder for one session key.
     * @dev Session owner must explicitly opt-in each recorder before it can call recordSpend.
     * @param sessionKey sessionKey
     * @param recorder recorder
     * @param allowed allowed
     */
    function setSessionRecorderPermission(address sessionKey, address recorder, bool allowed) external nonReentrant {
        Session storage s = sessions[sessionKey];
        require(s.owner == msg.sender, "SKM: not owner");
        require(recorder != address(0), "SKM: zero address");
        sessionRecorderAllowed[sessionKey][recorder] = allowed;
        emit SessionRecorderPermissionSet(msg.sender, sessionKey, recorder, allowed);
    }

    /**
     * @notice Create a session key for mobile payments
     * @param sessionKey Address that can sign transactions (typically a mobile-generated key)
     * @param spendLimit Maximum VFIDE this session can spend
     * @param duration How long the session is valid
     * @param maxPerTx Maximum per single transaction
     * @return expiry expiry
     */
    function createSession(address sessionKey, uint256 spendLimit, uint64 duration, uint256 maxPerTx) external nonReentrant returns (uint64 expiry) {
        return _createSessionInternal(msg.sender, sessionKey, spendLimit, duration, maxPerTx);
    }

    /// @notice _createSessionInternal
    /// @param caller caller
    /// @param sessionKey sessionKey
    /// @param spendLimit spendLimit
    /// @param duration duration
    /// @param maxPerTx maxPerTx
    /// @return expiry expiry
    function _createSessionInternal(
        address caller,
        address sessionKey,
        uint256 spendLimit,
        uint64 duration,
        uint256 maxPerTx
    ) internal returns (uint64 expiry) {
        require(sessionKey != address(0), "SKM: zero key");
        require(sessionKey != caller, "SKM: cannot be self");
        require(sessions[sessionKey].owner == address(0), "SKM: key already used");
        require(vaultHub.vaultOf(caller) != address(0), "SKM: no vault");

        // Apply limits
        if (spendLimit == 0) spendLimit = defaultSpendLimit;
        if (duration == 0) duration = defaultDuration;
        if (maxPerTx == 0) maxPerTx = defaultMaxPerTx;

        require(duration <= 7 days, "SKM: duration too long");
        require(spendLimit <= 10000 * 1e18, "SKM: limit too high");

        expiry = uint64(block.timestamp) + duration;

        sessions[sessionKey] = Session({owner: caller, spendLimit: spendLimit, spent: 0, expiry: expiry, revoked: false, maxPerTx: maxPerTx});

        require(ownerSessions[caller].length < 50, "SKM: session cap"); // I-11
        ownerSessions[caller].push(sessionKey);

        emit SessionCreated(caller, sessionKey, spendLimit, expiry);
    }

    /**
     * @notice Create session with default limits (quick setup)
     * @param sessionKey sessionKey
     * @return expiry expiry
     */
    function createQuickSession(address sessionKey) external nonReentrant returns (uint64 expiry) {
        return _createSessionInternal(msg.sender, sessionKey, defaultSpendLimit, defaultDuration, defaultMaxPerTx);
    }

    /**
     * @notice Revoke a session key
     * @param sessionKey sessionKey
     */
    function revokeSession(address sessionKey) external nonReentrant {
        Session storage s = sessions[sessionKey];
        require(s.owner == msg.sender, "SKM: not owner");
        require(!s.revoked, "SKM: already revoked");

        s.revoked = true;
        emit SessionRevoked(msg.sender, sessionKey);
    }

    /**
     * @notice Revoke all sessions for caller
     */
    function revokeAllSessions() external nonReentrant {
        address[] memory keys = ownerSessions[msg.sender];
        for (uint256 i = 0; i < keys.length; ++i) {
            if (!sessions[keys[i]].revoked) {
                sessions[keys[i]].revoked = true;
                emit SessionRevoked(msg.sender, keys[i]);
            }
        }
    }

    /**
     * @notice Check if session can spend amount
     * @dev Called by payment contracts before processing
     * @param sessionKey sessionKey
     * @param amount amount
     * @return allowed allowed
     * @return reason reason
     */
    function canSpend(address sessionKey, uint256 amount) external view returns (bool allowed, string memory reason) {
        Session storage s = sessions[sessionKey];

        if (s.owner == address(0)) return (false, "session not found");
        if (s.revoked) return (false, "session revoked");
        if (block.timestamp >= s.expiry) return (false, "session expired");
        if (amount > s.maxPerTx) return (false, "exceeds per-tx limit");
        if (s.spent + amount > s.spendLimit) return (false, "exceeds spend limit");

        return (true, "ok");
    }

    /**
     * @notice Record spending (called by payment contracts)
     * @dev Only callable by authorized contracts (MerchantPortal, etc.)
     * @param sessionKey sessionKey
     * @param amount amount
     */
    function recordSpend(address sessionKey, uint256 amount) external onlyAuthorizedRecorder nonReentrant returns (bool) {
        Session storage s = sessions[sessionKey];

        require(s.owner != address(0), "SKM: session not found");
        require(sessionRecorderAllowed[sessionKey][msg.sender], "SKM: recorder not approved by session owner");
        require(!s.revoked, "SKM: session revoked");
        require(block.timestamp < s.expiry, "SKM: session expired");
        require(amount <= s.maxPerTx, "SKM: exceeds per-tx limit");
        require(s.spent + amount <= s.spendLimit, "SKM: exceeds spend limit");

        s.spent += amount;

        emit SessionUsed(s.owner, sessionKey, amount, s.spendLimit - s.spent);
        _enforceSeerAction(s.owner, 0, amount, msg.sender); // Transfer
        return true;
    }

    /**
     * @notice Get vault owner for a session key
     * @param sessionKey sessionKey
     */
    function getSessionOwner(address sessionKey) external view returns (address) {
        return sessions[sessionKey].owner;
    }

    /**
     * @notice Get all sessions for an owner
     * @param owner owner
     * @return keys keys
     * @return spendLimits spendLimits
     * @return spent spent
     * @return expiries expiries
     * @return active active
     */
    function getOwnerSessions(address owner) external view returns (address[] memory keys, uint256[] memory spendLimits, uint256[] memory spent, uint64[] memory expiries, bool[] memory active) {
        address[] memory allKeys = ownerSessions[owner];
        uint256 count = allKeys.length;

        keys = new address[](count);
        spendLimits = new uint256[](count);
        spent = new uint256[](count);
        expiries = new uint64[](count);
        active = new bool[](count);
        
        for (uint256 i = 0; i < count; ++i) {
            Session storage s = sessions[allKeys[i]];
            keys[i] = allKeys[i];
            spendLimits[i] = s.spendLimit;
            spent[i] = s.spent;
            expiries[i] = s.expiry;
            active[i] = !s.revoked && block.timestamp < s.expiry;
        }
    }

    /**
     * @notice Get session status
     * @param sessionKey sessionKey
     * @return owner owner
     * @return remaining remaining
     * @return maxPerTransaction maxPerTransaction
     * @return expiresAt expiresAt
     * @return isActive isActive
     */
    function getSessionStatus(address sessionKey) external view returns (address owner, uint256 remaining, uint256 maxPerTransaction, uint64 expiresAt, bool isActive) {
        Session storage s = sessions[sessionKey];
        owner = s.owner;
        remaining = s.spent >= s.spendLimit ? 0 : s.spendLimit - s.spent;
        maxPerTransaction = s.maxPerTx;
        expiresAt = s.expiry;
        isActive = !s.revoked && block.timestamp < s.expiry && s.owner != address(0);
    }

    /**
     * @notice DAO can update default limits
     * @param spendLimit spendLimit
     * @param duration duration
     * @param maxPerTx maxPerTx
     */
    function setDefaultLimits(uint256 spendLimit, uint64 duration, uint256 maxPerTx) external onlyDAO nonReentrant {
        require(spendLimit <= 10000 * 1e18, "SKM: limit too high");
        require(duration <= 7 days, "SKM: duration too long");

        pendingDefaultSpendLimit = spendLimit;
        pendingDefaultDuration = duration;
        pendingDefaultMaxPerTx = maxPerTx;
        pendingDefaultLimitsAt = block.timestamp + DEFAULT_LIMITS_DELAY;
        emit DefaultLimitsChangeProposed(spendLimit, duration, maxPerTx, pendingDefaultLimitsAt);
    }

    /// @notice applyDefaultLimits
    function applyDefaultLimits() external onlyDAO nonReentrant {
        require(pendingDefaultLimitsAt > 0, "SKM: no pending limits");
        require(block.timestamp >= pendingDefaultLimitsAt, "SKM: limits timelocked");

        defaultSpendLimit = pendingDefaultSpendLimit;
        defaultDuration = pendingDefaultDuration;
        defaultMaxPerTx = pendingDefaultMaxPerTx;

        pendingDefaultSpendLimit = 0;
        pendingDefaultDuration = 0;
        pendingDefaultMaxPerTx = 0;
        pendingDefaultLimitsAt = 0;
        emit DefaultLimitsUpdated(defaultSpendLimit, defaultDuration);
    }

    /// @notice _enforceSeerAction
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
    function _enforceSeerAction(address subject, uint8 action, uint256 amount, address counterparty) internal {
        if (address(seerAutonomous) == address(0)) return;

        uint8 result = 0;
        try seerAutonomous.beforeAction(subject, action, amount, counterparty) returns (uint8 r) {
            result = r;
        } catch {
            // H-16 FIX: When Seer is unavailable, fail-open to avoid DoS on legitimate payments.
            // Seer downtime should not block honest users; anomalies are logged off-chain.
            return;
        }

        // 0=Allowed,1=Warned,2=Delayed,3=Blocked,4=Penalized
        if (result == 2) {
            emit SessionActionDelayed(subject, counterparty, action, amount);
            return;
        }
        if (result >= 3) revert SKM_ActionBlocked(result);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          4. NFC/TERMINAL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @title TerminalRegistry
 * @notice Registry for NFC/POS hardware terminals
 * @dev Terminals can initiate payments on behalf of customers
 * @author Vfide
 */
contract TerminalRegistry is ReentrancyGuard {
    /// @notice TerminalRegistered
    /// @param terminalId terminalId
    /// @param merchant merchant
    /// @param location location
    event TerminalRegistered(bytes32 indexed terminalId, address indexed merchant, string location);
    /// @notice TerminalDeactivated
    /// @param terminalId terminalId
    event TerminalDeactivated(bytes32 indexed terminalId);
    /// @notice TerminalReactivated
    /// @param terminalId terminalId
    event TerminalReactivated(bytes32 indexed terminalId);
    /// @notice TerminalPayment
    /// @param terminalId terminalId
    /// @param customer customer
    /// @param amount amount
    event TerminalPayment(bytes32 indexed terminalId, address indexed customer, uint256 amount);
    /// @notice TerminalLocationUpdated
    /// @param terminalId terminalId
    /// @param newLocation newLocation
    event TerminalLocationUpdated(bytes32 indexed terminalId, string newLocation);
    /// @notice TapLimitUpdated
    /// @param oldLimit oldLimit
    /// @param newLimit newLimit
    event TapLimitUpdated(uint256 oldLimit, uint256 newLimit);
    /// @notice PaymentRecorderSet
    /// @param recorder recorder
    /// @param allowed allowed
    event PaymentRecorderSet(address indexed recorder, bool allowed);
    /// @notice TerminalRegistrarSet
    /// @param registrar registrar
    event TerminalRegistrarSet(address indexed registrar);
    
    /// @notice dao
    address public dao;
    /// @notice vaultHub
    IVaultHub public vaultHub;
    /// @notice terminalRegistrar
    address public terminalRegistrar;

    struct Terminal {
        address merchant;
        bool active;
        bool deactivatedByDAO;
        string location; // Physical location description
        uint256 txCount;
        uint256 totalVolume;
        uint64 registeredAt;
        uint64 lastTxTime;
    }
    
    /// @notice terminals
    mapping(bytes32 => Terminal) public terminals;
    /// @notice merchantTerminals
    mapping(address => bytes32[]) private merchantTerminals;
    /// @notice paymentRecorders
    mapping(address => bool) public paymentRecorders;
    /// @notice usedRegistrationDigests
    mapping(bytes32 => bool) public usedRegistrationDigests;

    // Spending limits for tap-to-pay (no signature required)
    /// @notice tapLimit
    uint256 public tapLimit = 50 * 1e18;  // 50 VFIDE max for tap (like $50 contactless limit)
    
    /// @notice onlyDAO
    modifier onlyDAO() {
        require(msg.sender == dao, "TR: not DAO");
        _;
    }
    
    /// @notice constructor
    /// @param _dao _dao
    /// @param _vaultHub _vaultHub
    constructor(address _dao, address _vaultHub) {
        require(_dao != address(0) && _vaultHub != address(0), "TR: zero");
        dao = _dao;
        vaultHub = IVaultHub(_vaultHub);
        terminalRegistrar = _dao;
    }

    /**
     * @notice Register a new terminal for a merchant
     * @param terminalId Unique hardware ID (could be NFC chip ID, serial number, etc.)
     * @param location Physical location description
     * @param deadline Signature expiry timestamp
     * @param nonce Merchant-provided unique nonce
     * @param signature Off-chain registrar authorization signature
     */
    function registerTerminal(bytes32 terminalId, string calldata location, uint64 deadline, bytes32 nonce, bytes calldata signature) external nonReentrant {
        require(terminalId != bytes32(0), "TR: zero terminal ID");
        require(terminals[terminalId].merchant == address(0), "TR: terminal exists");
        require(vaultHub.vaultOf(msg.sender) != address(0), "TR: no vault");
        require(terminalRegistrar != address(0), "TR: registrar not set");
        require(block.timestamp <= deadline, "TR: registration expired");

        bytes32 digest = keccak256(abi.encodePacked("VFIDE_TERMINAL_REGISTER", address(this), block.chainid, msg.sender, terminalId, nonce, deadline));
        require(!usedRegistrationDigests[digest], "TR: registration replay");

        address signer = _recoverRegistrationSigner(digest, signature);
        require(signer == terminalRegistrar, "TR: invalid registrar signature");
        usedRegistrationDigests[digest] = true;

        terminals[terminalId] = Terminal({
            merchant: msg.sender,
            active: true,
            deactivatedByDAO: false,
            location: location,
            txCount: 0,
            totalVolume: 0,
            registeredAt: uint64(block.timestamp),
            lastTxTime: 0
        });

        require(merchantTerminals[msg.sender].length < 100, "TR: terminal cap"); // I-11
        merchantTerminals[msg.sender].push(terminalId);

        emit TerminalRegistered(terminalId, msg.sender, location);
    }

    /// @notice setTerminalRegistrar
    /// @param registrar registrar
    function setTerminalRegistrar(address registrar) external onlyDAO nonReentrant {
        require(registrar != address(0), "TR: zero registrar");
        terminalRegistrar = registrar;
        emit TerminalRegistrarSet(registrar);
    }

    /**
     * @notice Deactivate a terminal (merchant or DAO)
     * @param terminalId terminalId
     */
    function deactivateTerminal(bytes32 terminalId) external nonReentrant {
        Terminal storage t = terminals[terminalId];
        require(t.merchant == msg.sender || msg.sender == dao, "TR: not authorized");
        require(t.active, "TR: already inactive");

        t.active = false;
        t.deactivatedByDAO = (msg.sender == dao);
        emit TerminalDeactivated(terminalId);
    }

    /**
     * @notice Reactivate a terminal (merchant only)
     * @param terminalId terminalId
     */
    function reactivateTerminal(bytes32 terminalId) external nonReentrant {
        Terminal storage t = terminals[terminalId];
        // MP-08: DAO deactivations require DAO reactivation.
        if (t.deactivatedByDAO) {
            require(msg.sender == dao, "TR: DAO reactivation required");
        } else {
            require(t.merchant == msg.sender, "TR: not merchant");
        }
        t.active = true;
        t.deactivatedByDAO = false;
        emit TerminalReactivated(terminalId);
    }

    /**
     * @notice Update terminal location
     * @param terminalId terminalId
     * @param newLocation newLocation
     */
    function updateLocation(bytes32 terminalId, string calldata newLocation) external nonReentrant {
        Terminal storage t = terminals[terminalId];
        require(t.merchant == msg.sender, "TR: not merchant");
        t.location = newLocation;
        emit TerminalLocationUpdated(terminalId, newLocation);
    }

    /**
     * @notice Record a terminal payment (called by payment processor)
     * @param terminalId terminalId
     * @param customer customer
     * @param amount amount
     */
    function recordPayment(bytes32 terminalId, address customer, uint256 amount) external nonReentrant {
        Terminal storage t = terminals[terminalId];
        require(t.merchant != address(0), "TR: terminal not found");
        require(msg.sender == dao || paymentRecorders[msg.sender], "TR: not recorder");
        require(t.active, "TR: terminal inactive");
        require(customer != address(0), "TR: zero customer");
        require(amount > 0, "TR: zero amount");
        require(customer != t.merchant, "TR: self-pay blocked");
        require(vaultHub.vaultOf(customer) != address(0), "TR: customer no vault");
        
        ++t.txCount;
        t.totalVolume += amount;
        t.lastTxTime = uint64(block.timestamp);

        emit TerminalPayment(terminalId, customer, amount);
    }

    /// @notice setPaymentRecorder
    /// @param recorder recorder
    /// @param allowed allowed
    function setPaymentRecorder(address recorder, bool allowed) external onlyDAO nonReentrant {
        require(recorder != address(0), "TR: zero recorder");
        paymentRecorders[recorder] = allowed;
        emit PaymentRecorderSet(recorder, allowed);
    }

    /**
     * @notice Check if terminal is valid for payment
     * @param terminalId terminalId
     * @return valid valid
     * @return merchant merchant
     */
    function isValidTerminal(bytes32 terminalId) external view returns (bool valid, address merchant) {
        Terminal storage t = terminals[terminalId];
        valid = t.active && t.merchant != address(0);
        merchant = t.merchant;
    }

    /**
     * @notice Check if amount qualifies for tap-to-pay (no signature)
     * @param amount amount
     */
    function isTapEligible(uint256 amount) external view returns (bool) {
        return amount <= tapLimit;
    }

    /**
     * @notice Get merchant's terminals
     * @param merchant merchant
     * @return terminalIds terminalIds
     * @return activeStatus activeStatus
     * @return volumes volumes
     */
    function getMerchantTerminals(address merchant) external view returns (bytes32[] memory terminalIds, bool[] memory activeStatus, uint256[] memory volumes) {
        bytes32[] memory ids = merchantTerminals[merchant];
        terminalIds = ids;
        activeStatus = new bool[](ids.length);
        volumes = new uint256[](ids.length);
        
        for (uint256 i = 0; i < ids.length; ++i) {
            Terminal storage t = terminals[ids[i]];
            activeStatus[i] = t.active;
            volumes[i] = t.totalVolume;
        }
    }

    /**
     * @notice Get terminal stats
     * @param terminalId terminalId
     * @return merchant merchant
     * @return active active
     * @return location location
     * @return txCount txCount
     * @return totalVolume totalVolume
     * @return registeredAt registeredAt
     * @return lastTxTime lastTxTime
     */
    function getTerminalStats(
        bytes32 terminalId
    ) external view returns (address merchant, bool active, string memory location, uint256 txCount, uint256 totalVolume, uint64 registeredAt, uint64 lastTxTime) {
        Terminal storage t = terminals[terminalId];
        return (t.merchant, t.active, t.location, t.txCount, t.totalVolume, t.registeredAt, t.lastTxTime);
    }

    /**
     * @notice DAO can update tap limit
     * @param newLimit newLimit
     */
    function setTapLimit(uint256 newLimit) external onlyDAO nonReentrant {
        require(newLimit >= 10 * 1e18 && newLimit <= 500 * 1e18, "TR: invalid limit");
        uint256 oldLimit = tapLimit;
        tapLimit = newLimit;
        emit TapLimitUpdated(oldLimit, newLimit);
    }

    /// @notice _recoverRegistrationSigner
    /// @param digest digest
    /// @param signature signature
    /// @return _address _address
    function _recoverRegistrationSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;
        // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);

        // EIP-2 — reject high-s signatures (malleability protection).
        // secp256k1n / 2 = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }

        bytes32 ethSignedDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        address recovered = ecrecover(ethSignedDigest, v, r, s);
        // Defense-in-depth: ecrecover returns address(0) on invalid sig; reject explicitly.
        require(recovered != address(0), "TR: invalid signature");
        return recovered;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          5. MULTI-CURRENCY ROUTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @title MultiCurrencyRouter
 * @notice Routes payments through external DEXs - NO CUSTODY
 * @dev VFIDE never holds tokens. This contract only builds calldata for users
 *      to interact directly with licensed DEX protocols (Uniswap, etc.).
 *
 *      LEGAL: This is a ROUTER not an EXCHANGE. User approves DEX directly,
 *      user calls DEX directly with routing hints from this contract.
 *      VFIDE provides convenience, not custody.
 * @author Vfide
 */
contract MultiCurrencyRouter is ReentrancyGuard {
    /// @notice TokenRouteAdded
    /// @param token token
    /// @param symbol symbol
    /// @param path path
    event TokenRouteAdded(address indexed token, string symbol, address[] path);
    /// @notice TokenRouteRemoved
    /// @param token token
    event TokenRouteRemoved(address indexed token);
    /// @notice SwapRouterUpdated
    /// @param oldRouter oldRouter
    /// @param newRouter newRouter
    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    /// @notice RecommendedRouterUpdateProposed
    /// @param newRouter newRouter
    /// @param effectiveAt effectiveAt
    event RecommendedRouterUpdateProposed(address indexed newRouter, uint256 effectiveAt);
    /// @notice DirectPaymentRecorded
    /// @param customer customer
    /// @param merchant merchant
    /// @param paymentToken paymentToken
    /// @param paymentAmount paymentAmount
    /// @param orderId orderId
    event DirectPaymentRecorded(
        address indexed customer,
        address indexed merchant,
        address paymentToken,
        uint256 paymentAmount,
        string orderId
    );
    
    /// @notice dao
    address public dao;
    /// @notice vfideToken
    address public vfideToken;
    /// @notice priceOracle
    MainstreamPriceOracle public priceOracle;
    /// @notice authorizedRecorder
    mapping(address => bool) public authorizedRecorder;

    // Recommended DEX routers (user chooses which to use)
    /// @notice recommendedRouter
    address public recommendedRouter;  // e.g., Uniswap V3 Router
    /// @notice pendingRecommendedRouter
    address public pendingRecommendedRouter;
    /// @notice pendingRecommendedRouterAt
    uint256 public pendingRecommendedRouterAt;
    /// @notice RECOMMENDED_ROUTER_DELAY
    uint256 public constant RECOMMENDED_ROUTER_DELAY = 48 hours;

    struct TokenRoute {
        bool supported;
        string symbol;
        uint8 decimals;
        address[] defaultPath; // Suggested path to VFIDE
    }
    
    /// @notice routes
    mapping(address => TokenRoute) public routes;
    /// @notice supportedTokens
    address[] public supportedTokens;
    
    /// @notice onlyDAO
    modifier onlyDAO() {
        require(msg.sender == dao, "MCR: not DAO");
        _;
    }
    
    /// @notice constructor
    /// @param _dao _dao
    /// @param _vfide _vfide
    /// @param _priceOracle _priceOracle
    /// @param _recommendedRouter _recommendedRouter
    constructor(
        address _dao,
        address _vfide,
        address _priceOracle,
        address _recommendedRouter
    ) {
        require(
            _dao != address(0) &&
            _vfide != address(0) &&
            _priceOracle != address(0) &&
            _recommendedRouter != address(0),
            "MCR: zero"
        );
        dao = _dao;
        vfideToken = _vfide;
        priceOracle = MainstreamPriceOracle(_priceOracle);
        recommendedRouter = _recommendedRouter;
        authorizedRecorder[_dao] = true;

        // VFIDE doesn't need routing
        routes[_vfide] = TokenRoute({supported: true, symbol: "VFIDE", decimals: 18, defaultPath: new address[](0)});
        supportedTokens.push(_vfide);
    }

    /**
     * @notice Add a supported token with routing path
     * @dev Path is a SUGGESTION - user executes swap directly on DEX
     * @param token token
     * @param symbol symbol
     * @param decimals decimals
     * @param path path
     */
    function addTokenRoute(address token, string calldata symbol, uint8 decimals, address[] calldata path) external onlyDAO nonReentrant {
        require(token != address(0), "MCR: zero token");
        require(!routes[token].supported, "MCR: already added");

        routes[token] = TokenRoute({supported: true, symbol: symbol, decimals: decimals, defaultPath: path});
        supportedTokens.push(token);

        emit TokenRouteAdded(token, symbol, path);
    }

    /**
     * @notice Remove token route
     * @param token token
     */
    function removeTokenRoute(address token) external onlyDAO nonReentrant {
        routes[token].supported = false;
        emit TokenRouteRemoved(token);
    }

    /**
     * @notice Queue recommended router update
     * @param router router
     */
    function setRecommendedRouter(address router) external onlyDAO nonReentrant {
        require(router != address(0), "MCR: zero router");
        pendingRecommendedRouter = router;
        pendingRecommendedRouterAt = block.timestamp + RECOMMENDED_ROUTER_DELAY;
        emit RecommendedRouterUpdateProposed(router, pendingRecommendedRouterAt);
    }

    /// @notice applyRecommendedRouter
    function applyRecommendedRouter() external onlyDAO nonReentrant {
        require(pendingRecommendedRouterAt > 0, "MCR: no pending router");
        require(block.timestamp >= pendingRecommendedRouterAt, "MCR: router timelocked");

        address old = recommendedRouter;
        address next = pendingRecommendedRouter;
        pendingRecommendedRouter = address(0);
        pendingRecommendedRouterAt = 0;
        recommendedRouter = next;
        emit SwapRouterUpdated(old, next);
    }

    /// @notice setAuthorizedRecorder
    /// @param recorder recorder
    /// @param authorized authorized
    function setAuthorizedRecorder(address recorder, bool authorized) external onlyDAO nonReentrant {
        require(recorder != address(0), "MCR: zero recorder");
        authorizedRecorder[recorder] = authorized;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                    ROUTING HELPERS (NO CUSTODY)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get swap path for a token → VFIDE
     * @dev Frontend uses this to build swap transaction for user to sign
     *      User interacts directly with DEX, not with VFIDE contracts
     * @param tokenIn Token user wants to swap from
     * @return path Suggested swap path
     * @return router Recommended router address
     */
    function getSwapRoute(address tokenIn) external view returns (address[] memory path, address router) {
        TokenRoute storage r = routes[tokenIn];
        require(r.supported, "MCR: token not supported");
        path = r.defaultPath;
        router = recommendedRouter;
    }

    /**
     * @notice Build calldata for user to execute swap directly
     * @dev User approves and calls DEX directly. VFIDE never touches funds.
     * @param tokenIn Token to swap from
     * @param amountIn Amount to swap
     * @param minAmountOut Minimum VFIDE output
     * @param recipient Where VFIDE should go (user's vault or merchant vault)
     * @return routerAddress Router to call
     * @return callData Calldata for the swap
     */
    function buildSwapCalldata(address tokenIn, uint256 amountIn, uint256 minAmountOut, address recipient) external view returns (address routerAddress, bytes memory callData) {
        TokenRoute storage r = routes[tokenIn];
        require(r.supported, "MCR: token not supported");
        require(r.defaultPath.length > 0, "MCR: no swap needed");

        routerAddress = recommendedRouter;

        // Build Uniswap V2 style calldata
        // User will execute this call, not VFIDE
        callData = abi.encodeWithSignature(
            "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
            amountIn,
            minAmountOut,
            r.defaultPath,
            recipient, // Tokens go directly to recipient, not to VFIDE
            block.timestamp + 300
        );
    }

    /**
     * @notice Record a direct payment (for analytics only, no custody)
     * @dev Called by frontend after user completes DEX swap and sends VFIDE
     *      This is purely for record-keeping and trust scoring
     * @param merchant merchant
     * @param paymentToken paymentToken
     * @param paymentAmount paymentAmount
     * @param orderId orderId
     */
    function recordDirectPayment(address merchant, address paymentToken, uint256 paymentAmount, string calldata orderId) external nonReentrant {
        require(authorizedRecorder[msg.sender], "MCR: not authorized");
        emit DirectPaymentRecorded(msg.sender, merchant, paymentToken, paymentAmount, orderId);
    }

    /**
     * @notice Preview swap quote
     * @dev In production, this would call DEX getAmountsOut()
     * @param tokenIn tokenIn
     * @param amountIn amountIn
     * @return estimatedVfide estimatedVfide
     * @return usdValue usdValue
     * @return path path
     */
    function previewSwap(address tokenIn, uint256 amountIn) external view returns (uint256 estimatedVfide, uint256 usdValue, address[] memory path) {
        TokenRoute storage r = routes[tokenIn];
        require(r.supported, "MCR: token not supported");

        path = r.defaultPath;

        if (path.length == 0) {
            // No swap needed (already VFIDE)
            estimatedVfide = amountIn;
        } else {
            // MP-09: return actual quote when router supports it.
            try ISwapRouter(recommendedRouter).getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
                estimatedVfide = amounts.length > 0 ? amounts[amounts.length - 1] : 0;
            } catch {
                estimatedVfide = 0;
            }
        }

        usdValue = priceOracle.vfideToUsd(estimatedVfide);
    }

    /**
     * @notice Get all supported tokens
     * @return addresses addresses
     * @return symbols symbols
     * @return needsSwap needsSwap
     */
    function getSupportedTokens() external view returns (address[] memory addresses, string[] memory symbols, bool[] memory needsSwap) {
        uint256 count = 0;
        for (uint256 i = 0; i < supportedTokens.length; ++i) {
            if (routes[supportedTokens[i]].supported) ++count;
        }

        addresses = new address[](count);
        symbols = new string[](count);
        needsSwap = new bool[](count);

        uint256 idx = 0;
        for (uint256 i = 0; i < supportedTokens.length; ++i) {
            if (routes[supportedTokens[i]].supported) {
                addresses[idx] = supportedTokens[i];
                symbols[idx] = routes[supportedTokens[i]].symbol;
                needsSwap[idx] = routes[supportedTokens[i]].defaultPath.length > 0;
                ++idx;
            }
        }
    }
}
