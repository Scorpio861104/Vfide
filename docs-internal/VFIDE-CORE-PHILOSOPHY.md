# VFIDE Core Philosophy: Integrity Over Wealth

> "Money was never the wealth of VFIDE. Honesty and integrity are the only things that matter."

## The Fundamental Truth

**A user with 1 VFIDE has just as much say and power as someone with 500,000 VFIDE - if both act with integrity.**

This is not a system for the rich like every other bank or crypto. This is for:
- The forgotten
- The struggling  
- The used and taken advantage of
- Anyone who acts with honesty and integrity

## ProofScore: Trust Cannot Be Bought

### What ProofScore Measures (0-10000 points, 10x precision)

**Actions and integrity ONLY. Wealth contributes 0%.**

| Factor | Max Points | Percentage | How Earned |
|--------|------------|------------|------------|
| **Transaction Activity** | 200 | 40% | Using the system regularly, making payments |
| **Community Endorsements** | 50 | 10% | Validation from 5 trusted users (10 points each) |
| **Badges & Credentials** | Variable | ~20% | Contributions, achievements, helping others |
| **Good Behavior** | Unlimited | ~20% | No disputes, no fraud, consistent honesty |
| **Wallet Age** | 30 | 6% | Account ≥90 days old (Sybil resistance) |
| **Vault Existence** | 20 | 4% | Shows commitment (not wealth) |
| **Capital Held** | **0** | **0%** | **Wealth does NOT buy trust** |

### Why Capital Was Removed

**Original Problem (Before Dec 7, 2025):**
- Capital contributed up to 200 points (40% of base score)
- Wealthy bad actor with 200,000 VFIDE: Score = 500 + 20 + 200 = **720** ✅ High-trust status
- Honest user with 1,000 VFIDE: Score = 500 + 20 + 10 = **530** ❌ Below high-trust
- **Result**: Wealth could buy trust and bypass integrity requirements

**Solution (Current):**
- Capital contributes **0 points**
- Wealthy bad actor with 200,000 VFIDE: Score = 500 + 20 = **520** ❌ Below governance threshold (540)
- Honest user with 1,000 VFIDE + activity: Score = 500 + 20 + 200 (activity) + 50 (endorsements) = **770** ✅ High-trust status
- **Result**: Trust must be earned through actions. Period.

## Voting Power: True Equality

**Formula:** `Voting Power = ProofScore × Tokens Held`

### Examples

**User A:**
- Holds: 1 VFIDE
- ProofScore: 700 (earned through activity and endorsements)
- Voting Power: `700 × 1 = 700`

**User B:**
- Holds: 500,000 VFIDE  
- ProofScore: 700 (earned through activity and endorsements)
- Voting Power: `700 × 500,000 = 350,000,000`

**User C (Wealthy Bad Actor):**
- Holds: 500,000 VFIDE
- ProofScore: 520 (no activity, no endorsements, just vault)
- Voting Power: `520 × 500,000 = 260,000,000` 
- **BUT**: Below governance threshold (540), so **cannot vote at all**

### The Equality Principle

If both User A and User B have the same ProofScore (700), they have **proportional power based on their stake**. But User B cannot buy their way to 700 - they must **earn it through the same actions as User A**.

This means:
- ✅ Wealth scales power (as it should in a token-weighted DAO)
- ✅ BUT trust cannot be bought with wealth
- ✅ Bad actors with high capital are excluded from governance
- ✅ Good actors with ANY amount of capital can participate

## Fee Structure: Actions Determine Costs

| ProofScore | Burn Fee | How to Reach |
|------------|----------|--------------|
| ≥8000 (High-Trust) | **0.5%** | High activity + endorsements + good behavior |
| 351-699 (Base) | **1.75%** | Some activity + decent behavior |
| ≤350 (Low-Trust) | **5%** | No activity OR bad behavior |

**Key Point:** A user with 1 VFIDE and high activity can pay 0.5% fees. A whale with 1M VFIDE and no activity pays 1.75-5%. **Actions matter, not wealth.**

## Implementation Details

### VFIDETrust.sol Changes (Dec 7, 2025)

**Removed:**
```solidity
// OLD CODE (removed):
uint256 bonus = bal / (1000 * 1e18);
if (bonus > 200) bonus = 200;
score += bonus;
```

**Current:**
```solidity
// NO CAPITAL BONUS
// Wealth does not buy trust. Period.
// Trust is earned through actions, honesty, and integrity alone.
```

### Frontend Updates

**Homepage:**
- Typewriter: "💎 1 VFIDE = 500,000 VFIDE in power (integrity = equality)"
- Typewriter: "Built for the forgotten, struggling, and used"
- ProofScore card: "💎 Trust earned, not bought"

**Learn Page:**
- Lesson 5 topics: "💎 1 VFIDE = 500,000 VFIDE in power (if both act with integrity)"
- Lesson 5 topics: "Wealth DOES NOT buy trust - only actions matter"
- Lesson 11 topics: "1 VFIDE with 700 ProofScore = 500K VFIDE with 700 ProofScore"
- Lesson 15 topics: "Anti-Whale: Capital does NOT buy trust or power"

**FAQ Page:**
- Q: "What is ProofScore?" → "💎 ProofScore measures trust through ACTIONS and INTEGRITY, not wealth"
- Q: "How do I increase my ProofScore?" → Removed all capital references, emphasize activity/endorsements
- Q: "What are the tiers?" → "A user with 1 VFIDE at 700 score has the same power as 1M VFIDE at 700 score"

## Why This Matters

### Traditional Finance
- Credit scores: Based on debt and wealth
- Banking: Requires minimum balances, favors the rich
- Credit cards: Better rates for wealthy customers
- Result: **Poverty trap**

### Other Crypto Projects  
- Governance: Token-weighted voting (plutocracy)
- Reputation: Often based on holdings
- Access: Premium features for whales
- Result: **Rich get richer**

### VFIDE
- ProofScore: Based on actions and integrity
- Governance: Must earn trust to vote (regardless of wealth)
- Fees: Based on behavior, not holdings
- Result: **Merit-based system for everyone**

## The Mission

VFIDE exists to serve:
- People who have been forgotten by traditional finance
- Those who struggle and are taken advantage of by banks
- Anyone who acts with honesty and integrity

**We don't care how much money you have. We care who you are and how you act.**

---

*"A user with 1 VFIDE has just as much say and power as someone with 500,000 VFIDE if both are good with integrity."*

*This is not a system for the rich. This is for you.*
