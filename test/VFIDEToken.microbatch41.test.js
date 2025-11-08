const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-41 — transferFrom with policyLocked + router present/absent", function () {
  let deployer, spender, recipient;
  let VestingVault, vest, VaultHubMock, vaultHub, BurnRouterMock, burnRouter, VFIDETokenF, token;

  beforeEach(async () => {
    [deployer, spender, recipient] = await ethers.getSigners();
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

    // make presale go to deployer so we can mint tokens to deployer
    await vaultHub.setVault(deployer.address, deployer.address);
    await token.setVaultOnly(false);
    await token.setPresale(deployer.address);
    await token.mintPresale(deployer.address, ethers.parseUnits("100", 18));
  });

  it("transferFrom succeeds when policyLocked and burnRouter present", async () => {
    // approve spender
    await token.connect(deployer).approve(spender.address, ethers.parseUnits("10", 18));
    // lock policy and set router
    await token.lockPolicy();
    await token.setBurnRouter(burnRouter.target);
    // router returns zero fees
    await burnRouter.set(0, 0, ethers.ZeroAddress, ethers.ZeroAddress);

    await expect(token.connect(spender).transferFrom(deployer.address, recipient.address, ethers.parseUnits("1", 18))).to.not.be.reverted;
  });

  it("transferFrom reverts with 'router required' when policyLocked and no router", async () => {
    // approve spender
    await token.connect(deployer).approve(spender.address, ethers.parseUnits("10", 18));
    // lock policy but do NOT set router
    await token.lockPolicy();
    // ensure burnRouter unset

    await expect(token.connect(spender).transferFrom(deployer.address, recipient.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");
  });
});
