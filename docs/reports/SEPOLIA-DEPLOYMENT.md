# Sepolia Deployment Guide

This guide explains how to deploy the VFIDE ecosystem to the Sepolia testnet (or any EVM-compatible network).

## Prerequisites

1.  **Environment Variables**: Ensure your `.env` file is configured with the following:
    ```dotenv
    PRIVATE_KEY=your_private_key_without_0x_prefix
    SEPOLIA_RPC_URL=https://rpc.sepolia.org  # Or Alchemy/Infura URL
    ETHERSCAN_API_KEY=your_etherscan_api_key # Optional, for verification
    ```

2.  **ETH Balance**: Your deployment wallet must have sufficient Sepolia ETH.

## Deployment Steps

1.  **Run the Deployment Script**:
    ```bash
    npx hardhat run scripts/deploy-sepolia.js --network sepolia
    ```

    This script handles the complex circular dependencies between `VFIDEToken`, `DevReserveVestingVault`, and `VFIDEPresale` by predicting contract addresses before deployment.

2.  **Verify Contracts (Optional)**:
    If you provided an Etherscan API key, you can verify the contracts:
    ```bash
    npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
    ```

## Deployment Architecture

The script deploys the contracts in the following order:

1.  **ProofLedger**: The immutable event log.
2.  **VaultInfrastructure**: The VaultHub.
3.  **VFIDESecurity**: SecurityHub and its components (GuardianRegistry, GuardianLock, PanicGuard, EmergencyBreaker).
4.  **VFIDEFinance**: StablecoinRegistry.
5.  **Core Circular Cluster**:
    *   Predicts addresses for `DevReserveVestingVault`, `VFIDEPresale`, and `VFIDEToken`.
    *   Deploys `DevReserveVestingVault` (linked to predicted Token & Presale).
    *   Deploys `VFIDEPresale` (linked to predicted Token).
    *   Deploys `VFIDEToken` (linked to actual DevVault).
6.  **EcoTreasuryVault**: Deployed and linked to Token.
7.  **VFIDETrust**: Seer, SanctumVault, and ProofScoreBurnRouterPlus.
8.  **VFIDECommerce**: MerchantRegistry and CommerceEscrow.
9.  **DAO**: DAOTimelock, GovernanceHooks, and DAO.

## Troubleshooting

*   **Nonce Mismatch**: If the script fails with "Nonce mismatch!", it means the predicted address did not match the actual deployed address. This can happen if other transactions were sent from the deployer wallet during the script execution. Ensure the wallet is not used elsewhere during deployment.
*   **Gas Issues**: If deployment hangs or fails due to gas, try increasing the gas limit or price in `hardhat.config.js` or `.env`.
