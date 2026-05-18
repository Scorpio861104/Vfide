/**
 * Merchant Product Bulk Operations API
 *
 * POW-7 FIX: power merchants with hundreds or thousands of products
 * cannot reasonably update every product one-at-a-time via the per-id
 * PATCH endpoint. Combined with the per-IP write rate limit (30/min),
 * a 1000-product price update would take 33+ minutes of sequential
 * requests.
 *
 * This endpoint accepts up to 100 product updates in one transaction,
 * using a single Postgres UPDATE per submitted row inside one outer
 * transaction so partial failures roll back. The same merchant ownership
 * check used by the per-id PATCH applies to every row in the batch.
 *
 * Supported fields (subset of full PATCH; only fields a power merchant
 * commonly bulk-edits):
 *   - price
 *   - compare_at_price
 *   - inventory_count
 *   - status (active|draft|archived)
 *
 * Other fields are intentionally NOT included here so this endpoint
 * cannot be used to bulk-rewrite identifying product data (name, slug,
 * SKU). Bulk-name-change is unusual; use the per-id PATCH for those.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const bulkUpdateRowSchema = z.object({
  id: z.coerce.number().int().positive(),
  price: z.coerce.number().min(0).max(999999.99).optional(),
  compare_at_price: z.coerce.number().min(0).max(999999.99).nullable().optional(),
  inventory_count: z.coerce.number().int().min(0).optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
});

const bulkUpdateBodySchema = z.object({
  updates: z.array(bulkUpdateRowSchema).min(1).max(100),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }
  return address;
}

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bulkUpdateBodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { updates } = parsed.data;

  // Validate that every requested id belongs to the authenticated merchant
  // BEFORE issuing any UPDATE. This is a single round-trip check.
  const ids = updates.map(u => u.id);
  const ownership = await query<{ id: number }>(
    `SELECT id FROM merchant_products WHERE id = ANY($1::int[]) AND merchant_address = $2`,
    [ids, authAddress],
  );
  const ownedIds = new Set(ownership.rows.map(r => r.id));
  const unauthorized = ids.filter(id => !ownedIds.has(id));
  if (unauthorized.length > 0) {
    return NextResponse.json(
      {
        error: 'One or more products not found or not owned by you',
        unauthorized_ids: unauthorized,
      },
      { status: 404 },
    );
  }

  // Apply updates inside a single transaction so partial failures rollback.
  // Each row's UPDATE only touches the four supported fields; missing fields
  // are skipped. We assemble dynamic SET clauses per row.
  const results: Array<{ id: number; updated: boolean }> = [];
  try {
    await query('BEGIN');
    for (const row of updates) {
      const sets: string[] = ['updated_at = NOW()'];
      const params: (string | number | null)[] = [];
      let pi = 1;
      if (typeof row.price === 'number') {
        sets.push(`price = $${pi++}`);
        params.push(row.price);
      }
      if (row.compare_at_price === null || typeof row.compare_at_price === 'number') {
        sets.push(`compare_at_price = $${pi++}`);
        params.push(row.compare_at_price);
      }
      if (typeof row.inventory_count === 'number') {
        sets.push(`inventory_count = $${pi++}`);
        params.push(row.inventory_count);
      }
      if (typeof row.status === 'string') {
        sets.push(`status = $${pi++}`);
        params.push(row.status);
      }
      if (sets.length === 1) {
        // No real fields supplied — skip but don't error
        results.push({ id: row.id, updated: false });
        continue;
      }
      params.push(row.id);
      params.push(authAddress);
      await query(
        `UPDATE merchant_products
            SET ${sets.join(', ')}
          WHERE id = $${pi++} AND merchant_address = $${pi}`,
        params,
      );
      results.push({ id: row.id, updated: true });
    }
    await query('COMMIT');
  } catch (error) {
    try { await query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('[Merchant Products Bulk PATCH] Error:', error);
    return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    results,
    count: results.filter(r => r.updated).length,
  });
}

export const PATCH = withAuth(patchHandler);
