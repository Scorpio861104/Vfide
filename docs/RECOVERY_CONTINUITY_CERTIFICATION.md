# Recovery & Continuity — Certification Report

Third system outside Commerce through the gate discipline. It closes the loop on the guardian/recovery
machinery that both the Core Ownership and Onboarding audits leaned on, and it answers the **mirror image** of
the Core Ownership question: that audit proved no one but the owner can *move* funds; recovery is the one
mechanism that can *change who the owner is*, so it is the highest-risk surface for **theft-by-recovery**.

**Central invariant tested:** a legitimate owner who lost their key CAN recover, but an attacker — even one who
compromises a single guardian — CANNOT use recovery to steal a vault out from under a present owner.

**Verdict up front:** the recovery + continuity design **holds at the source level** and is genuinely
well-hardened (the code documents specific attack vectors and their fixes: C-2, R-8, F-54, H-8). I am marking
it **⚠️ CERTIFIED WITH KNOWN BOUNDARIES** — the same compile boundary as Core Ownership, plus **one real
security-posture finding** (single-guardian recovery) and **one cross-audit consequence** worth stating
plainly.

> ⚠️ **Methodology boundary (same as Core Ownership):** the sandbox cannot download solc, so this is a
> **source-level audit + executable logic model** (42 scenarios), not an on-chain/compiled test. The repo
> carries the relevant hardhat suites (`VaultRecoveryClaim.bootstrap`, `VaultRecoveryClaim.timelocked`,
> `CardBoundVaultRecovery.r8`, `VaultRegistryRecoveryAliases`, inheritance r1–r4/threats) for a compiler-
> equipped environment. A compiled run remains the required next step.

## The recovery flow (and why it resists theft)
`VaultRecoveryClaim.sol` (1003 lines) implements seed-phrase-free recovery: lose wallet → new wallet → initiate
claim → **guardian verification (majority, e.g. 2-of-3)** + **time-lock challenge window** → ownership rotates
via `VaultHub.executeRecoveryRotation`. The theft-resistance rests on layered, verifiable gates:

- **Initiation is trustee-gated (R-8).** If the vault has trustees, only a trustee may initiate; if it has none,
  anyone may (the legacy fallback) — but **progression still requires guardian approvals regardless**, so the
  open-initiation case is not itself a theft path, only a (now-closed) griefing vector. A claimant who already
  owns a vault cannot claim another, and concurrent claims are blocked.
- **Guardian votes require MATURE guardians (7-day maturity).** An attacker cannot add themselves as a guardian
  and immediately vote a claim through. The threshold uses a **snapshot** of guardian count taken at the claim,
  so the count can't be manipulated mid-claim, and votes are de-duplicated.
- **Finalization only after the challenge window + grace.** `finalizeClaim` requires `GuardianApproved` status
  AND `block.timestamp >= challengeEndsAt + FINALIZATION_GRACE_PERIOD` (an extra day explicitly to defeat a
  mempool race). Ownership cannot rotate during the window.
- **The original owner — or their proof-of-life wallet — can always challenge** during the window, which
  rejects the claim and applies a 30-day per-(vault, initiator) cooldown (harassment defense that doesn't
  punish a user in a real emergency). The PoL wallet challenging is the unified "I'm alive" signal that also
  cancels a false inheritance (Wave 93/CID-2, marked DRAFT/uncompiled).
- **Active or under-protected vaults get the EXTENDED window (F-54):** any on-chain activity within 30 days —
  OR an incomplete guardian setup — forces a 30-day challenge window instead of 14, giving a real owner maximum
  reaction time exactly when they're most exposed.
- **The trusted-verifier path is explicitly DISABLED** (`verifierVote` reverts) — recovery proceeds only
  through the guardian-approved path, so there is no unguarded "community verification" backdoor.
- **H-8 fix:** ownership transfer uses `executeRecoveryRotation`, having removed an earlier `forceSetOwner`
  primitive — a more dangerous capability deliberately eliminated.

## Finding (security posture) — single-guardian recovery is a single point of failure
`_calculateRequiredApprovals(1) == 1`. A vault configured with exactly **one guardian** (and no trustees, so
anyone can initiate) reduces social recovery to: one colluding/compromised guardian approves an attacker's
claim, and then **only the challenge window** stands between the attacker and the vault. If the owner is also
absent (precisely the case recovery exists for), the attacker succeeds after the window. This is **not a bug** —
one guardian is a user's choice, the documented model is 2-of-3, and the challenge window + owner/PoL cancel
still protect a *present* owner — but it is a real weak configuration. **Recommendation:** require or strongly
steer users toward **≥2 guardians** (the threshold only becomes genuinely "social" at 2-of-3), and surface a
clear risk warning for single-guardian vaults. Severity: medium, conditional on user configuration.

