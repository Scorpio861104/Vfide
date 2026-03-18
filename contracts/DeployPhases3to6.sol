// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDEBridge.sol";

/// @dev H-18 Fix: BSM and VFIDEPriceOracle moved to DeployPhase3Peripherals.sol
///      to resolve name collision between OZ (VFIDEBridge) and custom (SharedInterfaces) primitives.

interface ISystemExemptToken {
    function setSystemExempt(address who, bool isExempt) external;
}

/// @dev Minimal interfaces for deploy-time wiring (BSM/Oracle deployed separately)
interface IBridgeSecurityModule_Deploy {
    function setBridge(address _bridge) external;
}
interface IVFIDEBridge_Deploy {
    function setSecurityModule(address _securityModule) external;
}

// ============================================
// HOWEY COMPLIANCE NOTICE:
// Phases 4-6 (Staking, Liquidity Mining, DeFi) have been
// removed to ensure compliance with Howey Test requirements.
// These phases created "expectation of profits from others' efforts"
// which could classify VFIDE as a security.
//
// Removed imports:
// - ../staking/VFIDEStaking.sol
// - ../staking/StakingRewards.sol
// - ../staking/GovernancePower.sol
// - ../defi/LiquidityIncentivesV2.sol
// - ../defi/LPTokenTracker.sol
// - ../defi/VFIDEFlashLoan.sol
// - ../defi/VFIDELending.sol
// - ../defi/CollateralManager.sol
// ============================================

/**
 * @title DeployPhase3
 * @notice Deployment script for Phase 3 (Bridge & Oracle) - Howey-Safe
 * @dev Phases 4-6 removed for Howey compliance
 */
contract DeployPhase3 {
    error DP3_Zero();

    bytes32 private constant NAME_BSM = bytes32("BSM");
    bytes32 private constant NAME_BRG = bytes32("BRG");
    bytes32 private constant NAME_ORC = bytes32("ORC");
    bytes32 private constant NAME_PHASE3 = bytes32("P3");

    struct DeploymentAddresses {
        // Phase 3: Bridge & Oracle (Howey-Safe)
        address vfideBridge;
        address bridgeSecurityModule;
        address priceOracle;
        
        // Phases 4-6 removed for Howey compliance
        // Phase 4: Staking - REMOVED
        // Phase 5: Liquidity Mining - REMOVED
        // Phase 6: Advanced DeFi - REMOVED
    }

    DeploymentAddresses public deployed;

    event ContractDeployed(bytes32 indexed name, address indexed contractAddress);
    event PhaseDeployed(uint256 indexed phase, bytes32 name);

    /**
     * @notice Deploy Phase 3 contracts (Bridge only; BSM & Oracle deployed via DeployPhase3Peripherals)
     * @dev Phases 4-6 removed for Howey compliance.
     *      BSM and VFIDEPriceOracle use custom SharedInterfaces (no OZ) and are deployed
     *      separately to avoid name collisions with VFIDEBridge's OZ imports.
     * @param vfideToken VFIDE token address
     * @param layerZeroEndpoint LayerZero endpoint address
     * @param preDeployedBSM Pre-deployed BridgeSecurityModule address
     * @param preDeployedOracle Pre-deployed VFIDEPriceOracle address
     * @param owner Owner address
     */
    function deployAll(
        address vfideToken,
        address layerZeroEndpoint,
        address preDeployedBSM,
        address preDeployedOracle,
        address owner
    ) external returns (DeploymentAddresses memory) {
        if (vfideToken == address(0) || owner == address(0)) revert DP3_Zero();
        if (preDeployedBSM == address(0) || preDeployedOracle == address(0)) revert DP3_Zero();

        _deployPhase3(vfideToken, layerZeroEndpoint, preDeployedBSM, preDeployedOracle, owner);

        return deployed;
    }

    /**
     * @notice Deploy VFIDEBridge and wire with pre-deployed BSM & Oracle
     */
    function _deployPhase3(
        address vfideToken,
        address layerZeroEndpoint,
        address preDeployedBSM,
        address preDeployedOracle,
        address owner
    ) internal {
        // Record pre-deployed peripherals
        deployed.bridgeSecurityModule = preDeployedBSM;
        deployed.priceOracle = preDeployedOracle;
        emit ContractDeployed(NAME_BSM, preDeployedBSM);
        emit ContractDeployed(NAME_ORC, preDeployedOracle);

        // Deploy VFIDE Bridge (OZ-based, required by LayerZero OApp)
        // slither-disable-next-line reentrancy-no-eth
        VFIDEBridge bridge = new VFIDEBridge(
            vfideToken,
            layerZeroEndpoint,
            owner
        );
        deployed.vfideBridge = address(bridge);
        // slither-disable-next-line reentrancy-events
        emit ContractDeployed(NAME_BRG, address(bridge));

        // Wire BSM ↔ Bridge linkage
        // slither-disable-next-line reentrancy-no-eth
        IBridgeSecurityModule_Deploy(preDeployedBSM).setBridge(address(bridge));
        bridge.setSecurityModule(preDeployedBSM);

        // Required for vault-only mode: allow bridge contract transfers.
        ISystemExemptToken(vfideToken).setSystemExempt(address(bridge), true);

        // slither-disable-next-line reentrancy-events
        emit PhaseDeployed(3, NAME_PHASE3);
    }
}
