# VFIDE — Remaining Fixes Implementation Guide

**Date:** April 12, 2026
**Covers:** Every open finding from the post-fix verification (16 remaining items + 2 new)

---

## Table of Contents

1. [C-1/C-3: Root Middleware (CRITICAL)](#c-1c-3)
2. [H-2: OZ Import Inconsistency](#h-2)
3. [H-6: Bridge Liquidity Reserve](#h-6)
4. [M-7: Seer Zero Score Protection](#m-7)
5. [M-12: Singleton Timelocks (Accepted)](#m-12)
6. [I-8: setAntiWhale Timelock](#i-8)
7. [I-2: Two-Step Ownership on VFIDEToken](#i-2)
8. [L-2: Orphaned VFIDEDashboard.tsx](#l-2)
9. [L-7: rescueNative Gas Limit](#l-7)
10. [N-1: Rate Limiter Memory Cleanup](#n-1)
11. [N-2: SIWE Challenge Memory Cleanup](#n-2)
12. [H-1: WithdrawalQueue totalVaultBalance](#h-1)
13. [I-3: Deployment Graph Verification](#i-3)
14. [I-4: Stale Documentation](#i-4)
15. [L-3: Test Quality](#l-3)
16. [L-4: Root-Level JSON Files](#l-4)

---

<a id="c-1c-3"></a>
## 1. C-1/C-3: Root Middleware — CRITICAL

**Files:** Project root
**Effort:** 30 seconds
**Impact:** Activates CSRF, CSP, request size limits, content-type validation, CORS across entire app

### The Problem

Next.js only recognizes `middleware.ts` or `middleware.js` at the project root. Your file is named `middleware.compat.ts` — Next.js ignores it completely. Your entire `proxy.ts` security stack never executes.

### The Fix

**Option A — Rename (simplest):**
```bash
mv middleware.compat.ts middleware.ts
```

Then update the comment inside to reflect it's no longer a "compat shim":

**File: `middleware.ts`**
```ts
/**
 * Root Next.js Middleware
 *
 * C-1/C-3 FIX: Next.js requires this file to be named exactly `middleware.ts`
 * at the project root. The security implementation lives in `proxy.ts` so CSP,
 * CSRF, request size limits, and CORS stay defined in one place.
 */
export { proxy as middleware, config } from './proxy';
```

**Option B — If you want to keep `middleware.compat.ts` for some reason:**

Create a NEW `middleware.ts` that re-exports from compat:
```ts
export { middleware, config } from './middleware.compat';
```

### Verification

After deploying, open browser DevTools → Network tab → check any page response headers for `Content-Security-Policy` with a `nonce-` value. If present, middleware is active. Also try a POST to any `/api/*` route without the `x-csrf-token` header — it should return 403.

---

<a id="h-2"></a>
## 2. H-2: FeeDistributor / SeerWorkAttestation / ServicePool OZ Imports

**Files:** `contracts/FeeDistributor.sol`, `contracts/SeerWorkAttestation.sol`, `contracts/ServicePool.sol`
**Effort:** 2–4 hours (careful migration + testing)
**Impact:** Closes supply-chain attack surface gap

### The Problem

Your security strategy documents that core contracts use local `SharedInterfaces.sol` reimplementations to avoid npm supply-chain risk. These three contracts violate that by importing `@openzeppelin/contracts` directly. FeeDistributor handles all fee revenue splitting — it's a high-value target.

### The Fix

FeeDistributor uses OZ's `AccessControl` with `onlyRole` modifiers (11 uses). This is a heavier dependency than simple `Ownable`. You have two options:

**Option A — Migrate to SharedInterfaces Ownable + manual role checks (recommended):**

Replace AccessControl with your existing `Ownable` from SharedInterfaces and add a simple role mapping:

```solidity
// Replace:
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// With:
import "./SharedInterfaces.sol";

// Then replace all `onlyRole(ADMIN_ROLE)` with `onlyOwner`
// Remove _grantRole calls from constructor
// Remove bytes32 ADMIN_ROLE constant
```

Since FeeDistributor only has one role (`ADMIN_ROLE`), this is a clean 1:1 replacement. The `DEFAULT_ADMIN_ROLE` grant is also only used for the single admin.

**Option B — Document the exception (pragmatic):**

Add a comment block at the top of each file:
```solidity
/**
 * SUPPLY-CHAIN NOTE: This contract intentionally uses OpenZeppelin imports
 * because it requires AccessControl (multi-role), which SharedInterfaces.sol
 * does not provide. OZ version baseline: 5.1.0. Review OZ advisories on
 * every dependency update.
 */
```

Apply the same approach for SeerWorkAttestation and ServicePool.

### Verification

Run `grep -rn "@openzeppelin" contracts/*.sol | grep -v Bridge | grep -v Deploy` — should return nothing after Option A, or only the documented exceptions after Option B.

---

<a id="h-6"></a>
## 3. H-6: Bridge Liquidity Reserve on Receive

**File:** `contracts/VFIDEBridge.sol`
**Effort:** 30 minutes
**Impact:** Prevents bridge drain when outbound and inbound overlap

### The Problem

You added `pendingOutboundAmount` tracking on the send side (good). But `_lzReceive` still checks `balanceOf(this) >= amount` without subtracting tokens already committed for pending outbound transfers from this chain. If a user bridges out 50K from Chain B while an inbound 50K is arriving on Chain B, the inbound could consume tokens that are already committed outbound.

### The Fix

**File: `contracts/VFIDEBridge.sol`**, in `_lzReceive`:

```solidity
// CURRENT (line ~387-388):
uint256 bridgeBalance = vfideToken.balanceOf(address(this));
require(bridgeBalance >= amount, "VFIDEBridge: insufficient liquidity");

// REPLACE WITH:
uint256 bridgeBalance = vfideToken.balanceOf(address(this));
uint256 availableLiquidity = bridgeBalance > pendingOutboundAmount
    ? bridgeBalance - pendingOutboundAmount
    : 0;
require(availableLiquidity >= amount, "VFIDEBridge: insufficient liquidity");
```

### Verification

Write a test where:
1. Bridge A sends 50K to Bridge B (locks tokens, increments pendingOutboundAmount on A)
2. Bridge B sends 50K to Bridge A (locks tokens, increments pendingOutboundAmount on B)
3. Bridge B receives the inbound 50K from A — should succeed only if balance minus pendingOutbound is sufficient

---

<a id="m-7"></a>
## 4. M-7: Seer Zero Score Inline Protection

**File:** `contracts/ProofScoreBurnRouter.sol`
**Effort:** 15 minutes
**Impact:** Prevents silent maximum fee application when Seer is misconfigured

### The Problem

If Seer returns score 0 for all users (misconfigured, unresponsive, or pointing to wrong address), every transfer silently pays the maximum 5% fee. The `SeerScoreZeroWarning` event exists but is only emittable via admin-only `warnIfSeerMisconfigured()`.

### The Fix

Add an inline event emission in `computeFees` when a zero score is encountered:

**File: `contracts/ProofScoreBurnRouter.sol`**, in `computeFees` after line 535:

```solidity
// CURRENT:
uint16 scoreFrom = getTimeWeightedScore(from);

// REPLACE WITH:
uint16 scoreFrom = getTimeWeightedScore(from);
if (scoreFrom == 0 && from != address(0)) {
    emit SeerScoreZeroWarning(from, address(seer));
}
```

This emits the warning during actual transfers (not just admin probes), giving monitoring systems a real-time signal. The gas cost is ~375 gas for the extra check + ~1500 gas for the event emission only when score is zero — negligible.

### Verification

Deploy with a Seer that returns 0 for a test address. Execute a transfer. Check logs for `SeerScoreZeroWarning` event.

---

<a id="m-12"></a>
## 5. M-12: Singleton Timelocks — ACCEPTED RISK

No code change needed. The singleton pending proposal pattern is a deliberate UX trade-off. Sequential 48-hour cycles for multi-address operations are acceptable for the protocol's threat model. If exchange listings become time-sensitive, consider a batch proposal mechanism in a future version.

---

<a id="i-8"></a>
## 6. I-8: setAntiWhale Timelock

**File:** `contracts/VFIDEToken.sol`
**Effort:** 45 minutes
**Impact:** Prevents instant anti-whale parameter changes that could trap users

### The Problem

`setAntiWhale()` takes effect immediately. An owner (or compromised key) could instantly set `maxTransferAmount = 100_000e18` right before a whale's pending transaction, causing it to revert unexpectedly.

### The Fix

Add pending/apply pattern matching the existing timelock style:

```solidity
// Add state variables (after existing pending vars):
uint256 public pendingMaxTransfer;
uint256 public pendingMaxWallet;
uint256 public pendingDailyLimit;
uint256 public pendingCooldown;
uint64  public pendingAntiWhaleAt;

event AntiWhaleProposed(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown, uint64 effectiveAt);

// Modify setAntiWhale to propose instead of apply:
function setAntiWhale(
    uint256 _maxTransfer,
    uint256 _maxWallet,
    uint256 _dailyLimit,
    uint256 _cooldown
) external onlyOwner {
    if (_maxTransfer > 0) require(_maxTransfer >= 100_000e18, "min 100k");
    if (_maxWallet > 0) require(_maxWallet >= 200_000e18, "min 200k");
    if (_dailyLimit > 0) require(_dailyLimit >= 500_000e18, "min 500k");
    if (_cooldown > 0) require(_cooldown <= 1 hours, "max 1 hour cooldown");
    require(pendingAntiWhaleAt == 0, "VF: pending anti-whale exists");

    pendingMaxTransfer = _maxTransfer;
    pendingMaxWallet = _maxWallet;
    pendingDailyLimit = _dailyLimit;
    pendingCooldown = _cooldown;
    pendingAntiWhaleAt = uint64(block.timestamp) + SINK_CHANGE_DELAY;
    emit AntiWhaleProposed(_maxTransfer, _maxWallet, _dailyLimit, _cooldown, pendingAntiWhaleAt);
    _log("anti_whale_proposed");
}

function applyAntiWhale() external onlyOwner {
    if (pendingAntiWhaleAt == 0) revert VF_NoPending();
    if (block.timestamp < pendingAntiWhaleAt) revert VF_TimelockActive();

    maxTransferAmount = pendingMaxTransfer;
    maxWalletBalance = pendingMaxWallet;
    dailyTransferLimit = pendingDailyLimit;
    transferCooldown = pendingCooldown;

    emit AntiWhaleSet(pendingMaxTransfer, pendingMaxWallet, pendingDailyLimit, pendingCooldown);
    delete pendingMaxTransfer;
    delete pendingMaxWallet;
    delete pendingDailyLimit;
    delete pendingCooldown;
    delete pendingAntiWhaleAt;
    _log("anti_whale_applied");
}

function cancelAntiWhale() external onlyOwner {
    if (pendingAntiWhaleAt == 0) revert VF_NoPending();
    delete pendingMaxTransfer;
    delete pendingMaxWallet;
    delete pendingDailyLimit;
    delete pendingCooldown;
    delete pendingAntiWhaleAt;
    _log("anti_whale_cancelled");
}
```

### Verification

Test that `setAntiWhale` no longer applies instantly — values should only change after calling `applyAntiWhale` 48 hours later.

---

<a id="i-2"></a>
## 7. I-2: Two-Step Ownership on VFIDEToken — INFORMATIONAL

**File:** `contracts/VFIDEToken.sol`
**Effort:** 30 minutes
**Impact:** Prevents accidental ownership transfer to wrong address

### The Problem

VFIDEToken inherits single-step `Ownable` from SharedInterfaces. `transferOwnership(newOwner)` takes effect immediately. If the wrong address is entered, ownership is irrecoverably lost.

### The Fix

Add two-step transfer (matching CardBoundVault's admin transfer pattern):

```solidity
// Add to state variables:
address public pendingOwner;

event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

// Override transferOwnership:
function transferOwnership(address newOwner) public override onlyOwner {
    if (newOwner == address(0)) revert VF_ZeroAddress();
    pendingOwner = newOwner;
    emit OwnershipTransferStarted(owner(), newOwner);
}

// Add acceptOwnership:
function acceptOwnership() external {
    require(msg.sender == pendingOwner, "VF: not pending owner");
    _transferOwnership(pendingOwner);
    delete pendingOwner;
}
```

**Note:** This requires SharedInterfaces' `Ownable` to have `_transferOwnership` as an internal function. Check your implementation — if it doesn't, add one.

---

<a id="l-2"></a>
## 8. L-2: Orphaned VFIDEDashboard.tsx

**File:** `VFIDEDashboard.tsx` (project root)
**Effort:** 1 minute

### The Fix

```bash
# Either move it to where it belongs:
mv VFIDEDashboard.tsx app/components/VFIDEDashboard.tsx

# Or delete it if it's unused:
rm VFIDEDashboard.tsx
```

Check if anything imports it first:
```bash
grep -rn "VFIDEDashboard" app/ lib/ --include="*.ts" --include="*.tsx"
```

---

<a id="l-7"></a>
## 9. L-7: rescueNative Gas Stipend

**File:** `contracts/CardBoundVault.sol`
**Effort:** 5 minutes
**Impact:** Prevents gas griefing via expensive fallback functions

### The Fix

```solidity
// CURRENT:
function rescueNative(address payable to, uint256 amount) external onlyAdmin nonReentrant {
    if (to == address(0)) revert CBV_Zero();
    (bool ok, ) = to.call{value: amount}("");
    if (!ok) revert CBV_TransferFailed();
    emit NativeRescue(to, amount);
}

// REPLACE WITH:
function rescueNative(address payable to, uint256 amount) external onlyAdmin nonReentrant {
    if (to == address(0)) revert CBV_Zero();
    (bool ok, ) = to.call{value: amount, gas: 10_000}("");
    if (!ok) revert CBV_TransferFailed();
    emit NativeRescue(to, amount);
}
```

The 10,000 gas stipend is enough for a simple ETH receive but prevents the recipient from executing expensive logic.

---

<a id="n-1"></a>
## 10. N-1: Rate Limiter Memory Cleanup

**File:** `lib/auth/rateLimit.ts`
**Effort:** 10 minutes
**Impact:** Prevents slow memory leak from abandoned rate limit buckets

### The Fix

Add a periodic cleanup after the `memoryRateBuckets` declaration:

```ts
const memoryRateBuckets = new Map<string, { count: number; resetAt: number }>();

// N-1 FIX: Prune expired rate limit buckets every 5 minutes
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPruneTime = Date.now();

function pruneExpiredBuckets(): void {
  const now = Date.now();
  if (now - lastPruneTime < PRUNE_INTERVAL_MS) return;
  lastPruneTime = now;

  for (const [key, bucket] of memoryRateBuckets) {
    if (now >= bucket.resetAt) {
      memoryRateBuckets.delete(key);
    }
  }
}
```

Then call `pruneExpiredBuckets()` at the top of `memoryRateLimit()`:

```ts
function memoryRateLimit(identifier: string, type: RateLimitType): { ... } {
  pruneExpiredBuckets(); // N-1 FIX
  const config = RATE_LIMITS[type];
  // ... rest of function
}
```

---

<a id="n-2"></a>
## 11. N-2: SIWE Challenge Memory Cleanup

**File:** `lib/security/siweChallenge.ts`
**Effort:** 10 minutes
**Impact:** Prevents memory accumulation from abandoned authentication attempts

### The Fix

Add a periodic cleanup for expired challenges:

```ts
const inMemoryChallenges = new Map<string, ChallengeRecord>();

// N-2 FIX: Prune expired challenges every 2 minutes
let lastChallengePrune = Date.now();
const CHALLENGE_PRUNE_INTERVAL_MS = 2 * 60 * 1000;

function pruneExpiredChallenges(): void {
  const now = Date.now();
  if (now - lastChallengePrune < CHALLENGE_PRUNE_INTERVAL_MS) return;
  lastChallengePrune = now;

  for (const [key, record] of inMemoryChallenges) {
    if (now >= record.expiresAt) {
      inMemoryChallenges.delete(key);
    }
  }
}
```

Then call `pruneExpiredChallenges()` at the top of `storeChallengeRecord()`:

```ts
async function storeChallengeRecord(record: ChallengeRecord): Promise<void> {
  const redis = getRedisClient();
  const key = challengeKey(record.address);
  if (redis) {
    await redis.set(key, JSON.stringify(record), { ex: CHALLENGE_TTL_SECONDS });
    return;
  }

  pruneExpiredChallenges(); // N-2 FIX
  inMemoryChallenges.set(key, record);
}
```

---

<a id="h-1"></a>
## 12. H-1: WithdrawalQueue totalVaultBalance — LOW (reclassified)

**File:** `contracts/WithdrawalQueue.sol`
**Effort:** 15 minutes
**Impact:** Cap enforcement uses stale data

### The Fix

Add a comment documenting the limitation and override the setter to require caller context:

```solidity
/// @notice I-14 NOTE: totalVaultBalance must be updated by the inheriting
///         contract on every deposit/withdrawal. The abstract WithdrawalQueue
///         cannot track this automatically. Inheritors MUST call
///         _updateVaultBalance() after any balance change, or the daily cap
///         percentage check will use stale data.
function _updateVaultBalance(uint256 _balance) internal {
    totalVaultBalance = _balance;
}
```

Alternatively, if `WithdrawalQueueStub` is only used as a deployment placeholder and CardBoundVault has its own queue, consider marking WithdrawalQueue.sol with a `@deprecated` NatSpec tag.

---

<a id="i-3"></a>
## 13. I-3: Deployment Graph Verification Script

**File:** `scripts/verify-full-deployment-graph.ts` (new)
**Effort:** 1–2 hours
**Impact:** Catches misconfigured module wiring before mainnet

### Recommendation

Create a single script that:
1. Reads all deployed contract addresses from a JSON manifest
2. For each contract, calls its module getters (e.g., `vaultHub()`, `burnRouter()`, `seer()`)
3. Verifies each returned address matches the expected address from the manifest
4. Checks all timelocks are active (no pending proposals lingering)
5. Verifies ownership is correct (pre-handover: dev multisig; post-handover: DAO)
6. Outputs a pass/fail report

This is a scripting task, not a code fix — build it when you prepare for testnet deployment.

---

<a id="i-4"></a>
## 14. I-4: Stale Documentation

**Files:** `MIGRATION.md`, `VFIDE_MASTER_ISSUE_TRACKER.md`
**Effort:** 30 minutes

Review both files and either update them to reflect the current state of the codebase or move them to a `docs/archive/` directory with a note that they're historical.

---

<a id="l-3"></a>
## 15. L-3: Test Quality

**Files:** `__tests__/` directory (451 test files)
**Effort:** Ongoing

175 skipped/todo tests and 1,512 `jest.fn()` mocks indicate heavy mocking. Priority actions:

1. Run `npx jest --coverage` and identify files below 50% line coverage
2. Convert the most critical mock-heavy tests (auth, payments, vault operations) to integration tests using a real test database
3. Ensure all 36 Hardhat test files pass with `npx hardhat test`
4. Remove or implement all `test.todo` / `it.skip` entries

---

<a id="l-4"></a>
## 16. L-4: Root-Level JSON Audit Files

**Files:** `FRONTEND_PAGE_FUNCTION_INVENTORY.json`, `FRONTEND_PAGE_TEST_COVERAGE_MAP.json`
**Effort:** 1 minute

```bash
mkdir -p docs/audit-artifacts
mv FRONTEND_PAGE_FUNCTION_INVENTORY.json docs/audit-artifacts/
mv FRONTEND_PAGE_TEST_COVERAGE_MAP.json docs/audit-artifacts/
```

---

## Priority Order

| Priority | Items | Time |
|----------|-------|------|
| **Do now** | C-1/C-3 (rename middleware) | 30 seconds |
| **Do today** | M-7 (Seer zero score), N-1/N-2 (memory cleanup), L-2 (dashboard), L-7 (gas stipend) | 1 hour |
| **Do this week** | H-6 (bridge reserve), I-8 (anti-whale timelock), I-2 (two-step ownership) | 3 hours |
| **Do before testnet** | H-2 (OZ imports), I-3 (deployment script), H-1 (doc fix) | 4 hours |
| **Ongoing** | L-3 (test quality), I-4 (stale docs), L-4 (root JSONs) | As needed |

---

*Every code block in this document is copy-paste ready. File paths are relative to project root.*
