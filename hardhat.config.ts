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
          // viaIR increases compilation time but helps avoid stack-too-deep errors
          viaIR: true,
        },
      },
      // M-9 FIX: Removed 0.8.19 compiler — all contracts use 0.8.30 only.
      // Having two compilers creates unverifiable compilation unit boundaries.
    ],
    overrides: {
      // L-6 GAS FIX: Seer.sol is called on every fee computation (on every token transfer).
      // Increased from runs:1 to runs:50 — a safe middle ground with viaIR that significantly
      // lowers the gas cost of repeated score reads while keeping the bytecode under 24 KB.
      // VERIFY SIZE before mainnet: `npx hardhat size-contracts` must show Seer < 24576 bytes.
      "contracts/Seer.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
          },
          metadata: {
            bytecodeHash: "none",
          },
          viaIR: true,
        },
      },
      // Deploy-once script — runs:1 is correct (no runtime calls, minimise bytecode to stay under 24KB).
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
      // Admin-only, infrequent calls — runs:1 acceptable; not a user-facing hot path.
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
      // Infrastructure/library contract; not called directly in the user transfer path.
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
      // Deploy-once script — runs:1 is correct.
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
      // SeerAutonomous is large (1222 lines) and near the 24KB bytecode limit; runs:1 retained.
      // Candidate for runs:50 once contract size is confirmed: `npx hardhat size-contracts`.
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
      // L-6 GAS FIX: VFIDEToken.sol is called on every user token transfer — the hottest contract
      // in the protocol.  Increased from runs:1 to runs:50 with viaIR to reduce per-transfer gas
      // while staying comfortably under the 24 KB bytecode limit.
      // VERIFY SIZE before mainnet: `npx hardhat size-contracts` must show VFIDEToken < 24576 bytes.
      "contracts/VFIDEToken.sol": {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
          },
          metadata: {
            bytecodeHash: "none",
          },
          viaIR: true,
        },
      },
      // EcosystemVault is the largest contract (1449 lines); runs:1 retained to stay under 24KB.
      "contracts/EcosystemVault.sol": {
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
      // Admin-only governance panel; infrequent calls — runs:1 retained for size safety.
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
      // MerchantPortal is user-facing but complex (1159 lines); runs:1 retained for size safety.
      // Candidate for runs:50 once size is confirmed: `npx hardhat size-contracts`.
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
          viaIR: true,
        },
      },
      // VaultHub embeds the full CardBoundVault creation bytecode (type(CardBoundVault).creationCode).
      // The combined bytecode is near the 24KB limit; runs:1 retained until size is verified.
      // Candidate for runs:50 once size is confirmed: `npx hardhat size-contracts`.
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
          viaIR: true,
        },
      },
      // Deploy-once script — runs:1 is correct.
      "contracts/DeployPhase1Governance.sol": {
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
