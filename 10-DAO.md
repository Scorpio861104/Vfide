# DAO.sol — Hostile Audit Findings

**Lines:** 765  
**Score:** 3 Critical / 4 High / 5 Medium / 3 Low

---

## DAO-01 · CRITICAL — Nested function definitions inside `setProposalCooldown`

**Location:** Lines 213-235

**Description:**  
`proposeEmergencyTimelockReplacement()` and `executeEmergencyTimelockReplacement()` are defined INSIDE the body of `setProposalCooldown()`. Solidity 0.8.30 does not support nested functions. This will either fail to compile or produce unexpected behavior.

**Fix:**
```solidity
// Extract nested functions to top level (inside contract, outside other functions):

function setProposalCooldown(uint64 _cooldown) external onlyTimelock {
    require(_cooldown <= 30 days, "DAO: cooldown too long");
    proposalCooldown = _cooldown;
    emit ProposalCooldownSet(_cooldown);
}

// F-22 FIX: Move to top-level contract functions
function proposeEmergencyTimelockReplacement(address newTimelock) external onlyAdmin {
    require(newTimelock != address(0), "DAO: zero");
    pendingEmergencyTimelock = newTimelock;
    emergencyTimelockReadyAt = uint64(block.timestamp) + uint64(EMERGENCY_TIMELOCK_DELAY);
    emit EmergencyTimelockReplacementProposed(newTimelock, emergencyTimelockReadyAt);
}

function executeEmergencyTimelockReplacement() external onlyAdmin {
    require(emergencyTimelockReadyAt > 0 && block.timestamp >= emergencyTimelockReadyAt, "DAO: not ready");
    address newTimelock = pendingEmergencyTimelock;
    timelock = IDAOTimelock(newTimelock);
    delete pendingEmergencyTimelock;
    delete emergencyTimelockReadyAt;
    emit EmergencyTimelockReplacementExecuted(newTimelock);
}

// ALSO ADD: Cancel function (missing in original)
function cancelEmergencyTimelockReplacement() external onlyAdmin {
    require(pendingEmergencyTimelock != address(0), "DAO: no pending");
    delete pendingEmergencyTimelock;
    delete emergencyTimelockReadyAt;
}
```

---

## DAO-02 · CRITICAL — Emergency quorum rescue geometrically converges to 1

**Description:**  
F-21 FIX requires `_minVotes >= minVotesRequired / 10`. But cascading: 5000→500→50→5→1 in 4 cycles (56 days). Admin achieves total governance capture.

**Fix:**
```solidity
// Add absolute floor that can NEVER be reduced below:
uint256 public constant ABSOLUTE_MIN_QUORUM = 500;

function executeEmergencyQuorumRescue(uint256 _minVotes, uint256 _minParticipation) external onlyAdmin {
    require(_minVotes >= ABSOLUTE_MIN_QUORUM, "DAO: below absolute minimum");
    // ... existing checks ...
}
```

---

## DAO-03 · CRITICAL — Admin emergency powers bypass ALL governance

**Fix:** Require multi-sig for emergency actions (at least 2 of 3 admin keys), or add a guardian committee that must co-sign emergency operations.

---

## DAO-04 · HIGH — F-28 FIX off-by-one with stale lastActivity

**Fix:** Require lastActivity within a reasonable window (e.g., 90 days), not just "before proposal":
```solidity
require(
    voterLastActivity > 0 && 
    voterLastActivity < p.start - votingDelay &&
    voterLastActivity > block.timestamp - 90 days,
    "DAO: score not recently established"
);
```

---

## DAO-05 · HIGH — Score snapshot at vote time, not proposal creation

**Fix:** Snapshot all eligible voters' scores at proposal creation time (gas-expensive but secure), or use a commit-reveal voting scheme.

---

## DAO-06 · HIGH — Fatigue asymmetry

**Fix:** Document the behavior clearly and consider using a per-epoch fatigue model instead of per-vote.

---

## DAO-07 · HIGH — `markExecuted` admin soft veto

**Fix:** Restrict to only marking proposals whose timelock has actually been executed:
```solidity
function markExecuted(uint256 id) external {
    // Only timelock contract can confirm execution
    require(msg.sender == address(timelock), "DAO: only timelock");
    // ...
}
```

---

## DAO-08 to DAO-12 · MEDIUM

- **DAO-08:** Don't allow withdrawal once voting has started, regardless of vote count.
- **DAO-09:** Add cost to dispute flagging (require minimum ProofScore or small bond).
- **DAO-10:** Reduce cap to 200 or implement cleanup mechanism.
- **DAO-11:** Track vote direction in a separate mapping or remove misleading return values.
- **DAO-12:** Add `QUEUE_EXPIRY = 30 days` after which queued proposals expire.

---

## DAO-13 to DAO-15 · LOW

- **DAO-13:** Consider 3-day votingDelay for L2 deployments.
- **DAO-14:** Document absolute quorum model and consider token-weighted alternative.
- **DAO-15:** See DAO-01 fix — add cancellation function.
