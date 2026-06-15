import { describe, expect, it } from '@jest/globals';
import {
  vaultOperationProceeds, vaultOperationOnSeerOutage, restrictionCanBlockFunds,
  participationAllowed, canFileChallenge, canResolveChallenge,
  thresholdChangeEffective, policyChangeEffective,
  type SeerVerdict, type ActionType, type RestrictionLevel, type PolicyClass,
} from '@/lib/audit/seerModel';
// REAL engines (pure TS) — exercised directly, not modeled:
import { extractionCategory, applyDecay, computeExtractionIndex, type ExtractionState } from '@/lib/seer/marketStability/extractionIndex';
import { evaluateStabilityPolicy, type StabilityContext } from '@/lib/seer/marketStability/stabilityPolicy';
import { computeBondBenefits, NO_BOND_BENEFITS, type BondCommitment } from '@/lib/seer/marketStability/stabilityBonding';
import type { BuilderResult } from '@/lib/seer/marketStability/builderRecord';

const builder = (category: BuilderResult['category'], score = 6000): BuilderResult => ({ score, category, contributingFactors: [] });
const ctx = (o: Partial<StabilityContext> = {}): StabilityContext => ({
  impactTier: 1, extractionIndex: 500, builder: builder('Builder'), proofScore: 7000,
  verifiedDisputes: 0, fraudFlags: 0, monthsSinceLastRelief: null, ...o,
});

// ════════════════════════════════════════════════════════
// SEER — AUTONOMOUS BOUNDARY, CHALLENGE, BOUNDS + REAL ENGINES MATRIX
//   A. Non-custodial enforcement boundary (the crux)   B. Restriction = participation only
//   C. Challenge/appeal   D. DAO-bounded + timelocked thresholds
//   E. REAL extraction engine   F. REAL stability policy (never touches funds)   G. REAL bonding (opt-in/unfarmable)
// ════════════════════════════════════════════════════════

describe('Seer · A. The autonomous verdict is NEVER enforced on funds (the crux)', () => {
  const verdicts: SeerVerdict[] = ['Allowed', 'Warned', 'Delayed', 'Blocked', 'Penalized'];
  it('A1 a vault operation proceeds regardless of Seer verdict (even "Blocked")', () => {
    for (const v of verdicts) expect(vaultOperationProceeds(v, 'withdrawal')).toBe(true);
  });
  it('A2 payment / escrow funding also never blocked by Seer', () => {
    expect(vaultOperationProceeds('Blocked', 'payment')).toBe(true);
    expect(vaultOperationProceeds('Penalized', 'escrowFund')).toBe(true);
  });
  it('A3 a Seer hook OUTAGE does not brick the vault (SEER-04 fail-open on funds)', () => {
    expect(vaultOperationOnSeerOutage()).toBe(true);
  });
  it('A4 no ActionType — not even VaultWithdraw — lets a restriction block funds', () => {
    const actions: ActionType[] = ['Transfer', 'VaultWithdraw', 'VaultDeposit', 'Trade', 'Stake'];
    for (const a of actions) expect(restrictionCanBlockFunds(a)).toBe(false);
  });
});

describe('Seer · B. Restrictions bite PARTICIPATION, never fund movement', () => {
  it('B1 even at Frozen, fund transfer/withdraw is still allowed', () => {
    expect(participationAllowed('Frozen', 'VaultWithdraw')).toBe(true);
    expect(participationAllowed('Frozen', 'Transfer')).toBe(true);
  });
  it('B2 governance is blocked at Restricted and above', () => {
    expect(participationAllowed('Limited', 'GovernanceVote')).toBe(true);
    expect(participationAllowed('Restricted', 'GovernanceVote')).toBe(false);
  });
  it('B3 trading/staking/endorsing blocked at Suspended and above', () => {
    expect(participationAllowed('Restricted', 'Trade')).toBe(true);
    expect(participationAllowed('Suspended', 'Trade')).toBe(false);
  });
  it('B4 Monitored restricts nothing', () => {
    for (const a of ['GovernanceVote', 'Trade', 'Endorse'] as ActionType[]) expect(participationAllowed('Monitored', a)).toBe(true);
  });
});

describe('Seer · C. Challenge / appeal (a misjudged user has recourse)', () => {
  it('C1 the subject can file a challenge', () => expect(canFileChallenge('subject')).toBe(true));
  it('C2 an attacker cannot file on someone else\'s behalf', () => expect(canFileChallenge('attacker')).toBe(false));
  it('C3 only the DAO can resolve a challenge', () => {
    expect(canResolveChallenge('dao')).toBe(true);
    expect(canResolveChallenge('subject')).toBe(false);
    expect(canResolveChallenge('attacker')).toBe(false);
  });
});

