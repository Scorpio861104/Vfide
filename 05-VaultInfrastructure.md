# VaultInfrastructure.sol — Hostile Audit Findings

**Lines:** 1,363  
**Score:** 3 Critical / 4 High / 5 Medium / 4 Low

---

## VI-01 · CRITICAL — `execute()` bypasses ALL vault transfer protections

**Location:** `execute(address target, uint256 value, bytes calldata data)`

**Description:**  
The generic `execute()` function allows the vault owner to make arbitrary external calls. This includes calling `vfideToken.transfer(attacker, fullBalance)` directly, completely bypassing withdrawal cooldowns, abnormal transaction detection, large transfer thresholds, and the pending-approval flow.

**Impact:** Every vault security feature is rendered meaningless. A compromised vault owner key drains the vault in one call.

**Fix:**
```solidity
function execute(address target, uint256 value, bytes calldata data) external onlyOwner nonReentrant notLocked returns (bytes memory) {
    // Block calls to the VFIDE token (forces use of transferVFIDE with protections)
    require(target != address(vfideToken), "Vault: use transferVFIDE");
    // Block approve/transferFrom on VFIDE (prevents approval bypass)
    if (data.length >= 4) {
        bytes4 selector = bytes4(data[:4]);
        require(
            !(target == address(vfideToken) && (
                selector == IERC20.approve.selector ||
                selector == IERC20.transferFrom.selector
            )),
            "Vault: blocked selector on VFIDE"
        );
    }
    // Also block calls to known DeFi routers that could swap VFIDE
    require(isAllowedTarget[target] || target == address(this), "Vault: target not allowed");
    
    (bool ok, bytes memory result) = target.call{value: value}(data);
    require(ok, "Vault: execution failed");
    return result;
}
```

---

## VI-02 · CRITICAL — `executeBatch()` same bypass, worse

**Fix:** Apply same target/selector restrictions as VI-01 to each call in the batch.

---

## VI-03 · CRITICAL — Recovery threshold of 1 guardian trivially exploitable

**Description:**  
A vault with 1 guardian (which is the DEFAULT from VaultHub deployment) means a single guardian can initiate recovery, wait 7 days, and steal the vault.

**Fix:**
```solidity
// In VaultHub._creationCode(), deploy with at least 2 guardians:
address[] memory guardians = new address[](2);
guardians[0] = owner_;
guardians[1] = address(0); // Placeholder — FORCE user to set a real guardian

// Better: require guardian setup within 7 days of vault creation
uint64 public constant GUARDIAN_SETUP_DEADLINE = 7 days;
function ensureGuardianSetup(address vault) external {
    require(block.timestamp <= vaultCreatedAt[vault] + GUARDIAN_SETUP_DEADLINE, "VH: setup expired");
    // ... force guardian addition ...
}
```

---

## VI-04 · HIGH — `__forceSetOwner` resets inheritance but NOT recovery

**Fix:**
```solidity
function __forceSetOwner(address newOwner) external {
    require(msg.sender == address(vaultHub), "only hub");
    // Reset ALL security state
    delete inheritanceConfig;
    delete pendingRecovery;     // ADD THIS
    delete recoveryApprovals;   // ADD THIS
    owner = newOwner;
    emit OwnerChanged(newOwner);
}
```

---

## VI-05 · HIGH — `approveVFIDE` not subject to protections

**Fix:** Add the same cooldown and abnormal-detection checks that `transferVFIDE` uses:
```solidity
function approveVFIDE(address spender, uint256 amount) external onlyOwner notLocked notFrozen {
    _checkCooldown();
    _checkAbnormalAmount(amount);
    vfideToken.approve(spender, amount);
}
```

---

## VI-06 · HIGH — `approveForceRecovery` has no cancel function

**Fix:** Add `cancelForceRecovery(address vault)` callable by DAO that clears pending approvals.

---

## VI-07 · HIGH — `setAllowedTarget` hub path is dead code

**Fix:** Either wire the hub path correctly or remove it.

---

## VI-08 to VI-12 · MEDIUM

- **VI-08:** Use proper ABI-encoded revert instead of string revert for pending approval.
- **VI-09:** Add `clearDenyInheritance()` function callable by owner.
- **VI-10:** Add `require(block.timestamp >= guardianMaturityTime)` check.
- **VI-11:** Add `function getInheritanceCancellationNonce() external view returns (uint256)`.
- **VI-12:** Add `RECOVERY_EXPIRY = 30 days` after which unapproved recovery requests expire.

---

## VI-13 to VI-16 · LOW

- **VI-13:** Document immutable references as by-design limitation.
- **VI-14:** Cache `pendingTransactions.length` and use single iteration.
- **VI-15:** Add rate limit to `ensureVault` or mark as known behavior.
- **VI-16:** Apply consistent zero-check policy to all module setters.
