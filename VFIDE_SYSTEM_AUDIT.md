# VFIDE System-Wide Contract-to-Frontend Audit

**Date.** 2026-05-15
**Scope.** 23 critical contracts (frontend-facing or value-holding).
**Method.** For each contract, enumerate external/public functions, cross-reference against frontend hook usage (wagmi `functionName:` patterns) across `hooks/`, `components/`, `app/`, and `lib/`.

This audit replaces the previous per-contract audits with a complete view of the system. Earlier per-contract docs (VFIDE_CONTRACT_REVIEW.md, VFIDE_CBV_FRONTEND_AUDIT.md, VFIDE_VRC_FRONTEND_AUDIT.md) remain valid for their specific contracts; this document is the high-level map.

---

## Summary table

| Contract | Source fns | Wired | % | Status |
|---|---|---|---|---|
| CardBoundVault | 74 | 38 | 51% | 🟡 MOST |
| CardBoundVaultInheritanceManager | 20 | 15 | 75% | 🟢 GOOD |
| CardBoundVaultWithdrawalQueueManager | 8 | 4 | 50% | 🟡 MOST |
| CardBoundVaultPaymentQueueManager | 8 | 3 | 37% | 🟡 MOST |
| DevReserveVestingVault | 11 | 3 | 27% | 🟠 PARTIAL |
| MerchantPortal | 43 | 7 | 16% | 🟠 PARTIAL |
| CardBoundVaultAdminManager | 22 | 3 | 13% | 🟠 PARTIAL |
| VaultHub | 42 | 5 | 11% | 🟠 PARTIAL |
| DAO | 48 | 3 | 6% | 🟠 PARTIAL |
| EcosystemVault | 46 | 3 | 6% | 🟠 PARTIAL |
| ProofScoreBurnRouter | 33 | 2 | 6% | 🟠 PARTIAL |
| FeeDistributor | 19 | 1 | 5% | 🟠 PARTIAL |
| Seer | 41 | 2 | 4% | 🟠 PARTIAL |
| VaultRecoveryClaim | 22 | 0 | 0% | 🔴 UNREACHABLE |
| MerchantRegistry | 9 | 0 | 0% | 🔴 UNREACHABLE |
| CommerceEscrow | 10 | 0 | 0% | 🔴 UNREACHABLE |
| SanctumVault | 25 | 0 | 0% | 🔴 UNREACHABLE |
| ProofLedger | 9 | 0 | 0% | 🔴 UNREACHABLE |
| EscrowManager | 23 | 0 | 0% | 🔴 UNREACHABLE |
| DAOTimelock | 19 | 0 | 0% | 🔴 UNREACHABLE |
| EmergencyControl | 26 | 0 | 0% | 🔴 UNREACHABLE |
| LiquidityIncentives | 9 | 0 | 0% | 🔴 UNREACHABLE |
| FraudRegistry | 25 | 0 | 0% | 🔴 UNREACHABLE |

**Totals.** 581 source functions across 23 critical contracts. 92 wired to frontend (16%). 489 contract functions have no frontend consumer.

---

## The 10 unreachable contracts

These contracts have zero functions called from any frontend code. Listed in order of LOC (proxy for build cost):

1. **VaultRecoveryClaim** (860 LOC, 22 fns) — the comprehensive recovery flow with guardian votes, verifier votes, challenge windows, claim reasoning, my R-8 trustee/cooldown/window additions. Documented in VFIDE_VRC_FRONTEND_AUDIT.md.

2. **FraudRegistry** (778 LOC, 25 fns) — DAO-verified fraud reports with 30-day escrow. Per memory context, this was added "non-custodial fraud reporting." Has no UI.

3. **EmergencyControl** (653 LOC, 26 fns) — protocol-level pause / emergency state machine. Critical safety surface with no UI to invoke it.

4. **SanctumVault** (564 LOC, 25 fns) — the fund that receives 20% of burn fees (Howey-safe distribution). Treasury for the project's longer-term holdings. No UI for withdrawals, governance, or status display.

