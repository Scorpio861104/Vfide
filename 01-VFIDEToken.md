# VFIDEToken.sol — Hostile Audit Findings

**Lines:** 1,161  
**Score:** 1 Critical / 4 High / 5 Medium / 4 Low

---

## T-01 · CRITICAL — `totalBurnedToDate()` outside contract body

**Location:** After line ~1155 (after closing brace of contract)

**Description:**  
The `totalBurnedToDate()` function is defined AFTER the contract's closing `}` brace. Solidity does not allow free-standing functions to be part of a contract. This function will either fail to compile or be inaccessible.

**Impact:** Deployment blocker. The function is dead code and cannot be called.

**Fix:**
```solidity
// BEFORE (broken — function is outside contract body):
} // end of contract VFIDEToken

function totalBurnedToDate() external view returns (uint256) {
    return _totalBurned;
}

// AFTER (move inside the contract body, before the closing brace):
    function totalBurnedToDate() external view returns (uint256) {
        return _totalBurned;
    }
} // end of contract VFIDEToken
```

---

## T-02 · HIGH — Anti-whale `maxWalletBalance` check uses gross pre-fee amount

**Location:** `_transfer()` function, wallet balance check

**Description:**  
The anti-whale check compares `balanceOf(to) + amount` against `maxWalletBalance`, where `amount` is the gross transfer amount BEFORE fees are deducted. But the recipient only receives `amount - fees`. This means transfers that would result in valid post-fee balances are incorrectly rejected.

**Impact:** Legitimate transfers near the wallet cap are blocked. Users cannot receive transfers that would put their gross (but not net) balance over the cap.

**Fix:**
```solidity
// BEFORE:
require(balanceOf(to) + amount <= maxWalletBalance, "exceeds max wallet");

// AFTER — check with net amount after fees:
uint256 netAmount = amount - totalFee; // calculate fees first
require(balanceOf(to) + netAmount <= maxWalletBalance, "exceeds max wallet");
```

---

## T-03 · HIGH — `proposeWhitelist` missing pending-proposal guard

**Location:** `proposeWhitelist()` function

**Description:**  
Unlike `proposeSystemExempt` (which has an F-06 FIX preventing silent overwrite), `proposeWhitelist` has no guard checking whether a proposal is already pending. The owner can silently overwrite a pending whitelist proposal, bypassing timelock transparency.

**Impact:** Owner can replace a pending whitelist proposal (which the community is monitoring) with a different one, then execute the new one after the old timelock expires.

**Fix:**
```solidity
// Add pending-proposal guard matching proposeSystemExempt:
function proposeWhitelist(address account, bool status) external onlyOwner {
    require(
        pendingWhitelist[account].effectiveAt == 0,
        "VFIDEToken: existing proposal pending — cancel first"
    );
    pendingWhitelist[account] = PendingWhitelist({
        status: status,
        effectiveAt: uint64(block.timestamp) + whitelistDelay
    });
    emit WhitelistProposed(account, status, pendingWhitelist[account].effectiveAt);
}
```

---

## T-04 · HIGH — `setLedger` accepts zero address even when `policyLocked`

**Location:** `setLedger()` function

**Description:**  
When `policyLocked` is true, most configuration changes are blocked. But `setLedger(address(0))` is still accepted, which permanently disables the audit trail. Once `policyLocked` is set, there's no way to re-enable the ledger.

**Impact:** Owner can permanently disable audit logging after locking down the protocol, removing transparency guarantees.

**Fix:**
```solidity
function setLedger(address _ledger) external onlyOwner {
    if (policyLocked) {
        require(_ledger != address(0), "VFIDEToken: cannot disable ledger after policy lock");
    }
    ledger = IProofLedger(_ledger);
    emit LedgerSet(_ledger);
}
```

---

## T-05 · HIGH — `_vaultOfAddr` lacks try/catch unlike `_isVault` and `_hasVault`

**Location:** `_vaultOfAddr()` internal function

**Description:**  
`_isVault()` and `_hasVault()` both use `try/catch` when calling the vaultHub, so a buggy or upgraded vaultHub won't freeze transfers. But `_vaultOfAddr()` makes a raw call without try/catch. If the vaultHub reverts (upgrade bug, self-destruct, incompatible interface), ALL token transfers freeze because `_vaultOfAddr` is called in the transfer path.

**Impact:** A single vaultHub failure permanently freezes all token transfers.

**Fix:**
```solidity
function _vaultOfAddr(address a) internal view returns (address) {
    if (address(vaultHub) == address(0)) return address(0);
    try vaultHub.vaultOf(a) returns (address v) {
        return v;
    } catch {
        return address(0);
    }
}
```

---

## T-06 · MEDIUM — `canTransfer` view doesn't check `isFrozen`

**Location:** `canTransfer()` view function

**Description:**  
The `canTransfer()` preview function checks various transfer conditions but omits the `isFrozen[from]` check. Frozen addresses appear transferrable in UI previews.

