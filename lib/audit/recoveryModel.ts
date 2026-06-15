/**
 * Recovery & Continuity — recovery state-machine MODEL (audit artifact).
 *
 * HONESTY NOTE (same as Core Ownership): this models the AUTHORIZATION & STATE-MACHINE logic of
 * VaultRecoveryClaim.sol + the merchant business-continuity flow in pure TypeScript so the theft-resistance
 * invariants can be exercised as executing scenarios. It is NOT the deployed bytecode. The sandbox cannot
 * download solc to compile, so the contract's own 23+ hardhat tests (CardBoundVaultRecovery, VaultRecoveryClaim
 * bootstrap/timelocked, inheritance r1–r4/threats) are the on-chain evidence; this models the logic as read
 * from source so an adversarial matrix can prove the recovery flow admits no theft path.
 *
 * The central invariant: a legitimate owner who lost their key CAN recover, but an attacker — even one who
 * compromises a single guardian — CANNOT use recovery to steal a vault out from under a present owner.
 *
 * Modeled rules (line refs to contracts/VaultRecoveryClaim.sol):
 *  • initiateClaim: trustee-gated when trustees exist; per-(vault,initiator) 30-day cooldown after a challenge;
 *    claimant must not already own a vault.
 *  • guardianVote: only MATURE guardians; threshold from a SNAPSHOT of guardian count; one vote per guardian.
 *  • finalizeClaim: only GuardianApproved/Approved, only after challengeEndsAt + FINALIZATION_GRACE elapses.
 *  • challengeClaim: original owner OR proof-of-life wallet can cancel during the window → Rejected + cooldown.
 *  • no-guardian vaults are UNRECOVERABLE (verifier path disabled) — ties to Onboarding Finding A.
 */

export type Actor = 'claimant' | 'guardian' | 'matureGuardian' | 'trustee' | 'originalOwner' | 'polWallet' | 'attacker';
export type ClaimStatus = 'None' | 'Pending' | 'GuardianApproved' | 'Approved' | 'Executed' | 'Rejected' | 'Expired';

export const CHALLENGE_PERIOD_DAYS = 14;
export const ACTIVE_VAULT_CHALLENGE_PERIOD_DAYS = 30; // active vault / guardian-incomplete → extended window
export const FINALIZATION_GRACE_DAYS = 1;
export const INITIATOR_COOLDOWN_DAYS = 30;
export const GUARDIAN_MATURITY_DAYS = 7;

/** Majority threshold (VaultRecoveryClaim._calculateRequiredApprovals). */
export function requiredApprovals(guardianCount: number): number {
  if (guardianCount <= 0) return 0;
  if (guardianCount === 1) return 1;
  if (guardianCount === 2) return 2;
  if (guardianCount === 3) return 2;
  if (guardianCount === 4) return 3;
  if (guardianCount === 5) return 3;
  return Math.floor(guardianCount / 2) + 1;
}

/** A vault with no guardians cannot be recovered (guardian path impossible; verifier path disabled). */
export function vaultIsRecoverable(guardianCount: number): boolean {
  return guardianCount >= 1;
}

export interface VaultRecoveryConfig {
  guardianCount: number;
  trusteeCount: number;
  matureGuardians: number;   // guardians past the 7-day maturity
  guardianSetupComplete: boolean;
}

export type InitiateResult = { ok: true } | { ok: false; reason: 'INVALID_VAULT' | 'NOT_TRUSTEE' | 'COOLDOWN_ACTIVE' | 'CLAIMANT_HAS_VAULT' | 'CLAIM_EXISTS' };

/** Models initiateClaim's gates. */
export function authorizeInitiate(args: {
  caller: Actor; vaultExists: boolean; cfg: VaultRecoveryConfig;
  callerIsTrustee: boolean; callerOnCooldown: boolean; claimantOwnsVault: boolean; activeClaimExists: boolean;
}): InitiateResult {
  if (!args.vaultExists) return { ok: false, reason: 'INVALID_VAULT' };
  if (args.activeClaimExists) return { ok: false, reason: 'CLAIM_EXISTS' };
  // trustee-gating: if the vault has trustees, only a trustee may initiate; if none, anyone may (pre-R8 path)
  if (args.cfg.trusteeCount > 0 && !args.callerIsTrustee) return { ok: false, reason: 'NOT_TRUSTEE' };
  if (args.callerOnCooldown) return { ok: false, reason: 'COOLDOWN_ACTIVE' };
  if (args.claimantOwnsVault) return { ok: false, reason: 'CLAIMANT_HAS_VAULT' };
  return { ok: true };
}

export type VoteResult = { ok: true; approvals: number; reachedThreshold: boolean } | { ok: false; reason: 'NOT_PENDING' | 'EXPIRED' | 'ALREADY_VOTED' | 'NOT_GUARDIAN' | 'NOT_MATURE' };

