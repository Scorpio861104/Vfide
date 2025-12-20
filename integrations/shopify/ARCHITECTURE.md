# VFIDE Shopify Payment Plugin Architecture
**Version**: 1.0  
**Target**: Shopify merchants (80% of e-commerce market)  
**Timeline**: 4-6 weeks development  
**Status**: Design phase  

---

## 1. Overview

### 1.1 Purpose
Enable Shopify merchants to accept VFIDE payments with **0% transaction fees**, replacing credit cards (2.9% + $0.30).

### 1.2 Key Features
- ✅ One-click checkout integration
- ✅ Real-time ProofScore display (buyer trust badge)
- ✅ Automatic gas subsidy for high-trust merchants (score ≥750)
- ✅ Escrow with dispute resolution
- ✅ Multi-stablecoin support (USDC, USDT, DAI)
- ✅ Instant settlement (no 2-3 day wait like credit cards)

### 1.3 Competitive Advantage
| Feature | Credit Cards | Shopify Payments | VFIDE |
|---------|--------------|-----------------|-------|
| **Merchant Fee** | 2.9% + $0.30 | 2.9% + $0.30 | **0%** |
| **Settlement Time** | 2-3 days | 1-2 days | **Instant** |
| **Chargeback Risk** | Yes (merchant loses) | Yes | Escrow + dispute |
| **ProofScore Trust** | No | No | **Yes (1-1000)** |
| **Gas Subsidy** | N/A | N/A | **Free for ≥750 score** |

**Value Prop**: Merchants save $3,816/year on $10k monthly sales (vs. credit cards).

---

## 2. Technical Architecture

### 2.1 High-Level Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Shopper   │────────▶│    Shopify   │────────▶│ VFIDE Plugin│
│  (Buyer)    │ Checkout│   Checkout   │  Webhook│   Backend   │
└─────────────┘         └──────────────┘         └─────────────┘
                                                        │
                                                        ▼
                                                  ┌─────────────┐
                                                  │  zkSync Era │
                                                  │  Contracts  │
                                                  └─────────────┘
                                                  - VaultFactory
                                                  - EscrowManager
                                                  - ProofLedger
                                                  - GasSubsidyPool
```

### 2.2 Component Breakdown

#### **A. Shopify Plugin (Frontend)**
- **Tech Stack**: React + Shopify Polaris UI
- **Location**: Shopify App Store
- **Installation**: Merchant clicks "Add App" → OAuth flow → Settings page

**Features**:
1. **Checkout Integration**: Adds "Pay with VFIDE" button
2. **ProofScore Badge**: Shows buyer's trust score (1-1000) at checkout
3. **Payment Status**: Real-time updates (pending → confirmed → settled)
4. **Dispute Dashboard**: Merchant can view/respond to disputes
5. **Analytics**: Transaction volume, fees saved, ProofScore distribution

#### **B. VFIDE Backend API**
- **Tech Stack**: Node.js + Express + ethers.js
- **Hosting**: AWS/GCP/Vercel (high availability)
- **Database**: PostgreSQL (transaction logs, merchant settings)

**Endpoints**:
```javascript
POST /api/checkout/create         // Create payment intent
GET  /api/checkout/:id/status     // Check payment status
POST /api/escrow/release           // Release funds to merchant
POST /api/dispute/create           // Buyer initiates dispute
POST /api/merchant/settings        // Update merchant config
GET  /api/proofscore/:address      // Get buyer's ProofScore
```

#### **C. Smart Contract Integration**
- **Network**: zkSync Era Mainnet
- **Contracts Used**:
  1. `VaultFactory` - Create buyer/merchant vaults automatically
  2. `EscrowManager` - Lock funds during fulfillment period
  3. `ProofLedger` - Log all payment events (immutable)
  4. `GasSubsidyPool` - Reimburse gas for merchants (score ≥750)
  5. `StablecoinRegistry` - Support USDC/USDT/DAI payments

**Transaction Flow**:
```solidity
1. Buyer initiates payment (VFIDE or stablecoins)
   → EscrowManager.createPayment(merchant, amount, orderId)

