// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Phase1TokenDeployer
/// @notice Legacy Phase 1 token factory - permanently disabled.
/// @dev This contract is intentionally disabled to prevent accidental reuse of the legacy factory.
/// @author Vfide
contract Phase1TokenDeployer {
    /// @notice Legacy factory is permanently disabled.
    function deploy() external pure {
        revert("Phase1TokenDeployer: LEGACY factory disabled - use current deployment scripts");
    }
}
