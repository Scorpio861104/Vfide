const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken permutations (router/burn/sanctum/systemExempt/policyLocked)", function () {
  let owner, alice, bob, sink;
  let vest, token, VaultHub, vaultHub, SecurityHub, security, BurnRouter, router;

  beforeEach(async function () {
    [owner, alice, bob, sink] = await ethers.getSigners();

    const Vesting = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
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

  async function mintAndEnableFees() {
    const amt = ethers.parseUnits("1000", 18);
    await token.connect(owner).mintPresale(owner.address, amt);
    // ensure fees apply
    await token.connect(owner).setSystemExempt(owner.address, false);
  }

  it("hard burn with fees applied and policyUnlocked decreases totalSupply", async function () {
    await mintAndEnableFees();
    const before = await token.totalSupply();
    // router returns burnAmt>0, sanctum=0, burnSink=0 -> hard burn
    await router.set(ethers.parseUnits("10", 18), 0, ethers.ZeroAddress, ethers.ZeroAddress);

    await token.connect(owner).transfer(alice.address, ethers.parseUnits("100", 18));
    const after = await token.totalSupply();
    expect(after).to.be.lessThan(before);
  });

  it("soft burn credits burnSink when present and fees enabled", async function () {
    await mintAndEnableFees();
    await router.set(ethers.parseUnits("3", 18), 0, ethers.ZeroAddress, sink.address);

    await token.connect(owner).transfer(alice.address, ethers.parseUnits("50", 18));
    expect(await token.balanceOf(sink.address)).to.equal(ethers.parseUnits("3", 18));
  });

  it("sanctum explicit sink receives sanctumAmt and FeeApplied fires (with fees)", async function () {
    await mintAndEnableFees();
    await router.set(0, ethers.parseUnits("4", 18), bob.address, ethers.ZeroAddress);

    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("10", 18))).to.emit(token, "FeeApplied");
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("4", 18));
  });

  it("sanctum fallback goes to treasury sink if sanctumSink==0", async function () {
    await mintAndEnableFees();
    await router.set(0, ethers.parseUnits("2", 18), ethers.ZeroAddress, ethers.ZeroAddress);

    await token.connect(owner).transfer(alice.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(sink.address)).to.equal(ethers.parseUnits("2", 18));
  });

  it("systemExempt true bypasses fees across router permutations", async function () {
    await mintAndEnableFees();
    // set router to return both burn and sanctum
    await router.set(ethers.parseUnits("5", 18), ethers.parseUnits("1", 18), bob.address, sink.address);
    // mark owner exempt
    await token.connect(owner).setSystemExempt(owner.address, true);

    await token.connect(owner).transfer(alice.address, ethers.parseUnits("20", 18));
    // neither sink (burn sink or sanctum) should receive tokens
    expect(await token.balanceOf(bob.address)).to.equal(0);
    // burn sink was set to sink.address as well; ensure sink didn't get sanctum because exempt
    expect(await token.balanceOf(sink.address)).to.equal(0);
  });

  it("policyLocked with router present allows transfer", async function () {
    await mintAndEnableFees();
    await router.set(ethers.parseUnits("1", 18), 0, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.connect(owner).lockPolicy();
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18));
  });

  it("policyLocked requires router when locked after router removal", async function () {
    await mintAndEnableFees();
    // Remove router first, then lock policy so the locked-policy check will require router and transfers revert
    await token.connect(owner).setBurnRouter(ethers.ZeroAddress);
    await token.connect(owner).lockPolicy();
    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");
  });

  it("combination: soft burn + sanctum explicit + systemExempt false triggers both sink credits", async function () {
    await mintAndEnableFees();
    // soft burn sends burnAmt to burnSink and sanctumAmt to sanctumSink
    await router.set(ethers.parseUnits("2", 18), ethers.parseUnits("3", 18), bob.address, sink.address);

    await token.connect(owner).transfer(alice.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(sink.address)).to.equal(ethers.parseUnits("2", 18));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("3", 18));
  });
});
