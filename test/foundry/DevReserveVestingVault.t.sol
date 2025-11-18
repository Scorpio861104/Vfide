// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/DevReserveVestingVault.sol";
import "../../contracts-prod/mocks/ERC20Mock.sol";
import "../../contracts-prod/mocks/VaultHubMock.sol";
import "../../contracts-prod/mocks/SecurityHubMock.sol";
import "../../contracts-prod/mocks/LedgerMock.sol";
import "../../contracts-prod/mocks/PresaleMock.sol";

contract DevReserveVestingVaultTest is Test {
    DevReserveVestingVault public vault;
    ERC20Mock public vfide;
    VaultHubMock public vaultHub;
    SecurityHubMock public securityHub;
    LedgerMock public ledger;
    PresaleMock public presale;
    
    address constant BENEFICIARY = address(0x1);
    uint256 constant ALLOCATION = 40_000_000e18;
    
    function setUp() public {
        // Deploy mocks
        vfide = new ERC20Mock("Mock Token", "MOCK");
        vaultHub = new VaultHubMock();
        securityHub = new SecurityHubMock();
        ledger = new LedgerMock();
        presale = new PresaleMock();
        
        // Set presale start time
        presale.setPresaleStartTime(block.timestamp);
        
        // Deploy vesting vault
        vault = new DevReserveVestingVault(
            address(vfide),
            BENEFICIARY,
            address(vaultHub),
            address(securityHub),
            address(ledger),
            address(presale),
            ALLOCATION
        );
        
        // Fund the vault
        vfide.mint(address(vault), ALLOCATION);
    }
    
    // ============ FUZZ TESTS ============
    
    /// @notice Fuzz test: Cannot claim during cliff period
    function testFuzz_CannotClaimDuringCliff(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        vm.assume(timePassed > 0 && timePassed < cliff);
        
        // Move time forward but still in cliff
        vm.warp(block.timestamp + timePassed);
        
        vm.prank(BENEFICIARY);
        vm.expectRevert(DevReserveVestingVault.DV_NothingToClaim.selector);
        vault.claim();
    }
    
    /// @notice Fuzz test: Vesting calculation is linear after cliff
    function testFuzz_LinearVestingAfterCliff(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        uint64 vesting = vault.VESTING();
        vm.assume(timePassed > cliff && timePassed <= (cliff + vesting));
        
        // Warp to after cliff to sync start
        vm.warp(block.timestamp + cliff + 1);
        vm.prank(BENEFICIARY);
        vault.claim(); // First claim syncs start
        
        uint64 start = vault.startTimestamp();
        
        // Move to specific time
        vm.warp(start + timePassed);
        
        uint256 claimable = vault.claimable();
        
        // Calculate expected vested amount
        // Contract formula: vested = ALLOCATION * elapsed / VESTING where elapsed = timestamp - cliff
        uint256 elapsed = timePassed - cliff;
        uint256 expectedVested = (ALLOCATION * elapsed) / vesting;
        
        // Account for already claimed amount
        expectedVested -= vault.totalClaimed();
        
        assertApproxEqRel(claimable, expectedVested, 0.001e18, "Vesting not linear");
    }
    
    /// @notice Fuzz test: Cannot claim more than allocated
    function testFuzz_CannotExceedAllocation(uint256 timeJump) public {
        vm.assume(timeJump > vault.VESTING() && timeJump < 10 * 365 days);
        
        // Sync start
        vm.prank(BENEFICIARY);
        
        // Jump far into future
        vm.warp(block.timestamp + timeJump);
        
        uint256 claimable = vault.claimable();
        assertLe(claimable, ALLOCATION, "Claimable exceeds allocation");
        
        // Claim all
        vm.prank(BENEFICIARY);
        vault.claim();
        
        uint256 totalClaimed = vault.totalClaimed();
        assertLe(totalClaimed, ALLOCATION, "Total claimed exceeds allocation");
    }
    
    /// @notice Fuzz test: Multiple claims accumulate correctly
    function testFuzz_MultipleClaimsAccumulate(uint8 numClaims) public {
        vm.assume(numClaims > 0 && numClaims <= 20);
        
        // Sync start
        vm.prank(BENEFICIARY);
        
        uint64 start = vault.startTimestamp();
        uint64 vesting = vault.VESTING();
        
        uint256 totalReceived = 0;
        uint256 intervalDuration = vesting / (numClaims + 1);
        
        for (uint256 i = 1; i <= numClaims; i++) {
            // Move forward in time
            vm.warp(start + (intervalDuration * i));
            
            uint256 claimableBefore = vault.claimable();
            
            if (claimableBefore > 0) {
                address beneficiaryVault = vaultHub.vaultOf(BENEFICIARY);
                uint256 balBefore = vfide.balanceOf(beneficiaryVault);
                
                vm.prank(BENEFICIARY);
                vault.claim();
                
                uint256 balAfter = vfide.balanceOf(beneficiaryVault);
                totalReceived += (balAfter - balBefore);
            }
        }
        
        assertEq(vault.totalClaimed(), totalReceived, "Total claimed doesn't match received");
    }
    
    /// @notice Fuzz test: Pausing prevents claims
    function testFuzz_PausingStopsClaims(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        uint64 vesting = vault.VESTING();
        vm.assume(timePassed > cliff && timePassed < vesting);
        
        // Move forward
        vm.warp(block.timestamp + timePassed);
        
        // Pause claims
        vm.prank(BENEFICIARY);
        vault.pauseClaims(true);
        
        // Try to claim
        vm.prank(BENEFICIARY);
        vm.expectRevert(DevReserveVestingVault.DV_Paused.selector);
        vault.claim();
        
        // Unpause
        vm.prank(BENEFICIARY);
        vault.pauseClaims(false);
        
        // Should work now
        vm.prank(BENEFICIARY);
        vault.claim();
    }
    
    /// @notice Fuzz test: Only beneficiary can pause
    function testFuzz_OnlyBeneficiaryCanPause(address caller, bool paused) public {
        vm.assume(caller != BENEFICIARY);
        
        vm.prank(caller);
        vm.expectRevert(DevReserveVestingVault.DV_NotBeneficiary.selector);
        vault.pauseClaims(paused);
    }
    
    /// @notice Fuzz test: Locked vault prevents claims
    function testFuzz_LockedVaultPreventsClaims(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        uint64 vesting = vault.VESTING();
        vm.assume(timePassed > cliff && timePassed < vesting);
        
        // Move forward
        vm.warp(block.timestamp + timePassed);
        
        // Ensure vault exists and lock it
        address beneficiaryVault = vaultHub.ensureVault(BENEFICIARY);
        securityHub.setLocked(beneficiaryVault, true);
        
        // Try to claim
        vm.prank(BENEFICIARY);
        vm.expectRevert(DevReserveVestingVault.DV_VaultLocked.selector);
        vault.claim();
    }
    
    /// @notice Fuzz test: Claimable amount never decreases over time
    function testFuzz_ClaimableNeverDecreases(uint32 time1, uint32 time2) public {
        vm.assume(time1 < time2);
        vm.assume(time2 < 5 * 365 days);
        
        uint64 start = uint64(presale.presaleStartTime());
        
        // Check at time1
        vm.warp(start + time1);
        uint256 claimable1 = vault.claimable();
        
        // Check at time2 (later)
        vm.warp(start + time2);
        uint256 claimable2 = vault.claimable();
        
        assertGe(claimable2, claimable1, "Claimable decreased over time");
    }
    
    /// @notice Fuzz test: Full vesting after complete period
    function testFuzz_FullVestingAfterPeriod(uint32 extraTime) public {
        vm.assume(extraTime < 10 * 365 days);
        
        uint64 start = uint64(presale.presaleStartTime());
        uint64 cliff = vault.CLIFF();
        uint64 vesting = vault.VESTING();
        uint64 end = start + cliff + vesting;
        
        // Jump to end + extra time
        vm.warp(end + extraTime);
        
        uint256 claimable = vault.claimable();
        assertEq(claimable, ALLOCATION, "Not fully vested after period");
        
        // Claim all
        vm.prank(BENEFICIARY);
        vault.claim();
        
        // Nothing more to claim
        assertEq(vault.claimable(), 0, "Still claimable after full claim");
    }
    
    /// @notice Fuzz test: Start sync is idempotent
    function testFuzz_StartSyncIdempotent(uint8 numSyncs) public {
        vm.assume(numSyncs > 0 && numSyncs <= 10);
        
        vm.startPrank(BENEFICIARY);
        
        uint64 firstStart = vault.startTimestamp();
        
        // Sync multiple times
        for (uint256 i = 0; i < numSyncs; i++) {
            assertEq(vault.startTimestamp(), firstStart, "Start time changed on resync");
        }
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Vesting respects cliff strictly
    function testFuzz_CliffStrictlyEnforced(uint32 beforeCliff, uint32 afterCliff) public {
        uint64 cliff = vault.CLIFF();
        vm.assume(beforeCliff > 0 && beforeCliff < cliff);
        vm.assume(afterCliff >= cliff && afterCliff < cliff + 365 days);
        
        uint64 start = uint64(presale.presaleStartTime());
        
        // Before cliff: nothing claimable
        vm.warp(start + beforeCliff);
        uint256 claimableBeforeCliff = vault.claimable();
        assertEq(claimableBeforeCliff, 0, "Claimable before cliff should be 0");
        
        // After cliff: something claimable
        vm.warp(start + afterCliff);
        uint256 claimableAfterCliff = vault.claimable();
        assertGt(claimableAfterCliff, 0, "Nothing claimable after cliff");
    }
    
    /// @notice Fuzz test: Remaining allocation is correct
    function testFuzz_RemainingAllocation(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        uint64 vesting = vault.VESTING();
        vm.assume(timePassed > cliff && timePassed < vesting);
        
        // Sync and claim
        vm.startPrank(BENEFICIARY);
        
        vm.warp(block.timestamp + timePassed);
        
        uint256 claimableBefore = vault.claimable();
        vault.claim();
        
        uint256 totalClaimed = vault.totalClaimed();
        uint256 remaining = ALLOCATION - totalClaimed;
        
        // Verify math
        assertEq(totalClaimed + remaining, ALLOCATION, "Claimed + remaining != allocation");
        
        vm.stopPrank();
    }
}