/** Models guardianVote: only mature guardians, one vote each, threshold from snapshot. */
export function castGuardianVote(args: {
  status: ClaimStatus; expired: boolean; voterIsGuardian: boolean; voterIsMature: boolean;
  alreadyVoted: boolean; approve: boolean; priorApprovals: number; guardianCountSnapshot: number;
}): VoteResult {
  if (args.status !== 'Pending') return { ok: false, reason: 'NOT_PENDING' };
  if (args.expired) return { ok: false, reason: 'EXPIRED' };
  if (args.alreadyVoted) return { ok: false, reason: 'ALREADY_VOTED' };
  if (!args.voterIsGuardian) return { ok: false, reason: 'NOT_GUARDIAN' };
  if (!args.voterIsMature) return { ok: false, reason: 'NOT_MATURE' };
  const approvals = args.priorApprovals + (args.approve ? 1 : 0);
  return { ok: true, approvals, reachedThreshold: approvals >= requiredApprovals(args.guardianCountSnapshot) };
}

/** The challenge window depends on activity / guardian-completeness (F-54): active or incomplete → 30 days. */
export function challengeWindowDays(activeWithin30Days: boolean, guardianSetupComplete: boolean): number {
  if (activeWithin30Days || !guardianSetupComplete) return ACTIVE_VAULT_CHALLENGE_PERIOD_DAYS;
  return CHALLENGE_PERIOD_DAYS;
}

export type FinalizeResult = { ok: true } | { ok: false; reason: 'NOT_APPROVED' | 'EXPIRED' | 'CHALLENGE_ACTIVE' };

/** Models finalizeClaim: must be guardian-approved AND past challengeEndsAt + grace. */
export function authorizeFinalize(args: { status: ClaimStatus; nowDay: number; challengeEndsDay: number; expiresDay: number }): FinalizeResult {
  if (args.status !== 'GuardianApproved' && args.status !== 'Approved') return { ok: false, reason: 'NOT_APPROVED' };
  if (args.nowDay > args.expiresDay) return { ok: false, reason: 'EXPIRED' };
  if (args.nowDay < args.challengeEndsDay + FINALIZATION_GRACE_DAYS) return { ok: false, reason: 'CHALLENGE_ACTIVE' };
  return { ok: true };
}

export type ChallengeResult = { ok: true; nextStatus: 'Rejected'; initiatorCooldownDays: number } | { ok: false; reason: 'NO_ACTIVE_CLAIM' | 'NOT_OWNER_OR_POL' | 'WINDOW_ENDED' };

/** Models challengeClaim: original owner OR proof-of-life wallet, within the window → reject + cooldown. */
export function authorizeChallenge(args: { status: ClaimStatus; caller: Actor; isOriginalOwner: boolean; isPolWallet: boolean; nowDay: number; challengeEndsDay: number }): ChallengeResult {
  if (['None', 'Executed', 'Rejected', 'Expired'].includes(args.status)) return { ok: false, reason: 'NO_ACTIVE_CLAIM' };
  if (!args.isOriginalOwner && !args.isPolWallet) return { ok: false, reason: 'NOT_OWNER_OR_POL' };
  if (args.nowDay > args.challengeEndsDay + FINALIZATION_GRACE_DAYS) return { ok: false, reason: 'WINDOW_ENDED' };
  return { ok: true, nextStatus: 'Rejected', initiatorCooldownDays: INITIATOR_COOLDOWN_DAYS };
}

// ─────────────────────────── Merchant business continuity (off-chain succession)

export type TransferKind = 'voluntary' | 'emergency';
export type TransferStatus = 'pending' | 'accepted' | 'executed' | 'vetoed';

export interface SuccessionState { successorRecorded: string | null; }

export type SuccessionResult = { ok: true } | { ok: false; reason: 'NO_SUCCESSOR' | 'NOT_RECORDED_SUCCESSOR' | 'NOT_ACCEPTED' | 'VETO_WINDOW_ACTIVE' };

/** Voluntary: successor must be the recorded one AND must accept before execute. */
export function authorizeVoluntaryExecute(s: SuccessionState, toAddress: string, accepted: boolean): SuccessionResult {
  if (!s.successorRecorded) return { ok: false, reason: 'NO_SUCCESSOR' };
  if (toAddress.toLowerCase() !== s.successorRecorded.toLowerCase()) return { ok: false, reason: 'NOT_RECORDED_SUCCESSOR' };
  if (!accepted) return { ok: false, reason: 'NOT_ACCEPTED' };
  return { ok: true };
}

/** Emergency: 7-day veto window must elapse; only a recorded successor/operator can request. */
export function authorizeEmergencyExecute(s: SuccessionState, requesterIsRecorded: boolean, vetoWindowElapsed: boolean): SuccessionResult {
  if (!s.successorRecorded) return { ok: false, reason: 'NO_SUCCESSOR' };
  if (!requesterIsRecorded) return { ok: false, reason: 'NOT_RECORDED_SUCCESSOR' };
  if (!vetoWindowElapsed) return { ok: false, reason: 'VETO_WINDOW_ACTIVE' };
  return { ok: true };
}
