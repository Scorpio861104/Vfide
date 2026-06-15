/**
 * Tax provider interface (Commerce Operations Phase 1D — the honest boundary).
 *
 * Everything here is INTENTIONALLY UNIMPLEMENTED. Legally-authoritative tax DETERMINATION — correct nexus
 * rules, per-product taxability categories, and accurate rates across thousands of US local jurisdictions plus
 * international VAT/GST — is a tax-data-service problem (Avalara, TaxJar, Stripe Tax, and similar). It requires
 * external accounts/credentials and continuously-updated rate data this environment does not have and cannot
 * test. Rather than imply legal correctness, 1D ships:
 *   • a working IN-HOUSE tax engine (lib/commerce/taxEngine.ts) — applies a merchant's OWN configured
 *     jurisdiction rates, server-authoritatively, fully tested; and
 *   • this typed interface, so a real determination service can be dropped in later WITHOUT touching
 *     checkout/order code.
 *
 * The certification is explicit: in-house rate application is certified; legally-authoritative determination is
 * a defined, NOT-YET-IMPLEMENTED boundary. A merchant remains responsible for configuring correct rates for the
 * jurisdictions they have nexus in (or for wiring a TaxProvider).
 */

import type { ProductType, TaxAddress } from './taxEngine';

export interface TaxProviderLine {
  type: ProductType;
  amount: number;
  taxCode?: string; // provider-specific product taxability code
}

export interface TaxDetermination {
  taxAmount: number;
  breakdown: Array<{ jurisdiction: string; rate_bps: number; tax: number }>;
  /** Provider's authoritative source reference (for audit). */
  source: string;
}

/**
 * A real implementation calls a tax-determination API. None is provided here.
 * Wiring point (when implemented): the orders route would call determine() instead of the in-house
 * computeTax() when a provider is configured, persisting the determination + source on the order.
 */
export interface TaxProvider {
  determine(from: TaxAddress, to: TaxAddress, lines: TaxProviderLine[]): Promise<TaxDetermination>;
}

/** The sentinel returned where a provider would be injected. Calling it throws — by design. */
export const NO_TAX_PROVIDER: TaxProvider = {
  async determine() {
    throw new Error('No tax provider configured: legally-authoritative tax determination requires an external tax-data service (Phase 1D boundary). The in-house rate engine applies merchant-configured rates instead.');
  },
};
