# VFIDE Mainnet Readiness Audit — 2026-05-27

**Audit type:** End-to-end system audit  
**Scope:** Smart contracts, soul/constitution, security patterns, access control, oracle, governance, deployment pipeline, frontend alignment  
**Codebase baseline:** v19.13+ (post-PR #256, post-EIP-170 sweep)  
**Date:** 2026-05-27

---

## Executive Summary

| Layer | Status | Key Findings |
|---|---|---|
| EIP-170 bytecode compliance | ✅ PASS | 58 contracts, 0 errors, 0 violations |
| Soul / Seer Constitution | ✅ PASS | All 6 core commitments verified at contract level |
| Security patterns (tx.origin, selfdestruct, delegatecall) | ✅ PASS | Zero dangerous patterns |
| Reentrancy guards | ✅ PASS | All ETH/token contracts protected |
| Oracle security | ✅ PASS | 2h staleness, roundId check, timelocked feed changes |
| Access control | ✅ PASS | All critical setters gated with delays |
| Governance attack surface | ✅ PASS | Quorum floor, 30-day emergency timelock |
| Deployment script alignment | **FIXED** | 3 gaps found and resolved |
| PRODUCTION_SET.md | **FIXED** | Updated for PR #256 architecture |
| verify-contract-size-buffer.ts | **FIXED** | Stale OVER_LIMIT_ACKNOWLEDGED entry removed |
| Frontend references | ✅ ACCEPTABLE | Legacy ABI aliases documented, non-blocking |
| Remaining tech debt | ⚠️ TRACKED | EcosystemVault 167 B margin, Ownable2Step |

**Verdict: CONDITIONAL GO for testnet.** No security vulnerabilities found. Three deployment blockers fixed. Testnet deploy can proceed against the updated `deploy-full.ts`.

---

## Layer 1 — EIP-170 Bytecode Compliance

Production compiler settings: `viaIR: true`, `optimizer.runs: 0`, `revertStrings: strip`, `bytecodeHash: none`

**Result: 58 contracts compiled — 0 errors, 0 warnings, 0 violations.**

| Contract | Size (B) | Headroom |
|---|---|---|
| EcosystemVault | 24,409 | +167 ⚠️ |
| Seer | 23,847 | +729 |
| VFIDEToken | 23,775 | +801 |
| OwnerControlPanel | 23,468 | +1,108 |
| MerchantPortal | 23,421 | +1,155 |
| CardBoundVaultSubManagerDeployer | 22,716 | +1,860 |
| CardBoundVaultBytecodeProvider | 22,095 | +2,481 |
| VFIDETermLoan | 21,957 | +2,619 |
| VFIDEBridge | 20,536 | +4,040 |
| DAO | 20,132 | +4,444 |
| CardBoundVault | 19,341 | +5,235 |
| *(47 remaining)* | ≤ 15,443 | comfortable |

**EcosystemVault (24,409 B, +167 headroom):** Any new logic will cause a violation. Tracked: extract `EcosystemVaultAdminFacet`. Non-blocking for testnet; blocking for any mainnet feature additions.

---

## Layer 2 — Soul / Seer Constitution Integrity

### 2.1 Merchant Fee — Immutable Zero ✅
```solidity
// MerchantPortal.sol:282
uint256 public constant protocolFeeBps = 0;
```
Solidity `constant` — not storage, not DAO-mutable. The PR #255 soul-lock is intact.

### 2.2 No Freeze / Blacklist / Seize on User Funds ✅
Zero `function freeze`, `function blacklist`, or `function seize` implementations across all production contracts that operate on user assets.

**DevReserveVestingVault exception (correct design):**  
`emergencyFreeze()` is DAO-gated (`require(msg.sender == DAO)`), only pauses dev-reserve vesting claims, fully reversible. No user funds are affected. This is architecturally correct and consistent with the Seer Constitution.

### 2.3 Supply Cap — 200M Tokens ✅
```solidity
// VFIDEToken.sol:84
uint256 public constant MAX_SUPPLY = 200_000_000e18;
// Mint path enforces:
if (totalSupply + amount > MAX_SUPPLY) revert VF_CAP();
```

### 2.4 Burn Floor — 50M Tokens ✅
```solidity
// ProofScoreBurnRouter.sol:201
uint256 public minimumSupplyFloor = 50_000_000 * 1e18;
```
Mutable via `setSustainability()` with a **24-hour timelock**. Correct design per the manual (DAO can tune parameters with notice).

### 2.5 Daily Burn Cap — 500K Tokens ✅
```solidity
// ProofScoreBurnRouter.sol:196
uint256 public dailyBurnCap = 500_000 * 1e18;
```
Also mutable with 24h governance delay.

### 2.6 Key Burn Path — 180-Day Handover ✅
`SystemHandover.sol` tracks `handoverExecuted` (bool). Once executed, `arm()` and `execute()` permanently revert via `SH_AlreadyExecuted()`. Irreversible. The `disarmCount` cap prevents the dev multisig from deferring indefinitely.

### 2.7 Non-Custodial Mandate ✅
No freeze/blacklist/seize anywhere. `REMOVED — non-custodial` comments present where auditors would expect these functions. Confirmed in VFIDEToken (1 comment), VaultHub (2 comments).

---

## Layer 3 — Security Patterns

| Pattern | Result |
|---|---|
| `tx.origin` usage | **0 occurrences** — all authentication uses `msg.sender` |
| `selfdestruct` | **0 occurrences** |
| Unsafe `delegatecall` | **0 occurrences** — only `CardBoundVault.fallback()` to immutable `adminFacet` |
| Assembly blocks | **9 contracts** — all safe, all annotated `// audit-ok(assembly)` |

**Assembly audit:**
- `extcodesize` / `extcodehash` — contract existence (VFIDEToken)
- EIP-712 `calldataload` signature parsing — standard ECDSA (CardBoundVault)
- `CREATE2` — deterministic vault deployment (CardBoundVaultDeployer)
- `delegatecall` dispatch to immutable facet address (CardBoundVault fallback)

No arbitrary storage slot manipulation, no `MSTORE`/`SSTORE` in inline assembly outside audited patterns.

---

## Layer 4 — Reentrancy Guards

All value-transferring contracts inherit `ReentrancyGuard` with `nonReentrant` on external state-mutating functions:

MerchantPortal ✅ | VFIDEToken ✅ | EcosystemVault ✅ | SanctumVault ✅ | VaultHub ✅ | CardBoundVault (vault/) ✅ | VFIDETermLoan ✅ | VFIDEFlashLoan ✅

CardBoundVault uses `slither-disable-next-line reentrancy-no-eth` on exactly two storage updates that follow checks-effects-interactions correctly.

---

## Layer 5 — Oracle Security

`VFIDEPriceOracle.sol` implements a full defense stack:

| Check | Implementation |
|---|---|
| Staleness | `MAX_PRICE_STALENESS = 2 hours` — rejects stale Chainlink rounds |
| Round integrity | `if (answeredInRound < roundId)` — detects incomplete aggregator rounds |
| Zero-value guard | `if (startedAt == 0 \|\| updatedAt == 0)` — rejects malformed data |
| Feed rotation timelock | `pendingChainlinkFeedAt` — feed changes require timelock delay before applying |
| Fallback source | Uniswap V3 TWAP as secondary price source |

---

## Layer 6 — Access Control

| Setter | Gate | Delay |
|---|---|---|
| `ProofScoreBurnRouter.setSustainability()` | `onlyOwner` | 24h |
| `ProofScoreBurnRouter.setFeePolicy()` | `onlyOwner` | 1d cooldown |
| `StablecoinRegistry.addStablecoin()` | `onlyGovernance` | — |
| `EcosystemVault.setAllocations()` | timelocked | 2d |
| `VFIDEPriceOracle.setChainlinkFeed()` | timelocked | required |
| `MerchantPortal.setViewer()` | `_checkDAO()` | — |
| `VFIDEToken.setViewer()` | `onlyOwner` | — |

**Note:** 11 contracts use `Ownable` rather than `Ownable2Step`. At VFIDE's deployment scale (multisig → DAO transition), accidental ownership transfer is mitigated by AdminMultiSig. Upgrade to `Ownable2Step` is recommended for audit cycle 2.

---

## Layer 7 — Governance Attack Surface

**Quorum protections:**
- `ABSOLUTE_MIN_QUORUM = 500` — hard floor preventing cascading reductions
- `EMERGENCY_TIMELOCK_DELAY = 30 days` — emergency quorum rescue requires 14-day warmup
- Emergency rescue can only **decrease** quorum parameters; it cannot increase above current thresholds
- `disarmCount` caps developer handover deferrals

**Flash loan governance attack:** DAO vote weight uses ProofScore 7-day TWAP snapshots. Flash loans cannot manipulate vote weight within a block. ✅

---

## Layer 8 — Deployment Script Gaps (All Fixed)

### Gap 1: Stale `OVER_LIMIT_ACKNOWLEDGED` entry (**FIXED**)

`scripts/verify-contract-size-buffer.ts` still listed `CardBoundVaultDeployer: 56_000` from before the BytecodeProvider extraction. `CardBoundVaultDeployer` is now 2,553 B. Entry replaced with historical comment.

### Gap 2: VaultHub missing 4th constructor argument (**FIXED**)

`deploy-full.ts` called `deploy("VaultHub", token, ledger, dao)` — only 3 arguments. The actual constructor signature is:
```solidity
constructor(address _vfideToken, address _ledger, address _dao, address _vaultDeployer)
```

**Fix:** The CBV factory chain is now pre-deployed in LAYER 3 before VaultHub:

```
1. CardBoundVaultAdminFacet      (zero args)
2. CardBoundVaultSubManagerDeployer (VFIDEToken)
3. CardBoundVaultBytecodeProvider   (SubManagerDeployer)
4. CardBoundVaultDeployer           (SubManagerDeployer, BytecodeProvider, AdminFacet)
5. VaultHub                         (VFIDEToken, ProofLedger, dao, CardBoundVaultDeployer)
```

Without this fix, every testnet/mainnet deploy attempt would revert at VaultHub construction.

### Gap 3: Viewer satellites not in deploy-full.ts (**FIXED**)

`MerchantPortalViewer` and `VFIDETokenViewer` had no deploy entries. Both are now deployed and wired:
- `VFIDETokenViewer`: deployed after VFIDEToken, wired via `token.setViewer()` (owner-gated — deployer signs)
- `MerchantPortalViewer`: deployed after MerchantPortal, wired via `mp.setViewer()` using `bootstrap.dao` signer (`_checkDAO()`-gated)

4 new `NEXT_PUBLIC_` env var exports added: `CBV_ADMIN_FACET_ADDRESS`, `MERCHANT_PORTAL_VIEWER_ADDRESS`, `VFIDE_TOKEN_VIEWER_ADDRESS`, plus the already-present `CARD_BOUND_VAULT_DEPLOYER_ADDRESS`.

---

## Layer 9 — Frontend Alignment

### Non-blocking legacy references
- `lib/abis/index.ts` imports `VaultInfrastructure.json` and `BridgeSecurityModule.json` — retained as forward-compat stubs, not called in V1 hot paths
- `VFIDECommerceABI` alias correctly maps to `CommerceEscrow` ABI — documented in-file
- `CreateTab.tsx` uses `VFIDECommerceABI` — correct per documented alias

None are blocking for testnet.

---

## Remaining Tech Debt

| Item | Priority | Action |
|---|---|---|
| EcosystemVault 167 B margin | 🟡 Medium | Extract `EcosystemVaultAdminFacet` before mainnet feature additions |
| Ownable → Ownable2Step | 🟡 Low | Recommended before external audit |
| CircuitBreaker.sol (root, 1,274 B stub) | 🟢 Cosmetic | Harmless orphan; cleanup optional |
| MerchantPortal.setViewer DAO-signer requirement | 🟡 Medium | Deploy docs updated; must use `bootstrap.dao` signer during deployment |

---

## Recommended Pre-Mainnet Checklist

1. ✅ EIP-170: All 58 contracts verified under limit
2. ✅ Soul-lock: merchant fee constant, no custodial functions
3. ✅ Deploy script: CBV chain pre-deploy + VaultHub 4th arg fixed
4. ⬜ Testnet deploy: run `deploy-full.ts` against testnet and verify all NEXT_PUBLIC_ addresses
5. ⬜ EcosystemVaultAdminFacet extraction (close 167 B margin)
6. ⬜ External audit: recommend Ownable2Step migration before auditor submission
7. ⬜ Verify `bootstrap.dao` signer is available during deployment (MerchantPortal.setViewer)
