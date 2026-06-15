/**
 * Register & Location Operations API (Commerce Operations Phase 4 — Physical Retail)
 *
 * GET  ?action=registers              — open/recent register sessions for the merchant
 * GET  ?action=inventory&location_id= — per-location stock
 * POST — 'open_register' | 'close_register' (reconciles cash) | 'set_stock' | 'transfer_stock'
 *
 * Cash/inventory math lives in lib/commerce/posEngine.ts. A POS *sale* is a separate route (pos/sale).
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import {
  expectedDrawer, reconcileDrawer, canRegisterAct, computeTransfer,
  type DrawerMovement, type DrawerMovementKind,
} from '@/lib/commerce/posEngine';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function authAddr(user: JWTPayload): string | null {
  const a = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a && ADDRESS_LIKE_REGEX.test(a) ? a : null;
}

const openReg = z.object({ action: z.literal('open_register'), location_id: z.string().regex(UUID_REGEX), opening_float: z.coerce.number().min(0).max(99999999.99), opened_by: z.string().max(120).optional() });
const closeReg = z.object({ action: z.literal('close_register'), session_id: z.string().regex(UUID_REGEX), counted_cash: z.coerce.number().min(0).max(99999999.99) });
const setStock = z.object({ action: z.literal('set_stock'), location_id: z.string().regex(UUID_REGEX), product_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().min(0).max(100000000) });
const transferStock = z.object({ action: z.literal('transfer_stock'), product_id: z.coerce.number().int().positive(), from_location_id: z.string().regex(UUID_REGEX), to_location_id: z.string().regex(UUID_REGEX), quantity: z.coerce.number().int().positive().max(100000000) });
const bodySchema = z.discriminatedUnion('action', [openReg, closeReg, setStock, transferStock]);

async function ownsLocation(merchant: string, locationId: string): Promise<boolean> {
  return (await query(`SELECT 1 FROM merchant_locations WHERE id = $1 AND merchant_address = $2`, [locationId, merchant])).rows.length > 0;
}

// ─────────────────────────── GET
export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: JWTPayload) => {
    const rl = await withRateLimit(req, 'read');
    if (rl) return rl;
    const merchant = authAddr(user);
    if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    try {
      if (action === 'inventory') {
        const locationId = searchParams.get('location_id') || '';
        if (!UUID_REGEX.test(locationId) || !(await ownsLocation(merchant, locationId))) {
          return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
        const rows = (await query(
          `SELECT li.product_id, li.quantity, p.name
             FROM location_inventory li JOIN merchant_products p ON p.id = li.product_id
            WHERE li.location_id = $1 ORDER BY p.name`,
          [locationId],
        )).rows;
        return NextResponse.json({ inventory: rows });
      }
      // default: registers
      const sessions = (await query(
        `SELECT id, location_id, status, opening_float::float8 AS opening_float, expected_cash::float8 AS expected_cash,
                counted_cash::float8 AS counted_cash, variance::float8 AS variance, opened_at, closed_at
           FROM register_sessions WHERE merchant_address = $1 ORDER BY opened_at DESC LIMIT 50`,
        [merchant],
      )).rows;
      return NextResponse.json({ registers: sessions });
    } catch (err) {
      logger.error('GET /api/merchant/registers failed', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }
  })(request);
}

// ─────────────────────────── POST
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = authAddr(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  try {
    if (body.action === 'open_register') {
      if (!(await ownsLocation(merchant, body.location_id))) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      // one open register per location at a time
      const existing = (await query(`SELECT id FROM register_sessions WHERE location_id=$1 AND status='open' LIMIT 1`, [body.location_id])).rows[0];
      if (existing) return NextResponse.json({ error: 'A register is already open at this location' }, { status: 409 });
      const row = (await query(
        `INSERT INTO register_sessions (merchant_address, location_id, opened_by, opening_float, status)
         VALUES ($1,$2,$3,$4,'open') RETURNING id`,
        [merchant, body.location_id, body.opened_by ?? null, body.opening_float],
      )).rows[0] as { id: string };
      return NextResponse.json({ session_id: row.id, status: 'open', opening_float: body.opening_float }, { status: 201 });
    }

    if (body.action === 'close_register') {
      const session = (await query<{ id: string; status: string; opening_float: string }>(
        `SELECT id, status, opening_float FROM register_sessions WHERE id=$1 AND merchant_address=$2`,
        [body.session_id, merchant],
      )).rows[0];
      if (!session) return NextResponse.json({ error: 'Register session not found' }, { status: 404 });
      if (!canRegisterAct(session.status as 'open' | 'closed', 'close')) {
        return NextResponse.json({ error: 'Register is not open' }, { status: 409 });
      }
      const moves = (await query<{ kind: DrawerMovementKind; amount: string }>(
        `SELECT kind, amount::float8::text AS amount FROM register_movements WHERE session_id=$1`, [body.session_id],
      )).rows;
      const movements: DrawerMovement[] = moves
        .filter((m) => m.kind === 'sale_cash' || m.kind === 'refund_cash' || m.kind === 'payout' || m.kind === 'pay_in')
        .map((m) => ({ kind: m.kind as DrawerMovement['kind'], amount: Number(m.amount) }));
      const recon = reconcileDrawer(Number(session.opening_float), movements, body.counted_cash);
      await query(
        `UPDATE register_sessions SET status='closed', expected_cash=$2, counted_cash=$3, variance=$4, closed_at=NOW() WHERE id=$1`,
        [body.session_id, recon.expected, recon.counted, recon.variance],
      );
      return NextResponse.json({ session_id: body.session_id, status: 'closed', expected: recon.expected, counted: recon.counted, variance: recon.variance, drawer_status: recon.status });
    }

    if (body.action === 'set_stock') {
      if (!(await ownsLocation(merchant, body.location_id))) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      const owns = (await query(`SELECT 1 FROM merchant_products WHERE id=$1 AND merchant_address=$2`, [body.product_id, merchant])).rows.length > 0;
      if (!owns) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      await query(
        `INSERT INTO location_inventory (location_id, product_id, quantity) VALUES ($1,$2,$3)
         ON CONFLICT (location_id, product_id) DO UPDATE SET quantity=EXCLUDED.quantity, updated_at=NOW()`,
        [body.location_id, body.product_id, body.quantity],
      );
      return NextResponse.json({ location_id: body.location_id, product_id: body.product_id, quantity: body.quantity });
    }

    if (body.action === 'transfer_stock') {
      if (body.from_location_id === body.to_location_id) return NextResponse.json({ error: 'Cannot transfer to the same location' }, { status: 400 });
      if (!(await ownsLocation(merchant, body.from_location_id)) || !(await ownsLocation(merchant, body.to_location_id))) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      }
      const client = await getClient();
      try {
        await client.query('BEGIN');
        const fromRow = (await client.query<{ quantity: number }>(
          `SELECT quantity FROM location_inventory WHERE location_id=$1 AND product_id=$2 FOR UPDATE`,
          [body.from_location_id, body.product_id],
        )).rows[0];
        const toRow = (await client.query<{ quantity: number }>(
          `SELECT quantity FROM location_inventory WHERE location_id=$1 AND product_id=$2 FOR UPDATE`,
          [body.to_location_id, body.product_id],
        )).rows[0];
        const fromQty = fromRow ? Number(fromRow.quantity) : 0;
        const toQty = toRow ? Number(toRow.quantity) : 0;
        const t = computeTransfer(fromQty, toQty, body.quantity, false);
        if (!t.ok) {
          await client.query('ROLLBACK');
          const msg = t.reason === 'INSUFFICIENT_SOURCE' ? 'Insufficient stock at the source location' : 'Invalid transfer';
          return NextResponse.json({ error: msg }, { status: 409 });
        }
        await client.query(
          `INSERT INTO location_inventory (location_id, product_id, quantity) VALUES ($1,$2,$3)
           ON CONFLICT (location_id, product_id) DO UPDATE SET quantity=$3, updated_at=NOW()`,
          [body.from_location_id, body.product_id, t.fromAfter],
        );
        await client.query(
          `INSERT INTO location_inventory (location_id, product_id, quantity) VALUES ($1,$2,$3)
           ON CONFLICT (location_id, product_id) DO UPDATE SET quantity=$3, updated_at=NOW()`,
          [body.to_location_id, body.product_id, t.toAfter],
        );
        await client.query('COMMIT');
        return NextResponse.json({ product_id: body.product_id, from_after: t.fromAfter, to_after: t.toAfter });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    logger.error('POST /api/merchant/registers failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
});
