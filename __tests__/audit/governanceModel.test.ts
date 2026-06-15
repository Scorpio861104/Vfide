import { describe, expect, it } from '@jest/globals';
import {
  emergencyScope, haltCanBlockUserWithdrawal, emergencyCanTouchUserFunds,
  canToggleBreaker, validCooldown, canToggleNow,
  voterEligible, voteWeight, authorizeVote,
  validVotingPeriod, validQuorumChange, authorizeExecute,
  MIN_COOLDOWN_SECONDS, ABSOLUTE_MIN_QUORUM, VOTE_GRACE_PERIOD_MIN,
  type CommitteeState, type VoteTiming, type VoterEligibility,
} from '@/lib/audit/governanceModel';

// ════════════════════════════════════════════════════════
// GOVERNANCE — EMERGENCY BOUNDARY, VOTING INTEGRITY, TREASURY & COMMITTEE MATRIX
//   A. Emergency boundary (the flag)   B. Committee M-of-N + cooldown   C. Voter eligibility
//   D. Flash-loan-proof voting (ProofScore-weighted)   E. Vote timing   F. Proposal lifecycle / quorum / timelock
// ════════════════════════════════════════════════════════

describe('Governance · A. Emergency power CANNOT reach user funds (the flagged item)', () => {
  it('A1 emergency scope is a GLOBAL protocol halt, not user-vault', () => expect(emergencyScope()).toBe('globalProtocolHalt'));
  it('A2 a global halt CANNOT block a user withdrawal (vault ignores the breaker)', () => {
    expect(haltCanBlockUserWithdrawal(true)).toBe(false);
    expect(haltCanBlockUserWithdrawal(false)).toBe(false);
  });
  it('A3 emergency control cannot freeze/seize/move user funds', () => expect(emergencyCanTouchUserFunds()).toBe(false));
});

describe('Governance · B. Emergency committee M-of-N + anti-flap cooldown', () => {
  const C = (o: Partial<CommitteeState> = {}): CommitteeState => ({ threshold: 3, members: 5, approvals: 0, ...o });
  it('B1 the DAO can toggle the breaker directly', () => expect(canToggleBreaker('dao', C()).ok).toBe(true));
  it('B2 the committee can toggle once M-of-N approvals are met', () => expect(canToggleBreaker('committee', C({ approvals: 3 })).ok).toBe(true));
  it('B3 the committee CANNOT toggle below threshold', () => expect(canToggleBreaker('committee', C({ approvals: 2 })).reason).toBe('BELOW_THRESHOLD'));
  it('B4 an attacker cannot toggle', () => expect(canToggleBreaker('attacker', C({ approvals: 5 })).ok).toBe(false));
  it('B5 a cooldown below the 5-min floor is rejected (anti-flap cannot be disabled)', () => {
    expect(validCooldown(60)).toBe(false);
    expect(validCooldown(MIN_COOLDOWN_SECONDS)).toBe(true);
  });
  it('B6 a new toggle is blocked until the cooldown elapses', () => {
    expect(canToggleNow(1000, 1000 + 60, 600)).toBe(false);   // 60s < 600s cooldown
    expect(canToggleNow(1000, 1000 + 600, 600)).toBe(true);
  });
  it('B7 the cooldown floor is enforced even if a shorter one is passed', () => {
    expect(canToggleNow(1000, 1000 + 120, 60)).toBe(false); // floored to 300s
  });
});

describe('Governance · C. Voter eligibility (vault + SeerGuardian restriction)', () => {
  const V = (o: Partial<VoterEligibility> = {}): VoterEligibility => ({ ownsVault: true, guardianAllowsGovernance: true, ...o });
  it('C1 a vault-owning, unrestricted voter is eligible', () => expect(voterEligible(V())).toBe(true));
  it('C2 no vault → not eligible', () => expect(voterEligible(V({ ownsVault: false }))).toBe(false));
  it('C3 SeerGuardian can restrict a bad actor from governance', () => expect(voterEligible(V({ guardianAllowsGovernance: false }))).toBe(false));
});

