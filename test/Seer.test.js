const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Seer Contract Tests', function () {
  this.timeout(300000);

  let seer, dao, user1, user2, vaultHub;
  let ledger;

  beforeEach(async function () {
    [dao, user1, user2] = await ethers.getSigners();

    // Mock Ledger
    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    // Mock VaultHub
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();

    // Deploy Seer
    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(dao.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set DAO correctly', async function () {
      expect(await seer.dao()).to.equal(dao.address);
    });

    it('should have correct constants', async function () {
      expect(await seer.NEUTRAL()).to.equal(5000);
      expect(await seer.MIN_SCORE()).to.equal(10);
      expect(await seer.MAX_SCORE()).to.equal(10000);
    });

    it('should revert if deploying with zero DAO', async function () {
      const Seer = await ethers.getContractFactory("Seer");
      await expect(Seer.deploy(ethers.ZeroAddress, await ledger.getAddress(), await vaultHub.getAddress()))
        .to.be.revertedWithCustomError(seer, 'TRUST_Zero');
    });
  });

  describe('Module Configuration', function () {
    it('should allow DAO to set modules', async function () {
      const newLedger = await (await ethers.getContractFactory('LedgerMock')).deploy(false);
      const newHub = await (await ethers.getContractFactory('VaultHubMock')).deploy();

      await expect(seer.connect(dao).setModules(await newLedger.getAddress(), await newHub.getAddress()))
        .to.emit(seer, 'LedgerSet')
        .withArgs(await newLedger.getAddress())
        .to.emit(seer, 'HubSet')
        .withArgs(await newHub.getAddress());
        
      expect(await seer.ledger()).to.equal(await newLedger.getAddress());
      expect(await seer.vaultHub()).to.equal(await newHub.getAddress());
    });

    it('should revert if non-DAO tries to set modules', async function () {
      await expect(
        seer.connect(user1).setModules(await ledger.getAddress(), await vaultHub.getAddress())
      ).to.be.revertedWithCustomError(seer, 'TRUST_NotDAO');
    });

    it('should revert if setting modules to zero', async function () {
      await expect(
        seer.connect(dao).setModules(ethers.ZeroAddress, await vaultHub.getAddress())
      ).to.be.revertedWithCustomError(seer, 'TRUST_Zero');
    });
  });

  describe('Threshold Configuration', function () {
    it('should allow DAO to set thresholds', async function () {
      // low, high, minGov, minMerch
      await expect(seer.connect(dao).setThresholds(1000, 9000, 3000, 3000))
        .to.emit(seer, 'ThresholdsSet')
        .withArgs(1000, 9000, 3000, 3000);

      expect(await seer.lowTrustThreshold()).to.equal(1000);
      expect(await seer.highTrustThreshold()).to.equal(9000);
      expect(await seer.minForGovernance()).to.equal(3000);
      expect(await seer.minForMerchant()).to.equal(3000);
    });

    it('should revert if non-DAO tries to set thresholds', async function () {
      await expect(
        seer.connect(user1).setThresholds(1000, 9000, 3000, 3000)
      ).to.be.revertedWithCustomError(seer, 'TRUST_NotDAO');
    });
    
    it('should revert if low > high', async function () {
      await expect(
        seer.connect(dao).setThresholds(800, 300, 600, 600)
      ).to.be.revertedWithCustomError(seer, 'TRUST_Bounds');
    });
  });

  describe('Score Management', function () {
    it('should return neutral score for uninitialized user', async function () {
      expect(await seer.getScore(user1.address)).to.equal(5000);
    });

    it('should allow DAO to set score directly', async function () {
      await expect(seer.connect(dao).setScore(user1.address, 750, "Good behavior"))
        .to.emit(seer, 'ScoreSet');

      expect(await seer.getScore(user1.address)).to.equal(750);
    });

    it('should revert if non-DAO tries to set score', async function () {
      await expect(
        seer.connect(user1).setScore(user1.address, 750, "Self promotion")
      ).to.be.revertedWithCustomError(seer, 'TRUST_NotDAO');
    });
    
    it('should reward user', async function () {
      // Set baseline score first
      await seer.connect(dao).setScore(user1.address, 500, "baseline");
      const before = await seer.getScore(user1.address);
      await expect(seer.connect(dao).reward(user1.address, 50, "Bonus"))
        .to.emit(seer, 'ScoreSet');
        
      expect(await seer.getScore(user1.address)).to.equal(Number(before) + 50);
    });
    
    it('should punish user', async function () {
      // Set baseline score first
      await seer.connect(dao).setScore(user1.address, 500, "baseline");
      const before = await seer.getScore(user1.address);
      await expect(seer.connect(dao).punish(user1.address, 50, "Penalty"))
        .to.emit(seer, 'ScoreSet');
        
      expect(await seer.getScore(user1.address)).to.equal(Number(before) - 50);
    });
    
    it('should clamp score to max', async function () {
      await seer.connect(dao).setScore(user1.address, 9900, "High");
      // Allow a large single delta in tests (subject to contract caps)
      await seer.connect(dao).setOperatorLimits(500, 1000);
      await seer.connect(dao).reward(user1.address, 500, "Overflow");
      // Score should be clamped to MAX_SCORE (10000)
      expect(await seer.getScore(user1.address)).to.equal(10000);
    });
    
    it('should clamp score to min', async function () {
      await seer.connect(dao).setScore(user1.address, 100, "Low");
      await seer.connect(dao).setOperatorLimits(500, 1000);
      await seer.connect(dao).punish(user1.address, 500, "Underflow");
      // Score should be clamped to MIN_SCORE (10)
      expect(await seer.getScore(user1.address)).to.equal(10);
    });
  });
});
