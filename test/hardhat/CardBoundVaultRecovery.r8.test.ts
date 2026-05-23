/**
 * Tests for R-8 (guardian-initiated recovery additions).
 *
 * Threat-model entry R-8 documents three new pieces of contract surface:
 *   1. Tiered guardian roles — only TRUSTEES can initiate recovery on a vault
 *      that has at least one trustee configured. Vaults with no trustees fall
 *      back to the pre-R8 behavior (any address can initiate) so users in the
 *      "haven't configured trustees yet" state retain a recovery path.
 *   2. Per-initiator cooldown — when the original owner CHALLENGES a claim,
 *      that initiator is locked out from re-initiating against this vault for
 *      30 days. Per-(vault, initiator) so other trustees can still help in a
 *      genuine emergency.
 *   3. Per-vault challenge period preference — the user can set their preferred
 *      veto-window length (3-30 days). The preference is SNAPSHOT into the
 *      RecoveryClaim at initiation so a later change cannot retroactively
 *      shrink an active window.
 *
 * Each test is named after the property it enforces.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

/**
 * Deploy a vault + recovery contract pair for testing.
 * Vault is bootstrapped with one guardian (the test will add more / promote
 * to trustee as needed). The vault is registered with the hub stub so
 * vaultHub.isVault() and vaultHub.ownerOfVault() return correctly.
 */
async function deployRecoveryFixture(numGuardians = 3) {
  const { ethers } = (await getConnection()) as any;
  const signers = await ethers.getSigners();
  const [deployer, originalOwner, ...rest] = signers;
  const guardians = rest.slice(0, numGuardians);
  const claimantA = rest[numGuardians];
  const claimantB = rest[numGuardians + 1];

  const Hub = await ethers.getContractFactory('test/contracts/helpers/Stubs.sol:VaultHubStub');
  const hub = await Hub.deploy();
  await hub.waitForDeployment();

  const Token = await ethers.getContractFactory(
    'test/contracts/helpers/Stubs.sol:MintableTokenStub'
  );
  const token = await Token.deploy();
  await token.waitForDeployment();

  const Vault = await ethers.getContractFactory('CardBoundVault');
  const vault = await Vault.deploy(
    await hub.getAddress(),
    await token.getAddress(),
    originalOwner.address,
    originalOwner.address,
    guardians.map((g: any) => g.address),
    Math.min(2, numGuardians),
    ethers.parseEther('100'),
    ethers.parseEther('300'),
    ethers.ZeroAddress
  );
  await vault.waitForDeployment();

  await hub.setVault(originalOwner.address, await vault.getAddress());

  const Recovery = await ethers.getContractFactory('VaultRecoveryClaim');
  const recovery = await Recovery.deploy(await hub.getAddress(), ethers.ZeroAddress);
  await recovery.waitForDeployment();

  return {
    ethers,
    hub,
    token,
    vault,
    recovery,
    originalOwner,
    guardians,
    claimantA,
    claimantB,
  };
}

/**
 * Advance EVM clock by `seconds` and mine one block.
 */
async function fastForward(ethers: any, seconds: number) {
  await ethers.provider.send('evm_increaseTime', [seconds]);
  await ethers.provider.send('evm_mine', []);
}

