import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { serializeCouponRow } from '@/lib/coupons';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(40),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive().max(1_000_000),
  minOrderAmount: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().min(0).optional(),
  maxUses: z.coerce.number().int().positive().max(1_000_000).optional(),
  perCustomerLimit: z.coerce.number().int().positive().max(1_000).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  productIds: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
});

const updateCouponSchema = z.object({
  id: z.string().trim().min(1),
  active: z.boolean().optional(),
  maxUses: z.coerce.number().int().positive().max(1_000_000).optional(),
  validUntil: z.union([z.string().datetime(), z.null()]).optional(),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';

  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }

  return address;
}

async function getHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(
      `SELECT id, merchant_address, code, discount_type, discount_value, min_order_amount,
              max_discount, max_uses, uses, per_customer_limit, valid_from, valid_until,
              active, product_ids, created_at
         FROM merchant_coupons
        WHERE merchant_address = $1
        ORDER BY created_at DESC, code ASC`,
      [authAddress],
    );

    return NextResponse.json({
      success: true,
      coupons: result.rows.map((row) => serializeCouponRow(row as Record<string, unknown>)),
    });
  } catch (error) {
    logger.error('[Merchant Coupons GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = createCouponSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid coupon payload' }, { status: 400 });
    }

    const body = parsedBody.data;
    const code = body.code.trim().toUpperCase();

    if (body.discountType === 'percentage' && body.discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discounts cannot exceed 100%' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO merchant_coupons (
         id, merchant_address, code, discount_type, discount_value,
         min_order_amount, max_discount, max_uses, per_customer_limit,
         valid_from, valid_until, active, product_ids
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         COALESCE($10::timestamptz, NOW()), $11::timestamptz, true, $12::text[]
       )
       RETURNING id, merchant_address, code, discount_type, discount_value, min_order_amount,
                 max_discount, max_uses, uses, per_customer_limit, valid_from, valid_until,
                 active, product_ids`,
      [
        `coupon_${randomBytes(8).toString('hex')}`,
        authAddress,
        code,
        body.discountType,
        body.discountValue,
        body.minOrderAmount ?? null,
        body.maxDiscount ?? null,
        body.maxUses ?? null,
        body.perCustomerLimit ?? 1,
        body.validFrom ?? null,
        body.validUntil ?? null,
        body.productIds ?? null,
      ],
    );

    return NextResponse.json({
      success: true,
      coupon: serializeCouponRow(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Coupons POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = updateCouponSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid coupon update payload' }, { status: 400 });
    }

    const { id, active, maxUses, validUntil } = parsedBody.data;
    const result = await query(
      `UPDATE merchant_coupons
          SET active = COALESCE($3, active),
              max_uses = COALESCE($4, max_uses),
              valid_until = COALESCE($5::timestamptz, valid_until)
        WHERE id = $1 AND merchant_address = $2
        RETURNING id, merchant_address, code, discount_type, discount_value, min_order_amount,
                  max_discount, max_uses, uses, per_customer_limit, valid_from, valid_until,
                  active, product_ids`,
      [id, authAddress, active ?? null, maxUses ?? null, validUntil ?? null],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      coupon: serializeCouponRow(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Coupons PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id')?.trim() || '';
  if (!id) {
    return NextResponse.json({ error: 'Coupon id required' }, { status: 400 });
  }

  try {
    const result = await query(
      'DELETE FROM merchant_coupons WHERE id = $1 AND merchant_address = $2 RETURNING id',
      [id, authAddress],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Merchant Coupons DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
