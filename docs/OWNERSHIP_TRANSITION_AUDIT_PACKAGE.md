# Ownership Transition — Audit Package

A single hand-off document so a contract auditor starts efficient rather than cold. It states the design
principle, inventories every change with exact locations, records what has and has not been verified (and by
what method), and lists the precise tasks that are the audit's domain. Companion to the per-wave docs
(W91 audit, W92 model, W93 implementation, W94 verification) and the certification tracker.

## 1. The principle being audited
> **A demonstrated "owner is alive / acting" signal must consistently and durably outrank a "presumed gone"
> process — across every institution — until assets irreversibly leave.**

Three ownership-transition pathways must obey it: **Recovery** (owner alive, lost access → wallet rotation),
**Inheritance** (owner presumed gone → heir distribution), **Business continuity** (owner absent → successor,
funds excluded). Five seams were found where the system violated the principle; all five are addressed below.

## 2. Non-custodial invariant (must remain true after every change)
No freeze / seize / blacklist / drain / forceWithdraw anywhere. The only `freeze` reference is a comment
affirming the invariant; even the Seer risk monitor is advisory and cannot block a vault operation. Authority
(guardians, trustees, operators, heirs) never equals ownership. **The auditor should confirm none of the
changes below introduce a custody or seizure path** — they were designed not to (all are guards/timers/veto
authority, none move funds).

## 3. Change inventory (exact locations)
All contract changes are marked in-code `DRAFT — UNCOMPILED, contract-audit gate` (they compile under solc-js
0.8.34; see §4). Pragma in the shipped tree is exact `0.8.30`.

### CID-1 — Recovery precedence (recovery suspends → resumes/cancels inheritance)
| Location | Change |
|---|---|
| `CardBoundVaultInheritanceManager.claimHeirShare` | added `if (_pendingRecoveryRotation()) revert INH_RecoveryInProgress();` (was initiate-only) |
| `CardBoundVaultInheritanceManager.finalizeInheritanceDistribution` | same guard added |
| `CardBoundVaultInheritanceManager.cancelClaimForRecovery()` (new, onlyVault) | resets inheritance to NORMAL on recovery success; clears suspension marker |
| `CardBoundVault.executeRecoveryRotation` | calls `cancelClaimForRecovery()` |
| interface `ICardBoundVaultInheritanceManager` | declares `cancelClaimForRecovery`, `pauseTimersForRecovery`, `resumeTimersAfterRecovery`, `proofOfLifeWallet` |

### CID-1 timer-freeze (decided: FREEZE inheritance clocks during recovery)
| Location | Change |
|---|---|
| `CardBoundVaultInheritanceManager` storage | new `uint64 public recoverySuspendedAt` |
| `CardBoundVaultInheritanceManager.pauseTimersForRecovery()` (new, onlyVault) | snapshots `recoverySuspendedAt = now` if a claim is active; idempotent (first freeze wins) |
| `CardBoundVaultInheritanceManager.resumeTimersAfterRecovery()` (new, onlyVault) | adds frozen duration back to `inheritanceStateWindowEnd`; clears marker |
| `CardBoundVaultInheritanceManager._rolloverToClaimWindowIfNeeded` | returns early if `recoverySuspendedAt != 0` (no advance while frozen) |
| `CardBoundVault.stageRecoveryRotation` | calls `pauseTimersForRecovery()` |
| events | `InheritanceTimersPaused`, `InheritanceTimersResumed` |

### CID-2 — One alive-signal across institutions
| Location | Change |
|---|---|
| `VaultRecoveryClaim.challengeClaim` | challenger may be `claim.originalOwner` OR `IUserVaultRecovery(claim.vault).proofOfLifeWalletView()` |
| interface `IUserVaultRecovery` | adds `proofOfLifeWalletView()` |
| `CardBoundVault.proofOfLifeWalletView()` (new view) | proxies the manager's `proofOfLifeWallet` |
| (inheritance side already accepts `snapshotProofOfLifeWallet` in `ownerOverrideClaim`) | unchanged |
| **off-chain** `migrations/20260612_100000_merchant_proof_of_life.sql` | business-level proof-of-life table |
| **off-chain** `app/api/merchant/continuity/route.ts` | `set/clear_proof_of_life` actions; GET returns it |
| **off-chain** `app/api/merchant/business-transfer/route.ts` | `veto` accepts owner OR proof-of-life address |

### W88 — Reclaim until irreversible + finalize floor
| Location | Change |
|---|---|
| `CardBoundVaultInheritanceManager.ownerOverrideClaim` | guard now `VETO_PERIOD OR (CLAIM_WINDOW AND !distributionFinalized)` |
| `CardBoundVaultInheritanceManager.finalizeInheritanceDistribution` | added `CLAIM_FINALIZE_FLOOR` (14d) floor so all-heirs-revealed can't fast-finalize before the floor |
| constant | `uint64 public constant CLAIM_FINALIZE_FLOOR = 14 days` |

