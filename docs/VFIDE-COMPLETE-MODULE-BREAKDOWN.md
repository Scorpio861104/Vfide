# VFIDE Complete Module Breakdown
**Based on Deep Contract Analysis**  
**Date**: December 3, 2025  

---

## Executive Summary

After scanning all 30+ smart contracts, VFIDE is a **complete commerce ecosystem** with:
- **0% fee payments** (merchant-friendly)
- **Trust-based scoring** (ProofScore 0-1000)
- **Vault-based security** (all funds in non-custodial vaults)
- **Guardian nodes** (staking + governance)
- **DAO governance** (community-controlled)
- **Merchant tools** (payment links, QR codes, website hosting)
- **Recurring subscriptions** (auto-billing)
- **Multi-currency support** (VFIDE + stablecoins)

---

## Module Groups (7 Categories)

### GROUP 1: COMMERCE & PAYMENTS
**Purpose**: Merchant payments, checkouts, escrow  
**Contracts**: `VFIDECommerce`, `MerchantPortal`, `EscrowManager`, `SubscriptionManager`

#### Features:
1. **Merchant Registration**
   - Register business with ProofScore requirement (560+)
   - Business name, category, metadata
   - Merchant dashboard with stats (volume, tx count)

2. **Payment Processing**
   - Accept VFIDE or stablecoins (USDC, USDT, DAI)
   - 0.25% protocol fee (lowest in industry)
   - Instant settlement to merchant vault
   - Real-time trust scoring for customers

3. **Payment Methods**:
   - **VFIDE Links**: `vfide.org/pay?merchant=0x123&amount=100`
   - **QR Codes**: Generated payment QR for in-store
   - **Website Widgets**: Embeddable checkout button
   - **Stable-Pay**: Auto-convert VFIDE to USDC for merchants

4. **Escrow (Safe Buy)**
   - Buyer protection with time-locked funds
   - Dynamic release times based on merchant ProofScore:
     - High Trust (800+): 3 days
     - Medium Trust (600-799): 7 days
     - Low Trust (<600): 14 days
   - Dispute resolution via DAO arbiter
   - Buyer confirms delivery or merchant claims after timeout

5. **Subscriptions**
   - Recurring payments (monthly/weekly/daily)
   - User pre-approves amount + interval
   - Merchant triggers payment (cron-job ready)
   - Cancel anytime

6. **Merchant Rebates**
   - High-trust merchants (800+) get instant rebates
   - Protocol fees returned to merchant vault
   - Auto-applied on payment

---

### GROUP 2: TRUST & REPUTATION
**Purpose**: ProofScore calculation, endorsements, trust explorer  
**Contracts**: `VFIDETrust` (Seer + ProofLedger), `ProofScoreBurnRouter`

#### ProofScore Algorithm (0-1000):
```
Total Score = Base (500)
            + Capital Bonus (0-200, capped)
            + Behavioral Delta (-∞ to +∞)
            + Endorsements (10 points each, max 5)
            + Badges (custom weights)
            + Activity Score (0-200, decays 5pts/week)
```

#### Features:
1. **Trust Explorer**
   - Search any address
   - View ProofScore + tier badge
   - Transaction history
   - Endorsement network visualization

2. **Endorsements**
   - Users with 700+ score can endorse others
   - Max 5 endorsements received (anti-Sybil)
   - Max 20 endorsements given
   - Chain of Responsibility: if you endorse a bad actor, you lose points too
   - 7-day holding period before endorsing

3. **Badges**
   - "Verified Merchant", "Top Trader", "DAO Contributor"
   - Custom weights (DAO-set)
   - Visual icons on profiles

4. **Activity Tracking**
   - Commerce transactions, governance votes, vault operations
   - Decay over time (5pts/week of inactivity)
   - Encourages ongoing participation

5. **Dynamic Fees**
   - ProofScore affects fee rates:
     - High Trust (80%+): 0.25% total fee
     - Neutral (60%): ~2.63% fee
     - Low Trust (≤40%): 5% fee

