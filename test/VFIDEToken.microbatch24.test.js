const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-24 — presale + vaultOnly combos", function () {
  let deployer, alice, nonVault;
  let VestingVault, vaultHub, VFIDETokenF, token;
  let vest;

  beforeEach(async () => {
    [deployer, alice, nonVault] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // set vault hub
    await token.setVaultHub(vaultHub.target);

    // register deployer and alice as their own vaults
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);

    // set presale to deployer
    await token.setPresale(deployer.address);
  });

  it("reverts when vaultOnly is true and presale target is not a vault", async () => {
    // vaultOnly default is true; nonVault has no vault mapping
    const amt = ethers.parseUnits("1", 18);
    await expect(token.mintPresale(nonVault.address, amt)).to.be.revertedWith("presale target !vault");
  });

  it("succeeds when vaultOnly is true and presale target is a registered vault", async () => {
    const amt = ethers.parseUnits("5", 18);
    // mint to alice (registered as vault)
    await token.mintPresale(alice.address, amt);
    const bal = await token.balanceOf(alice.address);
    expect(bal).to.equal(amt);
  });
});
