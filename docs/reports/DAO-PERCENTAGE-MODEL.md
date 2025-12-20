# DAO Percentage-Based Compensation Model

## Core Concept

Like Pi Network miners earning 0.25 pi/day, DAO members get **percentage of monthly treasury revenue** (not fixed amounts). This scales automatically with VFIDE price.

---

## Revenue Flow

```
ProofScore Burns (100%)
├─ 25% Permanently Burned
├─ 50% Ecosystem Treasury
│  ├─ 10-20% DAO Member Pool (configurable)
│  │  └─ Split equally among active members
│  └─ 80-90% Ecosystem Operations
│     ├─ Feeless merchants (score ≥750)
│     ├─ Gas subsidies
│     └─ Infrastructure
└─ 25% Sanctum Charities
```

**Default Setting:** 10% of treasury's 50% = **5% of total burns** to DAO pool

---

## Example Calculations

### Scenario 1: VFIDE at $10 (Early Stage)

**Monthly Burns:** 10M VFIDE  
**Average Fee:** 5% (ProofScore-based)

```
Total Fees: 10M × 5% = 500k VFIDE
├─ Burned (25%): 125k VFIDE
├─ Treasury (50%): 250k VFIDE
│  ├─ DAO Pool (10%): 25k VFIDE
│  │  └─ 5 members: 5k VFIDE each/month
│  └─ Operations (90%): 225k VFIDE
└─ Sanctum (25%): 125k VFIDE

Per Member: 5k VFIDE × $10 = $50k/month
Annual: $50k × 12 = $600k/year
```

**Issue:** Too high at $10 VFIDE (wealth accumulation, not service)

---

### Scenario 2: VFIDE at $100 (Growth Stage)

**Monthly Burns:** 10M VFIDE  
**Average Fee:** 5%

```
Total Fees: 10M × 5% = 500k VFIDE
├─ Treasury (50%): 250k VFIDE
│  └─ DAO Pool (10%): 25k VFIDE
│     └─ 5 members: 5k VFIDE each/month

Per Member: 5k VFIDE × $100 = $500k/month
Annual: $500k × 12 = $6M/year
```

**Issue:** Way too high (creates "kings", conflicts with mission)

---

## Solution: Adjust Pool Percentage Dynamically

### Phase 1: Low VFIDE Price ($1-10)
```
DAO Pool: 20% of treasury's 50% = 10% of total burns
Result: Higher VFIDE amounts, fair compensation in USD
```

### Phase 2: Medium VFIDE Price ($10-50)
```
DAO Pool: 10% of treasury's 50% = 5% of total burns
Result: Moderate VFIDE amounts, balanced compensation
```

### Phase 3: High VFIDE Price ($50+)
```
DAO Pool: 5% of treasury's 50% = 2.5% of total burns
Result: Small VFIDE amounts, still fair in USD
```

---

## Target Compensation: $1k-2k/month

### At $1 VFIDE (10% pool share):
```
Monthly: 25k VFIDE × $1 = $25k total
5 members = 5k VFIDE each = $5k/month ✅
```

### At $10 VFIDE (5% pool share):
```
Monthly: 12.5k VFIDE × $10 = $125k total
5 members = 2.5k VFIDE each = $25k/month ⚠️ (reduce to 2%)
```

### At $10 VFIDE (2% pool share):
```
Monthly: 5k VFIDE × $10 = $50k total
5 members = 1k VFIDE each = $10k/month ✅
```

### At $100 VFIDE (2% pool share):
```
Monthly: 5k VFIDE × $100 = $500k total
5 members = 1k VFIDE each = $100k/month ⚠️ (reduce to 0.2%)
```

### At $100 VFIDE (0.2% pool share):
```
Monthly: 500 VFIDE × $100 = $50k total
5 members = 100 VFIDE each = $10k/month ✅
```

---

## Dynamic Adjustment Formula

**Target:** $1k-2k per member per month

```solidity
// DAO adjusts daoPoolShareBps based on VFIDE price
if (vfidePrice < $10) {
    daoPoolShareBps = 1000; // 10% of treasury
} else if (vfidePrice < $50) {
    daoPoolShareBps = 500;  // 5% of treasury
} else if (vfidePrice < $100) {
    daoPoolShareBps = 200;  // 2% of treasury
} else {
    daoPoolShareBps = 20;   // 0.2% of treasury
}
```

**Result:** Compensation stays ~$1k-2k/month regardless of VFIDE price

---

## Pi Network Comparison

**Pi Network:** 0.25 pi/day = 7.5 pi/month  
- At $10/pi: 7.5 × $10 = $75/month (very low)
- At $100/pi: 7.5 × $100 = $750/month (fair)
- People mine for years earning tiny amounts
- Price increase = automatic compensation increase

