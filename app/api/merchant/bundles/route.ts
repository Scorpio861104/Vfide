/**
 * Merchant Bundles API (Commerce Operations Phase 1E)
 *
 * GET  ?action=config            — merchant: list own bundles + components (authoring)
 * GET  ?action=preview&merchant=&cart=  — public: bundle savings for a cart (base64 JSON cart)
 * POST — merchant: 'add_bundle' | 'update_bundle' | 'delete_bundle'
 *
 * Bundle pricing is computed by lib/commerce/discountEngine.ts. Pure in-house logic; no external dependency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { bundleSavings, type BundleDefinition, type CartLineForBundle } from '@/lib/commerce/discountEngine';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
function authAddr(user: JWTPayload): string | null {
  const a = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a && ADDRESS_LIKE_REGEX.test(a) ? a : null;
}

const componentSchema = z.object({ product_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive().max(1000) });
const addBundle = z.object({
  action: z.literal('add_bundle'),
  name: z.string().trim().min(1).max(120),
  pricing_type: z.enum(['fixed', 'percent']),
  amount: z.coerce.number().min(0).max(99999999.99),
  components: z.array(componentSchema).min(1).max(50),
});
const updateBundle = z.object({
  action: z.literal('update_bundle'),
  bundle_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(120).optional(),
  pricing_type: z.enum(['fixed', 'percent']).optional(),
  amount: z.coerce.number().min(0).max(99999999.99).optional(),
  active: z.boolean().optional(),
});
const deleteBundle = z.object({ action: z.literal('delete_bundle'), bundle_id: z.coerce.number().int().positive() });
const bodySchema = z.discriminatedUnion('action', [addBundle, updateBundle, deleteBundle]);

interface BundleRow { id: number; name: string; pricing_type: 'fixed' | 'percent'; amount: number; active: boolean; }
interface ComponentRow { bundle_id: number; product_id: number; quantity: number; }

async function loadBundles(merchant: string): Promise<BundleDefinition[]> {
  const bundles = (await query<BundleRow>(
    `SELECT id, name, pricing_type, amount::float8 AS amount, active FROM merchant_bundles WHERE merchant_address = $1 ORDER BY id`,
    [merchant],
  )).rows;
  if (bundles.length === 0) return [];
  const comps = (await query<ComponentRow>(
    `SELECT bundle_id, product_id, quantity FROM merchant_bundle_components WHERE bundle_id = ANY($1::int[])`,
    [bundles.map((b) => b.id)],
  )).rows;
  return bundles.map((b) => ({
    id: b.id, name: b.name, pricing_type: b.pricing_type, amount: Number(b.amount), active: b.active,
    components: comps.filter((c) => c.bundle_id === b.id).map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
  }));
}

// ─────────────────────────── GET
export async function GET(request: NextRequest) {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'preview') {
    const merchant = (searchParams.get('merchant') || '').trim().toLowerCase();
    if (!ADDRESS_LIKE_REGEX.test(merchant)) return NextResponse.json({ error: 'merchant required' }, { status: 400 });
    let cart: CartLineForBundle[] = [];
    try {
      const raw = searchParams.get('cart') || '';
      const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      if (Array.isArray(parsed)) {
        cart = parsed.map((l: Record<string, unknown>) => ({
          product_id: Number(l.product_id), quantity: Number(l.quantity), unit_price: Number(l.unit_price),
        })).filter((l) => Number.isFinite(l.product_id) && Number.isFinite(l.quantity) && Number.isFinite(l.unit_price));
      }
    } catch { /* empty cart on parse error */ }
    try {
      const bundles = await loadBundles(merchant);
      let total = 0;
      const applied: Array<{ bundle_id: number; name: string; savings: number }> = [];
      for (const b of bundles) {
        const s = bundleSavings(b, cart);
        if (s > 0) { total += s; applied.push({ bundle_id: b.id, name: b.name, savings: s }); }
      }
      return NextResponse.json({ bundle_discount: Math.round(total * 100) / 100, applied });
    } catch (err) {
      logger.error('bundle preview failed', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: 'Failed to preview bundles' }, { status: 500 });
    }
  }

  return withAuth(async (req: NextRequest, user: JWTPayload) => {
    const merchant = authAddr(user);
    if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      return NextResponse.json({ bundles: await loadBundles(merchant) });
    } catch (err) {
      logger.error('bundle config load failed', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: 'Failed to load bundles' }, { status: 500 });
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

  const ownsBundle = async (id: number) =>
    (await query(`SELECT 1 FROM merchant_bundles WHERE id = $1 AND merchant_address = $2`, [id, merchant])).rows.length > 0;

  try {
    if (body.action === 'add_bundle') {
      // verify all component products belong to the merchant
      const productIds = body.components.map((c) => c.product_id);
      const owned = (await query<{ id: number }>(
        `SELECT id FROM merchant_products WHERE merchant_address = $1 AND id = ANY($2::int[])`,
        [merchant, productIds],
      )).rows.map((r) => r.id);
      if (owned.length !== new Set(productIds).size) {
        return NextResponse.json({ error: 'One or more bundle products are not yours' }, { status: 400 });
      }
      const client = await getClient();
      try {
        await client.query('BEGIN');
        const b = (await client.query(
          `INSERT INTO merchant_bundles (merchant_address, name, pricing_type, amount) VALUES ($1,$2,$3,$4) RETURNING id`,
          [merchant, body.name, body.pricing_type, body.amount],
        )).rows[0] as { id: number };
        for (const c of body.components) {
          await client.query(
            `INSERT INTO merchant_bundle_components (bundle_id, product_id, quantity) VALUES ($1,$2,$3)`,
            [b.id, c.product_id, c.quantity],
          );
        }
        await client.query('COMMIT');
        return NextResponse.json({ bundle_id: b.id }, { status: 201 });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    if (body.action === 'update_bundle') {
      if (!(await ownsBundle(body.bundle_id))) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
      const sets: string[] = []; const params: unknown[] = []; let i = 1;
      if (body.name !== undefined) { sets.push(`name = $${i++}`); params.push(body.name); }
      if (body.pricing_type !== undefined) { sets.push(`pricing_type = $${i++}`); params.push(body.pricing_type); }
      if (body.amount !== undefined) { sets.push(`amount = $${i++}`); params.push(body.amount); }
      if (body.active !== undefined) { sets.push(`active = $${i++}`); params.push(body.active); }
      if (sets.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      params.push(body.bundle_id);
      await query(`UPDATE merchant_bundles SET ${sets.join(', ')} WHERE id = $${i}`, params as never[]);
      return NextResponse.json({ updated: true });
    }
    if (body.action === 'delete_bundle') {
      if (!(await ownsBundle(body.bundle_id))) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
      await query(`DELETE FROM merchant_bundles WHERE id = $1`, [body.bundle_id]);
      return NextResponse.json({ deleted: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    logger.error('bundle write failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to update bundle' }, { status: 500 });
  }
});
