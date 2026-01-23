// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/**
 * @title LPTokenTracker
 * @notice Position management and liquidity value tracking
 * @dev Tracks LP positions, calculates values, and monitors IL
 * 
 * Features:
 * - Track LP positions across multiple pools
 * - Calculate liquidity value in real-time
 * - Fee collection tracking
 * - Impermanent loss calculation
 * - Position performance analytics
 */
contract LPTokenTracker is Ownable, ReentrancyGuard {
    /// @notice Position Manager
    address public immutable positionManager;

    /// @notice Price oracle
    address public priceOracle;

    /// @notice Position tracking
    struct PositionData {
        uint256 tokenId;
        address pool;
        address owner;
        uint128 liquidity;
        int24 tickLower;
        int24 tickUpper;
        uint256 initialValue;
        uint256 feesCollected0;
        uint256 feesCollected1;
        uint256 createdAt;
        uint256 lastUpdateTime;
        bool active;
    }

    /// @notice All tracked positions
    mapping(uint256 => PositionData) public positions;

    /// @notice User positions
    mapping(address => uint256[]) public userPositions;

    /// @notice Pool statistics
    mapping(address => PoolStats) public poolStats;

    struct PoolStats {
        uint256 totalLiquidity;
        uint256 totalPositions;
        uint256 totalFeesCollected;
        uint256 averageReturn;
    }

    /// @notice IL tracking
    struct ILData {
        uint256 initialPrice0;
        uint256 initialPrice1;
        uint256 initialAmount0;
        uint256 initialAmount1;
    }

    mapping(uint256 => ILData) public ilTracking;

    // Events
    event PositionTracked(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed pool,
        uint128 liquidity
    );

    event PositionUpdated(
        uint256 indexed tokenId,
        uint128 newLiquidity,
        uint256 fees0,
        uint256 fees1
    );

    event FeesCollected(
        uint256 indexed tokenId,
        uint256 amount0,
        uint256 amount1
    );

    event ILCalculated(
        uint256 indexed tokenId,
        int256 ilPercentage
    );

    error InvalidPosition();
    error NotAuthorized();

    /**
     * @notice Constructor
     * @param _positionManager Position Manager address
     * @param _priceOracle Price Oracle address
     * @param _owner Owner address
     */
    constructor(
        address _positionManager,
        address _priceOracle,
        address _owner
    ) {
        require(_positionManager != address(0), "Invalid position manager");
        positionManager = _positionManager;
        priceOracle = _priceOracle;
        _transferOwnership(_owner);
    }

    /**
     * @notice Track new LP position
     * @param tokenId Position token ID
     */
    function trackPosition(uint256 tokenId) external nonReentrant {
        // Get position details from Position Manager
        (
            ,
            ,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            ,
            ,
            ,
        ) = IPositionManager(positionManager).positions(tokenId);

        if (liquidity == 0) revert InvalidPosition();

        // Calculate pool address
        address pool = _getPoolAddress(token0, token1, fee);

        // Get initial value
        uint256 initialValue = _calculatePositionValue(
            pool,
            liquidity,
            tickLower,
            tickUpper
        );

        // Create position data
        positions[tokenId] = PositionData({
            tokenId: tokenId,
            pool: pool,
            owner: msg.sender,
            liquidity: liquidity,
            tickLower: tickLower,
            tickUpper: tickUpper,
            initialValue: initialValue,
            feesCollected0: 0,
            feesCollected1: 0,
            createdAt: block.timestamp,
            lastUpdateTime: block.timestamp,
            active: true
        });

        // Add to user positions
        userPositions[msg.sender].push(tokenId);

        // Update pool stats
        poolStats[pool].totalLiquidity += liquidity;
        poolStats[pool].totalPositions += 1;

        // Initialize IL tracking
        (uint256 price0, uint256 price1) = _getTokenPrices(token0, token1);
        (uint256 amount0, uint256 amount1) = _getPositionAmounts(
            pool,
            liquidity,
            tickLower,
            tickUpper
        );

        ilTracking[tokenId] = ILData({
            initialPrice0: price0,
            initialPrice1: price1,
            initialAmount0: amount0,
            initialAmount1: amount1
        });

        emit PositionTracked(tokenId, msg.sender, pool, liquidity);
    }

    /**
     * @notice Update position data
     * @param tokenId Position token ID
     */
    function updatePosition(uint256 tokenId) external {
        PositionData storage position = positions[tokenId];
        if (!position.active) revert InvalidPosition();

        // Get current position details
        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        ) = IPositionManager(positionManager).positions(tokenId);

        // Update liquidity
        position.liquidity = liquidity;
        position.lastUpdateTime = block.timestamp;

        // Update fees
        position.feesCollected0 += tokensOwed0;
        position.feesCollected1 += tokensOwed1;

        // Update pool stats
        poolStats[position.pool].totalFeesCollected += tokensOwed0 + tokensOwed1;

        emit PositionUpdated(tokenId, liquidity, tokensOwed0, tokensOwed1);
    }

    /**
     * @notice Calculate current position value
     * @param tokenId Position token ID
     * @return currentValue Current value in USD (18 decimals)
     */
    function getPositionValue(uint256 tokenId) external view returns (uint256 currentValue) {
        PositionData memory position = positions[tokenId];
        if (!position.active) return 0;

        return _calculatePositionValue(
            position.pool,
            position.liquidity,
            position.tickLower,
            position.tickUpper
        );
    }

    /**
     * @notice Calculate impermanent loss
     * @param tokenId Position token ID
     * @return ilPercentage IL as percentage (basis points)
     * @return ilValue Absolute IL value
     */
    function calculateImpermanentLoss(
        uint256 tokenId
    ) external view returns (int256 ilPercentage, uint256 ilValue) {
        PositionData memory position = positions[tokenId];
        if (!position.active) return (0, 0);

        ILData memory ilData = ilTracking[tokenId];

        // Get current amounts
        (uint256 currentAmount0, uint256 currentAmount1) = _getPositionAmounts(
            position.pool,
            position.liquidity,
            position.tickLower,
            position.tickUpper
        );

        // Get current prices
        (address token0, address token1) = _getPoolTokens(position.pool);
        (uint256 currentPrice0, uint256 currentPrice1) = _getTokenPrices(token0, token1);

        // Calculate what value would be if just held
        uint256 holdValue = (ilData.initialAmount0 * currentPrice0) +
                           (ilData.initialAmount1 * currentPrice1);

        // Calculate current LP value
        uint256 lpValue = (currentAmount0 * currentPrice0) +
                         (currentAmount1 * currentPrice1);

        // Calculate IL
        if (lpValue < holdValue) {
            ilValue = holdValue - lpValue;
            ilPercentage = -int256((ilValue * 10000) / holdValue);
        } else {
            ilValue = lpValue - holdValue;
            ilPercentage = int256((ilValue * 10000) / holdValue);
        }

        return (ilPercentage, ilValue);
    }

    /**
     * @notice Get position performance metrics
     * @param tokenId Position token ID
     * @return roi Return on investment (basis points)
     * @return apr Annualized percentage return
     * @return totalFees Total fees collected
     */
    function getPositionMetrics(
        uint256 tokenId
    ) external view returns (
        int256 roi,
        uint256 apr,
        uint256 totalFees
    ) {
        PositionData memory position = positions[tokenId];
        if (!position.active) return (0, 0, 0);

        // Calculate total fees
        totalFees = position.feesCollected0 + position.feesCollected1;

        // Calculate current value
        uint256 currentValue = _calculatePositionValue(
            position.pool,
            position.liquidity,
            position.tickLower,
            position.tickUpper
        );

        // Add fees to current value
        uint256 totalValue = currentValue + totalFees;

        // Calculate ROI
        if (totalValue >= position.initialValue) {
            roi = int256(((totalValue - position.initialValue) * 10000) / position.initialValue);
        } else {
            roi = -int256(((position.initialValue - totalValue) * 10000) / position.initialValue);
        }

        // Calculate APR
        uint256 timeElapsed = block.timestamp - position.createdAt;
        if (timeElapsed > 0 && roi > 0) {
            apr = (uint256(roi) * 365 days) / timeElapsed;
        }

        return (roi, apr, totalFees);
    }

    /**
     * @notice Get user positions
     * @param user User address
     * @return tokenIds Array of position token IDs
     */
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    /**
     * @notice Get pool statistics
     * @param pool Pool address
     * @return stats Pool statistics
     */
    function getPoolStats(address pool) external view returns (PoolStats memory) {
        return poolStats[pool];
    }

    /**
     * @notice Internal: Calculate position value
     */
    function _calculatePositionValue(
        address pool,
        uint128 liquidity,
        int24 tickLower,
        int24 tickUpper
    ) internal view returns (uint256 value) {
        // Get token amounts
        (uint256 amount0, uint256 amount1) = _getPositionAmounts(
            pool,
            liquidity,
            tickLower,
            tickUpper
        );

        // Get token prices
        (address token0, address token1) = _getPoolTokens(pool);
        (uint256 price0, uint256 price1) = _getTokenPrices(token0, token1);

        // Calculate total value
        value = (amount0 * price0) + (amount1 * price1);
        return value;
    }

    /**
     * @notice Internal: Get position amounts
     */
    function _getPositionAmounts(
        address pool,
        uint128 liquidity,
        int24 tickLower,
        int24 tickUpper
    ) internal view returns (uint256 amount0, uint256 amount1) {
        // Simplified calculation - in production use Uniswap libraries
        IUniswapV3Pool poolContract = IUniswapV3Pool(pool);
        (, int24 tick, , , , , ) = poolContract.slot0();

        // Simplified amounts calculation
        if (tick < tickLower) {
            amount0 = uint256(liquidity);
            amount1 = 0;
        } else if (tick > tickUpper) {
            amount0 = 0;
            amount1 = uint256(liquidity);
        } else {
            amount0 = uint256(liquidity) / 2;
            amount1 = uint256(liquidity) / 2;
        }

        return (amount0, amount1);
    }

    /**
     * @notice Internal: Get pool tokens
     */
    function _getPoolTokens(address pool) internal view returns (address token0, address token1) {
        IUniswapV3Pool poolContract = IUniswapV3Pool(pool);
        token0 = poolContract.token0();
        token1 = poolContract.token1();
        return (token0, token1);
    }

    /**
     * @notice Internal: Get token prices from oracle
     */
    function _getTokenPrices(
        address token0,
        address token1
    ) internal view returns (uint256 price0, uint256 price1) {
        // Simplified - in production integrate with price oracle
        return (1e18, 1e18);
    }

    /**
     * @notice Internal: Get pool address
     */
    function _getPoolAddress(
        address token0,
        address token1,
        uint24 fee
    ) internal pure returns (address) {
        // Simplified - in production use Uniswap V3 Factory
        return address(uint160(uint256(keccak256(abi.encodePacked(token0, token1, fee)))));
    }

    /**
     * @notice Set price oracle
     * @param _priceOracle Price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = _priceOracle;
    }

    /**
     * @notice Deactivate position
     * @param tokenId Position token ID
     */
    function deactivatePosition(uint256 tokenId) external {
        PositionData storage position = positions[tokenId];
        require(position.owner == msg.sender || msg.sender == owner(), "Not authorized");
        position.active = false;
    }
}

/**
 * @notice Interface for Position Manager
 */
interface IPositionManager {
    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );
}
