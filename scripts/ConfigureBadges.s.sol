// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/VFIDETrust.sol";
import "../contracts/BadgeRegistry.sol";

/**
 * @title ConfigureBadges
 * @notice Deployment script to configure all VFIDE badge weights and durations
 * @dev Run after VFIDETrust.sol deployment via DAO
 */
contract ConfigureBadges is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address seerAddress = vm.envAddress("SEER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        VFIDETrust seer = VFIDETrust(seerAddress);
        
        console.log("Configuring badge system for Seer at:", seerAddress);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // ============ CONFIGURE BADGE WEIGHTS ============
        console.log("\n=== Configuring Badge Weights ===");
        
        // Pioneer & Foundation
        seer.setBadgeWeight(BadgeRegistry.PIONEER, 30);
        console.log("PIONEER: 30 points");
        
        seer.setBadgeWeight(BadgeRegistry.GENESIS_PRESALE, 40);
        console.log("GENESIS_PRESALE: 40 points");
        
        seer.setBadgeWeight(BadgeRegistry.FOUNDING_MEMBER, 50);
        console.log("FOUNDING_MEMBER: 50 points");
        
        // Activity & Participation
        seer.setBadgeWeight(BadgeRegistry.ACTIVE_TRADER, 20);
        console.log("ACTIVE_TRADER: 20 points");
        
        seer.setBadgeWeight(BadgeRegistry.GOVERNANCE_VOTER, 25);
        console.log("GOVERNANCE_VOTER: 25 points");
        
        seer.setBadgeWeight(BadgeRegistry.POWER_USER, 40);
        console.log("POWER_USER: 40 points");
        
        seer.setBadgeWeight(BadgeRegistry.DAILY_CHAMPION, 15);
        console.log("DAILY_CHAMPION: 15 points");
        
        // Trust & Community
        seer.setBadgeWeight(BadgeRegistry.TRUSTED_ENDORSER, 30);
        console.log("TRUSTED_ENDORSER: 30 points");
        
        seer.setBadgeWeight(BadgeRegistry.COMMUNITY_BUILDER, 35);
        console.log("COMMUNITY_BUILDER: 35 points");
        
        seer.setBadgeWeight(BadgeRegistry.PEACEMAKER, 25);
        console.log("PEACEMAKER: 25 points");
        
        seer.setBadgeWeight(BadgeRegistry.MENTOR, 30);
        console.log("MENTOR: 30 points");
        
        // Commerce & Merchants
        seer.setBadgeWeight(BadgeRegistry.VERIFIED_MERCHANT, 40);
        console.log("VERIFIED_MERCHANT: 40 points");
        
        seer.setBadgeWeight(BadgeRegistry.ELITE_MERCHANT, 60);
        console.log("ELITE_MERCHANT: 60 points");
        
        seer.setBadgeWeight(BadgeRegistry.INSTANT_SETTLEMENT, 20);
        console.log("INSTANT_SETTLEMENT: 20 points");
        
        seer.setBadgeWeight(BadgeRegistry.ZERO_DISPUTE, 25);
        console.log("ZERO_DISPUTE: 25 points");
        
        // Security & Integrity
        seer.setBadgeWeight(BadgeRegistry.FRAUD_HUNTER, 50);
        console.log("FRAUD_HUNTER: 50 points");
        
        seer.setBadgeWeight(BadgeRegistry.CLEAN_RECORD, 20);
        console.log("CLEAN_RECORD: 20 points");
        
        seer.setBadgeWeight(BadgeRegistry.REDEMPTION, 30);
        console.log("REDEMPTION: 30 points");
        
        seer.setBadgeWeight(BadgeRegistry.GUARDIAN, 40);
        console.log("GUARDIAN: 40 points");
        
        // Achievements & Milestones
        seer.setBadgeWeight(BadgeRegistry.ELITE_ACHIEVER, 50);
        console.log("ELITE_ACHIEVER: 50 points");
        
        seer.setBadgeWeight(BadgeRegistry.CENTURY_ENDORSER, 35);
        console.log("CENTURY_ENDORSER: 35 points");
        
        seer.setBadgeWeight(BadgeRegistry.WHALE_SLAYER, 25);
        console.log("WHALE_SLAYER: 25 points");
        
        seer.setBadgeWeight(BadgeRegistry.DIVERSIFICATION_MASTER, 30);
        console.log("DIVERSIFICATION_MASTER: 30 points");
        
        // Education & Contribution
        seer.setBadgeWeight(BadgeRegistry.EDUCATOR, 30);
        console.log("EDUCATOR: 30 points");
        
        seer.setBadgeWeight(BadgeRegistry.CONTRIBUTOR, 40);
        console.log("CONTRIBUTOR: 40 points");
        
        seer.setBadgeWeight(BadgeRegistry.BUG_BOUNTY, 50);
        console.log("BUG_BOUNTY: 50 points (variable)");
        
        seer.setBadgeWeight(BadgeRegistry.TRANSLATOR, 25);
        console.log("TRANSLATOR: 25 points");
        
        // ============ CONFIGURE BADGE DURATIONS ============
        console.log("\n=== Configuring Badge Durations ===");
        
        // Permanent badges (0 duration)
        seer.setBadgeDuration(BadgeRegistry.PIONEER, 0);
        console.log("PIONEER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.GENESIS_PRESALE, 0);
        console.log("GENESIS_PRESALE: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.FOUNDING_MEMBER, 0);
        console.log("FOUNDING_MEMBER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.TRUSTED_ENDORSER, 0);
        console.log("TRUSTED_ENDORSER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.COMMUNITY_BUILDER, 0);
        console.log("COMMUNITY_BUILDER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.PEACEMAKER, 0);
        console.log("PEACEMAKER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.FRAUD_HUNTER, 0);
        console.log("FRAUD_HUNTER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.REDEMPTION, 0);
        console.log("REDEMPTION: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.GUARDIAN, 0);
        console.log("GUARDIAN: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.ELITE_ACHIEVER, 0);
        console.log("ELITE_ACHIEVER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.CENTURY_ENDORSER, 0);
        console.log("CENTURY_ENDORSER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.WHALE_SLAYER, 0);
        console.log("WHALE_SLAYER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.DIVERSIFICATION_MASTER, 0);
        console.log("DIVERSIFICATION_MASTER: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.CONTRIBUTOR, 0);
        console.log("CONTRIBUTOR: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.BUG_BOUNTY, 0);
        console.log("BUG_BOUNTY: Permanent");
        
        seer.setBadgeDuration(BadgeRegistry.TRANSLATOR, 0);
        console.log("TRANSLATOR: Permanent");
        
        // Renewable badges (with expiration)
        seer.setBadgeDuration(BadgeRegistry.ACTIVE_TRADER, 90 days);
        console.log("ACTIVE_TRADER: 90 days");
        
        seer.setBadgeDuration(BadgeRegistry.GOVERNANCE_VOTER, 180 days);
        console.log("GOVERNANCE_VOTER: 180 days");
        
        seer.setBadgeDuration(BadgeRegistry.POWER_USER, 90 days);
        console.log("POWER_USER: 90 days");
        
        seer.setBadgeDuration(BadgeRegistry.DAILY_CHAMPION, 30 days);
        console.log("DAILY_CHAMPION: 30 days");
        
        seer.setBadgeDuration(BadgeRegistry.MENTOR, 365 days);
        console.log("MENTOR: 365 days");
        
        seer.setBadgeDuration(BadgeRegistry.VERIFIED_MERCHANT, 365 days);
        console.log("VERIFIED_MERCHANT: 365 days");
        
        seer.setBadgeDuration(BadgeRegistry.ELITE_MERCHANT, 180 days);
        console.log("ELITE_MERCHANT: 180 days");
        
        seer.setBadgeDuration(BadgeRegistry.INSTANT_SETTLEMENT, 90 days);
        console.log("INSTANT_SETTLEMENT: 90 days");
        
        seer.setBadgeDuration(BadgeRegistry.ZERO_DISPUTE, 180 days);
        console.log("ZERO_DISPUTE: 180 days");
        
        seer.setBadgeDuration(BadgeRegistry.CLEAN_RECORD, 365 days);
        console.log("CLEAN_RECORD: 365 days");
        
        seer.setBadgeDuration(BadgeRegistry.EDUCATOR, 180 days);
        console.log("EDUCATOR: 180 days");
        
        console.log("\n=== Badge Configuration Complete ===");
        console.log("Total badges configured: 27");
        console.log("Permanent badges: 16");
        console.log("Renewable badges: 11");
        
        vm.stopBroadcast();
    }
}
