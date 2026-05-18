/**
 * Merchant Categories API
 *
 * GET   — List categories (public)
 * POST  — Create category (authenticated merchant)
 * PATCH — Update category (authenticated merchant)
 * DELETE — Delete category (authenticated merchant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  parent_id: z.number().int().positive().optional(),
  sort_order: z.coerce.number().int().optional(),
});

const patchCategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(100).optional(),
  sort_order: z.coerce.number().int().optional(),
});

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

function getAuthAddress(user: JWTPayload): string | NextResponse {
  const address = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return address;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get('merchant');

  if (!merchant || !ADDRESS_LIKE_REGEX.test(merchant)) {
    return NextResponse.json({ error: 'merchant address required' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT c.id, c.name, c.slug, c.parent_id, c.sort_order,
              COUNT(p.id) as product_count
       FROM merchant_categories c
       LEFT JOIN merchant_products p ON p.category_id = c.id AND p.status = 'active'
       WHERE c.merchant_address = $1
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`,
      [merchant.toLowerCase()]
    );

    return NextResponse.json({ categories: result.rows });
  } catch (error) {
    logger.error('[Categories GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

const postHandler = async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = createCategorySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { name, parent_id, sort_order } = body;

    const countResult = await query(
      'SELECT COUNT(*) as count FROM merchant_categories WHERE merchant_address = $1',
      [authAddress]
    );
    if (Number(countResult.rows[0]?.count) >= 50) {
      return NextResponse.json({ error: 'Maximum 50 categories per merchant' }, { status: 400 });
    }

    const slug = slugify(name.trim());

    const result = await query(
      `INSERT INTO merchant_categories (merchant_address, name, slug, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        authAddress,
        name,
        slug,
        parent_id ?? null,
        sort_order ?? 0,
      ]
    );

    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Categories POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

const patchHandler = async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = patchCategorySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { id, name, sort_order } = body;

    const updates: string[] = [];
    const params: (string | number)[] = [];
    let pi = 1;

    if (typeof name === 'string') {
      updates.push(`name = $${pi++}`);
      params.push(name);
      updates.push(`slug = $${pi++}`);
      params.push(slugify(name));
    }
    if (typeof sort_order === 'number') {
      updates.push(`sort_order = $${pi++}`);
      params.push(sort_order);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id, authAddress as string);
    const result = await query(
      `UPDATE merchant_categories SET ${updates.join(', ')} WHERE id = $${pi++} AND merchant_address = $${pi} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    logger.error('[Categories PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

const deleteHandler = async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }

    // Nullify category_id on products
    await query('UPDATE merchant_products SET category_id = NULL WHERE category_id = $1', [id]);

    const result = await query(
      'DELETE FROM merchant_categories WHERE id = $1 AND merchant_address = $2 RETURNING id',
      [id, authAddress]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Categories DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
