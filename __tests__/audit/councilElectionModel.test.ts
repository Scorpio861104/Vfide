import { describe, expect, it } from '@jest/globals';
import {
  voteWeight, authorizeVote, eligibleAtSnapshot, authorizeProposeCouncil, canApplyCouncil,
  authorizeSeatMember, authorizeRefresh, refreshRemovesMember, authorizeElectionAdmin,
  holdsUserFunds, canFreezeOrSeizeUserFunds,
  MIN_COUNCIL_SIZE, MAX_COUNCIL_SIZE, FIXED_MAX_CONSECUTIVE_TERMS, COUNCIL_APPOINT_DELAY_H,
} from '@/lib/audit/councilElectionModel';

// ════════════════════════════════════════════════════════════════════════
// COUNCIL ELECTION — score-weighted, sybil-resistant; only winners seated; term-limited; non-custodial.
// ════════════════════════════════════════════════════════════════════════

describe('CouncilElection · A. Vote weight — un-buyable, snapshot-frozen', () => {
  it('A1 weight is the ProofScore snapshot at election start — NOT token balance', () => {
    expect(voteWeight({ scoreAtElectionStart: 7000, tokensHeld: 0 })).toBe(7000);
    expect(voteWeight({ scoreAtElectionStart: 0, tokensHeld: 50_000_000 })).toBe(0);
  });
  it('A2 pumping score AFTER the election opens does not change weight', () => {
    expect(voteWeight({ scoreAtElectionStart: 5500, scoreAfterStart: 9000 })).toBe(5500);
  });
  it('A3 a flash loan buys zero votes (tokens are not an input)', () => {
    expect(voteWeight({ scoreAtElectionStart: 6000, tokensHeld: 999_999 }))
      .toBe(voteWeight({ scoreAtElectionStart: 6000, tokensHeld: 0 }));
  });
});

const okVote = {
  electionStarted: true, nowH: 50, startH: 0, endH: 100,
  isCandidate: true, candidateEligible: true, voterEligible: true, hasVoted: false,
};

describe('CouncilElection · B. Vote casting guards', () => {
  it('B1 voting outside the active window is rejected', () => {
    expect(authorizeVote({ ...okVote, nowH: 100, endH: 100 })).toEqual({ ok: false, reason: 'NO_ACTIVE_ELECTION' });
    expect(authorizeVote({ ...okVote, electionStarted: false })).toEqual({ ok: false, reason: 'NO_ACTIVE_ELECTION' });
  });
  it('B2 voting for a non-candidate or ineligible candidate is rejected', () => {
    expect(authorizeVote({ ...okVote, isCandidate: false })).toEqual({ ok: false, reason: 'CANDIDATE_NOT_ELIGIBLE' });
    expect(authorizeVote({ ...okVote, candidateEligible: false })).toEqual({ ok: false, reason: 'CANDIDATE_NOT_ELIGIBLE' });
  });
  it('B3 an ineligible voter (below min council score, e.g. fresh sybil) cannot vote', () => {
    expect(authorizeVote({ ...okVote, voterEligible: false })).toEqual({ ok: false, reason: 'VOTER_NOT_ELIGIBLE' });
  });
  it('B4 double-voting is blocked', () => {
    expect(authorizeVote({ ...okVote, hasVoted: true })).toEqual({ ok: false, reason: 'ALREADY_VOTED' });
  });
  it('B5 a valid in-window eligible first vote is accepted', () => {
    expect(authorizeVote(okVote)).toEqual({ ok: true });
  });
  it('B6 eligibility requires the snapshot score to clear minCouncilScore', () => {
    expect(eligibleAtSnapshot(5000, 5000)).toBe(true);
    expect(eligibleAtSnapshot(4999, 5000)).toBe(false); // a fresh default-score vault is barred
  });
});

