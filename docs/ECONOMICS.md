# VFIDE Economics & Tokenomics

## Token Supply

### Total Supply
- **Maximum:** 200,000,000 VFIDE
- **Decimal Places:** 18
- **Supply Type:** Fixed cap, deflationary (burn mechanism)

### Distribution Breakdown

| Allocation | Amount | Percentage | Vesting | Notes |
|------------|---------|-----------|---------|-------|
| **Dev Reserve** | **50M** | **25%** | 36-month linear | Pre-minted, locked in DevReserveVestingVault |
| **Presale** | **50M** | **25%** | Tiered sale | 35M base + 15M bonus allocation |
| **Treasury/Operations** | **100M** | **50%** | Gradual | Liquidity, CEX listings, operations, DAO treasury |

**Total:** 200M VFIDE

### Key Allocations (Confirmed in Contracts)

**Dev Reserve: 50,000,000 VFIDE** (`DEV_RESERVE_SUPPLY` in VFIDEToken.sol)
- Pre-minted at deployment
- Locked in `DevReserveVestingVault` contract
- 36-month linear vesting (18 bi-monthly unlocks)
- 60-day cliff before first unlock
- Cannot be accessed early
- Ensures long-term team alignment

**Presale: 50,000,000 VFIDE** (`PRESALE_CAP` in VFIDEToken.sol)
- Managed through `VFIDEPresale` contract
- Hard cap enforced on-chain: `TOTAL_SUPPLY = 50_000_000 * 1e18`
- Tiered pricing structure
- Split: 35M base allocation + 15M bonus pool

**Treasury/Operations: 100,000,000 VFIDE**
- Liquidity for DEX/CEX pairs
- Operational expenses
- DAO governance treasury
- Community grants and incentives

### Supply Dynamics
- **Deflationary:** 2-4.5% of transfers burned
- **Burn Rate:** Depends on transaction volume and ProofScore distribution
- **Projected Annual Burn:** 5-15% of circulating supply (once at scale)
- **Floor:** No minimum supply (can theoretically approach 0)

---

## Presale Proceeds Allocation

All funds raised during the presale are allocated as follows:

| Allocation | Percentage | Use | Accountability |
|------------|------------|-----|----------------|
| **Liquidity Pool** | **50%** | DEX liquidity pairing | Locked on-chain, verifiable |
| **Security Audit** | **15%** | Third-party smart contract audit | Report published publicly |
| **Founder Reimbursement** | **15%** | Pre-launch development costs | Disclosed upfront |
| **Operations & Maintenance** | **10%** | Hosting, domains, infrastructure | Ongoing transparency |
| **Marketing & Growth** | **10%** | Community building, partnerships | General updates |

### Transparency Notes

**Liquidity Pool (50%):** Locked in DEX liquidity pool at launch. Anyone can verify the LP tokens on-chain. This is the primary rug-pull protection for investors.

**Security Audit (15%):** Funds the comprehensive third-party security audit. The full audit report will be published publicly for community review.

**Founder Reimbursement (15%):** VFIDE was fully developed, audited, and deployed before the presale. This allocation reimburses the founder for pre-launch development costs including:
- Smart contract development
- Frontend/UI development
- Infrastructure and hosting during development
- Legal consultation

*Unlike many projects that raise funds for "development" then build, VFIDE is fully functional before asking for community investment. The 15% reimbursement covers work already completed, not promises.*

**Operations (10%):** Ongoing infrastructure costs, domain renewals, server hosting, and maintenance.

**Marketing (10%):** Community growth, partnerships, and promotional activities.

---

## Fee Structure

### Transfer Fees (Token Movements)
Fees apply to vault-to-vault token transfers (NOT payments):

**Continuous Linear Fee Curve:**
| ProofScore | Total Fee | Description |
|------------|-----------|-------------|
| **≤4000** (≤40%) | **5.00%** | Maximum fee (low trust floor) |
| **5000** (50%) | **3.81%** | Linear interpolation |
| **6000** (60%) | **2.63%** | Midpoint |
| **7000** (70%) | **1.44%** | Linear interpolation |
| **≥8000** (≥80%) | **0.25%** | Minimum fee (high trust ceiling) |

