// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./TestnetConfig.sol";

import "../../contracts/VFIDEToken.sol";
import "../../contracts/VaultInfrastructure.sol";
import "../../contracts/VFIDECommerce.sol";
import "../../contracts/VFIDETrust.sol";

/**
 * @title CommerceE2E
 * @notice End-to-end tests for merchant registration and escrow flows
 * @dev Tests: merchant registration, escrow lifecycle, disputes, ratings
 */
contract CommerceE2E is Script {
    VFIDEToken token;
    VaultInfrastructure hub;
    MerchantRegistry merchantRegistry;
    CommerceEscrow escrow;
    Seer seer;
    
    uint256 buyerKey;
    uint256 merchantKey;
    uint256 daoKey;
    address buyer;
    address merchant;
    address dao;
    
    function run() external {
        console.log("===========================================");
        console.log("   COMMERCE E2E TEST SUITE                 ");
        console.log("===========================================\n");
        
        _setup();
        
        test_01_RegisterMerchant();
        test_02_MerchantInfo();
        test_03_OpenEscrow();
        test_04_FundEscrow();
        test_05_ReleaseEscrow();
        test_06_RefundFlow();
        test_07_DisputeFlow();
        test_08_ExpiredEscrow();
        test_09_MerchantSuspension();
        test_10_SeizureFlow();
        
        console.log("\n===========================================");
        console.log("   COMMERCE E2E COMPLETE                   ");
        console.log("===========================================");
    }
    
    function _setup() internal {
        token = VFIDEToken(TestnetConfig.TOKEN);
        hub = VaultInfrastructure(TestnetConfig.VAULT_HUB);
        merchantRegistry = MerchantRegistry(TestnetConfig.MERCHANT_REGISTRY);
        escrow = CommerceEscrow(TestnetConfig.COMMERCE_ESCROW);
        seer = Seer(TestnetConfig.SEER);
        
        buyerKey = vm.envOr("TEST_USER_1_KEY", uint256(0x1));
        merchantKey = vm.envOr("TEST_MERCHANT_KEY", uint256(0x5));
        daoKey = vm.envOr("DAO_KEY", uint256(0x100));
        
        buyer = vm.addr(buyerKey);
        merchant = vm.addr(merchantKey);
        dao = vm.addr(daoKey);
        
        console.log("Test accounts:");
        console.log("  Buyer:", buyer);
        console.log("  Merchant:", merchant);
    }
    
    function test_01_RegisterMerchant() internal {
        console.log("\n[TEST 01] Register Merchant");
        
        vm.startBroadcast(merchantKey);
        
        // Ensure vault exists
        address merchantVault = hub.ensureVault(merchant);
        
        MerchantRegistry.Merchant memory existing = merchantRegistry.info(merchant);
        
        if (existing.status == MerchantRegistry.Status.NONE) {
            bytes32 metaHash = keccak256("Test Merchant Store");
            
            try merchantRegistry.addMerchant(metaHash) {
                console.log(unicode"  ✓ Merchant registered");
                console.log("    Vault:", merchantVault);
            } catch Error(string memory reason) {
                console.log(unicode"  ✗ Registration failed:", reason);
            }
        } else {
            console.log(unicode"  ✓ Merchant already registered");
            console.log("    Status:", uint256(existing.status));
        }
        
        vm.stopBroadcast();
    }
    
    function test_02_MerchantInfo() internal {
        console.log("\n[TEST 02] Merchant Info");
        
        MerchantRegistry.Merchant memory m = merchantRegistry.info(merchant);
        
        console.log("    Owner:", m.owner);
        console.log("    Vault:", m.vault);
        console.log("    Status:", uint256(m.status));
        console.log("    Refunds:", uint256(m.refunds));
        console.log("    Disputes:", uint256(m.disputes));
        
        if (m.status == MerchantRegistry.Status.ACTIVE) {
            console.log(unicode"  ✓ Merchant is ACTIVE");
        } else {
            console.log(unicode"  ⊘ Merchant not active");
        }
    }
    
    function test_03_OpenEscrow() internal {
        console.log("\n[TEST 03] Open Escrow");
        
        vm.startBroadcast(buyerKey);
        
        // Ensure buyer has vault
        address buyerVault = hub.ensureVault(buyer);
        
        uint256 amount = 100e18; // 100 VFIDE
        bytes32 meta = keccak256("Order #12345");
        
        try escrow.open(merchant, amount, meta) returns (uint256 escrowId) {
            console.log(unicode"  ✓ Escrow opened");
            console.log("    Escrow ID:", escrowId);
            console.log("    Amount:", amount);
        } catch Error(string memory reason) {
            console.log(unicode"  ✗ Open failed:", reason);
        }
        
        vm.stopBroadcast();
    }
    
    function test_04_FundEscrow() internal {
        console.log("\n[TEST 04] Fund Escrow");
        
        uint256 escrowId = escrow.escrowCount(); // Latest escrow
        
        if (escrowId == 0) {
            console.log(unicode"  ⊘ No escrow to fund");
            return;
        }
        
        vm.startBroadcast(buyerKey);
        
        address buyerVault = hub.vaultOf(buyer);
        uint256 vaultBalance = token.balanceOf(buyerVault);
        
        (,,,,uint256 amount,,) = escrow.escrows(escrowId);
        
        if (vaultBalance >= amount) {
            // Approve escrow contract
            UserVault(payable(buyerVault)).approveVFIDE(address(escrow), amount);
            
            try escrow.markFunded(escrowId) {
                console.log(unicode"  ✓ Escrow funded");
            } catch Error(string memory reason) {
                console.log(unicode"  ✗ Fund failed:", reason);
            }
        } else {
            console.log(unicode"  ⊘ Insufficient balance:", vaultBalance);
        }
        
        vm.stopBroadcast();
    }
    
    function test_05_ReleaseEscrow() internal {
        console.log("\n[TEST 05] Release Escrow");
        
        uint256 escrowId = escrow.escrowCount();
        
        if (escrowId == 0) {
            console.log(unicode"  ⊘ No escrow to release");
            return;
        }
        
        (,,,,,CommerceEscrow.State state,) = escrow.escrows(escrowId);
        
        if (state != CommerceEscrow.State.FUNDED) {
            console.log(unicode"  ⊘ Escrow not in FUNDED state");
            return;
        }
        
        vm.startBroadcast(buyerKey);
        
        address merchantVault = hub.vaultOf(merchant);
        uint256 balBefore = token.balanceOf(merchantVault);
        
        try escrow.release(escrowId) {
            uint256 balAfter = token.balanceOf(merchantVault);
            console.log(unicode"  ✓ Escrow released");
            console.log("    Merchant received:", balAfter - balBefore);
        } catch Error(string memory reason) {
            console.log(unicode"  ✗ Release failed:", reason);
        }
        
        vm.stopBroadcast();
    }
    
    function test_06_RefundFlow() internal {
        console.log("\n[TEST 06] Refund Flow");
        
        // Create a new escrow for refund test
        vm.startBroadcast(buyerKey);
        
        address buyerVault = hub.vaultOf(buyer);
        uint256 balance = token.balanceOf(buyerVault);
        
        if (balance < 50e18) {
            console.log(unicode"  ⊘ Insufficient balance for refund test");
            vm.stopBroadcast();
            return;
        }
        
        uint256 amount = 50e18;
        
        // Open
        try escrow.open(merchant, amount, keccak256("Refund Test")) returns (uint256 escrowId) {
            // Approve and fund
            UserVault(payable(buyerVault)).approveVFIDE(address(escrow), amount);
            escrow.markFunded(escrowId);
            
            console.log(unicode"  ✓ Test escrow created and funded:", escrowId);
            
            vm.stopBroadcast();
            
            // Merchant initiates refund
            vm.startBroadcast(merchantKey);
            
            uint256 buyerBalBefore = token.balanceOf(buyerVault);
            
            escrow.refund(escrowId);
            
            uint256 buyerBalAfter = token.balanceOf(buyerVault);
            
            console.log(unicode"  ✓ Refund processed");
            console.log("    Buyer received back:", buyerBalAfter - buyerBalBefore);
            
            vm.stopBroadcast();
        } catch Error(string memory reason) {
            console.log(unicode"  ✗ Refund test failed:", reason);
            vm.stopBroadcast();
        }
    }
    
    function test_07_DisputeFlow() internal {
        console.log("\n[TEST 07] Dispute Flow");
        
        vm.startBroadcast(buyerKey);
        
        address buyerVault = hub.vaultOf(buyer);
        uint256 balance = token.balanceOf(buyerVault);
        
        if (balance < 25e18) {
            console.log(unicode"  ⊘ Insufficient balance for dispute test");
            vm.stopBroadcast();
            return;
        }
        
        uint256 amount = 25e18;
        
        // Open and fund
        try escrow.open(merchant, amount, keccak256("Dispute Test")) returns (uint256 escrowId) {
            UserVault(payable(buyerVault)).approveVFIDE(address(escrow), amount);
            escrow.markFunded(escrowId);
            
            // Raise dispute
            escrow.dispute(escrowId, "Product not as described");
            
            console.log(unicode"  ✓ Dispute raised for escrow:", escrowId);
            
            (,,,,,CommerceEscrow.State state,) = escrow.escrows(escrowId);
            require(state == CommerceEscrow.State.DISPUTED, "State not DISPUTED");
            
            console.log("    State: DISPUTED");
            console.log("    Awaiting DAO resolution...");
            
        } catch Error(string memory reason) {
            console.log(unicode"  ✗ Dispute test failed:", reason);
        }
        
        vm.stopBroadcast();
    }
    
    function test_08_ExpiredEscrow() internal {
        console.log("\n[TEST 08] Expired Escrow Claim");
        
        // This requires time manipulation (30 days)
        console.log(unicode"  ⊘ Requires vm.warp - use fork test");
        console.log("    After 30 days, buyer can call claimExpired()");
    }
    
    function test_09_MerchantSuspension() internal {
        console.log("\n[TEST 09] Merchant Auto-Suspension");
        
        MerchantRegistry.Merchant memory m = merchantRegistry.info(merchant);
        
        console.log("    Refund count:", uint256(m.refunds));
        console.log("    Dispute count:", uint256(m.disputes));
        console.log("    Auto-suspend at: 5 refunds or 3 disputes");
        
        if (m.status == MerchantRegistry.Status.SUSPENDED) {
            console.log(unicode"  ✓ Merchant is SUSPENDED");
        } else {
            console.log(unicode"  ⊘ Merchant still ACTIVE");
        }
    }
    
    function test_10_SeizureFlow() internal {
        console.log("\n[TEST 10] Fund Seizure Flow (DAO only)");
        
        console.log("    Seizure process:");
        console.log("    1. DAO proposes seizure (7-day grace period)");
        console.log("    2. Merchant can appeal during grace period");
        console.log("    3. After grace period, DAO can execute seizure");
        console.log("    4. Funds go to SanctumVault (charity)");
        console.log(unicode"  ⊘ Requires DAO role - manual test only");
    }
}
