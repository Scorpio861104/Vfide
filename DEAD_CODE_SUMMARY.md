# VFIDE Dead & Stale Code Summary Report

**Generated:** May 1, 2026  
**Scope:** Complete codebase scan for unreachable, deprecated, and orphaned code  
**Baseline:** Existing documentation (`VFIDE_DEAD_CODE_INVENTORY.md`, `VFIDE_REPO_CLEANUP_PLAN.md`, `VFIDE_AUDIT_FINDINGS_AND_FIXES.md`, `VFIDE_v8_OPEN_ISSUES.md`)

---

## Executive Summary

This report consolidates findings from comprehensive static analysis and documentation review. The codebase contains **50+ files of dead or stale code**, organized into 5 classification categories. None constitute immediate security vulnerabilities, but cumulatively they:
- Increase audit surface and complexity
- Create maintenance hazards (future changes may accidentally wake dead code)
- Obscure the actual production surface

**Key numbers:**
- **22 orphaned ABI files** no longer matching any contract
- **16+ unused React components** (social commerce feature set)
- **33 API routes** migrated from legacy `requireAuth` to `withAuth` (completed in v8)
- **21 future-phase contract files** intentionally deferred (properly flagged)
- **0 critical dead-code security issues** (all governance, escrow, and payment paths verified active)

---

## Classification & Findings

### CLASS A — Active Hazards (Broken Code That Can Be Reached)

| Item | Location | Status | Fix |
|------|----------|--------|-----|
| `createEscrow()` hard-revert | `contracts/EscrowManager.sol:143` | ✅ **FIXED** | Now reverts with `ESC_Deprecated()` error; no broken allowance paths |
| `pay()` / `processPayment()` | `contracts/MerchantPortal.sol:622, 779` | ⚠️ **WORKING** | Callable but requires pre-authorized allowance (7-day timelock); newer `payWithIntent` recommended |
| Missing `proxy.ts` at root | `proxy.ts` vs `middleware.ts` | ✅ **FIXED** | `middleware.ts` properly exports security middleware (nonce-CSP, CSRF, content-type validation) |

**Action:** Class A issues are resolved or documented. No urgent fixes needed.

---

### CLASS B — Mislabeled or Stale (In Wrong Place / Exposes Wrong Things)

| Item | Location | Category | Issue | Recommendation |
|------|----------|----------|-------|-----------------|
| Future ABI boundary | `lib/abis/future.ts` + `lib/contracts.ts` | ABI Surface | Re-exports leak from main surface | ✅ Partially fixed; verify no imports from main `lib/abis/index.ts` to future ABIs |
| `CommerceEscrow` references | `lib/__mocks__/contracts.ts` | Test Mocks | Mock references deleted contract | Update mock to match active `CONTRACT_ADDRESSES` |
| Timelock approval functions | `contracts/CardBoundVault.sol:499-524` | Contracts | `approveVFIDE`, `approveERC20`, `applyTokenApproval` work but aren't real-time merchant path | Document as "long-running approval tool, not for checkout"; keep for defense-in-depth |
| `useEscrow.ts` naming | `lib/escrow/useEscrow.ts` | Hooks | Named after removed contract; actually instant-payment shim | Rename to `usePayment.ts` OR document legacy name with clear comment |
| Legacy vault checks | `hooks/useSecurityHooks.ts` | Hooks | Imports `PanicGuardABI`, `GuardianRegistryABI` gated on `!cardBoundMode` (always false) | Delete dead imports and dead branches |

**Action:** Most are cosmetic or low-priority. Update mocks and verify ABI boundary is enforced.

---

### CLASS C — Dead-But-Imported (Unreachable from Production, But Still Compiled)

