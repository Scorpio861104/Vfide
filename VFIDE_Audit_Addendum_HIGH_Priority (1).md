# VFIDE Deep Audit — Addendum: HIGH-Priority Contracts

**Date:** March 31, 2026  
**Auditor:** Claude (Anthropic) — Adversarial Security Audit  
**Scope:** 6 HIGH-priority contracts (6,635 lines)  
**Status:** FINDINGS DOCUMENTED — Fixes Required Before Deployment

---

## Scope of This Addendum

This addendum covers the six HIGH-priority contracts that had not received deep adversarial review in previous audit sessions. Each contract was read line-by-line with every external function traced, every modifier chain verified, and every cross-contract interaction attacked.

| Contract | Lines | Findings |
|----------|-------|----------|
| EcosystemVault.sol | 1,567 | 4 |
| MainstreamPayments.sol | 1,232 | 3 |
| SeerAutonomous.sol | 1,199 | 3 |
| VaultInfrastructure.sol | 1,408 | 3 |
| VaultRecoveryClaim.sol | 632 | 2 |
| VFIDESecurity.sol | 597 | 1 |
| **Total** | **6,635** | **16** |

Finding numbering continues from the existing audit sequence.

---

## CRITICAL FINDINGS (1)

### C-2: Stablecoin Reserve Denomination Mismatch — Work Rewards Permanently Undeliverable

**Contract:** EcosystemVault.sol  
**Lines:** 994–1001  
**Impact:** All stablecoin-mode work rewards fail when using the direct reserve path  

**Description:**  
When `stablecoinOnlyMode` is enabled, `_deliverWorkReward()` compares the VFIDE-denominated pool amount directly against the stablecoin reserve balance:

```solidity
if (stablecoinReserves[preferredStablecoin] >= amount) {
    stablecoinReserves[preferredStablecoin] -= amount;
    IERC20(preferredStablecoin).safeTransfer(worker, amount);
```

The `amount` parameter comes from the VFIDE pool (18 decimals). But `stablecoinReserves[USDC]` tracks USDC in native 6 decimals. A 10 VFIDE work reward passes `amount = 10e18`. Even if the reserve holds $1,000,000 USDC (`1e12`), the check `1e12 >= 10e18` fails.

**Consequence:** The direct reserve path — the entire Howey-safe architecture — never activates. Every payment falls through to the DEX swap path. If `swapRouter` is not configured, all work rewards revert. If it IS configured, workers receive variable swap amounts instead of the "fixed-dollar service fee" the Howey analysis depends on.

**The farmer impact:** A market seller who completed verified work cannot receive their fixed $5 compensation because the system compares apples (VFIDE wei) to oranges (USDC micro-units).

**Fix (approximately 8 lines):**  
Add a conversion step using the price oracle or a stored conversion rate before comparing/transferring stablecoin amounts:

```solidity
// In _deliverWorkReward, when stablecoinOnlyMode:
uint256 stableAmount = _vfideToStable(amount); // Convert VFIDE amount to stablecoin units
if (stablecoinReserves[preferredStablecoin] >= stableAmount) {
    stablecoinReserves[preferredStablecoin] -= stableAmount;
    IERC20(preferredStablecoin).safeTransfer(worker, stableAmount);
    ...
}
```

Where `_vfideToStable` uses `minOutputPerVfide` (already available) to convert:  
`stableAmount = amount * minOutputPerVfide / 1e18;`

---

## HIGH FINDINGS (4)

### H-5: forceSetPrice Has Same Sanity Check It Claims to Bypass

**Contract:** MainstreamPayments.sol (MainstreamPriceOracle)  
**Lines:** 331–342  
**Impact:** DAO cannot recover from stale oracle prices  

**Description:**  
`forceSetPrice()` is documented as "Force set price (DAO only, bypasses sanity check)" but the implementation applies the identical ±50% sanity check as `updatePrice()`:

```solidity
function forceSetPrice(uint256 newPrice) external onlyDAO {
    require(newPrice > 0, "PO: zero price");
    uint256 maxChange = vfidePerUsd / 2;
    require(
        newPrice >= vfidePerUsd - maxChange && newPrice <= vfidePerUsd + maxChange,
        "PO: price change too large"
    );
```

