/**
 * Guardian Management — adversarial + edge matrix (ACTIVE path audit, Continuity Audit 2).
 *
 * Executes the campaign's guardian questions against `guardianManagementModel.ts`:
 * safe replacement / removal, threshold-change abuse, guardian death, multiple guardians disappearing,
 * owner loses contact with guardians — plus the timelock veto window, the zero-redundancy guard, and the
 * Audit-2 maturity fix (trustee promotion requires a MATURE guardian).
 */
import { describe, it, expect } from '@jest/globals';
import {
  freshGuardians, setGuardian, proposeGuardianChange, applyGuardianChange, cancelGuardianChange,
  setGuardianThreshold, setTrustee, proposeTrusteeChange, applyTrusteeChange, cancelTrusteeChange,
  stageRecoveryRotation, validateInvariants, belowSafeMinimum,
  GUARDIAN_CHANGE_DELAY, GUARDIAN_MATURITY_PERIOD, type GuardianState,
} from '@/lib/audit/guardianManagementModel';

const T0 = 10_000_000;
const day = 24 * 60 * 60;

// ─────────────────────────────────────────────────────────────────────────────
// Add / remove safely + the change timelock (veto window)
// ─────────────────────────────────────────────────────────────────────────────
describe('guardian add/remove + timelock', () => {
  it('ADD-01 post-setup, adding a guardian requires propose→wait→apply', () => {
    const s = freshGuardians();
    proposeGuardianChange(s, 'G4', true, T0);
    expect(applyGuardianChange(s, T0 + 1 * 60)).toEqual({ ok: false, reason: 'timelock-not-elapsed' });
    expect(applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY).ok).toBe(true);
    expect(s.guardians.has('G4')).toBe(true);
  });
  it('ADD-02 post-setup direct setGuardian is REJECTED (must use propose/apply)', () => {
    const s = freshGuardians();
    expect(setGuardian(s, 'G4', true, T0)).toEqual({ ok: false, reason: 'use-propose-apply' });
  });
  it('ADD-03 the owner can CANCEL a malicious guardian add within the timelock window', () => {
    const s = freshGuardians();
    proposeGuardianChange(s, 'ATTACKER', true, T0);
    expect(cancelGuardianChange(s).ok).toBe(true);
    // applying after cancel does nothing
    expect(applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY)).toEqual({ ok: false, reason: 'no-pending' });
    expect(s.guardians.has('ATTACKER')).toBe(false);
  });
  it('REM-01 removing a guardian auto-clamps the threshold to the new count', () => {
    const s = freshGuardians({ threshold: 3, guardians: new Map([['G1', 0], ['G2', 0], ['G3', 0]]) });
    proposeGuardianChange(s, 'G3', false, T0);
    applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY);
    expect(s.guardians.size).toBe(2);
    expect(s.threshold).toBe(2); // clamped from 3 → 2
  });
  it('REM-02 cannot remove the LAST guardian (count would hit 0)', () => {
    const s = freshGuardians({ setupComplete: false, guardians: new Map([['G1', 0]]), threshold: 1, trustees: new Set() });
    expect(setGuardian(s, 'G1', false, T0)).toEqual({ ok: false, reason: 'invalid-threshold' });
  });
  it('REM-03 a removed guardian is also stripped of trustee power', () => {
    const s = freshGuardians({ trustees: new Set(['G1', 'G2']) });
    proposeGuardianChange(s, 'G2', false, T0);
    applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY);
    expect(s.trustees.has('G2')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Threshold-change abuse + the zero-redundancy guard
// ─────────────────────────────────────────────────────────────────────────────
describe('threshold rules', () => {
  it('THR-01 threshold cannot be set to 0', () => {
    const s = freshGuardians();
    expect(setGuardianThreshold(s, 0)).toEqual({ ok: false, reason: 'invalid-threshold' });
  });
  it('THR-02 threshold cannot exceed guardian count', () => {
    const s = freshGuardians(); // 3 guardians
    expect(setGuardianThreshold(s, 4)).toEqual({ ok: false, reason: 'invalid-threshold' });
  });
  it('THR-03 ZERO-REDUNDANCY: post-setup multi-guardian threshold cannot equal count (3-of-3 forbidden)', () => {
    const s = freshGuardians(); // 3 guardians, setup complete
    expect(setGuardianThreshold(s, 3)).toEqual({ ok: false, reason: 'zero-redundancy' });
    // 2-of-3 (one guardian of redundancy) is allowed
    expect(setGuardianThreshold(s, 2).ok).toBe(true);
  });
  it('THR-04 the single-guardian bootstrap is preserved (zero-redundancy only bites multi-guardian sets)', () => {
    const s = freshGuardians({ setupComplete: false, guardians: new Map([['G1', 0]]), threshold: 1, trustees: new Set() });
    expect(setGuardianThreshold(s, 1).ok).toBe(true); // 1-of-1 allowed during bootstrap
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE AUDIT-2 FIX: trustee promotion requires a MATURE guardian
// ─────────────────────────────────────────────────────────────────────────────
describe('trustee promotion requires maturity (Audit-2 fix)', () => {
  it('MAT-01 an instantly-added guardian CANNOT be promoted to trustee post-setup', () => {
    const s = freshGuardians();
    // add a fresh guardian via timelock
    proposeGuardianChange(s, 'FRESH', true, T0);
    applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY);
    // immediately try to promote to trustee — must fail on maturity
    proposeTrusteeChange(s, 'FRESH', true, T0 + GUARDIAN_CHANGE_DELAY);
    const res = applyTrusteeChange(s, T0 + 2 * GUARDIAN_CHANGE_DELAY); // ~2 days < 7-day maturity
    expect(res).toEqual({ ok: false, reason: 'guardian-immature' });
    expect(s.trustees.has('FRESH')).toBe(false);
  });
  it('MAT-02 once MATURE (7 days), the guardian CAN be promoted to trustee', () => {
    const s = freshGuardians();
    proposeGuardianChange(s, 'FRESH', true, T0);
    applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY);
    const addedAt = s.guardians.get('FRESH')!;
    const matureTime = addedAt + GUARDIAN_MATURITY_PERIOD + day;
    proposeTrusteeChange(s, 'FRESH', true, matureTime);
    expect(applyTrusteeChange(s, matureTime + GUARDIAN_CHANGE_DELAY).ok).toBe(true);
    expect(s.trustees.has('FRESH')).toBe(true);
  });
  it('MAT-03 trustee promotion of a NON-guardian is rejected', () => {
    const s = freshGuardians();
    proposeTrusteeChange(s, 'STRANGER', true, T0);
    expect(applyTrusteeChange(s, T0 + GUARDIAN_CHANGE_DELAY)).toEqual({ ok: false, reason: 'not-guardian' });
  });
  it('MAT-04 bootstrap trustee assignment is EXEMPT from maturity (initial setup not bricked)', () => {
    const s = freshGuardians({ setupComplete: false, trustees: new Set() });
    expect(setTrustee(s, 'G1', true, T0).ok).toBe(true); // fresh guardian, but bootstrap → allowed
    expect(s.trustees.has('G1')).toBe(true);
  });
  it('MAT-05 owner can CANCEL a malicious trustee promotion within the timelock', () => {
    const s = freshGuardians();
    // even a mature guardian promotion can be cancelled before it applies
    proposeTrusteeChange(s, 'G2', true, T0);
    expect(cancelTrusteeChange(s).ok).toBe(true);
    expect(applyTrusteeChange(s, T0 + GUARDIAN_CHANGE_DELAY)).toEqual({ ok: false, reason: 'no-pending' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Guardian death / disappearance / owner loses contact
// ─────────────────────────────────────────────────────────────────────────────
describe('guardian death / disappearance', () => {
  it('DEATH-01 one guardian dies: owner removes them; threshold clamps; recovery still possible (2 remain)', () => {
    const s = freshGuardians({ threshold: 2, guardians: new Map([['G1', 0], ['G2', 0], ['G3', 0]]) });
    proposeGuardianChange(s, 'G3', false, T0); // G3 died
    applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY);
    expect(s.guardians.size).toBe(2);
    expect(s.threshold).toBe(2); // still 2-of-2 (acceptable; not below safe minimum)
    expect(belowSafeMinimum(s)).toBe(false);
  });
  it('DEATH-02 zero-redundancy guard PREVENTS the config where one death locks recovery', () => {
    // attempt to configure 3-of-3 (one death → can never reach threshold) is blocked up-front
    const s = freshGuardians();
    expect(setGuardianThreshold(s, 3)).toEqual({ ok: false, reason: 'zero-redundancy' });
  });
  it('DEATH-03 MULTIPLE guardians disappear → dropping below 2 flags below-safe-minimum (hub invalidation)', () => {
    const s = freshGuardians({ threshold: 2, guardians: new Map([['G1', 0], ['G2', 0], ['G3', 0]]) });
    proposeGuardianChange(s, 'G3', false, T0); applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY);
    proposeGuardianChange(s, 'G2', false, T0 + GUARDIAN_CHANGE_DELAY); applyGuardianChange(s, T0 + 2 * GUARDIAN_CHANGE_DELAY);
    expect(s.guardians.size).toBe(1);
    expect(s.threshold).toBe(1); // clamped
    expect(belowSafeMinimum(s)).toBe(true); // signals the vault needs more guardians
  });
  it('OWNER-CONTACT-01 owner who loses contact with guardians can still ADD new ones (admin-driven, timelocked)', () => {
    const s = freshGuardians();
    // the owner (admin present) is not dependent on existing guardians to add replacements
    proposeGuardianChange(s, 'NEW_GUARDIAN', true, T0);
    expect(applyGuardianChange(s, T0 + GUARDIAN_CHANGE_DELAY).ok).toBe(true);
    expect(s.guardians.has('NEW_GUARDIAN')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recovery rotation single-instance (resolves the Audit-1 overlapping-recovery flag)
// ─────────────────────────────────────────────────────────────────────────────
describe('recovery rotation is single-instance', () => {
  it('ROT-01 a second staged recovery OVERWRITES the single slot (no concurrent recoveries)', () => {
    const s = freshGuardians();
    stageRecoveryRotation(s, 'WALLET_A');
    const firstNonce = s.pendingRotation!.nonce;
    stageRecoveryRotation(s, 'WALLET_B');
    expect(s.pendingRotation!.newWallet).toBe('WALLET_B');
    expect(s.pendingRotation!.nonce).toBe(firstNonce + 1); // new nonce → old approvals invalid
    // exactly ONE pending rotation exists — the Audit-1 resume concern cannot occur
  });
});
