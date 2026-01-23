// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CollateralManager
 * @notice Multi-token collateral handling for lending
 * @dev Manages collateral deposits, locks, and liquidations
 * 
 * Features:
 * - Multi-token collateral support
 * - Price feed integration
 * - Liquidation thresholds per token
 * - Health factor calculation
 * - Collateral ratio enforcement
 */
contract CollateralManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Price oracle
    address public priceOracle;

    /// @notice Lending contract
    address public lendingContract;

    /// @notice Supported collateral tokens
    mapping(address => CollateralConfig) public collateralTokens;

    struct CollateralConfig {
        bool supported;
        uint256 collateralFactor; // Max borrow as % of collateral (basis points)
        uint256 liquidationThreshold; // Liquidation threshold (basis points)
        uint256 liquidationPenalty; // Penalty on liquidation (basis points)
        uint8 decimals;
    }

    /// @notice User collateral balances
    mapping(address => mapping(address => uint256)) public userCollateral;

    /// @notice Locked collateral (in use for loans)
    mapping(address => mapping(address => uint256)) public lockedCollateral;

    /// @notice Total collateral per token
    mapping(address => uint256) public totalCollateral;

    // Events
    event CollateralDeposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    event CollateralWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    event CollateralLocked(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    event CollateralUnlocked(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    event CollateralLiquidated(
        address indexed borrower,
        address indexed liquidator,
        address indexed token,
        uint256 amount
    );

    event CollateralTokenAdded(
        address indexed token,
        uint256 collateralFactor,
        uint256 liquidationThreshold
    );

    event CollateralTokenUpdated(
        address indexed token,
        uint256 collateralFactor,
        uint256 liquidationThreshold
    );

    error UnsupportedToken();
    error InsufficientCollateral();
    error CollateralLocked();
    error OnlyLendingContract();
    error InvalidAmount();

    modifier onlyLending() {
        if (msg.sender != lendingContract) revert OnlyLendingContract();
        _;
    }

    /**
     * @notice Constructor
     * @param _priceOracle Price oracle address
     * @param _owner Owner address
     */
    constructor(address _priceOracle, address _owner) {
        priceOracle = _priceOracle;
        _transferOwnership(_owner);
    }

    /**
     * @notice Deposit collateral
     * @param token Collateral token address
     * @param amount Amount to deposit
     */
    function depositCollateral(address token, uint256 amount) external nonReentrant {
        if (!collateralTokens[token].supported) revert UnsupportedToken();
        if (amount == 0) revert InvalidAmount();

        // Transfer tokens
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update balances
        userCollateral[msg.sender][token] += amount;
        totalCollateral[token] += amount;

        emit CollateralDeposited(msg.sender, token, amount);
    }

    /**
     * @notice Withdraw collateral
     * @param token Collateral token address
     * @param amount Amount to withdraw
     */
    function withdrawCollateral(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        uint256 available = userCollateral[msg.sender][token] - 
                           lockedCollateral[msg.sender][token];
        
        if (amount > available) revert InsufficientCollateral();

        // Update balances
        userCollateral[msg.sender][token] -= amount;
        totalCollateral[token] -= amount;

        // Transfer tokens
        IERC20(token).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, token, amount);
    }

    /**
     * @notice Lock collateral for loan (called by lending contract)
     * @param user User address
     * @param token Collateral token
     * @param amount Amount to lock
     */
    function lockCollateral(
        address user,
        address token,
        uint256 amount
    ) external onlyLending {
        uint256 available = userCollateral[user][token] - lockedCollateral[user][token];
        if (amount > available) revert InsufficientCollateral();

        lockedCollateral[user][token] += amount;

        emit CollateralLocked(user, token, amount);
    }

    /**
     * @notice Unlock collateral after loan repayment
     * @param user User address
     * @param token Collateral token
     * @param amount Amount to unlock
     */
    function unlockCollateral(
        address user,
        address token,
        uint256 amount
    ) external onlyLending {
        lockedCollateral[user][token] -= amount;

        emit CollateralUnlocked(user, token, amount);
    }

    /**
     * @notice Liquidate collateral
     * @param borrower Borrower address
     * @param liquidator Liquidator address
     * @param token Collateral token
     * @param amount Collateral amount
     */
    function liquidateCollateral(
        address borrower,
        address liquidator,
        address token,
        uint256 amount
    ) external onlyLending {
        // Unlock and transfer to liquidator
        lockedCollateral[borrower][token] -= amount;
        userCollateral[borrower][token] -= amount;
        totalCollateral[token] -= amount;

        IERC20(token).safeTransfer(liquidator, amount);

        emit CollateralLiquidated(borrower, liquidator, token, amount);
    }

    /**
     * @notice Check if collateral is sufficient for borrow
     * @param user User address
     * @param token Collateral token
     * @param amount Collateral amount
     * @param borrowAmount Borrow amount
     * @return sufficient Whether collateral is sufficient
     */
    function checkCollateral(
        address user,
        address token,
        uint256 amount,
        uint256 borrowAmount
    ) external view returns (bool sufficient) {
        if (!collateralTokens[token].supported) return false;

        // Get collateral value
        uint256 collateralValue = getCollateralValue(token, amount);

        // Calculate max borrow
        uint256 maxBorrow = (collateralValue * collateralTokens[token].collateralFactor) / 10000;

        return borrowAmount <= maxBorrow;
    }

    /**
     * @notice Get collateral value in VFIDE
     * @param token Collateral token
     * @param amount Collateral amount
     * @return value Value in VFIDE (18 decimals)
     */
    function getCollateralValue(
        address token,
        uint256 amount
    ) public view returns (uint256 value) {
        if (!collateralTokens[token].supported) return 0;

        // Get price from oracle
        uint256 price = IPriceOracle(priceOracle).getTokenPrice(token);

        // Normalize decimals
        uint8 decimals = collateralTokens[token].decimals;
        if (decimals < 18) {
            amount = amount * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            amount = amount / (10 ** (decimals - 18));
        }

        // Calculate value
        value = (amount * price) / 1e18;
        return value;
    }

    /**
     * @notice Calculate health factor for user
     * @param user User address
     * @param token Collateral token
     * @param debtAmount Debt amount in VFIDE
     * @return healthFactor Health factor (1e18 = 100%)
     */
    function calculateHealthFactor(
        address user,
        address token,
        uint256 debtAmount
    ) external view returns (uint256 healthFactor) {
        if (debtAmount == 0) return type(uint256).max;

        uint256 collateralAmount = lockedCollateral[user][token];
        uint256 collateralValue = getCollateralValue(token, collateralAmount);

        uint256 liquidationValue = (collateralValue * 
                                    collateralTokens[token].liquidationThreshold) / 10000;

        healthFactor = (liquidationValue * 1e18) / debtAmount;
        return healthFactor;
    }

    /**
     * @notice Get user's available collateral
     * @param user User address
     * @param token Collateral token
     * @return available Available collateral amount
     */
    function getAvailableCollateral(
        address user,
        address token
    ) external view returns (uint256 available) {
        return userCollateral[user][token] - lockedCollateral[user][token];
    }

    /**
     * @notice Get user's total collateral value
     * @param user User address
     * @return totalValue Total collateral value in VFIDE
     */
    function getUserTotalCollateralValue(
        address user
    ) external view returns (uint256 totalValue) {
        // This would iterate through supported tokens in production
        // Simplified for example
        return 0;
    }

    /**
     * @notice Add supported collateral token
     * @param token Token address
     * @param collateralFactor Collateral factor (basis points)
     * @param liquidationThreshold Liquidation threshold (basis points)
     * @param liquidationPenalty Liquidation penalty (basis points)
     * @param decimals Token decimals
     */
    function addCollateralToken(
        address token,
        uint256 collateralFactor,
        uint256 liquidationThreshold,
        uint256 liquidationPenalty,
        uint8 decimals
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(collateralFactor <= 10000, "Invalid factor");
        require(liquidationThreshold <= 10000, "Invalid threshold");
        require(liquidationPenalty <= 10000, "Invalid penalty");

        collateralTokens[token] = CollateralConfig({
            supported: true,
            collateralFactor: collateralFactor,
            liquidationThreshold: liquidationThreshold,
            liquidationPenalty: liquidationPenalty,
            decimals: decimals
        });

        emit CollateralTokenAdded(token, collateralFactor, liquidationThreshold);
    }

    /**
     * @notice Update collateral token config
     * @param token Token address
     * @param collateralFactor Collateral factor (basis points)
     * @param liquidationThreshold Liquidation threshold (basis points)
     * @param liquidationPenalty Liquidation penalty (basis points)
     */
    function updateCollateralToken(
        address token,
        uint256 collateralFactor,
        uint256 liquidationThreshold,
        uint256 liquidationPenalty
    ) external onlyOwner {
        require(collateralTokens[token].supported, "Token not supported");
        require(collateralFactor <= 10000, "Invalid factor");
        require(liquidationThreshold <= 10000, "Invalid threshold");
        require(liquidationPenalty <= 10000, "Invalid penalty");

        collateralTokens[token].collateralFactor = collateralFactor;
        collateralTokens[token].liquidationThreshold = liquidationThreshold;
        collateralTokens[token].liquidationPenalty = liquidationPenalty;

        emit CollateralTokenUpdated(token, collateralFactor, liquidationThreshold);
    }

    /**
     * @notice Remove collateral token support
     * @param token Token address
     */
    function removeCollateralToken(address token) external onlyOwner {
        require(totalCollateral[token] == 0, "Collateral in use");
        delete collateralTokens[token];
    }

    /**
     * @notice Set lending contract
     * @param _lendingContract Lending contract address
     */
    function setLendingContract(address _lendingContract) external onlyOwner {
        require(_lendingContract != address(0), "Invalid lending");
        lendingContract = _lendingContract;
    }

    /**
     * @notice Set price oracle
     * @param _priceOracle Price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid oracle");
        priceOracle = _priceOracle;
    }

    /**
     * @notice Emergency withdraw (only owner)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}

/**
 * @notice Interface for Price Oracle
 */
interface IPriceOracle {
    function getTokenPrice(address token) external view returns (uint256);
}
