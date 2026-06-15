/**
 * Vault Funding + Ownership Retention — adversarial + edge matrix (OC campaign, Capability 1).
 *
 * Verifies Cap 1's two claims: assets ENTER the vault correctly, and assets REMAIN owned by the vault.
 * Centerpiece: a compromised admin CANNOT drain VFIDE via rescueERC20 (double-guarded), and VFIDE can only ever
 * leave via owner-signed bounded intents or inheritance — the non-custodial invariant on the funding/exit side.
 */
import { describe, it, expect } from '@jest/globals';
import {
  freshFunding, rawReceiveVFIDE, canReceiveTransfer, peerReceiveVFIDE,
  rescueERC20Propose, rescueERC20Apply, rescueERC20Cancel, rescueNativePropose, rescueNativeCancel,
  isAuthorizedVfideExit, MAX_VFIDE_WITHOUT_GUARDIAN, SENSITIVE_ADMIN_DELAY, type FundingState,
} from '@/lib/audit/vaultFundingModel';

const T0 = 40_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// Assets enter the vault correctly
// ─────────────────────────────────────────────────────────────────────────────
describe('funding: assets enter correctly', () => {
  it('FUND-01 VFIDE enters as a plain ERC20 balance (no deposit function needed)', () => {
    const s = freshFunding();
    rawReceiveVFIDE(s, 1000);
    expect(s.vaultBalance).toBe(1000);
  });
  it('FUND-02 a guardian-complete vault can receive any vault-to-vault amount', () => {
    const s = freshFunding({ guardianSetupComplete: true });
    expect(canReceiveTransfer(s, 1_000_000)).toBe(true);
    expect(peerReceiveVFIDE(s, 1_000_000).ok).toBe(true);
  });
  it('FUND-03 a guardian-LESS vault caps incoming vault-to-vault transfers at 50K', () => {
    const s = freshFunding({ guardianSetupComplete: false, vaultBalance: 0 });
    expect(peerReceiveVFIDE(s, MAX_VFIDE_WITHOUT_GUARDIAN).ok).toBe(true); // exactly at cap
    const s2 = freshFunding({ guardianSetupComplete: false, vaultBalance: 0 });
    expect(peerReceiveVFIDE(s2, MAX_VFIDE_WITHOUT_GUARDIAN + 1)).toEqual({ ok: false, reason: 'receiver-needs-guardian' });
  });
  it('FUND-04 the 50K cap is a SOFT cap — raw ERC20 transfers bypass it (no interceptable hook)', () => {
    const s = freshFunding({ guardianSetupComplete: false, vaultBalance: 0 });
    // a plain token transfer is NOT gated by canReceiveTransfer — it just credits the balance
    rawReceiveVFIDE(s, 80_000); // exceeds the 50K cap via a raw transfer
    expect(s.vaultBalance).toBe(80_000);
    // (documented: the binding pre-guardian loss bound is the daily spend limit, not this cap)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ownership retention — VFIDE cannot be drained by rescue (the linchpin)
// ─────────────────────────────────────────────────────────────────────────────
describe('ownership retention: rescue cannot touch VFIDE', () => {
  it('OWN-01 rescueERC20(VFIDE) is BLOCKED at propose time (double-guard #1)', () => {
    const s = freshFunding({ vaultBalance: 100_000 });
    expect(rescueERC20Propose(s, 'OWNER', s.vfideToken, 'ATTACKER', 100_000, T0))
      .toEqual({ ok: false, reason: 'cannot-rescue-vfide' });
    expect(s.pendingRescue).toBe(null); // nothing staged
  });
  it('OWN-02 even a COMPROMISED admin key cannot rescue VFIDE — the guard is unconditional', () => {
    const s = freshFunding({ vaultBalance: 100_000, admin: 'COMPROMISED' });
    // attacker controls admin; still cannot stage a VFIDE rescue
    expect(rescueERC20Propose(s, 'COMPROMISED', s.vfideToken, 'COMPROMISED', 100_000, T0))
      .toEqual({ ok: false, reason: 'cannot-rescue-vfide' });
  });
  it('OWN-03 apply-time re-check blocks VFIDE even if a pending entry were somehow staged (double-guard #2)', () => {
    const s = freshFunding({ vaultBalance: 100_000 });
    // simulate a pending VFIDE rescue smuggled in by another path
    s.pendingRescue = { token: s.vfideToken, to: 'ATTACKER', amount: 100_000, executeAt: T0 };
    expect(rescueERC20Apply(s, 'OWNER', T0 + 1)).toEqual({ ok: false, reason: 'cannot-rescue-vfide' });
  });
  it('OWN-04 the authorized VFIDE exits are EXACTLY the owner-controlled paths', () => {
    expect(isAuthorizedVfideExit('signed-intent-pay-merchant')).toBe(true);
    expect(isAuthorizedVfideExit('owner-withdrawal-queue')).toBe(true);
    expect(isAuthorizedVfideExit('inheritance-heir-payout')).toBe(true);
    // unauthorized drains
    expect(isAuthorizedVfideExit('admin-rescue')).toBe(false);
    expect(isAuthorizedVfideExit('admin-seize')).toBe(false);
    expect(isAuthorizedVfideExit('freeze-and-confiscate')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stray-token + native rescue — timelocked + guardian-cancellable
// ─────────────────────────────────────────────────────────────────────────────
describe('stray/native rescue is timelocked + guardian-vetoable', () => {
  it('STRAY-01 stray-token rescue requires the 7-day timelock to elapse', () => {
    const s = freshFunding();
    s.strayBalances.set('USDC', 5000);
    rescueERC20Propose(s, 'OWNER', 'USDC', 'OWNER', 5000, T0);
    expect(rescueERC20Apply(s, 'OWNER', T0 + 60)).toEqual({ ok: false, reason: 'timelock-not-elapsed' });
    expect(rescueERC20Apply(s, 'OWNER', T0 + SENSITIVE_ADMIN_DELAY + 1).ok).toBe(true);
  });
  it('STRAY-02 a GUARDIAN can cancel a pending stray-token rescue (stolen-key backstop)', () => {
    const s = freshFunding();
    rescueERC20Propose(s, 'COMPROMISED', 'USDC', 'COMPROMISED', 5000, T0);
    expect(s.admin === 'COMPROMISED').toBe(false); // admin is OWNER; the propose above would actually fail —
    // re-do with the real admin to stage a (timelocked) rescue, then a guardian cancels it:
    const s2 = freshFunding();
    rescueERC20Propose(s2, 'OWNER', 'USDC', 'SOMEWHERE', 5000, T0);
    expect(rescueERC20Cancel(s2, 'G1').ok).toBe(true); // guardian cancels
    expect(s2.pendingRescue).toBe(null);
  });
  it('STRAY-03 native (ETH) rescue is also guardian-cancellable during the timelock', () => {
    const s = freshFunding({ nativeBalance: 10 });
    rescueNativePropose(s, 'OWNER', 'SOMEWHERE', 10, T0);
    expect(rescueNativeCancel(s, 'G2').ok).toBe(true);
    expect(s.pendingNativeRescue).toBe(null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The non-custodial funding invariant (overall)
// ─────────────────────────────────────────────────────────────────────────────
describe('non-custodial funding invariant', () => {
  it('NC-01 funds in the vault are never seized/frozen — no unauthorized exit path exists', () => {
    const s = freshFunding({ vaultBalance: 100_000, admin: 'COMPROMISED' });
    // the only thing a compromised admin can attempt on the asset is rescue — which is VFIDE-blocked
    expect(rescueERC20Propose(s, 'COMPROMISED', s.vfideToken, 'COMPROMISED', 100_000, T0).ok).toBe(false);
    expect(s.vaultBalance).toBe(100_000); // untouched — ownership retained
  });
});
