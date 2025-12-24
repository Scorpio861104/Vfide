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
 * @title DeployZkSync
 * @notice zkSync-compatible deployment script that avoids pre-computed addresses
 * @dev zkSync uses different CREATE address calculation - we deploy to temp then update
 */
contract DeployZkSync is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // ==== PHASE 1: Deploy all non-circular dependencies ====
        
        // 1. ProofLedger
        ProofLedger ledger = new ProofLedger(deployer);
        console.log("ProofLedger deployed at:", address(ledger));

        // 2. Guardian system
        GuardianRegistry guardianRegistry = new GuardianRegistry(deployer);
        GuardianLock guardianLock = new GuardianLock(deployer, address(guardianRegistry), address(ledger));

        // 3. Security
        PanicGuard panicGuard = new PanicGuard(deployer, address(ledger), address(0));
        EmergencyBreaker breaker = new EmergencyBreaker(deployer, address(ledger));
        SecurityHub securityHub = new SecurityHub(
            deployer,
            address(ledger),
            address(panicGuard),
            address(breaker),
            address(guardianLock)
        );
        console.log("SecurityHub deployed at:", address(securityHub));

        // 4. Seer
        Seer seer = new Seer(deployer, address(ledger), address(0));
        console.log("Seer deployed at:", address(seer));

        // 5. StablecoinRegistry
        StablecoinRegistry registry = new StablecoinRegistry(deployer);
        console.log("StablecoinRegistry deployed at:", address(registry));
        registry.setTreasury(deployer);

        // ==== PHASE 2: Deploy with placeholder addresses ====
        // For zkSync, we use address(0) or deployer as placeholders
        // and then update via setter functions after deployment
        
        // Deploy VFIDEPresale with placeholder token
        VFIDEPresale presale = new VFIDEPresale(
            deployer,             // _dao (temporary)
            deployer,             // _token (placeholder - will update)
            deployer,             // _treasury
            address(registry),    // _stablecoinRegistry
            block.timestamp + 1 days // _startTime
        );
        console.log("VFIDEPresale deployed at:", address(presale));

        // Deploy DevReserveVestingVault with placeholder addresses
        DevReserveVestingVault devVault = new DevReserveVestingVault(
            deployer,             // VFIDE (placeholder)
            deployer,             // beneficiary
            deployer,             // hub (placeholder)
            address(securityHub),
            address(ledger),
            address(presale),
            50_000_000e18         // DEV_RESERVE_SUPPLY
        );
        console.log("DevReserveVestingVault deployed at:", address(devVault));

        // Deploy VFIDEToken with devVault address (now exists!)
        VFIDEToken token = new VFIDEToken(
            address(devVault),    // devReserveVestingVault
            address(presale),     // _presaleContract
            deployer,             // treasury
            deployer,             // _vaultHub (placeholder)
            address(ledger),      // _ledger
            deployer              // _treasurySink
        );
        console.log("VFIDEToken deployed at:", address(token));

        // Deploy VaultInfrastructure (Hub)
        VaultInfrastructure hub = new VaultInfrastructure(
            address(token),
            address(securityHub),
            address(ledger),
            deployer // DAO (temporary)
        );
        console.log("VaultInfrastructure deployed at:", address(hub));

        // ==== PHASE 3: Deploy DAO ====
        DAOTimelock timelock = new DAOTimelock(deployer);
        
        DAO dao = new DAO(
            deployer,
            address(timelock),
            address(seer),
            address(hub),
            address(0)
        );
        console.log("DAO deployed at:", address(dao));
        console.log("DAOTimelock deployed at:", address(timelock));

        // ==== PHASE 4: Deploy Commerce ====
        MerchantRegistry merchantRegistry = new MerchantRegistry(
            address(dao),
            address(token),
            address(hub),
            address(seer),
            address(securityHub),
            address(ledger)
        );
        
        CommerceEscrow escrow = new CommerceEscrow(
            address(dao),
            address(token),
            address(hub),
            address(merchantRegistry),
            address(securityHub),
            address(seer)
        );

        // ==== PHASE 5: Wire up ====
        seer.setModules(address(ledger), address(hub));
        panicGuard.setHub(address(hub));
        token.setSecurityHub(address(securityHub));

        // ==== OUTPUT ====
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("VFIDEToken:", address(token));
        console.log("VFIDEPresale:", address(presale));
        console.log("VaultInfrastructure:", address(hub));
        console.log("DAO:", address(dao));
        console.log("DAOTimelock:", address(timelock));
        console.log("StablecoinRegistry:", address(registry));
        console.log("ProofLedger:", address(ledger));
        console.log("SecurityHub:", address(securityHub));
        console.log("Seer:", address(seer));
        console.log("MerchantRegistry:", address(merchantRegistry));
        console.log("CommerceEscrow:", address(escrow));
        console.log("DevReserveVestingVault:", address(devVault));
        console.log("");
        console.log("=== IMPORTANT: Post-Deploy Updates Needed ===");
        console.log("Token and DevVault have placeholder addresses that need updating.");
        console.log("Call setter functions or redeploy with correct addresses if needed.");

        vm.stopBroadcast();
    }
}
