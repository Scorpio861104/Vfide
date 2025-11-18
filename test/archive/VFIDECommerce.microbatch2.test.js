const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 2 (TEST toggles & zero-sender)", function () {
  let owner, alice, merchant;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Token, token;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, alice, merchant] = await ethers.getSigners();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Seer = await ethers.getContractFactory("SeerMock");
    seer = await Seer.deploy();
    await seer.waitForDeployment();
    await seer.setMin(5);

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("T","T");
    await token.waitForDeployment();

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();
  });

  it("TEST_setForceAlreadyMerchant flips already-merchant branch", async function () {
    // set test flag and call addMerchant
    await registry.TEST_setForceAlreadyMerchant(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("t1"))).to.be.reverted;
    await registry.TEST_setForceAlreadyMerchant(false);
  });

  it("TEST_setForceNoVault flips no-vault branch even when vault exists", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.TEST_setForceNoVault(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("t2"))).to.be.reverted;
    await registry.TEST_setForceNoVault(false);
  });

  it("TEST_setForceLowScore flips low-score branch regardless of score", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.TEST_setForceLowScore(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("t3"))).to.be.reverted;
    await registry.TEST_setForceLowScore(false);
  });

  it("TEST zero-sender refund/dispute toggles hit COM_Zero branches", async function () {
    // enable toggles and call the internal-noters which check the TEST flag
    await registry.TEST_setForceZeroSenderRefund(true);
    await expect(registry._noteRefund(merchant.address)).to.be.reverted;
    await registry.TEST_setForceZeroSenderRefund(false);

    await registry.TEST_setForceZeroSenderDispute(true);
    await expect(registry._noteDispute(merchant.address)).to.be.reverted;
    await registry.TEST_setForceZeroSenderDispute(false);
  });

  it("open path: buyer vault present and merchant active succeeds", async function () {
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("ok"));
    // open should succeed now
    const tx = await commerce.connect(alice).open(merchant.address, 1, ethers.id("ok1"));
    await expect(tx).to.be.ok;
  });
});
