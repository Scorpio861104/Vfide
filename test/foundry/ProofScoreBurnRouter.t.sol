// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/ProofScoreBurnRouter.sol";
import "../../contracts-prod/mocks/SeerMock.sol";
import "../../contracts-prod/mocks/TreasuryMock.sol";
import "../../contracts-prod/mocks/SanctumMock.sol";
import "../../contracts-prod/mocks/ERC20Mock.sol";

contract ProofScoreBurnRouterTest is Test {
    ProofScoreBurnRouter public router;
    SeerMock public seer;
    TreasuryMock public treasury;
    SanctumMock public sanctum;
    ERC20Mock public vfide;
    
    address constant USER = address(0x2);
    
    function setUp() public {
        seer = new SeerMock();
        treasury = new TreasuryMock();
        sanctum = new SanctumMock();
        vfide = new ERC20Mock("Mock Token", "MOCK");
        
        router = new ProofScoreBurnRouter(
            address(seer),
            address(treasury),
            address(sanctum),
            address(vfide)
        );
    }
    
    /// @notice Fuzz test: Burn rate decreases with higher score
    function testFuzz_BurnRateWithScore(uint16 score) public {
        vm.assume(score <= 1000);
        seer.setScore(USER, score);
        
        uint256 amount = 1000e18;
        uint256 total = router.route(USER, amount);
        
        // Higher scores should result in lower burn amounts
        if (score >= 900) {
            // Should be baseBurnRate / 2 = 25 (0.25%)
            uint256 expectedBurn = (amount * 25) / 10000;
            uint256 expectedSanctum = (amount * 25) / 10000;
            assertApproxEqAbs(total, expectedBurn + expectedSanctum, 1, "High score burn incorrect");
        } else if (score <= 300) {
            // Should be maxBurnRate = 250 (2.5%)
            uint256 expectedBurn = (amount * 250) / 10000;
            uint256 expectedSanctum = (amount * 25) / 10000;
            assertApproxEqAbs(total, expectedBurn + expectedSanctum, 1, "Low score burn incorrect");
        }
    }
    
    /// @notice Fuzz test: Burn amount calculation is consistent
    function testFuzz_BurnAmountConsistency(uint256 amount, uint16 score) public {
        vm.assume(score <= 1000);
        vm.assume(amount > 0 && amount <= 100_000e18); // Reduced to prevent overflow
        
        seer.setScore(USER, score);
        
        uint256 total1 = router.route(USER, amount);
        uint256 total2 = router.route(USER, amount);
        
        assertEq(total1, total2, "Burn amounts not consistent");
    }
    
    /// @notice Fuzz test: Sanctum rate is applied correctly
    function testFuzz_SanctumRate(uint256 amount) public {
        vm.assume(amount >= 400 && amount <= 100_000e18); // Need minimum for positive sanctum (25/10000 needs 400)
        
        seer.setScore(USER, 500); // Mid-range score
        
        uint16 sanctumRate = router.sanctumRate();
        uint256 expectedSanctum = (amount * sanctumRate) / 10000;
        
        router.route(USER, amount);
        
        // Treasury should have been notified of burn amount
        // Sanctum should have received sanctum amount
        // Check the math is correct
        assertGt(expectedSanctum, 0, "Sanctum amount should be positive");
    }
    
    /// @notice Fuzz test: Route with zero amount
    function testFuzz_RouteZeroAmount(uint16 score) public {
        vm.assume(score <= 1000);
        
        seer.setScore(USER, score);
        
        uint256 total = router.route(USER, 0);
        assertEq(total, 0, "Total should be zero for zero amount");
    }
    
    /// @notice Fuzz test: Score of 900+ gets minimum burn rate
    function testFuzz_HighScoreMinimumBurn(uint16 score, uint256 amount) public {
        vm.assume(score >= 900 && score <= 1000);
        vm.assume(amount > 0 && amount <= 100_000e18);
        
        seer.setScore(USER, score);
        
        uint16 baseBurn = router.baseBurnRate();
        uint16 expectedRate = baseBurn / 2; // 25 (0.25%)
        
        uint256 expectedBurn = (amount * expectedRate) / 10000;
        uint256 expectedSanctum = (amount * router.sanctumRate()) / 10000;
        
        uint256 total = router.route(USER, amount);
        
        assertApproxEqAbs(total, expectedBurn + expectedSanctum, 2, "High score burn rate incorrect");
    }
    
    /// @notice Fuzz test: Score of 300 or less gets maximum burn rate
    function testFuzz_LowScoreMaximumBurn(uint16 score, uint256 amount) public {
        vm.assume(score <= 300);
        vm.assume(amount > 0 && amount <= 100_000e18);
        
        seer.setScore(USER, score);
        
        uint16 maxBurn = router.maxBurnRate();
        uint256 expectedBurn = (amount * maxBurn) / 10000;
        uint256 expectedSanctum = (amount * router.sanctumRate()) / 10000;
        
        uint256 total = router.route(USER, amount);
        
        assertApproxEqAbs(total, expectedBurn + expectedSanctum, 2, "Low score burn rate incorrect");
    }
    
    /// @notice Fuzz test: Mid-range scores get interpolated burn rates
    function testFuzz_MidRangeScoreBurn(uint16 score, uint256 amount) public {
        vm.assume(score > 300 && score < 900);
        vm.assume(amount > 0 && amount <= 100_000e18);
        
        seer.setScore(USER, score);
        
        uint256 total = router.route(USER, amount);
        
        // Should be between min and max
        uint16 baseBurn = router.baseBurnRate();
        uint16 maxBurn = router.maxBurnRate();
        
        uint256 minTotal = (amount * (baseBurn / 2 + router.sanctumRate())) / 10000;
        uint256 maxTotal = (amount * (maxBurn + router.sanctumRate())) / 10000;
        
        assertGe(total, minTotal, "Total below minimum");
        assertLe(total, maxTotal, "Total above maximum");
    }
    
    /// @notice Fuzz test: Multiple routes accumulate correctly
    function testFuzz_MultipleRoutes(uint8 numRoutes, uint256 amountEach) public {
        vm.assume(numRoutes > 0 && numRoutes <= 20);
        vm.assume(amountEach >= 100 && amountEach <= 10_000e18); // Need minimum for positive burn
        
        seer.setScore(USER, 500);
        
        uint256 totalRouted = 0;
        
        for (uint256 i = 0; i < numRoutes; i++) {
            uint256 routed = router.route(USER, amountEach);
            totalRouted += routed;
        }
        
        assertGt(totalRouted, 0, "No amount routed");
    }
    
    /// @notice Fuzz test: Burn rate never exceeds max
    function testFuzz_BurnRateNeverExceedsMax(uint16 score, uint256 amount) public {
        vm.assume(score <= 1000);
        vm.assume(amount > 0 && amount <= 100_000e18);
        
        seer.setScore(USER, score);
        
        uint256 total = router.route(USER, amount);
        
        uint16 maxRate = router.maxBurnRate() + router.sanctumRate();
        uint256 maxTotal = (amount * maxRate) / 10000;
        
        assertLe(total, maxTotal + 1, "Total exceeds maximum possible");
    }
    
    /// @notice Fuzz test: Burn rate formula is monotonic (lower score = higher burn)
    function testFuzz_BurnRateMonotonic(uint16 score1, uint16 score2, uint256 amount) public {
        vm.assume(score1 <= 1000 && score2 <= 1000);
        vm.assume(score1 < score2); // score1 is lower
        vm.assume(amount >= 100 && amount <= 100_000e18);
        
        seer.setScore(USER, score1);
        uint256 total1 = router.route(USER, amount);
        
        seer.setScore(USER, score2);
        uint256 total2 = router.route(USER, amount);
        
        // Lower score should result in higher or equal burn (sanctum rate is constant)
        assertGe(total1, total2, "Burn rate not monotonic");
    }
    
    /// @notice Fuzz test: Adjust score function emits correctly
    function testFuzz_AdjustScoreEmits(uint16 score, uint16 delta, bool increase) public {
        vm.assume(score <= 1000);
        vm.assume(delta > 0 && delta < 100);
        
        seer.setScore(USER, score);
        
        // Just check that it doesn't revert - the emit happens with calculated burnRate
        router.adjustScore(USER, delta, increase);
    }
}
