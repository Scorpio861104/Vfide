# VFIDE Wave 74 — Launch Blocker Resolution

Resolves what's resolvable and prepares the rest for audit/deployment. **One real build** (production
Stability Bond contract + tests) plus evidence-grounded preparation for Priorities 1, 3, 4, 5, 6.
Verified: typecheck 0, **73 tests / 7 suites** (incl. 7 new StabilityBond invariant tests).

---

## PRIORITY 2 (BUILT) — Stability Bond production contract
`contracts/StabilityBond.sol` (promoted from `contracts/drafts/StabilityBond.draft.sol`). Production
hardening over the draft:
- **SafeERC20** for all token movement (imported via `SharedInterfaces.sol`, the codebase convention —
  precedent: `RevenueSplitter.sol` imports the same trio).
- **ReentrancyGuard** (`is ReentrancyGuard`, `nonReentrant` on `bond`/`withdraw`).
- **Fee-on-transfer safe accounting** — bonds the *measured* balance delta (`balanceOf` before/after),
  never the requested amount, so a transfer tax can't create an under-collateralized bond.
- **Custom errors**, per-owner `totalBonded` aggregate for O(1) Seer reads, `activeBondedAmount` /
  `hasActiveBondOfTerm` views, zero-address constructor check.
- **Non-custodial guarantee preserved and permanent**: no admin, no owner role, no pause, no seize, no
  early-release-by-other. Early withdrawal binds only the consenting owner (maturity gate). Immutable —
  the absence of those functions is the guarantee.
- **7 source-level invariant tests** (`__tests__/contracts/StabilityBond.test.ts`) assert each of the
  above, runnable without a compiler.

**HONEST audit status:** prepared for audit, **NOT deployed**, **NOT compiled in this sandbox** — the
0.8.30 solc compiler can't be downloaded here (network-restricted). The import line and all interface
members (`balanceOf`, `safeTransfer`/`safeTransferFrom`, `nonReentrant`) are verified present in
`SharedInterfaces.sol`, and an existing contract imports the identical trio, so it is expected to compile
in the project's hardhat CI. **A `hardhat compile` + a deploy-and-call test in `test/hardhat/` must pass
before deployment** — those run where the compiler is available.

---

## PRIORITY 1 — Contract Deployment Matrix (evidence: 109 `.sol` files; 74 `NEXT_PUBLIC_*_ADDRESS` vars)
Classification is by repository evidence: source present, test present, draft vs production, deploy-config
present. **No contract is deployed or audited yet** — that's the universal gate.
| Contract(s) | Source | Tests | Config | Class |
|---|---|---|---|---|
| VFIDEToken | ✅ | ✅ static invariants | env var | **READY_FOR_AUDIT** |
| CardBoundVault (+ facets/managers, ~20 files) | ✅ | ✅ hardhat+static | env vars | **READY_FOR_AUDIT** (complex; largest audit surface) |
| VaultRecovery / Guardian (GuardianLock) | ✅ | ✅ | env var | **READY_FOR_AUDIT** |
| P2P Lending (TermLoan) | ✅ | ✅ | env var | **READY_FOR_AUDIT** |
| DAO / DAOTimelock / DAOPayrollPool | ✅ | ✅ hardhat | env vars | **READY_FOR_AUDIT** |
| EcoTreasuryVault / EcosystemVault | ✅ | ✅ hardhat | env vars | **READY_FOR_AUDIT** |
| CouncilElection / CouncilSalary / DutyDistributor | ✅ | partial | env vars | **READY_FOR_AUDIT** |
| Whale Protection (in-token AntiWhale + BurnRouter) | ✅ | ✅ | env var | **READY_FOR_AUDIT** |
| CircuitBreaker / EmergencyBreaker | ✅ | ✅ | env vars | **READY_FOR_AUDIT** |
| FraudRegistry | ✅ | ✅ | env var | **READY_FOR_AUDIT** |
| **StabilityBond** | ✅ **(new)** | ✅ static (hardhat pending) | needs env var | **READY_FOR_AUDIT** (pending `hardhat compile`) |
| Deploy scripts (DeployPhase1…3to6) | ✅ | — | — | **READY_FOR_DEPLOYMENT** (orchestration) |
**Summary:** essentially the whole on-chain suite is **READY_FOR_AUDIT** (source + tests + config
templates exist); **none is BLOCKED on missing code.** The blocker is the audit + deployment *process*,
not the contracts.

---

