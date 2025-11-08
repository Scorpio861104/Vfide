const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-37 — systemExempt toggles, presale event, TEST router-pass path", function () {
  let deployer, alice, bob;
  let VestingVault, vest, VaultHubMock, vaultHub, BurnRouterMock, burnRouter, VFIDETokenF, token;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();
    VestingVault = await ethers.getContractFactory("VestingVault");
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
  });

  it("setSystemExempt true then false emits events and updates mapping", async () => {
    await expect(token.setSystemExempt(alice.address, true)).to.emit(token, 'SystemExemptSet').withArgs(alice.address, true);
    expect(await token.systemExempt(alice.address)).to.equal(true);
    await expect(token.setSystemExempt(alice.address, false)).to.emit(token, 'SystemExemptSet').withArgs(alice.address, false);
    expect(await token.systemExempt(alice.address)).to.equal(false);
  });

  it("setPresale emits PresaleSet and sets systemExempt when non-zero", async () => {
    await expect(token.setPresale(bob.address)).to.emit(token, 'PresaleSet').withArgs(bob.address);
    expect(await token.systemExempt(bob.address)).to.equal(true);
  });

  it("TEST flag + router present causes TEST_force_router_requirement to NOT revert", async () => {
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await token.setBurnRouter(burnRouter.target);
    await expect(token.TEST_force_router_requirement()).to.not.be.reverted;
  });
});
