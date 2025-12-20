const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Merchant Portal Integration (Payout Override)", function () {
  let owner, merchant, customer, supplier, tax;
  let vfide;
  let vaultHub, seer, securityHub, ledger, rebateVault;
  let merchantPortal, revenueSplitter;

  beforeEach(async function () {
    [owner, merchant, customer, supplier, tax] = await ethers.getSigners();

    // 1. Deploy Mocks
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    vfide = await ERC20Mock.deploy("VFIDE", "VFIDE");
    
    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.setVault(customer.address, customer.address);
    await vaultHub.setVault(merchant.address, merchant.address);

    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);
    
    // Mock Rebate Vault
    const MerchantRebateVaultFactory = await ethers.getContractFactory("MerchantRebateVault"); 
    rebateVault = await MerchantRebateVaultFactory.deploy(vfide.target);

    // 2. Deploy MerchantPortal
    const MerchantPortal = await ethers.getContractFactory("MerchantPortal");
    merchantPortal = await MerchantPortal.deploy(
      owner.address, // DAO
      vaultHub.target,
      seer.target,
      securityHub.target,
      ledger.target,
      owner.address // Fee Sink
    );

    // 3. Deploy RevenueSplitter
    const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
    // 50% Supplier, 50% Tax
    revenueSplitter = await RevenueSplitter.deploy([supplier.address, tax.address], [5000, 5000]);

    // 4. Setup
    await vfide.mint(customer.address, ethers.parseEther("1000"));
    
    // Set Trust Scores
    await seer.setScore(merchant.address, 900);
    await seer.setScore(customer.address, 800);

    await merchantPortal.connect(merchant).registerMerchant("Test Corp", "Retail");
    await merchantPortal.connect(owner).setAcceptedToken(vfide.target, true);
  });

  it("should redirect payment to RevenueSplitter when payout address is set", async function () {
    // Set Payout Address
    await merchantPortal.connect(merchant).setPayoutAddress(revenueSplitter.target);

    // Customer pays 100 VFIDE
    const amount = ethers.parseEther("100");
    await vfide.connect(customer).approve(merchantPortal.target, amount);

    // Pay
    await merchantPortal.connect(customer).pay(merchant.address, vfide.target, amount, "ORDER-1");

    // Check RevenueSplitter balance (should be ~100 minus fee)
    // Fee is 0.25% = 0.25 VFIDE. Net = 99.75
    const fee = (amount * 25n) / 10000n;
    const net = amount - fee;
    
    expect(await vfide.balanceOf(revenueSplitter.target)).to.equal(net);
    expect(await vfide.balanceOf(merchant.address)).to.equal(0); // Merchant vault gets nothing directly

    // Distribute
    await revenueSplitter.distribute(vfide.target);
    
    // Check Supplier/Tax balances (50% of net each)
    const share = net / 2n;
    expect(await vfide.balanceOf(supplier.address)).to.equal(share);
    expect(await vfide.balanceOf(tax.address)).to.equal(share);
  });

  it("should default to merchant vault if payout address is not set", async function () {
    // Customer pays 100 VFIDE
    const amount = ethers.parseEther("100");
    await vfide.connect(customer).approve(merchantPortal.target, amount);

    // Pay
    await merchantPortal.connect(customer).pay(merchant.address, vfide.target, amount, "ORDER-2");

    // Check Merchant Vault balance
    const fee = (amount * 25n) / 10000n;
    const net = amount - fee;
    
    expect(await vfide.balanceOf(merchant.address)).to.equal(net);
  });
});
