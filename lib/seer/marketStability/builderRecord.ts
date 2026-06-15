/**
 * Builder Participation Record (Whale Protection — System 4).
 *
 * A read-only CONTRIBUTION metric — not trust (ProofScore), not risk (Extraction Index). It measures
 * how much someone has built in the ecosystem, from real signals VFIDE already tracks (merchant
 * activity, governance participation, recovery/continuity configured, tenure, deliveries, lending).
 *
 * Builder Record is the protocol's protective counterweight: a long-contributing merchant or
 * long-term holder gets the benefit of the doubt (better terms, emergency eligibility, dampened
 * friction), so the system "rarely touches builders" — its stated success criterion. Pure/deterministic.
 */

export type BuilderCategory = 'Newcomer' | 'Builder' | 'Established Builder' | 'Merchant' | 'Institutional Merchant' | 'Community Steward';

/** Signals sourced from real subsystems (merchant verification/continuity, governance, lending…). */
export interface BuilderSignals {
  isMerchant: boolean;
  merchantVerified: boolean;
  /** Confirmed store operations (orders + confirmed payments). */
  storeOperations: number;
  governanceParticipations: number;
  recoveryConfigured: boolean;
  continuityConfigured: boolean;
  /** Whole years the account has been active. */
  yearsActive: number;
  successfulDeliveries: number;
  productListings: number;
  /** Times participated as a P2P lender/borrower in good standing. */
  lendingParticipation: number;
}

export interface BuilderResult {
  /** 0..10,000 contribution score. */
  score: number;
  category: BuilderCategory;
  /** Transparent breakdown of what earned the standing. */
  contributingFactors: string[];
}

const MAX = 10000;

export function computeBuilderRecord(s: BuilderSignals): BuilderResult {
  const factors: string[] = [];
  let score = 0;

  // Sanitize counts: floor to a non-negative integer so fractional/NaN/negative inputs can't leak
  // partial or negative contributions (Stage 7 edge-case hardening). NaN → 0.
  const n = (v: number): number => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const storeOperations = n(s.storeOperations);
  const successfulDeliveries = n(s.successfulDeliveries);
  const productListings = n(s.productListings);
  const governanceParticipations = n(s.governanceParticipations);
  const lendingParticipation = n(s.lendingParticipation);
  const yearsActive = n(s.yearsActive);

  // Component caps below are tuned so the maximum reachable total is exactly MAX (10,000) — no overflow
  // past the ceiling, so the top of the scale still discriminates between strong contributors rather than
  // saturating early. (Was 11,100 of caps against a 10,000 ceiling.)
  if (s.isMerchant) { score += 800; factors.push('Runs a store'); }
  if (s.merchantVerified) { score += 1200; factors.push('Verified business'); }
  if (storeOperations > 0) { score += Math.min(1800, storeOperations * 40); factors.push(`${storeOperations} store operation(s)`); }
  if (successfulDeliveries > 0) { score += Math.min(1200, successfulDeliveries * 30); factors.push(`${successfulDeliveries} successful delivery(ies)`); }
  if (productListings > 0) { score += Math.min(500, productListings * 20); factors.push(`${productListings} product(s) listed`); }
  if (governanceParticipations > 0) { score += Math.min(1400, governanceParticipations * 150); factors.push(`${governanceParticipations} governance action(s)`); }
  if (s.recoveryConfigured) { score += 500; factors.push('Recovery configured'); }
  if (s.continuityConfigured) { score += 500; factors.push('Continuity configured'); }
  if (lendingParticipation > 0) { score += Math.min(600, lendingParticipation * 80); factors.push(`${lendingParticipation} lending participation(s)`); }
  if (yearsActive > 0) { score += Math.min(1500, yearsActive * 500); factors.push(`${yearsActive} year(s) active`); }

  score = Math.max(0, Math.min(MAX, Math.round(score)));

  // Pass the sanitized counts to categorization so boundaries use the same clean values.
  return { score, category: builderCategory({ ...s, storeOperations, governanceParticipations }, score), contributingFactors: factors };
}

function builderCategory(s: BuilderSignals, score: number): BuilderCategory {
  // Category reflects the *kind* of contribution, then magnitude.
  const stewardship = (s.governanceParticipations > 0 ? 1 : 0) + (s.recoveryConfigured ? 1 : 0) + (s.continuityConfigured ? 1 : 0);
  if (s.merchantVerified && s.storeOperations >= 50 && score >= 6000) return 'Institutional Merchant';
  if (s.isMerchant && score >= 2500) return 'Merchant';
  if (stewardship >= 2 && s.governanceParticipations >= 3) return 'Community Steward';
  if (score >= 5000) return 'Established Builder';
  if (score >= 1500) return 'Builder';
  return 'Newcomer';
}
