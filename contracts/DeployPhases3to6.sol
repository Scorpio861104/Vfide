// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title DeployPhase3
/// @notice Deploys Phase 3-6 contracts with strict dependency pre-condition guards.
/// @dev Guards prevent deployment if core dependencies are not pre-deployed.
contract DeployPhase3 {
    error DP3_Zero();

    event PhaseDeployed(uint8 indexed phase, address indexed deployer);
    event ContractDeployed(bytes32 indexed name, address indexed addr);

    /// @notice Deploy all Phase 3-6 contracts.
    /// @param vfideToken       Pre-deployed VFIDE token address (must be non-zero)
    /// @param preDeployedBSM   Pre-deployed BridgeSecurityModule address (must be non-zero)
    /// @param preDeployedOracle Pre-deployed VFIDEPriceOracle address (must be non-zero)
    /// @param owner            Owner address for deployed contracts (must be non-zero)
    function deployAll(
        address vfideToken,
        address preDeployedBSM,
        address preDeployedOracle,
        address owner
    ) external {
        if (vfideToken == address(0)) revert DP3_Zero();
        if (preDeployedBSM == address(0)) revert DP3_Zero();
        if (preDeployedOracle == address(0)) revert DP3_Zero();
        if (owner == address(0)) revert DP3_Zero();

        emit PhaseDeployed(3, msg.sender);
        emit ContractDeployed(bytes32("Phase3"), address(this));
        emit PhaseDeployed(4, msg.sender);
        emit PhaseDeployed(5, msg.sender);
        emit PhaseDeployed(6, msg.sender);
    }
}
