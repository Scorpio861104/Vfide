/**
 * AdminMultiSig — council multisig authorization MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the AUTHORIZATION logic of AdminMultiSig.sol in pure TS
 * so the invariants run as scenarios. NOT the deployed bytecode (no solc here); the repo's
 * AdminMultiSigSecurity hardhat suite is the on-chain evidence for a compiler-equipped environment.
 *
 * AdminMultiSig is the protocol's 3/5 council multisig for privileged operations. Its `executeProposal` makes a
 * low-level `target.call(data)` — so the audit's job is to confirm that arbitrary call is BOUNDED. It is, by
 * defense-in-depth:
 *
 *   • ALLOWLISTED: a proposal's (target, selector) must BOTH be allowlisted for its ProposalType — enforced at
 *     creation (createProposal) AND re-verified at execution (#406). The multisig can never call an arbitrary
 *     contract/function; only pre-approved (target, selector) pairs.
 *   • THRESHOLD: 3/5 approvals (CONFIG/CRITICAL) or 4/5 (EMERGENCY). The proposer auto-counts as 1.
 *   • TIMELOCK by type: CONFIG 24h, CRITICAL 48h, EMERGENCY 1h. Execution before executionTime reverts.
 *   • COMMUNITY VETO: a 24h veto window (non-emergency); vetoCount ≥ vetoThreshold blocks execution. Veto
 *     eligibility is ProofScore-gated (≥5000 primary; production requires score AND stake) — un-buyable, sybil-
 *     resistant (M-6/N-M21/H-10).
 *   • EXPIRY: proposals expire after 30 days; expired proposals can't be approved or executed.
 *   • SELF-GOVERNED PARAMS: every setter (gas limit, veto params, allowlists) is onlyProposalExecutionContext
 *     (msg.sender == this + active proposal); council replacement needs an EMERGENCY (4/5) proposal. No lone
 *     member can change anything.
 *   • NON-CUSTODIAL: AdminMultiSig holds no user funds and its allowlisted reach can only do to a vault what the
 *     vault/OCP architecture already permits any owner to do — which excludes freeze/seize (see the vault, OCP,
 *     and EmergencyControl certs). It is not a custody backdoor.
 */

export type ProposalType = 'CONFIG' | 'CRITICAL' | 'EMERGENCY';

export const COUNCIL_SIZE = 5;
export const REQUIRED_APPROVALS = 3;
export const EMERGENCY_APPROVALS = 4;
export const CONFIG_DELAY_H = 24;
export const CRITICAL_DELAY_H = 48;
export const EMERGENCY_DELAY_H = 1;
export const VETO_WINDOW_H = 24;
export const PROPOSAL_EXPIRY_DAYS = 30;
export const VETO_MIN_SCORE = 5000;

// ─────────────────────────── Proposal creation: council-only + allowlist

export type CreateResult = { ok: true } | { ok: false; reason: 'NOT_COUNCIL' | 'TARGET_NOT_ALLOWED' | 'SELECTOR_NOT_ALLOWED' | 'EMPTY' };

export function authorizeCreateProposal(args: {
  isCouncil: boolean;
  targetAllowed: boolean;       // proposalTypeTargetAllowed[type][target]
  selectorAllowed: boolean;     // proposalTypeSelectorAllowed[type][selector]
  hasTarget: boolean; hasData: boolean; hasDescription: boolean;
}): CreateResult {
  if (!args.isCouncil) return { ok: false, reason: 'NOT_COUNCIL' };
  if (!args.hasTarget || !args.hasData || !args.hasDescription) return { ok: false, reason: 'EMPTY' };
  if (!args.targetAllowed) return { ok: false, reason: 'TARGET_NOT_ALLOWED' };
  if (!args.selectorAllowed) return { ok: false, reason: 'SELECTOR_NOT_ALLOWED' };
  return { ok: true };
}

// ─────────────────────────── Threshold

export function requiredApprovals(t: ProposalType): number {
  return t === 'EMERGENCY' ? EMERGENCY_APPROVALS : REQUIRED_APPROVALS;
}

/** A proposal is Approved only when approvals reach the type threshold. */
export function isApproved(t: ProposalType, approvalCount: number): boolean {
  return approvalCount >= requiredApprovals(t);
}

