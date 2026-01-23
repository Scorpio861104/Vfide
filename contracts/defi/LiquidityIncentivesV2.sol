// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title LiquidityIncentivesV2
 * @notice LP reward system for Uniswap V3 positions
 * @dev Tracks NFT positions and distributes rewards via gauge voting
 * 
 * Features:
 * - Uniswap V3 position tracking
 * - NFT position staking
 * - Gauge voting for emissions
 * - Merkle tree distribution
 * - Pool whitelisting
 * - Time-weighted liquidity rewards
 */
contract LiquidityIncentivesV2 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice VFIDE token
    IERC20 public immutable vfideToken;

    /// @notice Uniswap V3 Position Manager
    address public immutable positionManager;

    /// @notice Emission rate per second
    uint256 public emissionRate = 10 * 1e18; // 10 VFIDE per second

    /// @notice Total liquidity staked
    uint256 public totalLiquidity;

    /// @notice Whitelisted pools
    mapping(address => bool) public whitelistedPools;

    /// @notice Pool gauge votes
    mapping(address => uint256) public poolGaugeVotes;

    /// @notice Total gauge votes
    uint256 public totalGaugeVotes;

    /// @notice LP positions
    struct LPPosition {
        uint256 tokenId;
        address pool;
        uint128 liquidity;
        uint256 rewardDebt;
        uint256 stakedAt;
        uint256 lastUpdateTime;
        address owner;
    }

    /// @notice User LP positions
    mapping(address => LPPosition[]) public userPositions;

    /// @notice Token ID to position index
    mapping(uint256 => PositionInfo) public tokenIdToPosition;

    struct PositionInfo {
        address owner;
        uint256 index;
        bool exists;
    }

    /// @notice Reward per liquidity unit
    uint256 public accRewardPerLiquidity;

    /// @notice Last reward update time
    uint256 public lastRewardTime;

    /// @notice Merkle root for reward distribution
    bytes32 public merkleRoot;

    /// @notice Claimed rewards via merkle
    mapping(address => mapping(uint256 => bool)) public merkleClaimed;

    /// @notice User voting power (from staked liquidity)
    mapping(address => uint256) public votingPower;

    /// @notice User pool votes
    mapping(address => mapping(address => uint256)) public userPoolVotes;

    // Events
    event PositionStaked(
        address indexed user,
        uint256 indexed tokenId,
        address indexed pool,
        uint128 liquidity
    );

    event PositionUnstaked(
        address indexed user,
        uint256 indexed tokenId,
        uint256 rewards
    );

    event RewardsClaimed(
        address indexed user,
        uint256 amount
    );

    event PoolWhitelisted(address indexed pool, bool status);
    
    event EmissionRateUpdated(uint256 oldRate, uint256 newRate);
    
    event GaugeVoted(
        address indexed user,
        address indexed pool,
        uint256 votes
    );

    event MerkleRootUpdated(bytes32 indexed root);

    error InvalidPool();
    error InvalidTokenId();
    error NotPositionOwner();
    error PositionNotStaked();
    error InsufficientVotingPower();
    error AlreadyClaimed();

    /**
     * @notice Constructor
     * @param _vfideToken VFIDE token address
     * @param _positionManager Uniswap V3 Position Manager address
     * @param _owner Owner address
     */
    constructor(
        address _vfideToken,
        address _positionManager,
        address _owner
    ) {
        require(_vfideToken != address(0), "Invalid token");
        require(_positionManager != address(0), "Invalid position manager");
        
        vfideToken = IERC20(_vfideToken);
        positionManager = _positionManager;
        lastRewardTime = block.timestamp;
        
        _transferOwnership(_owner);
    }

    /**
     * @notice Stake Uniswap V3 NFT position
     * @param tokenId Position token ID
     */
    function stakePosition(uint256 tokenId) external nonReentrant whenNotPaused {
        // Update rewards before staking
        _updateRewards();

        // Get position details
        (
            ,
            ,
            address token0,
            address token1,
            uint24 fee,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,
        ) = IPositionManager(positionManager).positions(tokenId);

        // Determine pool address
        address pool = _getPoolAddress(token0, token1, fee);
        
        if (!whitelistedPools[pool]) revert InvalidPool();
        if (liquidity == 0) revert InvalidTokenId();

        // Transfer NFT to contract
        IERC721(positionManager).transferFrom(msg.sender, address(this), tokenId);

        // Create position record
        LPPosition memory position = LPPosition({
            tokenId: tokenId,
            pool: pool,
            liquidity: liquidity,
            rewardDebt: (uint256(liquidity) * accRewardPerLiquidity) / 1e18,
            stakedAt: block.timestamp,
            lastUpdateTime: block.timestamp,
            owner: msg.sender
        });

        uint256 positionIndex = userPositions[msg.sender].length;
        userPositions[msg.sender].push(position);

        // Update tracking
        tokenIdToPosition[tokenId] = PositionInfo({
            owner: msg.sender,
            index: positionIndex,
            exists: true
        });

        // Update totals
        totalLiquidity += liquidity;
        votingPower[msg.sender] += liquidity;

        emit PositionStaked(msg.sender, tokenId, pool, liquidity);
    }

    /**
     * @notice Unstake position and claim rewards
     * @param tokenId Position token ID
     */
    function unstakePosition(uint256 tokenId) external nonReentrant {
        PositionInfo memory info = tokenIdToPosition[tokenId];
        
        if (!info.exists) revert PositionNotStaked();
        if (info.owner != msg.sender) revert NotPositionOwner();

        // Update rewards before unstaking
        _updateRewards();

        LPPosition storage position = userPositions[msg.sender][info.index];
        
        // Calculate pending rewards
        uint256 pending = _calculatePending(position);

        // Update totals
        totalLiquidity -= position.liquidity;
        votingPower[msg.sender] -= position.liquidity;

        // Transfer NFT back to user
        IERC721(positionManager).transferFrom(address(this), msg.sender, tokenId);

        // Claim rewards
        if (pending > 0) {
            vfideToken.safeTransfer(msg.sender, pending);
        }

        emit PositionUnstaked(msg.sender, tokenId, pending);

        // Clear position
        delete tokenIdToPosition[tokenId];
        delete userPositions[msg.sender][info.index];
    }

    /**
     * @notice Claim rewards for all positions
     */
    function claimAllRewards() external nonReentrant {
        _updateRewards();
        
        uint256 totalPending = 0;
        LPPosition[] storage positions = userPositions[msg.sender];
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].tokenId == 0) continue; // Skip deleted positions
            
            uint256 pending = _calculatePending(positions[i]);
            if (pending > 0) {
                positions[i].rewardDebt = (uint256(positions[i].liquidity) * accRewardPerLiquidity) / 1e18;
                positions[i].lastUpdateTime = block.timestamp;
                totalPending += pending;
            }
        }

        if (totalPending > 0) {
            vfideToken.safeTransfer(msg.sender, totalPending);
            emit RewardsClaimed(msg.sender, totalPending);
        }
    }

    /**
     * @notice Vote for pool gauge weights
     * @param pool Pool address
     * @param votes Number of votes (from staked liquidity)
     */
    function voteGauge(address pool, uint256 votes) external {
        if (!whitelistedPools[pool]) revert InvalidPool();
        if (votes > votingPower[msg.sender]) revert InsufficientVotingPower();

        // Remove old votes
        uint256 oldVotes = userPoolVotes[msg.sender][pool];
        if (oldVotes > 0) {
            poolGaugeVotes[pool] -= oldVotes;
            totalGaugeVotes -= oldVotes;
        }

        // Add new votes
        userPoolVotes[msg.sender][pool] = votes;
        poolGaugeVotes[pool] += votes;
        totalGaugeVotes += votes;

        emit GaugeVoted(msg.sender, pool, votes);
    }

    /**
     * @notice Claim rewards via Merkle proof
     * @param amount Amount to claim
     * @param merkleProof Merkle proof
     * @param epoch Claim epoch
     */
    function claimMerkle(
        uint256 amount,
        bytes32[] calldata merkleProof,
        uint256 epoch
    ) external nonReentrant {
        if (merkleClaimed[msg.sender][epoch]) revert AlreadyClaimed();

        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount, epoch));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        // Mark as claimed
        merkleClaimed[msg.sender][epoch] = true;

        // Transfer rewards
        vfideToken.safeTransfer(msg.sender, amount);

        emit RewardsClaimed(msg.sender, amount);
    }

    /**
     * @notice Update reward accumulator
     */
    function _updateRewards() internal {
        if (block.timestamp <= lastRewardTime) return;
        
        if (totalLiquidity == 0) {
            lastRewardTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastRewardTime;
        uint256 rewards = timeElapsed * emissionRate;
        
        accRewardPerLiquidity += (rewards * 1e18) / totalLiquidity;
        lastRewardTime = block.timestamp;
    }

    /**
     * @notice Calculate pending rewards for position
     * @param position LP position
     * @return pending Pending rewards
     */
    function _calculatePending(LPPosition memory position) internal view returns (uint256 pending) {
        uint256 accReward = accRewardPerLiquidity;
        
        if (block.timestamp > lastRewardTime && totalLiquidity > 0) {
            uint256 timeElapsed = block.timestamp - lastRewardTime;
            uint256 rewards = timeElapsed * emissionRate;
            accReward += (rewards * 1e18) / totalLiquidity;
        }
        
        pending = (uint256(position.liquidity) * accReward) / 1e18 - position.rewardDebt;
        return pending;
    }

    /**
     * @notice Get pool address (simplified - use Uniswap factory in production)
     * @param token0 Token 0 address
     * @param token1 Token 1 address
     * @param fee Fee tier
     * @return pool Pool address
     */
    function _getPoolAddress(
        address token0,
        address token1,
        uint24 fee
    ) internal pure returns (address pool) {
        // This is simplified - in production use Uniswap V3 Factory
        return address(uint160(uint256(keccak256(abi.encodePacked(token0, token1, fee)))));
    }

    /**
     * @notice Get user position count
     * @param user User address
     * @return count Position count
     */
    function getUserPositionCount(address user) external view returns (uint256 count) {
        return userPositions[user].length;
    }

    /**
     * @notice Get user position
     * @param user User address
     * @param index Position index
     * @return position LP position
     */
    function getUserPosition(
        address user,
        uint256 index
    ) external view returns (LPPosition memory position) {
        require(index < userPositions[user].length, "Invalid index");
        return userPositions[user][index];
    }

    /**
     * @notice Get pending rewards for user
     * @param user User address
     * @return total Total pending rewards
     */
    function getPendingRewards(address user) external view returns (uint256 total) {
        LPPosition[] memory positions = userPositions[user];
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].tokenId == 0) continue;
            total += _calculatePending(positions[i]);
        }
        
        return total;
    }

    /**
     * @notice Whitelist pool
     * @param pool Pool address
     * @param status Whitelist status
     */
    function setPoolWhitelist(address pool, bool status) external onlyOwner {
        whitelistedPools[pool] = status;
        emit PoolWhitelisted(pool, status);
    }

    /**
     * @notice Set emission rate
     * @param _emissionRate New emission rate
     */
    function setEmissionRate(uint256 _emissionRate) external onlyOwner {
        _updateRewards();
        uint256 oldRate = emissionRate;
        emissionRate = _emissionRate;
        emit EmissionRateUpdated(oldRate, _emissionRate);
    }

    /**
     * @notice Set merkle root for distribution
     * @param _merkleRoot New merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    /**
     * @notice Pause incentives
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause incentives
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}

/**
 * @notice Interface for Uniswap V3 Position Manager
 */
interface IPositionManager {
    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );
}
