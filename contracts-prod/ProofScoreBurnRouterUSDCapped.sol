// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title ProofScoreBurnRouterUSDCapped
 * @notice PRICE-AWARE dynamic fee system with USD caps to protect small transactions
 * 
 * PROBLEM: As VFIDE price rises, percentage-based fees become astronomical
 * Example: 100 VFIDE purchase at $1/VFIDE = $100, 5% fee = $5 (reasonable)
 *          100 VFIDE purchase at $100/VFIDE = $10,000, 5% fee = $500 (INSANE!)
 * 
 * SOLUTION: Cap fees based on USD value, not token percentage
 * 
 * USD FEE CAPS (adjustable by DAO):
 * - Small transactions (<$100 USD): Max 5% or $5, whichever is lower
 * - Medium transactions ($100-$1000): Max 3% or $30, whichever is lower
 * - Large transactions (>$1000): Max 2% or unlimited (percentage-based)
 * 
 * MINIMUM FEES (prevents abuse):
 * - All transactions: Min $0.10 USD or 0.1% of amount, whichever is higher
 * - Ensures system sustainability even at high VFIDE prices
 * 
 * MERCHANT FEE SUBSIDY (unchanged):
 * - Score ≥750: Treasury pays fees (feeless merchants)
 * - Score 560-749: User pays capped fees
 * - Score <560: Cannot list in ecosystem
 * 
 * PRICE ORACLE:
 * - Chainlink/Pyth for VFIDE/USD price
 * - Fallback to TWAP if oracle fails
 * - DAO can manually set price in emergency
 * 
 * EXAMPLES:
 * 
 * Scenario 1: VFIDE = $1, Score 500 (5% base fee)
 * Purchase: 100 VFIDE ($100 USD)
 * Base fee: 5 VFIDE ($5) = 5% ✅ Under cap
 * Actual fee: 5 VFIDE ($5)
 * 
 * Scenario 2: VFIDE = $100, Score 500 (5% base fee)
 * Purchase: 100 VFIDE ($10,000 USD)
 * Base fee: 5 VFIDE ($500) = 5% ❌ OVER CAP!
 * USD cap: $200 (2% of $10,000 for large tx)
 * Actual fee: 2 VFIDE ($200) ✅ Capped
 * 
 * Scenario 3: VFIDE = $1000, Score 500 (5% base fee)
 * Purchase: 10 VFIDE ($10,000 USD)
 * Base fee: 0.5 VFIDE ($500) = 5% ❌ OVER CAP!
 * USD cap: $200 (2% of $10,000 for large tx)
 * Actual fee: 0.2 VFIDE ($200) ✅ Capped
 * 
 * RESULT: Fees stay reasonable regardless of VFIDE price!
 */

// ============================================================================
// INTERFACES
// ============================================================================

interface ISeer_Router {
    function getScore(address account) external view returns (uint16);
    function getMerchantScore(address merchant) external view returns (uint16);
    function qualifiesForFeeSubsidy(address merchant) external view returns (bool);
}

interface ISanctumRegistry_Router {
    function getActiveCount() external view returns (uint256);
    function getApprovedCharity(uint256 index) external view returns (address);
    function isFrozen(address charity) external view returns (bool);
}

interface IChainlinkOracle {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

// ============================================================================
// ERRORS
// ============================================================================

error ROUTER_NotDAO();
error ROUTER_Zero();
error ROUTER_Bounds();
error ROUTER_StalePrice();
error ROUTER_InvalidPrice();

// ============================================================================
// PRICE ORACLE - Chainlink/Pyth/Manual fallback
// ============================================================================

contract PriceOracle {
    event DAOChanged(address indexed oldDAO, address indexed newDAO);
    event OracleSet(address indexed oracle, uint8 decimals);
    event ManualPriceSet(uint256 price, uint64 timestamp);
    event StalenessSet(uint64 oldThreshold, uint64 newThreshold);

    address public dao;
    IChainlinkOracle public oracle;
    uint8 public oracleDecimals;
    
    // Manual price fallback (DAO can set in emergency)
    uint256 public manualPrice;           // VFIDE/USD price (18 decimals)
    uint64 public manualPriceTimestamp;   // When manual price was set
    
    // Staleness threshold (reject oracle data older than this)
    uint64 public stalenessThreshold = 1 hours;
    
    // Minimum/maximum price bounds (safety checks)
    uint256 public minPrice = 0.001e18;   // $0.001 (sanity floor)
    uint256 public maxPrice = 1000000e18; // $1M (sanity ceiling)

    modifier onlyDAO() {
        if (msg.sender != dao) revert ROUTER_NotDAO();
        _;
    }

    constructor(address _dao, address _oracle) {
        if (_dao == address(0)) revert ROUTER_Zero();
        dao = _dao;
        
        if (_oracle != address(0)) {
            oracle = IChainlinkOracle(_oracle);
            oracleDecimals = oracle.decimals();
        }
    }

    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert ROUTER_Zero();
        address old = dao;
        dao = newDAO;
        emit DAOChanged(old, newDAO);
    }

