# MerchantPortal.sol — Hostile Audit Findings

**Lines:** 988  
**Score:** 3 Critical / 4 High / 5 Medium / 4 Low

---

## MP2-01 · CRITICAL — `processPayment` merchant pulls from ANY customer vault

**Description:**  
`processPayment` is `onlyMerchant` — the merchant specifies any `customer` address. If customers have approved the MerchantPortal contract on their vaults, any registered merchant can drain any approved vault.

**Fix:**
```solidity
// Option A: Require customer signature for merchant-initiated payments:
function processPayment(address customer, address token, uint256 amount, 
    string calldata orderId, bytes calldata customerSignature) external onlyMerchant {
    // Verify customer authorized this specific payment
    bytes32 digest = keccak256(abi.encode(customer, msg.sender, token, amount, orderId, nonces[customer]++));
    require(ECDSA.recover(digest, customerSignature) == customer, "MP: invalid signature");
    // ...
}

// Option B: Remove merchant-initiated payment entirely — only use pay() (customer-initiated):
// Delete processPayment() and only keep pay() which uses msg.sender as customer.
```

---

## MP2-02 · CRITICAL — `completeRefund` always reverts

**Description:**  
`completeRefund` calls `safeTransferFrom(merchantVault, customerVault, amount)` but the MerchantPortal has no approval from the merchant's vault.

**Fix:**
```solidity
// Option A: Merchant must approve MerchantPortal on their vault before refunds
// Option B: Change to merchant-push model:
function completeRefund(bytes32 refundId) external nonReentrant {
    RefundRequest storage r = refundRequests[refundId];
    require(msg.sender == r.merchant, "Only merchant");
    r.completed = true;
    // Merchant sends directly (pull from merchant's own context, not vault):
    IERC20(r.token).safeTransferFrom(msg.sender, vaultHub.vaultOf(r.customer), r.amount);
}
```

---

## MP2-03 · CRITICAL — Sandwich attack in auto-convert

**Fix:** Use Chainlink TWAP for minOut calculation instead of AMM spot price, or implement a two-transaction commit-reveal swap.

---

## MP2-04 to MP2-07 · HIGH

- **MP2-04:** See MP2-01 fix.
- **MP2-05:** Validate payout address is a registered vault: `require(vaultHub.isVault(payout), "MP: payout must be vault")`.
- **MP2-06:** Add periodic score re-check: `require(seer.getScore(merchant) >= minScore || block.timestamp < registeredAt + 30 days)`.
- **MP2-07:** Use ONLY Seer's threshold, remove local `minMerchantScore`.

---

## MP2-08 to MP2-12 · MEDIUM

- **MP2-08:** Add expiry on refund proposals (e.g., 90 days).
- **MP2-09:** Check pending refunds before allowing deregistration.
- **MP2-10:** Emit event when auto-convert fails so merchant knows.
- **MP2-11:** Use swap-and-pop for merchantList removal on deregister.
- **MP2-12:** Add VFIDECommerce contract reference or remove `payOnline`.

---

## MP2-13 to MP2-16 · LOW

- **MP2-13:** Document zero-fee as intentional.
- **MP2-14:** Remove unused `PaymentWithChannel` event.
- **MP2-15:** Zero both router and stablecoin atomically.
- **MP2-16:** Add pagination to `getMerchantRefundRate`.
