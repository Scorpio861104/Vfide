/**
 * Merchant Discovery ranking engine (Wave 63).
 *
 * Decides merchant/product visibility from VFIDE-aligned signals — never from wealth, holdings,
 * follower counts, or paid promotion. The ordering is deliberate and enforced by construction:
 *
 *   1. RELEVANCE dominates. A more-relevant result always outranks a less-relevant one, no matter how
 *      trusted or contributive the latter is. Trust cannot buy its way past relevance.
 *   2. Among comparably-relevant results, MERCHANT TRUST ranks next.
 *   3. DELIVERY RELIABILITY is a first-class protective signal.
 *   4. COMMERCE HEALTH gives a slight edge to active over abandoned stores.
 *   5. BUILDER RECORD gives a modest contribution bonus — capped so it can never dominate.
 *   6. FRAUD RISK reduces discovery confidence (visibility), never ownership.
 *   7. NEW-MERCHANT PROTECTION: a bounded visibility boost so good new stores aren't buried.
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
  /** Builder Record 0..10000 (contribution). Bonus from this is capped. */
  builderScore: number;
  /** Fraud-risk 0..100 (upheld disputes, scam patterns). Higher = less visible. */
  fraudRisk: number;
  /** Days since the merchant's store was created (drives the new-merchant window). */
  ageDays: number;
  /** True only if the merchant has passed verification. */
  verified: boolean;
}

export interface DiscoveryExplanation {
  signal: string;
  contribution: number;
  detail: string;
}

export interface DiscoveryScore {
  score: number;
  relevanceBucket: number;
  explanation: DiscoveryExplanation[];
}

const TRUST_MAX = 30;
const DELIVERY_MAX = 20;
const HEALTH_MAX = 10;
const BUILDER_MAX = 8;
const NEW_MERCHANT_MAX = 12;
const FRAUD_MAX_PENALTY = 60;

function newMerchantBoost(ageDays: number): number {
  if (ageDays <= 14) return NEW_MERCHANT_MAX;
  if (ageDays >= 120) return 0;
  const frac = 1 - (ageDays - 14) / (120 - 14);
  return Math.round(NEW_MERCHANT_MAX * frac);
}

export function scoreMerchantDiscovery(s: MerchantDiscoverySignals): DiscoveryScore {
  const relevance = Math.max(0, Math.min(1, s.relevance));
  const explanation: DiscoveryExplanation[] = [];
  const relevanceBucket = Math.round(relevance * 10);

  const trustPts = (Math.max(0, Math.min(100, s.merchantTrust)) / 100) * TRUST_MAX;
  explanation.push({ signal: 'Merchant trust', contribution: round1(trustPts), detail: 'Operational reliability: deliveries, disputes, refunds, response, ProofScore.' });

  let deliveryPts = 0;
  if (s.deliveryReliability != null) {
    deliveryPts = (Math.max(0, Math.min(100, s.deliveryReliability)) / 100) * DELIVERY_MAX;
    explanation.push({ signal: 'Delivery reliability', contribution: round1(deliveryPts), detail: 'Confirmed deliveries vs not-received reports.' });
  } else {
    explanation.push({ signal: 'Delivery reliability', contribution: 0, detail: 'Not enough delivery history yet (no penalty, no boost).' });
  }

  let healthPts = 0;
  if (s.commerceHealth != null) {
    healthPts = (Math.max(0, Math.min(100, s.commerceHealth)) / 100) * HEALTH_MAX;
    explanation.push({ signal: 'Commerce health', contribution: round1(healthPts), detail: 'Active, maintained store vs abandoned.' });
  }

  const builderPts = (Math.max(0, Math.min(10000, s.builderScore)) / 10000) * BUILDER_MAX;
  explanation.push({ signal: 'Builder Record', contribution: round1(builderPts), detail: `Ecosystem contribution (capped at ${BUILDER_MAX} — cannot dominate).` });

  const newPts = newMerchantBoost(s.ageDays);
  if (newPts > 0) explanation.push({ signal: 'New-merchant window', contribution: newPts, detail: 'Temporary visibility so good new stores are discoverable; decays as a record builds.' });

  const verifiedPts = s.verified ? 5 : 0;
  if (verifiedPts) explanation.push({ signal: 'Verified merchant', contribution: verifiedPts, detail: 'Passed merchant verification.' });

  const fraudPenalty = (Math.max(0, Math.min(100, s.fraudRisk)) / 100) * FRAUD_MAX_PENALTY;
  if (fraudPenalty > 0) explanation.push({ signal: 'Fraud risk', contribution: -round1(fraudPenalty), detail: 'Upheld disputes / scam patterns reduce discovery confidence. Ownership is never affected.' });

  const meritPts = trustPts + deliveryPts + healthPts + builderPts + newPts + verifiedPts - fraudPenalty;
  const score = Math.max(0, relevance * meritPts);

  return { score: round1(score), relevanceBucket, explanation };
}

export function rankByRelevanceThenMerit<T extends { discovery: DiscoveryScore }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.discovery.relevanceBucket !== a.discovery.relevanceBucket) {
      return b.discovery.relevanceBucket - a.discovery.relevanceBucket;
    }
    return b.discovery.score - a.discovery.score;
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
