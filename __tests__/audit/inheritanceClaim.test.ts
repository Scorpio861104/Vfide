/**
 * Inheritance Claims — adversarial + edge matrix (ACTIVE path audit, Continuity Audit 3).
 *
 * Executes the campaign's false-activation matrix against `inheritanceClaimModel.ts`:
 * false claim attempts, colluding heirs, over-claim, replay, over/under-subscription distribution math,
 * rounding, non-heir rejection, and the Audit-3 zero-weight finalize guard.
 */
import { describe, it, expect } from '@jest/globals';
import {
  freshClaim, claimHeirShare, finalize, totalPaid, TOTAL_BASIS_POINTS, type ClaimState,
} from '@/lib/audit/inheritanceClaimModel';

const heirs = (cs: { heir: string; basisPoints: number; secret: string }[]) => cs;

// ─────────────────────────────────────────────────────────────────────────────
// Commit-reveal integrity — no over-claim, correct secret required
// ─────────────────────────────────────────────────────────────────────────────
describe('commit-reveal integrity', () => {
  it('CR-01 a configured heir reveals their committed share with the correct secret', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 6000, secret: 'sA' }, { heir: 'B', basisPoints: 4000, secret: 'sB' }]), 1000);
    expect(claimHeirShare(s, 'A', 6000, 'sA').ok).toBe(true);
    expect(s.revealed.get('A')).toBe(6000);
  });
  it('CR-02 OVER-CLAIM is impossible — revealing MORE bps than committed does not match the commitment', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }]), 1000);
    expect(claimHeirShare(s, 'A', 9999, 'sA')).toEqual({ ok: false, reason: 'invalid-secret' });
    expect(s.totalRevealed).toBe(0);
  });
  it('CR-03 a wrong secret is rejected', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }]), 1000);
    expect(claimHeirShare(s, 'A', 5000, 'WRONG')).toEqual({ ok: false, reason: 'invalid-secret' });
  });
  it('CR-04 a NON-heir cannot reveal anything', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }]), 1000);
    expect(claimHeirShare(s, 'STRANGER', 5000, 'whatever')).toEqual({ ok: false, reason: 'invalid-secret' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Replay protection
// ─────────────────────────────────────────────────────────────────────────────
describe('replay protection', () => {
  it('REPLAY-01 an heir cannot reveal twice in the same claim', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }]), 1000);
    claimHeirShare(s, 'A', 5000, 'sA');
    expect(claimHeirShare(s, 'A', 5000, 'sA')).toEqual({ ok: false, reason: 'already-revealed' });
  });
  it('REPLAY-02 a commitment hash cannot be claimed twice (claimedHashes global)', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }]), 1000);
    claimHeirShare(s, 'A', 5000, 'sA');
    s.revealed.delete('A'); // simulate a fresh per-nonce reveal map but same global claimedHashes
    expect(claimHeirShare(s, 'A', 5000, 'sA')).toEqual({ ok: false, reason: 'hash-already-claimed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Distribution math — proportional, no over-payment, no dust loss
// ─────────────────────────────────────────────────────────────────────────────
describe('distribution math', () => {
  it('DIST-01 normal 60/40 split distributes EXACTLY the vault balance', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 6000, secret: 'sA' }, { heir: 'B', basisPoints: 4000, secret: 'sB' }]), 1000);
    claimHeirShare(s, 'A', 6000, 'sA'); claimHeirShare(s, 'B', 4000, 'sB');
    finalize(s);
    expect(totalPaid(s)).toBe(1000); // exact
    expect(s.payout.get('A')).toBe(600);
    expect(s.payout.get('B')).toBe(400);
  });
  it('DIST-02 OVER-SUBSCRIPTION (owner committed >10000) dilutes proportionally — never over-pays', () => {
    // owner misconfigured: A=8000, B=8000 (total 16000). Distribution must still sum to balance.
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 8000, secret: 'sA' }, { heir: 'B', basisPoints: 8000, secret: 'sB' }]), 1000);
    claimHeirShare(s, 'A', 8000, 'sA'); claimHeirShare(s, 'B', 8000, 'sB');
    finalize(s);
    expect(totalPaid(s)).toBe(1000); // exactly the balance, not 1600
  });
  it('DIST-03 UNDER-SUBSCRIPTION redistributes to revealers (last absorbs remainder) — documented policy', () => {
    // A=5000, B=5000 configured; only A reveals. A receives the whole balance (last revealer absorbs).
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }, { heir: 'B', basisPoints: 5000, secret: 'sB' }]), 1000);
    claimHeirShare(s, 'A', 5000, 'sA');
    finalize(s);
    expect(s.payout.get('A')).toBe(1000);
    expect(totalPaid(s)).toBe(1000);
  });
  it('DIST-04 rounding: the LAST revealer absorbs the dust so no wei is lost or created', () => {
    // 3 heirs, balance not divisible — last absorbs remainder
    const s = freshClaim(heirs([
      { heir: 'A', basisPoints: 3333, secret: 'sA' },
      { heir: 'B', basisPoints: 3333, secret: 'sB' },
      { heir: 'C', basisPoints: 3334, secret: 'sC' },
    ]), 1000);
    claimHeirShare(s, 'A', 3333, 'sA'); claimHeirShare(s, 'B', 3333, 'sB'); claimHeirShare(s, 'C', 3334, 'sC');
    finalize(s);
    expect(totalPaid(s)).toBe(1000); // no dust lost
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Colluding heirs
// ─────────────────────────────────────────────────────────────────────────────
describe('colluding heirs', () => {
  it('COLLUDE-01 colluding heirs cannot extract MORE than the vault balance', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 9999, secret: 'sA' }, { heir: 'B', basisPoints: 9999, secret: 'sB' }]), 500);
    claimHeirShare(s, 'A', 9999, 'sA'); claimHeirShare(s, 'B', 9999, 'sB');
    finalize(s);
    expect(totalPaid(s)).toBe(500); // capped at balance regardless of inflated bps
  });
  it('COLLUDE-02 a colluding non-heir still cannot inject a share', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }]), 1000);
    expect(claimHeirShare(s, 'ACCOMPLICE', 5000, 'forged')).toEqual({ ok: false, reason: 'invalid-secret' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE AUDIT-3 FIX: zero-weight reveal set must not brick finalization
// ─────────────────────────────────────────────────────────────────────────────
describe('zero-weight finalize guard (Audit-3 fix)', () => {
  it('ZERO-01 two heirs both committed 0 bps → finalize does NOT divide by zero; enters memorial', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 0, secret: 'sA' }, { heir: 'B', basisPoints: 0, secret: 'sB' }]), 1000);
    claimHeirShare(s, 'A', 0, 'sA'); claimHeirShare(s, 'B', 0, 'sB');
    expect(s.totalRevealed).toBe(0);
    const res = finalize(s);
    expect(res.ok).toBe(true);       // does not throw / brick
    expect(s.memorial).toBe(true);   // no distribution; funds remain → memorial
    expect(totalPaid(s)).toBe(0);
  });
  it('ZERO-02 a single 0-bps revealer already finalized safely pre-fix (last-heir path, no division)', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 0, secret: 'sA' }]), 1000);
    claimHeirShare(s, 'A', 0, 'sA');
    expect(finalize(s).ok).toBe(true);
    expect(s.memorial).toBe(true);
  });
  it('ZERO-03 no heirs reveal → memorial (funds preserved)', () => {
    const s = freshClaim(heirs([{ heir: 'A', basisPoints: 5000, secret: 'sA' }]), 1000);
    expect(finalize(s).ok).toBe(true);
    expect(s.memorial).toBe(true);
    expect(totalPaid(s)).toBe(0);
  });
});
