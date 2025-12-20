const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('DAO Contract Tests', function () {
  this.timeout(300000);

  let dao, admin, proposer, voter1, voter2, voter3;
  let timelock, seer, vaultHub, hooks, ledger;

  beforeEach(async function () {
    [admin, proposer, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy mocks
    const Seer = await ethers.getContractFactory('SeerMock');
    seer = await Seer.deploy();

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();

    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    // Deploy DAO with placeholder timelock
    const DAO = await ethers.getContractFactory('DAO');
    // Manual deployment to avoid invalid overrides error
    const daoTx = await DAO.getDeployTransaction(admin.address, admin.address, await seer.getAddress(), await vaultHub.getAddress(), ethers.ZeroAddress);
    const daoResponse = await admin.sendTransaction(daoTx);
    const daoReceipt = await daoResponse.wait();
    dao = DAO.attach(daoReceipt.contractAddress);
    await dao.waitForDeployment();
    
    // Deploy timelock with DAO as admin
    const Timelock = await ethers.getContractFactory('DAOTimelock');
    // Manual deployment for Timelock
    const timelockTx = await Timelock.getDeployTransaction(await dao.getAddress());
    const timelockResponse = await admin.sendTransaction(timelockTx);
    const timelockReceipt = await timelockResponse.wait();
    timelock = Timelock.attach(timelockReceipt.contractAddress);
    await timelock.waitForDeployment();
    
    // Set timelock in DAO - correct parameter order: (timelock, seer, hub, hooks)
    await dao.connect(admin).setModules(await timelock.getAddress(), await seer.getAddress(), await vaultHub.getAddress(), ethers.ZeroAddress);
    
    // Lower quorum for testing
    await dao.connect(admin).setParams(3 * 24 * 60 * 60, 2);

    await seer.setMin(100);
    await seer.setScore(proposer.address, 150);
    await seer.setScore(voter1.address, 150);
    await seer.setScore(voter2.address, 150);
    await seer.setScore(voter3.address, 150);
    await vaultHub.setVault(proposer.address, proposer.address);
    await vaultHub.setVault(voter1.address, voter1.address);
    await vaultHub.setVault(voter2.address, voter2.address);
    await vaultHub.setVault(voter3.address, voter3.address);
  });

  describe('Deployment and Setup', function () {
    it('should set admin correctly', async function () {
      expect(await dao.admin()).to.equal(admin.address);
    });

    it('should set default voting period', async function () {
      expect(await dao.votingPeriod()).to.equal(3 * 24 * 60 * 60); // 3 days
    });

    it('should set default quorum', async function () {
      expect(await dao.minVotesRequired()).to.equal(2);
    });

    it('should allow admin to set modules', async function () {
      expect(await dao.seer()).to.equal(seer.target);
      expect(await dao.vaultHub()).to.equal(vaultHub.target);
    });

    it('should revert if non-admin tries to set admin', async function () {
      await expect(
        dao.connect(proposer).setAdmin(proposer.address)
      ).to.be.revertedWithCustomError(dao, 'DAO_NotAdmin');
    });
  });

  describe('Proposal Creation', function () {
    it('should create a proposal', async function () {
      const target = ethers.ZeroAddress;
      const value = 0;
      const data = '0x';
      const description = 'Test proposal';

      const tx = await dao.connect(proposer).propose(0, target, value, data, description);
      const receipt = await tx.wait();
      
      expect(receipt.logs.some(log => log.fragment?.name === 'ProposalCreated')).to.be.true;
    });

    it('should revert if proposer not eligible', async function () {
      const nonEligible = voter3;
      await seer.setScore(nonEligible.address, 50); // Below min

      await expect(
        dao.connect(nonEligible).propose(0, ethers.ZeroAddress, 0, '0x', 'Test')
      ).to.be.revertedWithCustomError(dao, 'DAO_NotEligible');
    });

    it('should revert if proposer has no vault', async function () {
      const [, , , , , noVault] = await ethers.getSigners();
      await seer.setScore(noVault.address, 150);

      await expect(
        dao.connect(noVault).propose(0, ethers.ZeroAddress, 0, '0x', 'Test')
      ).to.be.revertedWithCustomError(dao, 'DAO_NotEligible');
    });

    it('should allow zero target address', async function () {
      // Contract allows zero target - some proposal types may not need a target
      await expect(
        dao.connect(proposer).propose(0, ethers.ZeroAddress, 0, '0x', 'Test')
      ).to.not.be.reverted;
    });
  });

  describe('Voting', function () {
    let proposalId;

    beforeEach(async function () {
      const target = admin.address;
      const tx = await dao.connect(proposer).propose(0, target, 0, '0x', 'Test proposal');
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'ProposalCreated');
      proposalId = event.args[0];
    });

    it('should allow eligible voter to vote', async function () {
      await expect(dao.connect(voter1).vote(proposalId, true))
        .to.emit(dao, 'Voted')
        .withArgs(proposalId, voter1.address, true);
    });

    it('should revert if already voted', async function () {
      await dao.connect(voter1).vote(proposalId, true);
      
      await expect(
        dao.connect(voter1).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, 'DAO_AlreadyVoted');
    });

    it('should revert if not eligible to vote', async function () {
      const [, , , , , , notEligible] = await ethers.getSigners();
      
      await expect(
        dao.connect(notEligible).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, 'DAO_NotEligible');
    });

    it('should count votes correctly', async function () {
      await dao.connect(voter1).vote(proposalId, true);
      await dao.connect(voter2).vote(proposalId, true);
      await dao.connect(voter3).vote(proposalId, false);

      const proposal = await dao.proposals(proposalId);
      // Scores are 150 each. 
      // For: voter1 + voter2 = 300
      // Against: voter3 = 150
      expect(proposal.forVotes).to.equal(300);
      expect(proposal.againstVotes).to.equal(150);
    });
  });

  describe('Finalization', function () {
    let proposalId;

    beforeEach(async function () {
      const target = admin.address;
      const tx = await dao.connect(proposer).propose(0, target, 0, '0x', 'Test proposal');
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'ProposalCreated');
      proposalId = event.args[0];
    });

    it('should finalize passed proposal', async function () {
      await dao.connect(voter1).vote(proposalId, true);
      await dao.connect(voter2).vote(proposalId, true);

      // Fast forward past voting period
      await ethers.provider.send('evm_increaseTime', [3 * 24 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine');

      await expect(dao.finalize(proposalId))
        .to.emit(dao, 'Finalized')
        .withArgs(proposalId, true);
    });

    it('should finalize failed proposal', async function () {
      await dao.connect(voter1).vote(proposalId, false);
      await dao.connect(voter2).vote(proposalId, false);

      await ethers.provider.send('evm_increaseTime', [3 * 24 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine');

      await expect(dao.finalize(proposalId))
        .to.emit(dao, 'Finalized')
        .withArgs(proposalId, false);
    });

    it('should revert if voting not ended', async function () {
      await expect(
        dao.finalize(proposalId)
      ).to.be.revertedWith('early');
    });
  });

  describe('Parameter Updates', function () {
    it('should allow admin to update voting period', async function () {
      await expect(dao.connect(admin).setParams(7 * 24 * 60 * 60, 60))
        .to.emit(dao, 'ParamsSet')
        .withArgs(7 * 24 * 60 * 60, 60);

      expect(await dao.votingPeriod()).to.equal(7 * 24 * 60 * 60);
      expect(await dao.minVotesRequired()).to.equal(60);
    });

    it('should revert if non-admin tries to update params', async function () {
      await expect(
        dao.connect(proposer).setParams(7 * 24 * 60 * 60, 60)
      ).to.be.revertedWithCustomError(dao, 'DAO_NotAdmin');
    });
  });
});
