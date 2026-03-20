// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVFIDEPresale {
    function saleStartTime() external view returns (uint256);
    function saleEndTime() external view returns (uint256);
    function paused() external view returns (bool);
    function finalized() external view returns (bool);
    function totalBaseSold() external view returns (uint256);
    function totalSold() external view returns (uint256);
    function totalUsdRaised() external view returns (uint256);
    function getPresaleStats() external view returns (uint256 sold, uint256 remaining, uint256 raisedUsd);
}