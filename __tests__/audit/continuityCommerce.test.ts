/**
 * Continuity ↔ Commerce Interaction — adversarial + edge matrix (OC campaign, Capability 7).
 *
 * Verifies the four Cap-7 sub-items: inheritance of vault assets, (non-)inheritance of wallet assets, recovery
 * interaction, proof-of-life interaction — and the unifying theme that continuity freezes fully govern the direct
 * channel but only partially govern the subscription channel.
 */
import { describe, it, expect } from '@jest/globals';
import {
  InhState, directSpendUnderContinuity, subscriptionPullUnderContinuity, settleByInheritance,
  heirPayout, initiateInheritance, spendingRefreshesProofOfLife, recoveryUnderContinuity,
  type InheritancePayout, type InitiationCtx, type RecoveryContinuityState,
} from '@/lib/audit/continuityCommerceModel';

// ─────────────────────────────────────────────────────────────────────────────
// Inheritance of vault assets (and non-existence of wallet assets)
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap7: inheritance distributes VAULT assets; there are no wallet assets', () => {
  it('INH-01 heir payout draws entirely from the vault balance', () => {
    const p: InheritancePayout = { vaultBalance: 10000, walletBalance: 0 };
    const r = heirPayout(p, 2500);
    expect(r.fromVault).toBe(2500);
    expect(r.fromWallet).toBe(0); // nothing in the wallet to inherit
    expect(p.vaultBalance).toBe(7500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Direct channel is fully frozen by inheritance
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap7: inheritance freezes the DIRECT channel immediately', () => {
  it('FREEZE-01 direct spend works in NORMAL state', () => {
    expect(directSpendUnderContinuity(InhState.NORMAL).ok).toBe(true);
  });
  it.each([InhState.VETO, InhState.CLAIM, InhState.MEMORIAL])('FREEZE-02 direct spend is BLOCKED once inheritance starts (state %s)', (s) => {
    expect(directSpendUnderContinuity(s)).toEqual({ ok: false, reason: 'inheritance-active' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subscription channel: the documented asymmetry
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap7: subscription channel continues through VETO + CLAIM (the asymmetry)', () => {
  it.each([InhState.VETO, InhState.CLAIM])('SUBC-01 a subscription STILL pulls during state %s (not frozen like direct)', (s) => {
    expect(subscriptionPullUnderContinuity(s, false).ok).toBe(true);
  });
  it('SUBC-02 settleByInheritance can cancel a subscription ONLY at MEMORIAL', () => {
    expect(settleByInheritance(InhState.VETO)).toEqual({ ok: false, reason: 'not-inheritance-active' });
    expect(settleByInheritance(InhState.CLAIM)).toEqual({ ok: false, reason: 'not-inheritance-active' });
    expect(settleByInheritance(InhState.MEMORIAL).ok).toBe(true);
  });
  it('SUBC-03 once settled, the subscription no longer pulls', () => {
    settleByInheritance(InhState.MEMORIAL); // active = false
    expect(subscriptionPullUnderContinuity(InhState.MEMORIAL, true)).toEqual({ ok: false, reason: 'inactive' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Proof-of-Life interaction
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap7: proof-of-life is reactive (guardian-initiated + veto), not a heartbeat', () => {
  it('POL-01 a guardian (not the DAO guardian) initiates a claim — no inactivity requirement', () => {
    const ctx: InitiationCtx = { state: InhState.NORMAL, heirCount: 2, pendingRecovery: false };
    expect(initiateInheritance(ctx, 'guardian').ok).toBe(true);
  });
  it('POL-02 the DAO guardian cannot initiate (Decision 12); an attacker (non-guardian) cannot either', () => {
    const ctx: InitiationCtx = { state: InhState.NORMAL, heirCount: 2, pendingRecovery: false };
    expect(initiateInheritance(ctx, 'daoGuardian')).toEqual({ ok: false, reason: 'dao-cannot-initiate' });
    expect(initiateInheritance(ctx, 'attacker')).toEqual({ ok: false, reason: 'not-guardian' });
  });
  it('POL-03 a claim cannot start with no heirs or during a pending recovery', () => {
    expect(initiateInheritance({ state: InhState.NORMAL, heirCount: 0, pendingRecovery: false }, 'guardian')).toEqual({ ok: false, reason: 'no-heirs' });
    expect(initiateInheritance({ state: InhState.NORMAL, heirCount: 2, pendingRecovery: true }, 'guardian')).toEqual({ ok: false, reason: 'recovery-in-progress' });
  });
  it('POL-04 spending does NOT refresh proof-of-life (active use is not the inheritance protection)', () => {
    expect(spendingRefreshesProofOfLife()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recovery interaction (cancels claim + clears direct queue; allowance persists)
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap7: recovery interaction across the seam', () => {
  it('REC-01 recovery cancels the inheritance claim and clears the direct payment queue', () => {
    const s: RecoveryContinuityState = { inhState: InhState.VETO, queueCleared: false, subscriptionAllowance: 1000 };
    const r = recoveryUnderContinuity(s);
    expect(r.claimCancelled).toBe(true);
    expect(s.inhState).toBe(InhState.NORMAL);
    expect(r.queueCleared).toBe(true);
  });
  it('REC-02 recovery does NOT revoke the subscription allowance — consistent cross-channel gap', () => {
    const s: RecoveryContinuityState = { inhState: InhState.VETO, queueCleared: false, subscriptionAllowance: 1000 };
    const r = recoveryUnderContinuity(s);
    expect(r.allowanceRevoked).toBe(false);
    expect(s.subscriptionAllowance).toBe(1000); // the subscription channel escapes both continuity freezes
  });
});
