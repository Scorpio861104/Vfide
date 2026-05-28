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

---

### 2026-05-24 (late) — CircuitBreaker.sol re-classification

The top-level `contracts/CircuitBreaker.sol` was **not** an orphan stub.
Initial audit only scanned imports inside `contracts/*.sol` and missed
`contracts/scripts/deploy-phase1.ts:177`, which deploys it via
`ethers.getContractFactory('CircuitBreaker')`. The ABI is also imported
by `lib/abis/index.ts` and validated at startup.

The deletion (commit `4287e1d9`) was reverted in commit `a00a2ff2` after CI
exposed the regression (`ENOENT: contracts/CircuitBreaker.sol` in hardhat tests).

**Lesson for future housekeeping passes:** before deleting a contract,
grep for `getContractFactory('<Name>')` and `import.*<Name>.json` across
the full repo (not just `contracts/`), including `scripts/` and `lib/`.

CircuitBreaker remains in the codebase. Its decommissioning, if desired,
is a separate, larger piece of work that must also remove the Phase 1
deploy step and the ABI import — out of scope for this housekeeping pass.

---

## 10. Errata addendum — 2026-05-27 audit pass (PR #270, PR #271)

Three areas of the manual require updates following the post-v1.1 engineering work. All changes are already merged or pending merge to `main`.

---

### 10.1 Appendix 4 — EscrowManager section: replace with CommerceEscrow constants

**Status:** Section 2 of this document already noted that `EscrowManager` was removed and `HIGH_VALUE_THRESHOLD` / `ARBITER_TIMELOCK` should be dropped from Appendix 4. That was correct at the time of writing. However, PR #271 (2026-05-27) **restores both constants** — and adds three new ones — directly into `CommerceEscrow.sol`. The "drop row" instructions in §2 above are now superseded by this section.

**Correct Appendix 4 replacement rows:**

| Constant | Old location (manual) | New location | Value | Notes |
|---|---|---|---|---|
| `HIGH_VALUE_THRESHOLD` | `EscrowManager.sol:89` | `CommerceEscrow.sol:109` | `10,000 VFIDE` | Escrows at or above this flag `isHighValue = true` and emit `HighValueEscrowOpened`. |
| `ARBITER_TIMELOCK` | `EscrowManager.sol:92` | `CommerceEscrow.sol:111` | `7 days` | DAO must wait this long from `disputedAt` before calling `resolve()` on high-value escrows. |
| `LOCK_TRUSTED` | *(new — not in manual v1.0)* | `CommerceEscrow.sol:99` | `3 days` | Score ≥ 8,000 (80%) — trusted buyer dispute lock. |
| `LOCK_NEUTRAL` | *(new — not in manual v1.0)* | `CommerceEscrow.sol:101` | `7 days` | Score 4,000–7,999 — standard buyer dispute lock. |
| `LOCK_LOW_TRUST` | *(new — not in manual v1.0)* | `CommerceEscrow.sol:103` | `14 days` | Score < 4,000 — extended buyer dispute lock. |
| `OPEN_ESCROW_EXPIRY` | *(new — not in manual v1.0)* | `CommerceEscrow.sol:92` | `7 days` | Unfunded OPEN escrows auto-cancellable by anyone after this window (M-COMMERCE-1). |

**Recommended prose update for the CommerceEscrow section:**

> Dispute locks are score-tiered — the same Seer Constitution principle that determines your burn fee also determines how long you must hold a funded escrow before raising a dispute. A buyer with a ProofScore of 8,000 or above (the trusted tier) must wait 3 days from funding before disputing. A buyer in the neutral band (4,000–7,999) waits 7 days. A buyer below 4,000 waits 14 days. Merchants have no lock — they control delivery and can flag a problem immediately. High-value escrows (≥ 10,000 VFIDE) additionally require the DAO to observe a 7-day deliberation window from the moment of dispute before resolving, giving both parties time to present evidence off-chain.

---

### 10.2 Appendix 4 — ProofScoreBurnRouter: add structural floor constants

PR #270 (2026-05-27) promoted the burn floor and daily cap from governance-settable defaults to **hardcoded structural minimums**. The manual documents `dailyBurnCap` and `minimumSupplyFloor` as mutable governance parameters. That is still correct — they remain settable via `setSustainability()`. What the manual omits is that they now have hard lower bounds that cannot be undercut regardless of any governance vote.

