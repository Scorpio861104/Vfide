require("@nomicfoundation/hardhat-toolbox");
// Load environment variables
require("dotenv").config();

// zkSync plugins - loaded after toolbox
require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-node");
// Conditionally enable contract verification plugin to avoid task conflicts unless requested
if (process.env.ZKSYNC_VERIFY === '1') {
  try { require("@matterlabs/hardhat-zksync-verify"); } catch (e) { /* optional */ }
}
// Skip zksync-verify to avoid task conflict with hardhat-toolbox

// Optional gas reporter
try {
  if (process.env.GAS_REPORT) { require('hardhat-gas-reporter'); }
} catch (e) {}

// coverage plugin
try {
  require('solidity-coverage');
} catch (e) {}

// contract size checker
try {
  require('hardhat-contract-sizer');
} catch (e) {}

const VIA_IR = !process.env.COVERAGE && !process.env.NO_VIA_IR; // Allow disabling IR for coverage or explicit opt-out

module.exports = {
  solidity: {
    compilers: [{
      version: "0.8.30",
      settings: {
        optimizer: { enabled: true, runs: process.env.COVERAGE ? 1 : 20 }, // Very low runs for smaller bytecode
        viaIR: VIA_IR
      }
    }],
    overrides: {
      // Large contracts need special handling
      "contracts/BadgeManager.sol": {
        version: "0.8.30",
        settings: {
          optimizer: { enabled: true, runs: 1 },
          viaIR: true
        }
      },
      "contracts/VaultInfrastructure.sol": {
        version: "0.8.30",
        settings: {
          optimizer: { enabled: true, runs: 1 },
          viaIR: true
        }
      }
    }
  },
  mocha: {
    require: ["./test/setup-ethers-compat.js"],
    timeout: 120000
  },
  zksolc: {
    version: "1.5.7", // Latest zksolc compiler version
    compilerSource: "binary",
    settings: {
      optimizer: {
        enabled: true,
        mode: '3' // Highest optimization for zkSync
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache/hardhat",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      // allow deploying large test-only contracts in the local node to avoid
      // "contract code too large" failures during heavy coverage and micro-batch testing.
      allowUnlimitedContractSize: true,
      zksync: false // Use standard EVM for local testing
    },
    zkLocal: {
      url: "http://127.0.0.1:8011",
      ethNetwork: "http://127.0.0.1:8545",
      zksync: true
    },
    zkSyncSepoliaTestnet: {
      url: "https://sepolia.era.zksync.dev",
      ethNetwork: "sepolia",
      zksync: true,
      verifyURL: 'https://explorer.sepolia.era.zksync.dev/contract_verification'
    },
    zkSyncMainnet: {
      url: "https://mainnet.era.zksync.io",
      ethNetwork: "mainnet",
      zksync: true,
      verifyURL: 'https://zksync2-mainnet-explorer.zksync.io/contract_verification'
    }
  },
  defaultNetwork: "hardhat",
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  }
  ,gasReporter: {
    enabled: !!process.env.GAS_REPORT,
    currency: 'USD',
    coinmarketcap: process.env.CMC_API_KEY || undefined,
    gasPrice: parseFloat(process.env.ZKSYNC_GAS_PRICE_GWEI || '0.25'), // tune for zkSync (approximate) or override via env
    showTimeSpent: true,
    outputFile: process.env.GAS_REPORT_OUTPUT || undefined,
    noColors: !!process.env.GAS_REPORT_OUTPUT,
    excludeContracts: ['mocks', 'contracts-min/mocks']
  }
};
