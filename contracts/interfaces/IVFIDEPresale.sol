// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVFIDEPresale {
    function presaleStartTime() external view returns (uint256);
    function started() external view returns (bool);
    function startPresale() external;
}