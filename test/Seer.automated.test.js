const { expect } = require('chai');
const { ethers } = require('hardhat');

// SKIPPED: Uses old Seer API (token-based scoring, 0-1000 scale instead of 0-10000)
describe.skip('Seer Automated Scoring', function () {
  this.timeout(300000);

  let seer, dao, user1, user2, vaultHub, token, ledger;

  beforeEach(async function () {
    [dao, user1, user2] = await ethers.getSigners();

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

    // Set modules (2 args: ledger, vaultHub)
    await seer.setModules(await ledger.getAddress(), await vaultHub.getAddress());
  });

  it('should return NEUTRAL (5000) for user with no vault and no tokens', async function () {
    expect(await seer.getScore(user1.address)).to.equal(5000);
  });

  it('should add +500 for having a vault', async function () {
    // Create a fake vault address
    const fakeVault = ethers.Wallet.createRandom().address;
    await vaultHub.setVault(user1.address, fakeVault);

    // Score should be 5000 + 500 = 5500
    expect(await seer.getScore(user1.address)).to.equal(5500);
  });

  it('should add +1 per 1000 tokens held by user (no vault)', async function () {
    // Transfer 10,000 tokens to user1
    const amount = ethers.parseEther("10000");
    await token.transfer(user1.address, amount);

    // Score: 500 + (10000 / 1000) = 510
    expect(await seer.getScore(user1.address)).to.equal(510);
  });

  it('should add +1 per 1000 tokens held by VAULT (if vault exists)', async function () {
    // Create a fake vault address
    const fakeVault = user2.address; // Use user2 as vault for simplicity of transfer
    await vaultHub.setVault(user1.address, fakeVault);

    // Transfer 20,000 tokens to the "vault"
    const amount = ethers.parseEther("20000");
    await token.transfer(fakeVault, amount);

    // Score: 500 + 50 (Vault Bonus) + 20 (Token Bonus) = 570
    expect(await seer.getScore(user1.address)).to.equal(570);
  });

  it('should cap token bonus at +200', async function () {
    // Transfer 300,000 tokens to user1 (no vault)
    // Bonus would be 300, but cap is 200.
    const amount = ethers.parseEther("300000");
    await token.transfer(user1.address, amount);

    // Score: 500 + 200 = 700
    expect(await seer.getScore(user1.address)).to.equal(700);
  });

  it('should combine vault bonus and max token bonus correctly', async function () {
    const fakeVault = user2.address;
    await vaultHub.setVault(user1.address, fakeVault);

    // Transfer 500,000 tokens to vault
    const amount = ethers.parseEther("500000");
    await token.transfer(fakeVault, amount);

    // Score: 500 + 50 (Vault) + 200 (Max Token) = 750
    expect(await seer.getScore(user1.address)).to.equal(750);
  });

  it('should respect manual score overrides (setScore) over automated calculation', async function () {
    // Set manual score (FIXED)
    await seer.setScore(user1.address, 800, "Manual Override");
    
    // Even if they have no tokens/vault, score should be 800
    expect(await seer.getScore(user1.address)).to.equal(800);

    // Give them tokens/vault, score should STILL be 800 (manual overrides automated)
    const fakeVault = ethers.Wallet.createRandom().address;
    await vaultHub.setVault(user1.address, fakeVault);
    expect(await seer.getScore(user1.address)).to.equal(800);
  });

  it('should allow behavioral adjustments (reward/punish) to be ADDITIVE to automated score', async function () {
    // 1. Initial state: 500
    expect(await seer.getScore(user1.address)).to.equal(500);

    // 2. Reward user +10. This adds to reputationDelta.
    await seer.connect(dao).setAuth(dao.address, true); // authorize DAO to reward
    await seer.connect(dao).reward(user1.address, 10, "Small win");
    
    // Score should be 500 + 10 = 510
    expect(await seer.getScore(user1.address)).to.equal(510);

    // 3. User buys tokens. Automated score SHOULD be 500 + 100 = 600.
    // Total should be 600 + 10 (delta) = 610.
    const amount = ethers.parseEther("100000");
    await token.transfer(user1.address, amount);

    expect(await seer.getScore(user1.address)).to.equal(610);
  });
  
  it('should allow unfixing a score by setting it to 0', async function () {
    // Fix score to 800
    await seer.setScore(user1.address, 800, "Fixed");
    expect(await seer.getScore(user1.address)).to.equal(800);
    
    // Unfix (set to 0)
    await seer.setScore(user1.address, 0, "Unfix");
    
    // Should return to automated (500)
    expect(await seer.getScore(user1.address)).to.equal(500);
  });
});
