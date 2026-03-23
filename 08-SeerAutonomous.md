# SeerAutonomous.sol — Hostile Audit Findings

**Lines:** 1,096  
**Score:** 3 Critical / 4 High / 5 Medium / 4 Low

---

## SA-01 · CRITICAL — `_liftRestriction` steps down only ONE level per call

**Description:**  
Users with perfect scores are trapped in a 5-day mandatory degradation: Frozen→Suspended→Limited→Warned→None requires 5 separate transactions over 5 days minimum.

**Fix:**
```solidity
function _liftRestriction(address subject) internal {
    uint16 score = seer.getScore(subject);
    // Calculate appropriate restriction level based on current score
    if (score >= highTrustThreshold) {
        activeRestriction[subject] = RestrictionLevel.None;
    } else if (score >= mediumThreshold) {
        activeRestriction[subject] = RestrictionLevel.Warned;
    } else if (score >= lowThreshold) {
        activeRestriction[subject] = RestrictionLevel.Limited;
    }
    // Skip levels based on score, don't force step-by-step
}
```

---

## SA-02 · CRITICAL — Circular transfer detection false positive

**Description:**  
`_detectPatterns` triggers "CircularTransfers" (severity 30) if ANY two transfers go to the same address within 1 hour. Paying a merchant twice = "circular transfer" = automatic restriction escalation.

**Fix:**
```solidity
// Require actual circular pattern (A→B→A), not just repeated destination:
function _detectCircular(address subject, address counterparty) internal view returns (bool) {
    // Check if counterparty has recently sent TO subject (actual circle)
    return recentTransfers[counterparty][subject].timestamp > block.timestamp - 1 hours;
}
```

---

## SA-03 · CRITICAL — `daoOverride` permanent with history wipe

**Fix:**
```solidity
function daoOverride(address subject) external onlyDAO {
    daoOverrides[subject] = true;
    daoOverrideExpiry[subject] = uint64(block.timestamp) + 30 days; // Expiring override
    // Don't clear violation history — just exempt from enforcement
    emit DAOOverride(subject);
}
```

---

## SA-04 · HIGH — Blocked actions don't increment networkActionCount

**Fix:** Count blocked actions separately: `networkBlockedCount++;` and factor into threshold calculations.

---

## SA-05 · HIGH — totalViolationScore never decays

**Fix:**
```solidity
function getEffectiveViolationScore(address subject) public view returns (uint256) {
    uint256 raw = totalViolationScore[subject];
    uint256 elapsed = block.timestamp - lastViolationTime[subject];
    uint256 decay = elapsed / 30 days; // Lose 1 point per month
    return decay >= raw ? 0 : raw - decay;
}
```

---

## SA-06 · HIGH — Double-punishment: restriction PLUS score penalty

**Fix:** Choose one: either apply restriction OR punish score, not both. Or reduce the score penalty when a restriction is also applied.

---

## SA-07 · HIGH — Challenge window auto-finalizes

**Fix:** Add explicit `challengeRestriction()` function callable by the affected user that triggers DAO review.

---

## SA-08 to SA-12 · MEDIUM

- **SA-08:** Use rolling average instead of resetting counters.
- **SA-09:** Remove `delete window.recentCounterparties` or limit gas refund.
- **SA-10:** Skip `onScoreChange` processing when `msg.sender == dao`.
- **SA-11:** Use `block.timestamp / 1 days` for calendar-day alignment.
- **SA-12:** Add cooldown between restriction expiry and re-application: `require(block.timestamp >= lastRestrictionExpiry + 1 hours)`.

---

## SA-13 to SA-16 · LOW

- **SA-13:** Implement WashTrading/SybilActivity detection or remove enum values.
- **SA-14:** Cache riskOracle result and call only once.
- **SA-15:** Emit event on `setRiskOracle`.
- **SA-16:** Remove constructor rate limits if always overwritten.
