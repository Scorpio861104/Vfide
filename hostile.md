# VFIDE Hostile Security Audit — Full Report

**Date:** April 3, 2026  
**Scope:** Full codebase — 68 production Solidity contracts (~30K LOC), 87 API routes, WebSocket server, database layer  
**Methodology:** Adversarial line-by-line review, pattern scanning, access control verification  
**Auditor posture:** Hostile — assuming attacker with full source access and unlimited time

---

## Executive Summary

The VFIDE codebase has been through multiple prior audit rounds and shows significant hardening. Most of the previously identified issues (H-01 through H-23, F-01 through F-32, etc.) have been properly addressed. However, this hostile pass identifies **3 Critical**, **5 High**, **8 Medium**, and **6 Low** findings, including one **mainnet-blocking** issue.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 3 | Must fix before mainnet |
| High | 5 | Must fix before mainnet |
| Medium | 8 | Should fix before mainnet |
| Low | 6 | Fix when convenient |

---

## CRITICAL Findings

### C-NEW-1: DAO Governance Permanent Brick — MAX_PROPOSALS Without Decrement

**Contract:** `DAO.sol` (line 441)  
**Severity:** CRITICAL — Governance permanently disabled  
**Status:** MAINNET BLOCKER

`proposalCount` is a monotonically increasing counter capped at `MAX_PROPOSALS = 200`. The `withdrawProposal()` function zeroes out proposal data but does **not** decrement `proposalCount`. Once 200 proposals have ever been created (including withdrawn, expired, and executed), the require check on line 441 permanently reverts all future proposals:

```solidity
require(proposalCount < MAX_PROPOSALS, "DAO: proposal cap reached");
```

**Attack scenario:** An attacker with governance eligibility submits 200 spam proposals (1-hour cooldown × 200 = ~8.3 days). Even if all are withdrawn or expired, governance is permanently dead. The attacker doesn't even need vote weight — just eligibility to propose.

**Impact:** Permanent DAO governance shutdown. No proposals can ever be created again. Emergency quorum rescue and timelock replacement cannot help because they don't affect the proposal cap.

**Fix:** Either decrement `proposalCount` on withdrawal/expiry, or replace the counter cap with a cap on *active* proposals using a separate `activeProposalCount` that decrements when proposals are finalized, withdrawn, or expired.

---

### C-NEW-2: Missing Cancel Functions for Treasury/Sanctum Sink Timelocks

**Contract:** `VFIDEToken.sol`  
**Severity:** CRITICAL — Irrecoverable misconfiguration

`setTreasurySink()` and `setSanctumSink()` schedule 48-hour timelocked changes but have **no cancel functions**. Every other timelocked change in VFIDEToken (`cancelVaultHub`, `cancelSecurityHub`, `cancelLedger`, `cancelBurnRouter`, `cancelPendingExempt`, `cancelPendingWhitelist`) has a cancel counterpart.

**Impact:** If the owner accidentally proposes a wrong treasury or sanctum sink address, there is no way to cancel. The owner must either:
1. Wait 48 hours and apply the wrong address, then schedule another change (96 hours total to fix a typo)
2. There is no option 2 — the pending change cannot be undone

Worse, the pending state variables block new proposals: `require(pendingTreasurySinkAt == 0, "VF: pending treasury sink exists")`. So the owner cannot even schedule the correct address until the bad one is applied.

**Fix:** Add `cancelTreasurySink()` and `cancelSanctumSink()` functions matching the pattern of all other cancel functions.

---

### C-NEW-3: FeeDistributor.receiveFee() Has No Access Control — Accounting Corruption

**Contract:** `FeeDistributor.sol` (line 118)  
**Severity:** CRITICAL — Protocol accounting permanently corrupted

```solidity
function receiveFee(uint256 amount) external {
    totalReceived += amount;
    emit FeeReceived(amount);
}
```

Anyone can call this function with an arbitrary `amount` to inflate `totalReceived` without actually sending any tokens. This variable is used for protocol-level accounting and analytics dashboards.

