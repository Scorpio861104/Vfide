const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-34 — policy-locked setters + fee permutations + TEST view", function () {
  let deployer, owner, alice, bob, repo;
  let VestingVault, vest, VaultHubMock, vaultHub, BurnRouterMock, burnRouter, VFIDETokenF, token;

  beforeEach(async () => {
    [deployer, owner, alice, bob] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // register some vaults so presale and vault checks can succeed when needed
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);

    // give alice some presale tokens for transfer tests
    await token.setVaultOnly(false);
    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("1000", 18));
  });

  it("setBurnRouter(0) and setTreasurySink(0) revert once policyLocked (custom error)", async () => {
    // lock policy as owner
    await token.lockPolicy();

    await expect(token.setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
    await expect(token.setTreasurySink(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
    await expect(token.setVaultOnly(false)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED');
  });

  it("TEST view helper reverts with 'router required' when forced and no router present", async () => {
    // enable the TEST path which forces the router-required check
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");
  });

  it("sanctum-only (burnAmt==0, sanctumAmt>0) credits sanctum sink or treasury fallback", async () => {
    // configure burnRouter to return burnAmt=0, sanctumAmt>0, sanctumSink != zero
    // send sanctum to deployer (an address different from receiver) to observe explicit sink credit
    await burnRouter.set(0, ethers.parseUnits("5", 18), deployer.address, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    const beforeDeployer = await token.balanceOf(deployer.address);
    await token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18));
    const afterDeployer = await token.balanceOf(deployer.address);
    // deployer should receive the sanctumAmt
    expect(afterDeployer - beforeDeployer).to.equal(ethers.parseUnits("5", 18));
  });

  it("burn-only (sanctumAmt==0, burnAmt>0) handles hard burn vs soft burn", async () => {
    // hard burn path (burnSink == address(0))
    await burnRouter.set(ethers.parseUnits("3", 18), 0, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);
    const totalBefore = await token.totalSupply();
    await token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18));
    const totalAfter = await token.totalSupply();
    expect(totalAfter).to.equal(totalBefore - ethers.parseUnits("3", 18));

    // soft burn path (burnSink != zero)
    await burnRouter.set(ethers.parseUnits("2", 18), 0, ethers.ZeroAddress, deployer.address);
    await token.setBurnRouter(burnRouter.target);
    const sinkBefore = await token.balanceOf(deployer.address);
    await token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18));
    const sinkAfter = await token.balanceOf(deployer.address);
    expect(sinkAfter - sinkBefore).to.equal(ethers.parseUnits("2", 18));
  });
});