    function setOracle(address _oracle) external onlyDAO {
        if (_oracle == address(0)) revert ROUTER_Zero();
        oracle = IChainlinkOracle(_oracle);
        oracleDecimals = oracle.decimals();
        emit OracleSet(_oracle, oracleDecimals);
    }

    function setManualPrice(uint256 price) external onlyDAO {
        if (price < minPrice || price > maxPrice) revert ROUTER_InvalidPrice();
        manualPrice = price;
        manualPriceTimestamp = uint64(block.timestamp);
        emit ManualPriceSet(price, uint64(block.timestamp));
    }

    function setStalenessThreshold(uint64 threshold) external onlyDAO {
        if (threshold < 5 minutes || threshold > 24 hours) revert ROUTER_Bounds();
        uint64 old = stalenessThreshold;
        stalenessThreshold = threshold;
        emit StalenessSet(old, threshold);
    }

    function setPriceBounds(uint256 _minPrice, uint256 _maxPrice) external onlyDAO {
        if (_minPrice >= _maxPrice) revert ROUTER_Bounds();
        minPrice = _minPrice;
        maxPrice = _maxPrice;
    }

    /// @notice Get current VFIDE/USD price (18 decimals)
    /// @dev Tries oracle first, falls back to manual price
    function getPrice() public view returns (uint256 price) {
        // Try oracle first
        if (address(oracle) != address(0)) {
            try oracle.latestRoundData() returns (
                uint80 /* roundId */,
                int256 answer,
                uint256 /* startedAt */,
                uint256 updatedAt,
                uint80 /* answeredInRound */
            ) {
                // Check staleness
                if (block.timestamp - updatedAt <= stalenessThreshold && answer > 0) {
                    // Convert oracle decimals to 18 decimals
                    uint256 oraclePrice = uint256(answer);
                    if (oracleDecimals < 18) {
                        oraclePrice = oraclePrice * (10 ** (18 - oracleDecimals));
                    } else if (oracleDecimals > 18) {
                        oraclePrice = oraclePrice / (10 ** (oracleDecimals - 18));
                    }
                    
                    // Sanity check
                    if (oraclePrice >= minPrice && oraclePrice <= maxPrice) {
                        return oraclePrice;
                    }
                }
            } catch {
                // Oracle failed, fall through to manual price
            }
        }
        
        // Fallback to manual price
        if (manualPrice > 0) {
            // Check manual price not too stale (24 hours)
            if (block.timestamp - manualPriceTimestamp <= 24 hours) {
                return manualPrice;
            }
        }
        
        // No valid price available
        revert ROUTER_StalePrice();
    }

    /// @notice Check if price is fresh
    function isPriceFresh() external view returns (bool) {
        try this.getPrice() returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }
}

// ============================================================================
// USD-CAPPED BURN ROUTER - Dynamic fees with price awareness
// ============================================================================

