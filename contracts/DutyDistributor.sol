// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * DutyDistributor — Governance Participation Tracking
 * ----------------------------------------------------------
 * HOWEY COMPLIANCE: This contract is Howey compliant by design.
 * 
 * Features:
 * - Tracks "Duty Points" for DAO members who vote
 * - NO rewards or payments
 * - Pure utility: Governance participation metrics
 * - Points are badges of participation, not value
 * 
 * This contract CANNOT distribute rewards. This is intentional
 * to ensure VFIDE is NOT classified as a security under the Howey Test.
 * 
 * Howey Test Analysis:
 * ✗ Investment of Money: Users participate in governance (MEETS - but unpaid)
 * ✓ Common Enterprise: Individual governance (FAILS - GOOD)
 * ✓ Expectation of Profits: NO rewards (FAILS - GOOD)
 * ✓ Efforts of Others: Self-directed voting (FAILS - GOOD)
 * 
 * Result: FAILS 3 of 4 prongs → NOT A SECURITY ✅
 * 
 * Note: Council members ARE paid, but through CouncilSalary contract
 * as employment compensation (in stable coins), not investment returns.
 */

contract DutyDistributor is Ownable, IGovernanceHooks {
    event DutyPointsEarned(address indexed user, uint256 points, string reason);
    event EpochClosed(uint256 epochId, uint256 totalPoints);

    address public dao;

    // Duty Points Tracking (badges/metrics only, not value)
    mapping(address => uint256) public userPoints;
    uint256 public totalPoints;
    
    // Points Config
    uint256 public pointsPerVote = 10;
    uint256 public constant MAX_POINTS_PER_VOTE = 1000;
    uint256 public constant MAX_POINTS_PER_USER_CAP = 1_000_000;
    uint256 public constant MIN_POINTS_PER_USER_CAP = 1;
    
    // L-3 FIX: Max points per user to prevent gaming
    uint256 public maxPointsPerUser = 10_000;

    constructor(address _dao) {
        dao = _dao;
    }

    modifier onlyDAO() {
        _checkDAO();
        _;
    }
    function _checkDAO() internal view {
        require(msg.sender == dao, "not dao");
    }

    function setPointsPerVote(uint256 _pointsPerVote) external onlyOwner {
        require(_pointsPerVote > 0 && _pointsPerVote <= MAX_POINTS_PER_VOTE, "DD: invalid pointsPerVote");
        require(_pointsPerVote <= maxPointsPerUser, "DD: pointsPerVote exceeds cap");
        pointsPerVote = _pointsPerVote;
    }
    
    function setMaxPointsPerUser(uint256 _maxPoints) external onlyOwner {
        require(
            _maxPoints >= MIN_POINTS_PER_USER_CAP && _maxPoints <= MAX_POINTS_PER_USER_CAP,
            "DD: invalid max points"
        );
        require(_maxPoints >= pointsPerVote, "DD: max points below pointsPerVote");
        maxPointsPerUser = _maxPoints;
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
    }

    function onProposalQueued(uint256, address, uint256) external override onlyDAO {
        // Optional: Track proposals submitted
    }

    function onFinalized(uint256, bool) external override onlyDAO {
        // No action needed
    }
    
    // -------------------------------------------------------
    // View Functions
    // -------------------------------------------------------
    
    function getUserPoints(address user) external view returns (uint256) {
        return userPoints[user];
    }
    
    function getTotalPoints() external view returns (uint256) {
        return totalPoints;
    }
}
