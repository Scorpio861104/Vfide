const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Incentives System: Rebates & Duty", function () {
  let owner, customer, merchant, voter;
  let token, vaultHub, seer, router, rebateVault, portal, dao, dutyDistributor, ledger;

  before(async function () {
    [owner, customer, merchant, voter] = await ethers.getSigners();

    // 1. Infrastructure
    const ProofLedger = await ethers.getContractFactory("ProofLedger");
    ledger = await ProofLedger.deploy(owner.address);
    
    const MockVaultHub = await ethers.getContractFactory("MockVaultHub");
    vaultHub = await MockVaultHub.deploy();

    // 2. Token & Seer
    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(owner.address, await ledger.getAddress(), await vaultHub.getAddress());

    // Deploy DevVault and PresaleMock (required for VFIDEToken constructor)
    const DevVault = await ethers.getContractFactory("DevReserveVestingVaultMock");
    const devVault = await DevVault.deploy();
    await devVault.waitForDeployment();

    const PresaleMockFactory = await ethers.getContractFactory("PresaleMock");
    const presaleMock = await PresaleMockFactory.deploy();
    await presaleMock.waitForDeployment();

    const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
    token = await VFIDEToken.deploy(
        devVault.target,           // devReserveVestingVault (must be contract)
        presaleMock.target,        // presale contract (must be deployed contract!)
        owner.address,             // treasury
        ethers.ZeroAddress,        // vaultHub (can be zero)
        ethers.ZeroAddress,        // ledger (can be zero)
        owner.address              // treasurySink
    );

    // 3. Rebate Vault
    const MerchantRebateVault = await ethers.getContractFactory("MerchantRebateVault");
    rebateVault = await MerchantRebateVault.deploy(await token.getAddress());

    // 4. Router (wires to RebateVault as ecosystemSink)
    const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
    router = await ProofScoreBurnRouter.deploy(
        await seer.getAddress(), 
        owner.address, // sanctum (dummy)
        ethers.ZeroAddress, // burn
        await rebateVault.getAddress() // ecosystem
    );

    // 5. Merchant Portal
    const MerchantPortal = await ethers.getContractFactory("MerchantPortal");
    portal = await MerchantPortal.deploy(
        owner.address, // dao
        await vaultHub.getAddress(),
        await seer.getAddress(),
        ethers.ZeroAddress, // security
        await ledger.getAddress()
    );

    // 6. DAO & Duty
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(
        owner.address, owner.address, await seer.getAddress(), await vaultHub.getAddress(), ethers.ZeroAddress
    );

    const DutyDistributor = await ethers.getContractFactory("DutyDistributor");
    dutyDistributor = await DutyDistributor.deploy(await rebateVault.getAddress(), await dao.getAddress());

    // WIRING
    await token.setBurnRouter(await router.getAddress());
    await portal.setRebateVault(await rebateVault.getAddress(), 800);
    await portal.setAcceptedToken(await token.getAddress(), true);
    
    // Authorize Portal & Duty to spend Rebate funds
    await rebateVault.setManager(await portal.getAddress(), true);
    await rebateVault.setManager(await dutyDistributor.getAddress(), true);

    // Setup Vaults (Mock)
    await vaultHub.setVault(customer.address, customer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(voter.address, voter.address);
    await vaultHub.setVault(await portal.getAddress(), await portal.getAddress());
    await vaultHub.setVault(await rebateVault.getAddress(), await rebateVault.getAddress());

    // Exemptions
    await token.setSystemExempt(await portal.getAddress(), true);
    await token.setSystemExempt(await rebateVault.getAddress(), true);

    // Fund Customer & Rebate Vault by transferring from treasury
    await token.setVaultOnly(false); // Allow direct transfers for testing
    await token.connect(owner).transfer(customer.address, ethers.parseEther("1000"));
    await token.connect(owner).transfer(await rebateVault.getAddress(), ethers.parseEther("5000")); // Fund the pot
  });

  it("Should pay rebate to High Trust merchant", async function () {
    // 1. Register Merchant
    await portal.connect(merchant).registerMerchant("Best Shop", "Retail");
    
    // 2. Set High Score (850 > 800)
    await seer.setScore(merchant.address, 850);

    // 3. Customer approves Portal
    await token.connect(customer).approve(await portal.getAddress(), ethers.parseEther("100"));

    // 4. Check balances before
    const merchantBalBefore = await token.balanceOf(merchant.address);
    const rebateVaultBalBefore = await token.balanceOf(await rebateVault.getAddress());

    // 5. Pay (100 VFIDE)
    // Protocol Fee is 0.25% (25 bps) -> 0.25 VFIDE
    // Rebate should pay that 0.25 VFIDE back to merchant
    await portal.connect(customer).pay(merchant.address, await token.getAddress(), ethers.parseEther("100"), "ORDER1");

    // 6. Check balances after
    const merchantBalAfter = await token.balanceOf(merchant.address);
    const rebateVaultBalAfter = await token.balanceOf(await rebateVault.getAddress());

    // Merchant receives: 
    // + 99.75 (Payment net of fee)
    // + 0.25 (Rebate from Vault)
    // = 100.00 Total
    const gain = merchantBalAfter - merchantBalBefore;
    expect(gain).to.equal(ethers.parseEther("100"));

    // Rebate Vault pays 0.25
    const rebatePaid = rebateVaultBalBefore - rebateVaultBalAfter;
    expect(rebatePaid).to.equal(ethers.parseEther("0.25"));
  });

  it("Should NOT pay rebate to Low Trust merchant", async function () {
    // 1. Lower Score (700 < 800)
    await seer.setScore(merchant.address, 700);

    // 2. Check balances before
    const merchantBalBefore = await token.balanceOf(merchant.address);
    const rebateVaultBalBefore = await token.balanceOf(await rebateVault.getAddress());

    // 3. Pay (100 VFIDE)
    await portal.connect(customer).pay(merchant.address, await token.getAddress(), ethers.parseEther("100"), "ORDER2");

    // 4. Check balances after
    const merchantBalAfter = await token.balanceOf(merchant.address);
    const rebateVaultBalAfter = await token.balanceOf(await rebateVault.getAddress());

    // Merchant receives: 
    // + 99.75 (Payment net of fee)
    // + 0.00 (No Rebate)
    // = 99.75 Total
    const gain = merchantBalAfter - merchantBalBefore;
    expect(gain).to.equal(ethers.parseEther("99.75"));

    // Rebate Vault pays 0
    const rebatePaid = rebateVaultBalBefore - rebateVaultBalAfter;
    expect(rebatePaid).to.equal(0n);
  });
});
