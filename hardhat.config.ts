import { defineConfig, configVariable } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

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
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: process.env.NODE_ENV === "production",
        },
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: process.env.NODE_ENV === "production",
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      type: "edr-simulated" as const,
      chainId: 31337,
      forking: process.env.FORK_MAINNET === "true"
        ? {
            url: configVariable("MAINNET_RPC_URL"),
          }
        : undefined,
    },
    sepolia: {
      type: "http" as const,
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 11155111,
    },
    mainnet: {
      type: "http" as const,
      url: configVariable("MAINNET_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 1,
    },
    polygon: {
      type: "http" as const,
      url: configVariable("POLYGON_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 137,
    },
    base: {
      type: "http" as const,
      url: configVariable("BASE_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 8453,
    },
    zkSync: {
      type: "http" as const,
      url: configVariable("ZKSYNC_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 324,
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
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
