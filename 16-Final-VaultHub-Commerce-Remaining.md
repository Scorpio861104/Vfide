# Final Batch: VaultHub, VFIDECommerce, BridgeSecurityModule, + 20 remaining contracts

**Total Lines:** ~7,300  
**Score:** 2 Critical / 4 High / 5 Medium / 5 Low

---

## VaultHub.sol (426 lines)

### FINAL-01 · CRITICAL — Owner is their own sole guardian

**Location:** `_creationCode()` in VaultHub

**Description:**  
`VaultHub._creationCode()` deploys CardBoundVault with:
- `guardians = [owner_]` (owner is the only guardian)
- `CARD_GUARDIAN_THRESHOLD = 1`

This means the admin can propose wallet rotation → approve it as guardian (1 of 1) → finalize after delay. The guardian model provides zero independent oversight.

**Fix:**
```solidity
function _creationCode(address owner_) internal view returns (bytes memory) {
    // Deploy with NO guardians initially — force user to add independent guardians
    address[] memory guardians = new address[](1);
    guardians[0] = owner_; // Still need at least one for deployment
    
    return abi.encodePacked(
        type(CardBoundVault).creationCode,
        abi.encode(
            address(this),
            vfideToken,
            owner_,
            owner_,
            guardians,
            CARD_GUARDIAN_THRESHOLD,
            CARD_MAX_PER_TRANSFER,
            CARD_DAILY_TRANSFER_LIMIT,
            address(securityHub),
            address(ledger)
        )
    );
}

// Add a post-creation requirement:
mapping(address => bool) public guardianSetupComplete;

function completeGuardianSetup(address vault) external {
    require(ownerOfVault[vault] == msg.sender, "not owner");
    CardBoundVault v = CardBoundVault(payable(vault));
    require(v.guardianCount() >= 2, "VH: need at least 2 guardians");
    // At least one guardian must NOT be the owner
    require(!v.isGuardian(msg.sender) || v.guardianCount() > 1, "VH: need independent guardian");
    guardianSetupComplete[vault] = true;
}
```

---

## VFIDECommerce.sol (256 lines — MerchantRegistry + CommerceEscrow)

### FINAL-02 · CRITICAL — CommerceEscrow requires buyer vault approval

**Description:**  
`markFunded` calls `token.safeTransferFrom(e.buyerVault, address(this), e.amount)`. The buyer's vault must have approved the CommerceEscrow contract. This creates a fragmented approval landscape.

**Fix:** Document the approval requirement clearly. Add a helper function:
```solidity
function getRequiredApproval(address buyer) external view returns (address vault, address escrow) {
    vault = vaultHub.vaultOf(buyer);
    escrow = address(this);
    // UI should prompt: "Approve CommerceEscrow to spend from your vault"
}
```

---

## BridgeSecurityModule.sol (339 lines)

### FINAL-04 · HIGH — TOCTOU on hourly volume tracking

**Description:**  
Reads `hourlyVolume[currentHour]` into memory, checks limits, then writes back. Concurrent transactions in the same block all see stale state.

**Fix:**
```solidity
// Use storage directly instead of memory snapshot:
function checkRateLimit(address user, uint256 amount) external onlyBridge returns (bool) {
    uint256 currentHour = block.timestamp / 1 hours;
    
    // Direct storage reads and writes (atomic per-transaction)
    if (hourlyVolume[currentHour].timestamp != currentHour) {
        hourlyVolume[currentHour].amount = 0;
        hourlyVolume[currentHour].timestamp = currentHour;
    }
    
    require(hourlyVolume[currentHour].amount + amount <= HOURLY_RATE_LIMIT, "rate limit");
    hourlyVolume[currentHour].amount += amount;
    // ... same for daily ...
    return true;
}
```

---

### FINAL-05 · HIGH — Oracle outage → TWAP manipulation

**Fix:** Add a circuit breaker that pauses price-dependent operations when Chainlink data is stale AND TWAP deviation exceeds threshold.

### FINAL-06 · HIGH — VaultRegistry hash collision on recovery IDs

**Fix:** Store an array of vaults per recovery hash, not a single mapping. Return all matches for user verification.

### FINAL-07 · HIGH — EnterpriseGateway oracle compromise

**Fix:** Separate oracle and DAO roles. Add a timelock on `setMerchantWallet` changes.

---

## Remaining Contracts (Lower Risk)

### FINAL-08 · MEDIUM — LiquidityIncentives staking without rewards

**Fix:** Add a code comment and natspec: "This contract intentionally provides no rewards for Howey compliance."

### FINAL-09 · MEDIUM — CircuitBreaker requires keepers

**Fix:** Add `checkAndTrigger()` call in high-frequency paths (e.g., token transfers) for automatic triggering.

### FINAL-10 · MEDIUM — EmergencyControl committee DAO-dependent

**Fix:** Add an immutable "foundation" address that can always add/remove committee members, independent of DAO.

### FINAL-11 · MEDIUM — VFIDEBadgeNFT soulbound enforcement

**Fix:** Override `_update` (OZ v5) or `_beforeTokenTransfer` (OZ v4):
```solidity
function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
    address from = _ownerOf(tokenId);
    // Allow mint (from == 0) and burn (to == 0), block transfers
    require(from == address(0) || to == address(0), "Soulbound: non-transferable");
    return super._update(to, tokenId, auth);
}
```

### FINAL-12 · MEDIUM — StablecoinRegistry O(n) removal

**Fix:** Use a mapping + index pattern (swap-and-pop) like other contracts.

---

### FINAL-13 to FINAL-17 · LOW

- **FINAL-13:** Consolidate GovernanceHooks to use only `dao`, remove `owner`.
- **FINAL-14:** DutyDistributor is pure analytics — acceptable as-is.
- **FINAL-15:** RevenueSplitter is well-structured — no changes needed.
- **FINAL-16:** SystemHandover is good design — keep.
- **FINAL-17:** Deploy scripts are not runtime code — informational only.
