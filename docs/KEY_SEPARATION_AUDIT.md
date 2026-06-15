# Key Separation — Capability Campaign (Campaign B)

**Priority: HIGH · Origin: OC-4 (recovery-abort griefing is worst in the unseparated posture).**

The system SUPPORTS separating the three security domains (owner identity / admin / spending), but *supported* is
not the same as *required*, *verified*, or *understood*. This campaign certifies the separation POSTURE — across
both the contract mechanics and the frontend UX — and finds that the architecture's key compromise-mitigation
(separation) is **not operationalized in the product**. Model: `lib/audit/keySeparationModel.ts`; matrix:
`__tests__/audit/keySeparation.test.ts` (**16 scenarios; all pass; typecheck 0; full audit suite 654/27 green**).

## The campaign questions, answered

| Question | Answer |
|---|---|
| Is separation mandatory? | **No** — optional; the protocol never forces it (SEP-02). |
| What is the default? | **Unseparated** — at creation the deployer sets `admin == activeWallet == owner_` (SEP-01). |
| Can a user accidentally remain unseparated? | **Yes** — unseparated default + optional separation + no UX prompt (SEP-04, and the UX findings below). |
| Behavior after device loss? | All-keys loss (not attacker-controlled) → guardian recovery proceeds in any posture (EVT-03). |
| Behavior after recovery? | Recovery converges `admin == activeWallet` (`recoveryAdminUnseparated`); re-separation is needed afterward (RESEP-01). |
| Behavior during inheritance? | Posture-independent — guardian-initiated + owner-vetoable regardless (EVT-04). |

## Why the posture matters (security, ties to OC-4 / Campaign C)
The owner-identity key gates `abortRecoveryRotation`. In the **unseparated** posture (and the transient
post-recovery state), the owner identity collapses onto the **hot spending key** (EVT-05), so a spending-key
compromise lets the attacker abort recovery — the OC-4 asymmetric griefing deadlock (EVT-01, not recoverable). In
the **separated** posture, the owner identity is a distinct key, so a spending-key compromise **cannot** abort
recovery and is fully recoverable (EVT-02). **Separation is the architecture's own mitigation for OC-4.**

## Contract mechanics — separation IS supported and even reminded
- A user separates by moving admin to a distinct key (two-step `transferAdmin`/`acceptAdmin`) and/or rotating the
  spending key.
- After recovery, `splitAdminFromActive(newAdmin)` re-separates: admin-only, two-step, `newAdmin` must differ from
  `activeWallet`, valid only while `recoveryAdminUnseparated` (RESEP-02/03).
- The vault emits a **weekly `RecoverySplitReminder`** event (`_emitRecoverySplitReminder`) nudging the user to
  re-separate after a recovery.

So the contract layer is well-designed for separation. The gap is entirely in the product surface.

## Findings

### Finding (MEDIUM) — the separation posture is invisible in the product; the OC-4 mitigation is not operationalized
**Evidence (frontend audit):**
- The frontend does **not** explain the three-key model anywhere — `security-center` covers other topics; the only
  wallet-security guidance is generic "use a hardware wallet" copy (hardware-wallet / paper-wallet pages) (UX-01).
- Onboarding does **not** guide separation (UX-02).
- The `RecoverySplitReminderEmitted` event appears **only** in the ABI — no component, hook, or page consumes it,
  so the weekly re-separation nudge never reaches the user (UX-03).
- `splitAdminFromActive` (the re-separation action) and the `recoveryAdminUnseparated` state are **not exposed** in
  any UI — the flow is contract-only (UX-04).
**Consequence:** the unseparated default is "sticky" — users will overwhelmingly remain in the posture where a
spending-key compromise can grief recovery (OC-4). The architecture provides the mitigation (separation) but the
product never surfaces it, so the mitigation is effectively unavailable to ordinary users.
**Severity:** MEDIUM.

> **✅ REMEDIATION STATUS (Frontend Verification Campaign, item 1):** remediation (1) the security-center
> Key-Posture card and (3) surfacing the re-separation action are now BUILT into the repo
> (`hooks/useKeyPosture.ts`, `components/security/KeyPostureCard.tsx`, wired into the security-center
> overview). The posture is now visible, explained, and actionable. Remediation (2) the onboarding separation
> step is also BUILT (`components/wizard/chapters/KeySeparationChapter.tsx`, a skippable wizard chapter). All
> three remediations are now in the product. See `FRONTEND_VERIFICATION_CAMPAIGN.md`. No contract defect — the mechanics are sound. But a security control the user cannot see or
reach is not a control in practice. This is a Veritas-Law gap: the protection exists but the surface is silent.
**Recommended remediation (concrete, product — not auto-built here as it is a design decision):**
1. **Security-center "Key Posture" card** — read the on-chain state (is `admin == activeWallet`? is
   `recoveryAdminUnseparated` set?) and show SEPARATED / UNSEPARATED / ACTION-NEEDED with a one-line explanation of
   the three keys and why separation matters for recovery.
2. **Onboarding step** — after vault creation, offer (not force) separation: "Use a dedicated spending key; keep
   your owner/admin key cold." Make the default-unseparated state a visible, explained choice, not a silent one.
3. **Surface `RecoverySplitReminderEmitted`** — render a persistent post-recovery banner wiring to a UI action that
   calls `splitAdminFromActive`, so the contract's existing weekly nudge actually reaches the user.
The build is a product/design decision (placement, copy, on-chain reads), so it is documented as a precise
recommendation rather than manufactured here.

## Registry impact
Key Separation is certified at evidenced stages **1/6/10/11/12/13** (source + frontend traced, posture permissions,
full posture×event edge matrix, adversarial, cross-system: posture↔compromise↔recovery, grandmother property:
keeping your "everyday spending key" separate from your "ownership key" is what lets guardians rescue you if the
spending key is stolen). **Stage 2 remains `~`.** The MEDIUM UX finding is the campaign's headline: separation is
the OC-4 mitigation and it must be surfaced in the product to be real.
