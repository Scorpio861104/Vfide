// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/GovernanceHooks.sol";

/**
 * Comprehensive test suite for GovernanceHooks contract
 * Coverage: hook execution, module management, event logging
 * Target: 20+ tests for 100% coverage of simple contract
 */
contract GovernanceHooksTest is Test {
    GovernanceHooks public hooks;
    MockProofLedger public ledger;
    MockSeer public seer;
    
    address public dao = address(0x100);
    address public voter1 = address(0x201);
    address public voter2 = address(0x202);
    
    event ModulesSet(address ledger, address seer);
    
    function setUp() public {
        ledger = new MockProofLedger();
        seer = new MockSeer();
        hooks = new GovernanceHooks(address(ledger), address(seer), dao);
    }
    
    // ============================================
    // DEPLOYMENT TESTS
    // ============================================
    
    function test_Deployment() public view {
        assertEq(address(hooks.ledger()), address(ledger));
        assertEq(address(hooks.seer()), address(seer));
        assertEq(hooks.dao(), dao);
    }
    
    function test_DeploymentWithZeroModules() public {
        GovernanceHooks emptyHooks = new GovernanceHooks(address(0), address(0), address(0));
        assertEq(address(emptyHooks.ledger()), address(0));
        assertEq(address(emptyHooks.seer()), address(0));
    }
    
    // ============================================
    // MODULE MANAGEMENT TESTS
    // ============================================
    
    function test_SetModules() public {
        MockProofLedger newLedger = new MockProofLedger();
        MockSeer newSeer = new MockSeer();
        
        vm.expectEmit(false, false, false, true);
        emit ModulesSet(address(newLedger), address(newSeer));
        hooks.setModules(address(newLedger), address(newSeer));
        
        assertEq(address(hooks.ledger()), address(newLedger));
        assertEq(address(hooks.seer()), address(newSeer));
    }
    
    function test_SetModulesToZero() public {
        hooks.setModules(address(0), address(0));
        assertEq(address(hooks.ledger()), address(0));
        assertEq(address(hooks.seer()), address(0));
    }
    
    // ============================================
    // HOOK EXECUTION TESTS
    // ============================================
    
    function test_OnProposalQueued() public {
        hooks.onProposalQueued(1, dao, 1000 ether);
        assertTrue(ledger.eventLogged());
    }
    
    function test_OnProposalQueuedMultiple() public {
        hooks.onProposalQueued(1, dao, 1000 ether);
        hooks.onProposalQueued(2, voter1, 2000 ether);
        hooks.onProposalQueued(3, voter2, 3000 ether);
        assertTrue(ledger.eventLogged());
    }
    
    function test_OnProposalQueuedWithoutLedger() public {
        hooks.setModules(address(0), address(seer));
        hooks.onProposalQueued(1, dao, 1000 ether);
        // Should not revert
    }
    
    function test_OnVoteCast() public {
        hooks.onVoteCast(1, voter1, true);
        assertTrue(ledger.eventLogged());
    }
    
    function test_OnVoteCastSupport() public {
        hooks.onVoteCast(1, voter1, true);
        hooks.onVoteCast(1, voter2, false);
        assertTrue(ledger.eventLogged());
    }
    
    function test_OnVoteCastWithoutLedger() public {
        hooks.setModules(address(0), address(seer));
        hooks.onVoteCast(1, voter1, true);
        // Should not revert
    }
    
    function test_OnFinalized() public {
        hooks.onFinalized(1, true);
        assertTrue(ledger.eventLogged());
    }
    
    function test_OnFinalizedPassed() public {
        hooks.onFinalized(1, true);
        assertTrue(ledger.eventLogged());
    }
    
    function test_OnFinalizedFailed() public {
        hooks.onFinalized(1, false);
        assertTrue(ledger.eventLogged());
    }
    
    function test_OnFinalizedWithoutLedger() public {
        hooks.setModules(address(0), address(seer));
        hooks.onFinalized(1, true);
        // Should not revert
    }
    
    // ============================================
    // INTEGRATION TESTS
    // ============================================
    
    function test_CompleteProposalLifecycle() public {
        hooks.onProposalQueued(1, dao, 1000 ether);
        hooks.onVoteCast(1, voter1, true);
        hooks.onVoteCast(1, voter2, true);
        hooks.onFinalized(1, true);
        assertTrue(ledger.eventLogged());
    }
    
    function test_MultipleProposalsSimultaneous() public {
        hooks.onProposalQueued(1, dao, 1000 ether);
        hooks.onProposalQueued(2, dao, 2000 ether);
        hooks.onVoteCast(1, voter1, true);
        hooks.onVoteCast(2, voter1, false);
        hooks.onFinalized(1, true);
        hooks.onFinalized(2, false);
        assertTrue(ledger.eventLogged());
    }
    
    // ============================================
    // FUZZ TESTS
    // ============================================
    
    function testFuzz_OnProposalQueued(uint256 id, address target, uint256 value) public {
        hooks.onProposalQueued(id, target, value);
        assertTrue(ledger.eventLogged());
    }
    
    function testFuzz_OnVoteCast(uint256 id, address voter, bool support) public {
        vm.assume(voter != address(0));
        hooks.onVoteCast(id, voter, support);
        assertTrue(ledger.eventLogged());
    }
    
    function testFuzz_OnFinalized(uint256 id, bool passed) public {
        hooks.onFinalized(id, passed);
        assertTrue(ledger.eventLogged());
    }
}

// ============================================
// MOCK CONTRACTS
// ============================================

contract MockProofLedger {
    bool public eventLogged;
    
    function logSystemEvent(address, string calldata, address) external {
        eventLogged = true;
    }
}

contract MockSeer {
    function punish(address, uint16, string calldata) external pure {}
    function reward(address, uint16, string calldata) external pure {}
}
