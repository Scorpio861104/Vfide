# VFIDEBridge.sol — Hostile Audit Findings

**Lines:** 689  
**Score:** 3 Critical / 2 High / 5 Medium / 4 Low

---

## VB-01 · CRITICAL — `claimBridgeRefund` + `adminMarkBridgeExecuted` outside contract body

**Location:** Lines 648-681 (after contract closing brace at line 646)

**Description:**  
The entire bridge refund mechanism (F-25 FIX) is defined outside the contract body. Additionally, `adminMarkBridgeExecuted` is nested INSIDE `claimBridgeRefund`. Triple failure: (1) outside contract, (2) nested function, (3) entire refund system non-functional.

**Fix:**
```solidity
// Move BOTH functions inside the contract body, BEFORE the closing brace.
// Un-nest adminMarkBridgeExecuted.

contract VFIDEBridge is OApp, OAppOptionsType3, ReentrancyGuard, Pausable {
    // ... existing code ...
    
    function claimBridgeRefund(bytes32 txId) external nonReentrant whenNotPaused {
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(btx.sender == msg.sender, "VFIDEBridge: not sender");
        require(!btx.executed, "VFIDEBridge: already executed");
        require(bridgeRefundableAfter[txId] > 0, "VFIDEBridge: not refundable");
        require(block.timestamp >= bridgeRefundableAfter[txId], "VFIDEBridge: refund too early");

        btx.executed = true;
        uint256 amount = btx.amount;
        totalBridgedOut -= amount;
        userStats[msg.sender].totalSent -= amount;
        delete bridgeRefundableAfter[txId];

        vfideToken.safeTransfer(msg.sender, amount);
        emit BridgeRefunded(msg.sender, txId, amount);
    }

    function adminMarkBridgeExecuted(bytes32 txId) external onlyOwner {
        require(bridgeRefundableAfter[txId] > 0, "VFIDEBridge: no refund window");
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(!btx.executed, "VFIDEBridge: already executed");
        btx.executed = true;
        delete bridgeRefundableAfter[txId];
    }
    
} // contract end
```

---

## VB-02 · CRITICAL — `bridgeRefundableAfter` set but unusable

**Description:**  
Line 271 inside `bridge()` sets `bridgeRefundableAfter[txId]`, but the function to use it doesn't exist on-chain (VB-01). Wasted storage on every bridge transaction.

**Fix:** Fix VB-01 first — once the functions are inside the contract, this resolves automatically.

---

## VB-03 · CRITICAL — Naive fix creates double-spend

**Description:**  
If VB-01 is fixed by simply moving the functions inside, users can get tokens on BOTH the destination chain (via `_lzReceive`) AND source chain (via `claimBridgeRefund`). The `adminMarkBridgeExecuted` function must be called to cancel the refund window when the destination confirms execution.

**Fix:** Ensure `adminMarkBridgeExecuted` is called by an automated off-chain service that monitors destination chain execution. Add a validator/oracle system:
```solidity
// Add automatic cross-chain confirmation via LayerZero callback
function _lzReceive(...) internal override {
    // ... existing logic ...
    // Send confirmation back to source chain
    bytes memory confirmPayload = abi.encode(CONFIRM_TYPE, txId);
    _lzSend(srcChainId, confirmPayload, ...);
}
```

---

## VB-05 · HIGH — Bridge fee calc uses nominal not actual received

**Description:**  
Mitigated by `systemExempt` requirement. But if exempt bypass is activated (VB-10), transfer fees apply and the bridge becomes insolvent.

**Fix:** Use balance-before/after pattern regardless of exemption status.

---

## VB-06 · HIGH — Bridge requires systemExempt

**Fix:** Document this requirement clearly and add a check in the constructor.

---

## VB-07 to VB-11 · MEDIUM

- **VB-07:** Fix `quoteBridge` to use `(_to, _amount - fee)` in payload.
- **VB-08:** Add VFIDE emergency withdrawal with extended timelock (30 days) for bridge decommission.
- **VB-09:** Add 7-day expiry to ownership transfer.
- **VB-10:** Add timelock to `setExemptCheckBypass`.
- **VB-11:** Add random nonce component to txId generation.

---

## VB-12 to VB-15 · LOW

- **VB-12:** Good practice — keep.
- **VB-13:** Document liquidity requirements per chain.
- **VB-14:** Add per-chain tracking: `mapping(uint32 => uint256) public bridgedOutPerChain`.
- **VB-15:** Reorganize code — move all state variables to top of contract.
