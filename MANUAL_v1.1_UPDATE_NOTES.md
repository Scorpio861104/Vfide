# VFIDE Complete Manual — Update Notes for v1.1

**Source manual:** v1.0 — Testnet Edition, dated 2026-05-10, codebase baseline v19.13.
**Reconciled against:** repo `Vfide-main` (snapshot 2026-05-19) and `contracts/PRODUCTION_SET.md`.

The manual was finalized **before** Operations Phase Turn 4 (2026-05-14 → 2026-05-16) cleaned up the contract set. Every divergence below is documented in `contracts/PRODUCTION_SET.md`; this file translates that cleanup into a list of manual edits.

---

## 1. Contracts to remove from T1 inventory

These contracts are referenced in the manual but are no longer part of the active production set. Each has a dated removal note in `PRODUCTION_SET.md`.

| Contract in manual | Actual disposition |
|---|---|
| `EscrowManager` (Phase 3+, 433 LOC) | **Removed 2026-05-15.** Superseded by `CommerceEscrow` (lives inside `VFIDECommerce.sol`, line 303). Use a different dispute model: DAO-arbitrated, no arbiter timelock. |
| `VFIDEFinance` (Treasury, 262 LOC) | **Renamed `EcoTreasuryVault` 2026-05-16** so file and contract names match. Functionally unchanged. |
| `CircuitBreaker` (Oracles & Safety, 556 LOC) | **Moved to `contracts/legacy/` 2026-05-16.** V1 uses the token-level `VFIDEToken.setCircuitBreaker(bool, uint256)` flag instead. |
| `VaultInfrastructure` (Phase 2, 1,333 LOC) | **Moved to `contracts/legacy/` 2026-05-16.** Superseded by CardBoundVault + VaultHub. |
| `DutyDistributor` (Treasury) | **Deferred to future 2026-05-16.** Howey-compliant alternative `IGovernanceHooks` implementation. V1 keeps the already-deployed `GovernanceHooks` instead. |
| `StablecoinRegistry` (Oracles & Safety, 308 LOC) | **Deferred to future 2026-05-16.** V1 is VFIDE-only by architectural decision. |

## 2. Constants/line numbers to update or drop from the p. 14–15 threshold table

| Constant | Manual location | Actual location | Notes |
|---|---|---|---|
| `WITHDRAWAL_DELAY = 7 days` | `CardBoundVault.sol:95` | `CardBoundVault.sol:190` (just added) AND `CardBoundVaultPaymentQueueManager.sol:5` AND `CardBoundVaultWithdrawalQueueManager.sol:5` | Now resolvable on `CardBoundVault`; canonical home is the two queue managers. |
| `MIN_ROTATION_DELAY` / `MAX_ROTATION_DELAY` / `SENSITIVE_ADMIN_DELAY` / `MAX_GUARDIANS` | `CardBoundVault.sol:48–51` | `CardBoundVault.sol:186–189` | File grew ~200 lines; values unchanged. |
| `HIGH_VALUE_THRESHOLD` | `EscrowManager.sol:89` | **Gone** (EscrowManager removed) | Drop row from table. |
| `ARBITER_TIMELOCK` | `EscrowManager.sol:92` | **Gone** (EscrowManager removed) | Drop row from table. |
| `minTotalBps` / `maxTotalBps` / `microTxFeeCeilingBps` / `microTxMaxAmount` | `ProofScoreBurnRouter.sol:94–97` | `ProofScoreBurnRouter.sol:95–98` | Off by 1; values unchanged. |
| `dailyBurnCap` | `ProofScoreBurnRouter.sol:114` | `ProofScoreBurnRouter.sol:115` | Off by 1; value unchanged. |
| `minimumSupplyFloor` | `ProofScoreBurnRouter.sol:118` | `ProofScoreBurnRouter.sol:119` | Off by 1; value unchanged. |

## 3. Contracts to ADD to T1 inventory (production contracts the manual missed)

