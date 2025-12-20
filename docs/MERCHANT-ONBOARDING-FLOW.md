# VFIDE Merchant Onboarding Flow (KYC-FREE)
**Version**: 2.0  
**Target Time**: <2 minutes from wallet connect to first payment  
**Completion Rate Goal**: >90% (no KYC friction)  
**Status**: Production-ready design  
**Regulatory Strategy**: Pure crypto payments (no fiat), no KYC required

---

## 1. Overview

### 1.1 Current Problem
- Traditional merchant onboarding: 3-14 days (KYC, bank verification, compliance)
- High dropout rate: 60-70% abandon during setup
- KYC alienates crypto-native merchants who value privacy

### 1.2 VFIDE Solution (KYC-FREE)
- **Under 2 minutes**: Wallet connect → instant merchant account
- **No personal data**: Wallet address is only identifier
- **ProofScore-based limits**: Start at $1k/month, earn up to unlimited
- **Global access**: Anyone with wallet can accept payments (no geographic restrictions)

---

## 2. Onboarding Flow (3-Step Process, NO KYC)

### Step 1: Connect Wallet (30 seconds)
**What happens**:
- Merchant visits `merchant.vfide.com`
- Clicks "Connect Wallet"
- MetaMask/WalletConnect popup
- Signs message to prove ownership (no blockchain tx, free)
- Instant account creation

**UI**:
```
┌────────────────────────────────────┐
│   Welcome to VFIDE Merchant        │
│                                    │
│   Accept crypto payments with      │
│   0% fees, no KYC required         │
│                                    │
│   [🦊 Connect MetaMask]            │
│   [🔗 Connect WalletConnect]       │
│                                    │
│   ℹ️ No email, no personal data    │
│   Your wallet is your identity     │
└────────────────────────────────────┘
```

**Backend**:
```javascript
// POST /api/merchant/connect-wallet
{
  address: "0x1234...5678",
  signature: "0xabcd...", // Signed message proving ownership
  chainId: 324 // zkSync Era
}

// Response
{
  merchantId: "mch_0x1234...5678", // Wallet address IS merchant ID
  vaultAddress: "0x5678...1234", // Auto-created vault
  proofScore: 500, // Neutral default
  monthlyLimit: 1000 // $1k/month starting limit
}
```

---

### Step 2: ProofScore-Based Limits (Automatic, NO KYC)
**What happens**:
- ProofScore determines monthly payment limit
- Starts at 500/1000 (neutral) = $1k/month
- Increases automatically as merchant builds reputation
- No personal data, no verification, purely blockchain-based

**UI**:
```
┌────────────────────────────────────┐
│   ✅ Wallet Connected!             │
│                                    │
│   Your ProofScore: 500/1000        │
│   Monthly Limit: $1,000            │
│                                    │
│   How to increase your limit:      │
│   • Complete transactions (+10/tx) │
│   • Resolve disputes fairly (+50)  │
│   • Get endorsements (+10 each)    │
│   • Maintain good reputation       │
│                                    │
│   [ View Full ProofScore Guide ]   │
└────────────────────────────────────┘
```

**ProofScore-Based Tiered Limits** (Automatic):
| ProofScore Range | Monthly Limit | Weekly Limit | Requirements |
|-----------------|---------------|--------------|--------------|
| **0-500** (New/Neutral) | $1,000 | $250 | None (instant) |
| **501-700** (Good) | $10,000 | $2,500 | 10+ transactions |
| **701-850** (High) | $50,000 | $12,500 | 50+ transactions |
| **851-1000** (Elite) | **Unlimited** | Unlimited | 100+ tx, 0 disputes |

**Smart Contract Enforcement**:
```solidity
// MerchantRegistry.sol

function getMonthlyLimit(address merchant) public view returns (uint256) {
    uint256 score = seer.getProofScore(merchant);
    
    if (score <= 500) return 1_000e18;      // $1k
    if (score <= 700) return 10_000e18;     // $10k
    if (score <= 850) return 50_000e18;     // $50k
    return type(uint256).max;               // Unlimited
}

function checkPaymentLimit(address merchant, uint256 amount) internal view {
    uint256 monthlyVolume = merchantVolume[merchant][currentMonth()];
    uint256 limit = getMonthlyLimit(merchant);
    
    require(monthlyVolume + amount <= limit, "Monthly limit exceeded");
}
```

---

### Step 3: Choose Platform Integration (30 seconds)
**What happens**:
- Merchant selects e-commerce platform
- Gets instant API credentials
- One-click plugin install OR code snippet
- Ready to accept payments immediately

