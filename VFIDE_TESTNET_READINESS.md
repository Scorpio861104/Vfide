# VFIDE Testnet Readiness — Consolidated Status

**Last updated:** 2026-05-11
**Scope:** Three-session review and remediation of the VFIDE codebase
  targeting "100% mainnet parity" testnet announcement readiness.

This document is the single source of truth for what's been changed,
what's verified, what's still open, and how to drive the testnet deploy
to completion. If anything below contradicts the CHANGELOG, this
document is older — check the CHANGELOG for the authoritative current
state of the repo.

---

## 1. Bottom-line readiness

**You are NOT yet ready to announce testnet.** You are close.

Code-level fixes are done. The remaining gaps are operational steps
(running migrations, running real Hardhat compile, deploying, exercising
the full flow) plus one writer-role-split migration that's not yet
written.

The single most important sentence in this document: **testnet and
mainnet now use the same canonical deployment path with no parallel
scripts, and the only contract that exists on testnet but not mainnet
is `VFIDETestnetFaucet`. Everything else is bit-for-bit identical.**

---

## 2. What is fixed at the code level ✅

### Smart contracts (Solidity)

- **C-1 ProofScore-vault mismatch in `VFIDEToken._transfer`** —
  `_resolveFeeScoringAddress()` correctly maps vault → owner for fee
  scoring. Verified at `contracts/VFIDEToken.sol:1177`.
- **DAO-05 Seer score-history fallback** — `getScoreAt()` returns
  NEUTRAL when no score history exists for a user, preventing live-state
  pumping for vote-weight at the time of a vote. Verified at
  `contracts/Seer.sol:589-622`.
- **Non-custodial architecture** — SecurityHub locks, freeze, blacklist,
  and force-recovery all removed. `_locked()` deleted. Recovery is only
  through user-owned guardians via `VaultRecoveryClaim` or wallet rotation.
- **`FraudRegistry`** — 30-day escrow, 3-complaint flag threshold,
  MIN_REPORTER_SCORE=5000, DAO override, 7-day permanent-ban timelock,
  90-day rescue delay.
- **`CardBoundVault` withdrawal queue** — 7-day delay, guardian-
  cancellable, daily-limit re-check on execute, code-hash check on
  destination vault.
- **`VFIDETestnetFaucet`** — Chain-id allowlist in constructor (Base /
  Polygon / zkSync / Ethereum / Arbitrum / Optimism Sepolia + 31337),
  per-operator daily caps, gas retry, 7-day owner-transfer timelock,
  24-hour withdraw timelock, referral depth limit.

### Deployment pipeline

- **Single canonical script** — `scripts/deploy-full.ts` is the only
  deploy path. Deploys 28+ contracts in dependency order. The strict
  subset `scripts/deploy-all.ts` (18 contracts) was deleted because it
  silently violated the mainnet-parity goal.
- **Chain-id gating** — `DEPLOY_TESTNET_FAUCET=true` on a mainnet chain
  throws fast with a clear error. The faucet's own constructor enforces
  the same allowlist as a defence-in-depth check.
- **Faucet ↔ EcosystemVault wired correctly** — Without this, every
  `faucet.claim()` was silently losing its referral inside a try/catch
  because `EcosystemVault.registerUserReferral` is `onlyManager`. Now
  `setManager(faucet, true)` is queued (2-day timelock) at deploy and
  finalized in apply-full.ts.
- **48-hour module DAO transfers** — `MerchantPortal.applyDAO`,
  `VFIDEFlashLoan.applyDAO`, `VFIDETermLoan.applyDAO`, and
  `FraudRegistry.applyDAO_FR` are now all called by `apply-full.ts`.
  Previously they were queued but never executed, leaving the deployer
  as DAO of those 4 modules forever.
- **`EcosystemVault.executeManagerChange()`** added to apply-full.ts.
- **`hardhat.config.ts`** — Three phantom Solidity overrides removed
  (`DeployPhases3to6`, `DeployPhase1`, `DeployPhase1Governance` don't
  exist). Two path errors corrected (`BadgeManager`, `SeerAutonomous`
  live in `contracts/future/`).
- **New testnet networks** — `zkSyncSepolia` (300), `arbitrumSepolia`
  (421614), `optimismSepolia` (11155420). Plus matching mainnets:
  `arbitrum` (42161), `optimism` (10). Plus etherscan config for each.
