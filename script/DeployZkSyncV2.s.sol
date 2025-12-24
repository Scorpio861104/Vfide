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
 * @title DeployZkSyncV2
 * @notice zkSync-compatible two-phase deployment
 * @dev Uses zkSync's CREATE formula via IContractDeployer interface
 */

// zkSync system contract interface for address prediction
interface IContractDeployer {
    function getNewAddressCreate(address _sender, uint256 _senderNonce) external pure returns (address);
}

contract DeployZkSyncV2 is Script {
    // zkSync Era ContractDeployer system contract address
    address constant ZKSYNC_DEPLOYER = 0x0000000000000000000000000000000000008006;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // ==== PHASE 1: Deploy non-circular dependencies ====
        
        ProofLedger ledger = new ProofLedger(deployer);
        console.log("ProofLedger:", address(ledger));

        GuardianRegistry guardianRegistry = new GuardianRegistry(deployer);
        GuardianLock guardianLock = new GuardianLock(deployer, address(guardianRegistry), address(ledger));

        PanicGuard panicGuard = new PanicGuard(deployer, address(ledger), address(0));
        EmergencyBreaker breaker = new EmergencyBreaker(deployer, address(ledger));
        SecurityHub securityHub = new SecurityHub(
            deployer,
            address(ledger),
            address(panicGuard),
            address(breaker),
            address(guardianLock)
        );
        console.log("SecurityHub:", address(securityHub));

        Seer seer = new Seer(deployer, address(ledger), address(0));
        console.log("Seer:", address(seer));

        StablecoinRegistry registry = new StablecoinRegistry();
        console.log("StablecoinRegistry:", address(registry));
        registry.setTreasury(deployer);

        // ==== PHASE 2: Pre-compute addresses using zkSync formula ====
        // Get current nonce
        uint256 currentNonce = vm.getNonce(deployer);
        console.log("Current nonce:", currentNonce);
        
        // Use zkSync's contract deployer to predict addresses
        // Nonce order: Presale(n), DevVault(n+1), Token(n+2), Hub(n+3)
        address prePresale = IContractDeployer(ZKSYNC_DEPLOYER).getNewAddressCreate(deployer, currentNonce);
        address preDevVault = IContractDeployer(ZKSYNC_DEPLOYER).getNewAddressCreate(deployer, currentNonce + 1);
        address preToken = IContractDeployer(ZKSYNC_DEPLOYER).getNewAddressCreate(deployer, currentNonce + 2);
        address preHub = IContractDeployer(ZKSYNC_DEPLOYER).getNewAddressCreate(deployer, currentNonce + 3);
        
        console.log("zkSync Pre-computed Presale:", prePresale);
        console.log("zkSync Pre-computed DevVault:", preDevVault);
        console.log("zkSync Pre-computed Token:", preToken);
        console.log("zkSync Pre-computed Hub:", preHub);

        // ==== PHASE 3: Deploy in correct order ====
        
        // Deploy VFIDEPresale FIRST (no extcodesize check on token)
        VFIDEPresale presale = new VFIDEPresale(
            deployer,             // _dao (temporary)
            preToken,             // _token (pre-computed zkSync address)
            deployer,             // _treasury
            address(registry),    // _stablecoinRegistry
            block.timestamp + 1 days
        );
        require(address(presale) == prePresale, "Presale mismatch");
        console.log("VFIDEPresale:", address(presale));

        // Deploy DevReserveVestingVault
        DevReserveVestingVault devVault = new DevReserveVestingVault(
            preToken,             // VFIDE (pre-computed)
            deployer,             // beneficiary
            preHub,               // hub (pre-computed)
            address(securityHub),
            address(ledger),
            address(presale),
            50_000_000e18
        );
        require(address(devVault) == preDevVault, "DevVault mismatch");
        console.log("DevReserveVestingVault:", address(devVault));

        // Deploy VFIDEToken (devVault and presale now exist!)
        VFIDEToken token = new VFIDEToken(
            address(devVault),
            address(presale),
            deployer,
            preHub,               // hub (pre-computed)
            address(ledger),
            deployer
        );
        require(address(token) == preToken, "Token mismatch");
        console.log("VFIDEToken:", address(token));

        // Deploy VaultInfrastructure (token now exists!)
        VaultInfrastructure hub = new VaultInfrastructure(
            address(token),
            address(securityHub),
            address(ledger),
            deployer
        );
        require(address(hub) == preHub, "Hub mismatch");
        console.log("VaultInfrastructure:", address(hub));

        // ==== PHASE 4: Deploy DAO ====
        DAOTimelock timelock = new DAOTimelock(deployer);
        DAO dao = new DAO(
            deployer,
            address(timelock),
            address(seer),
            address(hub),
            address(0)
        );
        console.log("DAO:", address(dao));
        console.log("DAOTimelock:", address(timelock));

        // ==== PHASE 5: Deploy Commerce ====
        MerchantRegistry merchantRegistry = new MerchantRegistry(
            address(dao),
            address(token),
            address(hub),
            address(seer),
            address(securityHub),
            address(ledger)
        );
        console.log("MerchantRegistry:", address(merchantRegistry));
        
        CommerceEscrow escrow = new CommerceEscrow(
            address(dao),
            address(token),
            address(hub),
            address(merchantRegistry),
            address(securityHub),
            address(seer)
        );
        console.log("CommerceEscrow:", address(escrow));

        // ==== PHASE 6: Wire up ====
        seer.setModules(address(ledger), address(hub));
        panicGuard.setHub(address(hub));
        token.setSecurityHub(address(securityHub));

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");

        vm.stopBroadcast();
    }
}
