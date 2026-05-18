export type CouponDiscountType = 'percentage' | 'fixed';

export interface CouponDefinition {
  id: string;
  merchantAddress: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  maxUses?: number | null;
  uses: number;
  perCustomerLimit?: number | null;
  validFrom?: number | null;
  validUntil?: number | null;
  active: boolean;
  productIds?: string[] | null;
}

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  discount: number;
  newTotal: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateCouponDiscount(
  coupon: CouponDefinition,
  orderAmount: number,
): CouponValidationResult {
  const normalizedAmount = Math.max(0, roundCurrency(orderAmount));

  if (!coupon.active) {
    return { valid: false, reason: 'Coupon is inactive', discount: 0, newTotal: normalizedAmount };
  }

  if (coupon.minOrderAmount && normalizedAmount < coupon.minOrderAmount) {
    return {
      valid: false,
      reason: `Minimum order is ${coupon.minOrderAmount.toFixed(2)}`,
      discount: 0,
      newTotal: normalizedAmount,
    };
  }

  let discount = coupon.discountType === 'percentage'
    ? normalizedAmount * (coupon.discountValue / 100)
    : coupon.discountValue;

  if (coupon.maxDiscount && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }

  discount = roundCurrency(Math.min(discount, normalizedAmount));

  return {
    valid: discount > 0,
    reason: discount > 0 ? undefined : 'Coupon does not reduce this order',
    discount,
    newTotal: roundCurrency(Math.max(0, normalizedAmount - discount)),
  };
}

export function serializeCouponRow(row: Record<string, unknown>): CouponDefinition {
  return {
    id: String(row.id ?? ''),
    merchantAddress: String(row.merchant_address ?? '').toLowerCase(),
    code: String(row.code ?? '').toUpperCase(),
    discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(row.discount_value ?? 0),
    minOrderAmount: row.min_order_amount == null ? null : Number(row.min_order_amount),
    maxDiscount: row.max_discount == null ? null : Number(row.max_discount),
    maxUses: row.max_uses == null ? null : Number(row.max_uses),
    uses: Number(row.uses ?? 0),
    perCustomerLimit: row.per_customer_limit == null ? null : Number(row.per_customer_limit),
    validFrom: row.valid_from ? new Date(String(row.valid_from)).getTime() : null,
    validUntil: row.valid_until ? new Date(String(row.valid_until)).getTime() : null,
    active: Boolean(row.active ?? true),
    productIds: Array.isArray(row.product_ids) ? row.product_ids.map((value) => String(value)) : null,
  };
}
