/**
 * Ownership Identity Architecture — adversarial + edge matrix (Campaign C).
 *
 * Certifies the three security domains: their mutation paths, the no-escalation invariant, the identity↔spending-key
 * divergence, and the vaultOf consequences across rotation / recovery / inheritance (including the OC-3 correction:
 * recovery DOES sever subscriptions).
 */
import { describe, it, expect } from '@jest/globals';
import {
  canMutate, canEscalate, transferAdmin, acceptAdmin, recoveryTransfer, legitimateRotation, inheritanceDistribution,
  subscriptionResolves, commerceResolvesCaller, type Domain, type Mutator, type HubMapping, type AdminTransfer,
} from '@/lib/audit/ownershipIdentityModel';

const domains: Domain[] = ['ownerIdentity', 'admin', 'spending'];

// ─────────────────────────────────────────────────────────────────────────────
// Mutation surface — each domain changes only via its authorized mutators
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign C: mutation surface per domain', () => {
  it('MUT-01 ownerIdentity changes ONLY via registration or recovery (not admin transfer, not rotation)', () => {
    expect(canMutate('ownerIdentity', 'registration')).toBe(true);
    expect(canMutate('ownerIdentity', 'recovery')).toBe(true);
    expect(canMutate('ownerIdentity', 'transferAdmin')).toBe(false);
    expect(canMutate('ownerIdentity', 'walletRotation')).toBe(false); // the OC-4 divergence: rotation leaves identity intact
  });
  it('MUT-02 admin changes via two-step transferAdmin or recovery', () => {
    expect(canMutate('admin', 'transferAdmin')).toBe(true);
    expect(canMutate('admin', 'recovery')).toBe(true);
    expect(canMutate('admin', 'walletRotation')).toBe(false);
  });
  it('MUT-03 spending (activeWallet) changes via wallet rotation or recovery', () => {
    expect(canMutate('spending', 'walletRotation')).toBe(true);
    expect(canMutate('spending', 'recovery')).toBe(true);
    expect(canMutate('spending', 'transferAdmin')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NO-ESCALATION invariant — no lower domain acquires a higher one unilaterally
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign C: no-escalation invariant', () => {
  it('ESC-01 the spending key cannot unilaterally acquire admin or owner identity', () => {
    expect(canEscalate('spending', 'admin')).toBe(false);
    expect(canEscalate('spending', 'ownerIdentity')).toBe(false);
  });
  it('ESC-02 admin cannot unilaterally acquire the owner identity (only recovery changes ownerOfVault)', () => {
    expect(canEscalate('admin', 'ownerIdentity')).toBe(false);
  });
  it('ESC-03 the owner identity does not command admin or spending (orthogonal powers)', () => {
    expect(canEscalate('ownerIdentity', 'admin')).toBe(false);
    expect(canEscalate('ownerIdentity', 'spending')).toBe(false);
  });
  it('ESC-04 no cross-domain escalation exists for ANY ordered pair of distinct domains', () => {
    for (const a of domains) for (const b of domains) {
      if (a !== b) expect(canEscalate(a, b)).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin transfer is a SECURE two-step (no accidental hand-off)
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign C: admin two-step transfer', () => {
  it('ADM-01 transferAdmin does not change admin until the successor accepts', () => {
    const s: AdminTransfer = { admin: 'OWNER', pendingAdmin: '' };
    expect(transferAdmin(s, 'OWNER', 'NEW_ADMIN').ok).toBe(true);
    expect(s.admin).toBe('OWNER'); // unchanged until accept
    expect(acceptAdmin(s, 'NEW_ADMIN').ok).toBe(true);
    expect(s.admin).toBe('NEW_ADMIN');
  });
  it('ADM-02 only the current admin can initiate, and only the named successor can accept', () => {
    const s: AdminTransfer = { admin: 'OWNER', pendingAdmin: '' };
    expect(transferAdmin(s, 'ATTACKER', 'ATTACKER')).toEqual({ ok: false, reason: 'not-admin' });
    transferAdmin(s, 'OWNER', 'NEW_ADMIN');
    expect(acceptAdmin(s, 'ATTACKER')).toEqual({ ok: false, reason: 'not-pending-admin' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Identity ↔ spending-key divergence + vaultOf consequences (the OC-3 correction)
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign C: vaultOf semantics across transitions', () => {
  const fresh = (): HubMapping => ({
    vaultOf: new Map([['OWNER', 'VAULT']]),
    ownerOfVault: new Map([['VAULT', 'OWNER']]),
  });

  it('DIV-01 a legitimate rotation leaves the hub mapping intact → subscriptions SURVIVE', () => {
    const h = fresh();
    legitimateRotation(h, 'VAULT'); // activeWallet changes; vaultOf untouched
    expect(subscriptionResolves(h, 'OWNER', 'VAULT').ok).toBe(true); // still resolves + pins
  });
  it('DIV-02 RECOVERY clears the old owner vaultOf → subscriptions are SEVERED (OC-3 CORRECTION)', () => {
    const h = fresh();
    recoveryTransfer(h, 'VAULT', 'OWNER', 'NEW_WALLET');
    expect(subscriptionResolves(h, 'OWNER', 'VAULT')).toEqual({ ok: false, reason: 'no-user-vault' });
  });
  it('DIV-03 inheritance does NOT change the deceased vaultOf → subscriptions CONTINUE (OC-5 stands)', () => {
    const h = fresh();
    inheritanceDistribution(h, 'VAULT');
    expect(subscriptionResolves(h, 'OWNER', 'VAULT').ok).toBe(true); // continues until settleByInheritance at MEMORIAL
  });
  it('DIV-04 after recovery, the NEW owner identity resolves to the vault (mapping re-synced)', () => {
    const h = fresh();
    recoveryTransfer(h, 'VAULT', 'OWNER', 'NEW_WALLET');
    expect(subscriptionResolves(h, 'NEW_WALLET', 'VAULT').ok).toBe(true);
  });
  it('DIV-05 commerce resolves the CALLER via vaultOf — i.e. the owner identity, not the spending key', () => {
    const h = fresh();
    expect(commerceResolvesCaller(h, 'OWNER').ok).toBe(true); // owner identity is registered
    expect(commerceResolvesCaller(h, 'ROTATED_SPENDING_KEY')).toEqual({ ok: false, reason: 'no-vault-for-caller' });
    // ^ safe failure: a rotated spending key is not the commerce identity — call fails closed, never escalates
  });
});