---

### GROUP 3: VAULTS & SECURITY
**Purpose**: Non-custodial storage, guardians, recovery  
**Contracts**: `VaultInfrastructure` (Hub + UserVault), `VFIDESecurity`, `TempVault`

#### Vault System:
1. **UserVault (Personal Vault)**
   - Auto-created on first use (CREATE2 deterministic)
   - User owns private keys, vault holds funds
   - All VFIDE transfers MUST go vault-to-vault (not wallets)

2. **Guardian Recovery**
   - User appoints 2-3 trusted guardians
   - If user loses keys, guardians vote to recover
   - Requires 2/3 guardian approval
   - 30-day expiry on recovery requests
   - Next-of-Kin instant recovery (if no guardians)

3. **Withdrawal Protections**
   - 24-hour cooldown between withdrawals
   - Large transfer threshold alerts (10k+ VFIDE)
   - Security Hub can freeze vaults (emergency)

4. **Smart Account Features**
   - Execute arbitrary calls (DeFi interactions)
   - Batch operations (approve + swap in one tx)
   - Approve spending limits for merchants

5. **Emergency Controls**
   - PanicGuard: user-initiated freeze
   - GuardianLock: guardian-initiated freeze
   - DAO can force-recover compromised vaults (7-day timelock + 3-sig)

---

### GROUP 4: PRESALE & TOKEN DISTRIBUTION
**Purpose**: Token presale with tiered pricing and bonuses  
**Contracts**: `VFIDEPresale`

#### Presale Tiers:
1. **Founding Tier** ($0.03/VFIDE)
   - 180-day mandatory lock
   - 10% immediate unlock
   - Best value (10M cap)

2. **Oath Tier** ($0.05/VFIDE)
   - 90-day mandatory lock
   - 20% immediate unlock
   - Balanced option (10M cap)

3. **Public Tier** ($0.07/VFIDE)
   - Optional lock (bonus for locking)
   - 100% immediate unlock (no lock)
   - Flexibility (15M cap)

**Note:** Voting power is based on ProofScore (earned through behavior), not tier.

#### Features:
1. **Purchase Tokens**
   - Pay with USDC/USDT/DAI or ETH
   - Receive VFIDE instantly in vault
   - Referral system: +2% buyer bonus + +3% referrer bonus
   - Per-address cap: 500,000 VFIDE (anti-whale)

2. **Lock Bonuses (Public tier only)**
   - 180-day lock: +30% bonus tokens
   - 90-day lock: +15% bonus tokens
   - No lock: 0% bonus

3. **Presale Dashboard**
   - View all tiers + pricing
   - Your purchase history
   - Total sold vs cap
   - Referral tracking

---

### GROUP 5: GOVERNANCE & DAO
**Purpose**: Proposals, voting, treasury management  
**Contracts**: `DAO`, `DAOTimelockV2`, `CouncilElection`, `CouncilSalary`

#### Governance Structure:
1. **DAO Proposals**
   - Types: Generic, Financial, Protocol Change, Security
   - Voting period: 3 days (DAO-configurable)
   - Quorum: 5,000 vote-points minimum
   - Score-weighted voting (7000 ProofScore = 7000 votes)
   - Governance fatigue: -5% voting power per vote, recovers 5% per day

2. **Council**
   - 12 elected members
   - 1-year terms (365 days)
   - Max 1 consecutive term (mandatory 1-year break before re-election)
   - Min ProofScore: 7000 (70%)
   - Salary paid every 4 months (120 days)
   - Can be voted out by other council members

3. **Timelock**
   - All approved proposals wait 48 hours
   - Community can cancel malicious proposals
   - Admin execution after delay

4. **Voting Features**
   - Withdraw proposals before finalization
   - Dispute flagging (report manipulation)
   - Proposal types color-coded by risk level

---

