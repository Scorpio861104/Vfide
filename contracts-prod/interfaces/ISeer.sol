// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISeer {
    function getScore(address user) external view returns (uint16);
    function minForGovernance() external view returns (uint16);
    function flag(address user, uint8 severity, string calldata reason) external;
    function adjustScore(address user, uint16 delta, bool increase, string calldata reason) external;
}