If the oracle goes stale and the real VFIDE price moves more than 50%, the DAO has no mechanism to correct it. Since `updatePrice()` and `updatePriceFromSource()` have the same check, the oracle becomes permanently stuck.

**Fix (3 lines):** Remove the sanity check from `forceSetPrice`, or implement multi-step price correction.

---

### H-6: VaultInfrastructure Force Recovery Approvers Can Vote for Different Owners

**Contract:** VaultInfrastructure.sol  
**Lines:** 1289–1311  
**Impact:** Last approver determines recovery target regardless of prior votes  

**Description:**  
`approveForceRecovery(vault, newOwner)` tracks approvals per `(vault, approver, nonce)` but does NOT verify that all approvers agree on the same `newOwner`. Each approver can pass a different `newOwner`. When the approval count reaches `RECOVERY_APPROVALS_REQUIRED` (3), whichever `newOwner` the third approver passed gets set as `recoveryProposedOwner`.

Attack scenario: Approvers A and B honestly vote for Alice. Corrupt approver C votes for Charlie. C's vote triggers the threshold, and `recoveryProposedOwner` is set to Charlie.

**Fix (approximately 4 lines):** Store the proposed owner on first approval and require all subsequent approvals to match:

```solidity
if (recoveryApprovalCount[vault] == 0) {
    recoveryProposedOwner[vault] = newOwner;
} else {
    require(recoveryProposedOwner[vault] == newOwner, "VI:owner-mismatch");
}
```

---

### H-7: Legacy Vault Recovery Threshold Capped at 2 Regardless of Guardian Count

**Contract:** VaultInfrastructure.sol (UserVaultLegacy)  
**Lines:** 520–521  
**Impact:** Two colluding guardians can steal any legacy vault with 2+ guardians  

**Description:**  
The recovery finalization threshold is:

```solidity
uint256 threshold = _recovery.guardianCountSnapshot >= 2 ? 2 : 1;
```

A vault with 20 guardians still only requires 2 approvals. Two colluding guardians can initiate recovery pointing to an attacker-controlled address, vote for it, wait 7 days, and finalize — stealing all funds.

**Context:** The new CardBoundVault (via VaultHub) is the active implementation and has separate controls. But legacy vaults remain deployed and hold real funds.

**Fix (1 line):** Use a proper majority threshold:

```solidity
uint256 threshold = _recovery.guardianCountSnapshot == 0 ? 1 
    : (_recovery.guardianCountSnapshot / 2) + 1;
```

---

### H-8: SeerAutonomous Violation Score Overflow Bricks Enforcement

**Contract:** SeerAutonomous.sol  
**Lines:** 643, 649, 676  
**Impact:** Repeated violations permanently disable enforcement for the target address  

**Description:**  
`totalViolationScore` is `uint16` (max 65,535). Each violation adds `severity` (10–100 points) plus optional `riskOracle` score. The `_handlePattern` function also adds oracle risk on top:

```solidity
totalViolationScore[subject] += severity;  // line 643
totalViolationScore[subject] += risk;       // line 649
```

And `_recordViolation` adds 20 more per call (line 676).

A sybil attacker who triggers ~650 violations overflows `uint16`, causing Solidity 0.8.30 to revert. After that, every call to `beforeAction()` for that address reverts at line 643, effectively disabling all enforcement AND blocking all legitimate transactions from that user through any contract that calls `beforeAction()`.

**Fix (2 lines):** Cap the score instead of reverting:

```solidity
uint16 newScore = totalViolationScore[subject] + severity;
totalViolationScore[subject] = newScore > totalViolationScore[subject] ? newScore : type(uint16).max;
```

Or change the type to `uint32`.

---

## MEDIUM FINDINGS (7)

### M-8: Operations Withdrawal Bypasses Expense Epoch Cap

**Contract:** EcosystemVault.sol  
**Lines:** 702–717, 1534–1543  
**Impact:** Expense cap is ineffective as a governance guardrail  

