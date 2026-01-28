// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract StablecoinRegistryMock {
    mapping(address => bool) public isWhitelisted;
    mapping(address => uint8) public tokenDecimals;
    address public treasury;

    function setWhitelisted(address token, bool status) external { isWhitelisted[token] = status; }
    function setDecimals(address token, uint8 decimals) external { tokenDecimals[token] = decimals; }
    function setTreasury(address newTreasury) external { treasury = newTreasury; }
}
