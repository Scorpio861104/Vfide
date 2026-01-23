// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VFIDEFlashLoan
 * @notice Flash loan provider for VFIDE tokens
 * @dev EIP-3156 compliant flash loan implementation
 * 
 * Features:
 * - Loan up to vault balance
 * - 0.09% fee (9 basis points)
 * - Reentrancy protection
 * - Fee distribution to stakers
 * - Emergency pause
 * - EIP-3156 compliance
 */
contract VFIDEFlashLoan is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice VFIDE token
    IERC20 public immutable vfideToken;

    /// @notice Flash loan fee (9 basis points = 0.09%)
    uint256 public flashFee = 9;

    /// @notice Maximum flash loan amount (90% of balance)
    uint256 public constant MAX_FLASH_PERCENTAGE = 9000; // 90%

    /// @notice Fee collector (staking contract)
    address public feeCollector;

    /// @notice Total flash loans issued
    uint256 public totalFlashLoans;

    /// @notice Total fees collected
    uint256 public totalFeesCollected;

    /// @notice Flash loan statistics
    mapping(address => FlashLoanStats) public userStats;

    struct FlashLoanStats {
        uint256 totalBorrowed;
        uint256 loanCount;
        uint256 totalFeesPaid;
        uint256 lastLoanTime;
    }

    /// @notice Flash loan callback interface
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    // Events
    event FlashLoan(
        address indexed borrower,
        address indexed receiver,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event FeesWithdrawn(address indexed collector, uint256 amount);

    error InvalidAmount();
    error InvalidReceiver();
    error UnsupportedToken();
    error InsufficientBalance();
    error CallbackFailed();
    error RepaymentFailed();
    error InvalidFee();

    /**
     * @notice Constructor
     * @param _vfideToken VFIDE token address
     * @param _feeCollector Fee collector address
     * @param _owner Owner address
     */
    constructor(
        address _vfideToken,
        address _feeCollector,
        address _owner
    ) {
        require(_vfideToken != address(0), "Invalid token");
        require(_feeCollector != address(0), "Invalid fee collector");
        
        vfideToken = IERC20(_vfideToken);
        feeCollector = _feeCollector;
        
        _transferOwnership(_owner);
    }

    /**
     * @notice Maximum flash loan available
     * @param token Token address (must be VFIDE)
     * @return max Maximum loan amount
     */
    function maxFlashLoan(address token) external view returns (uint256 max) {
        if (token != address(vfideToken)) return 0;
        
        uint256 balance = vfideToken.balanceOf(address(this));
        return (balance * MAX_FLASH_PERCENTAGE) / 10000;
    }

    /**
     * @notice Calculate flash loan fee
     * @param token Token address (must be VFIDE)
     * @param amount Loan amount
     * @return fee Fee amount
     */
    function flashFeeAmount(address token, uint256 amount) public view returns (uint256 fee) {
        if (token != address(vfideToken)) revert UnsupportedToken();
        return (amount * flashFee) / 10000;
    }

    /**
     * @notice Execute flash loan
     * @param receiver Loan receiver address
     * @param token Token address (must be VFIDE)
     * @param amount Loan amount
     * @param data Callback data
     * @return success Whether loan succeeded
     */
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant whenNotPaused returns (bool success) {
        if (token != address(vfideToken)) revert UnsupportedToken();
        if (amount == 0) revert InvalidAmount();
        if (address(receiver) == address(0)) revert InvalidReceiver();

        uint256 balance = vfideToken.balanceOf(address(this));
        uint256 maxLoan = (balance * MAX_FLASH_PERCENTAGE) / 10000;
        
        if (amount > maxLoan) revert InsufficientBalance();

        // Calculate fee
        uint256 fee = flashFeeAmount(token, amount);
        uint256 repayAmount = amount + fee;

        // Record balance before
        uint256 balanceBefore = vfideToken.balanceOf(address(this));

        // Transfer loan to receiver
        vfideToken.safeTransfer(address(receiver), amount);

        // Execute callback
        bytes32 result = receiver.onFlashLoan(
            msg.sender,
            token,
            amount,
            fee,
            data
        );

        if (result != CALLBACK_SUCCESS) revert CallbackFailed();

        // Receive repayment
        uint256 balanceAfter = vfideToken.balanceOf(address(this));
        
        if (balanceAfter < balanceBefore + fee) revert RepaymentFailed();

        // Update statistics
        userStats[msg.sender].totalBorrowed += amount;
        userStats[msg.sender].loanCount += 1;
        userStats[msg.sender].totalFeesPaid += fee;
        userStats[msg.sender].lastLoanTime = block.timestamp;

        totalFlashLoans += amount;
        totalFeesCollected += fee;

        emit FlashLoan(msg.sender, address(receiver), amount, fee, block.timestamp);

        return true;
    }

    /**
     * @notice Withdraw collected fees
     */
    function withdrawFees() external nonReentrant {
        require(msg.sender == feeCollector || msg.sender == owner(), "Not authorized");

        uint256 balance = vfideToken.balanceOf(address(this));
        uint256 feesToWithdraw = totalFeesCollected;

        if (feesToWithdraw > balance) {
            feesToWithdraw = balance;
        }

        if (feesToWithdraw > 0) {
            totalFeesCollected = 0;
            vfideToken.safeTransfer(feeCollector, feesToWithdraw);
            emit FeesWithdrawn(feeCollector, feesToWithdraw);
        }
    }

    /**
     * @notice Get user flash loan statistics
     * @param user User address
     * @return stats User statistics
     */
    function getUserStats(address user) external view returns (FlashLoanStats memory) {
        return userStats[user];
    }

    /**
     * @notice Get available liquidity
     * @return available Available amount for flash loans
     */
    function availableLiquidity() external view returns (uint256 available) {
        uint256 balance = vfideToken.balanceOf(address(this));
        return (balance * MAX_FLASH_PERCENTAGE) / 10000;
    }

    /**
     * @notice Update flash fee
     * @param _flashFee New fee in basis points
     */
    function setFlashFee(uint256 _flashFee) external onlyOwner {
        if (_flashFee > 100) revert InvalidFee(); // Max 1%
        uint256 oldFee = flashFee;
        flashFee = _flashFee;
        emit FeeUpdated(oldFee, _flashFee);
    }

    /**
     * @notice Update fee collector
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid collector");
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }

    /**
     * @notice Pause flash loans
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause flash loans
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw (only owner)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /**
     * @notice Deposit liquidity for flash loans
     * @param amount Amount to deposit
     */
    function depositLiquidity(uint256 amount) external {
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
    }
}

/**
 * @notice EIP-3156 Flash Borrower Interface
 */
interface IERC3156FlashBorrower {
    /**
     * @notice Receive flash loan callback
     * @param initiator Loan initiator
     * @param token Loan token
     * @param amount Loan amount
     * @param fee Loan fee
     * @param data Callback data
     * @return result Callback result (must be CALLBACK_SUCCESS)
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32 result);
}
