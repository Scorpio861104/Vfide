# VFIDE Preview → Production — Full Progression Guide

**Audience:** the operator standing in front of Vercel + a fresh repo.
**Goal:** get from "I want to look at the frontend" to "testnet is live
and announced" without skipping a step.

Four phases. Each phase is a real, deployable Vercel state. You can
stop at any phase and resume later.

| Phase | What you have | Build env vars | Time |
|-------|---------------|----------------|------|
| 1 — Click-through preview | Frontend renders, wallet connects, anything on-chain or DB-backed errors at click | 7 | 5 min |
| 2 — DB + auth, no contracts | Sign-in works, accounts persist, RLS active. Chain calls still error. | 9 | 1 hour |
| 3 — Full testnet stack | Contracts deployed, ABIs synced, faucet funded. Full app works. | ~25 | 8 days (mostly timelock waits) |
| 4 — Announce | All validators green. Smoke-tested with a real wallet. | same as 3 | 1 hour |

---

## Phase 1 — Click-through preview

### Purpose

You want to see what the frontend looks like in a real Vercel
deployment before committing to spinning up a database or deploying
contracts. Wallet should connect, all pages should render, but
anything backed by a database call or a smart-contract address will
return an error when clicked.

### Vercel env vars (set all 7)

In Vercel project settings → Environment Variables:

| Variable | Value | Why |
|----------|-------|-----|
| `FRONTEND_SELF_CONTAINED` | `true` | Tells validator, `instrumentation.ts`, and `lib/contracts.ts` to relax all backend/blockchain requirements |
| `NEXT_PUBLIC_IS_TESTNET` | `true` | Used by chain-selector logic and to bypass mainnet-only validator checks |
| `NEXT_PUBLIC_CHAIN_ID` | `84532` | Base Sepolia |
| `NEXT_PUBLIC_RPC_URL` | `https://sepolia.base.org` | Public Base Sepolia RPC. Replace with your provider's URL (Alchemy, Infura, QuickNode) if you want better rate limits |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://sepolia.basescan.org` | For "view on explorer" links |
| `APP_ORIGIN` | `https://your-app.vercel.app` | Replace with your actual Vercel domain. CORS uses this. |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Same value as APP_ORIGIN |

Apply to all three environments (Production, Preview, Development) so
the same config is used everywhere.

### What works in Phase 1

- Every route renders without 500 errors
- Wallet connect (MetaMask, WalletConnect, Coinbase, RainbowKit modal)
- Network switching to Base Sepolia
- Read-only RPC calls (account balance, block number, gas price)
- All static content, navigation, styling, components
- Theme toggle, localization, accessibility features

### What does NOT work in Phase 1

