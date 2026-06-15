/**
 * Digital delivery logic (Commerce Operations Phase 1B).
 *
 * Pure, side-effect-free decisions for digital fulfillment + download access, so the scenario matrix can run
 * against them independent of the database and the route. The route persists their results.
 *
 * Backed by the existing schema (read, not assumed):
 *  • merchant_digital_assets: file_url, download_limit (NULL=unlimited), expires_hours (NULL=never),
 *    license_key_pool TEXT[] (serial keys; popped on delivery).
 *  • merchant_digital_deliveries: download_token, download_count, license_key, expires_at, order_id.
 */

export interface DigitalAssetLike {
  id: number;
  download_limit: number | null; // NULL = unlimited
  expires_hours: number | null;  // NULL = never
  license_key_pool: string[] | null;
  requires_license?: boolean;     // 1B: if true, a delivery without a key is a FAILURE, not a silent no-key
}

export interface DeliveryLike {
  download_count: number;
  download_limit: number | null;
  expires_at: string | null; // ISO; null = never
  revoked: boolean;          // 1B: refund/chargeback revokes access
  license_key: string | null;
}

export type DownloadRejection = 'NOT_FOUND' | 'EXPIRED' | 'LIMIT_REACHED' | 'REVOKED';
export type FulfillRejection = 'ALREADY_DELIVERED' | 'NO_ASSET' | 'ORDER_NOT_PAID' | 'LICENSE_POOL_EXHAUSTED';

/** Compute the expiry timestamp (ms epoch) for a new delivery, or null if the asset never expires. */
export function computeExpiry(asset: DigitalAssetLike, nowMs: number): number | null {
  if (asset.expires_hours === null || asset.expires_hours === undefined) return null;
  return nowMs + asset.expires_hours * 3_600_000;
}

/**
 * Decide the license key to assign from the pool, and whether the fulfillment can proceed.
 * Returns { key, remainingPool } on success, or a rejection when a key is REQUIRED but the pool is empty.
 */
export function assignLicenseKey(asset: DigitalAssetLike): { ok: true; key: string | null; remainingPool: string[] } | { ok: false; reason: FulfillRejection } {
  const pool = asset.license_key_pool ?? [];
  if (pool.length > 0) {
    return { ok: true, key: pool[0]!, remainingPool: pool.slice(1) };
  }
  // Pool empty:
  if (asset.requires_license) {
    return { ok: false, reason: 'LICENSE_POOL_EXHAUSTED' }; // do NOT silently deliver without a key
  }
  return { ok: true, key: null, remainingPool: [] }; // file-only product (no keys) — fine
}

/** Gate a fulfillment attempt. `alreadyDelivered` reflects an existing delivery row for (asset, order). */
export function canFulfill(
  asset: DigitalAssetLike | null,
  orderPaid: boolean,
  alreadyDelivered: boolean,
): { ok: true } | { ok: false; reason: FulfillRejection } {
  if (!orderPaid) return { ok: false, reason: 'ORDER_NOT_PAID' };
  if (!asset) return { ok: false, reason: 'NO_ASSET' };
  if (alreadyDelivered) return { ok: false, reason: 'ALREADY_DELIVERED' };
  return { ok: true };
}

/**
 * Gate a download attempt against a delivery. Enforces: existence, revocation, expiry, download limit.
 * Returns the new download_count on success.
 */
export function canDownload(delivery: DeliveryLike | null, nowMs: number): { ok: true; newCount: number; remaining: number | null } | { ok: false; reason: DownloadRejection } {
  if (!delivery) return { ok: false, reason: 'NOT_FOUND' };
  if (delivery.revoked) return { ok: false, reason: 'REVOKED' };
  if (delivery.expires_at && new Date(delivery.expires_at).getTime() < nowMs) return { ok: false, reason: 'EXPIRED' };
  if (delivery.download_limit !== null && delivery.download_count >= delivery.download_limit) {
    return { ok: false, reason: 'LIMIT_REACHED' };
  }
  const newCount = delivery.download_count + 1;
  const remaining = delivery.download_limit !== null ? Math.max(0, delivery.download_limit - newCount) : null;
  return { ok: true, newCount, remaining };
}

/**
 * "Lost access" re-issue policy: a merchant may reset a buyer's download_count (and lift expiry) so a buyer who
 * legitimately lost a file can re-download — WITHOUT minting a new license key (the key is already theirs).
 * Returns the fields to reset. Re-issue is blocked if the delivery was revoked (refunded).
 */
export function reissuePolicy(delivery: DeliveryLike): { ok: true; resetCountTo: number } | { ok: false; reason: DownloadRejection } {
  if (delivery.revoked) return { ok: false, reason: 'REVOKED' };
  return { ok: true, resetCountTo: 0 };
}
