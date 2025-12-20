// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/EcosystemVault.sol";
import "../../contracts/mocks/ERC20Mock.sol";
import "../../contracts/mocks/SeerMock.sol";

contract EcosystemVaultTest is Test {
    EcosystemVault public vault;
    ERC20Mock public token;
    SeerMock public seer;
    
    address public owner = address(this);
    address public manager1 = address(0x1111);
    address public manager2 = address(0x2222);
    address public recipient = address(0x3333);
    address public randomUser = address(0x4444);
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    
    uint256 public constant INITIAL_BALANCE = 1_000_000 ether;

    function setUp() public {
        token = new ERC20Mock("VFIDE", "VFIDE");
        seer = new SeerMock();
        vault = new EcosystemVault(address(token), address(seer), address(this));
        
        // Fund the vault
        token.mint(address(vault), INITIAL_BALANCE);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Constructor() public view {
        assertEq(address(vault.vfide()), address(token));
        assertEq(vault.owner(), owner);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MANAGER TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_SetManager() public {
        assertFalse(vault.isManager(manager1));
        
        vault.setManager(manager1, true);
        assertTrue(vault.isManager(manager1));
        
        vault.setManager(manager1, false);
        assertFalse(vault.isManager(manager1));
    }

    function test_SetManagerEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit EcosystemVault.ManagerSet(manager1, true);
        vault.setManager(manager1, true);
    }

    function test_RevertSetManagerNotOwner() public {
        vm.prank(randomUser);
        vm.expectRevert("OWN: not owner");
        vault.setManager(manager1, true);
    }

    function testFuzz_SetManager(address mgr, bool active) public {
        vault.setManager(mgr, active);
        assertEq(vault.isManager(mgr), active);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAY EXPENSE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_PayExpenseAsOwner() public {
        uint256 amount = 1000 ether;
        uint256 recipientBefore = token.balanceOf(recipient);
        uint256 vaultBefore = token.balanceOf(address(vault));
        
        vault.payExpense(recipient, amount, "development");
        
        assertEq(token.balanceOf(recipient), recipientBefore + amount);
        assertEq(token.balanceOf(address(vault)), vaultBefore - amount);
    }

    function test_PayExpenseAsManager() public {
        vault.setManager(manager1, true);
        uint256 amount = 500 ether;
        
        vm.prank(manager1);
        vault.payExpense(recipient, amount, "marketing");
        
        assertEq(token.balanceOf(recipient), amount);
    }

    function test_PayExpenseEmitsEvent() public {
        uint256 amount = 1000 ether;
        
        vm.expectEmit(true, true, true, true);
        emit EcosystemVault.PaymentMade(recipient, amount, "audit costs");
        vault.payExpense(recipient, amount, "audit costs");
    }

    function test_RevertPayExpenseNotManager() public {
        vm.prank(randomUser);
        vm.expectRevert(ECO_NotAuthorized.selector);
        vault.payExpense(recipient, 100 ether, "unauthorized");
    }

    function test_RevertPayExpenseInsufficientFunds() public {
        uint256 tooMuch = INITIAL_BALANCE + 1;
        vm.expectRevert(ECO_InsufficientFunds.selector);
        vault.payExpense(recipient, tooMuch, "too much");
    }

    function testFuzz_PayExpense(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);
        uint256 before = token.balanceOf(recipient);
        
        vault.payExpense(recipient, amount, "fuzz test");
        
        assertEq(token.balanceOf(recipient), before + amount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BURN FUNDS TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_BurnFundsAsOwner() public {
        uint256 amount = 10_000 ether;
        uint256 vaultBefore = token.balanceOf(address(vault));
        uint256 deadBefore = token.balanceOf(DEAD);
        
        vault.burnFunds(amount);
        
        assertEq(token.balanceOf(DEAD), deadBefore + amount);
        assertEq(token.balanceOf(address(vault)), vaultBefore - amount);
    }

    function test_BurnFundsAsManager() public {
        vault.setManager(manager1, true);
        uint256 amount = 5000 ether;
        
        vm.prank(manager1);
        vault.burnFunds(amount);
        
        assertEq(token.balanceOf(DEAD), amount);
    }

    function test_BurnFundsEmitsEvent() public {
        uint256 amount = 10_000 ether;
        
        vm.expectEmit(true, true, true, true);
        emit EcosystemVault.FundsBurned(amount);
        vault.burnFunds(amount);
    }

    function test_RevertBurnFundsNotManager() public {
        vm.prank(randomUser);
        vm.expectRevert(ECO_NotAuthorized.selector);
        vault.burnFunds(1000 ether);
    }

    function test_RevertBurnFundsInsufficientFunds() public {
        uint256 tooMuch = INITIAL_BALANCE + 1;
        vm.expectRevert(ECO_InsufficientFunds.selector);
        vault.burnFunds(tooMuch);
    }

    function testFuzz_BurnFunds(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);
        uint256 deadBefore = token.balanceOf(DEAD);
        
        vault.burnFunds(amount);
        
        assertEq(token.balanceOf(DEAD), deadBefore + amount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WITHDRAW TESTS (Now with timelock)
    // ═══════════════════════════════════════════════════════════════════════════

    function test_WithdrawAsOwner() public {
        uint256 amount = 50_000 ether;
        uint256 recipientBefore = token.balanceOf(recipient);
        
        // Request withdraw
        uint256 requestId = vault.requestWithdraw(recipient, amount);
        
        // Wait for timelock (2 days)
        vm.warp(block.timestamp + 2 days + 1);
        
        // Execute withdraw
        vault.executeWithdraw(requestId);
        
        assertEq(token.balanceOf(recipient), recipientBefore + amount);
    }

    function test_RevertWithdrawNotOwner() public {
        vault.setManager(manager1, true);
        
        // Even managers can't request withdraw - only owner
        vm.prank(manager1);
        vm.expectRevert("OWN: not owner");
        vault.requestWithdraw(recipient, 1000 ether);
    }

    function test_RevertWithdrawNotOwnerRandomUser() public {
        vm.prank(randomUser);
        vm.expectRevert("OWN: not owner");
        vault.requestWithdraw(recipient, 1000 ether);
    }

    function testFuzz_Withdraw(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);
        uint256 before = token.balanceOf(recipient);
        
        uint256 requestId = vault.requestWithdraw(recipient, amount);
        vm.warp(block.timestamp + 2 days + 1);
        vault.executeWithdraw(requestId);
        
        assertEq(token.balanceOf(recipient), before + amount);
    }
    
    function test_WithdrawCancelRequest() public {
        uint256 amount = 50_000 ether;
        
        uint256 requestId = vault.requestWithdraw(recipient, amount);
        vault.cancelWithdraw(requestId);
        
        vm.warp(block.timestamp + 2 days + 1);
        
        vm.expectRevert("cancelled");
        vault.executeWithdraw(requestId);
    }
    
    function test_RevertWithdrawBeforeTimelock() public {
        uint256 amount = 50_000 ether;
        
        uint256 requestId = vault.requestWithdraw(recipient, amount);
        
        // Try to execute before timelock passes
        vm.expectRevert("timelock not passed");
        vault.executeWithdraw(requestId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    function test_MultipleManagersCanOperate() public {
        vault.setManager(manager1, true);
        vault.setManager(manager2, true);
        
        vm.prank(manager1);
        vault.payExpense(recipient, 100 ether, "mgr1 expense");
        
        vm.prank(manager2);
        vault.burnFunds(100 ether);
        
        assertEq(token.balanceOf(recipient), 100 ether);
        assertEq(token.balanceOf(DEAD), 100 ether);
    }

    function test_RevokedManagerCannotOperate() public {
        vault.setManager(manager1, true);
        vault.setManager(manager1, false);
        
        vm.prank(manager1);
        vm.expectRevert(ECO_NotAuthorized.selector);
        vault.payExpense(recipient, 100 ether, "revoked");
    }

    function test_DrainVaultCompletely() public {
        // Drain via payExpense
        vault.payExpense(recipient, INITIAL_BALANCE / 2, "half");
        
        // Drain rest via withdraw (with timelock)
        uint256 requestId = vault.requestWithdraw(recipient, INITIAL_BALANCE / 2);
        vm.warp(block.timestamp + 2 days + 1);
        vault.executeWithdraw(requestId);
        
        assertEq(token.balanceOf(address(vault)), 0);
        assertEq(token.balanceOf(recipient), INITIAL_BALANCE);
    }

    function test_ZeroAmountOperations() public {
        // Zero amount operations should work (no-ops)
        vault.payExpense(recipient, 0, "zero payment");
        vault.burnFunds(0);
        
        // Zero amount withdraw should revert
        vm.expectRevert("zero amount");
        vault.requestWithdraw(recipient, 0);
        
        // Vault balance unchanged
        assertEq(token.balanceOf(address(vault)), INITIAL_BALANCE);
    }
}
