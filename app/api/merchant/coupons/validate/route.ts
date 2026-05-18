import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { getClient, query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { calculateCouponDiscount, serializeCouponRow } from '@/lib/coupons';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const PROMO_INVALID_MESSAGE = 'Promo code is not valid for this order';

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  const merchant = (searchParams.get('merchant') || '').trim().toLowerCase();
  const amount = Number(searchParams.get('amount') || '0');
  const customer = (searchParams.get('customer') || '').trim().toLowerCase();

  if (!code || !merchant || !ADDRESS_LIKE_REGEX.test(merchant) || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ valid: false, reason: 'Missing or invalid validation parameters' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT id, merchant_address, code, discount_type, discount_value, min_order_amount,
              max_discount, max_uses, uses, per_customer_limit, valid_from, valid_until,
              active, product_ids
         FROM merchant_coupons
        WHERE merchant_address = $1
          AND UPPER(code) = $2
        LIMIT 1`,
      [merchant, code],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ valid: false, reason: PROMO_INVALID_MESSAGE }, { status: 200 });
    }

    const coupon = serializeCouponRow(result.rows[0] as Record<string, unknown>);
    const now = Date.now();

    if (coupon.validFrom && coupon.validFrom > now) {
      return NextResponse.json({ valid: false, reason: PROMO_INVALID_MESSAGE }, { status: 200 });
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      return NextResponse.json({ valid: false, reason: PROMO_INVALID_MESSAGE }, { status: 200 });
    }
    if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) {
      return NextResponse.json({ valid: false, reason: PROMO_INVALID_MESSAGE }, { status: 200 });
    }

    if (customer && ADDRESS_LIKE_REGEX.test(customer) && coupon.perCustomerLimit != null) {
      const redemptionResult = await query(
        `SELECT COUNT(*) AS redemption_count
           FROM coupon_redemptions
          WHERE coupon_id = $1
            AND customer_address = $2`,
        [coupon.id, customer],
      );
      const redemptionCount = Number(redemptionResult.rows[0]?.redemption_count ?? 0);
      if (redemptionCount >= coupon.perCustomerLimit) {
        return NextResponse.json({ valid: false, reason: PROMO_INVALID_MESSAGE }, { status: 200 });
      }
    }

    const calculation = calculateCouponDiscount(coupon, amount);
    return NextResponse.json({
      valid: calculation.valid,
      reason: calculation.valid ? calculation.reason : PROMO_INVALID_MESSAGE,
      discount: calculation.discount,
      newTotal: calculation.newTotal,
    });
  } catch (error) {
    logger.error('[Merchant Coupons Validate] Error:', error);
    return NextResponse.json({ valid: false, reason: 'Failed to validate coupon' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Atomically redeem a coupon for an order.
//
// F-BE-038 FIX: Prior to this handler the codebase had ZERO writers to the
// `coupon_redemptions` table and ZERO `UPDATE merchant_coupons SET uses=uses+1`
// statements. The validate handler above READ both `coupon.uses` and the
// redemptions table for `per_customer_limit` enforcement, but neither value
// was ever incremented anywhere — meaning `max_uses` and `per_customer_limit`
// were silently non-functional. A merchant promotion configured as
// "10% off, first 100 customers" would never cap.
//
// This POST handler closes that gap. It is intended to be called by the order
// finalization flow (or the merchant frontend at order placement) after the
// validate GET succeeded. Concurrency is handled with an explicit transaction
// and `SELECT ... FOR UPDATE` on the merchant_coupons row, which serializes
// concurrent redemption attempts and re-checks both caps under the lock.
// ─────────────────────────────────────────────────────────────────────────────

const redeemCouponSchema = z.object({
  couponId: z.string().trim().min(1).max(64),
  customerAddress: z.string().trim().toLowerCase().refine((v) => ADDRESS_LIKE_REGEX.test(v), {
    message: 'Invalid customer address',
  }),
  orderId: z.coerce.number().int().positive().optional(),
  discountApplied: z.coerce.number().nonnegative(),
});

async function redeemHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof redeemCouponSchema>;
  try {
    const parsed = redeemCouponSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid redemption payload' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Customer can only redeem on their own behalf. The authenticated address
  // must match the customer_address recorded in the redemption row, so an
  // attacker who can hit this endpoint cannot consume someone else's
  // per-customer allowance.
  if (body.customerAddress !== authAddress) {
    return NextResponse.json({ error: 'Customer address must match authenticated address' }, { status: 403 });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the coupon row to serialize concurrent redemption attempts.
    const couponResult = await client.query(
      `SELECT id, merchant_address, code, discount_type, discount_value, min_order_amount,
              max_discount, max_uses, uses, per_customer_limit, valid_from, valid_until,
              active, product_ids
         FROM merchant_coupons
        WHERE id = $1
        FOR UPDATE`,
      [body.couponId],
    );

    if (couponResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const couponRow = couponResult.rows[0] as Record<string, unknown>;
    const coupon = serializeCouponRow(couponRow);
    const now = Date.now();

    if (!coupon.active) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Coupon is not active' }, { status: 400 });
    }
    if (coupon.validFrom && coupon.validFrom > now) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Coupon is not yet valid' }, { status: 400 });
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }
    // Re-check max_uses under the row lock to prevent two concurrent redeem
    // attempts from both seeing uses < max_uses and both succeeding.
    if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Coupon redemption limit reached' }, { status: 400 });
    }

    if (coupon.perCustomerLimit != null) {
      const perCustomer = await client.query(
        `SELECT COUNT(*)::int AS redemption_count
           FROM coupon_redemptions
          WHERE coupon_id = $1
            AND customer_address = $2`,
        [coupon.id, authAddress],
      );
      const redemptionCount = Number(perCustomer.rows[0]?.redemption_count ?? 0);
      if (redemptionCount >= coupon.perCustomerLimit) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Per-customer redemption limit reached' }, { status: 400 });
      }
    }

    await client.query(
      `INSERT INTO coupon_redemptions (coupon_id, customer_address, order_id, discount_applied)
       VALUES ($1, $2, $3, $4)`,
      [coupon.id, authAddress, body.orderId ?? null, body.discountApplied],
    );

    await client.query(
      `UPDATE merchant_coupons SET uses = uses + 1 WHERE id = $1`,
      [coupon.id],
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, couponId: coupon.id });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.warn('[Merchant Coupons Redeem] Rollback failed', rollbackError);
    }
    logger.error('[Merchant Coupons Redeem] Error:', error);
    return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 });
  } finally {
    client.release();
  }
}

export const POST = withAuth(redeemHandler);