2. Merchant ships product
   → Backend calls EscrowManager.confirmShipment(orderId)

3. Buyer confirms receipt (or 7 days auto-release)
   → EscrowManager.releasePayment(orderId)
   → ProofScore +10 for buyer, +5 for merchant

4. IF dispute:
   → DisputeResolver.initiateDispute(orderId, evidence)
   → DAO votes OR automated resolution (if ProofScore delta >200)
```

---

## 3. User Experience (UX)

### 3.1 Merchant Onboarding (<5 minutes)

**Step 1: Install Plugin (30 seconds)**
- Merchant visits Shopify App Store
- Search "VFIDE Payments"
- Click "Add App" → OAuth authorization

**Step 2: KYC Verification (2 minutes)**
- Upload ID (driver's license, passport)
- Verify business (EIN, business license)
- Sanctions screening (OFAC compliance)
- **Provider**: Persona.com or Onfido.com

**Step 3: Vault Creation (30 seconds)**
- Backend calls `VaultFactory.createVault(merchantAddress)`
- Merchant vault address returned
- Display in plugin dashboard

**Step 4: Test Payment (1 minute)**
- Merchant makes $1 test purchase (using testnet VFIDE)
- Confirm payment received
- Release escrow

**Step 5: Go Live (30 seconds)**
- Merchant toggles "Enable VFIDE Payments" in plugin
- "Pay with VFIDE" button appears at checkout
- Done! 🎉

### 3.2 Buyer Checkout Flow (<1 minute)

**Step 1: Add to Cart**
- Buyer browses Shopify store
- Adds product to cart
- Clicks "Checkout"

**Step 2: Select VFIDE Payment**
- Shopify checkout page shows payment options:
  - Credit Card (2.9% fee)
  - PayPal (2.9% fee)
  - **VFIDE (0% fee)** ← New!
- Buyer selects VFIDE

**Step 3: Connect Wallet**
- MetaMask / WalletConnect popup
- Buyer approves connection
- ProofScore badge displays: "Trust Score: 750/1000 ⭐ Verified Buyer"

**Step 4: Confirm Payment**
- Shows: Amount, Gas estimate, Escrow release date (7 days)
- Buyer clicks "Pay with VFIDE"
- Transaction submitted to zkSync Era

**Step 5: Order Confirmation**
- Shopify order status: "Paid"
- Buyer receives email: "Payment in escrow, will release on [date]"
- Merchant ships product

### 3.3 Post-Purchase Experience

**For Buyer**:
- Email notification: "Order shipped, tracking: [link]"
- After 7 days (or manual confirmation): "Payment released to merchant, +10 ProofScore"
- If issue: "Report problem" button → Dispute flow

**For Merchant**:
- Shopify dashboard: "VFIDE payment received ($100)"
- After release: Funds available in merchant vault
- Withdraw to bank via stablecoin off-ramp (Coinbase, Kraken)

---

## 4. Technical Implementation

### 4.1 Shopify Plugin Code Structure

```
shopify-plugin/
├── frontend/               # React app
│   ├── pages/
│   │   ├── Dashboard.tsx   # Merchant analytics
│   │   ├── Settings.tsx    # Config (gas subsidy, disputes)
│   │   └── Disputes.tsx    # Dispute management
│   ├── components/
│   │   ├── CheckoutButton.tsx    # "Pay with VFIDE" button
│   │   ├── ProofScoreBadge.tsx   # Buyer trust display
│   │   └── PaymentModal.tsx      # Payment confirmation UI
│   └── hooks/
│       ├── useVaultBalance.ts    # Fetch merchant vault balance
│       └── useProofScore.ts      # Fetch buyer ProofScore
├── backend/               # Node.js API
│   ├── routes/
│   │   ├── checkout.ts    # Payment creation/status
│   │   ├── escrow.ts      # Escrow release/dispute
│   │   └── merchant.ts    # Merchant settings
│   ├── services/
│   │   ├── blockchain.ts  # ethers.js contract calls
│   │   ├── shopify.ts     # Shopify API integration
│   │   └── kyc.ts         # Persona.com integration
│   └── db/
│       ├── models/
│       │   ├── Merchant.ts
│       │   ├── Payment.ts
│       │   └── Dispute.ts
│       └── migrations/
├── contracts/             # Smart contract ABIs
│   ├── VaultFactory.json
│   ├── EscrowManager.json
│   └── ProofLedger.json
└── tests/
    ├── integration.test.ts
    └── e2e.test.ts
