/**
 * Returns / refund / exchange engine (Commerce Operations Phase 1F).
 *
 * Pure, side-effect-free computation so a refund AUTHORITATIVELY reverses what was actually paid — the
 * 1E-composed total (item value − discount + tax + shipping) — rather than a client-entered number. This is the
 * meeting point of 1A (line prices), 1D (refundTax), and 1E (composition). No external boundary; in-house.
 *
 * Refund model: a return covers some (or all) order lines. The refund reverses, for the returned lines:
 *   • their item value, MINUS their proportional share of any order discount (you don't refund a discount the
 *     buyer never paid), PLUS
 *   • their proportional share of the tax that was charged, PLUS
 *   • shipping — only on a FULL return, and only per the merchant's restock/shipping policy.
 *
 * Exchange model: the returned lines' net value (after discount) is a CREDIT against replacement lines; the
 * buyer pays or is refunded the difference. No tax/shipping guesswork — the replacement is re-priced as a new
 * order by the normal pipeline; this engine only computes the credit + difference.
 */

import { refundTax } from '@/lib/commerce/taxEngine';

export interface OrderLineSnapshot {
  product_id: number | null;
  quantity: number;
  unit_price: number;   // authoritative line unit price actually charged (variant-resolved, 1A)
}

export interface OrderTotalsSnapshot {
  subtotal: number;     // gross item subtotal (pre-discount)
  discount: number;     // total order discount applied (1E)
  tax: number;          // total tax charged (1D, on the discounted base)
  shipping: number;     // shipping charged (1C)
}

export interface ReturnLine { product_id: number; quantity: number; }

function round(n: number): number { return Math.round(n * 100) / 100; }

/**
 * The gross item value of the returned lines (sum of unit_price * returned qty), capped at what the order
 * actually contained per product. Returns { grossReturned, fullReturn } where fullReturn means every line in
 * the order is fully returned.
 */
export function returnedValue(order: OrderLineSnapshot[], returns: ReturnLine[]): { grossReturned: number; fullReturn: boolean } {
  let grossReturned = 0;
  let totalOrderQty = 0;
  let totalReturnQty = 0;
  for (const line of order) totalOrderQty += line.quantity;
  for (const r of returns) {
    const matching = order.filter((l) => l.product_id === r.product_id);
    let remaining = Math.max(0, Math.floor(r.quantity));
    for (const line of matching) {
      const take = Math.min(remaining, line.quantity);
      grossReturned += take * line.unit_price;
      totalReturnQty += take;
      remaining -= take;
      if (remaining <= 0) break;
    }
  }
  return { grossReturned: round(grossReturned), fullReturn: totalReturnQty >= totalOrderQty && totalReturnQty > 0 };
}

export interface RefundComputation {
  grossReturned: number;      // item value of returned lines
  discountReversed: number;   // proportional discount removed from the refund (NOT refunded)
  taxRefunded: number;        // proportional tax refunded
  shippingRefunded: number;   // shipping refunded (full return + policy)
  refundAmount: number;       // the authoritative amount to refund
  fullReturn: boolean;
}

export interface RefundOptions { refundShippingOnFullReturn?: boolean } // default true

/**
 * Authoritatively compute the refund for a set of returned lines against the order totals.
 * refundAmount = (grossReturned − proportional discount) + proportional tax + (shipping if full return & policy).
 */
export function computeRefund(
  order: OrderLineSnapshot[],
  totals: OrderTotalsSnapshot,
  returns: ReturnLine[],
  opts: RefundOptions = {},
): RefundComputation {
  const { grossReturned, fullReturn } = returnedValue(order, returns);
  const subtotal = round(Math.max(0, totals.subtotal));
  const frac = subtotal > 0 ? Math.min(1, grossReturned / subtotal) : 0;

  // proportional discount the returned lines benefited from (so we don't refund it). Clamp to the gross so a
  // discount can never reverse more than the returned items' value (net refund stays >= 0).
  const discountReversed = round(Math.min(grossReturned, Math.max(0, totals.discount) * frac));
  // the net (discounted) value of the returned lines — this is what the buyer actually paid for goods
  const netReturned = round(Math.max(0, grossReturned - discountReversed));
  // proportional tax (tax was charged on the discounted base, so reverse on the net fraction of the taxed base)
  const taxedBase = round(Math.max(0, subtotal - Math.max(0, totals.discount)));
  const taxRefunded = refundTax(round(Math.max(0, totals.tax)), taxedBase, netReturned);

  const refundShipping = fullReturn && (opts.refundShippingOnFullReturn ?? true);
  const shippingRefunded = refundShipping ? round(Math.max(0, totals.shipping)) : 0;

  const refundAmount = round(netReturned + taxRefunded + shippingRefunded);
  return { grossReturned, discountReversed, taxRefunded, shippingRefunded, refundAmount, fullReturn };
}

// ─────────────────────────── Exchange

export interface ExchangeComputation {
  returnedCredit: number;   // net (discounted) value of returned lines — credit toward replacement
  replacementValue: number; // gross value of replacement lines
  amountDue: number;        // > 0: buyer pays this; 0 if credit covers it
  amountRefund: number;     // > 0: buyer is refunded this (credit exceeded replacement)
}

/**
 * Compute an exchange: returned lines become a credit (their net discounted value), replacement lines are
 * valued at their (new) prices. The difference is owed by or refunded to the buyer. The replacement itself is
 * re-priced/charged as a normal order (tax/shipping handled there) — this only nets the goods value.
 */
export function computeExchange(
  order: OrderLineSnapshot[],
  totals: OrderTotalsSnapshot,
  returns: ReturnLine[],
  replacements: Array<{ unit_price: number; quantity: number }>,
): ExchangeComputation {
  const { grossReturned } = returnedValue(order, returns);
  const subtotal = round(Math.max(0, totals.subtotal));
  const frac = subtotal > 0 ? Math.min(1, grossReturned / subtotal) : 0;
  const discountReversed = round(Math.min(grossReturned, Math.max(0, totals.discount) * frac));
  const returnedCredit = round(Math.max(0, grossReturned - discountReversed));

  const replacementValue = round(replacements.reduce((s, r) => s + r.unit_price * Math.max(0, r.quantity), 0));
  const diff = round(replacementValue - returnedCredit);
  return {
    returnedCredit,
    replacementValue,
    amountDue: diff > 0 ? diff : 0,
    amountRefund: diff < 0 ? round(-diff) : 0,
  };
}
