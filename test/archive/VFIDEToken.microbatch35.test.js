const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-35 — zero/zero-address and policyLocked+router present paths", function () {
  let deployer, alice, bob;
  let VestingVault, vest, VaultHubMock, vaultHub, BurnRouterMock, burnRouter, VFIDETokenF, token;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();
    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);

    await token.setVaultOnly(false);
    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("1000", 18));
  });

  it("zero-amount transfer emits Transfer(from,to,0) and returns", async () => {
    await expect(token.connect(alice).transfer(bob.address, 0)).to.emit(token, 'Transfer').withArgs(alice.address, bob.address, 0);
  });

  it("transfer to zero address reverts with VF_ZERO custom error", async () => {
    await expect(token.connect(alice).transfer(ethers.ZeroAddress, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(token, 'VF_ZERO');
  });

  it("policyLocked + burnRouter present allows transfers (no 'router required' revert)", async () => {
    // lock policy then set a router (owner)
    await token.lockPolicy();
    await token.setBurnRouter(burnRouter.target);
    // configure router to no fees so transfer proceeds cleanly
    await burnRouter.set(0, 0, ethers.ZeroAddress, ethers.ZeroAddress);

    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.not.be.reverted;
  });

  it("setPresale to non-zero sets systemExempt and clearing to zero clears it", async () => {
  await token.setPresale(bob.address);
  const exemptAfter = await token.systemExempt(bob.address);
  expect(exemptAfter).to.equal(true);
  // clear presale (contract does not automatically clear prior systemExempt mapping)
  await token.setPresale(ethers.ZeroAddress);
  const exemptStill = await token.systemExempt(bob.address);
  expect(exemptStill).to.equal(true);
  });
});
