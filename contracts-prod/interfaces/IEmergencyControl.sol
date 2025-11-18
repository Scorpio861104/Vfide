// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IEmergencyControl {
    function dao() external view returns (address);
    function minCooldown() external view returns (uint64);
    function lastToggleTs() external view returns (uint64);
    function threshold() external view returns (uint8);
    function isMember(address who) external view returns (bool);

    function setModules(address _dao, address _breaker, address _ledger) external;
    function setCooldown(uint64 secondsMin) external;
    function resetCommittee(uint8 _threshold, address[] calldata members) external;
    function addMember(address m) external;
    function removeMember(address m) external;
    function setThreshold(uint8 _threshold) external;

    function daoToggle(bool halt, string calldata reason) external;
    function committeeVote(bool halt, string calldata reason) external;
    function timeSinceLastToggle() external view returns (uint64);
}