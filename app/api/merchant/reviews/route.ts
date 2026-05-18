/**
 * Merchant Reviews & Ratings API
 *
 * GET   — List reviews for a merchant or product (public)
 * POST  — Submit a review (authenticated customer, purchase-verified)
 * PATCH — Merchant reply or moderate review
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import type { JWTPayload } from '@/lib/auth/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createReviewSchema = z.object({
  merchant_address: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX),
  product_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

const patchReviewSchema = z.object({
  id: z.number().int().positive(),
  merchant_reply: z.string().max(2000).optional(),
  status: z.enum(['published', 'hidden']).optional(),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }
  return address;
}

// ─────────────────────────── GET: List reviews
async function getHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get('merchant');
  const productId = searchParams.get('product_id');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;
  const sort = searchParams.get('sort') || 'newest';

  if (!merchant && !productId) {
    return NextResponse.json({ error: 'merchant or product_id required' }, { status: 400 });
  }

  try {
    const conditions = ["r.status = 'published'"];
    const params: (string | number)[] = [];
    let pi = 1;

    if (merchant && ADDRESS_LIKE_REGEX.test(merchant)) {
      conditions.push(`r.merchant_address = $${pi++}`);
      params.push(merchant.toLowerCase());
    }
    if (productId) {
      conditions.push(`r.product_id = $${pi++}`);
      params.push(Number(productId));
    }

    const where = conditions.join(' AND ');
    const orderBy = sort === 'highest' ? 'r.rating DESC'
      : sort === 'lowest' ? 'r.rating ASC'
      : sort === 'helpful' ? 'r.helpful_count DESC'
      : 'r.created_at DESC';

    const [reviews, countResult, statsResult] = await Promise.all([
      query(
        `SELECT r.id, r.rating, r.title, r.body, r.verified_purchase,
                r.helpful_count, r.reviewer_address, r.merchant_reply,
                r.merchant_replied_at, r.created_at,
                p.name as product_name
         FROM merchant_reviews r
         LEFT JOIN merchant_products p ON r.product_id = p.id
         WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT $${pi++} OFFSET $${pi}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) as total FROM merchant_reviews r WHERE ${where}`, params),
      query(
        `SELECT rating, COUNT(*) as count FROM merchant_reviews r WHERE ${where} GROUP BY rating ORDER BY rating`,
        params
      ),
    ]);

    // Build rating distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of statsResult.rows) {
      distribution[Number(row?.rating) || 0] = Number(row?.count) || 0;
    }

    const total = Number(countResult.rows[0]?.total ?? 0);
    const totalRatings = Object.values(distribution).reduce((a, b) => a + b, 0);
    const avgRating = totalRatings > 0
      ? Math.round((Object.entries(distribution).reduce((sum, [r, c]) => sum + Number(r) * c, 0) / totalRatings) * 10) / 10
      : 0;

    return NextResponse.json({
      reviews: reviews.rows,
      stats: { total, avg_rating: avgRating, distribution },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('[Reviews GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Submit review
async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = createReviewSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { merchant_address, product_id, rating, title, body: reviewBody } = body;

    // Can't review own store
    if (authAddress === merchant_address) {
      return NextResponse.json({ error: 'Cannot review your own store' }, { status: 400 });
    }

    // Check for existing review
    const existingResult = await query(
      'SELECT id FROM merchant_reviews WHERE reviewer_address = $1 AND product_id = $2',
      [authAddress, product_id]
    );
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'You already reviewed this product' }, { status: 409 });
    }

    // Check purchase verification
    const purchaseResult = await query(
      `SELECT id FROM merchant_order_items oi
       JOIN merchant_orders o ON oi.order_id = o.id
       WHERE o.customer_address = $1 AND oi.product_id = $2 AND o.payment_status = 'paid'
       LIMIT 1`,
      [authAddress, product_id]
    );
    const verifiedPurchase = purchaseResult.rows.length > 0;

    // Get order_id if verified
    let orderId: number | null = null;
    if (verifiedPurchase && purchaseResult.rows[0]) {
      const orderResult = await query(
        `SELECT o.id FROM merchant_orders o
         JOIN merchant_order_items oi ON oi.order_id = o.id
         WHERE o.customer_address = $1 AND oi.product_id = $2 AND o.payment_status = 'paid'
         LIMIT 1`,
        [authAddress, product_id]
      );
      orderId = orderResult.rows[0]?.id as number ?? null;
    }

    const result = await query(
      `INSERT INTO merchant_reviews
       (merchant_address, product_id, reviewer_address, order_id, rating, title, body, verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        merchant_address,
        product_id,
        authAddress,
        orderId,
        rating,
        title ?? null,
        reviewBody ?? null,
        verifiedPurchase,
      ]
    );

    return NextResponse.json({ review: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Reviews POST] Error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Merchant reply or moderate
async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = patchReviewSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { id, merchant_reply, status } = body;

    // Verify merchant owns the review's merchant_address
    const existing = await query(
      'SELECT id, merchant_address FROM merchant_reviews WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    if ((existing.rows[0]?.merchant_address as string) !== authAddress) {
      return NextResponse.json({ error: 'Not your review to manage' }, { status: 403 });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: (string | number)[] = [];
    let pi = 1;

    if (merchant_reply !== undefined) {
      updates.push(`merchant_reply = $${pi++}`);
      params.push(merchant_reply);
      updates.push('merchant_replied_at = NOW()');
    }
    if (status !== undefined) {
      updates.push(`status = $${pi++}`);
      params.push(status);
    }

    params.push(id);
    const result = await query(
      `UPDATE merchant_reviews SET ${updates.join(', ')} WHERE id = $${pi} RETURNING *`,
      params
    );

    return NextResponse.json({ review: result.rows[0] });
  } catch (error) {
    logger.error('[Reviews PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
