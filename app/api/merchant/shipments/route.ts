/**
 * Shipments / Delivery Verification API (Phase 3).
 *
 * Non-custodial delivery record + confirmation. Feeds Marketplace Trust + Fraud via delivery signals.
 *   GET  — shipments the caller is party to, + (for a merchant) their delivery-reliability score.
 *   POST action:
 *     • 'ship'           — MERCHANT marks an order shipped (carrier + tracking).
 *     • 'mark_delivered' — MERCHANT marks delivered (-> delivered_unconfirmed until buyer confirms).
 *     • 'confirm'        — BUYER confirms receipt (-> delivered_confirmed; strongest trust signal).
 *     • 'not_received'   — BUYER reports non-delivery (-> feeds the disputes/fraud path).
 *
 * HONEST: this records and confirms; it is not a live carrier API. Tracking is stored for evidence; a
 * carrier adapter can later auto-verify. Funds are never touched here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';

export const dynamic = 'force-dynamic';

function authAddr(user: JWTPayload): string | null {
  const a = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a ? a : null;
}

interface ShipmentRow {
  id: string; merchant_address: string; buyer_address: string; order_id: string | null;
  carrier: string | null; tracking_number: string | null; status: string;
  shipped_at: string; delivered_at: string | null; confirmed_at: string | null;
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = (await query<ShipmentRow>(
      `SELECT * FROM shipments WHERE merchant_address = $1 OR buyer_address = $1 ORDER BY updated_at DESC LIMIT 100`,
      [addr],
    )).rows;

    // Delivery reliability for the caller as a merchant.
    const stat = (await query<{ status: string; n: string }>(
      `SELECT status, COUNT(*)::text AS n FROM shipments WHERE merchant_address = $1 GROUP BY status`, [addr],
    )).rows;
    const stats: DeliveryStats = {
      shipped: 0, deliveredConfirmed: 0, deliveredUnconfirmed: 0, notReceived: 0, returned: 0,
    };
    for (const r of stat) {
      const n = Number(r.n);
      if (r.status === 'shipped') stats.shipped = n;
      else if (r.status === 'delivered_confirmed') stats.deliveredConfirmed = n;
      else if (r.status === 'delivered_unconfirmed') stats.deliveredUnconfirmed = n;
      else if (r.status === 'not_received') stats.notReceived = n;
      else if (r.status === 'returned') stats.returned = n;
    }

    return NextResponse.json({
      shipments: rows.map((s) => ({ ...s, role: s.merchant_address === addr ? 'merchant' : 'buyer' })),
      deliveryReliability: computeDeliveryReliability(stats),
    });
  } catch (err) {
    logger.error('GET /api/merchant/shipments failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load shipments' }, { status: 500 });
  }
}

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('ship'),
    buyer_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    order_id: z.string().max(120).optional(),
    carrier: z.string().max(60).optional(),
    tracking_number: z.string().max(120).optional(),
  }),
  z.object({ action: z.literal('mark_delivered'), id: z.string().uuid() }),
  z.object({ action: z.literal('confirm'), id: z.string().uuid() }),
  z.object({ action: z.literal('not_received'), id: z.string().uuid() }),
]);

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof BodySchema>;
  try { body = BodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  try {
    if (body.action === 'ship') {
      const buyer = body.buyer_address.toLowerCase();
      if (buyer === addr) return NextResponse.json({ error: 'Buyer and merchant cannot be the same' }, { status: 400 });
      const row = (await query<ShipmentRow>(
        `INSERT INTO shipments (merchant_address, buyer_address, order_id, carrier, tracking_number, status)
         VALUES ($1, $2, $3, $4, $5, 'shipped') RETURNING *`,
        [addr, buyer, body.order_id ?? null, body.carrier ?? null, body.tracking_number ?? null],
      )).rows[0];
      return NextResponse.json({ shipment: row }, { status: 201 });
    }

    const s = (await query<ShipmentRow>(`SELECT * FROM shipments WHERE id = $1`, [body.id])).rows[0];
    if (!s) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    const isMerchant = s.merchant_address === addr;
    const isBuyer = s.buyer_address === addr;
    if (!isMerchant && !isBuyer) return NextResponse.json({ error: 'Not your shipment' }, { status: 403 });

    if (body.action === 'mark_delivered') {
      if (!isMerchant) return NextResponse.json({ error: 'Only the merchant marks delivered' }, { status: 403 });
      const row = (await query<ShipmentRow>(
        `UPDATE shipments SET status = 'delivered_unconfirmed', delivered_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'shipped' RETURNING *`, [body.id],
      )).rows[0];
      return NextResponse.json({ shipment: row });
    }

    if (body.action === 'confirm') {
      if (!isBuyer) return NextResponse.json({ error: 'Only the buyer confirms receipt' }, { status: 403 });
      const row = (await query<ShipmentRow>(
        `UPDATE shipments SET status = 'delivered_confirmed', confirmed_at = NOW(), delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW()
         WHERE id = $1 RETURNING *`, [body.id],
      )).rows[0];
      // Verified delivery is a positive trust signal for the merchant.
      await emitServerEvent(s.merchant_address, 'SHIPMENT_VERIFIED', { id: body.id }, 'api/merchant/shipments');
      return NextResponse.json({ shipment: row });
    }

    // not_received -> buyer reports non-delivery; feeds disputes/fraud signals.
    if (!isBuyer) return NextResponse.json({ error: 'Only the buyer reports non-delivery' }, { status: 403 });
    const row = (await query<ShipmentRow>(
      `UPDATE shipments SET status = 'not_received', updated_at = NOW() WHERE id = $1 RETURNING *`, [body.id],
    )).rows[0];
    await emitServerEvent(s.merchant_address, 'DISPUTE_OPENED', { shipmentId: body.id, reason: 'not_received' }, 'api/merchant/shipments');
    await emitServerEvent(addr, 'DISPUTE_OPENED', { shipmentId: body.id, reason: 'not_received' }, 'api/merchant/shipments');
    return NextResponse.json({ shipment: row });
  } catch (err) {
    logger.error('POST /api/merchant/shipments failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Shipment action failed' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
