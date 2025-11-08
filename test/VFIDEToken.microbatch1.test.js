const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken micro-batch 1 (vault, lock, policy, presale)", function () {
  let owner, alice, presale;
  let Vesting, vesting;
  let VaultHub, vaultHub;
  let Security, security;
  let Token, token;

  beforeEach(async function () {
    [owner, alice, presale] = await ethers.getSigners();

    Vesting = await ethers.getContractFactory("VestingVault");
    vesting = await Vesting.deploy();
    await vesting.waitForDeployment();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();
  });

  it("_isVault returns true when vault hub maps owner->self and false when TEST_force_vaultHub_zero set", async function () {
    await vaultHub.setVault(alice.address, alice.address);
    expect(await token.TEST_check_isVault(alice.address)).to.equal(true);
    await token.TEST_setForceVaultHubZero(true);
    expect(await token.TEST_check_isVault(alice.address)).to.equal(false);
  });

  it("_locked returns true when securityHub reports locked and when TEST forces staticcall fail", async function () {
    await token.setSecurityHub(security.target);
    // set a vault and lock it
    await vaultHub.setVault(alice.address, alice.address);
    await security.setLocked(alice.address, true);
    expect(await token.TEST_check_locked(alice.address)).to.equal(true);
    // force staticcall failure
    await token.TEST_setForceSecurityStaticcallFail(true);
    expect(await token.TEST_check_locked(alice.address)).to.equal(true);
  });

  it("policy lock requires router: lockPolicy -> TEST_force_router_requirement reverts when no router", async function () {
    await token.lockPolicy();
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");
  });

  it("setBurnRouter reverts when policyLocked and router==0 (VF_POLICY_LOCKED)", async function () {
    await token.lockPolicy();
    await expect(token.setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, "VF_POLICY_LOCKED");
  });

  it("mintPresale enforces vault-only target when vaultOnly is true", async function () {
    // set presale to owner so owner can mint
    await token.setPresale(owner.address);
    // ensure vaultOnly is true (default) and no vault mapping for bob (alice)
    await expect(token.mintPresale(alice.address, 1)).to.be.revertedWith("presale target !vault");
    // set a vault and mint should succeed
    await vaultHub.setVault(alice.address, alice.address);
    await token.mintPresale(alice.address, 1);
  });
});
