// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title TestnetConfig
 * @notice Configuration for testnet testing - deployed contract addresses
 * @dev Update these addresses after deploying to testnet
 */
library TestnetConfig {
    // ============ CORE CONTRACTS ============
    address constant TOKEN = address(0); // VFIDEToken
    address constant VAULT_HUB = address(0); // VaultInfrastructure
    address constant SECURITY_HUB = address(0); // SecurityHub
    address constant SEER = address(0); // ProofScore/Trust
    address constant LEDGER = address(0); // ProofLedger
    
    // ============ GOVERNANCE ============
    address constant DAO = address(0);
    address constant TIMELOCK = address(0);
    address constant COUNCIL_ELECTION = address(0);
    
    // ============ VESTING/PRESALE ============
    address constant DEV_VAULT = address(0); // DevReserveVestingVault
    address constant PRESALE = address(0);
    
    // ============ COMMERCE ============
    address constant MERCHANT_REGISTRY = address(0);
    address constant COMMERCE_ESCROW = address(0);
    
    // ============ SECURITY ============
    address constant GUARDIAN_REGISTRY = address(0);
    address constant GUARDIAN_LOCK = address(0);
    address constant PANIC_GUARD = address(0);
    address constant EMERGENCY_BREAKER = address(0);
    
    // ============ ECOSYSTEM ============
    address constant ECOSYSTEM_VAULT = address(0);
    address constant SANCTUM_VAULT = address(0);
    address constant BURN_ROUTER = address(0);
    
    // ============ ECOSYSTEM VAULTS ============
    address constant MERCHANT_REWARDS = address(0);
    address constant HEADHUNTER_REWARDS = address(0);
    address constant MARKETING_VAULT = address(0);
    address constant LIQUIDITY_VAULT = address(0);
    address constant DAO_TREASURY = address(0);
    
    // ============ TEST ACCOUNTS ============
    // These should be funded with testnet ETH
    address constant DEPLOYER = address(0);
    address constant TEST_USER_1 = address(0);
    address constant TEST_USER_2 = address(0);
    address constant TEST_USER_3 = address(0);
    address constant TEST_MERCHANT = address(0);
    address constant TEST_GUARDIAN_1 = address(0);
    address constant TEST_GUARDIAN_2 = address(0);
    address constant TEST_GUARDIAN_3 = address(0);
    
    // ============ NETWORK CONFIG ============
    string constant RPC_URL = "https://sepolia.era.zksync.dev"; // zkSync Era Sepolia
    uint256 constant CHAIN_ID = 300; // zkSync Era Sepolia
}
