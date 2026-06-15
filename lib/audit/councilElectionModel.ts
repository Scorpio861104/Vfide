/**
 * CouncilElection — election authorization MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the election's voting / seating / term-limit logic in
 * pure TS so the invariants run as scenarios. NOT the deployed bytecode (no solc here); the repo's
 * CouncilElectionVoting hardhat suite is the on-chain evidence for a compiler-equipped environment.
 *
 * CouncilElection fills the council seats that AdminMultiSig uses and the DAO's quorum-sync references. The audit
 * confirms seats can't be bought, sybils can't swing them, only genuine winners are seated, and members can't
 * entrench — all while the contract is non-custodial by construction:
 *
 *   • SCORE-WEIGHTED, NOT TOKEN-WEIGHTED: vote weight = seer.getScoreAt(voter, electionStartAt) — a ProofScore
 *     snapshot frozen at ELECTION-START time. Tokens buy zero votes; pumping score after the election opens
 *     gains nothing.
 *   • ELIGIBILITY: both candidate and voter must clear minCouncilScore at the snapshot — fresh default-score
 *     vaults can't vote or run, so sybil swarms gain no weight.
 *   • NO DOUBLE-VOTE: _hasVoted[epoch][voter] blocks a second vote; voting only within [start, end).
 *   • ONLY WINNERS SEATED: a proposed slate must consist of the actual top-voted candidates
 *     (_isTopVotedCandidate) AND each must be eligible at the snapshot — an arbitrary set cannot be seated
 *     (CE_NotTopVotedCandidate).
 *   • SEATING IS TIMELOCKED: a proposed council becomes pending and applies only after COUNCIL_APPOINT_DELAY
 *     (72h).
 *   • TERM LIMITS (anti-entrenchment): FIXED_MAX_CONSECUTIVE_TERMS = 1 consecutive term, FIXED_TERM = 365d, with
 *     a 365d re-election cooldown — exceeding the limit reverts CE_TermLimitReached.
 *   • CAPTURE-RESISTANT REMOVAL: refreshCouncil is permissionless and must check ALL current members (#503) — the
 *     DAO cannot selectively purge a member; only members who fall below score are removed.
 *   • DAO-GOVERNED PARAMS: startElection / setParams / setTermLimits are onlyDAO — i.e. they route through the
 *     certified DAO → timelock path, not a rogue admin.
 *   • NON-CUSTODIAL BY CONSTRUCTION: no value transfers anywhere (ReentrancyGuard intentionally omitted).
 */

export const MIN_COUNCIL_SIZE = 1;
export const MAX_COUNCIL_SIZE = 21;
export const FIXED_MAX_CONSECUTIVE_TERMS = 1;
export const FIXED_TERM_DAYS = 365;
export const FIXED_REELECTION_COOLDOWN_DAYS = 365;
export const COUNCIL_APPOINT_DELAY_H = 72;

// ─────────────────────────── Vote weight (un-buyable, snapshot-frozen)

/** Vote weight is the ProofScore snapshot at election-start time — NOT token balance, NOT live score. */
export function voteWeight(args: {
  scoreAtElectionStart: number; tokensHeld?: number; scoreAfterStart?: number;
}): number {
  return Math.max(0, args.scoreAtElectionStart); // tokensHeld / scoreAfterStart are ignored by construction
}

// ─────────────────────────── Vote casting guards

export type VoteResult = { ok: true } | { ok: false; reason:
  | 'NO_ACTIVE_ELECTION' | 'CANDIDATE_NOT_ELIGIBLE' | 'VOTER_NOT_ELIGIBLE' | 'ALREADY_VOTED' };

export function authorizeVote(args: {
  electionStarted: boolean; nowH: number; startH: number; endH: number;
  isCandidate: boolean; candidateEligible: boolean; voterEligible: boolean; hasVoted: boolean;
}): VoteResult {
  if (!args.electionStarted || args.nowH < args.startH || args.nowH >= args.endH) {
    return { ok: false, reason: 'NO_ACTIVE_ELECTION' };
  }
  if (!args.isCandidate || !args.candidateEligible) return { ok: false, reason: 'CANDIDATE_NOT_ELIGIBLE' };
  if (!args.voterEligible) return { ok: false, reason: 'VOTER_NOT_ELIGIBLE' };
  if (args.hasVoted) return { ok: false, reason: 'ALREADY_VOTED' };
  return { ok: true };
}