**Formula (from ProofScoreBurnRouter.sol):**
```
For score 4000-8000:
fee = 5.00% - ((score - 4000) × 4.75%) / 4000

Examples:
- Score 4000 (40%): 5.00% (max)
- Score 6000 (60%): 2.63% (midpoint)
- Score 8000 (80%): 0.25% (min)
```

**Fee Split (40/10/50):**
- **Burn:** 40% of total fee (deflationary)
- **Sanctum (charity):** 10% of total fee
- **Ecosystem (operations):** 50% of total fee (council, staking, incentives)

**Contract Constants:**
- `LOW_SCORE_THRESHOLD = 4000` (≤40% pays max fee)
- `HIGH_SCORE_THRESHOLD = 8000` (≥80% pays min fee)
- `minTotalBps = 25` (0.25% minimum)
- `maxTotalBps = 500` (5% maximum)

**Fee Recipients:**
- **Burn:** Removed from supply permanently (deflationary)
- **Sanctum:** Charity vault (67% rotating, 17% ecosystem, 17% fixed)
- **Ecosystem:** Development, marketing, buyback & burn programs

---

## Anti-Whale Protection

VFIDE implements comprehensive whale protection to prevent market manipulation and ensure fair distribution.

### Default Limits (Configurable by DAO)
| Protection | Default Limit | Purpose |
|------------|---------------|---------|
| **Max Transfer** | 2,000,000 VFIDE (1%) | Prevents single massive dumps |
| **Max Wallet** | 4,000,000 VFIDE (2%) | Limits accumulation |
| **Daily Limit** | 5,000,000 VFIDE (2.5%) | Prevents rapid exit |
| **Cooldown** | 0 (disabled) | Optional time between transfers |

### How It Works
1. **Per-Transfer Limit**: No single transfer can exceed `maxTransferAmount`
2. **Wallet Cap**: Recipients cannot exceed `maxWalletBalance` after receiving
3. **24-Hour Rolling Limit**: Senders cannot transfer more than `dailyTransferLimit` per day
4. **Optional Cooldown**: Configurable delay between transfers (disabled by default)

### Exemptions
System contracts and exchanges are exempt from whale limits:
- Genesis allocation addresses (devVault, presale, treasury)
- DEX liquidity pools (set by owner)
- CEX hot/cold wallets (set by owner)
- System contracts (presale, sinks, etc.)

### Contract Functions
```solidity
// Admin: Configure whale limits (0 = disabled)
setAntiWhale(maxTransfer, maxWallet, dailyLimit, cooldown)

// Admin: Exempt address (exchanges, pools)
setWhaleLimitExempt(address, true/false)

// View: Check remaining daily allowance
remainingDailyLimit(address) → uint256

// View: Check cooldown time remaining
cooldownRemaining(address) → uint256
```

---

## Sustainability Mechanisms

VFIDE implements multiple sustainability controls to ensure the token economy remains healthy during both high and low volume periods.

### Daily Burn Cap
Prevents excessive deflation during high volume periods.

| Parameter | Default | Purpose |
|-----------|---------|---------|
| **Daily Burn Cap** | 500,000 VFIDE | Max tokens burned per 24h |
| **Cap Behavior** | Redirect to Ecosystem | When cap reached, burns → ecosystem fund |

**Why this matters:**
- During viral trading days, uncapped burns could deflate supply too fast
- Redirecting excess to ecosystem ensures continued development funding
- Cap is ~0.25% of supply per day - sustainable long-term

### Minimum Supply Floor
Ensures long-term token availability.

| Parameter | Default | Purpose |
|-----------|---------|---------|
| **Supply Floor** | 50,000,000 VFIDE | Burns pause at this level |
| **Floor %** | 25% of initial | Ensures adequate liquidity |

**What happens at floor:**
- Burns automatically redirect to ecosystem fund
- Transfers continue normally (fees still collected)
- Once supply decreases to floor, token becomes stable-supply

### Volume-Adaptive Fees
Adjusts fees based on market activity to maintain ecosystem funding.

| Volume Level | Daily Volume | Fee Multiplier | Effective Fee Range |
|--------------|--------------|----------------|---------------------|
| **Low** | < 100K VFIDE | 1.2x | 0.30% - 6.00% |
| **Normal** | 100K - 5M | 1.0x | 0.25% - 5.00% |
| **High** | > 5M VFIDE | 0.8x | 0.20% - 4.00% |