```

### 4.2 Key Code Snippets

#### **Checkout Button Component (React)**
```typescript
// frontend/components/CheckoutButton.tsx

import { useAccount, useContractWrite } from 'wagmi';
import { ESCROW_MANAGER_ADDRESS, ESCROW_MANAGER_ABI } from '../contracts';

export const VFIDECheckoutButton = ({ orderId, amount, merchantAddress }) => {
  const { address: buyerAddress } = useAccount();
  const { write: createPayment } = useContractWrite({
    address: ESCROW_MANAGER_ADDRESS,
    abi: ESCROW_MANAGER_ABI,
    functionName: 'createPayment',
  });

  const handlePayment = async () => {
    // 1. Check buyer's ProofScore
    const score = await fetchProofScore(buyerAddress);
    
    // 2. Create escrow payment
    await createPayment({
      args: [merchantAddress, amount, orderId, 7 * 24 * 60 * 60], // 7-day escrow
    });
    
    // 3. Update Shopify order status
    await fetch('/api/shopify/order/update', {
      method: 'POST',
      body: JSON.stringify({ orderId, status: 'paid' }),
    });
  };

  return (
    <button onClick={handlePayment} className="vfide-checkout-btn">
      Pay with VFIDE (0% fee)
    </button>
  );
};
```

#### **Backend API: Create Payment (Node.js)**
```javascript
// backend/routes/checkout.ts

import { ethers } from 'ethers';
import { ESCROW_MANAGER_ADDRESS, ESCROW_MANAGER_ABI } from '../contracts';

app.post('/api/checkout/create', async (req, res) => {
  const { orderId, amount, merchantAddress, buyerAddress } = req.body;

  // 1. Validate merchant is KYC verified
  const merchant = await db.merchants.findOne({ address: merchantAddress });
  if (!merchant.kycVerified) {
    return res.status(403).json({ error: 'Merchant not KYC verified' });
  }

  // 2. Create payment intent in database
  const payment = await db.payments.create({
    orderId,
    amount,
    merchant: merchantAddress,
    buyer: buyerAddress,
    status: 'pending',
  });

  // 3. Generate payment URL for buyer
  const paymentUrl = `https://pay.vfide.com/${payment.id}`;

  res.json({ paymentId: payment.id, paymentUrl });
});
```

#### **Smart Contract Call: Release Escrow (ethers.js)**
```javascript
// backend/services/blockchain.ts

import { ethers } from 'ethers';

