# VFIDE Audit — Findings & Fixes

**Audit basis:** repo upload `Vfide-main__5_.zip`, 4 review passes covering ~100 contracts, 123 API routes, the WebSocket server, the wallet adapter, the address registry, and the ABI surface.

**Status:** This document lists every finding from those passes with a concrete, implementable fix. Findings are grouped by subsystem and ordered roughly by deployment-blocking impact within each section.

## Severity legend

- **Blocker** — production deployment is unsafe or non-functional until fixed.
- **Critical** — exploitable, causes financial/data loss, or makes a major feature wrong.
- **High** — exploitable under specific conditions, or breaks correctness for a subset of users.
- **Medium** — observability gap, gas waste, or UX hazard with no direct exploit.
- **Low** — code hygiene, dead code, documentation hazard.

## Quick index

| ID | Severity | Title |
|---|---|---|
| INFRA-01 | Blocker | `proxy.ts` is dead code — Next.js never invokes it |
| INFRA-02 | Blocker | CSP allows `'unsafe-inline' 'unsafe-eval'` site-wide |
| INFRA-03 | Blocker | `CONTRACT_ADDRESSES` has no chain-ID dimension |
| TOKEN-01 | Critical | `MerchantPortal._estimateNetworkFee` doesn't resolve vault→owner |
| TOKEN-02 | Medium | `_resolveFeeScoringAddress` called 3× per `_transfer` |
| TOKEN-03 | Critical | `OwnerControlPanel.emergency_pauseAll` no longer pauses anything |
| FRAUD-01 | Critical | `clearFlag` doesn't clear `hasComplained` mapping |
| FRAUD-02 | Critical | `_processDismissedComplaintPenalties` advances cursor on silent failure |
| FRAUD-03 | Critical | `releaseEscrow` redirects to mutable vault owner — DAO-swap drain risk |
| VAULT-01 | Medium | `executeQueuedWithdrawal` doesn't snapshot recipient validity |
| BRIDGE-01 | High | `openBridgeRefundWindow` race with destination delivery confirmation |
| BRIDGE-02 | High | `finalizeStaleBridgeRefund` doesn't gate on `_bridgeIsSystemExempt` |
| FAUCET-01 | Medium | Operator private key in env — no HSM/KMS, no boot-time guard |
| FAUCET-02 | Medium | `claim` route blocks on `waitForTransactionReceipt` → Vercel timeout |
| FAUCET-03 | High | `batchClaim` reverts entire batch on a single ETH-transfer failure |
| FAUCET-04 | Low | Referrer self-claim check doesn't cover trivial sybil chains |
| DB-01 | Blocker | `users` table has no `INSERT` policy — RLS denies all signups OR role bypasses RLS |
| DB-02 | High | `users_read_public USING (true)` nullifies row-level read protection |
| DB-03 | Blocker | `user_portfolios` table queried by API but exists in NO migration |
| DB-04 | High | 119 of 123 routes don't use `withAuth` — RLS context relies on fragile fallback |
| API-01 | High | `/api/analytics/portfolio/[address]` exposes any user's portfolio with no auth |
| API-02 | Medium | `/api/activities/[address]` does internal `fetch` to itself |
| API-03 | Medium | `merchant/locations` POST does manual body parsing without bounds |
| ABI-01 | Critical | 22 stale ABI files in `lib/abis/` with no matching contract |
| ABI-02 | Critical | `lib/abis/index.ts` imports and validates orphan ABIs |
| ABI-03 | Critical | `BurnRouter` and `ProofScoreBurnRouter` aliased to same env var, different ABIs |
| ABI-04 | Blocker | `usePayment.ts` calls deleted `routeFor` selector → wrong fee preview |
| ABI-05 | Blocker | `useEscrow.ts` writes to non-existent `CommerceEscrow` contract |
| ABI-06 | Medium | Stale ABIs imported into runtime hooks behind dead `!cardBoundMode` branches |
| ABI-07 | Low | `contracts/future/` contracts have address slots in env var map |
| WALLET-01 | High | `VFIDEWalletProvider` returns random addresses for embedded auth |
| WALLET-02 | High | `AccountButton` requires unmounted `VFIDEWalletProvider` |
| WS-01 | High | Rate limiter race: INCR before EXPIRE → keys can stick without TTL |
| WS-02 | Medium | Topic ACL fail-open mode in non-production |
| WS-03 | Medium | Chat topic granularity depends on ACL configuration only |
| AUTH-01 | Low | EIP-1271 trust assumption documented but not build-enforced |
| AUTH-02 | Medium | `verifyToken` re-throws on revocation-store failure |
| DEAD-01 | Low | Social commerce components exist but unrendered |

---

## INFRA-01 — `proxy.ts` is dead code

**Severity:** Blocker
**Location:** `proxy.ts` (root)

### What's wrong

Next.js requires a root-level `middleware.ts` (or `src/middleware.ts`) that exports a function named `middleware` (or a default export) to register global middleware. The repository has `proxy.ts` exporting a function named `proxy`. Next.js never invokes it.

### Impact

Every protection implemented in `proxy.ts` is silently disabled in production:

- Nonce-based CSP injection
- CORS handling for `/api/*`
- `Content-Length` enforcement (chunked-body bypass open)
- Request body size caps
- `Content-Type` validation
- CSRF double-submit cookie validation

### Fix

```bash
git mv proxy.ts middleware.ts
```

Then in the renamed file:

```diff
-export function proxy(request: NextRequest) {
+export function middleware(request: NextRequest) {
```

The existing `export const config = { matcher: [...] }` is already in the right shape and stays as-is.

**Verification:** after deploy, send a `POST /api/...` with no `Content-Length` header and confirm a `411 Length Required` response. Send a state-changing request without an `x-csrf-token` and confirm a 403.

---

## INFRA-02 — CSP allows `'unsafe-inline'` and `'unsafe-eval'` site-wide

**Severity:** Blocker
**Location:** `next.config.ts:73-95`

### What's wrong

The static `Content-Security-Policy` header in `next.config.ts` includes:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live ...
style-src 'self' 'unsafe-inline' ...
```

The comment at line 71-72 explains: the nonce-based CSP was abandoned because the nonce was never injected into `app/layout.tsx`, which broke Next.js bundle loading. The fix was to allow `'unsafe-inline'` and `'unsafe-eval'`. With INFRA-01 also unfixed, the `proxy.ts` nonce-injection path is dead anyway.

### Impact

Any reflected XSS becomes a same-origin script execution. `'unsafe-eval'` additionally permits `eval()`, `Function()` constructor, and `setTimeout(string, ...)` — substantially expanding attack surface.

### Fix

Two-step fix; both must land together.

**Step 1 — wire the nonce into `app/layout.tsx`:**

```typescript
// app/layout.tsx
import { headers } from 'next/headers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="en">
      <body>
        {/* Pass nonce to Script tags */}
        <Script nonce={nonce} src="..." strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
```

For Next.js 14+/15, the framework auto-applies the nonce header value to its own bundles when present in the request headers via middleware. Confirm by reading the `<script>` tags in your initial HTML — they should have `nonce="..."` attributes matching the response header.

**Step 2 — replace the static CSP in `next.config.ts` with a strict-but-stub baseline, and let `middleware.ts` apply the nonce-bearing CSP per request:**

```diff
-{
-  key: 'Content-Security-Policy',
-  value: [
-    "default-src 'self'",
-    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live ...",
-    ...
-  ].join('; '),
-},
+// CSP is set per-request by middleware.ts (with nonce). No static fallback.
```

If you cannot remove the static header (e.g., for non-Next-served paths), set it to a minimum-viable strict policy that the per-request middleware can override:

```typescript
"default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
```

**Verification:** open the page, view source, confirm every `<script>` has a `nonce` attribute. Drop `'unsafe-inline'` from `next.config.ts` and confirm pages still render. Use the browser console to attempt `eval('1+1')` from a non-nonce'd context — it should be blocked.

---

## INFRA-03 — `CONTRACT_ADDRESSES` has no chain-ID dimension

**Severity:** Blocker
**Location:** `lib/contracts.ts:80-215`, `lib/wagmi.ts:188-240`

### What's wrong

`lib/contracts.ts` builds `CONTRACT_ADDRESSES` from a flat set of env vars (e.g., `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`). `lib/wagmi.ts` configures wagmi for **six chains**: Base, Polygon, zkSync (mainnet) and Base Sepolia, Polygon Amoy, zkSync Sepolia (testnet). When the user switches chains in their wallet, every `useReadContract`/`useWriteContract` call still resolves to the same single address.

### Impact

If the same nominal contract is deployed at different addresses on different chains (the usual case unless you use deterministic CREATE2 with the same salt + bytecode on every chain):

- A user on Polygon connects, the frontend reads the Base-deployed address, and queries Polygon's RPC at that address.
- If no contract exists at that address on Polygon → reads return empty, writes fail simulation.
- If a *different* contract exists at that address on Polygon → calls go to it, with unpredictable behavior (wrong selectors, wrong storage slots).

### Fix

Convert `CONTRACT_ADDRESSES` to a chain-keyed structure:

```typescript
// lib/contracts.ts
import { useChainId } from 'wagmi';

type ContractName =
  | 'VFIDEToken' | 'VaultHub' | 'Seer' | 'ProofScoreBurnRouter'
  | 'MerchantPortal' | 'FraudRegistry' | 'EcosystemVault'
  | 'VaultRecoveryClaim' | 'FeeDistributor' /* ... */;

type ChainAddresses = Record<ContractName, `0x${string}`>;

const CHAIN_ADDRESS_REGISTRY: Record<number, ChainAddresses> = {
  // Base mainnet
  8453: {
    VFIDEToken: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_8453, 'VFIDEToken'),
    VaultHub:   validateContractAddress(process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS_8453,   'VaultHub'),
    // ...
  },
  // Polygon mainnet
  137: {
    VFIDEToken: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_137, 'VFIDEToken'),
    // ...
  },
  // zkSync Era
  324: { /* ... */ },
  // Base Sepolia
  84532: { /* ... */ },
  // Polygon Amoy
  80002: { /* ... */ },
  // zkSync Sepolia
  300: { /* ... */ },
};

export function getContractAddresses(chainId: number): ChainAddresses {
  const entry = CHAIN_ADDRESS_REGISTRY[chainId];
  if (!entry) {
    throw new Error(`No contract addresses configured for chain ${chainId}`);
  }
  return entry;
}

// React hook for components
export function useContractAddresses(): ChainAddresses {
  const chainId = useChainId();
  return getContractAddresses(chainId);
}
```

Migrate every `CONTRACT_ADDRESSES.X` reference:

```diff
-import { CONTRACT_ADDRESSES } from '@/lib/contracts';
+import { useContractAddresses } from '@/lib/contracts';

 function MyComponent() {
+  const addresses = useContractAddresses();
   const { data } = useReadContract({
-    address: CONTRACT_ADDRESSES.VFIDEToken,
+    address: addresses.VFIDEToken,
     // ...
   });
 }
```

For server-side (API routes), accept a `chainId` parameter and call `getContractAddresses(chainId)` directly.

**Migration plan:**
1. Add `CHAIN_ADDRESS_REGISTRY` alongside the existing `CONTRACT_ADDRESSES`.
2. Add `getContractAddresses(chainId)` and `useContractAddresses()`.
3. Add a deprecation warning to `CONTRACT_ADDRESSES` getter access (Proxy with getter trap).
4. Codemod every consumer to use the new API.
5. Delete `CONTRACT_ADDRESSES`.

**Verification:** add a Cypress/Playwright test that switches chains mid-session and asserts that contract reads succeed on each chain.

---

## TOKEN-01 — `MerchantPortal._estimateNetworkFee` doesn't resolve vault→owner

**Severity:** Critical
**Location:** `contracts/MerchantPortal.sol:1210-1235`

### What's wrong

The function calls `IProofScoreBurnRouterToken(router).computeFees(customer, merchant, amount)` with the raw `customer` address. If `customer` is a vault contract (e.g., `CardBoundVault`), the router calls `getTimeWeightedScore(vault)` which returns NEUTRAL (5000) because:
- DAO score for the vault address is unset.
- `calculateAutomatedScore(vault)` → `vaultHub.vaultOf(vault)` returns 0 (a vault doesn't own a vault), badge bonuses are 0, endorsement bonuses are 0.

Result: the estimate uses a default-trust score, ignoring the underlying user's real ProofScore (badges, endorsements, DAO trust).

### Impact

- High-trust users see fees inflated to the NEUTRAL-tier rate in their merchant payment quotes.
- Low-trust users see fees deflated to the NEUTRAL-tier rate.
- Because `MerchantPortal` itself doesn't move tokens (it just quotes), no funds are lost — but the displayed estimate diverges from the actual fee charged when the transfer executes (which uses the corrected `_resolveFeeScoringAddress` path in `VFIDEToken._transfer`).

### Fix

Resolve the customer address through `VaultHub` before calling `computeFees`. Add a small helper to MerchantPortal or use the existing `vaultHub` reference:

```solidity
// contracts/MerchantPortal.sol — replace _estimateNetworkFee body

function _estimateNetworkFee(
    address customer,
    address merchant,
    address token,
    uint256 amount
) internal view returns (uint256) {
    if (!acceptedTokens[token]) return 0;

    address router = address(0);
    try IVFIDETokenBurnRouterView(token).burnRouter() returns (address r) {
        router = r;
    } catch {
        return 0;
    }
    if (router == address(0)) return 0;

    // FIX: Resolve vault → owner so the router scores the underlying user.
    address feeFrom = _resolveCustomerScoringAddress(customer);

    try IProofScoreBurnRouterToken(router).computeFees(feeFrom, merchant, amount) returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        address, address, address
    ) {
        return burnAmount + sanctumAmount + ecosystemAmount;
    } catch {
        return 0;
    }
}

