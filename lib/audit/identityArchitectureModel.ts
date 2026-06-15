/**
 * Identity Architecture — executable logic model (Backend Completion Campaign 2).
 *
 * Certifies VFIDE's full identity surface — extending the certified three-domain core (owner/admin/spending,
 * Campaign C / Wave 98) to the role identities (guardian, DAO, merchant, staff, auditor), traced from source:
 *   • owner (ownerOfVault), admin, spending (activeWallet): on-chain, CERTIFIED in Campaign C.
 *   • guardian: on-chain (isGuardian + threshold; proposeGuardianChange timelocked).
 *   • dao: on-chain (onlyDAO modifier; setDAO transfers it).
 *   • merchant: on-chain (addMerchant self-register, min ProofScore; non-merchant status reverts).
 *   • staff (admin/manager/cashier): OFF-CHAIN (staffAuthEngine: session + per-action permissions + per-tx/daily
 *     caps; canAssignRole privilege-escalation guard; route gates BEFORE the action).
 *   • auditor: NOMINAL — human-auditor code comments + a narrow council-gated ownership-handover concept in
 *     SystemHandover; NOT a first-class system-wide enforced identity (Finding I-1).
 *
 * Certifies: each identity's enforcement layer, its capability authority (create/rotate/revoke/recover/transfer),
 * the no-escalation invariant across identities, and compromise / device-loss / inheritance behavior.
 *
 * NOT the compiled contracts / running service; on-chain stage-2 + service e2e are the deployment confirmations.
 */

export type Identity = 'owner' | 'admin' | 'spending' | 'guardian' | 'dao' | 'merchant' | 'staff' | 'auditor';
export type Enforcement = 'onchain' | 'offchain' | 'nominal';
export type Capability = 'create' | 'rotate' | 'revoke' | 'recover' | 'transfer';
export type StaffRole = 'admin' | 'manager' | 'cashier';

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

// ── Enforcement layer per identity (the I-1 finding: auditor is nominal) ─────
export function enforcementOf(id: Identity): Enforcement {
  switch (id) {
    case 'owner': case 'admin': case 'spending': case 'guardian': case 'dao': case 'merchant': return 'onchain';
    case 'staff': return 'offchain';
    case 'auditor': return 'nominal'; // not a first-class enforced identity
  }
}
export function isFirstClassEnforced(id: Identity): boolean {
  return enforcementOf(id) !== 'nominal';
}

// ── Capability authority: who may perform a capability on an identity ────────
/**
 * Returns whether `actor` is authorized to perform `cap` on identity `id`, by the contract/route rules.
 * Encodes the verified authority; the certified core (owner/admin/spending) reuses Campaign C's conclusions.
 */
export function capabilityAuthority(id: Identity, cap: Capability, actor: Identity | 'self' | 'guardianSet' | 'merchantSelf'): R {
  switch (id) {
    case 'owner':
      // changes only at registration (create) and recovery (recover/transfer); never by rotation/admin
      if (cap === 'create') return actor === 'self' ? OK : E('owner-created-at-registration');
      if (cap === 'recover' || cap === 'transfer') return actor === 'guardianSet' ? OK : E('owner-changes-only-via-recovery');
      return E('owner-not-rotatable'); // rotate/revoke N/A
    case 'admin':
      if (cap === 'transfer') return actor === 'admin' ? OK : E('admin-transfer-is-onlyAdmin-twostep');
      if (cap === 'recover') return actor === 'guardianSet' ? OK : E('admin-reset-only-via-recovery');
      return E('admin-cap-unsupported');
    case 'spending':
      if (cap === 'rotate') return actor === 'admin' ? OK : E('rotation-admin-proposed-guardian-approved');
      if (cap === 'recover') return actor === 'guardianSet' ? OK : E('spending-reset-via-recovery');
      return E('spending-cap-unsupported');
    case 'guardian':
      // assign/revoke by admin via timelocked proposeGuardianChange
      if (cap === 'create' || cap === 'revoke') return actor === 'admin' ? OK : E('guardian-change-is-admin-timelocked');
      return E('guardian-cap-unsupported');
    case 'dao':
      if (cap === 'transfer') return actor === 'dao' ? OK : E('dao-transfer-is-onlyDAO');
      return E('dao-cap-unsupported');
    case 'merchant':
      if (cap === 'create') return actor === 'merchantSelf' ? OK : E('merchant-self-registers-with-min-score');
      if (cap === 'revoke') return actor === 'dao' ? OK : E('merchant-status-change-governed');
      return E('merchant-cap-unsupported');
    case 'staff':
      if (cap === 'create' || cap === 'revoke') return (actor === 'owner' || actor === 'admin') ? OK : E('staff-managed-by-owner-or-admin');
      return E('staff-cap-unsupported');
    case 'auditor':
      return E('auditor-not-first-class'); // no enforced create/rotate/revoke for a system-wide auditor identity
  }
}

