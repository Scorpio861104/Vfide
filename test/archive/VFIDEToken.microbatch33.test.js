const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-33 — both-fees non-zero and router-required explicit", function () {
  let deployer, alice, bob, carol;
  let VestingVault, vaultHub, BurnRouterMock, burnRouter, VFIDETokenF, token, vest;

  beforeEach(async () => {
    [deployer, alice, bob, carol] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    await token.setVaultHub(vaultHub.target);
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);

    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("100", 18));
  });

  it("both burnAmt and sanctumAmt non-zero with non-zero sinks credits both sinks and emits FeeApplied", async () => {
    await burnRouter.set(ethers.parseUnits("1", 18), ethers.parseUnits("2", 18), carol.address, carol.address);
    await token.setBurnRouter(burnRouter.target);

    const beforeCarol = await token.balanceOf(carol.address);
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18))).to.emit(token, 'FeeApplied');
    const afterCarol = await token.balanceOf(carol.address);
    // carol should receive both sanctumAmt (2) and burn sink soft-burn (1)
    expect(afterCarol - beforeCarol).to.equal(ethers.parseUnits("3", 18));
  });

  it("policyLocked + no router: transfer reverts with 'router required' (explicit) ", async () => {
    // ensure burnRouter unset
    // lock policy
    await token.lockPolicy();
    // attempt transfer should revert with router required
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");
  });
});
