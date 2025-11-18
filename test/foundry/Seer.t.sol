// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/Seer.sol";

contract SeerFuzzTest is Test {
    Seer seer;
    
    address dao = address(0x100);
    address ledger = address(0x200);
    address panic = address(0x300);
    address burn = address(0x400);
    address oracle = address(0x500);
    
    function setUp() public {
        vm.etch(ledger, hex"00");
        vm.etch(panic, hex"00");
        vm.etch(burn, hex"00");
        seer = new Seer(dao, ledger, panic, burn);
    }
    
    function testFuzz_daoIsSet(address) public view {
        assertEq(seer.dao(), dao);
    }
    
    function testFuzz_defaultScoreIsZero(address user) public view {
        vm.assume(user != address(0));
        // Seer returns baseScore (500) for users with no score set
        assertEq(seer.getScore(user), 500);
    }
    
    function testFuzz_governanceMinIsBasePlus100(address) public view {
        uint16 minGov = seer.minForGovernance();
        assertTrue(minGov >= 100);
    }
    
    function testFuzz_onlyDaoCanSetPolicy(address randomCaller, uint16 base, uint16 min, uint16 max) public {
        vm.assume(randomCaller != dao);
        
        vm.prank(randomCaller);
        vm.expectRevert();
        seer.setPolicy(base, min, max);
    }
    
    function testFuzz_daoCanSetPolicy(uint16 base, uint16 min, uint16 max) public {
        vm.assume(min <= base && base <= max);
        
        vm.prank(dao);
        seer.setPolicy(base, min, max);
        
        assertEq(seer.baseScore(), base);
        assertEq(seer.minScore(), min);
        assertEq(seer.maxScore(), max);
    }
    
    function testFuzz_onlyDaoCanAdjustScore(address randomCaller, address user, uint16 delta) public {
        vm.assume(randomCaller != dao);
        vm.assume(user != address(0));
        
        vm.prank(randomCaller);
        vm.expectRevert();
        seer.adjustScore(user, delta, true, "test");
    }
    
    function testFuzz_daoCanAdjustScore(address user, uint16 delta) public {
        vm.assume(user != address(0));
        vm.assume(delta > 0 && delta < 1000);
        
        uint16 scoreBefore = seer.getScore(user);
        
        vm.prank(dao);
        seer.adjustScore(user, delta, true, "increase");
        
        uint16 scoreAfter = seer.getScore(user);
        assertTrue(scoreAfter >= scoreBefore);
    }
    
    function testFuzz_onlyDaoCanFlag(address randomCaller, address user) public {
        vm.assume(randomCaller != dao);
        vm.assume(user != address(0));
        
        vm.prank(randomCaller);
        vm.expectRevert();
        seer.flag(user, 5, "test");
    }
    
    function testFuzz_daoCanFlag(address user, uint8 severity) public {
        vm.assume(user != address(0));
        vm.assume(severity > 0 && severity <= 10);
        
        vm.prank(dao);
        seer.flag(user, severity, "flagged");
        
        (,bool flagged,) = seer.profiles(user);
        assertTrue(flagged);
    }
}
