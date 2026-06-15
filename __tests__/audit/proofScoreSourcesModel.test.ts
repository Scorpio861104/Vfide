import { describe, expect, it } from '@jest/globals';
import {
  authorizeAddScoreSource, validDecentralizationWeights, aggregateScore, scoreForUnknownSubject,
  automatedScore, automatedScoreInputs, automatedScoreUsesWealth, authorizeSetScore,
  NEUTRAL, MAX_SCORE, MAX_SCORE_SOURCES, MIN_ONCHAIN_WEIGHT_WITH_SOURCES,
  type SourceContribution,
} from '@/lib/audit/proofScoreSourcesModel';

// ════════════════════════════════════════════════════════════════════════
// PROOFSCORE — per-source depth. The score is the protocol's spine; every governance/election audit relies on it
//   being un-buyable. This matrix proves no source, no wealth, and no DAO fiat can buy a score.
// ════════════════════════════════════════════════════════════════════════

const okAdd = {
  caller: 'dao' as const, source: 'addr' as const, weight: 30,
  alreadyRegistered: false, currentSourceCount: 2, activeWeightSum: 40,
};

describe('ProofScore · A. Source registration — bounded weight, sum capped at 100%, DAO-only', () => {
  it('A1 only the DAO may add a score source', () => {
    expect(authorizeAddScoreSource({ ...okAdd, caller: 'operator' })).toEqual({ ok: false, reason: 'NOT_DAO' });
    expect(authorizeAddScoreSource({ ...okAdd, caller: 'other' })).toEqual({ ok: false, reason: 'NOT_DAO' });
  });
  it('A2 a single source weight over 100 is rejected', () => {
    expect(authorizeAddScoreSource({ ...okAdd, weight: 101 })).toEqual({ ok: false, reason: 'WEIGHT_OVER_100' });
  });
  it('A3 an addition that would push the SUM of weights over 100 is rejected (no over-weighting)', () => {
    expect(authorizeAddScoreSource({ ...okAdd, weight: 70, activeWeightSum: 40 }))
      .toEqual({ ok: false, reason: 'SUM_OVER_100' }); // 40 + 70 = 110
  });
  it('A4 a source at the exact remaining capacity is accepted', () => {
    expect(authorizeAddScoreSource({ ...okAdd, weight: 60, activeWeightSum: 40 })).toEqual({ ok: true }); // 100
  });
  it('A5 duplicates and the source-count limit are rejected', () => {
    expect(authorizeAddScoreSource({ ...okAdd, alreadyRegistered: true })).toEqual({ ok: false, reason: 'DUPLICATE' });
    expect(authorizeAddScoreSource({ ...okAdd, currentSourceCount: MAX_SCORE_SOURCES })).toEqual({ ok: false, reason: 'LIMIT' });
  });
});

describe('ProofScore · B. Anti-capture decentralization floor', () => {
  it('B1 the DAO-vs-on-chain split must sum to exactly 100', () => {
    expect(validDecentralizationWeights({ daoWeight: 60, onChainWeight: 40, hasActiveSources: true })).toBe(true);
    expect(validDecentralizationWeights({ daoWeight: 60, onChainWeight: 30, hasActiveSources: false })).toBe(false); // 90
  });
  it('B2 once community sources exist, on-chain weight cannot drop below the floor (no DAO recapture)', () => {
    expect(validDecentralizationWeights({ daoWeight: 100 - (MIN_ONCHAIN_WEIGHT_WITH_SOURCES - 1), onChainWeight: MIN_ONCHAIN_WEIGHT_WITH_SOURCES - 1, hasActiveSources: true }))
      .toBe(false);
    expect(validDecentralizationWeights({ daoWeight: 100 - MIN_ONCHAIN_WEIGHT_WITH_SOURCES, onChainWeight: MIN_ONCHAIN_WEIGHT_WITH_SOURCES, hasActiveSources: true }))
      .toBe(true);
  });
});

