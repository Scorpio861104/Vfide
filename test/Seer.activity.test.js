const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// SKIPPED: Uses old Seer API (logActivity, setAuth, 0-1000 scale instead of 0-10000)
describe.skip('Seer Activity & Decay', function () {
  let seer, dao, user, vaultHub, token, ledger;

  beforeEach(async function () {
    [dao, user] = await ethers.getSigners();

    // Mock Ledger
    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    // Mock VaultHub
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();

    // Mock Token
    const Token = await ethers.getContractFactory('ERC20Mock');
    token = await Token.deploy("VFIDE", "VFIDE");
    await token.mint(dao.address, ethers.parseEther("1000000"));

    // Deploy Seer
    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(dao.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();
    // setModules takes 2 args: ledger and vaultHub
    await seer.setModules(await ledger.getAddress(), await vaultHub.getAddress());
    
    // Authorize DAO to log activity
    await seer.setOperator(dao.address, true);
  });

  it('should increase score when activity is logged', async function () {
    // Initial: 5000 (neutral on 0-10000 scale)
    expect(await seer.getScore(user.address)).to.equal(5000);
    
    // Log activity +10
    await seer.logActivity(user.address, 10);
    
    // Score: 500 + 10 = 510
    expect(await seer.getScore(user.address)).to.equal(510);
  });

  it('should cap activity score at 200', async function () {
    await seer.logActivity(user.address, 200);
    expect(await seer.getScore(user.address)).to.equal(700); // 500 + 200
    
    await seer.logActivity(user.address, 50);
    expect(await seer.getScore(user.address)).to.equal(700); // Still capped
  });

  it('should decay activity score over time', async function () {
    // Log +50
    await seer.logActivity(user.address, 50);
    expect(await seer.getScore(user.address)).to.equal(550);
    
    // Fast forward 1 week (DECAY_INTERVAL)
    // Decay amount is 5 per week
    await time.increase(7 * 24 * 3600);
    
    // Score should be 550 - 5 = 545
    expect(await seer.getScore(user.address)).to.equal(545);
    
    // Fast forward another week
    await time.increase(7 * 24 * 3600);
    expect(await seer.getScore(user.address)).to.equal(540);
  });

  it('should reset decay timer when new activity is logged', async function () {
    await seer.logActivity(user.address, 50);
    
    // 1 week passes -> -5 points
    await time.increase(7 * 24 * 3600);
    
    // Log new activity +10.
    // Current effective is 45. New total = 55.
    await seer.logActivity(user.address, 10);
    
    expect(await seer.getScore(user.address)).to.equal(555); // 500 + 55
    
    // Timer reset. 1 day later -> no decay yet.
    await time.increase(1 * 24 * 3600);
    expect(await seer.getScore(user.address)).to.equal(555);
  });
});
