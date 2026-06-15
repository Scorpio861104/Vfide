import { describe, expect, it } from '@jest/globals';
import {
  authorizeTransfer, authorizeRescueERC20, canCancelPending, codeCannotBeSwapped, applyInheritance,
  type TransferIntent, type VaultState, type Actor,
} from '@/lib/audit/ownershipInvariants';

const ST = (o: Partial<VaultState> = {}): VaultState => ({
  blockChainId: 8453, walletEpoch: 1, nextNonce: 5, now: 1000, maxPerTransfer: 1000,
  dailyTransferLimit: 5000, spentToday: 0, largeTransferThreshold: 0, ...o,
});
const IN = (o: Partial<TransferIntent> = {}): TransferIntent => ({
  signer: 'activeWallet', vault: 'self', toVault: 'valid', chainId: 8453, walletEpoch: 1,
  nonce: 5, deadline: 2000, amount: 100, ...o,
});

// ════════════════════════════════════════════════════════
// CORE OWNERSHIP — NON-CUSTODIAL INVARIANT MATRIX (models CardBoundVault authorization logic)
//   A. Owner-signature gate   B. No third party moves funds   C. Replay/binding   D. Limits + queue
//   E. Rescue cannot touch VFIDE   F. Guardian backstop   G. Code immutability   H. Inheritance
// ════════════════════════════════════════════════════════

describe('Core Ownership · A. Only the owner can move the owner funds', () => {
  it('A1 a valid activeWallet-signed intent is authorized', () => expect(authorizeTransfer(IN(), ST())).toEqual({ ok: true, queued: false }));
  it('A2 an admin-signed intent CANNOT move funds', () => expect(authorizeTransfer(IN({ signer: 'admin' }), ST())).toEqual({ ok: false, reason: 'NOT_OWNER_SIGNER' }));
  it('A3 a guardian-signed intent CANNOT move funds', () => expect(authorizeTransfer(IN({ signer: 'guardian' }), ST()).ok).toBe(false));
  it('A4 a DAO-signed intent CANNOT move funds', () => expect(authorizeTransfer(IN({ signer: 'dao' }), ST()).ok).toBe(false));
  it('A5 an attacker-signed intent CANNOT move funds', () => expect(authorizeTransfer(IN({ signer: 'attacker' }), ST()).reason).toBe('NOT_OWNER_SIGNER'));
});

describe('Core Ownership · B. Destination protections', () => {
  it('B1 cannot send to self', () => expect(authorizeTransfer(IN({ toVault: 'self' }), ST()).ok).toBe(false));
  it('B2 cannot send to the dead/burn address', () => expect(authorizeTransfer(IN({ toVault: 'dead' }), ST()).ok).toBe(false));
  it('B3 cannot send to a non-vault address', () => expect(authorizeTransfer(IN({ toVault: 'nonVault' }), ST()).ok).toBe(false));
  it('B4 intent for a different vault is rejected', () => expect(authorizeTransfer(IN({ vault: 'other' }), ST()).ok).toBe(false));
});

describe('Core Ownership · C. Replay / binding (signed intent cannot be reused or cross-bound)', () => {
  it('C1 wrong chain id rejected', () => expect(authorizeTransfer(IN({ chainId: 1 }), ST()).reason).toBe('BAD_CHAIN'));
  it('C2 stale wallet epoch rejected (rotation invalidates old intents)', () => expect(authorizeTransfer(IN({ walletEpoch: 0 }), ST()).reason).toBe('BAD_EPOCH'));
  it('C3 wrong nonce rejected (no replay)', () => expect(authorizeTransfer(IN({ nonce: 4 }), ST()).reason).toBe('BAD_NONCE'));
  it('C4 expired deadline rejected', () => expect(authorizeTransfer(IN({ deadline: 999 }), ST({ now: 1000 })).reason).toBe('EXPIRED'));
});

describe('Core Ownership · D. Spend limits + large-transfer queue', () => {
  it('D1 over per-transfer max rejected', () => expect(authorizeTransfer(IN({ amount: 1001 }), ST({ maxPerTransfer: 1000 })).reason).toBe('OVER_MAX'));
  it('D2 over daily limit rejected (incl. already spent today)', () => expect(authorizeTransfer(IN({ amount: 500 }), ST({ dailyTransferLimit: 1000, spentToday: 600 })).reason).toBe('OVER_DAILY'));
  it('D3 zero amount rejected', () => expect(authorizeTransfer(IN({ amount: 0 }), ST()).reason).toBe('ZERO'));
  it('D4 a large transfer is QUEUED (7-day cancellable), not executed immediately', () => {
    expect(authorizeTransfer(IN({ amount: 900 }), ST({ largeTransferThreshold: 500, maxPerTransfer: 1000 }))).toEqual({ ok: true, queued: true });
  });
  it('D5 below the large threshold executes immediately', () => {
    expect(authorizeTransfer(IN({ amount: 100 }), ST({ largeTransferThreshold: 500 }))).toEqual({ ok: true, queued: false });
  });
});

