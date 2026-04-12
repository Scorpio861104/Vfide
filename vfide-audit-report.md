# VFIDE Protocol — Full End-to-End Audit Report

**Date:** April 12, 2026
**Scope:** Entire repository — 72 Solidity contracts (~31,700 LOC), 116 API routes, Next.js frontend (~220K+ LOC), WebSocket server
**Auditor:** Claude (pre-professional-audit sweep)
**Severity Scale:** CRITICAL · HIGH · MEDIUM · LOW · INFORMATIONAL

---

## Executive Summary

VFIDE has clearly been through multiple audit rounds and the codebase shows strong evidence of iterative hardening — timelocks on admin functions, removal of freeze/blacklist, proper SIWE+JWT auth, Zod validation at API boundaries, parameterized SQL throughout, and a well-reasoned non-custodial design philosophy. However, several findings remain that range from critical contract-level logic gaps to infrastructure-level enforcement failures that a professional auditor would flag.

**Findings by severity:**

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 7 |
| MEDIUM | 12 |
| LOW | 9 |
| INFORMATIONAL | 10 |

---

## CRITICAL FINDINGS

### C-1: CSRF Validation Defined But Never Enforced

**Location:** `lib/security/csrf.ts`, entire API surface (116 routes)
**Impact:** All state-changing API endpoints (POST/PUT/PATCH/DELETE) are unprotected against cross-site request forgery attacks.

The `validateCSRF()` function is fully implemented in `lib/security/csrf.ts` with proper double-submit cookie pattern and timing-safe comparison. However, **it is never called from any middleware, route handler, or wrapper function.** A `grep` for `validateCSRF` across the entire `app/` directory returns zero results.

There is no root `middleware.ts` file (confirmed missing), and the auth middleware (`lib/auth/middleware.ts`) does not invoke CSRF validation. This means any authenticated user visiting a malicious site could have state-changing requests silently executed on their behalf.

**Recommendation:** Create a root `middleware.ts` that invokes `validateCSRF()` on all state-changing requests to `/api/*` paths, or integrate it into the `withAuth` wrapper. This is the single most impactful fix available.

---

### C-2: FraudRegistry.escrowTransfer() Has No Caller Authorization

**Location:** `contracts/FraudRegistry.sol`, line ~197
**Impact:** Anyone can call `escrowTransfer()` to create fake escrow records.

The `escrowTransfer()` function is intended to be called only by VFIDEToken during `_transfer()`. However, there is **no `require(msg.sender == address(vfideToken))` check** or equivalent access control. Any address can call `escrowTransfer(from, to, amount)` and create spurious escrow entries that will later release tokens from the FraudRegistry's balance to arbitrary addresses.

This becomes exploitable if the FraudRegistry holds any token balance (which it will once legitimate escrows are created). An attacker could:
1. Call `escrowTransfer(attacker, attacker, X)` with an amount ≤ FraudRegistry balance
2. Wait 30 days
3. Call `releaseEscrow()` to drain the balance

**Recommendation:** Add `require(msg.sender == address(vfideToken), "FR: only token");` at the top of `escrowTransfer()`.

---

### C-3: No Root `middleware.ts` — CSP/Security Headers Not Enforced at Edge

**Location:** Project root (missing file)
**Impact:** Content Security Policy, CSRF, and other request-level security controls are not applied at the edge layer.

Next.js App Router requires a root `middleware.ts` for request-level interception. The `next.config.ts` defines some security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), but the critical nonce-based CSP referenced in comments ("nonce-based CSP is enforced in `proxy.ts`") has no actual enforcement path. The `proxy.ts` file, if it exists, cannot act as middleware without a root `middleware.ts` to invoke it.

Previous audit sessions have noted this exact issue as a recurring finding.

**Recommendation:** Create `/middleware.ts` that:
1. Generates CSP nonce and sets nonce-based Content-Security-Policy header
2. Calls `validateCSRF()` on state-changing requests
3. Sets all security headers consistently

---

## HIGH FINDINGS

