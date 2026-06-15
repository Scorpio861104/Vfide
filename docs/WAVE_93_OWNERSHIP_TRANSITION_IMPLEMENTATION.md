# Wave 93 — Ownership Transition Implementation

Implements the unified ownership-transition model from Wave 92. The verification status is split honestly and
strictly, because it must be: this environment has **no Solidity compiler** (hardhat compile is blocked, no
`solc`, and `tsc` does not touch `.sol`). So:

- **The off-chain half (CID-2 business proof-of-life) is IMPLEMENTED AND VERIFIED** — migration, API, and 2
  new passing tests.
- **The five contract changes are DRAFTED per the W92 spec and STATICALLY checked** (brace balance, symbol
  definition/use, storage-layout reasoning, logic trace) but are **UNCOMPILED and UNVERIFIED**. Every drafted
  block is marked `DRAFT — UNCOMPILED, contract-audit gate` in the code itself. The on-chain verification you
  asked for *is* the professional-audit + hardhat phase — exactly the gate we've held all campaign. This wave
  hands that phase a precise, grounded diff to review and test, not verified contracts.

Verified (off-chain): typecheck 0, nav 0 broken, **128 tests / 13 suites** (+2). Contract drafts: all four
edited contracts brace-balanced, all new symbols defined+used.

