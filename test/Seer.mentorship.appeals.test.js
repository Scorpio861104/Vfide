const { expect } = require('chai');
const { ethers } = require('hardhat');

// Focused tests for mentorship, appeals, and disputes on Seer
describe('Seer Mentorship & Appeals', function () {
  this.timeout(300000);

  let seer, dao, mentor, mentee, other, ledger, vaultHub;

  beforeEach(async function () {
    [dao, mentor, mentee, other] = await ethers.getSigners();

    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();

    const Seer = await ethers.getContractFactory('Seer');
    seer = await Seer.deploy(dao.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();
  });

  describe('Mentorship lifecycle', () => {
    it('requires sufficient score to become mentor', async () => {
      await expect(seer.connect(mentor).becomeMentor()).to.be.revertedWith('SEER: score too low');

      await seer.connect(dao).setScore(mentor.address, 8000, 'qualified');
      await expect(seer.connect(mentor).becomeMentor())
        .to.emit(seer, 'MentorRegistered')
        .withArgs(mentor.address);

      expect(await seer.mentors(mentor.address)).to.equal(true);
    });

    it('sponsors mentees and enforces one mentor per mentee', async () => {
      await seer.connect(dao).setScore(mentor.address, 8000, 'qualified');
      await seer.connect(mentor).becomeMentor();

      await expect(seer.connect(mentor).sponsorMentee(mentee.address))
        .to.emit(seer, 'MenteeSponsored')
        .withArgs(mentor.address, mentee.address);

      expect(await seer.mentorOf(mentee.address)).to.equal(mentor.address);
      const mentees = await seer.getMentees(mentor.address);
      expect(mentees).to.deep.equal([mentee.address]);

      await expect(seer.connect(mentor).sponsorMentee(mentee.address)).to.be.revertedWith('SEER: mentee has mentor');
    });

    it('allows mentor or DAO to remove mentee', async () => {
      await seer.connect(dao).setScore(mentor.address, 8000, 'qualified');
      await seer.connect(mentor).becomeMentor();
      await seer.connect(mentor).sponsorMentee(mentee.address);

      await expect(seer.connect(mentor).removeMentee(mentee.address))
        .to.emit(seer, 'MenteeRemoved')
        .withArgs(mentor.address, mentee.address);
      expect(await seer.mentorOf(mentee.address)).to.equal(ethers.ZeroAddress);

      // Re-add and have DAO remove
      await seer.connect(mentor).sponsorMentee(mentee.address);
      await expect(seer.connect(dao).removeMentee(mentee.address))
        .to.emit(seer, 'MenteeRemoved')
        .withArgs(mentor.address, mentee.address);
    });

    it('returns mentor info with eligibility data', async () => {
      await seer.connect(dao).setScore(mentor.address, 8000, 'qualified');
      await seer.connect(mentor).becomeMentor();
      await seer.connect(mentor).sponsorMentee(mentee.address);

      const info = await seer.getMentorInfo(mentor.address);
      expect(info[0]).to.equal(true); // isMentorUser
      expect(info[1]).to.equal(ethers.ZeroAddress); // mentor of self
      expect(info[2]).to.equal(1); // menteeCount
      expect(info[3]).to.equal(false); // hasMentor
      expect(info[4]).to.equal(false); // canBecome (already mentor)
      expect(info[5]).to.equal(await seer.minScoreToMentor());
      expect(info[6]).to.equal(await seer.getScore(mentor.address));
    });
  });

  describe('Appeals', () => {
    it('files and resolves an appeal', async () => {
      await expect(seer.connect(mentor).fileAppeal('need review'))
        .to.emit(seer, 'AppealFiled')
        .withArgs(mentor.address, 'need review');

      const appeal = await seer.appeals(mentor.address);
      expect(appeal.requester).to.equal(mentor.address);
      expect(appeal.reason).to.equal('need review');
      expect(appeal.resolved).to.equal(false);
      expect(await seer.pendingAppealCount()).to.equal(1);

      await expect(seer.connect(dao).resolveAppeal(mentor.address, true, 'approved'))
        .to.emit(seer, 'AppealResolved')
        .withArgs(mentor.address, true, 'approved');

      const resolved = await seer.appeals(mentor.address);
      expect(resolved.resolved).to.equal(true);
      expect(resolved.approved).to.equal(true);
      expect(resolved.resolution).to.equal('approved');
      expect(await seer.pendingAppealCount()).to.equal(0);
    });

    it('prevents duplicate pending appeals', async () => {
      await seer.connect(mentor).fileAppeal('first');
      await expect(seer.connect(mentor).fileAppeal('second')).to.be.revertedWith('SEER: appeal pending');
    });
  });

  describe('Score disputes', () => {
    it('tracks request and resolution', async () => {
      await expect(seer.connect(mentor).requestScoreReview('incorrect score'))
        .to.emit(seer, 'ScoreDisputeRequested')
        .withArgs(mentor.address, 'incorrect score');

      expect(await seer.pendingDisputeCount()).to.equal(1);

      await expect(seer.connect(dao).resolveScoreDispute(mentor.address, true, 100))
        .to.emit(seer, 'ScoreDisputeResolved')
        .withArgs(mentor.address, true, 100);

      const dispute = await seer.scoreDisputes(mentor.address);
      expect(dispute.resolved).to.equal(true);
      expect(dispute.approved).to.equal(true);
      expect(await seer.pendingDisputeCount()).to.equal(0);
    });
  });
});