**Impact:** 
- `totalReceived` can be inflated to `type(uint256).max`, permanently corrupting all fee analytics
- Dashboards showing fee revenue will display fabricated numbers
- The `totalReceived - totalDistributed` delta (undistributed balance) becomes meaningless
- Could mislead investors, regulators, and users about protocol revenue

**Fix:** Either restrict to `onlyRole(ADMIN_ROLE)` or remove the function entirely (since `distribute()` reads `balanceOf(address(this))` directly and doesn't use `totalReceived` for distribution logic).

---

## HIGH Findings

### H-NEW-1: Unauthenticated Security Fraud Event Endpoints — Alert Fatigue Attack

**Routes:** 
- `app/api/security/recovery-fraud-events/route.ts`
- `app/api/security/next-of-kin-fraud-events/route.ts`  
- `app/api/security/qr-signature-events/route.ts`

These POST endpoints accept fraud event reports without any authentication. Rate limiting is the only protection, and rate limits are per-IP (easily bypassed with rotating proxies).

**Attack scenario:** An attacker floods these endpoints with thousands of fake fraud alerts. Security monitoring systems are overwhelmed with false positives, causing operators to miss real attacks (alert fatigue). The in-memory `recoveryFraudStore` array is capped at 1,000 entries, so legitimate events get evicted by fake ones.

**Fix:** Require JWT authentication on POST. Keep GET unauthenticated (or admin-only) for monitoring dashboards.

---

### H-NEW-2: FeeDistributor Frozen/Blacklisted — Permanent Fee Distribution Halt

**Contract:** `FeeDistributor.sol` + `VFIDEToken.sol`

The `distribute()` function calls `vfideToken.burn(toBurn)`. The `burn()` function in VFIDEToken checks:
```solidity
if (isBlacklisted[msg.sender] || isFrozen[msg.sender]) revert VF_SanctionedAddress();
```

If the FeeDistributor contract address is frozen or blacklisted (even accidentally), all fee distribution permanently halts — the contract cannot burn, and the burn is required before transfers.

**Impact:** Complete halt of all five fee distribution channels (burn, sanctum, DAO payroll, merchant pool, headhunter pool). No protocol revenue reaches any destination.

**Fix:** Either (a) auto-exempt the FeeDistributor via `systemExempt` at deployment, or (b) add a fallback path in `distribute()` that skips the burn and redistributes to other channels if `burn()` reverts.

---

### H-NEW-3: Anti-Whale Day Boundary Double-Spend

**Contract:** `VFIDEToken.sol`  
**Functions:** `_checkWhaleProtection()`, `_recordActualDailyTransfer()`

Daily limits reset at UTC midnight boundaries using `(block.timestamp / 1 days) * 1 days`. A user can transfer the full daily limit at 23:59:59 UTC and again at 00:00:00 UTC, effectively doubling throughput in a 2-second window.

**Impact:** With `dailyTransferLimit = 5_000_000e18`, an attacker can move 10M VFIDE in seconds. This defeats the anti-whale protection's intended purpose.

**Fix:** Use a rolling 24-hour window instead of day-boundary resets, or accept the 2x boundary condition as an acceptable trade-off (document the decision).

---

### H-NEW-4: DAO Emergency Approver Self-Approval When Approver Is Contract

**Contract:** `DAO.sol`

The emergency quorum rescue and timelock replacement mechanisms require dual approval (admin + emergencyApprover). However, when `emergencyApprover` is a contract (code.length > 0), the two-party check is bypassed:

```solidity
bool approverIsContract = emergencyApprover.code.length > 0;
if (!approverIsContract) {
    require(msg.sender != emergencyRescueInitiator, "DAO: initiator cannot self-approve");
}
```

Since `emergencyApprover` is initialized to the timelock (a contract) in the constructor, the admin can self-approve emergency actions at deployment, defeating the two-party security requirement.

**Impact:** Admin can unilaterally execute emergency quorum rescues and timelock replacements without a second party.

**Fix:** Require the approver to explicitly call `approve*()` even if it's a contract. If the concern is that the timelock can't make function calls, consider initializing `emergencyApprover` to an EOA or a multisig.

---

### H-NEW-5: ProofScoreBurnRouter — Score History Manipulation via Rapid updateScore Calls

**Contract:** `ProofScoreBurnRouter.sol`

`updateScore()` is restricted to `address(seer)` (F-26 fix), but if the Seer contract calls it rapidly (32+ times in sequence), the circular buffer overwrites all history with near-identical timestamps. The time-weighted score then equals the latest score, eliminating the smoothing effect.

**Impact:** If Seer is compromised or has a bug that triggers rapid score updates, the 7-day averaging window becomes meaningless, allowing instant fee manipulation.

**Fix:** Add a minimum interval between score updates per user (e.g., 1 hour), or ensure Seer itself rate-limits calls.

---

## MEDIUM Findings

### M-NEW-1: EcosystemVault.allocateIncoming() Rounding Dust Accumulation

**Contract:** `EcosystemVault.sol`

The allocation uses integer division across three pools:
```solidity
uint256 toCouncil = (unallocated * councilBps) / MAX_BPS;
uint256 toMerchant = (unallocated * merchantBps) / MAX_BPS;
uint256 toHeadhunter = (unallocated * headhunterBps) / MAX_BPS;
```

The remainder (up to 2 wei per allocation) is never assigned to any pool, creating a dust leak that accumulates over thousands of allocations. This dust is permanently trapped.

**Fix:** Assign the remainder to one pool: `toHeadhunter = unallocated - toCouncil - toMerchant - toOperations;`

---

### M-NEW-2: VaultHub.finalizeForceRecovery() — CEI Comment Is Misleading

**Contract:** `VaultHub.sol`

The comment says "CEI: External call to vault BEFORE registry update" but this is actually the **opposite** of CEI (Check-Effects-Interactions). The external call happens before state updates. While this is correct for this specific case (if the call fails, we want state unchanged), the misleading comment could cause future developers to misapply the pattern.

**Fix:** Correct the comment to: "External call first — if it fails, registry state remains unchanged (intentional divergence from CEI for this recovery path)."

---

### M-NEW-3: CardBoundVault — No Maximum Guardian Count

**Contract:** `CardBoundVault.sol`

There is no cap on `guardianCount`. A vault owner could add hundreds of guardians, making wallet rotation proposal iteration expensive and potentially hitting gas limits on chains with lower block gas limits.

**Fix:** Add `require(guardianCount < MAX_GUARDIANS, "CBV: max guardians");` (suggest MAX_GUARDIANS = 10).

---

### M-NEW-4: DAOTimelock.emergencyReduceDelay() — One-Shot With No Reset Path

**Contract:** `DAOTimelock.sol`

`emergencyDelayReduced` is a boolean that's set to `true` on the first emergency reduction and can only be reset via `setDelay()` (which requires `onlyTimelockSelf`). If the timelock is in a degraded state where normal governance can't execute, the emergency path is consumed after one use.

**Fix:** Reset `emergencyDelayReduced` automatically after a configurable cooldown (e.g., 30 days), or allow the admin to reset it after a timelock period.

---

### M-NEW-5: SystemHandover — No Abort Mechanism After Arming

**Contract:** `SystemHandover.sol`

Once `arm()` is called, the handover countdown is irreversible. There is no `disarm()` function. If a critical vulnerability is discovered during the countdown, the dev team cannot cancel the handover — they can only extend once (if extensions remain).

**Fix:** Add a `disarm()` function callable by `devMultisig` before `handoverAt` is reached, with appropriate logging.

---

### M-NEW-6: ProofScoreBurnRouter.computeFees() View/Execute Divergence

**Contract:** `ProofScoreBurnRouter.sol`

`computeFees()` (view) and `computeFeesAndReserve()` (state-changing) can return different burn amounts because `computeFeesAndReserve()` atomically updates `dailyBurnedAmount` while `computeFees()` reads a stale value. Frontend previews will diverge from actual execution in multi-transaction blocks.

**Impact:** Users see one fee preview but pay a different fee. This is acknowledged in the code comments but creates a poor UX.

**Fix:** Document clearly in the frontend that previews are approximate, or add a `previewFeesAccurate()` that simulates the atomic update.

---

### M-NEW-7: AdminMultiSig — Veto Window Can Close Before Community Can React

**Contract:** `AdminMultiSig.sol`

EMERGENCY proposals have `executionTime = block.timestamp` (0 delay) and can be executed immediately after 5/5 approval. The `VETO_WINDOW = 24 hours` applies from `executionTime`, but since emergency proposals can be executed at any point during the veto window, the community may have 0 seconds to react.

**Fix:** Add a minimum delay (even 1 hour) for emergency proposals to give the community a window.

---

### M-NEW-8: Performance Metrics Endpoint Unauthenticated

**Route:** `app/api/performance/metrics/route.ts`

This endpoint exposes internal performance metrics without authentication. While not directly exploitable, it leaks information about server load, response times, and error rates that an attacker can use for timing attacks or to identify optimal attack windows.

**Fix:** Require admin authentication or API key.

---

## LOW Findings

### L-NEW-1: VFIDEToken.renounceOwnership() — Uses `view` Modifier Unnecessarily

The function uses `external view` but calls `revert()`. While functionally correct (it always reverts), the `view` modifier is semantically wrong for a function whose purpose is to prevent an action.

### L-NEW-2: Inconsistent Timelock Delays Across Contracts

VFIDEToken uses 48h, ProofScoreBurnRouter uses 7 days, FeeDistributor uses 72h, EscrowManager uses 7 days, VaultHub uses 48h. There's no documented rationale for the varying delays.

### L-NEW-3: DevReserveVestingVault.setVestingStart() — 7-Day Future Window

The function allows setting `startTimestamp` up to 7 days in the future. While the comment explains this, an accidental future-dating delays the entire 5-year vesting schedule.

### L-NEW-4: Leaderboard Endpoint Unauthenticated

`app/api/leaderboard/headhunter/route.ts` is unauthenticated. While leaderboard data is public by nature, the endpoint could be scraped to build a competitive intelligence database.

### L-NEW-5: SharedInterfaces SafeERC20 — Missing forceApprove

The custom SafeERC20 implementation lacks `forceApprove()` (approve to 0 first, then to target amount), which is needed for USDT-like tokens that revert on non-zero to non-zero approval changes.

### L-NEW-6: FeeDistributor — No Re-entrancy on receiveFee()

`receiveFee()` lacks the `nonReentrant` modifier. While it only increments a counter and emits an event, consistency with the rest of the codebase suggests adding it.

---

## Previously Identified — Still Outstanding

### C-1 (KNOWN BLOCKER): ProofScore-to-Vault Mismatch

Status: **Partially fixed.** `_resolveFeeScoringAddress()` now resolves vault→owner for the `from` address. However, the resolution is one-directional — when `from` is a vault, fees are scored against the owner. But when tokens are sent to an EOA and auto-routed to their vault (`custodyTo`), the fee scoring uses `logicalTo` (the EOA) while the actual recipient is the vault. This is architecturally correct (fees should be scored against the person, not the vault), but the naming (`logicalFrom`/`feeFrom` mentioned in prior audit notes) suggests an incomplete resolution.

**Recommendation:** Verify that the burn router's `computeFeesAndReserve(feeFrom, logicalTo, amount)` call produces correct results when `feeFrom` is an owner address and `logicalTo` is also an owner address (not a vault). If so, mark C-1 as resolved with documentation.

---

## Verified Safe — Attack Vectors Tested

The following attack vectors were tested and found to be properly mitigated:

1. **ERC-2612 Permit signature malleability** — s-value upper bound check present (F-01)
2. **Flash loan governance attack** — votingDelay + score settlement window prevent it (DAO-05)
3. **Reentrancy across all payment paths** — nonReentrant on all state-changing transfers
4. **SQL injection in API routes** — Parameterized queries throughout; `safeQuery` helper for dynamic WHERE
5. **JWT secret fallback** — No hardcoded fallback; fails fast if not configured (F-10)
6. **WebSocket CORS in production** — Wildcard origin rejected in production (F-11)
7. **CircuitBreaker instant activation** — 48h timelock required (H-01)
8. **Legacy setModules backdoor in BurnRouter** — Reverts with "use proposeModules/applyModules"
9. **Burn router sink validation** — Token validates all returned sink addresses against config (F-17/C-01)
10. **tx.origin usage** — None found in any contract
11. **selfdestruct/delegatecall** — None in production contracts
12. **Floating pragmas** — All contracts use `pragma solidity 0.8.30`
13. **Token supply invariant** — `assert(remaining <= amount)` check in _transfer (F-31)
14. **VFIDEToken.renounceOwnership** — Permanently disabled (T-14)
15. **Blacklist front-running** — Freeze-then-blacklist with 1-hour delay

---

## Recommendations Summary

**Before mainnet (MUST FIX):**
1. Fix DAO MAX_PROPOSALS permanent brick (C-NEW-1)
2. Add cancelTreasurySink/cancelSanctumSink (C-NEW-2)
3. Add access control to FeeDistributor.receiveFee (C-NEW-3)
4. Authenticate security fraud event POST endpoints (H-NEW-1)
5. Protect FeeDistributor from freeze/blacklist (H-NEW-2)
6. Resolve or accept anti-whale day boundary issue (H-NEW-3)
7. Fix emergency approver self-approval logic (H-NEW-4)
8. Finalize C-1 blocker status (confirm or fix)

**Before mainnet (SHOULD FIX):**
9. Add EcosystemVault rounding dust assignment (M-NEW-1)
10. Cap guardian count in CardBoundVault (M-NEW-3)
11. Add SystemHandover disarm mechanism (M-NEW-5)
12. Authenticate performance metrics endpoint (M-NEW-8)

---

*End of report.*

---

## ADDENDUM — Additional Findings (Continued Deep Dive)

### C-NEW-4: EmergencyControl.executeRecovery() Is Permanently Non-Functional

**Contract:** `EmergencyControl.sol` (line ~385)  
**Severity:** CRITICAL — Emergency recovery path is dead code  
**Status:** MAINNET BLOCKER

`executeRecovery()` calls `Ownable(p.target).transferOwnership(p.newOwner)`. However:

1. The custom `Ownable.transferOwnership()` has the `onlyOwner` modifier
2. `msg.sender` during this call is the EmergencyControl contract address
3. EmergencyControl is NOT the owner of any target contract
4. Therefore the call ALWAYS reverts with "OWN: not owner"

**Impact:** The entire I-12 last-resort recovery mechanism — requiring system halt, supermajority committee approval, AND 14-day timelock — cannot execute. If both the owner AND the DAO are compromised simultaneously, there is no recovery path for any contract using SharedInterfaces.Ownable.

**Secondary issue:** Even if the `onlyOwner` check were bypassed, the two-step `transferOwnership` only sets `pendingOwner`. The compromised current owner could call `cancelOwnershipTransfer()` to block it.

**Fix options:**
1. Add an `emergencyTransferOwnership(address newOwner, address emergencyController)` function to SharedInterfaces.Ownable that accepts calls from a registered emergency controller and completes the transfer atomically (single-step for emergencies)
2. Or make each Ownable contract register the EmergencyControl address during deployment with a dedicated `__emergencySetOwner()` function (similar to how VaultHub uses `__forceSetOwner()` for CardBoundVault)

---

### H-NEW-6: VFIDECommerce.open() Missing nonReentrant Modifier

**Contract:** `VFIDECommerce.sol` (line ~199)  
**Severity:** HIGH — Inconsistent reentrancy protection

The `open()` function lacks `nonReentrant` while every other state-changing function (`markFunded`, `release`, `refund`, `resolve`) has it. While `open()` doesn't make external calls, it writes to state (increments `escrowCount`, stores `Escrow` struct). In a multi-contract callback scenario, an attacker could potentially create multiple escrows in a single transaction with predictable IDs.

**Fix:** Add `nonReentrant` modifier to `open()` for consistency and defense-in-depth.

---

### H-NEW-7: Seer Operator Rate Limit Day Boundary Gaming

**Contract:** `Seer.sol`  
**Functions:** `reward()`, `punish()`

The operator rate limiting uses day-boundary resets identical to the VFIDEToken anti-whale issue:

```solidity
if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
    lastOperatorRewardTime[msg.sender][subject] = uint64(block.timestamp);
    dailyOperatorRewardTotal[msg.sender][subject] = 0;
}
```

An operator can consume the full daily reward limit just before the reset boundary, then immediately use another full daily allocation after the boundary. This allows a 2x score change (up to 6% via `maxDailySubjectDelta=300` × 2 = 600 points) in seconds.

For the 0-10000 ProofScore scale, a 600-point swing is a 6% trust manipulation that directly impacts transfer fees via the BurnRouter linear curve.

**Fix:** Use rolling windows or accept the 2x boundary as documented trade-off.

---

### M-NEW-9: EmergencyControl.setModules() Allows DAO Self-Replacement Without Timelock

**Contract:** `EmergencyControl.sol`

```solidity
function setModules(address _dao, address _breaker, address _ledger) external onlyDAO nonReentrant {
    dao = _dao; breaker = IEmergencyBreaker(_breaker); ledger = IProofLedger(_ledger);
}
```

The DAO can instantly replace itself, the breaker, and the ledger without any timelock delay. A compromised DAO could redirect all emergency controls to attacker-controlled contracts in a single transaction.

**Fix:** Add a timelock delay matching other module setters (48h minimum).

---

### M-NEW-10: OwnerControlPanel.transferOwnership Is Single-Step

**Contract:** `OwnerControlPanel.sol` (line 127)

```solidity
function transferOwnership(address newOwner) external onlyOwner {
```

This overrides the two-step Ownable.transferOwnership pattern. Need to verify if this is an intentional single-step override or a bug. If single-step, the OwnerControlPanel ownership can be transferred to a wrong address with no recovery.

---

### M-NEW-11: CouncilElection — Candidate List Unbounded Despite 200 Cap

**Contract:** `CouncilElection.sol`

The `register()` function caps `candidateList.length < 200`, but `unregister()` only removes from the list — it doesn't decrement a counter. After 200 registrations, even if all unregister, the candidate list array has been popped back to 0 but `candidateList.length` will correctly reflect the current size. This is actually fine — the `require` checks `candidateList.length`, not a separate counter. This is NOT a finding after closer inspection.

---

### L-NEW-7: MerchantPortal.setMerchantPullApproval Disabling Path Only

**Contract:** `MerchantPortal.sol` (line 562)

The `setMerchantPullApproval` function with `approved=true` always reverts with "MP: use setMerchantPullPermit". This is intentional (directing users to the scoped permit function) but confusing API design. The function should be documented as revoke-only or removed in favor of a `revokeMerchantPullPermit` function.

---

## Updated Summary

| Severity | Original | Added | Total |
|----------|----------|-------|-------|
| Critical | 3 | 1 | **4** |
| High | 5 | 2 | **7** |
| Medium | 8 | 2 | **10** |
| Low | 6 | 1 | **7** |

### Updated Must-Fix Before Mainnet List

1. **C-NEW-1:** DAO MAX_PROPOSALS permanent brick
2. **C-NEW-2:** Missing cancel functions for TreasurySink/SanctumSink
3. **C-NEW-3:** FeeDistributor.receiveFee() no access control
4. **C-NEW-4:** EmergencyControl.executeRecovery() permanently non-functional
5. **H-NEW-1:** Unauthenticated security fraud event POST endpoints
6. **H-NEW-2:** FeeDistributor frozen/blacklisted halts all distribution
7. **H-NEW-3:** Anti-whale day boundary double-spend
8. **H-NEW-4:** DAO emergency approver self-approval
9. **H-NEW-5:** BurnRouter score history manipulation
10. **H-NEW-6:** VFIDECommerce.open() missing nonReentrant
11. **H-NEW-7:** Seer operator rate limit day boundary gaming
12. Finalize C-1 blocker status