**How it works:**
- Low volume = slightly higher fees to maintain ecosystem funding
- High volume = lower fees to not over-extract from active market
- Linear interpolation between thresholds
- Disabled by default (must be enabled by DAO)

### Minimum Ecosystem Fee
Ensures ecosystem always receives baseline funding.

| Parameter | Default | Purpose |
|-----------|---------|---------|
| **Ecosystem Min** | 0.05% (5 bps) | Floor for ecosystem portion |

**Even high-trust users (ProofScore ≥8000 / 80%) contribute minimum 0.05% to ecosystem**

### Contract Functions
```solidity
// Admin: Configure burn sustainability
setSustainability(dailyBurnCap, minimumSupplyFloor, ecosystemMinBps)

// Admin: Configure volume-adaptive fees
setAdaptiveFees(lowVolumeThreshold, highVolumeThreshold, lowVolMult, highVolMult, enabled)

// View: Get sustainability status
getSustainabilityStatus() → (dailyBurned, burnCapacity, dailyVolume, volumeMultiplier, burnsPaused, supplyFloor, currentSupply)

// View: Check if burns are paused
burnsPaused() → bool

// View: Remaining daily burn capacity
remainingDailyBurnCapacity() → uint256
```

### Sustainability Example Scenarios

**Scenario 1: Viral Trading Day (10M volume)**
- Daily burn cap: 500K
- First 500K burned normally
- Remaining burns redirect to ecosystem fund
- Result: Sustainable deflation + funded ecosystem

**Scenario 2: Low Volume Period (50K/day)**
- Adaptive fees: 1.2x multiplier (if enabled)
- Ecosystem minimum: 0.05% always collected
- Result: Adequate funding despite low activity

**Scenario 3: Supply Approaching Floor**
- Current supply: 52M, Floor: 50M
- Burns approaching pause threshold
- Automatic redirect to ecosystem when floor reached
- Result: Token never fully depletes

---

### Payment Fees (Commerce)
**Merchant payments: 0% merchant fees**

**CRITICAL DISTINCTION:**
- **Merchant receives:** 100% of payment amount (no fees deducted)
- **Customer pays:** Only network gas fee (~$0.01-0.05 on zkSync)
- **No percentage fees on commerce transactions**
- Transfer fees (0.25-5%) apply ONLY to non-payment vault transfers

**How this works:**
- Merchant payments are tagged as commerce transactions
- System recognizes payment type and bypasses transfer fees
- Merchant keeps full sale amount
- Only tiny network gas cost (paid by customer or merchant based on implementation)

**Example:**
```
Customer pays 100 VFIDE for product
→ Merchant receives 100 VFIDE
→ Zero fees deducted
```

**Comparison to competitors:**
- Stripe: 2.9% + $0.30 per transaction
- PayPal: 2.9% + $0.30 per transaction
- Coinbase Commerce: 1% per transaction
- VFIDE: **0% per transaction**

---

## VFIDE-Only Ecosystem

### Philosophy
VFIDE operates as a **closed-loop economy**. All commerce, governance, and ecosystem participation requires VFIDE tokens. This creates:

1. **Consistent demand** - Every transaction requires VFIDE
2. **Aligned incentives** - Users invest in the ecosystem they use
3. **Simplified architecture** - One token, one system
4. **Strong tokenomics** - No competing currencies diluting value

### Why Not Accept Stablecoins?
| Multi-Token System | VFIDE-Only System |
|-------------------|-------------------|
| Complex incentive design | Simple: use VFIDE or don't participate |
| "Why buy VFIDE?" problem | VFIDE is **required** to use ecosystem |
| Competing with USDC/USDT | No competition - we ARE the currency |
| Need discounts to incentivize | Built-in incentive: ecosystem access |

### Enterprise Integration (Optional)
For large merchants (Amazon-scale) requiring stable settlement:
- **User pays:** VFIDE
- **Enterprise Gateway:** Auto-swaps VFIDE → USDC atomically
- **Merchant receives:** Stable USD value
- **User still earns:** ProofScore, benefits, ecosystem participation

The user always pays in VFIDE. The gateway handles conversion if merchant requires stable value.

---

## Commerce with Escrow Protection

### How Commerce Works
VFIDE commerce uses **escrow** to protect both buyers and sellers:

```
1. Buyer opens escrow → specifies merchant & amount
2. Buyer funds escrow → VFIDE locked in contract
3. Merchant delivers goods/services
4. Buyer releases funds → Merchant receives full amount
   OR Dispute → DAO resolves
```

