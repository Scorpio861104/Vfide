import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;
async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

/**
 * NON-CUSTODIAL — NO-FREEZE REGRESSION
 *
 * Invariant under test: the system can NEVER freeze, hold, delay, or seize a user's funds.
 * Fraud is handled by reputation / risk-signal + Seer score (→ higher fees) + service-ban,
 * never by withholding tokens.
 *
 * This pins the FraudRegistry boundary AFTER the fraud-hold removal so the 30-day escrow can
 * never come back silently:
 *   1. requiresEscrow(target) is ALWAYS false — even for a CONFIRMED-fraud target — so the token
 *      transfer path and the LayerZero bridge can never withhold funds.
 *   2. escrowTransfer(...) always REVERTS — the 30-day hold entry point is a dead stub.
 *   3. PUNISHMENT IS PRESERVED — a confirmed-fraud target is still service-banned
 *      (isServiceBanned == true). "We can punish but not take."
 */
describe('NonCustodial / no-freeze (FraudRegistry boundary)', () => {
  async function deployAndConfirmFraud() {
    const { ethers } = (await getConnection()) as any;
    const [dao, alice, bob, charlie, scammer] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory(
      'test/contracts/helpers/Stubs.sol:SeerScoreStub'
    );
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const Token = await ethers.getContractFactory('TestMintableToken');
    const token = await Token.deploy();
    await token.waitForDeployment();

    const FR = await ethers.getContractFactory('FraudRegistry');
    const fr = await FR.deploy(dao.address, await seer.getAddress(), await token.getAddress());
    await fr.waitForDeployment();

    // Reporters need standing to file (MIN_REPORTER_SCORE = 6000).
    for (const u of [alice, bob, charlie]) await (await seer.setScore(u.address, 6000)).wait();

    // 3 complaints (COMPLAINTS_TO_FLAG) → pending DAO review.
    await (await fr.connect(alice).fileComplaint(scammer.address, 'scam #1')).wait();
    await (await fr.connect(bob).fileComplaint(scammer.address, 'scam #2')).wait();
    await (await fr.connect(charlie).fileComplaint(scammer.address, 'scam #3')).wait();

    // Clear the 48h appeal window, then DAO confirms fraud (consequences activate).
    await ethers.provider.send('evm_increaseTime', [8 * 24 * 60 * 60]);
    await ethers.provider.send('evm_mine', []);
    await (await fr.connect(dao).confirmFraud(scammer.address)).wait();

    return { ethers, fr, token, dao, scammer };
  }

  it('requiresEscrow is FALSE even for a confirmed-fraud address (no hold on transfers or bridge)', async () => {
    const { fr, scammer } = await deployAndConfirmFraud();
    assert.equal(await fr.isFlagged(scammer.address), true, 'precondition: target is confirmed/flagged');
    assert.equal(
      await fr.requiresEscrow(scammer.address),
      false,
      'NO transfer may ever require a hold — requiresEscrow must be false'
    );
  });

  it('escrowTransfer always reverts — the 30-day hold entry point is removed', async () => {
    const { ethers, fr, dao, scammer } = await deployAndConfirmFraud();
    await assert.rejects(
      fr
        .connect(dao)
        .escrowTransfer(scammer.address, ethers.Wallet.createRandom().address, 1000n),
      /fund holds removed/,
      'escrowTransfer must revert — funds can never be held'
    );
  });

  it('PUNISHMENT PRESERVED: a confirmed-fraud address is still service-banned', async () => {
    const { fr, scammer } = await deployAndConfirmFraud();
    assert.equal(
      await fr.isServiceBanned(scammer.address),
      true,
      'service-ban (punishment) still applies — we punish, but never take/freeze funds'
    );
  });
});
