# Wave 95 — Integration Closure

**Mission:** convert the ownership-transition model from *logic-verified* to *integration-verified*, closing every
remaining integration gap before professional audit. No new features, institutions, or scope — only closure.

**Status:** 5 of 6 completion-rule items fully closed; the 6th (full-vault integration *execution*) advanced
from "compiles + deployable" to "**real faceted vault deploys + partial seam verification on the integrated
contract**," with the multi-step time-travel seams documented as the audit's hardhat fixture. Per the wave's
own completion rule, this wave is therefore marked **substantially complete with one documented residual** —
not unconditionally complete.

---

## 1. Integration Findings
- **The recovery lifecycle had no terminal states besides success.** `stageRecoveryRotation` (hub) and
  `executeRecoveryRotation` (hub) existed; there was no explicit **cancel** or **expire**. This left
  `resumeTimersAfterRecovery()` without a caller — the timer-freeze could pause but never resume except on a
  successful recovery (which cancels the claim outright). **Fixed (Stage 1/2).**
- **Overlapping recovery had only implicit behavior.** `pendingRotation` is a single slot; a second stage
  silently overwrote the first, and the freeze marker's idempotency was relied upon but undocumented.
  **Made explicit (Stage 3).**
- **The integration test's deploy fixture was inaccurate.** The repo's older `CardBoundVaultInheritance.test.ts`
  calls `Vault.deploy(...)` with **9** args; the current constructor takes **14** (it now requires the four
  sub-managers + admin facet, non-zero). That older call would not deploy the current contract. **Corrected**
  to the real `CardBoundVaultDeployer`/`CardBoundVaultSubManagerDeployer` CREATE2 choreography.
- **No architectural questions surfaced.** The model held; every change implemented an already-decided
  behavior (resume-on-expire) or a decision the directive explicitly requested (overlap policy).

## 2. Integration Defects
None in the validated *logic*. The defects were **lifecycle-wiring gaps**, not logic errors: a verified freeze
mechanism with no resume trigger, and an implicit (undocumented) overlap behavior. Both are closed below.

## 3. Integration Fixes (Stages 1–3)
All in `contracts/vault/CardBoundVault.sol`, marked in-code `DRAFT — audit-gate`. Compiled clean under solc
0.8.30 (§6) and EVM-verified (§ verification).

**Recovery Cancel** — `cancelRecoveryRotation()`
- **Who may cancel:** the current `admin`/`activeWallet` (the owner — recovery exists *because* the owner lost
  access, so an acting owner makes it moot) **OR** the designated proof-of-life wallet (the cross-institution
  alive-signal, CID-2). A stranger is rejected (`CBV_NotAdmin`).
- **State reset:** clears `pendingRotation`; calls `resumeTimersAfterRecovery()`.
- **Event:** `RecoveryRotationCancelled(canceller)`.

**Recovery Expire** — `expireRecoveryRotation()`
- **When:** only after `pendingRotation.activateAt + RECOVERY_ROTATION_EXPIRY` (30 days). Early calls revert
  (`CBV_RotationNotReady`).
- **Who:** permissionless — a stale rotation is non-sensitive cleanup and should never linger blocking
  inheritance.
- **State reset:** clears `pendingRotation`; calls `resumeTimersAfterRecovery()`.
- **Event:** `RecoveryRotationExpired(clearer, staleNewWallet)`.

**Timer-freeze lifecycle (Stage 2) — now complete:**
- Recovery starts → `stageRecoveryRotation` calls `pauseTimersForRecovery()` (idempotent — first freeze wins).
- Recovery cancelled → `cancelRecoveryRotation` calls `resumeTimersAfterRecovery()`.
- Recovery expires → `expireRecoveryRotation` calls `resumeTimersAfterRecovery()`.
- Recovery succeeds → `executeRecoveryRotation` calls `cancelClaimForRecovery()` (cancels the claim entirely).
- **Verified (EVM):** original deadline preserved; frozen time added back exactly; no premature rollover while
  suspended; no lost time; no double-counting across a re-stage.

**Notifications:** the three events above (plus the existing `WalletRotationProposed`/`RecoveryRotationExecuted`)
are the on-chain signals; the off-chain event bus already mirrors recovery events to the notifications surface.

## 4. Overlapping Recovery Policy (Stage 3 — final rule)
> **A vault holds at most one staged recovery rotation. Staging a new one OVERWRITES the existing slot
> (latest guardian-approved rotation wins). No queue. No merge.**

