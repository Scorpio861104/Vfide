// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "../contracts/VFIDEToken.sol";
import "../contracts/VaultInfrastructure.sol";
import "../contracts/VFIDETrust.sol";
import "../contracts/VFIDESecurity.sol";
import "../contracts/VFIDEPresale.sol";
import "../contracts/StablecoinRegistry.sol";
import "../contracts/DevReserveVestingVault.sol";

/**
 * @title DeployMultiChain
 * @notice Simplified deployment script for standard EVM chains (Base, Polygon)
 * @dev Run with:
 *   BASE SEPOLIA:    forge script script/DeployMultiChain.s.sol --rpc-url base_sepolia --broadcast --verify
 *   POLYGON AMOY:    forge script script/DeployMultiChain.s.sol --rpc-url polygon_amoy --broadcast --verify
 *   BASE MAINNET:    forge script script/DeployMultiChain.s.sol --rpc-url base --broadcast --verify
 *   POLYGON MAINNET: forge script script/DeployMultiChain.s.sol --rpc-url polygon --broadcast --verify
 */
contract DeployMultiChain is Script {
    
    // Chain IDs for reference
    uint256 constant BASE_MAINNET = 8453;
    uint256 constant BASE_SEPOLIA = 84532;
    uint256 constant POLYGON_MAINNET = 137;
    uint256 constant POLYGON_AMOY = 80002;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== VFIDE Multi-Chain Deployment ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("");

        // Identify chain
        string memory chainName = _getChainName(block.chainid);
        console.log("Deploying to:", chainName);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ========================================
        // PHASE 1: Core Security Layer
        // ========================================
        console.log("--- Phase 1: Security Layer ---");
        
        ProofLedger ledger = new ProofLedger(deployer);
        console.log("ProofLedger:", address(ledger));

        GuardianRegistry guardianRegistry = new GuardianRegistry(deployer);
        GuardianLock guardianLock = new GuardianLock(deployer, address(guardianRegistry), address(ledger));
        PanicGuard panicGuard = new PanicGuard(deployer, address(ledger), address(0));
        EmergencyBreaker breaker = new EmergencyBreaker(deployer, address(ledger));
        
        SecurityHub securityHub = new SecurityHub(
            deployer,
            address(guardianLock),
            address(panicGuard),
            address(breaker),
            address(ledger)
        );
        console.log("SecurityHub:", address(securityHub));

        // ========================================
        // PHASE 2: Trust Layer
        // ========================================
        console.log("--- Phase 2: Trust Layer ---");
        
        Seer seer = new Seer(deployer, address(ledger), address(0));
        console.log("Seer:", address(seer));

        StablecoinRegistry registry = new StablecoinRegistry();
        registry.setTreasury(deployer);
        console.log("StablecoinRegistry:", address(registry));

        // ========================================
        // PHASE 3: Token System (with pre-computed addresses)
        // ========================================
        console.log("--- Phase 3: Token System ---");
        
        uint256 deployerNonce = vm.getNonce(deployer);
        address prePresale  = computeCreateAddress(deployer, deployerNonce);
        address preDevVault = computeCreateAddress(deployer, deployerNonce + 1);
        address preToken    = computeCreateAddress(deployer, deployerNonce + 2);
        address preHub      = computeCreateAddress(deployer, deployerNonce + 3);

        // Deploy in order to satisfy dependencies
        VFIDEPresale presale = new VFIDEPresale(
            deployer,
            preToken,
            deployer,
            address(registry),
            block.timestamp + 1 days
        );
        require(address(presale) == prePresale, "Presale address mismatch");
        console.log("VFIDEPresale:", address(presale));

        DevReserveVestingVault devVault = new DevReserveVestingVault(
            preToken,
            deployer,
            preHub,
            address(securityHub),
            address(ledger),
            address(presale),
            50_000_000e18
        );
        require(address(devVault) == preDevVault, "DevVault address mismatch");
        console.log("DevReserveVestingVault:", address(devVault));

        VFIDEToken token = new VFIDEToken(
            address(devVault),
            address(presale),
            deployer,
            preHub,
            address(ledger),
            deployer
        );
        require(address(token) == preToken, "Token address mismatch");
        console.log("VFIDEToken:", address(token));

        // ========================================
        // PHASE 4: Vault Infrastructure
        // ========================================
        console.log("--- Phase 4: Vault Infrastructure ---");
        
        VaultInfrastructure hub = new VaultInfrastructure(
            address(token),
            address(securityHub),
            address(ledger),
            deployer
        );
        require(address(hub) == preHub, "Hub address mismatch");
        console.log("VaultInfrastructure:", address(hub));

        // ========================================
        // PHASE 5: Wire Up
        // ========================================
        console.log("--- Phase 5: Wiring ---");
        
        seer.setModules(address(ledger), address(hub));
        panicGuard.setHub(address(hub));
        token.setSecurityHub(address(securityHub));
        
        console.log("Wiring complete!");

        vm.stopBroadcast();

        // ========================================
        // OUTPUT FOR FRONTEND
        // ========================================
        console.log("");
        console.log("===========================================");
        console.log("DEPLOYMENT COMPLETE ON", chainName);
        console.log("===========================================");
        console.log("");
        console.log("Add these to your frontend/.env:");
        console.log("");
        console.log("# Chain:", chainName);
        console.log("NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=", address(token));
        console.log("NEXT_PUBLIC_VAULTHUB_ADDRESS=", address(hub));
        console.log("NEXT_PUBLIC_PRESALE_ADDRESS=", address(presale));
        console.log("NEXT_PUBLIC_SEER_ADDRESS=", address(seer));
        console.log("");
        console.log("Update lib/chains.ts with these addresses!");
    }

    function _getChainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == BASE_MAINNET) return "Base Mainnet";
        if (chainId == BASE_SEPOLIA) return "Base Sepolia (Testnet)";
        if (chainId == POLYGON_MAINNET) return "Polygon Mainnet";
        if (chainId == POLYGON_AMOY) return "Polygon Amoy (Testnet)";
        return "Unknown Chain";
    }
}