**VFIDE DAO:** Similar model, percentage-based
- At $1 VFIDE: 5000 VFIDE/month = $5k (fair)
- At $10 VFIDE: 500 VFIDE/month = $5k (adjusted down)
- At $100 VFIDE: 50 VFIDE/month = $5k (adjusted down further)
- DAO adjusts pool percentage as price rises

---

## Sustainability Analysis

### Revenue Sufficiency (At Scale)

**Assumptions:**
- 1000 active users
- Average 100 tx/month per user
- Average tx size: 1000 VFIDE
- Average fee: 5% (ProofScore-based)

```
Monthly Transactions: 1000 users × 100 tx = 100k tx
Total Volume: 100k tx × 1000 VFIDE = 100M VFIDE
Total Fees: 100M × 5% = 5M VFIDE
├─ Burned (25%): 1.25M VFIDE
├─ Treasury (50%): 2.5M VFIDE
│  ├─ DAO Pool (10%): 250k VFIDE
│  │  └─ 5 members: 50k VFIDE each
│  └─ Operations (90%): 2.25M VFIDE
└─ Sanctum (25%): 1.25M VFIDE

At $10 VFIDE:
├─ DAO member: 50k × $10 = $500k/month (TOO HIGH)
└─ Need to reduce pool to 0.5% = $25k/month ✅

At $1 VFIDE:
├─ DAO member: 50k × $1 = $50k/month (still high)
└─ Need to reduce pool to 5% = $2.5k/month ✅
```

**Key Insight:** Even at low prices with high volume, small percentages work.

---

## Configuration Parameters

```solidity
// In DAOIncentives contract
uint16 public daoPoolShareBps = 1000; // Default 10% of treasury

// DAO can adjust via governance
function setPoolShareBps(uint16 newBps) external onlyDAO {
    require(newBps <= 2000, "Max 20%"); // Hard cap at 20%
    daoPoolShareBps = newBps;
}
```

**Governance Decision:**
- Early stage (low price): 10-20% pool share
- Growth stage (medium price): 5-10% pool share
- Mature stage (high price): 1-5% pool share

---

## Member Benefits Summary

### 1. Percentage-Based Revenue Share
- Scales automatically with VFIDE price
- Equal share among active members
- Distributed monthly (30-day intervals)
- Configurable by DAO (10-20% of treasury)

### 2. Zero Transaction Fees
- `systemExempt` status while serving
- Saves $500-1000/year depending on activity
- Removed immediately if slashed

### 3. ProofScore Boost
- +5 ProofScore per month of service
- Reputation, not money
- Lowers future transaction fees

### 4. Service Deposit
- 10k VFIDE bond (returned if honorable)
- 100% forfeited if corrupt
- Accountability mechanism, not investment

---

## Why This Works

### 1. Scales with Growth
- Low price = more VFIDE per member
- High price = less VFIDE per member
- USD compensation stays consistent

### 2. No Fixed Costs
- No fixed VFIDE amounts (would be unsustainable)
- Percentage adapts to ecosystem size
- Can't run out of funds

### 3. Fair for Everyone
- Equal share per active member
- No whale advantage (everyone gets same %)
- Service-based, not stake-based

### 4. DAO Controlled
- Community adjusts percentage as needed
- Can reduce if compensation too high
- Can increase if compensation too low

### 5. Aligns with Mission
- "Free crypto people are all about" (your words)
- Like Pi Network: small amounts, sustainable
- Integrity over wealth accumulation

---

## Comparison: Fixed vs Percentage

### Fixed VFIDE Model (Rejected)
```
100 VFIDE/month stipend
├─ At $1: $100/month (too low)
├─ At $10: $1k/month (perfect)
├─ At $100: $10k/month (too high)
└─ At $1000: $100k/month (way too high)

Problem: Breaks at extremes, requires constant adjustment
```

### Percentage Model (Adopted)
```
5% of treasury revenue pool
├─ At $1 VFIDE: 5000 VFIDE = $5k (reduce to 1%)
├─ At $10 VFIDE: 500 VFIDE = $5k (perfect at 5%)
├─ At $100 VFIDE: 50 VFIDE = $5k (perfect at 5%)
└─ At $1000 VFIDE: 5 VFIDE = $5k (perfect at 5%)

Solution: DAO adjusts percentage to maintain ~$1-2k/month target
```

---

## Conclusion

**This model:**
- ✅ Scales automatically with VFIDE price
- ✅ Fair compensation ($1-2k/month target)
- ✅ Sustainable long-term (percentage-based)
- ✅ Like Pi Network (0.25 pi/day model)
- ✅ DAO-controlled (adjust as needed)
- ✅ Anti-king (small amounts, not wealth)

**Perfect for:** "Free crypto people are all about"
