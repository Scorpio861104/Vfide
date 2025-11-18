# VFIDE Commerce Protection - Integration Examples

## 🔗 **Complete Integration Scenarios**

Real-world examples showing how the VFIDE Commerce Protection System works in practice.

---

## 📦 **SCENARIO 1: Successful Purchase (Happy Path)**

### **Context**
- **Buyer**: Alice (personal score: 650, good user)
- **Merchant**: Bob's Electronics (merchant score: 820, feeless merchant)
- **Product**: Smartphone for 500 VFIDE tokens
- **Outcome**: Successful delivery, 5-star rating

### **Step-by-Step Flow**

```solidity
// 1. Alice opens escrow with Bob
CommerceEscrow.openEscrow(
    bobAddress,           // merchant
    500 * 10**18,        // 500 VFIDE tokens
    ipfsHash             // Order details: product, quantity, shipping
)
// Result: escrowId = 1, State = OPEN

// 2. Alice funds the escrow
// First, Alice's vault approves escrow contract
VFIDEToken.approve(escrowAddress, 500 * 10**18);

// Then Alice funds
CommerceEscrow.fundEscrow(1);
// Result: 
// - 500 VFIDE transferred: Alice's vault → escrow contract
// - State: OPEN → FUNDED
// - fundedAt: block.timestamp
// - Alice has 14 days to dispute

// 3. Bob ships product
// (Off-chain: Bob updates metaHash with tracking info)

// 4. Alice receives product after 3 days ✅
// Product is correct, good condition

// 5. Alice manually releases payment (doesn't wait 14 days)
CommerceEscrow.releasePayment(1);
// Result:
// - 500 VFIDE transferred: escrow → Bob's vault
// - State: FUNDED → RELEASED
// - Bob's merchant score: 820 → 825 (+5 for completion)
// - Alice's personal score: 650 → 652 (+2 for successful purchase)
// - MerchantRegistry.completedOrders++
// - MerchantRegistry.totalOrders++

// 6. Alice submits 5-star rating
RatingSystem.submitRating(
    1,                   // escrowId
    5,                   // 5 stars
    reviewIpfsHash       // Review: "Great product, fast shipping!"
);
// Result:
// - Rating recorded: verified = true (from RELEASED state)
// - Bob's merchant score: 825 → 835 (+10 for 5-star rating)
// - Bob's average rating: 4.8 stars
```

### **Final Outcome**

**Alice (Buyer)**:
- ✅ Received product as described
- ✅ Personal score: 650 → 652 (+2)
- ✅ Protected by escrow (could have disputed)

**Bob (Merchant)**:
- ✅ Payment received: 500 VFIDE to vault
- ✅ Merchant score: 820 → 835 (+15 total)
- ✅ Completion rate: 98% (490/500 orders)
- ✅ Average rating: 4.8 stars
- ✅ Qualifies for fee subsidy (score ≥750)

**VFIDE Ecosystem**:
- ✅ Transaction fees routed: 50% burn, 25% treasury, 25% Sanctum
- ✅ ProofLedger audit trail: All actions logged
- ✅ No disputes, smooth transaction

---

## ⚠️ **SCENARIO 2: Dispute Resolution (Buyer Wins)**

### **Context**
- **Buyer**: Carol (personal score: 720, trusted user)
- **Merchant**: Dave's Gadgets (merchant score: 680, pays fees but not suspended)
- **Product**: Laptop for 2000 VFIDE tokens
- **Issue**: Wrong product shipped (tablet instead of laptop)
- **Outcome**: Dispute filed, DAO sides with buyer, full refund

### **Step-by-Step Flow**

