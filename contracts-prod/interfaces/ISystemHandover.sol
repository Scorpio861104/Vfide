// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISystemHandover {
    function start() external view returns (uint64);
    function handoverAt() external view returns (uint64);
    function armFromPresale(address presale) external;
    function setParams(uint64 _monthsDelay, uint16 _minAvg, uint8 _maxExt, uint64 _extSpan) external;
    function extendOnceIfNeeded(uint16 networkAvgScore) external;
    function executeHandover(address newAdmin) external;
}