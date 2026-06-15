/**
 * Digital Delivery Management API (Commerce Operations Phase 1B)
 *
 * Orchestration actions over the existing digital-asset/delivery tables — the pieces that make a software
 * seller able to operate ENTIRELY inside VFIDE:
 *   action: 'auto_fulfill' — issue deliveries for EVERY digital line item in a paid order (one call after
 *                            payment confirmation; idempotent — skips already-delivered items).
 *   action: 'revoke'       — revoke a buyer's digital access for an order (refund / chargeback).
 *   action: 'reissue'      — reset download_count + lift expiry so a buyer who lost a file can re-download
 *                            (no new license key minted; blocked if revoked).
 *
 * Auth: merchant-only, scoped to orders they own. Money is never touched here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { reissuePolicy } from '@/lib/commerce/digitalDelivery';
import { fulfillDigitalForOrder } from '@/lib/commerce/fulfillDigitalForOrder';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

function getAuthAddress(user: JWTPayload): string | null {
  const a = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a && ADDRESS_LIKE_REGEX.test(a) ? a : null;
}

const autoFulfillSchema = z.object({ action: z.literal('auto_fulfill'), order_id: z.number().int().positive() });
const revokeSchema = z.object({ action: z.literal('revoke'), order_id: z.number().int().positive(), reason: z.string().max(200).optional() });
const reissueSchema = z.object({ action: z.literal('reissue'), delivery_id: z.number().int().positive() });
const bodySchema = z.discriminatedUnion('action', [autoFulfillSchema, revokeSchema, reissueSchema]);

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  try {
    if (body.action === 'auto_fulfill') {
      // Verify the order is the merchant's AND paid.
      const order = (await query<{ id: number; customer_address: string }>(
        `SELECT id, customer_address FROM merchant_orders
          WHERE id = $1 AND merchant_address = $2 AND payment_status = 'paid'`,
        [body.order_id, merchant],
      )).rows[0];
      if (!order) return NextResponse.json({ error: 'Paid order not found' }, { status: 404 });

      const summary = await fulfillDigitalForOrder(query as unknown as Parameters<typeof fulfillDigitalForOrder>[0], getClient as unknown as Parameters<typeof fulfillDigitalForOrder>[1], body.order_id, order.customer_address);
      return NextResponse.json(summary);
    }

    if (body.action === 'revoke') {
      // Revoke every delivery for an order the merchant owns (refund / chargeback).
      const owns = (await query(`SELECT 1 FROM merchant_orders WHERE id = $1 AND merchant_address = $2`, [body.order_id, merchant])).rows.length > 0;
      if (!owns) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      const r = await query(
        `UPDATE merchant_digital_deliveries SET revoked = true, revoked_at = NOW(), revoke_reason = $2
          WHERE order_id = $1 AND revoked = false`,
        [body.order_id, body.reason ?? 'refund'],
      );
      return NextResponse.json({ revoked: r.rowCount ?? 0 });
    }

    if (body.action === 'reissue') {
      // Reset a single delivery's download_count + lift expiry (lost-access recovery). Merchant-scoped.
      const delivery = (await query<{ id: number; revoked: boolean; download_count: number; download_limit: number | null; expires_at: string | null; license_key: string | null; expires_hours: number | null }>(
        `SELECT dd.id, dd.revoked, dd.download_count, da.download_limit, dd.expires_at, dd.license_key, da.expires_hours
           FROM merchant_digital_deliveries dd
           JOIN merchant_digital_assets da ON da.id = dd.asset_id
           JOIN merchant_orders o ON o.id = dd.order_id
          WHERE dd.id = $1 AND o.merchant_address = $2`,
        [body.delivery_id, merchant],
      )).rows[0];
      if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

      const decision = reissuePolicy({
        download_count: delivery.download_count, download_limit: delivery.download_limit,
        expires_at: delivery.expires_at, revoked: delivery.revoked, license_key: delivery.license_key,
      });
      if (!decision.ok) return NextResponse.json({ error: 'Cannot reissue a revoked delivery' }, { status: 409 });

      // Fresh expiry window from now (if the asset expires at all).
      const newExpiry = delivery.expires_hours ? new Date(Date.now() + Number(delivery.expires_hours) * 3_600_000) : null;
      await query(
        `UPDATE merchant_digital_deliveries SET download_count = $2, expires_at = $3 WHERE id = $1`,
        [body.delivery_id, decision.resetCountTo, newExpiry],
      );
      return NextResponse.json({ reissued: true, download_count: decision.resetCountTo });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    logger.error('POST /api/merchant/digital/manage failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
