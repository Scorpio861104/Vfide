# Local Blockchain Development Setup

Complete guide for setting up a local blockchain environment for VFIDE development and testing.

## Table of Contents

- [Overview](#overview)
- [Option 1: Anvil (Foundry)](#option-1-anvil-foundry-recommended)
- [Option 2: Hardhat Network](#option-2-hardhat-network)
- [Option 3: Ganache](#option-3-ganache)
- [Deploying Contracts](#deploying-contracts)
- [Connecting Frontend](#connecting-frontend)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

Local blockchain development allows you to:
- Test contracts without spending real ETH
- Fast transaction confirmations (instant or near-instant)
- Reset blockchain state quickly
- Debug transactions easily
- Develop offline

## Option 1: Anvil (Foundry) [Recommended]

Anvil is Foundry's local Ethereum node. Fast, lightweight, and feature-rich.

### Installation

```bash
# Install Foundry (includes Anvil)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
anvil --version
```

### Starting Anvil

**Basic usage:**
```bash
anvil
```

**With custom configuration:**
```bash
# Start with specific chain ID and block time
anvil --chain-id 31337 --block-time 2

# With specific accounts and balance
anvil --accounts 10 --balance 10000

# Fork from mainnet (Base)
anvil --fork-url https://mainnet.base.org \
      --fork-block-number 8000000

# Fork from Base Sepolia testnet
anvil --fork-url https://sepolia.base.org \
      --chain-id 84532
```

**Useful Anvil options:**
```bash
anvil \
  --port 8545 \                    # RPC port (default: 8545)
  --accounts 20 \                  # Number of accounts (default: 10)
  --balance 100000 \               # ETH per account (default: 10000)
  --block-time 1 \                 # Block time in seconds (default: instant)
  --gas-limit 30000000 \           # Block gas limit
  --gas-price 0 \                  # Gas price (0 for free transactions)
  --mnemonic "test test..." \      # Custom mnemonic
  --derivation-path "m/44'/60'/0'/0/" \  # HD wallet derivation path
  --no-mining                      # Don't auto-mine blocks
```

**Default Anvil accounts:**
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

(... 8 more accounts)
```

### Deploying to Anvil

```bash
# Start Anvil
anvil

# In another terminal, deploy contracts
forge script script/DeployLocal.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### Anvil RPC Methods

Anvil supports special RPC methods for testing:

```typescript
// Set next block timestamp
await provider.send('evm_setNextBlockTimestamp', [1700000000]);

// Mine blocks
await provider.send('evm_mine', []);
await provider.send('anvil_mine', [10]); // Mine 10 blocks

// Set block interval
await provider.send('anvil_setBlockTimestampInterval', [12]);

// Impersonate account
await provider.send('anvil_impersonateAccount', ['0x...']);

// Set balance
await provider.send('anvil_setBalance', ['0x...', '0x56BC75E2D63100000']); // 100 ETH

// Reset to initial state
await provider.send('anvil_reset', []);

// Snapshot and revert
const snapshotId = await provider.send('evm_snapshot', []);
// ... do stuff ...
await provider.send('evm_revert', [snapshotId]);
```

### Frontend Configuration for Anvil

**Update `.env.local`:**
```env
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Address from deployment
```

**Add Anvil to wagmi config:**
```typescript
import { createConfig, http } from 'wagmi';
import { foundry } from 'wagmi/chains';

export const config = createConfig({
  chains: [foundry], // Chain ID 31337
  transports: {
    [foundry.id]: http('http://localhost:8545')
  }
});
```

---

## Option 2: Hardhat Network

Hardhat Network is a local Ethereum network designed for development.

### Installation

```bash
npm install --save-dev hardhat
```

### Configuration

**Create `hardhat.config.js`:**
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0 // Instant mining
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
        accountsBalance: "10000000000000000000000" // 10000 ETH
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};
```

### Starting Hardhat Network

```bash
# Start network (standalone mode)
npx hardhat node

# Or run in the background
npx hardhat node &
```

**With forking:**
```bash
npx hardhat node --fork https://mainnet.base.org
```

### Deploying to Hardhat

```bash
# Deploy using Hardhat
npx hardhat run scripts/deploy.js --network localhost

# Or using Hardhat Ignition
npx hardhat ignition deploy ./ignition/modules/Deploy.js --network localhost
```

### Hardhat Console

Interactive JavaScript console:

```bash
npx hardhat console --network localhost
```

```javascript
// In console
const [deployer] = await ethers.getSigners();
const balance = await deployer.getBalance();
console.log(ethers.formatEther(balance));
```

---

## Option 3: Ganache

Ganache is a personal blockchain for Ethereum development.

### Installation

**GUI version:**
Download from [trufflesuite.com/ganache](https://trufflesuite.com/ganache/)

**CLI version:**
```bash
npm install -g ganache
```

### Starting Ganache

```bash
# Start with defaults
ganache

# Custom configuration
ganache \
  --port 8545 \
  --accounts 10 \
  --defaultBalanceEther 10000 \
  --gasPrice 0 \
  --gasLimit 30000000 \
  --mnemonic "test test test..."
```

### Ganache GUI

1. Download and install Ganache
2. Create new workspace
3. Configure:
   - Port: 8545
   - Network ID: 1337
   - Accounts: 10
   - Balance: 100 ETH per account
4. Click "Start"

---

## Deploying Contracts

### Using Foundry (Forge)

**Create deployment script** `script/DeployLocal.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../contracts/VFIDEToken.sol";
import "../contracts/PersonalVault.sol";
import "../contracts/DAO.sol";

contract DeployLocal is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy token
        VFIDEToken token = new VFIDEToken();
        console.log("Token deployed to:", address(token));

        // Deploy vault
        PersonalVault vault = new PersonalVault(address(token));
        console.log("Vault deployed to:", address(vault));

        // Deploy DAO
        DAO dao = new DAO(address(token));
        console.log("DAO deployed to:", address(dao));

        vm.stopBroadcast();
    }
}
```

**Deploy:**
```bash
# Set private key (use Anvil default for local)
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy
forge script script/DeployLocal.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key $PRIVATE_KEY
```

### Using Hardhat

**Create deployment script** `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy Token
  const Token = await hre.ethers.getContractFactory("VFIDEToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());

  // Deploy Vault
  const Vault = await hre.ethers.getContractFactory("PersonalVault");
  const vault = await Vault.deploy(await token.getAddress());
  await vault.waitForDeployment();
  console.log("Vault deployed to:", await vault.getAddress());

  // Deploy DAO
  const DAO = await hre.ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(await token.getAddress());
  await dao.waitForDeployment();
  console.log("DAO deployed to:", await dao.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Deploy:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

---

## Connecting Frontend

### Update Environment Variables

**`.env.local`:**
```env
# Local blockchain
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Deployed contract addresses (from deployment output)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_DAO_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# WalletConnect (optional for local dev)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Configure Wagmi for Local Chain

**`lib/wagmi-config.ts`:**
```typescript
import { createConfig, http } from 'wagmi';
import { foundry, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Define local chain
const localChain = {
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] }
  },
  testnet: true
};

export const config = createConfig({
  chains: [localChain, foundry, mainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!
    })
  ],
  transports: {
    [localChain.id]: http('http://localhost:8545'),
    [foundry.id]: http('http://localhost:8545'),
    [mainnet.id]: http()
  }
});
```

### Add Local Network to MetaMask

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Click "Add a network manually"
5. Fill in:
   - **Network Name**: Localhost 8545
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
6. Click "Save"

### Import Anvil Accounts to MetaMask

1. Click account icon → "Import Account"
2. Select "Private Key"
3. Paste Anvil private key:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Click "Import"

You now have 10,000 ETH for testing!

---

## Testing

### Unit Tests with Foundry

```bash
# Run all tests
forge test

# Run with gas reporting
forge test --gas-report

# Run specific test
forge test --match-test testCreateProposal

# Run with verbosity
forge test -vvv
```

### Integration Tests with Hardhat

```bash
# Run tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/DAO.test.js
```

### Frontend E2E Tests with Playwright

**Configure Playwright for local chain:**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      'X-Chain-ID': '31337'
    }
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});
```

**Run E2E tests:**
```bash
# Start local blockchain
anvil

# Deploy contracts
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast

# Run frontend
npm run dev

# Run E2E tests
npm run test:e2e
```

---

## Troubleshooting

### Issue: "Connection refused" to localhost:8545

**Solution:**
```bash
# Check if blockchain is running
curl http://localhost:8545 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# If not running, start Anvil/Hardhat/Ganache
anvil
```

### Issue: MetaMask nonce too low

**Solution:**
```bash
# In MetaMask:
# Settings → Advanced → Reset Account

# Or reset Anvil
# Stop anvil (Ctrl+C) and restart
anvil
```

### Issue: Contract not found after deployment

**Solution:**
```bash
# Verify contract was deployed
cast code <CONTRACT_ADDRESS> --rpc-url http://localhost:8545

# Re-deploy if needed
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Issue: Frontend can't connect to local chain

**Solution:**
1. Verify chain ID matches: `NEXT_PUBLIC_CHAIN_ID=31337`
2. Check RPC URL: `http://localhost:8545` (not `https`)
3. Add local chain to wagmi config
4. Add network to MetaMask manually
5. Disable browser extensions that might block localhost

### Issue: Transactions fail with "insufficient funds"

**Solution:**
```bash
# Check account balance
cast balance <YOUR_ADDRESS> --rpc-url http://localhost:8545

# Fund account (Anvil)
cast send <YOUR_ADDRESS> \
  --value 100ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545
```

---

## Quick Reference

### Start Development Environment

```bash
# Terminal 1: Start local blockchain
anvil

# Terminal 2: Deploy contracts
forge script script/DeployLocal.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Terminal 3: Start frontend
cd frontend
npm run dev

# Terminal 4 (optional): Start WebSocket server
cd websocket-server
npm run dev
```

### Useful Commands

```bash
# Check chain ID
cast chain-id --rpc-url http://localhost:8545

# Check latest block
cast block-number --rpc-url http://localhost:8545

# Get account balance
cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545

# Send transaction
cast send <CONTRACT_ADDRESS> "functionName(uint256)" 123 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac09...

# Call read-only function
cast call <CONTRACT_ADDRESS> "balanceOf(address)" <ADDRESS> \
  --rpc-url http://localhost:8545
```

---

## Resources

- **Foundry Book**: https://book.getfoundry.sh/
- **Hardhat Docs**: https://hardhat.org/docs
- **Ganache**: https://trufflesuite.com/docs/ganache/
- **Anvil RPC Methods**: https://book.getfoundry.sh/reference/anvil/
- **Cast Commands**: https://book.getfoundry.sh/reference/cast/

---

For production deployment, see [PRODUCTION-DEPLOYMENT-GUIDE.md](PRODUCTION-DEPLOYMENT-GUIDE.md).