### W87 — Fault-tolerant guardian threshold
| Location | Change |
|---|---|
| `CardBoundVaultAdminFacet.setGuardianThreshold` | after setup, reject `threshold == guardianCount` when `guardianCount >= 2` (`CBV_ZeroRedundancy`); bootstrap preserved |
| error | `CBV_ZeroRedundancy` |

### Window alignment
| Location | Change |
|---|---|
| `VaultRecoveryClaim` | `CHALLENGE_PERIOD` 7→14d; `ACTIVE_VAULT_CHALLENGE_PERIOD` 14→30d |

## 4. Verification record (what was done, and by what method)
**Compilation:** all four changed contracts + dependency closure (15 source files) compile **cleanly, 0
errors / 0 warnings**, under **solc-js 0.8.34**, viaIR, optimizer runs=200. (The pure-JS compiler was used
because the native solc download host is unavailable in the build environment.)

**Runtime (in-memory EVM, `@ethereumjs/vm`):** exact-logic **replica probe contracts** were deployed and
adversarially exercised:
- **W87** — 8/8 (2/2, 3/3, 4/4 reject; 3/2, 5/3 accept; 1/1 + pre-setup 2/2 bootstrap accept; threshold>count reject).
- **W88** — override OK in veto + claim-not-finalized, reverts when finalized/normal; finalize-floor: all-revealed-before-floor reverts (fast-finalize defeated), after-floor OK, elapsed OK.
- **CID-1** — full recovery matrix: starts→suspend, expires→resume, challenged→resume, **succeeds→cancel** (claim reverts wrong-state, proving cancel fired).
- **CID-1 timer-freeze** — 7/7: rollover blocked while suspended; window extended by exactly the frozen duration on resume; original deadline does not expire; rollover resumes at the extended end.
- **CID-2 challenge auth** — 5/5: original owner challenges OK; proof-of-life challenges OK; stranger rejected; with no proof-of-life set, only owner challenges.

**Off-chain (jest):** CID-2 business proof-of-life — veto by proof-of-life address (stranger rejected), and
set/clear/GET of the designation. Part of the 132-test / 14-suite green suite; typecheck 0; nav 0.

## 5. What is NOT verified — the audit's tasks (in priority order)
1. **Compile under the pinned solc 0.8.30** (this used 0.8.34, same 0.8.x line). Confirm clean.
2. **Full-vault hardhat integration tests.** The runtime tests used replica probes carrying the identical
   guard logic — they do **not** exercise the guards inside the integrated ~105KB faceted vault with real
   constructor/delegatecall wiring. Stand up the full vault + manager + recovery + hub and test each seam
   end-to-end.
3. **CID-1 resume-on-expire call site.** The vault's rotation lifecycle currently has *stage* and *execute
   (success)* but **no explicit cancel/expire** path, so `resumeTimersAfterRecovery()` has no natural caller.
   Add an explicit recovery-cancel/expire function and wire resume to it (the freeze logic itself is verified;
   only its expire-trigger is unwired). Decide overlapping-recovery semantics.
4. **Storage-layout review.** `recoverySuspendedAt` was appended to `CardBoundVaultInheritanceManager`
   (a standalone contract, not the faceted vault's mirrored storage) — confirm slot placement is sound and
   that the admin facet's mirrored region is unaffected (no facet storage was changed).
5. **Day-count sign-off.** `CLAIM_FINALIZE_FLOOR` (14d), `CHALLENGE_PERIOD` (14d), `ACTIVE_VAULT_CHALLENGE_PERIOD`
   (30d) are risk-appetite values, not derived — confirm against the threat model.
6. **Re-confirm the non-custodial invariant** holds across all changes (§2).

## 6. Files an auditor should read, in order
1. This package.
2. `docs/WAVE_92_OWNERSHIP_TRANSITION_RESOLUTION_AUDIT.md` — the model + coherence proof.
3. `docs/WAVE_94_OWNERSHIP_TRANSITION_VERIFICATION.md` — the full compile + runtime evidence + caveats.
4. The contracts: `CardBoundVaultInheritanceManager.sol`, `CardBoundVault.sol`, `CardBoundVaultAdminFacet.sol`,
   `VaultRecoveryClaim.sol` (search `Wave 93`, `Wave 95`, `DRAFT` for the changed blocks).
5. `test/hardhat/OwnershipTransition.integration.test.ts` — ready-to-run full-vault integration tests for all five seams (written, NOT run here — the audit's toolchain runs them; the resume-on-expire test is `skip`'d pending the recovery-cancel function in task §5.3).
6. `docs/VFIDE_CERTIFICATION_TRACKER.md` — where this sits in the whole project.

## 7. Honest summary for the auditor
The ownership-transition design is coherent (one principle, five seams, proven mutually consistent),
implemented, compiled clean, and behaviorally verified at the **guard-logic** level on an EVM. It has **not**
been verified inside the integrated faceted contract or under the pinned compiler, and one trigger
(resume-on-expire) is unwired pending an explicit recovery-cancel function. Those are the gate. Nothing in
this package is claimed as production-verified; it is claimed as design-validated and logic-verified, ready
for integration testing and professional review.
