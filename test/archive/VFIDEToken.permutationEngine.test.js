const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken permutation engine to flip branches", function () {
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

    await token.connect(owner).setPresale(owner.address);
    // ensure vault mapping for owner/alice
    await vaultHub.connect(owner).setVault(owner.address, owner.address);
    await vaultHub.connect(owner).setVault(alice.address, alice.address);

    // give owner supply
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("1000", 18));
    // ensure fees normally apply
    await token.connect(owner).setSystemExempt(owner.address, false);
  });

  it("exercise to/from locked vault branches and mixed systemExempt combos", async function () {
    // 1) fromVault locked -> revert
    await security.connect(owner).setLocked(owner.address, true);
    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(token, "VF_LOCKED");
    // unlock
    await security.connect(owner).setLocked(owner.address, false);

    // 2) toVault locked -> revert
    await security.connect(owner).setLocked(alice.address, true);
    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(token, "VF_LOCKED");
    await security.connect(owner).setLocked(alice.address, false);

    // 3) systemExempt from=true, to=false -> should skip from vault check but enforce to vault
    await token.connect(owner).setSystemExempt(owner.address, true);
    await token.connect(owner).setSystemExempt(alice.address, false);
    // both have vaults, so transfer should succeed
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18));

    // 4) systemExempt from=false, to=true -> skip to vault check
    await token.connect(owner).setSystemExempt(owner.address, false);
    await token.connect(owner).setSystemExempt(alice.address, true);
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18));
  });

  it("router present vs absent with TEST flag permutations", async function () {
    // router present & TEST flag off -> transfers proceed
    await router.set(ethers.parseUnits("1", 18), 0, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18));

    // unset router and policy flags off -> should not require router
    await token.connect(owner).setBurnRouter(ethers.ZeroAddress);
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18));

    // enable TEST flag that requires router and assert revert when router unset
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");

    // restore router and ensure transfer succeeds
    await token.connect(owner).setBurnRouter(router.target);
    await token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18));
  });

  it("burn/sanctum permutations: zero/non-zero sinks and amounts", async function () {
  // use larger transfer amounts than configured fees to avoid arithmetic underflow
  const xfer = ethers.parseUnits("100", 18);
  // case: both zero -> no fee
  await router.set(0, 0, ethers.ZeroAddress, ethers.ZeroAddress);
  await token.connect(owner).transfer(alice.address, xfer);

  // case: hard burn only
  await router.set(ethers.parseUnits("2", 18), 0, ethers.ZeroAddress, ethers.ZeroAddress);
  await token.connect(owner).transfer(alice.address, xfer);

  // case: soft burn + sanctum explicit
  await router.set(ethers.parseUnits("3", 18), ethers.parseUnits("4", 18), bob.address, sink.address);
  await token.connect(owner).transfer(alice.address, xfer);

  // case: sanctum fallback to treasury sink (sanctumSink==0)
  await router.set(0, ethers.parseUnits("5", 18), ethers.ZeroAddress, ethers.ZeroAddress);
  // ensure treasury sink set
  await token.connect(owner).setTreasurySink(sink.address);
  await token.connect(owner).transfer(alice.address, xfer);
  });
});