- **`package.json`** — Nine dead/broken script entries removed:
  `contract:deploy`, `deploy:apply-wiring:{mainnet,sepolia}`,
  `deploy:solo:{base,mainnet,sepolia}`, `deploy:wizard`, `deploy:all`,
  `apply:all`.

### Frontend / API / DB

- **Root `middleware.ts`** — Was missing entirely. Without it, Next.js
  16 never executed `proxy.ts`, which means no CSRF validation, no CSP
  nonce, no request-size limits, no Content-Type validation, and no
  CORS enforcement on any API route — despite all that logic being
  fully implemented. Created as a thin re-export shim of `proxy.ts`.
- **Faucet API chain-agnostic** — `app/api/faucet/claim/route.ts` no
  longer hardcodes `baseSepolia`. `resolveTestnetChain()` maps
  `NEXT_PUBLIC_DEFAULT_CHAIN_ID` to its viem chain definition for all 6
  supported testnets.
- **`lib/db.ts` RLS context is correctly wired** — Despite a stale
  user-memory note, the current code does call `set_config('app.
  current_user_address', $1, false)` on a dedicated client per query.
  Verified at lines 32-33, 188-227, 279-294.
- **`instrumentation.ts` boot-time check** — Fails fast in production
  if `DATABASE_URL` points at a role with BYPASSRLS.

### Database (migrations on disk; not yet applied)

- **`vfide_app` grants** —
  `20260510_120000_grant_vfide_app_and_baseline_rls.sql`. 102 of 110
  tables had no grants to the `vfide_app` role. With
  `instrumentation.ts` failing closed in production, switching
  `DATABASE_URL` to `vfide_app` would have broken every query against
  those tables. This migration grants SELECT/INSERT/UPDATE/DELETE on
  all public tables, sets ALTER DEFAULT PRIVILEGES so future tables
  inherit, and adds owner-only RLS policies on 31 tables with obvious
  owner-address columns.
- **Complete RLS baseline** —
  `20260510_140000_complete_rls_baseline.sql`. Covers the remaining 47
  unowned tables across 5 patterns: user_id FK joined through
  `users.wallet_address`, address-as-PK, dual-party
  payments/streams/loans, actor FK columns, group membership.
- **Legacy LOWER() normalization** —
  `20260510_141500_normalize_legacy_rls_lower.sql`. Patches the 6
  legacy RLS-protected tables (users, messages, friendships,
  user_rewards, endorsements) to use case-insensitive wallet
  comparison, closing a latent bug where mixed-case addresses became
  invisible to RLS.

### ABIs

All 58 frontend ABIs (`lib/abis/*.json`) are now in sync with the
deployed contract surface. Drift fixed in 11 contracts:

| Contract              | Functions added | Highest-impact use            |
|-----------------------|-----------------|-------------------------------|
| CardBoundVault        | +18             | Withdrawal-queue UI           |
| VFIDEBadgeNFT         | +18             | Emergency-controller flow     |
| VFIDEPriceOracle      | +19             | Emergency-controller flow     |
| VFIDEBridge           | +21             | Refund-window + recovery      |
| VFIDECommerce         | +18             | MerchantRegistry + Escrow     |
| VFIDEFlashLoan        | +13             | FeeDistributor + sweep        |
| VFIDEEnterpriseGateway| +10             | Oracle-floor flow             |
| FraudRegistry         | +2              | Escrow pagination             |
| VFIDETermLoan         | +3              | Cosigning                     |
| VaultRegistry         | +4              | VaultHub-change timelock      |
| VaultInfrastructure   | -1 (stale)      | Removed getRecoveryStatus     |

### Tooling

Five new scripts:

- **`scripts/deploy-full.ts`** (modified) — Canonical deploy path with
  chain-id gating and Faucet↔EcosystemVault wiring.
- **`scripts/apply-full.ts`** (modified) — 48h-timelock finalization;
  now includes the 4 missing module DAO transfers and the EcosystemVault
  manager change.
- **`scripts/fund-faucet.ts`** (new) — Chain-guarded faucet funder.
  Refuses to run on mainnet. Reads `.deployments/<network>.json`.
- **`scripts/sync-abis.ts`** (new) — Copies ABIs from
  `artifacts/contracts/` into `lib/abis/`. Supports SKIP_LIST
  (`ERC20`), RENAME_MAP (`DevReserveVesting` → `DevReserveVestingVault`,
  `MainstreamPayments` → `MainstreamPriceOracle`), MERGE_MAP
  (`VFIDECommerce` ← `MerchantRegistry`+`CommerceEscrow`). `--check`
  mode for CI.
