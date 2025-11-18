// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IGuardianRegistry {
    function dao() external view returns (address);
    function isGuardian(address vault, address guardian) external view returns (bool);
    function guardianCount(address vault) external view returns (uint8);
    function threshold(address vault) external view returns (uint8);
    function guardiansNeeded(address vault) external view returns (uint8);

    function setDAO(address _dao) external;
    function addGuardian(address vault, address guardian) external;
    function removeGuardian(address vault, address guardian) external;
    function setThreshold(address vault, uint8 mOfN) external;
}