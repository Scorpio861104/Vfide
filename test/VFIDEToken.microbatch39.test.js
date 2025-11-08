const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-39 — final permutations for setVaultOnly, setPresale and router-required arms", function () {
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

    // register vaults so presale and vault checks can run
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
  });

  it("setVaultOnly explicit toggles and double-calls exercise both arms", async () => {
    // default vaultOnly == true
    await expect(token.setVaultOnly(true)).to.not.be.reverted; // no-op but hits branch
    await expect(token.setVaultOnly(false)).to.not.be.reverted; // disable
    await expect(token.setVaultOnly(false)).to.not.be.reverted; // double-disable no-op

    // lock and test disabling reverts
    await token.lockPolicy();
    await expect(token.setVaultOnly(true)).to.not.be.reverted; // enabling still allowed
    await expect(token.setVaultOnly(false)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
  });

  it("setPresale repeated sets and clearing cover the mapping/event arms", async () => {
    await expect(token.setPresale(bob.address)).to.emit(token, 'PresaleSet').withArgs(bob.address);
    expect(await token.presale()).to.equal(bob.address);
    expect(await token.systemExempt(bob.address)).to.equal(true);

    // set same presale value again (should still emit and keep mapping true)
    await expect(token.setPresale(bob.address)).to.emit(token, 'PresaleSet').withArgs(bob.address);
    expect(await token.systemExempt(bob.address)).to.equal(true);

    // clear presale
    await expect(token.setPresale(ethers.ZeroAddress)).to.emit(token, 'PresaleSet').withArgs(ethers.ZeroAddress);
    expect(await token.presale()).to.equal(ethers.ZeroAddress);
  });

  it("policyUnlocked + no router should allow transfer (no router-required revert)", async () => {
    // allow EOA transfers by disabling vaultOnly
    await token.setVaultOnly(false);
    // give alice some tokens via presale path
    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("10", 18));

    // burnRouter remains unset; since policyLocked is false and TEST flag false, transfer should succeed
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.not.be.reverted;
  });

  it("TEST flag true + no router causes transfer to revert with 'router required'", async () => {
    await token.setVaultOnly(false);
    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("10", 18));

    // set TEST flag so router is required even if policyUnlocked
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");
  });
});
