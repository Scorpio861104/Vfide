# Wave 90 — Chain of Return & Next of Kin Truth Audit

A forensic, evidence-only audit. No code was changed. The question: after Wave 89 surfaced uncertainty about
two "institutions," where exactly are **Chain of Return** and **Next of Kin** in the repository today — fully
present, present under another name, partial, or missing? The answer is now established from the codebase's
own authoritative records (cleanup comments, the active-implementation switch, and the legacy contract).

**Bottom line up front:** Neither Chain of Return nor Next of Kin is a *missing* institution. Both are
**legacy names for flows that were deliberately replaced** by the CardBound system and whose responsibilities
are fully carried by current institutions. Outcome **B for both** (exists under different names), with a
documentation/naming cleanup recommended — not a build.

## Stage 1 — Historical trace (every exact reference, classified)
### Chain of Return — 10 references, all legacy/test/telemetry
| Location | Kind | What it tells us |
|---|---|---|
| `contracts/legacy/VaultInfrastructure.sol:619` | **Legacy contract** | The "Chain of Return Logic" comment sits *inside* `requestRecovery` ("Recovery flow (owner lost)") — it is the sub-case where nextOfKin initiates recovery with 0 guardians, gated by a 7-day timelock. **Chain of Return was a RECOVERY mechanism, not an inheritance one.** |
| `app/guardians/components/RecoveryTab.tsx:7` | **Cleanup comment** | "Pre-cleanup this file had a parallel 'Chain of Return' recovery flow for legacy non-CardBound vaults (initiated by a mature guardian…, 7-day maturity wait, 30-day expiry, `cancelRecovery`). That flow is unreachable in this build… All non-CardBound branches removed." |
| `app/guardians/components/RecoveryTimeline.tsx:6` | **Cleanup comment** | "Pre-cleanup, this had a parallel non-CardBound (legacy 'Chain of Return') timeline… Removed — those paths are unreachable." |
| `__tests__/app-pages-coverage.test.ts:502-503` | **Test** | "In CardBound mode (the default), the 'Chain of Return' tab is labelled **'Wallet Rotation'**." — direct evidence of the rename. |
| `__tests__/app/guardians-page.test.tsx:341` | **Test** | Guardians-page test referencing the (now Wallet Rotation) tab. |
| `__tests__/deployment/deployment-operations.test.ts:313` | **Test fixture** | `'chain-of-return'` string in a deployment ops list. |
| `scripts/verify-chain-of-return-timelock.ts:87` | **Verify script** | A legacy timelock-verification script (checks the old flow's timelock). |
| `app/admin/AdminDashboardClient.tsx:1473` | **Admin telemetry** | "Chain of Return Fraud Monitor" — a fraud-watch label, not the flow itself. |

### Next of Kin — references, all legacy/shim/test/telemetry
| Location | Kind | What it tells us |
|---|---|---|
| `app/guardians/page.tsx:24` | **Cleanup comment** | "'Next of Kin' was a legacy inheritance flow for the non-CardBound vault implementation. CardBound is the only mode… so the Next-of-Kin tab — along with its 255-line panel and 7 always-throw stub functions in useVaultRecovery — was dead UI and has been removed." |
| `hooks/useVaultHooks.ts:143-160` | **Compatibility shim** | "Legacy next-of-kin compatibility shim. In CardBound mode (the only supported mode), the vault uses the InheritanceManager multi-heir system… there is no next-of-kin field on the vault contract anymore." Returns `nextOfKin: ZERO_ADDRESS, hasNextOfKin: false`. |
| `app/vault/components/VaultRecoveryPanel.tsx:6` | **Cleanup comment** | "Pre-cleanup, this component had a parallel Next-of-Kin (NoK) section for legacy non-CardBound vaults… Removed entirely along with… the recovery hook's `setNextOfKinAddress` (which threw unconditionally)." |
| `contracts/legacy/VaultInfrastructure.sol:66-1182` | **Legacy contract** | The only on-chain `nextOfKin` — `setNextOfKin`, `InheritanceRequested`, `requestInheritance`, "transfer funds to Next of Kin's vault". Legacy UserVault only. |
| `app/api/security/next-of-kin-fraud-events/route.ts` | **Fraud telemetry** | An active fraud-reporting endpoint that watches for NoK-related fraud (defensive monitoring), not the NoK flow. |
| `lib/features.ts:24` | **Feature flag** | `nextOfKin: true` — a flag that gates the (now legacy) surface; vestigial. |
| `app/inheritance/layout.tsx:5,10` | **Copy** | Page metadata still says "next-of-kin" in user-facing description text. |
| numerous `__tests__/…`, `scripts/verify-next-of-kin-inheritance.ts` | **Tests/scripts** | Exercise either the legacy contract or assert the NoK controls are *hidden* in CardBound mode. |

## Stage 2 — Responsibility audit: what was Chain of Return *supposed* to do?
From the legacy contract + cleanup comments, the historical Chain of Return was a **recovery** institution:
- **Activates when:** the owner is lost/unreachable and a party initiates recovery — specifically the
  legacy nextOfKin-with-zero-guardians path (and the mature-guardian path).
- **Transfers:** vault *control* to a proposed new owner (a recovery rotation), not a death-inheritance.
- **Safeguards:** a 7-day timelock ("even nextOfKin with 0 guardians needs a timelock to prevent instant
  takeover… gives the owner time to cancel"), a 30-day expiry, and `cancelRecovery`.
- **Participants:** owner, guardians, or nextOfKin could open a request.

So "Chain of Return" ≈ *the way control returns to a rightful party when the owner is lost* — i.e. the
**recovery** institution, under the legacy UserVault, with nextOfKin as one possible initiator.

## Stage 3 — Coverage matrix (Chain of Return responsibility → current system)
| Chain-of-Return responsibility (legacy) | Current system | Covered? | Evidence |
|---|---|---|---|
| Initiate recovery when owner is lost | CardBound recovery (`VaultRecoveryClaim.sol`) + `stageRecoveryRotation`/`executeRecoveryRotation` | ✅ | Wave 86 audit |
| Timelock before takeover (was 7-day) | Guardian **maturity period** = 7 days; rotation `MIN_ROTATION_DELAY` | ✅ | `GUARDIAN_MATURITY_PERIOD` in CardBoundVault; Wave 87 |
| Expiry of a stale request (was 30-day) | Recovery claim challenge/finalization windows | ✅ | `VaultRecoveryClaim` (Wave 86) |
| Owner can cancel a wrongful recovery | Owner-only `challengeClaim` (rejects + 30-day initiator cooldown) | ✅ | Wave 87 (collusion defense) |
| Guardian-initiated path | Guardian-threshold recovery rotation | ✅ | Wave 86/87 |
| nextOfKin-initiated path (0 guardians) | **Intentionally dropped** — replaced by guardian/trustee model + heirs for the death case | ✅ (by redesign) | CardBound has no single-NoK takeover; this was the *more dangerous* path and its removal is a security improvement |
| The "tab" users saw | Renamed **"Wallet Rotation"** in the Guardians page | ✅ | `app-pages-coverage.test.ts:502`, `guardians/page.tsx` |

Every legacy Chain-of-Return responsibility is covered by a current institution, and the one path that was
*not* carried forward (single nextOfKin with zero guardians instantly-ish taking control) was deliberately
removed because it was the weakest-safety path — consistent with "protection strong, authority weak."

## Stage 4 — Next of Kin: does it actually exist?
**It exists only as a legacy name and vestigial surface; the function is fully replaced by heirs.** Evidence:
- `guardians/page.tsx` and `VaultRecoveryPanel.tsx` state in-code that the NoK flow + panel + stub functions
  were **removed** as dead UI.
- `useVaultHooks.ts` is an explicit **compatibility shim** returning the zero-address sentinel because "there
  is no next-of-kin field on the vault contract anymore."
- The active replacement is the **InheritanceManager multi-heir system** (audited Wave 88): commitment-reveal
  heirs, veto/claim/memorial windows, proof-of-life override.
- The only live NoK code is **fraud telemetry** (`/api/security/next-of-kin-fraud-events`) — defensive
  monitoring, not the flow.

**Verdict:** Next of Kin is **a legacy label, replaced by heirs.** Not missing functionality.

## Stage 5 — Gap analysis (identify only; nothing implemented)
The *functional* gaps are nil — recovery and inheritance fully cover both legacy institutions. The remaining
gaps are **naming/documentation hygiene** (and one vestigial flag), which can confuse exactly the kind of
audit that triggered this wave:
1. **Vestigial feature flag** `lib/features.ts:24 nextOfKin: true` gates a legacy surface that no longer
   exists in CardBound — misleading; candidate for removal.
2. **User-facing copy still says "next-of-kin"** (`app/inheritance/layout.tsx` description, `HelpCenter.tsx`
   "Next of Kin: Designate an heir…", `TransactionHistory.tsx` "Next of Kin Set" label). These should read
   "heir/inheritance" to match the actual system, OR explicitly define NoK as the friendly name for "heir."
3. **Two fraud monitors named "Chain of Return" / "Next of Kin"** in the admin dashboard. These are fine as
   *fraud-watch* labels, but the names imply live institutions; a one-line clarification would help.
4. **Legacy contract + verify scripts** (`VaultInfrastructure.sol`,
   `scripts/verify-chain-of-return-timelock.ts`, `scripts/verify-next-of-kin-inheritance.ts`) remain in-repo.
   They are **not wired** (the ABI is registered but used in 0 contract calls; `isCardBoundVaultMode()` is
   always true), so they are dormant — but they should be clearly quarantined as legacy so no future reader
   mistakes them for active institutions.

None of these are launch-blocking *functionality* gaps. They are the *map* being out of date, not the
*territory* being incomplete.

## Stage 6 — Completion decision
The brief's four outcomes, answered with evidence:

- **Chain of Return → Outcome B: exists under different names.** It was a *legacy recovery* mechanism; its
  responsibilities live in CardBound **Recovery** (Wave 86), **Guardian maturity/threshold** (Wave 87), and
  the renamed **Wallet Rotation** tab. The one legacy path not carried forward (single-NoK instant-ish
  takeover) was removed as a security improvement. Not partial, not missing — **renamed and absorbed.**
- **Next of Kin → Outcome B: exists under different names.** Replaced by the **InheritanceManager heir**
  system (Wave 88). Remaining references are a compatibility shim, vestigial flag/copy, and fraud telemetry.
  **Renamed and absorbed.**

**Therefore the Preparedness civilization is NOT missing a foundational institution.** What it has is a
*naming drift* between the VFIDE vision's vocabulary ("Chain of Return", "Next of Kin") and the
implementation's vocabulary ("Recovery / Wallet Rotation", "Heirs / Inheritance"). The institutions exist;
the labels lag.

## Recommendation before Wave 91 (Preparedness Civilization Audit)
1. **Adopt one vocabulary.** Either (a) formally retire "Chain of Return" and "Next of Kin" in favor of
   "Recovery/Wallet Rotation" and "Heirs/Inheritance", or (b) keep them as the *grandmother-friendly* names
   and document the mapping (Chain of Return = how control returns when you're lost = Recovery; Next of Kin =
   the friendly word for an Heir). Pick one so the civilization model isn't described as having institutions
   it doesn't separately have.
2. **Do the small hygiene cleanup** (vestigial flag, copy, quarantine legacy scripts) — *as a future wave*,
   not now (this wave is forensic only).
3. **Then run Wave 91** over the *real* institution set: Ownership → Vault → Recovery (incl. the absorbed
   Chain-of-Return responsibilities) → Guardians → Continuity → Heirs/Inheritance → Business Continuity —
   with the two dominant open questions from Waves 88–89 (the vault's **post-veto owner-reclaim** contract
   flag, and whether the **business-continuity flow** should be surfaced + operator access enforced).

This wave changed nothing in the code by design; it produced the answer the roadmap needed: **Chain of Return
and Next of Kin are present, under current names, fully covered — the civilization can be certified without
building a missing institution, once the vocabulary is reconciled.**