### H-1: WithdrawalQueue Contract Is Abstract and Unwired

**Location:** `contracts/WithdrawalQueue.sol`
**Impact:** The standalone `WithdrawalQueue` contract is declared `abstract` and is never inherited by `CardBoundVault`. CardBoundVault implements its own separate withdrawal queue inline.

While CardBoundVault's inline queue works, the standalone `WithdrawalQueue.sol` contract has a critical architectural issue: `totalVaultBalance` is a manual state variable with no automatic updates, meaning cap enforcement (`DAILY_WITHDRAWAL_CAP_PERCENT`) will be calculated against stale data. This contract appears to be dead code that could confuse auditors.

**Recommendation:** Remove `WithdrawalQueue.sol` or clearly mark it as deprecated. The CardBoundVault inline queue is the canonical implementation.

---

### H-2: FeeDistributor Mixes OZ and SharedInterfaces Import Strategy

**Location:** `contracts/FeeDistributor.sol`, `contracts/SeerWorkAttestation.sol`, `contracts/ServicePool.sol`
**Impact:** Supply-chain attack surface inconsistency.

The protocol's stated security strategy is to use local reimplementations (SharedInterfaces.sol) for core contracts and only use OZ imports for VFIDEBridge (LayerZero requirement). However, FeeDistributor, SeerWorkAttestation, and ServicePool all import `@openzeppelin/contracts` for AccessControl, ReentrancyGuard, and Pausable — contradicting the documented supply-chain isolation policy.

This means these contracts are exposed to npm supply-chain risk that the rest of the protocol was specifically hardened against. Since FeeDistributor handles fee revenue splitting, this is a meaningful trust boundary violation.

**Recommendation:** Either migrate FeeDistributor/SeerWorkAttestation/ServicePool to SharedInterfaces, or update the security documentation to explicitly acknowledge the expanded OZ dependency surface.

---

### H-3: CardBoundVault Withdrawal Queue Grows Unbounded

**Location:** `contracts/CardBoundVault.sol`, `withdrawalQueue` array
**Impact:** Gas griefing / permanent storage bloat.

The `withdrawalQueue` array uses `.push()` and never compacts. While active entries are capped at `MAX_QUEUED = 20`, the array itself grows forever. After years of use, `getPendingQueuedWithdrawals()` iterates the entire array (including executed/cancelled entries), consuming increasing gas.

Additionally, `_queueWithdrawal()` iterates the full array to count active entries, creating O(n) gas cost that grows with the vault's lifetime.

