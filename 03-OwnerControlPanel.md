# OwnerControlPanel.sol — Hostile Audit Findings

**Lines:** 1,365  
**Score:** 3 Critical / 3 High / 4 Medium / 3 Low

---

## OCP-01 · CRITICAL — `setContracts` has NO timelock — instant god-mode swap

**Location:** `setContracts()` function

**Description:**  
`setContracts` instantly replaces ALL core protocol references: token, presale, vaultHub, burnRouter, seer. This single function nullifies every other governance guardrail in the protocol. Any timelocked operation can be bypassed by swapping the target contract to one the attacker controls.

**Impact:** Complete protocol takeover in one transaction. Every governance queue in OCP is security theater while this function exists.

**Fix:**
```solidity
// Add timelock matching governance queue delay:
address[5] public pendingContracts; // token, presale, vaultHub, burnRouter, seer
uint64 public pendingContractsAt;

function proposeContracts(
    address _token, address _presale, address _vaultHub, 
    address _burnRouter, address _seer
) external onlyOwner {
    require(_token != address(0) && _vaultHub != address(0) && _seer != address(0), "zero");
    pendingContracts = [_token, _presale, _vaultHub, _burnRouter, _seer];
    pendingContractsAt = uint64(block.timestamp) + governanceDelay;
    emit ContractsProposed(_token, _presale, _vaultHub, _burnRouter, _seer, pendingContractsAt);
}

function applyContracts() external onlyOwner {
    require(pendingContractsAt != 0 && block.timestamp >= pendingContractsAt, "timelock");
    token = IVFIDEToken(pendingContracts[0]);
    presale = IVFIDEPresale(pendingContracts[1]);
    vaultHub = IVaultHub(pendingContracts[2]);
    burnRouter = IBurnRouter(pendingContracts[3]);
    seer = ISeer(pendingContracts[4]);
    delete pendingContracts;
    delete pendingContractsAt;
    emit ContractsSet(address(token), address(presale), address(vaultHub), address(burnRouter), address(seer));
}

function cancelContracts() external onlyOwner {
    delete pendingContracts;
    delete pendingContractsAt;
}
```

---

## OCP-02 · CRITICAL — `setEcosystemContracts` same instant-swap vulnerability

**Location:** `setEcosystemContracts()` function

**Description:**  
Same issue as OCP-01 but for ecosystem vault reference.

**Fix:** Apply identical timelock pattern as OCP-01.

---

## OCP-03 · CRITICAL — `governance_setDelay` can reduce timelock to 1 hour instantly

**Location:** `governance_setDelay()` function

**Description:**  
The governance delay itself can be changed with the current governance delay. But reducing the delay to 1 hour means all subsequent governance operations only need 1 hour wait. There's no meta-timelock on the reduction.

**Fix:**
```solidity
function governance_setDelay(uint64 _delay) external onlyOwner {
    require(_delay >= 24 hours, "OCP: minimum 24h delay");
    require(_delay <= 30 days, "OCP: maximum 30d delay");
    // Rate limit: can only reduce by 50% per call
    if (_delay < governanceDelay) {
        require(_delay >= governanceDelay / 2, "OCP: max 50% reduction per call");
    }
    // Use CURRENT delay for the change itself
    _queueGovernanceAction(abi.encodeWithSignature("_applyDelay(uint64)", _delay));
}
```

---

## OCP-04 · HIGH — 20+ high-impact functions skip governance queue

**Description:**  
Functions like `token_setModules`, `token_setSinks`, `presale_setPaused`, `vault_requestDAORecovery`, `sustainability_setBurnLimits`, `seer_setThresholds` all execute immediately without going through the governance queue.

**Fix:** Route all state-changing functions through the governance queue, or at minimum add a separate fast-track delay (e.g., 6 hours) for operational functions.

---

## OCP-05 · HIGH — `vault_freezeVault` calls vault's `setFrozen` directly

**Description:**  
OCP calls `vault.setFrozen(true)` but OCP is not the vault's owner. The call will revert for all user vaults because only the vault owner can call `setFrozen`.

**Fix:** Route through SecurityHub's PanicGuard instead:
```solidity
function vault_freezeVault(address vault, string calldata reason) external onlyOwner {
    panicGuard.reportRisk(vault, 30 days, 100, reason);
}
```

---

## OCP-06 · HIGH — `token_setModules` lacks apply/cancel wrappers

**Description:**  
`token_setModules` schedules timelocked changes on VFIDEToken (burnRouter, seer, etc.) but OCP provides no wrapper functions for the corresponding `apply*` or `cancel*` finalization calls. The admin must call VFIDEToken directly, bypassing OCP's governance layer.

**Fix:** Add `token_applyModules()` and `token_cancelModules()` wrappers in OCP.

---

## OCP-07 · MEDIUM — `getTokenStatus` reads raw `circuitBreaker` not `isCircuitBreakerActive()`

**Fix:**
```solidity
// Replace: circuitBreakerActive: token.circuitBreaker()
// With:    circuitBreakerActive: token.isCircuitBreakerActive()
```

---

## OCP-08 · MEDIUM — No cancel wrappers for VFIDEToken pending changes

**Fix:** Add `token_cancelPendingWhitelist()`, `token_cancelPendingSystemExempt()`, etc.

---

## OCP-09 · MEDIUM — `production_setupWithAutoSwap` bypasses governance queue

**Fix:** Remove this function or route through governance queue with extended delay.

---

## OCP-10 · MEDIUM — Ownership transfer has no deadline

**Fix:**
```solidity
uint64 public ownershipTransferDeadline;
function transferOwnership(address newOwner) public override onlyOwner {
    ownershipTransferDeadline = uint64(block.timestamp) + 7 days;
    // ... existing logic ...
}
function acceptOwnership() external {
    require(block.timestamp <= ownershipTransferDeadline, "OCP: transfer expired");
    // ... existing logic ...
}
```

---

## OCP-11 · LOW — Governance queue is public — front-running

**Description:** All queued governance actions are visible on-chain, enabling front-running by MEV bots. This is inherent to transparent governance and generally acceptable.

**Fix:** Document as known trade-off of on-chain governance transparency.

---

## OCP-12 · LOW — `presale_fundStableRefunds` broken

**Description:** OCP must hold stablecoins and approve presale. But OCP has no mechanism to receive stablecoins.

**Fix:** Add a `depositStableForRefunds(address token, uint256 amount)` function or change the flow to pull from treasury.

---

## OCP-13 · LOW — `receive()` silently accepts ETH

**Fix:** Remove `receive()` or add tracking: `emit ETHReceived(msg.sender, msg.value)`.
