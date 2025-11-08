const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce focused branch tests", function () {
  let owner, alice, merchant;
  let Token, token, TokenFail, tokenFail;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Registry, registry; // MerchantRegistry
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, alice, merchant] = await ethers.getSigners();

    Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("ComToken", "CTK");
    await token.waitForDeployment();

    TokenFail = await ethers.getContractFactory("ERC20FailTransfer");
    tokenFail = await TokenFail.deploy();
    await tokenFail.waitForDeployment();

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

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();
  });

  it("addMerchant: TEST_forceAlreadyMerchant triggers COM_AlreadyMerchant", async function () {
    await registry.TEST_setForceAlreadyMerchant(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("meta"))).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
  });

  it("addMerchant: TEST_forceNoVault triggers COM_NotAllowed", async function () {
    await registry.TEST_setForceNoVault(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("meta"))).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
  });

  it("addMerchant: TEST_forceLowScore triggers COM_NotAllowed", async function () {
    await registry.TEST_setForceLowScore(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("meta"))).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
  });

  it("_noteRefund/_noteDispute: TEST zero-sender branches", async function () {
    // force zero-sender refund
    await registry.TEST_setForceZeroSenderRefund(true);
    await expect(registry._noteRefund(merchant.address)).to.be.revertedWithCustomError(registry, "COM_Zero");

    // force zero-sender dispute
    await registry.TEST_setForceZeroSenderDispute(true);
    await expect(registry._noteDispute(merchant.address)).to.be.revertedWithCustomError(registry, "COM_Zero");
  });

  it("open/markFunded: buyer missing vault and not-funded branches", async function () {
    // Ensure merchant exists: set vault and score
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("m"));

    // buyer (alice) has no vault set -> open should revert COM_NotBuyer
    await expect(commerce.connect(alice).open(merchant.address, 1, ethers.id("x"))).to.be.revertedWithCustomError(commerce, "COM_NotBuyer");

    // set buyer vault and open successfully
    await vaultHub.setVault(alice.address, alice.address);
    const id = await commerce.connect(alice).open(merchant.address, 5, ethers.id("m2"));

    // call markFunded while contract has zero balance -> revert COM_NotFunded
    await expect(commerce.markFunded(1)).to.be.revertedWithCustomError(commerce, "COM_NotFunded");
  });

  it("release/refund/resolve: transfer failure paths using ERC20FailTransfer", async function () {
    // deploy a commerce instance that uses tokenFail so transfers return false
    const CommerceF = await ethers.getContractFactory("CommerceEscrow");
    const commerceF = await CommerceF.deploy(owner.address, tokenFail.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerceF.waitForDeployment();

    // prepare merchant + buyer vaults and seer
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(alice.address, alice.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("m3"));

    // open escrow
    await commerceF.connect(alice).open(merchant.address, 1, ethers.id("m3"));

    // mint to commerceF so markFunded can succeed
    await tokenFail.mint(commerceF.target, 10);
    await commerceF.markFunded(1);

    // release should attempt transfer and fail (transfer returns false -> require 'transfer fail')
    await expect(commerceF.release(1)).to.be.revertedWith("transfer fail");

    // refund should also fail similarly
    // first set state back to FUNDED
    // open a fresh escrow id=2
    await commerceF.connect(alice).open(merchant.address, 1, ethers.id("m4"));
    await tokenFail.mint(commerceF.target, 10);
    await commerceF.markFunded(2);
    // refund invoked by merchant (merchant is seller) should revert on transfer
    await expect(commerceF.connect(merchant).refund(2)).to.be.revertedWith("transfer fail");
  });
});
