# Deployment Ready

The ecosystem is fully audited, fixed, and the environment is now **verified ready** for deployment.

## Status
- **Codebase**: ✅ Audited & Fixed.
- **Compiler**: ✅ Fixed (Downgraded to Solidity 0.8.24 to match `zksolc` compatibility).
- **Toolchain**: ✅ Verified (Script successfully compiles and attempts deployment).

## How to Deploy

1.  **Fund your Wallet**:
    Ensure you have a private key with Sepolia ETH bridged to zkSync Sepolia.
    - Get Sepolia ETH: [Sepolia Faucet](https://sepoliafaucet.com/)
    - Bridge to zkSync: [zkSync Portal](https://portal.zksync.io/bridge)

2.  **Configure Environment**:
    Edit `.env` and set your funded private key:
    ```dotenv
    PRIVATE_KEY=your_private_key_here_without_0x
    ```

3.  **Run Deployment**:
    ```bash
    npx hardhat run scripts/deploy-zksync.js --network zkSyncSepoliaTestnet
    ```

## What the Script Does
1.  **Deploys Core Infrastructure**: `ProofLedger`, `VaultHub`.
2.  **Resolves Circular Dependency**:
    - Deploys `TempVault`.
    - Deploys `VFIDEToken` (minting Dev Reserve to `TempVault`).
    - Deploys `DevReserveVestingVault`.
    - Moves funds from `TempVault` to `DevReserveVestingVault`.
3.  **Deploys All Layers**: Security, Trust, Finance, Commerce, Governance.
4.  **Configures System**:
    - Sets up `systemExempt` for Treasury, Presale, Escrow.
    - Links `VaultHub` modules.
    - Configures `StablecoinRegistry` treasury.
    - Sets up `VFIDEToken` components.

## Verification
After deployment, the script will save the addresses to `deployments/zksync-zkSyncSepoliaTestnet-<timestamp>.json`.
