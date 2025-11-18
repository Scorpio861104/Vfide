// Ethers v6 compatibility shim for legacy tests expecting contract.deployed()
// Hardhat toolbox now uses ethers v6 where the method is waitForDeployment().
// This patch maps deployed() to waitForDeployment() on Contract instances.

try {
  const { Contract } = require("ethers");
  if (Contract && Contract.prototype && typeof Contract.prototype.waitForDeployment === "function") {
    if (typeof Contract.prototype.deployed !== "function") {
      Contract.prototype.deployed = Contract.prototype.waitForDeployment;
    }
  }
} catch (e) {
  // non-fatal: tests may still work without this if they use waitForDeployment
}
