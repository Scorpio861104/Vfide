# ProofScoreBurnRouter.sol — Hostile Audit Findings

**Lines:** 605  
**Score:** 3 Critical / 3 High / 5 Medium / 4 Low

---

## BR-01 · CRITICAL — `computeFees` TOCTOU on daily burn cap

**Description:**  
`computeFees` is a `view` function that reads `dailyBurnedAmount`, but `recordBurn` updates it AFTER the transfer. Multiple same-block transactions all see stale state and can each individually pass the cap check, collectively exceeding it by an unbounded amount.

**Fix:**
```solidity
// Make computeFees state-changing (reserve the amount):
function computeAndReserveFees(address from, uint256 amount) external returns (uint256 burn, uint256 sanctum, uint256 eco) {
    (burn, sanctum, eco) = _computeFees(from, amount);
    // Immediately reserve against daily cap
    dailyBurnedAmount += burn;
    require(dailyBurnedAmount <= dailyBurnCap, "BR: daily cap exceeded");
}
```

---

## BR-02 · CRITICAL — `getTimeWeightedScore` O(n) gas bomb

**Description:**  
Iterates circular buffer TWICE (200 SLOADs = ~420k gas) in the transfer hot path for users with score history.

**Fix:**
```solidity
// Cache the time-weighted score and update on score changes only:
mapping(address => uint16) public cachedTimeWeightedScore;
mapping(address => uint64) public lastScoreCacheUpdate;

function updateCachedScore(address user) external {
    cachedTimeWeightedScore[user] = _calculateTimeWeightedScore(user);
    lastScoreCacheUpdate[user] = uint64(block.timestamp);
}

// In transfer path, use cached value:
function _getFeeScore(address user) internal view returns (uint16) {
    return cachedTimeWeightedScore[user]; // O(1)
}
```

---

## BR-03 · CRITICAL — `updateScore` restricted to Seer but Seer never calls it

**Description:**  
The entire time-weighted scoring system is dead code. All users always pay fees based on instantaneous score with zero time-averaging buffer.

**Fix:** Either wire Seer to call `updateScore` on every score change:
```solidity
// In Seer._updateScore():
if (address(burnRouter) != address(0)) {
    try burnRouter.updateScore(subject, newScore) {} catch {}
}
```
Or remove the dead time-weighted system entirely and document that fees use instantaneous scores.

---

## BR-04 · HIGH — `setModules` allows instant sink replacement

**Fix:** Add timelock matching VFIDEToken's module change delay.

---

## BR-05 · HIGH — `setFeePolicy` rate limit bypassable

**Fix:** Add per-day call limit: `require(block.timestamp >= lastFeePolicyChange + 1 days)`.

---

## BR-06 · HIGH — Volume multiplier creates non-linear fee curve

**Fix:** Apply volume multiplier BEFORE linear interpolation, or document the non-linear behavior.

---

## BR-07 to BR-11 · MEDIUM

- **BR-07:** Consider receiver's score for fee calculation (sender pays, but receiver score affects rate).
- **BR-08:** Remove duplicate `scoreHistory` — use Seer's directly.
- **BR-09:** Validate token address in `burnsPaused()`.
- **BR-10:** Use internal call instead of `this.computeFees()`.
- **BR-11:** Add access control to `warnIfSeerMisconfigured`.

---

## BR-12 to BR-15 · LOW

- **BR-12:** Emit new values in event, not old.
- **BR-13:** Calculate actual split ratio dynamically.
- **BR-14:** Set token in constructor.
- **BR-15:** Document that adaptive fees are disabled by default.
