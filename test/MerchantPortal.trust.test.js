const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MerchantPortal Continuous Trust', function () {
  this.timeout(300000);

  let seer, dao, merchant, customer, vaultHub, token, ledger, portal;

  beforeEach(async function () {
    [dao, merchant, customer] = await ethers.getSigners();

    // Mock Ledger
    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    // Mock VaultHub
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();

    // Mock Token
    const Token = await ethers.getContractFactory('ERC20Mock');
    token = await Token.deploy("VFIDE", "VFIDE");
    await token.mint(dao.address, ethers.parseEther("1000000")); // 1M tokens

    // Deploy Seer
    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(dao.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();
    await seer.setModules(await ledger.getAddress(), await vaultHub.getAddress(), await token.getAddress());

    // Deploy MerchantPortal
    const Portal = await ethers.getContractFactory("MerchantPortal");
    portal = await Portal.deploy(
        dao.address,
        await vaultHub.getAddress(),
        await seer.getAddress(),
        ethers.ZeroAddress, // SecurityHub
        await ledger.getAddress(),
        dao.address // FeeSink
    );
    await portal.waitForDeployment();

    // Setup:
    // 1. Set min merchant score to 600
    await seer.setThresholds(350, 700, 540, 600);
    
    // 2. Give merchant a score of 700 (via manual override for simplicity)
    await seer.setScore(merchant.address, 700, "Initial Trust");
    
    // 3. Register merchant
    await portal.connect(merchant).registerMerchant("Test Shop", "Retail");
    
    // 4. Setup customer vault and tokens
    await vaultHub.setVault(customer.address, await vaultHub.ensureVault(customer.address));
    await token.transfer(await vaultHub.vaultOf(customer.address), ethers.parseEther("1000"));
    
    // 5. Approve portal
    // Note: In real system, vault approves portal. Here we mock it or assume approval logic in mock vault.
    // The ERC20Mock doesn't check allowance if we use transferFrom? No, it does.
    // We need to approve from the vault.
    // Since we can't easily control the mock vault to approve, we'll use a trick or assume the mock vault is simple.
    // Actually, the VaultHubMock just returns an address. If that address is an EOA (like a random wallet), we can control it.
    // Let's make the customer's vault a signer we control.
    const customerVaultSigner = await ethers.getImpersonatedSigner(await vaultHub.vaultOf(customer.address));
    // Wait, we can't impersonate random addresses easily in hardhat without setup.
    // Let's just set the vault to be 'customer' address itself for this test, or 'dao'.
    // But MerchantPortal calls transferFrom(customerVault, ...).
    // If customerVault == customer.address, then customer calls approve.
    await vaultHub.setVault(customer.address, customer.address);
    await token.connect(customer).approve(await portal.getAddress(), ethers.parseEther("1000"));
    
    // 6. Accept token
    await portal.connect(dao).setAcceptedToken(await token.getAddress(), true);
  });

  it('should allow payment when score is high', async function () {
    await expect(portal.connect(customer).pay(merchant.address, await token.getAddress(), 100, "Order1"))
      .to.emit(portal, "PaymentProcessed");
  });

  it('should BLOCK payment when score drops below threshold', async function () {
    // 1. Drop score to 500 (below 600)
    await seer.setScore(merchant.address, 500, "Bad Behavior");
    
    // 2. Attempt payment
    await expect(portal.connect(customer).pay(merchant.address, await token.getAddress(), 100, "Order2"))
      .to.be.revertedWithCustomError(portal, "MERCH_LowTrust");
  });
  
  it('should BLOCK merchant-initiated payment processing when score drops', async function () {
    // 1. Drop score
    await seer.setScore(merchant.address, 500, "Bad Behavior");
    
    // 2. Merchant tries to pull payment
    await expect(portal.connect(merchant).processPayment(customer.address, await token.getAddress(), 100, "Order3"))
      .to.be.revertedWithCustomError(portal, "MERCH_LowTrust");
  });
});