## PRIORITY 3 — DEX intelligence infrastructure (design only; no data fabricated)
**Evidence of the gap:** `lib/indexer/service.ts` ingests `Transfer`, `ScoreSet`, `UserEndorsed`,
`PaymentProcessed` — **no Swap/Sync events**; `VFIDE_LIQUIDITY_ADDRESSES` defaults empty. Market Impact
(0 consumers) + full Extraction need this. **Minimum honest infrastructure:**
- **Required events to ingest** (Uniswap-V2-style pools): `Swap(sender, amount0In, amount1In, amount0Out,
  amount1Out, to)` and `Sync(reserve0, reserve1)` from each configured VFIDE pool.
- **Required sources:** the pool contract addresses (set `VFIDE_LIQUIDITY_ADDRESSES`), read over the
  same RPC the indexer already uses. No third-party DEX API required for V2 pools — the events are
  on-chain.
- **Required indexing:** add two `storeEvent` handlers to the existing indexer loop (mirrors the current
  Transfer handler): `storeEvent('swap', …)` and `storeEvent('reserve_sync', …)`.
- **Required storage:** new `event_type` rows in the existing `indexed_events` JSONB table (no schema
  change) + a small `pool_reserves(pool, reserve_vfide, reserve_quote, block_number, updated_at)`
  snapshot table for the latest depth (one migration).
- **Required reserve snapshots:** keep latest `Sync` per pool → `circulatingLiquidity` input for
  `computeMarketImpact`.
- **Required liquidity tracking:** `swapClassification` already classifies buy/sell/liquidity given pool
  membership; feeding real Swap events activates it.
**Scope:** ~2 indexer handlers + 1 migration + wiring `computeMarketImpact` inputs. **Build deferred to a
real infra wave** (the directive said design, not build); critically, **no reserves are simulated** — the
engine stays PARTIAL until real `Sync` data exists.

---

## PRIORITY 4 — Production Deployment Checklist (evidence: 85 env vars, 88 migrations, 6 env templates)
**Database:** Postgres via `DATABASE_URL`; apply all **88 migrations** (`migrations/*.sql`); set
`DB_POOL_MAX`, `DB_SSL_REJECT_UNAUTHORIZED`.
**Chain/RPC:** `RPC_URL` + per-network RPCs (`NEXT_PUBLIC_BASE_SEPOLIA_RPC`, zkSync); deploy contracts,
populate the **74** `NEXT_PUBLIC_*_ADDRESS` vars.
**Indexer:** run `lib/indexer/service.ts` as a process; set `INDEXER_BATCH_SIZE`,
`INDEXER_CONFIRMATION_DEPTH`, `INDEXER_REORG_REWIND_BLOCKS`.
**Redis:** Upstash (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) for rate limiting.
**WebSocket:** `WS_EVENT_BRIDGE_URL`, `WS_INTERNAL_SECRET`, `NEXT_PUBLIC_WS_URL` (polling fallback exists).
**Secrets:** `JWT_SECRET`, `PREV_JWT_SECRET` (rotation), `AUDIT_PSEUDONYM_SALT`,
`WEBHOOK_SECRET_ENCRYPTION_KEY`, `LOCAL_DEV_KEK_BASE` (prod KMS), `LOG_IP_HASH_SALT`.
**Notifications:** Twilio (`TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`), Africa's Talking
(`AFRICASTALKING_API_KEY/USERNAME`) for USSD, VAPID (`VAPID_PRIVATE_KEY/SUBJECT`) for push.
**Price:** CoinGecko (`COINGECKO_API_URL`).
**Monitoring/observability:** Sentry (`SENTRY_DSN`).
**Faucet (testnet only):** `FAUCET_OPERATOR_PRIVATE_KEY` (must be a low-value operator key; never mainnet).
**App:** `APP_ORIGIN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`, admin addresses.
Full canonical list: the 6 committed `.env.{example,local,staging,testnet,production,mainnet}.example`
templates — **nothing here is omitted; those files are the source of truth.**

---

## PRIORITY 5 — Professional audit package (onboarding for external auditors)
- **Architecture overview:** non-custodial DeFi payment protocol. Off-chain (Next.js API + Postgres +
  indexer + Seer intelligence) is advisory; on-chain (CardBoundVault + token + governance) holds funds.
- **Contract inventory:** 109 `.sol` files; primary audit surface = CardBoundVault diamond (~20 files),
  VFIDEToken, FraudRegistry, lending, governance/treasury, recovery/guardian, **StabilityBond (new)**.
