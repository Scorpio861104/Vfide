import { describe, expect, it } from '@jest/globals';
import {
  voteWeight, authorizeCastVote, proposalPasses, finalizeProposal,
  authorizeMarkExecuted, authorizeParamSetter, authorizeQuorumRescue,
  holdsUserFunds, canFreezeOrSeizeUserFunds,
  ABSOLUTE_MIN_QUORUM, MIN_VOTES_DEFAULT, VOTE_GRACE_PERIOD_MIN,
} from '@/lib/audit/daoModel';

// ════════════════════════════════════════════════════════════════════════
// DAO GOVERNANCE CORE — score-weighted, un-buyable voting; quorum floor; timelock-only execution.
// ════════════════════════════════════════════════════════════════════════

describe('DAO · A. Vote weight — un-buyable, snapshot-frozen', () => {
  it('A1 weight is the ProofScore snapshot at proposal creation — NOT live token balance', () => {
    expect(voteWeight({ scoreAtCreation: 7000, tokensHeld: 0 })).toBe(7000);
    // a whale with zero score gets zero weight regardless of tokens
    expect(voteWeight({ scoreAtCreation: 0, tokensHeld: 10_000_000 })).toBe(0);
  });
  it('A2 pumping score AFTER the proposal is created does not change weight (DAO-05 freeze)', () => {
    // model: weight keys only on scoreAtCreation; scoreAfterProposal is ignored by construction
    expect(voteWeight({ scoreAtCreation: 5000, scoreAfterProposal: 9000 })).toBe(5000);
  });
  it('A3 a flash loan buys zero votes (tokens are not an input to weight at all)', () => {
    expect(voteWeight({ scoreAtCreation: 6000, tokensHeld: 999_999_999 }))
      .toBe(voteWeight({ scoreAtCreation: 6000, tokensHeld: 0 }));
  });
  it('A4 governance fatigue reduces weight for frequent voters', () => {
    expect(voteWeight({ scoreAtCreation: 8000, fatiguePenaltyPct: 25 })).toBe(6000);
  });
});

const okVote = {
  nowH: 30, startH: 24, endH: 100, eligible: true, hasVoted: false, processed: false,
};

describe('DAO · B. Vote casting guards', () => {
  it('B1 votes cannot be cast before votingDelay elapses (flash-loan protection)', () => {
    expect(authorizeCastVote({ ...okVote, nowH: 23, startH: 24 })).toEqual({ ok: false, reason: 'NOT_STARTED' });
  });
  it('B2 votes after the voting period ends are rejected', () => {
    expect(authorizeCastVote({ ...okVote, nowH: 100, endH: 100 })).toEqual({ ok: false, reason: 'ENDED' });
  });
  it('B3 votes in the final 30-min grace period are rejected (anti-front-run)', () => {
    expect(authorizeCastVote({ ...okVote, nowH: 100 - VOTE_GRACE_PERIOD_MIN / 60, endH: 100 }))
      .toEqual({ ok: false, reason: 'GRACE_CLOSED' });
  });
  it('B4 an ineligible voter (below min governance score) cannot vote', () => {
    expect(authorizeCastVote({ ...okVote, eligible: false })).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' });
  });
  it('B5 double-voting is blocked', () => {
    expect(authorizeCastVote({ ...okVote, hasVoted: true })).toEqual({ ok: false, reason: 'ALREADY_VOTED' });
  });
  it('B6 a valid in-window eligible first vote is accepted', () => {
    expect(authorizeCastVote(okVote)).toEqual({ ok: true });
  });
});

