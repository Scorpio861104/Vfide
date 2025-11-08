require("@nomicfoundation/hardhat-toolbox");
// coverage plugin
try {
  require('solidity-coverage');
} catch (e) {}

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  paths: {
    // For running unit tests we compile the focused subset under `contracts-min` to avoid
    // compiling unrelated, more complex contracts in the workspace.
    sources: "./contracts-min",
    tests: "./test"
  }
  ,
  networks: {
    hardhat: {
      // allow deploying large test-only contracts in the local node to avoid
      // "contract code too large" failures during heavy coverage and micro-batch testing.
      allowUnlimitedContractSize: true
    }
  }
};
