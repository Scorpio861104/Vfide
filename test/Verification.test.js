const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Verification: Automated Justice & Economics", function () {
  let owner, sender, merchant, normalUser;
  let ledger, seer, treasury, router, token, merchantRegistry, vaultHub;
  let stableRegistry;

  before(async function () {
    [owner, sender, merchant, normalUser] = await ethers.getSigners();

    // 1. Deploy ProofLedger
    const ProofLedger = await ethers.getContractFactory("ProofLedger");
    ledger = await ProofLedger.deploy(owner.address);
    await ledger.waitForDeployment();

    // 2. Deploy MockVaultHub
    const MockVaultHub = await ethers.getContractFactory("MockVaultHub");
    vaultHub = await MockVaultHub.deploy();
    await vaultHub.waitForDeployment();

    // 3. Deploy Seer
    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(owner.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();

    // 4. Deploy StablecoinRegistry
    const StablecoinRegistry = await ethers.getContractFactory("StablecoinRegistry");
    stableRegistry = await StablecoinRegistry.deploy(owner.address, await ledger.getAddress());
    await stableRegistry.waitForDeployment();

    // 5. Deploy VFIDEToken
    const DevVaultMock = await ethers.getContractFactory("DevReserveVestingVaultMock");
    const devVault = await DevVaultMock.deploy();
    await devVault.waitForDeployment();

    const PresaleMockFactory = await ethers.getContractFactory("PresaleMock");
    const presaleMock = await PresaleMockFactory.deploy();
    await presaleMock.waitForDeployment();

    const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
    token = await VFIDEToken.deploy(
        await devVault.getAddress(),    // devReserveVestingVault (must be contract)
        await presaleMock.getAddress(), // presale contract (must be deployed contract!)
        owner.address,                  // treasury
        ethers.ZeroAddress,             // vaultHub (can be zero)
        ethers.ZeroAddress,             // ledger (can be zero)
        owner.address                   // treasurySink
    );
    await token.waitForDeployment();

    // 6. Deploy EcoTreasuryVault
    const EcoTreasuryVault = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await EcoTreasuryVault.deploy(
        owner.address, await ledger.getAddress(), await stableRegistry.getAddress(), await token.getAddress()
    );
    await treasury.waitForDeployment();

    // 6b. Deploy MerchantRebateVault
    const MerchantRebateVault = await ethers.getContractFactory("MerchantRebateVault");
    const rebateVault = await MerchantRebateVault.deploy(await token.getAddress());
    await rebateVault.waitForDeployment();

    // 7. Deploy ProofScoreBurnRouter
    const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
    router = await ProofScoreBurnRouter.deploy(
        await seer.getAddress(), await treasury.getAddress(), ethers.ZeroAddress, await rebateVault.getAddress()
    );
    await router.waitForDeployment();

    // 9. Deploy MerchantRegistry
    const MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    merchantRegistry = await MerchantRegistry.deploy(
        owner.address,
        await token.getAddress(),
        await vaultHub.getAddress(),
        await seer.getAddress(),
        ethers.ZeroAddress, // SecurityHub
        await ledger.getAddress()
    );
    await merchantRegistry.waitForDeployment();

    // CONFIGURATION
    await seer.setThresholds(350, 700, 540, 560);
    // BaseBurn=200 (2%), BaseSanctum=50 (0.5%), BaseEco=50 (0.5%), Reduction=50 (0.5%), Penalty=150 (1.5%), MerchantSubsidy=200 (2.0%)
    await router.setPolicy(200, 50, 50, 50, 150, 200, 1000);
    
    // Authorize Deputies
    await seer.setAuth(await merchantRegistry.getAddress(), true);
    // Also authorize owner for testing setup
    await seer.setAuth(owner.address, true);

    // EXEMPT SYSTEM CONTRACTS from Vault-Only Rule
    await token.setSystemExempt(await merchantRegistry.getAddress(), true);
    await token.setSystemExempt(await treasury.getAddress(), true); // Treasury is usually exempt but good to be sure

    // Setup Vaults
    // For testing, we treat the EOA as the "Vault" to simplify token transfers
    // In real life, Vault is a contract.
    await vaultHub.setVault(sender.address, sender.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(normalUser.address, normalUser.address);

    // Register System Contracts as Vaults to bypass mint checks
    await vaultHub.setVault(await merchantRegistry.getAddress(), await merchantRegistry.getAddress());
  });

  describe("Automated Justice (Deputies)", function () {
    it("should punish merchant when suspended (simulated)", async function () {
        // We need to make the merchant active first
        // MerchantRegistry.addMerchant requires score >= minForMerchant (560)
        // Use reward instead of setScore so that punishment (delta) is effective
        // Base is 500 + 50 (Vault Bonus) = 550. We need +50 to reach 600.
        await seer.reward(merchant.address, 50, "Setup");
        
        // Add merchant
        const metaHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));
        await merchantRegistry.connect(merchant).addMerchant(metaHash);
        
        // Set reporter (owner)
        await merchantRegistry.setReporter(owner.address, true);
        
        // Report refunds until suspension (default 5)
        for(let i=0; i<5; i++) {
            await merchantRegistry.reportRefund(merchant.address);
        }
        
        // Check status
        const info = await merchantRegistry.info(merchant.address);
        expect(info.status).to.equal(2); // SUSPENDED
        
        // Check Score Punishment
        // Should have dropped by 100
        const score = await seer.getScore(merchant.address);
        // Note: The test expects 500, but if the merchant had endorsements, the endorsers would also be punished.
        // Since this merchant has no endorsers in this test, the score should be exactly 600 - 100 = 500.
        expect(score).to.equal(500); 
    });
  });

  describe("Fee Subsidy Logic", function () {
    it("should apply standard fees for Neutral -> Neutral transfer", async function () {
        // Set scores
        await seer.setScore(sender.address, 500, "Neutral");
        await seer.setScore(normalUser.address, 500, "Neutral");

        const amount = 10000;
        const fees = await router.computeFees(sender.address, normalUser.address, amount);
        
        // Base Burn: 200 bps (2%) -> 200
        // Base Sanctum: 50 bps (0.5%) -> 50
        expect(fees.burnAmount).to.equal(200); // 2% of 10000
        expect(fees.sanctumAmount).to.equal(50); // 0.5% of 10000
    });

    it("should collect Ecosystem Fee if Recipient is High Trust (Merchant)", async function () {
        // Set scores
        await seer.setScore(sender.address, 500, "Neutral");
        await seer.setScore(merchant.address, 800, "High Trust"); // > 700

        const amount = 10000;
        const fees = await router.computeFees(sender.address, merchant.address, amount);
        
        // Base Burn: 200 bps
        // Base Sanctum: 50 bps
        // Base Eco: 50 bps
        // Sender is Neutral -> No change
        // Recipient is High Trust -> No change to sender fees (Ecosystem Vault collects fee)
        
        expect(fees.burnAmount).to.equal(200); 
        expect(fees.sanctumAmount).to.equal(50);
        expect(fees.ecosystemAmount).to.equal(50);
    });

    it("should reduce burn fee if Sender is High Trust", async function () {
        // Set scores
        await seer.setScore(sender.address, 800, "High Trust");
        await seer.setScore(normalUser.address, 500, "Neutral");

        const amount = 10000;
        const fees = await router.computeFees(sender.address, normalUser.address, amount);
        
        // Base Burn: 200 bps
        // Sender is High Trust -> Reduce by 50 bps -> 150 bps
        // Recipient is Neutral -> No change
        
        expect(fees.burnAmount).to.equal(150); 
        expect(fees.sanctumAmount).to.equal(50);
        expect(fees.ecosystemAmount).to.equal(50);
    });

    it("should apply Sender reduction and collect Ecosystem Fee if BOTH are High Trust", async function () {
        // Set scores
        await seer.setScore(sender.address, 800, "High Trust");
        await seer.setScore(merchant.address, 800, "High Trust");

        const amount = 10000;
        const fees = await router.computeFees(sender.address, merchant.address, amount);
        
        // Base Burn: 200 bps
        // Sender High Trust -> -50 -> 150
        // Recipient High Trust -> No change
        
        expect(fees.burnAmount).to.equal(150); 
        expect(fees.sanctumAmount).to.equal(50);
        expect(fees.ecosystemAmount).to.equal(50);
    });
  });
});
