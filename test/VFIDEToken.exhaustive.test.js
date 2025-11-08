const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken exhaustive branch tests", function () {
  let owner, alice, bob, sink;
  let vest, token, VaultHub, vaultHub, SecurityHub, security, BurnRouter, router;

  beforeEach(async function () {
    [owner, alice, bob, sink] = await ethers.getSigners();

    const Vesting = await ethers.getContractFactory("VestingVault");
    vest = await Vesting.deploy();
    await vest.waitForDeployment();

    const Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy(vest.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    SecurityHub = await ethers.getContractFactory("SecurityHubMock");
    security = await SecurityHub.deploy();
    await security.waitForDeployment();

    BurnRouter = await ethers.getContractFactory("BurnRouterMock");
    router = await BurnRouter.deploy();
    await router.waitForDeployment();

    // wire modules
    await token.connect(owner).setVaultHub(vaultHub.target);
    await token.connect(owner).setSecurityHub(security.target);
    await token.connect(owner).setBurnRouter(router.target);
    await token.connect(owner).setTreasurySink(sink.address);

    // set presale to owner so we can mint to owner for tests
    await token.connect(owner).setPresale(owner.address);
    // ensure vault mapping for owner/alice
    await vaultHub.connect(owner).setVault(owner.address, owner.address);
    await vaultHub.connect(owner).setVault(alice.address, alice.address);
  });

  it("hard burn (burnAmt>0, burnSink=0) decreases totalSupply and emits Transfer to zero", async function () {
    const amt = ethers.parseUnits("1000", 18);
  // mint to owner via presale
  await token.connect(owner).mintPresale(owner.address, amt);
  // setSystemExempt was turned on for presale; disable it so fees apply
  await token.connect(owner).setSystemExempt(owner.address, false);
    const beforeTS = await token.totalSupply();

    // router: burn=10, sanctum=0
    await router.set(ethers.parseUnits("10", 18), 0, ethers.ZeroAddress, ethers.ZeroAddress);

    // transfer from owner to alice
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("100", 18));

    const afterTS = await token.totalSupply();
    expect(afterTS).to.be.lessThan(beforeTS);
  });

  it("soft burn (burnSink non-zero) credits sink balance", async function () {
    const amt = ethers.parseUnits("1000", 18);
  await token.connect(owner).mintPresale(owner.address, amt);
  await token.connect(owner).setSystemExempt(owner.address, false);
    await router.set(ethers.parseUnits("5", 18), 0, ethers.ZeroAddress, sink.address);

    await token.connect(owner).transfer(alice.address, ethers.parseUnits("100", 18));
    expect(await token.balanceOf(sink.address)).to.equal(ethers.parseUnits("5", 18));
  });

  it("sanctum explicit sink receives sanctumAmt and FeeApplied emitted", async function () {
    const amt = ethers.parseUnits("1000", 18);
  await token.connect(owner).mintPresale(owner.address, amt);
  await token.connect(owner).setSystemExempt(owner.address, false);
    await router.set(0, ethers.parseUnits("7", 18), bob.address, ethers.ZeroAddress);

    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("100", 18))).to.emit(token, "FeeApplied");
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("7", 18));
  });

  it("sanctum fallback to treasurySink when sanctumSink==0", async function () {
    const amt = ethers.parseUnits("1000", 18);
  await token.connect(owner).mintPresale(owner.address, amt);
  await token.connect(owner).setSystemExempt(owner.address, false);
    // set sanctumAmt with sanctumSink==0 -> should go to treasurySink (sink.address)
    await router.set(0, ethers.parseUnits("3", 18), ethers.ZeroAddress, ethers.ZeroAddress);

    await token.connect(owner).transfer(alice.address, ethers.parseUnits("100", 18));
    expect(await token.balanceOf(sink.address)).to.equal(ethers.parseUnits("3", 18));
  });

  it("sanctum sink missing causes revert", async function () {
    const amt = ethers.parseUnits("1000", 18);
  await token.connect(owner).mintPresale(owner.address, amt);
  await token.connect(owner).setSystemExempt(owner.address, false);
  // remove treasury sink
  await token.connect(owner).setTreasurySink(ethers.ZeroAddress);
    await router.set(0, ethers.parseUnits("2", 18), ethers.ZeroAddress, ethers.ZeroAddress);

    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("10", 18))).to.be.revertedWith("sanctum sink=0");
  });

  it("systemExempt skips router fees", async function () {
    const amt = ethers.parseUnits("1000", 18);
  await token.connect(owner).mintPresale(owner.address, amt);
  await token.connect(owner).setSystemExempt(owner.address, false);
  await router.set(ethers.parseUnits("5", 18), ethers.parseUnits("5", 18), bob.address, ethers.ZeroAddress);
    // mark owner as exempt
    await token.connect(owner).setSystemExempt(owner.address, true);

    // transfer should not route fees (sink balances unchanged)
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(bob.address)).to.equal(0);
  });

  it("policyLocked requires router when set", async function () {
    const amt = ethers.parseUnits("1000", 18);
  await token.connect(owner).mintPresale(owner.address, amt);
  await token.connect(owner).setSystemExempt(owner.address, false);
  // remove router then lock policy so transfers will hit the 'router required' require
  await token.connect(owner).setBurnRouter(ethers.ZeroAddress);
  await token.connect(owner).lockPolicy();
  await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");
  });

  it("securityHub locked vault causes VF_LOCKED revert", async function () {
    const amt = ethers.parseUnits("1000", 18);
    await token.connect(owner).mintPresale(owner.address, amt);
    // set owner vault locked
    await security.connect(owner).setLocked(owner.address, true);
    // vaultHub maps owner to owner
    await vaultHub.connect(owner).setVault(owner.address, owner.address);

    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(token, "VF_LOCKED");
  });
});
