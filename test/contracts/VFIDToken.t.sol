// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

// Placeholder for actual token contract
// Replace with your actual contract path
contract MockVFIDToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    constructor() {
        totalSupply = 1000000000 * 10**18;
        balances[msg.sender] = totalSupply;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
}

contract VFIDTokenTest is Test {
    MockVFIDToken public token;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        
        token = new MockVFIDToken();
    }

    function testInitialSupply() public {
        assertEq(token.totalSupply(), 1000000000 * 10**18);
        assertEq(token.balanceOf(owner), 1000000000 * 10**18);
    }

    function testTransfer() public {
        uint256 amount = 100 * 10**18;
        
        token.transfer(user1, amount);
        
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(owner), 1000000000 * 10**18 - amount);
    }

    function testFailTransferInsufficientBalance() public {
        uint256 amount = 1000000001 * 10**18; // More than total supply
        token.transfer(user1, amount);
    }

    // Fuzz testing
    function testFuzzTransfer(address to, uint256 amount) public {
        vm.assume(to != address(0));
        vm.assume(amount <= token.balanceOf(owner));
        
        token.transfer(to, amount);
        
        assertEq(token.balanceOf(to), amount);
    }

    // Gas optimization tests
    function testGasTransfer() public {
        uint256 gasBefore = gasleft();
        token.transfer(user1, 100 * 10**18);
        uint256 gasUsed = gasBefore - gasleft();
        
        // Transfer should use less than 100k gas
        assertLt(gasUsed, 100000);
    }
}