export async function releaseEscrow(orderId: string) {
  const provider = new ethers.providers.JsonRpcProvider(ZKSYNC_RPC_URL);
  const wallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);
  
  const escrowManager = new ethers.Contract(
    ESCROW_MANAGER_ADDRESS,
    ESCROW_MANAGER_ABI,
    wallet
  );

  // Release payment to merchant
  const tx = await escrowManager.releasePayment(orderId);
  await tx.wait();

  // Log event in ProofLedger (automatically triggered by contract)
  console.log(`Escrow released for order ${orderId}`);
}
```

---

## 5. Security Considerations

### 5.1 Merchant Verification (KYC/AML)
- **Requirement**: All merchants must pass KYC before accepting payments
- **Provider**: Persona.com or Onfido.com
- **Checks**:
  - ✅ ID verification (government-issued ID)
  - ✅ Business verification (EIN, business license)
  - ✅ OFAC sanctions screening
  - ✅ Ongoing monitoring (re-verify every 12 months)

### 5.2 Buyer Protection
- **Escrow Period**: 7 days (configurable by merchant, min 3 days)
- **Dispute Window**: 30 days after escrow release
- **Buyer Deposit**: 10% of order value (returned if dispute is valid)
- **Resolution**:
  - Automated: ProofScore delta >200 → Higher score wins
  - Manual: DAO arbitration if scores are close

### 5.3 Gas Subsidy Abuse Prevention
- **Eligibility**: Merchant ProofScore ≥750
- **Cap**: 50-100 tx/month per merchant
- **Monitoring**: If merchant score drops below 700, subsidy suspended
- **Fraud Detection**: If merchant creates fake orders, blacklisted

### 5.4 Plugin Security
- **OAuth**: Shopify OAuth 2.0 (no API keys stored)
- **API Authentication**: JWT tokens (30-minute expiry)
- **Rate Limiting**: 100 req/min per merchant
- **HTTPS Only**: All API calls encrypted
- **Webhook Verification**: HMAC signature validation (Shopify → Backend)

---

## 6. Deployment Plan

### 6.1 Phase 1: Development (4 weeks)
**Week 1**: Frontend (React + Polaris UI)
- Dashboard, Settings, Dispute pages
- Checkout button component
- ProofScore badge component

**Week 2**: Backend API (Node.js + Express)
- Checkout, Escrow, Merchant routes
- Blockchain service (ethers.js)
- KYC integration (Persona.com)

**Week 3**: Smart Contract Integration
- Deploy EscrowManager, VaultFactory to zkSync Sepolia
- Test payment flow end-to-end
- Gas subsidy logic

**Week 4**: Testing & QA
- Unit tests (Jest)
- Integration tests (Hardhat)
- E2E tests (Playwright)

### 6.2 Phase 2: Shopify App Store Submission (1 week)
- Shopify Partner account setup
- App listing: Title, description, screenshots
- Privacy policy, terms of service
- App review (Shopify reviews in 3-5 days)

### 6.3 Phase 3: Pilot Merchants (1 week)
- Recruit 10 pilot merchants (crypto-native stores)
- Manual onboarding + support
- Process $10k in test payments
- Collect feedback

### 6.4 Phase 4: Public Launch (Ongoing)
- Shopify App Store goes live
- Marketing: Blog posts, Twitter, Reddit
- Support: Discord, email, docs
- Iterate based on merchant feedback

---

## 7. Success Metrics (First 90 Days)

### 7.1 Conservative Goals
- ✅ 50 merchants installed plugin
- ✅ $50k total payment volume
- ✅ 10% churn rate (5 merchants uninstall)
- ✅ 4.5/5 average rating (Shopify App Store)

### 7.2 Moderate Goals
- ✅ 200 merchants installed plugin
- ✅ $200k total payment volume
- ✅ 5% churn rate (10 merchants uninstall)
- ✅ 4.7/5 average rating

### 7.3 Optimistic Goals
- ✅ 1,000 merchants installed plugin
- ✅ $1M total payment volume
- ✅ 2% churn rate (20 merchants uninstall)
- ✅ 4.9/5 average rating

---

## 8. Competitive Analysis

### 8.1 Existing Shopify Payment Options

| Payment Method | Merchant Fee | Settlement | Chargeback Risk | ProofScore | Winner |
|----------------|--------------|------------|-----------------|------------|--------|
| **Shopify Payments** | 2.9% + $0.30 | 1-2 days | Yes | No | VFIDE |
| **PayPal** | 2.9% + $0.30 | 1-2 days | Yes | No | VFIDE |
| **Stripe** | 2.9% + $0.30 | 2-3 days | Yes | No | VFIDE |
| **Coinbase Commerce** | 1% | Instant | No (crypto) | No | VFIDE (0% fee) |
| **Request Network** | 0.1-0.5% | Instant | No (crypto) | No | VFIDE (ProofScore) |
| **VFIDE** | **0%** | **Instant** | **Escrow** | **Yes** | **VFIDE WINS** |

### 8.2 Key Differentiators

**vs. Coinbase Commerce**:
- ✅ VFIDE: 0% fee (Coinbase: 1%)
- ✅ VFIDE: ProofScore trust (Coinbase: no reputation)
- ✅ VFIDE: Escrow + disputes (Coinbase: direct payment only)

**vs. Request Network**:
- ✅ VFIDE: 0% fee (Request: 0.1-0.5%)
- ✅ VFIDE: ProofScore (Request: no trust system)
- ⚠️ Request: Shopify plugin already exists (VFIDE needs to build)

**vs. Credit Cards**:
- ✅ VFIDE: 0% fee (Cards: 2.9% + $0.30)
- ✅ VFIDE: Instant settlement (Cards: 2-3 days)
- ❌ VFIDE: Requires crypto (Cards: universal acceptance)

---

## 9. Marketing Strategy

### 9.1 Target Merchants
1. **Crypto-native stores**: NFT sellers, Web3 tools, crypto merch
2. **High-margin products**: Jewelry, electronics, luxury goods (where 2.9% hurts most)
3. **International stores**: Cross-border payments (avoid forex fees)

### 9.2 Marketing Channels
- **Shopify App Store**: Organic discovery + paid ads
- **Twitter/X**: Crypto community outreach
- **Reddit**: r/shopify, r/ecommerce, r/cryptocurrency
- **YouTube**: Tutorial videos ("Save 3% on Shopify with VFIDE")
- **Partnerships**: zkSync ecosystem grants, Shopify Plus consultants

### 9.3 Value Proposition (1-liner)
> "VFIDE: The only Shopify payment app with 0% fees + buyer trust scores."

---

## 10. Next Steps

### 10.1 Immediate Actions (This Week)
- [ ] Set up Shopify Partner account
- [ ] Create GitHub repo: `vfide-shopify-plugin`
- [ ] Design Figma mockups (Dashboard, Checkout, Disputes)
- [ ] Write technical spec for backend API
- [ ] Deploy smart contracts to zkSync Sepolia testnet

### 10.2 Week 1-4 (Development)
- [ ] Build frontend (React + Polaris)
- [ ] Build backend (Node.js + Express + ethers.js)
- [ ] Integrate KYC (Persona.com)
- [ ] Write tests (Jest + Hardhat + Playwright)

### 10.3 Week 5 (Shopify Submission)
- [ ] Submit app to Shopify App Store
- [ ] Write privacy policy + terms of service
- [ ] Create demo video (2 minutes)
- [ ] Await approval (3-5 days)

### 10.4 Week 6-8 (Pilot Program)
- [ ] Recruit 10 pilot merchants
- [ ] Onboard + process $10k in payments
- [ ] Collect feedback + iterate
- [ ] Prepare for public launch

---

## 11. Open Questions

### 11.1 For Development Team
- Q: Should we support Shopify POS (in-person payments) or online-only?
- Q: Multi-chain support (Polygon, Arbitrum) or zkSync-only at launch?
- Q: Should gas subsidies be automatic or merchant opt-in?

### 11.2 For Legal/Compliance
- Q: Do we need MSB (Money Services Business) license for Shopify plugin?
- Q: GDPR compliance for EU merchants?
- Q: Refund policy (if buyer wants fiat refund, not crypto)?

### 11.3 For Product/UX
- Q: Should "Pay with VFIDE" be default payment option or secondary?
- Q: How to explain ProofScore to non-crypto merchants?
- Q: Onboarding: 5 minutes (current) or <2 minutes (aggressive)?

---

**END OF SHOPIFY PLUGIN ARCHITECTURE**

*This document will be used for development kickoff. Next: WooCommerce plugin architecture.*