describe('CouncilElection · C. Slate proposal — only genuine winners can be seated', () => {
  const ok = { size: 5, allEligible: true, allTopVoted: true };
  it('C1 a valid slate of eligible top-voted candidates is accepted', () => {
    expect(authorizeProposeCouncil(ok)).toEqual({ ok: true });
  });
  it('C2 an out-of-range council size is rejected', () => {
    expect(authorizeProposeCouncil({ ...ok, size: MIN_COUNCIL_SIZE - 1 })).toEqual({ ok: false, reason: 'BAD_SIZE' });
    expect(authorizeProposeCouncil({ ...ok, size: MAX_COUNCIL_SIZE + 1 })).toEqual({ ok: false, reason: 'BAD_SIZE' });
  });
  it('C3 a slate containing a non-eligible member is rejected', () => {
    expect(authorizeProposeCouncil({ ...ok, allEligible: false })).toEqual({ ok: false, reason: 'MEMBER_NOT_ELIGIBLE' });
  });
  it('C4 an ARBITRARY set (not the top vote-getters) cannot be seated (CE_NotTopVotedCandidate)', () => {
    expect(authorizeProposeCouncil({ ...ok, allTopVoted: false })).toEqual({ ok: false, reason: 'NOT_TOP_VOTED' });
  });
});

describe('CouncilElection · D. Seating is timelocked (72h appoint delay)', () => {
  it('D1 a pending council cannot apply before the 72h delay', () => {
    expect(canApplyCouncil({ hasPending: true, nowH: COUNCIL_APPOINT_DELAY_H - 1, validFromH: COUNCIL_APPOINT_DELAY_H })).toBe(false);
  });
  it('D2 a pending council applies once the delay elapses', () => {
    expect(canApplyCouncil({ hasPending: true, nowH: COUNCIL_APPOINT_DELAY_H, validFromH: COUNCIL_APPOINT_DELAY_H })).toBe(true);
  });
  it('D3 nothing applies when there is no pending council', () => {
    expect(canApplyCouncil({ hasPending: false, nowH: 1000, validFromH: 0 })).toBe(false);
  });
});

describe('CouncilElection · E. Term limits — anti-entrenchment', () => {
  const base = { isCandidate: true, eligible: true, isDuplicate: false, maxConsecutiveTerms: FIXED_MAX_CONSECUTIVE_TERMS };
  it('E1 a first-term eligible candidate can be seated', () => {
    expect(authorizeSeatMember({ ...base, consecutiveTermsServed: 0, isConsecutive: false })).toEqual({ ok: true });
  });
  it('E2 a consecutive re-seat beyond the limit is rejected (CE_TermLimitReached)', () => {
    expect(authorizeSeatMember({ ...base, consecutiveTermsServed: FIXED_MAX_CONSECUTIVE_TERMS, isConsecutive: true }))
      .toEqual({ ok: false, reason: 'TERM_LIMIT' });
  });
  it('E3 a duplicate member in the slate is rejected', () => {
    expect(authorizeSeatMember({ ...base, consecutiveTermsServed: 0, isConsecutive: false, isDuplicate: true }))
      .toEqual({ ok: false, reason: 'DUPLICATE' });
  });
  it('E4 a member who became ineligible cannot be seated', () => {
    expect(authorizeSeatMember({ ...base, consecutiveTermsServed: 0, isConsecutive: false, eligible: false }))
      .toEqual({ ok: false, reason: 'NOT_ELIGIBLE' });
  });
});

describe('CouncilElection · F. Capture-resistant removal (#503) + DAO-governed params', () => {
  it('F1 refreshCouncil requires ALL current members to be checked — no selective purge', () => {
    expect(authorizeRefresh({ providedCount: 5, currentCount: 5, allAreMembers: true })).toBe(true);
    expect(authorizeRefresh({ providedCount: 3, currentCount: 5, allAreMembers: true })).toBe(false); // subset → rejected
    expect(authorizeRefresh({ providedCount: 5, currentCount: 5, allAreMembers: false })).toBe(false);
  });
  it('F2 refresh removes a member ONLY if they fell below the current-term score', () => {
    expect(refreshRemovesMember(false)).toBe(true);  // no longer eligible → removed
    expect(refreshRemovesMember(true)).toBe(false);  // still eligible → kept
  });
  it('F3 election lifecycle/params are DAO-only (route through the certified DAO → timelock)', () => {
    expect(authorizeElectionAdmin('dao')).toBe(true);
    expect(authorizeElectionAdmin('admin')).toBe(false);
    expect(authorizeElectionAdmin('other')).toBe(false);
  });
});

describe('CouncilElection · G. Non-custodial', () => {
  it('G1 holds no user funds and cannot freeze/seize (no value transfers anywhere)', () => {
    expect(holdsUserFunds()).toBe(false);
    expect(canFreezeOrSeizeUserFunds()).toBe(false);
  });
});
