const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-23 — burn sink and sanctum fallback", function () {
  let deployer, alice, bob, treasury;
  let VestingVault, vaultHubF, burnRouterF, VFIDETokenF;
  let vest, vaultHub, burnRouter, token;

  beforeEach(async () => {
    [deployer, alice, bob, treasury] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    const BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // wire vault hub
    await token.setVaultHub(vaultHub.target);

    // register deployer, alice, bob as their own vaults so vaultOnly checks pass
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);

    // set treasury sink to an EOA
    await token.setTreasurySink(treasury.address);

    // set burn router
    await token.setBurnRouter(burnRouter.target);

    // Set presale to deployer so we can mint test tokens from presale
    await token.setPresale(deployer.address);

    // mint some tokens for alice via presale to be able to transfer
    const amt = ethers.parseUnits("100", 18);
    await token.mintPresale(alice.address, amt);
  });

  it("hard burn when burnSink == address(0) reduces totalSupply and leaves recipient with net", async () => {
    const transferAmt = ethers.parseUnits("10", 18);
    const burnAmt = ethers.parseUnits("1", 18);

    // configure router: burn only, burnSink == zero -> hard burn
    await burnRouter.set(burnAmt, 0n, ethers.ZeroAddress, ethers.ZeroAddress);

    const totalBefore = await token.totalSupply();
    const bobBalBefore = await token.balanceOf(bob.address);

    // alice -> bob (both registered vaults)
    await token.connect(alice).transfer(bob.address, transferAmt);

    const totalAfter = await token.totalSupply();
    const bobBalAfter = await token.balanceOf(bob.address);

    expect(totalAfter).to.equal(totalBefore - burnAmt);
    // bob should receive transferAmt - burnAmt
    expect(bobBalAfter).to.equal(bobBalBefore + (transferAmt - burnAmt));
  });

  it("soft burn (burnSink set) and sanctum fallback to treasury when sanctumSink == zero", async () => {
    const transferAmt = ethers.parseUnits("20", 18);
    const burnAmt = ethers.parseUnits("2", 18);
    const sanctumAmt = ethers.parseUnits("3", 18);

    // configure router: soft-burn to deployer, sanctumAmt present but sanctumSink == zero -> fallback to treasurySink
    await burnRouter.set(burnAmt, sanctumAmt, ethers.ZeroAddress, deployer.address);

    // Check balances before
    const deployerBalBefore = await token.balanceOf(deployer.address);
    const treasuryBalBefore = await token.balanceOf(treasury.address);
    const bobBalBefore = await token.balanceOf(bob.address);

    await token.connect(alice).transfer(bob.address, transferAmt);

    const deployerBalAfter = await token.balanceOf(deployer.address);
    const treasuryBalAfter = await token.balanceOf(treasury.address);
    const bobBalAfter = await token.balanceOf(bob.address);

    // deployer should receive soft-burn amount
    expect(deployerBalAfter).to.equal(deployerBalBefore + burnAmt);
    // treasury should receive sanctumAmt because sanctumSink == zero
    expect(treasuryBalAfter).to.equal(treasuryBalBefore + sanctumAmt);
    // bob receives transferAmt - burnAmt - sanctumAmt
    expect(bobBalAfter).to.equal(bobBalBefore + (transferAmt - burnAmt - sanctumAmt));
  });
});
