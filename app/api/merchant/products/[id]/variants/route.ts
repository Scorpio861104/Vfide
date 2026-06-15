/**
 * Product Variant CRUD API (Commerce Operations Phase 1A)
 *
 * Manages variants for a single product owned by the authenticated merchant. The purchase/pricing/inventory
 * enforcement for variants lives in the orders route + lib/commerce/variants.ts; this route is the write
 * surface the merchant uses to define them.
 *
 * GET    — list variants for the product (merchant-scoped)
 * POST   — create a variant
 * PATCH  — update a variant (price_override, inventory_count, attributes, sort_order, status)
 * DELETE — archive a variant (status='archived'; never hard-delete — preserves order_items history)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) return null;
  return address;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(100).optional(),
  price_override: z.union([z.coerce.number().min(0).max(99999999.99), z.null()]).optional(),
  inventory_count: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  attributes: z.record(z.string(), z.string()).optional(), // {"size":"L","color":"Blue"}
});

const updateSchema = z.object({
  variant_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200).optional(),
  sku: z.union([z.string().trim().max(100), z.null()]).optional(),
  price_override: z.union([z.coerce.number().min(0).max(99999999.99), z.null()]).optional(),
  inventory_count: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const deleteSchema = z.object({ variant_id: z.coerce.number().int().positive() });

async function resolveParams(context?: { params: Promise<Record<string, string>> | Record<string, string> }): Promise<string | null> {
  if (!context) return null;
  const p = await context.params;
  return p.id ?? null;
}

// Confirm the product exists AND belongs to the caller. Returns numeric product id or null.
async function ownedProductId(productIdRaw: string | null, merchant: string): Promise<number | null> {
  if (!productIdRaw) return null;
  const pid = Number(productIdRaw);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const r = await query<{ id: number }>(
    `SELECT id FROM merchant_products WHERE id = $1 AND merchant_address = $2`,
    [pid, merchant],
  );
  return r.rows[0]?.id ?? null;
}

export const GET = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const productId = await ownedProductId(await resolveParams(context), merchant);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  try {
    const rows = (await query(
      `SELECT id, product_id, name, sku, price_override, inventory_count, sort_order, attributes, status, created_at
         FROM merchant_product_variants WHERE product_id = $1 ORDER BY sort_order, id`,
      [productId],
    )).rows;
    return NextResponse.json({ variants: rows });
  } catch (err) {
    logger.error('GET variants failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load variants' }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const productId = await ownedProductId(await resolveParams(context), merchant);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  try {
    const inserted = (await query<{ id: number }>(
      `INSERT INTO merchant_product_variants (product_id, name, sku, price_override, inventory_count, sort_order, attributes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active') RETURNING id`,
      [productId, body.name, body.sku ?? null, body.price_override ?? null, body.inventory_count ?? null,
       body.sort_order ?? 0, JSON.stringify(body.attributes ?? {})],
    )).rows[0];
    if (!inserted) return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 });
    return NextResponse.json({ variant_id: inserted.id, status: 'active' }, { status: 201 });
  } catch (err) {
    logger.error('POST variant failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const productId = await ownedProductId(await resolveParams(context), merchant);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  let body: z.infer<typeof updateSchema>;
  try { body = updateSchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  // Build a dynamic SET clause from the provided fields (variant must belong to this product).
  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let i = 1;
  const add = (col: string, val: string | number | boolean | null) => { sets.push(`${col} = $${i++}`); params.push(val); };
  if (body.name !== undefined) add('name', body.name);
  if (body.sku !== undefined) add('sku', body.sku);
  if (body.price_override !== undefined) add('price_override', body.price_override);
  if (body.inventory_count !== undefined) add('inventory_count', body.inventory_count);
  if (body.sort_order !== undefined) add('sort_order', body.sort_order);
  if (body.attributes !== undefined) add('attributes', JSON.stringify(body.attributes));
  if (body.status !== undefined) add('status', body.status);
  if (sets.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  params.push(body.variant_id, productId);
  try {
    const r = await query(
      `UPDATE merchant_product_variants SET ${sets.join(', ')}
        WHERE id = $${i++} AND product_id = $${i}`,
      params,
    );
    if (r.rowCount === 0) return NextResponse.json({ error: 'Variant not found for this product' }, { status: 404 });
    return NextResponse.json({ variant_id: body.variant_id, updated: true });
  } catch (err) {
    logger.error('PATCH variant failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const productId = await ownedProductId(await resolveParams(context), merchant);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  let body: z.infer<typeof deleteSchema>;
  try { body = deleteSchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  try {
    // Archive, never hard-delete: preserves merchant_order_items.variant_id history.
    const r = await query(
      `UPDATE merchant_product_variants SET status = 'archived' WHERE id = $1 AND product_id = $2`,
      [body.variant_id, productId],
    );
    if (r.rowCount === 0) return NextResponse.json({ error: 'Variant not found for this product' }, { status: 404 });
    return NextResponse.json({ variant_id: body.variant_id, archived: true });
  } catch (err) {
    logger.error('DELETE variant failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to archive variant' }, { status: 500 });
  }
});