**Description:**  
`payExpense()` enforces a per-epoch spending cap (`EXPENSE_EPOCH_CAP_BPS = 2500`, i.e., 25% of operationsPool per 7-day epoch). However, `withdrawOperations()` and the operations task in `_runScheduledTasks()` drain the ENTIRE `operationsPool` to `operationsWallet` without any epoch cap check. A malicious owner/DAO can bypass the expense cap entirely by using `withdrawOperations()` instead of `payExpense()`.

**Fix:** Either apply the epoch cap to operations withdrawals, or document this as intentional (withdrawal is a bulk operation while expenses are granular).

---

### M-9: Permissionless performUpkeep Accepts Arbitrary Task Bitmask

**Contract:** EcosystemVault.sol  
**Lines:** 1451–1454  
**Impact:** Any address can trigger selective scheduled tasks  

**Description:**  
`performUpkeep(bytes calldata performData)` decodes an arbitrary `uint8` bitmask from caller-supplied data. While each task has its own time guard, an attacker can selectively trigger only certain tasks (e.g., only `TASK_OPERATIONS` to drain operations to wallet) while skipping others (e.g., `TASK_COUNCIL`). The `runScheduledTasks()` function correctly runs all tasks, but `performUpkeep` is designed for Chainlink Automation and accepts any bitmask.

**Fix:** Either restrict `performUpkeep` to the keeper address, or accept that selective execution is safe because time guards prevent premature execution.

---

### M-10: SeerAutonomous Violation Decay Rate Is Negligibly Slow

**Contract:** SeerAutonomous.sol  
**Lines:** 789–800  
**Impact:** Violation scores are effectively permanent, punishing reformed users  

**Description:**  
`_decayViolationScore` decays by `elapsed / 30 days` points — that's 1 point per 30 days regardless of total score. A user with a violation score of 200 would need 200 × 30 = 6,000 days (~16 years) for full decay. Combined with the `uint16` overflow risk (H-8), this means violations effectively brand users permanently.

**Fix:** Use proportional decay (e.g., halve score every 90 days) or increase the per-period decay rate.

---

### M-11: SeerAutonomous Network Metrics Reset Creates Threshold Oscillation

**Contract:** SeerAutonomous.sol  
**Lines:** 837–839  
**Impact:** Dynamic thresholds oscillate instead of converging  

**Description:**  
`_maybeAdjustThresholds()` resets `networkViolationCount`, `networkActionCount`, and `networkBlockedCount` to zero after each daily adjustment. This means: Day 1 has high violations → thresholds tighten. Day 2 the tighter thresholds block more → fewer violations → thresholds relax. Day 3 the relaxed thresholds allow more → violations rise again. This creates oscillation rather than convergence.

**Fix:** Use exponential moving average instead of reset-to-zero, or keep a rolling window.

---

### M-12: VaultRecoveryClaim Premature Status Change and ActiveClaim Clearing

**Contract:** VaultRecoveryClaim.sol  
**Lines:** 459–487  
**Impact:** Claim marked Executed before actual ownership transfer; new claims can be initiated prematurely  

**Description:**  
`_executeRecovery()` clears `activeClaimForVault[claim.vault] = 0` at line 462 and may set `claim.status = ClaimStatus.Executed` at line 477, even though VaultInfrastructure requires a separate 7-day timelock before the actual ownership transfer. During that 7-day window, a second attacker could initiate a new claim for the same vault.

**Fix:** Don't clear `activeClaimForVault` until `finalizeExecution` succeeds.

---

### M-13: EcosystemVault Council Distribution Vulnerable to Malicious CouncilManager

**Contract:** EcosystemVault.sol  
**Lines:** 739–756  
**Impact:** Compromised CouncilManager can redirect all council funds  

**Description:**  
`distributeCouncilRewards()` calls `councilManager.getActiveMembers()` to get the recipient list and iterates over it, transferring `perMember` to each. If `councilManager` is replaced (via `setCouncilManager`, which has no timelock) with a malicious contract that returns attacker-controlled addresses, the entire council pool is drained.

`setCouncilManager` is `onlyOwner` and has no timelock — it takes effect immediately.

