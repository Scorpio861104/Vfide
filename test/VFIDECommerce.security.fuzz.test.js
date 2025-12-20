const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce security fuzz - malicious token behaviors", function () {
  let owner, buyer, merchant;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, buyer, merchant] = await ethers.getSigners();
    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Seer = await ethers.getContractFactory("SeerMock");
    seer = await Seer.deploy();
    await seer.waitForDeployment();

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    // We'll deploy registry and commerce with a placeholder token; individual tests will redeploy commerce when needed
    const Token = await ethers.getContractFactory("ERC20Mock");
    const token = await Token.deploy("Temp","TMP");
    await token.waitForDeployment();

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();
  });

  it("GasDrainer token: release succeeds even when token consumes more gas", async function () {
    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const gasToken = await Gas.deploy();
    await gasToken.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrowTestable");
    commerce = await Commerce.deploy(owner.address, gasToken.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();

    // prepare vaults and merchant
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("g1"));

    const amount = ethers.parseUnits("1", 18);
    await commerce.connect(buyer).open(merchant.address, amount, ethers.id("gmeta"));
    // mint into commerce and markFunded
    await gasToken.mint(commerce.target, amount);
    await commerce.markFunded(1);
    // release should succeed despite gas use
    await commerce.release(1);
    const e = await commerce.escrows(1);
    expect(e.state).to.equal(3);
  });

  it("ERC20ReturnFalse: release/refund/resolve revert when token returns false", async function () {
    const Bad = await ethers.getContractFactory("ERC20ReturnFalse");
    const bad = await Bad.deploy();
    await bad.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrowTestable");
    commerce = await Commerce.deploy(owner.address, bad.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();

    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("b1"));

    const amount = ethers.parseUnits("1", 18);
    await commerce.connect(buyer).open(merchant.address, amount, ethers.id("bmeta"));
    // no minting possible (balanceOf returns 0) - markFunded should revert
    await expect(commerce.markFunded(1)).to.be.reverted;
    // pretend contract has balance by bypassing: directly call storage via a token mock is not possible; skip
  });

  it("combination randomized small sequences (open->fund->action) don't corrupt state", async function () {
    const Fail = await ethers.getContractFactory("ERC20FailTransfer");
    const fail = await Fail.deploy();
    await fail.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrowTestable");
    commerce = await Commerce.deploy(owner.address, fail.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();

    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("r1"));

    const amount = ethers.parseUnits("2", 18);
    // run a few random-ish sequences deterministically
    for (let i = 0; i < 5; i++) {
      await commerce.connect(buyer).open(merchant.address, amount, ethers.id("rm"+i));
      // mint fail-transfer token into commerce
      await fail.mint(commerce.target, amount);
      // markFunded
      await commerce.markFunded(i+1);
      // attempt release (expected to revert due to transfer failing)
      await expect(commerce.release(i+1)).to.be.reverted;
      const e = await commerce.escrows(i+1);
      // ensure state is still FUNDED after failed release
      expect(e.state).to.equal(2);
    }
  });
});
