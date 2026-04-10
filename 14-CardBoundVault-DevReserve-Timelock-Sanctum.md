# Batch: CardBoundVault, DevReserveVestingVault, DAOTimelock, SanctumVault

**Total Lines:** ~1,637  
**Score:** 2 Critical / 4 High / 7 Medium / 3 Low

---

## CardBoundVault.sol (449 lines)

### CBV-01 · CRITICAL — No recovery if admin AND wallet keys lost

**Fix:** Add an inheritance/social-recovery mechanism similar to UserVaultLegacy, or integrate with VaultRecoveryClaim.sol.

### CBV-02 · HIGH — No validation against non-recoverable vault addresses

**Fix:** `require(intent.toVault != address(0xdead) && intent.toVault != address(0))`.

### CBV-03 · HIGH — `setGuardian` no timelock

**Fix:** Add 24-hour timelock on guardian changes:
```solidity
struct PendingGuardianChange { address guardian; bool active; uint64 effectiveAt; }
PendingGuardianChange public pendingGuardianChange;

function proposeGuardianChange(address guardian, bool active) external onlyAdmin {
    pendingGuardianChange = PendingGuardianChange(guardian, active, uint64(block.timestamp) + 1 days);
}
function applyGuardianChange() external onlyAdmin {
    require(block.timestamp >= pendingGuardianChange.effectiveAt, "timelock");
    _setGuardian(pendingGuardianChange.guardian, pendingGuardianChange.active);
    delete pendingGuardianChange;
}
```

### CBV-04 · MEDIUM — Lost-update race on concurrent approvals

**Fix:** Use storage directly instead of memory copy, or use atomic increment.

### CBV-05 · MEDIUM — No rescueToken for non-VFIDE ERC20s

**Fix:** Add `rescueERC20(address token, address to, uint256 amount)` with `require(token != vfideToken)`.

---

## DevReserveVestingVault.sol (352 lines)

### DV-02 · MEDIUM — 14 token rounding difference

**Fix:** Document in comments. The last unlock compensates — this is correct behavior.

### DV-03 · MEDIUM — Naming asymmetry

**Fix:** Add `emergencyUnfreeze()` alias for `pauseClaims(false)` when called by DAO.

### DV-04 · LOW — Immutable params

**Fix:** Document as by-design. If migration needed, deploy new contract and transfer tokens.

---

## DAOTimelock.sol (308 lines)

### TL-01 · CRITICAL — Cascading 50% delay reductions

**Fix:**
```solidity
uint64 public constant ABSOLUTE_MIN_DELAY = 24 hours; // Can NEVER go below this

function emergencyReduceDelay(uint64 _newDelay) external onlyAdmin {
    require(_newDelay >= ABSOLUTE_MIN_DELAY, "TL: below absolute minimum");
    require(_newDelay >= delay / 2, "TL: max 50% reduction");
    require(block.timestamp >= lastEmergencyReduceTime + 24 hours, "TL: cooldown");
    // ... rest ...
}
```

### TL-02 · HIGH — No backup execution path

**Fix:** Add a secondary executor role (e.g., guardian committee) that can execute after an extended grace period (e.g., `eta + 3 days`).

### TL-03 · MEDIUM — Permissionless cleanup griefing

**Fix:** `require(msg.sender == admin, "TL: only admin can cleanup")`.

### TL-04 · LOW — Only validates specific ERC20 selectors

**Fix:** Document as known limitation, or validate all bool-returning functions.

---

## SanctumVault.sol (528 lines)

### SV-01 · HIGH — No balance check at proposal time

**Fix:** Add informational balance check (warning, not blocking):
```solidity
if (IERC20(token).balanceOf(address(this)) < amount) {
    emit InsufficientBalanceWarning(proposalId, amount, IERC20(token).balanceOf(address(this)));
}
```

### SV-02 · MEDIUM — No disbursement expiry

**Fix:** `require(block.timestamp <= d.proposedAt + 90 days, "SANCT: proposal expired")`.

### SV-03 · MEDIUM — Removed charity disbursements still valid

**Fix:** Check charity status at execution: `require(charities[d.charity].approved, "SANCT: charity removed")`.

### SV-04 · LOW — No cap on emergency recoveries

**Fix:** Add cap: `require(emergencyRecoveryCount < 100, "SANCT: recovery cap")`.