**Fix:** Add a timelock to `setCouncilManager` similar to the `SENSITIVE_CHANGE_DELAY` used for manager and allocation changes.

---

### M-14: PanicGuard cancelSelfPanic Blocked After Any DAO Quarantine Extension

**Contract:** VFIDESecurity.sol (PanicGuard)  
**Lines:** 406–408  
**Impact:** User loses ability to cancel their own self-panic if DAO extends quarantine even slightly  

**Description:**  
When a user calls `selfPanic()`, the applied duration is stored in `selfPanicUntil[vault]`. `cancelSelfPanic()` requires:

```solidity
require(quarantineUntil[vault] == selfPanicUntil[vault], "SEC: overridden quarantine");
```

If the DAO calls `reportRisk()` to extend the quarantine by even 1 second beyond the self-panic duration, `quarantineUntil` will differ from `selfPanicUntil`, and the user can never cancel. The DAO's `clear()` function is the only recourse.

**Fix:** Change the check to `quarantineUntil[vault] <= selfPanicUntil[vault]` to allow cancellation if the quarantine hasn't been extended.

---

## LOW FINDINGS (3)

### L-6: MainstreamPriceOracle sourceList Never Compacted on Removal

**Contract:** MainstreamPayments.sol (MainstreamPriceOracle)  
**Lines:** 368–371  
**Impact:** Gas waste in view functions that iterate sourceList  

**Description:**  
`removePriceSource()` sets `active = false` but does not remove the source from `sourceList`. Over time, the array grows with inactive entries, wasting gas in any function that iterates it.

**Fix:** Add swap-and-pop removal similar to FiatRampRegistry's `removeProvider`.

---

### L-7: TerminalRegistry recordPayment Accepts Arbitrary Customer Addresses

**Contract:** MainstreamPayments.sol (TerminalRegistry)  
**Lines:** 901–912  
**Impact:** Merchants can inflate terminal stats with fake payment records  

**Description:**  
`recordPayment()` can be called by the terminal's merchant with any `customer` address and any `amount`. This inflates `txCount` and `totalVolume` — statistics that may influence merchant reputation or ranking.

**Fix:** Require the customer address to have an active vault, or add validation through the MerchantPortal.

---

### L-8: EcosystemVault setRewardToken Allows Change Only When All Pools Zero

**Contract:** EcosystemVault.sol  
**Lines:** 378–384  
**Impact:** Practical impossibility of changing reward token after launch  

**Description:**  
`setRewardToken()` requires `councilPool == 0 && merchantPool == 0 && headhunterPool == 0 && operationsPool == 0`. Once the system receives any fees, at least one pool will be non-zero. To change the reward token, all pools must be simultaneously drained to exactly zero — practically impossible in a live system.

**Fix:** Add a migration function that converts pool balances to the new token, or accept this as a permanent constraint (document it).

---

## INFO FINDINGS (2)

### I-3: EcosystemVault HEADHUNTER_RANK_SHARE_BPS Is Public Mutable State

**Contract:** EcosystemVault.sol  
**Line:** 129  
**Impact:** None (rank-based claims are permanently disabled)  

**Description:**  
`HEADHUNTER_RANK_SHARE_BPS` is declared as a public state variable (not `constant`). However, since `claimHeadhunterReward()` is permanently disabled via `revert ECO_RewardsNotAvailable()`, this array is dead code. It consumes storage slots unnecessarily.

---

### I-4: SeerAutonomous beforeAction Argument Uses uint8 ActionType via Interface

**Contract:** MainstreamPayments.sol (SessionKeyManager)  
**Lines:** 502–504, 699  
**Impact:** Potential ABI mismatch  

**Description:**  
The `ISeerAutonomous_SKM` interface declares `beforeAction` with `uint8 action`, but the actual `SeerAutonomous.beforeAction` uses `ActionType action` (an enum). The ABI encoding is compatible (enums encode as `uint8`), but the interface mismatch could cause confusion or silent failures if the enum is ever extended beyond 255 values.

---

## Summary of Fixes Required

