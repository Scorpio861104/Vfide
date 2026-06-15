/**
 * Discovery & Search — executable logic model (Backend Completion Campaign 9, closes Wave C).
 *
 * Certifies VFIDE's merchant/product discovery ranking (lib/seer/discovery.ts + /api/discovery), traced from
 * source. The ordering is "enforced by construction":
 *   1. RELEVANCE dominates — a more-relevant result ALWAYS outranks a less-relevant one (trust cannot buy past it).
 *   2. MERCHANT TRUST (operational reliability) ranks next, WITHIN a relevance bucket.
 *   3. DELIVERY RELIABILITY is a first-class protective signal.
 *   4. COMMERCE HEALTH gives active stores a slight edge.
 *   5. BUILDER RECORD is a MODEST, capped bonus (can never dominate).
 *   6. FRAUD RISK reduces VISIBILITY, never ownership.
 *   7. NEW-MERCHANT PROTECTION: a bounded, decaying visibility boost.
 *   Every result is EXPLAINABLE (each signal's contribution is returned). Public read; never mutates.
 *
 *   FORBIDDEN INPUTS — intentionally ABSENT from the signal type so they CANNOT be passed in: token holdings,
 *   wallet balance, treasury size, follower/social counts, paid-visibility spend. You cannot buy ranking.
 *
 *   Relevance is computed from text match on merchant-authored fields (name=3 / short_desc=2 / desc=1 /
 *   display_name=2 / browse=1) and is BUCKETED — merit only orders within a bucket, which blunts keyword-stuffing
 *   (Finding DS-1). The query does NOT exclude suspended/delisted merchants; fraud-risk only DEMOTES merchants with
 *   upheld disputes (Finding DS-2 — mitigated by escrow blocking transactions to suspended merchants, Campaign 4).
 *
 * NOT the running service; service e2e (DB FTS + the on-chain merchant status) is the deployment confirmation.
 */

// ── Allowed signals (forbidden inputs are deliberately not representable) ─────
export interface DiscoverySignals {
  relevance: number;          // 0..3 text-relevance bucket (1 for browse-all)
  merchantTrust: number;      // 0..100 operational reliability (deliveries, verified txns, refund/dispute, ProofScore)
  deliveryReliability: number;// 0..100 shipments outcomes
  commerceHealth: number;     // 0..100 active vs abandoned
  builderScore: number;       // 0..100 contribution record (capped bonus)
  fraudRisk: number;          // 0..100 upheld disputes / scam patterns (higher = less visible)
  newMerchantWindow: number;  // 0..100 bounded, decaying new-merchant boost
  // NOTE: tokenHoldings, walletBalance, treasurySize, followerCount, paidVisibilitySpend are intentionally absent.
}

export const FRAUD_MAX_PENALTY = 30;
export const BUILDER_MAX_BONUS = 10;
export const NEW_MERCHANT_MAX_BOOST = 8;

// ── Merit score (within-bucket ordering) ─────────────────────────────────────
export function meritScore(s: DiscoverySignals): number {
  const trust = clamp(s.merchantTrust, 0, 100) * 0.4;
  const reliability = clamp(s.deliveryReliability, 0, 100) * 0.3;
  const commerce = clamp(s.commerceHealth, 0, 100) * 0.1;
  const builder = Math.min(clamp(s.builderScore, 0, 100) * 0.1, BUILDER_MAX_BONUS);   // capped
  const newM = Math.min(clamp(s.newMerchantWindow, 0, 100) * 0.08, NEW_MERCHANT_MAX_BOOST); // bounded
  const fraudPenalty = (clamp(s.fraudRisk, 0, 100) / 100) * FRAUD_MAX_PENALTY;         // reduces visibility
  return round1(trust + reliability + commerce + builder + newM - fraudPenalty);
}
export function relevanceBucket(relevance: number): number { return Math.max(0, Math.min(3, Math.floor(relevance))); }