5. **DAOTimelock** (539 LOC, 19 fns) — DAO action timelock. If governance proposals execute through timelocked actions, the UI for executing those is missing.

6. **VFIDECommerce / MerchantRegistry** (515 LOC, 9 fns) — merchant identity registration. This is where the merchant profile lives. **The earlier ABI bug we discussed was here.** The 3 functions called are on a different `MerchantPortal` contract, not this one.

7. **VFIDECommerce / CommerceEscrow** (in same file, 10 fns) — payment escrow logic. No UI.

8. **EscrowManager** (514 LOC, 23 fns) — the main payment escrow contract. Distinct from `CommerceEscrow`. No UI.

9. **LiquidityIncentives** (270 LOC, 9 fns) — Liquidity Bootstrap Pool incentive distribution. Per memory, this powers the LBP launch strategy. No UI.

10. **ProofLedger** (121 LOC, 9 fns) — append-only event ledger that ProofScore feeds from. No UI reads or writes.

**Combined LOC.** ~5,300 lines of unreachable contract code across these 10.

---

## The 9 partially-wired contracts (<33% reachable)

These have some surface exposed but most of the contract is unused from the frontend:

| Contract | Wired / Total | Notes |
|---|---|---|
| MerchantPortal (43 fns) | 7 wired | Likely the merchant-facing identity contract — 7 functions cover the basic identity + display surface. The other 36 are likely fee config, governance handles, etc. |
| VaultHub (42 fns) | 5 wired | Vault lookups work. Recovery rotation execution, admin functions, hub-level governance — none surfaced. |
| DAO (48 fns) | 3 wired | Governance is barely accessible. 3/48 = users can probably see proposals but not vote, propose, or execute. |
| EcosystemVault (46 fns) | 3 wired | EcosystemVault gets 10% of burns; managed by DAO. Most of its surface is governance-callable, hence not user-facing. May be acceptable. |
| ProofScoreBurnRouter (33 fns) | 2 wired | Fee preview reads. The router's configuration surface is admin-only by design. |
| Seer (41 fns) | 2 wired | Score reads. Most of Seer is internal scoring math and admin tuning. May be acceptable. |
| FeeDistributor (19 fns) | 1 wired | Distribution math. May be acceptable (admin-only surface). |
| CardBoundVaultAdminManager (22 fns) | 3 wired | This is the M-CBV-02 finding — most apply/cancel functions are unreachable. Documented previously. |
| DevReserveVestingVault (11 fns) | 3 wired | Dev reserve vesting. Limited surface needed. |

---

## What this means

Three categories of unreachable code emerge:

**Category A: "Should be wired, isn't"** — features the protocol genuinely offers but users can't reach.

- VaultRecoveryClaim — comprehensive recovery. Decision made: wire it (per the latest discussion).
- FraudRegistry — fraud reporting. Per project memory this is a real feature.
- MerchantRegistry / CommerceEscrow / EscrowManager — payment escrow and merchant identity. Core to the merchant story.
- LiquidityIncentives — LBP incentives. Critical for the launch.
- DAO + DAOTimelock — governance. The protocol needs governance to be reachable for the DAO to function.

**Category B: "Admin-only, intentionally not in user UI"** — admin surfaces accessed via Etherscan or dedicated admin console.

- ProofLedger — append-only ledger, written by other contracts, read by Seer. Users don't interact directly.
- EmergencyControl — emergency pause; should be accessible to authorized callers (DAO, multisig) via dedicated admin tools.
- SanctumVault — fund management; DAO-governed; not user-facing.

**Category C: "Mostly admin with some user surface"** — partially-wired contracts that may not need more wiring.

- VaultHub, DAO, EcosystemVault, ProofScoreBurnRouter, Seer, FeeDistributor — the partial-wiring is likely intentional, with admin surface deliberately not in UI.

---

## Findings as actionable items

### 🔴 H-SYS-01: User-facing features built but not exposed.

