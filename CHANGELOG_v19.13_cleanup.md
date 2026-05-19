# VFIDE v19.13 Best-Practices Cleanup — Final Changelog

**Sessions:** 2026-05-19
**Scope:** systematic surface-area reduction from contract layer through frontend, plus consistency cleanups from prior audit rounds.
**Result:** no behavioral changes to live contracts; the non-custody guarantee is now structural (absent from ABI, not present-with-revert); ~24% reduction in .sol file count; ~24% reduction in ABI registry surface; broken test/UI references to deleted features removed.

This document covers four phases plus four prior rounds of contract-level cleanup completed in the same working session. Phase boundaries are checkpoints — each phase ended with a verification sweep before moving forward.

---

## Pre-Phase Rounds (contract-internal cleanups, completed before phased work began)

### Round 1 — Manual reference resolution

**`contracts/CardBoundVault.sol`** — added `WITHDRAWAL_DELAY = 7 days` public constant matching the canonical values in the queue managers.

### Round 2 — File/contract name dissonance + footguns

Split `contracts/VFIDECommerce.sol` into `MerchantRegistry.sol` (276 LOC, CRUD + shared interfaces + active `COM_*` errors) and `CommerceEscrow.sol` (381 LOC, escrow state machine, imports MerchantRegistry). Deleted original `VFIDECommerce.sol`; frontend continues working via `sync-abis.ts MERGE_MAP`. Dropped 5 dead `COM_*` errors. Renamed `EscrowManagerVerifierMocks.sol` → `CommerceEscrowVerifierMocks.sol`. Deleted `scripts/deploy-all.ts` and `scripts/apply-all.ts`; ported EIP-170 bytecode preflight into `deploy-full.ts`. Cleaned up `verify-admin-roles.ts` stale entry and replaced contradictory `V1_SCOPE.md` with authoritative-doc pointer.

### Round 2.5 — Vault subdirectory + orphan sweep

Moved 6 vault contracts to `contracts/vault/` (CardBoundVault + Deployer + 4 manager modules). Updated all dependent paths in `VaultHub.sol`, hardhat config, verifier scripts, integration tests, and `PRODUCTION_SET.md`. Deleted `contracts/security/` directory (contained only a stale Jan 2026 README claiming `BLACKLIST_MANAGER_ROLE` and a "Q2 2026 staking system" — directly contradicting the Howey-safe and non-custody guarantees).

### Round 3 — OwnerControlPanel initial cleanup

Removed unused `OCP_UnfreezeViaDAO()` error, fixed misleading "vault freeze through PanicGuard" comments to reflect N-H19 risk-reports semantic, replaced orphan docblock incorrectly attached to `setPanicGuard`.

### Round 4 — Non-custody made structural

**Removed entirely** (not just stubbed) at both OCP and VaultHub layers:

In `OwnerControlPanel.sol`: 4 custody-implying revert stubs (`vault_freezeVault`, `vault_requestDAORecovery`, `vault_finalizeDAORecovery`, `vault_cancelDAORecovery`) + 4 action-id helpers + 2 errors (`OCP_DeprecatedVaultFreeze`, `OCP_RecoveryDisabled`). File shrank by 38 LOC.

In `VaultHub.sol`: 6 recovery revert-stubs (`approveForceRecovery`, `initiateForceRecovery`, `finalizeForceRecovery`, `requestDAORecovery`, `finalizeDAORecovery`, `cancelDAORecovery`) + 1 error (`VH_RecoveryDisabled`).

In `SharedInterfaces.sol`: 3 matching DAO-recovery declarations removed from `IVaultHub`. In `VerificationMocks.sol`: 3 mock overrides removed. In the verifier script: converted from runtime "expect-revert" to static ABI-absence inspection (strictly stronger guarantee). In test files: 3 regex assertions inverted, 1 runtime call replaced with ABI-absence loop.

**Why it matters:** the manual's promise — "the functions that would have enabled it are permanently absent from the contract code" — became literally true at the source, the ABI, and the audit-reader's mental model. Auditors no longer have to verify revert paths; they verify absence.

---

## Phase 1 — Contract dead-code sweep

**Deleted 27 orphan .sol files** (zero callers anywhere in the codebase):

