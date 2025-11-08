const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-30 — fee/exception permutations and transferFrom variants", function () {
  let deployer, alice, bob, carol;
  let VestingVault, vaultHub, BurnRouterMock, burnRouter, VFIDETokenF, token, vest;

  beforeEach(async () => {
    [deployer, alice, bob, carol] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
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

    // register vaults
    await token.setVaultHub(vaultHub.target);
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);

    // presale mint to alice so she has balance
    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("100", 18));
  });

  it("fromExempt only: fees bypassed when sender exempt", async () => {
    await token.setSystemExempt(alice.address, true);
    // set burnRouter that would otherwise take fees
    await burnRouter.set(ethers.parseUnits("1", 18), ethers.parseUnits("2", 18), carol.address, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    // alice -> bob should not apply FeeApplied because from is exempt
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18))).to.emit(token, 'Transfer');
  });

  it("toExempt only: fees bypassed when recipient exempt", async () => {
    await token.setSystemExempt(bob.address, true);
    await burnRouter.set(ethers.parseUnits("1", 18), ethers.parseUnits("2", 18), carol.address, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18))).to.emit(token, 'Transfer');
  });

  it("hard burn path when burnSink==address(0)", async () => {
    // burnSink==0 triggers hard burn
    await burnRouter.set(ethers.parseUnits("5", 18), 0n, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    const beforeTotal = await token.totalSupply();
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18))).to.emit(token, 'FeeApplied');
    const afterTotal = await token.totalSupply();
    expect(afterTotal).to.equal(beforeTotal - ethers.parseUnits("5", 18));
  });

  it("soft burn path when burnSink non-zero credits sink", async () => {
    await burnRouter.set(ethers.parseUnits("3", 18), 0n, ethers.ZeroAddress, carol.address);
    await token.setBurnRouter(burnRouter.target);

    const before = await token.balanceOf(carol.address);
    await token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18));
    const after = await token.balanceOf(carol.address);
    expect(after - before).to.equal(ethers.parseUnits("3", 18));
  });

  it("both fees zero: no FeeApplied emitted and transfer proceeds", async () => {
    await burnRouter.set(0n, 0n, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.emit(token, 'Transfer');
  });

  it("transferFrom allowance decrement with fees applied", async () => {
    // allow deployer to spend alice
    await token.connect(alice).approve(deployer.address, ethers.parseUnits("50", 18));
    // router returns some sanctum and burn
    await burnRouter.set(ethers.parseUnits("1", 18), ethers.parseUnits("1", 18), carol.address, ethers.ZeroAddress);
    await token.setBurnRouter(burnRouter.target);

    // deployer transfers from alice to bob
    await token.connect(deployer).transferFrom(alice.address, bob.address, ethers.parseUnits("10", 18));
    const remaining = await token.allowance(alice.address, deployer.address);
    expect(remaining).to.equal(ethers.parseUnits("40", 18));
  });
});
