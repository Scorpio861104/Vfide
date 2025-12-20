# VFIDE Commerce Protection System

## 🛡️ **Amazon Security + PayPal Protection = VFIDE Way**

Complete marketplace and payment protection for the VFIDE ecosystem, protecting forgotten people with institutional-grade security and humanitarian impact.

---

## 📋 **TABLE OF CONTENTS**

1. [System Overview](#system-overview)
2. [Protection Layers](#protection-layers)
3. [Merchant Verification (Amazon-Style)](#merchant-verification)
4. [Buyer Protection (PayPal-Style)](#buyer-protection)
5. [Seller Protection (PayPal-Style)](#seller-protection)
6. [Dual ProofScore Integration](#dual-proofscore-integration)
7. [Architecture Components](#architecture-components)
8. [Flow Diagrams](#flow-diagrams)
9. [Security Features](#security-features)
10. [DAO Governance](#dao-governance)

---

## 🎯 **SYSTEM OVERVIEW**

The VFIDE Commerce Protection System combines:

- **Amazon's marketplace security**: Verified merchants, ratings, auto-suspension
- **PayPal's payment protection**: Escrow, disputes, buyer/seller guarantees
- **VFIDE's humanitarian mission**: Dual ProofScore, charity funding, forgotten people protection

### **Core Principles**

1. **Trust through transparency**: Dual ProofScore (personal + merchant) prevents gaming
2. **Protection for all**: Buyers and sellers both have guarantees
3. **Automatic enforcement**: Auto-suspension at thresholds, time-based auto-release
4. **DAO arbitration**: Neutral dispute resolution with 2/3 majority
5. **Humanitarian impact**: 25% of fees fund Sanctum charities

---

## 🛡️ **PROTECTION LAYERS**

### **Layer 1: Merchant Verification (Amazon)**
- Minimum merchant score 560 to list (`isMerchantEligible()`)
- Score ≥750 qualifies for treasury-paid fees (`qualifiesForFeeSubsidy()`)
- Automatic suspension: 5 refunds OR 3 disputes
- DAO can permanently delist for fraud (requires 2/3 vote)
- Completion rate tracking (successful orders / total orders)

### **Layer 2: Buyer Protection (PayPal)**
- **Escrow system**: Funds held in contract until delivery confirmed
- **Dispute window**: 14 days after funding to file dispute
- **Full refund guarantee**: 100% refund if buyer wins dispute
- **DAO arbitration**: Neutral third-party reviews evidence
- **Anti-abuse**: Small personal score penalty for filing dispute (restored if won)

### **Layer 3: Seller Protection (PayPal)**
- **Auto-release**: Payment automatically released after 14-day window
- **Dispute defense**: DAO arbitration prevents buyer scams
- **Score rewards**: +5 per successful order, +10 for winning dispute
- **Fee subsidy**: Score ≥750 = treasury pays transaction fees (feeless)
- **Voluntary refunds**: Merchant can refund anytime to avoid disputes

### **Layer 4: Security Integration (VFIDE)**
- **SecurityHub checks**: No locked vaults can transact
- **ProofLedger audit trail**: Immutable log of all actions
- **Vault-only system**: All payments go to vaults (never EOAs)
- **Sanctum integration**: 25% of fees fund humanitarian charities
- **Dual score isolation**: Personal trust ≠ merchant trust

---

## 🏪 **MERCHANT VERIFICATION (Amazon-Style)**

### **Contract: `MerchantRegistry`**

Manages merchant listing, scoring, and auto-suspension.

### **Merchant Eligibility**

```solidity
// Minimum merchant score to list
function isMerchantEligible(address merchant) external view returns (bool);
// Returns: getMerchantScore(merchant) >= 560

// Qualifies for fee subsidy (treasury pays fees)
function qualifiesForFeeSubsidy(address merchant) external view returns (bool);
// Returns: getMerchantScore(merchant) >= 750
```

### **Merchant Data Structure**

```solidity
struct Merchant {
    address owner;          // Merchant owner address
    address vault;          // Merchant's vault (receives payments)
    Status status;          // NONE, ACTIVE, SUSPENDED, DELISTED
    uint32 refunds;         // Total refunds issued
    uint32 disputes;        // Total disputes filed
    uint32 completedOrders; // Total successful orders
    uint32 totalOrders;     // Total orders opened
    bytes32 metaHash;       // IPFS: business info, products, policies
    uint64 listedAt;        // Timestamp merchant was approved
    uint64 suspendedAt;     // Timestamp of last suspension
}
```

### **Auto-Suspension Triggers**

| Trigger | Threshold | Action | Score Penalty |
|---------|-----------|--------|---------------|
| **Refunds** | 5 refunds | Auto-suspend | -50 merchant score |
| **Disputes** | 3 disputes | Auto-suspend | -50 merchant score |
| **DAO Delist** | Fraud proven | Permanent delist | -500 merchant score |

### **Merchant Score Impact**

| Action | Score Change | Reason |
|--------|--------------|--------|
| Order completed | +5 | `order_completed` |
| Good rating (5★) | +10 | `good_rating` |
| Good rating (4★) | +5 | `good_rating` |
| Bad rating (1★) | -15 | `bad_rating` |
| Bad rating (2★) | -10 | `bad_rating` |
| Auto-suspend | -50 | `auto_suspend_refunds/disputes` |
| Dispute lost | -20 | `dispute_lost` |
| Dispute won | +10 | `dispute_won` |
| Delisted | -500 | `fraud_detected` |

### **Merchant Listing Flow**

```
1. User calls addMerchant(metaHash)
   ├─ Check: Has vault? (one vault per user)
   ├─ Check: Vault not locked?
   ├─ Check: Merchant score ≥560? (isMerchantEligible)
   └─ Result: Status = ACTIVE, added to merchantList

2. Merchant updates business info
   └─ updateMerchantMeta(newMetaHash) → IPFS hash updated

3. Auto-suspension (triggered by escrow contract)
   ├─ 5 refunds → _noteRefund() → Status = SUSPENDED
   └─ 3 disputes → _noteDispute() → Status = SUSPENDED

4. DAO reinstatement
   └─ reinstateMerchant(owner, reason) → Status = ACTIVE

5. DAO permanent delist (requires 2/3 vote)
   └─ delistMerchant(owner, reason) → Status = DELISTED, -500 score
```

---

## 🛒 **BUYER PROTECTION (PayPal-Style)**

### **Contract: `CommerceEscrow`**

Handles payment escrow, disputes, and resolution.

### **Escrow States**

```
NONE ────────> OPEN ────────> FUNDED ────────> RELEASED
                 │              │                  ↑
                 │              ├──> DISPUTED ──> RESOLVED
                 │              │                  ↓
                 └──────────────┴──> REFUNDED
```

### **Escrow Data Structure**

```solidity
struct Escrow {
    address buyerOwner;     // Buyer's owner address
    address merchantOwner;  // Merchant's owner address
    address buyerVault;     // Buyer's vault (refunds go here)
    address sellerVault;    // Merchant's vault (payments go here)
    uint256 amount;         // Escrowed amount (VFIDE tokens)
    State state;            // Current state
    bytes32 metaHash;       // IPFS: order details, tracking, messages
    uint64 fundedAt;        // Timestamp when funded
    uint64 deliveryWindow;  // Seconds to dispute (default 14 days)
    uint64 releasedAt;      // Timestamp when released
}
```

### **Buyer Protection Timeline**

```
Day 0: Escrow funded
  │
  ├─ Buyer can dispute (0-14 days)
  │  └─ disputeEscrow(escrowId, reason) → State = DISPUTED
  │
  ├─ Buyer can manually release anytime
  │  └─ releasePayment(escrowId) → State = RELEASED
  │
Day 14: Auto-release window closes
  │
  └─ Anyone can trigger auto-release
     └─ releasePayment(escrowId) → State = RELEASED (automatic)
```

### **Dispute Flow**

```
1. Buyer files dispute (within 14 days of funding)
   └─ disputeEscrow(escrowId, reason)
      ├─ State: FUNDED → DISPUTED
      ├─ Merchant auto-flag: disputes++
      └─ Buyer penalty: -5 personal score (restored if won)

2. Both parties submit evidence off-chain
   └─ Evidence hash stored in escrow metaHash (IPFS)
      ├─ Photos of product/condition
      ├─ Tracking information
      └─ Message history

3. DAO votes on resolution (requires 2/3 majority)
   └─ resolveDispute(escrowId, buyerWins, resolution)
      
      IF BUYER WINS:
      ├─ State: DISPUTED → RESOLVED
      ├─ Refund: 100% to buyer's vault
      ├─ Buyer: +5 personal score (restored)
      ├─ Merchant: -20 merchant score
      └─ Merchant auto-flag: refunds++
      
      IF MERCHANT WINS:
      ├─ State: DISPUTED → RESOLVED
      ├─ Release: 100% to merchant's vault
      ├─ Buyer: -10 personal score (frivolous dispute)
      └─ Merchant: +10 merchant score (false accusation)
```

### **Buyer Guarantees**

✅ **Full refund guarantee**: If dispute won, 100% refund to vault  
✅ **Neutral arbitration**: DAO with 2/3 majority (not merchant-biased)  
✅ **Time to review**: 14 days to inspect and dispute  
✅ **Evidence system**: Submit photos, tracking, messages  
✅ **Score protection**: Dispute penalty restored if won  

---

## 🏦 **SELLER PROTECTION (PayPal-Style)**

### **Auto-Release System**

After 14 days, payment automatically releases to merchant:

```solidity
function canAutoRelease(uint256 escrowId) external view returns (bool) {
    Escrow memory e = escrows[escrowId];
    if (e.state != State.FUNDED) return false;
    return block.timestamp >= e.fundedAt + e.deliveryWindow;
}

// Anyone can trigger after window expires
function releasePayment(uint256 escrowId) external {
    // ... checks ...
    if (block.timestamp >= e.fundedAt + e.deliveryWindow) {
        // Auto-release to merchant
    }
}
```

### **Voluntary Refunds**

Merchants can refund anytime to avoid disputes:

```solidity
function refundPayment(uint256 escrowId) external {
    // Merchant or DAO can refund
    if (msg.sender != e.merchantOwner && msg.sender != dao) revert;
    
    // Transfer back to buyer's vault
    token.transfer(e.buyerVault, e.amount);
    
    // Record refund (may trigger auto-suspension at 5 refunds)
    registry._noteRefund(e.merchantOwner);
}
```

### **Dispute Defense**

If buyer files frivolous dispute and merchant wins:

```
Merchant Benefits:
├─ Full payment released to vault
├─ +10 merchant score (dispute_won)
├─ Buyer penalized: -10 personal score (frivolous_dispute)
└─ Evidence system protects against scams
```

### **Fee Subsidy Rewards**

High-trust merchants get free transactions:

| Merchant Score | Transaction Fees | Paid By |
|----------------|------------------|---------|
| 560-749 | 0.25%-10% (score-based) | **User pays** |
| 750-899 | 0.25%-5% (score-based) | **Treasury pays** |
| 900-1000 | 0.25%-2.5% (score-based) | **Treasury pays** |

### **Seller Guarantees**

✅ **Auto-release**: Payment guaranteed after 14 days  
✅ **Dispute defense**: DAO arbitration prevents scams  
✅ **Score rewards**: +5 per order, +10 per 5-star rating  
✅ **Fee subsidy**: Score ≥750 = feeless transactions  
✅ **Voluntary control**: Can refund anytime to avoid disputes  

---

## 🎯 **DUAL PROOFSCORE INTEGRATION**

### **Why Dual Scores?**

**Problem**: Single score creates gaming opportunities  
**Solution**: Separate personal trust from merchant business trust

### **Personal Score (Vault Behavior)**

Affects:
- Transaction fees (0.25%-10% based on score)
- Governance voting (≥540 to vote)
- Dispute weight (low score = less credible disputes)

Impacted by:
- Vault payments, recovery attempts, security events
- Buyer behavior: successful purchases (+2), disputes (-5/+5/-10)

### **Merchant Score (Business Behavior)**

Affects:
- Listing eligibility (≥560 to list)
- Fee subsidy (≥750 = treasury pays)
- Auto-suspension thresholds (5 refunds / 3 disputes)

Impacted by:
- Order completions (+5)
- Customer ratings (+10/+5/-10/-15)
- Disputes (+10/-20)
- Auto-suspensions (-50)

### **Score Isolation Example**

```
Scenario: Bad personal behavior, good merchant
├─ Personal score: 400 (missed payments, recovery triggered)
├─ Merchant score: 850 (great service, 5-star ratings)
│
Result:
├─ User pays 8% transaction fees (low personal score)
├─ BUT: Qualifies as merchant (≥560)
└─ AND: Gets fee subsidy as merchant (≥750)
```

### **Integration Functions**

```solidity
// From VFIDETrust.sol Seer contract

// Check merchant eligibility (≥560)
function isMerchantEligible(address merchant) external view returns (bool);

// Check fee subsidy qualification (≥750)
function qualifiesForFeeSubsidy(address merchant) external view returns (bool);

// Get both scores efficiently
function getDualScore(address subject) external view returns (
    uint16 personalScore,
    uint16 merchantScore
);

// Modify personal score
function reward(address account, uint16 delta, string calldata reason) external;
function punish(address account, uint16 delta, string calldata reason) external;

// Modify merchant score
function rewardMerchant(address merchant, uint16 delta, string calldata reason) external;
function punishMerchant(address merchant, uint16 delta, string calldata reason) external;
```

---

## 🏗️ **ARCHITECTURE COMPONENTS**

### **1. MerchantRegistry**
**Purpose**: Amazon-style merchant verification and management

**Functions**:
- `addMerchant(metaHash)` - Register as merchant (requires score ≥560)
- `updateMerchantMeta(metaHash)` - Update business info
- `suspendMerchant(owner, reason)` - DAO suspends merchant
- `reinstateMerchant(owner, reason)` - DAO reinstates merchant
- `delistMerchant(owner, reason)` - DAO permanently delists (requires 2/3 vote)
- `_noteRefund(owner)` - Called by escrow, triggers auto-suspend at 5
- `_noteDispute(owner)` - Called by escrow, triggers auto-suspend at 3
- `_noteCompletion(owner)` - Called by escrow, rewards merchant score
- `qualifiesForSubsidy(owner)` - Check if score ≥750
- `getCompletionRate(owner)` - Returns completion % (completed / total)

**State**:
- Merchant data (owner, vault, status, counters)
- Auto-suspension thresholds (5 refunds, 3 disputes)
- Score penalties (50 for suspension, 500 for delist)

### **2. CommerceEscrow**
**Purpose**: PayPal-style payment hold and protection

**Functions**:
- `openEscrow(merchant, amount, metaHash)` - Buyer creates order
- `fundEscrow(escrowId)` - Buyer transfers tokens to escrow
- `releasePayment(escrowId)` - Release to merchant (buyer/auto/DAO)
- `refundPayment(escrowId)` - Refund to buyer (merchant/DAO)
- `disputeEscrow(escrowId, reason)` - File dispute (buyer/merchant)
- `resolveDispute(escrowId, buyerWins, resolution)` - DAO resolves
- `canAutoRelease(escrowId)` - Check if 14 days expired
- `canDispute(escrowId)` - Check if still in dispute window

**State**:
- Escrow data (buyer, merchant, amount, state, timestamps)
- Delivery window (14 days default)
- State machine (OPEN → FUNDED → RELEASED/REFUNDED/DISPUTED/RESOLVED)

### **3. RatingSystem**
**Purpose**: Amazon-style merchant ratings with authenticity

**Functions**:
- `submitRating(escrowId, rating, reviewHash)` - Rate merchant (1-5 stars)
- `getAverageRating(merchant)` - Get average rating (scaled by 100)
- `getRatingCount(merchant)` - Get total rating count
- `getMerchantRatings(merchant)` - Get all rating IDs

**State**:
- Rating data (buyer, merchant, stars, review hash, verified)
- Aggregate data (count, sum) for efficient average calculation
- Score impacts: 5★ = +10, 4★ = +5, 3★ = 0, 2★ = -10, 1★ = -15

---

## 📊 **FLOW DIAGRAMS**

### **Complete Purchase Flow (No Dispute)**

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│  BUYER  │                    │  ESCROW  │                    │ MERCHANT │
└────┬────┘                    └─────┬────┘                    └─────┬────┘
     │                               │                               │
     │ 1. openEscrow(merchant, amt) │                               │
     ├──────────────────────────────>│                               │
     │                               │ Check merchant ACTIVE         │
     │                               │ Check vaults exist/unlocked   │
     │                               │ Create escrow: State = OPEN   │
     │                               │                               │
     │ 2. fundEscrow(escrowId)       │                               │
     ├──────────────────────────────>│                               │
     │                               │ Transfer: buyerVault → escrow │
     │                               │ State: OPEN → FUNDED          │
     │                               │ Start 14-day dispute window   │
     │                               │                               │
     │                               │ ⏰ Wait for delivery...        │
     │                               │                               │
     │ 3. Receive product ✅          │                               │
     │                               │                               │
     │ 4. releasePayment(escrowId)   │                               │
     ├──────────────────────────────>│                               │
     │                               │ Transfer: escrow → merchantVault
     │                               │ State: FUNDED → RELEASED      │
     │                               │ Reward: buyer +2, merchant +5 │
     │                               │                               │
     │ 5. submitRating(id, 5★)       │                               │
     ├──────────────────────────────>│                               │
     │                               │ Record rating                 │
     │                               │ Merchant score +10 (5★)       │
     │                               │                               │
```

### **Dispute Flow (Buyer Wins)**

```
┌─────────┐          ┌──────────┐          ┌──────────┐          ┌──────┐
│  BUYER  │          │  ESCROW  │          │ MERCHANT │          │ DAO  │
└────┬────┘          └─────┬────┘          └─────┬────┘          └───┬──┘
     │                     │                     │                    │
     │ Funded, waiting...  │                     │                    │
     │                     │                     │                    │
     │ 1. Product wrong ❌  │                     │                    │
     │                     │                     │                    │
     │ 2. disputeEscrow()  │                     │                    │
     ├────────────────────>│                     │                    │
     │                     │ State: FUNDED → DISPUTED                 │
     │                     │ Merchant: disputes++                     │
     │                     │ Buyer: -5 personal score                 │
     │                     │                     │                    │
     │ 3. Submit evidence  │                     │                    │
     ├────────────────────>│<────────────────────┤ 4. Submit defense  │
     │    (photos, msgs)   │    (tracking, proof)│                    │
     │                     │                     │                    │
     │                     │                     │ 5. DAO reviews evidence
     │                     │                     │                    │
     │                     │<────────────────────────────────────────┤
     │                     │     resolveDispute(id, buyerWins=true)  │
     │                     │                                          │
     │                     │ Transfer: escrow → buyerVault (REFUND)  │
     │                     │ State: DISPUTED → RESOLVED               │
     │                     │ Buyer: +5 personal (restored)            │
     │                     │ Merchant: -20 merchant score             │
     │                     │ Merchant: refunds++ (may auto-suspend)   │
     │                     │                                          │
```

### **Auto-Suspension Flow**

```
┌──────────┐          ┌──────────────┐          ┌─────────┐
│  ESCROW  │          │   REGISTRY   │          │  SEER   │
└─────┬────┘          └───────┬──────┘          └────┬────┘
      │                       │                      │
      │ Dispute resolved      │                      │
      │ (buyer wins)          │                      │
      │                       │                      │
      │ _noteRefund(merchant) │                      │
      ├──────────────────────>│                      │
      │                       │ refunds++            │
      │                       │                      │
      │                       │ IF refunds >= 5:     │
      │                       │   Status = SUSPENDED │
      │                       │   suspendedAt = now  │
      │                       │                      │
      │                       │ punishMerchant(-50)  │
      │                       ├─────────────────────>│
      │                       │                      │
      │                       │ Emit: AutoSuspended  │
      │                       │ Emit: StatusChanged  │
      │                       │ Log: merchant_auto_suspended
      │                       │                      │
      │                       │ Merchant can no longer accept orders
      │                       │ (DAO can reinstate)  │
      │                       │                      │
```

---

## 🔒 **SECURITY FEATURES**

### **1. Vault-Only System**
All payments go to vaults, never externally owned addresses:

```solidity
// Buyer must have vault
address buyerVault = vaultHub.vaultOf(msg.sender);
if (buyerVault == address(0)) revert COMP_NotBuyer();

// Merchant must have vault
MerchantRegistry.Merchant memory m = registry.getMerchant(merchantOwner);
// m.vault is set during merchant registration

// All transfers use vaults
token.transfer(e.buyerVault, e.amount);    // Refunds
token.transfer(e.sellerVault, e.amount);   // Payments
```

### **2. Security Lock Integration**
No locked vaults can transact:

```solidity
// Check vaults not locked (SecurityHub)
if (security.isLocked(buyerVault)) revert COMP_SecLocked();
if (security.isLocked(m.vault)) revert COMP_SecLocked();
```

### **3. Immutable Audit Trail**
ProofLedger logs all actions:

```solidity
// System events (DAO actions)
ledger.logSystemEvent(address(this), "merchant_suspended", msg.sender);

// User events (purchases, disputes)
ledger.logEvent(buyer, "escrow_opened", amount, "buyer_order_created");

// Transfers (payments, refunds)
ledger.logTransfer(escrow, merchantVault, amount, "escrow_released");
```

### **4. State Machine Protection**
Strict state transitions prevent exploits:

```solidity
// Can only fund OPEN escrows
if (e.state != State.OPEN) revert COMP_BadState();

// Can only dispute FUNDED escrows
if (e.state != State.FUNDED) revert COMP_BadState();

// Can only resolve DISPUTED escrows
if (e.state != State.DISPUTED) revert COMP_NotDisputed();
```

### **5. Time-Based Windows**
Prevents late disputes and ensures auto-release:

```solidity
// Buyer must dispute within 14 days
if (msg.sender == e.buyerOwner) {
    if (block.timestamp >= e.fundedAt + e.deliveryWindow) revert COMP_TooLate();
}

// Auto-release after 14 days
if (block.timestamp >= e.fundedAt + e.deliveryWindow) {
    // Anyone can trigger release
}
```

---

## ⚖️ **DAO GOVERNANCE**

All critical actions require DAO approval (2/3 majority):

### **DAO-Controlled Actions**

| Action | Function | Requires Vote |
|--------|----------|---------------|
| Suspend merchant | `suspendMerchant(owner, reason)` | Yes (2/3) |
| Reinstate merchant | `reinstateMerchant(owner, reason)` | Yes (2/3) |
| Delist merchant | `delistMerchant(owner, reason)` | Yes (2/3) |
| Resolve dispute | `resolveDispute(id, buyerWins, resolution)` | Yes (2/3) |
| Change policy | `setPolicy(refunds, disputes, penalty)` | Yes (2/3) |
| Change delivery window | `setDeliveryWindow(seconds)` | Yes (2/3) |
| Update DAO address | `setDAO(newDAO)` | Yes (2/3) |

### **Automated Actions (No Vote)**

| Action | Trigger | Contract |
|--------|---------|----------|
| Auto-suspend (refunds) | 5 refunds reached | MerchantRegistry |
| Auto-suspend (disputes) | 3 disputes reached | MerchantRegistry |
| Auto-release payment | 14 days expired | CommerceEscrow |
| Score rewards | Order completed | MerchantRegistry + Seer |
| Score penalties | Rating submitted | RatingSystem + Seer |

### **DAO Integration**

```solidity
modifier onlyDAO() {
    if (msg.sender != dao) revert COMP_NotDAO();
    _;
}

// DAO can update itself
function setDAO(address newDAO) external onlyDAO {
    if (newDAO == address(0)) revert COMP_Zero();
    dao = newDAO;
    emit DAOChanged(old, newDAO);
}
```

---

## 🎯 **SUMMARY: THE VFIDE WAY**

### **For Buyers**
✅ Full escrow protection  
✅ 14-day dispute window  
✅ Full refund if dispute won  
✅ DAO arbitration (neutral)  
✅ Evidence system (photos, tracking)  
✅ Score protection (penalty restored if won)  

### **For Merchants**
✅ Auto-release after 14 days  
✅ Dispute defense (DAO arbitration)  
✅ Score rewards (+5 per order, +10 per 5★)  
✅ Fee subsidy (≥750 = feeless)  
✅ Voluntary refunds (avoid disputes)  
✅ Clear suspension rules (5 refunds / 3 disputes)  

### **For Ecosystem**
✅ Dual ProofScore (personal + merchant)  
✅ Auto-suspension (protects buyers)  
✅ DAO governance (2/3 majority)  
✅ Sanctum integration (25% to charity)  
✅ Vault-only (security)  
✅ Immutable audit trail  

### **Trust Levels**

| Score | Status | Benefits |
|-------|--------|----------|
| 560-749 | Can list | Users pay fees, merchant pays burn fees |
| 750-899 | Fee subsidy | Treasury pays transaction fees |
| 900-1000 | Maximum trust | Preferred merchant, lowest fees, highest trust |

---

**This is the VFIDE way: Amazon security + PayPal protection + humanitarian impact.**

**Protecting forgotten people with institutional-grade commerce protection.**
