// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../contracts/VaultInfrastructure.sol";
import "../contracts/mocks/TestToken.sol";

/**
 * Comprehensive tests for Chain of Return & Next of Kin recovery system
 */
contract VaultRecoveryTest is Test {
    VaultInfrastructure public hub;
    TestToken public token;
    
    address public owner = address(0x1);
    address public guardian1 = address(0x2);
    address public guardian2 = address(0x3);
    address public guardian3 = address(0x4);
    address public nextOfKin = address(0x5);
    address public newOwner = address(0x6);
    address public attacker = address(0x7);
    
    address public userVault;
    
    function setUp() public {
        // Deploy token
        token = new TestToken("VFIDE", "VFIDE", 18);
        
        // Deploy VaultHub
        hub = new VaultInfrastructure(
            address(token),
            address(0), // securityHub
            address(0), // ledger
            address(this) // dao
        );
        
        // Create vault for owner
        vm.prank(owner);
        userVault = hub.ensureVault(owner);
        
        // Setup guardians
        vm.startPrank(owner);
        UserVault(userVault).setGuardian(guardian1, true);
        UserVault(userVault).setGuardian(guardian2, true);
        UserVault(userVault).setGuardian(guardian3, true);
        vm.stopPrank();
        
        // Fast forward 7 days for guardian maturity
        vm.warp(block.timestamp + 7 days + 1);
    }
    
    // ===== TEST 1: Set Next of Kin =====
    function test_setNextOfKin_byOwner() public {
        vm.prank(owner);
        UserVault(userVault).setNextOfKin(nextOfKin);
        
        assertEq(UserVault(userVault).nextOfKin(), nextOfKin);
    }
    
    function testFail_setNextOfKin_byNonOwner() public {
        vm.prank(attacker);
        UserVault(userVault).setNextOfKin(nextOfKin);
    }
    
    function testFail_setNextOfKin_zeroAddress() public {
        vm.prank(owner);
        UserVault(userVault).setNextOfKin(address(0));
    }
    
    // ===== TEST 2: Instant Inheritance (0 Guardians) =====
    function test_instantInheritance_nextOfKin_noGuardians() public {
        // Remove all guardians
        vm.startPrank(owner);
        UserVault(userVault).setGuardian(guardian1, false);
        UserVault(userVault).setGuardian(guardian2, false);
        UserVault(userVault).setGuardian(guardian3, false);
        UserVault(userVault).setNextOfKin(nextOfKin);
        vm.stopPrank();
        
        // Next of Kin initiates recovery
        vm.prank(nextOfKin);
        UserVault(userVault).requestRecovery(nextOfKin);
        
        // Should be instant
        assertEq(UserVault(userVault).owner(), nextOfKin);
    }
    
    // ===== TEST 3: Protected Inheritance (With Guardians) =====
    function test_protectedInheritance_nextOfKin_withGuardians() public {
        // Set Next of Kin
        vm.prank(owner);
        UserVault(userVault).setNextOfKin(nextOfKin);
        
        // Next of Kin initiates recovery
        vm.prank(nextOfKin);
        UserVault(userVault).requestRecovery(nextOfKin);
        
        // Should NOT be instant (guardians exist)
        assertEq(UserVault(userVault).owner(), owner);
        
        // Guardians approve
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        // Finalize
        vm.prank(nextOfKin);
        UserVault(userVault).finalizeRecovery();
        
        // Now ownership transfers
        assertEq(UserVault(userVault).owner(), nextOfKin);
    }
    
    // ===== TEST 4: Lost Wallet Recovery (Chain of Return) =====
    function test_lostWalletRecovery_guardian_initiates() public {
        // Guardian initiates recovery for user's new address
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Owner still has control
        assertEq(UserVault(userVault).owner(), owner);
        
        // Second guardian approves
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        // Finalize recovery
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
        
        // User regains access with new address
        assertEq(UserVault(userVault).owner(), newOwner);
    }
    
    // ===== TEST 5: Guardian Maturity Check =====
    function testFail_guardianApprove_notMature() public {
        // Add new guardian
        vm.prank(owner);
        UserVault(userVault).setGuardian(attacker, true);
        
        // Initiate recovery
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // New guardian tries to vote immediately (should fail)
        vm.prank(attacker);
        UserVault(userVault).guardianApproveRecovery();
    }
    
    function test_guardianApprove_afterMaturity() public {
        // Add new guardian
        vm.prank(owner);
        UserVault(userVault).setGuardian(attacker, true);
        
        // Fast forward 7 days
        vm.warp(block.timestamp + 7 days + 1);
        
        // Initiate recovery
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Now guardian can vote
        vm.prank(attacker);
        UserVault(userVault).guardianApproveRecovery();
    }
    
    // ===== TEST 6: Guardian Already Voted =====
    function testFail_guardianApprove_alreadyVoted() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Guardian1 auto-approved when initiating
        // Try to vote again (should fail)
        vm.prank(guardian1);
        UserVault(userVault).guardianApproveRecovery();
    }
    
    // ===== TEST 7: Dynamic Threshold (2/3) =====
    function test_finalizeRecovery_2of3_threshold() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        // Should succeed with 2/3
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
        
        assertEq(UserVault(userVault).owner(), newOwner);
    }
    
    // ===== TEST 8: Dynamic Threshold (1/1) =====
    function test_finalizeRecovery_1of1_threshold() public {
        // Remove 2 guardians
        vm.startPrank(owner);
        UserVault(userVault).setGuardian(guardian2, false);
        UserVault(userVault).setGuardian(guardian3, false);
        vm.stopPrank();
        
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Should succeed with 1/1
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
        
        assertEq(UserVault(userVault).owner(), newOwner);
    }
    
    // ===== TEST 9: Insufficient Approvals =====
    function testFail_finalizeRecovery_insufficientApprovals() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Only 1 approval (guardian1 auto-approved)
        // Try to finalize (should fail - needs 2/3)
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
    }
    
    // ===== TEST 10: Recovery Expiry (30 days) =====
    function testFail_finalizeRecovery_afterExpiry() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        // Fast forward 31 days
        vm.warp(block.timestamp + 31 days);
        
        // Try to finalize (should fail - expired)
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
    }
    
    function test_approveRecovery_beforeExpiry() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Fast forward 29 days (still valid)
        vm.warp(block.timestamp + 29 days);
        
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
        
        assertEq(UserVault(userVault).owner(), newOwner);
    }
    
    // ===== TEST 11: Owner Cancels Recovery =====
    function test_cancelRecovery_byOwner() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(attacker);
        
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        // Owner detects fraud and cancels
        vm.prank(owner);
        UserVault(userVault).cancelRecovery();
        
        // Owner still has control
        assertEq(UserVault(userVault).owner(), owner);
    }
    
    function testFail_cancelRecovery_noActiveRecovery() public {
        // No recovery in progress
        vm.prank(owner);
        UserVault(userVault).cancelRecovery();
    }
    
    function testFail_cancelRecovery_byNonOwner() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Attacker tries to cancel
        vm.prank(attacker);
        UserVault(userVault).cancelRecovery();
    }
    
    // ===== TEST 12: Cancel Then Restart Recovery =====
    function test_cancelRecovery_thenRestart() public {
        // First recovery attempt
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(attacker);
        
        // Owner cancels
        vm.prank(owner);
        UserVault(userVault).cancelRecovery();
        
        // Start legitimate recovery
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
        
        assertEq(UserVault(userVault).owner(), newOwner);
    }
    
    // ===== TEST 13: Guardian Auto-Approval =====
    function test_guardianAutoApproval_onRequest() public {
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Guardian1 should have auto-approved (count = 1)
        // Add one more approval to reach 2/3
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        // Should finalize with 2 approvals
        vm.prank(guardian1);
        UserVault(userVault).finalizeRecovery();
        
        assertEq(UserVault(userVault).owner(), newOwner);
    }
    
    // ===== TEST 14: Events Emitted =====
    function test_events_emitted() public {
        // Set Next of Kin
        vm.expectEmit(true, false, false, false);
        emit UserVault.NextOfKinSet(nextOfKin);
        vm.prank(owner);
        UserVault(userVault).setNextOfKin(nextOfKin);
        
        // Request Recovery
        vm.expectEmit(true, false, false, false);
        emit UserVault.RecoveryRequested(newOwner);
        vm.prank(guardian1);
        UserVault(userVault).requestRecovery(newOwner);
        
        // Approve Recovery
        vm.expectEmit(true, true, false, false);
        emit UserVault.RecoveryApproved(guardian2, newOwner, 2);
        vm.prank(guardian2);
        UserVault(userVault).guardianApproveRecovery();
        
        // Cancel Recovery
        vm.expectEmit(true, false, false, false);
        emit UserVault.RecoveryCancelled(owner);
        vm.prank(owner);
        UserVault(userVault).cancelRecovery();
    }
}
