// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title StakingRewards
 * @notice Reward calculation and distribution engine for staking
 * @dev Handles time-weighted rewards, multipliers, and fee distribution
 * 
 * Features:
 * - Time-weighted reward calculation
 * - Multiplier application (from lock period)
 * - Fee collection and distribution
 * - Treasury integration
 * - Reward claim batching
 * - Reward distribution: 50% ProofScore, 30% governance, 20% fees
 */
contract StakingRewards is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice VFIDE token
    IERC20 public immutable vfideToken;

    /// @notice Staking contract
    address public stakingContract;

    /// @notice Treasury address
    address public treasury;

    /// @notice ProofScore contract
    address public proofScoreContract;

    /// @notice Governance contract
    address public governanceContract;

    /// @notice Total rewards distributed
    uint256 public totalRewardsDistributed;

    /// @notice Reward allocation (basis points)
    struct RewardAllocation {
        uint256 proofScore;   // 50% = 5000
        uint256 governance;   // 30% = 3000
        uint256 fees;        // 20% = 2000
    }

    RewardAllocation public allocation = RewardAllocation({
        proofScore: 5000,
        governance: 3000,
        fees: 2000
    });

    /// @notice Fee pool for distribution
    uint256 public feePool;

    /// @notice Last fee distribution time
    uint256 public lastFeeDistribution;

    /// @notice Fee distribution interval (1 week)
    uint256 public constant FEE_DISTRIBUTION_INTERVAL = 1 weeks;

    /// @notice Minimum fee distribution amount
    uint256 public constant MIN_FEE_DISTRIBUTION = 1000 * 1e18;

    /// @notice User reward tracking
    mapping(address => UserRewards) public userRewards;

    struct UserRewards {
        uint256 totalClaimed;
        uint256 lastClaimTime;
        uint256 pendingProofScore;
        uint256 pendingGovernance;
        uint256 pendingFees;
    }

    /// @notice Batch claim tracking
    mapping(address => uint256[]) public userBatchClaims;

    // Events
    event RewardCalculated(
        address indexed user,
        uint256 amount,
        uint256 proofScore,
        uint256 governance,
        uint256 fees
    );

    event RewardClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event FeeCollected(uint256 amount, uint256 timestamp);
    
    event FeeDistributed(
        uint256 amount,
        uint256 toStakers,
        uint256 toTreasury,
        uint256 timestamp
    );

    event AllocationUpdated(
        uint256 proofScore,
        uint256 governance,
        uint256 fees
    );

    event BatchClaimed(
        address indexed user,
        uint256 count,
        uint256 totalAmount
    );

    error InvalidAllocation();
    error InsufficientFees();
    error OnlyStakingContract();

    modifier onlyStaking() {
        if (msg.sender != stakingContract) revert OnlyStakingContract();
        _;
    }

    /**
     * @notice Constructor
     * @param _vfideToken VFIDE token address
     * @param _treasury Treasury address
     * @param _owner Owner address
     */
    constructor(
        address _vfideToken,
        address _treasury,
        address _owner
    ) {
        require(_vfideToken != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");
        
        vfideToken = IERC20(_vfideToken);
        treasury = _treasury;
        lastFeeDistribution = block.timestamp;
        
        _transferOwnership(_owner);
    }

    /**
     * @notice Calculate rewards for a user
     * @param user User address
     * @param baseReward Base reward amount
     * @param multiplier Staking multiplier (100 = 1.0x)
     * @return totalReward Total reward with multiplier applied
     */
    function calculateReward(
        address user,
        uint256 baseReward,
        uint256 multiplier
    ) external onlyStaking returns (uint256 totalReward) {
        // Apply multiplier
        totalReward = (baseReward * multiplier) / 100;

        // Split rewards according to allocation
        uint256 proofScoreReward = (totalReward * allocation.proofScore) / 10000;
        uint256 governanceReward = (totalReward * allocation.governance) / 10000;
        uint256 feeReward = (totalReward * allocation.fees) / 10000;

        // Update user rewards
        UserRewards storage rewards = userRewards[user];
        rewards.pendingProofScore += proofScoreReward;
        rewards.pendingGovernance += governanceReward;
        rewards.pendingFees += feeReward;

        emit RewardCalculated(
            user,
            totalReward,
            proofScoreReward,
            governanceReward,
            feeReward
        );

        return totalReward;
    }

    /**
     * @notice Claim all pending rewards
     * @param user User address
     * @return totalClaimed Total amount claimed
     */
    function claimRewards(address user) external onlyStaking nonReentrant returns (uint256 totalClaimed) {
        UserRewards storage rewards = userRewards[user];
        
        totalClaimed = rewards.pendingProofScore + rewards.pendingGovernance + rewards.pendingFees;
        
        if (totalClaimed == 0) return 0;

        // Update tracking
        rewards.totalClaimed += totalClaimed;
        rewards.lastClaimTime = block.timestamp;
        totalRewardsDistributed += totalClaimed;

        // Clear pending rewards
        rewards.pendingProofScore = 0;
        rewards.pendingGovernance = 0;
        rewards.pendingFees = 0;

        // Transfer rewards
        vfideToken.safeTransfer(user, totalClaimed);

        emit RewardClaimed(user, totalClaimed, block.timestamp);

        return totalClaimed;
    }

    /**
     * @notice Batch claim rewards for multiple users
     * @param users Array of user addresses
     * @return totalClaimed Total amount claimed
     */
    function batchClaimRewards(
        address[] calldata users
    ) external onlyStaking nonReentrant returns (uint256 totalClaimed) {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            UserRewards storage rewards = userRewards[user];
            
            uint256 userTotal = rewards.pendingProofScore + 
                               rewards.pendingGovernance + 
                               rewards.pendingFees;
            
            if (userTotal > 0) {
                // Update tracking
                rewards.totalClaimed += userTotal;
                rewards.lastClaimTime = block.timestamp;
                totalClaimed += userTotal;

                // Clear pending rewards
                rewards.pendingProofScore = 0;
                rewards.pendingGovernance = 0;
                rewards.pendingFees = 0;

                // Transfer rewards
                vfideToken.safeTransfer(user, userTotal);

                emit RewardClaimed(user, userTotal, block.timestamp);
            }
        }

        totalRewardsDistributed += totalClaimed;
        return totalClaimed;
    }

    /**
     * @notice Collect fees from transfers
     * @param amount Fee amount collected
     */
    function collectFees(uint256 amount) external {
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        feePool += amount;
        
        emit FeeCollected(amount, block.timestamp);
    }

    /**
     * @notice Distribute fees to stakers
     */
    function distributeFees() external nonReentrant {
        require(
            block.timestamp >= lastFeeDistribution + FEE_DISTRIBUTION_INTERVAL,
            "Too soon"
        );
        
        if (feePool < MIN_FEE_DISTRIBUTION) revert InsufficientFees();

        uint256 amount = feePool;
        feePool = 0;
        lastFeeDistribution = block.timestamp;

        // 80% to stakers (via reward pool), 20% to treasury
        uint256 toStakers = (amount * 8000) / 10000;
        uint256 toTreasury = amount - toStakers;

        // Transfer to treasury
        vfideToken.safeTransfer(treasury, toTreasury);

        // Staker portion stays in contract for claims
        
        emit FeeDistributed(amount, toStakers, toTreasury, block.timestamp);
    }

    /**
     * @notice Get pending rewards for user
     * @param user User address
     * @return total Total pending rewards
     * @return proofScore ProofScore rewards
     * @return governance Governance rewards
     * @return fees Fee rewards
     */
    function getPendingRewards(
        address user
    ) external view returns (
        uint256 total,
        uint256 proofScore,
        uint256 governance,
        uint256 fees
    ) {
        UserRewards memory rewards = userRewards[user];
        
        proofScore = rewards.pendingProofScore;
        governance = rewards.pendingGovernance;
        fees = rewards.pendingFees;
        total = proofScore + governance + fees;
        
        return (total, proofScore, governance, fees);
    }

    /**
     * @notice Get user reward statistics
     * @param user User address
     * @return rewards User rewards struct
     */
    function getUserRewards(address user) external view returns (UserRewards memory) {
        return userRewards[user];
    }

    /**
     * @notice Update reward allocation
     * @param _proofScore ProofScore allocation (basis points)
     * @param _governance Governance allocation (basis points)
     * @param _fees Fee allocation (basis points)
     */
    function updateAllocation(
        uint256 _proofScore,
        uint256 _governance,
        uint256 _fees
    ) external onlyOwner {
        if (_proofScore + _governance + _fees != 10000) revert InvalidAllocation();
        
        allocation.proofScore = _proofScore;
        allocation.governance = _governance;
        allocation.fees = _fees;
        
        emit AllocationUpdated(_proofScore, _governance, _fees);
    }

    /**
     * @notice Set staking contract
     * @param _stakingContract Staking contract address
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid staking");
        stakingContract = _stakingContract;
    }

    /**
     * @notice Set ProofScore contract
     * @param _proofScoreContract ProofScore contract address
     */
    function setProofScoreContract(address _proofScoreContract) external onlyOwner {
        proofScoreContract = _proofScoreContract;
    }

    /**
     * @notice Set governance contract
     * @param _governanceContract Governance contract address
     */
    function setGovernanceContract(address _governanceContract) external onlyOwner {
        governanceContract = _governanceContract;
    }

    /**
     * @notice Set treasury
     * @param _treasury Treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
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
