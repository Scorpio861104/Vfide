// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVaultInfrastructure {
    function vaultOf(address owner) external view returns (address);
    function ownerOfVault(address vault) external view returns (address);
    function isVault(address a) external view returns (bool);

    // Recovery functions
    function approveForceRecovery(address vault, address newOwner) external;
    function recoveryApprovalCount(address vault) external view returns (uint8);
    function recoveryProposedOwner(address vault) external view returns (address);
    function recoveryUnlockTime(address vault) external view returns (uint64);
    function finalizeForceRecovery(address vault) external;
}