| ID | Severity | Contract | Effort | Status |
|----|----------|----------|--------|--------|
| C-2 | CRITICAL | EcosystemVault | ~8 lines | ❌ Open |
| H-5 | HIGH | MainstreamPriceOracle | ~3 lines | ❌ Open |
| H-6 | HIGH | VaultInfrastructure | ~4 lines | ❌ Open |
| H-7 | HIGH | VaultInfrastructure (Legacy) | ~1 line | ❌ Open |
| H-8 | HIGH | SeerAutonomous | ~2 lines | ❌ Open |
| M-8 | MEDIUM | EcosystemVault | Design decision | ❌ Open |
| M-9 | MEDIUM | EcosystemVault | Design decision | ❌ Open |
| M-10 | MEDIUM | SeerAutonomous | ~5 lines | ❌ Open |
| M-11 | MEDIUM | SeerAutonomous | ~10 lines | ❌ Open |
| M-12 | MEDIUM | VaultRecoveryClaim | ~3 lines | ❌ Open |
| M-13 | MEDIUM | EcosystemVault | ~8 lines | ❌ Open |
| M-14 | MEDIUM | VFIDESecurity | ~1 line | ❌ Open |
| L-6 | LOW | MainstreamPriceOracle | ~5 lines | ❌ Open |
| L-7 | LOW | TerminalRegistry | ~2 lines | ❌ Open |
| L-8 | LOW | EcosystemVault | Design decision | ❌ Open |
| I-3 | INFO | EcosystemVault | N/A | Informational |
| I-4 | INFO | MainstreamPayments | N/A | Informational |

**Verdict:** C-2 is the immediate blocker — the Howey-safe stablecoin payment architecture is non-functional due to a denomination mismatch. H-5 through H-8 must also be resolved before mainnet.

---

## Verified Safe (New Attack Vectors Tested)

The following attack vectors were investigated and found to be safe across these six contracts:

1. **EcosystemVault reentrancy via safeTransfer callbacks** — All state-changing paths use `nonReentrant`
2. **EcosystemVault pool allocation rounding exploit** — Dust goes to operations; max 3 wei per allocation
3. **EcosystemVault referral self-referral** — Checked: `referrer == merchant` returns early
4. **EcosystemVault year/quarter advancement manipulation** — Time guards prevent premature advancement
5. **EcosystemVault withdraw request front-running** — Timelock + pendingTotal cap prevent drain
6. **MainstreamPayments session key replay** — Keys are one-time addresses, nonces prevent reuse
7. **MainstreamPayments terminal takeover** — `registerTerminal` requires vault ownership
8. **SeerAutonomous DAO override permanent escape** — Override expires after 30 days
9. **SeerAutonomous challenge window gaming** — Unchallenged restrictions finalize; challenged ones require DAO
10. **VaultInfrastructure CREATE2 address collision** — Salt is keccak256(owner), unique per user
11. **VaultInfrastructure inheritance + recovery race** — `noActiveClaims` modifier prevents simultaneous claims
12. **VaultRecoveryClaim duplicate claims** — `activeClaimForVault` mapping prevents concurrent claims
13. **VFIDESecurity self-as-guardian** — SEC-06 fix explicitly blocks `guardian == vault`
14. **VFIDESecurity rapid toggle abuse** — EmergencyBreaker has cooldown on deactivation
15. **VFIDESecurity quarantine shortening** — `_quarantine` only extends, never shortens

---

## Remaining Audit Scope

This addendum covers 6 of 37 unaudited contracts. The following remain:

- **MEDIUM priority:** 12 contracts (~5,100 lines) — SeerGuardian, SeerSocial, SubscriptionManager, PayrollManager, BadgeManager, CircuitBreaker, EmergencyControl, WithdrawalQueue, VFIDEPriceOracle, BridgeSecurityModule, ServicePool, BadgeRegistry
- **LOW priority:** 19 contracts (~4,100 lines)
- **Frontend:** 79 pages, 292 components
- **API routes:** 87 routes (business logic review)
- **Tests/Deploy:** 43 Hardhat tests, 14 E2E specs, deploy scripts
