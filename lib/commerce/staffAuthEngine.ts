/**
 * Staff authorization engine (Commerce Operations Phase 3 — Workforce).
 *
 * Pure, side-effect-free decisions for whether a staff member may perform an action (process a sale of $X,
 * issue a refund, edit a product) given their role permissions, per-staff limits, and what they've already
 * done TODAY. This is the ENFORCEMENT the RBAC model was missing — the presets/limits in lib/merchantStaff.ts
 * were stored and displayed but never gated at the point of action.
 *
 * In-house logic; no external boundary. The staff route calls these before logging/permitting an action.
 */

export type StaffRole = 'admin' | 'manager' | 'cashier';

export interface StaffPermissions {
  processSales: boolean;
  viewProducts: boolean;
  editProducts: boolean;
  issueRefunds: boolean;
  viewAnalytics: boolean;
  maxSaleAmount: number;   // per-transaction cap (0 = no cap only if role grants unlimited; here 0 means "blocked")
  dailySaleLimit: number;  // cumulative per-day cap
}

export type StaffActionKind = 'sale' | 'refund' | 'product_edit' | 'view_analytics';

export type StaffDenial =
  | 'INACTIVE' | 'EXPIRED' | 'NOT_PERMITTED' | 'OVER_MAX_SALE' | 'OVER_DAILY_LIMIT' | 'INVALID_AMOUNT';

export interface StaffContext {
  active: boolean;
  expiresAtMs: number | null;  // null = no expiry
  nowMs: number;
  permissions: StaffPermissions;
  todaysSaleTotal: number;     // sum of this staff's sale amounts already today
}

export interface StaffDecision {
  ok: boolean;
  reason?: StaffDenial;
  /** For sales: the cumulative total after this action would be allowed (for display/telemetry). */
  newDailyTotal?: number;
}

function round(n: number): number { return Math.round(n * 100) / 100; }

/** Is the staff session usable at all (active + not expired)? */
function sessionUsable(ctx: StaffContext): StaffDenial | null {
  if (!ctx.active) return 'INACTIVE';
  if (ctx.expiresAtMs != null && ctx.expiresAtMs <= ctx.nowMs) return 'EXPIRED';
  return null;
}

/**
 * Authorize a staff action. For a `sale`, `amount` is the transaction value and BOTH the per-transaction cap
 * (maxSaleAmount) and the cumulative daily cap (dailySaleLimit) are enforced against today's running total.
 */
export function authorizeStaffAction(ctx: StaffContext, kind: StaffActionKind, amount = 0): StaffDecision {
  const sessionProblem = sessionUsable(ctx);
  if (sessionProblem) return { ok: false, reason: sessionProblem };

  const p = ctx.permissions;
  switch (kind) {
    case 'product_edit':
      return p.editProducts ? { ok: true } : { ok: false, reason: 'NOT_PERMITTED' };
    case 'view_analytics':
      return p.viewAnalytics ? { ok: true } : { ok: false, reason: 'NOT_PERMITTED' };
    case 'refund':
      return p.issueRefunds ? { ok: true } : { ok: false, reason: 'NOT_PERMITTED' };
    case 'sale': {
      if (!p.processSales) return { ok: false, reason: 'NOT_PERMITTED' };
      if (!Number.isFinite(amount) || amount < 0) return { ok: false, reason: 'INVALID_AMOUNT' };
      // per-transaction cap
      if (amount > p.maxSaleAmount) return { ok: false, reason: 'OVER_MAX_SALE' };
      // cumulative daily cap
      const projected = round(ctx.todaysSaleTotal + amount);
      if (projected > p.dailySaleLimit) return { ok: false, reason: 'OVER_DAILY_LIMIT' };
      return { ok: true, newDailyTotal: projected };
    }
    default:
      return { ok: false, reason: 'NOT_PERMITTED' };
  }
}

/**
 * Whether a *role* may be assigned/escalated by an actor. Only an admin (or the owner) may create admins or
 * managers; this guards privilege escalation when staff management is delegated. Owner is handled by the route
 * (owner == merchant); this covers staff-managing-staff if that is ever delegated.
 */
export function canAssignRole(actorRole: StaffRole | 'owner', targetRole: StaffRole): boolean {
  if (actorRole === 'owner') return true;          // the merchant can assign anything
  if (actorRole === 'admin') return targetRole !== 'admin'; // admins can make managers/cashiers, not other admins
  return false;                                     // managers/cashiers cannot manage staff
}