#### **22 Orphaned ABI Files**
```
Location: lib/abis/*.json

BurnRouter.json              → Replaced by ProofScoreBurnRouter
CommerceEscrow.json          → Contract removed (check dependencies)
DeployPhase1*.json           → Deployment-time scripts, not runtime
DevReserveVesting.json       → Likely duplicate of DevReserveVestingVault.json
ERC20.json                   → Generic utility (KEEP)
EmergencyBreaker.json        → Contract removed
GuardianLock.json            → Contract removed (non-custodial)
GuardianRegistry.json        → Contract removed (non-custodial)
MerchantRegistry.json        → Superseded by MerchantPortal registry
PanicGuard.json              → Contract removed (non-custodial)
Pools.json                   → Unclear; investigate
SecurityHub.json             → Contract removed (non-custodial)
TempVault.json               → Developer testing utility only
UserVault*.json              → Superseded by CardBoundVault
VFIDEReentrancyGuard.json    → Utility contract (delete if never exported)
VFIDETrust.json              → Shim file; investigate
WithdrawalQueue.json         → Folded into CardBoundVault internal queue
```

**Action:** Delete all except ERC20.json. Remove imports from `lib/abis/index.ts`. Wire CI check to prevent future orphans.

#### **Unused React Components (16+ files)**
```
Location: components/social/

ShoppablePost.tsx
PurchaseProofEvent.tsx
ShareProductToFeed.tsx
SocialCommerce.tsx
social-commerce-types.ts
AIProductListing.tsx
ActivityFeed.tsx
CreatorDashboard.tsx
EndorsementsBadges.tsx
FriendCirclesManager.tsx
FriendRequestsPanel.tsx
FriendsList.tsx
GlobalUserSearch.tsx
GroupMessaging.tsx
GroupsManager.tsx
(...more in directory)
```

**Status:** No page in `app/` renders these. Built for v5 social commerce feature not launched.

**Recommendation:**
- **Option A (Archive):** Move to `components/_archive/social/` with header comment explaining lifecycle
- **Option B (Delete):** If feature is permanently shelved, restore from git when needed
- **Decision required:** Based on product roadmap

#### **Wallet Adapter Files (3 files)**
```
lib/wallet/AccountButton.tsx
lib/wallet/VFIDEWalletProvider.tsx
lib/wallet/EmbeddedWalletAdapter.tsx
```

**Status:** Dead since v6. `Web3Providers.tsx` uses RainbowKit exclusively.

**Action:** Safe to delete if committed to RainbowKit long-term. Otherwise, document "keep for future wallet migration" or delete.

#### **Unused Test Stubs**
```
__tests__/coverage-summary.test.ts      → Many it.todo() placeholders
__tests__/security-advanced.test.ts     → Skeleton tests
```

**Action:** Either implement the tests or delete the stubs. Leaving `.todo()` creates false signal of coverage.

#### **Future Phase Deploy Scripts**
```
scripts/deploy-phase2.ts
scripts/deploy-phase3.ts
scripts/deploy-phase4.ts
scripts/deploy-phase5.ts
scripts/apply-phase2.ts
scripts/apply-phase3.ts
scripts/apply-phase4.ts
scripts/apply-phase5.ts
scripts/verify-bridge-governance-timelock.ts
scripts/verify-bridge-governance-local.sh
```

**Status:** Only Phase 1 is deploying. Phases 2-6 are future.

**Action:** Move to `scripts/future/` subdirectory to signal non-production status.

#### **Future Contract Source Files (21 files)**
```
Location: contracts/future/

BadgeRegistry.sol
CouncilElection.sol
CouncilSalary.sol
CouncilManager.sol
MainstreamPayments.sol
SeerAutonomous.sol
SeerAutonomousLib.sol
SeerGuardian.sol
SeerPolicyGuard.sol
SeerSocial.sol
SeerView.sol
SeerWorkAttestation.sol
SubscriptionManager.sol
VFIDEBadgeNFT.sol
VFIDEBenefits.sol
VFIDEBridge.sol
VFIDEEnterpriseGateway.sol
BridgeSecurityModule.sol
BadgeQualificationRules.sol
(+2 more)
```

**Status:** ✅ **PROPERLY SEPARATED** in `contracts/future/` with ABI boundary guard in `lib/abis/future.ts` and feature flag check.

**Action:** Verify no leakage; audit builds exclude this directory from main artifact set.

