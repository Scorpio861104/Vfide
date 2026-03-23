# VFIDEPresale.sol — Hostile Audit Findings

**Lines:** 1,325  
**Score:** 2 Critical / 3 High / 5 Medium / 4 Low

---

## P-01 · CRITICAL — Cancel-rebuy refund inflation vector

**Location:** `cancelPurchase()` + F-03 FIX interaction

**Description:**  
F-03 intentionally preserves `stableContributed`/`ethContributed` on cancel (for refund tracking) but also decrements `totalAllocated`, allowing the user to rebuy. A user can:
1. Buy 1,000 VFIDE (contributes 100 USDC)
2. Cancel → `stableContributed` stays at 100, `totalAllocated` decremented
3. Buy again → another 100 USDC contributed, `stableContributed` now 200
4. Repeat up to `MAX_PURCHASES_PER_WALLET` (100 times)
5. If presale fails → user claims refund on 10,000 USDC but only deposited 100

**Impact:** 100x refund inflation. Users can extract more from the presale than they deposited.

**Fix:**
```solidity
function cancelPurchase(uint256 purchaseIndex) external nonReentrant {
    Purchase storage p = purchases[msg.sender][purchaseIndex];
    require(!p.cancelled, "already cancelled");
    p.cancelled = true;
    
    // FIX: Also decrement contribution tracking so refund claims match actual deposits
    if (p.paidWithEth) {
        ethContributed[msg.sender] -= p.ethPaid;
        totalEthRaised -= p.ethPaid;
    } else {
        stableContributed[msg.sender] -= p.stablePaid;
    }
    usdContributed[msg.sender] -= p.usdValue;
    totalUsdRaised -= p.usdValue;
    totalAllocated -= p.tokenAmount;
    totalSold -= p.tokenAmount;
    
    emit PurchaseCancelled(msg.sender, purchaseIndex, p.tokenAmount);
}
```

**Alternative fix:** Prevent re-purchase after any cancellation:
```solidity
mapping(address => bool) public hasCancelled;

function cancelPurchase(uint256 purchaseIndex) external {
    // ... existing logic ...
    hasCancelled[msg.sender] = true;
}

function buyTokens(...) external {
    require(!hasCancelled[msg.sender], "Presale: cancelled users cannot rebuy");
    // ...
}
```

---

## P-02 · CRITICAL — `cancelPurchase` decrements `totalUsdRaised` but NOT `usdContributed`

**Location:** `cancelPurchase()`

**Description:**  
`totalUsdRaised` is decremented on cancel (affecting minimum goal check) but `usdContributed[msg.sender]` is preserved (for refund tracking). The `highWaterMarkUsdRaised` (F-29 FIX) protects listing price but NOT the goal check. An attacker can:
1. Contribute enough to push `totalUsdRaised` above goal
2. Cancel → `totalUsdRaised` drops below goal
3. Now the presale looks like it failed but the attacker still has inflated `usdContributed`

**Impact:** Goal-check manipulation enables artificial presale failure while retaining refund claims.

**Fix:** See P-01 fix — decrement `usdContributed` alongside `totalUsdRaised`.

---

## P-03 · HIGH — Fee-on-transfer token accounting mismatch

**Location:** `buyTokensWithStable()`

**Description:**  
`usdContributed` uses the nominal pre-fee amount, while `stableContributed` uses the actual received amount (balance-after minus balance-before). For fee-on-transfer tokens like USDT, these diverge. If USDT charges 0.1% fee on a 10,000 USDC transfer, `usdContributed` records 10,000 but only 9,990 was received.

**Impact:** Refund calculations based on `usdContributed` will attempt to refund more than the contract holds.

**Fix:**
```solidity
// Use actual received amount for BOTH usdContributed and stableContributed:
uint256 balBefore = IERC20(stable).balanceOf(address(this));
IERC20(stable).safeTransferFrom(msg.sender, address(this), stableAmount);
uint256 actualReceived = IERC20(stable).balanceOf(address(this)) - balBefore;

// Recalculate USD value based on actual received (not nominal):
uint256 actualUsd = (actualReceived * 10**18) / (10**stableDecimals);

usdContributed[msg.sender] += actualUsd;    // Use actual
stableContributed[msg.sender] += actualReceived; // Use actual
totalUsdRaised += actualUsd;
```

---

## P-04 · HIGH — `_pendingClaims()` underestimates after cancellation

**Location:** `_pendingClaims()` → `totalSold - totalClaimed`

**Description:**  
`cancelPurchase` decrements `totalSold` but doesn't increment `totalClaimed`. The `_pendingClaims()` formula `totalSold - totalClaimed` then underestimates actual pending claims. `finalizePresale` uses this to calculate how many tokens to send to treasury, potentially over-sending and leaving insufficient tokens for legitimate claims.

