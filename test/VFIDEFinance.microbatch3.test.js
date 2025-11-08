const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance micro-batch 3 (admin guards & send/deposit edge cases)", function () {
  let owner, alice;
  let ERC20, token;
  let Ledger, ledger;
  let Stable, stable;
  let Treasury, treasury;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    ERC20 = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20.deploy("S","S");
    await token.waitForDeployment();

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

  it("setDAO rejects zero address and setLedger onlyDAO behavior", async function () {
    await expect(stable.setDAO(ethers.ZeroAddress)).to.be.reverted;
    // alice cannot set ledger
    await expect(stable.connect(alice).setLedger(ledger.target)).to.be.reverted;
    // enable TEST-only override and allow alice
    await stable.TEST_setOnlyDAOOff(true);
    await stable.connect(alice).setLedger(ledger.target);
  });

  it("add/remove/setSymbolHint guards and duplicate add", async function () {
    // addAsset rejects zero token
    await expect(stable.addAsset(ethers.ZeroAddress, "X")).to.be.reverted;
    // proper add
    await stable.addAsset(token.target, "S");
    await expect(stable.addAsset(token.target, "S2")).to.be.reverted;
    // removeAsset should succeed then setSymbolHint should revert
    await stable.removeAsset(token.target);
    await expect(stable.setSymbolHint(token.target, "NEW")).to.be.reverted;
  });

  it("depositStable/send edge cases: zero amount, token==zero, non-whitelist", async function () {
    // deposit zero amount
    await expect(treasury.connect(owner).depositStable(token.target, 0)).to.be.reverted;

    // send with token==0 should revert FI_NotAllowed
    await expect(treasury.connect(owner).send(ethers.ZeroAddress, alice.address, 1, "x")).to.be.reverted;

    // send with amount==0 should revert FI_Zero
    await expect(treasury.connect(owner).send(token.target, alice.address, 0, "x")).to.be.reverted;

    // deposit non-whitelisted token should revert
    const Other = await ethers.getContractFactory("ERC20Mock");
    const other = await Other.deploy("O","O");
    await other.waitForDeployment();
    await other.mint(alice.address, 100);
    await other.connect(alice).approve(treasury.target, 100);
    await expect(treasury.connect(alice).depositStable(other.target, 1)).to.be.reverted;
  });
});