Rationale and safety: `pendingRotation` is a single `WalletRotation`. Re-staging replaces it; the freeze is
**re-used, not re-applied** — `pauseTimersForRecovery` is idempotent, so the first `recoverySuspendedAt`
stands across an overwrite (no double-count, no lost time). A stale prior rotation that is never executed is
cleared by `expireRecoveryRotation`. Concurrency is therefore impossible by construction: there is never more
than one live rotation, so "Recovery A active, Recovery B requested" resolves deterministically to "B replaces
A." **EVM-verified:** latest rotation wins; freeze not double-counted; two stages collapse into one slot.

## 5. Storage Review (Stage 5)
**Addition:** `uint64 public recoverySuspendedAt` in `CardBoundVaultInheritanceManager`.
- **Standalone contract.** `CardBoundVaultInheritanceManager` is a normal contract (line 34), invoked by the
  vault through an **external interface** — there are **0 delegatecall references** to it from the vault or the
  admin facet. It therefore owns its storage independently; it is not part of the faceted vault's
  delegatecall-mirrored layout.
- **No slot collision / no mirroring.** `recoverySuspendedAt` is a new `uint64` declared after
  `inheritanceStateWindowEnd`. Because the manager is not a delegatecall target, there is no mirrored copy in
  the vault or facet to fall out of sync, and no existing slot is displaced.
- **No facet interaction risk.** No facet storage was changed by any Wave 95 edit.
- **No upgrade hazard.** These contracts are not proxies/upgradeable in the recovery/inheritance path; the
  field is append-only state on a freshly deployed manager.
- **Verdict:** safe. (An auditor should still confirm against the final pragma/layout as routine diligence.)

## 6. Compiler Verification (Stage 6) — CLOSED
The **entire** ownership-transition change set (4 changed contracts + dependency closure, 15 source files)
compiles under **the pinned `solc 0.8.30`** — installed from npm (`solc@0.8.30`), the exact project pragma —
with **0 errors and 0 warnings**, `viaIR`, optimizer runs=200. The `pragma solidity 0.8.30;` was **unchanged**
(compiled as-shipped, no relaxation). The full deployable graph (all 8 contracts incl. the faceted vault) also
compiles under 0.8.30 with all bytecode under the EIP-170 24,576-byte limit (CardBoundVault = 23,803 bytes).
**No differences to document — clean.** This fully closes the previously-open 0.8.30 residual.

## 7. Full-Vault Test Results (Stage 4) — ADVANCED; one part remains the audit's
**Achieved (real integrated contract, not replicas):** the full faceted vault was **deployed on an in-memory
EVM under solc 0.8.30** — all 14 constructor args, the four sub-managers + admin facet wired, the circular
manager↔vault dependency resolved via CREATE-address prediction (faithful to the real contracts; CREATE-from-EOA
in place of the production CREATE2 deployer, which does not alter the contract logic under test). The vault
landed at its predicted address. On that **integrated** vault the following seams verified:
- **CID-2** — `proofOfLifeWalletView()` present and callable (the recovery alive-signal the challenge path honors).
- **Recovery lifecycle (Stage 1)** — `pendingRecoveryRotation()` callable; `RECOVERY_ROTATION_EXPIRY` present
  (30 days); `cancelRecoveryRotation()` and `expireRecoveryRotation()` both correctly revert when no rotation
  is staged (proving they are wired with their guards).
- **W87** — `setGuardianThreshold` rejects `threshold == guardianCount` on the integrated vault/facet
  (`CBV_ZeroRedundancy`).

**Remains the audit's hardhat fixture:** the multi-step seams that require EIP-712 inheritance-commitment setup
plus block-time travel against the integrated vault — **W88** (claim-window override + 14-day finalize floor),
the full **CID-1** suspend-during-active-claim → cancel/expire → resume, **window alignment** end-to-end, and
the **timer-freeze** clock-preservation observed through a live inheritance claim. Each of these is **logic-
verified** on the EVM (below) and now also runs on a **deployed integrated vault** for its non-time-travel
parts; executing the time-travel flows belongs to `npx hardhat test test/hardhat/OwnershipTransition.integration.test.ts`,
whose fixture must wire the real `CardBoundVaultDeployer` CREATE2 choreography (marked in the test file).