- **24 orphan interfaces** in `contracts/interfaces/`. The directory collapsed from 27 files to 3. The 3 survivors all have legitimate path-import callers: `AggregatorV3Interface.sol` (external Chainlink), `ICommerceEscrow.sol` (test surface), `IVaultInfrastructure.sol` (minimal hub-lookup).
- **`contracts/legacy/SharedInterfaces.sol`** — was a 4-line re-export shim. Repointed the two legacy/ importers to `../SharedInterfaces.sol` directly.
- **`contracts/future/CouncilManager.sol`** — orphan even within the deferred set.
- **`contracts/future/TrustScorePassport.sol`** — orphan even within the deferred set.

**Architectural finding (informs Phase 2 decision):** the orphan-interfaces audit revealed that the codebase has a consistent file-scope interface convention. Consumers declare slim minimal-surface interfaces inside their own files (the `_COM` / `_PAY` shims, `IVaultHub` in `SharedInterfaces.sol`, etc.). The `contracts/interfaces/` directory was a parallel attempt at canonicalization that the actual code never adopted. Phase 2 accepted file-scope as the canonical convention.

**Result:** 113 → 86 .sol files (−24%).

---

## Phase 2 — Contract architecture cleanup (declarations only)

The phase scope was restricted to dead declarations within live contracts; structural refactors deferred.

**43 dead error declarations removed** across 17 files:

- 14 `CBV_*` errors in `vault/CardBoundVault.sol` — leftovers from before queue logic was extracted into manager modules (managers use `PQM_*` / `WQM_*` / `AM_*` namespaces).
- 4 `INH_*` errors in `vault/CardBoundVaultInheritanceManager.sol`.
- Recovery-related errors in `VaultHub.sol`, `VaultRecoveryClaim.sol`, `VaultRegistry.sol`.
- `*ChangeCancelled` cluster in `EcosystemVault.sol`.
- Single-instance dead errors across `DAO`, `DAOTimelock`, `DevReserveVestingVault`, `EcoTreasuryVault`, `FraudRegistry`, `MerchantPortal`, `ProofScoreBurnRouter`, `SystemHandover`, `VFIDEPriceOracle`, `VFIDETermLoan`, `VFIDEToken`.

**15 dead events removed** across 8 files, including:
- 7 `*ChangeCancelled` events in `EcosystemVault.sol` (cancel functionality never wired)
- `PaymentWithChannel` in `MerchantPortal.sol` (frontend was listening for it, but contract never emitted)
- Single-instance dead events across `DAO`, `DAOTimelock`, `DutyDistributor`, `ProofScoreBurnRouter`, `VFIDEToken`, `VaultRecoveryClaim`

**0 dead constants** — 365 constants scanned, all alive. Codebase already clean.

**Test consistency:** 2 broken test blocks in `__tests__/payments/commerce-escrow-audit.test.ts` removed — they were asserting code patterns (`MERCH_RevokeFailed` revert, `swap_failed` and `quote_unavailable` emit reasons) that don't exist in the current code because `_transferWithAutoConvert` was stubbed to immediately revert. The live swap-config-validation tests (slippage bounds, path checks, setAutoConvert) were kept since they audit the actual surface.

**Orphan natspec cleanup:** 1 comment fragment in `CardBoundVault.sol` left by a deleted error declaration.

---

## Phase 3 — ABI bridge

**18 `.bak` / `.bak2` files deleted** from `lib/abis/` — checkpoint snapshots from prior debugging sessions (`VaultHub.json.bak`, `VFIDECommerce.json.bak2`, etc.). Added `*.bak` / `*.bak2` patterns to `.gitignore` to prevent reaccumulation.

**`lib/abis/CouncilManager.json` deleted** — orphan ABI for the contract removed in Phase 1.

**`scripts/future/deploy-phase3.ts`** — removed `'CouncilManager'` from the deploy list (script would have failed at `getContractFactory()` time).

**Comprehensive ABI orphan-detection scan** — every one of the 60 ABIs in `lib/abis/index.ts` has at least one real frontend import. Codebase has good ABI hygiene at the registry level.

**Deliberately kept:**

