const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-38 — explicit coverage for setVaultOnly, setPresale and TEST router permutations", function () {
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

    // ensure vaults for presale tests
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
  });

  it("setVaultOnly: before lock can disable; after lock enabling is allowed and disabling reverts", async () => {
    // initially vaultOnly true (constructor default)
    // owner can disable before lock
    await expect(token.setVaultOnly(false)).to.not.be.reverted;
    // re-enable
    await expect(token.setVaultOnly(true)).to.not.be.reverted;

    // lock policy
    await token.lockPolicy();
    // enabling when locked is allowed
    await expect(token.setVaultOnly(true)).to.not.be.reverted;
    // disabling when locked should revert with VF_POLICY_LOCKED
    await expect(token.setVaultOnly(false)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
  });

  it("setPresale non-zero emits PresaleSet and sets systemExempt; setting zero emits PresaleSet (clears presale addr)", async () => {
    await expect(token.setPresale(bob.address)).to.emit(token, 'PresaleSet').withArgs(bob.address);
    expect(await token.presale()).to.equal(bob.address);
    expect(await token.systemExempt(bob.address)).to.equal(true);

    // clear presale to zero
    await expect(token.setPresale(ethers.ZeroAddress)).to.emit(token, 'PresaleSet').withArgs(ethers.ZeroAddress);
    expect(await token.presale()).to.equal(ethers.ZeroAddress);
  });

  it("TEST router-check permutations: (1) policyLocked true + no router -> revert; (2) TEST flag true + router present -> pass; (3) neither flagged -> pass", async () => {
    // (1) policyLocked true + no router
    await token.lockPolicy();
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");

    // (2) TEST flag true but router present -> should NOT revert
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await token.setBurnRouter(burnRouter.target);
    await expect(token.TEST_force_router_requirement()).to.not.be.reverted;

    // (3) clear TEST flag and ensure when policy not locked + flag false + no router -> no revert
    // reset contract state by deploying a fresh token instance
    const VF = await ethers.getContractFactory("VFIDEToken");
    const fresh = await VF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await fresh.waitForDeployment();
    await expect(fresh.TEST_force_router_requirement()).to.not.be.reverted;
  });
});
