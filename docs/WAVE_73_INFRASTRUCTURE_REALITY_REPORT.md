# VFIDE Infrastructure Reality Report (Wave 73)

An evidence-only audit of what stands between this repository and a real production deployment. No
features built (the directive said stop). Every claim is grounded in a specific file/grep in the uploaded
repo. Baseline: typecheck 0 errors.

## How to read this
For each institution: **what operates today**, and **what external dependency blocks "exactly as
designed."** Blockers ranked Critical / High / Medium / Low at the end.

---

## PHASE 1 — Market Stability reality
**Evidence:** `lib/indexer/service.ts` ingests only `Transfer`, `ScoreSet`, `UserEndorsed`,
`PaymentProcessed` events (lines 114/129/153/168). **No `Swap`, `Sync`, `Mint`, or `Burn` events.**
`VFIDE_LIQUIDITY_ADDRESSES` defaults to empty (`signals.ts:31`).
| Component | Reality |
|---|---|
| Builder Record | **LIVE** — derives from merchant/gov/recovery/continuity DB signals |
| Extraction Index | **PARTIAL** — engine + decay + persistence live; reads real transfer amounts, but DEX **swap classification has no swap-event feed** (safely classifies all as `transfer`, flags no one, until pools configured) |
| Swap Classification | **PARTIAL** — logic correct; needs indexer Swap ingestion + `VFIDE_LIQUIDITY_ADDRESSES` set |
| Market Impact | **PARTIAL (orphan)** — engine correct + unit-tested, **0 consumers**; needs **pool reserves + holdings snapshots** that don't exist in-repo |
| Stability Bonding | **PARTIAL** — engine live as HQ preview; needs on-chain bond contract (Phase 6) |
| Lending Policy | **LIVE** — ProofScore + Builder + Extraction → suggested terms (advisory; on-chain ceiling enforced by contract) |
| Whale Protection | **LIVE** (engine) — consumes Extraction; discretionary friction only |
**Missing dependencies:** DEX Swap-event ingestion in the indexer; configured pool/router addresses;
pool-reserve + holdings snapshots for Market Impact. **No pool reserve feed exists today.**

## PHASE 2 — Merchant reality
**Evidence:** Twilio in 2 files, Africa's Talking USSD in 1 (`app/api/ussd/route.ts` with
`ALLOW_MOCK_USSD` escape hatch). Payments confirmed via `merchant_payment_confirmations` +
`MERCHANT_PAYMENT_MIN_CONFIRMATIONS` (on-chain tx confirmation count).
| System | Reality |
|---|---|
| Merchant HQ / Health / Trust / Discovery | **LIVE** (code) — recompute from DB on read; need live DB |
| Bookings / Subscriptions / Wholesale | **LIVE** (code + DB tables) |
| Payments | **LIVE** — on-chain confirmation via RPC; needs `RPC_URL` + min-confirmations config |
| SMS / USSD (unbanked onboarding) | **DEPENDENCY** — real Twilio + Africa's Talking accounts/keys required; mockable for dev |
**Missing dependencies:** Twilio + Africa's Talking production credentials; RPC provider; live Postgres.

## PHASE 3 — Delivery verification reality
**Evidence:** `app/api/merchant/shipments/route.ts` header comment (lines 7–13): *"HONEST: this records
and confirms; it is not a live carrier API. Tracking is stored for evidence; a carrier adapter can later
auto-verify."* Status is **self-reported** (`shipped` / `delivered_confirmed` / `delivered_unconfirmed`
/ `not_received`), with buyer confirmation.
**Reality:** delivery is **self-/buyer-reported, not carrier-verified.** Carrier (EasyPost/Shippo/FedEx/
UPS/USPS) integration does **not** exist — it's a documented future adapter.
**Missing dependency:** a carrier-tracking API integration for automated delivery verification.

## PHASE 4 — Continuity reality
**Evidence:** `app/api/merchant/business-transfer/route.ts` — `reassignBusinessRecords` moves **DB
records** (line 174); funds excluded, handled by a "separate on-chain inheritance flow" (line 16);
7-day emergency veto mirrors the on-chain recovery delay (line 35).
**Reality:** business-record succession is **executable today** (DB state machine: initiated → accepted →
executed). **Fund** inheritance is **on-chain** via CardBoundVault (separate flow). The DB half operates;
the on-chain half needs deployed vault contracts.
**Missing dependency:** deployed CardBoundVault + inheritance contracts for the fund half.

