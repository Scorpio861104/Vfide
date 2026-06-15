# Wave 96 — Full-Vault Integration Execution

**Mission:** execute every ownership-transition seam against the **actual integrated vault** — no probe
contracts, no replicas, no simplified harnesses, no logic mirrors. Convert "integrated vault deploys" into
"integrated vault ownership-transition model fully executes."

**Result:** achieved. The real faceted `CardBoundVault` + sub-managers were deployed on an in-memory EVM under
the pinned **solc 0.8.30**, and **all five seams plus the timer-freeze executed end-to-end against that real
vault with real `block.timestamp` time-travel** — **31/31** ownership-transition checks plus the **8/8** W88
lifecycle. Getting there required finding and fixing **two genuine integration defects that logic-level
verification had missed** (documented below). Both fixes are drafted, compile clean under 0.8.30, and the full
seam suite passes with them in place.

---

## 1. Deployment Verification (Stage 1)
The full production-shaped graph was deployed and exercised — not a simplified harness:
`MintableTokenStub`, `VaultHubStub`, `CardBoundVaultAdminFacet`, the four sub-managers
(`PaymentQueueManager`, `WithdrawalQueueManager`, `InheritanceManager`, `AdminManager`), and `CardBoundVault`
itself with **all 14 constructor arguments**. The circular manager↔vault dependency was resolved via
CREATE-address prediction (deploy managers against the predicted vault address, then deploy the vault) — a
faithful stand-in for the production `CardBoundVaultDeployer`/`CardBoundVaultSubManagerDeployer` CREATE2
choreography; it deploys the **real** contracts with **real** constructor args and **real** delegatecall facet
wiring. The vault landed at its predicted address. **Time-travel** was verified to work on the EVM (the
`TIMESTAMP` opcode honors a passed `Block`'s timestamp exactly), which is what made the multi-step,
time-dependent flows executable against the real vault.

## 2. Integration Defects Found (and fixed) — the core value of this wave
These were invisible to the Wave 94/95 logic probes because probes test guard logic in isolation; only running
the **integrated, delegatecall-faceted, stateful** vault surfaced them.

### Defect I — Vault↔Facet storage-layout off-by-one (HIGH)
- **Symptom:** every admin-/guardian-gated function routed through the facet (`setGuardian`,
  `proposeInheritanceConfig`, …) reverted `CBV_NotAdmin` for the *real* owner, even though the vault's own
  `admin()` getter returned the owner correctly.
- **Root cause (confirmed via solc `storageLayout`):** `CardBoundVault` inherits a custom `ReentrancyGuard`
  (defined in `SharedInterfaces.sol`) whose `uint256 _status` occupies **slot 0**, shifting every vault state
  variable up by one (`admin` at slot 2). The facet's base, `CBVStorageLayout`, did **not** reserve slot 0, so
  it expected `admin` at slot 1. Because the facet runs in the vault's storage via `delegatecall`, it read
  ownership from the wrong slot. This is a **real production layout bug** (it reproduced from unmodified repo
  source), latent only because admin-via-facet delegatecall paths weren't exercised in this exact build.
- **Fix (DRAFT, audit-gate):** reserve slot 0 in `CBVStorageLayout` with a placeholder mirroring
  `ReentrancyGuard._status`. Solc's layout output then shows **every variable aligned** between vault and facet
  (`seerAutonomous`@1, `admin`@2, `pendingAdmin`@3, `activeWallet`@4, `guardianThreshold`@14:off1 — identical).
  Compiles 0/0 under solc 0.8.30.

### Defect II — Recovery-execution deadlock vs. active inheritance (HIGH)
- **Symptom:** `executeRecoveryRotation` reverted `CBV_InheritanceActive` whenever an inheritance claim was in
  progress — i.e. the exact "recovery succeeds while inheritance active" scenario CID-1 was designed for.
- **Root cause:** `executeRecoveryRotation` called `_requireOperationalForOutboundTransfers()` as its first
  guard, which reverts when `inheritanceState() != NORMAL`. But recovery staging only *pauses timers*; it does
  not reset `inheritanceStateValue` (stays VETO/CLAIM). So the guard always tripped, and the
  `cancelClaimForRecovery()` call **a few lines below it was unreachable**. The CID-1 **recovery-precedence
  invariant did not hold** in the integrated vault: a recovered (alive) owner could never reclaim a vault that
  had an in-flight inheritance claim — a deadlock.
- **Fix (DRAFT, audit-gate):** remove the `_requireOperationalForOutboundTransfers()` call from
  `executeRecoveryRotation`. Recovery is hub-gated + guardian-approved + challenge-survived and *supersedes* a
  death-presumption claim by design; it cancels the claim a few lines later. The operational guard still
  applies to ordinary outbound transfers elsewhere. With this fix, "recovery succeeds → inheritance cancelled"
  executes and ends in `inheritanceStateValue == NORMAL`.

## 3. Integrated Test Results — W88 (Stage 2), real vault + time-travel
8/8, all on the deployed vault:
- `proposeInheritanceConfig` accepted; `confirmInheritanceConfig` **reverts before** the 30-day cooldown and
  **succeeds after**.
- `initiateInheritanceClaim` accepted; manager state machine enters **VETO_PERIOD (1)**.
- `claimHeirShare` (heir secret reveal) accepted in the claim window.
- **Fast-finalize defeated:** `finalizeInheritanceDistribution` **reverts before** the 14-day
  `CLAIM_FINALIZE_FLOOR` even with all heirs revealed, and **succeeds after** the floor.

## 4. Ownership-Transition Results — CID-1 (Stage 3), real vault
12/12:
- **3a Suspend:** recovery staged by hub → `pendingRecoveryRotation` true, `recoverySuspendedAt != 0`,
  `claimHeirShare` **reverts** (inheritance suspended).
- **3b Cancel→resume:** owner cancels → pending cleared, `recoverySuspendedAt = 0`, **window extended by exactly
  the 5 frozen days**, `claimHeirShare` accepted again.
- **3c Expire→resume:** early expire **reverts** before `RECOVERY_ROTATION_EXPIRY` (30d); permissionless expire
  after 30d **accepted**; timers resume; window extended by the frozen duration.
- **3d Succeed→cancel:** recovery executes (hub) and **inheritance is cancelled** (`state == NORMAL`). *(This is
  the path Defect II had deadlocked; it passes after the fix.)*

## 5. Time-Travel Results — timer-freeze through a LIVE claim (Stage 4)
4/4: freeze recorded at stage; a re-stage during suspension does **not** reset the freeze (no double-count);
after **70 days** suspended the window is extended by **exactly 70 days** on cancel (deadline preserved, no lost
time); **no expiration while suspended** (state stays in-claim). Confirms: deadline preserved, frozen duration
restored, no double-count, no premature rollover, no expiration while suspended, no lost time.

## 6. Window Alignment (Stage 5)
Constants verified on the deployed contracts: `RECOVERY_ROTATION_EXPIRY = 30d`, `MIN_CHALLENGE_PERIOD = 3d`,
`MAX_CHALLENGE_PERIOD = 30d` (aligned with the recovery expiry ceiling), inheritance **VETO window = 30d** from
initiate. `VaultRecoveryClaim`'s `CHALLENGE_PERIOD = 14d` / `ACTIVE_VAULT_CHALLENGE_PERIOD = 30d` were read from
source and are consistent with these. (The `VaultRecoveryClaim` challenge *flow* itself is covered by the
existing `CardBoundVaultRecovery` hardhat tests; this wave verifies the windows the integrated vault enforces.)

## 7. Adversarial Results (Stage 6)
7/7:
- **Rapid re-stage ×5 / overwrite:** original freeze preserved (no double-count); always exactly one pending
  rotation (single-slot overwrite policy holds).
- **Auth:** an attacker **cannot** cancel recovery; the **proof-of-life wallet can** (alive-signal, CID-2).
- **Cancel/expire race:** a second cancel **reverts** (no double-resume); expire after cancel **reverts**
  (nothing to expire).
- **Finalization race:** `finalizeInheritanceDistribution` is **blocked while a recovery is pending** — the
  race is deterministically lost by inheritance, never producing a double ownership transition.

## 8. Residual Risks / Open Issues
- **The two fixes are DRAFT and audit-gate.** Both touch sensitive areas — faceted **storage layout** (Defect
  I) and the **recovery execution guard** (Defect II). They must be reviewed by a professional auditor. The
  storage-layout fix in particular should be checked against the FULL set of facet variables (this wave
  verified the prefix through `guardianThreshold`; an auditor should confirm the entire layout, and that no
  other delegatecall target shares `CBVStorageLayout` with a different expectation).
- **Deployment used CREATE-from-EOA prediction**, not the production CREATE2 deployer. The contract logic under
  test is identical; the deployer choreography itself should still be exercised by the audit's hardhat fixture
  (`OwnershipTransition.integration.test.ts`).
- **EVM = ethereumjs (Shanghai), compiler = solc 0.8.30** — matches the project pragma; a professional audit
  should re-run under the production toolchain and chains (Base/Polygon/zkSync).
- **`VaultRecoveryClaim` challenge flow** was verified by constant-alignment here, not re-executed end-to-end
  (it has its own existing hardhat coverage).

## 9. Does the integrated vault behave exactly like the validated model?
**After the two fixes: yes, for every seam executed here.** Before them: **no** — the integrated vault diverged
from the model in two places (admin routing through the facet, and recovery precedence over active
inheritance). That divergence is the headline result of this wave: the model was coherent and logic-verified,
but the *integration* had two real defects that only full-vault execution exposed. With the drafted fixes, the
real vault’s observed behavior matches the validated ownership-transition model across all 31 + 8 checks.

## 10. Certification Recommendation
The integrated execution **succeeded**, but it **surfaced two real (now-fixed-in-draft) defects in a sensitive
area**. Per Wave 96's completion rule — "complete only if … no architectural discrepancies … no unresolved
integration defects" — the **honest reading is that this wave does not by itself move Preparedness to Fully
Certified**, because:
1. Two integration defects were found in the integrated system (the rule treats discrepancies as blocking), and
2. their fixes are **drafts in security-sensitive code** (storage layout + recovery guard) that require
   **professional audit sign-off** before they can be considered settled.

**Recommendation:** Preparedness remains **🟡 Provisionally Certified**, with a materially stronger evidence
base — every seam now executes on the real integrated vault, and the two latent integration bugs that would
have caused real harm (locked-out owners; deadlocked recovery) are identified and fixed in draft. Path to
**✅ Fully Certified:** professional audit confirms the two fixes (and the full facet storage layout), then the
audit's hardhat run re-executes these seams via the production CREATE2 deployer. After that, the next gates are
Professional Audit completion and Public Testnet — and, per the directive, no further civilization campaigns.

## 11. Completion-Rule Accounting (honest)
| Completion-rule item | Status |
|---|---|
| Every seam executes on the integrated vault | ✅ 31/31 + W88 8/8 on the real deployed vault, with time-travel |
| No logic/probe substitutions | ✅ real `CardBoundVault` + managers + facet; no probes/replicas |
| No architectural discrepancies | ❌→drafted: TWO found (storage off-by-one; recovery deadlock) — **fixed in draft, pending audit** |
| No unresolved integration defects | 🟡 both defects are **resolved in draft** and pass the full seam suite; **not yet audit-confirmed** |

**Therefore:** the execution objective is met (all seams run on the real vault), but because the wave **found
real integration defects** whose fixes are unaudited drafts in sensitive code, Preparedness does **not** auto-
promote to Fully Certified. This is reported as-is rather than rounded up — the fixes work and pass, but they
need professional review before the discrepancies count as truly closed.
