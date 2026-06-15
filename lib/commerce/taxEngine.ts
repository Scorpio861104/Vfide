/**
 * Tax engine (Commerce Operations Phase 1D).
 *
 * Pure, side-effect-free jurisdiction matching + tax computation so tax is SERVER-AUTHORITATIVE at checkout
 * (today tax_amount is client-supplied — the same trust gap shipping had before 1C). Rates are basis points.
 *
 * Scope boundary (honest): this applies a MERCHANT'S OWN configured jurisdiction rates. It is NOT a
 * legally-authoritative tax-determination service — accurate nexus rules, per-product taxability, and rate
 * accuracy across thousands of US local jurisdictions + international VAT/GST are a tax-data-service problem
 * (Avalara/TaxJar class). That boundary is documented in lib/commerce/taxProvider.ts (intentionally
 * unimplemented). A merchant is responsible for configuring rates correctly for the jurisdictions they have
 * nexus in; VFIDE computes consistently from those rates.
 *
 * Backed by existing storage: merchant_tax_rates (rate_bps, jurisdiction_country/state/city, postal_code_pattern,
 * is_default, enabled, applies_to[]).
 */

export type ProductType = 'physical' | 'digital' | 'service';

export interface TaxRate {
  id: number;
  name: string;
  rate_bps: number;             // 725 = 7.25%
  jurisdiction_country: string | null; // ISO-2
  jurisdiction_state: string | null;
  jurisdiction_city: string | null;
  postal_code_pattern: string | null;  // regex source
  is_default: boolean;
  enabled: boolean;
  applies_to: ProductType[];
}

export interface TaxAddress {
  country?: string;
  state?: string;
  city?: string;
  postal?: string;
}

/** Specificity score: city match > state > country > default. Higher = more specific. */
function specificity(rate: TaxRate): number {
  let s = 0;
  if (rate.jurisdiction_country) s += 1;
  if (rate.jurisdiction_state) s += 2;
  if (rate.jurisdiction_city) s += 4;
  if (rate.postal_code_pattern) s += 1;
  return s;
}

function eq(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase();
}

/** Does a rate's jurisdiction match the destination address? A null field on the rate = "any" for that field. */
export function rateMatchesAddress(rate: TaxRate, addr: TaxAddress): boolean {
  if (rate.jurisdiction_country && !eq(rate.jurisdiction_country, addr.country)) return false;
  if (rate.jurisdiction_state && !eq(rate.jurisdiction_state, addr.state)) return false;
  if (rate.jurisdiction_city && !eq(rate.jurisdiction_city, addr.city)) return false;
  if (rate.postal_code_pattern) {
    try {
      if (!new RegExp(rate.postal_code_pattern).test((addr.postal ?? '').trim())) return false;
    } catch {
      return false; // an invalid stored pattern never matches (fail closed)
    }
  }
  return true;
}

/**
 * Select the single applicable rate for a product type at a destination:
 *   1. enabled rates whose `applies_to` includes the type AND whose jurisdiction matches the address;
 *   2. most specific wins (city > state > country > postal-bonus); ties broken by higher rate_bps then id;
 *   3. if none match, fall back to the merchant's default rate (if it applies to the type);
 *   4. else null (no tax).
 */
export function selectRate(rates: TaxRate[], type: ProductType, addr: TaxAddress): TaxRate | null {
  const applicable = rates.filter((r) => r.enabled && r.applies_to.includes(type));
  const matched = applicable.filter((r) => rateMatchesAddress(r, addr) && (r.jurisdiction_country || r.jurisdiction_state || r.jurisdiction_city || r.postal_code_pattern));
  if (matched.length > 0) {
    matched.sort((a, b) => specificity(b) - specificity(a) || b.rate_bps - a.rate_bps || a.id - b.id);
    return matched[0]!;
  }
  const def = applicable.find((r) => r.is_default);
  return def ?? null;
}

export interface TaxLine { type: ProductType; amount: number; } // pre-tax line amount per product type bucket

export interface TaxResult {
  taxableBase: number;     // sum of line amounts that incurred tax
  taxAmount: number;       // total tax (rounded to cents)
  effectiveRateBps: number | null; // blended rate if uniform, else null
  breakdown: Array<{ type: ProductType; base: number; rate_bps: number; rate_id: number | null; tax: number }>;
}

/**
 * Compute authoritative tax over cart lines bucketed by product type. `exempt` (a tax-exempt buyer) → zero tax.
 * Tax is computed per type using its selected rate, then summed. Rounds each bucket and the total to cents.
 */
export function computeTax(rates: TaxRate[], lines: TaxLine[], addr: TaxAddress, exempt: boolean): TaxResult {
  const breakdown: TaxResult['breakdown'] = [];
  if (exempt) {
    for (const l of lines) breakdown.push({ type: l.type, base: l.amount, rate_bps: 0, rate_id: null, tax: 0 });
    return { taxableBase: 0, taxAmount: 0, effectiveRateBps: 0, breakdown };
  }

  // bucket lines by type
  const byType = new Map<ProductType, number>();
  for (const l of lines) byType.set(l.type, (byType.get(l.type) ?? 0) + l.amount);

  let taxAmount = 0;
  let taxableBase = 0;
  const ratesSeen = new Set<number>();
  for (const [type, base] of byType.entries()) {
    const rate = selectRate(rates, type, addr);
    const bps = rate?.rate_bps ?? 0;
    const tax = Math.round((base * bps / 10_000) * 100) / 100;
    if (tax > 0) { taxableBase += base; ratesSeen.add(bps); }
    taxAmount += tax;
    breakdown.push({ type, base, rate_bps: bps, rate_id: rate?.id ?? null, tax });
  }
  taxAmount = Math.round(taxAmount * 100) / 100;
  const effectiveRateBps = ratesSeen.size === 1 ? [...ratesSeen][0]! : (ratesSeen.size === 0 ? 0 : null);
  return { taxableBase, taxAmount, effectiveRateBps, breakdown };
}

/** Tax to reverse on a (partial) refund: proportional to the refunded fraction of the taxed base. */
export function refundTax(originalTax: number, originalBase: number, refundedBase: number): number {
  if (originalBase <= 0) return 0;
  const frac = Math.min(1, Math.max(0, refundedBase / originalBase));
  return Math.round(originalTax * frac * 100) / 100;
}