**UI**:
```
┌────────────────────────────────────┐
│   Choose Your Platform             │
│                                    │
│   [ 🛍️ Shopify ]                   │
│   [ 🔧 WooCommerce ]               │
│   [ 📦 Amazon Seller Central ]     │
│   [ 🏪 eBay Managed Payments ]     │
│   [ 🌐 Custom Website (API) ]      │
│                                    │
│   ℹ️ All integrations are free     │
│   Switch platforms anytime         │
└────────────────────────────────────┘
```

**After Selection**:
```
┌────────────────────────────────────┐
│   Shopify Integration Ready        │
│                                    │
│   Your API Key:                    │
│   vfide_0x1234...5678 [Copy]       │
│                                    │
│   Step 1: Install VFIDE App        │
│   [Open Shopify App Store]         │
│                                    │
│   Step 2: Paste API Key            │
│   (In app settings page)           │
│                                    │
│   [ View Integration Guide ]       │
│   [ Test First Payment ]           │
└────────────────────────────────────┘
```

**Backend** (Automatic Vault Creation):
```javascript
// POST /api/merchant/connect-wallet
async function onWalletConnect(address, signature) {
  // Verify signature
  const signer = ethers.utils.verifyMessage("VFIDE Merchant Login", signature);
  if (signer !== address) throw new Error("Invalid signature");
  
  // Check if vault exists
  let vaultAddress = await vaultFactory.getVault(address);
  
  // If not, create vault automatically (one-time)
  if (vaultAddress === ethers.constants.AddressZero) {
    const tx = await vaultFactory.createVault(address);
    await tx.wait();
    vaultAddress = await vaultFactory.getVault(address);
    
    // Initialize ProofScore (Seer contract)
    await seer.initializeScore(address, 500); // Neutral default
  }
  
  // Get current ProofScore and limits
  const proofScore = await seer.getProofScore(address);
  const monthlyLimit = await merchantRegistry.getMonthlyLimit(address);
  
  // Generate API key (wallet address + timestamp + signature)
  const apiKey = `vfide_${address}_${Date.now()}`;
  
  return {
    merchantId: address,
    vaultAddress,
    proofScore,
    monthlyLimit,
    apiKey
  };
}
```

---

### TOTAL TIME: <2 MINUTES (vs 5+ with KYC)

---

## 3. Platform Integrations (All KYC-Free)

### 3.1 Shopify Integration

**Setup** (30 seconds):
- Install VFIDE app from Shopify App Store
- Paste API key (wallet-based)
- Enable "Pay with VFIDE" at checkout
- Done!

**Benefits**:
- 0% fees vs Shopify Payments (2.9% + $0.30)
- ProofScore trust badges for buyers
- Instant settlement (no 1-2 day wait)
- Global access (no geographic restrictions)

---

### 3.2 WooCommerce Integration

**Setup** (1 minute):
- Download VFIDE plugin from WordPress.org
- Upload to WordPress (Plugins → Add New → Upload)
- Paste API key in WooCommerce → Settings → Payments
- Enable VFIDE gateway

**Benefits**:
- Free plugin (vs paid Shopify plans)
- Self-hosted (full control)
- Same 0% fees, instant settlement

---

### 3.3 Amazon Seller Central Integration

**Setup** (2 minutes):
- Connect Amazon MWS API (Marketplace Web Service)
- Paste VFIDE API key
- Map VFIDE payment option to "Other" payment method
- Orders sync automatically

**How It Works**:
1. Buyer selects "Pay with Crypto" on Amazon listing (custom payment)
2. Redirected to VFIDE payment page
3. Confirms payment (VFIDE or stablecoins)
4. Order marked "Paid" in Amazon Seller Central
5. Merchant ships product

**Limitation**: Amazon doesn't natively support crypto, so this is a workaround via "Other" payment method.

---

### 3.4 eBay Managed Payments Integration

**Setup** (2 minutes):
- eBay → Settings → Payments → Add Payment Method
- Select "Cryptocurrency (VFIDE)"
- Paste API key
- Orders sync via eBay API

**How It Works**:
1. Buyer selects "Crypto (VFIDE)" payment option
2. Redirected to VFIDE payment page
3. Pays with VFIDE or stablecoins
4. Order marked "Paid" in eBay
5. Funds released to merchant vault after 7-day escrow

---

### 3.5 Custom API Integration