- **`scripts/validate-testnet-ready.ts`** (new) — On-chain pre-flight:
  chain id, deployment book, token supply, module wiring, faucet
  balance, EcosystemVault.isManager(faucet), 6 module DAO ownerships,
  env-var parity.
- **`scripts/validate-frontend-ready.ts`** (new) — Hardhat-free
  pre-flight: middleware.ts present, proxy.ts exports correct surface,
  CSRF wired, /api/csrf route exists, lib/db.ts RLS context wired,
  4 expected migrations present, critical env vars set.
- **`scripts/compile-with-solcjs.cjs`** (new) — Standalone Solidity
  compile using pure-JS solc. Bypass for sandboxed/air-gapped
  environments where the Hardhat binary downloader fails.

---

## 3. What is still open ⚠️

These are real, not nits. Status is honest.

### Operational steps (require your machine, not the sandbox)

1. **Run `npm install && npx hardhat compile` with your real config.**
   My standalone compile used `runs:200, viaIR:true` globally. Your
   `hardhat.config.ts` has per-file overrides
   (`runs:0`, `revertStrings: "strip"`) that bring Seer.sol,
   SeerAutonomous.sol, CardBoundVault.sol, and EcosystemVault.sol under
   the 24,576-byte EIP-170 limit. Verify with
   `npx hardhat size-contracts`. **Verdict needed:** any contract still
   over 24KB? Currently unknown.

2. **Apply the 4 migrations against a real PostgreSQL.** I ran sqlparse
   to confirm syntax, but the migrations were never executed against a
   live database. If any of them references a column or table that
   doesn't actually exist in your schema, they'll fail.

3. **Run `npm run validate:testnet -- --network baseSepolia` after a
   real deploy.** Validator was tested in isolation; never exercised
   end-to-end against a deployed system.

4. **Exercise a real testnet user flow.** No part of `faucet claim →
   vault auto-creation → small transfer → fee distribution to the 5
   pools` has been tested since the changes landed. The first real
   claim is your integration test.

### Code-level work I did NOT do

5. **Writer-role split for Pattern F tables.** 25 tables remain
   open-read with no write protection: `daily_quests`,
   `platform_categories`, `prize_tiers`, `monthly_prize_pool`,
   `achievement_milestones`, `weekly_challenges`,
   `merchant_webhook_deliveries`, `merchant_invoice_items`,
   `merchant_order_items`, `merchant_product_variants`,
   `merchant_digital_assets`, `merchant_digital_deliveries`,
   `coupon_redemptions`, `installment_payments`, `audit_events`,
   `security_alert_dispatches`, `security_webhook_replay_events`,
   `flashloan_lanes`, `flashloan_lane_events`, `vault_identities`,
   `merchant_wholesale_group_buys`, `seer_analytics_daily_rollup`,
   `seer_reason_code_daily_rollup`, `performance_metrics`,
   `indexed_events`, `indexer_state`.

   **Effort:** ~50 lines of SQL, one migration. Pattern:
   - Create `vfide_app_writer` role with NOBYPASSRLS
   - Grant INSERT/UPDATE/DELETE to `vfide_app_writer` only on Pattern F
     tables
   - Revoke INSERT/UPDATE/DELETE from `vfide_app` on those tables
   - Update DATABASE_URL split — service-writer connections use the
     writer role; user-context connections use the standard role
   - Frontend code unaffected because user-driven flows never insert
     into Pattern F tables

6. **Frontend wagmi call audit against new ABIs.** 11 ABIs gained
   functions. None of the existing imports break (only additions, with
   one exception: `VaultInfrastructure.getRecoveryStatus` was removed
   — needs grep for callers).

   ```bash
   grep -rn "getRecoveryStatus" --include="*.ts" --include="*.tsx" \
     | grep -v node_modules | grep -v artifacts | grep -v __tests__
   ```

7. **Integration test of the new contract additions.** CardBoundVault
   gained 18 functions including `executeQueuedPayment` and
   `cancelQueuedPayment`. The withdrawal-queue UI presumably needs to
   call those. Confirm wiring or know which screen calls each.

8. **`.no-sync.json` policy file (nice-to-have).** Currently the
   SKIP/RENAME/MERGE maps live as constants inside `sync-abis.ts`. A
   small refactor would move them to a separate JSON file so policy
   changes don't need code changes. Not blocking.

---

## 4. Operational runbook — testnet deploy from clean repo

