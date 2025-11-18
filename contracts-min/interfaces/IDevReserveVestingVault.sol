// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IDevReserveVestingVault {
    function armFromPresale(address presale) external;
    function armAt(uint64 startTimestamp) external;
    function vested() external view returns (uint256);
    function claim() external;
    function beneficiaryVault() external view returns (address);
    function token() external view returns (address);
}