describe('R-8 guardian-initiated recovery', { concurrency: 1 }, () => {
  // ───────────────────────────────────────────────────────────────────
  // T-R8-01: TRUSTEE GATING
  // ───────────────────────────────────────────────────────────────────

  it('T-R8-01a: vault with zero trustees allows anyone to initiate (pre-R8 fallback)', async () => {
    const f = await deployRecoveryFixture(3);
    // No trustees configured — fallback behavior: any address can initiate.
    // This preserves the recovery path for users who haven't set up trustees.
    await f.recovery
      .connect(f.claimantA)
      .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'lost device');
    // Claim is recorded
    const claimId = await f.recovery.claimCounter();
    assert.equal(claimId, 1n);
  });

  it('T-R8-01b: vault with trustees rejects non-trustee initiators', async () => {
    const f = await deployRecoveryFixture(3);
    const [g1] = f.guardians;
    // Promote g1 to trustee via the bootstrap setter (no timelock during bootstrap).
    await f.vault.connect(f.originalOwner).setTrustee(g1.address, true);
    assert.equal(await f.vault.trusteeCountView(), 1n);

    // A random non-trustee tries to initiate → must revert with NotTrustee
    await assert.rejects(
      f.recovery
        .connect(f.claimantA)
        .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'lost device'),
      (err: any) => /NotTrustee/.test(err?.message ?? '')
    );
  });

  it('T-R8-01c: vault with trustees accepts initiation from any trustee', async () => {
    const f = await deployRecoveryFixture(3);
    const [g1] = f.guardians;
    await f.vault.connect(f.originalOwner).setTrustee(g1.address, true);

    // Trustee initiating recovery from their own wallet on behalf of the user.
    // (In practice the user would initiate from THEIR new wallet — this is the
    // "trustee helps" path. Either is supported as long as msg.sender is a trustee.)
    await f.recovery
      .connect(g1)
      .initiateClaim(
        await f.vault.getAddress(),
        '',
        f.ethers.ZeroHash,
        'user lost device, helping'
      );
    const claimId = await f.recovery.claimCounter();
    assert.equal(claimId, 1n);
  });

  // ───────────────────────────────────────────────────────────────────
  // T-R8-02: INITIATOR COOLDOWN
  // ───────────────────────────────────────────────────────────────────

  it('T-R8-02a: challenged initiator is locked out for 30 days', async () => {
    const f = await deployRecoveryFixture(3);
    const [g1] = f.guardians;
    await f.vault.connect(f.originalOwner).setTrustee(g1.address, true);

    // g1 (trustee) initiates a claim
    await f.recovery
      .connect(g1)
      .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'first attempt');
    const claimId = await f.recovery.claimCounter();

    // Original owner challenges
    await f.recovery.connect(f.originalOwner).challengeClaim(claimId, 'not me');

    // Same initiator (g1) tries again immediately → must revert with cooldown error
    await assert.rejects(
      f.recovery
        .connect(g1)
        .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'harassment retry'),
      (err: any) => /InitiatorCooldownActive/.test(err?.message ?? '')
    );
  });

  it('T-R8-02b: cooldown expires after 30 days and initiator can re-attempt', async () => {
    const f = await deployRecoveryFixture(3);
    const [g1] = f.guardians;
    await f.vault.connect(f.originalOwner).setTrustee(g1.address, true);

    await f.recovery
      .connect(g1)
      .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'attempt 1');
    const firstId = await f.recovery.claimCounter();
    await f.recovery.connect(f.originalOwner).challengeClaim(firstId, 'not me');

    // Wait 30 days + 1 second
    await fastForward(f.ethers, 30 * 24 * 60 * 60 + 1);

    // g1 can now initiate again
    await f.recovery
      .connect(g1)
      .initiateClaim(
        await f.vault.getAddress(),
        '',
        f.ethers.ZeroHash,
        'attempt 2 (legitimate, time passed)'
      );
    const secondId = await f.recovery.claimCounter();
    assert.equal(secondId, firstId + 1n);
  });

  it('T-R8-02c: cooldown is PER-INITIATOR — other trustees can still initiate', async () => {
    const f = await deployRecoveryFixture(3);
    const [g1, g2] = f.guardians;
    await f.vault.connect(f.originalOwner).setTrustee(g1.address, true);
    await f.vault.connect(f.originalOwner).setTrustee(g2.address, true);

    // g1 initiates → owner challenges → g1 in cooldown
    await f.recovery
      .connect(g1)
      .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'g1 attempt (rogue)');
    const claimId = await f.recovery.claimCounter();
    await f.recovery.connect(f.originalOwner).challengeClaim(claimId, 'not me');

    // g2 (different trustee) should still be able to initiate — they're not the
    // bad actor and the user might still have a real emergency.
    await f.recovery
      .connect(g2)
      .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'g2 legitimate attempt');
    const newId = await f.recovery.claimCounter();
    assert.equal(newId, claimId + 1n);
  });

  // ───────────────────────────────────────────────────────────────────
  // T-R8-03: CHALLENGE PERIOD SNAPSHOT
  // ───────────────────────────────────────────────────────────────────

  it('T-R8-03a: rejects user preference below the 3-day floor', async () => {
    const f = await deployRecoveryFixture(3);
    await assert.rejects(
      f.vault.connect(f.originalOwner).setChallengePeriodPreference(2 * 24 * 60 * 60),
      (err: any) => /CBV_ChallengePeriodTooShort/.test(err?.message ?? '')
    );
  });

  it('T-R8-03b: rejects user preference above the 30-day ceiling', async () => {
    const f = await deployRecoveryFixture(3);
    await assert.rejects(
      f.vault.connect(f.originalOwner).setChallengePeriodPreference(31 * 24 * 60 * 60),
      (err: any) => /CBV_ChallengePeriodTooLong/.test(err?.message ?? '')
    );
  });

  it('T-R8-03c: preference is snapshotted at initiation — later change cannot shrink active window', async () => {
    const f = await deployRecoveryFixture(3);
    const [g1] = f.guardians;
    await f.vault.connect(f.originalOwner).setTrustee(g1.address, true);
    // Owner sets long preference (20 days)
    await f.vault.connect(f.originalOwner).setChallengePeriodPreference(20 * 24 * 60 * 60);

    // Trustee initiates → snapshot captures 20 days
    await f.recovery
      .connect(g1)
      .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'with 20-day pref');
    const claimId = await f.recovery.claimCounter();
    const claim = await f.recovery.claims(claimId);
    // challengePeriodSnapshot field should be at least 20 days
    // (may be longer if activity-based extension stacks on top — but we just
    // assert the snapshot is honoring the preference)
    const TWENTY_DAYS = 20n * 24n * 60n * 60n;
    assert.ok(
      claim.challengePeriodSnapshot >= TWENTY_DAYS,
      `expected snapshot >= 20 days, got ${claim.challengePeriodSnapshot}`
    );

    // Now owner (or a hypothetical compromised owner key) tries to set a shorter
    // preference. This should succeed (it's bounded but allowed), BUT it must
    // NOT shrink the snapshotted value on the active claim.
    await f.vault.connect(f.originalOwner).setChallengePeriodPreference(3 * 24 * 60 * 60);

    const claimAfter = await f.recovery.claims(claimId);
    assert.equal(
      claimAfter.challengePeriodSnapshot,
      claim.challengePeriodSnapshot,
      'snapshot must not change after a setter call on the vault'
    );
  });

  // ───────────────────────────────────────────────────────────────────
  // T-R8-04: SETTING PREFERENCE TO ZERO MEANS "USE DEFAULT"
  // ───────────────────────────────────────────────────────────────────

  it("T-R8-04: setting preference to 0 means 'use protocol default' (not 'use 0')", async () => {
    const f = await deployRecoveryFixture(3);
    // Setting to zero is allowed — explicitly opt back into "no preference"
    await f.vault.connect(f.originalOwner).setChallengePeriodPreference(0);
    assert.equal(await f.vault.challengePeriodPreferenceView(), 0n);

    // A claim initiated now should use the base (7 or 14 day) period
    const [g1] = f.guardians;
    await f.vault.connect(f.originalOwner).setTrustee(g1.address, true);
    await f.recovery
      .connect(g1)
      .initiateClaim(await f.vault.getAddress(), '', f.ethers.ZeroHash, 'default-period claim');
    const claimId = await f.recovery.claimCounter();
    const claim = await f.recovery.claims(claimId);
    // Should be exactly 7 or 14 days (not the user preference — there isn't one)
    const SEVEN_DAYS = 7n * 24n * 60n * 60n;
    const FOURTEEN_DAYS = 14n * 24n * 60n * 60n;
    assert.ok(
      claim.challengePeriodSnapshot === SEVEN_DAYS ||
        claim.challengePeriodSnapshot === FOURTEEN_DAYS,
      `expected default window, got ${claim.challengePeriodSnapshot}`
    );
  });
});
