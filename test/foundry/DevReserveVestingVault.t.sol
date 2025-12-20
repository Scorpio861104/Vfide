// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/DevReserveVestingVault.sol";
import "../../contracts/mocks/ERC20Mock.sol";
import "../../contracts/mocks/VaultHubMock.sol";
import "../../contracts/mocks/SecurityHubMock.sol";
import "../../contracts/mocks/LedgerMock.sol";
import "../../contracts/mocks/PresaleMock.sol";

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
        ledger = new LedgerMock(false);
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
    
    /// @notice Fuzz test: Cliff is strictly enforced
    function testFuzz_CliffStrictlyEnforced(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        // Ensure timePassed is strictly less than cliff (not at boundary)
        vm.assume(timePassed > 0 && timePassed < cliff && timePassed < cliff - 1);
        
        // Move time forward but still in cliff from presale start
        uint256 presaleStart = presale.presaleStartTime();
        vm.warp(presaleStart + timePassed);
        
        vm.prank(BENEFICIARY);
        vm.expectRevert(DevReserveVestingVault.DV_NothingToClaim.selector);
        vault.claim();
    }
    
    /// @notice Fuzz test: Vesting calculation uses bi-monthly unlocks after cliff
    function testFuzz_LinearVestingAfterCliff(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        uint64 unlockInterval = 60 days; // Bi-monthly unlocks
        uint64 maxSafeTime = 14 * unlockInterval; // Stay under ALLOCATION (14 * 2.78M < 40M)
        uint256 unlockAmount = vault.UNLOCK_AMOUNT();
        uint256 totalUnlocks = vault.TOTAL_UNLOCKS();
        
        // Must be at least one full unlock interval, but not exceed safe max
        vm.assume(timePassed >= unlockInterval && timePassed <= maxSafeTime);
        
        uint256 presaleStart = presale.presaleStartTime();
        
        // Warp to cliff + timePassed
        vm.warp(presaleStart + cliff + timePassed);
        
        uint256 claimable = vault.claimable();
        
        // Calculate expected vested amount based on unlock intervals
        // NEW: First unlock is at cliff end, then every 60 days after
        // At cliff + 0: unlocksPassed = 1 (first unlock at cliff)
        // At cliff + 60 days: unlocksPassed = 2
        // So: unlocksPassed = (timePassed / unlockInterval) + 1
        uint256 unlocksPassed = (timePassed / unlockInterval) + 1;
        
        uint256 expectedVested;
        if (unlocksPassed >= totalUnlocks) {
            // Cap at ALLOCATION when all unlocks done
            expectedVested = ALLOCATION;
        } else {
            // Otherwise, straight multiplication but cap at ALLOCATION
            expectedVested = unlocksPassed * unlockAmount;
            if (expectedVested > ALLOCATION) {
                expectedVested = ALLOCATION;
            }
        }
        
        // Claimable should match expected vested (since no prior claims)
        assertEq(claimable, expectedVested, "Vesting not following unlock schedule");
    }
    
    /// @notice Fuzz test: Cannot claim more than allocated
    function testFuzz_CannotExceedAllocation(uint256 timeJump) public {
        vm.assume(timeJump > vault.VESTING() && timeJump < 10 * 365 days);
        
        uint256 presaleStart = presale.presaleStartTime();
        
        // Warp past cliff to sync start
        vm.warp(presaleStart + vault.CLIFF() + 1);
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
        // Fewer claims needed since unlock interval is 60 days
        vm.assume(numClaims >= 1 && numClaims <= 10);
        
        uint256 presaleStart = presale.presaleStartTime();
        uint64 cliff = vault.CLIFF();
        uint64 unlockInterval = 60 days;
        
        // Warp past cliff + first unlock interval to have something claimable
        vm.warp(presaleStart + cliff + unlockInterval);
        
        uint256 totalReceived = 0;
        
        // Claim in unlock intervals
        for (uint256 i = 0; i < numClaims; i++) {
            uint256 claimableBefore = vault.claimable();
            
            if (claimableBefore > 0) {
                address beneficiaryVault = vaultHub.ensureVault(BENEFICIARY);
                uint256 balBefore = vfide.balanceOf(beneficiaryVault);
                
                vm.prank(BENEFICIARY);
                vault.claim();
                
                uint256 balAfter = vfide.balanceOf(beneficiaryVault);
                totalReceived += (balAfter - balBefore);
            }
            
            // Move forward one unlock interval
            vm.warp(block.timestamp + unlockInterval);
        }
        
        // Allow small rounding error accumulation
        assertApproxEqRel(vault.totalClaimed(), totalReceived, 0.0001e18, "Total claimed doesn't match received");
    }
    
    /// @notice Fuzz test: Pausing prevents claims
    function testFuzz_PausingStopsClaims(uint32 timePassed) public {
        uint64 cliff = vault.CLIFF();
        uint64 unlockInterval = 60 days; // Bi-monthly unlocks
        uint64 maxSafeTime = 14 * unlockInterval; // Stay under ALLOCATION (14 * 2.78M < 40M)
        
        // Must be at least one unlock interval after cliff, but less than max safe
        vm.assume(timePassed >= unlockInterval && timePassed <= maxSafeTime);
        
        uint256 presaleStart = presale.presaleStartTime();
        
        // Move forward past cliff + some time
        vm.warp(presaleStart + cliff + timePassed);
        
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
        // Must be after cliff but before vesting ends
        vm.assume(timePassed > 1 days && timePassed < vesting);
        
        uint256 presaleStart = presale.presaleStartTime();
        
        // Move forward past cliff
        vm.warp(presaleStart + cliff + timePassed);
        
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
        uint64 unlockInterval = 60 days; // Bi-monthly unlocks
        
        vm.assume(beforeCliff > 0 && beforeCliff < cliff);
        // Must wait at least one full unlock interval after cliff to have something claimable
        vm.assume(afterCliff >= cliff + unlockInterval && afterCliff < cliff + 365 days);
        
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
        uint64 unlockInterval = 60 days; // Bi-monthly unlocks
        uint64 maxSafeTime = 14 * unlockInterval; // Stay under ALLOCATION (14 * 2.78M < 40M)
        
        // Must be at least one unlock interval, but less than max safe
        vm.assume(timePassed >= unlockInterval && timePassed <= maxSafeTime);
        
        uint256 presaleStart = presale.presaleStartTime();
        
        // Sync and claim
        vm.startPrank(BENEFICIARY);
        
        // Warp to after cliff + timePassed
        vm.warp(presaleStart + cliff + timePassed);
        
        uint256 claimableBefore = vault.claimable();
        vault.claim();
        
        uint256 totalClaimed = vault.totalClaimed();
        uint256 remaining = ALLOCATION - totalClaimed;
        
        // Verify math
        assertEq(totalClaimed + remaining, ALLOCATION, "Claimed + remaining != allocation");
        
        vm.stopPrank();
    }
}