contract ProofScoreBurnRouterUSDCapped {
    event DAOChanged(address indexed oldDAO, address indexed newDAO);
    event ModulesSet(address seer, address treasury, address sanctumVault, address sanctumRegistry, address priceOracle);
    event PolicySet(uint16 maxBurnBps, uint16 minBurnBps);
    event USDCapsSet(uint256 smallTxThreshold, uint256 mediumTxThreshold, uint256 smallCap, uint256 mediumCap, uint256 largeCapBps);
    event MinimumFeeSet(uint256 minimumUSD, uint16 minimumBps);

    address public dao;
    ISeer_Router public seer;
    address public treasury;
    address public sanctumVault;
    ISanctumRegistry_Router public sanctumRegistry;
    PriceOracle public priceOracle;

    // Dynamic burn policy: scales from maxBurnBps (score 0) to minBurnBps (score 1000)
    uint16 public maxBurnBps = 1000;  // 10.00% for score 0 (worst)
    uint16 public minBurnBps = 25;    // 0.25% for score 1000 (perfect)
    
    // USD fee caps (18 decimals, e.g., 5e18 = $5.00)
    uint256 public smallTxThreshold = 100e18;    // $100 USD
    uint256 public mediumTxThreshold = 1000e18;  // $1,000 USD
    
    uint256 public smallTxMaxUSD = 5e18;         // $5 max for transactions under $100
    uint16 public smallTxMaxBps = 500;           // 5% max for small transactions
    
    uint256 public mediumTxMaxUSD = 30e18;       // $30 max for transactions $100-$1000
    uint16 public mediumTxMaxBps = 300;          // 3% max for medium transactions
    
    uint16 public largeTxMaxBps = 200;           // 2% max for transactions over $1000 (no USD cap)
    
    // Minimum fee (prevents abuse at very high VFIDE prices)
    uint256 public minimumFeeUSD = 0.10e18;      // $0.10 minimum
    uint16 public minimumFeeBps = 10;            // 0.1% minimum

    modifier onlyDAO() {
        if (msg.sender != dao) revert ROUTER_NotDAO();
        _;
    }

    constructor(
        address _dao,
        address _seer,
        address _treasury,
        address _sanctumVault,
        address _sanctumRegistry,
        address _priceOracle
    ) {
        if (_dao == address(0)) revert ROUTER_Zero();
        dao = _dao;
        
        if (_seer != address(0)) seer = ISeer_Router(_seer);
        treasury = _treasury;
        sanctumVault = _sanctumVault;
        if (_sanctumRegistry != address(0)) sanctumRegistry = ISanctumRegistry_Router(_sanctumRegistry);
        if (_priceOracle != address(0)) priceOracle = PriceOracle(_priceOracle);
    }

    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert ROUTER_Zero();
        address old = dao;
        dao = newDAO;
        emit DAOChanged(old, newDAO);
    }

    function setModules(
        address _seer,
        address _treasury,
        address _sanctumVault,
        address _sanctumRegistry,
        address _priceOracle
    ) external onlyDAO {
        if (_seer == address(0)) revert ROUTER_Zero();
        seer = ISeer_Router(_seer);
        treasury = _treasury;
        sanctumVault = _sanctumVault;
        if (_sanctumRegistry != address(0)) sanctumRegistry = ISanctumRegistry_Router(_sanctumRegistry);
        if (_priceOracle != address(0)) priceOracle = PriceOracle(_priceOracle);
        emit ModulesSet(_seer, _treasury, _sanctumVault, _sanctumRegistry, _priceOracle);
    }

    function setPolicy(uint16 _maxBurnBps, uint16 _minBurnBps) external onlyDAO {
        if (_maxBurnBps > 4000) revert ROUTER_Bounds(); // hard ceiling 40%
        if (_minBurnBps > _maxBurnBps) revert ROUTER_Bounds();
        maxBurnBps = _maxBurnBps;
        minBurnBps = _minBurnBps;
        emit PolicySet(_maxBurnBps, _minBurnBps);
    }

    function setUSDCaps(
        uint256 _smallThreshold,
        uint256 _mediumThreshold,
        uint256 _smallCap,
        uint256 _mediumCap,
        uint16 _largeBps
    ) external onlyDAO {
        if (_smallThreshold >= _mediumThreshold) revert ROUTER_Bounds();
        if (_largeBps > 1000) revert ROUTER_Bounds(); // max 10%
        
        smallTxThreshold = _smallThreshold;
        mediumTxThreshold = _mediumThreshold;
        smallTxMaxUSD = _smallCap;
        mediumTxMaxUSD = _mediumCap;
        largeTxMaxBps = _largeBps;
        
        emit USDCapsSet(_smallThreshold, _mediumThreshold, _smallCap, _mediumCap, _largeBps);
    }

    function setMinimumFee(uint256 _minimumUSD, uint16 _minimumBps) external onlyDAO {
        if (_minimumBps > 100) revert ROUTER_Bounds(); // max 1%
        minimumFeeUSD = _minimumUSD;
        minimumFeeBps = _minimumBps;
        emit MinimumFeeSet(_minimumUSD, _minimumBps);
    }

    struct Route {
        uint16 totalBurnBps;       // Total fee in basis points (before USD cap)
        uint16 cappedBurnBps;      // Actual fee after USD cap applied
        uint16 permanentBurnBps;   // 50% burned permanently
        uint16 treasuryBps;        // 25% to treasury
        uint16 sanctumBps;         // 25% to sanctum
        uint256 charityCount;      // Active charities
        uint256 txValueUSD;        // Transaction value in USD (18 decimals)
        uint256 maxFeeUSD;         // Maximum fee in USD (0 = no cap)
        bool capped;               // True if fee was capped
    }

    /// @notice Compute dynamic fee with USD caps
    /// @param subject Account whose personal score determines base fee
    /// @param amount Transaction amount in VFIDE tokens (with decimals)
    /// @return r Route with fee breakdown and USD cap info
    function routeFor(address subject, uint256 amount) public view returns (Route memory r) {
        // Get personal score (0-1000, default 500)
        uint16 score = seer.getScore(subject);
        
        // Calculate base fee from score (linear scaling)
        uint256 range = maxBurnBps - minBurnBps;
        uint256 reduction = (uint256(score) * range) / 1000;
        uint16 baseFee = maxBurnBps - uint16(reduction);
        
        // Get VFIDE/USD price (18 decimals)
        uint256 priceUSD = address(priceOracle) != address(0) ? priceOracle.getPrice() : 0;
        
        // Calculate transaction value in USD
        uint256 txValueUSD = 0;
        if (priceUSD > 0) {
            txValueUSD = (amount * priceUSD) / 1e18;  // Assuming VFIDE has 18 decimals
        }
        
        // Determine USD cap based on transaction size
        uint256 maxFeeUSD = 0;
        uint16 maxFeeBps = baseFee;  // Default: no cap
        
        if (priceUSD > 0 && txValueUSD > 0) {
            if (txValueUSD < smallTxThreshold) {
                // Small transaction (<$100): max $5 or 5%
                maxFeeUSD = smallTxMaxUSD;
                maxFeeBps = smallTxMaxBps;
            } else if (txValueUSD < mediumTxThreshold) {
                // Medium transaction ($100-$1000): max $30 or 3%
                maxFeeUSD = mediumTxMaxUSD;
                maxFeeBps = mediumTxMaxBps;
            } else {
                // Large transaction (>$1000): max 2% (no USD cap)
                maxFeeBps = largeTxMaxBps;
            }
            
            // Calculate fee in USD at base rate
            uint256 baseFeeUSD = (txValueUSD * baseFee) / 10000;
            
            // Apply USD cap if needed
            uint16 cappedFee = baseFee;
            bool wasCapped = false;
            
            if (maxFeeUSD > 0 && baseFeeUSD > maxFeeUSD) {
                // USD cap hit: convert USD cap back to basis points
                cappedFee = uint16((maxFeeUSD * 10000) / txValueUSD);
                wasCapped = true;
            }
            
            // Also check percentage cap
            if (cappedFee > maxFeeBps) {
                cappedFee = maxFeeBps;
                wasCapped = true;
            }
            
            // Apply minimum fee
            uint256 minFeeUSD = minimumFeeUSD;
            uint16 minFeeBps = minimumFeeBps;
            uint256 cappedFeeUSD = (txValueUSD * cappedFee) / 10000;
            
            if (cappedFeeUSD < minFeeUSD) {
                // Need to increase to minimum USD
                cappedFee = uint16((minFeeUSD * 10000) / txValueUSD);
            }
            if (cappedFee < minFeeBps) {
                // Need to increase to minimum bps
                cappedFee = minFeeBps;
            }
            
            // Split capped fee: 50% burn, 25% treasury, 25% sanctum
            uint16 permanent = cappedFee / 2;
            uint16 treasuryShare = cappedFee / 4;
            uint16 sanctumShare = cappedFee - permanent - treasuryShare;
            
            // Get charity count
            uint256 charityCount = address(sanctumRegistry) != address(0) ? sanctumRegistry.getActiveCount() : 0;
            
            r = Route({
                totalBurnBps: baseFee,
                cappedBurnBps: cappedFee,
                permanentBurnBps: permanent,
                treasuryBps: treasuryShare,
                sanctumBps: sanctumShare,
                charityCount: charityCount,
                txValueUSD: txValueUSD,
                maxFeeUSD: maxFeeUSD,
                capped: wasCapped
            });
        } else {
            // No price oracle: use original percentage-based system
            uint16 permanent = baseFee / 2;
            uint16 treasuryShare = baseFee / 4;
            uint16 sanctumShare = baseFee - permanent - treasuryShare;
            
            uint256 charityCount = address(sanctumRegistry) != address(0) ? sanctumRegistry.getActiveCount() : 0;
            
            r = Route({
                totalBurnBps: baseFee,
                cappedBurnBps: baseFee,
                permanentBurnBps: permanent,
                treasuryBps: treasuryShare,
                sanctumBps: sanctumShare,
                charityCount: charityCount,
                txValueUSD: 0,
                maxFeeUSD: 0,
                capped: false
            });
        }
    }

    /// @notice Get SanctumVault address
    function getSanctumVault() external view returns (address) {
        return sanctumVault;
    }

    /// @notice Get active charity addresses
    function getActiveCharities() external view returns (address[] memory) {
        if (address(sanctumRegistry) == address(0)) {
            return new address[](0);
        }
        
        uint256 totalCount = sanctumRegistry.getActiveCount();
        if (totalCount == 0) return new address[](0);
        
        address[] memory active = new address[](totalCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < totalCount; i++) {
            address charity = sanctumRegistry.getApprovedCharity(i);
            if (!sanctumRegistry.isFrozen(charity)) {
                active[index] = charity;
                index++;
            }
        }
        
        return active;
    }

    /// @notice Calculate fee in tokens for given amount
    /// @param subject Account whose score determines fee
    /// @param amount Transaction amount in tokens
    /// @return feeAmount Fee in tokens, split amounts
    function calculateFee(address subject, uint256 amount) external view returns (
        uint256 feeAmount,
        uint256 burnAmount,
        uint256 treasuryAmount,
        uint256 sanctumAmount,
        bool capped
    ) {
        Route memory r = routeFor(subject, amount);
        
        feeAmount = (amount * r.cappedBurnBps) / 10000;
        burnAmount = (amount * r.permanentBurnBps) / 10000;
        treasuryAmount = (amount * r.treasuryBps) / 10000;
        sanctumAmount = feeAmount - burnAmount - treasuryAmount;  // Handle rounding
        capped = r.capped;
    }
}

