const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance more focused tests", function () {
  let owner, alice, bob;
  let Token, token;
  let Reverting, rev;
  let Ledger, ledger;
  let Stable, stable;
  let Vault, vault;
  let Treasury, treasury;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("FToken","FT");
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

  it("addAsset -> setSymbolHint -> removeAsset success path", async function () {
    await stable.addAsset(token.target, "FT");
    expect(await stable.isWhitelisted(token.target)).to.equal(true);
    expect(await stable.tokenDecimals(token.target)).to.equal(18);
    await stable.setSymbolHint(token.target, "NEW");
    await stable.removeAsset(token.target);
    expect(await stable.isWhitelisted(token.target)).to.equal(false);
  });

  it("onlyDAO modifier blocks non-dao and TEST_setOnlyDAOOff allows it", async function () {
    // alice cannot call setLedger
    await expect(stable.connect(alice).setLedger(ethers.ZeroAddress)).to.be.reverted;
    // enable TEST-only override
    await stable.TEST_setOnlyDAOOff(true);
    // now alice can call setLedger
    await stable.connect(alice).setLedger(ledger.target);
  });

  it("depositStable success and TEST forced insufficient path", async function () {
    // whitelist token and mint/approve for alice
    await stable.addAsset(token.target, "FT");
    await token.mint(alice.address, 1000);
    await token.connect(alice).approve(treasury.target, 1000);

    // deposit should succeed
    await treasury.connect(alice).depositStable(token.target, 100);
    const bal = await treasury.balanceOf(token.target);
    expect(bal).to.be.a('bigint');

    // force deposit insufficient
    await treasury.TEST_setForceDepositInsufficient(true);
    await token.connect(alice).approve(treasury.target, 100);
    await expect(treasury.connect(alice).depositStable(token.target, 1)).to.be.reverted;
  });

  it("send success path by DAO and TEST forced send insufficient", async function () {
    await stable.addAsset(token.target, "FT");
    // mint into treasury
    await token.mint(treasury.target, 500);
    // dao (owner) can send
    await treasury.connect(owner).send(token.target, bob.address, 100, "pay");
    expect(await token.balanceOf(bob.address)).to.equal(100);

    // force send insufficient
    await treasury.TEST_setForceSendInsufficient(true);
    await expect(treasury.connect(owner).send(token.target, bob.address, 1, "x")).to.be.reverted;
  });
});
