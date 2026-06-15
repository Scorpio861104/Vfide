# Frontend Verification Campaign

The frontend counterpart to the contract capability campaigns: verify that each security-relevant capability is
not only sound on-chain but **honestly and usefully surfaced in the product** (Veritas Law). Where an audit found a
surface gap, this campaign builds the remediation directly into the repo.

## Item 1 — Key Separation UX (Campaign B MEDIUM finding) ✅ BUILT

**Finding addressed:** the Key Separation audit found the separation posture was invisible in the product — the
three-key model was explained nowhere, and the contract's weekly `RecoverySplitReminder` event +
`splitAdminFromActive` re-separation flow had no UI consumer (the event appeared only in the ABI). The OC-4
mitigation existed in the contracts but was unreachable for ordinary users.

**Built (all baked into the repo source):**
- `hooks/useKeyPosture.ts` — reads the live on-chain posture from the CardBoundVault (`admin`, `activeWallet`,
  `recoveryAdminUnseparated`) via wagmi `useReadContract`, resolving the vault through `useUserVault()`. Derives a
  `KeyPosture` (`separated` / `unseparated` / `actionNeeded` / `unknown`) and exposes the two re-separation actions
  the contract already supports: `transferAdmin` (general separation) and `splitAdminFromActive` (post-recovery,
  contract-gated on `recoveryAdminUnseparated`). Errors run through the repo's `parseContractError`.
- `components/security/KeyPostureCard.tsx` — a Security-Center card matching the existing design system
  (`analytics-card`, the emerald/amber/red status pattern, zinc typography, lucide icons). It:
  - shows the live posture with a SEPARATED (emerald) / UNSEPARATED (amber) / ACTION-NEEDED (red) status,
  - displays the actual settings and spending keys (truncated),
  - explains the three keys in plain language (a collapsible "How VFIDE keys work"),
  - surfaces the re-separation action — `splitAdminFromActive` when the vault is in the post-recovery unseparated
    state (the state the contract's reminder targets), or `transferAdmin` for the general unseparated default,
  - states honestly that guardians remain the recovery safety net, and shows an honest empty state when the
    connected account has no vault.
- Wired into `app/security-center/page.tsx` overview tab (after the status grid).

**Honesty (Veritas Law):** the card reports the ACTUAL on-chain configuration, never overstates protection (it
frames admin/spending separation precisely as "a stolen spending key cannot also change your guardians or limits",
not as blanket immunity), and is explicit that guardians are the recovery safety net.

**Verification:** typecheck 0 errors; ESLint clean on all new/changed files; `validate-frontend-ready.ts` passes
(✅ Frontend / API / DB layer ready; only warn-only unset env vars); no `middleware.ts` introduced (VFIDE security
lives in `proxy.ts`).

**Maps to the Campaign B remediation list:** remediation (1) security-center Key-Posture card → **done**;
remediation (3) surface the re-separation action → **done** (the action is now reachable in the card when the
contract flag is set). Remaining follow-up: remediation (2), an onboarding separation step offered (not forced) at
vault creation — a larger touch on the onboarding flow, tracked as the next frontend item.

## Item 2 — Onboarding separation step (Campaign B remediation 2) ✅ BUILT

**Finding addressed:** the Key Separation audit recommended an onboarding step that OFFERS (never forces) separation
at setup, so the unseparated default is a visible, explained choice rather than a silent one.

**Built (baked into the repo source):**
- `components/wizard/chapters/KeySeparationChapter.tsx` — a new, skippable setup-wizard chapter that introduces the
  three-key model, shows the live posture (reusing `useKeyPosture` — no logic duplication), and offers an OPTIONAL
  separate settings (admin) key via `transferAdmin`. Skipping is a first-class, consequence-free choice, and the
  copy points users to Security Center → Key Posture to do it anytime.
- Wired into the wizard machinery: added `keySeparation` to the `ChapterId` union, `CHAPTER_ORDER` (after
  `finalizeGuardians` — thematically grouped with the recovery the user just configured), and the `CHAPTERS`
  metadata; added the import + render case in `VaultSetupWizard.tsx`. The wizard's advance logic is dynamic
  (`CHAPTER_ORDER.indexOf(current) + 1`, `CHAPTER_ORDER.length`), so the chapter integrates without touching the
  state machine; it sits after the recovery gate, so that gate is unaffected.

**Honesty (Veritas Law):** most users start with one key, so the step is framed as optional and educational, not a
pressure to act; the benefit is stated precisely and guardians are named as the recovery safety net.

**Verification:** typecheck 0 (the exhaustive `ChapterId` switch confirms the render case is wired); ESLint clean;
`validate-frontend-ready.ts` passes; no `middleware.ts` introduced.

**Campaign B remediation list is now fully addressed:** (1) security-center card ✅, (2) onboarding step ✅,
(3) surface the re-separation action ✅. The Key Separation finding is remediated end-to-end in the product.

## Remaining frontend items (queued)
- Broader per-capability surface verification across the security-relevant pages.

## Item 3 — Recovery surface honesty verification ✅ CERTIFIED (+ one LOW tightening)

**Verified:** the live recovery UI (`app/guardians/**`, `app/vault/recover/**`) reads real on-chain recovery state
via `useVaultRecovery` (`pendingRotation`, approvals/threshold, challenge window) — no stubbing. The short-URL
pages (`recovery-status` / `recovery-challenge` / `recovery-sign`) redirect real users to the live routes in
production; their mock state renders only when an explicit `claimStatus` query param is present (Playwright E2E).
So by default no user ever sees fabricated recovery status — the surface is honest.

**LOW tightening applied:** the sample-status UI ships in the bundle gated only by the query param, so a crafted
link (`?claimStatus=approved`) could display a fake "approved" status. Added an unmistakable amber **"Preview view
— not your live recovery"** banner (with a link to the real status route) to `recovery-status` so the sample can't
be passed off as a live status. Additive only — the Playwright `data-testid` hooks are untouched. Verification:
typecheck 0, ESLint clean.

**Result:** recovery surface certified honest. Remaining frontend build targets are gated on direction (see the
Continuity-roadmap reconciliation — the next *system* build is the Continuity Lock definition, which needs intent).