```solidity
// 1. Carol opens and funds escrow
CommerceEscrow.openEscrow(daveAddress, 2000 * 10**18, ipfsHash);
CommerceEscrow.fundEscrow(2);
// Result: escrowId = 2, State = FUNDED, fundedAt = now

// 2. Dave ships product (tracking shows delivered)
// (Off-chain: metaHash updated with tracking)

// 3. Carol receives package after 5 days
// Opens box: WRONG PRODUCT (tablet, not laptop) ❌

// 4. Carol files dispute within 14-day window
CommerceEscrow.disputeEscrow(
    2,                   // escrowId
    "Wrong product: ordered laptop, received tablet"
);
// Result:
// - State: FUNDED → DISPUTED
// - Dave's disputes counter: 2 → 3 (⚠️ AT THRESHOLD!)
// - Carol's personal score: 720 → 715 (-5 penalty, restored if won)
// - Event: EscrowDisputed emitted

// 5. Both parties submit evidence off-chain
// Carol: Photos showing tablet in laptop box
// Dave: Shipping manifest (wrong item picked by warehouse)

// 6. DAO reviews evidence (2/3 vote)
// Voting shows: Buyer is correct, wrong item shipped
// DAO resolves dispute in Carol's favor

CommerceEscrow.resolveDispute(
    2,                   // escrowId
    true,                // buyerWins = true
    "Evidence shows wrong product shipped. Full refund approved."
);
// Result:
// - State: DISPUTED → RESOLVED
// - 2000 VFIDE transferred: escrow → Carol's vault (REFUND)
// - Carol's personal score: 715 → 720 (+5, penalty restored)
// - Dave's merchant score: 680 → 660 (-20 for dispute lost)
// - Dave's refunds counter: 1 → 2
// - MerchantRegistry auto-flag check (not suspended, only 2 refunds)

// 7. Carol submits 1-star rating (bad experience)
RatingSystem.submitRating(
    2,                   // escrowId
    1,                   // 1 star
    reviewIpfsHash       // Review: "Wrong item sent, had to dispute"
);
// Result:
// - Rating recorded: verified = false (RESOLVED, not RELEASED)
// - Dave's merchant score: 660 → 645 (-15 for 1-star rating)
```

### **Final Outcome**

**Carol (Buyer)**:
- ✅ Full refund: 2000 VFIDE returned to vault
- ✅ Personal score: 720 (unchanged, penalty restored)
- ✅ Protected by escrow and DAO arbitration
- ✅ Evidence submitted (photos proved claim)

**Dave (Merchant)**:
- ❌ No payment (refunded)
- ❌ Merchant score: 680 → 645 (-35 total)
- ❌ Refunds: 2/5 (3 more until auto-suspend)
- ❌ Disputes: 3/3 (⚠️ AUTO-SUSPENDED!)
- ⚠️ Status: ACTIVE → SUSPENDED

**Auto-Suspension Triggered**:
```solidity
// Dave hit 3 disputes threshold
MerchantRegistry._noteDispute(daveAddress);
// Result:
// - Status: ACTIVE → SUSPENDED
// - suspendedAt: block.timestamp
// - Merchant score penalty: 645 → 595 (-50 for suspension)
// - Event: AutoSuspended emitted
// - Event: MerchantStatusChanged emitted
// - Cannot accept new orders until DAO reinstates
```

**VFIDE Ecosystem**:
- ✅ Buyer protected: Full refund guaranteed
- ✅ Merchant penalized: Score dropped, auto-suspended
- ✅ DAO arbitration: Neutral resolution based on evidence
- ✅ Auto-enforcement: Suspension prevents more bad orders

---

## 🛡️ **SCENARIO 3: Frivolous Dispute (Merchant Wins)**

### **Context**
- **Buyer**: Eve (personal score: 480, low-trust user)
- **Merchant**: Frank's Store (merchant score: 890, high-trust merchant)
- **Product**: Headphones for 100 VFIDE tokens
- **Issue**: Eve claims "never received" but tracking shows delivered and signed
- **Outcome**: Dispute filed, DAO sides with merchant, Eve penalized

### **Step-by-Step Flow**

