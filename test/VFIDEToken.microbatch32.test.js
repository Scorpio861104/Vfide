const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-32 — owner guards, vaultOnly toggles and presale unset", function () {
  let deployer, alice, bob;
  let VestingVault, vaultHub, VFIDETokenF, token, vest;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    await token.setVaultHub(vaultHub.target);
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
  });

  it("owner can disable vaultOnly when policy not locked", async () => {
    // initially vaultOnly is true; disabling should succeed before lock
    await expect(token.setVaultOnly(false)).to.not.be.reverted;
    expect(await token.vaultOnly()).to.equal(false);
  });

  it("non-owner cannot lock policy (OWN: not owner)", async () => {
    await expect(token.connect(alice).lockPolicy()).to.be.revertedWith("OWN: not owner");
  });

  it("setPresale to zero clears presale and does not set systemExempt", async () => {
    await token.setPresale(deployer.address);
    expect(await token.systemExempt(deployer.address)).to.equal(true);
    await token.setPresale(ethers.ZeroAddress);
    expect(await token.presale()).to.equal(ethers.ZeroAddress);
  });

  it("TEST_force_router_requirement: when TEST flag off and policyUnlocked does not revert, when forced it reverts without router", async () => {
    // no policy locked, should not revert when calling helper
    await expect(token.TEST_force_router_requirement()).to.not.be.reverted;

    // set the TEST toggle and expect revert since router is unset
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");
  });
});
