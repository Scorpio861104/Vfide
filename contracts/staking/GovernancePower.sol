// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernancePower
 * @notice Voting power from staking with multiplier bonuses
 * @dev Implements checkpoint-based voting power tracking
 * 
 * Features:
 * - Staking multiplier bonus
 * - Checkpoint integration for historical voting power
 * - Delegation support
 * - Historical voting power queries
 * - Snapshot-based governance
 */
contract GovernancePower is Ownable {
    /// @notice Staking contract
    address public stakingContract;

    /// @notice Checkpoint for voting power
    struct Checkpoint {
        uint256 fromBlock;
        uint256 votes;
    }

    /// @notice User checkpoints
    mapping(address => mapping(uint256 => Checkpoint)) public checkpoints;

    /// @notice Number of checkpoints for each user
    mapping(address => uint256) public numCheckpoints;

    /// @notice Delegation mapping
    mapping(address => address) public delegates;

    /// @notice Total voting power at block
    mapping(uint256 => uint256) public totalVotingPowerAt;

    // Events
    event DelegateChanged(
        address indexed delegator,
        address indexed fromDelegate,
        address indexed toDelegate
    );

    event VotingPowerChanged(
        address indexed user,
        uint256 previousVotes,
        uint256 newVotes
    );

    event CheckpointCreated(
        address indexed user,
        uint256 blockNumber,
        uint256 votes
    );

    error OnlyStakingContract();
    error InvalidDelegate();

    modifier onlyStaking() {
        if (msg.sender != stakingContract) revert OnlyStakingContract();
        _;
    }

    constructor(address _owner) {
        _transferOwnership(_owner);
    }

    /**
     * @notice Update voting power for user
     * @param user User address
     * @param weightedStake Weighted stake amount (stake * multiplier)
     */
    function updateVotingPower(
        address user,
        uint256 weightedStake
    ) external onlyStaking {
        address delegatee = delegates[user];
        if (delegatee == address(0)) {
            delegatee = user;
        }

        uint256 oldVotes = getCurrentVotes(delegatee);
        uint256 newVotes = weightedStake;

        _writeCheckpoint(delegatee, newVotes);

        emit VotingPowerChanged(delegatee, oldVotes, newVotes);
    }

    /**
     * @notice Delegate voting power to another address
     * @param delegatee Address to delegate to
     */
    function delegate(address delegatee) external {
        if (delegatee == address(0)) revert InvalidDelegate();
        
        address currentDelegate = delegates[msg.sender];
        if (currentDelegate == address(0)) {
            currentDelegate = msg.sender;
        }

        delegates[msg.sender] = delegatee;

        emit DelegateChanged(msg.sender, currentDelegate, delegatee);

        _moveDelegates(currentDelegate, delegatee, getCurrentVotes(msg.sender));
    }

    /**
     * @notice Get current voting power
     * @param account Account address
     * @return votes Current votes
     */
    function getCurrentVotes(address account) public view returns (uint256 votes) {
        uint256 nCheckpoints = numCheckpoints[account];
        return nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : 0;
    }

    /**
     * @notice Get prior voting power at specific block
     * @param account Account address
     * @param blockNumber Block number
     * @return votes Votes at block
     */
    function getPriorVotes(
        address account,
        uint256 blockNumber
    ) external view returns (uint256 votes) {
        require(blockNumber < block.number, "Not yet determined");

        uint256 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) {
            return 0;
        }

        // Check most recent checkpoint
        if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            return checkpoints[account][nCheckpoints - 1].votes;
        }

        // Check first checkpoint
        if (checkpoints[account][0].fromBlock > blockNumber) {
            return 0;
        }

        // Binary search
        uint256 lower = 0;
        uint256 upper = nCheckpoints - 1;
        
        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = checkpoints[account][center];
            
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        
        return checkpoints[account][lower].votes;
    }

    /**
     * @notice Write checkpoint for voting power
     * @param user User address
     * @param newVotes New vote count
     */
    function _writeCheckpoint(address user, uint256 newVotes) internal {
        uint256 nCheckpoints = numCheckpoints[user];
        
        if (nCheckpoints > 0 && checkpoints[user][nCheckpoints - 1].fromBlock == block.number) {
            // Update existing checkpoint in same block
            checkpoints[user][nCheckpoints - 1].votes = newVotes;
        } else {
            // Create new checkpoint
            checkpoints[user][nCheckpoints] = Checkpoint({
                fromBlock: block.number,
                votes: newVotes
            });
            numCheckpoints[user] = nCheckpoints + 1;
        }

        emit CheckpointCreated(user, block.number, newVotes);
    }

    /**
     * @notice Move delegates between accounts
     * @param srcRep Source representative
     * @param dstRep Destination representative
     * @param amount Amount to move
     */
    function _moveDelegates(
        address srcRep,
        address dstRep,
        uint256 amount
    ) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint256 srcRepNum = numCheckpoints[srcRep];
                uint256 srcRepOld = srcRepNum > 0
                    ? checkpoints[srcRep][srcRepNum - 1].votes
                    : 0;
                uint256 srcRepNew = srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint256 dstRepNum = numCheckpoints[dstRep];
                uint256 dstRepOld = dstRepNum > 0
                    ? checkpoints[dstRep][dstRepNum - 1].votes
                    : 0;
                uint256 dstRepNew = dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepNew);
            }
        }
    }

    /**
     * @notice Get total voting power at current block
     * @return total Total voting power
     */
    function getTotalVotingPower() external view returns (uint256 total) {
        return totalVotingPowerAt[block.number];
    }

    /**
     * @notice Get delegate for account
     * @param account Account address
     * @return delegate Delegate address
     */
    function getDelegate(address account) external view returns (address) {
        address delegatee = delegates[account];
        return delegatee == address(0) ? account : delegatee;
    }

    /**
     * @notice Get checkpoint count for account
     * @param account Account address
     * @return count Checkpoint count
     */
    function getCheckpointCount(address account) external view returns (uint256) {
        return numCheckpoints[account];
    }

    /**
     * @notice Get specific checkpoint
     * @param account Account address
     * @param index Checkpoint index
     * @return checkpoint Checkpoint data
     */
    function getCheckpoint(
        address account,
        uint256 index
    ) external view returns (Checkpoint memory) {
        require(index < numCheckpoints[account], "Invalid index");
        return checkpoints[account][index];
    }

    /**
     * @notice Set staking contract
     * @param _stakingContract Staking contract address
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid staking");
        stakingContract = _stakingContract;
    }
}
