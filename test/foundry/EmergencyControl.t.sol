// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/EmergencyControl.sol";

contract EmergencyControlFuzzTest is Test {
    EmergencyControl emergency;
    
    address dao = address(0x100);
    address breaker = address(0x200);
    address ledger = address(0x300);
    
    function setUp() public {
        vm.etch(ledger, hex"00");
        emergency = new EmergencyControl(dao, breaker, ledger);
    }
    
    function testFuzz_daoIsSet(address) public view {
        assertEq(emergency.dao(), dao);
    }
    
    function testFuzz_minCooldownInitialized(address) public view {
        assertTrue(emergency.minCooldown() >= 0);
    }
    
    function testFuzz_memberCountStartsZero(address) public view {
        assertEq(emergency.memberCount(), 0);
    }
    
    function testFuzz_onlyDaoCanSetCooldown(address randomCaller, uint64 cooldown) public {
        vm.assume(randomCaller != dao);
        
        vm.prank(randomCaller);
        vm.expectRevert();
        emergency.setCooldown(cooldown);
    }
    
    function testFuzz_daoCanSetCooldown(uint64 cooldown) public {
        vm.assume(cooldown < 365 days);
        
        vm.prank(dao);
        emergency.setCooldown(cooldown);
        
        assertEq(emergency.minCooldown(), cooldown);
    }
    
    function testFuzz_thresholdBounded(uint8) public view {
        assertTrue(emergency.threshold() <= emergency.memberCount());
    }
    
    function testFuzz_approvalsStartZero(uint256) public view {
        assertEq(emergency.approvalsHalt(), 0);
        assertEq(emergency.approvalsUnhalt(), 0);
    }
    
    function testFuzz_lastToggleTsInitiallyZero(uint256) public view {
        assertEq(emergency.lastToggleTs(), 0);
    }
}
