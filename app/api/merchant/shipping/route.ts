/**
 * Shipping Zones & Rates API (Commerce Operations Phase 1C — in-house rate engine)
 *
 * GET  ?action=config           — merchant: list own zones + rates (authoring)
 * GET  ?action=quote&merchant=&country=&weight=&subtotal=  — public: authoritative shipping options
 * POST — merchant actions: 'add_zone' | 'update_zone' | 'delete_zone' | 'add_rate' | 'update_rate' | 'delete_rate'
 *
 * Shipping cost is computed by lib/commerce/shippingRates.ts (server-authoritative). This is NOT a live
 * carrier API — see lib/commerce/carrierAdapter.ts for that boundary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { quoteShipping, type ShippingZone, type ShippingRate } from '@/lib/commerce/shippingRates';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

function authAddr(user: JWTPayload): string | null {
  const a = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a && ADDRESS_LIKE_REGEX.test(a) ? a : null;
}

const addZone = z.object({
  action: z.literal('add_zone'),
  name: z.string().trim().min(1).max(80),
  countries: z.array(z.string().trim().min(1).max(3)).max(300).default([]),
  sort_order: z.coerce.number().int().min(0).optional(),
});
const updateZone = z.object({
  action: z.literal('update_zone'),
  zone_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(80).optional(),
  countries: z.array(z.string().trim().min(1).max(3)).max(300).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});
const deleteZone = z.object({ action: z.literal('delete_zone'), zone_id: z.coerce.number().int().positive() });

const rateFields = {
  name: z.string().trim().min(1).max(80),
  rate_type: z.enum(['flat', 'weight', 'price']),
  base_amount: z.coerce.number().min(0).max(99999999.99),
  per_kg: z.union([z.coerce.number().min(0), z.null()]).optional(),
  pct: z.union([z.coerce.number().min(0).max(1000), z.null()]).optional(),
  free_over: z.union([z.coerce.number().min(0), z.null()]).optional(),
  min_weight_g: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  max_weight_g: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
};
const addRate = z.object({ action: z.literal('add_rate'), zone_id: z.coerce.number().int().positive(), ...rateFields });
const updateRate = z.object({
  action: z.literal('update_rate'), rate_id: z.coerce.number().int().positive(),
  name: rateFields.name.optional(), rate_type: rateFields.rate_type.optional(),
  base_amount: rateFields.base_amount.optional(), per_kg: rateFields.per_kg, pct: rateFields.pct,
  free_over: rateFields.free_over, min_weight_g: rateFields.min_weight_g, max_weight_g: rateFields.max_weight_g,
  active: z.boolean().optional(),
});
const deleteRate = z.object({ action: z.literal('delete_rate'), rate_id: z.coerce.number().int().positive() });

const bodySchema = z.discriminatedUnion('action', [addZone, updateZone, deleteZone, addRate, updateRate, deleteRate]);

async function loadConfig(merchant: string): Promise<{ zones: ShippingZone[]; rates: ShippingRate[] }> {
  const zones = (await query<ShippingZone>(
    `SELECT id, name, countries, sort_order FROM merchant_shipping_zones WHERE merchant_address = $1 ORDER BY sort_order, id`,
    [merchant],
  )).rows;
  const rates = (await query<ShippingRate>(
    `SELECT id, zone_id, name, rate_type, base_amount::float8 AS base_amount, per_kg::float8 AS per_kg,
            pct::float8 AS pct, free_over::float8 AS free_over, min_weight_g, max_weight_g, active
       FROM merchant_shipping_rates WHERE merchant_address = $1 ORDER BY id`,
    [merchant],
  )).rows;
  return { zones, rates };
}

// ─────────────────────────── GET: config (merchant) or quote (public)
export async function GET(request: NextRequest) {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'quote') {
    // Public authoritative quote for a destination.
    const merchant = (searchParams.get('merchant') || '').trim().toLowerCase();
    if (!ADDRESS_LIKE_REGEX.test(merchant)) return NextResponse.json({ error: 'merchant required' }, { status: 400 });
    const country = (searchParams.get('country') || '').trim();
    const totalWeightGrams = Math.max(0, Number(searchParams.get('weight')) || 0);
    const subtotal = Math.max(0, Number(searchParams.get('subtotal')) || 0);
    try {
      const { zones, rates } = await loadConfig(merchant);
      const options = quoteShipping(zones, rates, { country, totalWeightGrams, subtotal });
      return NextResponse.json({ options, ships_to_destination: options.length > 0 });
    } catch (err) {
      logger.error('shipping quote failed', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: 'Failed to quote shipping' }, { status: 500 });
    }
  }

  // config requires auth
  return withAuth(async (req: NextRequest, user: JWTPayload) => {
    const merchant = authAddr(user);
    if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const cfg = await loadConfig(merchant);
      return NextResponse.json(cfg);
    } catch (err) {
      logger.error('shipping config load failed', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: 'Failed to load shipping config' }, { status: 500 });
    }
  })(request);
}

// ─────────────────────────── POST: authoring
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = authAddr(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  // ownership helper for rate/zone ops
  const ownsZone = async (zoneId: number) =>
    (await query(`SELECT 1 FROM merchant_shipping_zones WHERE id = $1 AND merchant_address = $2`, [zoneId, merchant])).rows.length > 0;
  const ownsRate = async (rateId: number) =>
    (await query(`SELECT 1 FROM merchant_shipping_rates WHERE id = $1 AND merchant_address = $2`, [rateId, merchant])).rows.length > 0;

  try {
    if (body.action === 'add_zone') {
      const r = (await query<{ id: number }>(
        `INSERT INTO merchant_shipping_zones (merchant_address, name, countries, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [merchant, body.name, body.countries.map((c) => c.toUpperCase()), body.sort_order ?? 0],
      )).rows[0];
      return NextResponse.json({ zone_id: r?.id }, { status: 201 });
    }
    if (body.action === 'update_zone') {
      if (!(await ownsZone(body.zone_id))) return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
      const sets: string[] = []; const params: unknown[] = []; let i = 1;
      if (body.name !== undefined) { sets.push(`name = $${i++}`); params.push(body.name); }
      if (body.countries !== undefined) { sets.push(`countries = $${i++}`); params.push(body.countries.map((c) => c.toUpperCase())); }
      if (body.sort_order !== undefined) { sets.push(`sort_order = $${i++}`); params.push(body.sort_order); }
      if (sets.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      params.push(body.zone_id);
      await query(`UPDATE merchant_shipping_zones SET ${sets.join(', ')} WHERE id = $${i}`, params as never[]);
      return NextResponse.json({ updated: true });
    }
    if (body.action === 'delete_zone') {
      if (!(await ownsZone(body.zone_id))) return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
      await query(`DELETE FROM merchant_shipping_zones WHERE id = $1`, [body.zone_id]); // cascades to rates
      return NextResponse.json({ deleted: true });
    }
    if (body.action === 'add_rate') {
      if (!(await ownsZone(body.zone_id))) return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
      const r = (await query<{ id: number }>(
        `INSERT INTO merchant_shipping_rates
           (zone_id, merchant_address, name, rate_type, base_amount, per_kg, pct, free_over, min_weight_g, max_weight_g)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [body.zone_id, merchant, body.name, body.rate_type, body.base_amount,
         body.per_kg ?? null, body.pct ?? null, body.free_over ?? null, body.min_weight_g ?? null, body.max_weight_g ?? null],
      )).rows[0];
      return NextResponse.json({ rate_id: r?.id }, { status: 201 });
    }
    if (body.action === 'update_rate') {
      if (!(await ownsRate(body.rate_id))) return NextResponse.json({ error: 'Rate not found' }, { status: 404 });
      const sets: string[] = []; const params: unknown[] = []; let i = 1;
      const set = (col: string, v: unknown) => { sets.push(`${col} = $${i++}`); params.push(v); };
      if (body.name !== undefined) set('name', body.name);
      if (body.rate_type !== undefined) set('rate_type', body.rate_type);
      if (body.base_amount !== undefined) set('base_amount', body.base_amount);
      if (body.per_kg !== undefined) set('per_kg', body.per_kg);
      if (body.pct !== undefined) set('pct', body.pct);
      if (body.free_over !== undefined) set('free_over', body.free_over);
      if (body.min_weight_g !== undefined) set('min_weight_g', body.min_weight_g);
      if (body.max_weight_g !== undefined) set('max_weight_g', body.max_weight_g);
      if (body.active !== undefined) set('active', body.active);
      if (sets.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      params.push(body.rate_id);
      await query(`UPDATE merchant_shipping_rates SET ${sets.join(', ')} WHERE id = $${i}`, params as never[]);
      return NextResponse.json({ updated: true });
    }
    if (body.action === 'delete_rate') {
      if (!(await ownsRate(body.rate_id))) return NextResponse.json({ error: 'Rate not found' }, { status: 404 });
      await query(`DELETE FROM merchant_shipping_rates WHERE id = $1`, [body.rate_id]);
      return NextResponse.json({ deleted: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    logger.error('shipping config write failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to update shipping config' }, { status: 500 });
  }
});
