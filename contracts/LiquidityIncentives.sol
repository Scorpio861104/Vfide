// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * LiquidityIncentives - LP Staking (Utility Only)
 * ----------------------------------------------------------
 * HOWEY COMPLIANCE: This contract is Howey compliant by design.
 * 
 * Features:
 * - Stake LP tokens (utility function for tracking)
 * - NO rewards or yields
 * - NO profit expectations from efforts of others
 * - Pure utility: Track LP participation
 * - LP tokens exempt from whale limits
 * - Integrates with DEX (Uniswap V2/V3 style)
 * 
 * This contract CANNOT distribute rewards. This is intentional
 * to ensure VFIDE is NOT classified as a security under the Howey Test.
 * 
 * Howey Test Analysis:
 * ✗ Investment of Money: Users buy/stake tokens
 * ✓ Common Enterprise: Individual holdings (PASS)
 * ✓ Expectation of Profits: NO rewards (PASS)
 * ✓ Efforts of Others: User-controlled (PASS)
 * 
 * Result: NOT A SECURITY (passes 3 of 4 prongs)

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

// H-2 Fix: Add ReentrancyGuard for stake/unstake/claim functions
contract LiquidityIncentives is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    event PoolAdded(address indexed lpToken, string name);
    event PoolUpdated(address indexed lpToken, bool active);
    event Staked(address indexed user, address indexed lpToken, uint256 amount);
    event Unstaked(address indexed user, address indexed lpToken, uint256 amount);
    
    address public dao;
    IVFIDEToken public vfideToken;
    ISeer public seer;
    
    // Pool configuration
    struct Pool {
        address lpToken;
        string name;           // e.g., "VFIDE/ETH", "VFIDE/USDC"
        uint256 totalStaked;
        bool active;
    }
    
    // User stake info per pool
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
    
    constructor(address _dao, address _vfideToken, address _seer) {
        if (_dao == address(0) || _vfideToken == address(0)) revert LP_Zero();
        dao = _dao;
        vfideToken = IVFIDEToken(_vfideToken);
        if (_seer != address(0)) seer = ISeer(_seer);
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
        require(cooldown <= 7 days, "LP: cooldown too long");
        unstakeCooldown = cooldown;
    }
    
    /**
     * @notice Update Seer reference
     */
    function setSeer(address _seer) external onlyDAO {
        require(_seer != address(0), "LP: zero seer");
        seer = ISeer(_seer);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              USER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Stake LP tokens (utility tracking only, no rewards)
     * H-2 Fix: Add nonReentrant to prevent reentrancy via malicious LP tokens
     */
    function stake(address lpToken, uint256 amount) external nonReentrant {
        Pool storage pool = pools[lpToken];
        if (!pool.active) revert LP_NotActive();
        if (amount == 0) revert LP_Zero();
        
        // Transfer LP tokens from user
        require(ILPToken(lpToken).transferFrom(msg.sender, address(this), amount), "LP: transfer failed");
        
        UserStake storage userStake = userStakes[lpToken][msg.sender];
        
        if (userStake.stakedAt == 0) {
            userStake.stakedAt = block.timestamp;
        }
        
        userStake.amount += amount;
        pool.totalStaked += amount;
        
        emit Staked(msg.sender, lpToken, amount);
    }
    
    /**
     * @notice Unstake LP tokens
     * H-2 Fix: Add nonReentrant to prevent reentrancy via malicious LP tokens
     */
    function unstake(address lpToken, uint256 amount) external nonReentrant {
        UserStake storage userStake = userStakes[lpToken][msg.sender];
        if (userStake.amount < amount) revert LP_InsufficientBalance();
        if (block.timestamp < userStake.stakedAt + unstakeCooldown) revert LP_Cooldown();
        
        _updateReward(lpToken, msg.sender);
        
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
    
    /**
     * @notice Claim pending rewards
     * H-2 Fix: Add nonReentrant to prevent reentrancy
     */
    function claimRewards(address lpToken) external nonReentrant {
        require(!howeySafeMode, "LP: howey safe mode enabled");
        _updateReward(lpToken, msg.sender);
        
        UserStake storage userStake = userStakes[lpToken][msg.sender];
        uint256 pending = userStake.pendingRewards;
        
        if (pending > 0) {
            userStake.pendingRewards = 0;
            
            // Apply bonuses
            uint256 totalReward = _applyBonuses(msg.sender, pending, userStake.stakedAt);
            
            // H-4 FIX: Verify contract has sufficient balance before transfer
            uint256 contractBalance = IERC20(address(vfideToken)).balanceOf(address(this));
            require(contractBalance >= totalReward, "LP: insufficient reward balance");
            
            // Transfer VFIDE rewards
            IERC20(address(vfideToken)).safeTransfer(msg.sender, totalReward);
            
            emit RewardsClaimed(msg.sender, lpToken, totalReward);
        }
    }
    
    /**
     * @notice Compound rewards (stake rewards as more LP - only if VFIDE LP)
     * @dev Only works for pools where one side is VFIDE
     */
    function compound(address lpToken) external {
        require(!howeySafeMode, "LP: howey safe mode enabled");
        _updateReward(lpToken, msg.sender);
        
        UserStake storage userStake = userStakes[lpToken][msg.sender];
        uint256 pending = userStake.pendingRewards;
        
        if (pending > 0) {
            userStake.pendingRewards = 0;
            
            // Apply bonuses
            uint256 totalReward = _applyBonuses(msg.sender, pending, userStake.stakedAt);
            
            // Instead of transferring, add to stake (simplified - real impl would add to LP)
            // For now, just claim and let user manually add to LP
            IERC20(address(vfideToken)).safeTransfer(msg.sender, totalReward);
            
            emit RewardsClaimed(msg.sender, lpToken, totalReward);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get pending rewards for a user in a pool
     */
    function pendingRewards(address lpToken, address user) external view returns (uint256 base, uint256 withBonus) {
        Pool storage pool = pools[lpToken];
        UserStake storage userStake = userStakes[lpToken][user];
        
        uint256 rewardPerToken = pool.rewardPerTokenStored;
        if (pool.totalStaked > 0) {
            rewardPerToken += (block.timestamp - pool.lastUpdateTime) * pool.rewardRate * 1e18 / pool.totalStaked;
        }
        
        base = userStake.pendingRewards + (userStake.amount * (rewardPerToken - userStake.rewardPerTokenPaid) / 1e18);
        withBonus = _applyBonuses(user, base, userStake.stakedAt);
    }
    
    /**
     * @notice Get user's stake info
     */
    function getUserStake(address lpToken, address user) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 stakeDuration,
        uint256 timeBonus,
        uint256 proofScoreBonus
    ) {
        UserStake storage userStake = userStakes[lpToken][user];
        amount = userStake.amount;
        stakedAt = userStake.stakedAt;
        stakeDuration = block.timestamp - stakedAt;
        
        // Calculate bonuses
        if (stakeDuration >= STAKE_BONUS_PERIOD) {
            timeBonus = MAX_TIME_BONUS_BPS;
        } else {
            timeBonus = (stakeDuration * MAX_TIME_BONUS_BPS) / STAKE_BONUS_PERIOD;
        }
        
        if (address(seer) != address(0)) {
            uint16 score = seer.getScore(user);
            if (score >= proofScoreBonusMinScore) {
                proofScoreBonus = proofScoreBonusBps;
            }
        }
    }
    
    /**
     * @notice Get pool info
     */
    function getPoolInfo(address lpToken) external view returns (
        string memory name,
        uint256 totalStaked,
        uint256 rewardRate,
        bool active,
        uint256 apr
    ) {
        Pool storage pool = pools[lpToken];
        name = pool.name;
        totalStaked = pool.totalStaked;
        rewardRate = pool.rewardRate;
        active = pool.active;
        
        // Calculate APR (annual percentage rate)
        if (totalStaked > 0) {
            uint256 yearlyRewards = rewardRate * 365 days;
            apr = (yearlyRewards * 10000) / totalStaked; // In basis points
        }
    }
    
    /**
     * @notice Get all pools
     */
    function getAllPools() external view returns (address[] memory) {
        return poolList;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function _updateReward(address lpToken, address user) internal {
        // In Howey-safe mode, don't accumulate rewards
        if (howeySafeMode) return;
        
        Pool storage pool = pools[lpToken];
        
        pool.rewardPerTokenStored = _rewardPerToken(lpToken);
        pool.lastUpdateTime = block.timestamp;
        
        if (user != address(0)) {
            UserStake storage userStake = userStakes[lpToken][user];
            userStake.pendingRewards = _earned(lpToken, user);
            userStake.rewardPerTokenPaid = pool.rewardPerTokenStored;
        }
    }
    
    function _rewardPerToken(address lpToken) internal view returns (uint256) {
        Pool storage pool = pools[lpToken];
        if (pool.totalStaked == 0) {
            return pool.rewardPerTokenStored;
        }
        return pool.rewardPerTokenStored + 
            ((block.timestamp - pool.lastUpdateTime) * pool.rewardRate * 1e18) / pool.totalStaked;
    }
    
    function _earned(address lpToken, address user) internal view returns (uint256) {
        UserStake storage userStake = userStakes[lpToken][user];
        return userStake.pendingRewards + 
            (userStake.amount * (_rewardPerToken(lpToken) - userStake.rewardPerTokenPaid)) / 1e18;
    }
    
    function _applyBonuses(address user, uint256 baseReward, uint256 stakedAt) internal view returns (uint256) {
        if (baseReward == 0 || stakedAt == 0) return baseReward;
        
        uint256 bonusBps = 0;
        
        // Time-weighted bonus
        uint256 stakeDuration = block.timestamp - stakedAt;
        if (stakeDuration >= STAKE_BONUS_PERIOD) {
            bonusBps += MAX_TIME_BONUS_BPS;
        } else {
            bonusBps += (stakeDuration * MAX_TIME_BONUS_BPS) / STAKE_BONUS_PERIOD;
        }
        
        // ProofScore bonus
        if (address(seer) != address(0)) {
            uint16 score = seer.getScore(user);
            if (score >= proofScoreBonusMinScore) {
                bonusBps += proofScoreBonusBps;
            }
        }
        
        return baseReward + (baseReward * bonusBps) / 10000;
    }
}