## Cross-audit consequence — "no guardians" means UNRECOVERABLE (sharpens Onboarding Finding A)
Because the verifier path is disabled and the guardian path needs ≥1 mature guardian, **a vault with zero
guardians cannot be recovered at all.** This makes Onboarding's Finding A (guardians/recovery are skippable)
more pointed than "the vault shows a warning": a user who skips guardian setup during onboarding and later
loses their key has **no recovery path whatsoever** — permanent loss. The two audits compound: the onboarding
skippability finding and the recovery-requires-guardians fact together argue for making guardian setup
non-skippable (or at least loudly deferred-with-acknowledgment, per the `safeCompletionGate` model proposed in
the Onboarding cert).

## Business continuity (merchant succession) — mirrors the personal design, honestly
`app/api/merchant/business-transfer` + `app/api/merchant/continuity` implement merchant succession with the same
protective principles: a **voluntary** transfer requires the **pre-recorded** successor to **accept** before
execute (can't transfer to an arbitrary address); an **emergency** transfer enters a **7-day veto window** and
only a recorded successor/operator can request it; and a returning owner can reverse an executed emergency
transfer (Wave 89). The continuity endpoint reports readiness honestly ("someone can take over" met/unmet) with
no fake "continuity veneer" (the code explicitly retired an earlier veneer in Wave 44) — consistent with
Veritas Law.

## The Scenario Matrix — 42 executing scenarios
`__tests__/audit/recoveryModel.test.ts` over `lib/audit/recoveryModel.ts` (logic modeled from source):
- **A. Threshold (A1–A5):** 2-of-3, 3-of-5, majority; the single-guardian=1 edge flagged.
- **B. Initiation gating (B1–B7):** trustee-gated when trustees exist; open fallback otherwise; cooldown,
  claimant-already-owns, concurrent-claim, non-vault all blocked.
- **C. Guardian vote (C1–C7):** mature-only (attacker-added-self blocked), non-guardian blocked, double-vote
  blocked, threshold reached only at the 2nd approval, expired blocked.
- **D. Finalize (D1–D5):** can't finalize un-approved; **can't finalize during the challenge window or before
  grace**; can after; can't finalize expired.
- **E. Owner challenge (E1–E5):** original owner OR PoL wallet can cancel within the window; attacker cannot;
  window-ended and already-executed blocked.
- **F. No-guardian = unrecoverable (F1–F3):** the cross-audit consequence, demonstrated.
- **G. Extended window (G1–G3):** active OR incomplete-setup → 30 days; quiet fully-set-up → 14.
- **H. Business continuity (H1–H7):** recorded-successor-only, accept-before-execute, emergency veto window,
  recorded-requester-only.

Full regression green; typecheck 0.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build/Read | ✅ VaultRecoveryClaim + recovery hooks + business-continuity routes mapped |
| Functional | ✅ initiate → guardian-vote → challenge-window → finalize → rotate modeled |
| Edge-Case | ✅ maturity, snapshot threshold, cooldown, expiry, extended-window all modeled |
| Adversarial | ✅ no theft path for a present owner; ⚠️ single-guardian is a weak config (finding) |
| Integration | ✅ recovery pauses inheritance timers; PoL is the unified alive-signal; ties to Core Ownership rotation + Onboarding guardian setup |
| Grandmother | ✅ recovery without seed phrases, owner can always cancel; ⚠️ but only if guardians were set up |
| **Recovery & Continuity (source + logic model)** | ✅ **HOLDS** |
| **On-chain / compiled re-verification** | ⚠️ **not executed here (documented boundary)** |

## Residual honesty notes
- "Verified" = source-read + executable logic model, not on-chain execution (the standing campaign caveat,
  weightier for Solidity). A compiled hardhat run of these invariants against the real bytecode is the required
  next step.
- The **single-guardian** finding and the **no-guardian-unrecoverable** consequence are configuration/UX issues
  with **recommendations**, not shipped changes — guardian-count minimums and onboarding non-skippability are
  product decisions you should own (consistent with how I flagged rather than rewrote the Onboarding findings).
- **VaultRegistry recovery aliases** (search-by-recoveryId/email/phone) were confirmed to exist and feed
  `initiateClaim`, but the registry's own hashing/alias-collision properties were not audited to depth here —
  VaultRegistry is its own large contract (1058 lines) and a candidate for a dedicated pass.
- The **proof-of-life trigger** that starts an *inheritance* claim (vs. challenging a recovery) was covered in
  the Core Ownership audit (VETO→CLAIM windows, DAO-can't-initiate); the recovery-side PoL challenge modeled
  here is the complementary half. The Wave 93/CID-2 unified-PoL code is marked DRAFT/UNCOMPILED in-source — a
  flag to confirm it's live before relying on the unified signal.

## Tracker impact
Recovery & Continuity moves 🔴 → ⚠️. Next per the tracker ordering: **Trust** (ProofScore / Builder Record /
Merchant Trust / Transparency / Appeals) — partly de-risked already because Commerce Phase 5 exercised Merchant
Trust, Builder Record, and Transparency as discovery inputs, but ProofScore itself (the protocol's spine) has
not been gate-audited.
