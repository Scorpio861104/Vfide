# MainstreamPayments.sol — Hostile Audit Findings

**Lines:** 1,170 (5 contracts)  
**Score:** 3 Critical / 2 High / 5 Medium / 4 Low

---

## MP-01 · CRITICAL — `TerminalRegistry.recordPayment` fully permissionless

**Description:**  
Anyone can call `recordPayment(terminalId, amount, token)` to fake terminal payment records, inflating txCount, totalVolume, and emitting fake events that off-chain systems may trust.

**Fix:**
```solidity
function recordPayment(bytes32 terminalId, uint256 amount, address token) external {
    Terminal storage t = terminals[terminalId];
    require(t.merchant != address(0), "terminal not found");
    // Only the terminal's registered merchant or authorized POS system can record
    require(msg.sender == t.merchant || msg.sender == t.posSystem, "not authorized");
    // ...
}
```

---

## MP-02 · CRITICAL — `MultiCurrencyRouter.recordDirectPayment` fully permissionless

**Fix:** Same pattern — restrict to authorized callers:
```solidity
function recordDirectPayment(...) external {
    require(authorizedRecorder[msg.sender], "not authorized");
    // ...
}
```

---

## MP-03 · CRITICAL — `_rewardRampUser` — provider can farm ProofScore

**Description:**  
A registered provider can call `_rewardRampUser` for any user up to 1000 times, granting +5 ProofScore each time = +5000 total = 50% score boost.

**Fix:**
```solidity
mapping(address => mapping(address => uint256)) public rampRewardCount;
uint256 public constant MAX_RAMP_REWARDS_PER_USER = 5;

function _rewardRampUser(address user) internal {
    require(rampRewardCount[msg.sender][user] < MAX_RAMP_REWARDS_PER_USER, "reward limit");
    rampRewardCount[msg.sender][user]++;
    seer.reward(user, 5, "ramp_usage");
}
```

---

## MP-04 · HIGH — `SessionKeyManager.recordSpend` no transfer verification

**Fix:** Require proof of transfer (e.g., balance change) or make the contract custodial for session spending.

---

## MP-05 · HIGH — `forceSetPrice` bypasses 50% sanity check

**Fix:** Apply the same 50% deviation check to `forceSetPrice`, or require a longer timelock.

---

## MP-06 to MP-11 · MEDIUM

- **MP-06:** Use `block.timestamp + 300` for deadline dynamically, not baked in at calldata build time.
- **MP-07:** Clean `providerList` on removal using swap-and-pop.
- **MP-08:** `reactivateTerminal` should require DAO approval if DAO deactivated it.
- **MP-09:** `previewSwap` should return actual router quote, not placeholder.
- **MP-10:** Add session cleanup function or automatic expiry.
- **MP-11:** Add 5 separate `setDAO` functions or use a shared DAO registry.

---

## MP-12 to MP-15 · LOW

- **MP-12:** Add events for state changes.
- **MP-13:** Add `PaymentWithChannel` emission or remove the event.
- **MP-14:** Check cap BEFORE push: `require(userRampHistory[user].length < cap)`.
- **MP-15:** `previewCheckoutPrice.vfideFormatted` should round up for buyer safety.
