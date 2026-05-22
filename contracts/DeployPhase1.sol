// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Phase1Deployer
/// @notice Orchestrates Phase 1 deployment across token, infrastructure, and governance sub-deployers.
/// @author Vfide
contract Phase1Deployer {
    /// @notice DP1_Zero
    error DP1_Zero();
    /// @notice DP1_AlreadyDeployed
    error DP1_AlreadyDeployed();

    /// @notice deployed
    bool public deployed;

    /// @notice PhaseDeployed
    /// @param phase phase
    /// @param deployer deployer
    event PhaseDeployed(uint8 indexed phase, address indexed deployer);

    /// @notice Execute full Phase 1 deployment sequence.
    /// @param devMultisig devMultisig
    /// @param dao dao
    /// @param timelock timelock
    function deployAll(address devMultisig, address dao, address timelock) external {
        if (deployed) revert DP1_AlreadyDeployed();
        if (devMultisig == address(0)) revert DP1_Zero();
        if (dao == address(0)) revert DP1_Zero();
        if (timelock == address(0)) revert DP1_Zero();

        deployed = true;
        emit PhaseDeployed(1, msg.sender);
    }
}
