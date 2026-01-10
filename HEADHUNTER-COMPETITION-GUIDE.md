# 🎯 Headhunter Competition System

## Overview

The Headhunter Competition is VFIDE's referral rewards program that incentivizes users to recruit both merchants and users to the platform. It's a gamified quarterly competition where the top 20 recruiters share rewards from the ecosystem fee pool.

---

## ✅ What's Implemented

### Smart Contracts (✅ 100% Complete)

**Location:** `/contracts/EcosystemVault.sol`

**Core Features:**
- ✅ Points system (1 point per user, 3 points per merchant)
- ✅ Quarterly ranking and reward distribution
- ✅ Top 20 leaderboard with share percentages
- ✅ Anti-gaming measures (activity thresholds)
- ✅ ProofScore gating (60% minimum required)
- ✅ Referral registration and crediting
- ✅ Reward claiming mechanism

**Key Functions:**
```solidity
// Register referrals (pending until threshold met)
registerMerchantReferral(merchant, referrer)
registerUserReferral(referrer, user)

// Credit points after thresholds met
creditMerchantReferral(merchant)  // After 3 transactions
creditUserReferral(user)          // After $25 in vault

// Quarter management
endHeadhunterQuarter()            // Lock rankings, snapshot pool
claimHeadhunterReward(year, quarter)  // Claim reward

// View functions
getHeadhunterStats(referrer)      // Get current stats
previewHeadhunterReward(year, quarter, referrer)  // Calculate reward
```

**Storage:**
- `yearPoints[year][referrer]` - Points per year
- `yearReferrers[year]` - List of all referrers
- `quarterPoolSnapshot[year][quarter]` - Reward pool size
- `quarterClaimed[year][quarter][referrer]` - Claim status

**Constants:**
- `POINTS_USER_REFERRAL = 1`
- `POINTS_MERCHANT_REFERRAL = 3`
- `HEADHUNTER_RANKS = 20` (top 20 qualify)
- `HEADHUNTER_MIN_SCORE = 6000` (60% ProofScore)
- `MIN_MERCHANT_TX = 3` (merchant must complete 3 transactions)
- `MIN_USER_VAULT_USD = 25` (user must deposit $25 in vault)

**Reward Distribution (Basis Points):**
| Rank | Share | Rank | Share |
|------|-------|------|-------|
| #1   | 15.0% | #11  | 3.0%  |
| #2   | 12.0% | #12  | 2.8%  |
| #3   | 10.0% | #13  | 2.6%  |
| #4   | 8.0%  | #14  | 2.4%  |
| #5   | 7.0%  | #15  | 2.2%  |
| #6   | 6.0%  | #16  | 2.0%  |
| #7   | 5.0%  | #17  | 1.8%  |
| #8   | 4.5%  | #18  | 1.6%  |
| #9   | 4.0%  | #19  | 1.4%  |
| #10  | 3.5%  | #20  | 1.2%  |

---

### Frontend UI (✅ 95% Complete - Needs Testing)

**Location:** `/frontend/app/headhunter/page.tsx`

**Features Implemented:**

#### 1. Dashboard Tab
- **Quick Stats Cards:**
  - Total points (year-to-date)
  - Current rank
  - Claimable rewards
  - Recent activity count
  
- **Referral Link Generator:**
  - Dynamic link with user's address: `https://vfide.com/signup?ref={address}`
  - Copy to clipboard button
  - QR code URL generation
  
- **Social Sharing:**
  - Twitter share button with pre-filled tweet
  - Telegram share link
  - Email template

- **Reward Calculator:**
  - Shows current rank
  - Displays reward share percentage
  - Estimates quarterly reward amount
  - Shows pool size
  
- **Claim Interface:**
  - Button appears when quarter ends
  - Shows claimable amount
  - Executes `claimHeadhunterReward()` transaction
  - Success/error feedback

- **"How It Works" Section:**
  - 4-step explanation
  - Points breakdown
  - Threshold requirements
  - Pro tips

#### 2. Leaderboard Tab
- Top 20 ranked headhunters
- Medal badges for #1, #2, #3
- Shows:
  - Rank
  - Wallet address (truncated)
  - Total points
  - User referrals count
  - Merchant referrals count
  - Estimated reward
- Highlights current user with "YOU" badge
- Color-coded ranks (gold, silver, bronze)

#### 3. Activity Tab
- Recent referral feed
- Each entry shows:
  - Type: 👤 User or 🏪 Merchant
  - Wallet address (truncated)
  - Status: "✓ Credited" or "⏳ Pending"
  - Points earned (+1 or +3)
  - Timestamp
- Empty state with illustration