These exist in the repo and ship with `PRODUCTION_SET.md`, but aren't mentioned in the manual at all:

- `EcoTreasuryVault.sol` (266 LOC) — Treasury (replaces the `VFIDEFinance` entry).
- `CardBoundVaultAdminManager.sol` (245 LOC) — per-vault auxiliary, spawned by CardBoundVault constructor.
- `CardBoundVaultInheritanceManager.sol` (644 LOC) — per-vault auxiliary, next-of-kin inheritance flow.
- `CardBoundVaultPaymentQueueManager.sol` (216 LOC) — per-vault auxiliary, holds payment-queue delay.
- `CardBoundVaultWithdrawalQueueManager.sol` (210 LOC) — per-vault auxiliary, holds withdrawal-queue delay.

Add to the Phase 2 / CardBoundVault section a note: "CardBoundVault decomposed into a main contract + 4 per-vault auxiliary modules (Admin, Inheritance, PaymentQueue, WithdrawalQueue) spawned by its constructor."

## 4. Inventory counts on T1 p. 68

| Group | Manual says | Actual | Change |
|---|---|---|---|
| Production (`contracts/*.sol`) | 41 | 42 | → **42** |
| Future (`contracts/future/*.sol`) | 20 | 21 | → **21** (manual's Phase 3+ table on p. 70 already lists 22 entries) |
| Interfaces | 27 | 27 | no change |
| Mocks | 11 | 11 | no change |
| Pools | 3 | 3 | no change |
| Libraries | 3 | 3 | no change |
| Legacy | 2 | 4 | → **4** (CircuitBreaker, VaultInfrastructure moved in 2026-05-16) |
| Testnet | 1 | 1 | no change |
| **Total** | 108 | 112 | → **112** |

## 5. Fee-split prose — two-layer split clarification

The manual currently says two different things about the fee split because there are two splits at two different layers, and the prose doesn't disambiguate.

**Recommended fix:** Add this paragraph after the 60-second summary's fee sentence, and again in Chapter 3 (ProofScore) or wherever fees are explained at length:

> The fee is split in two stages. **Stage 1 (ProofScoreBurnRouter, code at line 992):** the total fee is split 40% burned / 10% to Sanctum Fund / 50% to the EcosystemVault. **Stage 2 (FeeDistributor, code at line 167):** the 50% ecosystem share is then redistributed 35% additional burn / 20% additional Sanctum / 15% DAOPayrollPool / 20% MerchantCompetitionPool / 10% HeadhunterCompetitionPool. End result: the merchant still pays nothing and the buyer's fee is unchanged; the system just routes the ecosystem share through five purposes instead of one.

Then the table on p. 14 row "FeeDistributor split default 35 / 20 / 15 / 20 / 10" makes sense as a Stage-2 row rather than appearing to contradict the prose.

## 6. New-user fee figure

p. 8 (60-second summary): "*A new user pays five percent on a transfer*"

p. 12 and p. 13 both say ~3.82%. The code (`ProofScoreBurnRouter._calculateLinearFee` at NEUTRAL score 5,000) computes 3.81%.

**Recommended fix:** change p. 8 to "*A new user pays about 3.8% on a transfer*."

## 7. API and migration counts (p. 72, p. 75)

- "127 API routes total ... reproducible with `find app/api -name route.ts | wc -l` (yields 127 in v19.13)" → **actual count: 136 route.ts files.** Recommend updating to "approximately 130+ routes; counts grow as features ship — `find app/api -name route.ts | wc -l` gives the current value."
- "136 SQL migration files in /migrations/" → **actual: 77 distinct migrations (153 files counting up + down).** Recommend: "77 forward migrations in `/migrations/` (each paired with a `.down.sql` rollback file)."

## 8. LOC drift in T1 tables (advisory — these change every commit)

The manual's LOC counts are stale by 1 – 208 lines per contract. None of these are problems; they just need a refresh, or could be dropped entirely from a published manual since LOC is a poor stability metric. Notable:

- `CardBoundVault` 1,536 → 1,744 (+208) — consequence of recent fraud-escrow / inheritance integrations.
- `VFIDETermLoan` 1,139 → 1,249 (+110).
- `VaultRecoveryClaim` 760 → 840 (+80).
- `VaultHub` 638 → 697 (+59).
- `MerchantPortal` 1,217 → 1,250 (+33).

Most others within ±10 lines. Phase-1 pool contracts and `ProofLedger` are exact matches.

---

## Summary

- **Code change required:** 1 (added `WITHDRAWAL_DELAY` constant on `CardBoundVault`).
- **Manual updates required:** ~25 surgical edits, no structural rewrite needed.
- **Architectural "discrepancies" that turned out to be intentional, dated, documented:** 6 (all in `PRODUCTION_SET.md`).

The shipping codebase is **ahead of** the manual, not behind it.

---

## 9. Errata addendum — 2026-05-24 audit pass

A full contract-set audit on `main` (HEAD `2c44f0e`) against the manual's reference card found one additional discrepancy not previously documented in v1.1:

### `CouncilManager.sol` — file does not exist; interface still in use

The manual cites `CouncilManager.sol:54, 56, 177-191` for the `COUNCIL_MIN_SCORE`, `GRACE_PERIOD`, and member-removal logic (manual p. 50, Appendix 4 p. 102). No file by that name exists anywhere in the repo.

Current state:
- The `ICouncilManager` interface remains declared in `contracts/SharedInterfaces.sol:620`, exposing `getActiveMembers()`, `isActiveMember(address)`, `getCouncilSize()`.
- `contracts/EcosystemVault.sol:302` holds an `ICouncilManager public councilManager` and calls `councilManager.getActiveMembers()` at line 1783, inside the council-salary stablecoin distribution path.
- `contracts/future/CouncilElection.sol:35` is the concrete contract that tracks council membership, with `minCouncilScore = 7000` (line 222) and `getCouncilMembers()` (line 714). It does **not** declare `is ICouncilManager` and uses a different function name (`getCouncilMembers` vs `getActiveMembers`).
- `scripts/deploy-full.ts` does not call `EcosystemVault.setCouncilManager()` — the council-salary distribution path is dormant on V1 mainnet.

**Recommended manual edit:** wherever the manual cites `CouncilManager.sol`, change the citation to `CouncilElection.sol` and add a one-line note: "The `ICouncilManager` interface in `SharedInterfaces.sol` is satisfied by a future-phase adapter (or by renaming `CouncilElection.getCouncilMembers` → `getActiveMembers` and declaring `is ICouncilManager` when council-salary stablecoin distribution ships in a later phase). The council-salary path is dormant on V1; `setCouncilManager` is not wired by `deploy-full.ts`."

**Why this is not a V1 blocker:**
- The `councilManager` field is set via timelocked `setCouncilManager()` (24h pending change); a deployer would only wire it when CouncilElection is ready and the adapter pattern is chosen.
- `EcosystemVault._distributeCouncilSalary` (the only consumer of `councilManager`) is part of the Phase-3+ stablecoin distribution surface, not V1 mainnet bootstrap.
- The manual's three commitments — no freeze, no blacklist, no seize — are unaffected.

### Cross-references to PRODUCTION_SET.md and the audit report

- The `contracts/CircuitBreaker.sol` (5KB) orphan stub was deleted in `chore: delete orphan top-level CircuitBreaker.sol` (2026-05-24). The canonical reference copy remains at `contracts/legacy/CircuitBreaker.sol` as documented in `PRODUCTION_SET.md`.
- `SanctumVault` `1 days` and `90 days` literals were lifted to named constants `DISBURSEMENT_DELAY` and `PROPOSAL_EXPIRY` in `chore(sanctum): lift inlined 1-day/90-day literals` (2026-05-24). Values unchanged; matches the manual reference card exactly.