**Recommendation:** Use a circular buffer with a head/tail pointer (similar to ProofScoreBurnRouter's score history), or maintain a separate counter for active entries to avoid the O(n) scan.

---

### H-4: Anti-Whale Daily Limit Double-Counting

**Location:** `contracts/VFIDEToken.sol`, `_checkWhaleProtection()` + `_recordActualDailyTransfer()`
**Impact:** Users may hit daily limits at approximately half the intended threshold.

The `_checkWhaleProtection()` function checks projected daily usage against the limit (line: `projectedTransferred = dailyTransferred[from] + trackedAmount`). If this passes, `_transfer()` continues. Then near the end of `_transfer()`, `_recordActualDailyTransfer()` is called, which ALSO increments `dailyTransferred[from]` and re-checks the limit. This means the actual transferred amount is counted twice — once in the projection check and once in the recording.

The projection check doesn't increment state, so the actual recording is the real count. However, if the projection passes but the actual recording reverts (because it uses `remaining` which is post-fee, not `trackedAmount`), legitimate transfers could be blocked.

**Recommendation:** Remove the redundant re-check in `_recordActualDailyTransfer()` or ensure both paths use the same amount. The current approach where projection uses `trackedAmount` but recording uses `remaining` (post-fee) creates asymmetric limits.

---

### H-5: `node_modules` Committed in WebSocket Server

**Location:** `websocket-server/node_modules/` (26MB)
**Impact:** Supply-chain risk, stale dependencies, repository bloat.

The WebSocket server's `node_modules/` directory is committed to the repository. While `.gitignore` lists `/websocket-server/node_modules`, the directory is present in the submitted zip. Committed `node_modules` bypass lockfile integrity checks, make dependency auditing unreliable, and can hide tampered packages.

**Recommendation:** Remove `websocket-server/node_modules/` from the repository. Ensure CI/CD runs `npm ci` from the lockfile.

---

### H-6: Bridge Liquidity Model Without Reserve Tracking

**Location:** `contracts/VFIDEBridge.sol`, `_lzReceive()`
**Impact:** Bridge could be drained below what's needed to honor pending inbound transfers.

The bridge uses a lock-on-source/release-on-destination liquidity pool model. `_lzReceive()` checks `require(bridgeBalance >= amount, "insufficient liquidity")` before releasing tokens. However, there is no tracking of tokens that are "in flight" — if multiple cross-chain messages arrive in the same block, or tokens are sent outbound while inbound messages are pending, the bridge balance could be insufficient.

There is also no mechanism to replenish bridge liquidity on the destination chain except for someone manually sending tokens to the bridge contract.

**Recommendation:** Track `pendingInboundAmount` from confirmed outbound sends, and reserve that amount when checking available liquidity for releases.

---

### H-7: Faucet Claim Route Lacks CSRF and Auth

**Location:** `app/api/faucet/claim/route.ts`
**Impact:** Automated token draining via rate-limit evasion.

The faucet claim endpoint has rate limiting (5 claims/hour) but no authentication and no CSRF protection. The rate limit key is derived from IP address, which is trivially rotatable via proxies or Tor. Combined with the missing CSRF (C-1), a malicious site could trigger faucet claims from visitor browsers, draining the faucet allocation.

The on-chain `hasClaimed` check provides per-address protection, but an attacker could generate thousands of addresses and claim for each.

**Recommendation:** Add wallet signature verification (prove ownership of the claiming address) and consider requiring a minimum account age or on-chain activity before allowing claims.

---

## MEDIUM FINDINGS

### M-1: SQL Column Name Interpolation in Onboarding Route

**Location:** `app/api/quests/onboarding/route.ts`, line ~209
**Impact:** SQL injection (mitigated by whitelist, but fragile pattern).

The `step` parameter is validated against `VALID_ONBOARDING_STEPS` set before being interpolated into SQL as a column name. While the whitelist prevents injection today, this pattern is inherently fragile — a future developer adding a step name containing SQL metacharacters, or modifying the validation, could reintroduce injection.

**Recommendation:** Use a `CASE`/mapping approach that maps step names to column names without interpolation, or use a JSONB column instead of separate boolean columns.

---

### M-2: ProofScoreBurnRouter `computeFeesAndReserve` Reentrancy Through Token Callback

**Location:** `contracts/ProofScoreBurnRouter.sol`, `computeFeesAndReserve()`
**Impact:** Potential state inconsistency if VFIDEToken's transfer path calls BurnRouter again.

`computeFeesAndReserve()` has `nonReentrant` but internally calls `computeFees()` which calls `getTimeWeightedScore()` which calls `seer.getCachedScore()`. If the Seer contract has any callback pattern, this could create unexpected behavior. More importantly, `computeFeesAndReserve()` is called from VFIDEToken's `_transfer()`, and then VFIDEToken calls `recordVolume()` separately — both are `nonReentrant`. If the ReentrancyGuard is the token's (not the router's), this is fine. But since the router has its own guard, the second call to `recordVolume()` from the same `_transfer()` execution will succeed because it's a separate transaction from the router's perspective.

**Recommendation:** Verify that `computeFeesAndReserve` and `recordVolume` are never called in the same external transaction path through the router. Consider merging volume recording into `computeFeesAndReserve` to eliminate the second call.

---

### M-3: VFIDEToken `_transfer` Missing `logicalFrom` Resolution for Fee Scoring

**Location:** `contracts/VFIDEToken.sol`, `_transfer()`, line with `_resolveFeeScoringAddress`
**Impact:** Known mainnet blocker (C-1 from previous audits). When `from` is a vault address, `_resolveFeeScoringAddress` correctly resolves to the vault owner. However, if the vault owner's ProofScore is cached in the BurnRouter under their EOA address but the transfer comes from their vault, the lookup may return a stale or zero score, resulting in maximum fees.

This was flagged in your previous sessions as the outstanding mainnet blocker. The `_resolveFeeScoringAddress` function does attempt resolution via `ownerOfVault()`, but it uses a low-level `staticcall` that silently returns the original `from` on failure. If VaultHub's `ownerOfVault` function signature doesn't exactly match, resolution silently fails.

**Recommendation:** Use a typed interface call instead of raw staticcall, and add an event/revert when resolution fails so it doesn't silently apply max fees.

---

### M-4: SIWE Challenge Storage Requires Redis

**Location:** `lib/security/siweChallenge.ts`
**Impact:** Authentication fails entirely if Redis is unavailable.

The `assertRedisAvailable()` function throws a hard error if Redis is not configured. Unlike earlier versions that used an in-memory Map (which survived restarts but wasn't multi-instance safe), this version has no fallback. If Upstash Redis experiences an outage, **all authentication is blocked** — users cannot log in.

**Recommendation:** Implement an in-memory fallback for single-instance deployments, with a clear warning log that replay protection is reduced. Alternatively, implement a signed-challenge pattern that doesn't require server-side storage.

---

### M-5: Rate Limiting Degrades to No-Op Without Redis

**Location:** `lib/auth/rateLimit.ts`
**Impact:** If Upstash Redis is not configured, all rate limiting is silently disabled.

The `withRateLimit()` function returns `null` (allowing the request) when Redis is unavailable. In production, if the Redis connection drops or credentials expire, every endpoint (including auth, faucet claims, and write operations) becomes unlimited.

**Recommendation:** Implement a basic in-memory rate limiter as fallback (even if it's per-instance only), and emit a CRITICAL-level log/alert when Redis is unavailable in production.

---

### M-6: `VFIDEToken.renounceOwnership()` Is `view` Not `pure`

**Location:** `contracts/VFIDEToken.sol`, bottom
**Impact:** Minor gas waste, but more importantly the function compiles as a `view` function which means external callers (like Etherscan's write interface) won't show it as a write function. The `onlyOwner` modifier's `msg.sender` check makes this technically a `view` that reads state, but the intent is to block the function entirely.

**Recommendation:** Change to override the inherited function signature or use a non-view revert pattern.

---

### M-7: Seer Score Zero Silently Applies Maximum Fees

**Location:** `contracts/ProofScoreBurnRouter.sol`, `computeFees()`
**Impact:** If the Seer contract is misconfigured, unresponsive, or returns 0 for all users, every transfer pays the maximum 5% fee without any revert or user-visible warning.

The `SeerScoreZeroWarning` event exists but is only emittable via `warnIfSeerMisconfigured()` which is an admin-only function that must be called proactively. During normal transfers, a zero score simply means maximum fees.

**Recommendation:** Add an on-chain circuit breaker that pauses fee collection if the Seer returns 0 for a configurable number of consecutive users, or emit the warning event inline during `computeFees`.

---

### M-8: `vercel.json` Sets `Cross-Origin-Embedder-Policy: credentialless`

**Location:** `vercel.json`
**Impact:** COEP `credentialless` restricts how the app can load cross-origin resources, potentially breaking third-party integrations (MoonPay, Transak on-ramp iframes, analytics). This is an aggressive policy that's usually only needed for SharedArrayBuffer/cross-origin isolation.

**Recommendation:** Verify that all third-party embeds (on-ramp providers, analytics) work correctly with this policy. If SharedArrayBuffer is not needed, remove COEP/COOP headers.

---

### M-9: FeeDistributor `receiveFee()` Allows Admin Direct Calls

**Location:** `contracts/FeeDistributor.sol`, `receiveFee()`
**Impact:** The function accepts calls from either VFIDEToken or any ADMIN_ROLE holder. An admin could call `receiveFee(arbitraryAmount)` to manipulate `totalReceived` accounting without actually transferring tokens, creating a discrepancy between tracked and actual balances.

**Recommendation:** Remove the admin bypass or require that `receiveFee` verifies the actual balance change.

---

### M-10: `getExpectedNetAmount` Reverts on Preview Failure

**Location:** `contracts/VFIDEToken.sol`, `getExpectedNetAmount()`
**Impact:** This public view function reverts with `"VF: fee preview failed"` if the BurnRouter preview fails. Frontends calling this for display purposes will get an unhandled revert instead of a graceful fallback.

**Recommendation:** Return a sentinel value or use a try/catch pattern similar to `_tryExpectedNetAmount`.

---

### M-11: SystemHandover `disarm()` Resets `extensionsUsed`

**Location:** `contracts/SystemHandover.sol`, `disarm()`
**Impact:** If the dev multisig disarms and re-arms the handover, the extension counter resets to zero, effectively allowing unlimited delays of governance handover. The `maxExtensions = 1` constraint can be bypassed by disarm → re-arm cycles.

**Recommendation:** Make `extensionsUsed` monotonically increasing across arm/disarm cycles, or add a global extension cap.

---

### M-12: Multiple Pending Timelock Slots Are Singleton

**Location:** `contracts/VFIDEToken.sol`
**Impact:** Only one pending exempt proposal, one pending whitelist proposal, etc. can exist at a time. If the owner needs to exempt multiple addresses, each must go through a full 48-hour cycle sequentially. This is a UX issue but also means time-sensitive multi-address operations (like exchange listings) become a multi-week process.

**Recommendation:** Consider a batch proposal mechanism or a mapping-based pending system.

---

## LOW FINDINGS

### L-1: `websocket-server/dist/` Committed
Build artifacts should not be in source control. This creates merge conflicts and stale output risk.

### L-2: `VFIDEDashboard.tsx` at Project Root
A 10KB React component sits at the project root outside the `app/` directory structure. This appears to be an orphaned file.

### L-3: Test Quality Concerns — 1,512 `jest.fn()` Mocks vs 431 Real Assertions
The `__tests__/` directory has 451 test files with heavy mocking (1,512 `jest.fn()` calls) and 175 skipped/todo tests. The `test/hardhat/` directory has 36 files with 431 real EVM assertions. The ratio suggests frontend tests are mostly mock-heavy unit tests that may not catch integration issues.

### L-4: `FRONTEND_PAGE_FUNCTION_INVENTORY.json` and `FRONTEND_PAGE_TEST_COVERAGE_MAP.json` at Root
These 19KB and 14KB JSON files appear to be one-time audit artifacts that should live in a `docs/` or `reports/` directory.

### L-5: Hardcoded Contract Addresses in `lib/chains.ts`
Testnet contract addresses are hardcoded. These should come from environment variables or a deployment manifest to support multi-environment deployment.

### L-6: `NEXT_PUBLIC_1INCH_API_KEY` Exposed Client-Side
In `lib/compliance/dex-routing.ts`, the 1inch API key is referenced via `NEXT_PUBLIC_` prefix, meaning it's bundled into client-side JavaScript. API keys for third-party services should be proxied through server-side routes.

### L-7: CardBoundVault `rescueNative` Uses Low-Level `.call{value}`
The native rescue function uses a low-level call without a gas limit, which could be exploited if the recipient is a contract with a gas-expensive fallback. Consider using a fixed gas stipend.

### L-8: `EscrowManager.setTokenWhitelist` Lacks Timelock
The DAO can instantly add or remove token whitelists for the escrow system, unlike most other admin functions which have timelocks. A malicious or compromised DAO could instantly enable a worthless token for escrow.

### L-9: `DevReserveVestingVault` Constants Mismatch Risk
`VESTING = 60 * 30 days` equals 1800 days, but the comment says "60 months." Calendar months vary (28-31 days), so "60 months" ≈ 1826 days. The 26-day difference means the final unlock happens slightly earlier than expected. This is cosmetic but could be confusing for legal/compliance documentation.

---

## INFORMATIONAL FINDINGS

### I-1: Solidity 0.8.30 Compiler Choice
Using a very recent compiler version. While the rationale is documented (transient storage, MCOPY), this version has less production exposure. The team has acknowledged this risk.

### I-2: `Ownable` Pattern Without Two-Step Transfer on VFIDEToken
VFIDEToken uses a single-step `Ownable` pattern from SharedInterfaces. While `renounceOwnership` is blocked, `transferOwnership` is still single-step (no pending/accept pattern). The OwnerControlPanel contract provides the two-step pattern externally, but the token itself doesn't enforce it.

### I-3: No Formal Deployment Verification Script for Contract Graph
While individual verification scripts exist (`scripts/verify-*`), there is no single script that verifies the entire deployment graph (all contracts pointing to correct addresses, all modules wired, all timelocks active).

### I-4: `MIGRATION.md` and `VFIDE_MASTER_ISSUE_TRACKER.md` May Contain Stale Data
These files reference historical migration steps and issue states that may not reflect current codebase state.

### I-5: Mixed Use of `zod` and `zod4`
Some API routes import from `zod4` while the project may have both versions. Ensure a single Zod version is used to avoid validation inconsistencies.

### I-6: `LedgerLogFailed` Event Is Fire-and-Forget
Throughout the codebase, ProofLedger failures are caught and emit a `LedgerLogFailed` event but never revert. While this is intentional for liveness, it means the audit trail can silently have gaps. Consider an off-chain monitor that alerts on these events.

### I-7: Bridge `exemptCheckBypass` Flag Exists
The bridge has an `exemptCheckBypass` flag that can bypass token exemption checks. While it has a max duration, its existence is worth noting for audit context.

### I-8: `setAntiWhale` Has No Timelock
Anti-whale parameters (max transfer, max wallet, daily limit, cooldown) can be changed instantly by the owner. A sudden max transfer reduction could trap users with pending transactions.

### I-9: `VFIDEFlashLoan` Contract Exists
A flash loan contract is present. Flash loans are a common attack vector in DeFi. Ensure the flash loan contract cannot be used to manipulate ProofScore, governance votes, or fee calculations within a single transaction.

### I-10: 310 Lines in `package.json`
The project has an extremely large dependency tree. Each dependency is a potential supply-chain attack surface. Consider auditing the dependency tree with `npm audit` and removing unused packages.

---

## Architecture Observations (Not Findings)

**Strengths identified:**
- Non-custodial design philosophy is well-executed: freeze/blacklist/force-recovery all properly removed
- 48-hour timelocks on all critical admin functions with proper propose/cancel/apply patterns
- SIWE authentication with Redis-backed challenge replay protection (when Redis is available)
- Zod validation at all API boundaries
- Parameterized SQL throughout (no raw string interpolation in queries, with the minor exception of the whitelisted onboarding step)
- EIP-2612 permit with proper signature malleability checks
- Anti-whale protection with configurable limits
- Fee sustainability controls (daily burn cap, supply floor, volume-adaptive fees)
- Guardian-based recovery without custodial backdoors
- Howey-safe language choices (transactionFeesProcessed vs totalBurnedToDate, presale removal)

**Areas needing attention before mainnet:**
1. Fix C-1 (CSRF), C-2 (FraudRegistry auth), C-3 (middleware) — these are blocking
2. Resolve the `logicalFrom`/`feeFrom` resolution issue (M-3) — your known mainnet blocker
3. Wire up a real deployment verification script that checks the entire contract graph
4. Run the Hardhat test suite with full coverage reporting
5. Get Slither/Mythril static analysis runs with zero high findings
6. Professional audit by a firm specializing in ERC-20 + vault architectures

---

*This report covers a point-in-time review. Smart contract and web application security requires ongoing monitoring, professional auditing, and continuous testing.*
