const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MerchantPortal", function () {
  let MerchantPortal, merchantPortal;
  let owner, merchant, customer;
  let vaultHub, seer, securityHub, proofLedger;

  beforeEach(async function () {
    [owner, merchant, customer] = await ethers.getSigners();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    // await vaultHub.deployed();

    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    // await seer.deployed();

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();
    // await securityHub.deployed();

    const ProofLedgerMock = await ethers.getContractFactory("ProofLedgerMock");
    proofLedger = await ProofLedgerMock.deploy();
    // await proofLedger.deployed();

    const MerchantPortal = await ethers.getContractFactory("MerchantPortal");
    merchantPortal = await MerchantPortal.deploy(
      owner.address,
      vaultHub.address,
      seer.address,
      securityHub.address,
      proofLedger.address,
      owner.address
    );
    await merchantPortal.deployed();
  });

  it("Should register a merchant successfully", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 600);

    await expect(
      merchantPortal.connect(merchant).registerMerchant("MerchantName", "Retail")
    )
      .to.emit(merchantPortal, "MerchantRegistered")
      .withArgs(merchant.address, "MerchantName", "Retail");
  });

  it("Should process a payment successfully", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 600);
    await merchantPortal.connect(merchant).registerMerchant("MerchantName", "Retail");

    await expect(
      merchantPortal.connect(customer).processPayment(merchant.address, ethers.utils.parseEther("1"), "Order123")
    )
      .to.emit(merchantPortal, "PaymentProcessed")
      .withArgs(customer.address, merchant.address, ethers.utils.parseEther("1"), "Order123");
  });

  it("Should revert if merchant is not registered", async function () {
    await expect(
      merchantPortal.connect(customer).processPayment(merchant.address, ethers.utils.parseEther("1"), "Order123")
    ).to.be.revertedWith("MERCH_NotRegistered");
  });

  it("Should revert if merchant's ProofScore is too low", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 500);

    await expect(
      merchantPortal.connect(merchant).registerMerchant("MerchantName", "Retail")
    ).to.be.revertedWith("MERCH_LowTrust");
  });
});