const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-25 — security staticcall failures and policy-lock router requirement", function () {
  let deployer, alice, bob;
  let VestingVault, vaultHub, securityHub, VFIDETokenF, token, vest;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();
    await securityHub.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // register vaults
    await token.setVaultHub(vaultHub.target);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);

    // set security hub
    await token.setSecurityHub(securityHub.target);

    // set presale and mint to alice
    await token.setPresale(deployer.address);
    const amt = ethers.parseUnits("50", 18);
    await token.mintPresale(alice.address, amt);
  });

  it("reverts transfers when security hub marks vault as locked", async () => {
    // lock alice's vault
    await securityHub.setLocked(alice.address, true);

    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.reverted;
  });

  it("reverts when TEST_setForceSecurityStaticcallFail toggled", async () => {
    await token.TEST_setForceSecurityStaticcallFail(true);
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.reverted;
  });

  it("router-required path reverts when TEST_setForcePolicyLockedRequireRouter is set and no router", async () => {
    // ensure router is not set
    // enable the TEST flag
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    // calling the dedicated check should revert with "router required"
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");
  });
});
