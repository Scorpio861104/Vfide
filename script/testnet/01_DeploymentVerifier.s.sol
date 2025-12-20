// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./TestnetConfig.sol";

// Import all contracts
import "../../contracts/VFIDEToken.sol";
import "../../contracts/VaultInfrastructure.sol";
import "../../contracts/VFIDETrust.sol";
import "../../contracts/DAO.sol";
import "../../contracts/DAOTimelock.sol";
import "../../contracts/VFIDESecurity.sol";
import "../../contracts/DevReserveVestingVault.sol";
import "../../contracts/VFIDEPresale.sol";
import "../../contracts/VFIDECommerce.sol";
import "../../contracts/SanctumVault.sol";
import "../../contracts/CouncilElection.sol";
import "../../contracts/EcosystemVault.sol";
import "../../contracts/EmergencyControl.sol";
import "../../contracts/SystemHandover.sol";
import "../../contracts/GovernanceHooks.sol";
import "../../contracts/VFIDEFinance.sol";
import "../../contracts/ProofScoreBurnRouter.sol";

/**
 * @title DeploymentVerifier
 * @notice Verifies all contracts are deployed correctly and wired properly
 * @dev Run after deployment to validate the entire system
 */
contract DeploymentVerifier is Script {
    uint256 public passCount;
    uint256 public failCount;
    
    function run() external {
        console.log("===========================================");
        console.log("   VFIDE TESTNET DEPLOYMENT VERIFICATION   ");
        console.log("===========================================\n");
        
        _verifyCore();
        _verifyGovernance();
        _verifySecurity();
        _verifyCommerce();
        _verifyVesting();
        _verifyEcosystem();
        _verifyWiring();
        
        console.log("\n===========================================");
        console.log("   VERIFICATION COMPLETE");
        console.log("   Passed: %d | Failed: %d", passCount, failCount);
        console.log("===========================================");
        
        require(failCount == 0, "DEPLOYMENT VERIFICATION FAILED");
    }
    
    function _verifyCore() internal {
        console.log("\n--- CORE CONTRACTS ---");
        
        // Token
        if (TestnetConfig.TOKEN != address(0)) {
            VFIDEToken token = VFIDEToken(TestnetConfig.TOKEN);
            _check("Token: name == VFIDE", keccak256(bytes(token.name())) == keccak256("VFIDE"));
            _check("Token: symbol == VFIDE", keccak256(bytes(token.symbol())) == keccak256("VFIDE"));
            _check("Token: decimals == 18", token.decimals() == 18);
            _check("Token: totalSupply == 200M", token.totalSupply() == 200_000_000e18);
            _check("Token: vaultOnly enabled", token.vaultOnly() == true);
        } else {
            _skip("Token: NOT DEPLOYED");
        }
        
        // VaultHub
        if (TestnetConfig.VAULT_HUB != address(0)) {
            VaultInfrastructure hub = VaultInfrastructure(TestnetConfig.VAULT_HUB);
            _check("VaultHub: vfideToken set", hub.vfideToken() != address(0));
            _check("VaultHub: securityHub set", address(hub.securityHub()) != address(0));
        } else {
            _skip("VaultHub: NOT DEPLOYED");
        }
        
        // Ledger
        if (TestnetConfig.LEDGER != address(0)) {
            ProofLedger ledger = ProofLedger(TestnetConfig.LEDGER);
            _check("Ledger: dao set", ledger.dao() != address(0));
        } else {
            _skip("Ledger: NOT DEPLOYED");
        }
        
        // Seer
        if (TestnetConfig.SEER != address(0)) {
            Seer seer = Seer(TestnetConfig.SEER);
            _check("Seer: dao set", seer.dao() != address(0));
        } else {
            _skip("Seer: NOT DEPLOYED");
        }
    }
    
    function _verifyGovernance() internal {
        console.log("\n--- GOVERNANCE ---");
        
        if (TestnetConfig.DAO != address(0)) {
            DAO dao = DAO(TestnetConfig.DAO);
            _check("DAO: admin set", dao.admin() != address(0));
            _check("DAO: timelock set", address(dao.timelock()) != address(0));
            _check("DAO: seer set", address(dao.seer()) != address(0));
        } else {
            _skip("DAO: NOT DEPLOYED");
        }
        
        if (TestnetConfig.TIMELOCK != address(0)) {
            DAOTimelock timelock = DAOTimelock(TestnetConfig.TIMELOCK);
            _check("Timelock: admin set", timelock.admin() != address(0));
            _check("Timelock: delay >= 48h", timelock.delay() >= 48 hours);
        } else {
            _skip("Timelock: NOT DEPLOYED");
        }
    }
    
    function _verifySecurity() internal {
        console.log("\n--- SECURITY ---");
        
        if (TestnetConfig.SECURITY_HUB != address(0)) {
            SecurityHub hub = SecurityHub(TestnetConfig.SECURITY_HUB);
            _check("SecurityHub: dao set", hub.dao() != address(0));
            _check("SecurityHub: guardianLock set", address(hub.guardianLock()) != address(0));
            _check("SecurityHub: panicGuard set", address(hub.panicGuard()) != address(0));
        } else {
            _skip("SecurityHub: NOT DEPLOYED");
        }
        
        if (TestnetConfig.GUARDIAN_REGISTRY != address(0)) {
            GuardianRegistry reg = GuardianRegistry(TestnetConfig.GUARDIAN_REGISTRY);
            _check("GuardianRegistry: dao set", reg.dao() != address(0));
        } else {
            _skip("GuardianRegistry: NOT DEPLOYED");
        }
        
        if (TestnetConfig.EMERGENCY_BREAKER != address(0)) {
            EmergencyBreaker breaker = EmergencyBreaker(TestnetConfig.EMERGENCY_BREAKER);
            _check("EmergencyBreaker: dao set", breaker.dao() != address(0));
            _check("EmergencyBreaker: halted == false", breaker.halted() == false);
        } else {
            _skip("EmergencyBreaker: NOT DEPLOYED");
        }
    }
    
    function _verifyCommerce() internal {
        console.log("\n--- COMMERCE ---");
        
        if (TestnetConfig.MERCHANT_REGISTRY != address(0)) {
            MerchantRegistry reg = MerchantRegistry(TestnetConfig.MERCHANT_REGISTRY);
            _check("MerchantRegistry: dao set", reg.dao() != address(0));
            _check("MerchantRegistry: token set", address(reg.token()) != address(0));
        } else {
            _skip("MerchantRegistry: NOT DEPLOYED");
        }
        
        if (TestnetConfig.COMMERCE_ESCROW != address(0)) {
            CommerceEscrow escrow = CommerceEscrow(TestnetConfig.COMMERCE_ESCROW);
            _check("CommerceEscrow: dao set", escrow.dao() != address(0));
            _check("CommerceEscrow: token set", address(escrow.token()) != address(0));
        } else {
            _skip("CommerceEscrow: NOT DEPLOYED");
        }
    }
    
    function _verifyVesting() internal {
        console.log("\n--- VESTING/PRESALE ---");
        
        if (TestnetConfig.DEV_VAULT != address(0)) {
            DevReserveVestingVault vault = DevReserveVestingVault(TestnetConfig.DEV_VAULT);
            _check("DevVault: VFIDE set", vault.VFIDE() != address(0));
            _check("DevVault: beneficiary set", vault.BENEFICIARY() != address(0));
            _check("DevVault: cliff == 60 days", vault.CLIFF() == 60 days);
        } else {
            _skip("DevVault: NOT DEPLOYED");
        }
        
        if (TestnetConfig.PRESALE != address(0)) {
            VFIDEPresale presale = VFIDEPresale(TestnetConfig.PRESALE);
            _check("Presale: DAO set", presale.DAO() != address(0));
            _check("Presale: token set", address(presale.vfideToken()) != address(0));
            _check("Presale: baseSupply == 35M", presale.BASE_SUPPLY() == 35_000_000e18);
        } else {
            _skip("Presale: NOT DEPLOYED");
        }
    }
    
    function _verifyEcosystem() internal {
        console.log("\n--- ECOSYSTEM ---");
        
        if (TestnetConfig.SANCTUM_VAULT != address(0)) {
            SanctumVault vault = SanctumVault(payable(TestnetConfig.SANCTUM_VAULT));
            _check("SanctumVault: dao set", vault.dao() != address(0));
        } else {
            _skip("SanctumVault: NOT DEPLOYED");
        }
    }
    
    function _verifyWiring() internal {
        console.log("\n--- CROSS-CONTRACT WIRING ---");
        
        // Check Token -> VaultHub wiring
        if (TestnetConfig.TOKEN != address(0) && TestnetConfig.VAULT_HUB != address(0)) {
            VFIDEToken token = VFIDEToken(TestnetConfig.TOKEN);
            _check("Token.vaultHub == VaultHub", address(token.vaultHub()) == TestnetConfig.VAULT_HUB);
        }
        
        // Check VaultHub -> Token wiring
        if (TestnetConfig.VAULT_HUB != address(0) && TestnetConfig.TOKEN != address(0)) {
            VaultInfrastructure hub = VaultInfrastructure(TestnetConfig.VAULT_HUB);
            _check("VaultHub.vfideToken == Token", hub.vfideToken() == TestnetConfig.TOKEN);
        }
        
        // Check Token -> SecurityHub wiring
        if (TestnetConfig.TOKEN != address(0) && TestnetConfig.SECURITY_HUB != address(0)) {
            VFIDEToken token = VFIDEToken(TestnetConfig.TOKEN);
            _check("Token.securityHub == SecurityHub", address(token.securityHub()) == TestnetConfig.SECURITY_HUB);
        }
        
        // Check Presale has tokens
        if (TestnetConfig.PRESALE != address(0) && TestnetConfig.TOKEN != address(0)) {
            VFIDEToken token = VFIDEToken(TestnetConfig.TOKEN);
            uint256 presaleBalance = token.balanceOf(TestnetConfig.PRESALE);
            _check("Presale has 50M tokens", presaleBalance == 50_000_000e18);
        }
        
        // Check DevVault has tokens
        if (TestnetConfig.DEV_VAULT != address(0) && TestnetConfig.TOKEN != address(0)) {
            VFIDEToken token = VFIDEToken(TestnetConfig.TOKEN);
            uint256 devBalance = token.balanceOf(TestnetConfig.DEV_VAULT);
            _check("DevVault has 50M tokens", devBalance == 50_000_000e18);
        }
    }
    
    function _check(string memory label, bool condition) internal {
        if (condition) {
            console.log(unicode"  ✓", label);
            passCount++;
        } else {
            console.log(unicode"  ✗ FAIL:", label);
            failCount++;
        }
    }
    
    function _skip(string memory label) internal {
        console.log(unicode"  ⊘ SKIP:", label);
    }
}
