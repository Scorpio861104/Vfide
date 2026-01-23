// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../bridge/VFIDEBridge.sol";
import "../bridge/BridgeSecurityModule.sol";
import "../bridge/VFIDEPriceOracle.sol";
import "../staking/VFIDEStaking.sol";
import "../staking/StakingRewards.sol";
import "../staking/GovernancePower.sol";
import "../defi/LiquidityIncentivesV2.sol";
import "../defi/LPTokenTracker.sol";
import "../defi/VFIDEFlashLoan.sol";
import "../defi/VFIDELending.sol";
import "../defi/CollateralManager.sol";

/**
 * @title DeployPhases3to6
 * @notice Deployment script for Phases 3-6 enhancements
 * @dev Deploys all contracts with proper configuration
 */
contract DeployPhases3to6 {
    struct DeploymentAddresses {
        // Phase 3: Bridge & Oracle
        address vfideBridge;
        address bridgeSecurityModule;
        address priceOracle;
        
        // Phase 4: Staking
        address vfideStaking;
        address stakingRewards;
        address governancePower;
        
        // Phase 5: Liquidity Mining
        address liquidityIncentivesV2;
        address lpTokenTracker;
        
        // Phase 6: Advanced DeFi
        address vfideFlashLoan;
        address vfideLending;
        address collateralManager;
    }

    DeploymentAddresses public deployed;

    event ContractDeployed(string indexed name, address indexed contractAddress);
    event PhaseDeployed(uint256 indexed phase, string name);

    /**
     * @notice Deploy all contracts for Phases 3-6
     * @param vfideToken VFIDE token address
     * @param layerZeroEndpoint LayerZero endpoint address
     * @param chainlinkFeed Chainlink price feed address (optional)
     * @param uniswapPool Uniswap V3 pool address (optional)
     * @param uniswapPositionManager Uniswap V3 Position Manager address
     * @param treasury Treasury address
     * @param owner Owner address
     */
    function deployAll(
        address vfideToken,
        address layerZeroEndpoint,
        address chainlinkFeed,
        address uniswapPool,
        address uniswapPositionManager,
        address quoteToken,
        address treasury,
        address owner
    ) external returns (DeploymentAddresses memory) {
        require(vfideToken != address(0), "Invalid VFIDE token");
        require(owner != address(0), "Invalid owner");

        // Phase 3: Cross-Chain Integration & Oracle
        _deployPhase3(
            vfideToken,
            layerZeroEndpoint,
            chainlinkFeed,
            uniswapPool,
            quoteToken,
            treasury,
            owner
        );

        // Phase 4: Staking & Rewards
        _deployPhase4(vfideToken, treasury, owner);

        // Phase 5: Liquidity Mining
        _deployPhase5(vfideToken, uniswapPositionManager, owner);

        // Phase 6: Advanced DeFi
        _deployPhase6(vfideToken, treasury, owner);

        // Configure contracts
        _configureContracts();

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
        address treasury,
        address owner
    ) internal {
        // Deploy Bridge Security Module
        BridgeSecurityModule securityModule = new BridgeSecurityModule(owner, address(0));
        deployed.bridgeSecurityModule = address(securityModule);
        emit ContractDeployed("BridgeSecurityModule", address(securityModule));

        // Deploy VFIDE Bridge
        VFIDEBridge bridge = new VFIDEBridge(
            vfideToken,
            layerZeroEndpoint,
            owner
        );
        deployed.vfideBridge = address(bridge);
        emit ContractDeployed("VFIDEBridge", address(bridge));

        // Update bridge address in security module
        securityModule.setBridge(address(bridge));

        // Deploy Price Oracle
        VFIDEPriceOracle priceOracle = new VFIDEPriceOracle(
            vfideToken,
            quoteToken,
            chainlinkFeed,
            uniswapPool,
            owner
        );
        deployed.priceOracle = address(priceOracle);
        emit ContractDeployed("VFIDEPriceOracle", address(priceOracle));

        emit PhaseDeployed(3, "Cross-Chain Integration & Oracle");
    }

    /**
     * @notice Deploy Phase 4 contracts
     */
    function _deployPhase4(
        address vfideToken,
        address treasury,
        address owner
    ) internal {
        // Deploy Staking Rewards
        StakingRewards stakingRewards = new StakingRewards(
            vfideToken,
            treasury,
            owner
        );
        deployed.stakingRewards = address(stakingRewards);
        emit ContractDeployed("StakingRewards", address(stakingRewards));

        // Deploy Governance Power
        GovernancePower governancePower = new GovernancePower(owner);
        deployed.governancePower = address(governancePower);
        emit ContractDeployed("GovernancePower", address(governancePower));

        // Deploy VFIDE Staking
        VFIDEStaking staking = new VFIDEStaking(
            vfideToken,
            treasury,
            owner
        );
        deployed.vfideStaking = address(staking);
        emit ContractDeployed("VFIDEStaking", address(staking));

        emit PhaseDeployed(4, "Staking & Rewards");
    }

    /**
     * @notice Deploy Phase 5 contracts
     */
    function _deployPhase5(
        address vfideToken,
        address uniswapPositionManager,
        address owner
    ) internal {
        // Deploy Liquidity Incentives V2
        LiquidityIncentivesV2 liquidityIncentives = new LiquidityIncentivesV2(
            vfideToken,
            uniswapPositionManager,
            owner
        );
        deployed.liquidityIncentivesV2 = address(liquidityIncentives);
        emit ContractDeployed("LiquidityIncentivesV2", address(liquidityIncentives));

        // Deploy LP Token Tracker
        LPTokenTracker lpTracker = new LPTokenTracker(
            uniswapPositionManager,
            deployed.priceOracle,
            owner
        );
        deployed.lpTokenTracker = address(lpTracker);
        emit ContractDeployed("LPTokenTracker", address(lpTracker));

        emit PhaseDeployed(5, "Liquidity Mining");
    }

    /**
     * @notice Deploy Phase 6 contracts
     */
    function _deployPhase6(
        address vfideToken,
        address treasury,
        address owner
    ) internal {
        // Deploy Collateral Manager
        CollateralManager collateralManager = new CollateralManager(
            deployed.priceOracle,
            owner
        );
        deployed.collateralManager = address(collateralManager);
        emit ContractDeployed("CollateralManager", address(collateralManager));

        // Deploy VFIDE Lending
        VFIDELending lending = new VFIDELending(
            vfideToken,
            address(collateralManager),
            deployed.priceOracle,
            owner
        );
        deployed.vfideLending = address(lending);
        emit ContractDeployed("VFIDELending", address(lending));

        // Deploy Flash Loan
        VFIDEFlashLoan flashLoan = new VFIDEFlashLoan(
            vfideToken,
            deployed.vfideStaking, // Fees go to stakers
            owner
        );
        deployed.vfideFlashLoan = address(flashLoan);
        emit ContractDeployed("VFIDEFlashLoan", address(flashLoan));

        emit PhaseDeployed(6, "Advanced DeFi Features");
    }

    /**
     * @notice Configure contract integrations
     */
    function _configureContracts() internal {
        // Configure Bridge
        VFIDEBridge(deployed.vfideBridge).setSecurityModule(deployed.bridgeSecurityModule);

        // Configure Staking
        VFIDEStaking(deployed.vfideStaking).setRewardsContract(deployed.stakingRewards);
        VFIDEStaking(deployed.vfideStaking).setGovernancePower(deployed.governancePower);

        // Configure Staking Rewards
        StakingRewards(deployed.stakingRewards).setStakingContract(deployed.vfideStaking);

        // Configure Governance Power
        GovernancePower(deployed.governancePower).setStakingContract(deployed.vfideStaking);

        // Configure Collateral Manager
        CollateralManager(deployed.collateralManager).setLendingContract(deployed.vfideLending);
    }

    /**
     * @notice Get all deployed addresses
     * @return addresses All deployed contract addresses
     */
    function getDeployedAddresses() external view returns (DeploymentAddresses memory) {
        return deployed;
    }

    /**
     * @notice Verify deployment
     * @return valid Whether all contracts are deployed
     */
    function verifyDeployment() external view returns (bool valid) {
        return deployed.vfideBridge != address(0) &&
               deployed.bridgeSecurityModule != address(0) &&
               deployed.priceOracle != address(0) &&
               deployed.vfideStaking != address(0) &&
               deployed.stakingRewards != address(0) &&
               deployed.governancePower != address(0) &&
               deployed.liquidityIncentivesV2 != address(0) &&
               deployed.lpTokenTracker != address(0) &&
               deployed.vfideFlashLoan != address(0) &&
               deployed.vfideLending != address(0) &&
               deployed.collateralManager != address(0);
    }
}
