// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * DutyDistributor — Rewards for Active Governance
 * ----------------------------------------------------------
 * Tracks "Duty Points" for DAO members who vote.
 * Distributes rewards from the EcosystemVault
 * to active participants.
 *
 * This is "Work-for-Earn", not passive staking.
 */

contract DutyDistributor is Ownable, IGovernanceHooks {
    event DutyPointsEarned(address indexed user, uint256 points, string reason);
    event RewardsClaimed(address indexed user, uint256 amount);
    event EpochClosed(uint256 epochId, uint256 totalPoints);

    IEcosystemVault public ecosystemVault;
    address public dao;

    // Duty Points Tracking
    mapping(address => uint256) public userPoints;
    uint256 public totalPoints;
    
    // Reward Config
    uint256 public pointsPerVote = 10;
    uint256 public rewardPerPoint = 1e18; // 1 VFIDE per point (example)
    
    // H-3 FIX: Reward caps to prevent vault drainage
    uint256 public maxRewardPerClaim = 10_000 * 1e18; // Max 10k VFIDE per claim
    uint256 public maxPointsPerUser = 10_000; // L-3 FIX: Max 10k points per user
    uint256 public dailyRewardCap = 100_000 * 1e18; // Max 100k VFIDE rewards per day
    uint256 public dailyRewardsPaid;
    uint256 public lastRewardResetDay;

    constructor(address _ecosystemVault, address _dao) {
        ecosystemVault = IEcosystemVault(_ecosystemVault);
        dao = _dao;
    }

    modifier onlyDAO() {
        _checkDAO();
        _;
    }
    function _checkDAO() internal view {
        require(msg.sender == dao, "not dao");
    }

    function setParams(uint256 _pointsPerVote, uint256 _rewardPerPoint) external onlyOwner {
        pointsPerVote = _pointsPerVote;
        rewardPerPoint = _rewardPerPoint;
    }

    // -------------------------------------------------------
    // Governance Hooks (Called by DAO)
    // -------------------------------------------------------

    function onVoteCast(uint256 /*id*/, address voter, bool /*support*/) external override onlyDAO {
        // L-3 FIX: Check points cap before adding
        if (userPoints[voter] + pointsPerVote <= maxPointsPerUser) {
            userPoints[voter] += pointsPerVote;
            totalPoints += pointsPerVote;
            emit DutyPointsEarned(voter, pointsPerVote, "vote");
        }
        // If at cap, emit event but don't add more points
    }

    function onProposalQueued(uint256, address, uint256) external override onlyDAO {
        // Optional: Reward proposer?
    }

    function onFinalized(uint256, bool) external override onlyDAO {
        // No action needed
    }

    // -------------------------------------------------------
    // Claim Rewards
    // -------------------------------------------------------

    function claimRewards() external {
        uint256 points = userPoints[msg.sender];
        require(points > 0, "no points");

        uint256 reward = points * rewardPerPoint;
        uint256 pointsToConsume = points; // FLOW-7 FIX: Track how many points to burn
        
        // H-3 FIX: Apply maximum reward cap
        if (reward > maxRewardPerClaim) {
            reward = maxRewardPerClaim;
            // FLOW-7 FIX: Only consume points equivalent to the capped reward
            // This prevents losing points when reward is capped
            pointsToConsume = maxRewardPerClaim / rewardPerPoint;
            if (pointsToConsume == 0) pointsToConsume = 1; // Consume at least 1 point
        }
        
        // H-3 FIX: Check and reset daily cap
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastRewardResetDay) {
            dailyRewardsPaid = 0;
            lastRewardResetDay = currentDay;
        }
        
        // H-3 FIX: Enforce daily cap
        // FLOW-7 FIX: If daily cap limits reward, also limit points consumed
        if (dailyRewardsPaid + reward > dailyRewardCap) {
            uint256 availableReward = dailyRewardCap - dailyRewardsPaid;
            require(availableReward > 0, "DD: daily cap exceeded");
            reward = availableReward;
            pointsToConsume = availableReward / rewardPerPoint;
            if (pointsToConsume == 0) pointsToConsume = 1;
        }
        dailyRewardsPaid += reward;
        
        // Consume only the points that correspond to claimed reward
        userPoints[msg.sender] -= pointsToConsume;
        totalPoints -= pointsToConsume;

        // Request payment from Vault
        ecosystemVault.payExpense(msg.sender, reward, "duty_reward");
        
        emit RewardsClaimed(msg.sender, reward);
    }
    
    /// @notice DAO can set reward caps (H-3 fix)
    function setRewardCaps(uint256 _maxPerClaim, uint256 _maxPointsPerUser, uint256 _dailyCap) external onlyOwner {
        maxRewardPerClaim = _maxPerClaim;
        maxPointsPerUser = _maxPointsPerUser;
        dailyRewardCap = _dailyCap;
    }
}
