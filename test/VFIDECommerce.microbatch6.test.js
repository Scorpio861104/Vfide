const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 6 (permute small branches)", function () {
  let owner, dao, buyer, merchant, stranger;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Token, token;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, dao, buyer, merchant, stranger] = await ethers.getSigners();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Seer = await ethers.getContractFactory("SeerMock");
    seer = await Seer.deploy();
    await seer.waitForDeployment();
    await seer.setMin(1);

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("TK","TK");
    await token.waitForDeployment();

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();
  });

  it("_noteRefund increments but does not suspend when below threshold", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("m1"));
  const before = Number((await registry.info(merchant.address)).refunds);
  await registry._noteRefund(merchant.address);
  const after = Number((await registry.info(merchant.address)).refunds);
  expect(after).to.equal(before + 1);
    const m = await registry.info(merchant.address);
    expect(m.status).to.equal(1); // ACTIVE
  });

  it("_noteDispute increments but does not suspend when below threshold", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("m2"));
  const before = Number((await registry.info(merchant.address)).disputes);
  await registry._noteDispute(merchant.address);
  const after = Number((await registry.info(merchant.address)).disputes);
  expect(after).to.equal(before + 1);
    const m = await registry.info(merchant.address);
    expect(m.status).to.equal(1); // ACTIVE
  });

  it("addMerchant with both TEST_forceNoVault and TEST_forceLowScore true reverts (OR branches)", async function () {
    await registry.TEST_setForceNoVault(true);
    await registry.TEST_setForceLowScore(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("m3"))).to.be.reverted;
    // reset
    await registry.TEST_setForceNoVault(false);
    await registry.TEST_setForceLowScore(false);
  });

  it("release reverts when called by stranger (NotAllowed branch)", async function () {
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("m4"));
    await commerce.connect(buyer).open(merchant.address, 2, ethers.id("m4"));
    await token.mint(commerce.target, 2);
    const id = await commerce.escrowCount();
    await commerce.markFunded(id);
    await expect(commerce.connect(stranger).release(id)).to.be.reverted;
  });
});
