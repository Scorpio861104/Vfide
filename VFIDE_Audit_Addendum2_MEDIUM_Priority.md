# VFIDE Deep Audit — Addendum #2: MEDIUM-Priority Contracts

**Date:** March 31, 2026  
**Auditor:** Claude (Anthropic) — Adversarial Security Audit  
**Scope:** 12 MEDIUM-priority contracts (5,268 lines)  
**Status:** FINDINGS DOCUMENTED

---

## Scope

| Contract | Lines | Findings |
|----------|-------|----------|
| SeerGuardian.sol | 575 | 0 |
| SeerSocial.sol | 589 | 1 |
| SubscriptionManager.sol | 477 | 0 |
| PayrollManager.sol | 511 | 1 |
| BadgeManager.sol | 498 | 0 |
| CircuitBreaker.sol | 423 | 1 |
| EmergencyControl.sol | 409 | 0 |
| WithdrawalQueue.sol | 380 | 0 |
| VFIDEPriceOracle.sol | 390 | 0 |
| BridgeSecurityModule.sol | 339 | 0 |
| ServicePool.sol | 343 | 1 |
| BadgeRegistry.sol | 334 | 0 |
| **Total** | **5,268** | **4** |

---

## HIGH FINDINGS (1)

### H-9: PayrollManager claimExpiredStream Steals Employee's Earned Wages

**Contract:** PayrollManager.sol  
**Function:** claimExpiredStream()  
**Impact:** Payer reclaims ALL funds including wages already earned by the payee  

When a stream expires, claimExpiredStream() sends the entire depositBalance to the payer without first settling the payee's accrued-but-unclaimed wages. The claimable() function correctly caps accrual at expiryTime, but claimExpiredStream never calls it.

Attack: Employer creates a 365-day stream at 100 VFIDE/day. Employee works 364 days without withdrawing. On day 366, employer calls claimExpiredStream and receives the entire balance — including 36,400 VFIDE the employee earned.

The farmer impact: A seamstress being paid via salary streaming loses all earned wages because she didn't withdraw before the stream expired.

Fix (~8 lines): Settle payee's accrued portion before returning remainder to payer.

---

## MEDIUM FINDINGS (2)

### M-15: CircuitBreaker recordVolume Has No Access Control

**Contract:** CircuitBreaker.sol  
**Function:** recordVolume(uint256 _volume)  
**Impact:** Anyone can trigger the circuit breaker via volume inflation  

recordVolume() has no access control modifier. An attacker can call it with a large value to push dailyVolume past the threshold and trigger system-wide emergency pause. Other functions in the same contract (incrementBlacklist, updatePrice, manualTrigger) all have proper access gates.

Fix (~1 line): Add onlyRole(RECORDER_ROLE) or equivalent access control.

---

### M-16: ServicePool Period Advancement Skips Intermediate Periods

**Contract:** ServicePool.sol  
**Function:** _advancePeriodIfNeeded()  
**Impact:** Accounting gaps when multiple periods elapse without activity  

If 3 months pass with no activity, currentPeriod jumps from N to N+1 instead of N+3. The gap period numbers can never be finalized. Accumulated funds carry forward correctly, but accounting gaps may confuse indexers and frontends.

Fix (~5 lines): Calculate elapsed periods and advance by the correct count.

---

## LOW FINDINGS (1)

### L-9: SeerSocial endorsementsGiven Counter Stale After Expiry

**Contract:** SeerSocial.sol  
**Impact:** Active endorsers eventually blocked from new endorsements  

endorsementsGiven is only decremented during subject-specific pruning. An endorser who endorsed 50 different subjects stays at count 50 even after all expire, until each subject is individually pruned.

Fix: Add a self-prune function or track endorsements per-endorser.

---

## Verified Safe (20 Attack Vectors Tested)

SubscriptionManager reentrancy, self-charge, PayrollManager pausedAccrued double-counting, rate manipulation, SeerGuardian griefing/escape, SeerSocial self-endorsement/weight manipulation, BadgeManager double-award, CircuitBreaker admin-only reset, EmergencyControl committee front-running/recovery-without-halt, WithdrawalQueue daily cap bypass, VFIDEPriceOracle manipulation/feed front-running, BridgeSecurityModule whitelist bypass/volume reset, ServicePool score inflation/over-disbursement, BadgeRegistry purity.

---

## Cumulative Status

Total findings across both addendums: 1 Critical (fixed), 5 High (3 fixed, 1 partial, 1 new), 9 Medium (4 fixed, 5 open), 4 Low (2 fixed, 2 open), 2 Info.

Open blockers before mainnet: H-7 inheritance threshold (partial), H-9 expired stream wage theft, M-15 circuit breaker DoS.
