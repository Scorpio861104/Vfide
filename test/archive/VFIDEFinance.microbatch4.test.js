const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance micro-batch 4 (decimals permutations & transfer-fail)", function () {
  let owner, alice;
  let ERC20, token, tokenFail;
  let Reverting, rev;
  let Ledger, ledger;
  let Stable, stable;
  let Treasury, treasury;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    ERC20 = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20.deploy("S","S");
    await token.waitForDeployment();

    const ERC20Fail = await ethers.getContractFactory("ERC20FailTransfer");
    tokenFail = await ERC20Fail.deploy();
    await tokenFail.waitForDeployment();

    Reverting = await ethers.getContractFactory("RevertingDecimals");
    rev = await Reverting.deploy();
    await rev.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Stable = await ethers.getContractFactory("StablecoinRegistry");
    stable = await Stable.deploy(owner.address, ledger.target);
    await stable.waitForDeployment();

    Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await Treasury.deploy(owner.address, ledger.target, stable.target, token.target);
    await treasury.waitForDeployment();
  });

  it("_decimalsOrTry: contract that reverts falls back to 18", async function () {
    await stable.addAsset(rev.target, "RV");
    expect(await stable.tokenDecimals(rev.target)).to.equal(18);
  });

  it("_decimalsOrTry: TEST_setForceDecimals overrides return value", async function () {
    await stable.TEST_setForceDecimals(3, true);
    await stable.addAsset(token.target, "S");
    expect(await stable.tokenDecimals(token.target)).to.equal(3);
  });

  it("depositStable reverts when token.transferFrom returns false (ERC20FailTransfer)", async function () {
    await stable.addAsset(tokenFail.target, "BAD");
    // tokenFail.transferFrom always returns false
    await expect(treasury.connect(alice).depositStable(tokenFail.target, 1)).to.be.reverted;
  });

  it("depositStable respects TEST_setForceDepositInsufficient independent of token behavior", async function () {
    await stable.addAsset(token.target, "S");
    await token.mint(alice.address, 100);
    await token.connect(alice).approve(treasury.target, 100);
    await treasury.TEST_setForceDepositInsufficient(true);
    await expect(treasury.connect(alice).depositStable(token.target, 1)).to.be.reverted;
  });
});
