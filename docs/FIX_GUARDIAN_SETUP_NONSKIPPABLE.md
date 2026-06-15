# Fix — Guardian setup is no longer silently skippable (Onboarding Finding A / Recovery cross-audit)

## Why
Two audit findings compounded into a real **permanent fund-loss** risk for the financially-excluded users VFIDE
serves:
- **Onboarding Finding A:** the vault-setup wizard treated only vault creation as required; the guardian and
  recovery chapters were freely skippable, and the final recap (`DoneChapter`) told *every* user "You are now
  protected" — even one with zero guardians.
- **Recovery & Continuity cross-audit:** a vault with **no guardians is unrecoverable** (the recovery flow needs
  ≥1 mature guardian; the verifier path is disabled). So a user who silently skipped guardian setup and later
  lost their key would lose their funds permanently — while having been told they were protected.

This fix closes that path **without violating the non-custodial ethos**: VFIDE still never forces a user to add
guardians (the choice remains theirs), but the choice can no longer be *silent or uninformed*. This implements
the `safeCompletionGate` design the Onboarding certification modeled (and whose logic the onboarding test matrix
already covers, D1–D3).

## What changed (all in `components/wizard/`)
- **`useWizardState.tsx`** — added `guardianRiskAcknowledged` to wizard state (persisted), plus derived
  `recoveryConfigured` (both guardian chapters genuinely completed) and `recoverySafe` (recovery configured OR
  risk acknowledged), and an `acknowledgeGuardianRisk()` action. The `skip()` reducer now **refuses to skip**
  `guardians`/`finalizeGuardians` until `recoverySafe` is true — a defense-in-depth backstop so the path to an
  uninformed, unprotected "done" simply does not exist.
- **`chapters/GuardiansChapter.tsx`** — the old "Continue anyway" button (which silently completed the chapter
  with zero guardians) is replaced. With <2 guardians, proceeding opens an explicit **risk-acknowledgment
  interstitial**: it states plainly that without a guardian a lost key means permanently unrecoverable funds,
  and requires a checked acknowledgment before deferring. The user can still go back and add a guardian.
- **`chapters/FinalizeGuardiansChapter.tsx`** — its skip paths now route through the same acknowledgment
  (`handleSkip` = acknowledge-then-skip), so leaving recovery unfinished is always an informed choice and never
  dead-ends against the state backstop.
- **`chapters/DoneChapter.tsx`** — the recap is now **honest**: it computes `recoveryConfigured` and only says
  "You are protected" when recovery is actually set up. A guardian-less user instead sees an amber **"Recovery
  is not set up"** banner explaining that no one (including VFIDE) can restore access, with a "Set up recovery
  now" link to `/guardians`.
- **`VaultSetupWizard.tsx`** — passes `acknowledgeGuardianRisk` into both guardian chapters.

## What did NOT change (deliberate)
- Guardians are **still not forced** — a user can decline and proceed after acknowledging the risk. This
  preserves user sovereignty (the non-custodial principle) while removing the *silent* skip and the *false*
  "protected" claim.
- No contract changes. This is a frontend/UX safety fix; the on-chain recovery machinery (already certified)
  is unchanged.

## Verification
- `tsc --noEmit`: **0 errors**.
- Full audit suite: **255/255 scenarios pass** (the onboarding matrix's `safeCompletionGate` cases D1–D3 model
  the exact logic now enforced in the wizard).
- Manual trace confirmed end-to-end: state ↔ both guardian chapters ↔ honest recap; the legacy "Continue
  anyway" and unconditional "You are now protected" strings are both gone.

## Follow-ups (unchanged from the audits)
- Recovery's **single-guardian = single-point-of-failure** finding still stands; consider steering toward ≥2
  guardians (the wizard already says 2+ to finalize). This fix addresses the *zero*-guardian permanent-loss
  case; the ≥2 recommendation is a separate, softer nudge.
- The quest-XP-farming finding (Onboarding Finding B, `markStepVerified`) is **not** addressed here — it remains
  a separate follow-up.
