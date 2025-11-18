const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-36 — harness expose transfer and vaultOnly enable under policyLocked", function () {
  let deployer, alice, bob;
  let VestingVault, vest, VaultHubMock, vaultHub, TestHarnessF, harness;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();
    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    TestHarnessF = await ethers.getContractFactory("TestVFIDEHarness");
    harness = await TestHarnessF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await harness.waitForDeployment();
  });

  it("_transfer reverts when from==address(0) (VF_ZERO) via harness call", async () => {
    await expect(harness['TEST_expose_transfer'](ethers.ZeroAddress, bob.address, 1)).to.be.revertedWithCustomError(harness, 'VF_ZERO');
  });

  it("lockPolicy + setVaultOnly(true) succeeds (policyLocked + enabling is allowed)", async () => {
    await harness.lockPolicy();
    await expect(harness.setVaultOnly(true)).to.not.be.reverted;
  });
});
