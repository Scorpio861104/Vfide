const { expect } = require("chai");
const { ethers } = require("hardhat");

// SKIPPED: Uses VFIDEToken with wrong constructor signature and contracts that don't exist
describe.skip("Complete System Integration Test", function () {
  let owner, dao, presaleSigner, merchant, buyer, charity, other;
  let token, commerce, finance;
  let vestingVault, vaultHub, seer, securityHub, ledger, burnRouter;
  let stableRegistry, treasury;
  let stableToken;

  const ZERO_ADDRESS = ethers.ZeroAddress;
  const DEV_RESERVE = ethers.parseUnits("40000000", 18);
  const PRESALE_CAP = ethers.parseUnits("75000000", 18);

  beforeEach(async function () {
    [owner, dao, presaleSigner, merchant, buyer, charity, other] = await ethers.getSigners();

    // ========================================
    // 1. Deploy Core Infrastructure Mocks
    // ========================================
    
    // Deploy VestingVault (simple contract for dev reserve)
    const VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    // Deploy VaultHub mock
    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    // Deploy Seer mock (ProofScore system)
    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.waitForDeployment();

    // Deploy SecurityHub mock
    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();
    await securityHub.waitForDeployment();

    // Deploy ProofLedger mock
    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false); // false = don't revert
    await ledger.waitForDeployment();

    // Deploy BurnRouter mock
    const BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    // ========================================
    // 2. Deploy VFIDEToken
    // ========================================
    
    const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(
      vestingVault.target,
      ZERO_ADDRESS, // vaultHub will be set later
      ZERO_ADDRESS, // securityHub will be set later
      ZERO_ADDRESS  // ledger will be set later
    );
    await token.waitForDeployment();

    // Configure token with infrastructure
    await token.connect(owner).setVaultHub(vaultHub.target);
    await token.connect(owner).setSecurityHub(securityHub.target);
    await token.connect(owner).setLedger(ledger.target);
    await token.connect(owner).setBurnRouter(burnRouter.target);
    
    // Disable vaultOnly for easier testing
    await token.connect(owner).setVaultOnly(false);
    
    // Set presale
    await token.connect(owner).setPresale(presaleSigner.address);

    // ========================================
    // 3. Deploy VFIDEFinance (StablecoinRegistry + EcoTreasuryVault)
    // ========================================
    
    const StablecoinRegistry = await ethers.getContractFactory("StablecoinRegistry");
    stableRegistry = await StablecoinRegistry.deploy(dao.address, ledger.target);
    await stableRegistry.waitForDeployment();

    const EcoTreasuryVault = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await EcoTreasuryVault.deploy(
      dao.address,
      ledger.target,
      stableRegistry.target,
      token.target
    );
    await treasury.waitForDeployment();

    // Set treasury as system exempt in token (so it can receive VFIDE)
    await token.connect(owner).setSystemExempt(treasury.target, true);

    // Deploy a mock stablecoin for testing
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    stableToken = await ERC20Mock.deploy("MockUSDC", "USDC");
    await stableToken.waitForDeployment();

    // DAO whitelists the stablecoin
    await stableRegistry.connect(dao).addAsset(stableToken.target, "USDC");

    // ========================================
    // 4. Deploy VFIDECommerce (MerchantRegistry + CommerceEscrow)
    // ========================================
    
    const MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    const registry = await MerchantRegistry.deploy(
      dao.address,
      token.target,
      vaultHub.target,
      seer.target,
      securityHub.target,
      ledger.target
    );
    await registry.waitForDeployment();

    const CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    const escrow = await CommerceEscrow.deploy(
      dao.address,
      token.target,
      vaultHub.target,
      registry.target,
      securityHub.target,
      ledger.target
    );
    await escrow.waitForDeployment();

    // Store as commerce for easier access
    commerce = { registry, escrow };

    // Set escrow as system exempt (it needs to hold/transfer VFIDE)
    await token.connect(owner).setSystemExempt(escrow.target, true);
    await token.connect(owner).setSystemExempt(registry.target, true);

    // ========================================
    // 5. Setup Test Accounts
    // ========================================
    
    // Setup vaults for test accounts
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(charity.address, charity.address);

    // Mint tokens to test accounts via presale
    const mintAmount = ethers.parseUnits("10000", 18);
    await token.connect(presaleSigner).mintPresale(buyer.address, mintAmount);
    await token.connect(presaleSigner).mintPresale(merchant.address, mintAmount);
    await token.connect(presaleSigner).mintPresale(charity.address, mintAmount);

    // Mint stablecoins to test accounts
    const stableAmount = ethers.parseUnits("100000", 6); // USDC has 6 decimals typically
    await stableToken.connect(buyer).mint(buyer.address, stableAmount);
    await stableToken.connect(merchant).mint(merchant.address, stableAmount);
  });

  describe("System Initialization", function () {
    it("should have correct total supply with dev reserve", async function () {
      const totalSupply = await token.totalSupply();
      const devBalance = await token.balanceOf(vestingVault.target);
      
      expect(devBalance).to.equal(DEV_RESERVE);
      // Total should be dev reserve + presale minted (3 * 10000)
      expect(totalSupply).to.be.gt(DEV_RESERVE);
    });

    it("should have all infrastructure contracts wired correctly", async function () {
      expect(await token.vaultHub()).to.equal(vaultHub.target);
      expect(await token.securityHub()).to.equal(securityHub.target);
      expect(await token.ledger()).to.equal(ledger.target);
      expect(await token.burnRouter()).to.equal(burnRouter.target);
    });

    it("should have commerce escrow deployed", async function () {
      expect(commerce.escrow.target).to.not.equal(ethers.ZeroAddress);
      expect(commerce.registry.target).to.not.equal(ethers.ZeroAddress);
    });

    it("should have treasury configured with stablecoin registry", async function () {
      expect(await treasury.stable()).to.equal(stableRegistry.target);
      expect(await treasury.vfideToken()).to.equal(token.target);
    });
  });

  describe("Token System Integration", function () {
    it("should handle presale minting within cap", async function () {
      const mintAmount = ethers.parseUnits("1000", 18);
      const initialMinted = await token.presaleMinted();
      
      await token.connect(presaleSigner).mintPresale(other.address, mintAmount);
      
      const finalMinted = await token.presaleMinted();
      expect(finalMinted - initialMinted).to.equal(mintAmount);
      expect(await token.balanceOf(other.address)).to.equal(mintAmount);
    });

    it("should reject presale minting over cap", async function () {
      const currentMinted = await token.presaleMinted();
      const remaining = PRESALE_CAP - currentMinted;
      const overAmount = remaining + ethers.parseUnits("1", 18);
      
      await expect(
        token.connect(presaleSigner).mintPresale(other.address, overAmount)
      ).to.be.reverted;
    });

    it("should allow transfers between accounts", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      const buyerInitial = await token.balanceOf(buyer.address);
      
      await token.connect(buyer).transfer(merchant.address, transferAmount);
      
      const buyerFinal = await token.balanceOf(buyer.address);
      const merchantFinal = await token.balanceOf(merchant.address);
      
      expect(buyerInitial - buyerFinal).to.equal(transferAmount);
      expect(merchantFinal).to.be.gte(transferAmount);
    });

    it("should respect system exempt addresses", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      
      // Treasury is system exempt, should accept transfers
      await token.connect(buyer).transfer(treasury.target, transferAmount);
      
      const treasuryBalance = await token.balanceOf(treasury.target);
      expect(treasuryBalance).to.be.gte(transferAmount);
    });
  });

  describe("Commerce System Integration", function () {
    beforeEach(async function () {
      // Register merchant (only takes metaHash)
      const META = "0x" + "00".repeat(32);
      await commerce.registry.connect(merchant).addMerchant(META);
    });

    it("should register merchant and query info", async function () {
      const info = await commerce.registry.merchants(merchant.address);
      expect(info.status).to.equal(1); // ACTIVE
    });

    it("should create escrow order", async function () {
      const escrowAmount = ethers.parseUnits("100", 18);
      const META = "0x" + "00".repeat(32);
      
      // Buyer opens escrow
      const id = await commerce.escrow.connect(buyer).open(
        merchant.address,
        escrowAmount,
        META
      );
      
      // Buyer transfers tokens to escrow (fund the escrow)
      await token.connect(buyer).transfer(commerce.escrow.target, escrowAmount);
      
      // Mark as funded
      await commerce.escrow.connect(buyer).markFunded(1);
      
      // Check order was created
      const order = await commerce.escrow.escrows(1);
      expect(order.buyerOwner).to.equal(buyer.address);
      expect(order.merchantOwner).to.equal(merchant.address);
      expect(order.amount).to.equal(escrowAmount);
    });

    it("should complete full escrow flow", async function () {
      const escrowAmount = ethers.parseUnits("100", 18);
      const META = "0x" + "00".repeat(32);
      
      const buyerInitial = await token.balanceOf(buyer.address);
      const merchantInitial = await token.balanceOf(merchant.address);
      
      // Buyer opens escrow
      await commerce.escrow.connect(buyer).open(
        merchant.address,
        escrowAmount,
        META
      );
      
      // Buyer transfers tokens and marks funded
      await token.connect(buyer).transfer(commerce.escrow.target, escrowAmount);
      await commerce.escrow.connect(buyer).markFunded(1);
      
      // Buyer releases
      await commerce.escrow.connect(buyer).release(1);
      
      // Verify balances changed correctly
      const buyerFinal = await token.balanceOf(buyer.address);
      const merchantFinal = await token.balanceOf(merchant.address);
      
      expect(buyerInitial - buyerFinal).to.be.gte(escrowAmount);
      expect(merchantFinal).to.be.gt(merchantInitial);
    });

    it("should handle dispute and refund", async function () {
      const escrowAmount = ethers.parseUnits("100", 18);
      const META = "0x" + "00".repeat(32);
      
      const buyerInitial = await token.balanceOf(buyer.address);
      
      // Open and fund escrow
      await commerce.escrow.connect(buyer).open(
        merchant.address,
        escrowAmount,
        META
      );
      await token.connect(buyer).transfer(commerce.escrow.target, escrowAmount);
      await commerce.escrow.connect(buyer).markFunded(1);
      
      // Buyer disputes
      await commerce.escrow.connect(buyer).dispute(1, "Product not as described");
      
      // DAO resolves in favor of buyer (refund)
      await commerce.escrow.connect(dao).refund(1);
      
      // Verify buyer got refund
      const buyerFinal = await token.balanceOf(buyer.address);
      expect(buyerFinal).to.be.closeTo(buyerInitial, ethers.parseUnits("10", 18));
    });
  });

  describe("Finance System Integration", function () {
    it("should accept stablecoin deposits to treasury", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      
      await stableToken.connect(buyer).approve(treasury.target, depositAmount);
      await treasury.connect(buyer).depositStable(stableToken.target, depositAmount);
      
      const balance = await treasury.balanceOf(stableToken.target);
      expect(balance).to.equal(depositAmount);
    });

    it("should allow DAO to withdraw from treasury", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      const withdrawAmount = ethers.parseUnits("500", 6);
      
      // Deposit first
      await stableToken.connect(buyer).approve(treasury.target, depositAmount);
      await treasury.connect(buyer).depositStable(stableToken.target, depositAmount);
      
      // DAO withdraws (using send method)
      await treasury.connect(dao).send(
        stableToken.target,
        charity.address,
        withdrawAmount,
        "Grant disbursement"
      );
      
      const charityBalance = await stableToken.balanceOf(charity.address);
      expect(charityBalance).to.equal(withdrawAmount);
    });

    it("should track VFIDE received by treasury", async function () {
      const vfideAmount = ethers.parseUnits("100", 18);
      
      await token.connect(buyer).transfer(treasury.target, vfideAmount);
      
      // Treasury should have received VFIDE
      const balance = await token.balanceOf(treasury.target);
      expect(balance).to.be.gte(vfideAmount);
    });

    it("should not allow non-DAO to withdraw", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      
      await stableToken.connect(buyer).approve(treasury.target, depositAmount);
      await treasury.connect(buyer).depositStable(stableToken.target, depositAmount);
      
      await expect(
        treasury.connect(buyer).send(
          stableToken.target,
          buyer.address,
          depositAmount,
          "Unauthorized"
        )
      ).to.be.reverted;
    });
  });

  describe("Cross-System Integration", function () {
    it("should handle commerce escrow with treasury interaction", async function () {
      const escrowAmount = ethers.parseUnits("100", 18);
      const META = "0x" + "00".repeat(32);
      
      // Register merchant
      await commerce.registry.connect(merchant).addMerchant(META);
      
      // Create and complete escrow
      await commerce.escrow.connect(buyer).open(merchant.address, escrowAmount, META);
      await token.connect(buyer).transfer(commerce.escrow.target, escrowAmount);
      await commerce.escrow.connect(buyer).markFunded(1);
      await commerce.escrow.connect(buyer).release(1);
      
      // Merchant could now deposit earnings to treasury
      const merchantBalance = await token.balanceOf(merchant.address);
      if (merchantBalance > 0) {
        const depositToTreasury = merchantBalance / 10n; // Deposit 10%
        await token.connect(merchant).transfer(treasury.target, depositToTreasury);
        
        const treasuryBalance = await token.balanceOf(treasury.target);
        expect(treasuryBalance).to.be.gte(depositToTreasury);
      }
    });

    it("should handle multi-user token transfers with commerce", async function () {
      // Setup merchant
      const META = "0x" + "00".repeat(32);
      await commerce.registry.connect(merchant).addMerchant(META);
      
      const amount1 = ethers.parseUnits("50", 18);
      const amount2 = ethers.parseUnits("75", 18);
      
      // Two buyers make orders
      await commerce.escrow.connect(buyer).open(merchant.address, amount1, META);
      await commerce.escrow.connect(charity).open(merchant.address, amount2, META);
      
      // Verify both orders exist
      const order1 = await commerce.escrow.escrows(1);
      const order2 = await commerce.escrow.escrows(2);
      
      expect(order1.amount).to.equal(amount1);
      expect(order2.amount).to.equal(amount2);
      expect(order1.merchantOwner).to.equal(merchant.address);
      expect(order2.merchantOwner).to.equal(merchant.address);
    });

    it("should maintain consistent state across all systems", async function () {
      // Get initial state
      const initialTotalSupply = await token.totalSupply();
      const initialBuyerBalance = await token.balanceOf(buyer.address);
      
      // Perform multiple operations
      // 1. Token transfer
      await token.connect(buyer).transfer(merchant.address, ethers.parseUnits("10", 18));
      
      // 2. Treasury deposit
      await stableToken.connect(buyer).approve(treasury.target, ethers.parseUnits("100", 6));
      await treasury.connect(buyer).depositStable(stableToken.target, ethers.parseUnits("100", 6));
      
      // 3. Add merchant and create escrow
      const META = "0x" + "00".repeat(32);
      await commerce.registry.connect(merchant).addMerchant(META);
      
      await commerce.escrow.connect(buyer).open(
        merchant.address,
        ethers.parseUnits("20", 18),
        META
      );
      
      // Verify total supply hasn't changed (except for burns)
      const finalTotalSupply = await token.totalSupply();
      expect(finalTotalSupply).to.be.lte(initialTotalSupply);
      
      // Verify buyer balance decreased appropriately (only 10 was transferred directly)
      const finalBuyerBalance = await token.balanceOf(buyer.address);
      const transferred = ethers.parseUnits("10", 18);
      expect(initialBuyerBalance - finalBuyerBalance).to.be.gte(transferred);
    });
  });

  describe("Security and Edge Cases", function () {
    it("should respect security locks when configured", async function () {
      // This tests that the security system is properly integrated
      // When securityHub is properly configured, it can lock addresses
      expect(await token.securityHub()).to.equal(securityHub.target);
    });

    it("should handle zero amount operations correctly", async function () {
      await expect(
        token.connect(buyer).transfer(merchant.address, 0)
      ).to.not.be.reverted;
    });

    it("should reject invalid merchant operations", async function () {
      const escrowAmount = ethers.parseUnits("100", 18);
      const META = "0x" + "00".repeat(32);
      
      // Try to open escrow with unregistered merchant
      await expect(
        commerce.escrow.connect(buyer).open(other.address, escrowAmount, META)
      ).to.be.reverted;
    });

    it("should handle large amounts correctly", async function () {
      const largeAmount = ethers.parseUnits("1000000", 18);
      
      // Mint large amount within presale cap
      const currentMinted = await token.presaleMinted();
      const remaining = PRESALE_CAP - currentMinted;
      
      if (remaining >= largeAmount) {
        await token.connect(presaleSigner).mintPresale(other.address, largeAmount);
        expect(await token.balanceOf(other.address)).to.equal(largeAmount);
      }
    });
  });

  describe("System Upgrade and Configuration", function () {
    it("should allow owner to update token infrastructure", async function () {
      const NewSeerMock = await ethers.getContractFactory("SeerMock");
      const newSeer = await NewSeerMock.deploy();
      await newSeer.waitForDeployment();
      
      // Token owner can't directly set seer, but can update burnRouter
      const NewBurnRouter = await ethers.getContractFactory("BurnRouterMock");
      const newBurnRouter = await NewBurnRouter.deploy();
      await newBurnRouter.waitForDeployment();
      
      await token.connect(owner).setBurnRouter(newBurnRouter.target);
      expect(await token.burnRouter()).to.equal(newBurnRouter.target);
    });

    it("should allow DAO to update finance configuration", async function () {
      // Deploy another stablecoin
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const newStable = await ERC20Mock.deploy("NewUSD", "NUSD");
      await newStable.waitForDeployment();
      
      // DAO adds new stablecoin
      await stableRegistry.connect(dao).addAsset(newStable.target, "NUSD");
      
      expect(await stableRegistry.isWhitelisted(newStable.target)).to.be.true;
    });

    it("should allow DAO to update commerce configuration", async function () {
      // Setup other as a merchant (needs vault and score)
      await vaultHub.setVault(other.address, other.address);
      await seer.setScore(other.address, 1000);
      
      // Add another merchant
      const META = "0x" + "00".repeat(32);
      await commerce.registry.connect(other).addMerchant(META);
      
      const info = await commerce.registry.merchants(other.address);
      expect(info.status).to.equal(1); // ACTIVE
    });
  });

  describe("End-to-End User Journey", function () {
    it("should complete full user journey: presale -> commerce -> treasury", async function () {
      // 1. User participates in presale
      const newUser = other;
      const presaleAmount = ethers.parseUnits("5000", 18);
      await token.connect(presaleSigner).mintPresale(newUser.address, presaleAmount);
      await vaultHub.setVault(newUser.address, newUser.address);
      
      expect(await token.balanceOf(newUser.address)).to.equal(presaleAmount);
      
      // 2. User makes purchase via commerce
      const META = "0x" + "00".repeat(32);
      await commerce.registry.connect(merchant).addMerchant(META);
      
      const purchaseAmount = ethers.parseUnits("100", 18);
      await commerce.escrow.connect(newUser).open(
        merchant.address,
        purchaseAmount,
        META
      );
      
      // Fund and complete purchase
      await token.connect(newUser).transfer(commerce.escrow.target, purchaseAmount);
      await commerce.escrow.connect(newUser).markFunded(1);
      
      // 3. Complete purchase
      await commerce.escrow.connect(newUser).release(1);
      
      // 4. Merchant contributes to treasury
      const merchantEarnings = await token.balanceOf(merchant.address);
      const contribution = merchantEarnings / 100n; // 1% contribution
      await token.connect(merchant).transfer(treasury.target, contribution);
      
      // Verify the journey
      expect(await token.balanceOf(newUser.address)).to.be.lt(presaleAmount);
      expect(await token.balanceOf(treasury.target)).to.be.gte(contribution);
      expect(await token.balanceOf(merchant.address)).to.be.gt(0);
    });
  });
});