**New rows to add to Appendix 4 (ProofScoreBurnRouter):**

| Constant | Location | Value | Notes |
|---|---|---|---|
| `MIN_DAILY_BURN_CAP` | `ProofScoreBurnRouter.sol:166` | `100,000 VFIDE` | Hard structural minimum for `dailyBurnCap`. Any `setSustainability()` proposal below this value reverts at proposal time and again at apply time. Same immutability class as `protocolFeeBps = 0`. |
| `MIN_SUPPLY_FLOOR` | `ProofScoreBurnRouter.sol:169` | `50,000,000 VFIDE` | Hard structural minimum for `minimumSupplyFloor`. Burns will always pause before the circulating supply drops below 50M VFIDE, regardless of any governance configuration. |

**Recommended prose addition (§8, burn mechanics):**

> The governance-settable parameters `dailyBurnCap` and `minimumSupplyFloor` have hard structural minimums enforced by immutable constants: `MIN_DAILY_BURN_CAP = 100,000 VFIDE` and `MIN_SUPPLY_FLOOR = 50,000,000 VFIDE`. A DAO proposal to set either value below its floor will revert. These floors cannot be changed without a contract upgrade and carry the same weight of commitment as the zero merchant fee.

---

### 10.3 Appendix 4 — MerchantPortal: protocolFeeBps is now a constant

The manual documents `protocolFeeBps` as a DAO-settable parameter (manual p. 34, Appendix 4). PR #255 (2026-05-25) changed this. It is now a `public constant` hard-coded to `0`.

**Updated Appendix 4 row:**

| Field | Old | New |
|---|---|---|
| `protocolFeeBps` | Mutable; DAO-settable (default 0) | **Immutable constant = 0.** Cannot be changed by any governance vote or upgrade. Constructor argument removed. |

**Recommended prose update (§4, merchant fee section):**

> The protocol merchant fee is zero. This is not a governance default — it is an immutable constant (`protocolFeeBps = 0` in `MerchantPortal.sol`). No DAO vote, no upgrade proposal, no operator action can change it. The constructor argument for this value was removed in PR #255.

---

### 10.4 Appendix 4 — OwnerControlPanel: emergency_pauseAll clarification

The manual implies `emergency_pauseAll()` halts token transfers. It does not, by design. PR #270 added explicit documentation in the contract's NatDoc, but the manual should reflect this too.

**Recommended prose update (§7, emergency mechanisms):**

> `emergency_pauseAll()` suspends burn fee collection for up to 7 days and does **not** halt token transfers. Token transfers cannot be paused by any party — including the developer — per the Seer Constitution (§3: "No entity can freeze, blacklist, or seize"). The circuit-breaker transfer halt was intentionally removed (PR #311). The absence of a transfer pause is a design commitment, not a missing feature.

---

### 10.5 Summary of Appendix 4 row changes from this addendum

| Action | Row |
|---|---|
| **REPLACE** | `HIGH_VALUE_THRESHOLD` — new location `CommerceEscrow.sol:109`, value unchanged |
| **REPLACE** | `ARBITER_TIMELOCK` — new location `CommerceEscrow.sol:111`, value unchanged |
| **ADD** | `LOCK_TRUSTED = 3 days` at `CommerceEscrow.sol:99` |
| **ADD** | `LOCK_NEUTRAL = 7 days` at `CommerceEscrow.sol:101` |
| **ADD** | `LOCK_LOW_TRUST = 14 days` at `CommerceEscrow.sol:103` |
| **ADD** | `OPEN_ESCROW_EXPIRY = 7 days` at `CommerceEscrow.sol:92` |
| **ADD** | `MIN_DAILY_BURN_CAP = 100,000 VFIDE` at `ProofScoreBurnRouter.sol:166` |
| **ADD** | `MIN_SUPPLY_FLOOR = 50,000,000 VFIDE` at `ProofScoreBurnRouter.sol:169` |
| **UPDATE** | `protocolFeeBps` — from "mutable default 0" to "immutable constant 0" |
| **UPDATE** | `emergency_pauseAll` prose — transfers are NOT paused, by design |

