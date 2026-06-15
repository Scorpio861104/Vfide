/**
 * Onboarding step verification — fixes Onboarding Finding B.
 *
 * The PATCH /api/quests/onboarding handler used to set `step_X = true` purely from a client-supplied step name,
 * with no check that the step actually happened. Completing all 10 steps flips `onboarding_completed`, which
 * unlocks a 500-XP reward — so the reward was farmable by simply PATCHing every step with zero real activity.
 *
 * This module gates each step on server-side EVIDENCE before the flag may be set. Each step is classified:
 *
 *   • 'self-evident'  — true by virtue of an authenticated session + existing user row (e.g. connectWallet).
 *                        Not harmfully farmable: you cannot fake being logged in as the target.
 *   • 'db'            — verifiable against a confirmed evidence table (friendships, endorsements, etc.).
 *                        We run an existence query; the flag is set only if real activity is found.
 *   • 'attested'      — the source of truth is ON-CHAIN (vault deposit, governance vote) and is not cheaply
 *                        DB-verifiable from this route. Rather than guess a query (which could falsely block a
 *                        legitimate user) or trust the client (the farm), these steps are NOT user-self-assertable
 *                        here: they may only be set by a trusted/admin attestation path. A raw user PATCH is
 *                        refused with a clear reason.
 *
 * Design priority: closing the farm must NOT come at the cost of falsely blocking a legitimate user. Every 'db'
 * query below targets columns verified against the migrations; uncertain/on-chain steps are 'attested' (refused
 * for self-assertion) rather than guessed.
 */

export type OnboardingStep =
  | 'connectWallet' | 'completeProfile' | 'firstTransaction' | 'addFriend' | 'joinGroup'
  | 'voteProposal' | 'earnBadge' | 'depositVault' | 'giveEndorsement' | 'completeQuest';

export type StepKind = 'self-evident' | 'db' | 'attested';

export interface StepVerification {
  kind: StepKind;
  /** For 'db' steps: a COUNT/EXISTS query returning a row with a truthy `ok` when evidence exists. $1 = userId. */
  evidenceSql?: string;
  /** Human-readable reason shown when verification fails. */
  notMetReason: string;
}

/**
 * Per-step verification spec. 'db' queries use only columns confirmed in the migrations:
 *   users(username, avatar_url, bio) · friendships(user_id, friend_id, status) · group_members(group_id, user_id)
 *   endorsements(from_user_id, to_user_id) · transactions(user_id, status) · user_badges(user_id) ·
 *   user_quests(user_id, completed)
 */
export const STEP_VERIFICATION: Record<OnboardingStep, StepVerification> = {
  connectWallet: {
    kind: 'self-evident',
    notMetReason: 'Wallet not connected.',
  },
  completeProfile: {
    kind: 'db',
    // Profile is "complete" when at least a username or bio has been set (avatar optional).
    evidenceSql: `SELECT (COALESCE(NULLIF(TRIM(username), ''), NULLIF(TRIM(bio), '')) IS NOT NULL) AS ok
                  FROM users WHERE id = $1`,
    notMetReason: 'Profile is not complete yet — set a username or bio first.',
  },
  firstTransaction: {
    kind: 'db',
    evidenceSql: `SELECT EXISTS (
                    SELECT 1 FROM transactions WHERE user_id = $1 AND status = 'confirmed'
                  ) AS ok`,
    notMetReason: 'No confirmed transaction found for this account yet.',
  },
  addFriend: {
    kind: 'db',
    evidenceSql: `SELECT EXISTS (
                    SELECT 1 FROM friendships WHERE user_id = $1 AND status = 'accepted'
                  ) AS ok`,
    notMetReason: 'No accepted friend connection found yet.',
  },
  joinGroup: {
    kind: 'db',
    evidenceSql: `SELECT EXISTS (SELECT 1 FROM group_members WHERE user_id = $1) AS ok`,
    notMetReason: 'You have not joined a group yet.',
  },
  voteProposal: {
    // Governance votes are on-chain (DAO.vote, ProofScore-weighted) — not cheaply DB-verifiable here.
    kind: 'attested',
    notMetReason: 'Governance votes are recorded on-chain and cannot be self-reported here.',
  },
  earnBadge: {
    kind: 'db',
    evidenceSql: `SELECT EXISTS (SELECT 1 FROM user_badges WHERE user_id = $1) AS ok`,
    notMetReason: 'You have not earned a badge yet.',
  },
  depositVault: {
    // Vault deposits are on-chain; the route cannot trust a client claim. Requires attestation.
    kind: 'attested',
    notMetReason: 'Vault deposits are recorded on-chain and cannot be self-reported here.',
  },
  giveEndorsement: {
    kind: 'db',
    evidenceSql: `SELECT EXISTS (SELECT 1 FROM endorsements WHERE from_user_id = $1) AS ok`,
    notMetReason: 'You have not given an endorsement yet.',
  },
  completeQuest: {
    kind: 'db',
    evidenceSql: `SELECT EXISTS (
                    SELECT 1 FROM user_quests WHERE user_id = $1 AND completed = true
                  ) AS ok`,
    notMetReason: 'You have not completed a quest yet.',
  },
};

export interface StepVerifyResult {
  verified: boolean;
  /** True when the caller is allowed to set this step via a user PATCH (self-evident or db-verified). */
  selfAssertable: boolean;
  reason: string;
}

/**
 * Decide whether a step may be marked complete for a user.
 *
 * @param step   the onboarding step
 * @param isAdmin whether the requester is an admin/system attestation path
 * @param runEvidence runs a 'db' step's evidenceSql with $1=userId and returns whether evidence exists
 */
export async function verifyOnboardingStep(
  step: OnboardingStep,
  isAdmin: boolean,
  runEvidence: (sql: string) => Promise<boolean>,
): Promise<StepVerifyResult> {
  const spec = STEP_VERIFICATION[step];

  // Admin/system attestation may set any step (this is the trusted path for on-chain-truth steps).
  if (isAdmin) return { verified: true, selfAssertable: true, reason: 'attested-by-admin' };

  switch (spec.kind) {
    case 'self-evident':
      return { verified: true, selfAssertable: true, reason: 'self-evident' };
    case 'attested':
      // On-chain truth, not self-assertable by a user PATCH — closes the farm without guessing a DB query.
      return { verified: false, selfAssertable: false, reason: spec.notMetReason };
    case 'db': {
      const ok = await runEvidence(spec.evidenceSql!);
      return ok
        ? { verified: true, selfAssertable: true, reason: 'evidence-found' }
        : { verified: false, selfAssertable: true, reason: spec.notMetReason };
    }
  }
}
