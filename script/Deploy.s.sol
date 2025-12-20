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

contract DeployVfide is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ProofLedger (Trust Layer Base)
        ProofLedger ledger = new ProofLedger(deployer);
        console.log("ProofLedger deployed at:", address(ledger));

        // 2. Deploy Security Layer (Base)
        // GuardianRegistry -> GuardianLock -> PanicGuard -> EmergencyBreaker -> SecurityHub
        GuardianRegistry guardianRegistry = new GuardianRegistry(deployer);
        GuardianLock guardianLock = new GuardianLock(deployer, address(guardianRegistry), address(ledger));
        
        // We need Hub for PanicGuard, but Hub needs SecurityHub. Circular dependency.
        // Solution: Deploy PanicGuard with Hub=0, set later.
        PanicGuard panicGuard = new PanicGuard(deployer, address(ledger), address(0));
        
        EmergencyBreaker breaker = new EmergencyBreaker(deployer, address(ledger));
        
        SecurityHub securityHub = new SecurityHub(
            deployer,
            address(guardianLock),
            address(panicGuard),
            address(breaker),
            address(ledger)
        );
        console.log("SecurityHub deployed at:", address(securityHub));

        // 3. Deploy Seer (Trust Layer)
        // Needs Hub (0 for now) and Token (0 for now)
        Seer seer = new Seer(deployer, address(ledger), address(0));
        console.log("Seer deployed at:", address(seer));

        // 3b. Deploy StablecoinRegistry (needed for Presale)
        StablecoinRegistry registry = new StablecoinRegistry();
        console.log("StablecoinRegistry deployed at:", address(registry));
        
        // Set treasury (will be set to proper treasury after deployment)
        registry.setTreasury(deployer);

        // 4. Deploy DevReserveVestingVault
        // Needs Token (0), Hub (0), Security, Ledger, Presale (0)
        // We will deploy a proxy or use CREATE2 if we wanted perfect circularity, 
        // but here we can just deploy it with 0s and it's immutable... wait.
        // DevReserveVestingVault has IMMUTABLE fields. This is tricky.
        // It needs the Token address in constructor. Token needs DevVault address in constructor (to mint).
        // CIRCULAR DEPENDENCY: Token <-> DevVault.
        // Solution: Pre-compute Token address.
        
        uint256 deployerNonce = vm.getNonce(deployer);
        // DevVault is next (nonce), Token is next+1.
        address predictedDevVault = computeCreateAddress(deployer, deployerNonce);
        address predictedToken = computeCreateAddress(deployer, deployerNonce + 1);
        
        // Actually, we can't easily pre-compute in a script without being careful about other deploys.
        // Let's use a simpler approach if possible, or just use the pre-compute method.
        // We will deploy DevVault first, passing the PREDICTED Token address.
        
        // Let's calculate predicted token address.
        // We are about to deploy DevVault.
        // The Token will be deployed immediately after.
        // So if DevVault is at nonce N, Token is at N+1.
        
        // Wait, we need Hub and Presale too for DevVault.
        // Hub needs Token. Presale needs Token.
        // This is a mess of immutable circular dependencies.
        
        // Let's look at DevVault again.
        // address public immutable VFIDE;
        // address public immutable VAULT_HUB;
        // address public immutable PRESALE;
        
        // If they are immutable, we MUST pass them in constructor.
        // We have to pre-compute addresses for: Token, Hub, Presale.
        
        // Order of deployment (to satisfy Token's extcodesize checks):
        // 1. Presale (needs Token - use pre-computed; no extcodesize check)
        // 2. DevVault (needs Token, Hub, Presale - use pre-computed; no extcodesize check)
        // 3. Token (needs DevVault, Presale - both now exist!)
        // 4. Hub (needs Token - now exists)
        
        // Let's pre-compute all 4.
        // New nonce order: Presale, DevVault, Token, Hub
        address prePresale  = computeCreateAddress(deployer, deployerNonce);
        address preDevVault = computeCreateAddress(deployer, deployerNonce + 1);
        address preToken    = computeCreateAddress(deployer, deployerNonce + 2);
        address preHub      = computeCreateAddress(deployer, deployerNonce + 3);
        
        console.log("Pre-computed Presale:", prePresale);
        console.log("Pre-computed DevVault:", preDevVault);
        console.log("Pre-computed Token:", preToken);
        console.log("Pre-computed Hub:", preHub);

        // Deploy VFIDEPresale FIRST (no extcodesize check on token)
        VFIDEPresale presale = new VFIDEPresale(
            deployer,             // _dao (temporary, transfer to DAO later)
            preToken,             // _token (pre-computed)
            deployer,             // _treasury
            address(registry),    // _stablecoinRegistry
            block.timestamp + 1 days // _startTime (1 day from now)
        );
        require(address(presale) == prePresale, "Presale address mismatch");
        console.log("VFIDEPresale deployed at:", address(presale));

        // Deploy DevReserveVestingVault (no extcodesize checks)
        DevReserveVestingVault devVault = new DevReserveVestingVault(
            preToken,
            deployer, // beneficiary
            preHub,
            address(securityHub),
            address(ledger),
            address(presale),
            50_000_000e18 // Allocation (50M DEV_RESERVE_SUPPLY)
        );
        require(address(devVault) == preDevVault, "DevVault address mismatch");
        console.log("DevReserveVestingVault deployed at:", address(devVault));

        // Deploy VFIDEToken (DevVault and Presale now exist - pass extcodesize!)
        VFIDEToken token = new VFIDEToken(
            address(devVault),    // devReserveVestingVault
            address(presale),     // _presaleContract
            deployer,             // treasury
            preHub,               // _vaultHub (pre-computed, can be zero)
            address(ledger),      // _ledger
            deployer              // _treasurySink (temporary)
        );
        require(address(token) == preToken, "Token address mismatch");
        console.log("VFIDEToken deployed at:", address(token));

        // Deploy VaultInfrastructure (Hub) - Token now exists
        VaultInfrastructure hub = new VaultInfrastructure(
            address(token),
            address(securityHub),
            address(ledger),
            deployer // DAO (temporary)
        );
        require(address(hub) == preHub, "Hub address mismatch");
        console.log("VaultInfrastructure deployed at:", address(hub));

        // 5. Deploy DAOTimelock
        DAOTimelock timelock = new DAOTimelock(deployer);
        
        // 6. Deploy DAO
        // Needs Timelock, Seer, Hub, Hooks (0)
        DAO dao = new DAO(
            deployer, // admin
            address(timelock),
            address(seer),
            address(hub),
            address(0) // hooks
        );
        console.log("DAO deployed at:", address(dao));

        // 7. Deploy Commerce (MerchantRegistry + Escrow)
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
        
        // 8. Wire everything up
        
        // Seer (setModules takes 2 params: _ledger, _hub)
        seer.setModules(address(ledger), address(hub));
        
        // PanicGuard
        panicGuard.setHub(address(hub));
        
        // Token
        token.setSecurityHub(address(securityHub));
        // token.setBurnRouter(...) // Deploy router if needed
        
        // Hub
        // hub.setDAO(address(dao)); // Keep deployer for now? Or set to DAO?
        // Let's keep deployer as owner for now to allow easy config during audit.
        
        // DAO
        // dao.setModules(...)
        
        // 9. Output all addresses for frontend integration
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
        console.log("=== POST-DEPLOYMENT STEPS ===");
        console.log("1. Add stablecoins to registry:");
        console.log("   registry.addStablecoin(USDC_ADDRESS, 6, 'USDC')");
        console.log("   registry.addStablecoin(USDT_ADDRESS, 6, 'USDT')");
        console.log("   registry.addStablecoin(DAI_ADDRESS, 18, 'DAI')");
        console.log("2. Enable presale tiers: presale.setTierEnabled(0, true)");
        console.log("3. Transfer ownership to multisig/DAO");
        
        vm.stopBroadcast();
    }
}
