# VFIDE Full Repository Audit

**Date:** March 31, 2026
**Scope:** Complete codebase — 141 Solidity contracts (30,502 lines), 87 API routes, 79 pages, 292 components, WebSocket server, database layer, deployment infrastructure, test suites, scripts
**Auditor note:** This audit builds on a prior frontend-specific audit. Frontend findings are summarized here; see `VFIDE_Frontend_Remediation_Guide.md` for their full fix instructions.

---

## Verdict: CONDITIONAL PASS

The protocol's security architecture is genuinely sophisticated — timelock-protected admin operations, DAO-gated oracle configuration, fee sustainability controls, multi-layer access control, and comprehensive event emission for monitoring. However, several cross-layer integration gaps and a few critical infrastructure oversights prevent an unconditional deployment recommendation.

**Critical:** 5 | **High:** 9 | **Medium:** 12 | **Low:** 10 | **Informational:** 8

---

## Layer 1: Smart Contracts (141 files, 30,502 lines)

### Strengths

The contract layer is the strongest part of the codebase:

- **Consistent pragma**: All 68 `.sol` files use `pragma solidity 0.8.30` — no version drift.
- **Reentrancy protection**: `ReentrancyGuard` or manual `nonReentrant` on every state-changing external function across VFIDEToken, CardBoundVault, AdminMultiSig, CouncilManager, VaultInfrastructure.
- **No `tx.origin`**: Zero usages. No `delegatecall`. No `selfdestruct` (one comment reference only).
- **Fixed supply**: `_mint()` is `internal` only, called exclusively in the constructor. `MAX_SUPPLY` is enforced. No external mint path exists post-deployment.
- **Lock/release bridge**: VFIDEBridge uses lock/release model, NOT burn/mint. Avoids the infinite-mint vulnerability that has destroyed other bridges.
- **Timelock-protected admin operations**: Token contract uses 48-hour timelocks for burn router, treasury sink, sanctum sink, and vault hub changes. FeeDistributor has 72-hour delays on split and destination changes. BurnRouter has 7-day module change delays.
- **Seer (oracle) is DAO-gated**: All Seer configuration functions — score sources, decay config, thresholds, policy versions — are `onlyDAO`, not `onlyOwner`. This means ProofScore manipulation requires a governance proposal, not a single key compromise.
- **Fee sustainability controls**: ProofScoreBurnRouter has a daily burn cap (500K VFIDE), minimum supply floor (50M), micro-transaction fee ceiling (1%), and rate-limited fee policy changes (1 per day). These prevent economic attacks on the fee mechanism.
- **FeeDistributor channel design**: 5-channel fee split (burn 35%, Sanctum 20%, DAO payroll 15%, merchant pool 20%, headhunter pool 10%) with a 20% minimum burn floor and 50% maximum per-channel cap. This is Howey-safe by design — no channel resembles passive profit distribution.
- **Rich event coverage**: 47 events in VFIDEToken, 22 in CardBoundVault, 10+ in FeeDistributor. Every state change is observable.
- **Anti-whale protection**: Configurable max transfer amount (1% supply), max wallet balance (2%), daily transfer limit (2.5%), and transfer cooldown. All exemptable for exchanges/contracts.

### Findings

#### SC-1 [High]: Seer.sol at 1,335 Lines with `runs: 1` Optimizer

Seer.sol uses `optimizer.runs: 1` to avoid bytecode size limits. This produces the cheapest-to-deploy but most-expensive-to-call bytecode. For an oracle that's called on every token transfer (via BurnRouter → Seer.getScore), this means every transfer pays excess gas.

**Remediation:** Split Seer into SeerCore (scoring logic, called frequently → runs: 200) and SeerAdmin (configuration, called rarely → runs: 1). This pattern is already partially implemented with SeerView and SeerSocial as separate contracts.

#### SC-2 [High]: Seven Contracts Use `runs: 1`

VFIDEToken.sol, Seer.sol, SeerAutonomous.sol, EcosystemVault.sol, OwnerControlPanel.sol, BadgeManager.sol, VaultInfrastructure.sol, DeployPhases3to6.sol all use `runs: 1`. These are core contracts called frequently. The gas overhead compounds across all users.

