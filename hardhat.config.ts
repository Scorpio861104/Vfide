import { defineConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const privateKey = process.env.PRIVATE_KEY;
const accounts = privateKey ? [privateKey] : [];

const config = defineConfig({
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          // viaIR increases compilation time but helps avoid stack-too-deep errors
          viaIR: true,
        },
      },
    ],
    overrides: {
      "contracts/VFIDETrust.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
          },
          metadata: {
            bytecodeHash: "none",
          },
          viaIR: true,
        },
      },
      "contracts/DeployPhases3to6.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          metadata: {
            bytecodeHash: "none",
          },
          viaIR: true,
        },
      },
      "contracts/BadgeManager.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          viaIR: true,
        },
      },
      "contracts/VaultInfrastructure.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          viaIR: true,
        },
      },
      "contracts/DeployPhase1.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated" as const,
      chainId: 31337,
      forking: process.env.FORK_MAINNET === "true"
        ? {
            url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
          }
        : undefined,
    },
    sepolia: {
      type: "http" as const,
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts,
      chainId: 11155111,
    },
    mainnet: {
      type: "http" as const,
      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
      accounts,
      chainId: 1,
    },
    polygon: {
      type: "http" as const,
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts,
      chainId: 137,
    },
    base: {
      type: "http" as const,
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts,
      chainId: 8453,
    },
    zkSync: {
      type: "http" as const,
      url: process.env.ZKSYNC_RPC_URL || "https://mainnet.era.zksync.io",
      accounts,
      chainId: 324,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./__tests__/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
});

export default config;