The full path. Every step is idempotent.

### Step 0: prerequisites

- Node `>=20 <25`, npm `>=10`
- A deployer wallet funded with native gas on the target testnet
- An EOA you control as the bootstrap DAO (will be replaced during
  apply-full.ts; do NOT use a long-lived hot key)
- RPC URL + block-explorer API key for the target chain (Base Sepolia
  recommended for first deploy)
- A PostgreSQL database the app can connect to as an admin role (for
  applying migrations) AND as the `vfide_app` role (for runtime queries)

### Step 1: install + configure

```bash
npm install
cp .env.example .env
```

Fill `.env`:

```bash
# Required everywhere
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org   # or your provider
BASESCAN_API_KEY=...
DATABASE_URL=postgresql://vfide_app:...@host/vfide

# Testnet-only bootstrap. For first deploy all can be the deployer.
# For mainnet, each MUST be set explicitly (no implicit fallback).
ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true        # testnet only
BOOTSTRAP_ADMIN_ADDRESS=0x...
BOOTSTRAP_DAO_ADDRESS=0x...
BOOTSTRAP_BENEFICIARY_ADDRESS=0x...
BOOTSTRAP_TREASURY_SINK_ADDRESS=0x...
BOOTSTRAP_SANCTUM_SINK_ADDRESS=0x...
BOOTSTRAP_BURN_SINK_ADDRESS=0x...
BOOTSTRAP_ECOSYSTEM_SINK_ADDRESS=0x...
BOOTSTRAP_FEE_SINK_ADDRESS=0x...
BOOTSTRAP_POOL_ADMIN_ADDRESS=0x...
BOOTSTRAP_FAUCET_OWNER_ADDRESS=0x...
BOOTSTRAP_LEDGER_ADMIN_ADDRESS=0x...

# Testnet-only opt-in for the faucet
DEPLOY_TESTNET_FAUCET=true

# Frontend
NEXT_PUBLIC_IS_TESTNET=true
NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532
```

### Step 2: compile + ABI sync

```bash
npx hardhat compile               # uses your real per-file overrides
npm run sync-abis                 # copies fresh ABIs to lib/abis/
npm run sync-abis:check           # CI guard
```

If the Hardhat downloader is blocked on your machine, the fallback is:

```bash
npm run compile:solcjs            # uses pure-JS solc, bypasses downloader
```

Then `npx hardhat size-contracts` (or read the output of the standard
compile) to confirm no contract exceeds 24,576 bytes. If anything does,
adjust its per-file override in `hardhat.config.ts`.

### Step 3: apply migrations

Run as a PostgreSQL admin / superuser (NOT as `vfide_app`):

```bash
psql "$DATABASE_URL_ADMIN" -f migrations/20260503_120000_create_app_role_rls_enforcement.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_120000_grant_vfide_app_and_baseline_rls.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_140000_complete_rls_baseline.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_141500_normalize_legacy_rls_lower.sql
```

Read the NOTICE output of `20260510_120000`. It lists the tables that
have no obvious owner column. Those are mostly handled by
`20260510_140000`. Anything still in that NOTICE list after migration
140000 needs manual policy review before mainnet.

### Step 4: deploy

```bash
npm run deploy:full -- --network baseSepolia
```

Console prints a `.env` block at the end. Copy the `NEXT_PUBLIC_*_ADDRESS`
lines into your `.env`.

### Step 5: wait 48 hours, then finalize

```bash
npm run deploy:full:apply -- --network baseSepolia
```

Re-run every 48h. After ~4 runs the script prints:

