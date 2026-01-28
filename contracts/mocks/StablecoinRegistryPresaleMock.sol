// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract StablecoinRegistryPresaleMock {
    mapping(address => bool) public allowed;
    address public treasury;
    
    constructor() {
        treasury = msg.sender;
    }
    
    function allow(address token) external {
        allowed[token] = true;
    }
    
    function setAllowed(address token, bool _allowed) external {
        allowed[token] = _allowed;
    }
    
    function isAllowed(address token) external view returns (bool) {
        return allowed[token];
    }
    
    function decimalsOf(address) external pure returns (uint8) {
        return 6;
    }
}