**Design System:**
- Dark theme: `#0A0A0B` background, `#1A1A1F` cards
- Colors:
  - Gold: `#FFD700` (primary accent)
  - Green: `#50C878` (success/rewards)
  - Purple: `#9333EA` (merchants)
  - Blue: `#3B82F6` (users)
  - Orange: `#FFA500` (pending)
- Responsive: Mobile-first grid layouts
- Animations: Smooth transitions and hover effects

---

### React Hooks (✅ 100% Complete)

**Location:** `/frontend/hooks/useHeadhunterHooks.ts`

**Hooks Available:**

#### `useHeadhunterStats()`
Returns current user's headhunter statistics:
```typescript
{
  currentYearPoints: number,
  estimatedRank: number,
  currentYearNumber: bigint,
  currentQuarterNumber: bigint,
  quarterEndsAt: bigint,
  isLoading: boolean,
  error: Error | null
}
```

#### `useHeadhunterReward(year, quarter)`
Preview reward for a specific quarter:
```typescript
{
  referrerPoints: number,
  claimed: boolean,
  quarterEnded: boolean,
  poolSnapshot: bigint,
  estimatedReward: bigint,
  rewardShare: string,  // e.g., "5.0%"
  isLoading: boolean,
  error: Error | null
}
```

#### `useClaimHeadhunterReward()`
Execute reward claim transaction:
```typescript
{
  claimReward: (year: bigint, quarter: bigint) => Promise<Hash>,
  isPending: boolean,
  isSuccess: boolean,
  txHash: Hash | null,
  error: Error | null
}
```

#### `usePendingReferral(referred)`
Check if an address has pending referral credits:
```typescript
{
  merchantReferrer: Address,
  userReferrer: Address,
  credited: boolean,
  isLoading: boolean,
  error: Error | null
}
```

#### `useReferralLink()`
Generate referral link for current user:
```typescript
{
  referralLink: string,      // "https://vfide.com/signup?ref=0x..."
  qrCodeUrl: string          // QR code image URL
}
```

#### `useQuarterlyPoolEstimate()`
Get estimated quarterly pool size:
```typescript
{
  poolEstimate: bigint,
  formattedPool: string      // "$12,500"
}
```

#### `useReferralActivity()`
Get referral history for current user:
```typescript
{
  activity: ReferralActivity[],
  isLoading: boolean
}

interface ReferralActivity {
  id: string,
  type: 'user' | 'merchant',
  address: Address,
  status: 'pending' | 'credited',
  timestamp: number,
  points: number,
  txHash: Hash
}
```

#### `useLeaderboard(year, quarter)`
Fetch top 20 leaderboard:
```typescript
{
  leaderboard: LeaderboardEntry[],
  isLoading: boolean
}

interface LeaderboardEntry {
  rank: number,
  address: Address,
  points: number,
  userReferrals: number,
  merchantReferrals: number,
  estimatedReward: string,
  isCurrentUser: boolean
}
```

---

### Navigation Integration (✅ Complete)

- ✅ Added to desktop navigation (`/frontend/components/layout/GlobalNav.tsx`)
- ✅ Added to mobile "More" menu (`/frontend/components/layout/MobileBottomNav.tsx`)
- Route: `/headhunter`
- Label: "Headhunter" 🎯
- Accent color styling (gold)

---

## 🔧 Configuration Required

### Environment Variables

Add to `.env.local`:

```bash
# EcosystemVault contract address (deployed on Base Sepolia)
NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS=0x...

# Base URL for referral links
NEXT_PUBLIC_BASE_URL=https://vfide.com
```

### Contract ABI

The hooks use a partial ABI (only headhunter functions). If you need the full ABI:

1. Compile contracts: `forge build`
2. Extract ABI from: `out/EcosystemVault.sol/EcosystemVault.json`
3. Update hooks file if needed

---

## 🚀 Testing Checklist

### Smart Contract Testing
- [x] Points awarded correctly (1 for user, 3 for merchant)
- [x] Thresholds enforced (3 tx, $25 vault)
- [x] ProofScore gating (60% minimum)
- [x] Quarter ending locks rankings
- [x] Reward calculation matches rank shares
- [x] Claim works and prevents double-claiming
- [x] Anti-gaming: Same referrer can't be credited twice

### Frontend Testing (TODO)
- [ ] Connect wallet and view stats
- [ ] Copy referral link works
- [ ] Social share buttons open correct URLs
- [ ] Leaderboard displays top 20
- [ ] Activity feed shows pending/credited
- [ ] Rank updates in real-time
- [ ] Reward calculator shows correct amount
- [ ] Claim button appears when quarter ends
- [ ] Claim transaction executes successfully
- [ ] Loading states display correctly
- [ ] Error handling works
- [ ] Mobile responsive layout
- [ ] Empty states render properly

