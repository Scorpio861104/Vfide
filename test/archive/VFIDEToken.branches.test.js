const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken branch-combination tests", function () {
  let owner, a, b, sink;
  let Vesting, vest, Token, token;
  let VaultHub, vaultHub;
  let SecurityHub, security;
  let BurnRouter, router;

  beforeEach(async function () {
    [owner, a, b, sink] = await ethers.getSigners();

    Vesting = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await Vesting.deploy();
    await vest.waitForDeployment();

    Token = await ethers.getContractFactory("VFIDEToken");
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

    // set modules on token
    await token.connect(owner).setVaultHub(vaultHub.target);
    await token.connect(owner).setSecurityHub(security.target);
    await token.connect(owner).setBurnRouter(router.target);
    await token.connect(owner).setTreasurySink(sink.address);
  });

  it("cover some fee/router and vault/security helper branches", async function () {
    // set router to non-zero values but mark endpoints exempt so fees are skipped
    await router.set(ethers.parseUnits("1",18), ethers.parseUnits("2",18), sink.address, ethers.ZeroAddress);
    await token.connect(owner).setSystemExempt(owner.address, true);
    await token.connect(owner).setSystemExempt(a.address, true);

    // emit zero-transfer path
    await expect(token.connect(owner).transfer(a.address, 0)).to.emit(token, "Transfer");

    // test TEST helpers for vault/staticcall/router
    await token.TEST_setForceVaultHubZero(true);
    expect(await token.TEST_check_isVault(a.address)).to.equal(false);
    await token.TEST_setForceVaultHubZero(false);

    await token.TEST_setForceSecurityStaticcallFail(true);
    expect(await token.TEST_check_locked(a.address)).to.equal(true);
    await token.TEST_setForceSecurityStaticcallFail(false);

  // remove router to force the requirement to fail
  await token.connect(owner).setBurnRouter(ethers.ZeroAddress);
  await token.TEST_setForcePolicyLockedRequireRouter(true);
  await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");
  await token.TEST_setForcePolicyLockedRequireRouter(false);
  });
});
