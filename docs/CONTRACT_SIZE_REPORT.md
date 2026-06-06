# Contract Size Report — Final State
**Updated:** 2026-05-27
**Commit:** ba295fb
**Compiler:** solc 0.8.30 · viaIR · runs:0 · revertStrings:strip · bytecodeHash:none
**EIP-170 limit:** 24,576 bytes

## Vault System

| Contract | Bytes | Headroom | Notes |
|---|---|---|---|
| CardBoundVault | 19,341 | +5,235 | Admin funcs delegated to facet |
| CardBoundVaultAdminFacet | 11,467 | +13,109 | Delegatecall target — zero-arg deploy |
| CardBoundVaultAdminManager | 5,084 | +19,492 | Sub-manager |
| CardBoundVaultInheritanceManager | 10,590 | +13,986 | Sub-manager |
| CardBoundVaultPaymentQueueManager | 2,724 | +21,852 | Sub-manager |
| CardBoundVaultWithdrawalQueueManager | 2,976 | +21,600 | Sub-manager |
| CardBoundVaultBytecodeProvider | 22,095 | +2,481 | Hosts CBV initcode for CREATE2 |
| CardBoundVaultDeployer | 2,553 | +22,023 | Factory; 3-arg constructor |

## Token

| Contract | Bytes | Headroom | Notes |
|---|---|---|---|
| VFIDEToken | 23,775 | +801 | View funcs extracted to satellite |
| VFIDETokenViewer | 2,387 | +22,189 | Read-only satellite; no state writes |

## Commerce

| Contract | Bytes | Headroom | Notes |
|---|---|---|---|
| MerchantPortal | 23,421 | +1,155 | View funcs extracted to satellite; fee = const 0 |
| MerchantPortalViewer | 2,896 | +21,680 | Read-only satellite; no state writes |

## Treasury

| Contract | Bytes | Headroom | Notes |
|---|---|---|---|
| EcosystemVault | 24,409 | +167 | ⚠️ TIGHT — see tech debt below |
| EcosystemVaultLib | 1,010 | +23,566 | Pure math library |

## ⚠️ Tech Debt — EcosystemVault

Only **167 bytes** of headroom remain. No new state-mutating functions may be added
to `EcosystemVault.sol` without first completing `EcosystemVaultAdminFacet` extraction.

Planned extraction (~1,534 B total savings):
- `migrateRewardToken` — ~665 B
- `setAllocations` — ~470 B
- `configureReferralWorkLevels` — ~399 B

Target post-extraction size: ~22,875 B (+1,701 B headroom).

---

*Full audit narrative: `docs/AUDIT_REPORT_EIP170_2026-05-27.md`*
