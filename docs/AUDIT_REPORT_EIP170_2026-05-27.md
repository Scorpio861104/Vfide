# EIP-170 Full Compliance Audit — Final Report
**Date:** 2026-05-27
**Codebase baseline:** v19.13+ (branch `main`, final commit `ba295fb`)
**Compiler:** solc 0.8.30, viaIR, runs:0, revertStrings:strip, bytecodeHash:none
**Hard limit:** 24,576 bytes (EIP-170 runtime bytecode)
**Default buffer policy:** 24,000 bytes (enforced via `verify-contract-size-buffer.ts`)
**Auditor:** Internal — AI-assisted sweep + solc-js verification

---

## Executive Summary

All 190 production contracts are verified under the EIP-170 24,576-byte runtime bytecode
limit. Three contracts that previously violated or exceeded the limit — `CardBoundVault`,
`MerchantPortal`, and `VFIDEToken` — have been restructured using view-satellite and
admin-delegatecall-facet patterns. Zero violations remain.

---

## Final Bytecode Sizes — Key Contracts

| Contract | Pre-Audit (B) | Post-Audit (B) | Headroom (B) | Status |
|---|---|---|---|---|
| **CardBoundVault** | ~29,668 | 19,341 | +5,235 | ✅ PASS |
| CardBoundVaultAdminFacet *(new)* | — | 11,467 | +13,109 | ✅ PASS |
| CardBoundVaultAdminManager | — | 5,084 | +19,492 | ✅ PASS |
| CardBoundVaultInheritanceManager | — | 10,590 | +13,986 | ✅ PASS |
| CardBoundVaultPaymentQueueManager | — | 2,724 | +21,852 | ✅ PASS |
| CardBoundVaultWithdrawalQueueManager | — | 2,976 | +21,600 | ✅ PASS |
| CardBoundVaultBytecodeProvider | — | 22,095 | +2,481 | ✅ PASS |
| CardBoundVaultDeployer | — | 2,553 | +22,023 | ✅ PASS |
| **MerchantPortal** | 24,569 | 23,421 | +1,155 | ✅ PASS |
| MerchantPortalViewer *(new satellite)* | — | 2,896 | +21,680 | ✅ PASS |
| **VFIDEToken** | 24,489 | 23,775 | +801 | ✅ PASS |
| VFIDETokenViewer *(new satellite)* | — | 2,387 | +22,189 | ✅ PASS |
| **EcosystemVault** | 24,409 | 24,409 | +167 | ✅ PASS ⚠️ TIGHT |
| EcosystemVaultLib | — | 1,010 | +23,566 | ✅ PASS |

**All 190 production contracts: 0 violations. 0 compiler errors. 0 compiler warnings.**

---

## Commit History

| Commit | Description |
|---|---|
| `92ed086` | fix(frontend): correct 7 contract-vs-UI misinformation issues |
| `ba295fb` | feat(eip170): thread adminFacet through CBV deployer chain; add storage mirrors |

---

## Techniques Applied

### 1. Admin Delegatecall Facet — CardBoundVault
The monolithic CardBoundVault (~29,668 B) was refactored using a delegatecall facet pattern:

- `CardBoundVaultAdminFacet` — zero-arg pure logic contract deployed once globally.
  Admin-frequency functions (guardian management, config updates, sweep operations)
  were relocated here and execute via `delegatecall` from the calling vault instance.
- **Storage mirror pattern:** CBV stores `_adminManagerStore`, `_hubStore`,
  `_vfideTokenStore`, `_paymentQueueManagerStore`, `_withdrawalQueueManagerStore`
  as private storage slots in its constructor. The facet reads these via delegatecall
  (where `address(this)` = the calling vault), eliminating the need for constructor
  args on the facet itself.
- `CardBoundVaultBytecodeProvider` — hosts CBV initcode for CREATE2 deployment;
  now accepts `adminFacet` as its 14th argument.
- `CardBoundVaultDeployer` — stores `adminFacet` as an immutable, threads it through
  every `predict()` and `deploy()` call. Constructor reduced from 2 → 3 args.
- `CardBoundVaultSubManagerDeployer` — unchanged; deploys sub-managers independently.

**Net reduction: ~10,327 bytes from CBV main contract.**

### 2. View Satellite Extraction — MerchantPortal, VFIDEToken
Read-only view functions were extracted to companion `*Viewer` satellites:
- Zero write functions; holds no assets; cannot affect protocol state
- Reads parent via public getters + minimal interface
- Parent stores `address public viewer` + `setViewer()` admin setter
- Wired immediately post-deployment in `deploy-full.ts`

**MerchantPortal savings:** ~1,148 bytes (extracted `getMerchantStats`, `getCustomerTrustScore`,
`getRefundStatus`, `getCustomerRefunds`, `getMerchantRefunds`)

