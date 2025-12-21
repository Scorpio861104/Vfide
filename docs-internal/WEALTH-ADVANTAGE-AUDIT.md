# Wealth Advantage Audit Report
## December 8, 2025

**Mission**: Identify all ways wealth provides advantages in the VFIDE system

---

## ✅ SYSTEMS ALREADY FAIR (No Wealth Advantage)

### 1. **Voting Power** ⭐ PERFECTLY EQUAL
**Location**: `contracts/DAO.sol` Line 129

```solidity
uint256 weight = uint256(seer.getScore(voter));
```

**Finding**: Voting weight = ProofScore ONLY (not multiplied by token balance)

**Examples**:
- User A: 1 VFIDE + 700 ProofScore = **700 voting power**
- User B: 1,000,000 VFIDE + 700 ProofScore = **700 voting power**

**Verdict**: ✅ **Perfect equality** - wealth gives NO advantage in governance

---

### 2. **ProofScore Calculation** ⭐ WEALTH REMOVED
**Location**: `contracts/VFIDETrust.sol` Lines 216-227

**Capital Contribution**: **0 points** (removed Dec 7, 2025)

**Score Components**:
| Factor | Max Points | How Earned |
|--------|------------|------------|
| Activity | 200 | Using the system (transactions, governance) |
| Endorsements | 50 | Peer validation (max 5 × 10 points) |
| Badges | Variable | Contributions & achievements |
| Good Behavior | Unlimited | No disputes, consistent honesty |
| Wallet Age | 30 | Account ≥90 days old |
| Vault Existence | 20 | Creating a vault (free) |
| **Capital** | **0** | **Wealth contributes nothing** |

**Verdict**: ✅ **Trust cannot be bought**

---

### 3. **Vault Creation** ⭐ NO MINIMUM BALANCE
**Location**: `contracts/VaultInfrastructure.sol` Line 411

```solidity
function ensureVault(address owner_) public returns (address vault) {
    // No balance check - anyone can create a vault
}
```

**Finding**: Anyone can call `ensureVault()` to create a vault for any address. No fees, no minimum balance.

**Verdict**: ✅ **Free access for all**

---

### 4. **Presale Design** ⭐ ANTI-WHALE MECHANICS
**Location**: `contracts/VFIDEPresale.sol` Lines 85-88

```solidity
uint256 public constant MAX_PER_WALLET = 500_000 * 1e18;    // 500K cap
uint256 public constant MIN_PURCHASE = 0.01 ether;          // ~$35 minimum
```

