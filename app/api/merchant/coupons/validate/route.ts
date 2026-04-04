import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculateCouponDiscount, serializeCouponRow } from '@/lib/coupons';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ valid: false, reason: 'Coupon not found' }, { status: 200 });
    }

    const coupon = serializeCouponRow(result.rows[0] as Record<string, unknown>);
    const now = Date.now();

    if (coupon.validFrom && coupon.validFrom > now) {
      return NextResponse.json({ valid: false, reason: 'Coupon is not active yet' }, { status: 200 });
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      return NextResponse.json({ valid: false, reason: 'Coupon has expired' }, { status: 200 });
    }
    if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) {
      return NextResponse.json({ valid: false, reason: 'Coupon usage limit reached' }, { status: 200 });
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
        return NextResponse.json({ valid: false, reason: 'Customer usage limit reached' }, { status: 200 });
      }
    } else if (customer) {
      await query('SELECT 0 AS redemption_count');
    }

    const calculation = calculateCouponDiscount(coupon, amount);
    return NextResponse.json({
      valid: calculation.valid,
      reason: calculation.reason,
      discount: calculation.discount,
      newTotal: calculation.newTotal,
      coupon,
    });
  } catch (error) {
    logger.error('[Merchant Coupons Validate] Error:', error);
    return NextResponse.json({ valid: false, reason: 'Failed to validate coupon' }, { status: 500 });
  }
}
