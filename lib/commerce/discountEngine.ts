/**
 * Discounts & bundles engine (Commerce Operations Phase 1E).
 *
 * Pure, side-effect-free discount validation + bundle pricing + the canonical pricing composition, so discounts
 * are SERVER-AUTHORITATIVE at checkout (today discount_amount is client-supplied — the trust gap shipping/tax
 * had before 1C/1D). No external boundary: this is entirely in-house commerce logic.
 *
 * Composition order (the important interaction): discounts reduce the ITEM SUBTOTAL; tax is computed on the
 * discounted taxable base; shipping is added after; total = (subtotal − discount) + tax + shipping. This keeps
 * 1A (variant pricing), 1C (authoritative shipping), and 1D (authoritative tax) consistent.
 *
 * Backed by existing storage: merchant_coupons (+ coupon_redemptions) and the new merchant_bundles.
 */

import { calculateCouponDiscount, type CouponDefinition } from '@/lib/coupons';

export type CouponRejection =
  | 'INACTIVE' | 'NOT_STARTED' | 'EXPIRED' | 'USAGE_LIMIT_REACHED' | 'PER_CUSTOMER_LIMIT'
  | 'MIN_ORDER_NOT_MET' | 'NOT_APPLICABLE_TO_ITEMS' | 'NO_DISCOUNT';

export interface CouponUsageContext {
  nowMs: number;
  customerRedemptions: number;   // how many times THIS customer already redeemed THIS coupon
  eligibleSubtotal: number;      // subtotal of items the coupon applies to (product-scoped) — equals subtotal if unscoped
  fullSubtotal: number;          // the order's full item subtotal
}

export interface CouponDecision {
  ok: boolean;
  reason?: CouponRejection;
  discount: number;              // authoritative discount amount (rounded)
}

function round(n: number): number { return Math.round(n * 100) / 100; }

/**
 * Full authoritative coupon validation — the gaps lib/coupons.calculateCouponDiscount doesn't cover:
 * time window, total usage cap, per-customer limit, product scoping. Computes the discount against the
 * ELIGIBLE subtotal (product-scoped coupons only discount their products).
 */
export function validateCoupon(coupon: CouponDefinition, ctx: CouponUsageContext): CouponDecision {
  if (!coupon.active) return { ok: false, reason: 'INACTIVE', discount: 0 };

  if (coupon.validFrom && ctx.nowMs < coupon.validFrom) return { ok: false, reason: 'NOT_STARTED', discount: 0 };
  if (coupon.validUntil && ctx.nowMs > coupon.validUntil) return { ok: false, reason: 'EXPIRED', discount: 0 };

  if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) return { ok: false, reason: 'USAGE_LIMIT_REACHED', discount: 0 };

  if (coupon.perCustomerLimit != null && ctx.customerRedemptions >= coupon.perCustomerLimit) {
    return { ok: false, reason: 'PER_CUSTOMER_LIMIT', discount: 0 };
  }

  // product-scoped coupons only apply if there is eligible subtotal
  const scoped = Array.isArray(coupon.productIds) && coupon.productIds.length > 0;
  const base = scoped ? ctx.eligibleSubtotal : ctx.fullSubtotal;
  if (scoped && base <= 0) return { ok: false, reason: 'NOT_APPLICABLE_TO_ITEMS', discount: 0 };

  // min-order is measured against the FULL subtotal (a min spend to unlock the coupon)
  if (coupon.minOrderAmount && ctx.fullSubtotal < coupon.minOrderAmount) {
    return { ok: false, reason: 'MIN_ORDER_NOT_MET', discount: 0 };
  }

  // reuse the base discount math (percentage/fixed + maxDiscount + clamp), applied to the eligible base
  const r = calculateCouponDiscount({ ...coupon, minOrderAmount: null }, base);
  if (!r.valid || r.discount <= 0) return { ok: false, reason: 'NO_DISCOUNT', discount: 0 };
  return { ok: true, discount: round(r.discount) };
}

// ─────────────────────────── Bundles

export interface BundleComponent { product_id: number; quantity: number; }
export interface BundleDefinition {
  id: number;
  name: string;
  components: BundleComponent[];
  pricing_type: 'fixed' | 'percent'; // fixed = the whole bundle costs `amount`; percent = `amount`% off components
  amount: number;                     // fixed price, or percent off (e.g. 10 = 10% off)
  active: boolean;
}

export interface CartLineForBundle { product_id: number; quantity: number; unit_price: number; }

/**
 * How many whole copies of a bundle a cart satisfies, and the per-bundle component cost. A bundle "fires" only
 * when the cart contains ALL components in at least the required quantities.
 */
export function bundleMatchCount(bundle: BundleDefinition, cart: CartLineForBundle[]): number {
  if (!bundle.active || bundle.components.length === 0) return 0;
  let copies = Infinity;
  for (const comp of bundle.components) {
    if (comp.quantity <= 0) return 0;
    const have = cart.filter((l) => l.product_id === comp.product_id).reduce((s, l) => s + l.quantity, 0);
    copies = Math.min(copies, Math.floor(have / comp.quantity));
  }
  return copies === Infinity ? 0 : copies;
}

/** The undiscounted component cost of one bundle copy (sum of component unit_price * component qty). */
export function bundleComponentCost(bundle: BundleDefinition, cart: CartLineForBundle[]): number {
  let cost = 0;
  for (const comp of bundle.components) {
    const line = cart.find((l) => l.product_id === comp.product_id);
    const unit = line?.unit_price ?? 0;
    cost += unit * comp.quantity;
  }
  return round(cost);
}

/**
 * Bundle savings for a cart: for each whole bundle copy present, the discount is the difference between the
 * component cost and the bundle price (fixed) or `amount`% of component cost (percent). Never negative (a
 * "bundle" priced above components yields 0 savings, not a surcharge).
 */
export function bundleSavings(bundle: BundleDefinition, cart: CartLineForBundle[]): number {
  const copies = bundleMatchCount(bundle, cart);
  if (copies <= 0) return 0;
  const perCopyComponentCost = bundleComponentCost(bundle, cart);
  let perCopySaving: number;
  if (bundle.pricing_type === 'fixed') {
    perCopySaving = perCopyComponentCost - bundle.amount;
  } else {
    perCopySaving = perCopyComponentCost * (bundle.amount / 100);
  }
  perCopySaving = Math.max(0, perCopySaving);
  return round(perCopySaving * copies);
}

// ─────────────────────────── Composition

export interface PriceComposition {
  subtotal: number;
  discount: number;   // total discount (coupon + bundles), clamped to subtotal
  taxable: number;    // subtotal − discount (the base tax is computed on)
  tax: number;
  shipping: number;
  total: number;
}

/**
 * The canonical order math. Discount reduces the subtotal; the resulting `taxable` is what tax should be
 * computed on; shipping is added last. Discount is clamped so the discounted subtotal never goes negative.
 * (The orders route computes tax on `taxable` and passes it back as `tax`.)
 */
export function composePrice(subtotal: number, discount: number, tax: number, shipping: number): PriceComposition {
  const s = round(Math.max(0, subtotal));
  const d = round(Math.min(Math.max(0, discount), s));
  const taxable = round(s - d);
  const t = round(Math.max(0, tax));
  const sh = round(Math.max(0, shipping));
  return { subtotal: s, discount: d, taxable, tax: t, shipping: sh, total: round(taxable + t + sh) };
}
