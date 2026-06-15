/**
 * DAO.sol — governance-core authorization MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the DAO's voting / quorum / lifecycle logic in pure TS
 * so the invariants run as scenarios. NOT the deployed bytecode (no solc here); the repo's governance hardhat
 * suites (DAOTimelockExecutionFlow, DAOAdminTransferGuardrail, GovernanceHooks.generated) are the on-chain
 * evidence for a compiler-equipped environment.
 *
 * DAO.sol is the proposal/voting core that DAOTimelock executes for. The audit confirms votes can't be bought,
 * a minority can't pass a proposal, and execution can't bypass the (already-certified) timelock:
 *
 *   • SCORE-WEIGHTED, NOT TOKEN-WEIGHTED: vote weight = a FROZEN ProofScore snapshot taken at proposal-creation
 *     time (DAO-05) via seer.getScoreAt(voter, scoreDeadline). Tokens buy zero votes.
 *   • FLASH-LOAN PROOF: votingDelay = 1 day before voting can start; the snapshot predates the vote; so a
 *     flash-loan-then-vote (or score-pump-after-seeing-a-proposal) gains nothing.
 *   • ANTI-FRONT-RUN: votes in the final VOTE_GRACE_PERIOD (30 min) are rejected.
 *   • NO DOUBLE-VOTE: hasVoted[voter] blocks a second vote; unique voterCount tracked (FLOW-2).
 *   • QUORUM FLOOR: pass requires score-total >= minVotesRequired (default 5000) AND voterCount >=
 *     minParticipation AND forVotes > againstVotes. minVotesRequired can never go below ABSOLUTE_MIN_QUORUM
 *     (500, DAO-02) — quorum can't be cascaded down to near-zero.
 *   • SEER MUTUAL OVERSIGHT: a SeerGuardian-blocked proposal cannot be queued (DAO_ProposalFlagged).
 *   • TIMELOCK-ONLY EXECUTION: a passed proposal is QUEUED to the timelock (timelock.queueTxFromDAO); it never
 *     self-executes. markExecuted is onlyTimelock (DAO-07, no admin soft-veto); expired queued proposals can't
 *     execute (DAO-12). Param setters (setParams etc.) are onlyTimelock.
 *   • EMERGENCY PATHS BOUNDED: quorum rescue (after deadlock) can only reduce minVotes, >= 10% of current and
 *     >= ABSOLUTE_MIN_QUORUM; timelock replacement needs a long delay + secondary approval (DAO-03).
 *   • NON-CUSTODIAL: holds no user funds; a proposal's only reach is what the timelock is admin of, which the
 *     vault/OCP architecture bounds away from freeze/seize.
 */

export const VOTING_DELAY_H = 24;            // flash-loan protection: voting can't start for 1 day
export const MIN_VOTING_PERIOD_H = 1;
export const MAX_VOTING_PERIOD_H = 30 * 24;
export const VOTE_GRACE_PERIOD_MIN = 30;     // anti-front-run: voting closes early
export const MIN_VOTES_DEFAULT = 5000;
export const ABSOLUTE_MIN_QUORUM = 500;      // DAO-02: quorum can never go below this

// ─────────────────────────── Vote weight (un-buyable, snapshot-frozen)

/**
 * Vote weight is the ProofScore snapshot taken at proposal-creation time (DAO-05) — NOT live score, NOT token
 * balance. `tokensHeld` and `scoreAfterProposal` are inputs only to PROVE they don't matter.
 */
export function voteWeight(args: {
  scoreAtCreation: number;     // seer.getScoreAt(voter, scoreDeadline) — the frozen snapshot
  scoreAfterProposal?: number; // ignored
  tokensHeld?: number;         // ignored
  fatiguePenaltyPct?: number;  // governance fatigue: reduces weight if voting too frequently
}): number {
  const base = Math.max(0, args.scoreAtCreation);
  const penalty = Math.min(100, Math.max(0, args.fatiguePenaltyPct ?? 0));
  return Math.floor((base * (100 - penalty)) / 100);
}

// ─────────────────────────── Vote casting guards

