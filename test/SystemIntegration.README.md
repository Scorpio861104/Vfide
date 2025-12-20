# System Integration Tests

## Overview

The `SystemIntegration.test.js` file contains comprehensive integration tests for the complete VFIDE system. These tests verify that all major components work together correctly.

## Components Tested

### 1. Core Token System (VFIDEToken)
- Presale minting with cap enforcement
- Token transfers between accounts
- System exempt addresses functionality
- Vault-only transfer rules (configurable)
- Integration with burn router and fee system

### 2. Commerce System (VFIDECommerce)
- Merchant registration via MerchantRegistry
- Escrow creation and management via CommerceEscrow
- Complete escrow lifecycle (open → fund → release)
- Dispute resolution and refunds
- Multi-merchant operations

### 3. Finance System (VFIDEFinance)
- Stablecoin registry and whitelisting
- Treasury vault (EcoTreasuryVault) operations
- Stablecoin deposits and withdrawals
- DAO-controlled fund disbursement
- VFIDE token tracking in treasury

### 4. Infrastructure
- VaultHub (vault address mapping)
- Seer (ProofScore system)
- SecurityHub (security lock checks)
- ProofLedger (event logging)
- BurnRouter (fee calculation)

## Test Structure

The test suite is organized into several categories:

### System Initialization
- Verifies correct deployment and wiring of all contracts
- Checks initial token supply and dev reserve allocation
- Validates infrastructure connections

### Token System Integration
- Tests presale minting within and beyond cap
- Verifies transfer functionality
- Checks system exempt address handling

### Commerce System Integration
- Tests merchant registration
- Verifies escrow order creation and completion
- Tests dispute resolution workflows

### Finance System Integration
- Tests stablecoin deposits to treasury
- Verifies DAO withdrawal permissions
- Checks VFIDE receipt tracking

### Cross-System Integration
- Tests interactions between commerce and treasury
- Verifies multi-user scenarios
- Checks state consistency across systems

### Security and Edge Cases
- Tests security lock integration
- Verifies zero-amount handling
- Checks invalid operation rejection
- Tests large amount handling

### System Upgrade and Configuration
- Tests owner permission to update infrastructure
- Verifies DAO configuration changes
- Tests merchant management

### End-to-End User Journey
- Complete flow: presale → purchase → treasury contribution
- Simulates realistic user interactions across all systems

## Running the Tests

```bash
# Run only the system integration tests
npx hardhat test test/SystemIntegration.test.js

# Run all tests including system integration
npx hardhat test
```

## Test Coverage

The system integration test provides:
- 27 comprehensive test cases
- Coverage of all major contract interactions
- Validation of cross-system data consistency
- Real-world usage scenario simulation

## Key Insights

### Contract APIs Used

**VFIDEToken:**
- `mintPresale(address, uint256)` - Mint tokens during presale
- `transfer(address, uint256)` - Transfer tokens
- `setSystemExempt(address, bool)` - Configure system exempt addresses

**MerchantRegistry:**
- `addMerchant(bytes32 metaHash)` - Register as merchant (requires vault and score)
- `merchants(address)` - Query merchant info

**CommerceEscrow:**
- `open(address merchantOwner, uint256 amount, bytes32 metaHash)` - Create escrow
- `markFunded(uint256 id)` - Mark escrow as funded
- `release(uint256 id)` - Release funds to merchant
- `dispute(uint256 id, string reason)` - Initiate dispute
- `refund(uint256 id)` - Process refund

**StablecoinRegistry:**
- `addAsset(address token, string symbolHint)` - Whitelist stablecoin (DAO only)
- `isWhitelisted(address)` - Check if asset is whitelisted

**EcoTreasuryVault:**
- `depositStable(address token, uint256 amount)` - Deposit stablecoin
- `send(address token, address to, uint256 amount, string reason)` - Withdraw funds (DAO only)

## Notes

- All tests use mock contracts for infrastructure (VaultHub, Seer, SecurityHub, etc.)
- Tests are designed to run without network access
- The test suite validates both happy paths and error cases
- Each test is independent and uses fresh contract deployments
