/**
 * Merchant Tax Rates API
 *
 * GET    — List the merchant's configured tax rates.
 * POST   — Create a new tax rate.
 * PATCH  — Update name/rate/enabled/applies_to/is_default.
 * DELETE — Remove a tax rate.
 *
 * Tax rates are stored as basis points (e.g. 725 = 7.25%) to avoid
 * floating-point rounding. They're configured per-jurisdiction so a
 * merchant operating in multiple cities/states can set the right one
 * for each. The checkout flow picks the matching rate by comparing
 * the buyer's shipping address against the configured jurisdictions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  rate_bps: z.coerce.number().int().min(0).max(10_000),
  jurisdiction_country: z.string().length(2).optional(),
  jurisdiction_state: z.string().max(50).optional(),
  jurisdiction_city: z.string().max(100).optional(),
  postal_code_pattern: z.string().max(200).optional(),
  is_default: z.boolean().optional(),
  applies_to: z.array(z.enum(['physical', 'digital', 'service'])).optional(),
});

const updateSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(100).optional(),
  rate_bps: z.coerce.number().int().min(0).max(10_000).optional(),
  enabled: z.boolean().optional(),
  is_default: z.boolean().optional(),
  applies_to: z.array(z.enum(['physical', 'digital', 'service'])).optional(),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return ADDRESS_LIKE_REGEX.test(address) ? address : null;
}

async function getHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(
      `SELECT id, name, rate_bps,
              jurisdiction_country, jurisdiction_state, jurisdiction_city,
              postal_code_pattern, is_default, enabled, applies_to, created_at
         FROM merchant_tax_rates WHERE merchant_address = $1
        ORDER BY is_default DESC, rate_bps DESC, name ASC`,
      [authAddress],
    );
    return NextResponse.json({ tax_rates: result.rows });
  } catch (error) {
    logger.error('[Tax Rates GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load tax rates' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof createSchema>;
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    // is_default is enforced by a partial UNIQUE index, so we need to clear
    // any existing default in a single transaction if this one is default.
    const client = await getClient();
    let row: Record<string, unknown> | null = null;
    try {
      await client.query('BEGIN');
      if (body.is_default) {
        await client.query(
          `UPDATE merchant_tax_rates SET is_default = FALSE WHERE merchant_address = $1 AND is_default = TRUE`,
          [authAddress],
        );
      }
      const res = await client.query(
        `INSERT INTO merchant_tax_rates
           (merchant_address, name, rate_bps,
            jurisdiction_country, jurisdiction_state, jurisdiction_city,
            postal_code_pattern, is_default, applies_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          authAddress,
          body.name.trim(),
          body.rate_bps,
          body.jurisdiction_country?.toUpperCase() ?? null,
          body.jurisdiction_state ?? null,
          body.jurisdiction_city ?? null,
          body.postal_code_pattern ?? null,
          body.is_default ?? false,
          body.applies_to ?? ['physical', 'digital', 'service'],
        ],
      );
      row = res.rows[0];
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
    return NextResponse.json({ tax_rate: row }, { status: 201 });
  } catch (error) {
    logger.error('[Tax Rates POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create tax rate' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof updateSchema>;
  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const client = await getClient();
    let row: Record<string, unknown> | null = null;
    try {
      await client.query('BEGIN');
      if (body.is_default === true) {
        await client.query(
          `UPDATE merchant_tax_rates SET is_default = FALSE
            WHERE merchant_address = $1 AND is_default = TRUE AND id <> $2`,
          [authAddress, body.id],
        );
      }
      const updates: string[] = [];
      const params: (string | number | boolean | null | string[])[] = [];
      let pi = 1;
      if (body.name !== undefined)       { updates.push(`name = $${pi++}`);       params.push(body.name.trim()); }
      if (body.rate_bps !== undefined)   { updates.push(`rate_bps = $${pi++}`);   params.push(body.rate_bps); }
      if (body.enabled !== undefined)    { updates.push(`enabled = $${pi++}`);    params.push(body.enabled); }
      if (body.is_default !== undefined) { updates.push(`is_default = $${pi++}`); params.push(body.is_default); }
      if (body.applies_to !== undefined) { updates.push(`applies_to = $${pi++}`); params.push(body.applies_to); }
      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 });
      }
      updates.push(`updated_at = NOW()`);
      params.push(body.id, authAddress);
      const res = await client.query(
        `UPDATE merchant_tax_rates SET ${updates.join(', ')}
           WHERE id = $${pi++} AND merchant_address = $${pi++}
         RETURNING *`,
        params,
      );
      row = res.rows[0] ?? null;
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
    if (!row) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 });
    }
    return NextResponse.json({ tax_rate: row });
  } catch (error) {
    logger.error('[Tax Rates PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update tax rate' }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    const result = await query(
      `DELETE FROM merchant_tax_rates WHERE id = $1 AND merchant_address = $2 RETURNING id`,
      [Number(id), authAddress],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Tax Rates DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete tax rate' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
