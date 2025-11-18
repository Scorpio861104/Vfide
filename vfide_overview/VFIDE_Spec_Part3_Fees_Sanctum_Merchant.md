
# VFIDE – System Spec (Part 3: Fees, Burns, Sanctum, Merchants)

This document is Part 3 of the VFIDE ecosystem spec. It covers:

9. FeeRouter
10. SanctumVault
11. BurnManager
12. MerchantRegistry
13. MerchantSettlement

---

## 9. Fees, Burns, and Sanctum

### 9.1 FeeRouter

**File:** `contracts/fees/FeeRouter.sol`  
**Purpose:** Single point where protocol-level fees are split between Sanctum, burns, ops, and staking.

**State**

```solidity
struct FeeConfig {
    uint16 sanctumBps; // share for Sanctum (0–10000)
    uint16 burnBps;    // share for burns
    uint16 opsBps;     // share for operations
    uint16 stakingBps; // share for reward pool
}
FeeConfig config;

address sanctumVault;
address burnManager;
address opsVault;
address stakingVault;

address owner; // DAO after transition
```

**Functions**

- `setConfig(FeeConfig newConfig)`
  - Only owner (DAO/timelock).
  - Enforce `sanctumBps + burnBps + opsBps + stakingBps == 10000`.
  - Optionally enforce reasonable min/max bounds.
  - Emit `FeeConfigUpdated(newConfig)`.

- `routeFees(address token, uint256 amount)`
  - Called by fee-generating modules (staking penalties, merchant settlement spreads, optional “support Sanctum” flows).
  - Compute:
    - `sanctumAmount = amount * sanctumBps / 10000`.
    - `burnAmount = amount * burnBps / 10000`.
    - `opsAmount = amount * opsBps / 10000`.
    - `stakingAmount = amount - (sanctumAmount + burnAmount + opsAmount)`.
  - Transfer tokens to `sanctumVault`, `burnManager`, `opsVault`, `stakingVault`.
  - Emit `FeesRouted` with breakdown.

**Events**

```solidity
event FeeConfigUpdated(FeeConfig newConfig);

event FeesRouted(
    address indexed token,
    uint256 total,
    uint256 sanctumAmount,
    uint256 burnAmount,
    uint256 opsAmount,
    uint256 stakingAmount
);
```

---

### 9.2 SanctumVault

**File:** `contracts/sanctum/SanctumVault.sol`  
**Purpose:** Hold funds earmarked for charity and impact projects.

**State**

```solidity
mapping(address => uint256) balances; // token => amount
address owner; // DAO controller
```

**Functions**

- `onFeesReceived(address token, uint256 amount)`
  - Called implicitly via token transfers from FeeRouter.
  - Update internal `balances[token]`.
  - Emit `SanctumFunded(token, amount)`.

- `proposeDisbursement(address token, uint256 amount, bytes32 projectId)`
  - Called within a DAO proposal’s execution context or encoded on proposal creation.
  - Records a pending disbursement idea; specifics can be off-chain in metadata.

- `executeDisbursement(address token, uint256 amount, address recipient, bytes32 projectId)`
  - Called only via DAO/timelock after proposal passes.
  - Require `balances[token] >= amount`.
  - Transfer `amount` of `token` to `recipient`.
  - Reduce `balances[token]`.
  - Emit `SanctumDisbursed(token, amount, recipient, projectId)`.
  - Log via `ProofLedger.logAction(pseudoUserOrProject, 13, contextHash)`.

**Events**

```solidity
event SanctumFunded(address indexed token, uint256 amount);
event SanctumDisbursed(address indexed token, uint256 amount, address indexed recipient, bytes32 projectId);
```

Sanctum activity is transparent and linked to DAO governance.

---

### 9.3 BurnManager

**File:** `contracts/fees/BurnManager.sol`  
**Purpose:** Aggregate VFIDE destined for burns and execute burns in a clean, transparent way.

**State**