**Key Points:**
- **No instant settlement** - Funds held in escrow until buyer confirms
- **Buyer protection** - Can dispute if merchant doesn't deliver
- **Seller protection** - Payment locked, can't be revoked after release
- **DAO arbitration** - Disputes resolved fairly by governance

### Pricing Control
- **Merchants set their own prices** - VFIDE does NOT impose discounts
- **0% platform fees** - Merchant receives 100% of payment
- **Merchant discounts optional** - Their business, their choice

---

## Transaction Rewards (VFIDEBenefits)

### What VFIDE Controls
Rewards for completed escrow transactions (not discounts):

| Reward | Amount | Recipient |
|--------|--------|-----------|
| **ProofScore** | +2 points | Buyer (per transaction) |
| **ProofScore** | +5 points | Merchant (per transaction) |
| **Cashback** | 0-3% | Buyer (ecosystem-funded, optional) |

### What Merchants Control
- **All pricing decisions** - VFIDE doesn't set or reduce prices
- **Optional discounts** - Merchant can offer their own promotions
- **Refund policies** - Merchant's terms apply

### Cashback (Optional, Ecosystem-Funded)
- **NOT taken from merchants** - Funded by EcoTreasuryVault
- **DAO sets rate** - 0% to 3% max
- **24h claim cooldown** - Prevents spam
- **Accrues per transaction** - Buyer claims when ready

---

## ProofScore Economics

### What is ProofScore?
On-chain reputation score (0-1000) that determines:
1. Transfer fee rates (2.5% to 4.5%)
2. Voting power in governance
3. Eligibility for premium features
4. Endorsement capabilities
5. Merchant verification priority

### How to Build ProofScore

#### 1. Capital Stability (0-200 points)
- Maintain consistent vault balance
- Higher balances = more points
- Sudden withdrawals = point decay
- **Time-weighted:** Long-term holdings valued

#### 2. Behavioral Consistency (0-200 points)
- On-time payments
- No disputes
- Proper merchant interactions
- Avoid suspicious patterns
- **Penalty:** Disputes reduce score significantly

#### 3. Social Endorsements (0-150 points)
- Receive endorsements from trusted users
- Endorsers stake tokens (slashed if you misbehave)
- Higher value endorsements worth more
- **Requirement:** Endorser must have ProofScore ≥500

#### 4. Credentials (0-150 points)
- Verified identity (KYC)
- Business registration
- Professional certifications
- Social media verification
- **Optional:** Not required but beneficial

#### 5. Activity Level (0-150 points)
- Regular transactions
- Consistent platform usage
- Merchant activity (if applicable)
- DAO participation
- **Sweet spot:** Active but not excessive

#### 6. Fixed Bonus (0-150 points)
- Early adopter rewards
- Bug bounty contributions
- DAO-awarded discretionary points
- Special achievements
- **One-time:** Does not decay

### ProofScore Thresholds

```
1000 ────────────────────────── Maximum (extremely rare)
 900 ────────────────────────── Top 1% users
 800 ────────────────────────── Excellent reputation
 700 ════════════════════════── High Trust Threshold (-0.5% fee)
 600 ────────────────────────── Above average
 500 ────────────────────────── Can endorse others
 400 ────────────────────────── Average user
 350 ════════════════════════── Low Trust Threshold (+1.5% fee)
 300 ────────────────────────── Below average
 200 ────────────────────────── Poor reputation
 100 ────────────────────────── Very poor reputation
   0 ────────────────────────── New user / banned
```

### Score Decay
- **Capital:** Decays if balance drops
- **Behavioral:** Decays after disputes/issues
- **Social:** Endorsements decay over time (must be renewed)
- **Activity:** Decays with inactivity
- **Credentials/Fixed:** Do not decay

**Decay rates:**
- Social: 5% per month without renewal
- Activity: 10% per month of inactivity
- Behavioral: Instant reduction on disputes

---

## Economic Incentives

### For Users

**Build ProofScore → Pay Less Fees**
- New user (score 0): 4.5% transfer fee
- Active user (score 500): 3.0% transfer fee  
- Trusted user (score 800): 2.5% transfer fee