describe('Core Ownership · E. Admin rescue can NEVER touch the owner VFIDE', () => {
  it('E1 admin rescuing VFIDE is blocked (the headline custodial attack)', () => {
    expect(authorizeRescueERC20('admin', 'VFIDE', 'set')).toEqual({ ok: false, reason: 'CANNOT_RESCUE_VFIDE' });
  });
  it('E2 admin rescuing a STRAY token is allowed (mis-sent recovery)', () => {
    expect(authorizeRescueERC20('admin', 'strayToken', 'set')).toEqual({ ok: true });
  });
  it('E3 a non-admin cannot call rescue at all', () => {
    expect(authorizeRescueERC20('attacker', 'strayToken', 'set').ok).toBe(false);
    expect(authorizeRescueERC20('guardian', 'strayToken', 'set').ok).toBe(false);
  });
  it('E4 rescue to the zero address rejected', () => expect(authorizeRescueERC20('admin', 'strayToken', 'zero').ok).toBe(false));
});

describe('Core Ownership · F. Guardian backstop (stolen-key defense)', () => {
  it('F1 a guardian can cancel a pending rescue/large-transfer', () => expect(canCancelPending('guardian')).toBe(true));
  it('F2 the admin can cancel a pending action', () => expect(canCancelPending('admin')).toBe(true));
  it('F3 an attacker cannot cancel (cannot grief), but also cannot force through', () => expect(canCancelPending('attacker')).toBe(false));
});

describe('Core Ownership · G. Code cannot be swapped (the basis of "non-custodial by absence")', () => {
  it('G1 immutable facet + no setter + no selfdestruct ⇒ code frozen (the actual vault)', () => {
    expect(codeCannotBeSwapped({ adminFacetImmutable: true, hasSetterForFacet: false, hasSelfdestruct: false, usesCreate2: true })).toBe(true);
  });
  it('G2 a facet SETTER would break it (admin could point at a malicious drain facet)', () => {
    expect(codeCannotBeSwapped({ adminFacetImmutable: false, hasSetterForFacet: true, hasSelfdestruct: false, usesCreate2: true })).toBe(false);
  });
  it('G3 selfdestruct would break it (metamorphic CREATE2 redeploy replaces code)', () => {
    expect(codeCannotBeSwapped({ adminFacetImmutable: true, hasSetterForFacet: false, hasSelfdestruct: true, usesCreate2: true })).toBe(false);
  });
  it('G4 CREATE2 alone (no selfdestruct) is safe — deterministic address, not replaceable', () => {
    expect(codeCannotBeSwapped({ adminFacetImmutable: true, hasSetterForFacet: false, hasSelfdestruct: false, usesCreate2: true })).toBe(true);
  });
});

describe('Core Ownership · H. Inheritance: living owner always wins; DAO can veto not initiate', () => {
  it('H1 the DAO cannot INITIATE a claim', () => expect(applyInheritance('none', { actor: 'dao', action: 'initiate' }, false).ok).toBe(false));
  it('H2 an attacker cannot initiate', () => expect(applyInheritance('none', { actor: 'attacker', action: 'initiate' }, false).ok).toBe(false));
  it('H3 a heir-guardian can initiate after PoL failure', () => expect(applyInheritance('none', { actor: 'guardian', action: 'initiate' }, false)).toEqual({ ok: true, next: 'veto_period' }));
  it('H4 the living owner can ALWAYS override a claim', () => expect(applyInheritance('claim_window', { actor: 'activeWallet', action: 'ownerOverride' }, true)).toEqual({ ok: true, next: 'none' }));
  it('H5 the DAO can VETO during the veto period (protective)', () => expect(applyInheritance('veto_period', { actor: 'dao', action: 'veto' }, false)).toEqual({ ok: true, next: 'none' }));
  it('H6 a claim CANNOT complete while the owner is alive', () => expect(applyInheritance('claim_window', { actor: 'guardian', action: 'claim' }, true).reason).toBe('OWNER_ALIVE_BLOCKS_CLAIM'));
  it('H7 a heir-guardian can claim only in the claim window, only when owner absent', () => {
    expect(applyInheritance('claim_window', { actor: 'guardian', action: 'claim' }, false)).toEqual({ ok: true, next: 'claimed' });
    expect(applyInheritance('veto_period', { actor: 'guardian', action: 'claim' }, false).ok).toBe(false); // not yet in claim window
  });
  it('H8 an attacker cannot claim even when the owner is absent', () => expect(applyInheritance('claim_window', { actor: 'attacker', action: 'claim' }, false).ok).toBe(false));
});