### GROUP 6: TREASURY & FINANCE
**Purpose**: Revenue collection, expense tracking, sustainability  
**Contracts**: `VFIDEFinance`, `RevenueSplitter`, `SanctumVault`, `EcoTreasuryVault`

#### Treasury Structure:
1. **Revenue Streams**
   - Protocol fees (0.25% on payments)
   - Guardian node sales (stablecoin revenue)
   - Burn fund (deflationary mechanism)

2. **Expense Tracking**
   - Council salaries
   - Development grants
   - Charity/Sanctum fund
   - Marketing budget

3. **Sustainability Ratio**
   - Target: 8.8x (expenses covered 8.8x by revenue)
   - Monthly burn rate tracking
   - Treasury balance projections

4. **Fee Split** (40/10/50)
   - 40% Burn (deflationary)
   - 10% Sanctum (charity/impact)
   - 50% Ecosystem (council, staking, incentives)

5. **Stablecoin Registry**
   - Whitelist approved stablecoins (USDC, USDT, DAI)
   - Track decimals + symbols
   - DAO can add/remove

---

### GROUP 7: DECENTRALIZATION & HANDOVER
**Purpose**: Progressive decentralization roadmap  
**Contracts**: `SystemHandover`, `EmergencyControl`

#### Features:
1. **Handover Phases**
   - Phase 1: Core team control (0-6 months)
   - Phase 2: Council shared control (6-12 months)
   - Phase 3: Full DAO control (12+ months)

2. **Emergency Controls**
   - Circuit breaker (pause all transfers)
   - Security freeze (lock compromised vaults)
   - DAO override (reset ProofScores)

3. **Admin Transitions**
   - Transfer ownership to multisig
   - Transfer ownership to DAO
   - Renounce ownership (final)

---

## Page Structure Recommendation

### Homepage (`/`)
**Purpose**: Introduction, feature showcase, onboarding  
**Content**:
- Hero: "The New VFIDE of Commerce"
- Value props: 0% fees, Trust-based, Secure vaults
- Feature cards: Payments, Trust, Vaults, Guardians, Governance, Finance
- CTA: "Connect Wallet" + "Explore Trust Scores"

### Merchant Portal (`/merchant`)
**Purpose**: Business control center  
**Features**:
- Registration form (business name, category)
- Dashboard (volume, transactions, ProofScore)
- Payment link generator
- QR code generator
- Transaction history table
- Rebate tracking
- Stable-pay toggle
- Payout address config

### Payment Checkout (`/pay`)
**Purpose**: Buyer-facing payment page  
**URL**: `vfide.org/pay?merchant=0x123&amount=100&order=INV-001`  
**Features**:
- Merchant info card (name, ProofScore, category)
- Amount display (VFIDE or USD equivalent)
- Payment method selector (VFIDE / USDC / USDT)
- Wallet connect button
- Escrow option checkbox
- Pay button
- Receipt confirmation

### Trust Explorer (`/trust`)
**Purpose**: ProofScore lookup, leaderboard  
**Features**:
- Address search bar
- Leaderboard table (top 100 scores)
- Individual profile view:
  - ProofScore + tier badge
  - Capital bonus breakdown
  - Behavioral delta history
  - Endorsements received/given
  - Badges earned
  - Activity score + decay countdown
- Endorse button (if eligible)
- Transaction history (public)

### Vault Manager (`/vault`)
**Purpose**: Manage personal vault  
**Features**:
- Vault balance (VFIDE + stablecoins)
- Transfer form (vault-to-vault)
- Approve spending (for merchants/subscriptions)
- Guardian management (add/remove guardians)
- Next-of-kin setup
- Recovery request (if keys lost)
- Withdrawal history
- Lock status indicator
- Emergency freeze button

### Guardian Marketplace (`/guardians`)
**Purpose**: Buy/sell guardian nodes  
**Features**:
- Node tier comparison table
- Purchase form (select tier, amount, pay with USDC)
- Referral input (optional)
- Your owned nodes list
- Node stats (total purchased, staking rewards)
- Staking APY calculator
- Network stats (total nodes, total staked)