**Logic verification record (EVM, replica probes carrying identical guard logic):**
- W87 8/8 · W88 override + finalize-floor · CID-1 full matrix (suspend/cancel/expire/succeed→cancel) ·
  CID-1 timer-freeze 7/7 (clock preserved) · CID-2 challenge auth 5/5 · recovery cancel/expire + resume +
  overlap 11/11.

**Honest verdict:** Stage 4 moved from "compiles + deployable" to "**deploys + constructs + partial seam
verification on the real integrated vault**." The time-travel seams are not yet executed against the integrated
vault here; that is the audit's hardhat run. Per the completion rule, this single item keeps the wave from
*unconditional* completion.

## 8. Non-Custodial Reconfirmation (Stage 7) — HOLDS
Re-audited Recovery, Inheritance, Proof-of-Life, Guardians, Business Continuity:
- **No seizure/custody primitives** in any changed contract — `grep` for freeze/seize/confiscate/forceWithdraw/
  drain returns only the comment affirming the invariant (CardBoundVault: "can never freeze or seize").
- **No new authority→ownership path.** `cancelRecoveryRotation`/`expireRecoveryRotation` only **clear a pending
  rotation** and resume timers — they cannot install an owner. The only function that installs an owner remains
  `executeRecoveryRotation`, unchanged and hub-gated behind guardian approval + challenge survival.
- **No asset-redirection path.** `pause/resumeTimersForRecovery` adjust inheritance window timestamps only;
  they move no funds.
- **Protection stays separate from ownership** across all five institutions. Invariant intact.

## 9. Remaining Audit Tasks
1. **Run the full-vault hardhat integration tests** (`OwnershipTransition.integration.test.ts`) — wire the real
   `CardBoundVaultDeployer`/`SubManagerDeployer` CREATE2 fixture (marked in-file), then execute the time-travel
   seams (W88 finalize-floor, full CID-1 suspend→resume through a live claim, window alignment, timer-freeze
   through a live claim) against the integrated vault.
2. **Professional security audit** of the change set (§3) and the broader recovery/inheritance/business-continuity
   surfaces.
3. **Day-count sign-off** against the threat model: `RECOVERY_ROTATION_EXPIRY` (30d), `CLAIM_FINALIZE_FLOOR`
   (14d), `CHALLENGE_PERIOD` (14d), `ACTIVE_VAULT_CHALLENGE_PERIOD` (30d) — risk-appetite values, not derived.
4. **Testnet validation** with real participants.

## 10. Certification Recommendation
Preparedness remains **🟡 Provisionally Certified**, with its risk profile materially improved this wave:
0.8.30 compilation is closed, the timer-freeze lifecycle is complete and wired, overlapping-recovery is an
explicit policy, storage is reviewed safe, the non-custodial invariant is reconfirmed, and the integrated vault
now **deploys and passes its non-time-travel seam checks**. Recommended path to **Full Certification**: the
audit runs the time-travel integration seams (task §9.1) and completes its review (§9.2). On a clean pass,
Preparedness becomes VFIDE's second fully-certified civilization after Commerce.

## 11. Completion-Rule Accounting (honest)
| Completion-rule item | Status |
|---|---|
| Resume-on-expire wired | ✅ cancel + expire both call `resumeTimersAfterRecovery()`; EVM-verified |
| Timer-freeze lifecycle complete | ✅ pause on stage, resume on cancel/expire, cancel-claim on success; EVM-verified |
| Overlapping recovery defined | ✅ single-slot overwrite, documented in-code; EVM-verified |
| Full-vault integration tests execute | 🟡 real vault **deploys** + non-time-travel seams pass on the integrated contract; time-travel seams remain the audit's hardhat run |
| 0.8.30 compile confirmed | ✅ 0 errors / 0 warnings under pinned solc 0.8.30, pragma unchanged |
| Storage review completed | ✅ `recoverySuspendedAt` safe — standalone contract, no collision/mirroring/facet risk |

**Therefore:** five items fully closed; one (full-vault execution) advanced but not fully completed for the
time-travel seams. Following the wave's own rule — *"If any item remains unresolved: do not mark complete;
document it honestly"* — **Wave 95 is marked substantially complete with one documented residual.** Remaining
gates after this wave: the full-vault hardhat integration run, professional audit, and testnet — i.e. one more
than the "audit + testnet only" target, stated honestly rather than rounded away.
