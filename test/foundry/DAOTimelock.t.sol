// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/DAOTimelock.sol";
import "../../contracts/mocks/LedgerMock.sol";
import "../../contracts/mocks/PanicGuardMock.sol";

/// @dev Target contract for timelock tests that accepts calls
contract TimelockTarget {
    function dummy() external pure returns (bool) {
        return true;
    }
    
    function dummy(uint256) external pure returns (bool) {
        return true;
    }
    
    receive() external payable {}
}

contract DAOTimelockTest is Test {
    DAOTimelock public timelock;
    LedgerMock public ledger;
    PanicGuardMock public panicGuard;
    TimelockTarget public target;
    
    address constant ADMIN = address(0x1);
    
    function setUp() public {
        ledger = new LedgerMock(false);
        panicGuard = new PanicGuardMock();
        target = new TimelockTarget();
        
        vm.prank(ADMIN);
        timelock = new DAOTimelock(ADMIN);
        
        vm.startPrank(ADMIN);
        timelock.setLedger(address(ledger));
        timelock.setPanicGuard(address(panicGuard));
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Queue delay is enforced correctly
    function testFuzz_QueueDelayEnforced(uint64 customDelay) public {
        vm.assume(customDelay > 0 && customDelay < 365 days);
        
        vm.prank(ADMIN);
        timelock.setDelay(customDelay);
        
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.prank(ADMIN);
        bytes32 id = timelock.queueTx(address(target), 0, data);
        
        (, , , uint64 eta, ) = timelock.queue(id);
        assertEq(eta, uint64(block.timestamp) + customDelay, "ETA incorrect");
    }
    
    /// @notice Fuzz test: Cannot execute before delay
    function testFuzz_CannotExecuteEarly(uint64 timeElapsed) public {
        uint64 delay = timelock.delay();
        vm.assume(timeElapsed > 0 && timeElapsed < delay);
        
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.prank(ADMIN);
        bytes32 id = timelock.queueTx(address(target), 0, data);
        
        vm.warp(block.timestamp + timeElapsed);
        
        vm.expectRevert();
        timelock.execute(id);
    }
    
    /// @notice Fuzz test: Can execute after delay passes
    function testFuzz_CanExecuteAfterDelay(uint64 extraTime) public {
        // Must stay within 7-day expiry window
        vm.assume(extraTime < 7 days);
        
        uint64 delay = timelock.delay();
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.prank(ADMIN);
        bytes32 id = timelock.queueTx(address(target), 0, data);
        
        vm.warp(block.timestamp + delay + extraTime);
        
        // Should not revert
        vm.prank(ADMIN);
        timelock.execute(id);
    }
    
    /// @notice Fuzz test: Global risk adds extra delay
    function testFuzz_GlobalRiskAddsDelay(uint64 extraTime) public {
        vm.assume(extraTime < 6 hours);
        
        uint64 delay = timelock.delay();
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.prank(ADMIN);
        bytes32 id = timelock.queueTx(address(target), 0, data);
        
        // Enable global risk
        panicGuard.setGlobalRisk(true);
        
        // Try to execute at normal delay + some extra (but less than 6 hours)
        vm.warp(block.timestamp + delay + extraTime);
        
        vm.prank(ADMIN);
        vm.expectRevert();
        timelock.execute(id);
        
        // Should work after 6 hours
        vm.warp(block.timestamp + 6 hours - extraTime + 1);
        vm.prank(ADMIN);
        timelock.execute(id);
    }
    
    /// @notice Fuzz test: Cannot queue same transaction twice (same ID)
    /// @dev Since contract uses nonce, each queue call gets unique ID.
    ///      This test verifies nonce increments properly.
    function testFuzz_CannotQueueTwice(uint256 value) public {
        vm.assume(value < 1000 ether);
        
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.startPrank(ADMIN);
        bytes32 id1 = timelock.queueTx(address(target), value, data);
        bytes32 id2 = timelock.queueTx(address(target), value, data);
        
        // IDs should be different due to nonce
        assertTrue(id1 != id2, "IDs should be different due to nonce");
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Can cancel queued transaction
    function testFuzz_CanCancelQueued(uint256 value) public {
        vm.assume(value < 1000 ether);
        
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.startPrank(ADMIN);
        bytes32 id = timelock.queueTx(address(target), value, data);
        
        timelock.cancel(id);
        
        // Should not be able to execute after cancel
        vm.warp(block.timestamp + timelock.delay());
        vm.expectRevert(TL_NotQueued.selector);
        timelock.execute(id);
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Only admin can queue
    function testFuzz_OnlyAdminCanQueue(address caller) public {
        vm.assume(caller != ADMIN);
        
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.prank(caller);
        vm.expectRevert(TL_NotAdmin.selector);
        timelock.queueTx(address(target), 0, data);
    }
    
    /// @notice Fuzz test: Cannot execute transaction twice
    function testFuzz_CannotExecuteTwice(uint256 value) public {
        // Precompiles don't accept ETH, so use value 0
        vm.assume(value == 0);
        
        bytes memory data = abi.encodeWithSignature("dummy()");
        
        vm.prank(ADMIN);
        bytes32 id = timelock.queueTx(address(target), value, data);
        
        vm.warp(block.timestamp + timelock.delay());
        
        vm.prank(ADMIN);
        timelock.execute(id);
        
        // Try to execute again
        vm.prank(ADMIN);
        vm.expectRevert();
        timelock.execute(id);
    }
    
    /// @notice Fuzz test: Delay can be updated
    function testFuzz_DelayUpdate(uint64 newDelay) public {
        vm.assume(newDelay > 0 && newDelay < 365 days);
        
        vm.prank(ADMIN);
        timelock.setDelay(newDelay);
        
        assertEq(timelock.delay(), newDelay, "Delay not updated");
    }
    
    /// @notice Fuzz test: Admin can be transferred
    function testFuzz_AdminTransfer(address newAdmin) public {
        vm.assume(newAdmin != address(0));
        vm.assume(newAdmin != ADMIN);
        
        vm.prank(ADMIN);
        timelock.setAdmin(newAdmin);
        
        assertEq(timelock.admin(), newAdmin, "Admin not transferred");
        
        // Old admin should not be able to queue
        bytes memory data = abi.encodeWithSignature("dummy()");
        vm.prank(ADMIN);
        vm.expectRevert(TL_NotAdmin.selector);
        timelock.queueTx(address(target), 0, data);
        
        // New admin should be able to queue
        vm.prank(newAdmin);
        timelock.queueTx(address(target), 0, data);
    }
    
    /// @notice Fuzz test: Multiple transactions can be queued
    function testFuzz_MultipleTransactions(uint8 numTxs) public {
        vm.assume(numTxs > 0 && numTxs <= 50);
        
        vm.startPrank(ADMIN);
        
        bytes32[] memory ids = new bytes32[](numTxs);
        
        for (uint256 i = 0; i < numTxs; i++) {
            bytes memory data = abi.encodeWithSignature("dummy(uint256)", i);
            ids[i] = timelock.queueTx(address(target), i, data);
        }
        
        // All should be queued
        for (uint256 i = 0; i < numTxs; i++) {
            (, , , uint64 eta, ) = timelock.queue(ids[i]);
            assertGt(eta, 0, "Transaction not queued");
        }
        
        vm.stopPrank();
    }
}
