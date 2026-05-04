// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./interfaces/AggregatorV3Interface.sol";
import "./SharedInterfaces.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./libraries/uniswapv3/FullMath.sol";
import "./libraries/uniswapv3/TickMath.sol";

interface IUniswapV3PoolLite {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}

interface IERC20DecimalsOracle {
    function decimals() external view returns (uint8);
}

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
    using Math for uint256;

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

    /// @notice Source used for the last validated price update
    PriceSource public lastPriceSource;

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

    /// @notice Pending manual price (timelocked) used as last-resort fallback.
    uint256 public pendingManualPrice;
    uint64  public pendingManualPriceAt;

    /// @notice Active manual fallback price and status.
    uint256 public manualPrice;
    bool public manualPriceActive;

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
    event ManualPriceScheduled(uint256 indexed pendingPrice, uint64 effectiveAt);
    event ManualPriceApplied(uint256 indexed price);
    event ManualPriceDisabled();

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
        if (lastPrice > 0) {
            if (block.timestamp > lastUpdate + MAX_PRICE_STALENESS) {
                revert PriceStale();
            }
            return (lastPrice, lastPriceSource);
        }

        return _getLivePrice();
    }

    function _getLivePrice() internal view returns (uint256 price, PriceSource source) {
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

        // Last-resort fallback to a timelocked owner-set manual price.
        if (price == 0 && manualPriceActive && manualPrice > 0) {
            price = manualPrice;
            source = PriceSource.MANUAL;
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

            // Convert to 18 decimals
            uint8 decimals;
            try chainlinkFeed.decimals() returns (uint8 d) {
                decimals = d;
            } catch {
                return (0, PriceSource.CHAINLINK);
            }
            uint256 chainlinkPrice = uint256(answer);

            if (decimals < 18) {
                chainlinkPrice = chainlinkPrice * 10 ** (18 - decimals);
            } else if (decimals > 18) {
                chainlinkPrice = chainlinkPrice / 10 ** (decimals - 18);
            }

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

        IUniswapV3PoolLite pool = IUniswapV3PoolLite(uniswapPool);
        address token0;
        address token1;
        try pool.token0() returns (address t0) {
            token0 = t0;
        } catch {
            return (0, PriceSource.UNISWAP);
        }
        try pool.token1() returns (address t1) {
            token1 = t1;
        } catch {
            return (0, PriceSource.UNISWAP);
        }

        bool vfideIsToken0 = vfideToken == token0 && quoteToken == token1;
        bool vfideIsToken1 = vfideToken == token1 && quoteToken == token0;
        if (!vfideIsToken0 && !vfideIsToken1) {
            return (0, PriceSource.UNISWAP);
        }

        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = TWAP_PERIOD;
        secondsAgos[1] = 0;

        int56[] memory tickCumulatives;
        try pool.observe(secondsAgos) returns (
            int56[] memory observedTickCumulatives,
            uint160[] memory
        ) {
            tickCumulatives = observedTickCumulatives;
        } catch {
            return (0, PriceSource.UNISWAP);
        }

        if (tickCumulatives.length != 2) {
            return (0, PriceSource.UNISWAP);
        }

        (uint8 vfideDecimals, bool vfideDecimalsOk) = _getTokenDecimals(vfideToken);
        (uint8 quoteDecimals, bool quoteDecimalsOk) = _getTokenDecimals(quoteToken);
        if (!vfideDecimalsOk || !quoteDecimalsOk || vfideDecimals > 36 || quoteDecimals > 36) {
            return (0, PriceSource.UNISWAP);
        }

        int56 tickDelta = tickCumulatives[1] - tickCumulatives[0];
        int56 period = int56(uint56(TWAP_PERIOD));
        int24 arithmeticMeanTick = int24(tickDelta / period);
        if (tickDelta < 0 && (tickDelta % period != 0)) {
            arithmeticMeanTick--;
        }

        uint256 vfideUnit = 10 ** uint256(vfideDecimals);
        if (vfideUnit > type(uint128).max) {
            return (0, PriceSource.UNISWAP);
        }
        price = _getQuoteAtTick(arithmeticMeanTick, uint128(vfideUnit), vfideToken, quoteToken);
        if (quoteDecimals < 18) {
            price = price * 10 ** uint256(18 - quoteDecimals);
        } else if (quoteDecimals > 18) {
            price = price / 10 ** uint256(quoteDecimals - 18);
        }

        if (price == 0) {
            return (0, PriceSource.UNISWAP);
        }

        return (price, PriceSource.UNISWAP);
    }

    function _getQuoteAtTick(int24 tick, uint128 baseAmount, address baseToken, address quoteToken_)
        internal
        pure
        returns (uint256 quoteAmount)
    {
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);

        if (sqrtRatioX96 <= type(uint128).max) {
            uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
            quoteAmount = baseToken < quoteToken_
                ? FullMath.mulDiv(ratioX192, baseAmount, 1 << 192)
                : FullMath.mulDiv(1 << 192, baseAmount, ratioX192);
        } else {
            uint256 ratioX128 = FullMath.mulDiv(sqrtRatioX96, sqrtRatioX96, 1 << 64);
            quoteAmount = baseToken < quoteToken_
                ? FullMath.mulDiv(ratioX128, baseAmount, 1 << 128)
                : FullMath.mulDiv(1 << 128, baseAmount, ratioX128);
        }
    }

    function _getTokenDecimals(address token) internal view returns (uint8 decimals, bool ok) {
        try IERC20DecimalsOracle(token).decimals() returns (uint8 d) {
            return (d, true);
        } catch {
            return (0, false);
        }
    }

    /**
     * @notice Update price and check for manipulation
     */
    function updatePrice() external whenNotPaused {
        if (block.timestamp < lastUpdate + MIN_UPDATE_INTERVAL) {
            revert UpdateTooFrequent();
        }

        (uint256 newPrice, PriceSource source) = _getLivePrice();

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
        lastPriceSource = source;
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

        uint256 referencePrice = oldPrice < newPrice ? oldPrice : newPrice;
        if (referencePrice == 0) return type(uint256).max;
        
        deviation = (diff * 10000) / referencePrice;
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
     * @notice Schedule a manual fallback price (takes effect after 48h timelock)
     * @param _manualPrice New manual price (18 decimals)
     */
    function setManualPrice(uint256 _manualPrice) external onlyOwner {
        require(_manualPrice > 0, "VFIDEPriceOracle: invalid manual price");
        uint64 effectiveAt = uint64(block.timestamp) + ORACLE_CONFIG_DELAY;
        pendingManualPrice = _manualPrice;
        pendingManualPriceAt = effectiveAt;
        emit ManualPriceScheduled(_manualPrice, effectiveAt);
    }

    /**
     * @notice Apply scheduled manual fallback price after timelock
     */
    function applyManualPrice() external onlyOwner {
        require(pendingManualPriceAt != 0, "VFIDEPriceOracle: no pending manual price");
        require(block.timestamp >= pendingManualPriceAt, "VFIDEPriceOracle: timelock not elapsed");
        manualPrice = pendingManualPrice;
        manualPriceActive = true;
        emit ManualPriceApplied(manualPrice);
        delete pendingManualPrice;
        delete pendingManualPriceAt;
    }

    /**
     * @notice Disable manual fallback price
     */
    function disableManualPrice() external onlyOwner {
        manualPriceActive = false;
        emit ManualPriceDisabled();
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
