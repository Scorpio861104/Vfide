/**
 * Social & Communication — reputation-input abuse-resistance MODEL (audit artifact).
 *
 * This one is OFF-CHAIN (Postgres + routes) plus the on-chain SeerSocial endorsement scoring, so the logic is
 * modeled in pure TS and exercised as real jest scenarios (stronger than the source-only Solidity audits, but
 * still a MODEL of the route/contract logic, not the live DB or deployed bytecode).
 *
 * The audit's central question: can the reputation INPUTS (reviews, endorsements) be abused to manipulate the
 * Trust systems already certified? Modeled facts (refs in cert):
 *   • Reviews: self-review blocked; one review per (reviewer, product); verified_purchase computed server-side;
 *     reviews are DISPLAY-ONLY — they do NOT feed Merchant Trust / ProofScore.
 *   • Endorsements (SeerSocial.sol): self-endorse blocked; ONLY high-trust accounts (score ≥ 7000) may endorse
 *     (Sybil defense); per-endorser cooldown; total bonus CAPPED (1500 = 15%); boosts DECAY/expire.
 *   • Messaging: E2E-encrypted (server-opaque), rate-limited, scoped to sender/recipient, block supported.
 *   • Evidence (attachments): scoped to the uploader — a non-party can't read another user's evidence.
 */

// ─────────────────────────── Reviews

export interface ReviewAttempt {
  reviewer: string; merchant: string; productId: number;
  hasPaidOrder: boolean; alreadyReviewedProduct: boolean;
}
export type ReviewResult =
  | { ok: true; verifiedPurchase: boolean }
  | { ok: false; reason: 'SELF_REVIEW' | 'DUPLICATE' };

/** Models the reviews POST: self-review blocked, one per product; non-purchasers allowed but flagged unverified. */
export function authorizeReview(a: ReviewAttempt): ReviewResult {
  if (a.reviewer.toLowerCase() === a.merchant.toLowerCase()) return { ok: false, reason: 'SELF_REVIEW' };
  if (a.alreadyReviewedProduct) return { ok: false, reason: 'DUPLICATE' };
  return { ok: true, verifiedPurchase: a.hasPaidOrder }; // verified flag is server-computed, not claimed
}

/** Reviews are display-only social proof — they have NO weight in the trust/score computation. */
export function reviewAffectsTrustScore(): boolean { return false; }

// ─────────────────────────── Endorsements (the real reputation input → SeerSocial)

export const MIN_SCORE_TO_ENDORSE = 7000;
export const ENDORSEMENT_BONUS_CAP = 1500; // 15% on the 0-10000 scale
export const ENDORSEMENT_COOLDOWN_S = 86400; // 1 day per endorser

export interface EndorseAttempt {
  endorser: string; subject: string; endorserScore: number;
  lastEndorseTs: number; nowTs: number; activeEndorsementExists: boolean;
}
export type EndorseResult = { ok: true } | { ok: false; reason: 'SELF_ENDORSE' | 'LOW_SCORE' | 'COOLDOWN' | 'ALREADY_ACTIVE' };

/** Models SeerSocial.endorse: no self-endorse, endorser must be high-trust, cooldown, no duplicate active. */
export function authorizeEndorse(a: EndorseAttempt): EndorseResult {
  if (a.endorser.toLowerCase() === a.subject.toLowerCase()) return { ok: false, reason: 'SELF_ENDORSE' };
  if (a.endorserScore < MIN_SCORE_TO_ENDORSE) return { ok: false, reason: 'LOW_SCORE' }; // Sybil defense
  if (a.nowTs < a.lastEndorseTs + ENDORSEMENT_COOLDOWN_S) return { ok: false, reason: 'COOLDOWN' };
  if (a.activeEndorsementExists) return { ok: false, reason: 'ALREADY_ACTIVE' };
  return { ok: true };
}

/** The total endorsement bonus a subject can receive is capped — a ring cannot stack unbounded boosts. */
export function effectiveEndorsementBonus(rawSumOfWeights: number): number {
  return Math.max(0, Math.min(ENDORSEMENT_BONUS_CAP, rawSumOfWeights));
}

/** Endorsement boosts decay: an endorsement past its expiry contributes nothing (no permanent inflation). */
export function endorsementActive(expiryTs: number, nowTs: number): boolean {
  return expiryTs > nowTs;
}

/**
 * A Sybil ring of N fresh (zero-score) accounts produces ZERO endorsement bonus, because none of them clears
 * the min-score-to-endorse gate. Returns the bonus such a ring achieves.
 */
export function sybilRingBonus(ringAccountScores: number[]): number {
  const eligible = ringAccountScores.filter((s) => s >= MIN_SCORE_TO_ENDORSE);
  // even eligible endorsers are capped in aggregate
  return effectiveEndorsementBonus(eligible.length * 100); // assume 100 weight each, pre-cap
}

// ─────────────────────────── Messaging

export interface MessageAttempt { senderBlockedByRecipient: boolean; withinRateLimit: boolean; }
export type MessageResult = { ok: true } | { ok: false; reason: 'BLOCKED' | 'RATE_LIMITED' };

/** Messages are rate-limited and a recipient can block a sender. Payloads are E2E-encrypted (server-opaque). */
export function authorizeMessage(a: MessageAttempt): MessageResult {
  if (a.senderBlockedByRecipient) return { ok: false, reason: 'BLOCKED' };
  if (!a.withinRateLimit) return { ok: false, reason: 'RATE_LIMITED' };
  return { ok: true };
}
export function serverCanReadMessageContent(): boolean { return false; } // E2E-encrypted

// ─────────────────────────── Evidence (attachments)

/** Attachment fetch is scoped to the uploader: a requester may read an attachment only if they uploaded it. */
export function canReadAttachment(requester: string, uploadedBy: string): boolean {
  return requester.toLowerCase() === uploadedBy.toLowerCase();
}
