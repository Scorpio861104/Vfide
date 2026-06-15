/**
 * Point-of-Sale engine (Commerce Operations Phase 4 — Physical Retail).
 *
 * Pure, side-effect-free logic for the parts of in-person retail that carry real money/inventory risk:
 *   • register session lifecycle (open float → sales/refunds/payouts → close count → over/short)
 *   • cash-drawer reconciliation (expected vs counted)
 *   • location inventory availability + the cross-location transfer rule
 *   • the receipt total (which must equal the Phase 1 composed order total — POS does not invent pricing)
 *
 * A POS sale is an in-person ORDER: it reuses the Phase 1 pricing pipeline (composePrice) and is gated by the
 * Phase 3 staff authorization (authorizeStaffAction). This module owns only the cash/inventory/session math.
 */

function round(n: number): number { return Math.round(n * 100) / 100; }

// ─────────────────────────── Register session / cash drawer

export type RegisterStatus = 'open' | 'closed';
export type DrawerMovementKind = 'sale_cash' | 'refund_cash' | 'payout' | 'pay_in';

export interface DrawerMovement { kind: DrawerMovementKind; amount: number; }

/**
 * Expected cash in the drawer at close = opening float + cash sales + pay-ins − cash refunds − payouts.
 * Card/wallet sales never touch the drawer, so only the *_cash and payout/pay_in movements count.
 */
export function expectedDrawer(openingFloat: number, movements: DrawerMovement[]): number {
  let total = round(Math.max(0, openingFloat));
  for (const m of movements) {
    const amt = Math.max(0, m.amount);
    if (m.kind === 'sale_cash' || m.kind === 'pay_in') total += amt;
    else if (m.kind === 'refund_cash' || m.kind === 'payout') total -= amt;
  }
  return round(total);
}

export interface Reconciliation { expected: number; counted: number; variance: number; status: 'balanced' | 'over' | 'short'; }

/** Reconcile a counted drawer against expected. variance>0 = over (too much cash), <0 = short. */
export function reconcileDrawer(openingFloat: number, movements: DrawerMovement[], countedCash: number): Reconciliation {
  const expected = expectedDrawer(openingFloat, movements);
  const counted = round(Math.max(0, countedCash));
  const variance = round(counted - expected);
  return { expected, counted, variance, status: variance === 0 ? 'balanced' : variance > 0 ? 'over' : 'short' };
}

export type RegisterTransition = 'open' | 'record' | 'close';

/** A register must be open to record movements, and can only close from open. */
export function canRegisterAct(status: RegisterStatus, action: RegisterTransition): boolean {
  if (action === 'open') return status === 'closed';
  if (action === 'record') return status === 'open';
  if (action === 'close') return status === 'open';
  return false;
}

// ─────────────────────────── Location inventory

export interface LocationStock { location_id: string; product_id: number; quantity: number; }

/** Stock available for a product at a location (0 if none tracked there). */
export function availableAt(stocks: LocationStock[], locationId: string, productId: number): number {
  const row = stocks.find((s) => s.location_id === locationId && s.product_id === productId);
  return row ? Math.max(0, row.quantity) : 0;
}

export interface SaleLine { product_id: number; quantity: number; }

/**
 * Can a sale be fulfilled from a location's stock? Returns the first shortfall, or ok. Untracked products
 * (no stock row) are treated as unavailable AT THIS LOCATION when location inventory is enforced.
 */
export function canFulfillAtLocation(
  stocks: LocationStock[], locationId: string, lines: SaleLine[],
): { ok: true } | { ok: false; product_id: number; available: number; requested: number } {
  for (const line of lines) {
    const have = availableAt(stocks, locationId, line.product_id);
    const need = Math.max(0, Math.floor(line.quantity));
    if (need > have) return { ok: false, product_id: line.product_id, available: have, requested: need };
  }
  return { ok: true };
}

export interface TransferResult { ok: boolean; reason?: 'INSUFFICIENT_SOURCE' | 'SAME_LOCATION' | 'BAD_QUANTITY'; fromAfter?: number; toAfter?: number; }

/**
 * Move `qty` of a product from one location to another. Conserves total units (no creation/destruction): the
 * source must have enough, and you can't transfer to the same location or a non-positive quantity.
 */
export function computeTransfer(fromQty: number, toQty: number, qty: number, sameLocation: boolean): TransferResult {
  if (sameLocation) return { ok: false, reason: 'SAME_LOCATION' };
  const q = Math.floor(qty);
  if (!Number.isFinite(q) || q <= 0) return { ok: false, reason: 'BAD_QUANTITY' };
  if (q > Math.max(0, fromQty)) return { ok: false, reason: 'INSUFFICIENT_SOURCE' };
  return { ok: true, fromAfter: round(fromQty - q), toAfter: round(Math.max(0, toQty) + q) };
}

// ─────────────────────────── Receipt

export interface ReceiptLine { name: string; quantity: number; unit_price: number; }
export interface Receipt {
  lines: Array<ReceiptLine & { line_total: number }>;
  subtotal: number; discount: number; tax: number; shipping: number; total: number;
  tendered: number; change: number;
}

/**
 * Build a receipt. The monetary total MUST be supplied from the Phase 1 composed order (composePrice) — POS
 * does not recompute pricing. This only lays out lines and computes cash change for a cash tender.
 * `change` is only meaningful for cash; for card/wallet pass tendered = total (change 0).
 */
export function buildReceipt(
  lines: ReceiptLine[],
  composed: { subtotal: number; discount: number; tax: number; shipping: number; total: number },
  tendered: number,
): Receipt {
  const out = lines.map((l) => ({ ...l, line_total: round(l.unit_price * Math.max(0, l.quantity)) }));
  const total = round(Math.max(0, composed.total));
  const tend = round(Math.max(0, tendered));
  const change = round(Math.max(0, tend - total));
  return {
    lines: out,
    subtotal: round(composed.subtotal), discount: round(composed.discount), tax: round(composed.tax),
    shipping: round(composed.shipping), total, tendered: tend, change,
  };
}

/** A cash tender must cover the total; card/wallet is assumed exact. Returns whether the tender is sufficient. */
export function tenderSufficient(total: number, tendered: number, method: 'cash' | 'card' | 'wallet'): boolean {
  if (method === 'cash') return round(tendered) >= round(total);
  return true; // card/wallet charged for the exact total elsewhere
}
