const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance micro-batch 2 (vfide token path & onlyDAO toggle)", function () {
  let owner, alice, bob;
  let ERC20, token;
  let Ledger, ledger;
  let Stable, stable;
  let Treasury, treasury;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    ERC20 = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20.deploy("VFIDE","VFD");
    await token.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Stable = await ethers.getContractFactory("StablecoinRegistry");
    stable = await Stable.deploy(owner.address, ledger.target);
    await stable.waitForDeployment();

    Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    // set vfideToken to token.target so send(token==vfideToken) path is hit
    treasury = await Treasury.deploy(owner.address, ledger.target, stable.target, token.target);
    await treasury.waitForDeployment();
  });

  it("send allows vfideToken even if not whitelisted", async function () {
    // mint into treasury and send as dao
    await token.mint(treasury.target, 1000);
    // owner is DAO, should be able to send vfideToken even if not whitelisted
    await treasury.connect(owner).send(token.target, bob.address, 100, "vpay");
    expect(await token.balanceOf(bob.address)).to.equal(100);
  });

  it("onlyDAO toggle for treasury.setModules allows non-dao when TEST flag set", async function () {
    // alice cannot call setModules
    await expect(treasury.connect(alice).setModules(alice.address, ledger.target, stable.target, token.target)).to.be.reverted;
    // enable TEST-only override and allow alice
    await treasury.TEST_setOnlyDAOOff_Tx(true);
    await treasury.connect(alice).setModules(alice.address, ledger.target, stable.target, token.target);
    // setModules rejects zero dao
    await expect(treasury.connect(owner).setModules(ethers.ZeroAddress, ledger.target, stable.target, token.target)).to.be.reverted;
  });
});