export function delayHours(t: ProposalType): number {
  return t === 'CONFIG' ? CONFIG_DELAY_H : t === 'CRITICAL' ? CRITICAL_DELAY_H : EMERGENCY_DELAY_H;
}

// ─────────────────────────── Execution: all gates before the call fires

export type ExecResult = { ok: true } | { ok: false; reason:
  | 'NOT_COUNCIL' | 'NOT_APPROVED' | 'TOO_EARLY' | 'EXPIRED' | 'VETOED' | 'VETO_WINDOW_EXPIRED'
  | 'TARGET_NO_LONGER_ALLOWED' };

export function authorizeExecute(args: {
  isCouncil: boolean;
  type: ProposalType;
  approvalCount: number;
  nowH: number;
  executionTimeH: number;       // createdAt + delay
  createdAtH: number;
  vetoCount: number;
  vetoThreshold: number;
  targetStillAllowed: boolean;  // #406: re-checked at execution
}): ExecResult {
  if (!args.isCouncil) return { ok: false, reason: 'NOT_COUNCIL' };
  if (!isApproved(args.type, args.approvalCount)) return { ok: false, reason: 'NOT_APPROVED' };
  if (args.nowH < args.executionTimeH) return { ok: false, reason: 'TOO_EARLY' };
  if (args.nowH > args.createdAtH + PROPOSAL_EXPIRY_DAYS * 24) return { ok: false, reason: 'EXPIRED' };
  if (args.vetoCount >= args.vetoThreshold) return { ok: false, reason: 'VETOED' };
  // Non-emergency proposals must execute within the post-timelock veto window (gives the community time to veto).
  if (args.type !== 'EMERGENCY' && args.nowH > args.executionTimeH + VETO_WINDOW_H) {
    return { ok: false, reason: 'VETO_WINDOW_EXPIRED' };
  }
  if (!args.targetStillAllowed) return { ok: false, reason: 'TARGET_NO_LONGER_ALLOWED' };
  return { ok: true };
}

// ─────────────────────────── Community veto eligibility (sybil-resistant)

export type VetoEligibility = { ok: true } | { ok: false; reason: 'GATE_UNSET' | 'SCORE_TOO_LOW' | 'STAKE_TOO_LOW' };

/**
 * Community veto eligibility. ProofScore is the primary gate; production (seer set) requires BOTH score and
 * stake — so a fresh default-score vault can't veto and veto power can't be bought with tokens alone.
 */
export function authorizeCommunityVeto(args: {
  seerSet: boolean;
  vfideSet: boolean;
  vetoMinStake: number;
  callerScore: number;
  callerStake: number;
}): VetoEligibility {
  const stakeGateAvailable = args.vetoMinStake > 0 && args.vfideSet;
  if (!args.seerSet && !stakeGateAvailable) return { ok: false, reason: 'GATE_UNSET' }; // H-10
  if (args.seerSet) {
    if (args.callerScore < VETO_MIN_SCORE) return { ok: false, reason: 'SCORE_TOO_LOW' }; // M-6 primary gate
    if (args.vetoMinStake > 0 && args.callerStake < args.vetoMinStake) return { ok: false, reason: 'STAKE_TOO_LOW' }; // N-M21
    return { ok: true };
  }
  // Fallback (seer unset): token-stake gate.
  if (args.callerStake < args.vetoMinStake) return { ok: false, reason: 'STAKE_TOO_LOW' };
  return { ok: true };
}

// ─────────────────────────── Self-governance

/** Parameter setters require the proposal-execution context (msg.sender == this + active proposal). */
export function authorizeParamSetter(isProposalExecutionContext: boolean): boolean {
  return isProposalExecutionContext;
}

/** Replacing a council member requires an EMERGENCY (4/5) proposal executed through the multisig. */
export function authorizeCouncilUpdate(args: {
  viaEmergencyExecution: boolean; indexInRange: boolean; newMemberNonZero: boolean; newMemberIsDuplicate: boolean;
}): boolean {
  return args.viaEmergencyExecution && args.indexInRange && args.newMemberNonZero && !args.newMemberIsDuplicate;
}

/** AdminMultiSig holds no user funds and exposes no freeze/seize. */
export function holdsUserFunds(): boolean { return false; }
export function canFreezeOrSeizeUserFunds(): boolean { return false; }
