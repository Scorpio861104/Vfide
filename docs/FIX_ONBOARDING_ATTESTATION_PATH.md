# Fix — Onboarding attested-step on-chain attestation path

## What this completes
Onboarding Finding B (farmable 500-XP completion reward) was fixed in two stages. Stage 1 (`onboardingVerification.ts`)
classified each step as `self-evident` / `db` / `attested` and made the on-chain-truth steps (vault deposit,
governance vote) **non-self-assertable** — a raw user PATCH was refused. That closed the farm but left a gap noted
as the remaining boundary: *attested steps had no automatic path*, so a legitimate user who genuinely deposited or
voted could only be credited by a manual admin attestation.

**This fix is that automatic path.** It reads the chain to confirm the action, giving real depositors/voters
automatic credit while keeping the farm closed — and it does so without ever falsely blocking a user when the
chain is momentarily unreadable.

## How it works
New module `lib/quests/onchainAttestation.ts` — a server-side viem reader with a **three-outcome contract**:

| Outcome | Meaning | Result |
|---|---|---|
| `confirmed` | the chain proves the action happened | step is granted |
| `not-found` | chain read OK, action absent | denied — **fail closed** (the farm defense) |
| `unavailable` | chain could not be read (RPC down / address unset) | denied but **retryable** — never a false "you didn't do this" |

The `not-found` vs `unavailable` distinction is the crux: closing the farm must never convert an infrastructure
hiccup into a false accusation that a legitimate user didn't act.

Reads used (all public views, no signer, no writes):
- **depositVault** → `VaultHub.vaultOf(user)` gives the user's vault; a non-zero vault holding a **positive VFIDE
  balance** confirms a real deposit (a vault that exists but holds nothing is "created, never funded" → not-found).
- **voteProposal** → `DAO.hasVotedAnyProposal(user)` is true once the user has cast any governance vote.

Chain + RPC selection mirrors `lib/indexer/service.ts` (same network the app indexes). The client is memoized.

## Route wiring
`app/api/quests/onboarding/route.ts` PATCH: when `verifyOnboardingStep` reports a step is attested-and-not-self-
assertable, the handler now calls `attestOnchainStep` **before** refusing:
- `confirmed` → fall through and credit the step (200).
- `not-found` → 422 (genuinely not done).
- `unavailable` → **503 with `retryable: true`** (chain unreadable; the client should surface "try again shortly",
  not "you didn't do this"). Admins still bypass via the existing trusted path.

## Tests
- `__tests__/quests/onchainAttestation.test.ts` — 9 scenarios covering all three outcomes for both steps
  (confirmed/granted, not-found/fail-closed, unavailable/retryable) plus malformed-address rejection.
- `__tests__/api/onboarding-quest-route.test.ts` — H3/H4 updated: attested steps now route through attestation
  (retryable 503 when the chain is unreadable in the test env) and remain non-self-assertable to a 200.
- Full suite green (465 across 19 suites); typecheck 0.

## Residual
- This grants on a *current-state* read (vault has balance now / has-ever-voted). That is the correct signal for an
  onboarding milestone. If a stricter "deposited at least once even if later withdrawn" semantic is ever wanted, an
  indexed Deposit-event check would be the upgrade — but current-state is simpler and sufficient here.
- Still benefits from compiled/on-chain verification of the underlying reads (shared boundary with the rest of the
  campaign), but the reads are plain public getters (`vaultOf`, `balanceOf`, `hasVotedAnyProposal`).
