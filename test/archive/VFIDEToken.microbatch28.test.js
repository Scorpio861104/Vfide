const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-28 — router/policy, systemExempt permutations, sanctum fallback, TEST helpers", function () {
  let deployer, alice, bob, carol;
  let VestingVault, vaultHub, securityHub, burnRouterF, BurnRouterMock, VFIDETokenF, token, vest, burnRouter;

  beforeEach(async () => {
    [deployer, alice, bob, carol] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();
    await securityHub.waitForDeployment();

    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // register vaults for deployer, alice, bob (carol will remain non-vault by default)
    await token.setVaultHub(vaultHub.target);
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);

  // set security hub so the TEST_force_security_staticcall_fail path is exercised
  await token.setSecurityHub(securityHub.target);
    // set presale and mint some tokens to alice
    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("100", 18));
  });

  it("lockPolicy requires router (policyLocked path) — transfer reverts when no router", async () => {
    // owner locks policy
    await token.lockPolicy();

    // alice -> bob should revert because burnRouter unset and policyLocked true
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");
  });

  it("TEST_force_policyLocked_require_router view helper reverts when forced and no router", async () => {
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");
  });

  it("systemExempt bypass: transfers succeed when both endpoints are system-exempt even if not vaults", async () => {
    // unregister carol as vault (carol not registered) and make both endpoints system-exempt
    await token.setSystemExempt(alice.address, true);
    await token.setSystemExempt(carol.address, true);

    // send alice -> carol (carol is not a vault) should succeed because both exempt
    await expect(token.connect(alice).transfer(carol.address, ethers.parseUnits("1", 18))).to.emit(token, 'Transfer');
  });

  it("sanctum fallback to treasurySink when sanctumSink==address(0)", async () => {
    // set treasurySink to carol
    await token.setTreasurySink(carol.address);

    // configure burnRouter to return only sanctumAmt and zero sanctumSink
    await burnRouter.set(0n, ethers.parseUnits("2", 18), ethers.ZeroAddress, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    // alice transfers 10 -> bob, sanctumAmt(2) should go to treasury(carol)
    const before = await token.balanceOf(carol.address);

    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18))).to.emit(token, 'FeeApplied');

    const after = await token.balanceOf(carol.address);
    expect(after - before).to.equal(ethers.parseUnits("2", 18));
  });

  it("sanctum sink missing + treasurySink unset reverts with 'sanctum sink=0'", async () => {
    // ensure treasurySink is zero
    await token.setTreasurySink(ethers.ZeroAddress);

    // configure burnRouter to return sanctumAmount but sanctumSink==0
    await burnRouter.set(0n, ethers.parseUnits("1", 18), ethers.ZeroAddress, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith("sanctum sink=0");
  });

  it("TEST_setForceVaultHubZero makes _isVault return false even when vaultHub maps", async () => {
    // sanity: deployer is registered as a vault
    expect(await token.TEST_check_isVault(deployer.address)).to.equal(true);

    await token.TEST_setForceVaultHubZero(true);
    expect(await token.TEST_check_isVault(deployer.address)).to.equal(false);
  });

  it("TEST_setForceSecurityStaticcallFail causes transfer to revert (VF_LOCKED path)", async () => {
    await token.TEST_setForceSecurityStaticcallFail(true);
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.reverted;
  });

  it("admin setters revert when policy locked (setVaultOnly, setBurnRouter, setTreasurySink)", async () => {
    await token.lockPolicy();
    await expect(token.setVaultOnly(false)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
    await expect(token.setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
    await expect(token.setTreasurySink(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
  });

  it("setPresale marks presale as exempt when non-zero and clears when zero", async () => {
    // presale was set to deployer in other tests; setPresale to alice and check
    await token.setPresale(alice.address);
    expect(await token.presale()).to.equal(alice.address);
    expect(await token.systemExempt(alice.address)).to.equal(true);

    // clear presale
    await token.setPresale(ethers.ZeroAddress);
    expect(await token.presale()).to.equal(ethers.ZeroAddress);
  });
});
