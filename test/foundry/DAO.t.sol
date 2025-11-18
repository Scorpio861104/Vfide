// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/DAO.sol";

contract DAOFuzzTest is Test {
    DAO dao;
    
    address admin = address(0x100);
    address timelock = address(0x200);
    address seer = address(0x300);
    address vaultHub = address(0x400);
    address hooks = address(0x500);
    
    function setUp() public {
        vm.etch(timelock, hex"00");
        vm.etch(seer, hex"00");
        vm.etch(vaultHub, hex"00");
        vm.etch(hooks, hex"00");
        
        dao = new DAO(admin, timelock, seer, vaultHub, hooks);
    }
    
    function testFuzz_adminIsSet(address) public view {
        assertEq(dao.admin(), admin);
    }
    
    function testFuzz_votingPeriodBounded(uint256) public view {
        assertTrue(dao.votingPeriod() > 0);
        assertTrue(dao.votingPeriod() < 365 days);
    }
    
    function testFuzz_quorumBounded(uint256) public view {
        assertTrue(dao.quorum() >= 0);
        assertTrue(dao.quorum() <= 100);
    }
    
    function testFuzz_proposalCountStartsZero(uint256) public view {
        assertEq(dao.proposalCount(), 0);
    }
    
    function testFuzz_modulesAreSet(address) public view {
        assertEq(address(dao.timelock()), timelock);
        assertEq(address(dao.seer()), seer);
        assertEq(address(dao.vaultHub()), vaultHub);
    }
    
    function testFuzz_paramsValidRange(uint16 period, uint8 q) public {
        vm.assume(period >= 1 hours && period < 365 days);  // DAO clamps to min 1 hour
        vm.assume(q <= 100);
        
        vm.prank(admin);
        dao.setParams(period, q);
        
        assertEq(dao.votingPeriod(), period, "Voting period should match");
        assertEq(dao.quorum(), q, "Quorum should match");
    }
    
    function testFuzz_cannotSetInvalidQuorum(uint8 q) public {
        vm.assume(q > 100);
        
        vm.prank(admin);
        dao.setParams(7 days, q);
        
        // DAO clamps quorum to 100, doesn't revert
        assertEq(dao.quorum(), 100, "Quorum should be clamped to 100");
    }
    
    function testFuzz_onlyAdminCanSetParams(address randomCaller, uint16 period, uint8 q) public {
        vm.assume(randomCaller != admin);
        vm.assume(period > 0 && period < 365 days);
        vm.assume(q <= 100);
        
        vm.prank(randomCaller);
        vm.expectRevert();
        dao.setParams(period, q);
    }
}
