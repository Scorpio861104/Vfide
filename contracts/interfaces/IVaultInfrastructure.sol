// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IVaultInfrastructure
/// @notice Minimal interface for VaultHub -- vault ownership lookups only.
/// @dev Recovery is exclusively through the user's own guardians via
///      `VaultRecoveryClaim` (14-day vote + 7-day challenge) or wallet
///      rotation. The previous DAO-recovery selectors on VaultHub
///      (`approveForceRecovery`, `initiateForceRecovery`,
///      `finalizeForceRecovery`, `requestDAORecovery`,
///      `finalizeDAORecovery`, `cancelDAORecovery`) were removed in the
///      v19.13 non-custody cleanup — they are deliberately absent from the
///      ABI, asserted by
///      `scripts/verify-vault-hub-cardbound-integration.ts`.
/// @author Vfide
interface IVaultInfrastructure {
    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address);
    /// @notice ownerOfVault
    /// @param vault vault
    /// @return _address _address
    function ownerOfVault(address vault) external view returns (address);
    /// @notice isVault
    /// @param a a
    /// @return _bool _bool
    function isVault(address a) external view returns (bool);
}
