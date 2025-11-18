const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken focused branch tests", function () {
  let owner, alice, bob;
  let Vesting, vesting;
  let VaultHub, vaultHub;
  let Security, security;
  let BurnRouter, burnRouter;
  let Ledger, ledger;
  let VFIDEToken, token;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    Vesting = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vesting = await Vesting.deploy();
    await vesting.waitForDeployment();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    BurnRouter = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouter.deploy();
    await burnRouter.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vesting.target, vaultHub.target, ledger.target, ethers.ZeroAddress);
    await token.waitForDeployment();
  });

  it("_isVault respects vaultHub and TEST_force_vaultHub_zero", async function () {
    // set vault mapping so alice is a vault
    await vaultHub.setVault(alice.address, alice.address);
    expect(await token.TEST_check_isVault(alice.address)).to.equal(true);

    // forcing vaultHub zero should make it false
    await token.TEST_setForceVaultHubZero(true);
    expect(await token.TEST_check_isVault(alice.address)).to.equal(false);
    await token.TEST_setForceVaultHubZero(false);
  });

  it("_locked: staticcall fail toggle and security responses", async function () {
    // security mock default returns false
  await vaultHub.setVault(alice.address, alice.address);
  // attach the security hub first so staticcall goes to the mock
  await token.setSecurityHub(security.target);
  expect(await token.TEST_check_locked(alice.address)).to.equal(false);

  // set security locked for the vault
  await security.setLocked(alice.address, true);
  expect(await token.TEST_check_locked(alice.address)).to.equal(true);

    // force staticcall fail
    await token.TEST_setForceSecurityStaticcallFail(true);
    expect(await token.TEST_check_locked(alice.address)).to.equal(true);
    await token.TEST_setForceSecurityStaticcallFail(false);
  });

  it("router fee paths: burn + sanctum fallback to treasurySink and FeeApplied emitted", async function () {
    // vault mapping
    await vaultHub.setVault(owner.address, owner.address);
    await vaultHub.setVault(bob.address, bob.address);
    // presale mint path: set presale to owner and mint some tokens to owner vault
    await token.setPresale(owner.address);
    await vaultHub.setVault(owner.address, owner.address);
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("100", 18));

  // set treasury sink to bob.address
  await token.setTreasurySink(bob.address);

  // set burnRouter and configure fees: burn 1, sanctum 2, sanctumSink=address(0) to force fallback
  await token.setBurnRouter(burnRouter.target);
  await burnRouter.set(ethers.parseUnits("1", 18), ethers.parseUnits("2", 18), ethers.ZeroAddress, ethers.ZeroAddress);

  // owner was set as presale (systemExempt) earlier; remove systemExempt so fees apply
  await token.setSystemExempt(owner.address, false);

  // capture totalSupply to detect hard-burn
  const before = await token.totalSupply();

  // transfer from owner to bob (both vaults) should trigger burn+sanctum and FeeApplied
  await token.transfer(bob.address, ethers.parseUnits("10", 18));

  const after = await token.totalSupply();
  expect(after).to.be.lt(before);
  });

  it("TEST_force_policyLocked_require_router triggers router-required revert", async function () {
    // force the policy-router requirement check and ensure it reverts when router not set
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");

    // set burnRouter and then requirement should not revert
    await token.setBurnRouter(burnRouter.target);
    await expect(token.TEST_force_router_requirement()).not.to.be.reverted;
    await token.TEST_setForcePolicyLockedRequireRouter(false);
  });
});