function _resolveCustomerScoringAddress(address customer) internal view returns (address) {
    if (address(vaultHub) == address(0)) return customer;
    try vaultHub.isVault(customer) returns (bool isV) {
        if (!isV) return customer;
        try vaultHub.ownerOfVault(customer) returns (address owner) {
            return owner == address(0) ? customer : owner;
        } catch { return customer; }
    } catch { return customer; }
}
```

**Verification:** Foundry/Hardhat test — create vault V owned by user U with badges granting +500 ProofScore, call `_estimateNetworkFee(V, merchant, ...)` and assert the returned fee equals the fee that `VFIDEToken._transfer(V, merchant, amount)` actually charges.

---

## TOKEN-02 — `_resolveFeeScoringAddress` called 3× per `_transfer`

**Severity:** Medium
**Location:** `contracts/VFIDEToken.sol:943, 962, 1018`

### What's wrong

`_resolveFeeScoringAddress(from)` is called three times inside `_transfer`, each time doing two external calls (`_isVault(from)` and `vaultHub.ownerOfVault(from)`). Same input, same output — pure waste.

### Impact

Approximately 4 redundant external calls per transfer. At ~2,500 gas each, that's ~10,000 gas/transfer × millions of transfers = significant cumulative cost.

### Fix

Cache once at the top of `_transfer`:

```diff
 function _transfer(address from, address to, uint256 amount) internal {
     _syncEmergencyFlags();
     if (from == address(0) || to == address(0)) revert VF_ZERO();
     if (amount == 0) revert VF_ZERO();
+
+    // Resolve once and reuse throughout.
+    address scoringFrom = _resolveFeeScoringAddress(from);

     if (address(emergencyBreaker) != address(0) && emergencyBreaker.halted()) {
         if (!(systemExempt[from] || systemExempt[to])) revert VF_EmergencyHalted();
     }

     address logicalTo = to;
     address custodyTo = to;

-    _enforceSeerAction(_resolveFeeScoringAddress(from), 0, amount, _resolveFeeScoringAddress(logicalTo));
+    _enforceSeerAction(scoringFrom, 0, amount, _resolveFeeScoringAddress(logicalTo));
     // (logicalTo resolution is still needed but only once below)

     // ... vault auto-creation block unchanged ...

-    address fraudCheckAddr = _resolveFeeScoringAddress(from);
+    address fraudCheckAddr = scoringFrom;
     bool escrowTransferRequired = ...;

     // ... whale/vault checks unchanged ...

     if (
         !escrowTransferRequired &&
         address(burnRouter) != address(0) &&
         !isFeeBypassed() &&
         !(systemExempt[from] || systemExempt[logicalTo])
     ) {
-        address feeFrom = _resolveFeeScoringAddress(from);
-        try burnRouter.computeFeesAndReserve(feeFrom, logicalTo, amount) returns (
+        try burnRouter.computeFeesAndReserve(scoringFrom, logicalTo, amount) returns (
             // ...
         )
     }
 }
```

`logicalTo` could similarly be resolved once at line 943 and stored, but `logicalTo` doesn't change within the function (only `custodyTo` does), so a single resolve at the seer-action site is sufficient if you also pass it through the rest of the function — minor additional cleanup.

**Verification:** gas snapshot before/after. Expect ~8-10K gas savings per non-exempt transfer.

---

## TOKEN-03 — `OwnerControlPanel.emergency_pauseAll` doesn't actually pause anything

**Severity:** Critical
**Location:** `contracts/OwnerControlPanel.sol:1209-1217`

### What's wrong

After the H-01 and H-6 fixes in `VFIDEToken`, both `setCircuitBreaker(true, ...)` and `setFeeBypass(true, ...)` only **propose** activation behind a 48-hour timelock. They don't activate anything by themselves — `confirmCircuitBreaker()` and `confirmFeeBypass()` must be called 48 hours later.

`emergency_pauseAll` calls the proposers but never the confirmers. The function doesn't pause anything for 48 hours.

The comment at line 1206 still claims: *"Security and fee bypasses are instant; circuit breaker activation is queued (48h timelock)."* This is no longer accurate.

### Impact

During an active exploit, the owner cannot pause the protocol for 48 hours. The runbook for incident response is broken.

### Fix

This is partly a security tradeoff (fast pause = unilateral owner power), but the function as written misleads operators. Two options:

**Option A — make it a proper proposer with a follow-up confirm:**

```solidity
// contracts/OwnerControlPanel.sol

/// @notice Stage 1 of emergency pause: propose circuit breaker and fee bypass activation.
///         Both proposals enter VFIDEToken's 48-hour timelock.
/// @dev    Call confirmEmergencyPauseAll() after the timelock elapses to actually pause.
function emergency_proposePauseAll() external onlyOwner {
    _consumeQueuedAction(actionId_emergency_pauseAll());
    vfideToken.setFeeBypass(true, 1 days);       // Now proposes only
    vfideToken.setCircuitBreaker(true, 1 days);  // Now proposes only
    emit EmergencyAction("system_pause_proposed", address(this));
}

/// @notice Stage 2: apply the previously proposed pause after timelock has elapsed.
function emergency_confirmPauseAll() external onlyOwner {
    vfideToken.confirmFeeBypass();
    vfideToken.confirmCircuitBreaker();
    emit EmergencyAction("system_paused", address(this));
}
```

Update the runbook: "Stage 1 must be triggered ≥ 48 h before the expected need; Stage 2 applies the pause."

**Option B — restore a true emergency power on the token, gated by multisig:**

If you want sub-second response, add a `setEmergencyHalt(bool)` on `VFIDEToken` callable only by a 3-of-5 multisig (separate from the regular owner) with no timelock. This brings back unilateral pause but raises the threshold for who can invoke it.

```solidity
// contracts/VFIDEToken.sol
address public emergencyHaltMultisig;

function setEmergencyHalt(bool halt) external {
    require(msg.sender == emergencyHaltMultisig, "VF: not halt multisig");
    if (halt) {
        feeBypass = true;
        feeBypassExpiry = block.timestamp + 24 hours; // auto-expire
        circuitBreaker = true;
        circuitBreakerExpiry = block.timestamp + 24 hours;
    } else {
        feeBypass = false; feeBypassExpiry = 0;
        circuitBreaker = false; circuitBreakerExpiry = 0;
    }
    emit EmergencyHaltSet(halt);
}
```

Either way, **rename `emergency_pauseAll` so the misleading semantics are visible at the call site**, or fix the comment.

**Verification:** integration test that calls `emergency_pauseAll()` and immediately checks `vfideToken.isCircuitBreakerActive()` — must be `true` (option B) or there must exist a follow-up confirm step (option A).

---

## FRAUD-01 — `clearFlag` doesn't clear `hasComplained` mapping

**Severity:** Critical
**Location:** `contracts/FraudRegistry.sol:415-434`

### What's wrong

When the DAO clears a previously confirmed fraud flag, `clearFlag` resets `complaintCount`, deletes the `complaints` array, resets `dismissedComplaintPenaltyCursor`, etc. — but never touches `hasComplained[target][reporter]`. Reporters who filed complaints under the prior flag epoch are permanently locked out from filing new complaints against the same target.

### Impact

Permanent denial of due process for original reporters. If a target's flag is cleared (e.g., DAO determines original complaints were premature) and the target later resumes fraud, the original reporters cannot file fresh complaints. New reporters can, but the system loses the input from those who saw the first round of fraud.

### Fix

Use a per-target complaint epoch and key `hasComplained` on `(target, reporter, epoch)`. This avoids the unbounded `delete hasComplained[target][...]` loop.

```diff
 // contracts/FraudRegistry.sol

-    // target → reporter → has complained
-    mapping(address => mapping(address => bool)) public hasComplained;
+    // target → reporter → epoch they last complained in
+    mapping(address => mapping(address => uint64)) public lastComplaintEpoch;
+    // target → current complaint epoch (incremented on clearFlag)
+    mapping(address => uint64) public complaintEpoch;

     function fileComplaint(address target, string calldata reason) external nonReentrant {
         if (target == address(0)) revert FR_Zero();
         if (target == msg.sender) revert FR_SelfComplaint();
         if (address(vaultHub) != address(0) && vaultHub.isVault(target)) revert FR_InvalidTarget();
-        if (hasComplained[target][msg.sender]) revert FR_AlreadyComplained();
+        uint64 epoch = complaintEpoch[target];
+        if (lastComplaintEpoch[target][msg.sender] == epoch + 1) revert FR_AlreadyComplained();
         if (isPendingReview[target] || isFlagged[target] || isPermanentlyBanned[target]) revert FR_ReviewActive();

         uint16 reporterScore = seer.getScore(msg.sender);
         if (reporterScore < MIN_REPORTER_SCORE) revert FR_InsufficientScore();

-        hasComplained[target][msg.sender] = true;
+        lastComplaintEpoch[target][msg.sender] = epoch + 1;
         require(complaints[target].length < 100, "FR: complaint limit");
         complaints[target].push(Complaint({...}));
         complaintCount[target]++;
         // ...
     }

     function clearFlag(address target) external onlyDAO nonReentrant {
         if (!isFlagged[target]) revert FR_NotFlagged();
         isFlagged[target] = false;
         flaggedAt[target] = 0;
         isPendingReview[target] = false;
         pendingReviewAt[target] = 0;
         complaintCount[target] = 0;
         delete complaints[target];
         dismissedComplaintPenaltyCursor[target] = 0;
+        // Bump epoch — old hasComplained entries are now stale and can re-complain.
+        complaintEpoch[target] += 1;
         clearFlagEscrowCursor[target] = 0;
         clearFlagEscrowRefundPending[target] = true;
         emit FlagCleared(target, msg.sender);
     }
```

**Migration note:** if FraudRegistry is already deployed, this requires either an upgrade (if proxy-deployed) or a one-time migration contract that copies the old `hasComplained` state into the new schema with `epoch = 0`. If not yet deployed, do this before mainnet.

**Verification:** Test scenario — file complaint, DAO confirms, DAO clears, file complaint again → succeeds (currently reverts).

---

## FRAUD-02 — `_processDismissedComplaintPenalties` advances cursor on silent failure

**Severity:** Critical
**Location:** `contracts/FraudRegistry.sol:387-409`

### What's wrong

The penalty loop:

```solidity
for (uint256 i = cursor; i < stop; i++) {
    try seer.punish(filed[i].reporter, COMPLAINT_REPORTER_PENALTY, "false_complaint_dismissed") {} catch {}
    processed++;
}
```

The cursor is set to `stop` BEFORE the loop runs (line 401: `dismissedComplaintPenaltyCursor[target] = stop;`). The `try/catch` swallows reverts silently. If `seer.punish` reverts on every call (e.g., FraudRegistry isn't authorized as a Seer operator at deploy time), the cursor advances past every reporter without any penalty being applied. Once the seer wiring is fixed later, those reporters can never be penalized — the cursor is permanently past them.

### Impact

Every false-complaint reporter from the broken-seer-wiring window escapes the score penalty permanently. The reputation system silently loses an entire batch of penalty signals. Worse: if seer authorization is misconfigured, you have no signal that anything is wrong (no events, no reverts).

### Fix

Two complementary changes: don't advance cursor on failure, and emit per-failure events for off-chain observability.

```diff
+    event DismissedComplaintPenaltyFailed(address indexed target, address indexed reporter, bytes reason);
+
     function _processDismissedComplaintPenalties(address target, uint256 maxCount) internal returns (uint256 processed) {
         uint256 end = complaints[target].length;
         uint256 cursor = dismissedComplaintPenaltyCursor[target];
         if (cursor >= end) {
             return 0;
         }

         uint256 limit = maxCount == 0 ? 20 : maxCount;
         uint256 stop = cursor + limit;
         if (stop > end) {
             stop = end;
         }

         Complaint[] storage filed = complaints[target];
-        dismissedComplaintPenaltyCursor[target] = stop;
+        // Don't advance the cursor wholesale — advance only past successful penalties.
+        uint256 newCursor = cursor;

         for (uint256 i = cursor; i < stop; i++) {
-            try seer.punish(filed[i].reporter, COMPLAINT_REPORTER_PENALTY, "false_complaint_dismissed") {} catch {}
-            processed++;
+            try seer.punish(filed[i].reporter, COMPLAINT_REPORTER_PENALTY, "false_complaint_dismissed") {
+                processed++;
+                newCursor = i + 1;
+            } catch (bytes memory reason) {
+                emit DismissedComplaintPenaltyFailed(target, filed[i].reporter, reason);
+                // Stop on first failure — keepers can retry once the underlying issue is fixed.
+                break;
+            }
         }

+        dismissedComplaintPenaltyCursor[target] = newCursor;
         emit DismissedComplaintPenaltyProcessed(target, processed, newCursor);
     }
```

**Note:** the "stop on first failure" is conservative. If you want to keep going past failures (e.g., one reporter address blocked Seer for some reason but others can be punished), advance cursor on success only and continue the loop:

```solidity
for (uint256 i = cursor; i < stop; i++) {
    try seer.punish(filed[i].reporter, COMPLAINT_REPORTER_PENALTY, "false_complaint_dismissed") {
        processed++;
    } catch (bytes memory reason) {
        emit DismissedComplaintPenaltyFailed(target, filed[i].reporter, reason);
        // Skip but record for off-chain retry
    }
}
dismissedComplaintPenaltyCursor[target] = stop; // Advance fully
// Off-chain keeper re-iterates failed entries via the events
```

The "stop on first failure" approach is safer (no silent skipping of any reporter) but requires the operator to fix and retry. The "skip and event" approach requires off-chain machinery to track failures.

**Verification:** test with seer.punish reverting → cursor stays at original position; with seer.punish succeeding → cursor advances normally; with mixed → cursor advances to first failure.

---

## FRAUD-03 — `releaseEscrow` redirects to mutable vault owner — DAO-swap drain risk

**Severity:** Critical
**Location:** `contracts/FraudRegistry.sol:256-274` and `escrowTransfer:217-241`

### What's wrong

At escrow time, `escrowTransfer` records only `(from, to, amount)`. At release time, `releaseEscrow` resolves `e.to` through the *current* `vaultHub`:

```solidity
if (wasVault) {
    address owner = vaultHub.ownerOfVault(e.to);
    address currentVault = vaultHub.vaultOf(owner);
    if (currentVault != e.to) {
        releaseTarget = currentVault;
    }
}
```

Two attack vectors:

1. **Vault owner rotation during the 30-day window.** If `e.to` was vault V owned by Alice, and during the 30 days V is reassigned to Bob (via `VaultRecoveryClaim`), tokens go to Bob's current vault, not Alice.

2. **VaultHub replacement.** `setVaultHub` is callable by the DAO with a 48-hour timelock. A rogue DAO can:
   - Set `vaultHub = attackerHub` where `attackerHub.ownerOfVault` returns attacker addresses
   - Wait 48 h, apply
   - All pending escrows now resolve to attacker-controlled vaults

### Impact

Vector 1 (low likelihood): legitimate recovery rotation during escrow period reroutes legitimately-recovered funds to the new owner. Arguably correct behavior in the recovery case but unexpected in the day-to-day case.

Vector 2 (medium likelihood, high severity): full drain of pending escrows by a compromised/captured DAO.

### Fix

Snapshot the destination's owner at `escrowTransfer` time and resolve through that snapshot at release time:

```diff
 struct EscrowedTransfer {
     address from;
     address to;
     uint256 amount;
     uint64 releaseAt;
     bool released;
     bool cancelled;
+    address recipientOwner; // Snapshot at escrowTransfer time
 }

 function escrowTransfer(address from, address to, uint256 amount) external nonReentrant returns (uint256 escrowIndex) {
     require(msg.sender == address(vfideToken), "FR: only token");

+    // Snapshot the intended recipient's owner — bind the escrow to a person, not a vault address.
+    address recipientOwner = to;
+    if (address(vaultHub) != address(0)) {
+        try vaultHub.isVault(to) returns (bool isV) {
+            if (isV) {
+                try vaultHub.ownerOfVault(to) returns (address owner) {
+                    if (owner != address(0)) recipientOwner = owner;
+                } catch {}
+            }
+        } catch {}
+    }
+
     uint64 releaseAt = uint64(block.timestamp) + uint64(ESCROW_DURATION);
     escrowIndex = escrowedTransfers.length;
     escrowedTransfers.push(EscrowedTransfer({
         from: from,
         to: to,
         amount: amount,
         releaseAt: releaseAt,
         released: false,
-        cancelled: false
+        cancelled: false,
+        recipientOwner: recipientOwner
     }));
     // ... unchanged ...
 }

 function releaseEscrow(uint256 escrowIndex) external nonReentrant {
     // ... preconditions unchanged ...

     // Resolve by ORIGINAL owner, not by current vault owner.
     address releaseTarget = e.to;
-    if (address(vaultHub) != address(0)) {
-        try vaultHub.isVault(e.to) returns (bool wasVault) {
-            if (wasVault) {
-                try vaultHub.ownerOfVault(e.to) returns (address owner) {
-                    if (owner != address(0)) {
-                        try vaultHub.vaultOf(owner) returns (address currentVault) {
-                            if (currentVault != address(0) && currentVault != e.to) {
-                                releaseTarget = currentVault;
-                            }
-                        } catch {}
-                    }
-                } catch {}
-            }
-        } catch {}
-    }
+    if (e.recipientOwner != address(0) && address(vaultHub) != address(0)) {
+        // Look up the ORIGINAL owner's CURRENT vault (handles legitimate vault rotation).
+        try vaultHub.vaultOf(e.recipientOwner) returns (address currentVault) {
+            if (currentVault != address(0)) {
+                releaseTarget = currentVault;
+            }
+        } catch {}
+    }
     // ... transfer unchanged ...
 }
```

To address vector 2 specifically (DAO-swap), additionally make the snapshot resolution use a stable record (the snapshot owner is the source of truth, not the current vaultHub). The fix above does this — `e.recipientOwner` is set once at escrow time and never re-derived.

If you want extra safety against DAO-swap of vaultHub, lock `vaultHub` once set: remove `setVaultHub` entirely and have it set in the constructor as `immutable`. This is the strongest fix but trades off recoverability if VaultHub itself needs to be replaced.

**Verification:** test scenario — escrow tokens to Alice's vault V1, simulate Alice recovering to vault V2, release escrow → tokens go to V2 (Alice's current vault), not to V1's new owner if V1 was reassigned.

---

## VAULT-01 — `executeQueuedWithdrawal` doesn't snapshot recipient validity

**Severity:** Medium
**Location:** `contracts/CardBoundVault.sol:720-764`

### What's wrong

A withdrawal queued at T0 to vault V will execute at T0+7d to whatever address V is at that time. There is a `canReceiveTransfer` check at line 758, but it doesn't catch all destruction modes (e.g., a contract that no longer rejects but no longer behaves correctly either).

### Impact

Edge case — `selfdestruct` is deprecated but still functional, and CREATE2 slot reuse is theoretically possible. In practice, vaults are CardBoundVault instances that cannot self-destruct, so this is mostly theoretical.

### Fix

Add a snapshot check that the destination vault hasn't changed identity:

```solidity
struct QueuedWithdrawal {
    address toVault;
    uint256 amount;
    uint64 requestTime;
    uint64 executeAfter;
    bool executed;
    bool cancelled;
    uint256 intentNonce;
    bytes32 toVaultCodeHashAtQueue; // ADD: snapshot
}

function _queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce) internal {
    if (activeQueuedWithdrawals >= MAX_QUEUED) revert CBV_QueueFull();

    bytes32 codeHash;
    assembly { codeHash := extcodehash(toVault) }

    withdrawalQueue.push(QueuedWithdrawal({
        toVault: toVault,
        amount: amount,
        requestTime: uint64(block.timestamp),
        executeAfter: uint64(block.timestamp) + uint64(WITHDRAWAL_DELAY),
        executed: false,
        cancelled: false,
        intentNonce: intentNonce,
        toVaultCodeHashAtQueue: codeHash
    }));
    activeQueuedWithdrawals += 1;
    emit WithdrawalQueued(withdrawalQueue.length - 1, toVault, amount, executeAfter);
}

