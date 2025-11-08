const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-29 — admin policy lock guards & presale branches", function () {
  let deployer, alice;
  let VestingVault, vaultHub, VFIDETokenF, token, vest;

  beforeEach(async () => {
    [deployer, alice] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // basic vault registration
    await token.setVaultHub(vaultHub.target);
    await vaultHub.setVault(deployer.address, deployer.address);

    // give presale rights to deployer for some tests
    await token.setPresale(deployer.address);
  });

  it("setVaultOnly(false) reverts after policy locked (VF_POLICY_LOCKED)", async () => {
    await token.lockPolicy();
    await expect(token.setVaultOnly(false)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
  });

  it("setBurnRouter(0) reverts after policy locked (VF_POLICY_LOCKED)", async () => {
    await token.lockPolicy();
    await expect(token.setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
  });

  it("setTreasurySink(0) reverts after policy locked (VF_POLICY_LOCKED)", async () => {
    await token.lockPolicy();
    await expect(token.setTreasurySink(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
  });

  it("setPresale sets presale and marks it systemExempt when non-zero, and clears only when zero", async () => {
    // presale already set to deployer in beforeEach
    expect(await token.presale()).to.equal(deployer.address);
    expect(await token.systemExempt(deployer.address)).to.equal(true);

    // set presale to zero should still emit PresaleSet but not set systemExempt
    await expect(token.setPresale(ethers.ZeroAddress)).to.emit(token, 'PresaleSet');
    expect(await token.presale()).to.equal(ethers.ZeroAddress);
  });
});
