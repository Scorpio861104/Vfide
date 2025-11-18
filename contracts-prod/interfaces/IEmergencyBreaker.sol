// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IEmergencyBreaker {
    function halted() external view returns (bool);
    function toggle(bool on, string calldata reason) external;
}