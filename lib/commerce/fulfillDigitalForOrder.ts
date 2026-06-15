/**
 * Shared digital auto-fulfillment (Commerce Operations Phase 1B).
 *
 * Issues deliveries for every digital line item in a PAID order. Used by both the manual management route
 * (action: 'auto_fulfill') and the payment-confirmation flow (automatic, after on-chain settlement), so the
 * logic lives in exactly one place. Idempotent: skips items already delivered. Records license-pool
 * exhaustion as a tracked failure rather than minting a keyless delivery.
 *
 * `db` is the query function (the route passes @/lib/db's `query`); `getClient` opens a tx for the per-item
 * key-pop + delivery insert. Returns a summary; never throws for per-item issues (collected into `failures`).
 */

import { randomBytes } from 'crypto';
import { assignLicenseKey, computeExpiry } from '@/lib/commerce/digitalDelivery';

type DbParams = (string | number | boolean | null | Date | undefined | unknown[])[];
type QueryFn = <T = Record<string, unknown>>(text: string, params?: DbParams) => Promise<{ rows: T[]; rowCount: number | null }>;
interface TxClient { query: (text: string, params?: DbParams) => Promise<{ rows: unknown[]; rowCount: number | null }>; release: (...args: unknown[]) => void; }
type GetClientFn = () => Promise<TxClient>;

interface AssetRow {
  id: number; product_id: number; download_limit: number | null; expires_hours: number | null;
  license_key_pool: string[] | null; requires_license: boolean;
}

export interface FulfillSummary {
  delivered: Array<{ product_id: number; download_url: string }>;
  failures: Array<{ product_id: number; reason: string }>;
  count: number;
}

/**
 * Fulfil all digital items for a paid order. Caller must have already confirmed the order is the merchant's
 * and is paid (the management route does; payment-confirm does after on-chain verification).
 */
export async function fulfillDigitalForOrder(
  query: QueryFn,
  getClient: GetClientFn,
  orderId: number,
  customerAddress: string | null,
): Promise<FulfillSummary> {
  const digitalItems = (await query<{ product_id: number }>(
    `SELECT DISTINCT oi.product_id
       FROM merchant_order_items oi
       JOIN merchant_products p ON p.id = oi.product_id
      WHERE oi.order_id = $1 AND p.product_type = 'digital' AND oi.product_id IS NOT NULL`,
    [orderId],
  )).rows;

  const delivered: FulfillSummary['delivered'] = [];
  const failures: FulfillSummary['failures'] = [];

  for (const { product_id } of digitalItems) {
    const asset = (await query<AssetRow>(
      `SELECT id, product_id, download_limit, expires_hours, license_key_pool, requires_license
         FROM merchant_digital_assets WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [product_id],
    )).rows[0];
    if (!asset) { failures.push({ product_id, reason: 'NO_ASSET' }); continue; }

    const already = (await query(
      `SELECT 1 FROM merchant_digital_deliveries WHERE asset_id = $1 AND order_id = $2`,
      [asset.id, orderId],
    )).rows.length > 0;
    if (already) continue; // idempotent

    const assignment = assignLicenseKey(asset);
    if (!assignment.ok) {
      await query(
        `INSERT INTO merchant_digital_delivery_failures (asset_id, order_id, customer_address, reason)
         VALUES ($1,$2,$3,$4)`,
        [asset.id, orderId, customerAddress, assignment.reason],
      );
      failures.push({ product_id, reason: assignment.reason });
      continue;
    }

    const token = randomBytes(32).toString('hex');
    const expMs = computeExpiry(asset, Date.now());
    const client = await getClient();
    try {
      await client.query('BEGIN');
      if (assignment.key !== null) {
        await client.query('UPDATE merchant_digital_assets SET license_key_pool = license_key_pool[2:] WHERE id = $1', [asset.id]);
      }
      await client.query(
        `INSERT INTO merchant_digital_deliveries (asset_id, order_id, customer_address, download_token, license_key, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [asset.id, orderId, customerAddress, token, assignment.key, expMs ? new Date(expMs) : null],
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    delivered.push({ product_id, download_url: `/api/merchant/digital?token=${token}` });
  }

  return { delivered, failures, count: delivered.length };
}
