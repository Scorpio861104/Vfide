/**
 * Merchant Discovery ranking engine (Wave 63).
 *
 * Decides merchant/product visibility from VFIDE-aligned signals — NEVER from wealth, holdings,
 * follower counts, or paid promotion. The ordering is deliberate and enforced by construction:
 *
 *   1. RELEVANCE dominates. A more-relevant result always outranks a less-relevant one, no matter how
 *      trusted or contributive the latter is. Trust cannot buy its way past relevance.
 *   2. Among comparably-relevant results, MERCHANT TRUST (operational reliability) ranks next.
 *   3. DELIVERY RELIABILITY (will the buyer receive it?) is a first-class protective signal.
 *   4. COMMERCE HEALTH gives a slight edge to active over abandoned stores.
 *   5. BUILDER RECORD gives a MODEST contribution bonus — capped so it can never dominate.
 *   6. FRAUD RISK reduces discovery confidence (visibility), never ownership.
 *   7. NEW-MERCHANT PROTECTION: a bounded visibility boost so good new stores aren't buried by
 *      incumbents. It decays as the merchant builds a real record.
 *
 * Every result is EXPLAINABLE: the contribution of each signal is returned so the UI (and the Seer)
 * can answer "why is this here?". No black-box discovery.
 *
 * FORBIDDEN INPUTS (intentionally absent from the type — they cannot be passed in):
 *   token holdings, wallet balance, treasury size, follower/social counts, paid-visibility spend.
 */

export interface MerchantDiscoverySignals {
  /** 0..1 text relevance to the query (caller computes via FTS/trigram). 1 for a browse-all view. */
  relevance: number;
  /** Operational trust 0..100: deliveries, verified txns, refund/dispute behavior, response, ProofScore. */
  merchantTrust: number;
  /** Delivery reliability 0..100, or null if unproven (too little history). */
  deliveryReliability: number | null;
  /** Commerce health 0..100, or null if insufficient data (new/abandoned). */
  commerceHealth: number | null;
  /** Builder Record 0..10000 (contribution). Bonus from this is CAPPED. */
  builderScore: number;
  /** Fraud-risk 0..100 (upheld disputes, scam patterns). Higher = less visible. */
  fraudRisk: number;
  /** Days since the merchant's store was created (drives the new-merchant window). */
  ageDays: number;
  /** True only if the merchant has passed verification (a trust input, never a paywall). */
  verified: boolean;
  /**
   * Optional distance in km from the searcher (Local Commerce). Only set for explicitly local searches.
   * Closer = a modest bounded boost; it never overrides relevance/trust and is absent for non-local
   * search (so it can't quietly bias global discovery). null/undefined = not a local search.
   */
  distanceKm?: number | null;
}

export interface DiscoveryExplanation {
  signal: string;
  contribution: number; // points added (+) or removed (−) from the base
  detail: string;
}

export interface DiscoveryScore {
  /** Final ranking score. Relevance-gated: near-zero relevance ⇒ near-zero score. */
  score: number;
  /** The relevance tier used for primary ordering (so callers can sort relevance-first, then score). */
  relevanceBucket: number;
  explanation: DiscoveryExplanation[];
}

// Caps — these encode the "never pay-to-win / never dominate relevance" guarantees.
const TRUST_MAX = 30; // operational trust can contribute up to 30
const DELIVERY_MAX = 20; // delivery reliability up to 20
const HEALTH_MAX = 10; // commerce health up to 10 (slight)
const BUILDER_MAX = 8; // Builder Record bonus is MODEST and capped (cannot dominate)
const NEW_MERCHANT_MAX = 12; // new-merchant visibility window, decays with age
const FRAUD_MAX_PENALTY = 60; // fraud can heavily suppress visibility (protective)
const DISTANCE_MAX = 10; // local-proximity boost (only for local searches), bounded so it can't dominate

/** New-merchant boost: full for the first ~14 days, decaying to zero by ~120 days. */
function newMerchantBoost(ageDays: number): number {
  if (ageDays <= 14) return NEW_MERCHANT_MAX;
  if (ageDays >= 120) return 0;
  const frac = 1 - (ageDays - 14) / (120 - 14);
  return Math.round(NEW_MERCHANT_MAX * frac);
}

