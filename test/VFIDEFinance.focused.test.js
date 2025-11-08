const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance focused branch tests", function () {
  let owner, alice;
  let Registry, registry, Treasury, treasury;
  let ERC20Mock, tokenMock;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    Registry = await ethers.getContractFactory("StablecoinRegistry");
    registry = await Registry.deploy(owner.address, ethers.ZeroAddress);
    await registry.waitForDeployment();

    Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await Treasury.deploy(owner.address, ethers.ZeroAddress, registry.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();

    ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    tokenMock = await ERC20Mock.deploy("FocusToken", "FTK");
    await tokenMock.waitForDeployment();
  });

  it("_decimalsOrTry: staticcall failure returns fallback 18 (reverting contract)", async function () {
    const Reverter = await ethers.getContractFactory("RevertingDecimals");
    const r = await Reverter.deploy();
    await r.waitForDeployment();

    // should not revert: owner is DAO
    await registry.connect(owner).addAsset(r.target, "REV");
    expect(await registry.tokenDecimals(r.target)).to.equal(18);
  });

  it("_decimalsOrTry: EOA (no decimals) falls back to 18", async function () {
    // Use an EOA address (alice.address) as token target; staticcall returns ok=true but empty data -> fallback
    await registry.connect(owner).addAsset(alice.address, "EOA");
    expect(await registry.tokenDecimals(alice.address)).to.equal(18);
  });

  it("onlyDAO TEST toggle allows non-dao calls", async function () {
    // toggling TEST_onlyDAO_off allows alice to call addAsset
    await registry.TEST_setOnlyDAOOff(true);
    await registry.connect(alice).addAsset(tokenMock.target, "TST");
    expect(await registry.isWhitelisted(tokenMock.target)).to.equal(true);
  });

  it("depositStable respects TEST_setForceDepositInsufficient", async function () {
    // whitelist tokenMock and mint/approve
    await registry.connect(owner).addAsset(tokenMock.target, "OK");
    await tokenMock.mint(alice.address, ethers.parseUnits("10", 18));
    await tokenMock.connect(alice).approve(treasury.target, ethers.parseUnits("10", 18));

    // when TEST flag is set, depositStable should revert FI_Insufficient
    await treasury.TEST_setForceDepositInsufficient(true);
    await expect(treasury.connect(alice).depositStable(tokenMock.target, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(treasury, "FI_Insufficient");

    // disable TEST flag and deposit should succeed
    await treasury.TEST_setForceDepositInsufficient(false);
    await treasury.connect(alice).depositStable(tokenMock.target, ethers.parseUnits("1", 18));
  });

  it("send respects TEST_setForceSendInsufficient", async function () {
    // whitelist tokenMock
    await registry.connect(owner).addAsset(tokenMock.target, "OK");
    // ensure treasury has balance so transfer() won't revert; then enable TEST flag to force FI_Insufficient
    await tokenMock.mint(owner.address, ethers.parseUnits("5", 18));
    await tokenMock.connect(owner).transfer(treasury.target, ethers.parseUnits("5", 18));

    // set TEST flag to force send to fail even though transfer would succeed
    await treasury.TEST_setForceSendInsufficient(true);
    await expect(treasury.connect(owner).send(tokenMock.target, alice.address, ethers.parseUnits("1", 18), "x")).to.be.revertedWithCustomError(treasury, "FI_Insufficient");

    // turn off TEST flag and perform a successful send
    await treasury.TEST_setForceSendInsufficient(false);
    await treasury.connect(owner).send(tokenMock.target, alice.address, ethers.parseUnits("1", 18), "ok");
  });
});
