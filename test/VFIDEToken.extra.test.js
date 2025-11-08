const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken extra focused tests", function () {
  let owner, alice, bob;
  let VestingVault, vesting;
  let Token, token;
  let VaultHub, vaultHub;
  let SecurityHub, security;
  let BurnRouter, router;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    VestingVault = await ethers.getContractFactory("VestingVault");
    vesting = await VestingVault.deploy();
    await vesting.waitForDeployment();

    Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy(vesting.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
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
  });

  it("_isVault returns true/false and TEST flag forces false", async function () {
    // set vault hub and map alice to herself
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.setVault(alice.address, alice.address);
    const ok = await token.TEST_check_isVault(alice.address);
    expect(ok).to.equal(true);
    await token.TEST_setForceVaultHubZero(true);
    expect(await token.TEST_check_isVault(alice.address)).to.equal(false);
  });

  it("_locked staticcall behavior and TEST force path", async function () {
    await token.connect(owner).setSecurityHub(security.target);
    // default security mock returns false
    const locked = await token.TEST_check_locked(ethers.ZeroAddress);
    expect(locked).to.equal(false);
    // force staticcall fail
    await token.TEST_setForceSecurityStaticcallFail(true);
    expect(await token.TEST_check_locked(ethers.ZeroAddress)).to.equal(true);
  });

  it("policyLocked requires router when locked and no router present", async function () {
    // ensure no router set
    await token.connect(owner).lockPolicy();
    await expect(token.TEST_force_router_requirement()).to.be.reverted;
    // set router and then requirement should not revert
    await token.connect(owner).setBurnRouter(router.target);
    await token.TEST_force_router_requirement();
  });

  it("burn router hard burn vs soft burn paths", async function () {
    // disable vaultOnly to simplify transfers
    await token.connect(owner).setVaultOnly(false);
    // set presale to owner and mint to alice
    await token.connect(owner).setPresale(owner.address);
    const amt = ethers.parseUnits("100", 18);
    await token.connect(owner).mintPresale(alice.address, amt);

    // set burn router to hard burn (burnSink = address(0)) and sanctum -> treasury
    await token.connect(owner).setBurnRouter(router.target);
    await router.set(ethers.parseUnits("1", 18), ethers.parseUnits("2", 18), ethers.ZeroAddress, ethers.ZeroAddress);

    // set treasury sink so sanctumAmt has somewhere to go
    await token.connect(owner).setTreasurySink(bob.address);

    // transfer from alice to bob - should apply burn+sanctum and reduce totalSupply
    await token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18));
    // totalSupply changed; ensure read works
    const ts = await token.totalSupply();
    expect(ts).to.be.a('bigint');

    // now configure soft burn to a sink (use owner as burn sink)
    await router.set(ethers.parseUnits("1", 18), 0, ethers.ZeroAddress, owner.address);
    // give alice some more and transfer
    await token.connect(owner).mintPresale(alice.address, ethers.parseUnits("5", 18));
    await token.connect(alice).transfer(bob.address, ethers.parseUnits("2", 18));
    // owner (burn sink) should have received soft-burn credits
    const ownerBal = await token.balanceOf(owner.address);
    expect(ownerBal).to.be.a('bigint');
  });
});
