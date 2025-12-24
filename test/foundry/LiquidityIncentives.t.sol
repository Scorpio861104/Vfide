// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/LiquidityIncentives.sol";
import "../../contracts/VFIDEToken.sol";
import "../../contracts/mocks/SeerMock.sol";

// Mock contracts needed for VFIDEToken deployment
contract MockDevVault {}
contract MockPresale {}

// Mock LP Token for testing
contract MockLPToken {
    string public name = "VFIDE-ETH LP";
    string public symbol = "VFIDE-ETH";
    uint8 public decimals = 18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract LiquidityIncentivesTest is Test {
    LiquidityIncentives public incentives;
    VFIDEToken public vfideToken;
    SeerMock public seer;
    MockLPToken public lpToken;
    
    address public dao = address(0x1111);
    address public user1 = address(0x2222);
    address public user2 = address(0x3333);
    
    uint256 constant INITIAL_LP_BALANCE = 1000 ether;
    uint256 constant REWARD_RATE = 1e16; // 0.01 VFIDE per second per LP
    
    function setUp() public {
        // Deploy SeerMock
        seer = new SeerMock();
        
        // Deploy mock contracts needed for VFIDEToken
        MockDevVault devVault = new MockDevVault();
        MockPresale presale = new MockPresale();
        
        // Deploy VFIDE Token with correct constructor args
        // constructor(devReserveVestingVault, _presaleContract, treasury, _vaultHub, _ledger, _treasurySink)
        vfideToken = new VFIDEToken(
            address(devVault),
            address(presale),
            dao,            // treasury
            address(0),     // vaultHub
            address(0),     // ledger
            address(0)      // treasurySink
        );
        
        // Disable vault-only for testing
        vfideToken.setVaultOnly(false);
        
        // Deploy LiquidityIncentives
        incentives = new LiquidityIncentives(
            dao,
            address(vfideToken),
            address(seer)
        );
        
        // Deploy mock LP token
        lpToken = new MockLPToken();
        
        // Mint LP tokens to users
        lpToken.mint(user1, INITIAL_LP_BALANCE);
        lpToken.mint(user2, INITIAL_LP_BALANCE);
        
        // Fund incentives contract with VFIDE for rewards
        vm.prank(dao);
        vfideToken.transfer(address(incentives), 100_000 ether);
        
        // Set up users with ProofScores
        seer.setScore(user1, 8000); // High score - eligible for bonus
        seer.setScore(user2, 5000); // Lower score - no bonus
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_Deployment() public view {
        assertEq(incentives.dao(), dao);
        assertEq(address(incentives.vfideToken()), address(vfideToken));
        assertEq(address(incentives.seer()), address(seer));
    }
    
    function test_DeploymentZeroDAOReverts() public {
        vm.expectRevert(LP_Zero.selector);
        new LiquidityIncentives(address(0), address(vfideToken), address(seer));
    }
    
    function test_DeploymentZeroTokenReverts() public {
        vm.expectRevert(LP_Zero.selector);
        new LiquidityIncentives(dao, address(0), address(seer));
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              POOL MANAGEMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_AddPool() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        (string memory name, uint256 totalStaked, uint256 rewardRate, bool active, ) = 
            incentives.getPoolInfo(address(lpToken));
        
        assertEq(name, "VFIDE-ETH");
        assertEq(totalStaked, 0);
        assertEq(rewardRate, REWARD_RATE);
        assertTrue(active);
    }
    
    function test_AddPoolNotDAOReverts() public {
        vm.prank(user1);
        vm.expectRevert(LP_NotDAO.selector);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
    }
    
    function test_AddDuplicatePoolReverts() public {
        vm.startPrank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.expectRevert("LP: pool exists");
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        vm.stopPrank();
    }
    
    function test_UpdatePool() public {
        vm.startPrank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        uint256 newRate = REWARD_RATE * 2;
        incentives.updatePool(address(lpToken), newRate, true);
        
        (, , uint256 rewardRate, bool active, ) = incentives.getPoolInfo(address(lpToken));
        assertEq(rewardRate, newRate);
        assertTrue(active);
        vm.stopPrank();
    }
    
    function test_DeactivatePool() public {
        vm.startPrank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        incentives.updatePool(address(lpToken), REWARD_RATE, false);
        
        (, , , bool active, ) = incentives.getPoolInfo(address(lpToken));
        assertFalse(active);
        vm.stopPrank();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STAKING TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_Stake() public {
        // Setup pool
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        uint256 stakeAmount = 100 ether;
        
        // Approve and stake
        vm.startPrank(user1);
        lpToken.approve(address(incentives), stakeAmount);
        incentives.stake(address(lpToken), stakeAmount);
        vm.stopPrank();
        
        // Verify stake
        (uint256 amount, uint256 stakedAt, , , ) = incentives.getUserStake(address(lpToken), user1);
        assertEq(amount, stakeAmount);
        assertEq(stakedAt, block.timestamp);
        
        // Verify pool total staked
        (, uint256 totalStaked, , , ) = incentives.getPoolInfo(address(lpToken));
        assertEq(totalStaked, stakeAmount);
    }
    
    function test_StakeZeroReverts() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.prank(user1);
        vm.expectRevert(LP_Zero.selector);
        incentives.stake(address(lpToken), 0);
    }
    
    function test_StakeInactivePoolReverts() public {
        vm.startPrank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        incentives.updatePool(address(lpToken), REWARD_RATE, false);
        vm.stopPrank();
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        vm.expectRevert(LP_NotActive.selector);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
    }
    
    function test_MultipleStakes() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 200 ether);
        
        incentives.stake(address(lpToken), 100 ether);
        vm.warp(block.timestamp + 1 days);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
        
        (uint256 amount, , , , ) = incentives.getUserStake(address(lpToken), user1);
        assertEq(amount, 200 ether);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              UNSTAKING TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_Unstake() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        uint256 stakeAmount = 100 ether;
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), stakeAmount);
        incentives.stake(address(lpToken), stakeAmount);
        
        // Wait for cooldown
        vm.warp(block.timestamp + 1 days + 1);
        
        uint256 balanceBefore = lpToken.balanceOf(user1);
        incentives.unstake(address(lpToken), stakeAmount);
        uint256 balanceAfter = lpToken.balanceOf(user1);
        vm.stopPrank();
        
        assertEq(balanceAfter - balanceBefore, stakeAmount);
        
        (uint256 amount, , , , ) = incentives.getUserStake(address(lpToken), user1);
        assertEq(amount, 0);
    }
    
    function test_UnstakeBeforeCooldownReverts() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        
        // Try to unstake immediately
        vm.expectRevert(LP_Cooldown.selector);
        incentives.unstake(address(lpToken), 100 ether);
        vm.stopPrank();
    }
    
    function test_UnstakeInsufficientBalanceReverts() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        
        vm.warp(block.timestamp + 1 days + 1);
        
        vm.expectRevert(LP_InsufficientBalance.selector);
        incentives.unstake(address(lpToken), 200 ether); // More than staked
        vm.stopPrank();
    }
    
    function test_PartialUnstake() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        
        vm.warp(block.timestamp + 1 days + 1);
        
        incentives.unstake(address(lpToken), 50 ether);
        vm.stopPrank();
        
        (uint256 amount, , , , ) = incentives.getUserStake(address(lpToken), user1);
        assertEq(amount, 50 ether);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              REWARDS TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_ClaimRewards() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
        
        // Wait and accrue rewards
        vm.warp(block.timestamp + 1 days);
        
        uint256 balanceBefore = vfideToken.balanceOf(user1);
        
        vm.prank(user1);
        incentives.claimRewards(address(lpToken));
        
        uint256 balanceAfter = vfideToken.balanceOf(user1);
        
        // Should have received some rewards
        assertGt(balanceAfter, balanceBefore);
    }
    
    function test_PendingRewards() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
        
        // Wait for rewards to accrue
        vm.warp(block.timestamp + 1 days);
        
        (uint256 base, uint256 withBonus) = incentives.pendingRewards(address(lpToken), user1);
        
        // base rewards should be > 0
        assertGt(base, 0);
        // with bonus should be >= base (user1 has high ProofScore)
        assertGe(withBonus, base);
    }
    
    function test_ProofScoreBonus() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        // Both users stake same amount
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
        
        vm.startPrank(user2);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
        
        // Wait for rewards
        vm.warp(block.timestamp + 30 days);
        
        // User1 has score 8000 (above 7000 threshold) - gets bonus
        // User2 has score 5000 (below threshold) - no bonus
        (uint256 base1, uint256 withBonus1) = incentives.pendingRewards(address(lpToken), user1);
        (uint256 base2, uint256 withBonus2) = incentives.pendingRewards(address(lpToken), user2);
        
        // Base rewards should be similar (same stake, same time)
        assertApproxEqRel(base1, base2, 0.01e18);
        
        // User1's bonus should be higher (has ProofScore bonus + time bonus)
        assertGt(withBonus1, withBonus2);
    }
    
    function test_TimeBonusGrows() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        vm.startPrank(user2); // Use user2 with low score to isolate time bonus
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
        
        uint256 startTime = block.timestamp;
        
        // Check bonus after 10 days (1/3 of 30 day period)
        vm.warp(startTime + 10 days);
        (, , , uint256 timeBonus10, ) = incentives.getUserStake(address(lpToken), user2);
        
        // Check bonus after 30 days (full period)
        vm.warp(startTime + 30 days);
        (, , , uint256 timeBonus30, ) = incentives.getUserStake(address(lpToken), user2);
        
        // Time bonus should increase (10 days: ~1666 bps, 30 days: 5000 bps)
        assertGt(timeBonus30, timeBonus10);
        
        // After 30 days should be max (5000 bps = 50%)
        assertEq(timeBonus30, 5000);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN SETTINGS TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_SetProofScoreBonus() public {
        vm.prank(dao);
        incentives.setProofScoreBonus(6000, 3000);
        
        assertEq(incentives.proofScoreBonusMinScore(), 6000);
        assertEq(incentives.proofScoreBonusBps(), 3000);
    }
    
    function test_SetUnstakeCooldown() public {
        vm.prank(dao);
        incentives.setUnstakeCooldown(2 days);
        
        assertEq(incentives.unstakeCooldown(), 2 days);
    }
    
    function test_SetUnstakeCooldownTooLongReverts() public {
        vm.prank(dao);
        vm.expectRevert("LP: cooldown too long");
        incentives.setUnstakeCooldown(8 days);
    }
    
    function test_SetSeer() public {
        SeerMock newSeer = new SeerMock();
        
        vm.prank(dao);
        incentives.setSeer(address(newSeer));
        
        assertEq(address(incentives.seer()), address(newSeer));
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTION TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_GetAllPools() public {
        MockLPToken lpToken2 = new MockLPToken();
        
        vm.startPrank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        incentives.addPool(address(lpToken2), "VFIDE-USDC", REWARD_RATE * 2);
        vm.stopPrank();
        
        address[] memory pools = incentives.getAllPools();
        assertEq(pools.length, 2);
        assertEq(pools[0], address(lpToken));
        assertEq(pools[1], address(lpToken2));
    }
    
    function test_GetPoolAPR() public {
        vm.prank(dao);
        incentives.addPool(address(lpToken), "VFIDE-ETH", REWARD_RATE);
        
        // Stake to have non-zero totalStaked
        vm.startPrank(user1);
        lpToken.approve(address(incentives), 100 ether);
        incentives.stake(address(lpToken), 100 ether);
        vm.stopPrank();
        
        (, , , , uint256 apr) = incentives.getPoolInfo(address(lpToken));
        
        // APR should be non-zero
        assertGt(apr, 0);
    }
}
