// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "../contracts/VFIDEToken.sol";
import "../contracts/VaultInfrastructure.sol";
import "../contracts/DAO.sol";
import "../contracts/DAOTimelock.sol";
import "../contracts/DevReserveVestingVault.sol";
import "../contracts/VFIDEPresale.sol";
import "../contracts/VFIDECommerce.sol";
import "../contracts/VFIDETrust.sol";
import "../contracts/VFIDESecurity.sol";
import "../contracts/StablecoinRegistry.sol";

/**
 * @title DeployZkSyncPhase2
 * @notice Deploy Token/Presale/Hub with circular dependencies
 * @dev Uses inline assembly to compute zkSync CREATE addresses
 */
contract DeployZkSyncPhase2 is Script {
    // Phase 1 deployed addresses (from previous run)
    address constant LEDGER = 0x97D32e5C1DEC12C1bD2b033c2Fd5387C2BCeF58C;
    address constant SECURITY_HUB = 0x837002a3Bc45fB6aEa4D8939f3cDd24bBC2A7B2F;
    address constant SEER = 0xD22944d47bAD4Bd5fF1A366393c4bdbc9250fd8E;
    address constant STABLECOIN_REGISTRY = 0x7148Ea8c5db2D660753F51410FDC1A7F18848Cb4;
    address constant PANIC_GUARD = 0x56390B539DB4bc90e92D2c88c861934dE2ACf256;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("");
        console.log("=== PHASE 2: Token/Presale/Hub ===");
        
        vm.startBroadcast(deployerPrivateKey);

        // We need to pre-compute addresses for the circular deps.
        // Order: Presale(n), DevVault(n+1), Token(n+2), Hub(n+3)
        uint256 nonce = vm.getNonce(deployer);
        console.log("Starting nonce:", nonce);
        
        // Compute zkSync CREATE addresses using the formula
        // For zkSync: address = keccak256(0xff ++ deployer ++ nonce ++ bytecodeHash)[12:]
        // But we'll use the IContractDeployer interface
        
        address ZKSYNC_DEPLOYER = 0x0000000000000000000000000000000000008006;
        
        // Call the system contract to get predicted addresses
        (bool ok1, bytes memory data1) = ZKSYNC_DEPLOYER.staticcall(
            abi.encodeWithSignature("getNewAddressCreate(address,uint256)", deployer, nonce)
        );
        address prePresale = ok1 ? abi.decode(data1, (address)) : address(0);
        
        (bool ok2, bytes memory data2) = ZKSYNC_DEPLOYER.staticcall(
            abi.encodeWithSignature("getNewAddressCreate(address,uint256)", deployer, nonce + 1)
        );
        address preDevVault = ok2 ? abi.decode(data2, (address)) : address(0);
        
        (bool ok3, bytes memory data3) = ZKSYNC_DEPLOYER.staticcall(
            abi.encodeWithSignature("getNewAddressCreate(address,uint256)", deployer, nonce + 2)
        );
        address preToken = ok3 ? abi.decode(data3, (address)) : address(0);
        
        (bool ok4, bytes memory data4) = ZKSYNC_DEPLOYER.staticcall(
            abi.encodeWithSignature("getNewAddressCreate(address,uint256)", deployer, nonce + 3)
        );
        address preHub = ok4 ? abi.decode(data4, (address)) : address(0);
        
        console.log("Pre-computed Presale:", prePresale);
        console.log("Pre-computed DevVault:", preDevVault);
        console.log("Pre-computed Token:", preToken);
        console.log("Pre-computed Hub:", preHub);

        // Deploy VFIDEPresale FIRST
        VFIDEPresale presale = new VFIDEPresale(
            deployer,
            preToken,
            deployer,
            STABLECOIN_REGISTRY,
            block.timestamp + 1 days
        );
        console.log("VFIDEPresale:", address(presale));

        // Deploy DevReserveVestingVault
        DevReserveVestingVault devVault = new DevReserveVestingVault(
            preToken,
            deployer,
            preHub,
            SECURITY_HUB,
            LEDGER,
            address(presale),
            50_000_000e18
        );
        console.log("DevReserveVestingVault:", address(devVault));

        // Deploy VFIDEToken
        VFIDEToken token = new VFIDEToken(
            address(devVault),
            address(presale),
            deployer,
            preHub,
            LEDGER,
            deployer
        );
        console.log("VFIDEToken:", address(token));

        // Deploy VaultInfrastructure
        VaultInfrastructure hub = new VaultInfrastructure(
            address(token),
            SECURITY_HUB,
            LEDGER,
            deployer
        );
        console.log("VaultInfrastructure:", address(hub));

        // DAOTimelock
        DAOTimelock timelock = new DAOTimelock(deployer);
        console.log("DAOTimelock:", address(timelock));

        // DAO
        DAO dao = new DAO(
            deployer,
            address(timelock),
            SEER,
            address(hub),
            address(0)
        );
        console.log("DAO:", address(dao));

        // Commerce
        MerchantRegistry merchantRegistry = new MerchantRegistry(
            address(dao),
            address(token),
            address(hub),
            SEER,
            SECURITY_HUB,
            LEDGER
        );
        console.log("MerchantRegistry:", address(merchantRegistry));

        CommerceEscrow escrow = new CommerceEscrow(
            address(dao),
            address(token),
            address(hub),
            address(merchantRegistry),
            SECURITY_HUB,
            SEER
        );
        console.log("CommerceEscrow:", address(escrow));

        // Wire up
        Seer(SEER).setModules(LEDGER, address(hub));
        PanicGuard(PANIC_GUARD).setHub(address(hub));
        token.setSecurityHub(SECURITY_HUB);

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("");
        console.log("# Frontend .env values:");
        console.log("NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=", address(token));
        console.log("NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS=", address(presale));
        console.log("NEXT_PUBLIC_VAULT_HUB_ADDRESS=", address(hub));
        console.log("NEXT_PUBLIC_DAO_ADDRESS=", address(dao));
        console.log("NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS=", address(timelock));
        console.log("NEXT_PUBLIC_PROOF_LEDGER_ADDRESS=", LEDGER);
        console.log("NEXT_PUBLIC_SECURITY_HUB_ADDRESS=", SECURITY_HUB);
        console.log("NEXT_PUBLIC_SEER_ADDRESS=", SEER);
        console.log("NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS=", address(merchantRegistry));
        console.log("NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS=", address(escrow));

        vm.stopBroadcast();
    }
}
