const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance targeted branch tests", function () {
  let owner, alice, bob;
  let Registry, registry, Treasury, treasury;
  let ERC20Mock, tokenMock, ERC20FailTransfer, tokenFail;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    Registry = await ethers.getContractFactory("StablecoinRegistry");
    registry = await Registry.deploy(owner.address, ethers.ZeroAddress);
    await registry.waitForDeployment();

    Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await Treasury.deploy(owner.address, ethers.ZeroAddress, registry.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();

  ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  tokenMock = await ERC20Mock.deploy("MockStable", "MST");
    await tokenMock.waitForDeployment();

    ERC20FailTransfer = await ethers.getContractFactory("ERC20FailTransfer");
    tokenFail = await ERC20FailTransfer.deploy();
    await tokenFail.waitForDeployment();

    // mint some tokens to alice for deposit
    await tokenMock.mint(alice.address, ethers.parseUnits("1000", 18));
    await tokenMock.connect(alice).approve(treasury.target, ethers.parseUnits("1000", 18));
    await tokenFail.mint(alice.address, ethers.parseUnits("1000", 18));
    await tokenFail.connect(alice).approve(treasury.target, ethers.parseUnits("1000", 18));
  });

  it("onlyDAO modifier rejects non-dao calls and allows dao when set", async function () {
    // non-dao cannot addAsset
    await expect(registry.connect(alice).addAsset(tokenMock.target, "TST")).to.be.revertedWithCustomError(registry, "FI_NotDAO");
    // owner is dao (we deployed with owner as dao) so addAsset should succeed
    await registry.connect(owner).addAsset(tokenMock.target, "TST");
    expect(await registry.isWhitelisted(tokenMock.target)).to.equal(true);
  });

  it("_decimalsOrTry: force decimals via TEST helper and via staticcall fallback", async function () {
    // force decimals path
    await registry.TEST_setForceDecimals(8, true);
    await registry.connect(owner).addAsset(tokenMock.target, "TST2");
    expect(await registry.tokenDecimals(tokenMock.target)).to.equal(8);

  // disable force and verify zero address reverts
  await registry.TEST_setForceDecimals(0, false);
  await expect(registry.connect(owner).addAsset(ethers.ZeroAddress, "BAD")).to.be.revertedWithCustomError(registry, "FI_Zero");
  });

  it("depositStable detects FI_Insufficient when transferFrom returns false", async function () {
    // add tokenFail as whitelisted
    await registry.connect(owner).addAsset(tokenFail.target, "FAIL");
    // make deposit with tokenFail which returns false
    await expect(treasury.connect(alice).depositStable(tokenFail.target, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(treasury, "FI_Insufficient");
    // now use tokenMock which succeeds
    await registry.connect(owner).addAsset(tokenMock.target, "OK");
    await treasury.connect(alice).depositStable(tokenMock.target, ethers.parseUnits("1", 18));
  });

  it("send covers not-whitelisted, not-allowed, and FI_Insufficient paths", async function () {
    // send with token==0 should revert FI_NotAllowed
    await expect(treasury.connect(owner).send(ethers.ZeroAddress, alice.address, 1, "r")).to.be.revertedWithCustomError(treasury, "FI_NotAllowed");

    // add tokenMock and attempt send as DAO -> should fail if treasury has no balance (transfer returns true but amount 0?)
    await registry.connect(owner).addAsset(tokenMock.target, "OK");
    // treasury has zero balance, tokenMock.transfer will succeed only if balance sufficient; to provoke FI_Insufficient we use tokenFail
    await registry.connect(owner).addAsset(tokenFail.target, "FAIL");
    // try sending tokenFail which will return false on transfer
    await expect(treasury.connect(owner).send(tokenFail.target, alice.address, ethers.parseUnits("1", 18), "x")).to.be.revertedWithCustomError(treasury, "FI_Insufficient");
  });
});
