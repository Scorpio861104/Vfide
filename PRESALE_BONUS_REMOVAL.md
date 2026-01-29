# Presale Bonus Removal - Implementation Guide

## Requirement
"Remove all presale bonuses since there is no way to modify those. All other rewards bonuses can be modified."

## Why Remove Presale Bonuses?

Presale bonuses are **immutable** - they're hardcoded constants that cannot be modified after deployment:
- `BONUS_180_DAYS = 30%` - Cannot change
- `BONUS_90_DAYS = 15%` - Cannot change
- `REFERRER_BONUS = 3%` - Cannot change
- `REFEREE_BONUS = 2%` - Cannot change

These create profit expectations and cannot be adjusted, making them a Howey Test concern.

## Other Rewards (NOT Removed)

**PromotionalTreasury.sol** - KEEP because:
- Has admin functions to modify rewards
- Can enable/disable programs dynamically
- Can adjust reward amounts
- Rewards are for ACTIONS (work-based), not passive holding

## Changes to VFIDEPresale.sol

### 1. Header Documentation Updates
```solidity
// OLD:
// - Base Supply: 35M VFIDE
// - Bonus Pool: 15M VFIDE
// - Total: 50M VFIDE
// - HOWEY SAFE MODE: When enabled, bonuses disabled

// NEW:
// - Total Supply: 35M VFIDE (NO BONUS POOL)
// - Tiered pricing: $0.03/$0.05/$0.07
// - Pure token sale at different prices
// - NO BONUSES - Howey compliant by design
```

### 2. Constants to Remove
- `BONUS_POOL = 15_000_000 * 1e18`
- `BONUS_180_DAYS = 30`
- `BONUS_90_DAYS = 15`
- `BONUS_NO_LOCK = 0`
- `REFERRER_BONUS = 3`
- `REFEREE_BONUS = 2`

### 3. Supply Constants Updated
- `TOTAL_SUPPLY = 35_000_000 * 1e18` (was 50M)
- Keep: `BASE_SUPPLY = 35_000_000 * 1e18`

### 4. State Variables to Remove
- `bool public howeySafeMode` (no longer needed)
- `uint256 public totalBonusGiven`
- `uint256 public totalReferralBonusGiven`
- `uint256 public totalReferrerBonusOnly`
- `mapping(address => uint256) public referralBonusEarned`
- `mapping(address => uint256) public referralBonusClaimed`
- `mapping(address => uint256) public referralCount`
- `mapping(address => address) public referrerOf`

### 5. Events to Remove/Update
- Remove: `event HoweySafeModeUpdated(bool enabled)`
- Remove: `event ReferralPurchase(...)`
- Update: `event Purchase(...)` - remove bonusTokens parameter
- Update: `event StablePurchase(...)` - remove bonusTokens parameter

### 6. PurchaseRecord Struct Simplified
```solidity
// OLD:
struct PurchaseRecord {
    uint256 baseAmount;
    uint256 bonusAmount;      // REMOVE
    uint256 immediateAmount;
    uint256 lockedAmount;
    uint256 lockPeriod;
    uint256 unlockTime;
    uint8 tier;
    bool immediateClaimed;
    bool lockedClaimed;
}

// NEW:
struct PurchaseRecord {
    uint256 tokenAmount;      // Total tokens (no bonus tracking)
    uint256 immediateAmount;
    uint256 lockedAmount;
    uint256 lockPeriod;
    uint256 unlockTime;
    uint8 tier;
    bool immediateClaimed;
    bool lockedClaimed;
}
```

### 7. Functions to Remove
- `function setHoweySafeMode(bool enabled)` - No longer needed
- `function claimReferralBonus()` - No referral bonuses
- All referral-related internal logic

### 8. Functions to Simplify

**buyWithStablecoin()** - Remove referrer parameter:
```solidity
// OLD:
function buyWithStablecoin(
    address stablecoin,
    uint256 amount,
    uint256 lockPeriod,
    address referrer  // REMOVE
)

// NEW:
function buyWithStablecoin(
    address stablecoin,
    uint256 amount,
    uint256 lockPeriod
)
```

**buy()** - Remove referrer parameter:
```solidity
// OLD:
function buy(uint256 lockPeriod, address referrer) external payable

// NEW:
function buy(uint256 lockPeriod) external payable
```

**_processPurchase()** - Simplify:
```solidity
// OLD:
function _processPurchase(
    address buyer,
    uint256 baseTokens,
    uint8 tier,
    uint256 lockPeriod,
    uint256 extraBonus,  // REMOVE
    uint256 usdAmount
)

// NEW:
function _processPurchase(
    address buyer,
    uint256 tokens,
    uint8 tier,
    uint256 lockPeriod,
    uint256 usdAmount
)
```

### 9. Logic Simplifications

**Lock Period Handling:**
- 180 days: 10% immediate, 90% locked
- 90 days: 20% immediate, 80% locked
- No lock: 100% immediate
- NO BONUSES for any lock period

**Tier Pricing (KEEP):**
- Tier 0: $0.03 per VFIDE
- Tier 1: $0.05 per VFIDE
- Tier 2: $0.07 per VFIDE
- This is price discrimination, NOT a bonus

### 10. View Functions to Update
- Remove bonus-related return values
- Simplify calculations
- Update documentation

## Benefits

1. **Howey Compliance:**
   - No profit expectations from bonuses
   - Pure token sale at different prices
   - Cannot be misconfigured

2. **Simpler Code:**
   - ~200 lines removed
   - No bonus tracking
   - Clearer logic

3. **Lower Gas:**
   - Fewer calculations
   - Simpler storage
   - More efficient

4. **Legal Clarity:**
   - No immutable bonuses
   - Just selling tokens at tiered prices
   - Standard commercial practice

## What Users See

**Before:**
- Buy 1000 VFIDE + get 300 bonus (30% for 180-day lock)
- Referral bonuses
- Bonus pool tracking

**After:**
- Buy 1000 VFIDE at tier price ($0.03, $0.05, or $0.07)
- Optional vesting schedule
- No bonuses

## Migration Notes

For existing deployments:
- New contract needed (bonus removal is breaking change)
- Existing presale participants keep their bonuses
- New presale uses simplified model
- Clear communication to users

## Testing Checklist

- [ ] Purchase at tier 0 ($0.03)
- [ ] Purchase at tier 1 ($0.05)
- [ ] Purchase at tier 2 ($0.07)
- [ ] Purchase with 180-day lock (10% immediate)
- [ ] Purchase with 90-day lock (20% immediate)
- [ ] Purchase with no lock (100% immediate)
- [ ] Claim immediate tokens
- [ ] Claim after lock expires
- [ ] Finalization works correctly
- [ ] Refunds work correctly
- [ ] No bonus code paths exist
