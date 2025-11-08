// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ICouncilElection {
    function councilSize() external view returns (uint8);
    function minCouncilScore() external view returns (uint16);
    function termEnd() external view returns (uint64);
    function isCouncil(address who) external view returns (bool);

    function register() external;
    function unregister() external;
    function setCouncil(address[] calldata members) external;
    function refreshCouncil(address[] calldata current) external;
}