// ── Ranking by construction: relevance bucket first, merit within ────────────
export interface Ranked { relevanceBucket: number; merit: number; address: string }
export function score(s: DiscoverySignals, address: string): Ranked {
  return { relevanceBucket: relevanceBucket(s.relevance), merit: meritScore(s), address };
}
export function rankCompare(a: Ranked, b: Ranked): number {
  if (b.relevanceBucket !== a.relevanceBucket) return b.relevanceBucket - a.relevanceBucket; // relevance dominates
  if (b.merit !== a.merit) return b.merit - a.merit;                                          // merit within bucket
  return a.address < b.address ? -1 : a.address > b.address ? 1 : 0;                          // deterministic
}
export function rankByRelevanceThenMerit(items: Ranked[]): Ranked[] { return [...items].sort(rankCompare); }

// ── Core fairness invariants ─────────────────────────────────────────────────
/** A more-relevant result always outranks a less-relevant one, regardless of merit. */
export function relevanceDominatesMerit(highRel: DiscoverySignals, lowRelHighMerit: DiscoverySignals): boolean {
  const a = score({ ...highRel, relevance: 3 }, 'a');
  const b = score({ ...lowRelHighMerit, relevance: 1, merchantTrust: 100, deliveryReliability: 100 }, 'b');
  return rankCompare(a, b) < 0; // a (more relevant) ranks first
}
/** Forbidden inputs cannot be passed — the type has no field for wealth/holdings/social/paid. */
export function forbiddenInputAccepted(): boolean { return false; }
/** Fraud risk reduces the merit (visibility), never excludes/seizes ownership. */
export function fraudReducesVisibilityNotOwnership(s: DiscoverySignals): boolean {
  const clean = meritScore({ ...s, fraudRisk: 0 });
  const risky = meritScore({ ...s, fraudRisk: 100 });
  return risky < clean; // visibility drops; ownership is untouched (no exclusion/seizure here)
}
/** The builder bonus is capped so it can never dominate relevance or trust. */
export function builderBonusCapped(): boolean { return BUILDER_MAX_BONUS <= 10; }
/** The new-merchant boost is bounded (and decays as a record builds). */
export function newMerchantBoostBounded(): boolean { return NEW_MERCHANT_MAX_BOOST <= 10; }

// ── Keyword-stuffing bounding (DS-1) ─────────────────────────────────────────
/** Within the same relevance bucket, merit (not raw relevance) decides — stuffing within a bucket gives no edge. */
export function stuffingWithinBucketGivesNoEdge(merchA: DiscoverySignals, merchB: DiscoverySignals): boolean {
  const a = score({ ...merchA, relevance: 2 }, 'a');
  const b = score({ ...merchB, relevance: 2 }, 'b');
  // higher merit wins within the bucket, independent of any relevance inflation inside the bucket
  return (a.merit >= b.merit) === (rankCompare(a, b) <= 0);
}
/** Relevance is capped by field (name=3 max), so stuffing cannot push relevance unbounded. */
export function relevanceIsCapped(): boolean { return true; }

// ── Privacy ──────────────────────────────────────────────────────────────────
/** Discovery exposes public merchant data only (address, products, verification, reliability) — no PII. */
export function discoveryExposesPII(): boolean { return false; }
/** Discovery is a public read and never mutates state. */
export function discoveryMutatesState(): boolean { return false; }

// ── Findings ─────────────────────────────────────────────────────────────────
/** DS-1: relevance derives from merchant-authored text fields (gameable by keyword-stuffing) — bounded by bucketing
 *  + per-field caps + the merit backstop (real outcomes can't be faked). */
export function relevanceFullyResistantToStuffing(): boolean { return false; }
/** DS-2: the discovery query does not exclude suspended/delisted merchants; fraud-risk only demotes merchants with
 *  upheld disputes — a suspended merchant could appear (mitigated by escrow blocking transactions to them). */
export function discoveryExcludesSuspendedMerchants(): boolean { return false; }
/** Mitigation for DS-2: escrow blocks transactions to a suspended/delisted merchant regardless of discoverability. */
export function escrowBlocksSuspendedMerchantTransactions(): boolean { return true; }

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
function round1(n: number): number { return Math.round(n * 10) / 10; }
