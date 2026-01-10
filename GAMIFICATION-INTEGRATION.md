# Gamification System Integration Guide

## 🔗 Complete VFIDE Fee System Overview

### 💰 Full Burn Fee Distribution (ProofScore-Based)

Every VFIDE transaction triggers a **dynamic burn fee** (0.25% - 5% based on ProofScore):

```
VFIDE Transaction
       ↓
Dynamic Fee (ProofScoreBurnRouter)
       ↓
┌──────────────────────────────────────┐
│  FEE SPLIT (3-way)                   │
├──────────────────────────────────────┤
│  40% → BURN (Deflationary)          │
│  10% → SANCTUM (Charity Fund)       │
│  50% → ECOSYSTEM VAULT (Operations) │
└──────────────────────────────────────┘
                ↓
┌──────────────────────────────────────┐
│  ECOSYSTEM VAULT ALLOCATION          │
├──────────────────────────────────────┤
│  33.3% → Council Salaries            │
│          (120-day distribution)      │
│                                      │
│  33.3% → Merchant Bonuses            │
│          (Tiered by ProofScore)      │
│                                      │
│  33.3% → Headhunter Competition      │
│          (Quarterly + Monthly)       │
│            ↓                         │
│            ├─ Referral Rankings      │
│            └─ Monthly Leaderboard    │
│               (Top 1000 users)       │
└──────────────────────────────────────┘
```

### 🎯 Where Monthly Competition Fits

The **Monthly Competition Prize Pool** is funded from the **Headhunter Competition allocation** within the EcosystemVault. This represents approximately **16.65%** of total burn fees (33.3% of the 50% EcosystemVault share).

**Total Fee Flow:**
- Transaction Fee: 0.25% - 5% (dynamic, ProofScore-based)
- Hard Burn: 40% of fee (deflationary)
- Sanctum: 10% of fee (charity)
- Ecosystem: 50% of fee, which further splits:
  - Council: 33.3% of ecosystem = **16.65% of total fee**
  - Merchants: 33.3% of ecosystem = **16.65% of total fee**
  - Headhunter/Gamification: 33.3% of ecosystem = **16.65% of total fee**

---

## 🔥 Burn Fee Integration

## 🔥 Gamification Tracking Integration

### Transaction Tracking (VFIDE Only)