- **Threat model:** non-custodial invariant (no freeze/seize/blacklist — enforced by code *absence*);
  anti-whale flat limits (equal to all); ProofScore fee curve; reentrancy (guards + CEI); fee-on-transfer
  (StabilityBond now measures deltas); oracle/circuit-breaker recovery gaps (prior audits).
- **Ownership model:** CardBoundVault per-user; funds release only to owner/inheritance flow; no admin seize.
- **Recovery model:** guardian multi-sig (`RECOVERY_APPROVALS_REQUIRED = 3`), 7-day delay (DAO 14-day).
- **Governance model:** DAO + 48h timelock; override ledger is DB transparency; treasury on-chain.
- **Market-stability model:** Extraction Index + Whale Protection are discretionary friction (services),
  never token control; Market Impact pending DEX feed.
- **Builder Record model:** off-chain contribution score; unlocks services, never authority.
- **Known risks / open dependencies:** the Wave 73 Infrastructure Reality Report
  (`docs/WAVE_73_INFRASTRUCTURE_REALITY_REPORT.md`) is the authoritative open-dependency list.
- **Audit scope:** all `contracts/*.sol` except `contracts/drafts/` and `*.t.sol`/mocks; emphasis on the
  vault diamond and StabilityBond (handles locked funds).

---

## PRIORITY 6 — Launch readiness scorecard (assume DB/RPC/indexer/secrets exist)
| Institution | Code | Infra | Audit | Deploy | Launch | Evidence |
|---|---|---|---|---|---|---|
| Ownership/Vault | ✅ | ✅(given) | ❌ | ❌ | ❌ | contracts exist, unaudited |
| ProofScore | ✅ | ✅ | ❌ | ❌ | ❌ | indexer mirrors ScoreSet |
| Builder Record | ✅ | ✅ | n/a (off-chain) | n/a | ✅* | DB-derived, tested |
| Merchant HQ/Health/Discovery | ✅ | ✅ | n/a | n/a | ✅* | recompute-on-read, tested |
| Lending | ✅ | ✅ | ❌ | ❌ | ❌ | engine ready; ceiling contract unaudited |
| Recovery | ✅ | ✅ | ❌ | ❌ | ❌ | real writeContract; contract unaudited |
| Continuity (records/funds) | ✅/✅ | ✅ | ❌(funds) | ❌(funds) | partial | DB executable; fund half on-chain |
| Governance (ledger/voting) | ✅/✅ | ✅ | ❌(voting) | ❌(voting) | partial | DB ledger live; contracts unaudited |
| Stability Bond | ✅ **(new)** | ✅ | ❌ | ❌ | ❌ | production contract written, audit pending |
| Market Stability (Extraction/Impact) | ⚠️ PARTIAL | ❌ DEX feed | n/a | n/a | ❌ | no swap/reserve ingestion |
| Sanctum | ✅ | ✅ | n/a(recommend) | ❌(vault) | partial | DB queue; disbursement on-chain |
*Off-chain institutions are launch-ready once DB/RPC/indexer exist; everything custodial waits on audit+deploy.

---

## FINAL — assuming DB/RPC/indexer/secrets exist, what remains? (ranked, evidence-only)
### CRITICAL
1. **Professional audit + contract deployment** of the on-chain suite. *Evidence: 74 address vars unset;
   no deployed addresses; StabilityBond/all contracts unaudited.* Gates ownership, recovery, lending
   enforcement, governance/treasury, bonding.
2. **`hardhat compile` + deploy-and-call tests** must pass (incl. new StabilityBond). *Evidence: compiler
   not runnable in this sandbox; CI required.*
### HIGH
3. **DEX Swap/reserve ingestion** (Priority 3 spec) to move Extraction/Swap/Market-Impact from PARTIAL to
   LIVE. *Evidence: indexer ingests no Swap events.*
### MEDIUM
4. **Carrier-tracking API** for automated delivery verification. *Evidence: `shipments/route.ts` is
   self-reported.*
5. **SMS/USSD + push provider credentials** (Twilio, Africa's Talking, VAPID) for unbanked onboarding.
### LOW
6. **Observability/price** (Sentry DSN, CoinGecko) — degrade gracefully.

## Bottom line
The off-chain app is launch-ready given infrastructure. The **single Critical path is audit + deploy of
the on-chain contracts** — all of which are now READY_FOR_AUDIT (source + tests + config), including the
newly-written production **StabilityBond**. The remaining items are a well-scoped DEX-feed addition
(designed, not faked) and integration credentials. There is now a verified path from repository state to
deployment state: audit → deploy → set addresses → run indexer (+ DEX handlers) → integrate carriers/SMS.
