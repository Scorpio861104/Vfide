// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./interfaces/AggregatorV3Interface.sol";
import "./SharedInterfaces.sol";

/**
 * @title VFIDEPriceOracle
 * @notice Hybrid oracle system combining Chainlink and Uniswap V3 TWAP
 * @dev Primary: Chainlink price feed, Fallback: Uniswap V3 TWAP
 * 
 * Features:
 * - Chainlink primary feed
 * - Uniswap V3 TWAP fallback
 * - Price staleness checks (2 hour max)
 * - Circuit breaker on manipulation detection
 * - Historical price tracking
 * - Price deviation monitoring
 */
// ReentrancyGuard intentionally omitted: oracle update path stores rates and emits events without transfer calls.
contract VFIDEPriceOracle is Ownable, Pausable {
    /// @notice Chainlink price feed
    AggregatorV3Interface public chainlinkFeed;

    /// @notice Uniswap V3 pool for TWAP
    address public uniswapPool;

    /// @notice VFIDE token address
    address public immutable vfideToken;

    /// @notice Quote token address (USDC/WETH)
    address public immutable quoteToken;

    /// @notice TWAP period (1 hour)
    uint32 public constant TWAP_PERIOD = 1 hours;

    /// @notice Maximum price staleness (2 hours)
    uint256 public constant MAX_PRICE_STALENESS = 2 hours;

    /// @notice Price deviation threshold (10%)
    uint256 public constant MAX_PRICE_DEVIATION = 1000; // 10% in basis points

    /// @notice Minimum price update interval (5 minutes)
    uint256 public constant MIN_UPDATE_INTERVAL = 5 minutes;

    /// @notice Circuit breaker cooldown (1 hour)
    uint256 public constant CIRCUIT_BREAKER_COOLDOWN = 1 hours;

    /// @notice Last price update
    uint256 public lastUpdate;

    /// @notice Last recorded price
    uint256 public lastPrice;

    /// @notice Circuit breaker active
    bool public circuitBreakerActive;

    /// @notice Circuit breaker activated time
    uint256 public circuitBreakerTime;

    /// @notice Timelock delay for oracle feed configuration changes (48 hours)
    uint64 public constant ORACLE_CONFIG_DELAY = 48 hours;

    /// @notice Pending Chainlink feed change
    address public pendingChainlinkFeed;
    uint64  public pendingChainlinkFeedAt;

    /// @notice Pending Uniswap pool change
    address public pendingUniswapPool;
    uint64  public pendingUniswapPoolAt;

    /// @notice Historical prices
    mapping(uint256 => PricePoint) public historicalPrices;
    uint256 public pricePointCount;

    struct PricePoint {
        uint256 price;
        uint256 timestamp;
        PriceSource source;
    }

    enum PriceSource {
        CHAINLINK,
        UNISWAP,
        MANUAL
    }

    // Events
    event PriceUpdated(
        uint256 indexed price,
        PriceSource indexed source,
        uint256 timestamp
    );
    event CircuitBreakerTriggered(
        uint256 oldPrice,
        uint256 newPrice,
        uint256 deviation
    );
    event CircuitBreakerReset();
    event ChainlinkFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event ChainlinkFeedScheduled(address indexed pendingFeed, uint64 effectiveAt);
    event UniswapPoolUpdated(address indexed oldPool, address indexed newPool);
    event UniswapPoolScheduled(address indexed pendingPool, uint64 effectiveAt);

    error PriceStale();
    error InvalidPrice();
    error CircuitBreakerActive();
    error PriceManipulation();
    error UpdateTooFrequent();

    // Custom Ownable has no renounceOwnership — no override needed
    /**
     * @notice Constructor
     * @param _vfideToken VFIDE token address
     * @param _quoteToken Quote token address (USDC/WETH)
     * @param _chainlinkFeed Chainlink price feed address
     * @param _uniswapPool Uniswap V3 pool address
     * @param _owner Owner address
     */
    constructor(
        address _vfideToken,
        address _quoteToken,
        address _chainlinkFeed,
        address _uniswapPool,
        address _owner
    ) {
        require(_vfideToken != address(0), "Invalid VFIDE token");
        require(_quoteToken != address(0), "Invalid quote token");
        require(_owner != address(0), "Invalid owner");
        owner = _owner; // H-18: Override default msg.sender
        
        vfideToken = _vfideToken;
        quoteToken = _quoteToken;
        
        if (_chainlinkFeed != address(0)) {
            chainlinkFeed = AggregatorV3Interface(_chainlinkFeed);
        }
        
        if (_uniswapPool != address(0)) {
            uniswapPool = _uniswapPool;
        }
    }

    /**
     * @notice Get current VFIDE price
     * @return price Price in quote token (18 decimals)
     * @return source Price source used
     */
    function getPrice() external view returns (uint256 price, PriceSource source) {
        if (circuitBreakerActive) {
            if (block.timestamp < circuitBreakerTime + CIRCUIT_BREAKER_COOLDOWN) {
                revert CircuitBreakerActive();
            }
        }

        // Try Chainlink first
        (price, source) = _getChainlinkPrice();
        
        // Fallback to Uniswap TWAP if Chainlink fails
        if (price == 0) {
            (price, source) = _getUniswapPrice();
        }

        if (price == 0) revert InvalidPrice();

        return (price, source);
    }

    /**
     * @notice Get price from Chainlink
     * @return price Chainlink price
     * @return source Price source
     */
    function _getChainlinkPrice() internal view returns (uint256 price, PriceSource source) {
        if (address(chainlinkFeed) == address(0)) {
            return (0, PriceSource.CHAINLINK);
        }

        try chainlinkFeed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // Reject invalid rounds with missing timestamps
            if (startedAt == 0 || updatedAt == 0) {
                return (0, PriceSource.CHAINLINK);
            }

            // Check if price is stale
            if (block.timestamp - updatedAt > MAX_PRICE_STALENESS) {
                return (0, PriceSource.CHAINLINK);
            }

            // Check for invalid price
            if (answer <= 0) {
                return (0, PriceSource.CHAINLINK);
            }

            // Check for incomplete round
            if (answeredInRound < roundId) {
                return (0, PriceSource.CHAINLINK);
            }

            // Convert to 18 decimals using a single scale factor.
            uint8 decimals = chainlinkFeed.decimals();
            uint256 scaleFactor = 10 ** uint256(decimals);
            uint256 chainlinkPrice = (uint256(answer) * 1e18) / scaleFactor;

            return (chainlinkPrice, PriceSource.CHAINLINK);
        } catch {
            return (0, PriceSource.CHAINLINK);
        }
    }

    /**
     * @notice Get price from Uniswap V3 TWAP
     * @return price Uniswap TWAP price
     * @return source Price source
     */
    function _getUniswapPrice() internal view returns (uint256 price, PriceSource source) {
        if (uniswapPool == address(0)) {
            return (0, PriceSource.UNISWAP);
        }

        // Uniswap TWAP integration is currently disabled in favor of Chainlink-only pricing.
        // Keeping the pool address allows future upgrades without breaking storage layout.
        return (0, PriceSource.UNISWAP);
    }

    /**
     * @notice Update price and check for manipulation
     */
    function updatePrice() external whenNotPaused {
        if (block.timestamp < lastUpdate + MIN_UPDATE_INTERVAL) {
            revert UpdateTooFrequent();
        }

        (uint256 newPrice, PriceSource source) = this.getPrice();

        // Check for price manipulation if we have a previous price
        if (lastPrice > 0) {
            uint256 deviation = _calculateDeviation(lastPrice, newPrice);
            
            if (deviation > MAX_PRICE_DEVIATION) {
                circuitBreakerActive = true;
                circuitBreakerTime = block.timestamp;
                emit CircuitBreakerTriggered(lastPrice, newPrice, deviation);
                // Fail-closed: keep circuit breaker state and skip price update.
                return;
            }
        }

        // Record price
        lastPrice = newPrice;
        lastUpdate = block.timestamp;

        // Store historical price
        historicalPrices[pricePointCount] = PricePoint({
            price: newPrice,
            timestamp: block.timestamp,
            source: source
        });
        pricePointCount++;

        emit PriceUpdated(newPrice, source, block.timestamp);
    }

    /**
     * @notice Calculate price deviation in basis points
     * @param oldPrice Old price
     * @param newPrice New price
     * @return deviation Deviation in basis points
     */
    function _calculateDeviation(
        uint256 oldPrice,
        uint256 newPrice
    ) internal pure returns (uint256 deviation) {
        uint256 diff = oldPrice > newPrice
            ? oldPrice - newPrice
            : newPrice - oldPrice;
        
        deviation = (diff * 10000) / oldPrice;
        return deviation;
    }

    /**
     * @notice Reset circuit breaker (owner only)
     */
    function resetCircuitBreaker() external onlyOwner {
        circuitBreakerActive = false;
        circuitBreakerTime = 0;
        emit CircuitBreakerReset();
    }

    /**
     * @notice Schedule a Chainlink feed update (takes effect after 48h timelock)
     * @param _chainlinkFeed New Chainlink feed address
     */
    function setChainlinkFeed(address _chainlinkFeed) external onlyOwner {
        require(_chainlinkFeed != address(0), "VFIDEPriceOracle: invalid feed");
        uint64 effectiveAt = uint64(block.timestamp) + ORACLE_CONFIG_DELAY;
        pendingChainlinkFeed = _chainlinkFeed;
        pendingChainlinkFeedAt = effectiveAt;
        emit ChainlinkFeedScheduled(_chainlinkFeed, effectiveAt);
    }

    /**
     * @notice Apply a scheduled Chainlink feed update after the timelock has elapsed
     */
    function applyChainlinkFeed() external onlyOwner {
        require(pendingChainlinkFeedAt != 0, "VFIDEPriceOracle: no pending update");
        require(block.timestamp >= pendingChainlinkFeedAt, "VFIDEPriceOracle: timelock not elapsed");
        address oldFeed = address(chainlinkFeed);
        chainlinkFeed = AggregatorV3Interface(pendingChainlinkFeed);
        emit ChainlinkFeedUpdated(oldFeed, pendingChainlinkFeed);
        delete pendingChainlinkFeed;
        delete pendingChainlinkFeedAt;
    }

    /**
     * @notice Schedule a Uniswap pool update (takes effect after 48h timelock)
     * @param _uniswapPool New Uniswap pool address
     */
    function setUniswapPool(address _uniswapPool) external onlyOwner {
        require(_uniswapPool != address(0), "VFIDEPriceOracle: invalid pool");
        uint64 effectiveAt = uint64(block.timestamp) + ORACLE_CONFIG_DELAY;
        pendingUniswapPool = _uniswapPool;
        pendingUniswapPoolAt = effectiveAt;
        emit UniswapPoolScheduled(_uniswapPool, effectiveAt);
    }

    /**
     * @notice Apply a scheduled Uniswap pool update after the timelock has elapsed
     */
    function applyUniswapPool() external onlyOwner {
        require(pendingUniswapPoolAt != 0, "VFIDEPriceOracle: no pending update");
        require(block.timestamp >= pendingUniswapPoolAt, "VFIDEPriceOracle: timelock not elapsed");
        address oldPool = uniswapPool;
        uniswapPool = pendingUniswapPool;
        emit UniswapPoolUpdated(oldPool, pendingUniswapPool);
        delete pendingUniswapPool;
        delete pendingUniswapPoolAt;
    }

    /**
     * @notice Get historical price
     * @param index Price point index
     * @return pricePoint Historical price point
     */
    function getHistoricalPrice(uint256 index) external view returns (PricePoint memory) {
        require(index < pricePointCount, "Invalid index");
        return historicalPrices[index];
    }

    /**
     * @notice Get recent prices
     * @param count Number of recent prices to fetch
     * @return prices Array of recent prices
     */
    function getRecentPrices(uint256 count) external view returns (PricePoint[] memory prices) {
        uint256 returnCount = count > pricePointCount ? pricePointCount : count;
        prices = new PricePoint[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            prices[i] = historicalPrices[pricePointCount - returnCount + i];
        }
        
        return prices;
    }

    /**
     * @notice Pause oracle
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause oracle
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
