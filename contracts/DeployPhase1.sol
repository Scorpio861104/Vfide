// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeployPhase1Security
 * @notice Deployment script for Phase 1 security enhancements
 * @dev Deploy all security contracts in correct order with proper configuration
 */

import "./VFIDEAccessControl.sol";
import "./AdminMultiSig.sol";
import "./CircuitBreaker.sol";

interface IPhase1GovernanceDeployer {
    function deployGovernance(
        address _admin,
        address[5] memory _council
    ) external returns (
        address accessControl,
        address multiSig,
        address emergencyControl
    );
}

interface IPhase1InfrastructureDeployer {
    function deployInfrastructure(
        address _admin,
        address _priceOracle,
        address _emergencyControl
    ) external returns (
        address circuitBreaker,
        address withdrawalQueue
    );
}

interface IPhase1TokenDeployer {
    function deployToken(
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _initialSupply,
        address _admin,
        address _multiSig
    ) external returns (address tokenV2);
}

/**
 * @title Phase1Deployer
 * @notice Orchestrates deployment of all Phase 1 security contracts
 */
contract Phase1Deployer {
    struct DeploymentAddresses {
        address accessControl;
        address multiSig;
        address emergencyControl;
        address circuitBreaker;
        address withdrawalQueue;
        address tokenV2;
    }

    event Phase1Deployed(
        address indexed deployer,
        DeploymentAddresses addresses,
        uint256 timestamp
    );

    /**
     * @notice Deploy all Phase 1 contracts
     * @param _admin Admin address
     * @param _council Array of 5 council member addresses
     * @param _priceOracle Price oracle address
     * @param _tokenName Token name
     * @param _tokenSymbol Token symbol
     * @param _initialSupply Initial token supply
     * @return addresses Deployed contract addresses
     */
    function deployPhase1(
        address _governanceDeployer,
        address _infrastructureDeployer,
        address _tokenDeployer,
        address _admin,
        address[5] memory _council,
        address _priceOracle,
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _initialSupply
    ) external returns (DeploymentAddresses memory addresses) {
        require(_governanceDeployer != address(0), "Phase1Deployer: zero governance deployer");
        require(_infrastructureDeployer != address(0), "Phase1Deployer: zero infrastructure deployer");
        require(_tokenDeployer != address(0), "Phase1Deployer: zero token deployer");
        require(_admin != address(0), "Phase1Deployer: zero admin address");
        require(_priceOracle != address(0), "Phase1Deployer: zero oracle address");

        (
            addresses.accessControl,
            addresses.multiSig,
            addresses.emergencyControl
        ) = IPhase1GovernanceDeployer(_governanceDeployer).deployGovernance(
            _admin,
            _council
        );

        (
            addresses.circuitBreaker,
            addresses.withdrawalQueue
        ) = IPhase1InfrastructureDeployer(_infrastructureDeployer).deployInfrastructure(
            _admin,
            _priceOracle,
            addresses.emergencyControl
        );

        addresses.tokenV2 = IPhase1TokenDeployer(_tokenDeployer).deployToken(
            _tokenName,
            _tokenSymbol,
            _initialSupply,
            _admin,
            addresses.multiSig
        );

        emit Phase1Deployed(msg.sender, addresses, block.timestamp);

        return addresses;
    }

    /**
     * @notice Configure deployed contracts with proper roles and permissions
     * @param addresses Deployment addresses from deployPhase1
     * @param _pausers Array of emergency pauser addresses
     * @param _blacklistManagers Array of blacklist manager addresses
     * @param _configManagers Array of config manager addresses
     */
    function configureContracts(
        DeploymentAddresses memory addresses,
        address[] memory _pausers,
        address[] memory _blacklistManagers,
        address[] memory _configManagers
    ) external {
        VFIDEAccessControl accessControl = VFIDEAccessControl(addresses.accessControl);
        CircuitBreaker circuitBreaker = CircuitBreaker(addresses.circuitBreaker);

        // Grant emergency pauser roles
        for (uint256 i = 0; i < _pausers.length; i++) {
            accessControl.grantRoleWithReason(
                accessControl.EMERGENCY_PAUSER_ROLE(),
                _pausers[i],
                "Phase 1 deployment"
            );
            
        }

        // Grant blacklist manager roles
        for (uint256 i = 0; i < _blacklistManagers.length; i++) {
            accessControl.grantRoleWithReason(
                accessControl.BLACKLIST_MANAGER_ROLE(),
                _blacklistManagers[i],
                "Phase 1 deployment"
            );
            
            circuitBreaker.grantRoleWithReason(
                circuitBreaker.BLACKLIST_MANAGER_ROLE(),
                _blacklistManagers[i],
                "Phase 1 deployment"
            );
        }

        // Grant config manager roles
        for (uint256 i = 0; i < _configManagers.length; i++) {
            accessControl.grantRoleWithReason(
                accessControl.CONFIG_MANAGER_ROLE(),
                _configManagers[i],
                "Phase 1 deployment"
            );
            
            circuitBreaker.grantRoleWithReason(
                circuitBreaker.CONFIG_MANAGER_ROLE(),
                _configManagers[i],
                "Phase 1 deployment"
            );
        }
    }
}