**Impact:** Contract may be unable to fulfill legitimate token claims after finalization.

**Fix:**
```solidity
// Option A: Track cancelled tokens separately
uint256 public totalCancelled;

function cancelPurchase(uint256 purchaseIndex) external {
    // ...
    totalCancelled += p.tokenAmount;
    // DON'T decrement totalSold
}

function _pendingClaims() internal view returns (uint256) {
    return totalSold - totalClaimed - totalCancelled;
}

// Option B: Increment totalClaimed on cancel
function cancelPurchase(uint256 purchaseIndex) external {
    // ...
    totalSold -= p.tokenAmount;
    // Also mark these as "claimed" (i.e., no longer pending):
    // No change needed if both are decremented symmetrically
}
```

---

## P-05 · HIGH — `withdrawUnsold` and `finalizePresale` competing unsold-token logic

**Location:** Both functions handle unsold token disposition

**Description:**  
Both `withdrawUnsold` and `finalizePresale` contain logic to transfer unsold tokens. If `withdrawUnsold` is called first, then `finalizePresale` attempts to send tokens that were already withdrawn, potentially double-counting or reverting.

**Fix:**
```solidity
// Add mutual exclusion flag:
bool public unsoldWithdrawn;

function withdrawUnsold() external onlyDAO {
    require(!unsoldWithdrawn, "already withdrawn");
    unsoldWithdrawn = true;
    // ... existing logic ...
}

function finalizePresale() external {
    // ... existing logic ...
    if (!unsoldWithdrawn) {
        // send unsold to treasury
        unsoldWithdrawn = true;
    }
}
```

---

## P-06 · MEDIUM — `setStablecoinRegistry` has no timelock

**Description:**  
Swapping the stablecoin registry instantly could add malicious tokens or remove valid ones mid-presale.

**Fix:** Add a timelock matching other critical configuration changes (~48 hours).

---

## P-07 · MEDIUM — ETH oracle centralized with exponential manipulation

**Description:**  
`updatePrice` has a 50% per-call cap but no time constraint between calls. In 10 blocks (~2 minutes): `100 → 150 → 225 → 337 → ...` reaching 57x the original price.

**Fix:**
```solidity
uint256 public lastPriceUpdate;
uint256 public constant PRICE_UPDATE_COOLDOWN = 1 hours;

function updatePrice(uint256 newPrice) external onlyDAO {
    require(block.timestamp >= lastPriceUpdate + PRICE_UPDATE_COOLDOWN, "cooldown");
    // ... existing 50% cap logic ...
    lastPriceUpdate = block.timestamp;
}
```

---

## P-08 · MEDIUM — `claimAll` unbounded iteration

**Description:**  
`claimAll` iterates over all user purchases. A user with many purchases (up to `MAX_PURCHASES_PER_WALLET = 100`) could hit gas limits.

**Fix:** Add pagination or batch processing with an offset parameter.

---

## P-09 · MEDIUM — `emergencyWithdraw` timing window

**Description:**  
`emergencyWithdraw` drains ALL ETH from the contract. If called during the refund preparation window, legitimate ETH refunds become impossible.

**Fix:** Add a check that emergency withdrawal cannot occur during active refund periods, or protect a minimum ETH reserve matching `ethContributed` sums.

---

## P-10 · MEDIUM — Stale ETH price manipulation via sequential 50% updates

**Description:**  
The ETH price oracle allows sequential 50% updates without a time constraint between calls. See P-07 for the exponential manipulation vector.

**Fix:** Same as P-07 — add a cooldown between price updates.

---

## P-11 · LOW — Tier 2 lock validation confusing error path

**Description:**  
The Tier 2 token locking logic has a confusing control flow where the error message doesn't clearly indicate what went wrong when tier validation fails.

**Fix:** Add explicit error messages for each tier validation failure mode.

---

## P-12 · LOW — Precision loss for small stablecoin amounts

**Description:**  
`calculateTokensFromUsdTier` uses integer division that can lose precision for small amounts (< 1 USD equivalent), resulting in 0 tokens for valid contributions.

**Fix:** Add a minimum contribution check: `require(usdAmount >= MIN_CONTRIBUTION, "below minimum")`.

---

## P-13 · LOW — No event on `setEthAccepted` toggle

**Fix:**
```solidity
event EthAcceptedSet(bool accepted);
function setEthAccepted(bool accepted) external onlyDAO {
    ethAccepted = accepted;
    emit EthAcceptedSet(accepted);
}
```

---

## P-14 · LOW — ETH payment path hardcodes Tier 2

**Description:**  
`buyTokens` with ETH always processes as Tier 2, regardless of the amount. Users wanting Tier 1 pricing must use stablecoins.

**Fix:** Add tier parameter to ETH purchase path, or document this as intended behavior.
