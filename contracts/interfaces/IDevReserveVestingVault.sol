// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IDevReserveVestingVault {
    function claimable() external view returns (uint256);
    function vested() external view returns (uint256);
    function claim() external;
    function pauseClaims(bool paused) external;
    function setVestingStart(uint64 timestamp) external;
    function beneficiaryVault() external returns (address);

    function VFIDE() external view returns (address);
    function BENEFICIARY() external view returns (address);
    function VAULT_HUB() external view returns (address);
    function SECURITY_HUB() external view returns (address);
    function LEDGER() external view returns (address);
    function ALLOCATION() external view returns (uint256);

    function startTimestamp() external view returns (uint64);
    function cliffTimestamp() external view returns (uint64);
    function endTimestamp() external view returns (uint64);
    function totalClaimed() external view returns (uint256);
    function claimsPaused() external view returns (bool);
}
