// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IUserVault {
    function setModules(address ledger, address ownerChanger, address securityHub) external;
    function setOwnerByChanger(address newOwner) external;
    function execute(address target, uint256 value, bytes calldata data) external returns (bytes memory);
}