- `DeployPhase3Peripherals.json` + .sol — has 1 legitimate consumer (`contracts/scripts/deploy-phase3.ts` alternate deploy track) plus 2 test blocks. Removal forces a downstream refactor; cost > benefit at this stage. Mainnet deploy doesn't use it; the audit cost of its presence is low.
- `DevReserveVesting.json` + `MainstreamPayments.json` rename aliases — addressed in Phase 4 (consolidation into single source).

**Cumulative result:** 82 ABI files (including .bak) → 62 (−24%).

---

## Phase 4 — Frontend stale-surface

### 4a — `PaymentWithChannel` event listener (`app/api/merchant/payments/confirm/route.ts`)

Removed the dead `PAYMENT_WITH_CHANNEL_EVENT` `parseAbiItem` and the OR-branch in the decoder that filtered for it. Contract no longer emits this event; the OR-branch was unreachable code. Decoder now matches only `PaymentProcessed`.

### 4b — SecurityHub hook collapse (`hooks/useSecurityHooks.ts`)

Rewrote from 252 LOC to 144 LOC. Removed **6 dead hooks**:
- `useIsVaultLocked` — pure stub returning false; transitional shim with zero remaining consumers
- `useIsGuardian` — zero consumers
- `useGuardianLockStatus` — zero consumers, was a stub
- `useCastGuardianLock` — zero consumers, called `vault.pause()` but nothing wired it
- `useEmergencyStatus` — zero consumers, hardcoded stub
- `useVaultGuardians` — only consumer was an orphan test for a deleted component

Kept the 3 hooks with real production consumers: `useQuarantineStatus`, `useCanSelfPanic`, `useSelfPanic` (all wired to `VaultSecuritySection.tsx`).

Updated file header comment to describe what it actually does today ("Vault Pause Hooks") rather than its historical SecurityHub-bridge role. Listed the 6 removed hooks with reasoning in the header.

**Deleted orphan/duplicate test files:**
- `hooks/__tests__/useSecurityHooksReal.test.ts` — older duplicate that exclusively covered the dead hooks
- `__tests__/components/SecurityGuardianPanel.test.tsx` — orphan test for a deleted component (also the sole consumer of `useVaultGuardians`)

**Updated `__tests__/hooks/useSecurityHooksReal.test.ts`** — removed the entire `useIsVaultLocked` describe block (5 tests for the deleted stub).

### 4c — CouncilManager UI label cleanup

6 frontend components had UI labels describing a 3-contract council architecture (Manager + Salary + Election). Since CouncilManager was deleted in Phase 1, the architecture is now 2-contract.

Updated labels in: `CouncilTab.tsx`, `VotingTab.tsx`, `OverviewTab.tsx`, `MembersTab.tsx`, `HoweySafeModePanel.tsx`, `ProductionSetupPanel.tsx`. The responsibilities formerly attributed to `CouncilManager` (daily ProofScore checks, member removal voting) were merged into the `CouncilSalary` description.

### 4d — TrustScorePassport removal

**Deleted `app/profile/components/TrustPassportCard.tsx`** — orphan component, zero consumers anywhere.

**Rewrote `app/proofscore/components/TrustChallenges.tsx`** body to fix a bug-by-construction: the previous code called `getFutureContractAddress('TrustScorePassport')` and used the resulting address with `CARD_BOUND_VAULT_ABI` to read `guardianCount`. This made no sense even when TrustScorePassport existed (TrustScorePassport is not a vault). Replaced with the canonical `VaultHub.vaultOf(address)` → vault address → `guardianCount` pattern used elsewhere in the codebase.

**`lib/contracts/future-contracts.ts`** — removed `'TrustScorePassport'` from the `FutureContractName` union and the `CONTRACT_ENV_MAP` record (the `NEXT_PUBLIC_TRUST_SCORE_PASSPORT_ADDRESS` env var is no longer expected).

### 4e — `DevReserveVesting` alias consolidation

`lib/abis/DevReserveVesting.json` was a byte-identical duplicate of `lib/abis/DevReserveVestingVault.json` — kept as an alias because the frontend's `DevReserveVestingABI` symbol predates the contract rename to `DevReserveVestingVault`.

**Strategy chosen: collapse into single source via in-memory aliasing**, not a frontend symbol rename (which would have touched 9+ files and required an env-var change). Specifically:

