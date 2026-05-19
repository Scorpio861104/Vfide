// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IVaultInfrastructure
/// @notice Minimal interface for VaultHub -- vault ownership lookups only.
/// @dev Phase-1 fix: removed stale force-recovery functions that no longer
///      exist in VaultHub.sol (approveForceRecovery, finalizeForceRecovery,
///      recoveryApprovalCount, recoveryProposedOwner, recoveryUnlockTime).
///      DAO recovery is handled directly on VaultHub via requestDAORecovery /
///      finalizeDAORecovery / cancelDAORecovery -- exposed through IVaultHub
///      in SharedInterfaces.sol.
interface IVaultInfrastructure {
    function vaultOf(address owner) external view returns (address);
    function ownerOfVault(address vault) external view returns (address);
    function isVault(address a) external view returns (bool);
}
