// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/ProofScoreBurnRouter.sol";
import "../../contracts/mocks/SeerMock.sol";

contract ProofScoreBurnRouterTest is Test {
    ProofScoreBurnRouter public router;
    SeerMock public seer;
    
    address public owner = address(this);
    address public sanctumSink = address(0x1111);
    address public burnSink = address(0x2222);
    address public ecosystemSink = address(0x3333);
    
    address public user1 = address(0x4444);
    address public user2 = address(0x5555);
    address public lowTrustUser = address(0x6666);
    address public highTrustUser = address(0x7777);
    
    function setUp() public {
        // Deploy SeerMock
        seer = new SeerMock();
        
        // Deploy ProofScoreBurnRouter
        router = new ProofScoreBurnRouter(
            address(seer),
            sanctumSink,
            burnSink,
            ecosystemSink
        );
        
        // Set up user scores (0-10000 scale)
        seer.setScore(user1, 5000);         // Neutral (50%)
        seer.setScore(user2, 6000);         // Medium (60%)
        seer.setScore(lowTrustUser, 3000);  // Low trust (30%)
        seer.setScore(highTrustUser, 9000); // High trust (90%)
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_Deployment() public view {
        assertEq(address(router.seer()), address(seer));
        assertEq(router.sanctumSink(), sanctumSink);
        assertEq(router.burnSink(), burnSink);
        assertEq(router.ecosystemSink(), ecosystemSink);
    }
    
    function test_DeploymentDefaultValues() public view {
        // Check default fee values
        assertEq(router.baseBurnBps(), 150);     // 1.5%
        assertEq(router.baseSanctumBps(), 5);    // 0.05%
        assertEq(router.baseEcosystemBps(), 20); // 0.2%
        assertEq(router.minTotalBps(), 25);      // 0.25% min
        assertEq(router.maxTotalBps(), 500);     // 5% max
    }
    
    function test_DeploymentZeroSeerReverts() public {
        vm.expectRevert("zero seer");
        new ProofScoreBurnRouter(
            address(0),
            sanctumSink,
            burnSink,
            ecosystemSink
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              FEE CALCULATION TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_ComputeFees_LowTrust() public view {
        // Score 3000 (30%) is below LOW_SCORE_THRESHOLD (4000)
        // Should pay maximum fee (500 bps = 5%)
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(lowTrustUser, address(0), 10000 ether);
        
        // Total fee should be ~5% = 500 VFIDE
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        assertEq(totalFee, 500 ether); // 5% of 10000
    }
    
    function test_ComputeFees_HighTrust() public view {
        // Score 9000 (90%) is above HIGH_SCORE_THRESHOLD (8000)
        // Should pay minimum fee (25 bps = 0.25%)
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(highTrustUser, address(0), 10000 ether);
        
        // Total fee should be ~0.25% = 25 VFIDE
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        assertEq(totalFee, 25 ether); // 0.25% of 10000
    }
    
    function test_ComputeFees_NeutralScore() public view {
        // Score 5000 (50%) is in the interpolation zone
        // Fee = 500 - ((5000-4000) * 475) / 4000 = 500 - 118.75 = 381.25 bps
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(user1, address(0), 10000 ether);
        
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        // Expected: ~381 bps = ~381 VFIDE (with rounding)
        assertGt(totalFee, 350 ether);
        assertLt(totalFee, 400 ether);
    }
    
    function test_ComputeFees_ZeroAmount() public view {
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(user1, address(0), 0);
        
        assertEq(burnAmt, 0);
        assertEq(sanctumAmt, 0);
        assertEq(ecoAmt, 0);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              SUSTAINABILITY TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_SetSustainability() public {
        uint256 newCap = 1_000_000 ether;
        uint256 newFloor = 100_000_000 ether;
        uint16 newEcoMin = 10;
        
        router.setSustainability(newCap, newFloor, newEcoMin);
        
        assertEq(router.dailyBurnCap(), newCap);
        assertEq(router.minimumSupplyFloor(), newFloor);
        assertEq(router.ecosystemMinBps(), newEcoMin);
    }
    
    function test_SetSustainability_EcoMinTooHighReverts() public {
        vm.expectRevert("eco min too high");
        router.setSustainability(500_000 ether, 50_000_000 ether, 101); // >1%
    }
    
    function test_RemainingDailyBurnCapacity_Fresh() public view {
        uint256 remaining = router.remainingDailyBurnCapacity();
        assertEq(remaining, router.dailyBurnCap());
    }
    
    function test_BurnsPaused_NoToken() public view {
        // Without token set, burns should not be paused
        assertFalse(router.burnsPaused());
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADAPTIVE FEES TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_SetAdaptiveFees() public {
        router.setAdaptiveFees(
            50_000 ether,    // lowVolumeThreshold
            10_000_000 ether, // highVolumeThreshold
            13000,           // lowVolMultiplier (1.3x)
            7000,            // highVolMultiplier (0.7x)
            true             // enabled
        );
        
        assertEq(router.lowVolumeThreshold(), 50_000 ether);
        assertEq(router.highVolumeThreshold(), 10_000_000 ether);
        assertEq(router.lowVolumeFeeMultiplier(), 13000);
        assertEq(router.highVolumeFeeMultiplier(), 7000);
        assertTrue(router.adaptiveFeesEnabled());
    }
    
    function test_SetAdaptiveFees_InvalidThresholdsReverts() public {
        vm.expectRevert("low > high");
        router.setAdaptiveFees(
            10_000_000 ether, // lowVolumeThreshold > highVolumeThreshold
            50_000 ether,
            12000,
            8000,
            true
        );
    }
    
    function test_GetVolumeMultiplier_Disabled() public view {
        // Adaptive fees disabled by default
        assertFalse(router.adaptiveFeesEnabled());
        assertEq(router.getVolumeMultiplier(), 10000); // 1x
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              MODULE SETTINGS TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_SetModules() public {
        SeerMock newSeer = new SeerMock();
        address newSanctum = address(0xAA);
        address newBurn = address(0xBB);
        address newEco = address(0xCC);
        
        router.setModules(address(newSeer), newSanctum, newBurn, newEco);
        
        assertEq(address(router.seer()), address(newSeer));
        assertEq(router.sanctumSink(), newSanctum);
        assertEq(router.burnSink(), newBurn);
        assertEq(router.ecosystemSink(), newEco);
    }
    
    function test_SetModules_ZeroSeerReverts() public {
        vm.expectRevert(BURN_Zero.selector);
        router.setModules(address(0), sanctumSink, burnSink, ecosystemSink);
    }
    
    function test_SetToken() public {
        address mockToken = address(0xDEAD);
        router.setToken(mockToken);
        assertEq(router.token(), mockToken);
    }
    
    function test_SetToken_ZeroReverts() public {
        vm.expectRevert("zero token");
        router.setToken(address(0));
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              TIME-WEIGHTED SCORE TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_UpdateScore() public {
        seer.setScore(user1, 7000);
        router.updateScore(user1);
        
        uint16 twScore = router.getTimeWeightedScore(user1);
        assertEq(twScore, 7000);
    }
    
    function test_GetTimeWeightedScore_NoHistory() public view {
        // No history, should return current score from Seer
        uint16 score = router.getTimeWeightedScore(user1);
        assertEq(score, 5000); // user1's score from setUp
    }
    
    function test_UpdateScore_NotAuthorizedReverts() public {
        vm.prank(user1);
        vm.expectRevert("Not authorized");
        router.updateScore(user2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              FEE DISTRIBUTION TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_ComputeFees_Distribution() public view {
        // For a given total fee, check that it's distributed among burn/sanctum/ecosystem
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(highTrustUser, address(0), 100000 ether);
        
        // All three components should be non-negative
        // (some may be 0 depending on policy, but total should match expected)
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        
        // High trust user pays 0.25% = 250 VFIDE on 100000
        assertEq(totalFee, 250 ether);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_ComputeFees_ExactThresholdLow() public {
        // Set score exactly at LOW_SCORE_THRESHOLD (4000)
        seer.setScore(user1, 4000);
        
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(user1, address(0), 10000 ether);
        
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        // At exactly 4000, should pay max fee
        assertEq(totalFee, 500 ether);
    }
    
    function test_ComputeFees_ExactThresholdHigh() public {
        // Set score exactly at HIGH_SCORE_THRESHOLD (8000)
        seer.setScore(user1, 8000);
        
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(user1, address(0), 10000 ether);
        
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        // At exactly 8000, should pay min fee
        assertEq(totalFee, 25 ether);
    }
    
    function test_ComputeFees_VeryLowScore() public {
        seer.setScore(user1, 100); // 1%
        
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(user1, address(0), 10000 ether);
        
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        // Should still be max fee (capped)
        assertEq(totalFee, 500 ether);
    }
    
    function test_ComputeFees_MaxScore() public {
        seer.setScore(user1, 10000); // 100% - perfect score
        
        (uint256 burnAmt, uint256 sanctumAmt, uint256 ecoAmt, , , ) = 
            router.computeFees(user1, address(0), 10000 ether);
        
        uint256 totalFee = burnAmt + sanctumAmt + ecoAmt;
        // Should be min fee
        assertEq(totalFee, 25 ether);
    }
}
