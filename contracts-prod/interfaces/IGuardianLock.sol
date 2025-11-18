// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IGuardianLock {
    function dao() external view returns (address);
    function registry() external view returns (address);
    function ledger() external view returns (address);

    function approvals(address vault) external view returns (uint8);
    function voted(address vault, address guardian) external view returns (bool);
    function locked(address vault) external view returns (bool);

    function setModules(address _registry, address _ledger) external;
    function castLock(address vault, string calldata reason) external;
    function unlock(address vault, string calldata reason) external;
    function cancel(address vault) external;
}