/**
 * Proof-of-Life Continuity — adversarial + edge scenario matrix (ACTIVE path audit).
 *
 * Executes the scenario list from the Continuity Campaign against `proofOfLifeContinuityModel.ts`:
 * stolen phone, SIM swap, malware, guardian compromise, guardian collusion, owner disappears/returns,
 * heir compromise, notification failure, network outage — plus the PoL lifecycle (create/update/remove/verify/
 * expire/challenge/recover) and the recovery-precedence timer-freeze.
 *
 * Each test asserts a SECURITY PROPERTY, not just a code path. The headline property: a LIVING owner defeats a
 * false claim through the entire claim window, even against full guardian collusion.
 */
import { describe, it, expect } from '@jest/globals';
import {
  freshState, setProofOfLifeWallet, initiateClaim, veto, ownerOverride,
  pauseTimersForRecovery, resumeTimersAfterRecovery, recoverySuccessCancel, finalize, rollover,
  STATE_NORMAL, STATE_VETO, STATE_CLAIM, VETO_PERIOD, CLAIM_WINDOW, CLAIM_FINALIZE_FLOOR,
  type PoLState,
} from '@/lib/audit/proofOfLifeContinuityModel';

const T0 = 1_000_000;
const day = 24 * 60 * 60;

// ─────────────────────────────────────────────────────────────────────────────
// PoL lifecycle — create / update / remove / verify
// ─────────────────────────────────────────────────────────────────────────────
describe('PoL lifecycle', () => {
  it('PoL-01 owner-admin can SET the PoL wallet', () => {
    const s = freshState();
    expect(setProofOfLifeWallet(s, 'OWNER', 'POL').ok).toBe(true);
    expect(s.proofOfLifeWallet).toBe('POL');
  });
  it('PoL-02 a non-admin CANNOT set the PoL wallet (incl. the PoL wallet itself)', () => {
    const s = freshState({ proofOfLifeWallet: 'POL' });
    expect(setProofOfLifeWallet(s, 'POL', 'ATTACKER')).toEqual({ ok: false, reason: 'not-admin' });
    expect(setProofOfLifeWallet(s, 'G1', 'ATTACKER')).toEqual({ ok: false, reason: 'not-admin' });
    expect(s.proofOfLifeWallet).toBe('POL');
  });
  it('PoL-03 owner can UPDATE (rotate) the PoL wallet', () => {
    const s = freshState({ proofOfLifeWallet: 'POL_OLD' });
    setProofOfLifeWallet(s, 'OWNER', 'POL_NEW');
    expect(s.proofOfLifeWallet).toBe('POL_NEW');
  });
  it('PoL-04 owner can REMOVE the PoL wallet (set to empty)', () => {
    const s = freshState({ proofOfLifeWallet: 'POL' });
    setProofOfLifeWallet(s, 'OWNER', '');
    expect(s.proofOfLifeWallet).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot protection — changing PoL mid-claim does not help an attacker
// ─────────────────────────────────────────────────────────────────────────────
describe('PoL snapshot protection', () => {
  it('SNAP-01 PoL wallet is snapshotted at claim initiation', () => {
    const s = freshState({ proofOfLifeWallet: 'POL_AT_START' });
    initiateClaim(s, 'G1', T0);
    expect(s.snapshotPoL).toBe('POL_AT_START');
  });
  it('SNAP-02 changing PoL AFTER a claim starts does NOT grant the new wallet override authority', () => {
    const s = freshState({ proofOfLifeWallet: 'POL_AT_START' });
    initiateClaim(s, 'G1', T0);
    setProofOfLifeWallet(s, 'OWNER', 'ATTACKER_WALLET'); // owner-only, but suppose admin compromised
    // the attacker's new PoL wallet cannot override — only the SNAPSHOT pol can
    expect(ownerOverride(s, 'ATTACKER_WALLET', T0 + day)).toEqual({ ok: false, reason: 'not-pol-or-owner' });
    // the original snapshot PoL still can
    expect(ownerOverride(s, 'POL_AT_START', T0 + day).ok).toBe(true);
  });
  it('SNAP-03 veto threshold is snapshotted — raising it mid-claim cannot strand an in-flight veto', () => {
    const s = freshState({ guardianThreshold: 2 });
    initiateClaim(s, 'G1', T0);
    s.guardianThreshold = 99; // attacker raises current threshold
    veto(s, 'G2', T0 + day);
    veto(s, 'G3', T0 + day); // 2 vetoes meet the SNAPSHOT threshold (2)
    expect(s.state).toBe(STATE_NORMAL); // claim cancelled despite raised current threshold
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Claim initiation authority
// ─────────────────────────────────────────────────────────────────────────────
describe('claim initiation authority', () => {
  it('INIT-01 a non-guardian cannot initiate a claim', () => {
    const s = freshState();
    expect(initiateClaim(s, 'STRANGER', T0)).toEqual({ ok: false, reason: 'not-guardian' });
  });
  it('INIT-02 the DAO guardian can NEVER initiate (Decision 12)', () => {
    const s = freshState({ daoGuardian: 'DAO_G', guardians: new Set(['G1', 'DAO_G']) });
    expect(initiateClaim(s, 'DAO_G', T0)).toEqual({ ok: false, reason: 'dao-cannot-initiate' });
  });
  it('INIT-03 cannot initiate with no heirs configured', () => {
    const s = freshState({ heirCount: 0 });
    expect(initiateClaim(s, 'G1', T0)).toEqual({ ok: false, reason: 'no-heirs' });
  });
  it('INIT-04 cannot initiate while a recovery rotation is pending', () => {
    const s = freshState({ pendingRecovery: true });
    expect(initiateClaim(s, 'G1', T0)).toEqual({ ok: false, reason: 'recovery-in-progress' });
  });
  it('INIT-05 cannot initiate while the vault is paused', () => {
    const s = freshState({ vaultPaused: true });
    expect(initiateClaim(s, 'G1', T0)).toEqual({ ok: false, reason: 'vault-paused' });
  });
  it('INIT-06 cannot double-initiate (already in a claim)', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    expect(initiateClaim(s, 'G2', T0)).toEqual({ ok: false, reason: 'wrong-state' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE HEADLINE: living owner defeats false claims, even vs full guardian collusion
// ─────────────────────────────────────────────────────────────────────────────
describe('living owner defeats false claims', () => {
  it('OWN-01 owner overrides during the VETO period', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    expect(ownerOverride(s, 'OWNER', T0 + day).ok).toBe(true);
    expect(s.state).toBe(STATE_NORMAL);
  });
  it('OWN-02 owner RETURNS late and overrides DEEP into the claim window (until finalized)', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    // 30d veto elapses → claim window; owner returns on day ~100
    const late = T0 + 100 * day;
    rollover(s, late);
    expect(s.state).toBe(STATE_CLAIM);
    expect(ownerOverride(s, 'OWNER', late).ok).toBe(true);
    expect(s.state).toBe(STATE_NORMAL);
  });
  it('OWN-03 FULL guardian collusion (all guardians refuse to veto) still loses to a live owner', () => {
    const s = freshState({ guardians: new Set(['G1', 'G2', 'G3']) });
    initiateClaim(s, 'G1', T0); // colluding guardian initiates; none will veto
    const inClaim = T0 + 60 * day;
    rollover(s, inClaim);
    // owner (alive) overrides — collusion cannot complete the theft
    expect(ownerOverride(s, 'OWNER', inClaim).ok).toBe(true);
    expect(s.state).toBe(STATE_NORMAL);
  });
  it('OWN-04 owner who LOST their admin wallet still overrides via the PoL backup wallet', () => {
    const s = freshState({ proofOfLifeWallet: 'POL_BACKUP' });
    initiateClaim(s, 'G1', T0);
    // owner's admin key is gone; the PoL backup defeats the claim
    expect(ownerOverride(s, 'POL_BACKUP', T0 + 50 * day).ok).toBe(true);
    expect(s.state).toBe(STATE_NORMAL);
  });
  it('OWN-05 override is IMPOSSIBLE once distribution is finalized (heir certainty)', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    rollover(s, T0 + 31 * day); // into claim window
    // finalize after floor + window elapse
    finalize(s, T0 + 31 * day + CLAIM_WINDOW, false);
    expect(s.distributionFinalized).toBe(true);
    expect(ownerOverride(s, 'OWNER', T0 + 31 * day + CLAIM_WINDOW + day))
      .toEqual({ ok: false, reason: 'override-expired' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Guardian veto
// ─────────────────────────────────────────────────────────────────────────────
describe('guardian veto', () => {
  it('VETO-01 guardians reaching threshold cancel a (possibly false) claim', () => {
    const s = freshState({ guardianThreshold: 2 });
    initiateClaim(s, 'G1', T0);
    veto(s, 'G2', T0 + day);
    expect(s.state).toBe(STATE_VETO); // 1 < 2
    veto(s, 'G3', T0 + day);
    expect(s.state).toBe(STATE_NORMAL); // 2 >= 2 → cancelled
  });
  it('VETO-02 a guardian cannot double-veto the same claim', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    veto(s, 'G2', T0 + day);
    expect(veto(s, 'G2', T0 + day)).toEqual({ ok: false, reason: 'already-vetoed' });
  });
  it('VETO-03 a non-guardian cannot veto', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    expect(veto(s, 'STRANGER', T0 + day)).toEqual({ ok: false, reason: 'not-guardian' });
  });
  it('VETO-04 a single compromised guardian below threshold cannot cancel alone', () => {
    const s = freshState({ guardianThreshold: 2 });
    initiateClaim(s, 'G1', T0);
    veto(s, 'G2', T0 + day);
    expect(s.state).toBe(STATE_VETO); // one veto insufficient
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recovery precedence + timer-freeze (the W92→Wave95 property — Finding 1 area)
// ─────────────────────────────────────────────────────────────────────────────
describe('recovery precedence + timer-freeze', () => {
  it('REC-01 a pending recovery FREEZES the veto clock (no rollover to claim during suspension)', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    pauseTimersForRecovery(s, T0 + 5 * day);
    // even far past the 30-day veto end, state must NOT advance while suspended
    rollover(s, T0 + 100 * day);
    expect(s.state).toBe(STATE_VETO);
  });
  it('REC-02 on resume, the frozen duration is ADDED BACK so the owner clock did not run', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    const endBefore = s.windowEnd;
    pauseTimersForRecovery(s, T0 + 5 * day);
    resumeTimersAfterRecovery(s, T0 + 5 * day + 20 * day); // 20 days frozen
    expect(s.windowEnd).toBe(endBefore + 20 * day);
  });
  it('REC-03 timer-freeze is idempotent — overlapping pauses do not double-count', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    pauseTimersForRecovery(s, T0 + 5 * day);
    const firstFreeze = s.recoverySuspendedAt;
    pauseTimersForRecovery(s, T0 + 9 * day); // second pause ignored
    expect(s.recoverySuspendedAt).toBe(firstFreeze);
  });
  it('REC-04 recovery that SUCCEEDS cancels the claim outright (owner proven alive)', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    pauseTimersForRecovery(s, T0 + 5 * day);
    recoverySuccessCancel(s);
    expect(s.state).toBe(STATE_NORMAL);
    expect(s.recoverySuspendedAt).toBe(0);
  });
  it('REC-05 finalization is blocked while a recovery is pending', () => {
    const s = freshState({ pendingRecovery: true });
    s.state = STATE_CLAIM; s.windowEnd = T0 + CLAIM_WINDOW;
    expect(finalize(s, T0 + CLAIM_WINDOW + day, true)).toEqual({ ok: false, reason: 'recovery-in-progress' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Heir compromise + collusion (the claim-floor property)
// ─────────────────────────────────────────────────────────────────────────────
describe('heir compromise + collusion', () => {
  it('HEIR-01 colluding heirs revealing on day 1 CANNOT collapse the owner window — finalize floor holds', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    rollover(s, T0 + 31 * day); // claim window begins ~day 31
    // all heirs reveal immediately; try to finalize before the 14-day floor
    expect(finalize(s, T0 + 31 * day + 1 * day, true)).toEqual({ ok: false, reason: 'claim-floor' });
    // owner still has time to override inside the floor
    expect(ownerOverride(s, 'OWNER', T0 + 31 * day + 1 * day).ok).toBe(true);
  });
  it('HEIR-02 finalize permitted once the floor is reached with all heirs revealed', () => {
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    rollover(s, T0 + 31 * day);
    const afterFloor = T0 + 31 * day + CLAIM_FINALIZE_FLOOR + day;
    expect(finalize(s, afterFloor, true).ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Off-chain threat scenarios — the contract is agnostic; protection is the windows + override
// ─────────────────────────────────────────────────────────────────────────────
describe('off-chain threats reduce to on-chain remedies', () => {
  it('THREAT-01 stolen phone / malware = admin-key compromise → mitigated by guardian recovery, not PoL', () => {
    // If the active wallet is stolen, the attacker has admin. PoL adds no protection here (nothing does at the
    // key level). The model asserts the orthogonal control: a recovery rotation BLOCKS a claim the thief starts.
    const s = freshState({ pendingRecovery: true }); // guardians initiated recovery of the stolen wallet
    expect(initiateClaim(s, 'G1', T0)).toEqual({ ok: false, reason: 'recovery-in-progress' });
  });
  it('THREAT-02 SIM-swap / notification failure / network outage do not shorten the on-chain windows', () => {
    // The contract has no SMS/notification dependency; the 30+90 day windows give ample time regardless.
    const s = freshState();
    initiateClaim(s, 'G1', T0);
    // owner notices late (after a notification blackout) but still well within the claim window
    rollover(s, T0 + 85 * day);
    expect(ownerOverride(s, 'OWNER', T0 + 85 * day).ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Defensive: unset PoL wallet must never grant override to an empty actor
// ─────────────────────────────────────────────────────────────────────────────
describe('defensive: unset PoL wallet', () => {
  it('DEF-01 with NO PoL wallet set, an empty actor cannot override (only the real owner-admin can)', () => {
    const s = freshState({ proofOfLifeWallet: '' });
    initiateClaim(s, 'G1', T0);
    expect(s.snapshotPoL).toBe('');
    expect(ownerOverride(s, '', T0 + day)).toEqual({ ok: false, reason: 'not-pol-or-owner' });
    expect(ownerOverride(s, 'OWNER', T0 + day).ok).toBe(true);
  });
});