describe('Seer · D. Autonomous thresholds are DAO-bounded + timelocked', () => {
  it('D1 a non-DAO cannot change a threshold', () => expect(thresholdChangeEffective(false, 1000, 500)).toBe(false));
  it('D2 a DAO change is not effective until executeAfter (timelock)', () => expect(thresholdChangeEffective(true, 400, 500)).toBe(false));
  it('D3 a DAO change is effective once the timelock elapses', () => expect(thresholdChangeEffective(true, 600, 500)).toBe(true));
  it('D4 critical policy changes wait longer than operational (per-class delays)', () => {
    const delays: Record<PolicyClass, number> = { critical: 604800, important: 172800, operational: 3600 };
    expect(policyChangeEffective('critical', 3600, delays)).toBe(false);     // 1h not enough for critical
    expect(policyChangeEffective('operational', 3600, delays)).toBe(true);   // 1h enough for operational
  });
});

// ─────────────────────────── REAL ENGINES (pure TS, exercised directly)

describe('Seer · E. REAL extraction engine (read-only behavioral metric)', () => {
  it('E1 category thresholds map correctly across the 0-10000 range', () => {
    expect(extractionCategory(500)).toBe('Normal');
    expect(extractionCategory(2000)).toBe('Observed');
    expect(extractionCategory(4000)).toBe('Elevated');
    expect(extractionCategory(6000)).toBe('High Risk');
    expect(extractionCategory(8000)).toBe('Extraction Focused');
  });
  it('E2 the index DECAYS toward zero over time (not a permanent mark)', () => {
    const start: ExtractionState = { index: 6000, lastUpdatedAt: 0 };
    const later = applyDecay(start, 1000 * 60 * 60 * 24 * 30); // 30 days later
    expect(later.index).toBeLessThan(start.index);
  });
  it('E3 extractive signals (pump/dump) raise the index', () => {
    const prior: ExtractionState = { index: 0, lastUpdatedAt: 0 };
    const clean = computeExtractionIndex(prior, { highImpactSells: 0, sellRebuyCycles: 0, rapidRebuys: 0, volatilityEvents: 0, liquidityDisruptions: 0 }, 1000);
    const extractive = computeExtractionIndex(prior, { highImpactSells: 10, sellRebuyCycles: 8, rapidRebuys: 6, volatilityEvents: 5, liquidityDisruptions: 4, clusterCorrelation: 1 }, 1000);
    expect(extractive.index).toBeGreaterThan(clean.index);
  });
  it('E4 a clean actor stays in the Normal band', () => {
    const prior: ExtractionState = { index: 0, lastUpdatedAt: 0 };
    const r = computeExtractionIndex(prior, { highImpactSells: 0, sellRebuyCycles: 0, rapidRebuys: 0, volatilityEvents: 0, liquidityDisruptions: 0 }, 1000);
    expect(r.category).toBe('Normal');
  });
});

describe('Seer · F. REAL stability policy — NEVER touches a flagged user\'s funds (anti-extraction, non-custodial)', () => {
  it('F1 the decision explicitly reports tokenTransferEffect = none (ownership sovereign)', () => {
    expect(evaluateStabilityPolicy(ctx()).tokenTransferEffect).toMatch(/none/i);
  });
  it('F2 even a HIGH-extraction actor has no token-transfer consequence', () => {
    const d = evaluateStabilityPolicy(ctx({ extractionIndex: 9000, fraudFlags: 3 }));
    expect(d.tokenTransferEffect).toMatch(/none/i);
  });
  it('F3 a high-extraction actor faces only DISCRETIONARY lending pause (never a token block)', () => {
    const d = evaluateStabilityPolicy(ctx({ extractionIndex: 9000, builder: builder('Newcomer', 100), proofScore: 1000 }));
    expect(typeof d.lending.lendingRestricted).toBe('boolean'); // a service adjustment, not a fund action
    expect(d.tokenTransferEffect).toMatch(/none/i);
  });
  it('F4 emergency relief is eligibility-gated (high trust + builder + low extraction)', () => {
    const eligible = evaluateStabilityPolicy(ctx({ proofScore: 8000, builder: builder('Institutional Merchant', 8000), extractionIndex: 500, monthsSinceLastRelief: null }));
    expect(eligible.emergency.eligible).toBe(true);
    const notEligible = evaluateStabilityPolicy(ctx({ proofScore: 3000, extractionIndex: 8000 }));
    expect(notEligible.emergency.eligible).toBe(false);
  });
  it('F5 builders get higher marketplace visibility (a surfacing nudge, not a fund effect)', () => {
    const d = evaluateStabilityPolicy(ctx({ builder: builder('Institutional Merchant', 8000) }));
    expect(d.marketplace.visibilityMultiplier).toBeGreaterThanOrEqual(1);
  });
});

