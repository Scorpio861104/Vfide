// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeployPhase1Security
 * @notice Deployment script for Phase 1 security enhancements
 * @dev Deploy all security contracts in correct order with proper configuration
 */

import "../security/VFIDEAccessControl.sol";
import "../security/AdminMultiSig.sol";
import "../security/EmergencyControlV2.sol";
import "../security/CircuitBreaker.sol";
import "../security/WithdrawalQueue.sol";
import "../VFIDETokenV2.sol";

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
        address _admin,
        address[5] memory _council,
        address _priceOracle,
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _initialSupply
    ) external returns (DeploymentAddresses memory addresses) {
        require(_admin != address(0), "Phase1Deployer: zero admin address");
        require(_priceOracle != address(0), "Phase1Deployer: zero oracle address");

        // 1. Deploy VFIDEAccessControl
        VFIDEAccessControl accessControl = new VFIDEAccessControl(_admin);
        addresses.accessControl = address(accessControl);

        // 2. Deploy AdminMultiSig
        AdminMultiSig multiSig = new AdminMultiSig(_council);
        addresses.multiSig = address(multiSig);

        // 3. Deploy EmergencyControlV2
        EmergencyControlV2 emergencyControl = new EmergencyControlV2(_admin);
        addresses.emergencyControl = address(emergencyControl);

        // 4. Deploy CircuitBreaker
        CircuitBreaker circuitBreaker = new CircuitBreaker(
            _admin,
            _priceOracle,
            address(emergencyControl)
        );
        addresses.circuitBreaker = address(circuitBreaker);

        // 5. Deploy WithdrawalQueue
        WithdrawalQueue withdrawalQueue = new WithdrawalQueue(_admin, 1000000 * 10**18); // 1M tokens
        addresses.withdrawalQueue = address(withdrawalQueue);

        // 6. Deploy VFIDETokenV2
        VFIDETokenV2 token = new VFIDETokenV2(
            _tokenName,
            _tokenSymbol,
            _initialSupply,
            _admin,
            address(multiSig)
        );
        addresses.tokenV2 = address(token);

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
        EmergencyControlV2 emergencyControl = EmergencyControlV2(addresses.emergencyControl);
        CircuitBreaker circuitBreaker = CircuitBreaker(addresses.circuitBreaker);

        // Grant emergency pauser roles
        for (uint256 i = 0; i < _pausers.length; i++) {
            accessControl.grantRoleWithReason(
                accessControl.EMERGENCY_PAUSER_ROLE(),
                _pausers[i],
                "Phase 1 deployment"
            );
            
            emergencyControl.grantRoleWithReason(
                emergencyControl.EMERGENCY_PAUSER_ROLE(),
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
            
            emergencyControl.grantRoleWithReason(
                emergencyControl.BLACKLIST_MANAGER_ROLE(),
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
            
            emergencyControl.grantRoleWithReason(
                emergencyControl.CONFIG_MANAGER_ROLE(),
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

/**
 * @title Deployment Instructions
 * @notice Step-by-step guide for deploying Phase 1 security enhancements
 * 
 * PREREQUISITES:
 * 1. Have admin wallet with sufficient gas (estimate: 0.1 ETH on mainnet)
 * 2. Prepare 5 council member addresses (must be secure, ideally hardware wallets)
 * 3. Deploy or identify price oracle contract address
 * 4. Prepare list of emergency pausers, blacklist managers, config managers
 * 
 * DEPLOYMENT STEPS:
 * 
 * Step 1: Deploy Phase1Deployer contract
 *   npx hardhat run scripts/deployPhase1Deployer.ts --network <network>
 * 
 * Step 2: Call deployPhase1() with parameters
 *   - _admin: Governance/DAO timelock address
 *   - _council: [address1, address2, address3, address4, address5]
 *   - _priceOracle: Chainlink or custom oracle address
 *   - _tokenName: "VFIDE Token V2"
 *   - _tokenSymbol: "VFIDE"
 *   - _initialSupply: 1000000000 * 10**18 (1 billion tokens)
 * 
 * Step 3: Call configureContracts() with role assignments
 *   - _pausers: Emergency pause authority (3-5 addresses)
 *   - _blacklistManagers: Blacklist authority (2-3 addresses)
 *   - _configManagers: Configuration authority (2-3 addresses)
 * 
 * Step 4: Verify contracts on block explorer
 *   npx hardhat verify --network <network> <contract_address> <constructor_args>
 * 
 * Step 5: Test deployment on testnet first
 *   - Deploy to Sepolia/Mumbai/zkSync testnet
 *   - Run full test suite
 *   - Perform security audit
 *   - Test emergency scenarios
 * 
 * Step 6: Production deployment checklist
 *   ✓ All contracts verified on Etherscan
 *   ✓ Roles properly assigned
 *   ✓ Multi-sig configured with correct council
 *   ✓ Circuit breaker thresholds set
 *   ✓ Withdrawal queue configured
 *   ✓ Emergency procedures documented
 *   ✓ Monitoring dashboards set up
 *   ✓ Community announcement prepared
 * 
 * POST-DEPLOYMENT:
 * 1. Transfer admin role to governance
 * 2. Renounce deployer privileges
 * 3. Set up monitoring alerts
 * 4. Document all contract addresses
 * 5. Update frontend with new addresses
 * 6. Announce to community
 * 
 * SECURITY CONSIDERATIONS:
 * - Never reuse private keys across networks
 * - Always test on testnet first
 * - Keep deployment scripts in version control
 * - Use hardware wallet for council members
 * - Implement timelock on all critical functions
 * - Regular security audits (quarterly)
 * - Incident response plan ready
 * 
 * ESTIMATED GAS COSTS (Ethereum mainnet):
 * - VFIDEAccessControl: ~1.5M gas
 * - AdminMultiSig: ~2.5M gas
 * - EmergencyControlV2: ~3M gas
 * - CircuitBreaker: ~2.5M gas
 * - WithdrawalQueue: ~2M gas
 * - VFIDETokenV2: ~3.5M gas
 * Total: ~15M gas (~0.075 ETH at 50 gwei)
 * 
 * TIMELINE:
 * - Testnet deployment & testing: 1 week
 * - Security audit: 2 weeks
 * - Bug fixes: 1 week
 * - Mainnet deployment: 1 day
 * - Total: 4-5 weeks
 */
