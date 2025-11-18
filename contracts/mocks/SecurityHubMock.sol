// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract SecurityHubMock {
    mapping(address => bool) public locked;
    function setLocked(address vault, bool v) external { locked[vault] = v; }
    function isLocked(address vault) external view returns (bool) { return locked[vault]; }
}