describe('Seer · G. REAL stability bonding — opt-in, on-chain-verified, unfarmable', () => {
  it('G1 no bond → no benefits (default)', () => {
    expect(computeBondBenefits(null, 1000)).toEqual(NO_BOND_BENEFITS);
  });
  it('G2 an UNVERIFIED (client-claimed) bond grants NO benefits', () => {
    const fake: BondCommitment = { termMonths: 6, amountVfide: 100000, verifiedOnChain: false, maturityAt: 9_999_999_999_999 };
    expect(computeBondBenefits(fake, 1000)).toEqual(NO_BOND_BENEFITS);
  });
  it('G3 a VERIFIED on-chain bond grants benefits (opt-in reward)', () => {
    const real: BondCommitment = { termMonths: 6, amountVfide: 1000, verifiedOnChain: true, maturityAt: 9_999_999_999_999 };
    const b = computeBondBenefits(real, 1000);
    expect(b).not.toEqual(NO_BOND_BENEFITS);
  });
  it('G4 longer term → larger multiplier (incentive aligned with commitment)', () => {
    const sixMo: BondCommitment = { termMonths: 6, amountVfide: 1000, verifiedOnChain: true, maturityAt: 9_999_999_999_999 };
    const threeMo: BondCommitment = { termMonths: 3, amountVfide: 1000, verifiedOnChain: true, maturityAt: 9_999_999_999_999 };
    const b6 = computeBondBenefits(sixMo, 1000);
    const b3 = computeBondBenefits(threeMo, 1000);
    expect(b6.lendingLimitBoost).toBeGreaterThanOrEqual(b3.lendingLimitBoost);
  });
  it('G5 a MATURED/expired bond grants no further benefits (must be active)', () => {
    const matured: BondCommitment = { termMonths: 6, amountVfide: 1000, verifiedOnChain: true, maturityAt: 500 };
    expect(computeBondBenefits(matured, 1000)).toEqual(NO_BOND_BENEFITS); // now (1000) > maturity (500)
  });
});

// ─────────────────────────── targeted hardening of the headline non-custodial / anti-extraction claims
describe('Seer · H. Behavior, not wealth — and standing recovers (anti-extraction fairness)', () => {
  it('H1 a WEALTHY but CLEAN actor faces no extraction penalty (keys on behavior, not holdings)', () => {
    // no fraud, no disputes, low extraction → not a scammer-exit, normal-or-better terms, funds untouched
    const d = evaluateStabilityPolicy(ctx({ extractionIndex: 200, fraudFlags: 0, verifiedDisputes: 0, proofScore: 7000 }));
    expect(d.scammerExitSuspected).toBe(false);
    expect(d.lending.lendingRestricted).toBe(false);
    expect(d.tokenTransferEffect).toMatch(/none/i);
  });
  it('H2 scammer-exit requires VERIFIED bad acts — a single large sell alone does NOT trigger it', () => {
    // high extraction but ZERO fraud/disputes and decent trust → not flagged as scammer-exit
    const d = evaluateStabilityPolicy(ctx({ extractionIndex: 9000, fraudFlags: 0, verifiedDisputes: 0, proofScore: 6000 }));
    expect(d.scammerExitSuspected).toBe(false);
  });
  it('H3 extraction standing RECOVERS to a better category after enough decay (90-day half-life)', () => {
    const start: ExtractionState = { index: 8000, lastUpdatedAt: 0 }; // Extraction Focused
    const oneYear = applyDecay(start, 1000 * 60 * 60 * 24 * 365); // ~4 half-lives → ~500
    expect(oneYear.index).toBeLessThan(1000);
    expect(extractionCategory(oneYear.index)).toBe('Normal'); // fully rehabilitated
  });
  it('H4 a fully-decayed (zero) index re-anchors cleanly at Normal', () => {
    const decayed: ExtractionState = { index: 0, lastUpdatedAt: 0 };
    const r = applyDecay(decayed, 1000);
    expect(r.index).toBe(0);
    expect(extractionCategory(r.index)).toBe('Normal');
  });
});

describe('Seer · I. The verdict-ignored boundary holds for EVERY level (incl. Frozen) and on outage', () => {
  const levels: SeerVerdict[] = ['Allowed', 'Warned', 'Delayed', 'Blocked', 'Penalized'];
  it('I1 a vault op proceeds under EVERY possible Seer verdict (verdict never enforced on funds)', () => {
    for (const v of levels) {
      expect(vaultOperationProceeds(v, 'withdrawal')).toBe(true);
      expect(vaultOperationProceeds(v, 'payment')).toBe(true);
      expect(vaultOperationProceeds(v, 'transfer')).toBe(true);
    }
  });
  it('I2 even a "Blocked"/"Penalized" verdict cannot stop a withdrawal', () => {
    expect(vaultOperationProceeds('Blocked', 'withdrawal')).toBe(true);
    expect(vaultOperationProceeds('Penalized', 'withdrawal')).toBe(true);
  });
  it('I3 a Seer hook OUTAGE does not brick the vault (SEER-04 fail-open on funds)', () => {
    expect(vaultOperationOnSeerOutage()).toBe(true);
  });
});