**Finding**:
- **Anti-whale cap**: Max 500K VFIDE per wallet (prevents concentration)
- **Low entry**: Min purchase ~$35 (accessible to ordinary people)
- **No tiered bonuses**: Same % bonus for all lock periods (rich don't get better deals)

**Verdict**: ✅ **Designed for accessibility**

---

### 5. **Merchant Registration** ⭐ SCORE-BASED ONLY
**Location**: `contracts/MerchantPortal.sol` Line 192

```solidity
uint16 score = seer.getScore(msg.sender);
uint16 minScore = seer.minForMerchant(); // 560
if (score < minScore) revert MERCH_LowTrust();
```

**Finding**: Merchant status requires ProofScore ≥560 (NOT token balance)

**Calculation to reach 560**:
- Base: 500
- Vault: +20
- **Need +40 from actions** (activity/endorsements/badges)

**Verdict**: ✅ **Actions required, wealth insufficient**

---

## ⚠️ HIDDEN WEALTH ADVANTAGES (Issues Found)

### Issue #1: **Guardian Node Sale "Power Multipliers"**
**Location**: `contracts/GuardianNodeSale.sol` Lines 91-93

```solidity
// Node Power Multipliers (Voting Power / Yield Boost)
// p[0] = Sentinel (1x), p[1] = Guardian (2x), p[2] = Validator (5x)
uint16[3] public nodePowerMultipliers = [100, 200, 500];
```

**Purchase Costs**:
- Sentinel: $30,000 USD → 1x power
- Guardian: $50,000 USD → 2x power  
- Validator: $70,000 USD → **5x power**

**Status**: 🟡 **MISLEADING BUT NOT USED**

**Investigation**: 
- Line 389: Power calculated: `uint256 power = (vfideAmount * nodePowerMultipliers[nodeType]) / 100;`
- Power is only emitted in `LicenseAcquired` event
- DAO.sol does NOT reference node types or power multipliers
- **Voting uses ProofScore only** (confirmed above)

**Impact**: 
- ❌ Variable name "Voting Power / Yield Boost" is MISLEADING
- ✅ Not actually used for voting (DAO ignores it)
- ⚠️ May be intended for future staking yield (not implemented)

**Recommendation**: 
1. **Remove or rename** `nodePowerMultipliers` to `yieldMultipliers`
2. **Add comment**: "These multipliers do NOT affect DAO voting power (voting = ProofScore only)"
3. **OR** if they're meant for staking: Implement explicit staking contract that uses them

---

### Issue #2: **Endorsement Requires Token Holding**
**Location**: `contracts/VFIDETrust.sol` Lines 351-364

```solidity
// H-1 Fix: Require minimum token holding duration
if (address(vaultHub) != address(0)) {
    address vault = vaultHub.vaultOf(msg.sender);
    if (vault != address(0)) {
        uint256 creationTime = vaultCreationTime[msg.sender];
        if (creationTime == 0) {
            vaultCreationTime[msg.sender] = block.timestamp;
            revert("Endorsement: must hold tokens for 7 days");
        }
        require(block.timestamp >= creationTime + MIN_HOLDING_DURATION, 
                "Endorsement: holding period not met");
    }
}
```

**Finding**: To endorse someone (give them +10 ProofScore), you must:
1. Hold tokens in a vault
2. Wait 7 days after creating vault

**Impact**: 🔴 **WEALTH REQUIREMENT**

**Problem**: 
- Endorsements are worth +50 max ProofScore (5 endorsements × 10 points)
- To reach governance threshold (540) without capital, you need activity/endorsements
- But to GIVE endorsements, you need tokens
- **Circular dependency**: Poor users can't bootstrap into the system

**Example**:
- Alice: No tokens, creates vault → ProofScore = 520 (can't vote, needs 540)
- Alice needs +20 more from activity or endorsements
- Bob wants to endorse Alice, but Bob must hold tokens for 7 days first
- **Alice is locked out until someone with money endorses her**

**Recommendation**: 
```solidity
// PROPOSED FIX: Remove token holding requirement OR make it optional
// Option 1: No holding requirement (rely on other anti-Sybil measures)
if (_fixedScore[msg.sender] == 0) {
    uint16 currentScore = getScore(msg.sender);
    require(currentScore >= highTrustThreshold, "Endorser must have high trust");
}

// Option 2: Alternative anti-Sybil - require score from OTHER sources
// (activity, badges, wallet age) but NOT capital
uint16 nonCapitalScore = calculateNonCapitalScore(msg.sender);
require(nonCapitalScore >= 600, "Endorser must earn trust through actions");
```

---

### Issue #3: **Activity Score Mechanism Unclear**
**Location**: `contracts/VFIDETrust.sol` Line 285

```solidity
function logActivity(address subject, uint16 points) external onlyAuth {
    // Only callable by authorized contracts (Commerce, etc.)
}
```

**Finding**: Activity is logged by `onlyAuth` contracts

**Search Results**: No contracts currently call `logActivity()`

**Impact**: 🟡 **SYSTEM INCOMPLETE**

**Problem**:
- Activity is worth up to +200 ProofScore (largest component)
- But no contracts are configured to log it
- Users cannot earn activity points through normal usage

**Recommendation**:
1. **Commerce integration**: Award +1 activity per successful payment
2. **DAO integration**: Award +5 activity per vote cast
3. **Merchant integration**: Award +10 activity per month of active sales
4. **Guardian integration**: Award +20 activity for helping recover a vault

**Example implementation**:
```solidity
// In VFIDECommerce.sol - after successful payment
if (address(seer) != address(0)) {
    seer.logActivity(payer, 1);  // +1 per transaction
    seer.logActivity(merchant, 2); // +2 per sale (merchants get bonus)
}

// In DAO.sol - after vote
if (address(seer) != address(0)) {
    seer.logActivity(voter, 5);  // +5 per vote
}
```

---

### Issue #4: **Governance Entry Barrier**
**Location**: `contracts/DAO.sol` Line 94

```solidity
function _eligible(address a) internal view returns (bool) {
    address vault = vaultHub.vaultOf(a);
    if (vault == address(0)) return false;
    return seer.getScore(a) >= seer.minForGovernance(); // 540
}
```

**Finding**: To participate in governance, you need:
1. A vault (free)
2. ProofScore ≥540

**Calculation**:
- Base score: 500
- Vault bonus: +20
- **Total: 520**
- **Need +20 more**

**How to earn +20 with NO tokens**:
- ❌ Capital: 0 points (removed)
- ❌ Endorsements: Requires token holding (Issue #2)
- ❌ Activity: No contracts log it (Issue #3)
- ✅ Wallet age: +30 points (if wallet is 90 days old)
- ✅ Badges: Variable (if you can earn them without tokens)

**Impact**: 🟡 **BOOTSTRAPPING PROBLEM**

**Scenarios**:

**Scenario A - New user with NO tokens**:
- Day 1: Create vault → Score = 520 (can't vote)
- Day 90: Wallet age bonus → Score = 550 ✅ (can vote!)
- **Solution**: Wait 90 days

**Scenario B - New user who WANTS to participate NOW**:
- Create vault → Score = 520
- Need +20 more immediately
- Options:
  - ❌ Buy tokens: Defeats "1 VFIDE = 1M VFIDE" philosophy
  - ❌ Get endorsed: Endorser needs tokens (circular)
  - ❌ Earn activity: System not implemented
  - ✅ Earn badges: If badge system allows token-free earning

**Verdict**: 🔴 **System is wealth-gated until**:
1. Activity logging is implemented (Issue #3), OR
2. Endorsement token requirement is removed (Issue #2), OR  
3. Badge system allows token-free earning, OR
4. User waits 90 days for wallet age bonus

---

## 🎯 CRITICAL RECOMMENDATION

**The Philosophy**:
> "A user with 1 VFIDE has just as much say and power as someone with 500,000 VFIDE if both act with integrity."

**The Reality**:
1. ✅ **Voting power is equal** (ProofScore only)
2. ✅ **ProofScore calculation is fair** (no capital bonus)
3. ❌ **But bootstrapping into the system requires wealth OR 90-day wait**

**Root Cause**: The system needs token-free ways to earn initial ProofScore points

---

## 📋 RECOMMENDED FIXES

### Fix #1: Remove Node "Voting Power" Language
**File**: `contracts/GuardianNodeSale.sol` Line 91

```solidity
// BEFORE:
// Node Power Multipliers (Voting Power / Yield Boost)

// AFTER:
// Node Yield Multipliers (staking rewards only - NOT for DAO voting)
// DAO voting power = ProofScore only (equal for all users regardless of node type)
```

### Fix #2: Make Endorsements Token-Free
**File**: `contracts/VFIDETrust.sol` Lines 351-364

```solidity
// REMOVE holding duration check
// REPLACE with score-based check

function endorse(address subject) external {
    if (subject == msg.sender) revert("Cannot endorse self");
    if (hasEndorsed[msg.sender][subject]) revert("Already endorsed");
    
    // Anti-Sybil: Endorser must have HIGH trust from non-capital sources
    uint16 endorserScore = getScore(msg.sender);
    uint16 minEndorserScore = 700; // High-trust threshold
    
    // Future: Could check endorserScore comes from activity/badges/age, not fixed override
    require(endorserScore >= minEndorserScore, "Endorser: insufficient trust");
    
    // Cap the number of endorsers to prevent DoS
    if (endorsersOf[subject].length >= MAX_ENDORSERS) revert("Subject max endorsers");
    
    hasEndorsed[msg.sender][subject] = true;
    endorsersOf[subject].push(msg.sender);
    endorsementsGiven[msg.sender]++;
    endorsementsReceived[subject]++;
    
    emit Endorsed(msg.sender, subject);
    _logEv(subject, "seer_endorsed", ENDORSEMENT_VALUE, "");
}
```

### Fix #3: Implement Activity Logging
**File**: Multiple contracts

**VFIDECommerce.sol** - After line 150 (successful payment):
```solidity
// Award activity points for using the system
if (address(seer) != address(0)) {
    try seer.logActivity(buyer, 1) {} catch {} // +1 per purchase
    try seer.logActivity(merchant, 2) {} catch {} // +2 per sale
}
```

**DAO.sol** - After line 157 (vote cast):
```solidity
// Award activity for governance participation
if (address(seer) != address(0)) {
    try seer.logActivity(voter, 5) {} catch {} // +5 per vote
}
```

**MerchantPortal.sol** - After line 210 (merchant registration):
```solidity
// Award activity for merchant registration
if (address(seer) != address(0)) {
    try seer.logActivity(msg.sender, 10) {} catch {} // +10 for becoming merchant
}
```

### Fix #4: Lower Governance Threshold OR Add Token-Free Badge
**Option A - Lower threshold** (File: `contracts/VFIDETrust.sol` Line 118):
```solidity
// BEFORE:
uint16 public minForGovernance = 540;

// AFTER:
uint16 public minForGovernance = 520; // Vault creation is enough
```

**Option B - Add "Pioneer Badge"** (File: `contracts/VFIDETrust.sol`):
```solidity
// Award +50 "Pioneer Badge" to early adopters who:
// - Create vault within first 6 months
// - Complete KYC or social verification (GitHub, Twitter, etc.)
// - Pass humanity proof (e.g., Worldcoin, BrightID)

// This gives them 520 + 50 = 570 score without tokens
```

---

## 🎓 PHILOSOPHY ALIGNMENT CHECK

| Principle | Implementation | Status |
|-----------|----------------|--------|
| "1 VFIDE = 500K VFIDE in voting power" | Voting weight = ProofScore only | ✅ ALIGNED |
| "Money was never the wealth of VFIDE" | ProofScore: 0 points from capital | ✅ ALIGNED |
| "Honesty and integrity are all that matter" | Score from activity/endorsements/behavior | ✅ ALIGNED |
| "Built for the forgotten and struggling" | **Bootstrapping requires tokens OR 90-day wait** | ❌ **MISALIGNED** |
| "Not a system for the rich" | Endorsement requires 7-day token holding | ❌ **MISALIGNED** |

---

## 🏁 FINAL VERDICT

**Voting System**: ⭐⭐⭐⭐⭐ Perfect equality
**ProofScore Calculation**: ⭐⭐⭐⭐⭐ Wealth removed
**Vault Creation**: ⭐⭐⭐⭐⭐ Free for all
**Onboarding Experience**: ⭐⭐ Wealth-gated or slow

**Overall**: 4/5 stars - Philosophy is correct, but new users face barriers to entry

**Priority**: **HIGH** - Fix Issues #2 and #3 to enable token-free bootstrapping
