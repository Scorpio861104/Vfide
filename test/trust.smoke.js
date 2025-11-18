const { expect } = require('chai');

// Deploy ProofLedger and Seer from VFIDETrust subset; verify neutral score behavior.
describe('Trust Smoke: Seer Neutral Score', function () {
  it('returns neutral score for uninitialized address', async function () {
    const [dao, user] = await ethers.getSigners();
    const Ledger = await ethers.getContractFactory('ProofLedger');
    const ledger = await Ledger.deploy(dao.address);
    await ledger.waitForDeployment();

    const Seer = await ethers.getContractFactory('Seer');
    const seer = await Seer.deploy(dao.address, await ledger.getAddress(), ethers.ZeroAddress);
    await seer.waitForDeployment();

    const score = await seer.getScore(user.address);
    expect(score).to.equal(await seer.NEUTRAL());
  });
});
