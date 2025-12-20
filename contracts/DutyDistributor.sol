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
        userPoints[voter] += pointsPerVote;
        totalPoints += pointsPerVote;
        emit DutyPointsEarned(voter, pointsPerVote, "vote");
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
        
        // Reset points (simple model: claim burns points)
        userPoints[msg.sender] = 0;
        totalPoints -= points;

        // Request payment from Vault
        ecosystemVault.payExpense(msg.sender, reward, "duty_reward");
        
        emit RewardsClaimed(msg.sender, reward);
    }
}