- Sign-in (SIWE flow needs `JWT_SECRET`)
- Anything that creates/reads a user record (no `DATABASE_URL`)
- Faucet claim (needs DB session + backend operator key)
- Any call to a contract by address (e.g. "view my vault", "transfer
  VFIDE", "view ProofScore") — wagmi will throw because
  `lib/contracts.ts` returns zero-address for unconfigured addresses
- Real-time WebSocket features
- Anything reading `app/api/*` routes — most of them require DB

If a user clicks one of these, the error appears in their browser
devtools and (depending on the component) either a toast or a silent
no-op. Don't worry about UX polish here — this phase is for layout
review only.

### Deploy & verify

```bash
git push origin main   # or whatever your branch is
```

Vercel will build. Watch the build log. With the validator fix in
this repo, the relevant lines look like:

```
> npm run validate:env
✅ FRONTEND_SELF_CONTAINED mode enabled (server-only requirements relaxed)
...
✅ Environment validation passed
> next build
[Next.js builds...]
```

If you see `❌` errors in the build log, the validator prints the
exact missing variable name. Fix in Vercel env settings, redeploy.

### Phase 1 → Phase 2 transition signal

You've done a full visual review and now want sign-in to work, want
data to persist across page loads. Proceed to Phase 2.

---

## Phase 2 — DB + auth, no contracts

### Purpose

Real user accounts, real sign-in, real session persistence, RLS
enforced. You can register accounts, view profile pages, hit any
API route that doesn't require an on-chain transaction. Still no
contract calls — anything chain-write still errors.

### Prerequisites

You need a PostgreSQL database. Options for testnet:

| Provider | Free tier? | Notes |
|----------|------------|-------|
| Supabase | Yes, generous | Built-in Postgres + connection pooling. Easy. |
| Neon | Yes | Serverless Postgres, good for low traffic |
| Railway | $5 credit | Postgres + Redis + other services |
| Render | Yes (90-day) | Postgres free tier expires after 90 days |
| RDS / Cloud SQL | No | Production-grade but expensive |

For a testnet preview, Supabase or Neon is fine. Get the connection
string — it looks like
`postgresql://user:password@host:5432/database`.

### Setup

#### 1. Apply all five migrations

You need admin credentials (superuser) to apply migrations because
they create roles and modify table privileges. Most managed Postgres
providers give you this on the connection string they hand you.

Run in this order:

```bash
psql "$DATABASE_URL_ADMIN" -f migrations/20260503_120000_create_app_role_rls_enforcement.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_120000_grant_vfide_app_and_baseline_rls.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_140000_complete_rls_baseline.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_141500_normalize_legacy_rls_lower.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260511_160000_split_writer_role.sql
```

What each does:

- **`20260503_120000`** creates the `vfide_app` role with `NOBYPASSRLS`
  and a base set of grants. (This migration may already be applied if
  your repo has been deployed before.)
- **`20260510_120000`** grants SELECT/INSERT/UPDATE/DELETE on all 110
  tables to `vfide_app`, sets ALTER DEFAULT PRIVILEGES so future tables
  inherit grants, and adds owner-only RLS on 31 tables with obvious
  owner-address columns. Read the `NOTICE` output — it lists tables
  with no owner column.
- **`20260510_140000`** covers 47 more tables across 5 ownership
  patterns (user_id FK, address PK, dual-party payments, actor FK,
  group membership).
- **`20260510_141500`** normalizes the 6 legacy RLS-protected tables
  to use `LOWER()` for case-insensitive wallet matching.
- **`20260511_160000`** creates `vfide_app_writer` and revokes write
  on 26 Pattern F system/lookup tables from `vfide_app`. After this,
  backend jobs need `DATABASE_URL_WRITER` for writes to those tables.
  For Phase 2 you don't have backend jobs yet — vfide_app still has
  SELECT on all of them, so reads work.

After all five complete:

```bash
psql "$DATABASE_URL_ADMIN" -c "SELECT rolname FROM pg_roles WHERE rolname LIKE 'vfide%';"
# Expected output:
#  rolname
# ─────────────────
#  vfide_app
#  vfide_app_writer
```

#### 2. Set a password for `vfide_app`

The role exists with `NOBYPASSRLS` but needs a password and `LOGIN`
right to connect:

```bash
psql "$DATABASE_URL_ADMIN" -c "ALTER ROLE vfide_app WITH LOGIN PASSWORD 'your-strong-password-here';"
```

Build the runtime connection string:

```
postgresql://vfide_app:your-strong-password-here@HOST:PORT/DATABASE
```

This is your `DATABASE_URL` for Vercel.

#### 3. Generate JWT_SECRET

Locally:

```bash
openssl rand -hex 32
# Copy the output — it's a 64-character hex string
```

This is your `JWT_SECRET`. Treat as a secret. Never commit.

### Vercel env vars for Phase 2

**Remove from Vercel:**

| Variable | Why |
|----------|-----|
| `FRONTEND_SELF_CONTAINED` | DB and auth now real; we want the full validator surface |

**Add to Vercel:**

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://vfide_app:...@host/db` | Connection string from step 2 |
| `JWT_SECRET` | (64-char hex from openssl) | Treat as secret |

**Keep from Phase 1:**

The other 6 env vars from Phase 1 stay (NEXT_PUBLIC_IS_TESTNET,
NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_EXPLORER_URL,
APP_ORIGIN, NEXT_PUBLIC_APP_URL).

### Deploy & verify

```bash
git push origin main
```

The build log should show:

```
✅ Environment validation passed
```

with warnings for all the missing contract addresses and optional
features — that's normal. Build succeeds because
`NEXT_PUBLIC_IS_TESTNET=true` keeps strictProduction false.

At app boot, `instrumentation.ts` will now run
`verifyRlsEnforcementOrThrow()` against your database. If the role
has `BYPASSRLS` set (which it doesn't, you created it correctly), the
app refuses to start. You'll see the message in Vercel runtime logs.

### What works in Phase 2

- Everything from Phase 1
- Sign-in with wallet (SIWE)
- User account creation
- Profile pages
- Any API route that only needs DB (settings, preferences, friend
  requests, notifications, messages between users)
- RLS-protected reads (you only see your own data)

### What does NOT work in Phase 2

- Faucet claim (operator backend signer not configured)
- Any contract write (transfers, payments, vault creation, vote)
- Any contract read (balance, ProofScore, fee preview) — wagmi calls
  to zero-address fail
- Anything that lists on-chain events (no indexer running)
- Background jobs that write to Pattern F tables (no
  `DATABASE_URL_WRITER` yet)

### Phase 2 → Phase 3 transition signal

You can register, sign in, edit your profile, browse around. The app
behaves like a real social/account product but with no money side.
You're ready to deploy contracts.

---

## Phase 3 — Full testnet stack

### Purpose

Real contracts deployed to Base Sepolia. Faucet funded. ABIs in
sync. The full app works — wallet connect, sign in, claim faucet,
auto-create vault, transfer VFIDE, see fees route to the 5 pools.

This phase has the most steps and the longest waits (48h timelocks
between deploy and apply, repeated ~4 times). Plan ~8 days of
wall-clock from start to finish. Most of that is just waiting; your
hands-on time is maybe 2 hours total.

### Prerequisites

- Working local dev environment (Node ≥20, npm ≥10)
- A wallet with Base Sepolia ETH for gas (use the Coinbase faucet:
  https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- An EOA for the bootstrap DAO (this EOA temporarily acts as DAO
  during deployment; will be replaced by the deployed DAO contract
  via 48h-timelocked transfers). Do NOT use a long-lived hot key.

### Step 3.1 — Configure local .env

Copy `.env.example` to `.env` and fill:

```bash
PRIVATE_KEY=0xYourDeployerPrivateKey

# Network
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your-basescan-api-key

# Database (admin role — for migrations)
DATABASE_URL_ADMIN=postgresql://postgres:...@host/db

# Bootstrap addresses (for first testnet deploy all can be the deployer)
ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true
BOOTSTRAP_ADMIN_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_DAO_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_BENEFICIARY_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_TREASURY_SINK_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_SANCTUM_SINK_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_BURN_SINK_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_ECOSYSTEM_SINK_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_FEE_SINK_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_POOL_ADMIN_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_FAUCET_OWNER_ADDRESS=0xYourBootstrapDAO
BOOTSTRAP_LEDGER_ADMIN_ADDRESS=0xYourBootstrapDAO

# Testnet faucet opt-in
DEPLOY_TESTNET_FAUCET=true
```

### Step 3.2 — Install + compile + sync ABIs

```bash
npm install
npx hardhat compile
npm run sync-abis
npm run sync-abis:check   # Should print: [sync-abis] check passed.
```

If `hardhat compile` can't reach `binaries.soliditylang.org` (rare —
some corporate firewalls block it):

```bash
npm run compile:solcjs    # Pure-JS fallback that uses solc from node_modules
```

After ABIs sync, verify contract sizes are under EIP-170 (24,576 bytes):

```bash
npx hardhat size-contracts
```

Look for any line with a red number > 24,576. If found, the contract
has grown beyond what the per-file overrides in `hardhat.config.ts`
can handle — you'll need to split it or remove dead code before
deploying. Should not happen with the current state of the repo.

### Step 3.3 — Deploy contracts

```bash
npm run deploy:full -- --network baseSepolia
```

This takes 10–20 minutes. The script deploys 28+ contracts in
dependency order, checkpointing each successful deploy to
`.deployments/baseSepolia.json` so a mid-run failure can be resumed
by re-running the same command without losing addresses.

The script enforces:

- `DEPLOY_TESTNET_FAUCET=true` only allowed on testnet chain IDs
- EIP-170 size check on every contract before any tx is sent
- `TREASURY_ADDRESS` is a deployed contract (or `AdminMultiSig` is
  created on the fly by Layer 1)

After the deploy completes, the console prints a `.env` block with
all `NEXT_PUBLIC_*_ADDRESS` lines. Copy that block — you'll paste it
into Vercel in step 3.6.

### Step 3.4 — Wait 48 hours, then run apply-full.ts

The deploy script queues several 48h-timelocked changes. After 48
hours:

```bash
npm run deploy:full:apply -- --network baseSepolia
```

This:

- Finalizes pending VFIDEToken module setters
  (`applyVaultHub`, `applyBurnRouter`, `applyFraudRegistry`,
  `applyLedger`)
- Walks the system-exempt schedule one round at a time
- Calls `Seer.applyDAOChange()`
- Calls `MerchantPortal.applyDAO()`, `VFIDEFlashLoan.applyDAO()`,
  `VFIDETermLoan.applyDAO()`, `FraudRegistry.applyDAO_FR()`
- Calls `VaultHub.applyRecoveryApprover()`
- Calls `EcosystemVault.executeManagerChange()` to grant the faucet
  manager rights

It's idempotent — calls that aren't ready yet (timelock not elapsed)
no-op silently with a "not ready" message. So you re-run it every
48 hours. After ~4 runs over ~8 days, the script prints:

```
╔══════════════════════════════════════════════════════════════╗
║  ✅  All wiring complete.                                     ║
╚══════════════════════════════════════════════════════════════╝
```

Some of these timelocks can be reduced for testnet by setting shorter
delays in the source — but that defeats the purpose of testing the
full mainnet flow. Recommend waiting the real 48h to surface any
timelock-handling bugs.

### Step 3.5 — Fund the faucet

After step 3.4 completes:

```bash
# Defaults: 100,000 VFIDE + 0.5 ETH
npm run fund-faucet -- --network baseSepolia
```

Or with overrides:

```bash
FAUCET_FUND_VFIDE_AMOUNT=200000 \
FAUCET_FUND_ETH_AMOUNT=1 \
FAUCET_OPERATOR_ADDRESS=0xYourBackendApiWalletAddress \
npm run fund-faucet -- --network baseSepolia
```

`FAUCET_OPERATOR_ADDRESS` is the address that will sign `claim()`
calls on behalf of users. If you set it, the script will also call
`setOperator(address, true)` so the faucet recognizes it.

The script:

- Refuses to run on a non-testnet chain (chain ID guard)
- Pre-checks deployer balance before sending
- Reads addresses from `.deployments/baseSepolia.json`

You'll also need the operator wallet's PRIVATE KEY in Vercel — see
the next step. Generate a fresh EOA just for this purpose, fund it
with 0.5 ETH from your deployer, then add it as an operator.

### Step 3.6 — Set all contract addresses in Vercel

Open `.deployments/baseSepolia.json`. For every contract, find its
matching `NEXT_PUBLIC_*_ADDRESS` env var in Vercel and set it.

Or, copy the `.env` block the deploy script printed — it has every
address pre-formatted.

The complete list (all should be set):

```
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_VAULT_HUB_ADDRESS=0x...
NEXT_PUBLIC_SEER_ADDRESS=0x...
NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS=0x...
NEXT_PUBLIC_BURN_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS=0x...
NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=0x...
NEXT_PUBLIC_PROOF_LEDGER_ADDRESS=0x...
NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_FLASH_LOAN_ADDRESS=0x...
NEXT_PUBLIC_TERM_LOAN_ADDRESS=0x...
NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS=0x...
NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS=0x...
NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS=0x...
NEXT_PUBLIC_MERCHANT_POOL_ADDRESS=0x...
NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS=0x...
NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS=0x...
NEXT_PUBLIC_DEV_VAULT_ADDRESS=0x...
NEXT_PUBLIC_FAUCET_ADDRESS=0x...
```

Plus the faucet operator key (so the API route can sign claim
transactions on behalf of users):

```
FAUCET_OPERATOR_PRIVATE_KEY=0x...      # Hot wallet generated in step 3.5
FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER=true # Permitted because we're testnet
```

For mainnet you'd swap the local signer for a KMS-backed one. For
testnet a hot wallet is acceptable.

### Step 3.7 — Set DATABASE_URL_WRITER

The Pattern F write-protection migration (20260511_160000) requires
backend jobs to use a separate role for writes. Set the password
locally:

```bash
psql "$DATABASE_URL_ADMIN" -c "ALTER ROLE vfide_app_writer WITH LOGIN PASSWORD 'another-strong-password';"
```

Build the connection string and add to Vercel:

```
DATABASE_URL_WRITER=postgresql://vfide_app_writer:another-strong-password@host:5432/database
```

For Phase 3 with just the testnet deploy this is technically optional
— no indexer is running on Vercel. But set it anyway so when you do
add backend jobs, they have a credential to use.

### Step 3.8 — Push to Vercel

```bash
git push origin main
```

Watch the build log. Should see all required env vars green, then
Next.js build succeeds.

### What works in Phase 3

Everything. Faucet claim creates a vault, transfers route through
the burn router, fees distribute across the 5 pools, DAO voting
works, fraud reporting works, the merchant portal works.

### Phase 3 → Phase 4 transition signal

Build succeeds, you can reach the app. Time to validate before
announcing.

---

## Phase 4 — Validate + announce

### The two validators

```bash
npm run validate:frontend
npm run validate:testnet -- --network baseSepolia
```

Both must exit 0.

#### `validate:frontend` checks

1. proxy.ts exists, exports the proxy function + config matcher
2. proxy.ts calls validateCSRF
3. proxy.ts applies CSP nonce
4. proxy.ts enforces body size limits
5. No stray `middleware.ts` at project root (would conflict)
6. /api/csrf route exists
7. CSRF exempt list does NOT include high-value paths
   (/api/transfer, /api/payment, /api/withdraw, /api/admin,
    /api/governance, /api/proof)
8. lib/db.ts calls set_config('app.current_user_address', ...)
9. lib/db.ts has verifyRlsEnforcement
10. instrumentation.ts calls verifyRlsEnforcementOrThrow
11–15. All 5 migrations present
16. Critical env vars set (warn-only — informational, not blocking)

#### `validate:testnet` checks

1. Chain ID is a recognized testnet
2. Every contract in REQUIRED_CONTRACTS has a non-zero address in
   `.deployments/baseSepolia.json`
3. `VFIDEToken.totalSupply() == 200,000,000 * 10^18`
4. Token's `vaultHub`, `burnRouter`, `fraudRegistry`, `ledger` all
   wired (apply-full.ts completed)
5. Faucet holds ≥ 10,000 VFIDE and ≥ 0.05 ETH
6. `faucet.ecosystemVault()` matches `book.EcosystemVault`
7. `EcosystemVault.isManager(faucet) === true` (manager change
   executed)
8. Six governance-bearing modules report `dao() === book.DAO`
9. Every `NEXT_PUBLIC_*_ADDRESS` env var matches the deployment book

Both exit 0 on success, non-zero with detailed reason on failure.

### Smoke test with a real wallet

A 5-step manual exercise:

1. Open the deployed app from a fresh browser (no cached state)
2. Connect a wallet that's on Base Sepolia with 0 VFIDE
3. Click "Faucet" → claim → verify VFIDE + ETH arrive in the wallet
4. Verify your vault auto-created — check
   `VaultHub.vaultOf(yourAddress)` on Basescan, it should return a
   non-zero address
5. Send a small transfer to another wallet — confirm:
   - Your VFIDE balance decreases by the amount + burn fee
   - The recipient receives the amount minus zero (merchant
     receives full amount; only buyer is charged)
   - FeeDistributor's pool balances increase (35% burned, 20%
     SanctumVault, 15% DAOPayrollPool, 20% MerchantCompetitionPool,
     10% HeadhunterCompetitionPool)

If all 5 steps work, you're ready to announce.

### Announce

Move from `npm run validate:testnet` exit 0 to broadcast. The
specific channels depend on your go-to-market plan
(crypto-YouTubers, beauty-vertical creators, etc.). Make sure your
faucet has enough VFIDE + ETH to serve the expected first-wave
volume — bump `FAUCET_FUND_VFIDE_AMOUNT` and re-run fund-faucet.ts
if needed.

---

## Vercel env var reference — everything in one table

Phase column shows the earliest phase the variable becomes relevant.
A blank phase cell means "optional, set if/when you want the feature."

### Always required

| Variable | Phase | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_IS_TESTNET` | 1 | `true` for testnet, `false` for mainnet. Drives strictProduction. |
| `NEXT_PUBLIC_CHAIN_ID` | 1 | `84532` (Base Sepolia) or `8453` (Base mainnet) |
| `NEXT_PUBLIC_RPC_URL` | 1 | Public or provider RPC |
| `NEXT_PUBLIC_EXPLORER_URL` | 1 | For "view on explorer" links |
| `APP_ORIGIN` | 1 | Your Vercel domain (https://...) |
| `NEXT_PUBLIC_APP_URL` | 1 | Same as APP_ORIGIN |

### Phase 1 only (remove in Phase 2)

| Variable | Value | Notes |
|----------|-------|-------|
| `FRONTEND_SELF_CONTAINED` | `true` | Bypasses DB/contract requirements. **REMOVE in Phase 2.** |

### Phase 2 onward

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | `postgresql://vfide_app:...@host/db` (NOBYPASSRLS role) |
| `JWT_SECRET` | 32+ char random string from `openssl rand -hex 32` |
| `DATABASE_URL_WRITER` | `postgresql://vfide_app_writer:...@host/db` (for indexer/cron jobs). Optional until you have such jobs. |

### Phase 3 onward (contract addresses)

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` | `.deployments/baseSepolia.json` |
| `NEXT_PUBLIC_VAULT_HUB_ADDRESS` | same |
| `NEXT_PUBLIC_SEER_ADDRESS` | same |
| `NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS` | same |
| `NEXT_PUBLIC_BURN_ROUTER_ADDRESS` | same |
| `NEXT_PUBLIC_DAO_ADDRESS` | same |
| `NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS` | same |
| `NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS` | same |
| `NEXT_PUBLIC_PROOF_LEDGER_ADDRESS` | same |
| `NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS` | same |
| `NEXT_PUBLIC_FLASH_LOAN_ADDRESS` | same |
| `NEXT_PUBLIC_TERM_LOAN_ADDRESS` | same |
| `NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS` | same |
| `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS` | same |
| `NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS` | same |
| `NEXT_PUBLIC_MERCHANT_POOL_ADDRESS` | same |
| `NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS` | same |
| `NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS` | same |
| `NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS` | same |
| `NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS` | same |
| `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS` | same |
| `NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS` | same |
| `NEXT_PUBLIC_DEV_VAULT_ADDRESS` | same |
| `NEXT_PUBLIC_FAUCET_ADDRESS` | same |
| `FAUCET_OPERATOR_PRIVATE_KEY` | Hot wallet that signs claim txs |
| `FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER` | `true` (testnet only — use KMS on mainnet) |

### Optional features (can stay unset)

| Variable | What it enables |
|----------|-----------------|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting + JWT revocation. Testnet: unset → in-memory degraded mode. Mainnet: required. |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_PUBLIC_BASE_URL` | Avatar uploads. Unset → upload UI hidden. |
| `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` | Email 2FA. Unset → email 2FA disabled. |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` | SMS 2FA. Unset → SMS 2FA disabled. |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | Error monitoring. Recommended for any deploy you actually care about. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect support. Get free at https://cloud.walletconnect.com |

### Auto-inferred (don't set these)

| Variable | Inferred from |
|----------|---------------|
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel sets automatically |
| `VERCEL_BRANCH_URL` | Vercel sets automatically |
| `VERCEL_URL` | Vercel sets automatically |
| `NODE_ENV=production` | Vercel sets automatically on production builds |
| `VERCEL=1` | Vercel sets automatically |
| `CI=true` | Vercel sets automatically |

---

## Common failure modes

### Symptom: "Error: Command 'npm run build' exited with 1" with no output

**Cause:** This is what your last build showed. Was caused by the
validator using `logger.info()` which gets suppressed in production.
**Fixed in current repo** — validator now uses `console.log` directly.
If you see this again with the new code, look for:

- Missing required env vars (the validator prints exactly which)
- A `git push` that didn't include the validator fix — verify
  `lib/validateProduction.ts` line 7 imports only `dotenv` (no
  `logger` import)

### Symptom: Build passes, app boots, but every API route returns 500

**Cause:** Wrong `DATABASE_URL` or `vfide_app` role lacks grants.
Check Vercel runtime logs for "permission denied for table X" — the
table X tells you which migration didn't apply. Run migrations again
or check that you applied 20260510_120000 (the broad grants).

### Symptom: Build passes, app boots, but Sign-In throws "JWT verify failed"

**Cause:** `JWT_SECRET` changed between when the session was issued
and now. Clear browser localStorage/cookies and re-sign-in. If it
keeps happening, check that the secret is the same across Vercel
environments (Production, Preview, Development).

### Symptom: Faucet claim returns 503 "Faucet signer unavailable"

**Cause:** `FAUCET_OPERATOR_PRIVATE_KEY` missing or malformed, OR
`FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER` not set to `true`. Both are
required for the testnet local-signer path.

### Symptom: Faucet claim succeeds but ProofScore doesn't increase

**Cause:** `EcosystemVault.isManager(faucet)` is false. Run
`npm run deploy:full:apply -- --network baseSepolia` to execute the
queued manager change. Requires 48h to have elapsed since deploy.

### Symptom: "function not in ABI" runtime errors in browser console

**Cause:** `lib/abis/*.json` drift from deployed contracts. Run
`npx hardhat compile && npm run sync-abis`, commit, push.

### Symptom: RLS-protected query returns 0 rows for the owner

**Two possible causes:**

1. `app.current_user_address` isn't being set per query. Check
   `lib/db.ts:32` (`applyDbUserAddressContext`) is being called.
2. Row's address column has mixed-case (EIP-55 checksum) but the
   policy uses bare equality. Apply migration
   `20260510_141500_normalize_legacy_rls_lower.sql`.

### Symptom: Contract address validation throws at boot

**Cause:** A `NEXT_PUBLIC_*_ADDRESS` env var is set but isn't a valid
0x-prefixed 40-character hex string. Check for trailing whitespace,
mistyped chars, missing 0x prefix.

### Symptom: instrumentation.ts throws "DATABASE_URL appears to use a BYPASSRLS role"

**Cause:** You're connecting as `postgres` superuser or another role
with `BYPASSRLS`. Switch `DATABASE_URL` to use `vfide_app`. If you
created `vfide_app` correctly with `NOBYPASSRLS`, double-check:

```bash
psql "$DATABASE_URL_ADMIN" -c "SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'vfide_app';"
```

Should show `rolbypassrls = f` (false).

---

## Rollback procedures

### Rollback Phase 4 → Phase 3

Just don't announce. Phase 3 and 4 are the same deployment state.

### Rollback Phase 3 → Phase 2

You don't need to undeploy contracts (cheap to leave them sitting
there). Just:

- Remove all `NEXT_PUBLIC_*_ADDRESS` env vars in Vercel
- Re-add `FRONTEND_SELF_CONTAINED=true`? **No** — Phase 2 is still
  DB-backed. Leave DATABASE_URL + JWT_SECRET set.
- Redeploy

Wagmi calls will go back to throwing errors, app behaves like Phase 2.

### Rollback Phase 2 → Phase 1

- Remove `DATABASE_URL` and `JWT_SECRET`
- Add `FRONTEND_SELF_CONTAINED=true`
- Redeploy

If you want to nuke the database too:

```bash
psql "$DATABASE_URL_ADMIN" -f migrations/20260511_160000_split_writer_role.down.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_141500_normalize_legacy_rls_lower.down.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_140000_complete_rls_baseline.down.sql
psql "$DATABASE_URL_ADMIN" -f migrations/20260510_120000_grant_vfide_app_and_baseline_rls.down.sql
# 20260503 doesn't have a down migration; drop the role manually:
psql "$DATABASE_URL_ADMIN" -c "DROP ROLE IF EXISTS vfide_app;"
```

### Rollback Phase 1 → nothing

Delete the Vercel project. Cleanly destroys the deployment.

---

## Mainnet differences (when you're ready)

The same 4-phase model applies. Key diffs:

| Setting | Testnet | Mainnet |
|---------|---------|---------|
| `--network` | `baseSepolia` | `base` |
| `DEPLOY_TESTNET_FAUCET` | `true` | unset (or `false`) |
| `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP` | `true` first run | unset (must be `false`) |
| `BOOTSTRAP_*_ADDRESS` | Can be deployer EOA | Must be real addresses, ideally multisigs |
| `NEXT_PUBLIC_IS_TESTNET` | `true` | `false` |
| `NEXT_PUBLIC_CHAIN_ID` | `84532` | `8453` |
| `FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER` | `true` | unset — must be KMS |
| Redis (`UPSTASH_*`) | optional | required |
| Sentry | optional | required |

`deploy-full.ts` enforces these gates at script level so you can't
accidentally cross-pollinate testnet and mainnet config.

`fund-faucet.ts` and `validate-testnet-ready.ts` refuse to run on
mainnet chain IDs by design (the faucet doesn't exist on mainnet).

---

## When you're done with this doc

You have a deployed testnet, the validators pass, the smoke test
worked. Tell people about it. Open a Discord, post on X, message
some YouTubers. The actual go-to-market is outside the scope of this
document but the technical floor for "we have a working product" is
covered here.

If you want to update this doc as you find things during real
deployment (timing surprises, gas estimates, providers that worked
or didn't), edit it in place — that's why it's in the repo.

---

## Where to find other docs

- `CHANGELOG.md` — chronological record of every code change across
  the testnet-readiness work
- `VFIDE_TESTNET_READINESS.md` — full status of all readiness
  items, what's open and closed
- `TESTNET_RUNBOOK.md` — shorter operator-focused runbook (subset
  of this doc's Phase 3)
- This file (`VFIDE_PREVIEW_TO_PRODUCTION.md`) — the full progression
  from blank Vercel project to announce-ready

If any of those contradict each other, this file is the most recent
and most operational. The others are historical or focused on a
narrower piece.

---

*Generated 2026-05-11 at the end of the testnet-readiness work.
Update this file as you encounter reality during a real deploy.*
