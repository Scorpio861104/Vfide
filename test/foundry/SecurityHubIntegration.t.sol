// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/mocks/SecurityHubMock.sol";
import "../../contracts/mocks/VaultHubMock.sol";

/**
 * @title SecurityHub Integration Test Suite
 * @notice Tests SecurityHub lock/unlock scenarios with vault operations
 */
contract SecurityHubIntegrationTest is Test {
    SecurityHubMock public securityHub;
    VaultHubMock public vaultHub;
    
    address public alice = address(0x100);
    address public bob = address(0x101);
    address public aliceVault;
    address public bobVault;
    
    event VaultLocked(address indexed vault);
    event VaultUnlocked(address indexed vault);
    
    function setUp() public {
        // Deploy mocks
        securityHub = new SecurityHubMock();
        vaultHub = new VaultHubMock();
        
        // Setup vaults
        aliceVault = address(0x1000);
        bobVault = address(0x2000);
        vaultHub.setVault(alice, aliceVault);
        vaultHub.setVault(bob, bobVault);
    }
    
    // ===== TEST 1: Basic Lock/Unlock Functionality =====
    
    function test_BasicLockUnlock() public {
        assertFalse(securityHub.isLocked(aliceVault), "Vault should start unlocked");
        
        // Lock vault
        securityHub.setLocked(aliceVault, true);
        assertTrue(securityHub.isLocked(aliceVault), "Vault should be locked");
        
        // Unlock vault
        securityHub.setLocked(aliceVault, false);
        assertFalse(securityHub.isLocked(aliceVault), "Vault should be unlocked");
    }
    
    // ===== TEST 2: Lock State Queries =====
    
    function test_LockStateQueries() public {
        // Multiple vaults have independent lock states
        securityHub.setLocked(aliceVault, true);
        assertTrue(securityHub.isLocked(aliceVault));
        assertFalse(securityHub.isLocked(bobVault));
    }
    
    // ===== TEST 3: Lock State Verification =====
    
    function test_LockStateVerification() public {
        // Lock vault
        securityHub.setLocked(aliceVault, true);
        
        // Verify lock state
        assertTrue(securityHub.isLocked(aliceVault));
        
        // Verify it stays locked
        assertTrue(securityHub.isLocked(aliceVault));
    }
    
    // ===== TEST 4: Unlock State Verification =====
    
    function test_UnlockStateVerification() public {
        // Lock first
        securityHub.setLocked(aliceVault, true);
        assertTrue(securityHub.isLocked(aliceVault));
        
        // Unlock
        securityHub.setLocked(aliceVault, false);
        
        // Verify unlock state
        assertFalse(securityHub.isLocked(aliceVault));
        
        // Verify it stays unlocked
        assertFalse(securityHub.isLocked(aliceVault));
    }
    
    // ===== TEST 5: Multiple Lock/Unlock Cycles =====
    
    function test_MultipleLockUnlockCycles() public {
        for (uint i = 0; i < 5; i++) {
            // Lock
            securityHub.setLocked(aliceVault, true);
            assertTrue(securityHub.isLocked(aliceVault));
            
            // Unlock
            securityHub.setLocked(aliceVault, false);
            assertFalse(securityHub.isLocked(aliceVault));
        }
    }
    
    // ===== TEST 6: Lock State Persistence =====
    
    function test_LockStatePersistence() public {
        // Lock vault
        securityHub.setLocked(aliceVault, true);
        
        // Check state multiple times
        for (uint i = 0; i < 10; i++) {
            assertTrue(securityHub.isLocked(aliceVault), "Lock should persist");
            vm.warp(block.timestamp + 1 hours);
        }
        
        // Unlock
        securityHub.setLocked(aliceVault, false);
        
        // Check unlock persists
        for (uint i = 0; i < 10; i++) {
            assertFalse(securityHub.isLocked(aliceVault), "Unlock should persist");
            vm.warp(block.timestamp + 1 hours);
        }
    }
    
    // ===== TEST 7: Emergency Lock Scenario =====
    
    function test_EmergencyLockScenario() public {
        // Simulate suspicious activity - immediate lock
        securityHub.setLocked(aliceVault, true);
        assertTrue(securityHub.isLocked(aliceVault));
        
        // After investigation, unlock
        securityHub.setLocked(aliceVault, false);
        assertFalse(securityHub.isLocked(aliceVault));
    }
    
    // ===== TEST 8: Multiple Vaults Lock State Independence =====
    
    function test_MultipleVaultsIndependence() public {
        // Lock only Alice's vault
        securityHub.setLocked(aliceVault, true);
        
        // Alice locked
        assertTrue(securityHub.isLocked(aliceVault));
        
        // Bob not locked
        assertFalse(securityHub.isLocked(bobVault));
    }
    
    // ===== TEST 9: Fuzz - Random Lock/Unlock Pattern =====
    
    function testFuzz_RandomLockPattern(uint8 numCycles, bool[] memory lockStates) public {
        vm.assume(lockStates.length > 0);
        numCycles = uint8(bound(numCycles, 1, 20));
        
        for (uint i = 0; i < numCycles && i < lockStates.length; i++) {
            bool shouldLock = lockStates[i % lockStates.length];
            
            securityHub.setLocked(aliceVault, shouldLock);
            assertEq(securityHub.isLocked(aliceVault), shouldLock);
        }
    }
    
    // ===== TEST 10: Multiple Simultaneous Locks =====
    
    function test_MultipleSimultaneousLocks() public {
        // Lock both vaults
        securityHub.setLocked(aliceVault, true);
        securityHub.setLocked(bobVault, true);
        
        // Both should be locked
        assertTrue(securityHub.isLocked(aliceVault));
        assertTrue(securityHub.isLocked(bobVault));
        
        // Unlock Alice, Bob still locked
        securityHub.setLocked(aliceVault, false);
        assertFalse(securityHub.isLocked(aliceVault));
        assertTrue(securityHub.isLocked(bobVault));
    }
    
    // ===== TEST 11: Lock State After Time Warp =====
    
    function test_LockStateAfterTimeWarp() public {
        securityHub.setLocked(aliceVault, true);
        
        // Warp forward 1 year
        vm.warp(block.timestamp + 365 days);
        
        // Lock persists
        assertTrue(securityHub.isLocked(aliceVault));
    }
    
    // ===== TEST 12: Idempotent Lock Operations =====
    
    function test_IdempotentLockOperations() public {
        // Lock twice
        securityHub.setLocked(aliceVault, true);
        securityHub.setLocked(aliceVault, true);
        assertTrue(securityHub.isLocked(aliceVault));
        
        // Unlock twice
        securityHub.setLocked(aliceVault, false);
        securityHub.setLocked(aliceVault, false);
        assertFalse(securityHub.isLocked(aliceVault));
    }
}
