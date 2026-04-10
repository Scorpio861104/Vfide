import type { HardhatUserConfig } from "hardhat/types/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import * as dotenv from "dotenv";

dotenv.config();

const privateKey = process.env.PRIVATE_KEY;
const accounts = privateKey ? [privateKey] : [];
const allowUnlimitedContractSize = process.env.HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE === "true";

type VfideHardhatConfig = HardhatUserConfig & {
  etherscan?: {
    apiKey: Record<string, string>;
    customChains?: Array<{
      network: string;
      chainId: number;
      urls: {
        apiURL: string;
        browserURL: string;
      };
    }>;
  };
  sourcify?: {
    enabled: boolean;
  };
};

const config: VfideHardhatConfig = {
  plugins: [hardhatEthers, hardhatEthersChaiMatchers, hardhatMocha, hardhatNetworkHelpers],

  /*
   * Compiler version rationale (L-04 / hostile audit):
   * 0.8.30 is used intentionally for:
   *   - Transient storage (EIP-1153) support — used by SeerPolicyGuard
   *   - MCOPY opcode (EIP-5656) available via Prague/Cancun EVM target
   *   - All 0.8.x overflow checks present
   * Risk acknowledged: newer compiler versions carry less production exposure time.
   * Mitigation: viaIR + optimizer used; Hardhat tests run on every commit.
   * Revisit to 0.8.19 LTS only if a breaking bug is discovered in 0.8.30.
   */
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          metadata: {
            bytecodeHash: "none",
          },
          debug: {
            revertStrings: "strip",
          },
          // viaIR increases compilation time but helps avoid stack-too-deep errors
          viaIR: true,
        },
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          metadata: {
            bytecodeHash: "none",
          },
          debug: {
            revertStrings: "strip",
          },
          viaIR: true,
        },
      },
    ],
    overrides: {
      // L-01: Seer.sol is the large file after the VFIDETrust.sol monolith split; keep runs:1 to avoid bytecode-size issues
      "contracts/Seer.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
            details: {
              inliner: false,
            },
          },
          metadata: {
            bytecodeHash: "none",
          },
          debug: {
            revertStrings: "strip",
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
      "contracts/SeerAutonomous.sol": {
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
      "contracts/VFIDEToken.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
            details: {
              inliner: false,
            },
          },
          metadata: {
            bytecodeHash: "none",
          },
          debug: {
            revertStrings: "strip",
          },
          viaIR: true,
        },
      },
      "contracts/EcosystemVault.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
            details: {
              inliner: false,
            },
          },
          metadata: {
            bytecodeHash: "none",
          },
          debug: {
            revertStrings: "strip",
          },
          viaIR: true,
        },
      },
      "contracts/OwnerControlPanel.sol": {
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
      "contracts/MerchantPortal.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          metadata: {
            bytecodeHash: "none",
          },
          debug: {
            revertStrings: "strip",
          },
          viaIR: true,
        },
      },
      "contracts/VaultHub.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          metadata: {
            bytecodeHash: "none",
          },
          debug: {
            revertStrings: "strip",
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
      allowUnlimitedContractSize,
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
    baseSepolia: {
      type: "http" as const,
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts,
      chainId: 84532,
    },
    polygonAmoy: {
      type: "http" as const,
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts,
      chainId: 80002,
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
  // ── Etherscan / Sourcify verification ───────────────────────
  // Set BASESCAN_API_KEY, ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY in .env
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  paths: {
    sources: ["./contracts", "./test/contracts/helpers", "./test/contracts/mocks"],
    tests: {
      mocha: "./test/contracts",
    },
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