### Governance Portal (`/governance`)
**Purpose**: DAO proposals + voting  
**Features**:
- Active proposals list (filterable by type)
- Proposal detail view:
  - Title, description, target contract
  - Vote counts (for/against)
  - Quorum progress bar
  - Time remaining
  - Your vote (if cast)
- Vote buttons (Yes/No/Abstain)
- Create proposal form (if eligible)
- Your voting power display
- Governance fatigue meter
- Council info (elected members)

### Treasury Dashboard (`/treasury`)
**Purpose**: Financial transparency  
**Features**:
- Treasury balance (VFIDE + stables)
- Revenue chart (monthly)
- Expense chart (monthly)
- Sustainability ratio (8.8x target)
- Revenue splits (burn/sanctum/ecosystem/DAO)
- Recent transactions table
- Budget proposals (upcoming expenses)

### Subscriptions (`/subscriptions`)
**Purpose**: Manage recurring payments  
**Features**:
- Your subscriptions list (active/cancelled)
- Create subscription form (merchant, amount, interval)
- Subscription detail view (next payment date)
- Cancel button
- Payment history

### Profile (`/profile`)
**Purpose**: Personal account overview  
**Features**:
- ProofScore badge (large)
- Wallet address + vault address
- Total holdings (VFIDE + stables)
- Guardian nodes owned
- Governance voting power
- Transaction history (all types)
- Endorsements (given/received)
- Badges earned
- Activity streak

---

## Frontend Features to Build

### Payment Links
```
vfide.org/pay?merchant=0xABC&amount=100&token=VFIDE&order=INV-001
```
- Auto-fills checkout page
- Merchant can share via email/SMS/social
- Works on mobile/desktop

### QR Code Generator
```javascript
// Merchant dashboard generates QR
const qrData = {
  merchant: "0xABC...",
  amount: 100,
  token: "VFIDE",
  order: "INV-001"
};
const qrCode = generateQR(qrData);
```
- Display at physical stores
- Customer scans with mobile wallet
- Opens payment page

### Website Hosting (Future)
```
merchant-shop.vfide.org
```
- Merchants upload HTML/CSS/JS
- VFIDE checkout widget embedded
- Custom domain mapping
- Decentralized storage (IPFS?)

---

## API Endpoints Needed

### Read Contract Data
```typescript
// Trust
GET /api/trust/{address} → ProofScore, tier, badges
GET /api/trust/leaderboard → Top 100 scores
GET /api/trust/{address}/endorsements → List of endorsers

// Merchant
GET /api/merchant/{address} → Business info, stats
GET /api/merchant/{address}/transactions → Payment history

// Vault
GET /api/vault/{address} → Balance, guardians, status

// Governance
GET /api/governance/proposals → All proposals
GET /api/governance/proposal/{id} → Proposal details
GET /api/governance/{address}/votes → Voting history

// Treasury
GET /api/treasury/balance → VFIDE + stables
GET /api/treasury/revenue → Monthly chart data
GET /api/treasury/expenses → Monthly chart data
```

### Write Contract Functions (via wagmi)
```typescript
// Merchant
merchantPortal.registerMerchant(name, category)
merchantPortal.pay(merchant, token, amount, orderId)

// Trust
seer.endorse(address)

// Vault
vault.transferVFIDE(toVault, amount)
vault.setGuardian(guardian, true)

// Governance
dao.propose(type, target, value, data, description)
dao.vote(proposalId, support)

// Guardians
guardianSale.purchaseLicense(stable, nodeType, amount, referrer)
```

---

## Next Steps

1. **Confirm this structure** with you
2. **Design Homepage** (first page to build)
3. **Design Merchant Portal** (core user flow)
4. **Design Payment Checkout** (revenue generation)
5. **Build one page at a time** until complete

**Ready to start with the Homepage?**
