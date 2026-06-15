/**
 * Sanctum engine (Institution 6 — Stewardship). The Seer PROPOSES; the DAO APPROVES.
 *
 * Sanctum is VFIDE's ecosystem-support fund (it receives a fee share on-chain via SanctumVault, which
 * is DAO-governed for charity selection, size, and cadence — and which already has an on-chain
 * DisbursementProposed → DAO flow). This module is the OFF-CHAIN recommendation layer: it scores and
 * prioritizes community support requests so the DAO has a ranked, transparent shortlist.
 *
 * NON-CUSTODIAL / honest boundaries:
 *   • It never moves treasury funds. Disbursement is an on-chain, DAO-approved action — full stop.
 *   • It produces an *advisory* priority score + ranking. The DAO decides; this only informs.
 *   • Scoring is grounded in observable signals (requester's Builder Record, category, stated impact,
 *     amount reasonableness), never identity or wealth.
 *
 * Pure/deterministic.
 */

import type { BuilderResult } from './marketStability/builderRecord';

export type SanctumCategory = 'emergency_relief' | 'community_project' | 'merchant_grant' | 'public_good' | 'education';

export interface SanctumRequestSignals {
  category: SanctumCategory;
  /** Amount requested, in whole VFIDE. */
  amountVfide: number;
  /** Requester's contribution standing (reuses Builder Record). */
  builder: BuilderResult;
  /** Requester's ProofScore (trust), 0..10,000. */
  proofScore: number;
  /** People/merchants the request claims to benefit (self-reported; capped in scoring). */
  statedBeneficiaries: number;
  /** Has the requester received Sanctum support in the last 12 months? */
  reliefInLast12Months: boolean;
}

export interface SanctumRecommendation {
  /** 0..100 priority score for DAO ranking. */
  priorityScore: number;
  /** Advisory verdict for the DAO — never an authorization. */
  recommendation: 'prioritize' | 'consider' | 'needs_review' | 'defer';
  /** Transparent reasons. */
  rationale: string[];
}

const CATEGORY_WEIGHT: Record<SanctumCategory, number> = {
  emergency_relief: 30,
  public_good: 24,
  community_project: 20,
  education: 18,
  merchant_grant: 16,
};

export function scoreSanctumRequest(s: SanctumRequestSignals): SanctumRecommendation {
  const rationale: string[] = [];
  let score = 0;

  // Category need.
  const cat = CATEGORY_WEIGHT[s.category];
  score += cat;
  rationale.push(`Category: ${s.category.replace('_', ' ')}.`);

  // Contribution standing (builders who've given back get priority — stewardship rewards stewardship).
  const builderPts = Math.min(28, (s.builder.score / 10000) * 28);
  score += builderPts;
  if (s.builder.category !== 'Newcomer') rationale.push(`Strong contribution record (${s.builder.category}).`);

  // Trust.
  const trustPts = Math.max(0, Math.min(20, ((s.proofScore - 4000) / 6000) * 20));
  score += trustPts;

  // Reach (capped so a big self-reported number can't dominate).
  const reachPts = Math.min(12, Math.log10(Math.max(1, s.statedBeneficiaries)) * 6);
  score += reachPts;
  if (s.statedBeneficiaries >= 10) rationale.push(`Claims to benefit ~${s.statedBeneficiaries}.`);

  // Amount reasonableness — very large asks get a small penalty pending DAO scrutiny.
  if (s.amountVfide > 20000) { score -= 10; rationale.push('Large amount — warrants extra DAO scrutiny.'); }
  else if (s.amountVfide > 5000) { score -= 4; }

  // Recent relief → de-prioritize (spread support).
  if (s.reliefInLast12Months) { score -= 15; rationale.push('Received Sanctum support within the last 12 months — de-prioritized to spread help.'); }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let recommendation: SanctumRecommendation['recommendation'];
  if (s.amountVfide > 20000 || s.proofScore < 3000) recommendation = 'needs_review';
  else if (score >= 65) recommendation = 'prioritize';
  else if (score >= 45) recommendation = 'consider';
  else recommendation = 'defer';

  rationale.push('This is a recommendation for the DAO, not an approval. Sanctum funds move only by on-chain DAO vote.');
  return { priorityScore: score, recommendation, rationale };
}

/** Rank a set of scored requests highest-priority first (stable). */
export function rankSanctumRequests<T extends { priorityScore: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priorityScore - a.priorityScore);
}
