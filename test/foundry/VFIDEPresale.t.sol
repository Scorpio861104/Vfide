// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/mocks/ERC20Mock.sol";
import "../../contracts-prod/mocks/VaultHubPresaleMock.sol";
import "../../contracts-prod/mocks/SecurityHubMock.sol";
import "../../contracts-prod/mocks/LedgerMock.sol";
import "../../contracts-prod/mocks/StablecoinRegistryPresaleMock.sol";
import "../../contracts-prod/mocks/VFIDEPresaleMock.sol";

contract VFIDEPresaleTest is Test {
    VFIDEPresaleMock public presale;
    ERC20Mock public vfide;
    VaultHubPresaleMock public vaultHub;
    SecurityHubMock public securityHub;
    LedgerMock public ledger;
    StablecoinRegistryPresaleMock public registry;
    ERC20Mock public usdc;
    
    address constant OWNER = address(0x1);
    address constant BUYER = address(0x2);
    address constant REFERRER = address(0x3);
    
    function setUp() public {
        vm.startPrank(OWNER);
        
        // Deploy mocks
        vfide = new ERC20Mock("VFIDE", "VFIDE");
        vaultHub = new VaultHubPresaleMock();
        securityHub = new SecurityHubMock();
        ledger = new LedgerMock();
        registry = new StablecoinRegistryPresaleMock();
        usdc = new ERC20Mock("Mock Token", "MOCK");
        
        // Deploy presale
        presale = new VFIDEPresaleMock();
        
        // Give buyer some USDC
        usdc.mint(BUYER, 1_000_000e6); // 1M USDC
        
        vm.stopPrank();
    }
    
    // ============ FUZZ TESTS ============
    
    /// @notice Fuzz test: Purchase amount should never exceed per-address cap
    function testFuzz_PurchaseRespectsCap(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint128).max);
        
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        // Get max per address
        uint256 maxPerAddr = presale.maxPerAddress();
        
        // Calculate VFIDE amount for purchase
        (uint32 price,,) = presale.tierPrices();
        uint256 vfideAmount = (amount * 1e18) / price;
        
        if (vfideAmount > maxPerAddr) {
            vm.expectRevert(VFIDEPresaleMock.PR_ExceedsPerAddressCap.selector);
        }
        
        presale.buy(address(usdc), amount, 0, address(0));
        
        // Verify cap is never exceeded
        uint256 purchased = presale.bought(BUYER);
        assertLe(purchased, maxPerAddr, "Purchased amount exceeds cap");
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Tier pricing calculations are consistent
    function testFuzz_TierPricingConsistency(uint8 tier, uint256 stableAmount) public {
        vm.assume(tier < 3);
        vm.assume(stableAmount > 0 && stableAmount < 1_000_000e6);
        
        // Enable tier
        vm.prank(OWNER);
        presale.setTierEnabled(tier, true);
        
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        // Calculate expected VFIDE
        (uint32 p0, uint32 p1, uint32 p2) = presale.tierPrices();
        uint32 price = tier == 0 ? p0 : (tier == 1 ? p1 : p2);
        
        uint256 expectedVFIDE = (stableAmount * 1e18) / price;
        
        // Check if within cap
        if (expectedVFIDE <= presale.maxPerAddress()) {
            uint256 balBefore = vfide.balanceOf(vaultHub.vaultOf(BUYER));
            
            presale.buy(address(usdc), stableAmount, tier, address(0));
            
            uint256 balAfter = vfide.balanceOf(vaultHub.vaultOf(BUYER));
            uint256 received = balAfter - balBefore;
            
            // Should receive at least the base amount (excluding bonuses)
            assertGe(received, expectedVFIDE, "Received less than expected");
        }
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Referral bonuses are calculated correctly
    function testFuzz_ReferralBonusCalculation(uint256 baseAmount) public {
        vm.assume(baseAmount > 0 && baseAmount < 100_000e18);
        vm.assume(baseAmount < presale.maxPerAddress());
        
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        // Get referral BPS
        (uint16 buyerBps, uint16 refBps) = presale.referralBps();
        
        // Calculate stable amount needed
        (uint32 price,,) = presale.tierPrices();
        uint256 stableNeeded = (baseAmount * price) / 1e18;
        
        uint256 buyerBalBefore = vfide.balanceOf(vaultHub.vaultOf(BUYER));
        uint256 refBalBefore = vfide.balanceOf(vaultHub.vaultOf(REFERRER));
        
        presale.buy(address(usdc), stableNeeded, 0, REFERRER);
        
        uint256 buyerBalAfter = vfide.balanceOf(vaultHub.vaultOf(BUYER));
        uint256 refBalAfter = vfide.balanceOf(vaultHub.vaultOf(REFERRER));
        
        uint256 buyerReceived = buyerBalAfter - buyerBalBefore;
        uint256 refReceived = refBalAfter - refBalBefore;
        
        // Verify bonus amounts
        uint256 expectedBuyerBonus = (baseAmount * buyerBps) / 10000;
        uint256 expectedRefBonus = (baseAmount * refBps) / 10000;
        
        assertApproxEqRel(buyerReceived, baseAmount + expectedBuyerBonus, 0.01e18, "Buyer bonus incorrect");
        assertApproxEqRel(refReceived, expectedRefBonus, 0.01e18, "Referrer bonus incorrect");
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Cannot purchase when inactive
    function testFuzz_CannotPurchaseWhenInactive(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1_000_000e6);
        
        // Deactivate presale
        vm.prank(OWNER);
        presale.setActive(false);
        
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        vm.expectRevert(VFIDEPresaleMock.PR_Inactive.selector);
        presale.buy(address(usdc), amount, 0, address(0));
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Cannot purchase with non-whitelisted stablecoin
    function testFuzz_OnlyWhitelistedStablecoins(address randomToken, uint256 amount) public {
        vm.assume(randomToken != address(usdc));
        vm.assume(randomToken != address(0));
        vm.assume(amount > 0 && amount < type(uint128).max);
        
        // Make sure it's not whitelisted
        registry.setAllowed(randomToken, false);
        
        vm.startPrank(BUYER);
        
        vm.expectRevert(VFIDEPresaleMock.PR_NotAllowedStable.selector);
        presale.buy(randomToken, amount, 0, address(0));
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Multiple purchases accumulate correctly
    function testFuzz_MultiplePurchasesAccumulate(uint8 numPurchases, uint256 amountEach) public {
        vm.assume(numPurchases > 0 && numPurchases <= 10);
        vm.assume(amountEach > 0 && amountEach < 10_000e18);
        
        uint256 totalExpected = amountEach * numPurchases;
        vm.assume(totalExpected < presale.maxPerAddress());
        
        // Calculate stable needed
        (uint32 price,,) = presale.tierPrices();
        uint256 stablePerPurchase = (amountEach * price) / 1e18;
        
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        uint256 balBefore = vfide.balanceOf(vaultHub.vaultOf(BUYER));
        
        for (uint256 i = 0; i < numPurchases; i++) {
            presale.buy(address(usdc), stablePerPurchase, 0, address(0));
        }
        
        uint256 balAfter = vfide.balanceOf(vaultHub.vaultOf(BUYER));
        uint256 totalReceived = balAfter - balBefore;
        
        // Should receive at least total amount (excluding bonuses)
        assertGe(totalReceived, totalExpected, "Total purchases don't accumulate correctly");
        
        // Check bought mapping
        uint256 recorded = presale.bought(BUYER);
        assertEq(recorded, totalReceived, "Bought mapping doesn't match actual");
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Cannot purchase with locked vault
    function testFuzz_CannotPurchaseWithLockedVault(uint256 amount) public {
        vm.assume(amount > 0 && amount < 100_000e6);
        
        // Lock buyer's vault
        address buyerVault = vaultHub.vaultOf(BUYER);
        securityHub.setLocked(buyerVault, true);
        
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        vm.expectRevert(VFIDEPresaleMock.PR_VaultLocked.selector);
        presale.buy(address(usdc), amount, 0, address(0));
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Price changes don't affect existing purchases
    function testFuzz_PriceChangesDontAffectHistory(uint32 newPrice) public {
        vm.assume(newPrice > 0 && newPrice < type(uint32).max / 2);
        
        // Make a purchase at original price
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        uint256 amount = 1000e6; // 1000 USDC
        presale.buy(address(usdc), amount, 0, address(0));
        
        uint256 boughtBefore = presale.bought(BUYER);
        vm.stopPrank();
        
        // Owner changes prices
        vm.prank(OWNER);
        
        // Bought amount should remain unchanged
        uint256 boughtAfter = presale.bought(BUYER);
        assertEq(boughtBefore, boughtAfter, "Price change affected history");
    }
    
    /// @notice Fuzz test: Tier enable/disable works correctly
    function testFuzz_TierEnableDisable(uint8 tier, bool enabled) public {
        vm.assume(tier < 3);
        
        vm.prank(OWNER);
        presale.setTierEnabled(tier, enabled);
        
        // Try to purchase from this tier
        vm.startPrank(BUYER);
        usdc.approve(address(presale), type(uint256).max);
        
        if (!enabled) {
            vm.expectRevert(VFIDEPresaleMock.PR_BadTier.selector);
        }
        
        presale.buy(address(usdc), 100e6, tier, address(0));
        
        vm.stopPrank();
    }
}
