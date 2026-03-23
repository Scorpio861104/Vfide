# Batch: SeerGuardian, EscrowManager, CouncilManager, WithdrawalQueue, AdminMultiSig, PayrollManager, SubscriptionManager, SeerPolicyGuard, SeerView, CouncilSalary

**Total Lines:** ~3,896  
**Score:** 2 Critical / 4 High / 5 Medium / 4 Low

---

## BATCH-01 · CRITICAL — SubscriptionManager: anyone can force-trigger payments

**Location:** `processSubscription()` after `MERCHANT_EXCLUSIVE_WINDOW`

**Description:**  
After the merchant's 24-hour exclusive window, anyone (keeper/bot) can call `processSubscription` to trigger payment from a user's vault. A griefing bot can force payments for any user.

**Fix:**
```solidity
function processSubscription(uint256 subId) external nonReentrant {
    Subscription storage s = subscriptions[subId];
    require(s.active && !s.paused, "inactive");
    require(block.timestamp >= s.nextPayment, "too early");
    
    // Only merchant or subscriber (not any third party)
    bool inExclusiveWindow = block.timestamp < s.nextPayment + MERCHANT_EXCLUSIVE_WINDOW;
    if (inExclusiveWindow) {
        require(msg.sender == s.merchant, "SM: merchant exclusive");
    } else {
        // After exclusive window: merchant OR subscriber OR DAO-authorized keeper
        require(
            msg.sender == s.merchant || msg.sender == s.subscriber || msg.sender == dao,
            "SM: not authorized"
        );
    }
    // ...
}
```

---

## BATCH-02 · CRITICAL — EscrowManager circular dependency when dao==arbiter

**Description:**  
If the initial arbiter IS the DAO (set in constructor), and a DAO member is party to an escrow, the "conflict of interest" check blocks resolution. No fallback resolver exists.

**Fix:**
```solidity
// Separate dao and arbiter at deployment:
constructor(address _arbiter, address _seer) {
    require(_arbiter != address(0), "zero");
    arbiter = _arbiter;
    dao = msg.sender; // Different from arbiter
    // OR: require(_arbiter != _dao, "arbiter must differ from DAO")
}

// Add fallback: if both arbiter and DAO are conflicted, allow a timeout resolution:
function timeoutResolve(uint256 id) external {
    Escrow storage e = escrows[id];
    require(e.state == State.DISPUTED, "not disputed");
    require(block.timestamp >= e.createdAt + 90 days, "ESC: timeout not reached");
    // Default to buyer refund after 90 days of unresolved dispute
    e.state = State.REFUNDED;
    IERC20(e.token).safeTransfer(e.buyer, e.amount);
}
```

---

## BATCH-03 · HIGH — SeerGuardian.checkAndEnforce permissionless

**Fix:**
```solidity
function checkAndEnforce(address subject) external {
    // Rate limit: once per hour per subject
    require(block.timestamp >= lastEnforceCheck[subject] + 1 hours, "SG: cooldown");
    lastEnforceCheck[subject] = uint64(block.timestamp);
    // ... existing logic ...
}
```

---

## BATCH-04 · HIGH — CouncilManager reads wrong pool

**Fix:** Call `allocateIncoming()` before reading balance, or read from `ecosystemVault.councilPool()` instead of `token.balanceOf()`.

---

## BATCH-05 · HIGH — PayrollManager streams no expiry

**Fix:**
```solidity
uint256 public constant MAX_STREAM_DURATION = 365 days;

function createStream(...) external {
    // ...
    streams[id].expiryTime = block.timestamp + MAX_STREAM_DURATION;
}

function claimExpiredStream(uint256 id) external {
    Stream storage s = streams[id];
    require(block.timestamp >= s.expiryTime, "not expired");
    require(s.active, "inactive");
    // Return remaining balance to payer (or DAO if payer unreachable)
}
```

---

## BATCH-06 · HIGH — SeerPolicyGuard non-unique changeId

**Fix:** Include a nonce in the change ID:
```solidity
uint256 public policyNonce;

function schedulePolicyChange(bytes4 selector, uint8 pclass) external onlyDAO returns (bytes32 changeId, uint64 readyAt) {
    changeId = keccak256(abi.encodePacked(selector, pclass, policyNonce++));
    // ...
}
```

---

## BATCH-07 to BATCH-11 · MEDIUM

- **BATCH-07:** Don't clear `daoOverridden` on lift — let it expire separately.
- **BATCH-08:** Add `buyerClaimTimeout()` after `releaseTime + 30 days`.
- **BATCH-09:** Either implement a concrete inheritor or remove WithdrawalQueue.
- **BATCH-10:** Call `allocateIncoming()` at start of `distributePayments()`.
- **BATCH-11:** Emit `PaymentFailed` event and add `getFailedPaymentCount(subId)` view.

---

## BATCH-12 to BATCH-15 · LOW

- **BATCH-12:** Document penalty cap at 5th violation.
- **BATCH-13:** Create central DaoRegistry contract.
- **BATCH-14:** Add timelock to SeerSocial reference changes.
- **BATCH-15:** Add `cancelPolicyChange(bytes32 changeId)` function.
