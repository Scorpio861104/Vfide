/**
 * Merchant Trust engine (Wave 79) — the SINGLE source of truth for a merchant's operational trust score.
 *
 * THE DEFECT THIS FIXES (Stage 2 wiring + Stage 7 consistency): the trust formula was duplicated across
 * four API routes with TWO different formulas —
 *   - HQ / transparency / discovery-standing:  70 − upheld·20 − refunded·5      (verification IGNORED)
 *   - discovery ranking:                        50 + verified·15 − upheld·20 − refunded·5
 * So the same merchant saw different trust on different surfaces: a clean verified merchant read 70 in
 * their HQ and on the storefront, but discovery ranked them on 65 — and verification was invisible to
 * three of the four surfaces. This engine unifies them: every surface computes the SAME value.
 *
 * IT ALSO ADDRESSES TWO ISSUES THE CAMPAIGN HUNT SURFACED:
 *   - Missing trust input: the old formula rewarded only the ABSENCE of disputes — 500 clean payments
 *     scored identically to 2. Trust now includes a bounded "proven track record" signal (confirmed
 *     payment volume), so sustained reliable operation counts.
 *   - Trust stagnation: because upheld disputes carry a fixed penalty and nothing offset them, a merchant
 *     with several upheld disputes was pinned near 0 forever with no path back even after reform. The
 *     track-record signal gives a gradual, earned rebuild path (you can't erase wrongdoing, but sustained
 *     clean trade slowly restores standing).
 *
 * Trust is OPERATIONAL, not social: deliveries, disputes, refunds, proven volume — never popularity,
 * wealth, or holdings. Pure & deterministic so every surface agrees and it is unit-testable.
 */

export interface MerchantTrustInputs {
  /** Earned verification (real business: complete profile + ≥3 confirmed payments). */
  verified: boolean;
  /** Disputes upheld against the merchant (strong negative — adjudicated wrongdoing). */
  disputesUpheld: number;
  /** Refunds the merchant granted (mild negative — friction, but they made it right). */
  refundsGranted: number;
  /** Total disputes filed against them (context for the human summary). */
  disputesTotal: number;
  /** Confirmed on-chain payments — proven track record. Bounded reward; gives reformers a rebuild path. */
  confirmedPayments?: number;
  /** Delivery reliability 0..100, or null if unproven. Bounded ±10 nudge; omitted callers simply skip it. */
  deliveryReliability?: number | null;
}

export interface MerchantTrustResult {
  /** 0..100 operational trust — identical on every surface for the same inputs. */
  score: number;
  /** building | established | strong — the human label (consistent everywhere). */
  label: 'building' | 'established' | 'strong';
  /** Transparent breakdown of what moved the score. */
  factors: string[];
}

// Single canonical weighting. BASE+VERIFIED reconciles the two old formulas: a clean VERIFIED merchant
// reads 70 (matches the old HQ value) while a clean UNVERIFIED merchant reads 55 (correctly lower — the
// whole point verification was supposed to serve). Upheld disputes hurt hard, refunds mildly, proven
// volume lifts within a capped band, delivery nudges within ±10.
const BASE = 55;
const VERIFIED_BONUS = 15;
const UPHELD_PENALTY = 20;
const REFUND_PENALTY = 5;
const TRACK_RECORD_CAP = 12; // max lift from proven confirmed-payment volume

export function computeMerchantTrust(i: MerchantTrustInputs): MerchantTrustResult {
  const factors: string[] = [];
  const upheld = sane(i.disputesUpheld);
  const refunds = sane(i.refundsGranted);
  const payments = sane(i.confirmedPayments ?? 0);

  let score = BASE;
  if (i.verified) { score += VERIFIED_BONUS; factors.push('Verified business'); }

  // Proven track record: a gentle, capped curve — rewards sustained operation without letting volume
  // "buy" trust past the cap. ~ +1 per 5 confirmed payments up to TRACK_RECORD_CAP.
  if (payments > 0) {
    const lift = Math.min(TRACK_RECORD_CAP, Math.floor(payments / 5));
    if (lift > 0) { score += lift; factors.push(`${payments} confirmed payment(s)`); }
  }

  if (upheld > 0) { score -= upheld * UPHELD_PENALTY; factors.push(`${upheld} dispute(s) upheld`); }
  if (refunds > 0) { score -= refunds * REFUND_PENALTY; factors.push(`${refunds} refund(s) granted`); }

  // Delivery reliability nudges trust within a bounded ±10 band (only when proven, i.e. not null).
  if (i.deliveryReliability != null) {
    const d = Math.max(0, Math.min(100, i.deliveryReliability));
    const nudge = Math.round(((d - 50) / 50) * 10); // 100→+10, 50→0, 0→−10
    if (nudge !== 0) { score += nudge; factors.push(nudge > 0 ? 'Strong delivery record' : 'Weak delivery record'); }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (factors.length === 0) factors.push('New merchant — limited history');

  return { score, label: labelFor(score), factors };
}

function labelFor(score: number): MerchantTrustResult['label'] {
  if (score >= 80) return 'strong';
  if (score >= 55) return 'established';
  return 'building';
}

function sane(v: number): number {
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}
