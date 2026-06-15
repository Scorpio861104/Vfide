# Onboarding — Certification Report

Second system outside Commerce through the gate discipline; per the systems tracker's adoption-weighting, the
front door every new user enters through. For a protocol whose mission is the financially-excluded, this is
where a perfect vault and a perfect marketplace either reach a real person or don't.

**Verdict up front:** Onboarding is **⚠️ CERTIFIED WITH KNOWN BOUNDARIES.** The safety setup is genuinely
well-built and correctly wired — better than my first read suggested — but the audit surfaced **two real
findings** that are worth fixing, plus a coherence observation. None is catastrophic; all are honest.

## The reading correction (why "read everything" mattered here)
My first pass read the three lightweight progress trackers (`lib/onboarding.ts` feature tour;
`OnboardingFlow.tsx` defaultSteps; `OnboardingContext.tsx` buyer/seller steps) and they contain **no guardian,
recovery, or inheritance step** — which looked like a severe gap against the landing page's promise of
"guardians, recovery, inheritance from day one." Reading further corrected that: there is a dedicated
**`VaultSetupWizard`** (`components/wizard/`) whose chapters are **Welcome → CreateVault → SpendLimits →
Guardians → FinalizeGuardians (recovery) → MerchantApproval → ProofScore → Done**, auto-launched for connected
users via `WizardMount` (mounted in `WalletClientLayout`). So vault creation, guardians, AND recovery setup all
exist, are mounted, reachable, and the chapter copy is genuinely good for a non-technical user. The promise is
backed by real code. The "guardians are missing" conclusion would have been **wrong** — only the actual source
settled it, consistent with the pattern across this whole campaign.

## Finding A (safety) — guardian & recovery setup are SKIPPABLE, so an unprotected vault is reachable
`components/wizard/useWizardState.tsx` states the design: **"Vault creation is the only required chapter; all
others are skippable."** `REQUIRED_CHAPTERS = ['createVault']`; `guardians` and `finalizeGuardians` (recovery)
are `required: false`. Combined with the fact (established in the Core Ownership audit) that a vault with no
guardians is operational but emits `GuardianSetupIncomplete`, and that recovery/inheritance need guardians +
proof-of-life to function, this means:

> A new user can complete the wizard — and is even guided to **deposit funds** (the `depositVault` quest step) —
> while having **skipped guardians and recovery**, ending in a **funded but unprotected vault**: the exact
> `GuardianSetupIncomplete` state, and a state the landing page's "continuity from day one" framing implies has
> been handled.

This is demonstrable (matrix C1–C5): `wizardComplete` returns true for a vault with zero guardians, while
`vaultIsProtected` returns false for it. **Severity: medium.** The setup is offered prominently and the recovery
chapter is well-written, so this is "easy to skip a safety step and not realize you're exposed," not "the
protection doesn't exist." **Recommended fix (modeled, not imposed):** `safeCompletionGate` — don't report a
user as fully "set up / protected" unless the vault is actually protected OR they made an explicit, informed
choice to defer (`DEFERRED_WITH_ACK`), so the UI warns (`COMPLETE_BUT_UNPROTECTED`) instead of implying "all
set." One guardian is enough to begin protection (G3) — a deliberately low barrier for a vulnerable user.

## Finding B (anti-gaming) — quest onboarding steps are self-asserted, so rewards are farmable
`app/api/quests/onboarding/route.ts` PATCH marks any step (`firstTransaction`, `voteProposal`, `depositVault`,
…) complete **on the authenticated user's say-so** — authorization is enforced (you can only update your own
record, H3), but **authenticity is not** (no check that the transaction/vote/deposit actually happened). When
all 10 steps are asserted, onboarding is marked complete and a **500-XP + VFIDE reward** is claimable. So the
reward is **farmable** by calling PATCH ten times. Demonstrated on the real route path (H1–H2). **Severity:
low–medium** (testnet, modest reward), but it undermines onboarding metrics and the reward's meaning.
**Recommended fix (modeled):** `markStepVerified` — a step completes only when the underlying action is verified
against real on-chain/DB state (the route already has the user context to do per-step verification).