## What was implemented + verified (off-chain)
### CID-2 business-level proof-of-life (the alive-signal, business side)
The W92 model makes proof-of-life a civilization-wide "I'm alive" signal. Business continuity is off-chain
and can't see the on-chain `proofOfLifeWallet`, so it gets its own designation (clean business ≠ vault
separation):
- **Migration** `merchant_proof_of_life` (address + note), with down migration.
- **API** `/api/merchant/continuity` — new `set_proof_of_life` / `clear_proof_of_life` actions (owner-only,
  can't be self).
- **Veto wiring** `/api/merchant/business-transfer` — the emergency-transfer `veto` now accepts the owner OR
  the designated proof-of-life address (and that address is allowed past the "not your transfer" gate for
  veto only). So a trusted proof-of-life holder can stop a false emergency business transfer while the owner
  is unreachable.
- **Tests** — 2 new: the proof-of-life address *can* veto; a random stranger *cannot* (gate is specific).
  Plus the existing 11 still pass (no regression).

## What was drafted per spec (contracts — UNCOMPILED, audit-gate)
Each change is grounded in the exact function and current guard, and marked in-code.

### CID-1 — Recovery precedence (bidirectional, continuous exclusion)
- `CardBoundVaultInheritanceManager.claimHeirShare` + `finalizeInheritanceDistribution`: added
  `if (_pendingRecoveryRotation()) revert INH_RecoveryInProgress()` (the guard previously existed only at
  `initiateInheritanceClaim`). A pending recovery now **suspends** an in-flight inheritance — state preserved;
  because the check is dynamic, it **resumes** if recovery expires/cancels.
- `CardBoundVault.executeRecoveryRotation`: calls a new manager method `cancelClaimForRecovery()` so a
  **completed** recovery cancels any in-flight inheritance (the recovered owner supersedes the death
  presumption). New `cancelClaimForRecovery()` (onlyVault, idempotent) added to the manager + its interface.
- **Flagged for audit (the one genuine subtlety from W92):** inheritance window timers keep ticking during
  suspension — whether to **pause** them for the recovery duration is the decision the audit must make. The
  draft preserves state but does not pause timers; that choice is deliberately left to the audit.

### CID-2 — Proof-of-life challenges recovery (contract side)
- `VaultRecoveryClaim.challengeClaim`: the challenger may now be `claim.originalOwner` **OR** the vault's
  `proofOfLifeWalletView()`. Reliable here because the target vault is resolved from the claim (unlike the
  recovery *initiation* path, where the vault isn't known and a guard would be unsound — the W91 reasoning).
- `CardBoundVault.proofOfLifeWalletView()`: new view proxying the manager's `proofOfLifeWallet` (+ interface
  entries on both sides). One alive-signal, honored by recovery and inheritance.

### W88 — Reclaim until irreversible
- `CardBoundVaultInheritanceManager.ownerOverrideClaim`: guard changed from `STATE_VETO_PERIOD`-only to
  `VETO_PERIOD OR (CLAIM_WINDOW AND !distributionFinalized)`. The owner/proof-of-life can now reclaim until
  assets actually leave (finalization), not at the arbitrary 30-day cliff.
- `finalizeInheritanceDistribution`: added a `CLAIM_FINALIZE_FLOOR` (14d) so heirs all-revealing on day 1
  can't collapse the returning owner's reclaim window to near zero. Floor value is an audit decision.

### W87 — Fault-tolerant guardian threshold
- `CardBoundVaultAdminFacet.setGuardianThreshold`: after setup, reject `threshold == guardianCount` when
  `guardianCount >= 2` (`CBV_ZeroRedundancy`), preserving the single-guardian bootstrap. The contract-level
  enforcement behind the W87 advisory warning.

### Window alignment
- `VaultRecoveryClaim`: `CHALLENGE_PERIOD` 7→14 days; `ACTIVE_VAULT_CHALLENGE_PERIOD` 14→30 days (aligned to
  the inheritance veto for a recently-active vault — the strongest signal the owner may still be present).
  Day-counts are audit risk-appetite calls; the direction (no wild gap between ownership-transition windows)
  is fixed.

## Verification status — explicit, per change
| Change | Layer | Status |
|---|---|---|
| CID-2 business proof-of-life (migration/API/veto) | off-chain | ✅ implemented + tested (2 new tests pass) |
| CID-1 recovery suspends inheritance (claim/finalize guards) | contract | 🔒 drafted, static-checked, UNCOMPILED |
| CID-1 recovery cancels inheritance (executeRecoveryRotation → cancelClaimForRecovery) | contract | 🔒 drafted, static-checked, UNCOMPILED |
| CID-2 proof-of-life challenges recovery (challengeClaim + proxy view) | contract | 🔒 drafted, static-checked, UNCOMPILED |
| W88 reclaim-until-finalized + finalize floor | contract | 🔒 drafted, static-checked, UNCOMPILED |
| W87 reject zero-redundancy threshold | contract | 🔒 drafted, static-checked, UNCOMPILED |
| Window alignment (challenge periods) | contract | 🔒 drafted, static-checked, UNCOMPILED |

Static checks performed on the drafts (the ceiling without a compiler): brace balance (all four contracts
✓), every new symbol defined and used (`CBV_ZeroRedundancy`, `CLAIM_FINALIZE_FLOOR`, `cancelClaimForRecovery`,
`proofOfLifeWalletView`, the tripled `INH_RecoveryInProgress` guard), interface declarations match
implementations, and logic trace of each guard. **These do NOT substitute for compilation + hardhat tests.**

## Remaining risks (honest)
1. **The contract drafts are UNCOMPILED.** A syntax error, a wrong storage assumption, a delegatecall-slot
   issue, or an incorrect revert condition would not be caught here. They must be compiled, reviewed, and
   hardhat-tested under the professional audit before any deploy. This is the real gate.
2. **CID-1 timer-pause decision is open** — the one genuine state-machine subtlety; the draft preserves
   inheritance state during recovery suspension but does not pause its window timers. The audit must decide.
3. **CID-1 / CardBoundVault is faceted** — the changes I made are to the main contract + manager + recovery,
   not the admin facet's storage mirror (no new storage added to the facet's mirrored region), so slot
   alignment is unaffected. An auditor must confirm this on a real build.
4. **Business proof-of-life has no UI** — like the rest of the business-continuity flow (W89), it's
   API-complete but unsurfaced. Designating/using it needs a frontend, deferred.
5. **Day-count choices** (14d challenge, 30d active-vault challenge, 14d finalize floor) are risk-appetite
   judgments for the audit, not derived from code.

## Completion decision
**Off-chain CID-2: ✅ COMPLETE (implemented + verified).** **The five contract changes: ✅ DRAFTED to spec,
🔒 awaiting compilation + audit.** The implementation work is done and grounded; what cannot be done in this
environment — compile and verify on-chain — is explicitly *not* claimed. Preparedness remains at **conditional
certification** until the audit compiles, reviews, and hardhat-tests these drafts; faking verification here
would be the one thing the whole campaign refused to do.

## Next
**Wave 94 — Ownership Transition Verification:** under a real toolchain (or the professional audit), compile
the drafts, then adversarially test each — recovery precedence (incl. the suspend/resume + timer decision),
proof-of-life across institutions, reclaim-until-finalized + floor, guardian redundancy, and the aligned
windows. Only after that passes does Preparedness move from conditional to **full certification**. Off-chain,
build the business-continuity + proof-of-life UI (W89/CID-2).