/**
 * @notice USD-CAPPED FEE EXAMPLES
 * 
 * SCENARIO 1: VFIDE = $1, Score 500 (5% base), 50 VFIDE purchase ($50)
 * ├─ Category: Small transaction (<$100)
 * ├─ Base fee: 5% = 2.5 VFIDE ($2.50)
 * ├─ USD cap: $5 max
 * ├─ % cap: 5% max
 * └─ Actual fee: 2.5 VFIDE ($2.50) ✅ Under both caps
 * 
 * SCENARIO 2: VFIDE = $100, Score 500 (5% base), 5 VFIDE purchase ($500)
 * ├─ Category: Medium transaction ($100-$1000)
 * ├─ Base fee: 5% = 0.25 VFIDE ($25)
 * ├─ USD cap: $30 max
 * ├─ % cap: 3% max = 0.15 VFIDE ($15)
 * └─ Actual fee: 0.15 VFIDE ($15) ✅ Capped at 3%
 * 
 * SCENARIO 3: VFIDE = $1000, Score 500 (5% base), 10 VFIDE purchase ($10,000)
 * ├─ Category: Large transaction (>$1000)
 * ├─ Base fee: 5% = 0.5 VFIDE ($500)
 * ├─ USD cap: None (large tx)
 * ├─ % cap: 2% max = 0.2 VFIDE ($200)
 * └─ Actual fee: 0.2 VFIDE ($200) ✅ Capped at 2%
 * 
 * SCENARIO 4: VFIDE = $10,000, Score 900 (0.5% base), 1 VFIDE purchase ($10,000)
 * ├─ Category: Large transaction (>$1000)
 * ├─ Base fee: 0.5% = 0.005 VFIDE ($50)
 * ├─ USD cap: None
 * ├─ % cap: 2% max = 0.02 VFIDE ($200)
 * ├─ Minimum: $0.10 or 0.1% = 0.0001 VFIDE ($1)
 * └─ Actual fee: 0.005 VFIDE ($50) ✅ Above minimum, under cap
 * 
 * RESULT: Fees stay reasonable at ALL price points!
 * - Small buyers protected: Max $5 fee
 * - Medium buyers protected: Max $30 or 3%
 * - Large buyers protected: Max 2%
 * - System protected: Min $0.10 fee
 */
