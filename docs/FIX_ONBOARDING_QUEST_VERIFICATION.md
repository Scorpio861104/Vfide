# Fix — Onboarding quest steps are verified, not self-asserted (Onboarding Finding B)

## Why
`PATCH /api/quests/onboarding` set `step_X = true` purely from a client-supplied step name, with **no check that
the step actually happened**. Completing all 10 steps flips `onboarding_completed`, which unlocks a **500-XP**
completion reward (claimable via `POST`). So the reward was **farmable**: a user could PATCH all 10 steps with
zero real activity and claim the XP. Low-to-medium severity (gamification integrity, not funds), but a real
exploit of the rewards economy.

## What changed
- **New `lib/quests/onboardingVerification.ts`** — a per-step verification spec classifying each of the 10 steps:
  - **`self-evident`** (`connectWallet`) — true by virtue of an authenticated session + existing user row; not
    harmfully farmable (you cannot fake being logged in as the target).
  - **`db`** (`completeProfile`, `firstTransaction`, `addFriend`, `joinGroup`, `earnBadge`, `giveEndorsement`,
    `completeQuest`) — verified against a confirmed evidence table with an existence query. The flag is set
    **only if real activity is found**.
  - **`attested`** (`depositVault`, `voteProposal`) — the source of truth is **on-chain** and not cheaply
    DB-verifiable from this route. Rather than guess a query (risking false-blocking a legitimate user) or trust
    the client (the farm), these are **not user-self-assertable**: they may only be set via a trusted/admin
    attestation path. A raw user PATCH is refused with a clear reason.
- **`app/api/quests/onboarding/route.ts`** — the PATCH handler now calls `verifyOnboardingStep` before setting
  the flag, inside the existing transaction. If the step isn't verified, it **ROLLBACKs and returns 422** with
  the reason; otherwise it proceeds exactly as before. Admins/system bypass (the trusted path for on-chain steps).

## Design priority: don't false-block legitimate users
Closing the farm must not break real onboarding. Every `db` evidence query targets **columns verified against
the migrations** (`users.username/bio`, `friendships(user_id,status='accepted')`, `group_members(user_id)`,
`endorsements(from_user_id)`, `transactions(user_id,status='confirmed')`, `user_badges(user_id)`,
`user_quests(user_id,completed)`). Steps whose evidence table/columns were **not** confirmed, or that are
on-chain, are `attested` (refused for self-assertion) rather than guessed — the safe default.

## What did NOT change
- The reward amount, the completion logic, and the GET/POST(claim) flows are unchanged. POST still requires
  `onboarding_completed = true` — but that flag can now only be reached through verified steps.
- No contract changes.

## Verification
- `tsc --noEmit`: **0 errors**.
- Quest route test (`__tests__/api/onboarding-quest-route.test.ts`) rewritten to assert the FIX (9 scenarios,
  all pass): self-asserted `firstTransaction` with no tx → **422** (was 200); with a confirmed tx → **200**
  (legitimate user not blocked); `depositVault`/`voteProposal` not self-assertable → **422**; `connectWallet`
  self-evident → 200; a genuinely-all-complete run flips completion; auth/validation still enforced.
- The audit matrices remain **255/255** green. (Note: 8 unrelated API tests — proxy/webhook-hardening/health —
  fail identically in the pre-fix base zip; they depend on a proxy/runtime env not present in this sandbox and
  are not touched by this change.)

## Follow-ups
- The two `attested` steps (`depositVault`, `voteProposal`) need a **trusted attestation path** wired (an admin/
  system endpoint or an on-chain indexer that sets them) so legitimate users can complete them without admin
  intervention. Until then they are credited only via the admin path. A future enhancement is a server-side
  `viem` read of vault deposits / DAO votes to make them `db`-style verifiable directly.