```solidity
// 1. Eve opens and funds escrow
CommerceEscrow.openEscrow(frankAddress, 100 * 10**18, ipfsHash);
CommerceEscrow.fundEscrow(3);
// Result: escrowId = 3, State = FUNDED

// 2. Frank ships with signature-required delivery
// (metaHash: tracking shows "Delivered, signed by Eve" after 4 days)

// 3. Eve files false dispute (trying to get free product)
CommerceEscrow.disputeEscrow(
    3,
    "Never received package"
);
// Result:
// - State: FUNDED → DISPUTED
// - Frank's disputes: 0 → 1
// - Eve's personal score: 480 → 475 (-5 penalty)

// 4. Evidence submission
// Frank: Tracking showing delivered + Eve's signature
// Eve: No evidence (just claim)

// 5. DAO reviews evidence (2/3 vote)
// Clear evidence: Package delivered and signed by Eve
// Verdict: Frivolous dispute, merchant wins

CommerceEscrow.resolveDispute(
    3,                   // escrowId
    false,               // buyerWins = false
    "Tracking shows delivered and signed. Frivolous dispute."
);
// Result:
// - State: DISPUTED → RESOLVED
// - 100 VFIDE transferred: escrow → Frank's vault
// - Eve's personal score: 475 → 465 (-10 for frivolous)
// - Frank's merchant score: 890 → 900 (+10 for dispute won)
// - Frank's completedOrders++ (paid as if released)
```

### **Final Outcome**

**Eve (Buyer)**:
- ❌ No refund (merchant wins)
- ❌ Personal score: 480 → 465 (-15 total)
- ⚠️ Lower trust for future disputes
- ❌ Cannot rate merchant (dispute lost)

**Frank (Merchant)**:
- ✅ Payment received: 100 VFIDE to vault
- ✅ Merchant score: 890 → 900 (+10, now MAX trust tier)
- ✅ Protected from false accusations
- ✅ Evidence system validated his delivery

**VFIDE Ecosystem**:
- ✅ Merchant protected from scams
- ✅ Buyer penalized for abuse
- ✅ DAO arbitration: Evidence-based resolution
- ✅ Personal score impact: Discourages future frivolous disputes

---

## ⏰ **SCENARIO 4: Auto-Release (Buyer Forgets)**

### **Context**
- **Buyer**: George (personal score: 600)
- **Merchant**: Helen's Shop (merchant score: 750, feeless)
- **Product**: Keyboard for 80 VFIDE tokens
- **Issue**: George receives product but forgets to release payment
- **Outcome**: Auto-release after 14 days protects merchant

### **Step-by-Step Flow**

```solidity
// 1. George opens and funds escrow
CommerceEscrow.openEscrow(helenAddress, 80 * 10**18, ipfsHash);
CommerceEscrow.fundEscrow(4);
// Result: 
// - escrowId = 4, State = FUNDED
// - fundedAt = Day 0 (timestamp T0)
// - deliveryWindow = 14 days

// 2. Helen ships, George receives after 3 days ✅
// Product is correct, George is happy

// 3. George forgets to release payment (busy, no action)
// Days pass: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14...

// 4. Day 15: Auto-release window expires
// Anyone can trigger release (Helen, George, or even a bot)

// Check if auto-release available
bool canRelease = CommerceEscrow.canAutoRelease(4);
// Returns: true (block.timestamp >= T0 + 14 days)

// Helen triggers auto-release
CommerceEscrow.releasePayment(4);
// Result:
// - 80 VFIDE transferred: escrow → Helen's vault
// - State: FUNDED → RELEASED
// - releasedAt: block.timestamp (Day 15)
// - isAutoRelease: true (in event)
// - Helen's merchant score: 750 → 755 (+5 for completion)
// - George's personal score: 600 → 602 (+2 for successful purchase)
```

### **Final Outcome**

**George (Buyer)**:
- ✅ Product received (happy)
- ✅ Personal score: 600 → 602 (+2)
- ℹ️ Forgot to release, but auto-release protected merchant

**Helen (Merchant)**:
- ✅ Payment received after 14 days (automatic)
- ✅ Merchant score: 750 → 755 (+5)
- ✅ Protected from buyer negligence
- ✅ No penalty for buyer's inaction