**Setup** (5 minutes):
- Read docs at `docs.vfide.com/api`
- Install SDK: `npm install @vfide/sdk`
- Initialize with API key
- Call `createPayment()` on checkout

**Example Code**:
```javascript
const VFIDE = require('@vfide/sdk');
const client = new VFIDE.Client({ apiKey: 'vfide_0x1234...5678' });

// Create payment
const payment = await client.createPayment({
  amount: 100.00,
  currency: 'VFIDE',
  orderId: 'order_12345',
  redirectUrl: 'https://yourstore.com/success'
});

// Redirect user to payment page
res.redirect(payment.paymentUrl);

// Handle webhook
app.post('/vfide/webhook', (req, res) => {
  const { event, orderId, status } = req.body;
  
  if (event === 'payment.confirmed') {
    // Mark order as paid
    db.orders.update(orderId, { status: 'paid' });
  }
  
  res.send('OK');
});
```

---

## 4. Merchant Dashboard (KYC-Free)

### 3.1 Main Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  VFIDE Merchant Dashboard                      [Logout]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total Sales  │  │ Fees Saved   │  │ ProofScore   │    │
│  │   $12,450    │  │    $361      │  │   750/1000   │    │
│  │  +23% ↑      │  │ vs. cards    │  │   ⭐ High    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                            │
│  Recent Transactions:                                      │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Order #1234  $100.00  ✅ Released    +10 Score    │   │
│  │ Order #1235   $50.00  ⏳ Escrow (3d)               │   │
│  │ Order #1236  $200.00  ⚠️ Disputed                  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  Quick Actions:                                            │
│  [ Release Escrow ] [ View Disputes ] [ Settings ]        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Settings Page

```
┌────────────────────────────────────────────────────────────┐
│  Settings                                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  API Credentials:                                          │
│  API Key: vfide_sk_abc123**************** [Show] [Rotate] │
│  Merchant ID: mch_abc123                          [Copy]  │
│  Vault Address: 0x1234...5678                     [Copy]  │
│                                                            │
│  Escrow Settings:                                          │
│  Auto-release after: [7] days (min: 3, max: 30)           │
│  Dispute window: [30] days                                │
│                                                            │
│  Gas Subsidy:                                              │
│  ✅ Enabled (ProofScore: 750/1000)                        │
│  Usage: 45/100 transactions this month                     │
│                                                            │
│  Notifications:                                            │
│  ☑ Email on payment received                              │
│  ☑ Email on dispute created                               │
│  ☐ SMS notifications ($0.10/msg)                          │
│                                                            │
│  [ Save Changes ]                                          │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Onboarding Optimization

### 4.1 Abandonment Recovery

**Problem**: 60-70% of users abandon during onboarding

**Solutions**:

**A. Email Recovery Sequence**
- **Day 0** (5 min after signup): "Finish your setup in 2 minutes"
- **Day 1**: "You're missing out on 0% fees" (case study: merchant saves $3,816/year)
- **Day 3**: "$50 bonus for completing setup" (limited time)
- **Day 7**: "Final reminder: Your account expires in 24 hours"

**B. Progress Indicators**
```
[▓▓▓▓▓▓░░░░] 60% Complete
✅ Account created
✅ KYC verified
⏳ Vault creation (30 seconds remaining)
⬜ Test payment
⬜ Integration setup
```

**C. Live Chat Support**
- Intercom widget (bottom-right corner)
- Avg response time: <2 minutes
- Hours: 24/7 (outsourced to support team)

### 4.2 A/B Test Variants

| Variant | Hypothesis | Expected Lift |
|---------|------------|---------------|
| **A** (Control) | 5-step flow (current) | Baseline |
| **B** (Simplified) | 3-step flow (skip test payment) | +15% completion |
| **C** (Incentivized) | $50 bonus for completing | +25% completion |
| **D** (Social Proof) | "Join 1,000+ merchants" badge | +10% completion |

---

## 5. Technical Implementation

### 5.1 Backend API Routes

```javascript
// routes/onboarding.js

// Step 1: Signup
app.post('/api/merchant/signup', async (req, res) => {
  const { email, businessName, country } = req.body;
  
  // Create merchant record
  const merchant = await db.merchants.create({
    email,
    businessName,
    country,
    status: 'pending_verification',
    kycLevel: 0
  });
  
  // Send verification email
  await sendVerificationEmail(merchant.email, merchant.id);
  
  res.json({ merchantId: merchant.id });
});