**VFIDEToken savings:** ~714 bytes (extracted `remainingDailyLimit`, `canTransfer`,
`previewTransferFees`)

### 3. Pure Math Library — EcosystemVault
`EcosystemVaultLib` hosts all pure math (pool reserve calculations, tier ranking).
All inline string literals removed; `revertStrings:strip` handles the rest.

---

## Integration Test Results (solc-js in-process, 2026-05-27)

```
T-01  AdminFacet has zero-arg constructor                              ✅
T-02  CardBoundVault constructor has 14 params                         ✅
T-03  14th param is _adminFacet                                        ✅
T-04  creationCode() has 14 params                                     ✅
T-05  14th param is adminFacet                                         ✅
T-06  CBVDeployer constructor has 3 params                             ✅
T-06b 3rd param is _adminFacet                                         ✅
T-07  SENSITIVE_ADMIN_DELAY constant present in facet ABI              ✅
T-07b MAX_GUARDIANS constant present in facet ABI                      ✅
T-08  CardBoundVault               19341 B  (+5235 headroom)           ✅
T-08  CardBoundVaultAdminFacet     11467 B  (+13109 headroom)          ✅
T-08  CardBoundVaultBytecodeProvider 22095 B  (+2481 headroom)         ✅
T-08  CardBoundVaultDeployer        2553 B  (+22023 headroom)          ✅

13 tests — 13 passed, 0 failed  🟢 ALL TESTS PASSED
```

---

## Buffer Policy Changes (`verify-contract-size-buffer.ts`)

| Contract | Before | After |
|---|---|---|
| MerchantPortal | `BUFFER_EXCEPTIONS` — `EIP170_RUNTIME_LIMIT` | **Removed** — within 24,000 B default |
| VFIDEToken | `BUFFER_EXCEPTIONS` — `EIP170_RUNTIME_LIMIT` | **Removed** — within 24,000 B default |
| EcosystemVault | `BUFFER_EXCEPTIONS` — `EIP170_RUNTIME_LIMIT` | Retained — 24,409 B, below limit but above buffer |
| CardBoundVault | `OVER_LIMIT_ACKNOWLEDGED`, ceiling 38,000 | **Removed** — now 19,341 B |

---

## Known Remaining Tech Debt

### EcosystemVault — ⚠️ HIGH PRIORITY (+167 B headroom)
Only 167 bytes of headroom remain. This is the highest-risk contract in the codebase.

**Recommended fix (post-launch):** Extract three admin write functions to `EcosystemVaultAdminFacet`
using delegatecall (identical pattern to `CardBoundVaultAdminFacet`):
- `migrateRewardToken` — saves ~665 B
- `setAllocations` — saves ~470 B
- `configureReferralWorkLevels` — saves ~399 B

Combined saving: ~1,534 B → would bring EcosystemVault to ~22,875 B (+1,701 B headroom).

**Architectural rule (effective immediately):** Any new feature or modifier added to
`EcosystemVault.sol` MUST be routed through `EcosystemVaultLib` (pure math) or
`EcosystemVaultView` (read-only queries). Zero new state-mutating functions may be added
to the main contract without first completing the admin facet extraction.

### VFIDEToken — MEDIUM (+801 B headroom)
Additional savings available: `cooldownRemaining`, `getExpectedNetAmount`.

### MerchantPortal — LOW (+1,155 B headroom)
Comfortable buffer. No immediate action required.

---

## Non-Custodial Compliance
All satellite contracts (`MerchantPortalViewer`, `VFIDETokenViewer`) carry explicit header
comments confirming: *"this contract has zero write functions and holds no assets. It cannot
affect protocol state in any way."*

`CardBoundVaultAdminFacet` carries a delegatecall-only warning and explicit prohibition
on direct deployment use. Both measures are consistent with the Seer Constitution's
non-custodial mandate and auditor-transparency requirements.

---

## Deployment Pipeline (`deploy-full.ts`)

New entries added to `DEPLOYMENT_CONTRACTS` preflight list:
- `CardBoundVaultAdminFacet` (Layer 2 — zero args)
- `MerchantPortalViewer` (Layer 4 — after MerchantPortal)
- `VFIDETokenViewer` (Layer 1 — after VFIDEToken)

`CardBoundVaultDeployer` constructor updated from 2 → 3 args:
```ts
new CardBoundVaultDeployer(subManagerDeployer, bytecodeProvider, adminFacet)
```

`validate-phase1-dry-run.ts` updated with `CardBoundVaultAdminFacet` entry (layer 2,
no deps, zero args) and updated `CardBoundVaultDeployer` deps + constructorArgs.
