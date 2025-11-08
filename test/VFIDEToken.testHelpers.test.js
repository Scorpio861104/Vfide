const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken TEST-ONLY helper coverage", function () {
  let owner, alice, sink;
  let vest, token, VaultHub, vaultHub, SecurityHub, security, BurnRouter, router;

  beforeEach(async function () {
    [owner, alice, sink] = await ethers.getSigners();

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

    await token.connect(owner).setVaultHub(vaultHub.target);
    await token.connect(owner).setSecurityHub(security.target);
    await token.connect(owner).setBurnRouter(router.target);
    await token.connect(owner).setTreasurySink(sink.address);
  });

  it("TEST helpers: force router requirement and vault/staticcall checks", async function () {
    // TEST_force_policyLocked_require_router false -> no revert even if router unset
    await token.TEST_force_router_requirement();

    // enable the test flag requiring router when policyLocked
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    // with router present this should be fine
    await token.TEST_force_router_requirement();

    // remove router and exercise the require path (should revert)
    await token.connect(owner).setBurnRouter(ethers.ZeroAddress);
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");

    // restore router for the rest
    await token.connect(owner).setBurnRouter(router.target);

    // Test vault forced-zero path
    await token.TEST_setForceVaultHubZero(true);
    expect(await token.TEST_check_isVault(owner.address)).to.equal(false);
    await token.TEST_setForceVaultHubZero(false);

    // Test forced security staticcall fail path
    await token.TEST_setForceSecurityStaticcallFail(true);
    // _locked returns true when the staticcall is forced to fail
    expect(await token.TEST_check_locked(owner.address)).to.equal(true);
  });
});
