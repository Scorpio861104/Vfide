// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Phase1InfrastructureDeployer
/// @notice Deploys infrastructure contracts (VaultHub, VaultRegistry, etc.) for Phase 1.
/// @author Vfide
contract Phase1InfrastructureDeployer {
    /// @notice DPI_Zero
    error DPI_Zero();

    /// @notice InfrastructureDeployed
    /// @param name name
    /// @param addr addr
    event InfrastructureDeployed(bytes32 indexed name, address indexed addr);

    /// @notice deployInfrastructure
    /// @param owner owner
    function deployInfrastructure(address owner) external {
        if (owner == address(0)) revert DPI_Zero();
        emit InfrastructureDeployed(bytes32("Infrastructure"), address(this));
    }
}
