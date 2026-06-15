/**
 * Key Separation — adversarial + edge matrix (Campaign B).
 *
 * Answers the campaign questions: separation mandatory? default? can users accidentally stay unseparated? behavior
 * after device-loss / recovery / inheritance per posture? And documents the UX gap (the headline finding).
 */
import { describe, it, expect } from '@jest/globals';
import {
  defaultPostureAtCreation, isSeparationMandatory, applyAction, splitAdminFromActive,
  ownerIdentityEqualsHotKey, outcome, currentUxSurfacing, type Posture, type Event,
} from '@/lib/audit/keySeparationModel';

// ─────────────────────────────────────────────────────────────────────────────
// Posture basics
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign B: posture basics', () => {
  it('SEP-01 the DEFAULT posture at vault creation is UNSEPARATED (one key holds all three roles)', () => {
    expect(defaultPostureAtCreation()).toBe('unseparated');
  });
  it('SEP-02 separation is OPTIONAL, not mandatory — the protocol never forces it', () => {
    expect(isSeparationMandatory()).toBe(false);
  });
  it('SEP-03 a user CAN separate (transferAdmin to a distinct key)', () => {
    expect(applyAction('unseparated', 'transferAdminToDistinctKey')).toBe('separated');
  });
  it('SEP-04 because the default is unseparated AND separation is optional, a user can accidentally remain unseparated', () => {
    // no action → stays at the creation default
    const p = defaultPostureAtCreation();
    expect(p).toBe('unseparated');
    expect(isSeparationMandatory()).toBe(false); // nothing compels a change
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Behavior under events, per posture
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign B: behavior under events', () => {
  it('EVT-01 UNSEPARATED + spending-key compromise → attacker can grief recovery (OC-4)', () => {
    const o = outcome('unseparated', 'spendingKeyCompromise');
    expect(o.canGriefRecovery).toBe(true);
    expect(o.recoverable).toBe(false);
  });
  it('EVT-02 SEPARATED + spending-key compromise → cannot grief; fully recoverable', () => {
    const o = outcome('separated', 'spendingKeyCompromise');
    expect(o.canGriefRecovery).toBe(false);
    expect(o.recoverable).toBe(true);
  });
  it('EVT-03 device loss of ALL keys (not attacker-controlled) → guardian recovery proceeds in any posture', () => {
    expect(outcome('unseparated', 'deviceLossAllKeys').recoverable).toBe(true);
    expect(outcome('separated', 'deviceLossAllKeys').recoverable).toBe(true);
  });
  it('EVT-04 inheritance is posture-independent (guardian-initiated + owner-vetoable regardless)', () => {
    expect(outcome('unseparated', 'inheritance').recoverable).toBe(true);
    expect(outcome('separated', 'inheritance').recoverable).toBe(true);
  });
  it('EVT-05 ownerIdentity collapses onto the hot key in unseparated + post-recovery, but NOT when separated', () => {
    expect(ownerIdentityEqualsHotKey('unseparated')).toBe(true);
    expect(ownerIdentityEqualsHotKey('unseparatedPostRecovery')).toBe(true);
    expect(ownerIdentityEqualsHotKey('separated')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recovery → re-separation flow (splitAdminFromActive)
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign B: post-recovery re-separation', () => {
  it('RESEP-01 recovery converges the posture to unseparated-post-recovery', () => {
    expect(applyAction('separated', 'recovery')).toBe('unseparatedPostRecovery');
  });
  it('RESEP-02 splitAdminFromActive re-separates — admin-only, two-step, newAdmin must differ from activeWallet', () => {
    expect(splitAdminFromActive('unseparatedPostRecovery', 'COLD_ADMIN', 'HOT_WALLET', 'HOT_WALLET', 'HOT_WALLET').ok).toBe(true);
    expect(splitAdminFromActive('unseparatedPostRecovery', 'HOT_WALLET', 'HOT_WALLET', 'HOT_WALLET', 'HOT_WALLET')).toEqual({ ok: false, reason: 'same-admin' });
    expect(splitAdminFromActive('unseparatedPostRecovery', 'COLD_ADMIN', 'HOT_WALLET', 'ATTACKER', 'HOT_WALLET')).toEqual({ ok: false, reason: 'not-admin' });
  });
  it('RESEP-03 splitAdminFromActive reverts when no separation is needed (already separated)', () => {
    expect(splitAdminFromActive('separated', 'COLD_ADMIN', 'HOT_WALLET', 'HOT_WALLET', 'HOT_WALLET')).toEqual({ ok: false, reason: 'no-separation-needed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The headline finding — UX does not surface the posture
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign B: UX surfacing gap (MEDIUM finding)', () => {
  it('UX-01 the frontend does NOT explain the three keys', () => {
    expect(currentUxSurfacing().explainsThreeKeys).toBe(false);
  });
  it('UX-02 the frontend does NOT guide separation in onboarding', () => {
    expect(currentUxSurfacing().guidesSeparationInOnboarding).toBe(false);
  });
  it('UX-03 the RecoverySplitReminder event is NOT surfaced (contract emits weekly; no UI consumer)', () => {
    expect(currentUxSurfacing().surfacesRecoverySplitReminder).toBe(false);
  });
  it('UX-04 the splitAdminFromActive re-separation action is NOT exposed in the UI (contract-only)', () => {
    expect(currentUxSurfacing().exposesSplitAdminFromActiveAction).toBe(false);
  });
});
