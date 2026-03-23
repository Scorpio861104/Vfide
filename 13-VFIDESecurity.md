# VFIDESecurity.sol — Hostile Audit Findings

**Lines:** 568 (5 contracts: SecurityHub, GuardianRegistry, GuardianLock, PanicGuard, EmergencyBreaker)  
**Score:** 2 Critical / 4 High / 5 Medium / 4 Low

---

## SEC-01 · CRITICAL — `SecurityHub.setModules` allows zeroing ALL modules

**Description:**  
No zero-address validation on any parameter. Zeroing all modules makes `isLocked()` return false for every vault permanently, disabling the entire security layer.

**Fix:**
```solidity
function setModules(address _guardianLock, address _panicGuard, address _breaker, address _ledger) external onlyDAO {
    // At least ONE security module must remain active
    require(
        _guardianLock != address(0) || _panicGuard != address(0) || _breaker != address(0),
        "SecurityHub: must keep at least one module"
    );
    guardianLock = GuardianLock(_guardianLock);
    panicGuard   = PanicGuard(_panicGuard);
    breaker      = EmergencyBreaker(_breaker);
    ledger       = IProofLedger(_ledger);
    emit ModulesSet(_guardianLock, _panicGuard, _breaker, _ledger);
}
```

---

## SEC-02 · CRITICAL — `castLock` reads threshold LIVE, not snapshot

**Fix:**
```solidity
function _guardiansNeededFromSnapshot(address vault) internal view returns (uint8 needed) {
    uint8 n = lockGuardianSnapshot[vault];
    if (n == 0) return 0;
    // ALSO snapshot the threshold on first vote:
    uint8 t = lockThresholdSnapshot[vault]; // NEW: snapshot threshold too
    if (t == 0) {
        needed = uint8((uint256(n) + 1) / 2);
    } else {
        needed = t;
    }
    if (needed > n) needed = n;
}

// In castLock, snapshot threshold on first vote:
if (a == 1) {
    lockGuardianSnapshot[vault] = registry.guardianCount(vault);
    lockThresholdSnapshot[vault] = registry.threshold(vault); // ADD THIS
}
```

---

## SEC-03 · HIGH — Quarantine only extends, never shortens

**Fix:** Add `reduceQuarantine` for DAO to shorten (but not eliminate) quarantines.

---

## SEC-04 · HIGH — `cancelSelfPanic` clears ALL quarantines

**Fix:**
```solidity
mapping(address => uint64) public selfPanicUntil; // Track self-panic separately

function selfPanic(uint64 duration) external {
    // ... existing checks ...
    address vault = vaultHub.vaultOf(msg.sender);
    selfPanicUntil[vault] = uint64(block.timestamp) + duration;
    _quarantine(vault, duration, 100, "self_panic");
}

function cancelSelfPanic() external {
    address vault = vaultHub.vaultOf(msg.sender);
    require(selfPanicUntil[vault] > block.timestamp, "not self-panicked");
    require(block.timestamp >= lastSelfPanic[msg.sender] + 1 hours, "too soon");
    
    // Only cancel if the CURRENT quarantine was set by self-panic
    // If DAO extended it, don't allow user cancellation
    require(quarantineUntil[vault] <= selfPanicUntil[vault], "SEC: DAO extended quarantine");
    
    quarantineUntil[vault] = 0;
    selfPanicUntil[vault] = 0;
}
```

---

## SEC-05 · HIGH — Toggle cooldown can be 0

**Fix:** `require(_cooldown >= 10 minutes, "SEC: minimum cooldown")`.

---

## SEC-06 · HIGH — Vault can add itself as guardian

**Fix:** `require(msg.sender != vault, "SEC: vault cannot add own guardians")`.

---

## SEC-07 to SEC-11 · MEDIUM

- **SEC-07:** Add guardian-initiated unlock with full consensus (all N guardians agree).
- **SEC-08:** Add access control: `require(msg.sender == address(vaultHub), "only VaultHub")`.
- **SEC-09:** Decrement approvals when a guardian is removed during active vote.
- **SEC-10:** Add `ISeerAutonomous` integration in PanicGuard.
- **SEC-11:** Create a `DaoRegistry` contract that all security contracts reference.

---

## SEC-12 to SEC-15 · LOW

- **SEC-12:** Good design — keep.
- **SEC-13:** Consider hashing guardian addresses in events for privacy.
- **SEC-14:** Add vault existence check in `isLocked`.
- **SEC-15:** Add event to `setSecurityHub`.
