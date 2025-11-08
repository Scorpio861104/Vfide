// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IPanicGuard {
    function dao() external view returns (address);
    function ledger() external view returns (address);

    function globalRisk() external view returns (bool);
    function minDuration() external view returns (uint64);
    function maxDuration() external view returns (uint64);
    function quarantineUntil(address vault) external view returns (uint64);

    function setLedger(address _ledger) external;
    function setPolicy(uint64 _minDuration, uint64 _maxDuration) external;
    function reportRisk(address vault, uint64 duration, uint8 severity, string calldata reason) external;
    function clear(address vault, string calldata reason) external;
    function setGlobalRisk(bool on, string calldata reason) external;
    function isQuarantined(address vault) external view returns (bool);
}