describe('DAO · C. Quorum + pass — a minority cannot pass a proposal', () => {
  const base = { forVotes: 6000, againstVotes: 1000, voterCount: 10, minVotesRequired: MIN_VOTES_DEFAULT, minParticipation: 5 };
  it('C1 a proposal with enough score-votes, enough voters, and for > against passes', () => {
    expect(proposalPasses(base)).toBe(true);
  });
  it('C2 below the score-vote quorum, it fails even with for > against', () => {
    expect(proposalPasses({ ...base, forVotes: 1000, againstVotes: 0 })).toBe(false); // total 1000 < 5000
  });
  it('C3 below the unique-participant floor, it fails (FLOW-2) even with high score-votes', () => {
    expect(proposalPasses({ ...base, voterCount: 4 })).toBe(false); // 4 < minParticipation 5
  });
  it('C4 if against >= for, it fails even at quorum', () => {
    expect(proposalPasses({ ...base, forVotes: 3000, againstVotes: 3000 })).toBe(false);
  });
});

describe('DAO · D. Finalize → timelock-only execution (no bypass)', () => {
  it('D1 a passed, unblocked proposal is QUEUED to the timelock (never self-executed)', () => {
    expect(finalizeProposal({ passed: true, seerBlocked: false }))
      .toEqual({ ok: true, action: 'QUEUED_TO_TIMELOCK' });
  });
  it('D2 a Seer-blocked proposal cannot be queued (mutual oversight)', () => {
    expect(finalizeProposal({ passed: true, seerBlocked: true }))
      .toEqual({ ok: false, reason: 'SEER_BLOCKED' });
  });
  it('D3 a non-passed proposal is not queued', () => {
    expect(finalizeProposal({ passed: false, seerBlocked: false }))
      .toEqual({ ok: false, reason: 'NOT_PASSED' });
  });
  it('D4 markExecuted is timelock-only (DAO-07: no admin soft-veto, no faked execution)', () => {
    expect(authorizeMarkExecuted('timelock')).toBe(true);
    expect(authorizeMarkExecuted('admin')).toBe(false);
    expect(authorizeMarkExecuted('other')).toBe(false);
  });
  it('D5 parameter setters are timelock-only — quorum/period changes must themselves pass governance', () => {
    expect(authorizeParamSetter('timelock')).toBe(true);
    expect(authorizeParamSetter('admin')).toBe(false);
  });
});

describe('DAO · E. Bounded emergency quorum rescue (deadlock relief, not a backdoor)', () => {
  const base = { caller: 'admin' as const, currentMinVotes: 5000, newMinVotes: 1000 };
  it('E1 admin may reduce minVotes for deadlock relief, bounded ≥10% of current and ≥500', () => {
    expect(authorizeQuorumRescue(base)).toEqual({ ok: true }); // 1000 ≥ 500 and ≥ 500
  });
  it('E2 a non-admin cannot trigger quorum rescue', () => {
    expect(authorizeQuorumRescue({ ...base, caller: 'other' })).toEqual({ ok: false, reason: 'NOT_ADMIN' });
  });
  it('E3 cannot reduce below 10% of the current quorum (no cascading collapse)', () => {
    expect(authorizeQuorumRescue({ ...base, currentMinVotes: 20000, newMinVotes: 1000 }))
      .toEqual({ ok: false, reason: 'BELOW_10_PERCENT' }); // 1000 < 20000/10
  });
  it('E4 cannot reduce below the 500 absolute-minimum quorum', () => {
    expect(authorizeQuorumRescue({ ...base, currentMinVotes: 600, newMinVotes: ABSOLUTE_MIN_QUORUM - 1 }))
      .toEqual({ ok: false, reason: 'BELOW_ABSOLUTE_MIN' });
  });
  it('E5 cannot "rescue" to an equal or higher quorum', () => {
    expect(authorizeQuorumRescue({ ...base, newMinVotes: 5000 })).toEqual({ ok: false, reason: 'NOT_A_REDUCTION' });
  });
});

describe('DAO · F. Non-custodial', () => {
  it('F1 holds no user funds and cannot freeze/seize user vault funds', () => {
    expect(holdsUserFunds()).toBe(false);
    expect(canFreezeOrSeizeUserFunds()).toBe(false);
  });
});
