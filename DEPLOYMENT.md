# Deployment Instructions

To deploy the Vfide system for auditing or testing, follow these steps.

## Prerequisites
*   **Foundry**: Ensure `forge` is installed.
*   **RPC URL**: An endpoint for the target network (e.g., Sepolia, zkSync Sepolia, or a local Anvil node).
*   **Private Key**: A wallet with funds for gas.

## 1. Set Environment Variables
Create a `.env` file (or set in terminal):
```bash
export PRIVATE_KEY=0x...your_private_key...
export RPC_URL=https://...your_rpc_url...
export ETHERSCAN_API_KEY=... (optional, for verification)
```

## 2. Run Deployment Script
Run the following command to deploy all contracts to the network:

```bash
forge script script/Deploy.s.sol:DeployVfide --rpc-url $RPC_URL --broadcast --verify
```

*   `--broadcast`: Sends the transactions to the network.
*   `--verify`: Verifies the contracts on Etherscan (if API key provided).

## 3. Post-Deployment
The script will output the addresses of all deployed contracts.
*   **Token**: `VFIDEToken`
*   **Hub**: `VaultInfrastructure`
*   **DAO**: `DAO`
*   **Presale**: `VFIDEPresale`

You can now interact with these contracts using `cast` or a frontend to simulate the audit scenarios.

## 4. Local Testing (Anvil)
To test locally without spending real funds:
1.  Start Anvil: `anvil`
2.  Deploy: `forge script script/Deploy.s.sol:DeployVfide --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