**Fix:**
```solidity
function canTransfer(address from, address to, uint256 amount) external view returns (bool, string memory) {
    if (isFrozen[from]) return (false, "sender frozen");
    if (isFrozen[to]) return (false, "recipient frozen");
    // ... existing checks ...
}
```

---

## T-07 · MEDIUM — Circuit breaker expiry leaves dirty state

**Location:** Circuit breaker logic

**Description:**  
When the circuit breaker expires (via `circuitBreakerExpiry`), the function `isCircuitBreakerActive()` correctly returns false. But the storage variable `circuitBreaker` remains `true`. Any code that reads `circuitBreaker` directly (instead of calling `isCircuitBreakerActive()`) will incorrectly think the breaker is still active.

**Fix:**
```solidity
// Option A: Add cleanup on read
function isCircuitBreakerActive() public view returns (bool) {
    if (!circuitBreaker) return false;
    if (circuitBreakerExpiry > 0 && block.timestamp >= circuitBreakerExpiry) {
        return false; // expired
    }
    return true;
}

// Option B: Add explicit cleanup function
function clearExpiredCircuitBreaker() external {
    if (circuitBreaker && circuitBreakerExpiry > 0 && block.timestamp >= circuitBreakerExpiry) {
        circuitBreaker = false;
        circuitBreakerExpiry = 0;
        emit CircuitBreakerCleared();
    }
}
```

---

## T-08 · MEDIUM — `dailyTransferred` tracks gross amounts including fees

**Location:** `_transfer()` daily limit tracking

**Description:**  
`dailyTransferred[from] += amount` uses the gross pre-fee amount. If a user transfers 100 VFIDE and 2 VFIDE are burned as fees, their daily limit is consumed by 100, but only 98 actually moved. The daily limit is consumed faster than actual economic activity.

**Fix:**
```solidity
// Track net amount transferred (after fees) instead of gross:
uint256 netAmount = amount - totalFee;
dailyTransferred[from] += netAmount;
```

---

## T-09 · MEDIUM — `permit()` missing frozen/blacklist check on `owner`

**Location:** `permit()` EIP-2612 function

**Description:**  
The `permit()` function allows EIP-2612 gasless approvals but doesn't check if the `owner` (the approver) is frozen or blacklisted. A blacklisted address can grant approval via signed permits, which can then be used by a non-blacklisted spender to move tokens.

**Fix:**
```solidity
function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
    require(!isFrozen[owner], "VFIDEToken: owner frozen");
    require(!isBlacklisted[owner], "VFIDEToken: owner blacklisted");
    // ... existing permit logic ...
}
```

---

## T-10 · MEDIUM — `_isContract` unreliable during construction

**Location:** `_isContract()` internal function

**Description:**  
Uses `extcodesize(addr) > 0` which returns 0 for contracts during their constructor execution. This means contract-creation attacks bypass contract checks during deployment.

**Fix:**
```solidity
function _isContract(address addr) internal view returns (bool) {
    uint256 size;
    assembly { size := extcodesize(addr) }
    // Also check for pending code during construction
    return size > 0 || addr.codehash != bytes32(0);
}
// Note: This is a known EVM limitation. For maximum safety, 
// consider using OpenZeppelin's Address.isContract() which documents this caveat.
```

---

## T-11 · LOW — `setSanctumSink` always rejects zero address

**Location:** `setSanctumSink()` function

**Description:**  
`setSanctumSink` rejects `address(0)`, but other sink setters (burn sink, ecosystem sink) accept zero to disable. This asymmetry means the sanctum sink can never be disabled once set.

**Fix:**
```solidity
// Allow zero address to disable sanctum sink (matching other sinks):
function setSanctumSink(address _sink) external onlyOwner {
    // Remove: require(_sink != address(0));
    sanctumSink = _sink;
    emit SanctumSinkSet(_sink);
}
```

---

## T-12 · LOW — No events for `setSecurityBypass` / `setFeeBypass`

**Location:** Bypass setter functions

**Description:**  
State changes to security and fee bypass flags don't emit events, making them invisible to off-chain monitoring.

**Fix:**
```solidity
event SecurityBypassSet(address indexed addr, bool bypassed);
event FeeBypassSet(address indexed addr, bool bypassed);

function setSecurityBypass(address addr, bool bypassed) external onlyOwner {
    securityBypass[addr] = bypassed;
    emit SecurityBypassSet(addr, bypassed);
}
```

---

## T-13 · LOW — `_mint` is internal and unreachable post-constructor

**Description:**  
The `_mint` function exists but is never called outside the constructor. Post-deployment, no new VFIDE can ever be minted. This is correct for a fixed-supply token but the dead code adds surface area.

**Fix:** Add a comment clarifying intent, or remove `_mint` and inline the mint logic in the constructor.

---

## T-14 · LOW — No `renounceOwnership` override

**Description:**  
The contract inherits Ownable but doesn't override `renounceOwnership()`. An accidental call would permanently lock out the owner.

**Fix:**
```solidity
function renounceOwnership() public view override onlyOwner {
    revert("VFIDEToken: renounce disabled");
}
```