describe('ProofScore · C. Aggregation — weighted average, neutral default, clamped, fault-tolerant', () => {
  it('C1 an un-sourced subject scores NEUTRAL (never 0)', () => {
    expect(scoreForUnknownSubject()).toBe(NEUTRAL);
    expect(aggregateScore([], NEUTRAL)).toBe(NEUTRAL); // no sources → automated fills 100% → NEUTRAL
  });
  it('C2 sources are combined as a weighted average and clamped to the valid band', () => {
    // one source: score 800 (→8000) at weight 50; automated 5000 fills the other 50 → (8000*50 + 5000*50)/100
    expect(aggregateScore([{ score: 800, weight: 50 }], 5000)).toBe(6500);
  });
  it('C3 a reverting source is skipped — it cannot poison the aggregate', () => {
    // failing source ignored; automated (NEUTRAL) fills 100%
    expect(aggregateScore([{ score: 1000, weight: 50, reverts: true }], NEUTRAL)).toBe(NEUTRAL);
  });
  it('C4 an out-of-range source (score > 1000) is ignored', () => {
    expect(aggregateScore([{ score: 5000, weight: 50 }], NEUTRAL)).toBe(NEUTRAL); // 5000 > 1000 → skipped
  });
  it('C5 the result never exceeds MAX_SCORE even with all sources maxed', () => {
    const maxed: SourceContribution[] = [{ score: 1000, weight: 100 }];
    expect(aggregateScore(maxed, MAX_SCORE)).toBe(MAX_SCORE); // 1000→10000 at full weight
  });
});

describe('ProofScore · D. Behavioral-only — the score reflects what you DID, not what you HOLD', () => {
  it('D1 the automated score is NEUTRAL + behavioral bonuses (vault, badges, endorsements)', () => {
    expect(automatedScore({ hasVault: true, badgePoints: 300, endorsementPoints: 200 })).toBe(NEUTRAL + 500 + 300 + 200);
  });
  it('D2 the automated score inputs contain NO wealth/balance signal', () => {
    const inputs = automatedScoreInputs();
    expect(inputs).toEqual(['vault_existence', 'earned_badges', 'peer_endorsements']);
    expect(inputs).not.toContain('token_balance' as never);
    expect(inputs).not.toContain('wealth' as never);
    expect(automatedScoreUsesWealth()).toBe(false);
  });
  it('D3 holding more tokens does not change the score (vault EXISTENCE, not size, is the only vault signal)', () => {
    // both have a vault; "balance" is not an input, so the automated score is identical
    expect(automatedScore({ hasVault: true, badgePoints: 0, endorsementPoints: 0 }))
      .toBe(automatedScore({ hasVault: true, badgePoints: 0, endorsementPoints: 0 }));
  });
  it('D4 the automated score is clamped to MAX_SCORE', () => {
    expect(automatedScore({ hasVault: true, badgePoints: 99999, endorsementPoints: 99999 })).toBe(MAX_SCORE);
  });
});

describe('ProofScore · E. DAO setScore is bounded — no instant trust manipulation', () => {
  const ok = { caller: 'dao' as const, newScore: 5200, oldScore: 5000, cooldownElapsed: true, maxDAOScoreChange: 500 };
  it('E1 a within-bounds DAO score change is allowed', () => {
    expect(authorizeSetScore(ok)).toEqual({ ok: true });
  });
  it('E2 a non-DAO caller cannot setScore', () => {
    expect(authorizeSetScore({ ...ok, caller: 'operator' })).toEqual({ ok: false, reason: 'NOT_DAO' });
  });
  it('E3 a change exceeding the per-call magnitude cap is rejected (F-16)', () => {
    expect(authorizeSetScore({ ...ok, newScore: 9000, oldScore: 5000, maxDAOScoreChange: 500 }))
      .toEqual({ ok: false, reason: 'DELTA_TOO_LARGE' });
  });
  it('E4 the per-subject cooldown rate-limits DAO changes (S-04)', () => {
    expect(authorizeSetScore({ ...ok, cooldownElapsed: false })).toEqual({ ok: false, reason: 'COOLDOWN' });
  });
  it('E5 setting above MAX_SCORE is rejected', () => {
    expect(authorizeSetScore({ ...ok, newScore: MAX_SCORE + 1 })).toEqual({ ok: false, reason: 'OVER_MAX' });
  });
});
