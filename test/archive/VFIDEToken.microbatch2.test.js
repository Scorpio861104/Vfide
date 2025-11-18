const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken micro-batch 2 (burn router fees & systemExempt)", function () {
  let owner, alice, bob;
  let Vesting, vesting;
  let VaultHub, vaultHub;
  let BurnRouter, burnRouter;
  let Token, token;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    Vesting = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vesting = await Vesting.deploy();
    await vesting.waitForDeployment();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    BurnRouter = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouter.deploy();
    await burnRouter.waitForDeployment();

    Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // configure vaults so presale mint can be used to allocate tokens for tests
    await vaultHub.setVault(owner.address, owner.address);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);
  });

  it("applies burn and sanctum amounts, using treasurySink fallback", async function () {
    // set presale so owner can mint
    await token.setPresale(owner.address);
    // mint some tokens to owner
    const amt = ethers.parseUnits("100", 18);
    await token.mintPresale(owner.address, amt);

  // set treasury sink to bob
  await token.setTreasurySink(bob.address);
  // set burn router and configure it to return burn=10, sanctum=5, sanctumSink=0, burnSink=0
  await token.setBurnRouter(burnRouter.target);
  await burnRouter.set(ethers.parseUnits("10", 18), ethers.parseUnits("5", 18), ethers.ZeroAddress, ethers.ZeroAddress);

  // ensure owner is not system-exempt (setPresale set it earlier)
  await token.setSystemExempt(owner.address, false);

  // transfer from owner -> alice and expect burn+sanctum applied
  const send = ethers.parseUnits("50", 18);
  const totalBefore = await token.totalSupply();
  await token.transfer(alice.address, send);
  const expectedReceived = send - ethers.parseUnits("10", 18) - ethers.parseUnits("5", 18);
  expect(await token.balanceOf(alice.address)).to.equal(expectedReceived);
  // totalSupply decreased by burn amount
  const totalAfter = await token.totalSupply();
  expect(totalAfter).to.equal(totalBefore - ethers.parseUnits("10", 18));
  });

  it("systemExempt bypasses fees for exempt addresses", async function () {
    // set presale and mint to owner
    await token.setPresale(owner.address);
    const amt = ethers.parseUnits("20", 18);
    await token.mintPresale(owner.address, amt);

    // set burn router to non-zero and configure non-zero fees
    await token.setTreasurySink(bob.address);
    await token.setBurnRouter(burnRouter.target);
    await burnRouter.set(ethers.parseUnits("1", 18), ethers.parseUnits("1", 18), ethers.ZeroAddress, ethers.ZeroAddress);

    // exempt owner
    await token.setSystemExempt(owner.address, true);
    // transfer should deliver full amount to alice
    await token.transfer(alice.address, ethers.parseUnits("5", 18));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("5", 18));
  });
});
