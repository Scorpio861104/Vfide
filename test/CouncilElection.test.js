const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CouncilElection Contract Tests', function () {
  this.timeout(300000);

  let council, dao, user1, user2, user3, candidate1, candidate2;
  let seer, vaultHub, ledger;

  beforeEach(async function () {
    [dao, user1, user2, user3, candidate1, candidate2] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory('SeerMock');
    seer = await Seer.deploy();

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();

    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    const Council = await ethers.getContractFactory('CouncilElection');
    // Manual deployment to avoid invalid overrides error
    const councilTx = await Council.getDeployTransaction(dao.address, seer.target, vaultHub.target, ledger.target);
    const councilResponse = await dao.sendTransaction(councilTx);
    const councilReceipt = await councilResponse.wait();
    council = Council.attach(councilReceipt.contractAddress);
    await council.waitForDeployment();

    await seer.setMin(100);
    // On 0-10000 scale, minCouncilScore is 7000, so candidates need >=7000
    await seer.setScore(candidate1.address, 7500);
    await seer.setScore(candidate2.address, 7600);
    await vaultHub.setVault(candidate1.address, candidate1.address);
    await vaultHub.setVault(candidate2.address, candidate2.address);
  });

  describe('Deployment', function () {
    it('should set DAO correctly', async function () {
      expect(await council.dao()).to.equal(dao.address);
    });

    it('should set default council size to 12', async function () {
      expect(await council.councilSize()).to.equal(12);
    });

    it('should set default term to 365 days', async function () {
      expect(await council.termSeconds()).to.equal(365 * 24 * 60 * 60);
    });

    it('should revert if deploying with zero addresses', async function () {
      const Council = await ethers.getContractFactory('CouncilElection');
      // Manual deployment for revert check
      const tx = await Council.getDeployTransaction(ethers.ZeroAddress, seer.target, vaultHub.target, ledger.target);
      await expect(dao.sendTransaction(tx))
        .to.be.revertedWithCustomError(council, 'CE_Zero');
    });
  });

  describe('Module Configuration', function () {
    it('should allow DAO to set modules', async function () {
      const Seer2 = await ethers.getContractFactory('SeerMock');
      const seer2 = await Seer2.deploy();

      await expect(council.connect(dao).setModules(dao.address, seer2.target, vaultHub.target, ledger.target))
        .to.emit(council, 'ModulesSet');
    });

    it('should revert if non-DAO tries to set modules', async function () {
      await expect(
        council.connect(user1).setModules(dao.address, seer.target, vaultHub.target, ledger.target)
      ).to.be.revertedWithCustomError(council, 'CE_NotDAO');
    });
  });

  describe('Parameter Configuration', function () {
    it('should allow DAO to set params', async function () {
      // minScore must be >= 5600 on 0-10000 scale
      await expect(council.connect(dao).setParams(15, 7000, 90 * 24 * 60 * 60, 7 * 24 * 60 * 60))
        .to.emit(council, 'ParamsSet')
        .withArgs(15, 7000, 90 * 24 * 60 * 60, 7 * 24 * 60 * 60);
    });

    it('should revert if setting council size to zero', async function () {
      await expect(
        council.connect(dao).setParams(0, 7000, 90 * 24 * 60 * 60, 7 * 24 * 60 * 60)
      ).to.be.revertedWithCustomError(council, 'CE_BadSize');
    });

    it('should revert if non-DAO tries to set params', async function () {
      await expect(
        council.connect(user1).setParams(15, 7000, 90 * 24 * 60 * 60, 7 * 24 * 60 * 60)
      ).to.be.revertedWithCustomError(council, 'CE_NotDAO');
    });
  });

  describe('Candidate Registration', function () {
    it('should allow eligible user to register', async function () {
      await expect(council.connect(candidate1).register())
        .to.emit(council, 'CandidateRegistered')
        .withArgs(candidate1.address);

      expect(await council.isCandidate(candidate1.address)).to.be.true;
    });

    it('should revert if not eligible (low score)', async function () {
      await seer.setScore(user1.address, 50);
      
      await expect(
        council.connect(user1).register()
      ).to.be.revertedWithCustomError(council, 'CE_NotEligible');
    });

    it('should revert if not eligible (no vault)', async function () {
      await seer.setScore(user2.address, 150);
      
      await expect(
        council.connect(user2).register()
      ).to.be.revertedWithCustomError(council, 'CE_NotEligible');
    });

    it('should allow candidate to unregister', async function () {
      await council.connect(candidate1).register();
      
      await expect(council.connect(candidate1).unregister())
        .to.emit(council, 'CandidateUnregistered')
        .withArgs(candidate1.address);

      expect(await council.isCandidate(candidate1.address)).to.be.false;
    });
  });

  describe('Council Setting', function () {
    beforeEach(async function () {
      await council.connect(candidate1).register();
      await council.connect(candidate2).register();
    });

    it('should allow DAO to set council', async function () {
      const members = [candidate1.address, candidate2.address];
      
      await expect(council.connect(dao).setCouncil(members))
        .to.emit(council, 'CouncilSet');

      expect(await council.isCouncil(candidate1.address)).to.be.true;
      expect(await council.isCouncil(candidate2.address)).to.be.true;
    });

    it('should revert if empty array', async function () {
      await expect(
        council.connect(dao).setCouncil([])
      ).to.be.revertedWithCustomError(council, 'CE_ArrayMismatch');
    });

    it('should revert if exceeds council size', async function () {
      const members = Array(13).fill(candidate1.address);
      
      await expect(
        council.connect(dao).setCouncil(members)
      ).to.be.revertedWithCustomError(council, 'CE_ArrayMismatch');
    });

    it('should revert if member not eligible', async function () {
      await seer.setScore(user1.address, 50);
      
      await expect(
        council.connect(dao).setCouncil([user1.address])
      ).to.be.revertedWithCustomError(council, 'CE_NotEligible');
    });

    it('should set term end correctly', async function () {
      const members = [candidate1.address];
      await council.connect(dao).setCouncil(members);

      const termEnd = await council.termEnd();
      expect(termEnd).to.be.gt(0);
    });
  });

  describe('Council Refresh', function () {
    beforeEach(async function () {
      const members = [candidate1.address, candidate2.address];
      await council.connect(dao).setCouncil(members);
    });

    it('should allow DAO to refresh council', async function () {
      await council.connect(dao).refreshCouncil([candidate1.address, candidate2.address]);
    });

    it('should revert if non-DAO tries to refresh', async function () {
      await expect(
        council.connect(user1).refreshCouncil([candidate1.address])
      ).to.be.revertedWithCustomError(council, 'CE_NotDAO');
    });
  });
});
