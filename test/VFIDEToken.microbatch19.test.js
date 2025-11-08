const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch19 - fee & sink permutations", function () {
  let Token, token;
  let BurnRouterMock, burnRouter;
  let VaultHubMock, vaultHub;
  let SecurityHubMock, securityHub;
  let VestingVault, vestingVault;
  let owner, alice, bob, treasury, sanctumSink, burnSink;

  beforeEach(async () => {
    [owner, alice, bob, treasury, sanctumSink, burnSink] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    Token = await ethers.getContractFactory("VFIDEToken");
    // constructor: devReserveVestingVault, _vaultHub, _ledger, _treasurySink
    token = await Token.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();
    await securityHub.waitForDeployment();

    // wire basic sinks and router (explicit owner calls)
    await token.connect(owner).setBurnRouter(burnRouter.target);
    await token.connect(owner).setVaultHub(vaultHub.target);
    await token.connect(owner).setSecurityHub(securityHub.target);
    await token.connect(owner).setTreasurySink(treasury.address);

    // mint some tokens to alice via presale path (toggle vaultOnly off for tests)
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    const big = ethers.parseUnits("1000000", 18);
    await token.connect(owner).mintPresale(alice.address, big);
    // also mint a small amount to owner so we can use owner as an active sender in tests
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("10000", 18));
  });

  async function computeAndSet(burnAmt, sanctumAmt, sanctumSinkAddr, burnSinkAddr) {
    // burnRouter.set(burnAmt, sanctumAmt, sanctumSink, burnSink)
    await burnRouter.set(burnAmt, sanctumAmt, sanctumSinkAddr, burnSinkAddr);
  }

  it("applies both burn and sanctum amounts when both sinks present (transfer)", async () => {
    // both burn and sanctum non-zero, sinks non-zero => both branches
    const burnAmt = ethers.parseUnits('100', 18);
    const sanctumAmt = ethers.parseUnits('50', 18);
    await computeAndSet(burnAmt, sanctumAmt, sanctumSink.address, burnSink.address);

  // ensure sinks are not vaults (no vault registered for alice)
  await vaultHub.setVault(alice.address, ethers.ZeroAddress);

  await token.connect(owner).setSystemExempt(owner.address, false);

  const t = ethers.parseUnits("1000", 18);
  // perform transfer from owner (owner is not systemExempt for this test so fees apply)
  await token.connect(owner).transfer(bob.address, t);

    // when sanctum sink is an EOA (sanctumSink), its balance should increase by sanctumAmt
    const balSanctum = await token.balanceOf(sanctumSink.address);
    expect(balSanctum).to.be.gte(sanctumAmt);
  });

  it("falls back to treasury when sanctumSink is zero (transferFrom)", async () => {
    // both burn and sanctum non-zero but sanctumSink = 0 => treasury should receive sanctumAmt
    const burnAmt = ethers.parseUnits('10', 18);
    const sanctumAmt = ethers.parseUnits('5', 18);
    await computeAndSet(burnAmt, sanctumAmt, ethers.ZeroAddress, burnSink.address);

  // ensure owner not systemExempt so fees route to treasury
  await token.connect(owner).setSystemExempt(owner.address, false);
  const amt = ethers.parseUnits("5000", 18);
  await token.connect(owner).transfer(bob.address, amt);

  const balTreasury = await token.balanceOf(treasury.address);
    expect(balTreasury).to.be.gte(sanctumAmt);
  });

  it("handles burnSink = zero (soft burn to sanctum) and vaultOnly toggles", async () => {
    // burnAmt > 0 but burnSink = 0 should result in totalSupply reduction (hard burn)
    const burnAmt = ethers.parseUnits('200', 18);
    const sanctumAmt = ethers.parseUnits('20', 18);
  await computeAndSet(burnAmt, sanctumAmt, sanctumSink.address, ethers.ZeroAddress);

    // record total supply before
    const tsBefore = await token.totalSupply();

  // enable vaultOnly and register owner as a vault to exercise vault-only path
  await token.connect(owner).setVaultOnly(true);
  await vaultHub.setVault(owner.address, owner.address);
  await vaultHub.setVault(bob.address, bob.address);
  // ensure neither endpoint is system-exempt so fees apply
  await token.connect(owner).setSystemExempt(owner.address, false);
  await token.connect(owner).setSystemExempt(bob.address, false);
  // transfer from owner to bob (both are recognized vaults)
  const amt = ethers.parseUnits("1000", 18);
  await token.connect(owner).transfer(bob.address, amt);

    const tsAfter = await token.totalSupply();
    expect(tsAfter).to.be.lt(tsBefore);
  });

  it("respects TEST toggles forcing vaultHub zero and security staticcall failure", async () => {
    // force vaultHub zero to hit fallback code paths
  await token.connect(owner).TEST_setForceVaultHubZero(true);
  // force security staticcall to fail
  await token.connect(owner).TEST_setForceSecurityStaticcallFail(true);

    const burnAmt = 1;
    const sanctumAmt = 1;
    await computeAndSet(burnAmt, sanctumAmt, sanctumSink.address, burnSink.address);

  // perform a transfer that will go through the code paths with TEST toggles active
  await token.connect(alice).transfer(bob.address, ethers.parseUnits("100", 18));

    // toggles shouldn't revert the transfer (we assert it completes)
    expect(await token.balanceOf(bob.address)).to.be.gt(0);
  });
});
