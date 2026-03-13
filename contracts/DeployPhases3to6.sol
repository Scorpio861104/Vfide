// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDEBridge.sol";
import "./BridgeSecurityModule.sol";
import "./VFIDEPriceOracle.sol";

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
     * @notice Deploy Phase 3 contracts (Bridge & Oracle)
     * @dev Phases 4-6 removed for Howey compliance
     * @param vfideToken VFIDE token address
     * @param layerZeroEndpoint LayerZero endpoint address
     * @param chainlinkFeed Chainlink price feed address (optional)
     * @param uniswapPool Uniswap V3 pool address (optional)
     * @param quoteToken Quote token address for oracle
     * @param owner Owner address
     */
    function deployAll(
        address vfideToken,
        address layerZeroEndpoint,
        address chainlinkFeed,
        address uniswapPool,
        address quoteToken,
        address owner
    ) external returns (DeploymentAddresses memory) {
        if (vfideToken == address(0) || owner == address(0)) revert DP3_Zero();

        // Phase 3: Cross-Chain Integration & Oracle (Howey-Safe)
        _deployPhase3(
            vfideToken,
            layerZeroEndpoint,
            chainlinkFeed,
            uniswapPool,
            quoteToken,
            owner
        );

        // Phases 4-6 REMOVED for Howey compliance:
        // - Phase 4: Staking & Rewards (creates profit expectation)
        // - Phase 5: Liquidity Mining (creates profit expectation)
        // - Phase 6: Advanced DeFi (lending, flash loans)

        return deployed;
    }

    /**
     * @notice Deploy Phase 3 contracts
     */
    function _deployPhase3(
        address vfideToken,
        address layerZeroEndpoint,
        address chainlinkFeed,
        address uniswapPool,
        address quoteToken,
        address owner
    ) internal {
        // Deploy Bridge Security Module
        BridgeSecurityModule securityModule = new BridgeSecurityModule(owner, address(0));
        deployed.bridgeSecurityModule = address(securityModule);
        emit ContractDeployed(NAME_BSM, address(securityModule));

        // Deploy VFIDE Bridge
        // slither-disable-next-line reentrancy-no-eth
        VFIDEBridge bridge = new VFIDEBridge(
            vfideToken,
            layerZeroEndpoint,
            owner
        );
        deployed.vfideBridge = address(bridge);
        // slither-disable-next-line reentrancy-events
        emit ContractDeployed(NAME_BRG, address(bridge));

        // Update bridge address in security module
        // slither-disable-next-line reentrancy-no-eth
        securityModule.setBridge(address(bridge));

        // Configure bridge security module linkage
        bridge.setSecurityModule(address(securityModule));

        // Deploy Price Oracle
        VFIDEPriceOracle priceOracle = new VFIDEPriceOracle(
            vfideToken,
            quoteToken,
            chainlinkFeed,
            uniswapPool,
            owner
        );
        deployed.priceOracle = address(priceOracle);
        // slither-disable-next-line reentrancy-events
        emit ContractDeployed(NAME_ORC, address(priceOracle));

        // slither-disable-next-line reentrancy-events
        emit PhaseDeployed(3, NAME_PHASE3);
    }
}
