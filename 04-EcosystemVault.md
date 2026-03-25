# EcosystemVault.sol — Hostile Audit Findings

**Lines:** 1,417  
**Score:** 3 Critical / 4 High / 5 Medium / 4 Low

---

## EV-01 · CRITICAL — `setOperationsAllocation` bypasses `MIN_ALLOCATION_BPS` enforcement

**Location:** `setOperationsAllocation()`

**Description:**  
`setAllocations()` enforces `MIN_ALLOCATION_BPS` (500 = 5%) on each pool. But `setOperationsAllocation()` directly sets the operations split without validating that the resulting council/merchant/headhunter splits remain above minimum. A DAO can set operations to 95%, leaving 5% total for 3 pools — impossible to keep all above 5%.

**Fix:**
```solidity
function setOperationsAllocation(uint256 _opsBps) external onlyDAO {
    require(_opsBps <= 10000 - (3 * MIN_ALLOCATION_BPS), "EV: exceeds maximum");
    uint256 remaining = 10000 - _opsBps;
    // Re-validate remaining pools can each meet minimum
    require(councilBps >= MIN_ALLOCATION_BPS, "EV: council below min");
    require(merchantBps >= MIN_ALLOCATION_BPS, "EV: merchant below min");
    require(headhunterBps >= MIN_ALLOCATION_BPS, "EV: headhunter below min");
    require(councilBps + merchantBps + headhunterBps == remaining, "EV: doesn't sum");
    operationsBps = _opsBps;
}
```

---

## EV-02 · CRITICAL — `allocateIncoming()` is permissionless

**Description:**  
Anyone can call `allocateIncoming()` to distribute unallocated tokens into pools. An attacker front-runs `endMerchantPeriod` or `endHeadhunterQuarter` by calling `allocateIncoming()` first, manipulating pool snapshots used for distribution.

**Fix:**
```solidity
function allocateIncoming() external {
    require(msg.sender == dao || msg.sender == address(this), "EV: not authorized");
    _allocateIncoming();
}
```

---

## EV-03 · CRITICAL — `_swapToStable` sandwich attack ✅ FIXED

**Description:**  
Used `getAmountsOut` from the same router for slippage protection — a sandwich attack vector.

**Fix applied:** Removed the self-referential `getAmountsOut` call. `_swapToStable` now derives
`minAmountOut` from an admin-set floor price (`minOutputPerVfide`, set via `setMinOutputPerVfide`).
The phased deployment timeline (liquidity established before rewards launch) makes this path safe
to enable. `configureAutoSwap` enforces `minOutputPerVfide > 0` before auto-swap can be turned on.

---

## EV-04 · HIGH — `setRewardToken` orphans pool balances

**Fix:**
```solidity
function setRewardToken(address _token) external onlyDAO {
    // Require all pools to be empty before token change
    require(councilPool == 0 && merchantPool == 0 && headhunterPool == 0 && operationsPool == 0,
        "EV: drain pools before token change");
    rewardToken = IERC20(_token);
}
```

---

## EV-05 · HIGH — `endMerchantPeriod` sets `merchantPool = 0` — gap funds lost

**Fix:** Snapshot the pool amount BEFORE zeroing, and ensure `allocateIncoming` is called atomically:
```solidity
function endMerchantPeriod() external onlyDAO {
    _allocateIncoming(); // ensure up to date
    uint256 periodPool = merchantPool;
    merchantPool = 0;
    // distribute periodPool...
}
```

---

## EV-06 · HIGH — `distributeCouncilRewards` unsafe `uint8` cast

**Fix:**
```solidity
uint256 memberCount = members.length;
require(memberCount > 0 && memberCount <= 255, "EV: invalid council size");
uint256 perMember = councilPool / memberCount; // use uint256 division
```

---

## EV-07 · HIGH — `payExpense` deducts pool before swap attempt

**Fix:** Use check-effects-interactions: validate swap will succeed (dry run) before deducting, or implement a two-phase commit.

---

## EV-08 to EV-12 · MEDIUM

- **EV-08:** Sampling rank is statistically unsound — use deterministic ranking based on actual scores.
- **EV-09:** `setOperationsCooldown` allows 0 — add `require(cooldown >= 1 hours)`.
- **EV-10:** `burnFunds` sends to `0xdEaD` triggering transfer fees — use token's `burn()` directly if available.
- **EV-11:** No inter-pool transfer — add `transferBetweenPools(from, to, amount)` with DAO-only access.
- **EV-12:** Year/quarter transitions not calendar-aligned — document as by-design or use block.timestamp modular arithmetic.

---

## EV-13 to EV-16 · LOW

- **EV-13:** `configureAutoSwap` hardcoded `require(!_enabled)` ✅ **FIXED** — removed; `configureAutoSwap` now accepts `_enabled=true` when `minOutputPerVfide > 0`.
- **EV-14:** Dead `HEADHUNTER_RANK_SHARE_BPS` storage — remove.
- **EV-15:** `getPoolBalances` total can diverge — recalculate total from pool sum.
- **EV-16:** `AllocationUpdated` event missing operationsBps — add it.