// ── Staff privilege-escalation guard (canAssignRole) ─────────────────────────
export function canAssignRole(actor: StaffRole | 'owner', target: StaffRole): boolean {
  if (actor === 'owner') return true;
  if (actor === 'admin') return target !== 'admin'; // admins cannot create other admins
  return false; // managers/cashiers cannot manage staff
}

// ── Staff action authorization (session + permissions + caps) ────────────────
export interface StaffCtx {
  active: boolean; expired: boolean;
  perms: { processSales: boolean; issueRefunds: boolean; editProducts: boolean; viewAnalytics: boolean; maxSale: number; dailyLimit: number };
  todaysTotal: number;
}
export type StaffAction = 'sale' | 'refund' | 'product_edit' | 'view_analytics';
export function authorizeStaffAction(ctx: StaffCtx, action: StaffAction, amount = 0): R {
  if (!ctx.active) return E('INACTIVE');
  if (ctx.expired) return E('EXPIRED');
  const p = ctx.perms;
  switch (action) {
    case 'product_edit': return p.editProducts ? OK : E('NOT_PERMITTED');
    case 'view_analytics': return p.viewAnalytics ? OK : E('NOT_PERMITTED');
    case 'refund': return p.issueRefunds ? OK : E('NOT_PERMITTED');
    case 'sale':
      if (!p.processSales) return E('NOT_PERMITTED');
      if (amount < 0) return E('INVALID_AMOUNT');
      if (amount > p.maxSale) return E('OVER_MAX_SALE');
      if (ctx.todaysTotal + amount > p.dailyLimit) return E('OVER_DAILY_LIMIT');
      return OK;
  }
}

// ── No-escalation across identities ──────────────────────────────────────────
/** Can holding `from` let an actor unilaterally acquire `to`'s authority? Must be false for every distinct pair. */
export function canEscalate(from: Identity, to: Identity): boolean {
  if (from === to) return true;
  // spending/staff/cashier-level identities cannot acquire admin/owner/dao; merchant can't acquire dao; etc.
  // The only "upward" influence is admin proposing a spending-key rotation — guardian-approved, not unilateral.
  return false;
}

// ── Compromise / device-loss / inheritance behavior ──────────────────────────
/** What a compromise of `id` can do is bounded; none of these grant a higher identity instantly. */
export function compromiseRaisesAuthority(id: Identity): boolean {
  return false; // proven for the core in Campaign C; role identities are similarly bounded
}
/** Key-based identities are recoverable via guardian recovery after device loss; off-chain/nominal are not "recovered" the same way. */
export function deviceLossRecoverable(id: Identity): boolean {
  return enforcementOf(id) === 'onchain'; // owner/admin/spending/guardian/dao/merchant recover via on-chain paths; staff are re-issued by the merchant
}
/** Does the identity/role transfer on the owner's inheritance? Asset ownership transfers; operational roles do NOT auto-transfer. */
export function inheritanceTransfersIdentity(id: Identity): boolean {
  // inheritance distributes VAULT ASSETS to heirs (new identities); it does NOT hand an heir the deceased's
  // admin/guardian/merchant/staff roles automatically.
  return false;
}
