# VFIDE Protocol Whitepaper

**Version 1.0 | January 2026**

<div align="center">

## A Trust-Based Decentralized Payment Protocol

*Building the Future of Reputation-Driven Commerce*

</div>

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction & Problem Statement](#2-introduction--problem-statement)
3. [The VFIDE Solution](#3-the-vfide-solution)
4. [ProofScore System](#4-proofscore-system)
5. [Token Economics](#5-token-economics)
6. [Fee Structure & Revenue Distribution](#6-fee-structure--revenue-distribution)
7. [Smart Contract Architecture](#7-smart-contract-architecture)
8. [Governance System](#8-governance-system)
9. [Merchant Portal](#9-merchant-portal)
10. [Escrow System](#10-escrow-system)
11. [Vault System](#11-vault-system)
12. [Badge & Gamification System](#12-badge--gamification-system)
13. [Mentorship Program](#13-mentorship-program)
14. [Headhunter Referral Program](#14-headhunter-referral-program)
15. [Multi-Chain Deployment](#15-multi-chain-deployment)
16. [Security Model](#16-security-model)
17. [Technical Implementation](#17-technical-implementation)
18. [Roadmap](#18-roadmap)
19. [Streaming Payments (Payroll)](#19-streaming-payments-payroll)
20. [STABLE-PAY (Auto-Conversion)](#20-stable-pay-auto-conversion)
21. [Stealth Addresses (Private Pay)](#21-stealth-addresses-private-pay)
22. [Guardian System](#22-guardian-system)
23. [Multi-Signature Operations](#23-multi-signature-operations)
24. [Time Locks](#24-time-locks)
25. [Liquidity Incentives](#25-liquidity-incentives)
26. [Cross-Chain Features](#26-cross-chain-features)
27. [Subscriptions (Recurring Payments)](#27-subscriptions-recurring-payments)
28. [Budgets & Spending Limits](#28-budgets--spending-limits)
29. [Tax Reporting](#29-tax-reporting)
30. [Endorsement System](#30-endorsement-system)
31. [Social Features](#31-social-features)
32. [Reward Rate Limits (Anti-Farming)](#32-reward-rate-limits-anti-farming)
33. [Enterprise Gateway](#33-enterprise-gateway)
34. [Invite System](#34-invite-system)
35. [Complete Fee Reference](#35-complete-fee-reference)
36. [Glossary](#36-glossary)
37. [Testnet & Development](#37-testnet--development)
38. [User Profile](#38-user-profile)
39. [Legal Considerations](#39-legal-considerations)
40. [Conclusion](#40-conclusion)

---

## 1. Executive Summary

VFIDE is a **trust-based decentralized payment protocol** that fundamentally reimagines how transaction fees are calculated. Unlike traditional payment systems where all users pay identical fees regardless of their behavior or history, VFIDE implements a dynamic fee structure based on each user's **ProofScore** — a transparent, on-chain reputation metric.

### Core Innovation

**The VFIDE Premise:** Users who demonstrate trustworthy behavior pay lower transaction fees, while users with poor reputations pay higher fees. This creates a positive-sum game where:

- Good actors are rewarded with reduced costs
- Bad actors bear higher costs that fund ecosystem development
- The community self-regulates through endorsements and governance
- Token supply is deflationary through continuous burns

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Token Supply | 200,000,000 VFIDE (Fixed) |
| Fee Range | 0.25% – 5.0% (based on ProofScore) |
| Burn Rate | 62.5% of all fees |
| Governance Threshold | 5,400+ ProofScore |
| Merchant Threshold | 5,600+ ProofScore |
| Council Threshold | 7,000+ ProofScore |

---

## 2. Introduction & Problem Statement

### 2.1 The Trust Problem in Digital Payments

Traditional payment systems treat all participants equally, regardless of their history or behavior. A first-time user with no track record pays the same 2.9% + $0.30 as a verified merchant with 10,000 successful transactions. This creates several problems:

1. **No incentive for good behavior** — Users gain nothing from maintaining positive reputations
2. **Fraud externalities** — Honest users subsidize fraud losses through uniform fees
3. **Centralized trust** — Platforms like PayPal act as trust authorities, extracting fees for this service
4. **Chargeback abuse** — Merchants lose billions annually to fraudulent chargebacks
5. **Limited recourse** — Dispute resolution is slow, opaque, and biased toward buyers

### 2.2 The Crypto Payment Problem

Existing cryptocurrency payment solutions haven't solved these problems:

- **Flat fees** — Same gas costs for trusted and untrusted users
- **No reputation** — No on-chain identity or trust scoring
- **Payment friction** — Complex wallet interactions deter mainstream adoption
- **Volatility risk** — Merchants hesitate to accept volatile assets

### 2.3 The Opportunity

VFIDE addresses these gaps by creating a **trust layer** for blockchain payments. By encoding reputation on-chain and dynamically adjusting fees based on behavior, we create:

- **Aligned incentives** — Users want to build trust to reduce costs
- **Self-regulating ecosystem** — Community identifies bad actors
- **Transparent scoring** — All reputation data is verifiable on-chain
- **Merchant confidence** — Trust scores enable informed decisions

---

## 3. The VFIDE Solution

### 3.1 Core Components

VFIDE is built on five foundational pillars:

```
┌─────────────────────────────────────────────────────────────┐
│                      VFIDE PROTOCOL                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  ProofScore  │  │    Vault     │  │   Merchant   │      │
│  │    Engine    │  │    System    │  │    Portal    │      │
│  │   (Seer)     │  │  (VaultHub)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     DAO      │  │    Escrow    │  │    Badge     │      │
│  │  Governance  │  │    System    │  │    System    │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Revenue Splitter                       │    │
│  │    (Burn + Sanctum + Ecosystem Distribution)        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 User Journey

1. **Connect Wallet** → User connects MetaMask, Coinbase, or WalletConnect
2. **Create Vault** → Personal smart contract wallet deployed
3. **Build Reputation** → ProofScore starts at 5,000 (neutral)
4. **Transact** → Fees calculated based on current ProofScore
5. **Participate** → Vote on governance, earn badges, mentor others
6. **Unlock Benefits** → Higher scores unlock lower fees and more features

---

## 4. ProofScore System

### 4.1 Overview

The **ProofScore** is VFIDE's reputation metric, ranging from 0 to 10,000. It is calculated and stored on-chain by the **Seer** smart contract. Every user action that affects trust is recorded immutably.

### 4.2 Score Tiers

| Tier | Score Range | Fee Rate | Permissions |
|------|-------------|----------|-------------|
| 🔴 Risky | 0 – 3,499 | 5.0% | Basic transfers only |
| 🟠 Low Trust | 3,500 – 4,999 | 3.5% | Basic transfers only |
| 🟡 Neutral | 5,000 – 5,399 | 2.0% | New user default |
| 🔵 Governance | 5,400 – 5,599 | 2.0% | + DAO voting |
| 🟢 Trusted | 5,600 – 6,999 | 2.0% | + Merchant registration |
| 🟢 Council | 7,000 – 7,999 | 1.0% | + Council candidacy, mentorship |
| 🟢 Elite | 8,000 – 10,000 | 0.25% | + Endorsing, all features |

### 4.3 Score Components

ProofScore is calculated from multiple weighted factors:

```solidity
ProofScore = BaseScore 
           + VaultBonus 
           + TransactionPoints 
           + GovernancePoints 
           + BadgePoints 
           + EndorsementPoints 
           - PenaltyPoints
           - InactivityDecay
```

| Component | Max Points | Description |
|-----------|------------|-------------|
| Base Score | 5,000 | All users start here |
| Vault Bonus | 500 | Awarded when vault is created |
| Transaction Points | 1,500 | Earned from successful transfers |
| Governance Points | 500 | Earned from voting on proposals |
| Badge Points | 1,000 | Earned from achievement badges |
| Endorsement Points | 1,500 | Received from Elite user endorsements |
| Penalty Points | -2,000 | Deducted for disputes, fraud |
| Inactivity Decay | -500 | Gradual decay if inactive >30 days |

### 4.4 Score Calculation Formula

The Seer contract calculates fees using basis points (1 bps = 0.01%):

```solidity
function calculateFee(address user, uint256 amount) public view returns (uint256) {
    uint256 score = proofScore[user];
    uint256 feeBPS;
    
    if (score >= 8000) {
        feeBPS = 25;      // 0.25%
    } else if (score >= 7000) {
        feeBPS = 100;     // 1.0%
    } else if (score >= 5000) {
        feeBPS = 200;     // 2.0%
    } else if (score >= 4000) {
        feeBPS = 350;     // 3.5%
    } else {
        feeBPS = 500;     // 5.0%
    }
    
    return (amount * feeBPS) / 10000;
}
```

### 4.5 Score Update Events

ProofScore changes are triggered by on-chain events:

| Event | Points | Direction |
|-------|--------|-----------|
| Vault created | +500 | Increase |
| Successful transaction | +5-20 | Increase |
| Governance vote cast | +10-25 | Increase |
| Badge earned | +15-100 | Increase |
| Endorsement received | +30-50 | Increase |
| Mentee reaches 7,000 | +50 | Increase |
| Dispute lost | -50-200 | Decrease |
| Community report verified | -25-100 | Decrease |
| 30 days inactive | -5/day | Decrease |

---

## 5. Token Economics

### 5.1 Token Overview

| Property | Value |
|----------|-------|
| Name | VFIDE Token |
| Symbol | VFIDE |
| Decimals | 18 |
| Total Supply | 200,000,000 (Fixed, no inflation) |
| Token Standard | ERC-20 |
| Mechanism | Deflationary (burn on transfer) |

### 5.2 Token Distribution

```
┌────────────────────────────────────────────────────────────┐
│                 TOTAL SUPPLY: 200,000,000 VFIDE            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         TREASURY / OPERATIONS (50%)                 │  │
│  │                 100,000,000 VFIDE                   │  │
│  │  • Community rewards                                │  │
│  │  • Ecosystem development                            │  │
│  │  • DAO-governed allocations                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              PRESALE (25%)                          │  │
│  │                 50,000,000 VFIDE                    │  │
│  │  • 35M base allocation                              │  │
│  │  • 15M bonus pool (locks + referrals)               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           DEVELOPER RESERVE (25%)                   │  │
│  │                 50,000,000 VFIDE                    │  │
│  │  • 36-month vesting                                 │  │
│  │  • 60-day cliff                                     │  │
│  │  • Bi-monthly unlocks                               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.3 Presale Structure

#### 5.3.1 Presale Tiers

| Tier | Price | Token Cap | Total Raise | Discount vs Listing |
|------|-------|-----------|-------------|---------------------|
| Founding | $0.03 | 10,000,000 | $300,000 | 70-78% |
| Oath | $0.05 | 10,000,000 | $500,000 | 50-64% |
| Public | $0.07 | 15,000,000 | $1,050,000 | 30-50% |
| **Total** | — | **35,000,000** | **$1,850,000** | — |

**Projected Listing Price:** $0.10 – $0.14 (based on presale completion %)

#### 5.3.2 Lock Period Bonuses

From the 15,000,000 bonus pool:

| Lock Period | Bonus Tokens | Immediate Access | Unlock Schedule |
|-------------|--------------|------------------|-----------------|
| 180 Days | +30% | 10% | Full unlock at 180 days |
| 90 Days | +15% | 20% | Full unlock at 90 days |
| No Lock | 0% | 100% | Immediate delivery |

**Example:** Purchase 10,000 VFIDE with 180-day lock:
- Receive: 13,000 VFIDE total (+30%)
- Immediately: 1,300 VFIDE (10%)
- At unlock: 11,700 VFIDE

#### 5.3.3 Referral Bonuses

From the 15,000,000 bonus pool:

| Role | Bonus |
|------|-------|
| Referrer | +3% of referee's base purchase |
| Referee | +2% bonus on their purchase |

### 5.4 Developer Vesting Schedule

| Parameter | Value |
|-----------|-------|
| Total Allocation | 50,000,000 VFIDE |
| Vesting Period | 36 months |
| Cliff Period | 60 days |
| Unlock Frequency | Every 60 days (bi-monthly) |
| Per Unlock | ~2,778,000 VFIDE |
| Total Unlocks | 18 tranches |

```
Month 0-2:   No tokens (cliff period)
Month 2:     First unlock: 2,778,000 VFIDE
Month 4:     Second unlock: 2,778,000 VFIDE
...
Month 36:    Final unlock: 2,778,000 VFIDE
```

### 5.5 Deflationary Mechanism

VFIDE is designed to be **deflationary** — the total supply can only decrease over time:

1. **Fixed supply** — No new tokens can ever be minted
2. **Burn on transfer** — 62.5% of all fees are permanently burned
3. **Higher fees for risky users** — More tokens burned from untrusted activity
4. **Long-term scarcity** — Circulating supply continuously decreases

---

## 6. Fee Structure & Revenue Distribution

### 6.1 Transfer Fee Calculation

Every VFIDE transfer incurs a fee based on the sender's ProofScore:

| ProofScore | Fee Rate | Basis Points | Example (1,000 VFIDE) |
|------------|----------|--------------|----------------------|
| 8,000+ | 0.25% | 25 BPS | 2.5 VFIDE |
| 7,000-7,999 | 1.0% | 100 BPS | 10 VFIDE |
| 5,000-6,999 | 2.0% | 200 BPS | 20 VFIDE |
| 4,000-4,999 | 3.5% | 350 BPS | 35 VFIDE |
| <4,000 | 5.0% | 500 BPS | 50 VFIDE |

### 6.2 Revenue Splitter Contract

All collected fees are automatically distributed by the Revenue Splitter:

```
┌─────────────────────────────────────────────┐
│           COLLECTED TRANSFER FEE            │
│                (100%)                       │
└───────────────────┬─────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│   BURN    │ │  SANCTUM  │ │ ECOSYSTEM │
│  ADDRESS  │ │   VAULT   │ │   VAULT   │
│           │ │           │ │           │
│   62.5%   │ │   31.25%  │ │   6.25%   │
│ (200/320) │ │ (100/320) │ │ (20/320)  │
└───────────┘ └───────────┘ └───────────┘
      │             │             │
      ▼             ▼             ▼
  Permanently   Community      Operations
   Destroyed     Charity       & Rewards
```

### 6.3 Ecosystem Vault Allocation

The 6.25% flowing to the Ecosystem Vault is further allocated:

| Category | Percentage | Purpose |
|----------|------------|---------|
| Council Salaries | 40% | Compensation for council members |
| Merchant Rewards | 25% | Incentives for merchant adoption |
| Headhunter Bounties | 20% | Referral program rewards |
| Operations | 15% | Development, infrastructure, marketing |

### 6.4 Sanctum Vault (Charity Fund)

The Sanctum Vault (31.25% of fees) is a community charity fund:

- DAO-governed disbursements
- Supports verified charitable causes
- Quarterly voting on allocation
- Full transparency on all transfers

---

## 7. Smart Contract Architecture

### 7.1 Contract Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VFIDE CONTRACT SUITE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CORE CONTRACTS                                             │
│  ├── VFIDEToken.sol        ERC-20 token with burn hooks    │
│  ├── Seer.sol              ProofScore oracle & calculator  │
│  ├── VaultHub.sol          User vault factory & registry   │
│  └── RevenueSplitter.sol   Fee distribution logic          │
│                                                             │
│  COMMERCE CONTRACTS                                         │
│  ├── MerchantPortal.sol    Merchant registration & mgmt    │
│  ├── Escrow.sol            Secure payment escrow           │
│  └── PaymentRouter.sol     Direct & escrow routing         │
│                                                             │
│  GOVERNANCE CONTRACTS                                       │
│  ├── DAO.sol               Proposal & voting logic         │
│  ├── DAOTimelock.sol       Execution delay for safety      │
│  ├── Council.sol           Council member management       │
│  └── CouncilElection.sol   Election mechanics              │
│                                                             │
│  AUXILIARY CONTRACTS                                        │
│  ├── VFIDEBadgeNFT.sol     Achievement badge NFTs          │
│  ├── EcosystemVault.sol    Rewards & headhunter pool       │
│  ├── SanctumVault.sol      Charity fund management         │
│  ├── DevReserveVesting.sol Developer token vesting         │
│  └── VFIDEPresale.sol      Presale tier & bonus logic      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Core Contract Details

#### 7.2.1 VFIDEToken.sol

```solidity
// Key functions
function transfer(address to, uint256 amount) external returns (bool);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
function burn(uint256 amount) external;

// Hooks
function _beforeTransfer(address from, uint256 amount) internal {
    uint256 fee = seer.calculateFee(from, amount);
    _processFee(fee);
}
```

#### 7.2.2 Seer.sol (ProofScore Oracle)

```solidity
// Key functions
function getScore(address account) external view returns (uint256);
function calculateFee(address account, uint256 amount) external view returns (uint256);
function updateScore(address account, int256 delta) external onlyAuthorized;
function endorseUser(address target) external;

// Score thresholds
uint256 constant GOVERNANCE_THRESHOLD = 5400;
uint256 constant MERCHANT_THRESHOLD = 5600;
uint256 constant COUNCIL_THRESHOLD = 7000;
uint256 constant ELITE_THRESHOLD = 8000;
```

#### 7.2.3 VaultHub.sol

```solidity
// Key functions
function createVault() external returns (address);
function getVault(address owner) external view returns (address);
function deposit(uint256 amount) external;
function withdraw(uint256 amount) external;
function getVaultInfo(address vault) external view returns (VaultInfo);
```

### 7.3 Upgrade Strategy

All upgradeable contracts use the **UUPS proxy pattern**:

- Allows bug fixes and improvements
- 48-hour timelock on all upgrades
- Requires DAO approval for upgrades
- Upgrade keys held by council multisig (5/7)

---

## 8. Governance System

### 8.1 DAO Structure

VFIDE is governed by a Decentralized Autonomous Organization (DAO) where token holders with sufficient ProofScore can participate in protocol decisions.

### 8.2 Governance Thresholds

| Action | Minimum ProofScore | Additional Requirements |
|--------|-------------------|------------------------|
| Vote on proposals | 5,400+ | None |
| Create proposals | 7,000+ | Council member |
| Run for Council | 7,000+ | 30+ days at threshold |
| Endorse candidates | 8,000+ | Elite status |

### 8.3 Proposal Types

| Type | Voting Period | Timelock | Quorum | Use Case |
|------|---------------|----------|--------|----------|
| Parameter Change | 7 days | 48 hours | 5,000 votes | Fee adjustments, thresholds |
| Treasury Spend | 14 days | 48 hours | 7,500 votes | Fund allocation |
| Emergency | 3 days | 24 hours | 3,000 votes | Security fixes |
| Constitution | 21 days | 7 days | 10,000 votes | Major governance changes |

### 8.4 Proposal Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    PROPOSAL LIFECYCLE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CREATION          Council member submits proposal       │
│         │                                                   │
│         ▼                                                   │
│  2. DISCUSSION        24-48 hour comment period             │
│         │                                                   │
│         ▼                                                   │
│  3. VOTING DELAY      1 day before voting opens             │
│         │                                                   │
│         ▼                                                   │
│  4. VOTING OPEN       Users cast For/Against/Abstain        │
│         │             (7-21 days based on type)             │
│         ▼                                                   │
│  5. VOTING CLOSED     Tally votes, check quorum             │
│         │                                                   │
│         ├── FAILED (quorum not met or majority against)     │
│         │                                                   │
│         ▼                                                   │
│  6. QUEUED            Proposal enters timelock              │
│         │             (24 hours - 7 days)                   │
│         ▼                                                   │
│  7. EXECUTED          On-chain actions performed            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.5 Voting Power

Voting power is calculated as:

```
VotingPower = TokenBalance × ScoreMultiplier

Where ScoreMultiplier:
- Elite (8,000+):     1.5x
- Council (7,000+):   1.25x
- Governance (5,400+): 1.0x
```

### 8.6 Council System

The Council is a group of 7 elected members with special privileges:

| Responsibility | Description |
|----------------|-------------|
| Propose | Submit new governance proposals |
| Emergency | Trigger emergency pauses if needed |
| Arbiter | Resolve escalated disputes |
| Upgrade | Approve contract upgrades (5/7 multisig) |

**Council Elections:**
- Held quarterly
- Candidates must have 7,000+ ProofScore for 30+ days
- Top 7 vote-getters become council members
- 2-term limit (6 months max)

---

## 9. Merchant Portal

### 9.1 Overview

The Merchant Portal enables businesses to accept VFIDE payments with industry-leading terms.

### 9.2 Registration Requirements

| Requirement | Value |
|-------------|-------|
| Minimum ProofScore | 5,600 |
| Registration Fee | None (gas only) |
| KYC Required | No (on-chain reputation) |
| Approval Time | Instant (automatic) |

### 9.3 Merchant Features

| Feature | Description |
|---------|-------------|
| Direct Payments | Receive VFIDE instantly to wallet |
| Escrow Mode | Optional buyer protection with escrow |
| QR Code Payments | Generate payment QR codes |
| STABLE-PAY | Auto-convert to stablecoins (USDC/USDT) |
| Custom Payout | Route funds to any address |
| Analytics Dashboard | Track volume, transactions, ratings |
| Customer Reviews | Build reputation through feedback |

### 9.4 Fee Comparison

| Platform | Processing Fee | Settlement | Chargebacks |
|----------|---------------|------------|-------------|
| **VFIDE** | **0%** | **Instant** | **None** |
| Stripe | 2.9% + $0.30 | 2-7 days | Yes ($15 fee) |
| Square | 2.6% + $0.10 | 1-2 days | Yes |
| PayPal | 2.9% + $0.30 | 1-3 days | Yes |

### 9.5 Merchant Categories

- Retail
- Food & Beverage
- Digital Services
- Gaming & Entertainment
- Art & Collectibles
- Education
- Professional Services
- Other

---

## 10. Escrow System

### 10.1 Overview

The VFIDE Escrow system provides trustless transaction protection between parties who don't yet have established trust.

### 10.2 Escrow Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     ESCROW LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BUYER CREATES ESCROW                                    │
│     └── Funds locked in smart contract                      │
│         └── Order ID, merchant, amount recorded             │
│                                                             │
│  2. MERCHANT FULFILLS ORDER                                 │
│     └── Ships product or delivers service                   │
│                                                             │
│  3a. BUYER RELEASES FUNDS                                   │
│      └── One-click confirmation                             │
│          └── Funds sent to merchant instantly               │
│                                                             │
│  3b. BUYER RAISES DISPUTE                                   │
│      └── Arbiter (Council) reviews case                     │
│          └── Evidence submitted by both parties             │
│              └── Ruling determines fund allocation          │
│                                                             │
│  3c. TIMEOUT REACHED                                        │
│      └── Auto-release to merchant after deadline            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Escrow States

| State | Description |
|-------|-------------|
| CREATED | Funds locked, awaiting fulfillment |
| RELEASED | Buyer confirmed, funds sent to merchant |
| REFUNDED | Order canceled, funds returned to buyer |
| DISPUTED | Under review by arbiter |
| TIMEOUT_CLAIMED | Release time passed, merchant claimed |

### 10.4 Dispute Resolution

1. Either party raises dispute
2. 48-hour evidence submission period
3. Council arbiter reviews case
4. Ruling issued with fund allocation (0-100% to each party)
5. ProofScore adjustments for losing party

---

## 11. Vault System

### 11.1 Overview

Every VFIDE user can create a personal **Vault** — a smart contract wallet that holds VFIDE tokens securely on-chain.

### 11.2 Vault Features

| Feature | Description |
|---------|-------------|
| Deposit | Transfer VFIDE from wallet to vault |
| Withdraw | Transfer VFIDE from vault to any address |
| Auto-Pay | Set up recurring payments |
| Spending Limits | Optional daily/weekly limits |
| Recovery | Social recovery through guardians |

### 11.3 Social Recovery

Vaults support social recovery for lost wallet access:

| Parameter | Value |
|-----------|-------|
| Required Guardians | 3-7 (user configured) |
| Recovery Threshold | 60% of guardians |
| Guardian Maturity | 7 days before voting |
| Recovery Expiry | 7 days to complete |

---

## 12. Badge & Gamification System

### 12.1 Overview

Users earn NFT badges for completing achievements. Badges increase ProofScore and demonstrate accomplishments.

### 12.2 Badge Categories

| Category | Examples | ProofScore Bonus |
|----------|----------|------------------|
| Activity & Streaks | Daily Active, Streak Master | 10-25 |
| Trust & Community | Trusted Endorser, Community Builder | 25-40 |
| Commerce & Merchants | Verified Merchant, Elite Merchant | 30-60 |
| Governance | Active Voter, Council Member | 25-50 |
| Special Achievements | Early Adopter, Bug Hunter | 50-100 |

### 12.3 Badge Rarities

| Rarity | ProofScore | Duration | Drop Rate |
|--------|------------|----------|-----------|
| Common | 10-15 | Temporary | High |
| Rare | 25-35 | 1 Year | Medium |
| Epic | 40-50 | Permanent | Low |
| Legendary | 75-100 | Permanent | Very Low |

### 12.4 Example Badges

| Badge | Requirement | Points | Rarity |
|-------|-------------|--------|--------|
| Daily Active | Login 7 consecutive days | 15 | Common |
| Trusted Endorser | Give 10 endorsements | 30 | Rare |
| Verified Merchant | Register as merchant | 35 | Rare |
| Community Builder | Refer 10 users to 600+ score | 35 | Epic |
| Council Member | Elected to council | 50 | Epic |
| Founding Member | Participated in presale | 75 | Legendary |

### 12.5 XP & Leveling System

Users earn **Experience Points (XP)** from all activities. XP accumulates toward levels.

#### XP Sources

| Action | XP Earned |
|--------|-----------|
| Daily Login | 10 XP |
| Send Payment | 5 XP |
| Receive Payment | 3 XP |
| Cast Vote | 15 XP |
| Complete Quest | 20-100 XP |
| Earn Badge | 50 XP |
| Give Endorsement | 5 XP |
| Receive Endorsement | 10 XP |

#### Level Thresholds

| Level | XP Required | Title |
|-------|-------------|-------|
| 1 | 0 | Newcomer |
| 2 | 100 | Explorer |
| 3 | 300 | Contributor |
| 4 | 600 | Trusted |
| 5 | 1,000 | Established |
| 6 | 1,500 | Respected |
| 7 | 2,500 | Authority |
| 8 | 4,000 | Elite |
| 9 | 6,000 | Legendary |
| 10 | 10,000 | Champion |

#### Level-Up Rewards

Each level-up grants:
- Notification celebration
- ProofScore bonus (Level × 5)
- Unlock new features at certain levels

### 12.6 Daily/Weekly/Monthly Quests

The Quest system provides structured challenges to drive engagement.

#### Quest Types

| Type | Reset Period | Rewards |
|------|--------------|---------|
| Daily | Every 24 hours | 10-50 VFIDE + XP |
| Weekly | Every 7 days | 50-200 VFIDE + XP |
| Monthly | Every 30 days | 200-1,000 VFIDE + Badge |

#### Quest Difficulty

| Difficulty | Examples | VFIDE Reward |
|------------|----------|--------------|
| Easy | "Send 1 payment" | 10 VFIDE |
| Medium | "Complete 5 transactions" | 25 VFIDE |
| Hard | "Earn 3 endorsements" | 50 VFIDE |
| Legendary | "Reach top 100 leaderboard" | 100 VFIDE |

#### Example Quests

**Daily:**
- Login to VFIDE ✅ (10 VFIDE)
- Send 1 payment (15 VFIDE)
- Give 3 reactions (10 VFIDE)

**Weekly:**
- Complete 10 transactions (50 VFIDE)
- Vote on 3 proposals (75 VFIDE)
- Endorse 5 users (60 VFIDE)

**Monthly:**
- Reach new ProofScore tier (200 VFIDE)
- Recruit 5 new users (500 VFIDE + Recruiter Badge)
- Complete 100 transactions (1,000 VFIDE + Power Trader Badge)

### 12.7 Login Streaks

Consecutive daily logins are tracked and rewarded.

#### Streak Milestones

| Streak Days | XP Reward | VFIDE Reward |
|-------------|-----------|--------------|
| 7 days | 70 XP | 35 VFIDE |
| 14 days | 140 XP | 70 VFIDE |
| 30 days | 300 XP | 150 VFIDE |
| 60 days | 600 XP | 300 VFIDE |
| 90 days | 900 XP | 450 VFIDE |
| 100 days | 1,000 XP | 500 VFIDE + Streak Master Badge |

#### Streak Multipliers

Longer streaks increase reward multipliers:

| Streak Length | Multiplier |
|---------------|------------|
| 1-6 days | 1.0x |
| 7-13 days | 1.1x |
| 14-29 days | 1.15x |
| 30-59 days | 1.25x |
| 60-89 days | 1.35x |
| 90+ days | 1.5x |

#### Streak Protection

- Missing 1 day resets streak to 0
- Future: "Streak Shield" item to protect streak (1 per month)

### 12.8 Leaderboards

Competitive leaderboards rank users across multiple categories.

#### Leaderboard Types

| Leaderboard | Ranking Metric | Reset |
|-------------|----------------|-------|
| ProofScore | Highest ProofScore | Never |
| Monthly XP | XP earned this month | Monthly |
| Transactions | Volume this month | Monthly |
| Referrals | Users recruited | Quarterly |
| Governance | Proposals + Votes | Quarterly |

#### Tier Colors

| Tier | ProofScore Range | Color |
|------|------------------|-------|
| Champion | 9,000+ | Gold 🥇 |
| Guardian | 8,000-8,999 | Silver 🥈 |
| Delegate | 7,000-7,999 | Bronze 🥉 |
| Advocate | 5,600-6,999 | Cyan |
| Merchant | 5,600+ (registered) | Green |
| Neutral | Below 5,600 | Gray |

#### Leaderboard Rewards

Top performers each month receive bonus VFIDE from the Ecosystem Vault:

| Rank | Monthly Reward |
|------|----------------|
| 1st | 1,000 VFIDE |
| 2nd | 750 VFIDE |
| 3rd | 500 VFIDE |
| 4th-10th | 250 VFIDE |
| 11th-50th | 100 VFIDE |

### 12.9 Onboarding Checklist

New users see a guided checklist to learn the platform:

| Step | Action | Reward |
|------|--------|--------|
| 1 | Connect Wallet | 10 XP |
| 2 | Complete Profile | 100 VFIDE + 50 XP |
| 3 | Make First Deposit | 25 XP |
| 4 | Send First Payment | 200 VFIDE + 50 XP |
| 5 | Give First Endorsement | 25 XP |
| 6 | Vote on First Proposal | 50 XP |
| 7 | Create Vault | 50 XP |
| 8 | Add Guardian | 25 XP |
| **Complete All** | | **Pioneer Badge (Legendary)** |

### 12.10 Achievement Toast System

Real-time notifications celebrate user achievements:

- **Level Up** — Animated celebration with new title
- **Badge Earned** — Badge icon with rarity glow
- **Quest Complete** — Reward summary with claim button
- **Streak Milestone** — Fire animation with multiplier
- **Leaderboard Rank** — Position change notification

---

## 13. Mentorship Program

### 13.1 Overview

High-trust users can become Mentors to help newcomers succeed in the VFIDE ecosystem.

### 13.2 Requirements

| Requirement | Value |
|-------------|-------|
| Minimum ProofScore | 7,000+ |
| Good Standing | No disputes in last 90 days |
| Capacity | Up to 10 active mentees |

### 13.3 Mentor Rewards

| Event | Reward |
|-------|--------|
| Mentee reaches 5,400 (Governance) | +25 ProofScore |
| Mentee reaches 7,000 (Council) | +50 ProofScore |
| Mentee completes 50 transactions | +20 ProofScore |
| Mentor badge earned | Display badge on profile |

### 13.4 Mentee Benefits

| Benefit | Description |
|---------|-------------|
| Guided Onboarding | Personalized introduction to VFIDE |
| Priority Support | Mentor assists with questions |
| Reputation Boost | +100 starting ProofScore bonus |
| Early Endorsement | Mentor endorsement after milestones |

---

## 14. Headhunter Referral Program

### 14.1 Overview

The Headhunter program rewards users who bring new members and merchants to VFIDE.

### 14.2 Point System

| Referral Type | Points Earned |
|---------------|---------------|
| User Referral | 1 point |
| Merchant Referral | 3 points |

### 14.3 Quarterly Leaderboard

Top 20 referrers each quarter share the Headhunter Pool:

| Rank | Pool Share | Estimated Reward* |
|------|------------|-------------------|
| 1st | 15.0% | ~$4,500 |
| 2nd | 12.0% | ~$3,600 |
| 3rd | 10.0% | ~$3,000 |
| 4th | 8.0% | ~$2,400 |
| 5th | 7.0% | ~$2,100 |
| 6th | 6.0% | ~$1,800 |
| 7th | 5.0% | ~$1,500 |
| 8th | 4.5% | ~$1,350 |
| 9th | 4.0% | ~$1,200 |
| 10th | 3.5% | ~$1,050 |
| 11th-20th | 1.2-3.0% | ~$360-$900 |

*Based on estimated quarterly pool of ~$30,000

### 14.4 Claim Process

1. Quarter ends
2. Pool snapshot taken
3. Rankings finalized
4. 7-day claim window opens
5. Users claim rewards on-chain

---

## 15. Multi-Chain Deployment

### 15.1 Supported Chains

VFIDE is deployed on multiple EVM-compatible chains for flexibility and low fees:

| Chain | Type | Status | Use Case |
|-------|------|--------|----------|
| Base | Coinbase L2 | ✅ Live | Coinbase users, low fees |
| Polygon | Ethereum L2 | ✅ Live | High speed, low fees |
| zkSync Era | ZK Rollup | ✅ Live | Privacy, security |

### 15.2 Testnet Availability

| Chain | Network | Faucet |
|-------|---------|--------|
| Base Sepolia | Testnet | [Link](https://www.coinbase.com/faucets/base-sepolia-faucet) |
| Polygon Amoy | Testnet | [Link](https://faucet.polygon.technology/) |
| zkSync Sepolia | Testnet | [Link](https://portal.zksync.io/faucet) |

### 15.3 Cross-Chain Considerations

- ProofScore is chain-specific (not bridged)
- Tokens can be bridged using standard bridges
- Vaults are chain-specific
- Governance is unified (votes aggregated)

---

## 16. Security Model

### 16.1 Smart Contract Security

| Measure | Description |
|---------|-------------|
| Audits | Third-party security audits before mainnet |
| Bug Bounty | Up to $100,000 for critical vulnerabilities |
| Formal Verification | Key functions mathematically proven |
| Timelock | 48-hour delay on all upgrades |
| Multisig | 5/7 council signature for critical actions |

### 16.2 Emergency Procedures

| Scenario | Response |
|----------|----------|
| Critical vulnerability | Emergency pause (council can trigger) |
| Exploit in progress | Circuit breaker halts transfers |
| Oracle failure | Fallback to default fee tier |

### 16.3 User Security

| Feature | Description |
|---------|-------------|
| Non-Custodial | Users always control their keys |
| Wallet-Based Auth | No passwords to hack |
| Transaction Signing | All actions require wallet approval |
| Social Recovery | Recover vault without seed phrase |

### 16.4 Two-Factor Authentication (2FA)

Optional 2FA adds an extra security layer for sensitive operations.

#### Supported 2FA Methods

| Method | Description |
|--------|-------------|
| TOTP (Authenticator App) | Time-based codes via Google/Authy |
| SMS | Text message verification codes |
| Email | Verification link sent to email |
| Backup Codes | One-time recovery codes (8 codes) |

#### 2FA-Protected Actions

| Action | 2FA Required |
|--------|--------------|
| Large Withdrawals (>$1,000) | Optional |
| Guardian Changes | Recommended |
| Recovery Initiation | Required |
| Export Private Data | Required |

### 16.5 Biometric Authentication

For supported devices, biometric login provides passwordless security.

#### Supported Biometrics

| Type | Platform |
|------|----------|
| Fingerprint | iOS, Android, Windows Hello |
| Face ID | iOS, Android |
| Hardware Key | YubiKey, Titan |
| WebAuthn | All modern browsers |

#### Enrollment Flow

1. User navigates to Security Center
2. Clicks "Add Biometric"
3. Browser prompts for biometric scan
4. Credential stored locally (private key never leaves device)
5. Future logins use biometric verification

---

## 17. Technical Implementation

### 17.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.x |
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Wallet Integration | wagmi v2, RainbowKit |
| State Management | React Query, Zustand |
| Testing | Jest, Playwright |
| Deployment | Vercel, IPFS |

### 17.1.1 Navigation System

The VFIDE platform uses a **PieMenu** navigation system located in the bottom-right corner:

**Features:**
- Slide-out menu with 9 main categories
- Hierarchical submenu structure
- Keyboard navigation support (Arrow keys, Enter, Escape)
- Accessibility: ARIA labels, screen reader compatible
- Visual feedback: Hover effects, active states, animations
- Mobile-responsive design

**Main Categories:**
1. **Vault** - Security & asset management (7 sub-items)
2. **Merchant** - Payment services (9 sub-items)
3. **Social** - Community features (5 sub-items)
4. **Governance** - DAO participation (4 sub-items)
5. **Rewards** - Gamification (7 sub-items including Invite)
6. **Insights** - Analytics & reporting (5 sub-items)
7. **Developer** - Technical tools (4 sub-items including Explorer)
8. **Account** - User settings (6 sub-items)
9. **Home** & **Dashboard** - Quick access

**Navigation Links:**
- `/invite` → Redirects to `/headhunter` (Referral program)
- `/explorer` → Redirects to `/developer` (Developer tools)
- Landing pages at `/invite` and `/explorer` provide helpful information

### 17.2 API Endpoints

```
# ProofScore
GET  /api/proofScore/current
GET  /api/proofScore/tier
GET  /api/proofScore/history
GET  /api/proofScore/breakdown

# Badges
GET  /api/badges/user
GET  /api/badges/all

# Governance
GET  /api/proposals
GET  /api/proposals/:id
POST /api/proposals/:id/vote

# Merchant
GET  /api/merchant/:address
GET  /api/merchant/transactions

# Treasury
GET  /api/treasury/balance
GET  /api/treasury/allocations
```

### 17.3 Event Indexing

VFIDE uses The Graph for event indexing:

```graphql
type Transfer @entity {
  id: ID!
  from: Bytes!
  to: Bytes!
  amount: BigInt!
  fee: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
}

type ProofScoreUpdate @entity {
  id: ID!
  user: Bytes!
  oldScore: Int!
  newScore: Int!
  reason: String!
  timestamp: BigInt!
}
```

### 17.4 Developer SDK

VFIDE provides a JavaScript/TypeScript SDK for integration.

#### Installation

```bash
npm install @vfide/sdk
```

#### Payment Button Widget

```tsx
import { VFIDEWidget } from '@vfide/sdk';

<VFIDEWidget.PaymentButton
  to="0x1234..."
  amount="0.01"
  token="ETH"
  onSuccess={(tx) => console.log('Paid!', tx)}
/>
```

#### Request Payment via API

```typescript
const payment = await VFIDE.requestPayment({
  to: merchantAddress,
  amount: '10.00',
  token: 'USDC',
  metadata: { orderId: '12345' }
});
```

#### Create Streaming Payment

```typescript
const stream = await VFIDE.createStream({
  to: recipientAddress,
  amount: '100',
  token: 'USDC',
  duration: 30 * 24 * 60 * 60 // 30 days
});
```

#### Webhook Events

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment confirmed on-chain |
| `payment.failed` | Payment failed or reverted |
| `stream.started` | Streaming payment began |
| `stream.depleted` | Stream funds exhausted |
| `escrow.created` | New escrow initiated |
| `escrow.released` | Escrow funds released |
| `escrow.disputed` | Dispute filed on escrow |

### 17.5 Notification System

Real-time notifications keep users informed.

#### Notification Types

| Type | Description | Default |
|------|-------------|---------|
| Message | DM or group message | On |
| Mention | @mentioned in post | On |
| Reaction | Someone reacted to post | On |
| Group Invite | Invited to group | On |
| Badge Earned | Achievement unlocked | On |
| Announcement | System announcements | On |
| Payment | Payment received | On |
| Governance | Proposal updates | Off |

#### Delivery Channels

| Channel | Description |
|---------|-------------|
| In-App | Notification bell in header |
| Push | Browser/mobile push notifications |
| Email | Email digest (configurable frequency) |
| SMS | Critical alerts only |

#### Notification Preferences

Users can customize per-type:
- Enable/disable
- Sound on/off
- Push notifications
- Email notifications
- Quiet hours

### 17.6 ENS Integration

VFIDE integrates with Ethereum Name Service for human-readable addresses.

#### Features

| Feature | Description |
|---------|-------------|
| Name Resolution | Display ENS names instead of 0x addresses |
| Avatar Display | Show ENS avatar images |
| Pay by ENS | Send payments to `name.eth` |
| Reverse Lookup | Show user's ENS name in UI |

#### Example

```
Instead of: 0x742d35Cc6634C0532925a3b844Bc9e7595f...
Display as: alice.eth
```

---

## 18. Roadmap

### Phase 1: Foundation (Q1 2026)
- [x] Core smart contracts deployed
- [x] Testnet launch (Base Sepolia, Polygon Amoy, zkSync Sepolia)
- [x] Frontend MVP
- [x] Presale contracts ready
- [ ] Security audits

### Phase 2: Launch (Q2 2026)
- [ ] Presale begins
- [ ] Mainnet deployment
- [ ] DEX liquidity provision
- [ ] Mobile wallet app (beta)
- [ ] First governance proposals

### Phase 3: Growth (Q3 2026)
- [ ] Merchant SDK release
- [ ] WooCommerce plugin
- [ ] Shopify integration
- [ ] 1,000+ merchants onboarded
- [ ] Bridge to additional chains

### Phase 4: Scale (Q4 2026)
- [ ] Mobile app launch (iOS/Android)
- [ ] Fiat on/off ramp partnerships
- [ ] Enterprise merchant features
- [ ] 10,000+ active users
- [ ] DAO treasury grants program

### Phase 5: Ecosystem (2027)
- [ ] VFIDE debit card
- [ ] Cross-chain ProofScore
- [ ] AI-powered fraud detection
- [ ] Institutional features
- [ ] Global expansion

---

## 19. Streaming Payments (Payroll)

### 19.1 Overview

The Streaming Payments system allows continuous, real-time payment flows for salaries, subscriptions, and other recurring payments. Instead of waiting for monthly payday, recipients can withdraw earned funds at any time.

### 19.2 How Streaming Works

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT STREAM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PAYER                                                      │
│  ├── Creates stream with: payee, rate, initial deposit     │
│  ├── Tokens locked in PayrollManager contract              │
│  └── Can pause, resume, or cancel stream                   │
│                                                             │
│  STREAM (Running)                                           │
│  ├── Rate: X VFIDE per second                              │
│  ├── Accrues continuously 24/7                             │
│  └── Deposit balance decreases over time                   │
│                                                             │
│  PAYEE                                                      │
│  ├── Views real-time claimable balance                     │
│  ├── Withdraws any amount up to claimable                  │
│  └── Multiple streams from different payers                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 19.3 Stream Parameters

| Parameter | Description |
|-----------|-------------|
| Payer | Address funding the stream |
| Payee | Recipient address |
| Token | VFIDE (or supported token) |
| Rate per Second | Amount accrued each second |
| Start Time | When streaming begins |
| Deposit Balance | Funds available in stream |
| Active | Whether stream is running |
| Paused | Temporarily stopped |

### 19.4 Use Cases

- **Payroll** — Stream salaries to employees continuously
- **Subscriptions** — Pay for services in real-time
- **Rent** — Continuous rental payments
- **Royalties** — Stream creator earnings
- **Vesting** — Token vesting schedules

---

## 20. STABLE-PAY (Auto-Conversion)

### 20.1 Overview

STABLE-PAY allows merchants to automatically convert received VFIDE payments to stablecoins (USDC, USDT) to protect against price volatility.

### 20.2 How It Works

```
Customer pays VFIDE → Merchant receives VFIDE
                              │
                    ┌─────────┴─────────┐
                    │  STABLE-PAY ON?   │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
           [OFF]          [ON: USDC]      [ON: USDT]
              │               │               │
              ▼               ▼               ▼
     Merchant keeps     DEX Swap to      DEX Swap to
         VFIDE           USDC             USDT
```

### 20.3 Conversion Fees

| Fee Type | Amount | Description |
|----------|--------|-------------|
| Protocol Fee | 0% | No VFIDE protocol fee |
| DEX Swap Fee | ~0.3% | Standard DEX fee |
| Slippage Protection | 5% max | Protects against price impact |
| Gas | Variable | Network transaction cost |

### 20.4 Enabling STABLE-PAY

1. Register as merchant (5,600+ ProofScore)
2. Navigate to Merchant Dashboard
3. Toggle "Auto-Convert Enabled"
4. Select target stablecoin (USDC or USDT)
5. All future payments auto-convert

---

## 21. Stealth Addresses (Private Pay)

### 21.1 Overview

Stealth Addresses provide privacy for VFIDE transactions. Recipients can receive payments without revealing their main wallet address on-chain.

### 21.2 How Stealth Addresses Work

```
┌─────────────────────────────────────────────────────────────┐
│                   STEALTH PAYMENT FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. RECIPIENT generates stealth meta-address               │
│     ├── Spending public key                                │
│     ├── Viewing public key                                 │
│     └── Published once, reusable                           │
│                                                             │
│  2. SENDER creates payment                                  │
│     ├── Generates ephemeral keypair                        │
│     ├── Derives one-time stealth address                   │
│     └── Sends funds to stealth address                     │
│                                                             │
│  3. RECIPIENT scans for payments                            │
│     ├── Uses viewing key to scan chain                     │
│     ├── Detects payments using view tag                    │
│     └── Derives spending key for each payment              │
│                                                             │
│  4. RECIPIENT claims                                        │
│     └── Signs with derived spending key                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 21.3 Privacy Features

| Feature | Description |
|---------|-------------|
| Unlinkable Addresses | Each payment uses a unique address |
| Scanning | Only recipient can identify their payments |
| View Tags | Efficient scanning (no false positives) |
| Meta-Address | Single address to share publicly |

### 21.4 Privacy Score

Users receive a Privacy Score based on their usage patterns:

- % of payments received via stealth addresses
- Address diversity (unique addresses used)
- Overall transaction privacy

---

## 22. Guardian System

### 22.1 Overview

Guardians are trusted individuals who can help vault owners recover access in case of lost wallet keys. This provides a social recovery mechanism without relying on centralized services.

### 22.2 Guardian Types

| Type | Description |
|------|-------------|
| Personal Guardians | Friends, family, trusted contacts |
| Institutional | Hardware wallet services, custodians |
| Protocol Guardians | High-reputation community members |

### 22.3 Recovery Mechanisms

#### Chain of Return (Lost Wallet)

For living users who lost access to their wallet:

1. Owner initiates recovery to new address
2. Guardians verify owner identity (off-chain)
3. Guardians approve on-chain (2/3 or 3/5 threshold)
4. 7-day waiting period (challenge window)
5. Recovery executed to new wallet

#### Next of Kin (Inheritance)

For inheritance/death scenarios:

1. Pre-designated beneficiary initiates claim
2. Extended waiting period (90-180 days)
3. Original owner can cancel if alive
4. Guardians can expedite with proof of death
5. Assets transfer to beneficiary

### 22.4 Guardian Parameters

| Parameter | Value |
|-----------|-------|
| Minimum Guardians | 3 |
| Maximum Guardians | 7 |
| Approval Threshold | 60% (configurable) |
| Maturity Period | 7 days before voting |
| Recovery Expiry | 7 days to complete |
| Challenge Period | 7 days |

### 22.5 Guardian Responsibilities

- Verify identity of recovery requestor
- Vote on recovery requests within timeframe
- Cannot access funds directly
- Receive no financial compensation (trust-based)

---

## 23. Multi-Signature Operations

### 23.1 Overview

Multi-signature (multisig) operations require multiple parties to approve transactions, adding security for high-value or sensitive operations.

### 23.2 Multisig Use Cases

| Operation | Typical Threshold |
|-----------|------------------|
| Council Emergency Actions | 5/7 |
| Treasury Disbursements | 3/5 |
| Contract Upgrades | 5/7 |
| Sanctum Charity Payments | 3/5 |
| Large Escrow Disputes | 2/3 |

### 23.3 Council Multisig

The 7-member Council operates a 5/7 multisig for critical operations:

```
Council Multisig (5 of 7 Required)
├── Contract upgrades
├── Emergency pauses
├── Parameter changes outside normal governance
└── Sanctum disbursement approval
```

---

## 24. Time Locks

### 24.1 Overview

Time locks add mandatory waiting periods before certain actions can be executed, providing time for review and intervention if needed.

### 24.2 Time Lock Periods

| Operation | Delay | Purpose |
|-----------|-------|---------|
| Governance Proposal Execution | 48 hours | Review passed proposals |
| Contract Upgrades | 48 hours | Security review |
| Emergency Proposals | 24 hours | Faster response to threats |
| Constitution Changes | 7 days | Maximum scrutiny |
| Guardian Recovery | 7 days | Prevent unauthorized recovery |

### 24.3 Time Lock Benefits

- **Transparency** — All pending actions visible on-chain
- **Intervention** — Time to detect and prevent malicious actions
- **Trust** — Users can verify before execution
- **Security** — Attackers cannot execute immediately

---

## 25. Liquidity Incentives

### 25.1 Overview

VFIDE incentivizes liquidity providers who add VFIDE to decentralized exchange pools.

### 25.2 Supported Pools

| Pool | DEX | Reward Multiplier |
|------|-----|-------------------|
| VFIDE/ETH | Uniswap | 1.0x |
| VFIDE/USDC | Uniswap | 1.5x |
| VFIDE/MATIC | QuickSwap | 1.0x |

### 25.3 How It Works

1. User adds liquidity to supported pool
2. Receives LP tokens
3. Stakes LP tokens in LiquidityIncentives contract
4. Earns VFIDE rewards proportional to stake
5. Unstake anytime (no lock required)

### 25.4 Reward Distribution

- Rewards funded from Ecosystem Vault
- Distributed per-second (streaming)
- Higher rewards for less liquid pools
- Rewards decrease as TVL increases (supply/demand)

---

## 26. Cross-Chain Features

### 26.1 Current Status

VFIDE is natively deployed on multiple chains:
- Base (Coinbase L2)
- Polygon (Ethereum L2)
- zkSync Era (ZK Rollup)

### 26.2 Cross-Chain Considerations

| Feature | Status |
|---------|--------|
| Token Bridging | Via standard bridges |
| ProofScore | Chain-specific (not bridged) |
| Vaults | Chain-specific |
| Governance | Unified across chains |

### 26.3 Future: Cross-Chain ProofScore

Planned for Phase 5 (2027):
- Unified ProofScore across all chains
- Cross-chain reputation portability
- Single identity, multi-chain activity

---

## 27. Subscriptions (Recurring Payments)

### 27.1 Overview

The Subscription system allows merchants to set up recurring payments that automatically execute on-chain at specified intervals.

### 27.2 How Subscriptions Work

```
┌─────────────────────────────────────────────────────────────┐
│                  SUBSCRIPTION LIFECYCLE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. USER CREATES SUBSCRIPTION                               │
│     ├── Selects merchant                                    │
│     ├── Sets amount per interval                            │
│     ├── Sets interval (daily/weekly/monthly)                │
│     └── Sets max payments (or unlimited)                    │
│                                                             │
│  2. APPROVAL                                                │
│     └── User approves token spending allowance              │
│                                                             │
│  3. AUTOMATED EXECUTION                                     │
│     ├── Keeper calls executePayment when due                │
│     ├── Funds transfer from user → merchant                 │
│     └── Counter increments, next payment scheduled          │
│                                                             │
│  4. USER CONTROLS                                           │
│     ├── Pause (temporarily stop)                            │
│     ├── Resume (restart paused subscription)                │
│     └── Cancel (permanently end)                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 27.3 Subscription Parameters

| Parameter | Description |
|-----------|-------------|
| Subscriber | User paying for subscription |
| Merchant | Recipient of payments |
| Token | VFIDE or supported token |
| Amount | Per-interval payment amount |
| Interval | Seconds between payments |
| Max Payments | Total payments before auto-cancel |
| Payments Made | Counter of completed payments |
| Total Paid | Running total amount paid |
| Active | Whether subscription is live |
| Paused | Temporarily stopped |

### 27.4 Common Intervals

| Interval | Seconds |
|----------|---------|
| Daily | 86,400 |
| Weekly | 604,800 |
| Monthly | 2,592,000 |
| Yearly | 31,536,000 |

---

## 28. Budgets & Spending Limits

### 28.1 Overview

Users can set spending budgets to control their expenses and avoid overspending. The system tracks spending by category and alerts users when approaching limits.

### 28.2 Budget Features

| Feature | Description |
|---------|-------------|
| Category Budgets | Set limits per category (food, shopping, etc.) |
| Period | Daily, weekly, or monthly limits |
| Progress Tracking | Real-time spending vs. budget |
| Alerts | Notifications at 75%, 90%, 100% |
| History | View past spending patterns |

### 28.3 How Budgets Work

1. User creates budget with category, limit, and period
2. System tracks all payments in that category
3. Dashboard shows spending progress
4. Alerts trigger at configurable thresholds
5. Budget resets at end of period

---

## 29. Tax Reporting

### 29.1 Overview

VFIDE provides tools to help users track taxable events for reporting purposes. **Note: VFIDE is not a tax advisor—consult a professional.**

### 29.2 Tracked Tax Events

| Event Type | Description |
|------------|-------------|
| Token Swaps | Trading VFIDE for other tokens |
| Sales | Selling VFIDE for fiat equivalent |
| Staking Rewards | Rewards received from staking |
| Referral Rewards | Headhunter/referral bonuses |
| Badge Rewards | Token rewards from badges |

### 29.3 Tax Summary

The Tax Report page shows:
- **Short-Term Gains**: Tokens held < 1 year
- **Long-Term Gains**: Tokens held > 1 year
- **Total Losses**: Deductible losses
- **Net Gain/Loss**: Overall position
- **Event List**: Itemized taxable events

### 29.4 Export Options

- CSV download for tax software
- Yearly breakdown
- Cost basis calculation

---

## 30. Endorsement System

### 30.1 Overview

Endorsements are a social reputation feature where users can vouch for other users, contributing to their ProofScore.

### 30.2 How Endorsements Work

```
┌─────────────────────────────────────────────────────────────┐
│                   ENDORSEMENT FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ENDORSER                     RECIPIENT                     │
│  ├── Finds trusted user       ├── Receives endorsement      │
│  ├── Clicks "Endorse"         ├── ProofScore bonus (+10-50) │
│  ├── Optional: Attach tip     ├── Shows on profile          │
│  └── Stake reputation         └── Badge progress            │
│                                                             │
│  ENDORSEMENT REWARDS                                        │
│  ├── If recipient maintains 700+ score for 6 months:        │
│  │   └── Endorser earns "Talent Scout" badge                │
│  └── If recipient's score drops <400:                       │
│      └── Endorser's score takes small penalty               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 30.3 Endorsement Limits

| User ProofScore | Daily Endorsements |
|-----------------|-------------------|
| 0-4,000 | 2 |
| 4,000-6,000 | 5 |
| 6,000-8,000 | 10 |
| 8,000+ | 20 |

### 30.4 Endorsement Value

- **Credibility matters**: High-score endorsers provide more score boost
- **Reputation stake**: Bad endorsements hurt endorser's score
- **Network effects**: Well-endorsed users become trusted community members

---

## 31. Social Features

### 31.1 Overview

VFIDE includes social features to build community and enable peer-to-peer interactions beyond payments.

### 31.2 Social Hub

| Feature | Description |
|---------|-------------|
| Activity Feed | See friend activity, payments, badges |
| Direct Messages | Encrypted chat with other users |
| Group Chats | Create groups for communities |
| Stories | Share ephemeral content (24hr) |
| Social Payments | Pay friends with messages |

### 31.3 Social Payments

Send payments with:
- Personal messages
- Emoji reactions
- Split payments (divide among group)
- Request payments from friends

### 31.4 Privacy Controls

| Setting | Options |
|---------|---------|
| Profile Visibility | Public / Friends / Private |
| Payment Activity | Show All / Friends / None |
| Searchability | Anyone / Friends / Disabled |
| Message Requests | Anyone / Friends / Disabled |

---

## 32. Reward Rate Limits (Anti-Farming)

### 32.1 Overview

To prevent abuse and token farming, rewards are subject to rate limits and daily caps.

### 32.2 Reward Cooldowns

| Action | Cooldown | Daily Limit | Reward |
|--------|----------|-------------|--------|
| Message Sent | 60 sec | 100/day | 10 VFIDE |
| Reaction Given | 30 sec | 200/day | 2 VFIDE |
| Reaction Received | 30 sec | 500/day | 5 VFIDE |
| Daily Login | 24 hours | 1/day | 50 VFIDE |
| Profile Complete | One-time | Once | 100 VFIDE |
| First Payment | One-time | Once | 200 VFIDE |
| Referral | 1 hour | 10/day | 500 VFIDE |
| Group Created | 1 hour | 5/day | 100 VFIDE |
| Badge Earned | One-time per badge | 10/day | 50 VFIDE |

### 32.3 Anti-Farming Protections

- **Cooldowns**: Minimum time between same action
- **Daily Caps**: Maximum rewards per action type
- **Unique Interactions**: Same user pair limited
- **Velocity Checks**: Unusual patterns flagged
- **IP/Device Limits**: Multi-account detection

---

## 33. Enterprise Gateway

### 33.1 Overview

Enterprise Gateway provides business-grade features for larger organizations.

### 33.2 Enterprise Features

| Feature | Description |
|---------|-------------|
| Fiat Integration | On/off ramp via partners |
| Treasury Management | Multi-sig corporate wallets |
| API Access | Programmatic payment processing |
| Bulk Payments | Payroll, vendor payments |
| Compliance Tools | KYC/AML integration options |
| Dedicated Support | Priority assistance |

### 33.3 Enterprise Tiers

| Tier | Monthly Volume | Features |
|------|----------------|----------|
| Starter | <$50K | Basic API, standard support |
| Growth | $50K-$500K | + Analytics, priority support |
| Enterprise | $500K+ | + Custom integration, SLA |

---

## 34. Invite System

### 34.1 Overview

Users can generate invite links to bring new users to VFIDE, earning referral bonuses through the Headhunter program.

**Landing Page**: `/invite` provides comprehensive information about the referral program, including:
- Benefits of inviting friends (earn rewards, boost ProofScore, build community)
- How the referral system works (3-step process)
- Reward tiers (+3% for referrer, +2% for referee)
- Direct link to Headhunter program at `/headhunter`

### 34.2 Invite Link Features

| Feature | Description |
|---------|-------------|
| Unique Codes | Personal referral codes |
| Expiration | Optional time limit |
| Usage Limit | Max uses per link |
| Tracking | See who joined via your link |
| Bonuses | Headhunter rewards on sign-up |
| Landing Page | `/invite/[code]` for group invites |

### 34.3 Invite Flow

1. User generates invite link at `/headhunter` (referral program)
2. Share link via social media, email, or messaging
3. New user clicks link and lands on `/invite` or `/invite/[code]`
4. New user connects wallet and creates account
5. Both referrer and referee receive bonuses from 15M token pool
6. Ongoing rewards based on referee's activity and milestones

### 34.4 Referral Rewards

From the 15M bonus token pool:
- **Referrer**: +3% of referee's base token purchase
- **Referee**: +2% bonus on their purchase
- **Additional**: Points toward Headhunter leaderboard
- **Quarterly**: Top 20 referrers share quarterly reward pool

---

## 35. Complete Fee Reference

### 35.1 Transaction Fees (by ProofScore)

| ProofScore Range | Fee Rate | Example on 1,000 VFIDE |
|------------------|----------|------------------------|
| 8,000-10,000 (Elite) | 0.25% | 2.5 VFIDE |
| 7,000-7,999 (Council) | 1.0% | 10 VFIDE |
| 5,000-6,999 (Neutral/Trusted) | 2.0% | 20 VFIDE |
| 3,500-4,999 (Low Trust) | 3.5% | 35 VFIDE |
| 0-3,499 (Risky) | 5.0% | 50 VFIDE |

> **Note:** Merchant payment processing is 0% protocol fee. Only token transfers have ProofScore-based fees.

### 35.2 Fee Distribution

| Recipient | Percentage | Purpose |
|-----------|------------|---------|
| Burn | 62.5% | Reduce supply |
| Sanctum | 31.25% | Charity fund |
| Ecosystem | 6.25% | Development |

### 35.3 Other Fees

| Service | Fee | Notes |
|---------|-----|-------|
| Escrow Release | 1% | Paid by buyer |
| STABLE-PAY Swap | ~0.3% | DEX fee |
| Bridge | Variable | Network dependent |
| Vault Deposit | 0% | No deposit fee |
| Vault Withdraw | 0% | No withdrawal fee |
| Governance Voting | 0% | Free to vote |
| Proposal Creation | 0% | Free (min stake required) |

### 35.4 Limits & Thresholds

| Parameter | Value |
|-----------|-------|
| Max Transaction Fee | 10% (1,000 bps) |
| High Trust Threshold | 8,000 ProofScore |
| Low Trust Threshold | 4,000 ProofScore |
| Merchant Threshold | 5,600 ProofScore |
| DAO Voting Threshold | 4,000 ProofScore |
| Council Threshold | 9,000 ProofScore |
| Vesting Cliff | 90 days (team) |
| Max Lock Bonus | 30% (180 days) |
| Minimum Escrow | 10 VFIDE |
| Escrow Auto-Release | 7 days |

---

## 36. Glossary

| Term | Definition |
|------|------------|
| **ProofScore** | Reputation score (0-10,000) based on on-chain behavior |
| **Vault** | Personal token storage contract with guardian recovery |
| **Escrow** | 3-party holding contract for buyer-seller transactions |
| **Sanctum** | Community charity fund receiving 31.25% of fees |
| **Guardian** | Trusted address that can help recover lost vault access |
| **Next of Kin** | Designated beneficiary for inheritance |
| **Council** | 7-member elected body for protocol governance |
| **Headhunter** | User who recruits new users for rewards |
| **STABLE-PAY** | Merchant feature to auto-convert VFIDE to stablecoins |
| **Stealth Address** | Privacy feature for receiving payments anonymously |
| **Streaming Payment** | Continuous per-second payment flow |
| **Multi-Sig** | Transaction requiring multiple signatures |
| **Time Lock** | Mandatory delay before action execution |
| **Badge** | On-chain achievement token |
| **Endorsement** | User-to-user reputation vouching |
| **Bridge** | Cross-chain asset transfer mechanism |
| **XP** | Experience Points earned from activities |
| **Quest** | Daily/weekly/monthly challenge with rewards |
| **Streak** | Consecutive login days tracked for bonuses |
| **2FA** | Two-Factor Authentication for extra security |
| **ENS** | Ethereum Name Service (e.g., alice.eth) |
| **Webhook** | Automated HTTP callback for payment events |
| **SDK** | Software Development Kit for integrations |
| **Faucet** | Testnet source for free test tokens |

---

## 37. Testnet & Development

### 37.1 Testnet Networks

| Network | Chain ID | Faucet |
|---------|----------|--------|
| Base Sepolia | 84532 | basefaucet.coinbase.com |
| Polygon Amoy | 80002 | faucet.polygon.technology |
| zkSync Sepolia | 300 | faucet.zksync.io |

### 37.2 Getting Test Tokens

1. Connect wallet to testnet
2. Navigate to `/testnet` page
3. Copy your wallet address
4. Visit faucet link
5. Paste address and request tokens
6. Tokens arrive in ~30 seconds

### 37.3 Testnet Features

All features work on testnet with test tokens:
- ProofScore builds normally
- Governance proposals can be created
- Escrow and Vault contracts deployed
- Badges can be earned
- No real money required

---

## 38. User Profile

### 38.1 Profile Information

| Field | Description |
|-------|-------------|
| Display Name | Customizable username |
| Avatar | Profile picture (or ENS avatar) |
| Bio | Short description |
| ENS Name | Ethereum Name Service display |
| ProofScore | Current reputation score |
| Level | XP-based level (1-10) |
| Member Since | Account creation date |

### 38.2 Profile Stats

| Stat | Description |
|------|-------------|
| Total Transactions | Payments sent + received |
| Badges Earned | NFT achievement count |
| Endorsements Given | Endorsements to others |
| Endorsements Received | Endorsements from others |
| Governance Votes | Proposals voted on |
| Streak Record | Longest login streak |

### 38.3 Profile Privacy

| Setting | Options |
|---------|---------|
| Profile Visibility | Public / Friends / Private |
| Activity Visibility | Show All / Friends / Hidden |
| Transaction History | Visible / Hidden |
| Badge Display | Show All / Featured Only |

### 38.4 Profile Explorer

The VFIDE Explorer (`/explorer`) allows users to search and view profiles:

**Features:**
- **Search by Address**: Enter any wallet address (0x...) to view their profile
- **Search by Username**: Find users by display name
- **Public Statistics**: View ProofScore, badges, endorsements, and activity
- **Quick Links**: Navigate to leaderboard, social hub, and network stats
- **Developer Tools**: Access blockchain explorer and technical documentation

**Access:**
- Available at `/explorer` (landing page with search)
- Direct profile access via `/explorer/[address]`
- Integrated with leaderboard and social features

---

## 39. Legal Considerations

### 37.1 Regulatory Compliance

VFIDE is designed as a decentralized protocol with no central operator. Users are responsible for complying with their local regulations regarding cryptocurrency usage.

### 37.2 Token Classification

VFIDE tokens are utility tokens used for:
- Transaction fee payment
- Governance participation
- Reputation staking
- Access to platform features

VFIDE tokens are **not** securities and provide no ownership, dividends, or profit-sharing rights.

### 37.3 User Responsibilities

Users acknowledge that:
- Cryptocurrency involves risk of loss
- Smart contracts may have undiscovered vulnerabilities
- Regulatory status may change over time
- Users are responsible for tax obligations
- Private key security is the user's responsibility

---

## 40. Conclusion

VFIDE represents a fundamental reimagining of digital payments. By aligning economic incentives with trustworthy behavior, we create an ecosystem where:

- **Users benefit** from lower fees as they build reputation
- **Merchants benefit** from zero-fee payments and no chargebacks
- **The community benefits** from self-regulation and transparent governance
- **The token benefits** from deflationary mechanics and growing utility

We invite you to join us in building the future of trust-based commerce.

---

<div align="center">

**VFIDE Protocol**

*Trust is earned, not given. Start building yours today.*

---

[Website](https://vfide.vercel.app) • [GitHub](https://github.com/Scorpio861104/Vfide) • [Documentation](./docs/)

</div>
