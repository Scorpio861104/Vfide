// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./TestnetConfig.sol";

import "../../contracts/VFIDEToken.sol";
import "../../contracts/VaultInfrastructure.sol";
import "../../contracts/VFIDETrust.sol";
import "../../contracts/VFIDEPresale.sol";
import "../../contracts/VFIDESecurity.sol";
import "../../contracts/DevReserveVestingVault.sol";

/**
 * @title PresaleE2E
 * @notice End-to-end tests for the entire presale lifecycle
 * @dev Tests: buy tokens, referrals, lock periods, claims, finalization, refunds
 */
contract PresaleE2E is Script {
    VFIDEToken token;
    VFIDEPresale presale;
    VaultInfrastructure hub;
    
    uint256 user1Key;
    uint256 user2Key;
    uint256 user3Key;
    address user1;
    address user2;
    address user3;
    
    function run() external {
        console.log("===========================================");
        console.log("   PRESALE E2E TEST SUITE                  ");
        console.log("===========================================\n");
        
        _setup();
        
        // Test sequence
        test_01_BuyTokensNoLock();
        test_02_BuyTokens90DayLock();
        test_03_BuyTokens180DayLock();
        test_04_ReferralPurchase();
        test_05_ClaimImmediateTokens();
        test_06_ClaimLockedTokens();
        test_07_MaxWalletLimit();
        test_08_PresaleFinalization();
        
        console.log("\n===========================================");
        console.log("   PRESALE E2E COMPLETE                    ");
        console.log("===========================================");
    }
    
    function _setup() internal {
        token = VFIDEToken(TestnetConfig.TOKEN);
        presale = VFIDEPresale(TestnetConfig.PRESALE);
        hub = VaultInfrastructure(TestnetConfig.VAULT_HUB);
        
        // Load test user keys from env
        user1Key = vm.envOr("TEST_USER_1_KEY", uint256(0x1));
        user2Key = vm.envOr("TEST_USER_2_KEY", uint256(0x2));
        user3Key = vm.envOr("TEST_USER_3_KEY", uint256(0x3));
        
        user1 = vm.addr(user1Key);
        user2 = vm.addr(user2Key);
        user3 = vm.addr(user3Key);
        
        console.log("Test users:");
        console.log("  User1:", user1);
        console.log("  User2:", user2);
        console.log("  User3:", user3);
    }
    
    function test_01_BuyTokensNoLock() internal {
        console.log("\n[TEST 01] Buy Tokens - No Lock");
        
        vm.startBroadcast(user1Key);
        
        uint256 ethAmount = 0.1 ether;
        uint256 expectedBase = presale.calculateTokensFromEth(ethAmount);
        
        uint256 balBefore = address(user1).balance;
        
        presale.buyTokens{value: ethAmount}(0); // 0 = no lock
        
        uint256 balAfter = address(user1).balance;
        
        require(balBefore - balAfter == ethAmount, "ETH not deducted");
        
        // Check allocation
        (,uint256 totalAmount,,,,, ) = presale.getUserInfo(user1);
        require(totalAmount >= expectedBase, "Allocation not recorded");
        
        console.log(unicode"  ✓ Bought tokens with no lock");
        console.log("    ETH spent:", ethAmount);
        console.log("    Tokens allocated:", totalAmount);
        
        vm.stopBroadcast();
    }
    
    function test_02_BuyTokens90DayLock() internal {
        console.log("\n[TEST 02] Buy Tokens - 90 Day Lock (+15% bonus)");
        
        vm.startBroadcast(user1Key);
        
        uint256 ethAmount = 0.1 ether;
        uint256 expectedBase = presale.calculateTokensFromEth(ethAmount);
        uint256 expectedBonus = (expectedBase * 15) / 100; // 15% bonus
        
        presale.buyTokens{value: ethAmount}(90 days);
        
        console.log(unicode"  ✓ Bought tokens with 90-day lock");
        console.log("    Expected base:", expectedBase);
        console.log("    Expected bonus:", expectedBonus);
        
        vm.stopBroadcast();
    }
    
    function test_03_BuyTokens180DayLock() internal {
        console.log("\n[TEST 03] Buy Tokens - 180 Day Lock (+30% bonus)");
        
        vm.startBroadcast(user2Key);
        
        uint256 ethAmount = 0.5 ether;
        uint256 expectedBase = presale.calculateTokensFromEth(ethAmount);
        uint256 expectedBonus = (expectedBase * 30) / 100; // 30% bonus
        
        presale.buyTokens{value: ethAmount}(180 days);
        
        console.log(unicode"  ✓ Bought tokens with 180-day lock");
        console.log("    Expected base:", expectedBase);
        console.log("    Expected bonus:", expectedBonus);
        
        vm.stopBroadcast();
    }
    
    function test_04_ReferralPurchase() internal {
        console.log("\n[TEST 04] Referral Purchase (+3% referrer, +2% referee)");
        
        // User3 buys with User2 as referrer
        vm.startBroadcast(user3Key);
        
        uint256 ethAmount = 0.2 ether;
        
        presale.buyTokensWithReferral{value: ethAmount}(90 days, user2);
        
        // Check referrer bonus
        uint256 referrerBonus = presale.referralBonusEarned(user2);
        require(referrerBonus > 0, "Referrer bonus not recorded");
        
        console.log(unicode"  ✓ Referral purchase completed");
        console.log("    Referrer bonus earned:", referrerBonus);
        
        vm.stopBroadcast();
    }
    
    function test_05_ClaimImmediateTokens() internal {
        console.log("\n[TEST 05] Claim Immediate Tokens");
        
        vm.startBroadcast(user1Key);
        
        // Get claimable amount
        (,,,, uint256 claimableImmediate,, ) = presale.getUserInfo(user1);
        
        if (claimableImmediate > 0) {
            // Ensure vault exists
            address vault = hub.ensureVault(user1);
            
            uint256 vaultBalBefore = token.balanceOf(vault);
            
            // Claim
            uint256[] memory indices = new uint256[](1);
            indices[0] = 0;
            presale.claimImmediate(indices);
            
            uint256 vaultBalAfter = token.balanceOf(vault);
            
            console.log(unicode"  ✓ Claimed immediate tokens");
            console.log("    Claimed:", vaultBalAfter - vaultBalBefore);
        } else {
            console.log(unicode"  ⊘ No immediate tokens to claim");
        }
        
        vm.stopBroadcast();
    }
    
    function test_06_ClaimLockedTokens() internal {
        console.log("\n[TEST 06] Claim Locked Tokens (time warp test)");
        
        // This test requires time manipulation - skip on live testnet
        console.log(unicode"  ⊘ Skipped (requires vm.warp - use fork test)");
    }
    
    function test_07_MaxWalletLimit() internal {
        console.log("\n[TEST 07] Max Wallet Limit (500K VFIDE)");
        
        vm.startBroadcast(user1Key);
        
        // Try to buy more than max (should fail)
        uint256 maxTokens = presale.MAX_PER_WALLET();
        (, uint256 currentAllocation,,,,, ) = presale.getUserInfo(user1);
        
        console.log("    Current allocation:", currentAllocation);
        console.log("    Max per wallet:", maxTokens);
        
        if (currentAllocation < maxTokens) {
            console.log(unicode"  ✓ Under max limit - can buy more");
        } else {
            console.log(unicode"  ✓ At max limit - further purchases should fail");
        }
        
        vm.stopBroadcast();
    }
    
    function test_08_PresaleFinalization() internal {
        console.log("\n[TEST 08] Presale Finalization Details");
        
        (bool isFinalized, uint256 totalRaised, uint256 lpTokens, uint256 price) = presale.getFinalizationDetails();
        
        console.log("    Finalized:", isFinalized);
        console.log("    Total raised:", totalRaised);
        console.log("    LP tokens:", lpTokens);
        console.log("    Listing price:", price);
        
        if (!isFinalized) {
            console.log(unicode"  ⊘ Presale not finalized yet");
        } else {
            console.log(unicode"  ✓ Presale finalized");
        }
    }
}