```
╔══════════════════════════════════════════════════════════════╗
║  ✅  All wiring complete.                                     ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 6: fund the testnet faucet

```bash
npm run fund-faucet -- --network baseSepolia
# Or with overrides:
FAUCET_FUND_VFIDE_AMOUNT=200000 \
FAUCET_FUND_ETH_AMOUNT=1 \
FAUCET_OPERATOR_ADDRESS=0xBackendApiWallet \
npm run fund-faucet -- --network baseSepolia
```

### Step 7: validate

Both validators MUST exit 0 before announce:

```bash
npm run validate:testnet -- --network baseSepolia
npm run validate:frontend
```

### Step 8: smoke test the user flow

A real wallet, against the deployed testnet:

1. Connect wallet, sign in via SIWE
2. Call faucet claim → verify VFIDE + ETH arrive
3. Verify vault was auto-created (check `VaultHub.vaultOf(yourAddress)`)
4. Send a small transfer to another user
5. Confirm the ProofScore-based burn fee shows up in `FeeDistributor`
   pool balances

If all 5 steps pass, you can announce.

---

## 5. Mainnet differences

| Variable                            | Testnet                | Mainnet (Base)         |
|-------------------------------------|------------------------|------------------------|
| `--network`                         | `baseSepolia`          | `base`                 |
| `DEPLOY_TESTNET_FAUCET`             | `true`                 | unset (or `false`)     |
| `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP`| `true` (first run)     | unset (must be `false`)|
| `BOOTSTRAP_*_ADDRESS` values        | Can be deployer EOA    | Must be real addresses, ideally multisigs |
| `NEXT_PUBLIC_IS_TESTNET`            | `true`                 | `false`                |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID`      | `84532`                | `8453`                 |
| `FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER` | `true` (in dev/test)   | unset (KMS-only)       |

`deploy-full.ts` enforces these gates at script level.
`fund-faucet.ts` and `validate-testnet-ready.ts` refuse to run on
mainnet chain ids by design.

The contract surface is identical between testnet and mainnet.
`VFIDETestnetFaucet` is the ONLY contract that exists on testnet and
not on mainnet.

---

## 6. File inventory

### Added

```
middleware.ts                                                         (3-line re-export shim)
TESTNET_RUNBOOK.md                                                    (operator runbook)
VFIDE_TESTNET_READINESS.md                                            (this file)
scripts/compile-with-solcjs.cjs                                       (sandbox fallback)
scripts/fund-faucet.ts                                                (faucet funder)
scripts/sync-abis.ts                                                  (ABI sync + CI)
scripts/validate-frontend-ready.ts                                    (frontend pre-flight)
scripts/validate-testnet-ready.ts                                     (on-chain pre-flight)
migrations/20260510_120000_grant_vfide_app_and_baseline_rls.sql       (102-table grants)
migrations/20260510_120000_grant_vfide_app_and_baseline_rls.down.sql
migrations/20260510_140000_complete_rls_baseline.sql                  (47-table RLS)
migrations/20260510_140000_complete_rls_baseline.down.sql
migrations/20260510_141500_normalize_legacy_rls_lower.sql             (LOWER() consistency)
migrations/20260510_141500_normalize_legacy_rls_lower.down.sql
```

### Modified

```
hardhat.config.ts                          (phantom overrides removed; +3 testnet chains)
package.json                               (-9 dead scripts; +7 new scripts)
app/api/faucet/claim/route.ts              (chain-agnostic via resolveTestnetChain)
scripts/apply-full.ts                      (+4 module DAO finalizations, EcosystemVault.executeManagerChange)
scripts/deploy-full.ts                     (chain-id gating, Faucet↔EcosystemVault wiring)
.env.example                               (deploy-all → deploy-full references)
.env.staging.example                       (same)
scripts/verify-admin-roles.ts              (same)
scripts/future/apply-phase2.ts             (same)
CHANGELOG.md                               (3 new entries)
lib/abis/*.json                            (11 files re-synced from artifacts)
```

### Deleted

```
scripts/deploy-all.ts          (subset of deploy-full.ts; violated mainnet parity)
scripts/apply-all.ts           (subset of apply-full.ts; same)
```

---

## 7. Architecture decisions and constraints worth remembering

### Non-custodial is absolute

No entity can freeze, lock, seize, or reassign user funds. Protection
by absence of code: `OwnerControlPanel` deliberately omits `setFrozen`
after `SystemHandover`. `_locked()` removed from VFIDEToken. Force
recovery permanently reverts via `VH_RecoveryDisabled`. Recovery is
ONLY through user-owned guardians via `VaultRecoveryClaim` or wallet
rotation.

### Fee structure is fee-funded, never staking or yield

Howey-safe by construction. `protocolFeeBps = 0` — merchants receive
at zero cost. Buyer burn fees drop from ~3.82% (new user) to 0.25%
(trusted user, ProofScore 8000+), with a 1% ceiling for micro-
transactions ≤10 VFIDE. `FeeDistributor` splits the 0.3% burn fee:
35% burned, 20% Sanctum Fund, 15% DAOPayrollPool, 20%
MerchantCompetitionPool, 10% HeadhunterCompetitionPool. Work-for-pay,
never passive yield.

### Decentralization is a one-way valve

`SystemHandover` burns the developer key after 6 months. Cannot be
undone. After handover, no privileged role can intervene in normal
operations.