- Deleted `lib/abis/DevReserveVesting.json`.
- Updated `lib/abis/index.ts` to import only `DevReserveVestingVaultRaw` and have both exported ABI constants (`DevReserveVestingABI` and `DevReserveVestingVaultABI`) point to the same source.
- Removed the `DevReserveVesting: "DevReserveVestingVault"` entry from `scripts/sync-abis.ts` `RENAME_MAP` (no longer needed; the duplicate JSON write is gone).
- Removed corresponding entries from `__tests__/abi-parity.test.ts` (`REMAP`) and `scripts/verify-frontend-abi-parity.ts` (`ARTIFACT_OVERRIDES`).

The frontend symbol `DevReserveVestingABI` still works; the env var `NEXT_PUBLIC_DEV_VAULT_ADDRESS` is untouched. No consumer changes.

**`MainstreamPayments` alias** was investigated but needs no consolidation — only one JSON file exists (sync-abis writes `lib/abis/MainstreamPayments.json` from the `MainstreamPriceOracle` artifact via the `RENAME_MAP`). No duplicate to collapse.

### Pre-existing technical debt noted but not addressed

6 files import `getFutureContractAddresses` (plural) and `isFutureFeaturesEnabled` from `@/lib/contracts/future-contracts`, but neither function is exported from that file. This appears to be from a prior refactor that removed the helpers without updating consumers. The build either has TypeScript errors here or strict mode is off. **This is pre-existing technical debt, not introduced by Phase 4.** Affected files:

- `components/social/SubscriptionManager.tsx`
- `hooks/useBadgeHooks.ts`
- `app/governance/components/ElectionsTabContent.tsx`
- `app/vault/recover/page.tsx`

(And a few others that import the same.) The right resolution is either restoring the missing exports or removing the broken imports plus their dependent code — both expand the cleanup scope significantly. Flagged for a future pass.

---

## Cumulative Totals (all phases)

| Category | Count | Notes |
|---|---|---|
| `.sol` files deleted | 27 | Phase 1: orphan interfaces + legacy shim + 2 future-orphans |
| `.sol` file moves | 6 | Round 2.5: vault contracts to `contracts/vault/` |
| In-file declarations removed | 64 | 43 errors + 15 events + 6 dead hooks |
| ABI JSON files removed | 20 | 18 `.bak` + `CouncilManager.json` + `DevReserveVesting.json` |
| Frontend components deleted | 1 | `TrustPassportCard.tsx` |
| Frontend tests deleted | 2 | `SecurityGuardianPanel.test.tsx`, duplicate `useSecurityHooksReal.test.ts` |
| Test blocks rewritten | 5 | smart-contract-security, SecurityFixes, commerce-escrow-audit × 2, useSecurityHooksReal |
| UI labels corrected | 6 | CouncilManager references in 6 components |
| Selectors removed from ABI | ~10 | recovery surface + custody stubs (Round 4) |

**Effect on the non-custody guarantee:**

Before: auditor reading `OwnerControlPanel.sol` or `VaultHub.sol` sees functions named `vault_freezeVault`, `approveForceRecovery`, `requestDAORecovery` etc. and must verify each reverts in every codepath, that no caller exists, that the revert-error declarations can't be reached otherwise, and notes the ABI advertises these selectors to external systems.

After: those functions are gone. The audit checklist collapses to `grep approveForceRecovery contracts/` returning no live code. The manual's promise — "the functions that would have enabled it are permanently absent from the contract code" — is now literally true at the source, the ABI, and the audit-reader's mental model.

---

## Post-pull steps

```bash
# 1. Recompile against the new file layout (vault/, split commerce files,
#    removed selectors/errors/events, deleted interfaces, etc.)
npx hardhat compile

# 2. Refresh ABIs. Expected drift documented below.
npx tsx scripts/sync-abis.ts

# 3. EIP-170 preflight regression test (Round 2 work)
npx jest __tests__/security/deploy-bytecode-guard.test.ts

# 4. Inverted regex tests (Round 4 work)
npx jest __tests__/contracts/smart-contract-security.test.ts

# 5. Optional: full Solidity test suite
npx hardhat test

# 6. Optional: regenerate TypeScript types from the new ABIs
npx hardhat typechain
```

### Expected ABI drift after `hardhat compile`

`sync-abis.ts --check` will flag drift on multiple files. All intentional:

- `lib/abis/OwnerControlPanel.json` — removed selectors: `vault_freezeVault`, `vault_requestDAORecovery`, `vault_finalizeDAORecovery`, `vault_cancelDAORecovery`. Removed errors: `OCP_DeprecatedVaultFreeze`, `OCP_RecoveryDisabled`, `OCP_UnfreezeViaDAO`.
- `lib/abis/VaultHub.json` — removed selectors: `approveForceRecovery`, `initiateForceRecovery`, `finalizeForceRecovery`, `requestDAORecovery`, `finalizeDAORecovery`, `cancelDAORecovery`. Removed error: `VH_RecoveryDisabled`.
- `lib/abis/VFIDECommerce.json` — removed errors only: 5 dead `COM_*` errors. No function changes.
- `lib/abis/CardBoundVault.json` — removed errors: 14 dead `CBV_*` errors (queue-related, never thrown by the proxy).
- `lib/abis/CardBoundVaultInheritanceManager.json` — removed errors: 4 dead `INH_*`.
- `lib/abis/VaultHub.json` (separate from above) — additional removed errors: `VH_NotDAO`, `VH_Create2Failed`, `VH_InsufficientRecoveryApprovals`.
- `lib/abis/VaultRecoveryClaim.json` — removed errors: `NotClaimant`, `NotTrustedVerifier`, `VaultHasNoClaim`.
- `lib/abis/VaultRegistry.json` — removed errors: `RecoveryIdAlreadyTaken`, `EmailAlreadyTaken`, `PhoneAlreadyTaken`, `VaultNotFound`.
- `lib/abis/MerchantPortal.json` — removed errors: `MERCH_VaultLocked`, `MERCH_ApproveFailed`, `MERCH_RevokeFailed`. Removed event: `PaymentWithChannel`.
- `lib/abis/EcosystemVault.json` — removed events: 7 `*ChangeCancelled`, `PaymentMade`, `WorkRewardPaid`. Removed error: `ECO_RewardsNotAvailable`.
- `lib/abis/ProofScoreBurnRouter.json` — removed events: `FeesComputed`, `BurnCapReached`. Removed error: `BURN_NotDAO`.
- `lib/abis/VFIDEToken.json` — removed event: `ExemptSet`. Removed error: `VF_LOCKED`.
- Plus minor drift in `DAO`, `DAOTimelock`, `DevReserveVestingVault`, `DutyDistributor`, `EcoTreasuryVault`, `FraudRegistry`, `ProofScoreBurnRouter`, `SystemHandover`, `VFIDEPriceOracle`, `VFIDETermLoan` from single-instance dead error/event removals.

If any frontend code path references those exact error or event names by string, those callers need to be deleted. The non-custody-related ones never reached the frontend (they revert by design); the auto-convert error names (`MERCH_RevokeFailed` etc.) were tied to a stubbed feature; the others were declared but never thrown/emitted so no UI code could exist for them.

---

## Architectural decisions made this session

1. **Interface convention** (Phase 1 finding, Phase 2 decision): file-scope interface declarations are canonical. The `contracts/interfaces/` directory was a parallel attempt at canonicalization that the codebase never adopted. The 3 remaining interface files in there are legitimate exceptions.

2. **`DeployPhase3Peripherals` retention**: kept because it has 1 legitimate consumer (`contracts/scripts/deploy-phase3.ts` alternate deploy track) plus tests. Mainnet deploy doesn't touch it. Removal would force a downstream refactor for cosmetic gain.

3. **Non-custody at the structural level**: revert-stubs were preferable to absence-of-code when shipped to mainnet (preserves ABI compatibility for external integrations). VFIDE is pre-mainnet — there are no external integrations to preserve. The cost of removal is zero today; the audit-clarity benefit is large. Removed.

4. **Alias consolidation via in-memory aliasing, not frontend symbol rename**: when a duplicate JSON file existed for a frontend-symbol-vs-contract-name rename (DevReserveVesting), collapsed the JSON file but kept the frontend symbol. This was safer than a 9-file frontend rename that would have required an env-var change.

5. **Pre-existing broken imports (`getFutureContractAddresses` plural)**: explicitly flagged but not addressed in this session. Resolution requires either restoring lost helper functions or removing 6+ consumer files plus their dependent code — both are larger work than Phase 4 scope.