export function scoreMerchantDiscovery(s: MerchantDiscoverySignals): DiscoveryScore {
  const relevance = Math.max(0, Math.min(1, s.relevance));
  const explanation: DiscoveryExplanation[] = [];

  // Primary ordering is RELEVANCE. We bucket relevance coarsely so that within a bucket the trust
  // signals decide order, but a higher relevance bucket ALWAYS wins. This is what makes relevance
  // un-buyable: no amount of trust/builder lifts you out of a lower relevance bucket.
  const relevanceBucket = Math.round(relevance * 10); // 0..10

  // Trust (operational reliability).
  const trustPts = (Math.max(0, Math.min(100, s.merchantTrust)) / 100) * TRUST_MAX;
  explanation.push({ signal: 'Merchant trust', contribution: round1(trustPts), detail: 'Operational reliability: deliveries, disputes, refunds, response, ProofScore.' });

  // Delivery reliability (protective for buyers).
  let deliveryPts = 0;
  if (s.deliveryReliability != null) {
    deliveryPts = (Math.max(0, Math.min(100, s.deliveryReliability)) / 100) * DELIVERY_MAX;
    explanation.push({ signal: 'Delivery reliability', contribution: round1(deliveryPts), detail: 'Confirmed deliveries vs not-received reports.' });
  } else {
    explanation.push({ signal: 'Delivery reliability', contribution: 0, detail: 'Not enough delivery history yet (no penalty, no boost).' });
  }

  // Commerce health (slight edge to active stores).
  let healthPts = 0;
  if (s.commerceHealth != null) {
    healthPts = (Math.max(0, Math.min(100, s.commerceHealth)) / 100) * HEALTH_MAX;
    explanation.push({ signal: 'Commerce health', contribution: round1(healthPts), detail: 'Active, maintained store vs abandoned.' });
  }

  // Builder Record — MODEST, capped contribution bonus.
  const builderPts = (Math.max(0, Math.min(10000, s.builderScore)) / 10000) * BUILDER_MAX;
  explanation.push({ signal: 'Builder Record', contribution: round1(builderPts), detail: `Ecosystem contribution (capped at ${BUILDER_MAX} — cannot dominate).` });

  // New-merchant protection window.
  const newPts = newMerchantBoost(s.ageDays);
  if (newPts > 0) explanation.push({ signal: 'New-merchant window', contribution: newPts, detail: 'Temporary visibility so good new stores are discoverable; decays as a record builds.' });

  // Verification (trust input, not a paywall).
  const verifiedPts = s.verified ? 5 : 0;
  if (verifiedPts) explanation.push({ signal: 'Verified merchant', contribution: verifiedPts, detail: 'Passed merchant verification.' });

  // Local proximity — only for explicitly local searches; bounded so it never dominates relevance/trust.
  let distancePts = 0;
  if (s.distanceKm != null && s.distanceKm >= 0) {
    // Full boost within 5km, decaying to zero by 50km.
    const frac = s.distanceKm <= 5 ? 1 : s.distanceKm >= 50 ? 0 : 1 - (s.distanceKm - 5) / 45;
    distancePts = Math.round(DISTANCE_MAX * frac * 10) / 10;
    if (distancePts > 0) explanation.push({ signal: 'Local proximity', contribution: distancePts, detail: `~${Math.round(s.distanceKm)}km away (local-search boost only; bounded).` });
  }

  // Fraud risk — protective penalty (reduces visibility, never ownership).
  const fraudPenalty = (Math.max(0, Math.min(100, s.fraudRisk)) / 100) * FRAUD_MAX_PENALTY;
  if (fraudPenalty > 0) explanation.push({ signal: 'Fraud risk', contribution: -round1(fraudPenalty), detail: 'Upheld disputes / scam patterns reduce discovery confidence. Ownership is never affected.' });

  const meritPts = trustPts + deliveryPts + healthPts + builderPts + newPts + verifiedPts + distancePts - fraudPenalty;

  // RELEVANCE GATE: the merit points are scaled by relevance, so an irrelevant-but-trusted merchant
  // scores near zero for this query. Browsing (relevance=1) lets merit rank fully.
  const score = Math.max(0, relevance * meritPts);

  return { score: round1(score), relevanceBucket, explanation };
}

/**
 * Rank a set of scored merchants RELEVANCE-FIRST: higher relevance bucket always wins; ties broken by
 * merit score. This is the function callers use to order results — it enforces that trust/builder can
 * only reorder within a relevance tier, never jump tiers.
 *
 * Final tiebreaker (Wave 82): when relevance bucket AND merit score are equal, order is decided
 * deterministically by a stable key (merchant address) rather than arbitrary input order — so two
 * equally-ranked merchants always appear in the same order across requests instead of shuffling.
 */
export function rankByRelevanceThenMerit<T extends { discovery: DiscoveryScore; merchantAddress?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.discovery.relevanceBucket !== a.discovery.relevanceBucket) {
      return b.discovery.relevanceBucket - a.discovery.relevanceBucket;
    }
    if (b.discovery.score !== a.discovery.score) {
      return b.discovery.score - a.discovery.score;
    }
    // Deterministic final tiebreak: stable by address so equal-merit results never shuffle between runs.
    const ka = a.merchantAddress ?? '';
    const kb = b.merchantAddress ?? '';
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