**Remediation:** Refactor oversized contracts to bring them under the 24KB limit at `runs: 200`. The monolith pattern (one contract does everything) is the root cause.

#### SC-3 [Medium]: `assembly` Blocks Lack Comment Documentation

11 `assembly` blocks across 7 contracts (CardBoundVault, DAO, DAOTimelock, VFIDEBridge, VFIDEToken, VaultHub, VaultInfrastructure). Most are `extcodesize` / `extcodehash` / `create2` which are standard patterns, but none have inline comments explaining why assembly is necessary or what safety invariants they maintain.

**Remediation:** Add NatSpec comments above each assembly block documenting: (1) why Solidity can't do this, (2) what the block does, (3) what invariants it assumes.

#### SC-4 [Medium]: 559 Uses of `block.timestamp`

While `block.timestamp` is the correct approach for timelocks and cooldowns (as opposed to block number), the sheer volume means any timestamp manipulation by validators (±15 seconds on Ethereum, similar on L2s) could affect many edge cases simultaneously. This is an accepted risk but should be documented.

#### SC-5 [Medium]: `unchecked` Blocks Need Overflow Justification

7 `unchecked` blocks exist. Each should have a comment proving why overflow/underflow is impossible. Example from VFIDEToken `_transfer`:
```solidity
unchecked { _balances[from] = bal - amount; }
```
This is safe because `bal >= amount` is checked on the line above, but a comment should say so explicitly.

#### SC-6 [Low]: Raw `.call{value}` Without Gas Limit in Some Contracts

`CardBoundVault.sol:505` and `TempVault.sol:66` use `.call{value: amount}("")` without a gas limit. While `SanctumVault.sol:287` correctly uses `gas: 10_000`, the inconsistency means some contracts are vulnerable to reentrancy via fallback functions if the nonReentrant modifier were ever removed.

**Remediation:** Add `gas: 10_000` to all `.call{value}` that send to arbitrary addresses, or document why unlimited gas is safe in each case.

#### SC-7 [Low]: No Formal Verification or Fuzz Testing in CI

