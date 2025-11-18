const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-40 — admin-only reverts (non-owner calls)", function () {
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
  });

  it("non-owner cannot call setVaultOnly", async () => {
    await expect(token.connect(alice).setVaultOnly(false)).to.be.revertedWith("OWN: not owner");
  });

  it("non-owner cannot call setPresale", async () => {
    await expect(token.connect(alice).setPresale(alice.address)).to.be.revertedWith("OWN: not owner");
  });

  it("non-owner cannot call setBurnRouter", async () => {
    await expect(token.connect(alice).setBurnRouter(burnRouter.target)).to.be.revertedWith("OWN: not owner");
  });

  it("non-owner cannot call setTreasurySink", async () => {
    await expect(token.connect(alice).setTreasurySink(bob.address)).to.be.revertedWith("OWN: not owner");
  });
});
