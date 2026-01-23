// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VFIDEStaking
 * @notice Core staking contract with lock periods and multipliers
 * @dev Implements time-locked staking with reward multipliers
 * 
 * Features:
 * - Lock periods: 1w, 4w, 13w, 52w
 * - Multipliers: 1.0x, 1.25x, 1.5x, 2.0x
 * - Reward distribution (50% ProofScore, 30% governance, 20% fees)
 * - Early unstake penalties
 * - Compound rewards
 * - Emergency withdrawal
 */
contract VFIDEStaking is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice VFIDE token
    IERC20 public immutable vfideToken;

    /// @notice Rewards contract
    address public rewardsContract;

    /// @notice Governance power contract
    address public governancePower;

    /// @notice Treasury address
    address public treasury;

    /// @notice Total staked amount
    uint256 public totalStaked;

    /// @notice Total weighted stake (stake * multiplier)
    uint256 public totalWeightedStake;

    /// @notice Early unstake penalty (20%)
    uint256 public earlyUnstakePenalty = 2000; // 20% in basis points

    /// @notice Minimum stake amount (100 VFIDE)
    uint256 public constant MIN_STAKE = 100 * 1e18;

    /// @notice Maximum stake amount (1M VFIDE)
    uint256 public maxStake = 1_000_000 * 1e18;

    /// @notice Lock period definitions (in weeks)
    enum LockPeriod {
        ONE_WEEK,    // 1 week = 1.0x
        FOUR_WEEKS,  // 4 weeks = 1.25x
        THIRTEEN_WEEKS, // 13 weeks = 1.5x
        FIFTY_TWO_WEEKS // 52 weeks = 2.0x
    }

    /// @notice Stake position
    struct StakePosition {
        uint256 amount;
        uint256 weightedAmount;
        uint256 lockEndTime;
        LockPeriod lockPeriod;
        uint256 multiplier; // 100 = 1.0x, 200 = 2.0x
        uint256 rewardDebt;
        uint256 stakedAt;
        uint256 lastClaimTime;
        bool compoundEnabled;
    }

    /// @notice User stakes
    mapping(address => StakePosition[]) public userStakes;

    /// @notice User total staked
    mapping(address => uint256) public userTotalStaked;

    /// @notice User total weighted stake
    mapping(address => uint256) public userTotalWeighted;

    /// @notice Reward per weighted token
    uint256 public accRewardPerWeightedToken;

    /// @notice Last reward distribution time
    uint256 public lastRewardTime;

    /// @notice Reward rate (tokens per second)
    uint256 public rewardRate = 1e18; // 1 VFIDE per second

    // Events
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        LockPeriod lockPeriod,
        uint256 multiplier,
        uint256 lockEndTime
    );

    event Unstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 penalty
    );

    event RewardsClaimed(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount
    );

    event RewardsCompounded(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount
    );

    event EarlyUnstakePenaltyUpdated(uint256 oldPenalty, uint256 newPenalty);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event CompoundStatusUpdated(address indexed user, uint256 indexed stakeId, bool enabled);

    error InvalidAmount();
    error InvalidLockPeriod();
    error StakeLocked();
    error NoStakeFound();
    error InvalidStakeId();

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
        lastRewardTime = block.timestamp;
        
        _transferOwnership(_owner);
    }

    /**
     * @notice Stake VFIDE tokens
     * @param amount Amount to stake
     * @param lockPeriod Lock period selection
     * @return stakeId Stake position ID
     */
    function stake(
        uint256 amount,
        LockPeriod lockPeriod
    ) external nonReentrant whenNotPaused returns (uint256 stakeId) {
        if (amount < MIN_STAKE || amount > maxStake) revert InvalidAmount();

        // Update rewards before staking
        _updateRewards();

        // Calculate multiplier and lock time
        uint256 multiplier = _getMultiplier(lockPeriod);
        uint256 lockDuration = _getLockDuration(lockPeriod);
        uint256 lockEndTime = block.timestamp + lockDuration;
        uint256 weightedAmount = (amount * multiplier) / 100;

        // Transfer tokens
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);

        // Create stake position
        StakePosition memory position = StakePosition({
            amount: amount,
            weightedAmount: weightedAmount,
            lockEndTime: lockEndTime,
            lockPeriod: lockPeriod,
            multiplier: multiplier,
            rewardDebt: (weightedAmount * accRewardPerWeightedToken) / 1e18,
            stakedAt: block.timestamp,
            lastClaimTime: block.timestamp,
            compoundEnabled: false
        });

        stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(position);

        // Update totals
        totalStaked += amount;
        totalWeightedStake += weightedAmount;
        userTotalStaked[msg.sender] += amount;
        userTotalWeighted[msg.sender] += weightedAmount;

        emit Staked(msg.sender, stakeId, amount, lockPeriod, multiplier, lockEndTime);

        return stakeId;
    }

    /**
     * @notice Unstake tokens
     * @param stakeId Stake position ID
     */
    function unstake(uint256 stakeId) external nonReentrant {
        if (stakeId >= userStakes[msg.sender].length) revert InvalidStakeId();
        
        StakePosition storage position = userStakes[msg.sender][stakeId];
        if (position.amount == 0) revert NoStakeFound();

        // Update rewards before unstaking
        _updateRewards();

        // Claim pending rewards
        _claimRewards(msg.sender, stakeId);

        uint256 amount = position.amount;
        uint256 penalty = 0;

        // Calculate early unstake penalty
        if (block.timestamp < position.lockEndTime) {
            penalty = (amount * earlyUnstakePenalty) / 10000;
            amount -= penalty;
            
            // Transfer penalty to treasury
            if (penalty > 0) {
                vfideToken.safeTransfer(treasury, penalty);
            }
        }

        // Update totals
        totalStaked -= position.amount;
        totalWeightedStake -= position.weightedAmount;
        userTotalStaked[msg.sender] -= position.amount;
        userTotalWeighted[msg.sender] -= position.weightedAmount;

        // Transfer tokens to user
        vfideToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, stakeId, amount, penalty);

        // Clear stake position
        delete userStakes[msg.sender][stakeId];
    }

    /**
     * @notice Claim rewards for a stake
     * @param stakeId Stake position ID
     */
    function claimRewards(uint256 stakeId) external nonReentrant {
        if (stakeId >= userStakes[msg.sender].length) revert InvalidStakeId();
        
        _updateRewards();
        _claimRewards(msg.sender, stakeId);
    }

    /**
     * @notice Internal claim rewards
     * @param user User address
     * @param stakeId Stake position ID
     */
    function _claimRewards(address user, uint256 stakeId) internal {
        StakePosition storage position = userStakes[user][stakeId];
        if (position.amount == 0) return;

        uint256 pending = _calculatePendingRewards(position);
        
        if (pending > 0) {
            position.rewardDebt = (position.weightedAmount * accRewardPerWeightedToken) / 1e18;
            position.lastClaimTime = block.timestamp;

            if (position.compoundEnabled) {
                // Compound rewards back into stake
                _compoundRewards(user, stakeId, pending);
            } else {
                // Transfer rewards to user
                vfideToken.safeTransfer(user, pending);
                emit RewardsClaimed(user, stakeId, pending);
            }
        }
    }

    /**
     * @notice Compound rewards into stake
     * @param user User address
     * @param stakeId Stake position ID
     * @param rewardAmount Reward amount to compound
     */
    function _compoundRewards(address user, uint256 stakeId, uint256 rewardAmount) internal {
        StakePosition storage position = userStakes[user][stakeId];
        
        // Calculate new weighted amount
        uint256 newWeightedAmount = (rewardAmount * position.multiplier) / 100;
        
        // Update position
        position.amount += rewardAmount;
        position.weightedAmount += newWeightedAmount;
        
        // Update totals
        totalStaked += rewardAmount;
        totalWeightedStake += newWeightedAmount;
        userTotalStaked[user] += rewardAmount;
        userTotalWeighted[user] += newWeightedAmount;
        
        emit RewardsCompounded(user, stakeId, rewardAmount);
    }

    /**
     * @notice Toggle auto-compound for a stake
     * @param stakeId Stake position ID
     * @param enabled Enable/disable auto-compound
     */
    function setCompound(uint256 stakeId, bool enabled) external {
        if (stakeId >= userStakes[msg.sender].length) revert InvalidStakeId();
        
        userStakes[msg.sender][stakeId].compoundEnabled = enabled;
        emit CompoundStatusUpdated(msg.sender, stakeId, enabled);
    }

    /**
     * @notice Update reward distribution
     */
    function _updateRewards() internal {
        if (block.timestamp <= lastRewardTime) return;
        
        if (totalWeightedStake == 0) {
            lastRewardTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastRewardTime;
        uint256 rewards = timeElapsed * rewardRate;
        
        accRewardPerWeightedToken += (rewards * 1e18) / totalWeightedStake;
        lastRewardTime = block.timestamp;
    }

    /**
     * @notice Calculate pending rewards for a position
     * @param position Stake position
     * @return pending Pending reward amount
     */
    function _calculatePendingRewards(
        StakePosition memory position
    ) internal view returns (uint256 pending) {
        uint256 accReward = accRewardPerWeightedToken;
        
        if (block.timestamp > lastRewardTime && totalWeightedStake > 0) {
            uint256 timeElapsed = block.timestamp - lastRewardTime;
            uint256 rewards = timeElapsed * rewardRate;
            accReward += (rewards * 1e18) / totalWeightedStake;
        }
        
        pending = (position.weightedAmount * accReward) / 1e18 - position.rewardDebt;
        return pending;
    }

    /**
     * @notice Get pending rewards for a user's stake
     * @param user User address
     * @param stakeId Stake position ID
     * @return pending Pending rewards
     */
    function pendingRewards(address user, uint256 stakeId) external view returns (uint256 pending) {
        if (stakeId >= userStakes[user].length) return 0;
        
        StakePosition memory position = userStakes[user][stakeId];
        if (position.amount == 0) return 0;
        
        return _calculatePendingRewards(position);
    }

    /**
     * @notice Get multiplier for lock period
     * @param lockPeriod Lock period
     * @return multiplier Multiplier (100 = 1.0x)
     */
    function _getMultiplier(LockPeriod lockPeriod) internal pure returns (uint256 multiplier) {
        if (lockPeriod == LockPeriod.ONE_WEEK) return 100; // 1.0x
        if (lockPeriod == LockPeriod.FOUR_WEEKS) return 125; // 1.25x
        if (lockPeriod == LockPeriod.THIRTEEN_WEEKS) return 150; // 1.5x
        if (lockPeriod == LockPeriod.FIFTY_TWO_WEEKS) return 200; // 2.0x
        revert InvalidLockPeriod();
    }

    /**
     * @notice Get lock duration for lock period
     * @param lockPeriod Lock period
     * @return duration Duration in seconds
     */
    function _getLockDuration(LockPeriod lockPeriod) internal pure returns (uint256 duration) {
        if (lockPeriod == LockPeriod.ONE_WEEK) return 1 weeks;
        if (lockPeriod == LockPeriod.FOUR_WEEKS) return 4 weeks;
        if (lockPeriod == LockPeriod.THIRTEEN_WEEKS) return 13 weeks;
        if (lockPeriod == LockPeriod.FIFTY_TWO_WEEKS) return 52 weeks;
        revert InvalidLockPeriod();
    }

    /**
     * @notice Get user stake count
     * @param user User address
     * @return count Number of stakes
     */
    function getUserStakeCount(address user) external view returns (uint256 count) {
        return userStakes[user].length;
    }

    /**
     * @notice Get user stake
     * @param user User address
     * @param stakeId Stake position ID
     * @return position Stake position
     */
    function getUserStake(
        address user,
        uint256 stakeId
    ) external view returns (StakePosition memory position) {
        require(stakeId < userStakes[user].length, "Invalid stake ID");
        return userStakes[user][stakeId];
    }

    /**
     * @notice Set reward rate
     * @param _rewardRate New reward rate
     */
    function setRewardRate(uint256 _rewardRate) external onlyOwner {
        _updateRewards();
        uint256 oldRate = rewardRate;
        rewardRate = _rewardRate;
        emit RewardRateUpdated(oldRate, _rewardRate);
    }

    /**
     * @notice Set early unstake penalty
     * @param _penalty New penalty in basis points
     */
    function setEarlyUnstakePenalty(uint256 _penalty) external onlyOwner {
        require(_penalty <= 5000, "Max 50%");
        uint256 oldPenalty = earlyUnstakePenalty;
        earlyUnstakePenalty = _penalty;
        emit EarlyUnstakePenaltyUpdated(oldPenalty, _penalty);
    }

    /**
     * @notice Set max stake
     * @param _maxStake New max stake
     */
    function setMaxStake(uint256 _maxStake) external onlyOwner {
        maxStake = _maxStake;
    }

    /**
     * @notice Set rewards contract
     * @param _rewardsContract Rewards contract address
     */
    function setRewardsContract(address _rewardsContract) external onlyOwner {
        rewardsContract = _rewardsContract;
    }

    /**
     * @notice Set governance power contract
     * @param _governancePower Governance power contract address
     */
    function setGovernancePower(address _governancePower) external onlyOwner {
        governancePower = _governancePower;
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

    /**
     * @notice Pause staking
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause staking
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
