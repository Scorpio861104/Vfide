// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

error FI_NotDAO();
error FI_Zero();
error FI_NotAllowed();
error FI_NotCharity();
error FI_AlreadyCharity();
error FI_NotWhitelisted();
error FI_AlreadyWhitelisted();
error FI_BadSplit();
error FI_Insufficient();

contract StablecoinRegistryMock {
    mapping(address => bool) public allowed;
    mapping(address => uint8) public decimals;
    address public dao;
    
    constructor(address _dao) {
        dao = _dao;
    }
    
    function addAsset(address token, string calldata) external {
        if (msg.sender != dao) revert FI_NotDAO();
        if (allowed[token]) revert FI_AlreadyWhitelisted();
        allowed[token] = true;
        decimals[token] = 18;
    }
    
    function removeAsset(address token) external {
        if (msg.sender != dao) revert FI_NotDAO();
        if (!allowed[token]) revert FI_NotWhitelisted();
        allowed[token] = false;
    }
    
    function isWhitelisted(address token) external view returns (bool) {
        return allowed[token];
    }
    
    function tokenDecimals(address token) external view returns (uint8) {
        return decimals[token];
    }
    
    function setSymbolHint(address token, string calldata) external {
        if (msg.sender != dao) revert FI_NotDAO();
        if (!allowed[token]) revert FI_NotWhitelisted();
    }
}

contract EcoTreasuryVaultMock {
    address public dao;
    mapping(address => uint256) public balances;
    
    constructor(address _dao) {
        dao = _dao;
    }
    
    function depositStable(address token, uint256 amount) external {
        balances[token] += amount;
    }
    
    function send(address token, address, uint256 amount, string calldata) external {
        balances[token] -= amount;
    }
    
    function balanceOf(address token) external view returns (uint256) {
        return balances[token];
    }
}
