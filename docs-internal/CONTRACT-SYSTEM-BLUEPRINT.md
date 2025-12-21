# VFIDE Contract System - Complete Blueprint
**Version:** 1.0 - Finalized System Architecture  
**Purpose:** Single source of truth for all contracts, governance, and integrations  
**Status:** Ready for implementation

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Governance Model](#governance-model)
3. [Core Contracts](#core-contracts)
4. [Treasury & Economics](#treasury--economics)
5. [Commerce Layer](#commerce-layer)
6. [Security & Emergency](#security--emergency)
7. [Frontend Integration](#frontend-integration)
8. [Deployment Guide](#deployment-guide)
9. [Testing Requirements](#testing-requirements)

---

## System Overview

### Architecture Layers
```
Layer 1: Token & Vaults
├── VFIDEToken (ERC20 with vault-only enforcement)
├── VaultInfrastructure (user balance containers)
└── DevReserveVestingVault (40M team allocation)

Layer 2: Trust & Fees
├── VFIDETrust (ProofScore 0-1000)
└── ProofScoreBurnRouter (Dynamic fees: 0.25% / 1.75% / 5%)

Layer 3: Governance
├── CouncilManager (3-5 member merit-based council)
├── DAO (Community governance)
└── DAOTimelock (2-day execution delay)

Layer 4: Treasury
├── EcosystemVault (0.2% fee → 60% ops, 40% council)
├── SanctumVault (0.05% fee → charity)
└── PromotionalTreasury (2M fixed budget)

Layer 5: Commerce
├── MerchantPortal (0% merchant fees)
├── VFIDECommerce (subscriptions, escrow)
└── EscrowManager (dispute resolution)

Layer 6: Security
└── VFIDESecurity (PanicGuard, locks, blacklist)
```

### Key Design Principles
✅ **DAO-controlled from day 1** - No single owner, council governance  
✅ **Merit-based council** - ProofScore ≥700 required, auto-remove if drops  
✅ **Operations-first funding** - Council paid after operations secured  
✅ **Zero merchant fees** - 100% payment goes to merchants  
✅ **Deflationary by design** - Burns reduce supply over time  
✅ **Vault-only tokens** - No wallet holding, reduces scams  

---

## Governance Model

### Council Structure

#### Phase 1: Launch (3 Members)
```
Members: Founder + 2 Core Contributors
Duration: Months 0-6
Voting: 2/3 required for all decisions
Payment: 40% of ecosystem vault / 3 = ~8,000 VFIDE/month each

Requirements:
- ProofScore ≥700 (checked daily)
- Vote on 100% of proposals within deadline
- Miss 3 consecutive votes = auto-removal
- Active in Discord/Telegram for emergencies
```

#### Phase 2: Growth (5 Members)
```
Members: 3 Founding + 2 Community-Elected
Duration: Months 6-12
Voting: 3/5 required for all decisions
Elections: Quarterly (90-day terms)
Payment: 40% of ecosystem vault / 5 = ~4,800 VFIDE/month each

New Member Selection:
- Nomination: Any holder with 100K+ VFIDE, score ≥700
- Voting: Token-weighted (70%) + ProofScore bonus (30%)
- Top 2 vote-getters elected
```

#### Phase 3: Community (7+ Members)
```
Members: Fully community-elected
Duration: Year 2+
Voting: Simple majority (50%+1)
Elections: Quarterly
Payment: Split evenly among active members
```

### Council Member Requirements

#### Entry Requirements
```solidity
- ProofScore ≥700 (verified by Seer - on-chain only)
- Hold ≥100,000 VFIDE in vault
- Wallet age ≥90 days (prevents sybil attacks)
- Submit candidate statement (IPFS hash, max 500 words)
- No removal history within past 180 days
- Sign message proving wallet ownership

NO KYC REQUIRED - PSEUDONYMOUS ALLOWED
```

#### Ongoing Requirements
```solidity
- Maintain ProofScore ≥700 (checked daily)
- Vote on all proposals within deadline:
  * Emergency (24hr): Must vote or be flagged
  * Routine (7 days): Must vote within window
  * Major (14 days): Must vote within window
  
- Activity Tracking:
  * Miss 1 emergency vote: Warning
  * Miss 2 emergency votes: Auto-removal
  * Miss 3 consecutive votes (any type): Auto-removal
  * Miss 5 total votes in 90 days: Auto-removal
```

#### Removal Triggers (Automatic)
```solidity
1. ProofScore drops below 700 for 7+ days
2. Miss 3 consecutive votes
3. Miss 5 votes in current 90-day term
4. Wallet blacklisted by SecurityHub
5. Dishonesty vote (4/5 council votes to remove)

Removal = FINAL
- No appeals process
- Cannot re-nominate for 180 days
- Forfeit unpaid salary for current month
- Immediate election for replacement
```

### Payment Structure

#### Monthly Distribution (1st of each month)
```
Total Ecosystem Vault Balance: 100%

Priority 1: Operations Budget (60%)
├── Hosting & infrastructure
├── Security audits
├── Marketing campaigns
├── Development costs
├── Exchange listings
└── Legal & compliance

Priority 2: Council Salaries (40%)
├── Split evenly among active members
├── Paid ONLY if operations funded first
└── Prorated if removed mid-month

If vault insufficient (<10K VFIDE):
- Operations get 100%
- Council gets $0 that month
- Ensures system stays running
```

#### Payment Examples
```
Month 1 (60K VFIDE in vault, $0.12 price):
- Operations: 36K VFIDE ($4,320)
- Council (3): 8K each ($960/member)

Month 6 (60K VFIDE in vault, $1.00 price):
- Operations: 36K VFIDE ($36,000)
- Council (5): 4.8K each ($4,800/member)

Month 12 (200K VFIDE in vault, $5.00 price):
- Operations: 120K VFIDE ($600,000)
- Council (7): 11.4K each ($57,000/member)
```

### Voting System

#### Proposal Types

**Emergency Proposals (24-hour vote)**
```
Use cases:
- Security exploit response
- System pause/unpause
- Blacklist malicious address
- Emergency parameter adjustment

Requirements:
- 2/3 council vote (3 members)
- 3/5 council vote (5 members)
- No timelock delay (immediate execution)
```

**Routine Proposals (7-day vote)**
```
Use cases:
- Small treasury spends (<$5K)
- Merchant suspensions
- Minor parameter tweaks
- Promotional campaigns

Requirements:
- 2/3 council vote
- 2-day timelock delay
```

**Major Proposals (14-day vote)**
```
Use cases:
- Large treasury spends ($5K-$50K)
- Contract upgrades
- Fee structure changes
- New feature activations

Requirements:
- 3/5 council vote (or 2/3 for 3 members)
- 7-day timelock delay
```

**Critical Proposals (14-day vote + community)**
```
Use cases:
- Massive spends (>$50K)
- Ownership transfers
- Supply changes
- Fundamental tokenomics

Requirements:
- 4/5 council vote (or unanimous for 3)
- 4% community quorum
- 60% community approval
- 14-day timelock delay
```

#### Election Process

**Nomination Phase (7 days)**
```solidity
function nominateSelf(string calldata statement) external {
    require(seer.getScore(msg.sender) >= 700, "Score too low");
    require(vaultHub.getVaultBalance(msg.sender) >= 100_000e18, "Need 100K VFIDE");
    require(block.timestamp >= removalHistory[msg.sender] + 180 days, "Cooldown active");
    
    candidates.push(msg.sender);
    candidateStatements[msg.sender] = statement;
}
```

**Voting Phase (7 days)**
```solidity
function voteForCandidate(address candidate, uint256 amount) external {
    require(isCandidate[candidate], "Not nominated");
    
    // Lock VFIDE for voting
    vaultHub.lockTokens(msg.sender, amount, electionEnd);
    
    candidateVotes[candidate] += amount;
}
```

**Finalization**
```solidity
function finalizeElection() external {
    require(block.timestamp >= votingEnd, "Voting active");
    
    // Calculate weighted scores
    for (uint i = 0; i < candidates.length; i++) {
        address candidate = candidates[i];
        uint256 tokenVotes = candidateVotes[candidate];
        uint16 proofScore = seer.getScore(candidate);
        
        // 70% token weight, 30% ProofScore weight
        uint256 score = (tokenVotes * 70 / 100) + (proofScore * 300);
        candidateScores[candidate] = score;
    }
    
    // Sort and select top N winners
    address[] memory winners = getTopCandidates(openSeats);
    
    for (uint i = 0; i < winners.length; i++) {
        councilManager.addMember(winners[i]);
    }
    
    // Unlock voter tokens
    unlockVoterTokens();
}
```

---

## Core Contracts

### 1. VFIDEToken.sol

**Purpose:** Core ERC20 token with vault-only transfer enforcement

#### Token Economics
```
Total Supply Cap: 200,000,000 VFIDE
Decimals: 18

OPTIMIZED DISTRIBUTION (Solo Founder, Max Market Circulation):
├── Founder Dev Reserve: 50M (25%) - 2-month cliff, 3-year vest, unlocks every 2 months
├── Presale: 50M (25%) - Public sale, 25% immediate, 75% vested over 6 months
├── Initial Liquidity: 40M (20%) - Uniswap/DEX pools (locked 12 months)
├── Ecosystem Rewards: 40M (20%) - Staking, referrals, promotions, community
└── DAO Treasury: 10M (10%) - CEX listings, marketing, audits (burns fund ongoing ops)
────────────────────────────────────────────────
TOTAL: 200M (100%) ✅

Presale Details (Tiered Pricing - Longer Lock = Lower Price):
- Supply: 50M VFIDE (25% of total supply)
- Pricing Tiers:
  * $0.03/VFIDE (180-day lock) - Best price, 2.33x more tokens than no-lock
  * $0.05/VFIDE (90-day lock)  - Mid price, 1.4x more tokens than no-lock
  * $0.07/VFIDE (no lock)      - Instant access, immediate trading
- Total Raise: $1.5M - $3.5M depending on tier mix
- Max per wallet: 500K VFIDE (1% of presale, minimum 100 unique buyers)
- NO KYC REQUIRED (self-attestation only: 18+, not in OFAC countries)

Distribution Breakdown:
Founder Dev Reserve:  50M  (25.0%)  - You built it, you deserve 25%
Presale:              50M  (25.0%)  - Public, strong decentralization
Initial Liquidity:    40M  (20.0%)  - DEEP liquidity (minimal slippage)
Ecosystem Rewards:    40M  (20.0%)  - Staking + community growth
DAO Treasury:         10M  (10.0%)  - Lean ops (ecosystem fees fund council)
                     ────   ──────
TOTAL:               200M  (100%)

Founder Vesting Schedule (50M over 3 years):
- Month 2 (first unlock): 2.78M (5.56%)
- Month 4: +2.78M (cumulative 5.56M)
- Month 6: +2.78M (cumulative 8.34M)
- Month 8: +2.78M (cumulative 11.12M)
- Month 10: +2.78M (cumulative 13.9M)
- Month 12: +2.78M (cumulative 16.68M)
- Continues every 2 months for 36 months total
- Final unlock at Month 36: Full 50M vested (18 unlocks)

Circulating Supply Timeline (Based on Presale Lock Tiers):

SCENARIO: Conservative Mix (40% 180-day lock, 30% 90-day lock, 30% no-lock)
Day 1 (DEX Launch):
- Presale no-lock: 15M (30% of presale, 7.5% of supply)
- Initial Liquidity: 40M (20%)
- CIRCULATING: 55M (27.5%) ✅ Strong starting liquidity

Month 2 (Founder first unlock):
- Founder unlock: +2.78M
- CIRCULATING: ~57.8M (28.9%)

Month 3 (90-day locks expire):
- Presale 90-day: +15M unlocked
- CIRCULATING: ~72.8M (36.4%)

Month 6 (180-day locks expire):
- Presale 180-day: +20M unlocked (ALL presale now tradable)
- Founder vested: 8.34M (3 unlocks total)
- Ecosystem rewards: ~10M distributed
- CIRCULATING: ~108M (54%)

Year 1:
- Founder vested: 16.68M (6 unlocks)
- Ecosystem rewards: ~20M
- DAO spending: ~5M (CEX listings, marketing)
- CIRCULATING: ~142M (71%)

Year 3 (Founder fully vested):
- Founder complete: 50M
- Ecosystem rewards: ~40M distributed
- DAO spending: ~10M
- CIRCULATING: ~190M (95%)

Why This Perfect Balance Works:
✅ 50M to public (25%) - Strong decentralization, fair launch
✅ 50M founder (25%) - You built it solo, deserve equal share with public
✅ 40M liquidity (20%) - DEEP pools = low slippage, hard to manipulate price
✅ 40M ecosystem (20%) - Big rewards pool keeps community engaged long-term
✅ 10M DAO (10%) - Lean ops, just enough for CEX listings + marketing ($2M+)
✅ Tiered pricing rewards commitment - 180-day lock = 57% cheaper than instant
✅ 27.5% circulating at launch (30% no-lock tier) - Strong starting liquidity
✅ Gradual unlock (Month 3 + Month 6) - Prevents massive dumps, smooth distribution
✅ 2-month cliff, 3-year vest - Shows commitment, regular bi-monthly income
✅ Ecosystem fee (0.2%) funds council - DAO doesn't need huge treasury
✅ Burns reduce supply over time - Deflationary = price increases as volume grows
✅ NO Strategic Reserve needed - DAO can allocate from treasury if needed

Presale Tier Advantages:
🔒 180-day lock ($0.03): Get 116,666 VFIDE per 1 ETH ($3500 ETH) = $406 value for $100 investment
🔒 90-day lock ($0.05): Get 70,000 VFIDE per 1 ETH = $245 value for $100 investment  
⚡ No lock ($0.07): Get 50,000 VFIDE per 1 ETH = $175 value for $100 investment (instant trading)

Early believers who lock get 2.33x more tokens than instant buyers - MASSIVE incentive for long-term holding!
```

#### Key Features
- **Vault-Only Mode:** Users cannot hold VFIDE in wallets, only in Vaults
- **Dynamic Fees:** Calculated by ProofScoreBurnRouter based on sender's score
- **Security Locks:** Checks VFIDESecurity before every transfer
- **Burn Mechanism:** 0-4.75% burned per transfer depending on score
- **Minting Controls:** Only GuardianNodeSale can mint (75M cap)

#### State Variables
```solidity
contract VFIDEToken is ERC20 {
    // Supply controls
    uint256 public constant MAX_SUPPLY = 200_000_000e18;
    uint256 public constant DEV_RESERVE = 40_000_000e18;
    uint256 public constant NODE_REWARD_CAP = 75_000_000e18;
    uint256 public totalNodeMinted;
    
    // System controls
    bool public vaultOnlyMode;           // Enforces vault-only transfers
    bool public policyLocked;            // Makes vaultOnlyMode permanent
    
    // Module addresses
    address public nodeSale;             // GuardianNodeSale (can mint)
    address public vaultHub;             // VaultInfrastructure
    address public seer;                 // VFIDETrust (ProofScore)
    address public burnRouter;           // ProofScoreBurnRouter (fees)
    address public securityHub;          // VFIDESecurity (locks)
    address public ledger;               // ProofLedger (transparency)
    
    // System exemptions (can receive tokens)
    mapping(address => bool) public isSystemContract;
}
```

#### Core Functions

**transfer() - Override with fee logic**
```solidity
function transfer(address to, uint256 amount) public override returns (bool) {
    // 1. Security check
    require(!securityHub.isLocked(), "System locked");
    require(!securityHub.isBlacklisted(msg.sender), "Sender blacklisted");
    
    // 2. Vault-only enforcement
    if (vaultOnlyMode && !isSystemContract[to]) {
        require(vaultHub.isVault(to), "Must transfer to vault");
    }
    
    // 3. Calculate dynamic fees
    (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        address sanctumSink,
        address ecosystemSink,
        address burnSink
    ) = burnRouter.computeFees(msg.sender, to, amount);
    
    // 4. Execute split transfer
    uint256 netAmount = amount - burnAmount - sanctumAmount - ecosystemAmount;
    
    _transfer(msg.sender, to, netAmount);
    if (burnAmount > 0) _transfer(msg.sender, burnSink, burnAmount);
    if (sanctumAmount > 0) _transfer(msg.sender, sanctumSink, sanctumAmount);
    if (ecosystemAmount > 0) _transfer(msg.sender, ecosystemSink, ecosystemAmount);
    
    // 5. Log to ProofLedger (best-effort)
    if (ledger != address(0)) {
        try ledger.logTransfer(msg.sender, to, amount) {} catch {}
    }
    
    return true;
}
```

**mintNodeReward() - Presale minting**
```solidity
function mintNodeReward(address to, uint256 amount) external {
    require(msg.sender == nodeSale, "Only nodeSale");
    require(totalNodeMinted + amount <= NODE_REWARD_CAP, "Exceeds cap");
    
    // Must mint to vault if vaultOnlyMode active
    if (vaultOnlyMode) {
        require(vaultHub.isVault(to), "Must mint to vault");
    }
    
    _mint(to, amount);
    totalNodeMinted += amount;
}
```

**toggleVaultOnlyMode() - Enable/disable wallet holding**
```solidity
function toggleVaultOnlyMode() external onlyOwner {
    require(!policyLocked, "Policy locked");
    vaultOnlyMode = !vaultOnlyMode;
}
```

**lockPolicy() - Permanent vault-only**
```solidity
function lockPolicy() external onlyOwner {
    vaultOnlyMode = true;
    policyLocked = true;
    // Cannot be reversed - ensures long-term vault-only
}
```

#### Integration Points
- **VaultHub:** Validates transfer recipients are vaults
- **ProofScoreBurnRouter:** Calculates fees based on sender ProofScore
- **VFIDESecurity:** Checks for system locks before transfers
- **ProofLedger:** Logs all transfers for transparency

---

### 2. VFIDETrust.sol (Seer)

**Purpose:** ProofScore calculation engine (0-1000 trust rating)

#### ProofScore Components (100% On-Chain, Zero KYC)
```
Total Score: 0-1000 points

Component Breakdown:
├── On-Chain Reputation (0-250 points)
│   ├── Wallet Age: 0-80 (older wallets = more trusted)
│   ├── Transaction Count: 0-80 (active wallets = better)
│   ├── Token Holdings: 0-40 (diverse portfolio = legitimate)
│   ├── ENS/Domain: +20 (has identity)
│   ├── NFT Holdings: +20 (active Web3 user)
│   └── Multi-sig/Contract: +10 (sophisticated user)
│
├── VFIDE Activity (0-250 points)
│   ├── Transaction count in system: Up to +100
│   ├── Volume processed: Up to +100
│   └── Holding duration: Up to +50
│
├── Social Signals (0-250 points)
│   ├── Valid referrals given: Up to +100
│   ├── Community vouches: Up to +100
│   └── DAO participation: Up to +50
│
├── Time in System (0-150 points)
│   ├── Account age in VFIDE: Up to +100
│   └── Continuous activity: Up to +50
│
└── Merchant Performance (0-100 points - if merchant)
    ├── Sales volume: Up to +60
    └── Customer retention: Up to +40

ALL COMPONENTS VERIFIABLE ON-CHAIN
ZERO PERSONAL INFORMATION REQUIRED
PRIVACY PRESERVED BY DEFAULT
```

#### Trust Tiers & Fee Impact
```
Score Range    | Tier      | Total Fee | Burn   | Sanctum | Ecosystem
---------------|-----------|-----------|--------|---------|----------
800-1000       | Elite     | 0.25%     | 0%     | 0.05%   | 0.2%
400-799        | Normal    | 1.75%     | 1.5%   | 0.05%   | 0.2%
0-399          | Low Trust | 5%        | 4.75%  | 0.05%   | 0.2%
```

#### State Variables
```solidity
contract VFIDETrust {
    uint16 public constant NEUTRAL_SCORE = 500;
    uint16 public constant MIN_SCORE = 0;
    uint16 public constant MAX_SCORE = 1000;
    
    uint16 public lowTrustThreshold = 400;      // Below = 5% fees
    uint16 public highTrustThreshold = 800;     // Above = 0.25% fees
    
    struct UserData {
        uint16 verificationScore;
        uint16 transactionScore;
        uint16 socialScore;
        uint16 timeScore;
        uint16 merchantScore;
        uint64 lastUpdate;
        bool active;
    }
    
    mapping(address => UserData) public userData;
}
```

#### Core Functions

**getScore() - Primary score getter**
```solidity
function getScore(address user) public view returns (uint16) {
    UserData memory data = userData[user];
    
    if (!data.active) return NEUTRAL_SCORE;
    
    uint16 total = data.verificationScore 
                 + data.transactionScore 
                 + data.socialScore 
                 + data.timeScore 
                 + data.merchantScore;
    
    if (total > MAX_SCORE) return MAX_SCORE;
    return total;
}
```

**updateScore() - Score adjustment**
```solidity
function updateScore(
    address user,
    string calldata component,
    int16 delta
) external onlyAuthorized {
    UserData storage data = userData[user];
    
    if (keccak256(bytes(component)) == keccak256("verification")) {
        data.verificationScore = _applyDelta(data.verificationScore, delta, 250);
    } else if (keccak256(bytes(component)) == keccak256("transaction")) {
        data.transactionScore = _applyDelta(data.transactionScore, delta, 250);
    }
    // ... other components
    
    data.lastUpdate = uint64(block.timestamp);
    emit ScoreUpdated(user, getScore(user));
}
```

**isHighTrust() / isLowTrust() - Quick checks**
```solidity
function isHighTrust(address user) external view returns (bool) {
    return getScore(user) >= highTrustThreshold;
}

function isLowTrust(address user) external view returns (bool) {
    return getScore(user) < lowTrustThreshold;
}
```

#### Integration Points
- **ProofScoreBurnRouter:** Queries score for every transfer
- **MerchantPortal:** Checks score for merchant registration (≥560)
- **CouncilManager:** Validates council eligibility (≥700)
- **DAO:** Checks score for proposal creation (≥700)

---

### 3. VaultInfrastructure.sol

**Purpose:** User balance containers - VFIDE held in Vaults, not wallets

#### Vault Architecture
```
User Wallet
    ↓
    Creates Vault Contract
    ↓
Vault Address (holds VFIDE)
    ↓
    User controls via VaultHub
    ↓
Transfer/Payment (fees applied)
```

#### State Variables
```solidity
contract VaultHub {
    mapping(address => address) public vaultOf;     // user → vault
    mapping(address => bool) public isVault;        // vault → true
    mapping(address => address) public ownerOf;     // vault → owner
    
    address public vfideToken;
    address public securityHub;
    
    address[] public allVaults;
}
```

#### Core Functions

**createVault() - Deploy user's vault**
```solidity
function createVault(address owner) external returns (address) {
    require(vaultOf[owner] == address(0), "Vault exists");
    
    // Deploy new Vault contract
    Vault vault = new Vault(owner, vfideToken);
    address vaultAddr = address(vault);
    
    // Register mappings
    vaultOf[owner] = vaultAddr;
    ownerOf[vaultAddr] = owner;
    isVault[vaultAddr] = true;
    allVaults.push(vaultAddr);
    
    emit VaultCreated(owner, vaultAddr);
    return vaultAddr;
}
```

**getVaultBalance() - Query user balance**
```solidity
function getVaultBalance(address owner) external view returns (uint256) {
    address vault = vaultOf[owner];
    if (vault == address(0)) return 0;
    
    return IERC20(vfideToken).balanceOf(vault);
}
```

#### Vault Contract
```solidity
contract Vault {
    address public owner;
    IERC20 public vfide;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function withdraw(address to, uint256 amount) external onlyOwner {
        // Transfer triggers VFIDEToken fee logic
        require(vfide.transfer(to, amount), "Transfer failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
```

#### Integration Points
- **VFIDEToken:** Validates all transfers go to vaults
- **MerchantPortal:** Queries customer/merchant vault balances
- **All UI:** Shows vault balance as "user balance"

---

### 4. ProofScoreBurnRouter.sol

**Purpose:** Dynamic fee calculation based on ProofScore

#### Fee Structure (FINAL)
```
Elite (Score 800-1000):
├── Total: 0.25%
├── Burn: 0%
├── Sanctum: 0.05%
└── Ecosystem: 0.2%

Normal (Score 400-799):
├── Total: 1.75%
├── Burn: 1.5%
├── Sanctum: 0.05%
└── Ecosystem: 0.2%

Low Trust (Score 0-399):
├── Total: 5%
├── Burn: 4.75%
├── Sanctum: 0.05%
└── Ecosystem: 0.2%
```

#### State Variables
```solidity
contract ProofScoreBurnRouter {
    // Base fee components (BPS = basis points, 100 = 1%)
    uint16 public baseBurnBps = 150;           // 1.5% base burn
    uint16 public baseSanctumBps = 5;          // 0.05% sanctum
    uint16 public baseEcosystemBps = 20;       // 0.2% ecosystem
    
    // Score adjustments
    uint16 public highTrustReduction = 150;    // -1.5% for elite (enables 0.25%)
    uint16 public lowTrustPenalty = 325;       // +3.25% for low trust (creates 5%)
    uint16 public maxTotalBps = 500;           // 5% maximum total
    
    // Module addresses
    ISeer public seer;                         // VFIDETrust
    address public sanctumSink;                // SanctumVault
    address public ecosystemSink;              // EcosystemVault
    address public burnSink;                   // 0xdead
}
```

#### Core Functions

**computeFees() - Main fee calculation**
```solidity
function computeFees(
    address from,
    address to,
    uint256 amount
) external view returns (
    uint256 burnAmount,
    uint256 sanctumAmount,
    uint256 ecosystemAmount,
    address sanctumSink_,
    address ecosystemSink_,
    address burnSink_
) {
    if (amount == 0) return (0, 0, 0, sanctumSink, ecosystemSink, burnSink);
    
    // Get sender's ProofScore
    uint16 score = seer.getScore(from);
    
    // Calculate total fee BPS
    uint256 totalBps;
    uint256 burnBps = baseBurnBps;
    
    if (score >= 800) {
        // Elite: Reduce burn to 0, keep sanctum/ecosystem
        burnBps = 0;
        totalBps = baseSanctumBps + baseEcosystemBps; // 0.25%
    } else if (score >= 400) {
        // Normal: Base rates
        totalBps = baseBurnBps + baseSanctumBps + baseEcosystemBps; // 1.75%
    } else {
        // Low Trust: Add penalty
        burnBps = baseBurnBps + lowTrustPenalty; // 4.75%
        totalBps = burnBps + baseSanctumBps + baseEcosystemBps; // 5%
    }
    
    // Cap at maximum
    if (totalBps > maxTotalBps) totalBps = maxTotalBps;
    
    // Calculate amounts
    burnAmount = (amount * burnBps) / 10000;
    sanctumAmount = (amount * baseSanctumBps) / 10000;
    ecosystemAmount = (amount * baseEcosystemBps) / 10000;
    
    return (
        burnAmount,
        sanctumAmount,
        ecosystemAmount,
        sanctumSink,
        ecosystemSink,
        burnSink
    );
}
```

#### Integration Points
- **VFIDEToken:** Calls computeFees() on every transfer
- **VFIDETrust:** Queries ProofScore for fee calculation
- **SanctumVault:** Receives 0.05% charity fee
- **EcosystemVault:** Receives 0.2% development fee

---

## Treasury & Economics

### EcosystemVault.sol

**Purpose:** Development & marketing treasury (receives 0.2% fee)

#### Fund Allocation
```
Monthly Distribution:
├── 60% Operations Budget
│   ├── Hosting & infrastructure (10%)
│   ├── Security audits (15%)
│   ├── Marketing campaigns (25%)
│   ├── Development costs (30%)
│   ├── Exchange listings (15%)
│   └── Legal & compliance (5%)
│
└── 40% Council Salaries
    └── Split evenly among active members
```

#### State Variables
```solidity
contract EcosystemVault is Ownable {
    IERC20 public vfide;
    mapping(address => bool) public isManager;     // Authorized spenders
    
    // Budget tracking
    uint256 public monthlyOperationsBudget;
    uint256 public monthlyCouncilBudget;
    uint256 public lastDistribution;
    
    // Spending categories
    enum Category { Hosting, Audits, Marketing, Development, Listings, Legal, Other }
    mapping(Category => uint256) public categorySpent;
    mapping(Category => uint256) public categoryBudgets;
}
```

#### Core Functions

**payExpense() - Operations spending**
```solidity
function payExpense(
    address recipient,
    uint256 amount,
    string calldata reason
) external onlyManager {
    require(vfide.balanceOf(address(this)) >= amount, "Insufficient funds");
    require(vfide.transfer(recipient, amount), "Transfer failed");
    
    emit PaymentMade(recipient, amount, reason);
}
```

**distributeMonthly() - Council payment**
```solidity
function distributeMonthly() external {
    require(block.timestamp >= lastDistribution + 30 days, "Too soon");
    
    uint256 vaultBalance = vfide.balanceOf(address(this));
    
    // Calculate budgets
    monthlyOperationsBudget = (vaultBalance * 6000) / 10000;  // 60%
    monthlyCouncilBudget = (vaultBalance * 4000) / 10000;      // 40%
    
    // Council payment handled by CouncilManager
    
    lastDistribution = block.timestamp;
}
```

**burnFunds() - Optional deflationary**
```solidity
function burnFunds(uint256 amount) external onlyManager {
    require(vfide.balanceOf(address(this)) >= amount, "Insufficient funds");
    address dead = 0x000000000000000000000000000000000000dEaD;
    require(vfide.transfer(dead, amount), "Burn failed");
    
    emit FundsBurned(amount);
}
```

#### Integration Points
- **ProofScoreBurnRouter:** Sends 0.2% ecosystem fee here
- **CouncilManager:** Claims monthly council salaries
- **DAO:** Approves large expenditures via proposals

---

### SanctumVault.sol

**Purpose:** Charity treasury (receives 0.05% fee)

#### Charity Distribution
```
Quarterly Distribution:
├── 67% Rotating Charities (community voted)
├── 17% Ecosystem Development Grants
└── 17% Fixed Causes (disaster relief, open source)
```

#### Core Functions

**addCharity() - Register recipient**
```solidity
function addCharity(address charity, uint256 basisPoints) external onlyDAO {
    require(totalAllocation + basisPoints <= 10000, "Exceeds 100%");
    
    charities.push(charity);
    allocations[charity] = basisPoints;
    totalAllocation += basisPoints;
}
```

**distributeFunds() - Quarterly payout**
```solidity
function distributeFunds() external {
    require(block.timestamp >= lastDistribution + 90 days);
    
    uint256 balance = vfide.balanceOf(address(this));
    
    for (uint i = 0; i < charities.length; i++) {
        address charity = charities[i];
        uint256 amount = (balance * allocations[charity]) / 10000;
        
        vfide.transfer(charity, amount);
        emit CharityPaid(charity, amount);
    }
    
    lastDistribution = block.timestamp;
}
```

---

### PromotionalTreasury.sol

**Purpose:** Fixed 2M VFIDE promotional budget (1% of supply)

#### Allocation Breakdown
```
Total: 2,000,000 VFIDE (FIXED - No refills)

Categories:
├── Education: 300K (10K users × 30 VFIDE)
├── Referrals: 500K (Single-level, 20 max per user)
├── Milestones: 400K (Activity-based)
├── Merchant: 600K (Volume-based)
└── Pioneer: 200K (First 10K users, 12-month benefits)

Rules:
- Depletes automatically (no refills)
- Per-user caps prevent farming
- Single-level referrals only (no MLM)
- Time-limited benefits (12 months max)
```

#### Core Functions

**claimEducationReward()**
```solidity
function claimEducationReward(string memory milestone) external {
    require(isPromotionActive(), "Budget depleted");
    require(educationClaimed[msg.sender] < 30e18, "Cap reached");
    
    uint256 reward = 30e18;
    educationBudget -= reward;
    educationClaimed[msg.sender] += reward;
    
    vfide.transfer(msg.sender, reward);
}
```

**claimReferralBonus()**
```solidity
function claimReferralBonus(address referee) external {
    require(isPromotionActive(), "Budget depleted");
    require(referralCount[msg.sender] < 20, "Max 20 referrals");
    require(seer.getScore(referee) >= 500, "Referee ineligible");
    
    uint256 reward = 50e18;
    referralBudget -= reward;
    referralCount[msg.sender]++;
    
    vfide.transfer(msg.sender, reward);
}
```

---

## Commerce Layer

### MerchantPortal.sol

**Purpose:** Zero-fee payment processing

#### Key Features
- **0% Merchant Fees** - Merchants receive 100% of payment
- **Multi-Token** - VFIDE + stablecoins (USDC, USDT, DAI)
- **Instant Settlement** - No holds (unless escrow requested)
- **Min ProofScore** - Must have ≥560 to register

#### State Variables
```solidity
contract MerchantPortal {
    uint256 public protocolFeeBps = 0;              // 0% merchant fees
    uint16 public minMerchantScore = 560;
    
    IVaultHub public vaultHub;
    ISeer public seer;
    
    struct MerchantInfo {
        bool registered;
        bool suspended;
        string businessName;
        string category;
        uint64 registeredAt;
        uint256 totalVolume;
        uint256 txCount;
        address payoutAddress;                      // Optional redirect
    }
    
    mapping(address => MerchantInfo) public merchants;
    mapping(address => bool) public acceptedTokens;
}
```

#### Core Functions

**registerMerchant() - Automatic, No KYC**
```solidity
function registerMerchant(
    string calldata businessName,
    string calldata category
) external {
    require(seer.getScore(msg.sender) >= minMerchantScore, "Score too low");
    require(!merchants[msg.sender].registered, "Already registered");
    
    // Automatic approval - no manual review, no KYC
    merchants[msg.sender] = MerchantInfo({
        registered: true,
        suspended: false,
        businessName: businessName,
        category: category,
        registeredAt: uint64(block.timestamp),
        totalVolume: 0,
        txCount: 0,
        payoutAddress: address(0)
    });
    
    emit MerchantRegistered(msg.sender, businessName);
    
    // NO KYC, NO DOCUMENTS, NO WAITING
    // Wallet signature proves ownership
    // ProofScore ensures quality
}
```

**processPayment() - Main payment function**
```solidity
function processPayment(
    address customer,
    address merchant,
    address token,
    uint256 amount,
    string calldata orderId
) external {
    require(merchants[merchant].registered, "Merchant not registered");
    require(!merchants[merchant].suspended, "Merchant suspended");
    require(acceptedTokens[token], "Token not accepted");
    
    // Get customer and merchant vaults
    address customerVault = vaultHub.vaultOf(customer);
    address merchantVault = vaultHub.vaultOf(merchant);
    
    require(customerVault != address(0), "Customer has no vault");
    require(merchantVault != address(0), "Merchant has no vault");
    
    // Get payout destination (vault or custom address)
    address recipient = merchants[merchant].payoutAddress != address(0)
        ? merchants[merchant].payoutAddress
        : merchantVault;
    
    // Transfer full amount (0% fees)
    require(
        IERC20(token).transferFrom(customerVault, recipient, amount),
        "Payment failed"
    );
    
    // Update stats
    merchants[merchant].totalVolume += amount;
    merchants[merchant].txCount++;
    
    emit PaymentProcessed(customer, merchant, token, amount, 0, orderId);
}
```

#### Integration Points
- **VaultHub:** Queries customer/merchant vaults
- **VFIDETrust:** Validates merchant/customer scores
- **ProofLedger:** Logs all payments

---

## Security & Emergency

### VFIDESecurity.sol (SecurityHub)

**Purpose:** Emergency controls and security measures

#### Security Features
```
1. PanicGuard - Immediate freeze (any guardian)
2. GuardianLock - DAO-controlled pause
3. Address Blacklist - Block malicious actors
4. Contract Whitelist - Approve system contracts
```

#### State Variables
```solidity
contract VFIDESecurity {
    bool public panicActive;                    // Emergency freeze
    bool public guardianLockActive;             // DAO freeze
    
    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isWhitelisted;
    
    address public dao;
    address[] public guardians;                 // Emergency responders
}
```

#### Core Functions

**triggerPanic() - Emergency stop**
```solidity
function triggerPanic(string calldata reason) external {
    require(isGuardian[msg.sender], "Not guardian");
    
    panicActive = true;
    emit PanicActivated(msg.sender, reason);
    
    // Freezes ALL token transfers
    // Requires DAO vote to deactivate
}
```

**isLocked() - System status check**
```solidity
function isLocked() external view returns (bool) {
    return panicActive || guardianLockActive;
}
```

**blacklistAddress() - Ban malicious user**
```solidity
function blacklistAddress(address addr, string calldata reason) external onlyDAO {
    isBlacklisted[addr] = true;
    emit AddressBlacklisted(addr, reason);
}
```

#### Integration Points
- **VFIDEToken:** Checks isLocked() before every transfer
- **DAO:** Controls guardian lock and blacklist

---

## Frontend Integration

### User Balance Display
```javascript
// Get user's VFIDE balance
const vaultAddress = await vaultHub.vaultOf(userAddress);
const balance = await vfideToken.balanceOf(vaultAddress);
const formatted = ethers.utils.formatUnits(balance, 18);

// Display: "1,234.56 VFIDE"
```

### ProofScore Widget
```javascript
// Get user's trust level and fees
const score = await vfideTrust.getScore(userAddress);

let tier, feeRate;
if (score >= 800) {
    tier = "Elite";
    feeRate = "0.25%";
} else if (score >= 400) {
    tier = "Normal";
    feeRate = "1.75%";
} else {
    tier = "Low Trust";
    feeRate = "5%";
}

// Display trust badge and fee rate
```

### Merchant Payment
```javascript
// Process payment (merchant receives 100%)
await merchantPortal.processPayment(
    customerAddress,
    merchantAddress,
    vfideTokenAddress,
    ethers.utils.parseUnits("100", 18),  // 100 VFIDE
    "ORDER_123456"
);

// Merchant receives exactly 100 VFIDE (0% fees)
```

### DAO Voting
```javascript
// Create proposal
const proposalId = await dao.createProposal(
    [targetContract],
    [0],
    [encodedFunctionCall],
    "Proposal: Increase marketing budget"
);

// Vote
await dao.castVote(proposalId, true);  // true = support

// Check status
const proposal = await dao.proposals(proposalId);
console.log(`Votes: ${proposal.forVotes} / ${proposal.againstVotes}`);
```

### Council Dashboard
```javascript
// Get council info
const members = await councilManager.getActiveMembers();
const myScore = await seer.getScore(myAddress);
const isEligible = myScore >= 700;

// Check payment status
const nextPayment = await councilManager.nextPaymentDate();
const expectedAmount = await councilManager.estimateMonthlyPayment();
```

---

## Deployment Guide

### Phase 1: Core Infrastructure (Day 1)
```
1. Deploy VFIDEToken (mint 40M to temp address)
2. Deploy DevReserveVestingVault
3. Transfer 40M VFIDE to DevReserveVestingVault
4. Deploy VaultHub (VaultInfrastructure)
5. Deploy VFIDETrust (Seer)
6. Deploy ProofScoreBurnRouter
7. Set VFIDEToken modules (vaultHub, seer, burnRouter)
```

### Phase 2: Governance (Day 2)
```
8. Deploy CouncilManager (3 initial members)
9. Deploy DAO
10. Deploy DAOTimelock
11. Deploy VFIDESecurity (SecurityHub)
12. Transfer ownership to CouncilManager/DAO
```

### Phase 3: Treasury (Day 3)
```
13. Deploy SanctumVault
14. Deploy EcosystemVault
15. Deploy PromotionalTreasury
16. Fund PromotionalTreasury with 2M VFIDE
17. Set ProofScoreBurnRouter sinks
```

### Phase 4: Commerce (Day 4)
```
18. Deploy MerchantPortal
19. Deploy VFIDECommerce
20. Deploy EscrowManager
21. Deploy SubscriptionManager
```

### Phase 5: Presale (30 Days, Optional) - 75M VFIDE, No KYC
```
22. Deploy VFIDEPresale contract
    - Supply: 75,000,000 VFIDE (37.5% of total supply)
    - Price: Dynamic bonding curve (starts $0.10, ends $0.20 per VFIDE)
    - Max per wallet: 500,000 VFIDE (~0.67% of presale, prevents whales)
    - Vesting: 25% immediate, 75% linear over 6 months
    - Duration: 30 days from deployment
    
23. Presale requirements (NO KYC):
    - ✅ Accept Terms of Service (on-chain attestation)
    - ✅ Attest age 18+ (self-certification)
    - ✅ Attest not in sanctioned countries (OFAC compliance)
    - ❌ NO identity verification
    - ❌ NO document submission
    - ❌ NO email or personal info
    
24. Anti-bot protections:
    - Max gas price: 200 gwei (prevents MEV bots)
    - Rate limit: 5 minutes between purchases per wallet
    - Supply cap: 75M hard limit (burns unsold)
    
25. USA Legal compliance:
    - UTILITY TOKEN SALE (not securities offering)
    - No profit promises, no investment contract
    - Self-attestation only (no KYC required)
    - First Amendment protected (software as speech)
    - Non-custodial (buyers withdraw immediately)
```

### Phase 6: DEX Launch (Day 31+)
```
26. Finalize presale (burn unsold tokens if any)
27. Add initial liquidity to Uniswap
    - 20M VFIDE + $300K ETH
    - Lock liquidity for 12 months (Unicrypt)
    
28. List on multiple DEXs
    - PancakeSwap (BSC)
    - QuickSwap (Polygon)
    - TraderJoe (Avalanche)
    
29. Submit to aggregators
    - CoinGecko (free)
    - CoinMarketCap (free)
    - DexTools (automatic)
    - DexScreener (automatic)
```

### Phase 7: Launch (Same Day as DEX)
```
30. Lock VFIDEToken policy (vault-only permanent)
31. Activate all promotional rewards
32. Open merchant registrations (automatic)
33. Begin community building (Discord, Twitter, Telegram)
34. Anyone can trade immediately on DEX
35. Presale buyers can claim vested tokens monthly
```

### Phase 8: CEX Listings (Months 3-12)
```
Month 3: Apply to MEXC or Gate.io
- Community voting (free) or
- Direct listing ($30K-$50K)
- Requirements: Volume + community

Month 6: Apply to BitMart, HTX
- $40K-$100K listing fees
- Show growth metrics

Month 9: Apply to Bybit, KuCoin
- $150K-$300K listing fees
- Need $10M+ market cap
- Multiple existing listings

Month 12+: Binance consideration
- Community demand driven
- "When Binance?" campaigns
- Free if volume warrants

NO KYC REQUIRED FOR USERS ON ANY EXCHANGE
```

---

## Legal Compliance (USA)

### Regulatory Status: Utility Token Protocol

**Classification:**
```
✅ Utility Token (Not Security)
- Used for payments (actual utility)
- No profit promises
- Decentralized governance (DAO)
- Open source software

✅ Software Protocol (Not Financial Service)
- Released as open source code
- No custody of funds (self-custodial vaults)
- No KYC required (not money transmitter)
- Users interact peer-to-peer

✅ Protected Activity
- First Amendment (code = speech)
- Like Uniswap, Metamask, Bitcoin Core
- Developers not liable for user actions
```

### Legal Safeguards

**1. No Securities Offering:**
```
❌ No investment contract
❌ No promise of returns
❌ No expectation of profit from team efforts
✅ Just software that enables payments
✅ Value comes from utility, not speculation
```

**2. No Money Transmission:**
```
❌ Team never holds user funds
❌ No fiat on/off ramps operated by team
❌ No conversion services
✅ Users control own vaults (smart contracts)
✅ Peer-to-peer transfers only
✅ Like Venmo uses Plaid (we're the rails)
```

**3. Decentralized From Day 1:**
```
✅ DAO controls protocol (not team)
✅ No admin keys or backdoors
✅ Immutable contracts post-launch
✅ Community governance
✅ Open source (anyone can fork)
```

**4. Privacy Preserved:**
```
✅ Zero KYC collection (no user data)
✅ No GDPR liability (no personal info stored)
✅ Pseudonymous by default
✅ On-chain reputation only
```

**5. Terms of Service:**
```
✅ "Software provided as-is"
✅ "Use at your own risk"
✅ "Not financial advice"
✅ Liability disclaimers
✅ Arbitration clauses
```

**6. No Geo-Restrictions:**
```
✅ Global protocol (not USA-specific)
✅ Anyone anywhere can use
✅ No targeting US residents
✅ Available worldwide equally
```

### Legal Precedents Supporting VFIDE:

**Tornado Cash (2024):**
- Code is protected speech (First Amendment)
- Developers not liable for protocol use
- Immutable smart contracts are tools, not services

**Uniswap (2023):**
- SEC declined to pursue case
- DEX protocol = software, not exchange
- No registration required for protocols

**Compound, Aave (Ongoing):**
- Major DeFi protocols, USA teams
- Zero KYC, fully decentralized
- Billions in TVL, no regulatory action
- Model for compliant DeFi

### Compliance Checklist:

```
✅ No custody of user funds
✅ No fiat operations
✅ No investment promises
✅ Decentralized governance
✅ Open source code
✅ No KYC required
✅ Terms of service posted
✅ Liability disclaimers
✅ No geo-blocking
✅ Educational content only (no financial advice)
```

**Result: USA Legal, Privacy-Preserving, Globally Accessible**

---

## Testing Requirements

### Unit Tests (Per Contract)
```
✅ All public functions execute without revert
✅ Access control (onlyOwner, onlyDAO, etc.)
✅ State changes reflect correctly
✅ Events emitted properly
✅ Edge cases (zero amounts, max values)
✅ Revert messages accurate
```

### Integration Tests (Cross-Contract)
```
✅ Token transfer → fee calculation → vault updates
✅ Merchant payment → portal → vault → ledger
✅ DAO proposal → voting → timelock → execution
✅ ProofScore change → fee tier shift
✅ Council member removal → election → payment adjustment
✅ Emergency pause → all transfers blocked
```

### Governance Tests
```
✅ Council voting (2/3, 3/5 thresholds)
✅ ProofScore auto-removal (<700 for 7 days)
✅ Missed vote removal (3 consecutive)
✅ Monthly payment distribution
✅ Operations priority over salaries
✅ Election process (nomination → voting → finalization)
```

### Security Tests
```
✅ Reentrancy protection
✅ Integer overflow/underflow
✅ Unauthorized access attempts
✅ Front-running resistance
✅ Flash loan attacks
✅ Governance takeover attempts
✅ Emergency pause effectiveness
```

### Stress Tests
```
✅ 10K users, 100K transactions
✅ Gas costs at scale
✅ Concurrent proposal voting
✅ Vault creation bottlenecks
✅ Large treasury withdrawals
```

---

## Current Status

### ✅ Completed
- 30 core contracts implemented
- Fee structure finalized (0.25%/1.75%/5%)
- Governance model defined (merit-based council)
- Treasury allocation clear (60% ops, 40% council)
- Merchant portal (0% fees)
- Promotional treasury (2M fixed)

### ⏳ In Progress
- Full test suite (70% coverage)
- Frontend integration
- CouncilManager updates (daily checks, payment logic)
- Operations budgeting system

### 📋 Pending
- External security audit
- Testnet deployment
- Frontend completion
- Mobile app development
- Presale marketing materials

---

## Next Steps

1. **Review & Finalize Blueprint** - Ensure all specs match vision
2. **Update Contracts** - Implement CouncilManager, payment logic
3. **Complete Testing** - 100% coverage before audit
4. **Frontend Integration** - Connect UI to smart contracts
5. **Testnet Launch** - 30-day stress test
6. **Security Audit** - External firm review
7. **Presale Preparation** - Marketing, KYC setup
8. **Mainnet Launch** - Deploy to zkSync Era

---

**End of Blueprint v1.0**

*This document is the single source of truth for VFIDE system architecture. All contract implementations, frontend code, and documentation must match these specifications.*
