const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce extra focused tests (TEST_* toggles)", function () {
  let owner, merchant;
  let Token, token;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Registry;

  beforeEach(async function () {
    [owner, merchant] = await ethers.getSigners();
  Token = await ethers.getContractFactory("ERC20Mock");
  token = await Token.deploy("TestToken", "TTK");
    await token.waitForDeployment();

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
    this.registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await this.registry.waitForDeployment();
  });

  it("TEST_forceAlreadyMerchant forces addMerchant to revert", async function () {
    await this.registry.TEST_setForceAlreadyMerchant(true);
    await expect(this.registry.connect(merchant).addMerchant(ethers.id("mA"))).to.be.reverted;
  });

  it("TEST_forceNoVault forces addMerchant to revert", async function () {
    await this.registry.TEST_setForceNoVault(true);
    await expect(this.registry.connect(merchant).addMerchant(ethers.id("mB"))).to.be.reverted;
  });

  it("TEST_forceLowScore forces addMerchant to revert", async function () {
    await this.registry.TEST_setForceLowScore(true);
    await expect(this.registry.connect(merchant).addMerchant(ethers.id("mC"))).to.be.reverted;
  });

  it("TEST_setForceZeroSenderRefund triggers COM_Zero branch in _noteRefund", async function () {
    await this.registry.TEST_setForceZeroSenderRefund(true);
    await expect(this.registry._noteRefund(merchant.address)).to.be.reverted;
  });

  it("TEST_setForceZeroSenderDispute triggers COM_Zero branch in _noteDispute", async function () {
    await this.registry.TEST_setForceZeroSenderDispute(true);
    await expect(this.registry._noteDispute(merchant.address)).to.be.reverted;
  });

  it("auto-suspend triggers via repeated refunds/disputes (coverage of counter branches)", async function () {
    // create a merchant normally (without TEST toggles)
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await this.registry.connect(merchant).addMerchant(ethers.id("mD"));

    // call _noteRefund multiple times to hit auto-suspend
    for (let i = 0; i < 6; i++) {
      await this.registry._noteRefund(merchant.address);
    }
    const info = await this.registry.info(merchant.address);
    // status should be SUSPENDED (2)
    expect(info.status).to.equal(2);
  });
});