**VFIDE Ecosystem**:
- ✅ Auto-release protects merchants
- ✅ Buyer had 14 days to dispute (didn't need to)
- ✅ Time-based enforcement prevents indefinite holds
- ✅ Fair balance: 14 days is reasonable for inspection

---

## 🚫 **SCENARIO 5: Merchant Auto-Suspension**

### **Context**
- **Merchant**: Ivan's Store (merchant score: 620)
- **History**: 4 previous refunds, 2 previous disputes
- **New Order**: Buyer files 5th refund
- **Outcome**: Auto-suspension triggered, cannot accept new orders

### **Step-by-Step Flow**

```solidity
// Ivan's current state:
// - refunds: 4/5
// - disputes: 2/3
// - Status: ACTIVE

// New buyer creates order, disputes, DAO sides with buyer
CommerceEscrow.resolveDispute(
    5,                   // escrowId
    true,                // buyerWins = true
    "Product defective, full refund"
);
// This calls: MerchantRegistry._noteRefund(ivanAddress)

// Inside _noteRefund:
function _noteRefund(address owner) external {
    Merchant storage m = merchants[owner];
    m.refunds += 1;  // 4 → 5 (THRESHOLD REACHED!)
    
    if (m.refunds >= autoSuspendRefunds) {  // 5 >= 5
        m.status = Status.SUSPENDED;
        m.suspendedAt = block.timestamp;
        
        // Apply merchant score penalty
        seer.punishMerchant(owner, 50, "auto_suspend_refunds");
        // Ivan's score: 620 → 570
        
        emit AutoSuspended(owner, 5, 2, "auto_suspend_refunds");
        emit MerchantStatusChanged(owner, ACTIVE, SUSPENDED, "auto_suspend_refunds");
    }
}

// Result:
// - Ivan's status: ACTIVE → SUSPENDED
// - Ivan's merchant score: 620 → 570
// - suspendedAt: block.timestamp
// - Cannot accept new orders
// - Existing orders can still complete

// Later: Buyer tries to create new order with Ivan
CommerceEscrow.openEscrow(ivanAddress, 200 * 10**18, ipfsHash);
// Result: REVERTS with COMP_Suspended
// "Merchant is suspended, cannot accept orders"

// DAO reviews Ivan's case
// If Ivan proves he fixed issues (better suppliers, QC process):
MerchantRegistry.reinstateMerchant(
    ivanAddress,
    "Improved QC process, new supplier. Reinstating on probation."
);
// Result:
// - Ivan's status: SUSPENDED → ACTIVE
// - Can accept orders again
// - Refund/dispute counters NOT reset (permanent record)
// - Must maintain quality to avoid permanent delist
```

### **Auto-Suspension Thresholds**

| Counter | Threshold | Action | Score Penalty |
|---------|-----------|--------|---------------|
| **Refunds** | 5 | Auto-suspend | -50 |
| **Disputes** | 3 | Auto-suspend | -50 |

**Both counters are independent**: Hitting either threshold triggers suspension.

---

## 💎 **SCENARIO 6: Fee Subsidy (High-Trust Merchant)**

### **Context**
- **Merchant**: Kelly's Premium Store (merchant score: 920, maximum trust)
- **Buyer**: Lisa (personal score: 550, pays 5% fees normally)
- **Product**: Watch for 1000 VFIDE tokens
- **Special**: Treasury pays transaction fees for Kelly (score ≥750)

### **Step-by-Step Flow**

```solidity
// Check fee subsidy eligibility
bool feeless = MerchantRegistry.qualifiesForSubsidy(kellyAddress);
// Returns: true (Kelly's merchant score 920 >= 750)

// Check Kelly's fee structure (from ProofScoreBurnRouterPlus)
IProofScoreBurnRouterPlus.routeFor(kellyAddress);
// Returns (based on personal score, not merchant):
// - totalBurnBps: 50 (0.5% for score 920)
// - permanentBurnBps: 25 (50% of 0.5%)
// - treasuryBps: 12 (25% of 0.5%)
// - sanctumBps: 12 (25% of 0.5%)

// Normal transaction (if buyer paid fees):
// Amount: 1000 VFIDE
// Fees: 1000 * 0.005 = 5 VFIDE
// Buyer receives: 995 VFIDE
// Fee split: 2.5 burn, 1.25 treasury, 1.25 Sanctum

// BUT: Kelly qualifies for subsidy (score ≥750)
// Treasury reimburses Kelly for the fees
// Buyer pays: 1000 VFIDE (no deduction)
// Treasury pays: 5 VFIDE to Kelly's vault
// Fee split still applies: 2.5 burn, 1.25 treasury (net -1.25), 1.25 Sanctum

// Integration in token transfer logic (VFIDEToken.sol):
function transfer(address to, uint256 amount) external returns (bool) {
    // ... checks ...
    
    // Get merchant score
    bool qualifiesForSubsidy = seer.qualifiesForFeeSubsidy(to);
    
    if (qualifiesForSubsidy) {
        // Treasury pays fees, user pays nothing
        _transferWithTreasurySubsidy(from, to, amount);
    } else {
        // User pays fees
        _transferWithBurn(from, to, amount);
    }
}
```

### **Fee Comparison**

**Normal User (Score 550)**:
- Transaction: 1000 VFIDE
- Fees: 5% = 50 VFIDE
- Receives: 950 VFIDE
- Fee split: 25 burn, 12.5 treasury, 12.5 Sanctum

**Feeless Merchant (Score 920)**:
- Transaction: 1000 VFIDE
- Fees: 0.5% = 5 VFIDE (paid by treasury)
- Receives: 1000 VFIDE (full amount)
- Fee split: 2.5 burn, 1.25 net treasury cost, 1.25 Sanctum

**Benefit for High-Trust Merchants**:
- ✅ Competitive pricing (no fees passed to customers)
- ✅ Higher sales volume (buyers prefer feeless merchants)
- ✅ Reward for maintaining trust (920 merchant score)
- ✅ Sustainable for ecosystem (low fee % at high trust)

---

## 📊 **SCENARIO 7: Rating System Impact**

### **Context**
- **Merchant**: Mike's Electronics
- **Starting**: Merchant score 700, 48 orders, avg 4.5 stars
- **New Orders**: 2 orders with different outcomes

### **Order 1: 5-Star Rating**

```solidity
// Order completes successfully
CommerceEscrow.releasePayment(10);
// Mike's score: 700 → 705 (+5 for completion)

// Buyer submits 5-star rating
RatingSystem.submitRating(
    10,                  // escrowId
    5,                   // 5 stars
    reviewHash           // "Excellent service, fast shipping!"
);
// Result:
// - Rating recorded: verified = true
// - Mike's score: 705 → 715 (+10 for 5 stars)
// - ratingSum: (48 * 4.5) + 5 = 221
// - ratingCount: 48 → 49
// - Average: 221 / 49 = 4.51 stars
```

### **Order 2: 1-Star Rating**

```solidity
// Order completes (buyer didn't dispute, but unhappy)
CommerceEscrow.releasePayment(11);
// Mike's score: 715 → 720 (+5 for completion)

// Buyer submits 1-star rating
RatingSystem.submitRating(
    11,                  // escrowId
    1,                   // 1 star
    reviewHash           // "Poor quality, not as described"
);
// Result:
// - Rating recorded: verified = true
// - Mike's score: 720 → 705 (-15 for 1 star)
// - ratingSum: 221 + 1 = 222
// - ratingCount: 49 → 50
// - Average: 222 / 50 = 4.44 stars
```

### **Rating Score Impact Table**

| Rating | Score Change | Reason |
|--------|--------------|--------|
| 5★ | +10 | Excellent service |
| 4★ | +5 | Good service |
| 3★ | 0 | Neutral (no change) |
| 2★ | -10 | Poor service |
| 1★ | -15 | Very poor service |

### **Final Outcome**

**Mike's Metrics**:
- Merchant score: 700 → 705 (net +5 after both orders)
- Completion rate: 48/50 → 50/52 (96%)
- Average rating: 4.5 → 4.44 stars (slight drop)
- Still qualifies for listing (≥560)
- Does NOT qualify for fee subsidy (705 < 750)

**Lesson**: One bad rating can significantly impact score. Merchants must maintain quality to reach/maintain fee subsidy tier (≥750).

---

## 🎯 **KEY INTEGRATION POINTS**

### **1. Dual Score Checks**

```solidity
// Personal score affects transaction fees
uint16 personalScore = seer.getScore(user);
Route memory route = router.routeFor(user);  // Uses personal score
// Result: Fee % based on personal trust

// Merchant score affects listing and subsidy
uint16 merchantScore = seer.getMerchantScore(merchant);
bool canList = seer.isMerchantEligible(merchant);      // ≥560
bool feeless = seer.qualifiesForFeeSubsidy(merchant);  // ≥750
```

### **2. Score Modifications**

```solidity
// Personal score (buyer behavior)
seer.reward(buyer, 2, "successful_purchase");      // +2
seer.punish(buyer, 5, "dispute_filed");           // -5
seer.reward(buyer, 5, "dispute_won");             // +5 (restore)
seer.punish(buyer, 10, "frivolous_dispute");      // -10

// Merchant score (seller behavior)
seer.rewardMerchant(merchant, 5, "order_completed");   // +5
seer.rewardMerchant(merchant, 10, "good_rating");      // +10 (5★)
seer.punishMerchant(merchant, 15, "bad_rating");       // -15 (1★)
seer.punishMerchant(merchant, 20, "dispute_lost");     // -20
seer.punishMerchant(merchant, 50, "auto_suspend");     // -50
seer.punishMerchant(merchant, 500, "fraud_delist");    // -500
```

### **3. Security Integration**

```solidity
// Check vaults exist
address buyerVault = vaultHub.vaultOf(buyer);
address sellerVault = registry.getMerchant(merchant).vault;

// Check vaults not locked
if (security.isLocked(buyerVault)) revert COMP_SecLocked();
if (security.isLocked(sellerVault)) revert COMP_SecLocked();

// All transfers use vaults
token.transfer(buyerVault, amount);    // Refunds
token.transfer(sellerVault, amount);   // Payments
```

### **4. Audit Trail**

```solidity
// System events (DAO actions)
ledger.logSystemEvent(address(this), "merchant_suspended", dao);

// User events (orders, disputes)
ledger.logEvent(buyer, "escrow_opened", amount, "order_created");

// Transfers (payments, refunds)
ledger.logTransfer(escrow, merchantVault, amount, "escrow_released");
```

---

## ✅ **COMPLETE PROTECTION CHECKLIST**

### **For Buyers**
- [x] Escrow holds funds until delivery confirmed
- [x] 14-day dispute window after funding
- [x] Full refund if dispute won (100%)
- [x] DAO arbitration (neutral, 2/3 vote)
- [x] Evidence submission (photos, tracking)
- [x] Score protection (penalty restored if won)
- [x] Can rate merchant after completion
- [x] SecurityHub prevents locked vault transactions

### **For Merchants**
- [x] Auto-release after 14 days (payment guaranteed)
- [x] Dispute defense (DAO arbitration)
- [x] Score rewards (+5 per order, +10 per 5★)
- [x] Fee subsidy (≥750 = treasury pays fees)
- [x] Voluntary refunds (avoid disputes)
- [x] Clear suspension rules (5 refunds / 3 disputes)
- [x] Completion rate tracking (credibility)
- [x] Evidence system (tracking, photos, messages)

### **For Ecosystem**
- [x] Dual ProofScore (personal + merchant)
- [x] Auto-suspension (protects buyers)
- [x] Auto-release (protects merchants)
- [x] DAO governance (2/3 majority)
- [x] Sanctum integration (25% fees to charity)
- [x] Vault-only (all payments to vaults)
- [x] Immutable audit trail (ProofLedger)
- [x] SecurityHub integration (no locked vaults)

---

**This is the VFIDE way: Perfect trust and security for buyers and sellers.**

**Amazon security + PayPal protection + humanitarian impact = VFIDE Commerce Protection.**
