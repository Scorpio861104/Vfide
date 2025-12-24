// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/VFIDEPresale.sol";
import "../../contracts/VFIDEToken.sol";

// Mock contracts
contract MockDevVault {}
contract MockPresaleToken {}

// Minimal stablecoin mock
contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

// Mock Stablecoin Registry
contract MockStablecoinRegistry {
    mapping(address => bool) public isStablecoin;
    mapping(address => uint8) public decimalsOf;
    
    function addStablecoin(address token, uint8 dec) external {
        isStablecoin[token] = true;
        decimalsOf[token] = dec;
    }
    
    function getDecimals(address token) external view returns (uint8) {
        return decimalsOf[token];
    }
}

contract VFIDEPresaleTest is Test {
    VFIDEPresale public presale;
    VFIDEToken public vfideToken;
    MockUSDC public usdc;
    MockStablecoinRegistry public registry;
    
    address public dao = address(0x1111);
    address public treasury = address(0x2222);
    address public buyer1 = address(0x3333);
    address public buyer2 = address(0x4444);
    address public referrer = address(0x5555);
    
    uint256 constant START_TIME = 1000;
    uint256 constant USDC_DECIMALS = 6;
    
    function setUp() public {
        vm.warp(START_TIME - 100); // Before presale starts
        
        // Deploy USDC mock
        usdc = new MockUSDC();
        
        // Deploy stablecoin registry
        registry = new MockStablecoinRegistry();
        registry.addStablecoin(address(usdc), 6);
        
        // We need a mock token for the presale constructor
        // The actual VFIDEToken is too complex - use a simple mock
        MockDevVault devVault = new MockDevVault();
        
        // Deploy a mock presale token (VFIDEPresale just needs a valid ERC20 interface)
        MockPresaleToken mockToken = new MockPresaleToken();
        
        // Deploy presale with mock token (we'll test the logic, not token integration)
        // In real deployment, VFIDEToken would send 50M to presale
        presale = new VFIDEPresale(
            dao,
            address(usdc), // Using USDC as stand-in for token (just for constructor)
            treasury,
            address(registry),
            START_TIME
        );
        
        // Fund buyers with USDC
        usdc.mint(buyer1, 100_000 * 1e6); // $100,000
        usdc.mint(buyer2, 100_000 * 1e6);
        usdc.mint(referrer, 50_000 * 1e6);
        
        // Warp to sale start
        vm.warp(START_TIME + 1);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_Deployment() public view {
        assertEq(presale.DAO(), dao);
        assertEq(presale.TREASURY(), treasury);
        assertEq(presale.saleStartTime(), START_TIME);
        assertEq(presale.saleEndTime(), START_TIME + 30 days);
    }
    
    function test_DeploymentZeroDAOReverts() public {
        vm.expectRevert(PS_Zero.selector);
        new VFIDEPresale(
            address(0),
            address(usdc),
            treasury,
            address(registry),
            START_TIME
        );
    }
    
    function test_DeploymentZeroTokenReverts() public {
        vm.expectRevert(PS_Zero.selector);
        new VFIDEPresale(
            dao,
            address(0),
            treasury,
            address(registry),
            START_TIME
        );
    }
    
    function test_DeploymentZeroTreasuryReverts() public {
        vm.expectRevert(PS_Zero.selector);
        new VFIDEPresale(
            dao,
            address(usdc),
            address(0),
            address(registry),
            START_TIME
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_SupplyConstants() public view {
        assertEq(presale.BASE_SUPPLY(), 35_000_000 * 1e18);
        assertEq(presale.BONUS_POOL(), 15_000_000 * 1e18);
        assertEq(presale.TOTAL_SUPPLY(), 50_000_000 * 1e18);
        assertEq(presale.MAX_PER_WALLET(), 500_000 * 1e18);
    }
    
    function test_TierPricing() public view {
        assertEq(presale.TIER_0_PRICE(), 30_000);  // $0.03
        assertEq(presale.TIER_1_PRICE(), 50_000);  // $0.05
        assertEq(presale.TIER_2_PRICE(), 70_000);  // $0.07
    }
    
    function test_TierCaps() public view {
        assertEq(presale.TIER_0_CAP(), 10_000_000 * 1e18); // 10M
        assertEq(presale.TIER_1_CAP(), 10_000_000 * 1e18); // 10M
        assertEq(presale.TIER_2_CAP(), 15_000_000 * 1e18); // 15M
    }
    
    function test_LockBonuses() public view {
        assertEq(presale.BONUS_180_DAYS(), 30); // 30%
        assertEq(presale.BONUS_90_DAYS(), 15);  // 15%
        assertEq(presale.BONUS_NO_LOCK(), 0);   // 0%
    }
    
    function test_ReferralBonuses() public view {
        assertEq(presale.REFERRER_BONUS(), 3); // 3%
        assertEq(presale.REFEREE_BONUS(), 2);  // 2%
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_SetEthPrice() public {
        vm.prank(dao);
        presale.setEthPrice(4000);
        
        assertEq(presale.ethPriceUsd(), 4000);
    }
    
    function test_SetEthPrice_NotDAOReverts() public {
        vm.prank(buyer1);
        vm.expectRevert(PS_NotDAO.selector);
        presale.setEthPrice(4000);
    }
    
    function test_SetEthPrice_OutOfRangeLowReverts() public {
        vm.prank(dao);
        vm.expectRevert("PS: price out of range");
        presale.setEthPrice(500); // Below $1000
    }
    
    function test_SetEthPrice_OutOfRangeHighReverts() public {
        vm.prank(dao);
        vm.expectRevert("PS: price out of range");
        presale.setEthPrice(150000); // Above $100000
    }
    
    function test_IsEthPriceStale() public view {
        // Initially stale (never set)
        assertTrue(presale.isEthPriceStale());
    }
    
    function test_SetEthAccepted() public {
        vm.prank(dao);
        presale.setEthAccepted(false);
        
        assertFalse(presale.ethAccepted());
    }
    
    function test_SetStablecoinRegistry() public {
        MockStablecoinRegistry newRegistry = new MockStablecoinRegistry();
        
        vm.prank(dao);
        presale.setStablecoinRegistry(address(newRegistry));
        
        assertEq(address(presale.stablecoinRegistry()), address(newRegistry));
    }
    
    function test_SetMaxGasPrice() public {
        vm.prank(dao);
        presale.setMaxGasPrice(300 gwei);
        
        assertEq(presale.maxGasPrice(), 300 gwei);
    }
    
    function test_PauseAndUnpause() public {
        vm.startPrank(dao);
        presale.setPaused(true);
        assertTrue(presale.paused());
        
        presale.setPaused(false);
        assertFalse(presale.paused());
        vm.stopPrank();
    }
    
    function test_EnableDisableTier() public {
        vm.prank(dao);
        presale.setTierEnabled(0, false);
        
        assertFalse(presale.tier0Enabled());
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_InitialState() public view {
        assertEq(presale.totalBaseSold(), 0);
        assertEq(presale.totalBonusGiven(), 0);
        assertFalse(presale.paused());
        assertFalse(presale.finalized());
    }
    
    function test_SaleNotStartedBefore() public {
        vm.warp(START_TIME - 10);
        
        // Sale should not be active
        assertLt(block.timestamp, presale.saleStartTime());
    }
    
    function test_SaleEndsAfterDuration() public {
        uint256 endTime = presale.saleEndTime();
        assertEq(endTime, START_TIME + 30 days);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              SALE EXTENSION TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_ExtendSale() public {
        uint256 originalEnd = presale.saleEndTime();
        
        vm.prank(dao);
        presale.extendSale(7); // 7 days
        
        assertEq(presale.saleEndTime(), originalEnd + 7 days);
        assertTrue(presale.saleExtended());
    }
    
    function test_ExtendSale_MaxExtensionReverts() public {
        vm.prank(dao);
        vm.expectRevert("Invalid extension");
        presale.extendSale(35); // More than 30 days max
    }
    
    function test_ExtendSale_AlreadyExtendedReverts() public {
        vm.startPrank(dao);
        presale.extendSale(7);
        
        vm.expectRevert(PS_AlreadyExtended.selector);
        presale.extendSale(7);
        vm.stopPrank();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              REFUND TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_EnableRefunds() public {
        // Warp to after sale ends
        vm.warp(START_TIME + 31 days);
        
        vm.prank(dao);
        presale.enableRefunds();
        
        assertTrue(presale.refundsEnabled());
    }
    
    function test_EnableRefunds_BeforeSaleEndsReverts() public {
        vm.prank(dao);
        vm.expectRevert("Sale not ended");
        presale.enableRefunds();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              MINIMUM GOAL TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_MinimumGoalUsd() public view {
        // Minimum goal: $612,500
        assertEq(presale.MINIMUM_GOAL_USD(), 612_500 * 1e6);
    }
    
    function test_MinimumGoalTokens() public view {
        // Minimum goal: 8.75M base tokens
        assertEq(presale.MINIMUM_GOAL(), 8_750_000 * 1e18);
    }
}
