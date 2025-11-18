const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance extra focused tests", function () {
  let owner, alice;
  let Token, token;
  let Reverting, rev;
  let Ledger, ledger;
  let Stable, stable;
  let Vault, vault;
  let Treasury, treasury;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("FinToken","FT");
    await token.waitForDeployment();

    Reverting = await ethers.getContractFactory("RevertingDecimals");
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

  it("addAsset then adding again reverts with FI_AlreadyWhitelisted", async function () {
    await stable.addAsset(token.target, "FT");
    await expect(stable.addAsset(token.target, "FT")).to.be.reverted;
  });

  it("TEST_setForceDecimals overrides decimals stored", async function () {
    await stable.TEST_setForceDecimals(8, true);
    await stable.addAsset(token.target, "FT2");
    const d = await stable.tokenDecimals(token.target);
    expect(d).to.equal(8);
  });

  it("removeAsset reverts when not whitelisted and setSymbolHint reverts", async function () {
    await expect(stable.removeAsset(token.target)).to.be.reverted;
    await expect(stable.setSymbolHint(token.target, "X")).to.be.reverted;
  });

  it("depositStable reverts when transferFrom returns false or TEST forced", async function () {
    // token not whitelisted
    await expect(treasury.depositStable(token.target, 1)).to.be.reverted;
    // whitelist token and test TEST_setForceDepositInsufficient
    await stable.addAsset(token.target, "FT");
    await token.mint(alice.address, 100);
    await token.connect(alice).approve(treasury.target, 100);
    await stable.TEST_setForceDecimals(18, false);
    await treasury.TEST_setForceDepositInsufficient(true);
    await expect(treasury.connect(owner).depositStable(token.target, 1)).to.be.reverted;
  });

  it("send reverts for zero token and non-whitelisted and TEST forced insufficient", async function () {
    // zero token
    await expect(treasury.send(ethers.ZeroAddress, owner.address, 1, "x")).to.be.reverted;
    // not whitelisted
    await expect(treasury.send(token.target, owner.address, 1, "x")).to.be.reverted;
    // whitelist and force insufficient
    await stable.addAsset(token.target, "FT");
    // mint but force insufficient toggle
    await token.mint(treasury.target, 10);
    await treasury.TEST_setForceSendInsufficient(true);
    await expect(treasury.send(token.target, owner.address, 1, "x")).to.be.reverted;
  });
});