/** Eligibility: score (at the snapshot) must clear minCouncilScore. */
export function eligibleAtSnapshot(scoreAtSnapshot: number, minCouncilScore: number): boolean {
  return scoreAtSnapshot >= minCouncilScore;
}

// ─────────────────────────── Slate proposal — only genuine winners

export type ProposeResult = { ok: true } | { ok: false; reason:
  | 'BAD_SIZE' | 'MEMBER_NOT_ELIGIBLE' | 'NOT_TOP_VOTED' };

/**
 * A proposed council slate must be: a valid size, every member eligible at the snapshot, and every member an
 * actual top-voted candidate. An arbitrary set cannot be seated.
 */
export function authorizeProposeCouncil(args: {
  size: number; allEligible: boolean; allTopVoted: boolean;
}): ProposeResult {
  if (args.size < MIN_COUNCIL_SIZE || args.size > MAX_COUNCIL_SIZE) return { ok: false, reason: 'BAD_SIZE' };
  if (!args.allEligible) return { ok: false, reason: 'MEMBER_NOT_ELIGIBLE' };
  if (!args.allTopVoted) return { ok: false, reason: 'NOT_TOP_VOTED' };
  return { ok: true };
}

/** A pending council applies only after the 72h appoint delay. */
export function canApplyCouncil(args: { hasPending: boolean; nowH: number; validFromH: number }): boolean {
  return args.hasPending && args.nowH >= args.validFromH;
}

// ─────────────────────────── Term limits (anti-entrenchment)

export type SeatResult = { ok: true } | { ok: false; reason: 'NOT_CANDIDATE' | 'NOT_ELIGIBLE' | 'DUPLICATE' | 'TERM_LIMIT' };

/**
 * Seat a member: must be a candidate, eligible at snapshot, not a duplicate, and within the consecutive-term
 * limit. `consecutiveTermsServed` already includes any prior consecutive terms.
 */
export function authorizeSeatMember(args: {
  isCandidate: boolean; eligible: boolean; isDuplicate: boolean;
  consecutiveTermsServed: number; maxConsecutiveTerms: number; isConsecutive: boolean;
}): SeatResult {
  if (!args.isCandidate) return { ok: false, reason: 'NOT_CANDIDATE' };
  if (!args.eligible) return { ok: false, reason: 'NOT_ELIGIBLE' };
  if (args.isDuplicate) return { ok: false, reason: 'DUPLICATE' };
  // A consecutive re-seat beyond the limit is rejected.
  if (args.isConsecutive && args.consecutiveTermsServed >= args.maxConsecutiveTerms) {
    return { ok: false, reason: 'TERM_LIMIT' };
  }
  return { ok: true };
}

// ─────────────────────────── Capture-resistant removal

/** refreshCouncil is permissionless but must include ALL current members — the DAO can't selectively purge. */
export function authorizeRefresh(args: { providedCount: number; currentCount: number; allAreMembers: boolean }): boolean {
  return args.providedCount === args.currentCount && args.allAreMembers;
}

/** A member is removed by refresh ONLY if they fell below the current-term eligibility score. */
export function refreshRemovesMember(eligibleForCurrentTerm: boolean): boolean {
  return !eligibleForCurrentTerm;
}

// ─────────────────────────── DAO-governed params

export type Caller = 'dao' | 'admin' | 'other';
/** Election lifecycle/params (startElection, setParams, setTermLimits) are DAO-only. */
export function authorizeElectionAdmin(caller: Caller): boolean {
  return caller === 'dao';
}

export function holdsUserFunds(): boolean { return false; }
export function canFreezeOrSeizeUserFunds(): boolean { return false; }
