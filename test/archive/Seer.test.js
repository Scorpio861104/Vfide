const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Seer Contract Tests', function () {
  this.timeout(300000);

  let seer, dao, user1, user2, vault1;
  let ledger, panicGuard, burnRouter;

  beforeEach(async function () {
    [dao, user1, user2, vault1] = await ethers.getSigners();

    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    // Seer constructor needs: dao, ledger, panic, burn
    const Seer = await ethers.getContractFactory("contracts-min/Seer.sol:Seer");
    seer = await Seer.deploy(dao.address, ledger.target, ethers.ZeroAddress, ethers.ZeroAddress);
  });

  describe('Deployment', function () {
    it('should set DAO correctly', async function () {
      expect(await seer.dao()).to.equal(dao.address);
    });

    it('should set default base score to 500', async function () {
      expect(await seer.baseScore()).to.equal(500);
    });

    it('should set default min score to 100', async function () {
      expect(await seer.minScore()).to.equal(100);
    });

    it('should set default max score to 1000', async function () {
      expect(await seer.maxScore()).to.equal(1000);
    });

    it('should revert if deploying with zero DAO', async function () {
      const Seer = await ethers.getContractFactory("contracts-min/Seer.sol:Seer");
      await expect(Seer.deploy(ethers.ZeroAddress, ledger.target, ethers.ZeroAddress, ethers.ZeroAddress))
        .to.be.reverted;
    });
  });

  describe('Module Configuration', function () {
    it('should allow DAO to set modules', async function () {
      await expect(seer.connect(dao).setModules(dao.address, ledger.target, user1.address, user2.address))
        .to.emit(seer, 'ModulesSet')
        .withArgs(dao.address, ledger.target, user1.address, user2.address);
    });

    it('should revert if non-DAO tries to set modules', async function () {
      await expect(
        seer.connect(user1).setModules(dao.address, ledger.target, ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(seer, 'SEER_NotDAO');
    });

    it('should revert if setting DAO to zero', async function () {
      await expect(
        seer.connect(dao).setModules(ethers.ZeroAddress, ledger.target, ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(seer, 'SEER_Zero');
    });
  });

  describe('Policy Configuration', function () {
    it('should allow DAO to set policy', async function () {
      await expect(seer.connect(dao).setPolicy(600, 150, 1200))
        .to.emit(seer, 'PolicySet')
        .withArgs(600, 150, 1200);

      expect(await seer.baseScore()).to.equal(600);
      expect(await seer.minScore()).to.equal(150);
      expect(await seer.maxScore()).to.equal(1200);
    });

    it('should revert if non-DAO tries to set policy', async function () {
      await expect(
        seer.connect(user1).setPolicy(600, 150, 1200)
      ).to.be.revertedWithCustomError(seer, 'SEER_NotDAO');
    });
  });

  describe('Score Management', function () {
    it('should initialize user with base score', async function () {
      await expect(seer.connect(dao).initUser(user1.address))
        .to.emit(seer, 'ScoreSet')
        .withArgs(user1.address, 0, 500);

      const profile = await seer.profiles(user1.address);
      expect(profile.score).to.equal(500);
    });

    it('should allow DAO to set score directly', async function () {
      await expect(seer.connect(dao).setScore(user1.address, 750))
        .to.emit(seer, 'ScoreSet')
        .withArgs(user1.address, 0, 750);

      const profile = await seer.profiles(user1.address);
      expect(profile.score).to.equal(750);
    });

    it('should revert if non-DAO tries to set score', async function () {
      await expect(
        seer.connect(user1).setScore(user2.address, 750)
      ).to.be.revertedWithCustomError(seer, 'SEER_NotDAO');
    });

    it('should get score correctly', async function () {
      await seer.connect(dao).setScore(user1.address, 750);
      expect(await seer.getScore(user1.address)).to.equal(750);
    });

    it('should return base score for uninitialized user', async function () {
      expect(await seer.getScore(user1.address)).to.equal(500);
    });
  });

  describe('Governance Checks', function () {
    it('should check if user meets min score for governance', async function () {
      await seer.connect(dao).setScore(user1.address, 150);
      expect(await seer.meetsMinForGovernance(user1.address)).to.be.true;
    });

    it('should fail if user below min score', async function () {
      await seer.connect(dao).setScore(user1.address, 50);
      expect(await seer.meetsMinForGovernance(user1.address)).to.be.false;
    });

    it('should return minForGovernance value', async function () {
      expect(await seer.minForGovernance()).to.equal(100);
    });
  });

  describe('Commerce Checks', function () {
    it('should check if user meets min score for commerce', async function () {
      await seer.connect(dao).setScore(user1.address, 150);
      expect(await seer.meetsMinForCommerce(user1.address)).to.be.true;
    });

    it('should fail if user below min score', async function () {
      await seer.connect(dao).setScore(user1.address, 50);
      expect(await seer.meetsMinForCommerce(user1.address)).to.be.false;
    });

    it('should return minForCommerce value', async function () {
      expect(await seer.minForCommerce()).to.equal(100);
    });
  });

  describe('Flagging System', function () {
    it('should allow DAO to flag user', async function () {
      await expect(seer.connect(dao).flagUser(user1.address, 'suspicious activity', 3))
        .to.emit(seer, 'Flagged')
        .withArgs(user1.address, 'suspicious activity', 3);

      const profile = await seer.profiles(user1.address);
      expect(profile.flagged).to.be.true;
    });

    it('should revert if non-DAO tries to flag', async function () {
      await expect(
        seer.connect(user1).flagUser(user2.address, 'test', 1)
      ).to.be.revertedWithCustomError(seer, 'SEER_NotDAO');
    });

    it('should allow DAO to unflag user', async function () {
      await seer.connect(dao).flagUser(user1.address, 'test', 1);
      await seer.connect(dao).unflagUser(user1.address);

      const profile = await seer.profiles(user1.address);
      expect(profile.flagged).to.be.false;
    });

    it('should check if user is flagged', async function () {
      await seer.connect(dao).flagUser(user1.address, 'test', 1);
      expect(await seer.isFlagged(user1.address)).to.be.true;
    });
  });

  describe('Score Adjustments', function () {
    beforeEach(async function () {
      await seer.connect(dao).initUser(user1.address);
    });

    it('should increase score', async function () {
      await seer.connect(dao).adjustScore(user1.address, 100, true);
      expect(await seer.getScore(user1.address)).to.equal(600);
    });

    it('should decrease score', async function () {
      await seer.connect(dao).adjustScore(user1.address, 100, false);
      expect(await seer.getScore(user1.address)).to.equal(400);
    });

    it('should cap at max score', async function () {
      await seer.connect(dao).adjustScore(user1.address, 1000, true);
      expect(await seer.getScore(user1.address)).to.equal(1000);
    });

    it('should cap at min score', async function () {
      await seer.connect(dao).adjustScore(user1.address, 500, false);
      expect(await seer.getScore(user1.address)).to.equal(100);
    });

    it('should revert if non-DAO tries to adjust', async function () {
      await expect(
        seer.connect(user1).adjustScore(user2.address, 100, true)
      ).to.be.revertedWithCustomError(seer, 'SEER_NotDAO');
    });
  });

  describe('Batch Operations', function () {
    it('should initialize multiple users', async function () {
      await seer.connect(dao).initUser(user1.address);
      await seer.connect(dao).initUser(user2.address);

      expect(await seer.getScore(user1.address)).to.equal(500);
      expect(await seer.getScore(user2.address)).to.equal(500);
    });

    it('should handle multiple score updates', async function () {
      await seer.connect(dao).setScore(user1.address, 600);
      await seer.connect(dao).setScore(user2.address, 700);

      expect(await seer.getScore(user1.address)).to.equal(600);
      expect(await seer.getScore(user2.address)).to.equal(700);
    });
  });

  describe('Edge Cases', function () {
    it('should handle zero score setting', async function () {
      await expect(
        seer.connect(dao).setScore(user1.address, 0)
      ).to.be.revertedWithCustomError(seer, 'SEER_Zero');
    });

    it('should handle score updates for same user multiple times', async function () {
      await seer.connect(dao).setScore(user1.address, 600);
      await seer.connect(dao).setScore(user1.address, 700);
      await seer.connect(dao).setScore(user1.address, 800);

      expect(await seer.getScore(user1.address)).to.equal(800);
    });

    it('should track last update timestamp', async function () {
      await seer.connect(dao).setScore(user1.address, 600);
      const profile = await seer.profiles(user1.address);
      expect(profile.lastUpdate).to.be.gt(0);
    });
  });
});
