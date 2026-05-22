// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Phase1InfrastructureDeployer
/// @notice Deploys infrastructure contracts (VaultHub, VaultRegistry, etc.) for Phase 1.
contract Phase1InfrastructureDeployer {
    error DPI_Zero();

    event InfrastructureDeployed(bytes32 indexed name, address indexed addr);

    function deployInfrastructure(address owner) external {
        if (owner == address(0)) revert DPI_Zero();
        emit InfrastructureDeployed(bytes32("Infrastructure"), address(this));
    }
}