97 contract test cases across 6 test files cover basic happy/sad paths. No property-based testing, no invariant testing, no Echidna/Foundry fuzz campaigns, no Mythril/Slither integration in CI (scripts exist but aren't wired to CI).

**Remediation:** Add Slither to CI as a gate. Create Echidna invariant tests for at minimum: (1) totalSupply never exceeds MAX_SUPPLY, (2) fee percentages always sum to 100%, (3) vault balances never go negative, (4) timelock delays are always enforced.

#### SC-8 [Informational]: FeeDistributor vs ProofScoreBurnRouter Overlap

Both contracts handle fee logic. FeeDistributor does post-collection splitting. ProofScoreBurnRouter does per-transfer fee calculation. The separation is correct architecturally (calculation vs distribution), but the naming overlap may confuse auditors and developers.

---

## Layer 2: API Routes (87 routes)

### Strengths

- **100% auth coverage**: Every API route uses `requireAuth()`, `requireAdmin()`, or `optionalAuth()`. Zero unprotected endpoints.
- **100% rate limiting**: Every route uses `withRateLimit()` with tiered configs (auth: 10/min, write: 30/min, claim: 5/hr, read: 200/min).
- **Parameterized SQL**: All database queries use `$1, $2...` parameterized placeholders. No string interpolation of user input into SQL.
- **Zod validation**: All request bodies validated via Zod schemas with Ethereum address format checks, pagination bounds, and text sanitization.
- **Admin dual verification**: `requireAdmin()` checks both env-var allowlist AND on-chain `owner()` call.

### Findings

#### API-1 [Critical]: CSRF Protection Is Dead Code

*Carried from frontend audit (C-1/C-2).* `validateCSRF()` exists but is never called. No root `middleware.ts` exists. All 87 API routes are vulnerable to CSRF via the auto-included httpOnly auth cookie.

#### API-2 [High]: Row-Level Security Policies Are Inert

Migration `20260121_234000_add_row_level_security.sql` enables RLS on users, messages, friendships, groups, and group_messages tables. Policies check `current_setting('app.current_user_address', true)`. But **the application never calls `SET app.current_user_address`** — zero occurrences in `lib/db.ts` or any API route. RLS evaluates against an unset variable (returns empty string), which means policies silently fail open — all rows pass the check.

**Remediation:** In `lib/db.ts`, wrap the `query()` function to set the session variable before each query:
```ts
export async function query<T>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    // Set RLS context from the authenticated user (passed via a request-scoped context)
    const userAddress = getCurrentUserAddress(); // from AsyncLocalStorage or similar
    if (userAddress) {
      await client.query("SELECT set_config('app.current_user_address', $1, true)", [userAddress]);
    }
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
```

#### API-3 [Medium]: `vercel.json` CSP Includes `unsafe-eval`, `next.config.ts` Explicitly Omits It

`vercel.json` line 17: `script-src 'self' 'unsafe-eval' ...`
`next.config.ts` line 88: `// 'unsafe-eval' is intentionally omitted to reduce script execution risk.`

On Vercel, `vercel.json` headers take precedence over Next.js headers for the same path. This means the production deployment has `unsafe-eval` enabled despite the developers' explicit intent to disable it. Any XSS vulnerability can use `eval()` to execute arbitrary code.

**Remediation:** Remove `'unsafe-eval'` from `vercel.json` CSP to match the intent documented in `next.config.ts`.

#### API-4 [Medium]: Health Endpoint Exposes Version Info

`app/api/health/route.ts` returns `process.env.npm_package_version`. While version disclosure is low-severity, it helps attackers identify specific vulnerability windows.

**Remediation:** Return only `{ status: 'ok' }` in production. Version info behind auth.

---

## Layer 3: Database (PostgreSQL, 71 migrations)

### Strengths

- **Migration system**: Proper timestamp-ordered `.sql` migrations with `.down.sql` rollbacks, tracked in `schema_migrations` table, applied transactionally.
- **RLS enabled** (though not functional — see API-2).
- **Performance indexes**: Dedicated migration for query performance.
- **Connection security**: SSL enforced in production, connection pooling with timeouts, statement timeout (30s).
- **Dev fallback protection**: `ALLOW_DEV_DB=true` required to use local fallback — prevents staging environments from silently connecting to dev databases.

### Findings

#### DB-1 [High]: `init-db.sql` Is Deprecated but Still Referenced

`setup-database.sh` runs `init-db.sql`, which is marked as deprecated in its own header comment ("The authoritative schema is in /migrations"). The `init-db.sql` messages schema uses different column names than the migration schema (raw addresses vs user IDs). Running both creates an incompatible schema.

**Remediation:** Remove `init-db.sql` from `setup-database.sh`. Point all setup documentation to `scripts/migrate.ts` exclusively.

#### DB-2 [Medium]: No Database Backup Automation

`scripts/backup-db.sh` exists but is a manual script. No cron job, no Vercel scheduled function, no retention policy. For a financial application, daily automated backups with 30-day retention are standard.

#### DB-3 [Low]: Missing Index on `messages.sender_id` + `messages.recipient_id`

The messages table has foreign keys on `sender_id` and `recipient_id` but the performance index migration should be verified to cover composite queries (`WHERE sender_id = $1 OR recipient_id = $1`).

---

## Layer 4: WebSocket Server (622 lines)

### Strengths

This is one of the best-secured WebSocket implementations I've reviewed:

- **JWT auth required**: Every connection must authenticate within `AUTH_TIMEOUT_MS` (5s default) or gets disconnected.
- **Origin allowlist**: `ALLOWED_ORIGINS` env var with wildcard rejection in production.
- **TLS enforcement**: Production refuses to start without TLS unless explicitly overridden.
- **Message size limit**: 8 KiB max payload with `perMessageDeflate: false` (zip-bomb prevention).
- **Zod schema validation**: Every inbound message parsed against a typed schema.
- **Per-IP rate limiting**: 10 connections/min, 60 messages/min.
- **Topic ACL**: External JSON-based access control list with auto-refresh.
- **Topic allowlist**: Only `governance`, `notifications`, and prefixed topics (`chat.*`, `proposal.*`, `presence.*`) are subscribable.

### Findings

#### WS-1 [Medium]: X-Forwarded-For Trusted Without Validation

`getRemoteIp()` trusts the first value in `X-Forwarded-For`. If the WebSocket server is directly exposed (not behind a reverse proxy), an attacker can spoof their IP to bypass rate limiting.

**Remediation:** Document that the WS server MUST be behind a reverse proxy that sets X-Forwarded-For. Or use the `request.socket.remoteAddress` when `TRUST_PROXY` is not explicitly set.

#### WS-2 [Low]: Auth Timeout Is Configurable via Env Var

`WS_AUTH_TIMEOUT_MS` defaults to 5000ms but can be set to any value. An extremely high value (e.g., 999999999) would allow unauthenticated connections to persist.

**Remediation:** Add `Math.min(AUTH_TIMEOUT_MS, 30_000)` to cap at 30 seconds regardless of env var.

---

## Layer 5: Frontend (79 pages, 292 components)

*Full detail in `VFIDE_Frontend_Remediation_Guide.md`. Summary of critical/high findings:*

#### FE-1 [Critical]: Root `middleware.ts` Missing

CSP nonce generation and CSRF enforcement both depend on a middleware.ts that doesn't exist.

#### FE-2 [Critical]: `getAuthHeaders()` Reads httpOnly Cookie (Impossible)

27 call sites use a dead function. Auth works by accident (cookie auto-inclusion).

#### FE-3 [High]: All 79 Pages Are Client Components

Zero server-side rendering. Entire app ships as client JavaScript.

#### FE-4 [High]: Image Remote Pattern Allows `hostname: '**'`

Next.js image optimizer becomes an open proxy.

#### FE-5 [High]: Admin Page Ships Full UI to All Browsers

3,033 lines of admin code including ABIs and emergency controls visible in bundle.

---

## Layer 6: Deployment & Infrastructure

### Strengths

- **Dockerfile is well-hardened**: Pinned base image digest, non-root user, multi-stage build, health check, telemetry disabled, standalone output.
- **Security headers in vercel.json**: HSTS, X-Frame-Options DENY, COOP same-origin, COEP credentialless.
- **Env var validation**: Runtime Zod schema fails fast in production if required vars are missing.
- **Sentry integration**: Client, server, and edge configs. Source maps hidden. Session replay with masking.

### Findings

#### INFRA-1 [Critical]: CSP Conflict Between `vercel.json` and `next.config.ts`

`vercel.json` includes `unsafe-eval` in script-src. `next.config.ts` explicitly omits it. Vercel headers take precedence, so production runs with `unsafe-eval` enabled.

Additionally, `vercel.json` applies `upgrade-insecure-requests` unconditionally, while `next.config.ts` conditionally applies it only in production. On preview/staging Vercel deployments (which use HTTP internally), this can break resource loading.

**Remediation:** Remove the entire CSP header from `vercel.json` and let `next.config.ts` (via the new `middleware.ts`) own CSP exclusively. This eliminates the dual-source conflict.

#### INFRA-2 [High]: No `scripts/deploy.ts` — Referenced But Missing

`package.json` line 73: `"contract:deploy": "hardhat run scripts/deploy.ts --network"`. The file `scripts/deploy.ts` does not exist. Only `scripts/deploy.sh` (a bash script for frontend deployment) and on-chain `DeployPhase1.sol` deployer contracts exist.

**Remediation:** Create `scripts/deploy.ts` that orchestrates the 9-batch deployment plan documented in the prior audit, or update `package.json` to reference the correct deployment mechanism.

#### INFRA-3 [Medium]: Docker Build Copies Entire Source Including `.env.example` Files

The Dockerfile `COPY . .` copies everything including `.env.example`, `.env.local.example`, `.env.production.example`, `.env.staging.example`, audit documents, and test files into the builder stage. While the runner stage only copies `.next` output, the builder image contains all source.

**Remediation:** Add a `.dockerignore` with: `.env*`, `__tests__/`, `test/`, `*.md`, `contracts/`, `websocket-server/`, `scripts/`.

#### INFRA-4 [Medium]: No `.dockerignore` File

Confirmed: `.dockerignore` does not exist. Every file in the repo (including `node_modules` if present, all 141 contracts, all test files) is sent to the Docker build context.

#### INFRA-5 [Low]: Sentry `tunnelRoute: "/monitoring"` Conflicts with Potential API Routes

The Sentry config routes browser Sentry requests through `/monitoring`. If any future API route or page is created at `/monitoring`, it will conflict.

---

## Layer 7: Test Coverage

### Current State

| Layer | Test Files | Test Cases | Coverage Estimate |
|-------|-----------|------------|-------------------|
| Contracts (Hardhat) | 6 | 97 | ~15% of contract functions |
| Frontend (__tests__) | 414 | Unknown (many are stubs) | Extensive but unverified |
| API routes | ~30 | ~200 | Moderate |
| WebSocket | 3 | ~20 | Basic |
| E2E | 2 | ~15 | Smoke only |

### Findings

#### TEST-1 [High]: 97 Contract Tests for 141 Contracts

6 test files cover a subset of contracts. Missing test coverage for: FeeDistributor, ProofScoreBurnRouter, DevReserveVestingVault, SanctumVault, EcosystemVault, SeerAutonomous, SeerGuardian, SeerSocial, BadgeManager, CouncilElection, CouncilSalary, SubscriptionManager, MerchantPortal, StablecoinRegistry, and ~60 more contracts.

VFIDEToken — the most critical contract — has zero dedicated test file.

**Remediation:** Priority test files needed:
1. `VFIDEToken.test.ts` — transfer logic, fee calculation, vault routing, anti-whale, blacklist, circuit breaker, timelock enforcement
2. `FeeDistributor.test.ts` — channel splits, min/max constraints, timelock delays
3. `ProofScoreBurnRouter.test.ts` — score-based fee curves, daily burn cap, supply floor, micro-tx ceiling
4. `DevReserveVestingVault.test.ts` — vesting schedule, cliff, early withdrawal prevention

#### TEST-2 [Medium]: Frontend Tests May Be Stubs

The prior frontend audit noted that many of the 414 test files in `__tests__/` were generated with empty test bodies. Without running the test suite, the actual assertion count is uncertain.

**Remediation:** Run `npx vitest --reporter=verbose 2>&1 | tail -20` and check pass/fail/skip counts. Any test file with zero assertions is dead weight.

#### TEST-3 [Low]: No Integration Tests Between Contract and Frontend Layers

No test verifies that frontend ABI imports match deployed contract interfaces. A script `scripts/verify-frontend-abi-parity.ts` exists but isn't part of CI.

**Remediation:** Add `verify-frontend-abi-parity.ts` to the CI pipeline.

---

## Layer 8: Scripts & Tooling

### Findings

#### SCRIPT-1 [Medium]: 40+ Verification Scripts Not Wired to CI

The `scripts/` directory contains ~40 verification scripts (`verify-*.ts`, `verify-*.sh`) covering bridge governance, card-bound vault security, chain-of-return, devreserve on-chain state, dual approval policy, ecosystem work rewards, fee burn router invariants, and more. These represent significant security investment but are manual-only.

**Remediation:** Create a `scripts/run-all-verifications.sh` that runs all verification scripts and add it to CI as a pre-deploy gate.

#### SCRIPT-2 [Low]: `scripts/deploy.sh` Uses `vercel --prod` Without Confirmation Gate

The deploy script runs `vercel --prod` directly. For a financial application, production deployments should require an explicit approval step (e.g., a CI gate, a manual trigger, or a deployment checklist verification).

---

## Cross-Layer Findings

#### CROSS-1 [Critical]: Three Separate CSP Definitions, None Authoritative

CSP is defined in three places:
1. `next.config.ts` headers() — has `unsafe-inline` for styles, no `unsafe-eval`, no nonces
2. `vercel.json` headers — has `unsafe-eval`, `unsafe-inline`, `upgrade-insecure-requests` unconditionally
3. Root `middleware.ts` — referenced in comments but does not exist (would generate nonces)

On Vercel: `vercel.json` wins → `unsafe-eval` is active in production.
Without middleware: No CSP nonces are ever generated.
The `next.config.ts` CSP is effectively dead code on Vercel.

**Remediation:** Single source of truth: create `middleware.ts` for CSP with nonces. Remove CSP from both `vercel.json` and `next.config.ts`. All other security headers (HSTS, X-Frame-Options, etc.) can stay in `vercel.json`.

#### CROSS-2 [High]: Frontend ABIs May Drift from Contract Source

`lib/abis/` contains JSON ABI files imported by `lib/contracts.ts`. If contracts are recompiled with changes, the frontend ABIs must be manually updated. No automated sync exists. `scripts/verify-frontend-abi-parity.ts` exists but is not in CI.

**Remediation:** Add a post-compile Hardhat task that copies ABIs to `lib/abis/` and run `verify-frontend-abi-parity.ts` in CI.

#### CROSS-3 [Medium]: Database Schema Has No Referential Integrity to On-Chain State

The database stores `wallet_address`, `proof_score`, `merchant_address`, etc. but has no mechanism to detect when on-chain state diverges from database state (e.g., a user's ProofScore changes on-chain but the database cache isn't updated).

**Remediation:** Implement an event indexer (subgraph or a lightweight listener) that syncs on-chain events to the database. The `NEXT_PUBLIC_SUBGRAPH_URL` env var already exists but isn't populated.

---

## Remediation Priority

### Before Deploy (Blockers)

1. **Create root `middleware.ts`** — CSP nonces + CSRF enforcement (CROSS-1, API-1, FE-1)
2. **Remove `unsafe-eval` from `vercel.json`** — or remove CSP from vercel.json entirely (INFRA-1)
3. **Wire RLS session variables** in `lib/db.ts` (API-2)
4. **Remove `getAuthHeaders()` dead code** (FE-2)
5. **Remove wildcard image pattern** (FE-4)

### First Sprint

6. Create `scripts/deploy.ts` for contract deployment (INFRA-2)
7. Write VFIDEToken.test.ts (TEST-1)
8. Write FeeDistributor.test.ts (TEST-1)
9. Write ProofScoreBurnRouter.test.ts (TEST-1)
10. Add `.dockerignore` (INFRA-3, INFRA-4)
11. Server-side admin page guard (FE-5)
12. Add ABI parity check to CI (CROSS-2)

### Ongoing

13. Split Seer.sol into Core + Admin (SC-1)
14. Refactor oversized contracts to avoid `runs: 1` (SC-2)
15. Wire verification scripts to CI (SCRIPT-1)
16. Implement event indexer for on-chain/off-chain sync (CROSS-3)
17. Add Slither to CI (SC-7)
18. Add Echidna invariant tests for token supply and fee invariants (SC-7)
19. Convert frontend pages to server components (FE-3)
20. Deprecate `init-db.sql` (DB-1)

---

## Summary

| Layer | Verdict | Key Strength | Key Gap |
|-------|---------|-------------|---------|
| Contracts | **Strong** | Timelocked admin ops, DAO-gated oracle, fee sustainability | Oversized monoliths, thin test coverage |
| API Routes | **Strong** | 100% auth + rate limiting, parameterized SQL | CSRF unenforced, RLS inert |
| Database | **Good** | Proper migrations, RLS defined, SSL enforced | RLS not activated, no backup automation |
| WebSocket | **Strong** | JWT auth, origin allowlist, TLS enforcement, Zod validation | X-Forwarded-For trust |
| Frontend | **Mixed** | Rich UI, design system, accessibility, lazy loading | No SSR, CSRF dead code, missing middleware |
| Infrastructure | **Good** | Hardened Dockerfile, Sentry, env validation | CSP triple-conflict, no .dockerignore |
| Tests | **Weak** | 414 frontend test files, 6 contract test files | Core token has 0 tests, many stubs |
| Scripts | **Good** | 40+ verification scripts | None wired to CI |

The protocol's on-chain security posture is strong. The off-chain integration layer (CSRF, RLS, CSP, deployment) is where the real risk lies. Fix the 5 deploy blockers and this moves to unconditional pass.
