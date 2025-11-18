const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 8 (remaining conditionals & transfer-fail)", function () {
  let owner, buyer, merchant, other;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Token, tokenFail;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, buyer, merchant, other] = await ethers.getSigners();

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

    Token = await ethers.getContractFactory("ERC20FailTransfer");
    tokenFail = await Token.deploy();
    await tokenFail.waitForDeployment();

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, tokenFail.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(owner.address, tokenFail.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();

    // set vaults and merchant
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
  });

  it("adding merchant twice reverts (AlreadyMerchant)", async function () {
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("dup1"));
    await expect(registry.connect(merchant).addMerchant(ethers.id("dup2"))).to.be.reverted;
  });

  it("_noteRefund/_noteDispute on non-merchant reverts (NotMerchant)", async function () {
    await expect(registry._noteRefund(other.address)).to.be.reverted;
    await expect(registry._noteDispute(other.address)).to.be.reverted;
  });

  it("auto-suspend via refunds reaches threshold and sets SUSPENDED", async function () {
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("autoR"));
    // fire refunds up to autoSuspendRefunds (default 5)
    for (let i = 0; i < 5; i++) {
      await registry._noteRefund(merchant.address);
    }
    const m = await registry.merchants(merchant.address);
    expect(m.status).to.equal(2); // SUSPENDED
  });

  it("open reverts when merchant is SUSPENDED", async function () {
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("s1"));
    // suspend by refunds
    for (let i = 0; i < 5; i++) { await registry._noteRefund(merchant.address); }
    await expect(commerce.connect(buyer).open(merchant.address, 1, ethers.id("os1"))).to.be.reverted;
  });

  it("release/refund/resolve revert when transfer returns false (transfer-fail token)", async function () {
    // use tokenFail which returns false on transfer
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("tf"));
    // open escrow
    await commerce.connect(buyer).open(merchant.address, 10, ethers.id("tf1"));
    const id = await commerce.escrowCount();
    // mint tokens into contract so markFunded passes
    await tokenFail.mint(commerce.target, 10);
    await commerce.markFunded(id);
    // release should revert because transfer() returns false -> require fails
    await expect(commerce.connect(buyer).release(id)).to.be.revertedWith("transfer fail");
    // refund should also revert similarly (merchant or dao)
    await expect(commerce.connect(merchant).refund(id)).to.be.revertedWith("transfer fail");
    // dispute -> move to DISPUTED and resolve should revert on transfer
    await commerce.connect(buyer).dispute(id, "x");
    await expect(commerce.resolve(id, true)).to.be.revertedWith("transfer fail");
  });
});