## PHASE 5 — Recovery reality
**Evidence:** `hooks/useVaultRecovery.ts` calls `writeContractAsync` (lines 170/214/237) against a
guardian contract (`GUARDIAN_LOCK_ADDRESS`).
**Reality:** recovery is **contract-backed, not simulated** — it submits real on-chain transactions.
Operates once the guardian contract is deployed and its address configured.
**Missing dependency:** deployed guardian/recovery contracts + configured addresses.

## PHASE 6 — Stability Bond reality
**Evidence:** only `contracts/drafts/StabilityBond.draft.sol` exists (a `.draft.sol`, PRE-AUDIT).
**Reality:** bond **logic + benefits engine exist** (HQ preview); **no production contract, not deployed,
not audited.** `active: false` in HQ by design until a verified on-chain bond exists.
**Missing dependencies:** production bond contract → audit → deployment.

## PHASE 7 — Governance reality
**Evidence:** contract-address env vars include `DAO_ADDRESS`, `DAO_TIMELOCK_ADDRESS`,
`DAO_PAYROLL_POOL_ADDRESS`, `COUNCIL_ELECTION_ADDRESS`, `COUNCIL_SALARY_ADDRESS`, `ECO_TREASURY_VAULT_
ADDRESS`, etc. DAO override **ledger** is a DB API (`app/api/dao/overrides`).
**Reality:** governance **UI + override ledger operate** against DB; **voting/treasury/timelock require
deployed contracts.** The override ledger is DB-only transparency (Seer proposes, DAO disposes on-chain).
**Missing dependency:** deployed DAO/timelock/treasury/council contracts + addresses.

## PHASE 8 — Seer reality (canonical, from `lib/seer/coverage.ts`)
**10 LIVE / 3 PARTIAL / 0 NOT_BUILT.**
- **LIVE (10):** Builder Record, Commerce Health, P2P Lending, Merchant Success, Whale Protection, Fraud
  & Abuse, Recovery Readiness, Continuity, Governance, Sanctum.
- **PARTIAL (3), all blocked on the same root cause — no DEX/swap/reserve data:**
  - Extraction Index — needs indexer Swap ingestion + pools configured.
  - Marketplace Trust — PARTIAL (see coverage note).
  - Market Impact — needs pool reserves + holdings; 0 consumers (honestly tracked as of Wave 72).
**No Seer subsystem is awaiting a *contract* except via Stability Bonding/lending ceilings.**

## PHASE 9 — Launch infrastructure (from env surface)
**Required runtime services (evidence: `process.env.*` usage):**
- **Database:** Postgres (`DATABASE_URL`) + **88 migrations** to apply.
- **RPC provider:** `RPC_URL` / `NEXT_PUBLIC_BASE_SEPOLIA_RPC` / zkSync RPCs (chain reads/writes).
- **Indexer:** `INDEXER_BATCH_SIZE` / `CONFIRMATION_DEPTH` / `REORG_REWIND_BLOCKS` (the service exists; must run as a process).
- **Redis:** Upstash (`UPSTASH_REDIS_REST_URL/TOKEN`) for rate limiting.
- **Price feed:** CoinGecko (`COINGECKO_API_URL`).
- **SMS/USSD:** Twilio (`TWILIO_*`) + Africa's Talking (`AFRICASTALKING_*`).
- **Push:** VAPID (`VAPID_PRIVATE_KEY/SUBJECT`).
- **Observability:** Sentry (`SENTRY_DSN`).
- **Faucet (testnet):** `FAUCET_OPERATOR_PRIVATE_KEY`.
- **Secrets:** `JWT_SECRET`, `AUDIT_PSEUDONYM_SALT`, `WEBHOOK_SECRET_ENCRYPTION_KEY`, etc.
- **WebSocket bridge:** `WS_EVENT_BRIDGE_URL` / `NEXT_PUBLIC_WS_URL` (real-time events).
- **DEX feed:** **MISSING** — no env var or service ingests pool reserves/swaps.