### Integration Testing (TODO)
- [ ] Test referral link signup flow
- [ ] Verify points awarded after merchant 3rd transaction
- [ ] Verify points awarded after user $25 deposit
- [ ] Test quarter ending (admin function)
- [ ] Test full claim flow (wait for quarter end)
- [ ] Test with multiple users competing

---

## 📊 Data Sources

### Current Implementation
- **Stats & Rewards:** Real-time from `EcosystemVault.sol`
- **Leaderboard:** Mock data (needs subgraph or event indexing)
- **Activity Feed:** Mock data (needs event listener)

### Recommended Enhancements

#### Option 1: The Graph Subgraph (Best for Production)
Create subgraph to index events:
- `ReferralRecorded(referrer, referred, points, timestamp)`
- `HeadhunterQuarterEnded(year, quarter, poolAmount)`
- `HeadhunterRewardClaimed(referrer, year, quarter, amount)`

**Benefits:**
- Fast queries
- Historical data
- Automatic indexing
- GraphQL API

**Setup:**
```bash
# Install graph CLI
npm install -g @graphprotocol/graph-cli

# Create subgraph
graph init --from-contract 0x... vfide-headhunter

# Deploy
graph deploy vfide-headhunter
```

#### Option 2: Event Logs (Quick Solution)
Query contract events directly via ethers.js:

```typescript
const filter = contract.filters.ReferralRecorded(referrer);
const events = await contract.queryFilter(filter);
```

**Benefits:**
- No external dependencies
- Quick to implement

**Drawbacks:**
- Slower than subgraph
- Limited to recent blocks
- Must handle pagination

#### Option 3: Backend Database (Full Control)
Listen to events via WebSocket and store in PostgreSQL:

```typescript
contract.on('ReferralRecorded', async (referrer, referred, points) => {
  await db.referrals.create({
    referrer, referred, points, timestamp: Date.now()
  });
});
```

**Benefits:**
- Full control over data
- Can add analytics
- Fast queries

**Drawbacks:**
- Must maintain sync
- More complex infrastructure

---

## 🎮 User Flow

### 1. User Becomes a Headhunter
1. Connect wallet
2. Navigate to `/headhunter`
3. View dashboard (0 points initially)
4. Copy referral link
5. Share on social media

### 2. User Recruits Others
**Merchant Recruitment:**
1. Share link with merchant
2. Merchant signs up with `?ref=0x...`
3. Registration triggers: `registerMerchantReferral(merchant, referrer)`
4. Status: "⏳ Pending" (needs 3 transactions)
5. After 3rd transaction: `creditMerchantReferral(merchant)`
6. Status: "✓ Credited" (+3 points)

**User Recruitment:**
1. Share link with user
2. User signs up with `?ref=0x...`
3. Registration triggers: `registerUserReferral(referrer, user)`
4. Status: "⏳ Pending" (needs $25 in vault)
5. After $25 deposit: `creditUserReferral(user)`
6. Status: "✓ Credited" (+1 point)

### 3. Quarter Progression
1. User accumulates points throughout quarter
2. Leaderboard updates in real-time
3. User tracks rank: "You're #7 - on track for $850!"
4. Countdown shows days until quarter end

### 4. Quarter End
1. Admin calls `endHeadhunterQuarter()`
2. Rankings locked
3. Pool amount snapshot taken
4. Claim button appears for top 20

### 5. Claiming Rewards
1. User clicks "Claim $850.25 VFIDE"
2. Transaction executes: `claimHeadhunterReward(year, quarter)`
3. VFIDE tokens sent to wallet
4. Status updates: "✓ Claimed"
5. Earnings added to lifetime total

---

## 💡 Game Mechanics

### Points System
- **User Referral:** 1 point
  - Must deposit $25+ in vault
  - Prevents fake signups
  
- **Merchant Referral:** 3 points
  - Must complete 3 transactions
  - Higher value, harder to achieve

### Anti-Gaming Measures
- **Activity Thresholds:**
  - Merchants: 3 transactions minimum
  - Users: $25 vault deposit minimum
  - Prevents Sybil attacks
  
- **One-Time Credits:**
  - Each referred address can only be credited once
  - Prevents repeat referrals
  
- **ProofScore Gating:**
  - Must maintain 60%+ ProofScore
  - Ensures quality participation
  - Bad actors disqualified

### Ranking Strategy
- **High-Volume:** Focus on user referrals (1 point each)
- **High-Value:** Focus on merchant referrals (3 points each)
- **Balanced:** Mix of both
- **Early Bird:** Start early in year to accumulate points

---

## 📈 Analytics to Track

### Key Metrics
- **Participation:**
  - Total headhunters per quarter
  - % of users who become headhunters
  - Average points per headhunter
  
- **Referral Quality:**
  - % of pending → credited
  - Time to credit (transaction threshold)
  - Retention rate of referred users/merchants
  
- **Rewards:**
  - Total pool size per quarter
  - Average reward per rank
  - Claim rate (% who claim vs abandon)
  