### Two-stage timelock model

48 hours is the standard module-change delay. Apply-full.ts is built
around this: each invocation handles ONE round of system-exemption
confirmation, proposes the next, and is idempotent. Expect to run it
4 times over ~8 days before "All wiring complete" prints.

### Wallet address handling

The application normalizes wallet addresses to lowercase at the JWT
boundary (`lib/auth/jwt.ts`) and at the AsyncLocalStorage boundary
(`lib/db.ts`). All RLS policies are now `LOWER()` on both sides as of
migration `20260510_141500`. Database column data SHOULD be stored
lowercase but RLS no longer assumes it.

---

## 8. Verification gates

These should all pass before announce. Each can be wired into CI.

```bash
# Static — fast, hardhat-free
npm run validate:frontend             # middleware, CSRF, RLS wiring, migrations present
npm run sync-abis:check               # ABIs match contract surface

# Compile — requires solc network access OR npm run compile:solcjs as fallback
npx hardhat compile
npx hardhat size-contracts            # confirms every contract < 24576 bytes

# Type-check
npm run typecheck

# Tests (existing suite)
npm run test:security:all
npm run test:ci

# Production validation (existing)
npm run validate:production

# Post-deploy
npm run validate:testnet -- --network baseSepolia
```

---

## 9. Troubleshooting

**"DEPLOY_TESTNET_FAUCET=true is not allowed on chainId X"**
You set the env var on a mainnet chain. Unset it.

**"`EcosystemVault.isManager(faucet)` is false after apply-full.ts"**
The 2-day timelock hasn't elapsed.
- t=0: `deploy-full.ts` queues the change
- t=2d: `apply-full.ts` runs `executeManagerChange()`

If you ran apply-full.ts before the 2-day mark, the call no-ops with
`ECO_ChangeNotReady`. Re-run after the delay.

**"function not in ABI" runtime errors in the frontend**
`lib/abis/` drift. Run `npx hardhat compile && npm run sync-abis` and
rebuild.

**Faucet returns 503 "Faucet signer unavailable"**
`FAUCET_OPERATOR_PRIVATE_KEY` is missing or malformed, or
`FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER` is not `true`. Production should
use a KMS-backed signer; the local-signer path is testnet only.

**`Error HHE905: Couldn't download compiler version list`** when running
`npx hardhat compile`
The Hardhat downloader can't reach `binaries.soliditylang.org`. Use
`npm run compile:solcjs` instead, which uses the pure-JS `solc` npm
package already in `devDependencies`.

**`psql: ERROR: permission denied for table X`** after switching to
`vfide_app`
The grant migration (`20260510_120000`) wasn't applied. Apply it.

**RLS-protected queries return 0 rows even though the user owns the
data**
Either: (a) `app.current_user_address` is not being set
(check that the route is in a request context and `lib/db.ts:query` is
being called, not raw pool.query) or (b) the row's address column
holds a mixed-case value AND you haven't applied
`20260510_141500_normalize_legacy_rls_lower.sql`. Apply migration 141500.

---

## 10. Honest assessment of where you are

Working from this end, the code is in shape. The unknowns are all on
your side and they're operational, not architectural:

1. Does `hardhat compile` succeed with your real config? (~95%
   confidence yes; I verified zero compile errors against the
   production set, just not with your exact runs/strip settings.)
2. Do `hardhat size-contracts` numbers fit? (~90% confidence yes; the
   per-file overrides in your config were clearly designed for this.)
3. Do the migrations apply cleanly to your real schema? (~85%
   confidence; sqlparse passes but column names in your prod schema
   could differ from migrations on disk.)
4. Does a real user flow work end-to-end? (Unknown until tested.)

The single 50-line writer-role-split migration for Pattern F tables is
the only code-level work I'd insist on before announcing mainnet. For
testnet, you can ship without it as long as the testnet doesn't hold
real value.

---

## 11. Where to find what

- This file: full status, runbook, decisions
- `CHANGELOG.md`: chronological record of every change in this work
- `TESTNET_RUNBOOK.md`: shorter operator-focused runbook (subset of
  this file's Step 1-8)
- `docs/security/`: pre-existing audit history (not updated in this
  work)
- `scripts/validate-frontend-ready.ts`: the runtime check matching
  this document's section 8

---

*Generated 2026-05-11 at the close of the three-session VFIDE testnet
readiness review. Update this file when the operational steps in
section 3 are completed.*