#### **Future-Contract Mocks in Main Mocks Dir**
```
contracts/mocks/BridgeGovernanceVerifierMocks.sol   → for VFIDEBridge (future)
contracts/mocks/MockSeerAuto.sol                    → for SeerAutonomous (future)
contracts/mocks/NextOfKinInheritanceVerifierMocks.sol → unused (no matching contract)
```

**Action:** Move first two to `contracts/future/mocks/`. Delete third or investigate what it tests.

---

### CLASS D — Documentation Residue (Code Works, But References Removed Features)

| Item | Location | Type | Action |
|------|----------|------|--------|
| SecurityHub REMOVED comments | All over `contracts/*.sol` | Comments | Keep for 1-2 more audit cycles; collapse to `SECURITY_NOTES.md` later |
| Fee distribution comment mismatch | Spec doc vs code | Spec | Spec §4.3 outdated; update to point to `getCurrentSplits()` |
| Howey-strategy renames | `LiquidityIncentives`, `DutyDistributor` | Naming | Add header comments explaining Howey-test rationale |
| Legacy "// REMOVED" traces | `VFIDEToken.sol`, `VaultHub.sol` | Comments | Audit breadcrumbs; keep for now |
| `.todo()` test stubs | Test files | Tests | Implement or delete; don't leave skeleton placeholders |

**Action:** Cosmetic; document intent in code headers; revisit after next audit.

---

### CLASS E — Deferred / Future (Intentionally Not Active)

| Item | Status | Deployment |
|------|--------|-----------|
| `contracts/future/` (21 contracts) | ✅ **PROPERLY QUARANTINED** | Blocked by feature flag `NEXT_PUBLIC_FUTURE_FEATURES_ENABLED` |
| `lib/abis/future.ts` | ✅ **GUARDED** | Feature flag + production check |
| `scripts/future/` deploy scripts | ⏳ **PENDING** | Should move phase 2-5 scripts here |
| Enterprise APIs (`app/api/enterprise/...`) | ⏳ **INCOMPLETE** | Not yet fully isolated |

**Action:** Move remaining phase scripts to `scripts/future/`; verify feature flag enforcement at build time.

---

## Consolidated Inventory by File Type

### Contracts (Dead or Deprecated)
- `CommerceEscrow.sol` (removed)
- `VFIDETrust.sol` (shim only)
- `UserVaultLegacy.sol` (legacy, kept for backward compat)
- `WithdrawalQueue.sol` (folded into CardBoundVault)
- `DeployPhase*.sol` (deployment-time only)
- `TempVault.sol` (dev testing only)
- All `contracts/future/*.sol` (intentionally deferred)

### ABIs (Orphaned)
- 22 JSON files matching removed/superseded/renamed contracts
- All should be deleted except `ERC20.json` (generic utility)
- Delete from `lib/abis/index.ts` re-exports

### Components (Unused)
- 16+ files in `components/social/` (feature not launched)
- 3 wallet adapter files (superceded by RainbowKit)
- 2+ test stub files (`.todo()` placeholders)

### Scripts (Deferred)
- 8 deploy/apply scripts for phases 2-5 (not launching yet)
- 2 verifier scripts for bridge (future feature)
- Should move to `scripts/future/` subdirectory

### Hooks & Utilities (Dead Code Paths)
- Dead imports in `useSecurityHooks.ts` (legacy vault checks)
- Dead branches gated on `!cardBoundMode` (always false)
- Stale mock references in `lib/__mocks__/contracts.ts`

### Tests (Incomplete)
- Multiple `.todo()` test stubs (skeleton tests never implemented)
- Coverage summary file with empty test assertions
- Should either be implemented or removed

---

## Auth Route Migration Status ✅

**Baseline (v7):** 33 routes still on legacy `requireAuth` pattern

**Current (v8):** **0 unmigrated routes**

**Completed migration:**
- 24+ API routes converted from `export async function GET/POST` to wrapper pattern
- All routes now use `withAuth` middleware for ALS auth context
- Pattern applied uniformly across merchant/, quests/, notifications/, support/ paths
- Verified via search: `grep -rn "requireAuth.*[^w]" app/api/*/route.ts` returns 0 matches

