/**
 * Merchant Payment Links API
 *
 * GET    — List the merchant's payment links.
 * POST   — Create a new shareable payment link.
 * PATCH  — Update title/description/status/expiry/limits.
 * DELETE — Remove a link.
 *
 * Public buyer-side resolution of a link_id happens through /api/pay/link/[id]
 * which is a separate route that does NOT require authentication.
 */

import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const VALID_STATUSES = ['active', 'paused', 'archived', 'exhausted'] as const;

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  token: z.string().regex(ADDRESS_LIKE_REGEX),
  amount: z.coerce.number().positive().optional(),     // null => customer chooses
  min_amount: z.coerce.number().nonnegative().optional(),
  max_amount: z.coerce.number().positive().optional(),
  currency_display: z.string().max(10).optional(),
  redirect_url: z.string().url().max(500).optional(),
  collect_email: z.boolean().optional(),
  collect_shipping: z.boolean().optional(),
  single_use: z.boolean().optional(),
  max_uses: z.coerce.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
});

const updateSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  max_uses: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  expires_at: z.union([z.string().datetime(), z.null()]).optional(),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return ADDRESS_LIKE_REGEX.test(address) ? address : null;
}

function generateLinkId(): string {
  // 16 hex chars = 64 bits of entropy. Unique enough for shareable URLs
  // even at millions of links per merchant.
  return randomBytes(8).toString('hex');
}

async function getHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(
      `SELECT id, link_id, merchant_address, title, description, token,
              amount, min_amount, max_amount, currency_display, redirect_url,
              collect_email, collect_shipping, single_use, max_uses, uses,
              expires_at, status, metadata, created_at
         FROM merchant_payment_links
        WHERE merchant_address = $1
        ORDER BY created_at DESC`,
      [authAddress],
    );
    return NextResponse.json({ links: result.rows });
  } catch (error) {
    logger.error('[PayLinks GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load payment links' }, { status: 500 });
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

  // Sanity: if a min/max range is set, amount must NOT be (open-amount form);
  // if amount is set, min/max are ignored.
  if (body.amount && (body.min_amount || body.max_amount)) {
    return NextResponse.json(
      { error: 'Either fix amount or set a min/max range, not both' },
      { status: 400 },
    );
  }
  if (body.min_amount && body.max_amount && body.min_amount > body.max_amount) {
    return NextResponse.json({ error: 'min_amount cannot exceed max_amount' }, { status: 400 });
  }

  // Generate a unique link_id. Loop on collision (extremely rare).
  let linkId = generateLinkId();
  for (let i = 0; i < 5; i++) {
    const exists = await query('SELECT 1 FROM merchant_payment_links WHERE link_id = $1', [linkId]);
    if (exists.rows.length === 0) break;
    linkId = generateLinkId();
  }

  try {
    const result = await query(
      `INSERT INTO merchant_payment_links
         (link_id, merchant_address, title, description, token, amount,
          min_amount, max_amount, currency_display, redirect_url,
          collect_email, collect_shipping, single_use, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        linkId,
        authAddress,
        body.title.trim(),
        body.description?.trim() ?? null,
        body.token.toLowerCase(),
        body.amount ?? null,
        body.min_amount ?? null,
        body.max_amount ?? null,
        body.currency_display ?? 'VFIDE',
        body.redirect_url ?? null,
        body.collect_email ?? false,
        body.collect_shipping ?? false,
        body.single_use ?? false,
        body.max_uses ?? null,
        body.expires_at ?? null,
      ],
    );
    return NextResponse.json({ link: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[PayLinks POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
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

  // Build dynamic UPDATE
  const updates: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let pi = 1;
  if (body.title !== undefined)       { updates.push(`title = $${pi++}`);       params.push(body.title.trim()); }
  if (body.description !== undefined) { updates.push(`description = $${pi++}`); params.push(body.description.trim() || null); }
  if (body.status !== undefined)      { updates.push(`status = $${pi++}`);      params.push(body.status); }
  if (body.max_uses !== undefined)    { updates.push(`max_uses = $${pi++}`);    params.push(body.max_uses); }
  if (body.expires_at !== undefined)  { updates.push(`expires_at = $${pi++}`);  params.push(body.expires_at); }
  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 });
  }
  updates.push(`updated_at = NOW()`);
  params.push(body.id, authAddress);

  try {
    const result = await query(
      `UPDATE merchant_payment_links SET ${updates.join(', ')}
         WHERE id = $${pi++} AND merchant_address = $${pi++}
       RETURNING *`,
      params,
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }
    return NextResponse.json({ link: result.rows[0] });
  } catch (error) {
    logger.error('[PayLinks PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid link id' }, { status: 400 });
  }
  try {
    const result = await query(
      `DELETE FROM merchant_payment_links WHERE id = $1 AND merchant_address = $2 RETURNING id`,
      [Number(id), authAddress],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[PayLinks DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete payment link' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
