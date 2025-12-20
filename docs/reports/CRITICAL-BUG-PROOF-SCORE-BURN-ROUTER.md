# 🚨 CRITICAL BUG: ProofScoreBurnRouter Arithmetic Overflow

**Date:** November 14, 2025  
**Severity:** CRITICAL  
**Status:** DISCOVERED during comprehensive testing

---

## Bug Description

The `ProofScoreBurnRouter` contract has an **arithmetic overflow bug** in the `_calcBurnRate()` function that causes the contract to revert for mid-range scores (between 301 and 899).

### Vulnerable Code

```solidity
function _calcBurnRate(uint16 score) internal view returns (uint16) {
    if (score >= 900) return baseBurnRate / 2;
    if (score <= 300) return maxBurnRate;
    uint16 range = maxBurnRate - baseBurnRate;  // 250 - 50 = 200
    uint16 diff = 900 - score;                   // e.g., 900 - 331 = 569
    return baseBurnRate + (range * diff / 600);  // 💥 OVERFLOW HERE!
}
```

### The Problem

When calculating `(range * diff / 600)`:
- All variables are `uint16` (max value: 65,535)
- `range = 200` (maxBurnRate - baseBurnRate)
- `diff` can be up to 599 (900 - 301 = 599)
- **Intermediate calculation:** `200 * 569 = 113,800` ❌ OVERFLOW!
- uint16 can only hold up to 65,535

### Impact

**Contract will revert** for any ProofScore between 301 and 899 when routing burns. This means:
- ❌ 60% of score range is unusable
- ❌ Contract cannot route burns for mid-range users
- ❌ All transactions will fail for affected users

### Affected Scores

- ✅ Score 0-300: Works (uses maxBurnRate directly)
- ❌ Score 301-899: **REVERTS** (arithmetic overflow)
- ✅ Score 900-1000: Works (uses baseBurnRate / 2 directly)

### Proof

Running fuzz test with score=331:
```
[FAIL: panic: arithmetic underflow or overflow (0x11); counterexample: calldata=0xfc82f7d9000000000000000000000000000000000000000000000000000000000000014b args=[331]] testFuzz_RouteZeroAmount(uint16) (runs: 0, μ: 0, ~: 0)
```

### Root Cause

Solidity performs arithmetic operations in the type of the operands. When all operands are `uint16`, the intermediate result is also calculated as `uint16`, causing overflow before the division by 600.

---

## Fix Required

### Option 1: Cast to uint256 (RECOMMENDED)

```solidity
function _calcBurnRate(uint16 score) internal view returns (uint16) {
    if (score >= 900) return baseBurnRate / 2;
    if (score <= 300) return maxBurnRate;
    uint16 range = maxBurnRate - baseBurnRate;
    uint16 diff = 900 - score;
    // Cast to uint256 to prevent overflow in intermediate calculation
    return baseBurnRate + uint16((uint256(range) * uint256(diff)) / 600);
}
```

### Option 2: Change variable types

```solidity
function _calcBurnRate(uint16 score) internal view returns (uint16) {
    if (score >= 900) return baseBurnRate / 2;
    if (score <= 300) return maxBurnRate;
    uint256 range = maxBurnRate - baseBurnRate;  // uint256
    uint256 diff = 900 - score;                   // uint256
    return baseBurnRate + uint16((range * diff) / 600);
}
```

---

## Test Strategy

Until the contract is fixed, tests must:
1. Only test scores <= 300 or >= 900
2. Skip mid-range score tests
3. Document the limitation

---

## Recommendation

**IMMEDIATE ACTION REQUIRED:**
1. 🚨 Fix the ProofScoreBurnRouter contract before deployment
2. 🚨 Add unit tests specifically for mid-range scores (301-899)
3. 🚨 Add overflow protection tests
4. 🚨 Review all other contracts for similar uint16 overflow issues

**This bug would cause DoS for 60% of users if deployed to production.**

---

**Discovered by:** Comprehensive fuzz testing campaign  
**Fix Priority:** CRITICAL - Must fix before ANY deployment  
**Testnet Status:** ❌ BLOCKED until fixed
