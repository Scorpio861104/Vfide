// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract ERC20PresaleMock {
    mapping(address => uint256) public balanceOf;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        return true;
    }
    
    function decimals() external pure returns (uint8) {
        return 6;
    }
}
