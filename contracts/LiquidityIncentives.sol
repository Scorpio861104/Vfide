// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * LiquidityIncentives - LP Staking (Utility Only)
 * ----------------------------------------------------------
 * HOWEY COMPLIANCE: This contract is Howey compliant by design.
 * 
 * Features:
 * - Stake LP tokens (utility function for tracking participation)
 * - NO rewards or yields
 * - NO profit expectations from efforts of others
 * - Pure utility: Track LP participation metrics
 * - LP tokens exempt from whale limits
 * - Integrates with DEX (Uniswap V2/V3 style)
 * 
 * This contract CANNOT distribute rewards. This is intentional
 * to ensure VFIDE is NOT classified as a security under the Howey Test.
 * 
 * Howey Test Analysis:
 * ✗ Investment of Money: Users buy/stake tokens (MEETS)
 * ✓ Common Enterprise: Individual holdings (FAILS - GOOD)
 * ✓ Expectation of Profits: NO rewards (FAILS - GOOD)
 * ✓ Efforts of Others: User-controlled (FAILS - GOOD)
 * 
 * Result: FAILS 3 of 4 prongs → NOT A SECURITY ✅
 */

error LP_Zero();
error LP_NotDAO();
error LP_NotActive();
error LP_InsufficientBalance();
error LP_Cooldown();

interface ILPToken {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract LiquidityIncentives is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MIN_UNSTAKE_COOLDOWN = 1 minutes;
    uint256 public constant MAX_UNSTAKE_COOLDOWN = 7 days;
    
    event PoolAdded(address indexed lpToken, string name);
    event PoolUpdated(address indexed lpToken, bool active);
    event Staked(address indexed user, address indexed lpToken, uint256 amount);
    event Unstaked(address indexed user, address indexed lpToken, uint256 amount);
    
    address public dao;
    IVFIDEToken public vfideToken;
    
    // Pool configuration - tracking only, no rewards
    struct Pool {
        address lpToken;
        string name;           // e.g., "VFIDE/ETH", "VFIDE/USDC"
        uint256 totalStaked;
        bool active;
    }
    
    // User stake info per pool - tracking only, no rewards
    struct UserStake {
        uint256 amount;
        uint256 stakedAt;
    }
    
    mapping(address => Pool) public pools;
    address[] public poolList;
    mapping(address => mapping(address => UserStake)) public userStakes; // lpToken => user => stake
    
    // Cooldown to prevent flash loans
    uint256 public unstakeCooldown = 1 days;
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert LP_NotDAO();
        _;
    }
    
    constructor(address _dao, address _vfideToken) {
        if (_dao == address(0) || _vfideToken == address(0)) revert LP_Zero();
        dao = _dao;
        vfideToken = IVFIDEToken(_vfideToken);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add a new LP token pool for tracking
     * @param lpToken Address of the LP token (e.g., VFIDE/ETH Uniswap LP)
     * @param name Pool name for display
     */
    function addPool(address lpToken, string calldata name) external onlyDAO {
        require(lpToken != address(0), "LP: zero token");
        require(pools[lpToken].lpToken == address(0), "LP: pool exists");
        
        pools[lpToken] = Pool({
            lpToken: lpToken,
            name: name,
            totalStaked: 0,
            active: true
        });
        
        poolList.push(lpToken);
        
        // Mark LP token as whale-exempt in VFIDE token
        try vfideToken.setWhaleLimitExempt(lpToken, true) {} catch {}

        emit PoolAdded(lpToken, name);
    }
    
    /**
     * @notice Update pool active status
     */
    function updatePool(address lpToken, bool active) external onlyDAO {
        require(pools[lpToken].lpToken != address(0), "LP: pool not found");
        
        pools[lpToken].active = active;
        
        emit PoolUpdated(lpToken, active);
    }
    
    /**
     * @notice Set unstake cooldown
     */
    function setUnstakeCooldown(uint256 cooldown) external onlyDAO {
        require(cooldown >= MIN_UNSTAKE_COOLDOWN, "LP: cooldown too short");
        require(cooldown <= MAX_UNSTAKE_COOLDOWN, "LP: cooldown too long");
        unstakeCooldown = cooldown;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              USER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Stake LP tokens (utility tracking only, no rewards)
     * Add nonReentrant to prevent reentrancy via malicious LP tokens
     */
    function stake(address lpToken, uint256 amount) external nonReentrant {
        Pool storage pool = pools[lpToken];
        if (!pool.active) revert LP_NotActive();
        if (amount == 0) revert LP_Zero();

        UserStake storage userStake = userStakes[lpToken][msg.sender];

        if (userStake.stakedAt == 0) {
            userStake.stakedAt = block.timestamp;
        }

        userStake.amount += amount;
        pool.totalStaked += amount;

        // Interaction after state effects; transaction reverts atomically on transfer failure.
        IERC20(lpToken).safeTransferFrom(msg.sender, address(this), amount);
        
        emit Staked(msg.sender, lpToken, amount);
    }
    
    /**
     * @notice Unstake LP tokens
     * Add nonReentrant to prevent reentrancy via malicious LP tokens
     */
    function unstake(address lpToken, uint256 amount) external nonReentrant {
        UserStake storage userStake = userStakes[lpToken][msg.sender];
        if (userStake.amount < amount) revert LP_InsufficientBalance();
        if (block.timestamp < userStake.stakedAt + unstakeCooldown) revert LP_Cooldown();
        
        userStake.amount -= amount;
        pools[lpToken].totalStaked -= amount;
        
        // Reset stake time if fully unstaked
        if (userStake.amount == 0) {
            userStake.stakedAt = 0;
        }
        
        // Transfer LP tokens back
        IERC20(lpToken).safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, lpToken, amount);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get user's stake info
     */
    function getUserStake(address lpToken, address user) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 stakeDuration
    ) {
        UserStake storage userStake = userStakes[lpToken][user];
        amount = userStake.amount;
        stakedAt = userStake.stakedAt;
        stakeDuration = stakedAt > 0 ? block.timestamp - stakedAt : 0;
    }
    
    /**
     * @notice Get pool info
     */
    function getPoolInfo(address lpToken) external view returns (
        string memory name,
        uint256 totalStaked,
        bool active
    ) {
        Pool storage pool = pools[lpToken];
        name = pool.name;
        totalStaked = pool.totalStaked;
        active = pool.active;
    }
    
    /**
     * @notice Get all pools
     */
    function getAllPools() external view returns (address[] memory) {
        return poolList;
    }
    
    /**
     * @notice Get pool count
     */
    function getPoolCount() external view returns (uint256) {
        return poolList.length;
    }
}