export type VoteResult = { ok: true } | { ok: false; reason:
  | 'NOT_STARTED' | 'ENDED' | 'GRACE_CLOSED' | 'NOT_ELIGIBLE' | 'ALREADY_VOTED' | 'ALREADY_PROCESSED' };

export function authorizeCastVote(args: {
  nowH: number; startH: number; endH: number;
  eligible: boolean; hasVoted: boolean; processed: boolean;
}): VoteResult {
  if (args.nowH < args.startH) return { ok: false, reason: 'NOT_STARTED' };  // votingDelay (flash-loan protection)
  if (args.nowH >= args.endH) return { ok: false, reason: 'ENDED' };
  if (args.nowH >= args.endH - VOTE_GRACE_PERIOD_MIN / 60) return { ok: false, reason: 'GRACE_CLOSED' };
  if (!args.eligible) return { ok: false, reason: 'NOT_ELIGIBLE' };
  if (args.hasVoted) return { ok: false, reason: 'ALREADY_VOTED' };
  if (args.processed) return { ok: false, reason: 'ALREADY_PROCESSED' };
  return { ok: true };
}

// ─────────────────────────── Quorum + pass

/** A proposal passes only if score-total >= minVotes AND unique voters >= minParticipation AND for > against. */
export function proposalPasses(args: {
  forVotes: number; againstVotes: number; voterCount: number;
  minVotesRequired: number; minParticipation: number;
}): boolean {
  const total = args.forVotes + args.againstVotes;
  const quorumMet = total >= args.minVotesRequired && args.voterCount >= args.minParticipation;
  return quorumMet && args.forVotes > args.againstVotes;
}

// ─────────────────────────── Finalize → queue to timelock (never self-execute)

export type FinalizeResult =
  | { ok: true; action: 'QUEUED_TO_TIMELOCK' }
  | { ok: false; reason: 'SEER_BLOCKED' | 'NOT_PASSED' };

export function finalizeProposal(args: {
  passed: boolean; seerBlocked: boolean;
}): FinalizeResult {
  if (args.seerBlocked) return { ok: false, reason: 'SEER_BLOCKED' };  // mutual oversight
  if (!args.passed) return { ok: false, reason: 'NOT_PASSED' };
  // Passed proposals are QUEUED to the timelock — they do not execute here. There is no direct-execution path.
  return { ok: true, action: 'QUEUED_TO_TIMELOCK' };
}

export type Caller = 'admin' | 'timelock' | 'other';

/** markExecuted is timelock-only (DAO-07) — prevents an admin soft-veto and prevents faking execution. */
export function authorizeMarkExecuted(caller: Caller): boolean {
  return caller === 'timelock';
}

/** Param setters (setParams etc.) are timelock-only — quorum/period changes must themselves pass governance. */
export function authorizeParamSetter(caller: Caller): boolean {
  return caller === 'timelock';
}

// ─────────────────────────── Bounded emergency quorum rescue

export type RescueResult = { ok: true } | { ok: false; reason:
  | 'NOT_ADMIN' | 'NOT_A_REDUCTION' | 'BELOW_10_PERCENT' | 'BELOW_ABSOLUTE_MIN' };

/** Emergency quorum rescue (deadlock relief): admin may only REDUCE minVotes, >= 10% of current AND >= 500. */
export function authorizeQuorumRescue(args: {
  caller: Caller; currentMinVotes: number; newMinVotes: number;
}): RescueResult {
  if (args.caller !== 'admin') return { ok: false, reason: 'NOT_ADMIN' };
  if (args.newMinVotes >= args.currentMinVotes) return { ok: false, reason: 'NOT_A_REDUCTION' };
  if (args.newMinVotes < args.currentMinVotes / 10) return { ok: false, reason: 'BELOW_10_PERCENT' };
  if (args.newMinVotes < ABSOLUTE_MIN_QUORUM) return { ok: false, reason: 'BELOW_ABSOLUTE_MIN' };
  return { ok: true };
}

export function holdsUserFunds(): boolean { return false; }
export function canFreezeOrSeizeUserFunds(): boolean { return false; }