**Savings example:**
```
Transfer 10,000 VFIDE:
- Score 0:   450 VFIDE fee (4.5%)
- Score 500: 300 VFIDE fee (3.0%)
- Score 800: 250 VFIDE fee (2.5%)

Savings: 200 VFIDE (45% less) by building reputation
```

### For Merchants

**Zero Processing Fees**
- Traditional payment processing: 2.9% average
- VFIDE: 0%

**Revenue impact:**
```
Annual revenue: $1,000,000
Traditional fees: $29,000 (2.9%)
VFIDE fees: $0 (0%)

Savings: $29,000 per year
```

**Additional benefits:**
- Instant settlement (no 2-3 day wait)
- No chargebacks
- Global reach
- No account holds/freezes

### For Endorsers

**Earn from endorsements:**
- Receive share of endorsee's fee discounts
- Build social reputation
- Unlock premium features

**Risk:**
- Stake is slashed if endorsee misbehaves
- Encourages careful vetting

### For Node Operators

**Rewards:**
- 75M VFIDE allocated for node rewards
- Merit-based distribution
- Performance bonuses
- Long-term sustainability

### For Governance Participants

**DAO treasury:**
- 50M VFIDE for community initiatives
- Ecosystem fund revenue stream
- Grant programs
- Bug bounties

---

## Deflationary Mechanics

### Burn Rate Calculation

**Assumptions:**
- 1B VFIDE transferred per year
- Average ProofScore: 500 (3% total fee)
- Burn portion: 2% of 3% = 2%

**Annual burn:**
```
1,000,000,000 VFIDE × 2% = 20,000,000 VFIDE burned

Circulating supply year 1: 200M
Circulating supply year 2: 180M (20M burned)
Circulating supply year 3: 162M (18M burned)
Circulating supply year 4: 145.8M (16.2M burned)

Deflation rate: ~10% per year (at high volume)
```

### Long-Term Supply Projection

| Year | Circulating Supply | % Remaining | Annual Burn |
|------|-------------------|-------------|-------------|
| 0 | 200M | 100% | - |
| 1 | 180M | 90% | 20M |
| 2 | 162M | 81% | 18M |
| 3 | 145.8M | 73% | 16.2M |
| 5 | 118M | 59% | - |
| 10 | 69M | 35% | - |
| 20 | 24M | 12% | - |

**Note:** Actual burn depends on transaction volume and ProofScore distribution

### Deflationary Benefits

1. **Scarcity:** Decreasing supply → potential price appreciation
2. **Holder rewards:** Long-term holders benefit from deflation
3. **Velocity management:** Discourages excessive speculation
4. **Sustainable revenue:** Ecosystem fund grows without inflation

### Comparison to Other Models

| Model | Supply | Holder Benefit | Example |
|-------|--------|----------------|---------|
| Inflationary | Increases | Diluted | Most PoS chains |
| Fixed | Constant | Neutral | Bitcoin (after 2140) |
| **Deflationary** | **Decreases** | **Compounding** | **VFIDE** |

---

## Revenue Model

### Protocol Revenue Sources

1. **Ecosystem Fee (0.5% of transfers)**
   - Funds development
   - Marketing campaigns
   - Partnership integrations
   - Team compensation

2. **DAO Treasury**
   - 50M VFIDE allocation
   - Grant programs
   - Strategic investments
   - Emergency fund

3. **Sanctum Charity Split (17% of charity fees)**
   - Sustainable charity funding
   - Platform development share
   - Long-term viability

### Revenue vs Merchant Fees

**Key insight:** Most protocols earn revenue from payment fees. VFIDE doesn't.

**Why this works:**
- Transfer fees ≠ payment fees
- Users transfer for reasons other than payments:
  - Trading on DEXs
  - Staking/unstaking
  - Vault rebalancing
  - Liquidity provision
  
**This creates revenue without taxing commerce.**

---

## Economic Security

### Sybil Resistance

**ProofScore requires capital:**
- Building high score requires vault balance
- Endorsements require stake
- Gaming is expensive

**Cost to fake score 700:**
- Capital requirement: ~50,000 VFIDE
- Endorsement stakes: ~10,000 VFIDE  
- Time requirement: 6+ months
- Risk: Slashing if caught

**Cheaper to earn legitimately.**

### Attack Economics

**51% governance attack:**
- Requires: 51% of (tokens × ProofScore)
- Cost: Acquire tokens + build score
- Estimated: >$50M at $1 token price
- Defense: Timelock delays give time to respond