Multiple major user-facing features have full contract implementations with zero UI:

- Comprehensive recovery flow (VaultRecoveryClaim)
- Merchant identity registration (MerchantRegistry)
- Payment escrow (CommerceEscrow, EscrowManager)
- Fraud reporting (FraudRegistry)
- LBP / liquidity incentives (LiquidityIncentives)
- DAO governance (DAO, partial wiring at 6%)
- Sanctum fund display (SanctumVault — at minimum show balance / status)

This is the largest body of work outstanding. Each is a real feature that the protocol cannot deliver without its UI.

### 🟡 M-SYS-01: ABI files missing for queue managers.

`CardBoundVaultWithdrawalQueueManager` and `CardBoundVaultPaymentQueueManager` are referenced (queue display works) but have no ABI files in `lib/abis/`. The wiring works because the queue functions are called through the vault's ABI (which proxies). However, any direct interaction would need ABIs generated.

### 🟢 L-SYS-01: Inheritance is well-wired.

`CardBoundVaultInheritanceManager` at 75% wired. This is the most fully-integrated subsystem. Good baseline for what "comprehensively wired" looks like.

---

## Recommendations: priority order

Per the decision to keep everything comprehensive:

### Tier 1: Reveal-blocking (must be wired before testnet reveal)

1. **VaultRecoveryClaim** — already decided. Build the hooks + UI.
2. **MerchantRegistry / CommerceEscrow / EscrowManager** — the merchant pitch fails if merchants can't register and accept payments. (Note: existing merchant flows use other contracts — needs investigation as to whether these three are the canonical contracts or duplicates of MerchantPortal.)
3. **DAO governance UI** — proposing, voting, executing.
4. **FraudRegistry** — the non-custodial fraud-reporting flow.

### Tier 2: Important for launch but can defer

5. **SanctumVault display** — at least show balance + status; full management can wait.
6. **LiquidityIncentives** — LBP-specific; needed when LBP launches but not at testnet reveal.
7. **EcosystemVault display** — same shape as SanctumVault.

### Tier 3: Admin-only — acceptable as-is

8. **EmergencyControl** — accessed via DAO or multisig, not user UI.
9. **ProofLedger** — internal-only; reads happen through Seer.
10. **DAOTimelock** — used via DAO; doesn't need direct UI if DAO UI is comprehensive.
11. **Remaining admin surfaces** on partially-wired contracts.

---

## The hard question

This is approximately **3-5 weeks of focused frontend work** to wire up Tier 1 alone. Each contract needs:
- New hook files (`useRecoveryClaim`, `useMerchantRegistry`, `useEscrowManager`, `useDAO`, `useFraudRegistry`)
- Page or component implementations
- Wiring into existing pages (recovery into `/vault/recover`, merchant into `/merchant`, etc.)
- ABI export through `lib/abis/index.ts`
- Tests

This is a real time commitment. The audit-first approach is correct — discovering these gaps before mainnet would have been catastrophic. But fixing them is a meaningful project, not a quick sweep.

The next decision point: do we proceed with Tier 1 wiring in order (VaultRecoveryClaim first, then merchant flow, then DAO, then fraud), or is there a different priority you want?

---

## Appendix: VaultRegistry not in this audit

`VaultRegistry` was not in the critical-contracts list but bears mentioning. It IS used (the `/vault/recover` search uses `searchByRecoveryId`, `searchByEmail`, `searchByUsername`, `searchByGuardian`). Worth a focused audit pass when convenient since it's the lookup substrate for recovery.

## Appendix: Disambiguation needed

The presence of TWO merchant-related contracts (`MerchantRegistry` in `VFIDECommerce.sol` AND `MerchantPortal.sol`) AND two escrow contracts (`CommerceEscrow` in `VFIDECommerce.sol` AND `EscrowManager.sol`) suggests possible duplication or legacy code. Before wiring any of these, the architectural relationship needs to be clarified: which is canonical and which (if any) should be deleted?
