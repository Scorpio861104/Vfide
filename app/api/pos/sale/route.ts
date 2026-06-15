/**
 * POS Sale API (Commerce Operations Phase 4 — Physical Retail)
 *
 * A POS sale is an in-person ORDER. This route composes the prior phases into one authoritative path:
 *   1. resolve catalog prices server-side (never trust client unit_price)        [Phase 1A]
 *   2. compute tax on the (discounted) base + composePrice                        [Phase 1D/1E]
 *   3. if rung by staff, AUTHORIZE via authorizeStaffAction (per-tx cap/daily/    [Phase 3]
 *      sale-permission) — this is the gate-ubiquity wiring: a real sale path calls the gate
 *   4. check + decrement LOCATION inventory atomically                            [Phase 4]
 *   5. create the order (channel='pos', location, register, staff) + record the cash-drawer movement
 *   6. return a receipt (total == the composed total — POS does not invent pricing)
 *
 * Payment: cash is settled at the drawer (recorded here); card/wallet settlement is the existing payment
 * confirmation flow (the order is created paid for cash, pending for card/wallet — mirrors online orders).
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { computeTax, type TaxRate, type TaxLine, type ProductType } from '@/lib/commerce/taxEngine';
import { composePrice } from '@/lib/commerce/discountEngine';
import { buildReceipt, tenderSufficient, canFulfillAtLocation, type SaleLine, type LocationStock } from '@/lib/commerce/posEngine';
import { authorizeStaffAction } from '@/lib/commerce/staffAuthEngine';
import { normalizeStaffPermissions, type StaffRole } from '@/lib/merchantStaff';
import { createHash } from 'crypto';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function hashStaffToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
function authAddr(user: JWTPayload): string | null {
  const a = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a && ADDRESS_LIKE_REGEX.test(a) ? a : null;
}

const saleSchema = z.object({
  location_id: z.string().regex(UUID_REGEX),
  register_session_id: z.string().regex(UUID_REGEX).optional(),
  staff_token: z.string().min(1).optional(),                  // present when a cashier (not the owner) rings it
  payment_method: z.enum(['cash', 'card', 'wallet']).default('cash'),
  tendered: z.coerce.number().min(0).optional(),              // cash tendered (for change)
  items: z.array(z.object({ product_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive().max(100000) })).min(1).max(200),
});

interface CatalogRow { id: number; price: string; product_type: string | null; name: string; inventory_tracking: boolean | null; }

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = authAddr(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof saleSchema>;
  try { body = saleSchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  // location must belong to the merchant
  const loc = (await query(`SELECT 1 FROM merchant_locations WHERE id=$1 AND merchant_address=$2`, [body.location_id, merchant])).rows[0];
  if (!loc) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  try {
    // 1. authoritative catalog prices (never trust client) — Phase 1A
    const productIds = [...new Set(body.items.map((i) => i.product_id))];
    const catalog = (await query<CatalogRow>(
      `SELECT id, price::float8::text AS price, product_type, name, inventory_tracking
         FROM merchant_products WHERE merchant_address=$1 AND id = ANY($2::int[])`,
      [merchant, productIds],
    )).rows;
    const byId = new Map(catalog.map((c) => [c.id, c]));
    if (catalog.length !== productIds.length) return NextResponse.json({ error: 'One or more products are not yours' }, { status: 400 });

    const lines = body.items.map((i) => {
      const c = byId.get(i.product_id)!;
      return { product_id: i.product_id, quantity: i.quantity, unit_price: Number(c.price), name: c.name, product_type: (c.product_type as ProductType) ?? 'physical' };
    });
    const subtotal = Math.round(lines.reduce((s, l) => s + l.unit_price * l.quantity, 0) * 100) / 100;

    // 2. tax on the base (no POS discount in this slice) + composePrice — Phase 1D/1E
    let tax = 0;
    try {
      const rates = (await query<TaxRate>(
        `SELECT id, name, rate_bps, jurisdiction_country, jurisdiction_state, jurisdiction_city,
                postal_code_pattern, is_default, enabled, applies_to
           FROM merchant_tax_rates WHERE merchant_address=$1 AND enabled=true`,
        [merchant],
      )).rows;
      if (rates.length > 0) {
        const taxLines: TaxLine[] = lines.map((l) => ({ type: l.product_type, amount: Math.round(l.unit_price * l.quantity * 100) / 100 }));
        // in-store: jurisdiction is the location; we pass the merchant default (no shipping address). computeTax
        // falls back to the default rate when address fields are absent.
        tax = computeTax(rates, taxLines, {}, false).taxAmount;
      }
    } catch (e) {
      logger.warn('[POS sale] tax computation failed; proceeding untaxed', { error: e instanceof Error ? e.message : String(e) });
    }
    const composed = composePrice(subtotal, 0, tax, 0);

    // 3. staff authorization (gate-ubiquity) — Phase 3. If a staff_token is present, the cashier must be
    //    permitted to make a sale of this amount within their per-tx + daily caps.
    let soldByStaffId: string | null = null;
    if (body.staff_token) {
      const staff = (await query<{ id: string; role: string; permissions: Record<string, unknown>; active: boolean; expires_at: string | null; merchant_address: string }>(
        `SELECT id, role, permissions, active, expires_at, merchant_address FROM merchant_staff
          WHERE session_token_hash=$1 AND revoked_at IS NULL`,
        [hashStaffToken(body.staff_token)],
      )).rows[0];
      if (!staff || staff.merchant_address.toLowerCase() !== merchant) {
        return NextResponse.json({ error: 'Staff session not found' }, { status: 404 });
      }
      const permissions = normalizeStaffPermissions(staff.permissions ?? {}, staff.role as StaffRole);
      const totalRow = (await query<{ total: string | null }>(
        `SELECT COALESCE(SUM((details->>'amount')::numeric),0) AS total FROM staff_activity_log
          WHERE staff_id=$1 AND action='sale' AND created_at >= date_trunc('day', NOW())`,
        [staff.id],
      )).rows[0];
      const decision = authorizeStaffAction(
        { active: staff.active, expiresAtMs: staff.expires_at ? new Date(staff.expires_at).getTime() : null, nowMs: Date.now(), permissions, todaysSaleTotal: Number(totalRow?.total ?? 0) },
        'sale', composed.total,
      );
      if (!decision.ok) return NextResponse.json({ error: `Staff not authorized: ${decision.reason}`, reason: decision.reason }, { status: 403 });
      soldByStaffId = staff.id;
    }

    // 4. cash tender must cover the total
    if (!tenderSufficient(composed.total, body.tendered ?? 0, body.payment_method)) {
      return NextResponse.json({ error: 'Insufficient cash tendered' }, { status: 400 });
    }

    // 5. atomic: check + decrement LOCATION inventory, create order, record drawer movement
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // lock + read location stock for the tracked products
      const trackedIds = lines.filter((l) => byId.get(l.product_id)?.inventory_tracking !== false).map((l) => l.product_id);
      let stocks: LocationStock[] = [];
      if (trackedIds.length > 0) {
        const stockRows = (await client.query<{ product_id: number; quantity: number }>(
          `SELECT product_id, quantity FROM location_inventory
            WHERE location_id=$1 AND product_id = ANY($2::int[]) FOR UPDATE`,
          [body.location_id, trackedIds],
        )).rows;
        stocks = stockRows.map((r) => ({ location_id: body.location_id, product_id: r.product_id, quantity: Number(r.quantity) }));
        const saleLines: SaleLine[] = lines.filter((l) => trackedIds.includes(l.product_id)).map((l) => ({ product_id: l.product_id, quantity: l.quantity }));
        const fulfill = canFulfillAtLocation(stocks, body.location_id, saleLines);
        if (!fulfill.ok) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `Insufficient stock at this location for product ${fulfill.product_id} (have ${fulfill.available}, need ${fulfill.requested})` }, { status: 409 });
        }
      }

      const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e4)}`;
      const paymentStatus = body.payment_method === 'cash' ? 'paid' : 'pending';
      const order = (await client.query(
        `INSERT INTO merchant_orders
           (order_number, merchant_address, customer_address, status, payment_status, token,
            subtotal, tax_amount, shipping_amount, discount_amount, total,
            channel, location_id, register_session_id, sold_by_staff_id, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pos',$12,$13,$14, CASE WHEN $5='paid' THEN NOW() ELSE NULL END)
         RETURNING id`,
        [orderNumber, merchant, merchant, paymentStatus === 'paid' ? 'completed' : 'pending', paymentStatus, 'POS',
         composed.subtotal, composed.tax, 0, 0, composed.total,
         body.location_id, body.register_session_id ?? null, soldByStaffId],
      )).rows[0] as { id: number };

      for (const l of lines) {
        await client.query(
          `INSERT INTO merchant_order_items (order_id, product_id, name, quantity, unit_price, total, product_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [order.id, l.product_id, l.name, l.quantity, l.unit_price, Math.round(l.unit_price * l.quantity * 100) / 100, l.product_type],
        );
        // decrement location inventory for tracked products
        if (trackedIds.includes(l.product_id)) {
          await client.query(
            `UPDATE location_inventory SET quantity = GREATEST(0, quantity - $3), updated_at=NOW()
              WHERE location_id=$1 AND product_id=$2`,
            [body.location_id, l.product_id, l.quantity],
          );
        }
        // keep the global sold_count moving (mirrors online orders)
        await client.query(`UPDATE merchant_products SET sold_count = sold_count + $1 WHERE id=$2`, [l.quantity, l.product_id]);
      }

      // record the cash-drawer movement against the open register (if one was supplied)
      if (body.register_session_id) {
        const kind = body.payment_method === 'cash' ? 'sale_cash' : 'sale_noncash';
        await client.query(
          `INSERT INTO register_movements (session_id, kind, amount, order_id) VALUES ($1,$2,$3,$4)`,
          [body.register_session_id, kind, composed.total, order.id],
        );
      }
      // record the staff sale in the activity log so the daily cap tally stays accurate
      if (soldByStaffId) {
        await client.query(`INSERT INTO staff_activity_log (staff_id, action, details) VALUES ($1,'sale',$2::jsonb)`, [soldByStaffId, JSON.stringify({ amount: composed.total, order_id: order.id })]);
      }

      await client.query('COMMIT');

      const receipt = buildReceipt(
        lines.map((l) => ({ name: l.name, quantity: l.quantity, unit_price: l.unit_price })),
        composed,
        body.payment_method === 'cash' ? (body.tendered ?? composed.total) : composed.total,
      );
      return NextResponse.json({ order_id: order.id, order_number: orderNumber, payment_status: paymentStatus, receipt }, { status: 201 });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('POST /api/pos/sale failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to process sale' }, { status: 500 });
  }
});
