/**
 * Shipping rate engine (Commerce Operations Phase 1C).
 *
 * Pure, side-effect-free in-house rate calculation so shipping cost is SERVER-AUTHORITATIVE (today it is
 * client-supplied — a correctness/trust gap this closes, mirroring how 1A made variant price authoritative).
 *
 * Scope boundary (honest): this computes a merchant's OWN rate rules (zones + weight/price/flat tables). It is
 * NOT a live carrier API — real-time USPS/UPS/FedEx rates, label purchase, and tracking sync require external
 * carrier credentials this environment does not have. Those live behind a documented adapter interface
 * (lib/commerce/carrierAdapter.ts) that is intentionally unimplemented here.
 *
 * Backed by existing data: merchant_products.weight_grams, merchant_orders.shipping_address.country.
 */

export interface ShippingZone {
  id: number;
  name: string;                 // "Domestic", "EU", "Rest of World"
  countries: string[];          // ISO-2 codes this zone covers; ['*'] = catch-all/default
  sort_order: number;
}

export type RateType = 'flat' | 'weight' | 'price'; // flat fee | per-weight tier | % or tier of order price

export interface ShippingRate {
  id: number;
  zone_id: number;
  name: string;                 // "Standard", "Express"
  rate_type: RateType;
  // flat: base_amount is the fee.
  // weight: base_amount + per_kg * ceil(weight_kg); optional min/max weight bounds gate applicability.
  // price: base_amount + (pct/100)*order_subtotal; free_over makes it free above a threshold.
  base_amount: number;
  per_kg?: number | null;
  pct?: number | null;
  free_over?: number | null;    // order subtotal at/above which this rate is free
  min_weight_g?: number | null; // rate applies only if total weight >= this
  max_weight_g?: number | null; // ...and <= this
  active: boolean;
}

export interface RateQuery {
  country: string;       // ISO-2 of the destination
  totalWeightGrams: number;
  subtotal: number;
}

/** Pick the zone that covers a destination country. Most-specific (explicit country) wins over catch-all. */
export function resolveZone(zones: ShippingZone[], country: string): ShippingZone | null {
  const cc = (country || '').trim().toUpperCase();
  const ordered = [...zones].sort((a, b) => a.sort_order - b.sort_order);
  // explicit match first
  const explicit = ordered.find((z) => z.countries.some((c) => c.trim().toUpperCase() === cc));
  if (explicit) return explicit;
  // catch-all
  const wildcard = ordered.find((z) => z.countries.some((c) => c.trim() === '*'));
  return wildcard ?? null;
}

/** Compute the cost of one rate for a query, or null if the rate doesn't apply (weight out of bounds). */
export function rateCost(rate: ShippingRate, q: RateQuery): number | null {
  if (!rate.active) return null;
  if (rate.min_weight_g != null && q.totalWeightGrams < rate.min_weight_g) return null;
  if (rate.max_weight_g != null && q.totalWeightGrams > rate.max_weight_g) return null;

  if (rate.free_over != null && q.subtotal >= rate.free_over) return 0;

  let cost = rate.base_amount;
  if (rate.rate_type === 'weight') {
    const kg = Math.ceil(q.totalWeightGrams / 1000); // round up to the next kg
    cost += (rate.per_kg ?? 0) * kg;
  } else if (rate.rate_type === 'price') {
    cost += ((rate.pct ?? 0) / 100) * q.subtotal;
  }
  return Math.round(cost * 100) / 100;
}

export interface RateOption { rate_id: number; name: string; amount: number; }

/**
 * The merchant's shipping options for a destination: resolve the zone, then every applicable active rate in
 * that zone with its computed cost, cheapest first. Empty array = no zone covers the destination / no rate
 * applies (the merchant doesn't ship there — a checkout should block, not default to free).
 */
export function quoteShipping(zones: ShippingZone[], rates: ShippingRate[], q: RateQuery): RateOption[] {
  const zone = resolveZone(zones, q.country);
  if (!zone) return [];
  const options: RateOption[] = [];
  for (const r of rates) {
    if (r.zone_id !== zone.id) continue;
    const cost = rateCost(r, q);
    if (cost === null) continue;
    options.push({ rate_id: r.id, name: r.name, amount: cost });
  }
  return options.sort((a, b) => a.amount - b.amount);
}

/**
 * Validate a chosen shipping selection at checkout against the authoritative quote. Returns the
 * server-authoritative amount, or a rejection. This is the trust fix: the client cannot dictate shipping cost.
 */
export type ShippingRejection = 'NO_SERVICE' | 'RATE_NOT_AVAILABLE';
export function authoritativeShipping(
  zones: ShippingZone[], rates: ShippingRate[], q: RateQuery, chosenRateId: number | null,
): { ok: true; amount: number; rate_id: number | null } | { ok: false; reason: ShippingRejection } {
  const options = quoteShipping(zones, rates, q);
  if (options.length === 0) return { ok: false, reason: 'NO_SERVICE' };
  if (chosenRateId == null) {
    // default to the cheapest option when the buyer didn't pick one
    return { ok: true, amount: options[0]!.amount, rate_id: options[0]!.rate_id };
  }
  const chosen = options.find((o) => o.rate_id === chosenRateId);
  if (!chosen) return { ok: false, reason: 'RATE_NOT_AVAILABLE' };
  return { ok: true, amount: chosen.amount, rate_id: chosen.rate_id };
}