## PHASE 10 — Audit-readiness classification
| Institution | Class | Evidence |
|---|---|---|
| Ownership / CardBoundVault | **DEPENDENCY BLOCKED** | needs deployed vault contracts + audit |
| ProofScore | **READY** (engine) / contract deploy pending | indexer mirrors ScoreSet |
| Builder Record | **READY** | DB-derived, tested |
| Extraction / Swap / Market Impact | **DEPENDENCY BLOCKED** | no DEX swap/reserve feed |
| Merchant HQ / Health / Discovery | **READY** (needs live DB) | recompute-on-read, tested |
| Lending | **PARTIAL** | engine ready; on-chain ceiling needs deployed contract |
| Recovery | **DEPENDENCY BLOCKED** | guardian contract deploy |
| Continuity (records) | **READY** / (funds) BLOCKED | DB executable; fund half on-chain |
| Stability Bond | **DEPENDENCY BLOCKED** | draft-only, needs contract+audit+deploy |
| Governance (ledger) | **READY** / (voting/treasury) BLOCKED | DB ledger live; contracts pending |
| Sanctum | **READY** (recommend) / disbursement on-chain | DB queue live |

## PHASE 11 — Deployment reality map
| Institution | Code | Runtime | Dependency | Infra | Audit | Deploy |
|---|---|---|---|---|---|---|
| Seer intelligence | ✅ | needs DB | DEX feed (3 subsystems) | DB+indexer | n/a (off-chain) | after DB |
| Merchant suite | ✅ | needs DB | SMS/RPC | DB+Redis+RPC | n/a | after infra |
| Delivery | ✅ (self-report) | needs DB | **carrier API** | DB | n/a | after DB |
| Vault/Ownership | contracts exist | — | **deploy+audit** | chain | **required** | blocked |
| Lending/Recovery/Continuity-funds | contracts exist | — | **deploy+audit** | chain | **required** | blocked |
| Stability Bond | **draft only** | — | **write+audit+deploy** | chain | **required** | blocked |
| Governance/Treasury | contracts referenced | — | **deploy+audit** | chain | **required** | blocked |

---

## FINAL — "What specifically prevents VFIDE from launching exactly as designed today?"

### CRITICAL (hard blockers — cannot launch as designed without these)
1. **Smart-contract deployment + professional audit.** 74 contract addresses are required across 6 env
   templates (`.env.{testnet,staging,production,mainnet}.example`). The contracts exist in-repo but are
   **unaudited and undeployed**. Everything custodial-adjacent (vault, recovery, lending ceiling,
   governance, treasury, bond) is blocked on this. *Evidence: 74 `NEXT_PUBLIC_*_ADDRESS` vars; no
   deployed addresses; `StabilityBond.draft.sol`.*
2. **Live Postgres + 88 migrations applied.** Every Seer/merchant signal recomputes from the DB on read;
   nothing operates without it. *Evidence: `lib/db.ts`; 88 migration files.*
3. **RPC provider + running indexer process.** All on-chain reads/writes and the event mirror depend on
   it. *Evidence: `RPC_URL`, `lib/indexer/service.ts`.*

### HIGH
4. **DEX Swap/pool-reserve ingestion.** Blocks Extraction Index (full), Swap Classification, and Market
   Impact (3 PARTIAL Seer subsystems). *Evidence: indexer ingests no Swap events; `VFIDE_LIQUIDITY_
   ADDRESSES` empty.*
5. **Production secrets + Redis.** `JWT_SECRET`, encryption keys, Upstash rate-limiting. *Evidence: env
   surface.*

### MEDIUM
6. **Carrier-tracking API for delivery verification.** Today delivery is self-/buyer-reported. *Evidence:
   `shipments/route.ts` honest comment; no carrier adapter.*
7. **SMS/USSD provider credentials** (Twilio + Africa's Talking) for unbanked onboarding. *Evidence: env
   + `ALLOW_MOCK_USSD`.*
8. **Stability Bond production contract** (then audit + deploy). *Evidence: draft only.*

### LOW
9. **Observability/push:** Sentry DSN, VAPID keys, CoinGecko price feed — degrade gracefully if absent.
10. **WebSocket event bridge** for real-time UI (polling fallback exists).

---

## Bottom line (reality, not intentions)
The **off-chain application is functionally complete and tested** — it runs as soon as it has a
**database, RPC, indexer, and secrets**. The **on-chain half is the gating reality**: the contracts are
written but **unaudited and undeployed**, which is the Critical blocker beneath Ownership, Recovery,
Lending enforcement, Governance/Treasury, and Stability Bonding. The **three PARTIAL Seer subsystems share
one root cause** — there is no DEX swap/reserve feed in the repo. Delivery is honestly self-reported until
a carrier API is added. Nothing here is simulated-and-hidden: the repo's own comments and the coverage map
already mark these gaps; this report consolidates them with evidence and ranks them.
