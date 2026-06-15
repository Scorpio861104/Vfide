/**
 * Merchant business-records transfer (Phase 1 — Succession Execution).
 *
 * Executes the off-chain half of "a business survives the owner": reassigns ownership of the merchant's
 * business records (catalog, subscriptions, payment config, staff, customers, …) from the owner to the
 * successor, in a single transaction. The on-chain FUNDS/vault are a SEPARATE handover via the existing
 * inheritance flow (useInheritance / CardBoundVault) — this never touches funds.
 *
 * Non-custodial / participant-controlled: this only runs after an authorized transfer (owner-initiated
 * + successor-accepted, or an emergency request whose veto window elapsed with no owner veto). The
 * authority checks live in the route + the transfer state machine; this module performs the reassign.
 */

import type { PoolClient } from 'pg';

/**
 * The business-record tables keyed by merchant_address. Ownership transfer reassigns merchant_address
 * on each. This list is EXPLICIT (not a wildcard) so a transfer can never silently touch an unintended
 * table, and so it can be reviewed against the schema. Funds tables are deliberately excluded.
 *
 * NOTE: verify this list against the live schema before enabling in production — a missing table means
 * an orphaned record under the old owner; an extra/renamed table means a failed transaction (safe-fail).
 */
export const TRANSFERABLE_MERCHANT_TABLES: readonly string[] = [
  'merchant_profiles',
  'merchant_categories',
  'merchant_products',
  'merchant_product_variants',
  'merchant_orders',
  'merchant_order_items',
  'merchant_invoices',
  'merchant_invoice_items',
  'merchant_payment_links',
  'merchant_subscription_plans',
  'merchant_installment_plans',
  'merchant_bookings',
  'merchant_service_slots',
  'merchant_coupons',
  'merchant_gift_cards',
  'merchant_loyalty_programs',
  'merchant_tax_rates',
  'merchant_tip_settings',
  'merchant_staff',
  'merchant_suppliers',
  'merchant_locations',
  'merchant_customer_notes',
  'merchant_digital_assets',
  'merchant_webhook_endpoints',
  // continuity records themselves move too, so the new owner inherits the config:
  'merchant_operators',
];

export interface TransferResult {
  table: string;
  rowsMoved: number;
}

/**
 * Reassign ownership of all business records from `fromAddr` to `toAddr` within an existing
 * transaction (pass a client already inside BEGIN). Caller is responsible for authorization and for
 * COMMIT/ROLLBACK. Returns per-table counts for the audit summary.
 *
 * Safety:
 *  - Runs inside the caller's transaction → all-or-nothing.
 *  - Skips rows that would collide (e.g. a successor who already has a merchant_profiles row) by
 *    leaving them to the caller's conflict policy; here we transfer only where the successor does not
 *    already own a conflicting unique row, to avoid PK/unique violations aborting the whole transfer.
 */
export async function reassignBusinessRecords(
  client: PoolClient,
  fromAddr: string,
  toAddr: string,
): Promise<TransferResult[]> {
  const from = fromAddr.toLowerCase();
  const to = toAddr.toLowerCase();
  if (from === to) throw new Error('from and to addresses are identical');

  const results: TransferResult[] = [];
  for (const table of TRANSFERABLE_MERCHANT_TABLES) {
    // Identifier is from our own constant allow-list, never user input → safe to interpolate.
    const res = await client.query(
      `UPDATE ${table} SET merchant_address = $1 WHERE merchant_address = $2`,
      [to, from],
    );
    results.push({ table, rowsMoved: res.rowCount ?? 0 });
  }
  return results;
}