function executeQueuedWithdrawal(uint256 queueIndex) external nonReentrant whenNotPaused {
    // ... existing checks ...

    // Verify destination hasn't been replaced.
    bytes32 currentCodeHash;
    assembly { currentCodeHash := extcodehash(w.toVault) }
    if (currentCodeHash != w.toVaultCodeHashAtQueue) revert CBV_ReceiverChanged();

    // ... rest unchanged ...
}
```

Add `error CBV_ReceiverChanged();` to the errors list.

**Verification:** unit test attempting to execute after destroying/replacing the destination — must revert.

---

## BRIDGE-01 — `openBridgeRefundWindow` race with destination delivery

**Severity:** High
**Location:** `contracts/future/VFIDEBridge.sol:961-977`

### What's wrong

After bridging, the source-chain owner can manually open a refund window when they believe delivery failed. But if a successful delivery confirmation is in-flight from the destination chain when the owner makes this call, both can resolve:

1. Owner opens refund window at T1 (incorrectly believing delivery failed).
2. Refund delay (`BRIDGE_REFUND_DELAY = 7 days`) elapses.
3. User calls `claimBridgeRefund` and gets their tokens back on the source chain.
4. Confirmation eventually arrives → `_confirmBridgeDelivery` finds `btx.executed == true` → no-op.
5. User has tokens on BOTH chains.

The 7-day delay is meant to absorb in-flight confirmations (LayerZero is usually minutes), and `_confirmBridgeDelivery` does delete `bridgeRefundableAfter[txId]` if it arrives in time. But the window where confirmation is delayed > 7 days is non-zero.

### Impact

Rare in normal operation (LayerZero would have to be backed up for a week). But a compromised owner can deliberately exploit this. The optional `refundWindowCosigner` reduces single-admin risk but is opt-in and doesn't eliminate collusion risk.

### Fix

Multi-pronged:

**1. Make `refundWindowCosigner` mandatory in production:**

```solidity
function openBridgeRefundWindow(bytes32 txId) external onlyOwner {
    require(refundWindowCosigner != address(0), "VFIDEBridge: cosigner required");
    // ... existing logic, always sets pendingRefundWindowProposal ...
    pendingRefundWindowProposal[txId] = true;
    emit BridgeRefundWindowProposed(txId);
}
```

This forces the cosigner role to exist and the cosigner workflow to be used unconditionally.

**2. Add a delay-after-cosign before the refund actually becomes claimable:**

```solidity
function approveRefundWindow(bytes32 txId) external {
    require(msg.sender == refundWindowCosigner, "VFIDEBridge: not cosigner");
    // ... existing checks ...
    delete pendingRefundWindowProposal[txId];
    // Use a longer delay than the LayerZero confirmation envelope.
    bridgeRefundableAfter[txId] = block.timestamp + BRIDGE_REFUND_DELAY;
    emit BridgeRefundWindowCosigned(txId, bridgeRefundableAfter[txId]);
}
```

This is already in place. The 7-day delay is long enough to absorb anything but pathological LayerZero outages. ✓

**3. Add a destination-side affirmative non-delivery message.** When destination has insufficient liquidity, it already sends `MSG_TYPE_BRIDGE_FAILURE` (line 472). Make this the **only** way the source-chain refund window can open in production:

```solidity
// Disable owner-driven refund window entirely; rely on:
// (a) destination-sourced MSG_TYPE_BRIDGE_FAILURE (auto-opens window in _markBridgeFailed)
// (b) permissionless openStaleBridgeRefundWindow after STALE_BRIDGE_REFUND_DELAY (30 days)
function openBridgeRefundWindow(bytes32 txId) external view {
    revert("VFIDEBridge: use destination failure path or stale window");
}
```

This eliminates owner-driven refund risk entirely. The cost: if LayerZero loses a `BRIDGE_FAILURE` message AND a 30-day delay is unacceptable, no manual override exists. For most cases the 30-day window is fine.

**Verification:** test scenario — bridge succeeds on destination, attacker calls `openBridgeRefundWindow`, claim refund after 7 days → attacker should NOT be able to drain (the function reverts in option 3).

---

## BRIDGE-02 — `finalizeStaleBridgeRefund` doesn't check `_bridgeIsSystemExempt`

**Severity:** High
**Location:** `contracts/future/VFIDEBridge.sol:1021-1043`

### What's wrong

Both `bridge()` (line 275) and `claimBridgeRefund()` (line 928) gate on `_bridgeIsSystemExempt()` — the bridge must be `systemExempt` on the token to avoid fee-debiting whole-amount bridge transfers. But `finalizeStaleBridgeRefund` (the permissionless 30-day backstop) does not have this check.

### Impact

If `systemExempt[bridge]` is revoked between bridge time and stale-refund time:

- `claimBridgeRefund` reverts (gated correctly).
- `finalizeStaleBridgeRefund` proceeds with `safeTransfer` → fees are debited from the refund amount.
- User receives `amount - fees` instead of `amount`.

### Fix

Add the same check:

```diff
 function finalizeStaleBridgeRefund(bytes32 txId) external nonReentrant whenNotPaused {
+    require(_bridgeIsSystemExempt(), "VFIDEBridge: configure token systemExempt for bridge");
     BridgeTransaction storage btx = bridgeTransactions[txId];
     require(btx.sender != address(0), "VFIDEBridge: unknown tx");
     require(!btx.executed, "VFIDEBridge: already executed");
     // ... rest unchanged ...
 }
```

This causes `finalizeStaleBridgeRefund` to revert if systemExempt is revoked. The user's tokens stay locked in the bridge contract until either:
- Owner re-grants systemExempt (via the timelocked bypass on the bridge), or
- A separate bypass mechanism is invoked

This is the correct fail-loud-don't-charge-fees behavior. Pair with documentation: never revoke `systemExempt[bridge]` without also calling `setExemptCheckBypass(true)` first.

**Verification:** test — bridge tokens, revoke systemExempt, wait 30 days, call `finalizeStaleBridgeRefund` → must revert (currently silently fee-debits).

---

## FAUCET-01 — Operator private key in env

**Severity:** Medium
**Location:** `app/api/faucet/claim/route.ts:63-76`

### What's wrong

The faucet operator private key is read from `FAUCET_OPERATOR_PRIVATE_KEY` env var. The route does check `FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER === 'true'` and `NODE_ENV !== 'production'` before using it — but a misconfigured Vercel environment (one flag flipped) puts a signing key into prod.

### Impact

Compromised or misconfigured deployment leaks the testnet faucet private key. For testnet, impact is limited to draining the faucet. For mainnet (which this code path is gated against), would be catastrophic — but the gate exists.

### Fix

Add a hard boot-time guard in process initialization that aborts if the unsafe combination is detected:

```typescript
// app/api/faucet/claim/route.ts (or instrumentation.ts for boot-time)

