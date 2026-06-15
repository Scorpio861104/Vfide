/**
 * Heir Configuration — adversarial + edge matrix (ACTIVE path audit, Continuity Audit 4).
 *
 * Executes the config-setup adversarial matrix against `heirConfigurationModel.ts`:
 * compromised-admin malicious config (cooldown + guardian veto), config change during a claim, arbitrary-address
 * heirs, version binding, guardian-removed-during-cooldown, and the Audit-4 stale-vote fix (a cancelled-then-
 * reproposed config must start with a FRESH cancel tally).
 */
import { describe, it, expect } from '@jest/globals';
import {
  freshConfig, propose, clearAllHeirs, confirm, cancelByOwner, cancelByGuardians,
  STATE_CLAIM_ACTIVE, MAX_HEIRS, INHERITANCE_CONFIG_COOLDOWN, type ConfigState,
} from '@/lib/audit/heirConfigurationModel';

const T0 = 20_000_000;
const day = 24 * 60 * 60;
const cd = INHERITANCE_CONFIG_COOLDOWN;

// ─────────────────────────────────────────────────────────────────────────────
// Propose/confirm authority + cooldown
// ─────────────────────────────────────────────────────────────────────────────
describe('propose/confirm + cooldown', () => {
  it('CFG-01 owner proposes then confirms a valid heir config after the 30-day cooldown', () => {
    const s = freshConfig();
    expect(propose(s, true, ['G1', 'G2'], ['cA', 'cB'], T0).ok).toBe(true);
    expect(confirm(s, true, T0 + 1 * day)).toEqual({ ok: false, reason: 'cooldown-active' });
    expect(confirm(s, true, T0 + cd + day).ok).toBe(true);
    expect(s.liveHeirs.get('G1')).toBe('cA');
  });
  it('CFG-02 a non-owner cannot propose or confirm', () => {
    const s = freshConfig();
    expect(propose(s, false, ['G1'], ['cA'], T0)).toEqual({ ok: false, reason: 'not-admin' });
  });
  it('CFG-03 config changes are BLOCKED during an active inheritance claim', () => {
    const s = freshConfig({ state: STATE_CLAIM_ACTIVE });
    expect(propose(s, true, ['G1'], ['cA'], T0)).toEqual({ ok: false, reason: 'wrong-state' });
    expect(clearAllHeirs(s, true, T0)).toEqual({ ok: false, reason: 'wrong-state' });
  });
  it('CFG-04 owner can CANCEL a pending config anytime in the cooldown window', () => {
    const s = freshConfig();
    propose(s, true, ['G1'], ['cA'], T0);
    expect(cancelByOwner(s, true).ok).toBe(true);
    expect(s.pending).toBe(null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Heir validity
// ─────────────────────────────────────────────────────────────────────────────
describe('heir validity', () => {
  it('VAL-01 heirs MUST be guardians — an arbitrary address is rejected', () => {
    const s = freshConfig();
    expect(propose(s, true, ['RANDOM_ADDR'], ['cA'], T0)).toEqual({ ok: false, reason: 'not-guardian' });
  });
  it('VAL-02 duplicate heirs are rejected', () => {
    const s = freshConfig();
    expect(propose(s, true, ['G1', 'G1'], ['cA', 'cB'], T0)).toEqual({ ok: false, reason: 'invalid-commitment' });
  });
  it('VAL-03 a zero/empty commitment is rejected', () => {
    const s = freshConfig();
    expect(propose(s, true, ['G1'], [''], T0)).toEqual({ ok: false, reason: 'invalid-commitment' });
  });
  it('VAL-04 more than MAX_HEIRS is rejected', () => {
    const s = freshConfig({ guardians: new Set(['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) });
    const heirs = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
    expect(propose(s, true, heirs, heirs.map((h) => 'c' + h), T0)).toEqual({ ok: false, reason: 'too-many-heirs' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Version binding + guardian-removed-during-cooldown
// ─────────────────────────────────────────────────────────────────────────────
describe('version binding + cooldown integrity', () => {
  it('VER-01 confirm bumps the live config version (invalidating old commitments)', () => {
    const s = freshConfig({ liveVersion: 4 });
    propose(s, true, ['G1'], ['cA'], T0);
    confirm(s, true, T0 + cd + day);
    expect(s.liveVersion).toBe(5);
  });
  it('VER-02 a heir guardian REMOVED during the cooldown cannot be confirmed', () => {
    const s = freshConfig();
    propose(s, true, ['G1', 'G2'], ['cA', 'cB'], T0);
    s.guardians.delete('G2'); // G2 removed during the 30-day window
    expect(confirm(s, true, T0 + cd + day)).toEqual({ ok: false, reason: 'not-guardian' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Compromised-admin malicious config → guardian quorum veto
// ─────────────────────────────────────────────────────────────────────────────
describe('guardian quorum veto of a malicious config', () => {
  it('VETO-01 a compromised admin proposing a malicious config is vetoed by guardian threshold', () => {
    const s = freshConfig({ threshold: 2 });
    propose(s, true, ['G1'], ['malicious'], T0); // suppose admin is compromised
    expect(cancelByGuardians(s, 'G2').ok).toBe(true); // 1 vote
    expect(s.pending).not.toBe(null);
    expect(cancelByGuardians(s, 'G3').ok).toBe(true); // 2 votes → threshold → cancelled
    expect(s.pending).toBe(null);
  });
  it('VETO-02 a guardian cannot double-vote on the same proposal', () => {
    const s = freshConfig();
    propose(s, true, ['G1'], ['cA'], T0);
    cancelByGuardians(s, 'G2');
    expect(cancelByGuardians(s, 'G2')).toEqual({ ok: false, reason: 'already-voted' });
  });
  it('VETO-03 a non-guardian cannot vote to cancel', () => {
    const s = freshConfig();
    propose(s, true, ['G1'], ['cA'], T0);
    expect(cancelByGuardians(s, 'STRANGER')).toEqual({ ok: false, reason: 'not-guardian' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE AUDIT-4 FIX: stale cancel votes must not leak across reproposed (same-version) configs
// ─────────────────────────────────────────────────────────────────────────────
describe('stale-vote leakage fix (Audit-4)', () => {
  it('STALE-01 a cancelled-then-reproposed config (SAME version) starts with a FRESH tally', () => {
    const s = freshConfig({ threshold: 2, guardians: new Set(['G1', 'G2', 'G3']) });
    // config A (version 5): cancelled by G1 + G2
    propose(s, true, ['G1'], ['configA'], T0);
    const versionA = s.pending!.version;
    cancelByGuardians(s, 'G1'); cancelByGuardians(s, 'G2');
    expect(s.pending).toBe(null);

    // config B (legitimately reproposed): reuses version 5 (live version never advanced)
    propose(s, true, ['G2'], ['configB'], T0 + day);
    expect(s.pending!.version).toBe(versionA); // SAME version number
    // pre-fix, the stale tally (2) would let a SINGLE guardian cancel B. With the nonce fix, B needs a FULL
    // fresh threshold: one vote is NOT enough.
    expect(cancelByGuardians(s, 'G3').ok).toBe(true); // 1 fresh vote
    expect(s.pending).not.toBe(null);                 // ← B survives (would have been cancelled pre-fix)
    expect(cancelByGuardians(s, 'G1').ok).toBe(true); // 2 fresh votes → threshold → now cancelled
    expect(s.pending).toBe(null);
  });
  it('STALE-02 guardians who voted on the cancelled proposal CAN vote on the fresh one', () => {
    const s = freshConfig({ threshold: 2, guardians: new Set(['G1', 'G2', 'G3']) });
    propose(s, true, ['G1'], ['configA'], T0);
    cancelByGuardians(s, 'G1'); cancelByGuardians(s, 'G2'); // cancels A
    propose(s, true, ['G2'], ['configB'], T0 + day);
    // G1 (who voted on A) is NOT blocked on B — votes are per-proposal-nonce
    expect(cancelByGuardians(s, 'G1').ok).toBe(true);
    expect(cancelByGuardians(s, 'G1')).toEqual({ ok: false, reason: 'already-voted' }); // but only once on B
  });
  it('STALE-03 owner can confirm a reproposed config that a minority tried to grief', () => {
    const s = freshConfig({ threshold: 2, guardians: new Set(['G1', 'G2', 'G3']) });
    propose(s, true, ['G1'], ['configA'], T0);
    cancelByGuardians(s, 'G1'); cancelByGuardians(s, 'G2'); // A cancelled
    propose(s, true, ['G3'], ['configB'], T0 + day);
    cancelByGuardians(s, 'G3'); // a single minority vote — insufficient now
    expect(s.pending).not.toBe(null);
    expect(confirm(s, true, T0 + day + cd + day).ok).toBe(true); // owner confirms B
    expect(s.liveHeirs.get('G3')).toBe('configB');
  });
});
