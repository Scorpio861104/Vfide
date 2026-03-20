// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Mock StablecoinRegistry implementing IStablecoinRegistry interface for presale tests
contract StablecoinRegistryPresaleMock {
    mapping(address => bool) public allowed;
    mapping(address => uint8) public tokenDecimalsMap;
    address public treasury;
    
    constructor() {
        treasury = msg.sender;
    }
    
    function allow(address token) external {
        allowed[token] = true;
        if (tokenDecimalsMap[token] == 0) tokenDecimalsMap[token] = 6;
    }
    
    function allowWithDecimals(address token, uint8 decimals) external {
        allowed[token] = true;
        tokenDecimalsMap[token] = decimals;
    }
    
    function setAllowed(address token, bool _allowed) external {
        allowed[token] = _allowed;
    }
    
    /// @notice IStablecoinRegistry.isWhitelisted
    function isWhitelisted(address token) external view returns (bool) {
        return allowed[token];
    }
    
    /// @notice Legacy alias
    function isAllowed(address token) external view returns (bool) {
        return allowed[token];
    }
    
    /// @notice IStablecoinRegistry.tokenDecimals
    function tokenDecimals(address token) external view returns (uint8) {
        uint8 d = tokenDecimalsMap[token];
        return d == 0 ? 6 : d;
    }
    
    /// @notice Legacy alias
    function decimalsOf(address token) external view returns (uint8) {
        uint8 d = tokenDecimalsMap[token];
        return d == 0 ? 6 : d;
    }
    
    function setTreasury(address _treasury) external {
        treasury = _treasury;
    }
}