if (
  process.env.NODE_ENV === 'production' &&
  process.env.FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER === 'true'
) {
  throw new Error(
    'FATAL: FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER=true is not permitted in production. ' +
    'Use an external signer (KMS/HSM/relayer).'
  );
}
```

Place this in `instrumentation.ts` (Next.js calls it at boot) so the process refuses to start, not just refuse the request:

```typescript
// instrumentation.ts
export async function register() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER === 'true'
  ) {
    console.error('FATAL: unsafe faucet signer enabled in production. Refusing to start.');
    process.exit(1);
  }
}
```

For a real production faucet, wire to an external relayer (Defender, Gelato) or KMS-backed signer. The plain env var path is acceptable only on testnet.

**Verification:** set the unsafe flag in a production-like environment and confirm the process refuses to boot.

---

## FAUCET-02 — `claim` route blocks on `waitForTransactionReceipt`

**Severity:** Medium
**Location:** `app/api/faucet/claim/route.ts:111`

### What's wrong

```typescript
const hash = await walletClient.writeContract({...});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
```

The HTTP request is held open until the tx is mined. On a slow block (or busy testnet), this exceeds Vercel's serverless function timeout (10s default, 60s on Pro). User gets a 504 even when the tx eventually lands.

### Impact

User-facing failure on slow-block conditions. The on-chain claim usually succeeds (tx is mined), but the HTTP response is a timeout, leading to retry loops and "already claimed" errors on the second attempt.

### Fix

Return the hash immediately; let the client poll for receipt:

```typescript
// app/api/faucet/claim/route.ts

try {
  const hash = await walletClient.writeContract({
    address: faucetAddress,
    abi: VFIDETestnetFaucetABI,
    functionName: 'claim',
    args: [address as `0x${string}`, referrerAddr as `0x${string}`],
  });

  // Don't wait for receipt — return immediately.
  return NextResponse.json({
    success: true,
    txHash: hash,
    message: 'Faucet transaction submitted. Tokens and gas will arrive in a few seconds.',
  });
} catch (error: unknown) {
  // ... existing error handling ...
}
```

Add a client-side polling helper or a separate `GET /api/faucet/status?hash=...` endpoint that the frontend polls until the tx is mined.

**Verification:** call the endpoint under network-induced delay; confirm the response returns within 1-2 seconds with the hash, and polling shows mined state shortly after.

---

## FAUCET-03 — `batchClaim` reverts entire batch on a single ETH-transfer failure

**Severity:** High
**Location:** `contracts/testnet/VFIDETestnetFaucet.sol:162-199`

### What's wrong

The F-50 FIX comment claims "Keep batch claim atomic per call." But this means a single griefing recipient (a contract with no `receive()` function) breaks every batch they appear in. The operator wastes gas; legitimate users in the batch get nothing.

### Impact

A single malicious address can DoS batch claims by getting included in batches. Each failed batch costs the operator the gas of the entire batch + lost throughput on the daily cap.

### Fix

Skip on ETH-transfer failure rather than reverting the batch. Mark the user as claimed for VFIDE only, queue gas top-up via a separate keeper:

```solidity
function batchClaim(address[] calldata users, address[] calldata referrers) external onlyOperator nonReentrant {
    require(users.length == referrers.length, "Faucet: length mismatch");
    require(users.length <= 50, "Faucet: batch too large");

    _refreshDay();
    _refreshOperatorDay(msg.sender);

    for (uint256 i = 0; i < users.length; i++) {
        address user = users[i];
        if (user == address(0) || hasClaimed[user]) continue;
        if (claimsToday >= dailyClaimCap) break;
        if (operatorClaimsToday[msg.sender] >= operatorDailyClaimCap) break;

        uint256 vfideBalance = vfideToken.balanceOf(address(this));
        if (vfideBalance < claimAmountVFIDE) break;
        if (address(this).balance < claimAmountETH) break;

        hasClaimed[user] = true;
        claimsToday++;
        operatorClaimsToday[msg.sender]++;
        totalClaimed += claimAmountVFIDE;
        totalUsers++;

        if (referrers[i] != address(0) && referrers[i] != user && hasClaimed[referrers[i]]) {
            referredBy[user] = referrers[i];
            _registerReferral(referrers[i], user);
        }

        vfideToken.safeTransfer(user, claimAmountVFIDE);

        // FIX: don't revert the whole batch on a single ETH transfer failure.
        (bool sent, ) = user.call{value: claimAmountETH, gas: 30_000}("");
        if (!sent) {
            // Record so a separate retry path can top up gas.
            pendingGasTopUp[user] = claimAmountETH;
            emit BatchClaimGasFailed(user);
        }
        emit BatchClaimProcessed(user, referrers[i], claimAmountVFIDE, claimAmountETH, !sent);
    }
}

mapping(address => uint256) public pendingGasTopUp;
event BatchClaimGasFailed(address indexed user);

/// @notice Anyone can retry the gas top-up for a user whose batch ETH transfer failed.
function retryGasTopUp(address user) external nonReentrant {
    uint256 amount = pendingGasTopUp[user];
    require(amount > 0, "Faucet: no pending");
    require(address(this).balance >= amount, "Faucet: insufficient ETH");
    delete pendingGasTopUp[user];
    (bool sent, ) = user.call{value: amount, gas: 30_000}("");
    require(sent, "Faucet: retry failed");
}
```

The `gas: 30_000` cap on the call prevents griefing via gas-burning fallback functions.

**Verification:** include a known-bad recipient (contract with reverting `receive()`) in a batch alongside legitimate addresses → batch should complete for the legitimate addresses; the bad address has `pendingGasTopUp` set; their `hasClaimed` is true and VFIDE was sent.

---

## FAUCET-04 — Referrer self-claim check incomplete (sybil chains)

**Severity:** Low
**Location:** `app/api/faucet/claim/route.ts:56-58`, `contracts/testnet/VFIDETestnetFaucet.sol:142-146`

### What's wrong

The check blocks `referrer === address` (self-referral) and requires the referrer to have claimed previously. But it doesn't prevent trivial sybil chains: claim with wallet A as referrer for B, then B as referrer for C, etc.

### Impact

For testnet, impact is limited to inflating headhunter referral stats. If those stats feed any incentive accounting (per memory: `_registerReferral` calls EcosystemVault), a sybil farmer can pump the leaderboard.

### Fix

For testnet-only this is acceptable. If sybil-resistance matters:

**Option A — require referrer ProofScore >= some threshold:**

```solidity
if (referrer != address(0)) {
    if (referrer == user || !hasClaimed[referrer]) revert Faucet_ReferrerNotEligible();
    // Require referrer to have meaningful trust before counting referrals.
    require(seer.getScore(referrer) >= MIN_REFERRER_SCORE, "Faucet: referrer trust too low");
    referredBy[user] = referrer;
    _registerReferral(referrer, user);
}
```

**Option B — limit referral chain depth:** record `referralDepth[user] = referralDepth[referrer] + 1` and reject when depth exceeds 3.

**Option C — limit referrals per address:** track `referralCount[referrer]` and reject after some threshold per epoch.

For a testnet faucet, Option A is the simplest meaningful gate.

**Verification:** test — claim with a freshly-deployed wallet as referrer (no badges, NEUTRAL score) → should fail if MIN_REFERRER_SCORE > NEUTRAL.

---

## DB-01 — `users` table has no `INSERT` policy

**Severity:** Blocker
**Location:** `migrations/20260121_234000_add_row_level_security.sql:14-29`

### What's wrong

`ALTER TABLE users ENABLE ROW LEVEL SECURITY;` is followed by `users_read_own`, `users_read_public`, `users_update_own` policies. **No `INSERT` policy exists.**

With RLS enabled and no INSERT policy, Postgres denies inserts unless the role bypasses RLS (table owner or role with `BYPASSRLS`).

### Impact

One of three states must be true in production:

1. The DB role used by the app **owns the `users` table** (default if the app role ran the migrations) — table owners bypass RLS by default. RLS becomes decorative for that role.
2. The DB role has the `BYPASSRLS` attribute — RLS is decorative for that role.
3. Neither — `INSERT INTO users` (in `app/api/users/route.ts:278` and `app/api/subscriptions/route.ts:101`) fails with a Postgres permission error. Signups are broken.

If the production deployment is in state 1 or 2, the entire RLS layer is theater — every policy you wrote is bypassed by the connecting role. If state 3, signups don't work.

### Fix

**Step 1 — verify which state you're in:**

```sql
-- Run as the app's connecting role
SELECT current_user, session_user;
SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user;
SELECT relname, relrowsecurity, relforcerowsecurity, tableowner
FROM pg_tables JOIN pg_class ON relname = tablename
WHERE tablename = 'users';
```

If `rolbypassrls = true` OR `tableowner = current_user`, RLS is bypassed and **every** policy you defined is a no-op for that role. Either:
- Add `ALTER TABLE users FORCE ROW LEVEL SECURITY;` (forces RLS even for the table owner — but then INSERTs need a policy too)
- Use a separate non-owner, non-bypassrls role for the application connection

**Step 2 — add the missing INSERT policy:**

```sql
-- migrations/<timestamp>_users_insert_policy.sql

CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (
    wallet_address = current_setting('app.current_user_address', true)::text
  );
```

This restricts INSERTs to rows whose `wallet_address` matches the authenticated session's user. Combined with `withAuth` middleware (DB-04), this enforces "users can only create themselves."

**Step 3 — drop the permissive read-public policy:** see DB-02.

**Step 4 — add `FORCE ROW LEVEL SECURITY`:**

```sql
ALTER TABLE users FORCE ROW LEVEL SECURITY;
```

This makes RLS apply even to the table owner, ensuring policies are not bypassed by the connecting role.

**Verification:** as the app role, attempt `INSERT INTO users (wallet_address) VALUES ('0xattacker')` after setting `app.current_user_address = '0xvictim'` → must fail. Attempt the same with `app.current_user_address = '0xattacker'` → succeeds.

---

## DB-02 — `users_read_public USING (true)` nullifies row-level read protection

**Severity:** High
**Location:** `migrations/20260121_234000_add_row_level_security.sql:21-24`

### What's wrong

```sql
CREATE POLICY users_read_public ON users
  FOR SELECT
  USING (true);
```

Postgres RLS combines `FOR SELECT` policies with **OR** semantics. Any single policy returning true grants access. `USING (true)` always returns true, so `users_read_own` is meaningless — every row is readable by every authenticated session.

The migration comment says "sensitive fields handled by application" but this requires every read code path to filter sensitive columns, which is impossible to verify across 123 routes.

### Impact

Any authenticated user can `SELECT *` from `users` and read every other user's `email`, `phone`, `display_name`, etc. — whatever sensitive columns exist on the table.

### Fix

Drop the permissive policy. Replace with a column-filtered VIEW for public profile reads:

```sql
-- migrations/<timestamp>_users_rls_tighten.sql

DROP POLICY IF EXISTS users_read_public ON users;

-- Public-facing view exposes only non-sensitive columns.
CREATE OR REPLACE VIEW users_public AS
SELECT
  id,
  wallet_address,
  username,
  display_name,
  bio,
  avatar_url,
  created_at
FROM users;

GRANT SELECT ON users_public TO PUBLIC;

-- users_read_own remains as the sole row-level read policy on the base table.
-- Application code that needs OTHER users' data reads from users_public.
```

**Code migration:** anywhere the app currently reads other users' rows from the `users` table, switch to `users_public`. Reads of own row continue against `users` (with RLS applying).

**Verification:** as user A, `SELECT email FROM users WHERE wallet_address = '0xB'` → returns 0 rows. `SELECT * FROM users_public WHERE wallet_address = '0xB'` → returns the public columns only.

---

## DB-03 — `user_portfolios` table queried by API but exists in NO migration

**Severity:** Blocker
**Location:** `app/api/analytics/portfolio/[address]/route.ts:53`, no matching migration

### What's wrong

The endpoint queries `FROM user_portfolios WHERE LOWER(wallet_address) = $1`. A repo-wide search shows no `CREATE TABLE user_portfolios` in any migration or `init-db.sql`. The endpoint will throw `relation "user_portfolios" does not exist` on any clean Postgres database.

### Impact

If production has the table from out-of-band setup, fine but undocumented. If production is fresh (or after a re-init), the endpoint is permanently broken.

### Fix

Either delete the dead endpoint, or create the missing migration.

**If keeping the endpoint:**

```sql
-- migrations/<timestamp>_user_portfolios.sql

CREATE TABLE IF NOT EXISTS user_portfolios (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wallet_address  TEXT NOT NULL,
  total_balance   NUMERIC(78, 0) DEFAULT 0,    -- uint256-safe
  vfide_balance   NUMERIC(78, 0) DEFAULT 0,
  vault_balance   NUMERIC(78, 0) DEFAULT 0,
  reward_balance  NUMERIC(78, 0) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wallet_address)
);

CREATE INDEX idx_user_portfolios_wallet ON user_portfolios (LOWER(wallet_address));

ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios FORCE ROW LEVEL SECURITY;

-- Owner can read and update their own portfolio
CREATE POLICY user_portfolios_read_own ON user_portfolios
  FOR SELECT
  USING (LOWER(wallet_address) = current_setting('app.current_user_address', true)::text);