## Coherence observation (not a defect) — four parallel onboarding surfaces
There are **four** onboarding surfaces with different step sets: the `VaultSetupWizard` (safety), the
`lib/onboarding.ts` zustand feature tour, the `OnboardingFlow` checklist, and the `OnboardingContext`
buyer/seller tracker. They don't reference each other. This is a maintainability/coherence risk (a user could
see inconsistent "progress" across surfaces), not a safety issue — worth consolidating, noted for the record.

## The Scenario Matrix — 37 executing scenarios
**Honesty (as throughout):** the model (`lib/audit/onboardingModel.ts`) is pure logic extracted from source —
React/SQL is not executed; the route test uses a mocked DB. All pass (after one test-syntax fix, no logic bug).
- **Model — 32 scenarios** (`__tests__/audit/onboardingModel.test.ts`): A. wizard progression (incl. guardians
  ordered before recovery); B. required-chapter gating (createVault can't be skipped; others can); **C. the
  safety gap — complete-but-unprotected is reachable**; D. the recommended stronger gate (PROTECTED /
  COMPLETE_BUT_UNPROTECTED / DEFERRED_WITH_ACK); E. buyer/seller progress; **F. quest anti-gaming (self-assert
  vs verified)**; G. Grandmother (a safe path exists; the unsafe path is *detectable* so the UI can warn).
- **Route — 5 scenarios** (`__tests__/api/onboarding-quest-route.test.ts`): **self-assertion accepted without
  proof (H1–H2)**; authorization enforced (H3); invalid step / bad address rejected (H4–H5).

Full regression green; typecheck 0; nav 0.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build/Read | ✅ all four onboarding surfaces + the VaultSetupWizard chapters mapped |
| Functional | ✅ wizard progression, buyer/seller progress, quest completion modeled |
| Edge-Case | ✅ required-vs-skippable gating, dismissal, partial progress |
| Adversarial | ⚠️ two findings surfaced: skippable safety setup (A), self-asserted rewards (B) |
| Integration | ✅ wizard is mounted (WizardMount in WalletClientLayout), auto-launches; vault auto-created on connect; ties to Core Ownership's guardian/recovery model |
| Grandmother | ✅ a safe setup path exists and is well-written; ⚠️ but it's skippable and the "all set" state doesn't distinguish protected from unprotected |
| **Onboarding** | ⚠️ **CERTIFIED WITH KNOWN BOUNDARIES (findings A & B documented + fixes modeled)** |

## Residual honesty notes
- The safety setup is real and mounted — this is **not** a "guardians are missing" finding. The finding is that
  guardians/recovery are **skippable** and completion doesn't surface the protected/unprotected distinction.
- Findings A & B come with **modeled** fixes (`safeCompletionGate`, `markStepVerified`), not shipped code
  changes — I flagged rather than silently rewrote the flows, since changing required-chapter semantics and
  adding per-step verification are product decisions with UX and reward-economy implications you should own.
- "Verified" here = source-read + pure-logic/mocked-DB execution, not a running app or live DB. A full pass
  should exercise the actual wizard React flow and the quest SQL against a real DB.
- The **education** surface (`app/seer-academy`) and **first-recovery rehearsal** (does a user ever practice a
  recovery before needing one?) were noted but not deeply audited — candidates for a follow-up, since "first
  recovery" is in the taxonomy and is high-stakes.

## Tracker impact
Onboarding moves 🔴 → ⚠️ (Certified With Known Boundaries). Next per the tracker: **Recovery & Continuity**
(mature, prior-security-audited, not yet gate-certified) — which also closes the loop on the guardian/recovery
machinery this audit depends on.