**Fee manipulation attack:**
- All fee changes require DAO vote
- 3-day timelock minimum
- Circuit breaker can halt

**Spam attack:**
- Each transaction costs gas
- No revenue from spam (0% payment fees)
- Not economically viable

---

## Token Utility

### Primary Utilities

1. **Medium of Exchange**
   - Pay merchants (0% fee)
   - Peer-to-peer transfers
   - Cross-border payments

2. **Governance**
   - Vote on proposals
   - Weighted by ProofScore
   - Direct protocol control

3. **Reputation Staking**
   - Endorse others (earn rewards)
   - Build ProofScore (reduce fees)
   - Vault collateral

4. **Fee Reduction**
   - Higher ProofScore → lower fees
   - Indirect utility of holding

5. **Access to Features**
   - Premium vault features
   - Merchant verification
   - Priority support

### Secondary Utilities

- Trading on DEXs
- Liquidity provision
- Collateral for DeFi protocols
- Subscription payments (future)

---

## Comparison to Competitors

### vs Traditional Payments (Stripe, PayPal)

| Feature | Traditional | VFIDE |
|---------|------------|-------|
| Merchant Fee | 2.9% + $0.30 | 0% |
| Customer Fee | $0 | $0 |
| Chargeback Risk | Yes | No |
| Settlement Time | 2-3 days | Instant |
| Global Access | Limited | Worldwide |
| Account Freezing | Common | No (non-custodial) |

### vs Crypto Payments (Coinbase Commerce)

| Feature | Coinbase Commerce | VFIDE |
|---------|------------------|-------|
| Merchant Fee | 1% | 0% |
| Custody | Custodial | Non-custodial |
| Recovery | Centralized | Guardian-based |
| Reputation | None | ProofScore |
| Governance | None | DAO |

### vs DeFi Protocols (Generic)

| Feature | Typical DeFi | VFIDE |
|---------|-------------|-------|
| Focus | Trading | Commerce |
| Custody | User wallets | Vaults |
| Reputation | None | ProofScore |
| Fees | Variable | 0% payments |
| Governance | Token-weighted | Score-weighted |

---

## Economic Risks & Mitigations

### Risk: Low ProofScore Adoption
**Problem:** Users don't build scores, fees stay high

**Mitigation:**
- Clear incentives (45% fee savings)
- Gamification elements
- Educational content
- Community challenges

### Risk: Merchant Abandonment
**Problem:** Merchants leave if no customers

**Mitigation:**
- 0% fees attract merchants
- Marketing to customers
- Integration partnerships
- Ambassador program

### Risk: Excessive Deflation
**Problem:** Supply becomes too scarce

**Mitigation:**
- DAO can adjust fee parameters
- Natural equilibrium (lower supply → higher price → less volume → less burn)
- Emergency controls

### Risk: ProofScore Gaming
**Problem:** Users fake scores

**Mitigation:**
- Capital requirements
- Endorsement slashing
- Behavioral monitoring
- DAO intervention

---

## Economic Roadmap

### Phase 1: Launch (Months 0-3)
- Fixed fee parameters
- Manual merchant verification
- Basic ProofScore calculation
- Conservative approach

### Phase 2: Optimization (Months 3-12)
- DAO adjusts parameters based on data
- Automated merchant verification
- Enhanced ProofScore components
- Ecosystem fund deployment for growth initiatives

### Phase 3: Expansion (Year 2+)
- Cross-chain bridges
- Multi-currency support
- Advanced financial products
- Ecosystem maturity

---

## Key Metrics to Track

### Health Indicators
1. **Total Value Locked (TVL):** VFIDE in vaults
2. **Transaction Volume:** Daily/monthly payment volume
3. **Merchant Count:** Active merchants
4. **Average ProofScore:** User trust level
5. **Burn Rate:** Annual deflation percentage
6. **DAO Participation:** Voter turnout

### Success Metrics
- TVL > $10M within 6 months
- 1000+ merchants within 1 year
- $1M+ daily transaction volume
- Average ProofScore > 400
- 5-10% annual deflation
- 25%+ DAO voter participation

---

## References

- **Architecture:** See `ARCHITECTURE.md`
- **Contracts:** See `CONTRACTS.md`
- **Security:** See `SECURITY.md`
- **Deployment:** See `DEPLOYMENT.md`