CREATE POLICY user_portfolios_update_own ON user_portfolios
  FOR UPDATE
  USING (LOWER(wallet_address) = current_setting('app.current_user_address', true)::text);

-- Inserts only by the owner of the wallet
CREATE POLICY user_portfolios_insert_own ON user_portfolios
  FOR INSERT
  WITH CHECK (LOWER(wallet_address) = current_setting('app.current_user_address', true)::text);
```

The endpoint also needs auth gating — see API-01.

**If deleting the endpoint:**

```bash
rm -r app/api/analytics/portfolio/
```

Update any frontend consumers to read on-chain balances directly via wagmi.

**Verification:** if creating, run migration and test the endpoint. If deleting, grep for `analytics/portfolio` calls in frontend and remove.

---

## DB-04 — 119 of 123 routes don't use `withAuth` wrapper

**Severity:** High
**Location:** `lib/auth/middleware.ts:255` (defines `withAuth`), used in only 2 routes; 117 other authenticated routes use `requireAuth` directly

### What's wrong

`withAuth` is the wrapper that activates the Postgres RLS context via `runWithDbUserAddressContext`. Only `app/api/leaderboard/claim-prize/route.ts` and `app/api/auth/logout/route.ts` use it. Two more routes (`user/state`, `subscriptions`) use explicit `runWithDbUserAddressContext`. The remaining 119 authenticated routes call `requireAuth` and then `query()` directly — relying on the implicit fallback in `lib/db.ts:35` that re-extracts the JWT from `headers()` per query.

### Impact

The implicit fallback works in current Next.js, but:

1. **Fragility** — if `headers()` ever changes how it propagates inside route handlers (already changed once in App Router), RLS silently breaks.
2. **Double JWT verification** — every query verifies the JWT again, doubling crypto cost.
3. **Inconsistent patterns** make it easy for future routes to forget to authenticate at all.

### Fix

Standardize on `withAuth` for every route that requires auth. Codemod every authenticated route from this pattern:

```typescript
export async function POST(request: NextRequest) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  // ... handler logic uses authResult.user ...
  const result = await query('...');
}
```

To this:

```typescript
export const POST = withAuth(async (request, user) => {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  // ... handler logic uses `user` directly ...
  const result = await query('...');  // RLS context automatic via ALS
});
```

For routes that need ownership-on-some-other-address (like `requireOwnership`), create a parallel wrapper:

```typescript
// lib/auth/middleware.ts

export function withOwnership(addressExtractor: (req: NextRequest) => string | Promise<string>, handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const address = await addressExtractor(request);
    const authResult = await requireOwnership(request, address);
    if (authResult instanceof NextResponse) return authResult;
    const { runWithDbUserAddressContext } = await import('@/lib/db');
    return runWithDbUserAddressContext(authResult.user.address, () => handler(request, authResult.user));
  };
}
```

Plan a migration sprint: 1-2 routes per day for ~60 working days, or a one-shot codemod with thorough test coverage.

**Verification:** add a runtime assertion in `lib/db.ts:query()` that warns if `dbUserContext.getStore()` is unset for any authenticated query path. After the migration, the warning should never fire.

---

## API-01 — `/api/analytics/portfolio/[address]` exposes any user's portfolio

**Severity:** High
**Location:** `app/api/analytics/portfolio/[address]/route.ts:1-73`

### What's wrong

No `requireAuth`, no ownership check. Any unauthenticated client can call `GET /api/analytics/portfolio/0x<any address>` and receive `total_balance`, `vfide_balance`, `vault_balance`, `reward_balance` for that address.

### Impact

On-chain balances are public, but aggregated reward balances and internal portfolio rollups are not necessarily intended to be enumerable by address. Combined with DB-03 (the table doesn't exist in migrations), the immediate fix is "delete the endpoint." If kept, gate it.

### Fix

Two gates:

**Gate 1 — require auth and ownership:**

```typescript
import { requireOwnership } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const { address } = await params;
  if (!address || !ETH_ADDRESS_REGEX.test(address.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }
  const normalizedAddress = address.toLowerCase();

  // Require the caller to be the owner of the address being queried.
  const authResult = await requireOwnership(request, normalizedAddress);
  if (authResult instanceof NextResponse) return authResult;

  // ... existing query ...
}
```

**Gate 2 — wrap with `withAuth`-style RLS context:**

After the route is migrated to use `withAuth` (per DB-04), the `user_portfolios_read_own` RLS policy (DB-03) ensures only the owner's row is readable even if the address parameter is spoofed.

**Verification:** GET as user A with address B in path → 403. GET as user A with address A → returns A's portfolio.

---

## API-02 — `/api/activities/[address]` does internal `fetch` to itself

**Severity:** Medium
**Location:** `app/api/activities/[address]/route.ts:55-61`

### What's wrong

The route constructs a URL from `request.nextUrl` (Host-header-derived) and `fetch`es it server-side to forward to the query-based endpoint. Adds latency, doubles rate-limit cost, and creates a Host-header-spoofing risk depending on edge config.

### Impact

If the upstream rewrites `Host` based on a forwarded header (some CDN configs do), the fetch could hit a different origin than intended. Plus: 2x the latency for a logically-identical operation.

### Fix

Call the handler function directly instead of HTTP-forwarding:

```typescript
// app/api/activities/[address]/route.ts
import { GET as activitiesGET } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const { address } = await params;
  const normalizedAddress = address?.trim().toLowerCase();
  if (!normalizedAddress || !ETH_ADDRESS_REGEX.test(normalizedAddress)) {
    return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
  }

  // Build a synthetic NextRequest with userAddress query param so we can call the handler directly.
  const newUrl = new URL(request.nextUrl);
  newUrl.pathname = '/api/activities';
  newUrl.searchParams.set('userAddress', normalizedAddress);
  for (const [key, value] of request.nextUrl.searchParams) {
    if (key !== 'address') newUrl.searchParams.set(key, value);
  }
  const synthRequest = new NextRequest(newUrl, {
    method: 'GET',
    headers: request.headers,
  });

  return activitiesGET(synthRequest);
}
```

Better still — refactor `app/api/activities/route.ts` to expose its core logic as a function, and have both routes call it:

```typescript
// app/api/activities/_handler.ts
export async function fetchActivities(userAddress: string, opts: { limit?: number; offset?: number; type?: string }) {
  // ... all the query logic from the existing route ...
  return { activities, total };
}

// app/api/activities/route.ts
import { fetchActivities } from './_handler';
export async function GET(request: NextRequest) {
  // parse userAddress from query string, call fetchActivities, return NextResponse.json
}

// app/api/activities/[address]/route.ts
import { fetchActivities } from '../_handler';
export async function GET(request: NextRequest, { params }) {
  const { address } = await params;
  const data = await fetchActivities(address, { ...parseQuery(request) });
  return NextResponse.json(data);
}
```

**Verification:** load-test the endpoint and compare latency before/after.

---

## API-03 — `merchant/locations` POST does manual body parsing without bounds

**Severity:** Medium
**Location:** `app/api/merchant/locations/route.ts:57-102`

### What's wrong

Manual `typeof body?.x === 'string' ? body.x.trim() : ''` parsing with no max length on `name`, `address`, `city`, `country`, no bounds on `lat`/`lng`.

### Impact

DB pollution / storage abuse via large strings. NaN/Infinity in lat/lng could break downstream geo logic.

### Fix

Replace with a Zod schema:

```typescript
// app/api/merchant/locations/route.ts
import { z } from 'zod4';