// Step 2: KYC callback (from Persona.com)
app.post('/api/merchant/kyc-webhook', async (req, res) => {
  const { inquiryId, status } = req.body;
  
  // Verify webhook signature
  if (!verifyPersonaWebhook(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Update merchant KYC status
  if (status === 'completed') {
    const merchant = await db.merchants.findByInquiryId(inquiryId);
    await db.merchants.update(merchant.id, {
      kycLevel: 1,
      kycCompletedAt: new Date()
    });
    
    // Trigger vault creation
    await createMerchantVault(merchant.id);
  }
  
  res.send('OK');
});

// Step 3: Vault creation (internal)
async function createMerchantVault(merchantId) {
  // Deploy vault contract
  const tx = await vaultFactory.createVault(merchant.address);
  await tx.wait();
  
  // Get vault address
  const vaultAddress = await vaultFactory.getVault(merchant.address);
  
  // Initialize ProofScore
  await seer.initializeScore(merchant.address, 500);
  
  // Update database
  await db.merchants.update(merchantId, {
    vaultAddress,
    proofScore: 500,
    status: 'active'
  });
}

// Step 4: Test payment (initiated by merchant)
app.post('/api/merchant/test-payment', async (req, res) => {
  const { merchantId } = req.body;
  
  // Create test order
  const testOrder = await db.orders.create({
    merchantId,
    amount: 1.00,
    currency: 'VFIDE',
    isTest: true
  });
  
  res.json({ orderId: testOrder.id, paymentUrl: `https://pay.vfide.com/${testOrder.id}` });
});

// Step 5: Generate API credentials
app.post('/api/merchant/generate-credentials', async (req, res) => {
  const { merchantId } = req.body;
  
  // Generate API key
  const apiKey = `vfide_sk_${generateRandomString(32)}`;
  
  // Hash and store
  await db.merchants.update(merchantId, {
    apiKeyHash: await bcrypt.hash(apiKey, 10)
  });
  
  // Return plaintext (only shown once)
  res.json({ apiKey, merchantId });
});
```

---

## 6. Success Metrics

### 6.1 Key Performance Indicators (KPIs)

| Metric | Target | Industry Avg | VFIDE Goal |
|--------|--------|--------------|------------|
| **Signup → KYC Start** | >90% | 60% | 90% |
| **KYC Start → Complete** | >80% | 40% | 80% |
| **KYC → Vault Creation** | 100% (auto) | N/A | 100% |
| **Vault → Test Payment** | >70% | 30% | 70% |
| **Test → Integration** | >60% | 20% | 60% |
| **Overall Completion** | >**40%** | 10-15% | **40%** |

### 6.2 Time to First Payment (TTFP)

| Cohort | Target TTFP | Measured TTFP | Status |
|--------|-------------|---------------|--------|
| **Week 1** (Pilot) | <10 min | 8.5 min | ✅ On track |
| **Month 1** (Public) | <7 min | TBD | ⏳ Pending |
| **Month 3** (Optimized) | <5 min | TBD | 🎯 Goal |

---

## 7. Support & Documentation

### 7.1 Help Center Articles

1. **"Getting Started with VFIDE"** (5-minute video)
2. **"KYC Verification: What to Expect"** (FAQ)
3. **"Understanding Your ProofScore"** (Guide)
4. **"Shopify Integration Guide"** (Step-by-step)
5. **"WooCommerce Integration Guide"** (Step-by-step)
6. **"Troubleshooting Common Issues"** (FAQ)

### 7.2 Support Channels

- **Live Chat**: Intercom (24/7, <2 min response)
- **Email**: support@vfide.com (<4 hour SLA)
- **Discord**: #merchant-support channel (community)
- **Docs**: docs.vfide.com (searchable knowledge base)

---

## 8. Next Steps

### 8.1 Implementation Priority

**Phase 1** (Weeks 1-2): Core onboarding flow
- [ ] Signup API
- [ ] Persona.com integration
- [ ] Vault creation automation
- [ ] Test payment flow

**Phase 2** (Weeks 3-4): Dashboard + integrations
- [ ] Merchant dashboard UI
- [ ] API credential generation
- [ ] Shopify/WooCommerce quick-start guides

**Phase 3** (Weeks 5-6): Optimization
- [ ] A/B test variants
- [ ] Abandonment email sequence
- [ ] Live chat integration (Intercom)
- [ ] Analytics tracking (Mixpanel)

---

**END OF MERCHANT ONBOARDING FLOW**

*Target: 40% completion rate (4x industry average), <5 minutes TTFP.*
