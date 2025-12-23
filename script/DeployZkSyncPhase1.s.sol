// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "../contracts/VFIDEToken.sol";
import "../contracts/VaultInfrastructure.sol";
import "../contracts/VFIDETrust.sol";
import "../contracts/DAO.sol";
import "../contracts/DAOTimelock.sol";
import "../contracts/VFIDESecurity.sol";
import "../contracts/DevReserveVestingVault.sol";
import "../contracts/VFIDEPresale.sol";
import "../contracts/VFIDECommerce.sol";
import "../contracts/StablecoinRegistry.sol";

/**
 * @title DeployZkSyncV3
 * @notice zkSync deployment that doesn't require circular dependencies
 * @dev Deploys contracts that DON'T have Token as immutable dependency
 */
contract DeployZkSyncV3 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("");
        console.log("=== PHASE 1: Core Infrastructure ===");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. ProofLedger
        ProofLedger ledger = new ProofLedger(deployer);
        console.log("ProofLedger:", address(ledger));

        // 2. Guardian system
        GuardianRegistry guardianRegistry = new GuardianRegistry(deployer);
        console.log("GuardianRegistry:", address(guardianRegistry));
        
        GuardianLock guardianLock = new GuardianLock(deployer, address(guardianRegistry), address(ledger));
        console.log("GuardianLock:", address(guardianLock));

        // 3. Security
        PanicGuard panicGuard = new PanicGuard(deployer, address(ledger), address(0));
        console.log("PanicGuard:", address(panicGuard));
        
        EmergencyBreaker breaker = new EmergencyBreaker(deployer, address(ledger));
        console.log("EmergencyBreaker:", address(breaker));
        
        SecurityHub securityHub = new SecurityHub(
            deployer,
            address(ledger),
            address(panicGuard),
            address(breaker),
            address(guardianLock)
        );
        console.log("SecurityHub:", address(securityHub));

        // 4. Seer
        Seer seer = new Seer(deployer, address(ledger), address(0));
        console.log("Seer:", address(seer));

        // 5. StablecoinRegistry
        StablecoinRegistry registry = new StablecoinRegistry();
        console.log("StablecoinRegistry:", address(registry));
        registry.setTreasury(deployer);

        console.log("");
        console.log("=== PHASE 1 COMPLETE ===");
        console.log("Copy these addresses and run Phase 2 manually");
        console.log("");
        console.log("LEDGER=", address(ledger));
        console.log("SECURITY_HUB=", address(securityHub));
        console.log("SEER=", address(seer));
        console.log("STABLECOIN_REGISTRY=", address(registry));
        console.log("GUARDIAN_REGISTRY=", address(guardianRegistry));
        console.log("GUARDIAN_LOCK=", address(guardianLock));
        console.log("PANIC_GUARD=", address(panicGuard));
        console.log("EMERGENCY_BREAKER=", address(breaker));

        vm.stopBroadcast();
    }
}