- **Competition:**
  - Points needed for top 20
  - Points distribution curve
  - Rank volatility (how often rankings change)

### Dashboard Ideas
- Real-time leaderboard changes
- "Next milestone" tracker (e.g., "5 more points for rank #10")
- Historical quarter comparisons
- Referral conversion funnel

---

## 🔮 Future Enhancements

### Phase 2 Features
- [ ] **Team Competitions:** Groups compete for team rewards
- [ ] **Bonus Multipliers:** Special events with 2x points
- [ ] **Achievement Badges:** "First to 10 merchants", "100+ users recruited"
- [ ] **Streak Bonuses:** Bonus points for consecutive quarters in top 20
- [ ] **Referral Tiers:** Bronze/Silver/Gold tiers with perks
- [ ] **Live Notifications:** Push alerts when referred user credits
- [ ] **Marketing Materials:** Pre-made graphics, pitch decks, videos
- [ ] **Ambassador Program:** Top performers get exclusive swag
- [ ] **Regional Leaderboards:** Country/city specific competitions

### Technical Improvements
- [ ] **Subgraph Integration:** Real-time event indexing
- [ ] **Analytics Dashboard:** Comprehensive stats and charts
- [ ] **Mobile App:** Native iOS/Android experience
- [ ] **Automated Payouts:** Gas-sponsored auto-claims
- [ ] **NFT Rewards:** On-chain proof of achievement
- [ ] **API for Partners:** Let partners run their own competitions
- [ ] **A/B Testing:** Optimize messaging and UI

---

## 🐛 Known Issues / TODOs

### Critical
- [ ] Replace mock leaderboard data with real subgraph queries
- [ ] Replace mock activity data with event listeners
- [ ] Set `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS` in production
- [ ] Test claim flow on testnet
- [ ] Add error boundaries for failed contract calls

### Nice-to-Have
- [ ] Add loading skeletons for better UX
- [ ] Add animations for rank changes
- [ ] Add confetti effect when entering top 20
- [ ] Add onboarding tour for first-time headhunters
- [ ] Add email notifications for quarter ending
- [ ] Add CSV export for referral history
- [ ] Add share buttons for rank achievements ("I'm #7!")

---

## 🛠️ Deployment Steps

### 1. Smart Contracts (Already Deployed)
```bash
# Contracts already deployed on Base Sepolia
# Address: [INSERT_ADDRESS_HERE]
```

### 2. Environment Configuration
```bash
# .env.local
NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS=0x...
NEXT_PUBLIC_BASE_URL=https://vfide.com
```

### 3. Frontend Build
```bash
cd frontend
npm install
npm run build
```

### 4. Deploy Frontend
```bash
# Via Vercel
vercel deploy --prod

# Or via custom server
npm run start
```

### 5. Verify
- [ ] Visit `/headhunter`
- [ ] Connect wallet
- [ ] Verify stats load
- [ ] Test referral link copy
- [ ] Check mobile responsive

---

## 📞 Support

**Technical Issues:**
- GitHub Issues: [VFIDE Repository]
- Discord: [Community Channel]

**Smart Contract Questions:**
- Read: `/contracts/EcosystemVault.sol`
- Docs: `/docs/CONTRACTS.md`

**Frontend Questions:**
- Component: `/frontend/app/headhunter/page.tsx`
- Hooks: `/frontend/hooks/useHeadhunterHooks.ts`

---

## 📄 License

Same as main VFIDE project (see `/LICENSE`)

---

## 🎯 Quick Reference

### Smart Contract Functions
```solidity
// Register
registerMerchantReferral(merchant, referrer)
registerUserReferral(referrer, user)

// Credit
creditMerchantReferral(merchant)
creditUserReferral(user)

// Admin
endHeadhunterQuarter()

// Claim
claimHeadhunterReward(year, quarter)

// View
getHeadhunterStats(referrer)
previewHeadhunterReward(year, quarter, referrer)
getPendingReferral(referred)
```

### React Hooks
```typescript
// Stats
const stats = useHeadhunterStats();
const reward = useHeadhunterReward(year, quarter);
const { referralLink } = useReferralLink();

// Data
const { leaderboard } = useLeaderboard(year, quarter);
const { activity } = useReferralActivity();
const { poolEstimate } = useQuarterlyPoolEstimate();

// Actions
const { claimReward, isPending } = useClaimHeadhunterReward();
await claimReward(year, quarter);
```

### Points Breakdown
- User referral: **1 point** (after $25 vault)
- Merchant referral: **3 points** (after 3 transactions)
- ProofScore minimum: **60%**
- Top qualifiers: **20**
- Payout frequency: **Quarterly**

---

**Built with 🎯 by VFIDE Team**
**Last Updated:** January 2026
