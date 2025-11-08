const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance microbatch1 tests", function () {
  let owner, alice, bob;
  let Token, token, token2, tokenFalse, rev;
  let Ledger, ledger;
  let Stable, stable;
  let Vault, vault;
  let Treasury, treasury;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    console.log('MB1 beforeEach start', owner.address);

  Token = await ethers.getContractFactory("ERC20Mock");
  console.log('got ERC20Mock factory');
  token = await Token.deploy("FToken","FT");
  await token.waitForDeployment();
  console.log('deployed token', token.target);

  console.log('deploying token2');
  token2 = await Token.deploy("Other","OT");
  await token2.waitForDeployment();
  console.log('deployed token2', token2.target);

  const ERC20ReturnFalse = await ethers.getContractFactory("ERC20ReturnFalse");
  tokenFalse = await ERC20ReturnFalse.deploy();
    await tokenFalse.waitForDeployment();

    const Reverting = await ethers.getContractFactory("RevertingDecimals");
    rev = await Reverting.deploy();
    await rev.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Vault = await ethers.getContractFactory("VaultHubMock");
    vault = await Vault.deploy();
    await vault.waitForDeployment();

    Stable = await ethers.getContractFactory("StablecoinRegistry");
    stable = await Stable.deploy(owner.address, ledger.target);
    await stable.waitForDeployment();

    Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await Treasury.deploy(owner.address, ledger.target, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();
  });

  it("addAsset uses token.decimals and falling back when decimals() reverts", async function () {
    // normal token has decimals (ERC20Mock -> 18)
    await stable.addAsset(token.target, "FT");
    expect(await stable.isWhitelisted(token.target)).to.equal(true);
    expect(await stable.tokenDecimals(token.target)).to.equal(18);

    // token whose decimals() reverts should fall back to 18
    await stable.addAsset(rev.target, "RV");
    expect(await stable.isWhitelisted(rev.target)).to.equal(true);
    expect(await stable.tokenDecimals(rev.target)).to.equal(18);
  });

  it("TEST_setForceDecimals forces a chosen decimals value", async function () {
    await stable.TEST_setForceDecimals(7, true);
    await stable.addAsset(token2.target, "OT");
    expect(await stable.tokenDecimals(token2.target)).to.equal(7);
  });

  it("addAsset rejects zero address and duplicate adds", async function () {
    await expect(stable.addAsset(ethers.ZeroAddress, "Z")).to.be.reverted;
    await stable.addAsset(token.target, "FT");
    await expect(stable.addAsset(token.target, "FT2")).to.be.reverted;
  });

  it("removeAsset and setSymbolHint guarded by onlyDAO and token must be whitelisted", async function () {
    await stable.addAsset(token.target, "FT");
    await stable.setSymbolHint(token.target, "NEW");
    expect(await stable.tokenDecimals(token.target)).to.equal(18);
    await stable.removeAsset(token.target);
    await expect(stable.setSymbolHint(token.target, "X")).to.be.reverted;
  });

  it("depositStable rejects non-whitelisted and transfer failures", async function () {
    // token2 is not whitelisted
    await token2.mint(alice.address, 1000);
    await token2.connect(alice).approve(treasury.target, 1000);
    await expect(treasury.connect(alice).depositStable(token2.target, 1)).to.be.reverted;

  // whitelisted but transferFrom returns false (ERC20ReturnFalse has no mint/approve)
  await stable.addAsset(tokenFalse.target, "BAD");
  await expect(treasury.connect(alice).depositStable(tokenFalse.target, 10)).to.be.reverted;

    // zero amount rejected
    await stable.addAsset(token.target, "FT");
    await token.mint(alice.address, 1000);
    await token.connect(alice).approve(treasury.target, 1000);
    await expect(treasury.connect(alice).depositStable(token.target, 0)).to.be.reverted;

    // TEST forced insufficient
    await treasury.TEST_setForceDepositInsufficient(true);
    await token.connect(alice).approve(treasury.target, 100);
    await expect(treasury.connect(alice).depositStable(token.target, 1)).to.be.reverted;
  });

  it("send rejects zero-target, non-whitelisted and can send when whitelisted", async function () {
    // zero to address
    await expect(treasury.connect(owner).send(token.target, ethers.ZeroAddress, 1, "z")).to.be.reverted;

    // not whitelisted -> revert
    await token.mint(treasury.target, 50);
    await expect(treasury.connect(owner).send(token.target, bob.address, 1, "x")).to.be.reverted;

    // whitelist and send
    await stable.addAsset(token.target, "FT");
    await token.mint(treasury.target, 100);
    await treasury.connect(owner).send(token.target, bob.address, 20, "pay");
    expect(await token.balanceOf(bob.address)).to.equal(20);

    // TEST forced send insufficient
    await treasury.TEST_setForceSendInsufficient(true);
    await expect(treasury.connect(owner).send(token.target, bob.address, 1, "x")).to.be.reverted;
  });
});