describe('Governance · D. Flash-loan-proof voting (ProofScore-weighted, NOT token-weighted)', () => {
  it('D1 vote weight comes from the ProofScore snapshot', () => {
    expect(voteWeight({ proofScoreSnapshot: 8000, tokenBalance: 0, fatiguePenaltyPct: 0 })).toBe(8000);
  });
  it('D2 a HUGE token balance contributes ZERO weight (flash loan buys no votes)', () => {
    const flashAttacker = voteWeight({ proofScoreSnapshot: 0, tokenBalance: 1_000_000_000, fatiguePenaltyPct: 0 });
    expect(flashAttacker).toBe(0);
  });
  it('D3 two voters with equal score but wildly different token balances have equal weight', () => {
    const poor = voteWeight({ proofScoreSnapshot: 7000, tokenBalance: 1, fatiguePenaltyPct: 0 });
    const whale = voteWeight({ proofScoreSnapshot: 7000, tokenBalance: 10_000_000, fatiguePenaltyPct: 0 });
    expect(poor).toBe(whale);
  });
  it('D4 governance fatigue reduces weight for frequent voters', () => {
    expect(voteWeight({ proofScoreSnapshot: 8000, tokenBalance: 0, fatiguePenaltyPct: 50 })).toBe(4000);
  });
});

describe('Governance · E. Vote timing (flash-loan window + anti-front-running grace)', () => {
  const T = (now: number): VoteTiming => ({ nowTs: now, startTs: 1000, endTs: 1000 + 7200 }); // 2h window
  const elig: VoterEligibility = { ownsVault: true, guardianAllowsGovernance: true };
  it('E1 a vote before start is rejected (flash-loan timing protection)', () => expect(authorizeVote(T(500), elig, false).reason).toBe('NOT_STARTED'));
  it('E2 a vote after end is rejected', () => expect(authorizeVote(T(9000), elig, false).reason).toBe('ENDED'));
  it('E3 a vote in the final grace window is rejected (anti-front-running)', () => {
    const justBeforeEnd = 1000 + 7200 - (VOTE_GRACE_PERIOD_MIN * 60) + 10;
    expect(authorizeVote(T(justBeforeEnd), elig, false).reason).toBe('GRACE_CLOSED');
  });
  it('E4 a well-timed vote from an eligible voter is accepted', () => expect(authorizeVote(T(2000), elig, false).ok).toBe(true));
  it('E5 double-voting is rejected', () => expect(authorizeVote(T(2000), elig, true).reason).toBe('ALREADY_VOTED'));
  it('E6 an ineligible voter is rejected even when well-timed', () => expect(authorizeVote(T(2000), { ownsVault: false, guardianAllowsGovernance: true }, false).reason).toBe('INELIGIBLE'));
});

describe('Governance · F. Proposal lifecycle — quorum floor + timelock', () => {
  it('F1 voting period must be within [1h, 30d]', () => {
    expect(validVotingPeriod(30 * 60)).toBe(false);   // 30 min too short
    expect(validVotingPeriod(3600)).toBe(true);
    expect(validVotingPeriod(31 * 86400)).toBe(false); // 31 days too long
  });
  it('F2 quorum cannot be lowered below the absolute floor (no cascading reduction)', () => {
    expect(validQuorumChange(ABSOLUTE_MIN_QUORUM - 1)).toBe(false);
    expect(validQuorumChange(ABSOLUTE_MIN_QUORUM)).toBe(true);
  });
  it('F3 a passing, quorate, timelock-elapsed proposal executes via the timelock', () => {
    expect(authorizeExecute({ forVotes: 1000, againstVotes: 200, quorum: 500, totalWeightVoted: 1200, timelockElapsed: true, callerIsTimelock: true })).toEqual({ ok: true });
  });
  it('F4 a proposal below quorum cannot execute', () => {
    expect(authorizeExecute({ forVotes: 300, againstVotes: 0, quorum: 500, totalWeightVoted: 300, timelockElapsed: true, callerIsTimelock: true }).reason).toBe('BELOW_QUORUM');
  });
  it('F5 a failing proposal (against ≥ for) cannot execute', () => {
    expect(authorizeExecute({ forVotes: 400, againstVotes: 600, quorum: 500, totalWeightVoted: 1000, timelockElapsed: true, callerIsTimelock: true }).reason).toBe('NOT_PASSED');
  });
  it('F6 a proposal cannot execute before the timelock elapses', () => {
    expect(authorizeExecute({ forVotes: 1000, againstVotes: 0, quorum: 500, totalWeightVoted: 1000, timelockElapsed: false, callerIsTimelock: true }).reason).toBe('TIMELOCK_PENDING');
  });
  it('F7 only the timelock can execute (no direct execution path)', () => {
    expect(authorizeExecute({ forVotes: 1000, againstVotes: 0, quorum: 500, totalWeightVoted: 1000, timelockElapsed: true, callerIsTimelock: false }).reason).toBe('NOT_TIMELOCK');
  });
});