const createLocationSchema = z.object({
  merchantAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export async function POST(request: NextRequest) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;

  let body: z.infer<typeof createLocationSchema>;
  try {
    const raw = await request.json();
    const parsed = createLocationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const merchantAddress = normalizeAddress(body.merchantAddress);
  const authResult = await requireOwnership(request, merchantAddress);
  if (authResult instanceof NextResponse) return authResult;

  const result = await query(
    `INSERT INTO merchant_locations (merchant_address, name, address, city, country, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, address, city, country, lat, lng, active`,
    [merchantAddress, body.name, body.address ?? null, body.city ?? null, body.country ?? null, body.lat ?? null, body.lng ?? null]
  );

  return NextResponse.json({ success: true, location: serializeLocation(result.rows[0]) });
}
```

Apply the same Zod-first pattern to other manually-parsed POST/PATCH routes (`merchant/gift-cards`, `subscriptions`, etc.).

**Verification:** send a 10MB string in `name` → 400 Invalid request body. Send `lat: 1e300` → 400.

---

## ABI-01 — 22 stale ABI files in `lib/abis/` with no matching contract

**Severity:** Critical
**Location:** `lib/abis/`

### What's wrong

22 ABI JSON files have no corresponding `.sol` contract in `contracts/` (excluding `lib/`, `interfaces/`, `mocks/`):

```
BurnRouter, CommerceEscrow, DeployPhase1, DeployPhase1Governance,
DeployPhase1Infrastructure, DeployPhase1Token, DeployPhases3to6,
DevReserveVesting, ERC20, EmergencyBreaker, GuardianLock,
GuardianRegistry, MerchantRegistry, PanicGuard, Pools, SecurityHub,
TempVault, UserVault, UserVaultLite, VFIDEReentrancyGuard, VFIDETrust,
WithdrawalQueue
```

### Impact

These represent removed (`SecurityHub`, `PanicGuard`, `GuardianLock`, etc., from non-custodial cleanup), renamed (`BurnRouter` → `ProofScoreBurnRouter`, `DevReserveVesting` → `DevReserveVestingVault`), or never-real (`TempVault`, `Pools`) contracts. Some are still imported by `lib/abis/index.ts` (ABI-02). Some are utility ABIs (`ERC20`) that are fine to keep.

### Fix

**Step 1 — categorize:**

| File | Action |
|---|---|
| `BurnRouter.json` | Delete — replaced by `ProofScoreBurnRouter` |
| `CommerceEscrow.json` | Delete (or restore the contract — see ABI-05) |
| `DeployPhase*.json` | Delete — deployment-time scripts, not runtime |
| `DevReserveVesting.json` | Keep (identical to `DevReserveVestingVault.json` per `diff -q`) OR delete and update imports |
| `ERC20.json` | Keep — generic utility |
| `EmergencyBreaker.json` | Delete |
| `GuardianLock.json` | Delete |
| `GuardianRegistry.json` | Delete |
| `MerchantRegistry.json` | Delete |
| `PanicGuard.json` | Delete |
| `Pools.json` | Investigate; likely delete |
| `SecurityHub.json` | Delete |
| `TempVault.json` | Delete |
| `UserVault.json` | Delete (CardBoundVault is the active vault) |
| `UserVaultLite.json` | Delete |
| `VFIDEReentrancyGuard.json` | Delete (utility, not deployed) |
| `VFIDETrust.json` | Investigate; likely delete |
| `WithdrawalQueue.json` | Delete (folded into CardBoundVault) |

**Step 2 — automate this check in CI:**

```bash
# scripts/check-abi-parity.sh
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

contracts=$(find contracts \( -path '*/lib/*' -o -path '*/interfaces/*' -o -path '*/mocks/*' \) -prune -o -name '*.sol' -print | xargs -n1 basename | sed 's/\.sol$//' | sort -u)
abis=$(ls lib/abis/*.json | xargs -n1 basename | sed 's/\.json$//' | sort -u)

orphans=$(comm -23 <(echo "$abis") <(echo "$contracts"))
if [ -n "$orphans" ]; then
  echo "ABIs without matching contract:"
  echo "$orphans"
  exit 1
fi
```

Wire into pre-commit and CI.

**Verification:** after cleanup, `scripts/check-abi-parity.sh` exits 0.

---

## ABI-02 — `lib/abis/index.ts` imports and validates orphan ABIs

**Severity:** Critical
**Location:** `lib/abis/index.ts`

### What's wrong

`index.ts` imports several orphan ABIs (per ABI-01) and runs `validateABI(...)` on them. The validation passes only because the JSON files exist — not because the JSON matches any deployed bytecode. Affected orphans:

- `UserVaultLiteABI`, `UserVaultABI`
- `GuardianRegistryABI`, `GuardianLockABI`, `PanicGuardABI`, `EmergencyBreakerABI`
- `MerchantRegistryABI`, `CommerceEscrowABI`
- `BurnRouterABI`
- `DevReserveVestingABI`

### Impact

Re-exported through `lib/contracts.ts`, then used by hooks (ABI-04, ABI-05, ABI-06). The dead-code branches that gate behind `!cardBoundMode` would all fail at runtime if ever reached.

### Fix

After deleting the JSON files (per ABI-01), remove the imports:

```diff
 // lib/abis/index.ts

-import UserVaultLiteABI from './UserVaultLite.json'
-import UserVaultABI from './UserVault.json'
-import GuardianRegistryABI from './GuardianRegistry.json'
-import GuardianLockABI from './GuardianLock.json'
-import PanicGuardABI from './PanicGuard.json'
-import EmergencyBreakerABI from './EmergencyBreaker.json'
-import MerchantRegistryABI from './MerchantRegistry.json'
-import BurnRouterABI from './BurnRouter.json'
-import CommerceEscrowABI from './CommerceEscrow.json'
-import DevReserveVestingABI from './DevReserveVesting.json'
```

And delete the corresponding `validateABI(...)` calls and the re-exports at the bottom of the file.

For each removed import, you'll get TypeScript errors at every consumer. Resolve those per ABI-04, ABI-05, ABI-06.

**Verification:** `tsc --noEmit` clean. `npm run build` clean.

---

## ABI-03 — `BurnRouter` and `ProofScoreBurnRouter` aliased to same env var, different ABIs

**Severity:** Critical
**Location:** `lib/contracts.ts:191-192`

### What's wrong

```typescript
BurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'BurnRouter'),
ProofScoreBurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'ProofScoreBurnRouter'),
```

Both resolve to the same env var. `BurnRouter.json` (11 functions) and `ProofScoreBurnRouter.json` (84 functions) are different ABIs. Whichever name you use, you get the same address — but if you use the legacy `BurnRouterABI`, calls hit a contract that doesn't have those selectors.

### Impact

See ABI-04 for the concrete user-facing impact. The aliasing makes the bug invisible at the import site (developer thinks they're calling the right thing).

### Fix

Delete the `BurnRouter` alias entirely. Force callers to use `ProofScoreBurnRouter`:

```diff
 // lib/contracts.ts

   BurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'BurnRouter'),
   ProofScoreBurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'ProofScoreBurnRouter'),

-  // Delete the legacy alias.
+  ProofScoreBurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'ProofScoreBurnRouter'),
```

And also delete from `CONTRACT_ENV_VAR_MAP` at line 98:

```diff
-  BurnRouter: 'NEXT_PUBLIC_BURN_ROUTER_ADDRESS',
   ProofScoreBurnRouter: 'NEXT_PUBLIC_BURN_ROUTER_ADDRESS',
```

After the per-chain refactor (INFRA-03), there's only one entry per chain.

**Verification:** `tsc --noEmit` reveals every consumer of `CONTRACT_ADDRESSES.BurnRouter` — fix each per ABI-04.

---

## ABI-04 — `usePayment.ts` calls deleted `routeFor` selector

**Severity:** Blocker
**Location:** `hooks/usePayment.ts:6, 31, 37-43, 70`

### What's wrong

```typescript
import { VFIDETokenABI, BurnRouterABI } from '@/lib/abis';
// ...
const { data: buyerFeeData } = useReadContract({
  address: CONTRACT_ADDRESSES.BurnRouter as `0x${string}`,
  abi: BurnRouterABI,
  functionName: 'routeFor',
  args: address ? [address] : undefined,
  query: { enabled: Boolean(address) && hasBurnRouterConfig },
});
// ...
const feeBps = buyerFeeData ? Number(buyerFeeData) : 100;
```

The deployed contract is `ProofScoreBurnRouter`, which has 84 functions but no `routeFor`. The legacy `BurnRouterABI` has `routeFor` but no matching selector at the deployed address. The call returns no data → `buyerFeeData` is undefined → `feeBps = 100` (1%) hardcoded.

### Impact

Every payment-related component using this hook displays a static 1% fee preview regardless of the user's actual ProofScore-driven fee (which ranges 0.25% to 5% of the amount). The on-chain `_transfer` charges the correct dynamic fee, so the user signs a tx expecting (e.g.) ~1% loss and may lose up to 5%. Confusing at best, fraudulent-looking at worst.

### Fix

Switch to the correct ABI and the correct fee-quote function:

```diff
 // hooks/usePayment.ts

-import { VFIDETokenABI, BurnRouterABI } from '@/lib/abis';
+import { VFIDETokenABI, ProofScoreBurnRouterABI } from '@/lib/abis';
 import { CONTRACT_ADDRESSES, ... } from '@/lib/contracts';
 // ...

-  const hasBurnRouterConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.BurnRouter);
+  const hasBurnRouterConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.ProofScoreBurnRouter);

-  const { data: buyerFeeData } = useReadContract({
-    address: CONTRACT_ADDRESSES.BurnRouter as `0x${string}`,
-    abi: BurnRouterABI,
-    functionName: 'routeFor',
-    args: address ? [address] : undefined,
+  // Use computeFees from the actual deployed router.
+  // computeFees returns (burnAmount, sanctumAmount, ecosystemAmount, sanctumSink, ecosystemSink, burnSink)
+  const { data: feeBreakdown } = useReadContract({
+    address: CONTRACT_ADDRESSES.ProofScoreBurnRouter as `0x${string}`,
+    abi: ProofScoreBurnRouterABI,
+    functionName: 'computeFees',
+    args: address && options?.amount ? [address, options.merchantAddress, options.amount] : undefined,
     query: { enabled: Boolean(address) && hasBurnRouterConfig },
   });

   // ...
-      const feeBps = buyerFeeData ? Number(buyerFeeData) : 100;
-      const feeAmount = (amount * BigInt(feeBps)) / 10000n;
+      const feeAmount = feeBreakdown
+        ? (feeBreakdown[0] as bigint) + (feeBreakdown[1] as bigint) + (feeBreakdown[2] as bigint)
+        : 0n;
       const totalRequired = amount + feeAmount;
```

Note: `computeFees` requires `(from, to, amount)` not just `(from)`. The hook signature needs to take `merchantAddress` and `amount` upfront so the quote matches what `_transfer` will actually do.

If the consumer can't provide `merchantAddress` and `amount` at hook-construction time, expose a `quoteFee(merchant, amount)` async function on the hook return value:

```typescript
const quoteFee = useCallback(async (merchant: `0x${string}`, amount: bigint) => {
  if (!publicClient || !address) return 0n;
  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.ProofScoreBurnRouter as `0x${string}`,
    abi: ProofScoreBurnRouterABI,
    functionName: 'computeFees',
    args: [address, merchant, amount],
  });
  return (result[0] as bigint) + (result[1] as bigint) + (result[2] as bigint);
}, [publicClient, address]);

return { ..., quoteFee };
```

**Verification:** test with a vault customer who has a ProofScore badge boost → `computeFees` should return a fee corresponding to their actual score, not the NEUTRAL fallback. Compare to the on-chain fee debited by `_transfer`.

---

## ABI-05 — `useEscrow.ts` writes to non-existent `CommerceEscrow` contract

**Severity:** Blocker
**Location:** `lib/escrow/useEscrow.ts:14, 48`, used by `app/pay/components/PayContent.tsx:225` and `components/merchant/PaymentInterface.tsx:44`

### What's wrong

`useEscrow` reads/writes to `CONTRACT_ADDRESSES.CommerceEscrow` using `CommerceEscrowABI`. The `CommerceEscrow.sol` contract no longer exists in the source tree. Either:

1. The contract was removed but the env var still points to a previously-deployed instance — calls go to legacy bytecode whose semantics may not match current intent.
2. The env var is unset → `ZERO_ADDRESS` → wagmi simulation fails → `createEscrow` always errors.

### Impact

Either way, the merchant payment flow (the primary commerce path of the app) is broken or stale on the frontend.

### Fix

Decision required first: **is `CommerceEscrow` being kept as a deployed contract, or is it removed and the new flow is direct token transfer through `MerchantPortal`?**

**Option A — restore the contract:**

If the design still wants escrow-mediated payments, restore `contracts/CommerceEscrow.sol` from git history, regenerate its ABI, redeploy on each chain, set the env var. Confirm `useEscrow` semantics still match.

**Option B — replace escrow with direct payment via MerchantPortal:**

Update `useEscrow` to wrap the appropriate `MerchantPortal` call instead. The exact mapping depends on what `MerchantPortal` exposes:

```typescript
// lib/escrow/useEscrow.ts (sketch — adapt to actual MerchantPortal interface)

import { MerchantPortalABI } from '@/lib/abis';
import { useWriteContract, useReadContract, useAccount, useChainId } from 'wagmi';
import { useContractAddresses } from '@/lib/contracts';

export function useEscrow() {
  const { address } = useAccount();
  const addresses = useContractAddresses();
  const { writeContractAsync } = useWriteContract();

  const createEscrow = useCallback(async (
    merchant: `0x${string}`,
    amount: bigint,
    orderId: string,
    releaseDelaySeconds: number
  ) => {
    return writeContractAsync({
      address: addresses.MerchantPortal,
      abi: MerchantPortalABI,
      functionName: 'createPayment', // or whatever the correct function is
      args: [merchant, amount, orderId, releaseDelaySeconds],
    });
  }, [writeContractAsync, addresses.MerchantPortal]);

  // ... releaseEscrow, refundEscrow similarly migrated ...

  return { createEscrow, /* ... */ };
}
```

You'll need to re-derive the escrow data model (state enum, fields) from whatever `MerchantPortal` exposes. The current `Escrow` interface (line 17-27) may need modification.

**Option C — delete escrow features entirely:**

If escrow isn't a current product, remove `app/pay/components/PayContent.tsx`, `components/merchant/PaymentInterface.tsx`, and `lib/escrow/`. Replace the merchant-payment UI with a direct VFIDE transfer flow.

**Verification:** end-to-end test of merchant payment from buyer flow → tokens arrive at merchant address (via whichever option chosen) → no errors at any step.

---

## ABI-06 — Stale ABIs imported into runtime hooks behind dead `!cardBoundMode` branches

**Severity:** Medium
**Location:** `hooks/useSecurityHooks.ts`, `app/vault/components/useVaultOperations.ts`, `components/vault/VaultActionsModal.tsx`

### What's wrong

Hooks like `useSecurityHooks.ts` import `PanicGuardABI`, `GuardianRegistryABI`, etc., and gate their usage behind `!cardBoundMode`. Since `isCardBoundVaultMode()` always returns `true` (`lib/contracts.ts:253`), these branches are unreachable. But the imports remain, the wagmi hook objects are constructed (with `enabled: false`), and the dead code is a future-bug magnet.

### Impact

Today: dead code that wagmi sees as "disabled queries" — minimal runtime overhead. Tomorrow: someone changes `isCardBoundVaultMode` and the dead code wakes up against ABIs that don't match the deployed contracts.

### Fix

Delete the dead branches and their imports.

```diff
 // hooks/useSecurityHooks.ts

 import { useReadContract, ... } from 'wagmi'
 import { ACTIVE_VAULT_ABI, CARD_BOUND_VAULT_ABI, CONTRACT_ADDRESSES, ... } from '../lib/contracts'
-import {
-  PanicGuardABI,
-  GuardianRegistryABI,
-  GuardianLockABI,
-  EmergencyBreakerABI,
-} from '../lib/abis'

-export function useQuarantineStatus(vaultAddress?: `0x${string}`) {
-  const cardBoundMode = isCardBoundVaultMode()
-
-  const { data: paused, ... } = useReadContract({ /* card-bound */ });
-  const { data: quarantineUntil, ... } = useReadContract({ /* legacy panic guard */ });
-
-  const until = cardBoundMode ? 0 : quarantineUntil ? Number(quarantineUntil) : 0
-  return { quarantineUntil: until, isQuarantined: cardBoundMode ? !!paused : ..., supportsTimer: !cardBoundMode }
-}
+export function useQuarantineStatus(vaultAddress?: `0x${string}`) {
+  const { data: paused } = useReadContract({
+    address: vaultAddress,
+    abi: CARD_BOUND_VAULT_ABI,
+    functionName: 'paused',
+    query: { enabled: !!vaultAddress },
+  });
+  return { quarantineUntil: 0, isQuarantined: !!paused, supportsTimer: false };
+}
```

Apply similarly to all other places that gate on `!cardBoundMode`.

After this, `isCardBoundVaultMode()` and `ACTIVE_VAULT_IMPLEMENTATION` become trivial constants. Consider removing them entirely:

```diff
 // lib/contracts.ts
-export const isCardBoundVaultMode = (): boolean => true;
-export const ACTIVE_VAULT_ABI = CARD_BOUND_VAULT_ABI;
-export type VaultImplementation = 'cardbound';
-export const ACTIVE_VAULT_IMPLEMENTATION: VaultImplementation = resolveVaultImplementation();
```

Replace usages: `import { CARD_BOUND_VAULT_ABI } from '@/lib/contracts'`.

**Verification:** `tsc --noEmit` clean. Search for `isCardBoundVaultMode\|cardBoundMode\b` returns zero results outside of removal commits.

---

## ABI-07 — `contracts/future/` contracts have address slots in env var map

**Severity:** Low
**Location:** `lib/contracts.ts:80-122` (CONTRACT_ENV_VAR_MAP), `CONTRACT_ADDRESSES`

### What's wrong

Several contracts that live in `contracts/future/` (declared not deployment-ready per memory) have entries in `CONTRACT_ENV_VAR_MAP` and `CONTRACT_ADDRESSES`:

- `BadgeNFT` → `NEXT_PUBLIC_BADGE_NFT_ADDRESS`
- `SeerGuardian` → `NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS`
- `CouncilElection` → `NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS`
- `CouncilSalary` → `NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS`
- `SubscriptionManager` → `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS`

(These match contracts physically located under `contracts/future/`.)

### Impact

If env vars are set during testing or by accident, hooks that read these addresses will resolve and start calling pre-production contracts.

### Fix

Move entries to a separate file that's only loaded in `NEXT_PUBLIC_FUTURE_FEATURES_ENABLED=true` mode, or remove entirely until each contract is production-ready:

```typescript
// lib/contracts/future-contracts.ts
//
// These contracts live in contracts/future/ and are NOT deployment-ready.
// Importing this file should be gated on NEXT_PUBLIC_FUTURE_FEATURES_ENABLED.

if (process.env.NEXT_PUBLIC_FUTURE_FEATURES_ENABLED !== 'true') {
  throw new Error('future-contracts loaded but feature flag is not enabled');
}

export const FUTURE_CONTRACT_ADDRESSES = {
  BadgeNFT: validateContractAddress(process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS, 'BadgeNFT'),
  SeerGuardian: validateContractAddress(process.env.NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS, 'SeerGuardian'),
  // ...
};
```

And remove these from the main `CONTRACT_ADDRESSES`. Any frontend code that uses them must be guarded behind a feature flag.

**Verification:** `grep -r "CONTRACT_ADDRESSES.BadgeNFT" --include='*.ts*'` should return zero results outside of `future-contracts.ts` and feature-flagged components.

---

## WALLET-01 — `VFIDEWalletProvider` returns random addresses for embedded auth

**Severity:** High
**Location:** `lib/wallet/VFIDEWalletProvider.tsx:160-205`

### What's wrong

`authenticateWithProvider` and `ensureVaultExists` are placeholders that simulate the flow with `Math.random()`:

```typescript
async function authenticateWithProvider(...) {
  await new Promise(r => setTimeout(r, 1500));
  return {
    address: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    // ...
  };
}
```

Currently safe because `lib/providers/Web3Providers.tsx` mounts `RainbowKitProvider`, not `VFIDEWalletProvider`. But the file's own comment instructs the next dev to wire it in:

> "Replace RainbowKitProvider in Web3Providers with VFIDEWalletProvider. Replace `<ConnectButton />` with `<AccountButton />`."

If anyone follows that without first replacing the placeholders, the app ships a wallet that returns a fresh random address per signin, JWTs are issued for nonexistent wallets, vault addresses are fabricated, and the users table fills with random rows.

### Impact

Migration hazard. The fallback in the sister file (`EmbeddedWalletAdapter.tsx`) at least throws "not configured" — `VFIDEWalletProvider`'s fallback is silent and dangerous.

### Fix

Replace the placeholder with a hard error:

```diff
 async function authenticateWithProvider(
   method: AuthMethod,
   credential?: string
 ): Promise<{ address: string; displayName: string | null; email: string | null }> {
-  // Placeholder — simulates the flow
-  await new Promise(r => setTimeout(r, 1500));
-  return {
-    address: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
-    displayName: method === 'email' ? credential?.split('@')[0] ?? null : null,
-    email: method === 'email' ? credential ?? null : null,
-  };
+  throw new Error(
+    `Embedded wallet provider not configured. Install one of: ` +
+    `@privy-io/react-auth, @web3auth/modal, magic-sdk. ` +
+    `Then replace this stub with the real authenticate flow. ` +
+    `See lib/wallet/VFIDEWalletProvider.tsx for integration sketches.`
+  );
 }

 async function ensureVaultExists(_address: string): Promise<{ vaultAddress: string }> {
-  // Placeholder
-  await new Promise(r => setTimeout(r, 1000));
-  return {
-    vaultAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
-  };
+  throw new Error(
+    'ensureVaultExists not implemented. Replace with VaultHub.ensureVault call.'
+  );
 }
```

Then when a developer follows the migration comment and wires `VFIDEWalletProvider` into the tree, the app crashes loudly at signin attempt rather than silently authenticating random wallets.

When the SDK is actually installed, replace the stubs with real Privy/Web3Auth calls per the comment-block sketches at lines 167-177.

**Verification:** mount `VFIDEWalletProvider` into a test page, attempt `signIn('email', 'test@example.com')` → should throw "not configured", not return a fake address.

---

## WALLET-02 — `AccountButton` requires unmounted `VFIDEWalletProvider`

**Severity:** High
**Location:** `lib/wallet/AccountButton.tsx:13`, `lib/providers/Web3Providers.tsx`

### What's wrong

`AccountButton` calls `useVFIDEWallet()` which throws if `VFIDEWalletProvider` isn't a parent. The active provider tree mounts `RainbowKitProvider` instead. So `<AccountButton />` is unrenderable — anyone who tries it gets `"useVFIDEWallet must be used within VFIDEWalletProvider"`.

Currently dead (no page imports `AccountButton`), but lives in the codebase as a hazard.

### Impact

Same migration hazard as WALLET-01. Pair it with WALLET-01 as a single fix.

### Fix

Two options depending on what you want the wallet UX to be:

**Option A — keep `AccountButton` as the planned UI, fix `VFIDEWalletProvider`:**

Apply WALLET-01 (make stubs throw). Document in `Web3Providers.tsx`:

```typescript
// lib/providers/Web3Providers.tsx
//
// CURRENT: uses RainbowKit.
// PLANNED MIGRATION: Switch to VFIDEWalletProvider after wiring an embedded wallet SDK.
// Migration is gated on:
//   1. lib/wallet/VFIDEWalletProvider.tsx stubs replaced with real SDK calls (Privy/Web3Auth).
//   2. ensureVaultExists wired to VaultHub.ensureVault.
// DO NOT swap RainbowKitProvider → VFIDEWalletProvider until both are done.
```

**Option B — delete the unused custom wallet stack:**

If you're sticking with RainbowKit indefinitely, remove `lib/wallet/AccountButton.tsx`, `lib/wallet/VFIDEWalletProvider.tsx`, `lib/wallet/EmbeddedWalletAdapter.tsx`. Keep only `lib/wallet/walletUXEnhancements.ts` (utilities) and `lib/wallet/index.ts`.

```bash
git rm lib/wallet/AccountButton.tsx lib/wallet/VFIDEWalletProvider.tsx lib/wallet/EmbeddedWalletAdapter.tsx
```

This eliminates the migration hazard entirely.

**Verification:** if Option A — manually mount `VFIDEWalletProvider` in a dev environment and confirm `AccountButton` renders without runtime error (will throw on signin until SDK is installed, per WALLET-01). If Option B — `tsc --noEmit` clean after deletes.

---

## WS-01 — Rate limiter race: INCR before EXPIRE

**Severity:** High
**Location:** `websocket-server/src/rateLimit.ts:85-118`

### What's wrong

```typescript
const incrUrl = `${this.redisUrl!.replace(/\/$/, '')}/incr/${encodeURIComponent(redisKey)}`;
const incrResponse = await fetch(incrUrl, { method: 'POST', headers: {...} });
// ...
const count = Number(incrData.result ?? 0);

if (count === 1) {
  const ttlSeconds = Math.max(1, Math.ceil(this.windowMs / 1000) + 5);
  const expireUrl = `${this.redisUrl!.replace(/\/$/, '')}/expire/${encodeURIComponent(redisKey)}/${ttlSeconds}`;
  const expireResponse = await fetch(expireUrl, { method: 'POST', headers: {...} });
  if (!expireResponse.ok) throw new Error(`Upstash EXPIRE failed: HTTP ${expireResponse.status}`);
}
return count <= this.maxRequests;
```

Race conditions:

1. Two workers race INCR. Worker A sees count=1, starts EXPIRE. Worker B sees count=2, skips EXPIRE. If A's EXPIRE call fails, the key has no TTL. Forever.
2. EXPIRE network failure → key has no TTL → counter accumulates → eventually exceeds `maxRequests` → that key is permanently rate-limited.

### Impact

A single Upstash transient failure can permanently rate-limit any key the failure happened on. Over time, more keys accumulate in this state. Real users get unable to connect or send messages.

### Fix

Use Upstash's atomic SET-with-EX or a Lua script. The cleanest approach is `EVAL`:

```typescript
// websocket-server/src/rateLimit.ts

private async allowRedis(key: string): Promise<boolean> {
  const now = Date.now();
  const windowIndex = Math.floor(now / this.windowMs);
  const redisKey = `ws:rl:${this.name}:${key}:${windowIndex}`;
  const ttlSeconds = Math.max(1, Math.ceil(this.windowMs / 1000) + 5);

  // Atomic INCR + EXPIRE-on-first-call via Lua.
  // Returns the post-INCR count.
  const lua = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
    end
    return count
  `;

  const evalUrl = `${this.redisUrl!.replace(/\/$/, '')}/eval`;
  const response = await fetch(evalUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this.redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: lua,
      keys: [redisKey],
      arguments: [String(ttlSeconds)],
    }),
  });

  if (!response.ok) {
    throw new Error(`Upstash EVAL failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { result?: number };
  const count = Number(data.result ?? 0);
  return count <= this.maxRequests;
}
```

Note: Upstash's REST API supports EVAL since 2023. Verify your account's plan supports it.

If EVAL isn't available, fall back to fixing the leaked TTL by using EXPIRE unconditionally:

```typescript
// Less elegant: always set EXPIRE, accepting the redundant write.
// EXPIRE on a key with TTL is a no-op (it resets TTL); not free but bounded.
const incrResponse = await fetch(incrUrl, { method: 'POST', ... });
const count = Number(incrData.result ?? 0);

// ALWAYS set EXPIRE — accept the cost of redundant writes.
const expireResponse = await fetch(expireUrl, { method: 'POST', ... });
if (!expireResponse.ok) {
  // EXPIRE failure is recoverable — log but don't fail the request.
  console.warn(`[ws] EXPIRE failed for ${redisKey}: HTTP ${expireResponse.status}`);
}

return count <= this.maxRequests;
```

Combine with a periodic janitor that scans for keys without TTL and applies one (via SCAN + TTL + EXPIRE).

**Verification:** simulate Upstash failure during EXPIRE call → confirm subsequent calls don't get permanently locked. Use a test that artificially fails 50% of EXPIRE calls and asserts that no key stays uncapped after 1 minute.

---

## WS-02 — Topic ACL fail-open mode in non-production

**Severity:** Medium
**Location:** `websocket-server/src/index.ts:43-47, 337-341, 378-379`

### What's wrong

```typescript
const TOPIC_ACL_ALLOW_MISSING = !IS_PRODUCTION && process.env.WS_TOPIC_ACL_ALLOW_MISSING === 'true';

if (IS_PRODUCTION && process.env.WS_TOPIC_ACL_ALLOW_MISSING === 'true') {
  console.warn('[ws] Ignoring WS_TOPIC_ACL_ALLOW_MISSING=true in production (topic ACL remains fail-closed).');
}
```

In production the flag is hard-disabled at boot, but only warned about — not refused. An operator could miss the warning and assume the flag is honored.

### Impact

Production is technically safe (`TOPIC_ACL_ALLOW_MISSING` is forced to false). But the warning model is fragile — any future bug that changes the gate could enable fail-open in production.

### Fix

Refuse to boot if the production+unsafe combination is set:

```diff
 const TOPIC_ACL_ALLOW_MISSING = !IS_PRODUCTION && process.env.WS_TOPIC_ACL_ALLOW_MISSING === 'true';

 if (IS_PRODUCTION && process.env.WS_TOPIC_ACL_ALLOW_MISSING === 'true') {
-  console.warn('[ws] Ignoring WS_TOPIC_ACL_ALLOW_MISSING=true in production (topic ACL remains fail-closed).');
+  console.error('[ws] FATAL: WS_TOPIC_ACL_ALLOW_MISSING=true is not permitted in production.');
+  process.exit(1);
 }
```

Also enforce that an ACL path is configured in production:

```diff
 function startTopicAclRefresh(): void {
   if (!TOPIC_ACL_PATH) {
+    if (IS_PRODUCTION) {
+      console.error('[ws] FATAL: WS_TOPIC_ACL_PATH is required in production.');
+      process.exit(1);
+    }
     if (TOPIC_ACL_ALLOW_MISSING) {
       console.warn('[ws] No WS_TOPIC_ACL_PATH configured; topic ACL in compatibility allow mode.');
     } else {
       console.warn('[ws] No WS_TOPIC_ACL_PATH configured; topic ACL is fail-closed.');
     }
     return;
   }
```

**Verification:** start the WS server with `NODE_ENV=production` and `WS_TOPIC_ACL_ALLOW_MISSING=true` → process exits with code 1. Start with `NODE_ENV=production` and no `WS_TOPIC_ACL_PATH` → exits with code 1.

---

## WS-03 — Chat topic granularity depends on ACL configuration

**Severity:** Medium
**Location:** `websocket-server/src/index.ts:239-247, 387-403`

### What's wrong

`isAllowedTopic` accepts any topic prefixed with `chat.`, `proposal.`, `presence.`. The actual access control then depends on the `topicAclSnapshot.grants` shape. If an operator misconfigures `chat.*: ['*']`, every chat (including DMs) is broadcast to every authenticated client.

### Impact

Operational risk, not a code bug. But the topic naming convention doesn't enforce per-conversation isolation by structure.

### Fix

Adopt a topic naming convention that embeds the participants and have `isAuthorizedForTopic` enforce participant membership directly, independent of ACL config:

```typescript
// websocket-server/src/index.ts

function isAuthorizedForTopic(client: AuthenticatedSocket, topic: string, refreshForSubscribe = false): boolean {
  if (!isAllowedTopic(topic)) return false;
  if (!client.vfideAddress) return false;

  // Structural enforcement for chat topics.
  // Convention: chat.<addrA>_<addrB>  with addrA < addrB lexicographically.
  if (topic.startsWith('chat.')) {
    const participants = topic.slice('chat.'.length).split('_');
    if (participants.length !== 2) return false;
    const [a, b] = participants.map(p => p.toLowerCase());
    if (!/^0x[a-f0-9]{40}$/.test(a) || !/^0x[a-f0-9]{40}$/.test(b)) return false;
    if (a >= b) return false; // enforce canonical ordering
    const me = client.vfideAddress.toLowerCase();
    if (me !== a && me !== b) return false;
    return true; // Participant of this DM
  }

  // Structural enforcement for presence topics.
  // Convention: presence.<addr>
  if (topic.startsWith('presence.')) {
    const subject = topic.slice('presence.'.length).toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(subject)) return false;
    return subject === client.vfideAddress.toLowerCase();
  }

  // For proposal.* and other topics, fall back to ACL-snapshot logic.
  ensureFreshTopicAclSnapshot(refreshForSubscribe);
  if (!topicAclSnapshot) return false;

  const address = client.vfideAddress.toLowerCase();
  for (const [grantTopic, addresses] of Object.entries(topicAclSnapshot.grants)) {
    if (!topicMatchesGrant(topic, grantTopic)) continue;
    if (addresses.includes('*') || addresses.map(e => e.toLowerCase()).includes(address)) {
      return true;
    }
  }
  return false;
}
```

Now even a misconfigured ACL can't expose chat topics — the structure of the topic name itself locks access to participants.

For chat producer side: when sending to `chat.<addrA>_<addrB>`, sort the addresses canonically:

```typescript
function chatTopic(a: string, b: string): string {
  const lower = [a.toLowerCase(), b.toLowerCase()].sort();
  return `chat.${lower[0]}_${lower[1]}`;
}
```

**Verification:** as user A, attempt to subscribe to `chat.0xB_0xC` → denied. Subscribe to `chat.0xA_0xB` (with canonical ordering) → allowed.

---

## AUTH-01 — EIP-1271 trust assumption documented but not build-enforced

**Severity:** Low
**Location:** `app/api/auth/route.ts:155-160`

### What's wrong

`verifyMessage` falls back to `eth_call` for contract addresses (EIP-1271). The auth route documents the trust assumption: "no deployed vault contract has a permissive `isValidSignature`." A repo-wide grep confirms today: zero `isValidSignature` implementations in `contracts/`.

But this assumption is unenforced. A future contract change could introduce one, and the auth layer would silently trust it.

### Impact

If anyone adds an `isValidSignature` that returns the magic value 0x1626ba7e unconditionally, that contract's address can authenticate as itself with any signature. Currently not exploitable.

### Fix

Add a compile-time assertion via a CI script:

```bash
# scripts/check-no-eip1271.sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if grep -rn "isValidSignature" contracts/ --include="*.sol" >/dev/null 2>&1; then
  echo "ERROR: EIP-1271 isValidSignature implementation detected:"
  grep -rn "isValidSignature" contracts/ --include="*.sol"
  echo
  echo "If this is intentional, update lib/auth/eip1271-allowlist.json"
  echo "to whitelist the specific contract and remove this check, then update"
  echo "app/api/auth/route.ts to validate signatures only against allowlisted contracts."
  exit 1
fi

echo "OK: no isValidSignature implementations in contracts/"
```

Wire into `package.json`:

```json
{
  "scripts": {
    "check:eip1271": "bash scripts/check-no-eip1271.sh",
    "validate:production": "... && npm run check:eip1271 && ..."
  }
}
```

**Alternative:** if you want to allow EIP-1271 for specific known-safe contracts (e.g., Safe wallets), add an allowlist:

```typescript
// lib/auth/eip1271-allowlist.ts
export const EIP1271_ALLOWED_CONTRACTS: readonly `0x${string}`[] = [
  // '0x...' — Safe MultiSig at known address
];

// app/api/auth/route.ts
const code = await publicClient.getCode({ address: address as `0x${string}` });
if (code && code !== '0x') {
  // Contract address — only allow if explicitly allowlisted.
  if (!EIP1271_ALLOWED_CONTRACTS.includes(address.toLowerCase() as `0x${string}`)) {
    return NextResponse.json({ error: 'Contract addresses not supported for auth' }, { status: 401 });
  }
}
const isValid = await verifyMessage({ address: ..., message, signature });
```

**Verification:** `npm run check:eip1271` exits 0. Add a fake `isValidSignature` to a test contract → CI fails.

---

## AUTH-02 — `verifyToken` re-throws on Redis revocation-store failure

**Severity:** Medium
**Location:** `lib/auth/jwt.ts:184-191`

### What's wrong

If Upstash Redis is briefly unavailable, `isTokenRevoked` throws → `verifyToken` re-throws (in non-test environments). Upstream callers usually catch this in a generic try/catch and return 401 to the user.

### Impact

Brief Redis outages cause auth to fail for all users — even though their tokens are valid. The fail-closed behavior is correct from a security standpoint, but the lack of any recovery mode means a 30-second Redis blip causes a 30-second app outage for all authenticated users.

### Fix

Add a circuit breaker that downgrades to "fail-open with warning" after N consecutive failures, with an explicit log signal:

```typescript
// lib/auth/jwt.ts

let revocationCheckFailures = 0;
let revocationCheckSuppressedUntil = 0;
const FAILURE_THRESHOLD = 5;
const SUPPRESSION_WINDOW_MS = 30_000;

async function checkRevocationWithCircuitBreaker(token: string, decoded: JWTPayload): Promise<boolean> {
  const now = Date.now();
  if (now < revocationCheckSuppressedUntil) {
    // Circuit open — skip the check, log
    logger.warn('[JWT] Revocation check suppressed (circuit open)', {
      address: decoded.address,
      until: revocationCheckSuppressedUntil,
    });
    return false; // Treat as not-revoked
  }

  try {
    const tokenHash = await hashToken(token);
    const revoked = await isTokenRevoked(tokenHash);
    if (revoked) return true;

    const userRevocation = await isUserRevoked(decoded.address);
    if (userRevocation?.revoked) {
      const revokedAt = userRevocation.revokedAt ?? 0;
      const issuedAt = decoded.iat ?? 0;
      if (revokedAt > issuedAt) return true;
    }

    revocationCheckFailures = 0; // reset on success
    return false;
  } catch (error) {
    revocationCheckFailures++;
    if (revocationCheckFailures >= FAILURE_THRESHOLD) {
      revocationCheckSuppressedUntil = now + SUPPRESSION_WINDOW_MS;
      logger.error('[JWT] Revocation check circuit BROKEN — failing open for 30s', {
        consecutiveFailures: revocationCheckFailures,
      });
    } else {
      logger.warn('[JWT] Revocation check failed', {
        attempt: revocationCheckFailures,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return false; // Fail open during outage
  }
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  // ... existing JWT verify against current/prev secret ...

  if (!decoded) return null;

  if (await checkRevocationWithCircuitBreaker(token, decoded)) {
    return null;
  }
  return decoded;
}
```

**Trade-off note:** "fail open during outage" means a successfully-revoked token might be accepted for up to 30 seconds after Redis dies. This is a deliberate availability/security trade. If you'd rather always fail closed, leave the current behavior and live with the user-facing outages during Redis blips.

**Verification:** simulate Redis unreachable for 60s. With current code, all auth fails for 60s. With fix, first 5 requests fail, then the next 30s of requests succeed (with warning logs).

---

## DEAD-01 — Social commerce components exist but unrendered

**Severity:** Low
**Location:** `components/social/ShoppablePost.tsx`, `PurchaseProofEvent.tsx`, `ShareProductToFeed.tsx`, `SocialCommerce.tsx`

### What's wrong

These components are built but not referenced from any page in `app/`. Search results:

```
$ grep -rln "ShoppablePost\|PurchaseProofEvent\|<SocialCommerce" app/
(no output)
```

### Impact

Code maintenance burden, tests run against unreachable code, dead branch coverage skews metrics.

### Fix

Two options:

**Option A — wire them in.** If social commerce is a planned feature, add to `app/feed/page.tsx`:

```typescript
// app/feed/page.tsx
import { ShoppablePost, PurchaseProofEvent } from '@/components/social';

export default function FeedPage() {
  // ... fetch feed events ...
  return (
    <>
      {events.map(ev => {
        if (ev.type === 'product_share') return <ShoppablePost key={ev.id} event={ev} />;
        if (ev.type === 'purchase') return <PurchaseProofEvent key={ev.id} event={ev} />;
        return <DefaultEvent key={ev.id} event={ev} />;
      })}
    </>
  );
}
```

**Option B — delete.** If not actively planned for next milestone, delete the components and their tests. Restore from git when needed.

```bash
git rm -r components/social/ShoppablePost.tsx components/social/PurchaseProofEvent.tsx components/social/ShareProductToFeed.tsx components/social/SocialCommerce.tsx components/social/social-commerce-types.ts
git rm -r __tests__/social/  # if any tests are dedicated to these
```

**Verification:** `tsc --noEmit` clean after either action.

---

# Appendix: Suggested PR Sequencing

Group these fixes into PRs that minimize cross-dependencies. Order is suggested for safe incremental rollout.

## PR-1: Frontend Infrastructure (foundational, low risk)

**Includes:** INFRA-01, INFRA-02, ABI-01, ABI-02, ABI-06, DEAD-01.

- Rename `proxy.ts` → `middleware.ts`, fix export name.
- Wire nonce into `app/layout.tsx`, drop `'unsafe-inline' 'unsafe-eval'` from `next.config.ts`.
- Delete 22 orphan ABI files and clean up `lib/abis/index.ts` imports.
- Delete dead `!cardBoundMode` branches in `useSecurityHooks.ts` and friends.
- Decide WALLET-02 Option A or B — delete unused wallet stack OR document the migration constraint.
- Delete dead social commerce components (or wire them in if planned for the same release).
- Add `scripts/check-abi-parity.sh` to CI.
- Add `scripts/check-no-eip1271.sh` to CI (AUTH-01).

**Risk:** Low — these are dead-code removals and config corrections.

## PR-2: Authentication & Database (medium risk)

**Includes:** DB-01, DB-02, DB-04, AUTH-02.

- New migration: drop `users_read_public`, add `users_insert_own`, add `FORCE ROW LEVEL SECURITY`.
- New migration: create `users_public` view with non-sensitive columns.
- Codemod authenticated routes to use `withAuth`.
- Add `withOwnership` wrapper.
- Add Redis circuit breaker to `verifyToken`.
- Add the runtime assertion that warns when `dbUserContext` is unset on authenticated query paths.

**Risk:** Medium — migration changes are reversible but require careful ordering. Run on staging first.

## PR-3: Smart Contract Fixes (high risk, requires audit)

**Includes:** TOKEN-01, TOKEN-02, TOKEN-03, FRAUD-01, FRAUD-02, FRAUD-03, VAULT-01.

- Add `_resolveCustomerScoringAddress` in MerchantPortal.
- Cache `_resolveFeeScoringAddress` in `_transfer`.
- Refactor `emergency_pauseAll` into `propose`+`confirm` two-stage.
- Add complaint epoch to FraudRegistry; bump on `clearFlag`.
- Don't advance cursor on silent `seer.punish` failure.
- Snapshot `recipientOwner` at `escrowTransfer` time.
- Snapshot destination code hash at queue time in CardBoundVault.

**Risk:** High — these are contract changes. Need full re-audit of FraudRegistry and CardBoundVault before mainnet. Test exhaustively on testnet.

## PR-4: Bridge & Faucet (high risk, contracts not yet deployment-ready)

**Includes:** BRIDGE-01, BRIDGE-02, FAUCET-01, FAUCET-02, FAUCET-03, FAUCET-04.

- Make `refundWindowCosigner` mandatory OR delete owner-driven refund window in Bridge.
- Add `_bridgeIsSystemExempt` check to `finalizeStaleBridgeRefund`.
- Add boot-time guard against unsafe faucet signer in production.
- Make faucet `claim` non-blocking; client polls for receipt.
- Make `batchClaim` skip-on-failure with `pendingGasTopUp` retry path.
- Add `MIN_REFERRER_SCORE` requirement to faucet.

**Risk:** High — Bridge is already flagged as not-deployment-ready. These changes can land alongside that work.

## PR-5: Frontend Hooks & Architecture (high impact)

**Includes:** ABI-03, ABI-04, ABI-05, ABI-07, INFRA-03.

- Delete `BurnRouter` alias in `lib/contracts.ts`.
- Migrate `usePayment.ts` to `ProofScoreBurnRouterABI` and `computeFees`.
- Decision: restore or delete `CommerceEscrow` — and follow through in `useEscrow.ts`, `PayContent.tsx`, `PaymentInterface.tsx`.
- Move `contracts/future/` addresses to gated `future-contracts.ts`.
- Refactor `CONTRACT_ADDRESSES` to per-chain registry. (Largest single change — could be its own PR.)

**Risk:** High — `usePayment` and `useEscrow` touch the merchant payment flow. End-to-end testing required across all supported chains.

## PR-6: API Hardening (cleanup)

**Includes:** API-01, API-02, API-03, DB-03.

- Either delete `/api/analytics/portfolio/[address]` or add migration + auth.
- Refactor `/api/activities/[address]` to call handler directly instead of internal `fetch`.
- Replace manual body parsing with Zod schemas across `merchant/locations`, `merchant/gift-cards`, `subscriptions`, etc.

**Risk:** Low — pure cleanup.

## PR-7: WebSocket (medium risk)

**Includes:** WS-01, WS-02, WS-03.

- Atomic INCR+EXPIRE via Lua in WS rate limiter.
- Hard-fail boot on unsafe ACL config in production.
- Structural topic-name enforcement for chat/presence topics.

**Risk:** Medium — touches WS auth. Test topic-name canonicalization carefully.

## PR-8: Wallet Adapter (post-SDK-decision)

**Includes:** WALLET-01.

- Replace `Math.random()` stubs with hard errors OR with real Privy/Web3Auth SDK calls.
- Defer WALLET-02 until the SDK decision is final.

**Risk:** Low if just adding throws; high if wiring real SDK (which is a separate workstream).

