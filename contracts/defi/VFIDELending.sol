// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VFIDELending
 * @notice Basic lending pool for VFIDE tokens
 * @dev Deposit for interest, borrow against collateral
 * 
 * Features:
 * - Deposit VFIDE to earn interest
 * - Borrow against collateral
 * - Dynamic interest rate model
 * - Liquidation mechanism
 * - Health factor tracking
 */
contract VFIDELending is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice VFIDE token
    IERC20 public immutable vfideToken;

    /// @notice Collateral manager
    address public collateralManager;

    /// @notice Price oracle
    address public priceOracle;

    /// @notice Base interest rate (5% APY)
    uint256 public baseRate = 500; // 5% in basis points

    /// @notice Optimal utilization rate (80%)
    uint256 public optimalUtilization = 8000; // 80% in basis points

    /// @notice Slope 1 (below optimal)
    uint256 public slope1 = 400; // 4% in basis points

    /// @notice Slope 2 (above optimal)
    uint256 public slope2 = 6000; // 60% in basis points

    /// @notice Liquidation threshold (75%)
    uint256 public liquidationThreshold = 7500; // 75% in basis points

    /// @notice Liquidation bonus (5%)
    uint256 public liquidationBonus = 500; // 5% in basis points

    /// @notice Total deposits
    uint256 public totalDeposits;

    /// @notice Total borrows
    uint256 public totalBorrows;

    /// @notice Total reserves
    uint256 public totalReserves;

    /// @notice Reserve factor (10%)
    uint256 public reserveFactor = 1000; // 10% in basis points

    /// @notice Last interest update
    uint256 public lastUpdateTime;

    /// @notice Accumulated borrow index
    uint256 public borrowIndex = 1e18;

    /// @notice User deposits
    struct Deposit {
        uint256 amount;
        uint256 shares;
        uint256 depositTime;
        uint256 lastInterestClaim;
    }

    mapping(address => Deposit) public deposits;

    /// @notice User borrows
    struct Borrow {
        uint256 principal;
        uint256 borrowIndex;
        uint256 borrowTime;
        uint256 collateralAmount;
        address collateralToken;
    }

    mapping(address => Borrow) public borrows;

    /// @notice Total shares
    uint256 public totalShares;

    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event Borrowed(
        address indexed user,
        uint256 amount,
        address indexed collateral,
        uint256 collateralAmount
    );
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(
        address indexed borrower,
        address indexed liquidator,
        uint256 debtAmount,
        uint256 collateralAmount
    );
    event InterestAccrued(uint256 interest, uint256 newBorrowIndex);
    event InterestRateUpdated(uint256 utilizationRate, uint256 borrowRate);

    error InsufficientDeposit();
    error InsufficientCollateral();
    error InvalidAmount();
    error HealthyPosition();
    error UnhealthyPosition();

    /**
     * @notice Constructor
     * @param _vfideToken VFIDE token address
     * @param _collateralManager Collateral manager address
     * @param _priceOracle Price oracle address
     * @param _owner Owner address
     */
    constructor(
        address _vfideToken,
        address _collateralManager,
        address _priceOracle,
        address _owner
    ) {
        require(_vfideToken != address(0), "Invalid token");
        vfideToken = IERC20(_vfideToken);
        collateralManager = _collateralManager;
        priceOracle = _priceOracle;
        lastUpdateTime = block.timestamp;
        _transferOwnership(_owner);
    }

    /**
     * @notice Deposit VFIDE to earn interest
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        _accrueInterest();

        // Calculate shares
        uint256 shares;
        if (totalShares == 0 || totalDeposits == 0) {
            shares = amount;
        } else {
            shares = (amount * totalShares) / totalDeposits;
        }

        // Update state
        deposits[msg.sender].amount += amount;
        deposits[msg.sender].shares += shares;
        deposits[msg.sender].depositTime = block.timestamp;
        deposits[msg.sender].lastInterestClaim = block.timestamp;

        totalDeposits += amount;
        totalShares += shares;

        // Transfer tokens
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount, shares);
    }

    /**
     * @notice Withdraw deposited VFIDE and earned interest
     * @param shares Shares to withdraw (0 = all)
     */
    function withdraw(uint256 shares) external nonReentrant {
        if (shares == 0) {
            shares = deposits[msg.sender].shares;
        }
        if (shares == 0) revert InsufficientDeposit();

        _accrueInterest();

        // Calculate amount to withdraw
        uint256 amount = (shares * totalDeposits) / totalShares;

        // Check available liquidity
        uint256 available = vfideToken.balanceOf(address(this)) - totalReserves;
        require(amount <= available, "Insufficient liquidity");

        // Update state
        deposits[msg.sender].shares -= shares;
        deposits[msg.sender].amount -= amount;
        totalShares -= shares;
        totalDeposits -= amount;

        // Transfer tokens
        vfideToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, shares);
    }

    /**
     * @notice Borrow VFIDE against collateral
     * @param amount Amount to borrow
     * @param collateralToken Collateral token address
     * @param collateralAmount Collateral amount
     */
    function borrow(
        uint256 amount,
        address collateralToken,
        uint256 collateralAmount
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        _accrueInterest();

        // Check collateral via manager
        require(
            ICollateralManager(collateralManager).checkCollateral(
                msg.sender,
                collateralToken,
                collateralAmount,
                amount
            ),
            "Insufficient collateral"
        );

        // Lock collateral
        ICollateralManager(collateralManager).lockCollateral(
            msg.sender,
            collateralToken,
            collateralAmount
        );

        // Update borrow state
        Borrow storage userBorrow = borrows[msg.sender];
        userBorrow.principal += amount;
        userBorrow.borrowIndex = borrowIndex;
        userBorrow.borrowTime = block.timestamp;
        userBorrow.collateralAmount = collateralAmount;
        userBorrow.collateralToken = collateralToken;

        totalBorrows += amount;

        // Check utilization
        _updateInterestRate();

        // Transfer borrowed amount
        vfideToken.safeTransfer(msg.sender, amount);

        emit Borrowed(msg.sender, amount, collateralToken, collateralAmount);
    }

    /**
     * @notice Repay borrowed VFIDE
     * @param amount Amount to repay (0 = all)
     */
    function repay(uint256 amount) external nonReentrant {
        Borrow storage userBorrow = borrows[msg.sender];
        if (userBorrow.principal == 0) revert InvalidAmount();

        _accrueInterest();

        // Calculate current debt
        uint256 debt = getCurrentDebt(msg.sender);

        if (amount == 0 || amount > debt) {
            amount = debt;
        }

        // Calculate principal to reduce
        uint256 principalReduction = (amount * userBorrow.principal) / debt;

        // Update state
        userBorrow.principal -= principalReduction;
        totalBorrows -= principalReduction;

        // If fully repaid, unlock collateral
        if (userBorrow.principal == 0) {
            ICollateralManager(collateralManager).unlockCollateral(
                msg.sender,
                userBorrow.collateralToken,
                userBorrow.collateralAmount
            );
            delete borrows[msg.sender];
        }

        // Transfer repayment
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update interest rate
        _updateInterestRate();

        emit Repaid(msg.sender, amount);
    }

    /**
     * @notice Liquidate unhealthy position
     * @param borrower Borrower address
     */
    function liquidate(address borrower) external nonReentrant {
        _accrueInterest();

        // Check if position is unhealthy
        uint256 healthFactor = getHealthFactor(borrower);
        if (healthFactor >= 1e18) revert HealthyPosition();

        Borrow storage userBorrow = borrows[borrower];
        uint256 debt = getCurrentDebt(borrower);

        // Calculate liquidation amount (with bonus)
        uint256 liquidationAmount = debt + (debt * liquidationBonus) / 10000;

        // Transfer debt from liquidator
        vfideToken.safeTransferFrom(msg.sender, address(this), debt);

        // Transfer collateral to liquidator
        ICollateralManager(collateralManager).liquidateCollateral(
            borrower,
            msg.sender,
            userBorrow.collateralToken,
            userBorrow.collateralAmount
        );

        // Clear borrow
        totalBorrows -= userBorrow.principal;
        delete borrows[borrower];

        emit Liquidated(borrower, msg.sender, debt, userBorrow.collateralAmount);
    }

    /**
     * @notice Accrue interest
     */
    function _accrueInterest() internal {
        if (block.timestamp == lastUpdateTime) return;

        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        
        if (totalBorrows > 0) {
            uint256 borrowRate = getBorrowRate();
            uint256 interestFactor = (borrowRate * timeElapsed) / 365 days;
            uint256 interest = (totalBorrows * interestFactor) / 1e18;

            // Split interest
            uint256 toReserve = (interest * reserveFactor) / 10000;
            uint256 toDepositors = interest - toReserve;

            totalBorrows += interest;
            totalDeposits += toDepositors;
            totalReserves += toReserve;

            // Update borrow index
            borrowIndex += (borrowIndex * interestFactor) / 1e18;

            emit InterestAccrued(interest, borrowIndex);
        }

        lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Update interest rate based on utilization
     */
    function _updateInterestRate() internal {
        uint256 utilization = getUtilizationRate();
        uint256 borrowRate = getBorrowRate();
        emit InterestRateUpdated(utilization, borrowRate);
    }

    /**
     * @notice Get current borrow rate
     * @return rate Borrow rate (APY in basis points)
     */
    function getBorrowRate() public view returns (uint256 rate) {
        uint256 utilization = getUtilizationRate();

        if (utilization <= optimalUtilization) {
            // Below optimal: linear from base to (base + slope1)
            rate = baseRate + (utilization * slope1) / optimalUtilization;
        } else {
            // Above optimal: jump model
            uint256 excessUtilization = utilization - optimalUtilization;
            rate = baseRate + slope1 + 
                   (excessUtilization * slope2) / (10000 - optimalUtilization);
        }

        return rate;
    }

    /**
     * @notice Get utilization rate
     * @return utilization Utilization (basis points)
     */
    function getUtilizationRate() public view returns (uint256 utilization) {
        if (totalDeposits == 0) return 0;
        return (totalBorrows * 10000) / totalDeposits;
    }

    /**
     * @notice Get current debt for borrower
     * @param borrower Borrower address
     * @return debt Current debt amount
     */
    function getCurrentDebt(address borrower) public view returns (uint256 debt) {
        Borrow memory userBorrow = borrows[borrower];
        if (userBorrow.principal == 0) return 0;

        return (userBorrow.principal * borrowIndex) / userBorrow.borrowIndex;
    }

    /**
     * @notice Get health factor for borrower
     * @param borrower Borrower address
     * @return healthFactor Health factor (1e18 = 100%)
     */
    function getHealthFactor(address borrower) public view returns (uint256 healthFactor) {
        Borrow memory userBorrow = borrows[borrower];
        if (userBorrow.principal == 0) return type(uint256).max;

        uint256 debt = getCurrentDebt(borrower);
        uint256 collateralValue = ICollateralManager(collateralManager).getCollateralValue(
            userBorrow.collateralToken,
            userBorrow.collateralAmount
        );

        uint256 maxDebt = (collateralValue * liquidationThreshold) / 10000;
        
        if (debt == 0) return type(uint256).max;
        
        return (maxDebt * 1e18) / debt;
    }

    /**
     * @notice Get user deposit info
     * @param user User address
     * @return amount Deposit amount
     * @return interest Earned interest
     */
    function getUserDeposit(address user) external view returns (
        uint256 amount,
        uint256 interest
    ) {
        Deposit memory userDeposit = deposits[user];
        if (userDeposit.shares == 0) return (0, 0);

        uint256 currentAmount = (userDeposit.shares * totalDeposits) / totalShares;
        interest = currentAmount > userDeposit.amount ? currentAmount - userDeposit.amount : 0;
        
        return (currentAmount, interest);
    }

    /**
     * @notice Set collateral manager
     * @param _collateralManager Collateral manager address
     */
    function setCollateralManager(address _collateralManager) external onlyOwner {
        collateralManager = _collateralManager;
    }

    /**
     * @notice Set price oracle
     * @param _priceOracle Price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = _priceOracle;
    }

    /**
     * @notice Set interest rate model parameters
     * @param _baseRate Base rate
     * @param _slope1 Slope 1
     * @param _slope2 Slope 2
     * @param _optimalUtilization Optimal utilization
     */
    function setInterestRateModel(
        uint256 _baseRate,
        uint256 _slope1,
        uint256 _slope2,
        uint256 _optimalUtilization
    ) external onlyOwner {
        baseRate = _baseRate;
        slope1 = _slope1;
        slope2 = _slope2;
        optimalUtilization = _optimalUtilization;
    }

    /**
     * @notice Pause lending
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause lending
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}

/**
 * @notice Interface for Collateral Manager
 */
interface ICollateralManager {
    function checkCollateral(
        address user,
        address token,
        uint256 amount,
        uint256 borrowAmount
    ) external view returns (bool);

    function lockCollateral(
        address user,
        address token,
        uint256 amount
    ) external;

    function unlockCollateral(
        address user,
        address token,
        uint256 amount
    ) external;

    function liquidateCollateral(
        address borrower,
        address liquidator,
        address token,
        uint256 amount
    ) external;

    function getCollateralValue(
        address token,
        uint256 amount
    ) external view returns (uint256);
}
