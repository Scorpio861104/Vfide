const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('EmergencyControl Contract Tests', function () {
  this.timeout(300000);

  let emergency, dao, breaker, member1, member2, member3, user1;
  let ledger;

  beforeEach(async function () {
    [dao, member1, member2, member3, user1] = await ethers.getSigners();

    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    // Mock breaker
    const BreakerMock = await ethers.getContractFactory('EmergencyBreakerMock');
    breaker = await BreakerMock.deploy();

    const Emergency = await ethers.getContractFactory('EmergencyControl');
    // Manual deployment to avoid invalid overrides error
    const emergencyTx = await Emergency.getDeployTransaction(dao.address, breaker.target, ledger.target);
    const emergencyResponse = await dao.sendTransaction(emergencyTx);
    const emergencyReceipt = await emergencyResponse.wait();
    emergency = Emergency.attach(emergencyReceipt.contractAddress);
    await emergency.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set DAO correctly', async function () {
      expect(await emergency.dao()).to.equal(dao.address);
    });

    it('should set breaker correctly', async function () {
      expect(await emergency.breaker()).to.equal(breaker.target);
    });

    it('should set default cooldown to 5 minutes', async function () {
      expect(await emergency.minCooldown()).to.equal(5 * 60);
    });

    it('should revert if deploying with zero addresses', async function () {
      const Emergency = await ethers.getContractFactory('EmergencyControl');
      // Manual deployment for revert check
      const tx = await Emergency.getDeployTransaction(ethers.ZeroAddress, breaker.target, ledger.target);
      await expect(dao.sendTransaction(tx))
        .to.be.revertedWithCustomError(emergency, 'EC_Zero');
    });
  });

  describe('Module Configuration', function () {
    it('should allow DAO to set modules', async function () {
      const Ledger2 = await ethers.getContractFactory('LedgerMock');
      const ledger2 = await Ledger2.deploy(false);

      await expect(emergency.connect(dao).setModules(dao.address, breaker.target, ledger2.target))
        .to.emit(emergency, 'ModulesSet');
    });

    it('should revert if non-DAO tries to set modules', async function () {
      await expect(
        emergency.connect(user1).setModules(dao.address, breaker.target, ledger.target)
      ).to.be.revertedWithCustomError(emergency, 'EC_NotDAO');
    });
  });

  describe('Cooldown Configuration', function () {
    it('should allow DAO to set cooldown', async function () {
      await expect(emergency.connect(dao).setCooldown(10 * 60))
        .to.emit(emergency, 'CooldownSet')
        .withArgs(10 * 60);

      expect(await emergency.minCooldown()).to.equal(10 * 60);
    });

    it('should revert if non-DAO tries to set cooldown', async function () {
      await expect(
        emergency.connect(user1).setCooldown(10 * 60)
      ).to.be.revertedWithCustomError(emergency, 'EC_NotDAO');
    });
  });

  describe('Committee Management', function () {
    it('should allow DAO to add member', async function () {
      await expect(emergency.connect(dao).addMember(member1.address))
        .to.emit(emergency, 'MemberAdded')
        .withArgs(member1.address);

      expect(await emergency.isMember(member1.address)).to.be.true;
      expect(await emergency.memberCount()).to.equal(1);
    });

    it('should revert if adding zero address', async function () {
      await expect(
        emergency.connect(dao).addMember(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(emergency, 'EC_Zero');
    });

    it('should revert if adding duplicate member', async function () {
      await emergency.connect(dao).addMember(member1.address);
      
      await expect(
        emergency.connect(dao).addMember(member1.address)
      ).to.be.revertedWithCustomError(emergency, 'EC_AlreadyMember');
    });

    it('should allow DAO to remove member', async function () {
      await emergency.connect(dao).addMember(member1.address);
      
      await expect(emergency.connect(dao).removeMember(member1.address))
        .to.emit(emergency, 'MemberRemoved')
        .withArgs(member1.address);

      expect(await emergency.isMember(member1.address)).to.be.false;
      expect(await emergency.memberCount()).to.equal(0);
    });

    it('should revert if removing non-member', async function () {
      await expect(
        emergency.connect(dao).removeMember(member1.address)
      ).to.be.revertedWithCustomError(emergency, 'EC_NotMember');
    });

    it('should allow DAO to reset committee', async function () {
      const members = [member1.address, member2.address, member3.address];
      
      await expect(emergency.connect(dao).resetCommittee(2, members))
        .to.emit(emergency, 'CommitteeReset')
        .withArgs(2, members);

      expect(await emergency.threshold()).to.equal(2);
      expect(await emergency.memberCount()).to.equal(3);
    });

    it('should revert if threshold exceeds member count', async function () {
      const members = [member1.address, member2.address];
      
      await expect(
        emergency.connect(dao).resetCommittee(3, members)
      ).to.be.revertedWithCustomError(emergency, 'EC_BadThreshold');
    });
  });

  describe('Committee Voting', function () {
    beforeEach(async function () {
      const members = [member1.address, member2.address, member3.address];
      await emergency.connect(dao).resetCommittee(2, members);
    });

    it('should allow member to vote for halt', async function () {
      await expect(emergency.connect(member1).committeeVote(true, 'security issue'))
        .to.emit(emergency, 'CommitteeVote');

      expect(await emergency.hasVotedHalt(member1.address)).to.be.true;
      expect(await emergency.approvalsHalt()).to.equal(1);
    });

    it('should allow member to vote for unhalt', async function () {
      await expect(emergency.connect(member1).committeeVote(false, 'all clear'))
        .to.emit(emergency, 'CommitteeVote');

      expect(await emergency.hasVotedUnhalt(member1.address)).to.be.true;
      expect(await emergency.approvalsUnhalt()).to.equal(1);
    });

    it('should revert if non-member tries to vote', async function () {
      await expect(
        emergency.connect(user1).committeeVote(true, 'test')
      ).to.be.revertedWithCustomError(emergency, 'EC_NotMember');
    });

    it('should revert if member votes twice for same stance', async function () {
      await emergency.connect(member1).committeeVote(true, 'issue');
      
      await expect(
        emergency.connect(member1).committeeVote(true, 'issue')
      ).to.be.revertedWithCustomError(emergency, 'EC_AlreadyVoted');
    });

    it('should trigger when threshold reached', async function () {
      await emergency.connect(member1).committeeVote(true, 'issue');
      
      await expect(emergency.connect(member2).committeeVote(true, 'issue'))
        .to.emit(emergency, 'CommitteeTriggered')
        .withArgs(true, 'issue');
    });
  });

  describe('DAO Toggle', function () {
    it('should allow DAO to toggle halt', async function () {
      await expect(emergency.connect(dao).daoToggle(true, 'emergency'))
        .to.emit(emergency, 'DAOToggled')
        .withArgs(true, 'emergency');
    });

    it('should revert if non-DAO tries to toggle', async function () {
      await expect(
        emergency.connect(user1).daoToggle(true, 'emergency')
      ).to.be.revertedWithCustomError(emergency, 'EC_NotDAO');
    });

    it('should enforce cooldown', async function () {
      await emergency.connect(dao).daoToggle(true, 'emergency');
      
      await expect(
        emergency.connect(dao).daoToggle(false, 'all clear')
      ).to.be.revertedWithCustomError(emergency, 'EC_Cooldown');
    });

    it('should allow toggle after cooldown passes', async function () {
      await emergency.connect(dao).daoToggle(true, 'emergency');
      
      await ethers.provider.send('evm_increaseTime', [6 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(emergency.connect(dao).daoToggle(false, 'all clear'))
        .to.emit(emergency, 'DAOToggled');
    });
  });

  describe('Vote Reset', function () {
    beforeEach(async function () {
      const members = [member1.address, member2.address, member3.address];
      await emergency.connect(dao).resetCommittee(2, members);
      await emergency.connect(member1).committeeVote(true, 'issue');
    });

    it('should allow DAO to reset votes', async function () {
      await emergency.connect(dao).resetVotes();

      expect(await emergency.hasVotedHalt(member1.address)).to.be.false;
      expect(await emergency.approvalsHalt()).to.equal(0);
    });

    it('should revert if non-DAO tries to reset', async function () {
      await expect(
        emergency.connect(user1).resetVotes()
      ).to.be.revertedWithCustomError(emergency, 'EC_NotDAO');
    });
  });
});
