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
    event ComplianceModeUpdated(bool enabled);

    IEcosystemVault public ecosystemVault;
    address public dao;

    // Compliance mode disables reward accrual and payout
    bool public complianceMode = true;

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

    /// @notice Permanently disabled — compliance mode is irrevocable
    function setParams(uint256, uint256) external view onlyOwner {
        revert("DD: permanently disabled");
    }

    function setComplianceMode(bool enabled) external onlyOwner {
        require(enabled, "DD: compliance mode only");
        complianceMode = true;
        emit ComplianceModeUpdated(true);
    }

    // -------------------------------------------------------
    // Governance Hooks (Called by DAO)
    // -------------------------------------------------------

    function onVoteCast(uint256 /*id*/, address voter, bool /*support*/) external override onlyDAO {
        if (complianceMode) return;
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

    /// @notice Permanently disabled — compliance mode is irrevocable
    function claimRewards() external pure {
        revert("DD: permanently disabled");
    }
    
    /// @notice Permanently disabled — compliance mode is irrevocable
    function setRewardCaps(uint256, uint256, uint256) external view onlyOwner {
        revert("DD: permanently disabled");
    }
}