```solidity
IERC20 vfide;
address burnAddress; // e.g. 0x0000...dead
address owner; // DAO after transition
```

**Functions**

- `receiveFromRouter(uint256 amount)`
  - VFIDE is transferred from FeeRouter to BurnManager.
  - No complex logic needed other than event logging.

- `executeBurn()`
  - Read BurnManager’s VFIDE balance.
  - Transfer entire balance to `burnAddress` (or call `vfide.transfer`).
  - Emit `BurnExecuted(amount)`.
  - Log via ProofLedger actionType 14.

**Event**

```solidity
event BurnExecuted(uint256 amount);
```

All burns are easily trackable and verifiable by the community.

---

## 10. Merchant System

### 10.1 MerchantRegistry

**File:** `contracts/merchant/MerchantRegistry.sol`  
**Purpose:** On-chain registry of merchants who accept VFIDE.

**State**

```solidity
struct Merchant {
    address settlementVault; // vault where funds are delivered
    bytes32 metadataHash;    // IPFS or other off-chain metadata
    bool    active;
}

mapping(address => Merchant) merchants; // key: merchantOwner
address owner; // DAO for enforcement
```

**Functions**

- `registerMerchant(address settlementVault, bytes32 metadataHash)`
  - Caller becomes `merchantOwner`.
  - Require `settlementVault` is a valid vault (via VaultController).
  - Create `Merchant` with `active = true`.
  - Emit `MerchantRegistered(owner, settlementVault, metadataHash)`.

- `updateMetadata(bytes32 metadataHash)`
  - Only merchantOwner.
  - Update `metadataHash` and emit `MerchantUpdated`.

- `setActive(bool active)`
  - Only merchantOwner can deactivate.
  - DAO can also force `active = false` through a separate admin function if abuse is proven.
  - Emit `MerchantStatusChanged`.

**Events**

```solidity
event MerchantRegistered(address indexed owner, address settlementVault, bytes32 metadataHash);
event MerchantUpdated(address indexed owner, bytes32 metadataHash);
event MerchantStatusChanged(address indexed owner, bool active);
```

---

### 10.2 MerchantSettlement

**File:** `contracts/merchant/MerchantSettlement.sol`  
**Purpose:** Handle VFIDE payments to merchants and store payment records on-chain.

**State**

```solidity
IERC20 vfide;
MerchantRegistry registry;

struct Payment {
    address payer;
    address merchantOwner;
    uint256 amount;
    uint64  timestamp;
    bytes32 invoiceId;
}

mapping(bytes32 => Payment) payments; // invoiceId or paymentId => Payment
```

**Functions**

- `payMerchant(address merchantOwner, uint256 amount, bytes32 invoiceId)`
  - Verify merchant exists and is active via `registry`.
  - Transfer `amount` VFIDE from payer to merchant’s `settlementVault`:
    - Preferably caller is payer’s vault for safety.
  - Record `Payment` in `payments[invoiceId]` (or a new ID if invoice reused).
  - Emit `PaymentProcessed(payer, merchantOwner, amount, invoiceId)`.

- (Optional) `payWithConversion(...)`
  - Accept VFIDE from user, swap via a vetted DEX to stablecoin, and deliver stablecoin to merchant’s external payout address.
  - Complex and only needed if merchants demand it; if implemented, use robust, audited router patterns.

**Event**

```solidity
event PaymentProcessed(
    address indexed payer,
    address indexed merchantOwner,
    uint256 amount,
    bytes32 invoiceId
);
```

**Trust integration**

- Indexer reads `PaymentProcessed` events:
  - Builds merchant dashboards (volume, repeat customers, etc.).
  - Combines payer addresses with ProofScore to show approximate trust level in merchant UI:
    - For example: “Customer trust: Good (not financial advice, just on-chain behavior history).”

---

_End of Part 3. Part 4 covers the Seer/ProofScore trust system, DAO & governance, Academy, Earnables, bounty program, frontends, and the overall builder checklist._