The gamification system tracks VFIDE transactions for quest progress and leaderboard rankings, but **does NOT handle burn fee distribution** (that's managed by smart contracts):

```sql
-- Called on every VFIDE transaction (simplified - no burn fee param)
SELECT track_vfide_transaction(
    user_id,              -- User making the transaction
    transaction_type,     -- 'p2p', 'merchant', 'vault_deposit', etc.
    amount                -- Transaction amount in wei
);
```

**What this does:**
1. ✅ Updates user's transaction count for leaderboard
2. ✅ Triggers transaction quest progress
3. ✅ Updates transaction streak
4. ✅ Recalculates activity score
5. ❌ Does NOT handle fee distribution (handled by ProofScoreBurnRouter + EcosystemVault contracts)

---

## 💼 EcosystemVault Integration

### Prize Pool Funding (Contract-Level)

The EcosystemVault smart contract should periodically fund the monthly competition prize pool:

```solidity
// In EcosystemVault.sol - add function to fund monthly competitions
function fundMonthlyCompetition() external {
    // Calculate portion of headhunter allocation for monthly competition
    // E.g., 50% of headhunter funds go to monthly, 50% to quarterly rankings
    uint256 monthlyAllocation = (headhunterPool * 5000) / 10000; // 50%
    
    // Transfer to competition prize pool wallet
    vfide.transfer(competitionPrizePoolAddress, monthlyAllocation);
    
    // Off-chain: Call backend API to record in database
    // POST /api/admin/fund-prize-pool { amount: monthlyAllocation }
}
```

### Backend API for Prize Pool

```typescript
// POST /api/admin/fund-prize-pool
export async function POST(request: Request) {
  const { amount, signature } = await request.json();
  
  // Verify signature from EcosystemVault contract
  const isValid = await verifyContractSignature(amount, signature);
  if (!isValid) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  
  // Add to prize pool
  await pool.query('SELECT add_to_prize_pool($1)', [amount]);
  
  return Response.json({ success: true });
}
```

---

## 📊 Activity Tracking Functions

### 1. Transaction Tracking (VFIDE only)

```sql
-- Call from transaction completion handler
SELECT track_vfide_transaction(
    p_user_id := '123e4567-e89b-12d3-a456-426614174000',
    p_transaction_type := 'p2p',
    p_amount := 1000000000000000000,  -- 1 VFIDE in wei
    p_burn_fee := 10000000000000000    -- 0.01 VFIDE burn fee
);
```

**Triggers:**
- ✅ `make_transaction` quest (+1)
- ✅ `high_volume` quest (+1)
- ✅ `merchant_payment` quest (if type = 'merchant')
- ✅ `vault_deposit` quest (if type = 'vault_deposit')
- ✅ Monthly leaderboard transactions_count
- ✅ Transaction streak

### 2. Social Interaction Tracking

```sql
-- Call when user sends message, posts, or gives endorsement
SELECT track_social_interaction(
    p_user_id := '123e4567-e89b-12d3-a456-426614174000',
    p_interaction_type := 'message'  -- or 'post', 'endorsement'
);
```

**Triggers:**
- ✅ `social_interaction` quest (+1)
- ✅ `endorsement_give` quest (if type = 'endorsement')
- ✅ Monthly leaderboard social_interactions
- ✅ Social streak

### 3. Governance Vote Tracking

```sql
-- Call when user votes on DAO proposal
SELECT track_governance_vote(
    p_user_id := '123e4567-e89b-12d3-a456-426614174000'
);
```

**Triggers:**
- ✅ `governance_vote` quest (+1)
- ✅ `weekly_governance` challenge (+1)
- ✅ Monthly leaderboard governance_votes
- ✅ Voting streak

### 4. XP Synchronization

```sql
-- Call after quest/achievement reward claimed
SELECT sync_monthly_xp(
    p_user_id := '123e4567-e89b-12d3-a456-426614174000'
);
```

**Updates:**
- ✅ Monthly total_xp_earned
- ✅ Activity score recalculation

---

## 🎯 Required Integration Points

### Backend Transaction Handler

**Location**: Your transaction processing logic  
**Action**: Add function call after VFIDE transaction completes

```typescript
// After transaction confirmed on blockchain
if (token === 'VFIDE') {
  await pool.query(
    'SELECT track_vfide_transaction($1, $2, $3)',
    [userId, transactionType, amount]
  );
}
```

**Note:** Burn fees are automatically handled by ProofScoreBurnRouter contract and split between Burn/Sanctum/EcosystemVault. The gamification tracking is separate and only tracks user activity.

### Social Features

**Locations**: 
- Message sending
- Post creation
- Endorsement system

```typescript
// After social action completed
await pool.query(
  'SELECT track_social_interaction($1, $2)',
  [userId, interactionType]
);
```

### Governance System

**Location**: DAO voting handler

```typescript
// After vote cast
await pool.query(
  'SELECT track_governance_vote($1)',
  [userId]
);
```

### Quest/Achievement Claiming

**Location**: Existing claim API routes

```typescript
// After XP reward added to user
await pool.query(
  'SELECT sync_monthly_xp($1)',
  [userId]
);
```

---

## 🏆 Complete Fee Distribution Summary

### Per Transaction Fee Breakdown (Example: $1000 VFIDE at 1% fee)

```
Transaction: $1000 VFIDE
Dynamic Fee: $10 (1% for ProofScore ~700)

┌─────────────────────────────────────────┐
│ IMMEDIATE DISTRIBUTION (On-chain)       │
├─────────────────────────────────────────┤
│ $4.00  → BURN (40%)                     │
│          Deflationary, supply decrease  │
│                                         │
│ $1.00  → SANCTUM (10%)                  │
│          Charity fund                   │
│                                         │
│ $5.00  → ECOSYSTEM VAULT (50%)          │
│          ↓                              │
│          ├─ $1.665 → Council Salaries   │
│          │           (120-day cycles)   │
│          │                              │
│          ├─ $1.665 → Merchant Bonuses   │
│          │           (ProofScore tiers) │
│          │                              │
│          └─ $1.665 → Headhunter Fund    │
│                      ├─ Referral ranks  │
│                      └─ Monthly prizes  │
└─────────────────────────────────────────┘
```

### Council Salaries
- **Allocation**: 16.65% of total fees
- **Recipients**: 1-12 active council members
- **Distribution**: Every 120 days
- **Amount**: Pool split evenly among active members
- **Contract**: `CouncilSalary.sol`

### Merchant Bonuses
- **Allocation**: 16.65% of total fees
- **Recipients**: Merchants with ProofScore 800+
- **Distribution**: Per transaction, tiered
- **Tiers**: 
  - 95%+ score: 5x multiplier
  - 90-94%: 4x multiplier
  - 85-89%: 3x multiplier
  - 80-84%: 2x multiplier
- **Contract**: `EcosystemVault.sol` merchant functions

### Headhunter Competition
- **Allocation**: 16.65% of total fees
- **Recipients**: Top referrers (quarterly) + Top activity users (monthly)
- **Distribution**: 
  - Quarterly: 20 rank levels based on referral points
  - Monthly: Top 1000 users by activity score
- **Contract**: `EcosystemVault.sol` headhunter functions
- **Database**: `monthly_leaderboard` table

---

## 📊 Sustainability Features

### Supply Floor Protection
- If VFIDE supply reaches minimum threshold
- Burns are redirected to EcosystemVault
- Ensures system can always fund operations

### Daily Burn Cap
- Maximum burn amount per day
- Excess redirected to ecosystem
- Prevents rapid deflationary shocks

### Minimum Ecosystem Guarantee
- Ecosystem always gets minimum allocation
- Taken from burn portion if needed
- Ensures operations always funded

### Adaptive Fees
- Higher ProofScore = Lower fees
- Users pay 0.25% - 5% based on trust
- Encourages good behavior

All these protections are handled by `ProofScoreBurnRouter.sol` contract.

---

**End of Month:**
1. Admin/Cron calls `finalize_monthly_rankings('2026-01')` 
2. System ranks all users by activity_score
3. Admin/Cron calls `distribute_monthly_prizes('2026-01')`
4. System calculates prizes per tier
5. Users can claim their prizes via API

### Admin Functions

```sql
-- At end of month
SELECT finalize_monthly_rankings('2026-01');
SELECT distribute_monthly_prizes('2026-01');
```

---

## ⚙️ ProofScore Integration

ProofScore affects burn fees dynamically:

**Higher ProofScore = Lower Burn Fee**

Example fee structure:
```
ProofScore 300-499: 2.0% burn fee
ProofScore 500-699: 1.5% burn fee
ProofScore 700-850: 1.0% burn fee
ProofScore 851+:    0.5% burn fee
```

The gamification system automatically:
- ✅ Tracks whatever burn fee was charged
- ✅ Adds it to prize pool
- ✅ Users with higher ProofScore pay less, but still earn same activity points
- ✅ Creates incentive to improve ProofScore AND use VFIDE frequently

---

## 🔒 VFIDE-Only Rule Enforcement

**Critical**: Only VFIDE transactions trigger these functions.

```typescript
// ✅ CORRECT - Only track VFIDE
if (token === 'VFIDE') {
  await trackTransaction(userId, amount, burnFee);
}

// ❌ WRONG - Don't track other tokens
if (token === 'BTC' || token === 'ETH') {
  // These transactions work normally
  // but DO NOT trigger gamification
}
```

**Other tokens:**
- ✅ Process normally
- ✅ Complete successfully
- ❌ No ProofScore increase
- ❌ No XP earned
- ❌ No quest progress
- ❌ No leaderboard points
- ❌ No gamification benefits

---

## 📋 Deployment Checklist

### 1. Database Setup
```bash
# Run gamification schema
psql $DATABASE_URL -f database/gamification-schema.sql
```

### 2. Verify Functions Exist
```sql
SELECT proname FROM pg_proc WHERE proname IN (
  'track_vfide_transaction',
  'track_social_interaction',
  'track_governance_vote',
  'sync_monthly_xp',
  'add_to_prize_pool',
  'calculate_activity_score',
  'finalize_monthly_rankings',
  'distribute_monthly_prizes'
);
-- Should return 8 rows
```

### 3. Add Function Calls
- [ ] Transaction handler → `track_vfide_transaction()` (VFIDE only, no burn fee param)
- [ ] Message/Post → `track_social_interaction()`
- [ ] Endorsement → `track_social_interaction('endorsement')`
- [ ] Vote → `track_governance_vote()`
- [ ] Quest claim → `sync_monthly_xp()`
- [ ] Achievement claim → `sync_monthly_xp()`
- [ ] EcosystemVault → Add monthly competition funding function

### 4. EcosystemVault Integration
```solidity
// Add to EcosystemVault.sol
function fundMonthlyCompetition() external onlyOwnerOrDAO {
    uint256 monthlyAmount = (headhunterPool * monthlyAllocationBps) / 10000;
    vfide.transfer(competitionWallet, monthlyAmount);
    emit MonthlyCompetitionFunded(block.timestamp, monthlyAmount);
}
```

### 5. Set Up Monthly Automation
```typescript
// Cron job at 00:00 on 1st of month
async function monthlyDistribution() {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const monthYear = lastMonth.toISOString().slice(0, 7);
  
  await pool.query('SELECT finalize_monthly_rankings($1)', [monthYear]);
  await pool.query('SELECT distribute_monthly_prizes($1)', [monthYear]);
}
```

### 6. Test Integration
```typescript
// Test VFIDE transaction tracking (no burn fee param)
const testUserId = '...';
await pool.query(
  'SELECT track_vfide_transaction($1, $2, $3)',
  [testUserId, 'p2p', '1000000000000000000']
);

// Verify leaderboard updated
const result = await pool.query(
  'SELECT * FROM monthly_leaderboard WHERE user_id = $1',
  [testUserId]
);
console.log('Transactions count:', result.rows[0].transactions_count);
console.log('Activity score:', result.rows[0].activity_score);
```

**Note:** Burn fee distribution is handled automatically by smart contracts (ProofScoreBurnRouter → EcosystemVault). The gamification system only tracks user activity for competitions.

---

## 🎮 User Flow Example

**Day 1:**
1. User makes 3 VFIDE transactions → Quests progress
2. Burn fees accumulate in prize pool
3. User's leaderboard rank updates automatically

**Day 7:**
1. User maintains 7-day streak → Milestone unlocked
2. Claims quest rewards → XP added
3. Leaderboard activity score increases

**End of Month:**
1. System finalizes rankings
2. Prize pool distributed among top 1000
3. User ranked #150 → Claims 0.15% of pool

**Next Month:**
1. New prize pool starts
2. All activity scores reset
3. Competition starts fresh

---

## 💡 Key Benefits

1. **Sustainable**: Funded by burn fees, not inflation
2. **Automatic**: All tracking happens in database triggers
3. **Fair**: Activity score based on multiple factors
4. **Transparent**: Users see exact prize amounts
5. **VFIDE-Centric**: Strong incentive to use native token
6. **ProofScore-Linked**: Higher score = lower fees, same rewards

---

## 🚨 Important Notes

- Only call tracking functions for **VFIDE transactions**
- Burn fee split should include allocation for prize pool
- Prize pool automatically accumulates throughout month
- Distribution requires manual trigger at month end
- Users with ProofScore 700+ complete `perfect_score` quest automatically
- All timestamps are UTC
- Activity scores update in real-time
- Rankings finalized once per month

---

## 📞 Support Functions

Check prize pool status:
```sql
SELECT * FROM monthly_prize_pool 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
```

Check user's monthly stats:
```sql
SELECT * FROM monthly_leaderboard 
WHERE user_id = '...' 
AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
```

Check top 10 leaderboard:
```sql
SELECT u.username, ml.* 
FROM monthly_leaderboard ml
JOIN users u ON ml.user_id = u.id
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY activity_score DESC
LIMIT 10;
```