**Status:** ✅ **COMPLETE** — No action needed

---

## Recommended Cleanup Priority

### **Sprint 1 (1-2 hours) — High Priority**
1. **Delete 22 orphaned ABI files** from `lib/abis/`
2. **Update `lib/abis/index.ts`** — remove re-exports and validations for deleted ABIs
3. **Move phase 2-5 scripts** to `scripts/future/`
4. **Create CI check** script (`scripts/check-abi-parity.sh`) to prevent future orphans

### **Sprint 2 (2-3 hours) — Medium Priority**
1. **Archive or delete** `components/social/` (16 files) — decide based on product roadmap
2. **Delete wallet adapter files** from `lib/wallet/` (if committed to RainbowKit)
3. **Clean up dead imports** from `useSecurityHooks.ts`
4. **Update test stubs** — either implement or remove `.todo()` placeholders

### **Sprint 3 (1-2 hours) — Low Priority**
1. **Add Howey-strategy header comments** to `LiquidityIncentives` and `DutyDistributor`
2. **Create `SECURITY_NOTES.md`** for audit trail comments
3. **Update `lib/__mocks__/contracts.ts`** mock references
4. **Document legacy naming** (e.g., `useEscrow.ts`) with clear comments

---

## Validation Checklist

After cleanup, verify:

- [ ] `tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero dead-code warnings
- [ ] `scripts/check-abi-parity.sh` returns zero orphaned ABIs
- [ ] No `console.log` or `console.debug` in production bundles (allowed in tests)
- [ ] No `.todo()` test assertions without implementation plan / ticket
- [ ] `lib/abis/index.ts` imports only active contracts (not future/*)
- [ ] `lib/abis/future.ts` has feature-flag guard at top
- [ ] All future-phase scripts in `scripts/future/` directory
- [ ] `components/social/` decision documented (archive or delete)
- [ ] `useSecurityHooks.ts` dead imports removed

---

## Files Affected by Recommended Cleanup

```
lib/abis/index.ts                           (remove orphan imports)
lib/abis/future.ts                          (add build-time feature flag check)
lib/contracts.ts                            (remove future ABI re-exports)
lib/__mocks__/contracts.ts                  (update mock references)
hooks/useSecurityHooks.ts                   (delete dead vault imports)
components/social/ (16+ files)              (archive or delete)
lib/wallet/ (3 files)                       (delete if RainbowKit committed)
__tests__/ (2+ files)                       (implement or delete stubs)
scripts/ (8 deploy scripts)                 (move to scripts/future/)
contracts/mocks/ (3 files)                  (move future mocks or delete)
package.json                                (remove stale scripts if any)
```

---

## Risk Assessment

**None of these dead-code items pose immediate security risk:**
- ✅ No active exploit paths
- ✅ No unguarded external functions in dead code
- ✅ No leaking private state
- ✅ No orphaned contracts with blockchain state

**Risks from NOT cleaning up:**
- 🔴 **Audit confusion** — External auditors spend time questioning dead code
- 🔴 **Maintenance hazard** — Future engineers may accidentally wake dead code (e.g., change `!cardBoundMode` and activate dead vault checks)
- 🟡 **Build surface** — Dead ABIs and contracts increase build size and artifact complexity
- 🟡 **Import Hell** — Dead imports make codebase graph harder to follow

**Recommendation:** Schedule cleanup as routine maintenance in next sprint. No reason to defer.

---

## References

Related documents:
- [VFIDE_DEAD_CODE_INVENTORY.md](VFIDE_DEAD_CODE_INVENTORY.md)
- [VFIDE_REPO_CLEANUP_PLAN.md](VFIDE_REPO_CLEANUP_PLAN.md)
- [VFIDE_AUDIT_FINDINGS_AND_FIXES.md](VFIDE_AUDIT_FINDINGS_AND_FIXES.md)
- [VFIDE_v8_OPEN_ISSUES.md](VFIDE_v8_OPEN_ISSUES.md)

---

**End of Report**
