// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IStablecoinRegistry {
    function isAllowed(address token) external view returns (bool);
    function decimalsOf(address token) external view returns (uint8);
    function treasury() external view returns (address);
}