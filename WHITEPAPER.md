# VFIDE Whitepaper
## Verified Financial Identity Ecosystem
### Version 1.0 | December 2025

---

## Abstract

VFIDE (Verified Financial Identity Ecosystem) represents a paradigm shift in blockchain-based commerce and financial identity. Unlike traditional cryptocurrency systems that treat all participants equally regardless of behavior, VFIDE introduces **ProofScore**—a dynamic behavioral reputation system that rewards trustworthy conduct and progressively penalizes malicious actors.

The ecosystem is built around three core innovations:

1. **ProofScore** — An on-chain behavioral credit score (0-100%) that affects transaction fees, governance rights, and ecosystem privileges
2. **Personal Smart Vaults** — Deterministic smart contract wallets with built-in security features, guardian recovery, and inheritance mechanisms
3. **Trust-Based Economics** — Transaction fees that decrease with good behavior and increase with suspicious activity, creating natural incentives for ecosystem integrity

VFIDE is designed for zkSync Era with full EVM compatibility, enabling high throughput and low-cost transactions while maintaining Ethereum-level security guarantees.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [The Problem](#2-the-problem)
3. [The VFIDE Solution](#3-the-vfide-solution)
4. [ProofScore System](#4-proofscore-system)
5. [Token Economics](#5-token-economics)
6. [Smart Vault Infrastructure](#6-smart-vault-infrastructure)
7. [Security Architecture](#7-security-architecture)
8. [Commerce Platform](#8-commerce-platform)
9. [Governance Model](#9-governance-model)
10. [Badge & Achievement System](#10-badge--achievement-system)
11. [Fair Launch & Presale](#11-fair-launch--presale)
12. [Technical Specifications](#12-technical-specifications)
13. [Roadmap](#13-roadmap)
14. [Conclusion](#14-conclusion)

---

## 1. Introduction

### 1.1 Vision

VFIDE envisions a blockchain ecosystem where **trust is earned, measured, and rewarded**. Every action—from simple transfers to governance participation—contributes to a user's reputation, creating a self-regulating community that naturally marginalizes bad actors while amplifying the influence of trustworthy participants.

### 1.2 Mission

To build the first comprehensive trust-based financial ecosystem that:

- Makes fraud economically irrational through progressive penalties
- Rewards consistent good behavior with reduced fees and enhanced privileges
- Provides institutional-grade security through personal smart vaults
- Enables trustless commerce with built-in escrow and dispute resolution
- Transitions from developer control to community governance seamlessly

### 1.3 Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Transparency** | All scoring criteria and fee calculations are on-chain and verifiable |
| **Fairness** | Everyone starts equal; only behavior determines standing |
| **Security** | Multi-layered protection with guardian systems and emergency controls |
| **Decentralization** | Progressive handover from development team to DAO governance |
| **Sustainability** | Self-funding through transaction fees without reliance on inflation |

---

## 2. The Problem

### 2.1 The Trust Deficit in Crypto

Traditional blockchain systems suffer from a fundamental trust problem:

1. **No Reputation History** — New wallets are indistinguishable from experienced users or bad actors using fresh addresses
2. **Equal Treatment of All Actors** — Scammers pay the same fees as legitimate users
3. **No Behavioral Incentives** — No mechanism to reward good behavior or penalize bad conduct
4. **Recovery Nightmares** — Lost keys mean lost funds with no recovery path
5. **Governance Plutocracy** — Token holdings trump behavior in voting power

### 2.2 Commerce Pain Points

Blockchain commerce faces unique challenges:

- **No Buyer Protection** — Once funds are sent, there's no recourse
- **Merchant Fraud** — No reputation system to identify trustworthy sellers
- **Dispute Resolution** — No built-in mechanism for handling conflicts
- **High Fees** — Layer 1 gas costs make small transactions impractical

### 2.3 Security Vulnerabilities

Current wallet systems lack:

- Multi-signature protection without complex setup
- Time-locked guardian recovery
- Inheritance mechanisms for digital assets
- Panic buttons for suspected compromise
- Abnormal transaction detection

---

## 3. The VFIDE Solution

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VFIDE ECOSYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                         TRUST LAYER                                 │   │
│    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │   │
│    │  │   ProofScore │◄──►│  ProofLedger │◄──►│   BadgeRegistry      │  │   │
│    │  │   (Seer)     │    │  (Events)    │    │   (Achievements)     │  │   │
│    │  └──────────────┘    └──────────────┘    └──────────────────────┘  │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                         TOKEN LAYER                                 │   │
│    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │   │
│    │  │  VFIDEToken  │◄──►│  BurnRouter  │◄──►│  EcoTreasury         │  │   │
│    │  │  (ERC-20)    │    │  (Fees)      │    │  (Vault)             │  │   │
│    │  └──────────────┘    └──────────────┘    └──────────────────────┘  │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                         VAULT LAYER                                 │   │
│    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │   │
│    │  │  VaultHub    │───►│  UserVault   │◄──►│  SecurityHub         │  │   │
│    │  │  (Factory)   │    │  (Per-User)  │    │  (Protection)        │  │   │
│    │  └──────────────┘    └──────────────┘    └──────────────────────┘  │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                       APPLICATION LAYER                             │   │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│    │  │  Commerce   │  │ Governance  │  │  Presale    │  │  Badges   │  │   │
│    │  │  Escrow     │  │  DAO        │  │  Vesting    │  │  NFTs     │  │   │
│    │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Innovations

| Innovation | Description |
|------------|-------------|
| **Vault-Only Mode** | All transfers must flow through personal smart vaults, enabling per-user security controls and behavioral tracking |
| **Dynamic Fees** | Transaction fees adjust based on sender's ProofScore — good actors pay less, bad actors pay more |
| **Time-Weighted Scoring** | 7-day rolling average prevents flash manipulation of trust scores |
| **Guardian Recovery** | M-of-N multi-sig recovery without centralized key escrow |
| **Behavioral Deflationary** | Higher trust = lower burn rate; system naturally rewards loyalty |

---

## 4. ProofScore System

### 4.1 Overview

ProofScore is the heart of VFIDE — a dynamic, on-chain behavioral credit score ranging from **0% to 100%**. It affects every aspect of ecosystem participation:

- Transaction fees
- Governance voting power
- Commerce privileges
- Recovery waiting periods
- Access to features

### 4.2 Score Scale

| Score Range | Trust Level | Description |
|-------------|-------------|-------------|
| 80% - 100% | **Elite** | Lowest fees, full privileges, instant settlement eligible |
| 54% - 79% | **Standard** | Normal fees, governance eligible |
| 40% - 53% | **Monitored** | Elevated fees, reduced privileges |
| 10% - 39% | **Restricted** | Maximum fees, limited functionality |
| 0% - 9% | **Quarantined** | Suspected fraud, most actions blocked |

### 4.3 Key Thresholds

| Threshold | ProofScore | Significance |
|-----------|------------|--------------|
| High Trust | ≥ 80% (8,000) | Fee discounts, instant settlement, elite badges |
| Governance | ≥ 54% (5,400) | DAO voting eligibility |
| Merchant | ≥ 56% (5,600) | Can register as merchant |
| Council | ≥ 70% (7,000) | Council election eligibility |
| Low Trust | ≤ 40% (4,000) | Fee penalties, enhanced scrutiny |

### 4.4 Score Calculation

ProofScore is computed from multiple on-chain factors:

```
ProofScore = BaseScore 
           + VaultBonus 
           + ActivityBonus 
           + BadgePoints 
           + EndorsementBonus 
           - PenaltyPoints
           - DisputeDeductions
           - SuspicionPenalties
```

#### 4.4.1 Scoring Factors

| Factor | Points | Notes |
|--------|--------|-------|
| **Base (Neutral)** | 5,000 (50%) | Everyone starts here |
| **Has Vault** | +500 | Creating a vault signals commitment |
| **Per Transaction** | +2 (buyer), +5 (merchant) | Successful commerce |
| **Per Governance Vote** | +5 | Active participation |
| **Badge Points** | Varies | See Badge System section |
| **Disputes Lost** | -500 to -2,000 | Varies by severity |
| **Refund Excess** | -200 per | Multiple refunds signal issues |
| **Fraud Confirmation** | -5,000 | Severe penalty |

### 4.5 Time-Weighted Averaging

To prevent flash manipulation, ProofScore uses a **7-day rolling average**:

```
EffectiveScore = Σ(DailyScore × DaysFromNow) / Σ(DaysFromNow)
```

- Maximum 100 score snapshots stored
- More recent scores weighted higher
- Protects against borrow/boost/sell attacks

### 4.6 ProofLedger — Immutable Event Log

Every action is permanently recorded:

```solidity
event SystemEvent(address indexed who, string action, address indexed by, uint256 timestamp);
event UserEvent(address indexed who, string action, uint256 amount, string note, uint256 timestamp);
event TransferLogged(address indexed from, address indexed to, uint256 amount, string context, uint256 timestamp);
```

This creates an unalterable history that:
- Enables score auditing
- Supports dispute resolution
- Provides reputation provenance
- Allows off-chain analytics

---

## 5. Token Economics

### 5.1 Token Overview

| Property | Value |
|----------|-------|
| **Name** | VFIDE Token |
| **Symbol** | VFIDE |
| **Decimals** | 18 |
| **Total Supply** | 200,000,000 VFIDE (fixed) |
| **Network** | zkSync Era (EVM compatible) |
| **Standard** | ERC-20 + EIP-2612 (Permit) |

### 5.2 Supply Distribution

```
Total Supply: 200,000,000 VFIDE
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────────┐    │
│   │  DEV RESERVE   │   │    PRESALE     │   │     TREASURY       │    │
│   │                │   │                │   │                    │    │
│   │   50,000,000   │   │   50,000,000   │   │   100,000,000      │    │
│   │     (25%)      │   │     (25%)      │   │      (50%)         │    │
│   │                │   │                │   │                    │    │
│   │  36-mo vesting │   │  Fair launch   │   │  Liquidity + Ops   │    │
│   │                │   │ 35M base+15M   │   │  LP comes from     │    │
│   │                │   │    bonus       │   │  this allocation   │    │
│   └────────────────┘   └────────────────┘   └────────────────────┘    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Dev Reserve Vesting

The 50M dev reserve follows a strict vesting schedule:

| Parameter | Value |
|-----------|-------|
| **Cliff Period** | 60 days (2 months) |
| **Total Vesting** | 1,080 days (36 months) |
| **Unlock Interval** | 60 days (bi-monthly) |
| **Unlock Amount** | ~2,777,777 VFIDE |
| **Total Unlocks** | 18 events |

```
Month  0  2  4  6  8  10 12 14 16 18 20 22 24 26 28 30 32 34 36 38
       │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
       ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼
      CLIFF──►[2.78M per unlock over 36 months]────────────────►
```

### 5.4 Dynamic Fee Structure

VFIDE implements a revolutionary **behavioral fee model** where transaction costs depend on the sender's ProofScore:

#### 5.4.1 Fee Components

| Component | Description | Destination |
|-----------|-------------|-------------|
| **Burn** | Permanently destroyed | Null address (deflationary) |
| **Sanctum** | Charity/social good | Sanctum Vault |
| **Ecosystem** | Growth incentives (see 5.4.4) | Ecosystem Vault |

#### 5.4.2 Fee Rates by Trust Level

Fees scale **linearly** based on ProofScore (0-10000 scale):

| Trust Level | ProofScore | **Total Fee** | Approximate Split |
|-------------|------------|---------------|-------------------|
| **Elite** | ≥ 9000 | **0.25%** | ~0.21% burn, ~0.01% sanctum, ~0.03% ecosystem |
| **Standard** | 4500-9000 | **~2.5%** | ~2.1% burn, ~0.07% sanctum, ~0.33% ecosystem |
| **Low Trust** | ≤ 200 | **5.00%** | ~4.3% burn, ~0.14% sanctum, ~0.56% ecosystem |

**Fee Formula**: Linear interpolation between 0.25% (score ≥9000) and 5% (score ≤200).
Example: Score 5000 → fee = 5% - ((5000-200) × 4.75%) / 8800 ≈ 2.41%

**Fee Split Ratio**: ~85.7% burn (deflationary), ~2.9% sanctum (charity), ~11.4% ecosystem (growth)

#### 5.4.3 Fee Calculation Example

```
Alice (ProofScore 9200 - Elite) sends 10,000 VFIDE:
├── Total Fee: 0.25% (score ≥9000)
├── Burn: ~21 VFIDE (~0.21%)
├── Sanctum: ~1 VFIDE (~0.01%)
├── Ecosystem: ~3 VFIDE (~0.03%)
├── Total Fees: 25 VFIDE (0.25%)
└── Received: 9,975 VFIDE

Bob (ProofScore 150 - Low Trust) sends 10,000 VFIDE:
├── Total Fee: 5.00% (score ≤200)
├── Burn: ~429 VFIDE (~4.29%)
├── Sanctum: ~14 VFIDE (~0.14%)
├── Ecosystem: ~57 VFIDE (~0.57%)
├── Total Fees: 500 VFIDE (5.00%)
└── Received: 9,500 VFIDE
```

#### 5.4.4 Ecosystem Fee Allocation (0.2% Growth Incentives)

The ecosystem fee funds growth and sustainability through four equal buckets:

| Bucket | Share | Distribution | Mechanism |
|--------|-------|--------------|-----------|
| **Council Rewards** | 25% | Monthly | Split evenly among 1-12 active council members |
| **Merchant Bonus** | 25% | Monthly | Top 100 ranked by weighted transactions |
| **Headhunter Fund** | 25% | Quarterly | Top 20 ranked by referral points |
| **Operations** | 25% | Ongoing | Team sustainability and development |

**Council Rewards (Monthly):**
- Pool divided equally among active council members
- Whether 1 member or 12, each gets: `councilPool / activeMembers`
- Incentivizes honest governance participation

**Merchant Bonus Competition (Monthly):**

Merchants compete monthly for the merchant pool. Ranking is based on **transaction count × tier multiplier**.

**Tier Multipliers (Weight for Ranking):**

| ProofScore | Tier | Multiplier |
|------------|------|------------|
| ≥ 95% | Elite | 5× weight |
| 90-94% | High | 4× weight |
| 85-89% | Good | 3× weight |
| 80-84% | Standard | 2× weight |
| < 80% | None | Not eligible |

**Rank Share Distribution (100 positions):**

| Rank Range | Share Each | Total |
|------------|------------|-------|
| #1-5 | 5.0% | 25% |
| #6-10 | 3.0% | 15% |
| #11-20 | 2.0% | 20% |
| #21-40 | 1.0% | 20% |
| #41-60 | 0.5% | 10% |
| #61-100 | 0.25% | 10% |

*Example: Merchant A has 100 transactions at 95% score = 100 × 5 = 500 weight*
*Merchant B has 200 transactions at 85% score = 200 × 3 = 600 weight (ranks higher)*

**Headhunter Competition (Quarterly):**
- **Minimum 60% ProofScore required** to participate and claim
- Points: 1 per user referral, 3 per merchant referral
- Points accumulate all year, rankings evaluated quarterly

**Activity Thresholds (Anti-Gaming):**
- **Merchant referral**: Points credited after merchant completes **3 transactions**
- **User referral**: Points credited after user deposits **$25+ worth** in vault
- Prevents farming with inactive/fake referrals

- Top 20 positions claim from quarterly pool:

| Rank | Share | Rank | Share |
|------|-------|------|-------|
| #1 | 15.0% | #11 | 3.0% |
| #2 | 12.0% | #12 | 2.8% |
| #3 | 10.0% | #13 | 2.6% |
| #4 | 8.0% | #14 | 2.4% |
| #5 | 7.0% | #15 | 2.2% |
| #6 | 6.0% | #16 | 2.0% |
| #7 | 5.0% | #17 | 1.8% |
| #8 | 4.5% | #18 | 1.6% |
| #9 | 4.0% | #19 | 1.4% |
| #10 | 3.5% | #20 | 1.2% |

*Note: Score is checked at both referral time and claim time - prevents bad actors from gaming the system.*

### 5.5 Deflationary Mechanics

The fee model creates natural deflationary pressure:

1. **Base Burn** — Every transaction burns tokens
2. **Trust-Based Burn** — Lower trust = higher burn rates
3. **No Inflation** — Fixed supply with no minting post-genesis
4. **Fraud Deterrent** — Scammers face 10x higher burn rates

### 5.6 System Exemptions

Certain addresses are exempt from fees for operational efficiency:

- Smart contract addresses (vaults, escrow, treasury)
- DAO governance contracts
- Exchange whitelisted addresses
- System-marked exempt addresses

---

## 6. Smart Vault Infrastructure

### 6.1 Personal Smart Vaults

Every VFIDE user operates through a **Personal Smart Vault** — a dedicated smart contract wallet deployed via CREATE2 for deterministic addressing.

#### 6.1.1 Key Features

| Feature | Description |
|---------|-------------|
| **Deterministic Address** | Vault address predictable before creation |
| **Smart Account** | Can execute arbitrary transactions |
| **Guardian System** | M-of-N recovery without central custody |
| **Inheritance** | Next-of-kin claiming with timelock |
| **Abnormal Detection** | Flags unusual transactions for approval |
| **Freeze Mode** | Owner can self-freeze vault |
| **Security Integration** | PanicGuard, GuardianLock, EmergencyBreaker |

#### 6.1.2 Default Security Settings

| Parameter | Default | Range |
|-----------|---------|-------|
| Withdrawal Cooldown | 24 hours | 1 hour - 7 days |
| Execute Cooldown | 1 hour | - |
| Large Transfer Threshold | 10,000 VFIDE | 100 - 1,000,000 |
| Abnormal Tx Threshold | 50,000 VFIDE | - |
| Abnormal Tx Percentage | 50% of balance | - |

### 6.2 Guardian Recovery System

Vaults support trustless recovery through designated guardians:

```
┌───────────────────────────────────────────────────────────────────┐
│                      GUARDIAN RECOVERY FLOW                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Owner loses access                                             │
│       ↓                                                            │
│  2. Guardian requests recovery                                     │
│       ↓                                                            │
│  3. M-of-N guardians approve (majority required)                   │
│       ↓                                                            │
│  4. Wait 7-day timelock                                            │
│       ↓                                                            │
│  5. Recovery finalized → new owner set                             │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

| Parameter | Value |
|-----------|-------|
| Guardian Maturity Period | 7 days |
| Recovery Request Expiry | 30 days |
| Recovery Timelock | 7 days |
| Default Threshold | ceil(N/2) — majority |

### 6.3 Inheritance Mechanism

Vaults include built-in digital inheritance:

```
┌───────────────────────────────────────────────────────────────────┐
│                     INHERITANCE FLOW                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Owner sets next-of-kin address                                 │
│       ↓                                                            │
│  2. Heir requests inheritance claim                                │
│       ↓                                                            │
│  3. 30-day waiting period (owner can deny)                         │
│       ↓                                                            │
│  4. Guardians can approve to accelerate                            │
│       ↓                                                            │
│  5. Inheritance finalized → heir becomes owner                     │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

| Parameter | Value |
|-----------|-------|
| Inheritance Expiry | 30 days |
| Owner Denial | Can cancel anytime before finalization |
| Guardian Acceleration | Majority can approve early |

### 6.4 Abnormal Transaction Detection

Smart detection of unusual activity:

```solidity
isAbnormal = (amount >= abnormalTransactionThreshold) ||
             (amount >= (balance * abnormalTransactionPercentageBps) / 10000)
```

When detected:
1. Transaction is queued (not executed)
2. Guardians are notified
3. 24-hour approval window
4. Owner or majority guardians must approve
5. Denied transactions are cancelled

---

## 7. Security Architecture

### 7.1 Multi-Layer Security

VFIDE implements defense-in-depth with multiple independent security layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SECURITY HUB                                   │
│                  (Single Source of Truth)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Priority Order for isLocked(vault):                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 1. EmergencyBreaker — Global hard stop (highest priority)    │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ 2. GuardianLock — M-of-N manual lock                         │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ 3. PanicGuard — Time-based quarantine                        │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ 4. GlobalRisk — Soft stop for elevated risk                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 EmergencyBreaker

Global system-wide hard stop:

| Property | Value |
|----------|-------|
| Control | DAO only |
| Effect | All vault operations blocked |
| Use Case | Critical vulnerability discovered |

### 7.3 GuardianLock

Per-vault multi-signature lock:

| Parameter | Value |
|-----------|-------|
| Activation | M-of-N guardian votes |
| Threshold | Configurable (default: majority) |
| Unlock | DAO only |
| Use Case | Suspected account compromise |

### 7.4 PanicGuard

Time-based automatic quarantine:

| Parameter | Value |
|-----------|-------|
| Min Duration | 1 hour |
| Max Duration | 30 days |
| Self-Panic Cooldown | 1 day |
| Min Vault Age | 1 hour |
| Activation | DAO, Seer (automated), or self |

#### Self-Panic Feature

Users can lock their own vault:
- Useful when suspicious of compromise
- Cannot abuse to avoid obligations (cooldown)
- Auto-expires after duration

### 7.5 Circuit Breaker

Token-level emergency bypass:

| Property | Description |
|----------|-------------|
| Purpose | Bypass SecurityHub/BurnRouter if they fail |
| Control | Token owner (initially dev, then DAO) |
| Effect | Disables external calls during transfer |
| Use Case | Dependent contract bug |

### 7.6 Vault-Only Mode

Enforces all transfers through vault system:

| State | Effect |
|-------|--------|
| Enabled (default) | Direct wallet-to-wallet transfers blocked |
| Disabled | Legacy ERC-20 behavior |
| **Locked** | Permanently enabled (one-way) |

Benefits:
- Every transfer is traceable
- Security rules enforced
- Behavioral tracking possible
- Cannot circumvent vault protections

---

## 8. Commerce Platform

### 8.1 Overview

VFIDE includes a complete commerce system with:

- Merchant registry with reputation requirements
- Escrow-based transactions
- Automated dispute resolution
- **FREE** ProofScore rewards (no fees, no cashback)
- Badge achievements for active participants

**Philosophy:** Commerce rewards cost nothing to award. ProofScore is on-chain reputation that builds value. Charging fees just to fund cashback is circular and pointless.

### 8.2 Merchant Registry

#### 8.2.1 Merchant Requirements

| Requirement | Value |
|-------------|-------|
| Minimum ProofScore | 56% (5,600) |
| Automatic Suspension | 5 refunds or 3 disputes |
| Statuses | NONE, ACTIVE, SUSPENDED, DELISTED |

#### 8.2.2 Registration Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    MERCHANT REGISTRATION                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User has ≥56% ProofScore                                        │
│       ↓                                                             │
│  2. Call addMerchant(metadataHash)                                  │
│       ↓                                                             │
│  3. Status → ACTIVE                                                 │
│       ↓                                                             │
│  4. Begin accepting escrow payments                                 │
│                                                                     │
│  Auto-Suspension Triggers:                                          │
│  • 5+ refunds → SUSPENDED                                           │
│  • 3+ lost disputes → SUSPENDED                                     │
│  • ProofScore drops below 56% → SUSPENDED                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 8.3 Escrow System

#### 8.3.1 Escrow States

```
NONE → OPEN → FUNDED → RELEASED/REFUNDED/DISPUTED → RESOLVED
```

| State | Description |
|-------|-------------|
| OPEN | Escrow created, awaiting buyer funds |
| FUNDED | Buyer has deposited VFIDE |
| RELEASED | Buyer released funds to merchant |
| REFUNDED | Merchant refunded buyer |
| DISPUTED | Under DAO review |
| RESOLVED | Dispute settled |

#### 8.3.2 Standard Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                       ESCROW FLOW                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Buyer                    Contract                    Merchant      │
│    │                         │                           │          │
│    │──── open(merchant) ────►│                           │          │
│    │                         │                           │          │
│    │──── fund(escrowId) ────►│                           │          │
│    │                         │                           │          │
│    │                         │◄── delivers product/svc ──│          │
│    │                         │                           │          │
│    │──── release(id) ───────►│                           │          │
│    │                         │───── 100% payment ───────►│          │
│    │                         │                           │          │
│    │                    FREE ProofScore Rewards          │          │
│    │◄──── +2 points ─────────│───── +5 points ──────────►│          │
│                                                                     │
│                    Platform Fee: 0%                                 │
│                    Merchants receive 100% of payments               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

#### 8.3.3 Dispute Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      DISPUTE RESOLUTION                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Either party calls dispute(id, reason)                          │
│       ↓                                                             │
│  2. Escrow status → DISPUTED                                        │
│       ↓                                                             │
│  3. DAO reviews evidence                                            │
│       ↓                                                             │
│  4. DAO calls resolve(id, buyerWins)                                │
│       ↓                                                             │
│  5. Funds sent to winner                                            │
│       ↓                                                             │
│  6. Loser receives ProofScore penalty                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 8.4 FREE Commerce Incentives

#### 8.4.1 ProofScore Rewards (Free)

| Participant | ProofScore Reward | Cost |
|-------------|-------------------|------|
| Buyer | +2 points per tx | FREE |
| Merchant | +5 points per tx | FREE |

#### 8.4.2 Why No Cashback?

Cashback funded by platform fees is circular:
1. Charge merchant 3% fee
2. Give buyer 2% back as "cashback"
3. Net: merchant pays 3%, buyer gets 2%, platform keeps 1%

This is just a fee with marketing. VFIDE takes a different approach:
- **0% platform fee** → Merchants get 100% of payments
- **FREE ProofScore rewards** → Builds reputation, costs nothing
- **Badges** → Achievement system for engagement

### 8.5 Merchant Protection

#### 8.5.1 Delisted Merchant Seizure

For delisted merchants with outstanding escrows:

| Parameter | Value |
|-----------|-------|
| Grace Period | 7 days |
| Process | DAO proposes → Council executes |
| Destination | Treasury or affected buyers |

---

## 9. Governance Model

### 9.1 Overview

VFIDE implements a hybrid governance model:

1. **Initial Phase** — Developer controlled (first 6 months)
2. **Transition Phase** — Progressive handover to DAO
3. **Mature Phase** — Full community governance

### 9.2 DAO Structure

#### 9.2.1 Voting Eligibility

| Requirement | Value |
|-------------|-------|
| Minimum ProofScore | 54% (5,400) |
| Must Have Vault | Yes |
| Fatigue System | Yes (prevents vote spam) |

#### 9.2.2 ProofScore-Weighted Voting

Unlike plutocratic token-voting, VFIDE weights by behavior:

```
VoteWeight = ProofScore × (1 - FatiguePercent/100)
```

This means:
- High trust users have more influence
- Consistent voters have more weight
- Cannot buy votes with tokens
- Behavior matters more than wealth

#### 9.2.3 Governance Fatigue

To prevent vote spam:

| Parameter | Value |
|-----------|-------|
| Fatigue Per Vote | +5% |
| Recovery Rate | -5% per day |
| Maximum Fatigue | 90% |

### 9.3 Proposal System

#### 9.3.1 Proposal Types

| Type | Description | Delay |
|------|-------------|-------|
| Generic | General proposals | 48 hours |
| Financial | Treasury matters | 48 hours |
| ProtocolChange | System upgrades | 48 hours |
| SecurityAction | Emergency actions | 48 hours |

#### 9.3.2 Proposal Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                       PROPOSAL LIFECYCLE                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Member creates proposal                                         │
│       ↓                                                             │
│  2. Voting period (3 days)                                          │
│       ↓                                                             │
│  3. Finalize → If passed, queue in Timelock                         │
│       ↓                                                             │
│  4. Wait delay period (48 hours)                                    │
│       ↓                                                             │
│  5. Execute transaction                                             │
│                                                                     │
│  Voting Requirements:                                               │
│  • Minimum 5,000 total votes                                        │
│  • For > Against                                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 9.4 DAO Timelock

All DAO actions are delayed:

| Parameter | DAOTimelock | DAOTimelockV2 |
|-----------|-------------|---------------|
| Delay | 48 hours | 1-30 days (default: 2) |
| Expiry Window | 7 days | 7 days |
| Risk Mode | N/A | +6 hours if globalRisk |

### 9.5 Council System

#### 9.5.1 Council Overview

A 12-member elected body for oversight:

| Parameter | Value |
|-----------|-------|
| Council Size | 12 members |
| Minimum ProofScore | 70% (7,000) |
| Term Length | 1 year |
| Max Consecutive Terms | 1 |
| Cooldown Period | 1 year |
| Salary Interval | 4 months |

#### 9.5.2 Council Responsibilities

- Multi-sig approval for sensitive operations
- Daily ProofScore monitoring
- Dispute resolution
- Emergency response
- Force recovery approvals (3-of-12 required)

#### 9.5.3 Council Accountability

| Check | Mechanism |
|-------|-----------|
| ProofScore Drop | 7-day grace, then auto-removal |
| Inactivity | Refresh removes ineligible |
| Bad Behavior | 50%+ council vote to remove |
| Term Limits | Automatic after 1 year |

### 9.6 System Handover

Automated transition from dev to community control:

```
┌────────────────────────────────────────────────────────────────────┐
│                      HANDOVER TIMELINE                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Presale Ends           6 Months                  Handover          │
│       │                    │                         │              │
│       ▼                    ▼                         ▼              │
│  ┌─────────┐ ────────────────────────────────► ┌──────────┐        │
│  │  Start  │        180 Days                   │ Execute  │        │
│  │ (Armed) │                                   │ Handover │        │
│  └─────────┘                                   └──────────┘        │
│                                                                     │
│  Extension Conditions:                                              │
│  • Max 1 extension of 60 days                                       │
│  • Only if average network trust < threshold                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

| Parameter | Value |
|-----------|-------|
| Base Delay | 180 days (6 months) |
| Max Extensions | 1 |
| Extension Duration | 60 days |
| Minimum Delay | 90 days |

---

## 10. Badge & Achievement System

### 10.1 Overview

Badges are on-chain achievements that:

- Grant ProofScore bonuses
- Signal reputation visually
- Can be minted as soulbound NFTs (ERC-5192)
- Have permanent or renewable durations

### 10.2 Badge Categories

#### 10.2.1 Pioneer & Foundation (Permanent)

| Badge | Points | Criteria |
|-------|--------|----------|
| PIONEER | +30 | First 10,000 users |
| GENESIS_PRESALE | +40 | Presale participant |
| FOUNDING_MEMBER | +50 | First 1,000 to reach 80%+ |

#### 10.2.2 Activity & Participation (Renewable)

| Badge | Points | Duration | Criteria |
|-------|--------|----------|----------|
| ACTIVE_TRADER | +20 | 90 days | 50+ transactions |
| GOVERNANCE_VOTER | +25 | 180 days | 10+ DAO votes |
| POWER_USER | +40 | 90 days | 3+ activity types |
| DAILY_CHAMPION | +15 | 30 days | 30 consecutive days active |

#### 10.2.3 Trust & Community

| Badge | Points | Criteria |
|-------|--------|----------|
| TRUSTED_ENDORSER | +30 | 5+ good endorsements given |
| COMMUNITY_BUILDER | +35 | 10 recruits at 60%+ score |
| PEACEMAKER | +25 | 3+ dispute mediations |
| MENTOR | +30 | 5+ mentees at 54%+ score |

#### 10.2.4 Commerce & Merchants

| Badge | Points | Duration | Criteria |
|-------|--------|----------|----------|
| VERIFIED_MERCHANT | +40 | 365 days | 100+ tx, zero disputes |
| ELITE_MERCHANT | +60 | 180 days | 1,000+ tx, $100k+ volume |
| INSTANT_SETTLEMENT | +20 | 90 days | 80%+ score qualified |
| ZERO_DISPUTE | +25 | 180 days | 200+ tx, zero disputes |

#### 10.2.5 Security & Integrity

| Badge | Points | Criteria |
|-------|--------|----------|
| FRAUD_HUNTER | +50 | 3+ confirmed fraud reports |
| CLEAN_RECORD | +20 | 1 year clean (renewable) |
| REDEMPTION | +30 | 6+ months good behavior after penalty |
| GUARDIAN | +40 | 2+ years above 70% |

#### 10.2.6 Achievements & Milestones (Permanent)

| Badge | Points | Criteria |
|-------|--------|----------|
| ELITE_ACHIEVER | +50 | Reached 90%+ (top 5%) |
| CENTURY_ENDORSER | +35 | 100+ endorsements given |
| WHALE_SLAYER | +25 | Won vote against 10x holder |
| DIVERSIFICATION_MASTER | +30 | Used all ecosystem features |

#### 10.2.7 Education & Contribution

| Badge | Points | Criteria |
|-------|--------|----------|
| EDUCATOR | +30 | 5+ educational content (renewable) |
| CONTRIBUTOR | +40 | Code/design contribution |
| BUG_BOUNTY | +20-100 | Security vulnerability report |
| TRANSLATOR | +25 | Docs/UI translation |

### 10.3 Badge NFTs

Badges can be minted as soulbound NFTs:

| Property | Value |
|----------|-------|
| Standard | ERC-721 + ERC-5192 (Soulbound) |
| Transferable | No (except burn) |
| Lazy Minting | User initiates mint |
| Verification | Checks Seer before minting |

---

## 11. Fair Launch & Presale

### 11.1 Overview

VFIDE launches through a fair, transparent presale with:

- No private sale or VC allocation
- Lock incentives instead of immediate dumps
- Dynamic listing price based on participation
- Refund protection if minimum not met
- **Stablecoin-first pricing** - exact USD pricing, no volatility

### 11.2 Price Tiers

The presale offers three price tiers with limited supply at each level:

| Tier | Name | Price | Supply | Target Raise |
|------|------|-------|--------|--------------|
| **0** | Founding | $0.03 | 10,000,000 VFIDE | $300,000 |
| **1** | Oath | $0.05 | 10,000,000 VFIDE | $500,000 |
| **2** | Public | $0.07 | 15,000,000 VFIDE | $1,050,000 |
| | **Total** | | **35,000,000 VFIDE** | **$1,850,000** |

Early supporters get better pricing. Once a tier sells out, buyers must use the next tier.

### 11.3 Presale Parameters

| Parameter | Value |
|-----------|-------|
| **Accepted Payments** | USDC, USDT, DAI (preferred), ETH (optional) |
| **Base Supply** | 35,000,000 VFIDE |
| **Bonus Pool** | 15,000,000 VFIDE |
| **Total Presale** | 50,000,000 VFIDE |
| **Minimum Goal** | $612,500 USD (25% of $2.45M with bonuses) |
| **Duration** | 30 days |
| **Max Extension** | +30 days |

### 11.4 Purchase Limits

| Limit | Value |
|-------|-------|
| Minimum Purchase | $10 USD (any stablecoin) |
| Minimum ETH | 0.01 ETH (if ETH enabled, tier 2 only) |
| Maximum Per Wallet | 500,000 VFIDE |
| Maximum Per Transaction | 50,000 VFIDE |
| Max Gas Price | 500 gwei |
| Max Purchases Per Wallet | 100 |

### 11.5 Tier Lock Requirements

**Price tiers come with mandatory lock requirements.** The price discount IS the reward - no additional bonuses are given for tiers 0-1.

| Tier | Price | Lock Required | Immediate | Locked | Bonus |
|------|-------|---------------|-----------|--------|-------|
| **0 Founding** | $0.03 | 180 days | 10% | 90% | None (2.33x price advantage) |
| **1 Oath** | $0.05 | 90 days | 20% | 80% | None (1.4x price advantage) |
| **2 Public** | $0.07 | Optional | Varies | Varies | Optional lock bonuses |

#### Tier 2 Optional Lock Bonuses

Only Tier 2 (Public) buyers can choose their lock period and receive bonuses:

| Lock Period | Bonus | Immediate | Locked |
|-------------|-------|-----------|--------|
| **180 days** | +30% | 10% | 90% |
| **90 days** | +15% | 20% | 80% |
| **No lock** | 0% | 100% | 0% |

#### Why This Structure?

1. **Flippers filtered out** - Early access requires commitment
2. **Launch protection** - Tier 0-1 buyers can't dump immediately
3. **Fair trade** - Better price = longer lock
4. **Still attractive** - Even locked, Tier 0 gets 2.33x value

#### Example: Founding Tier

Alice buys $100 at Tier 0 ($0.03):
```
Base tokens: 3,333 VFIDE
Bonus: None (price IS the reward)
├── Immediate: 333 VFIDE (10%)
└── Locked 180 days: 3,000 VFIDE (90%)

At listing ($0.10): 3,333 VFIDE = $333 (3.33x return)
```

### 11.6 Dynamic Listing Price

The listing price adjusts based on presale participation:

| Participation | Listing Price | Multiplier vs Base |
|---------------|---------------|-------------------|
| < 50% sold | $0.10 | 1.43x |
| 50% sold | $0.10 | 1.43x |
| 75% sold | $0.12 | 1.71x |
| 100% sold | $0.14 | 2.00x |

This ensures early participants benefit from successful raises.

### 11.7 Presale Referral Program

Presale includes a referral program with instant bonus tokens:

| Role | Bonus | Details |
|------|-------|---------|
| **Buyer (Referee)** | +2% | Extra VFIDE added to purchase |
| **Referrer** | +3% | Bonus VFIDE for each referral |

**How it works:**
1. Existing buyers share their wallet address as referral code
2. New buyers enter the referral address when purchasing
3. Both parties receive instant bonus tokens from the bonus pool
4. No limit on referrals - stack rewards indefinitely

**Example:**
- Bob refers Alice who buys 10,000 VFIDE at Tier 1
- Alice receives: 10,000 + 200 (2% bonus) = 10,200 VFIDE
- Bob receives: 300 VFIDE (3% of Alice's base purchase)

### 11.8 Refund Protection

If minimum goal (25%) is not met:

1. Refunds are enabled after sale period
2. Buyers can claim full refund (stablecoins or ETH)
3. No tokens are distributed
4. Presale considered failed

---

## 12. Technical Specifications

### 12.1 Smart Contract Summary

| Contract | Purpose | Lines |
|----------|---------|-------|
| VFIDEToken | ERC-20 with vault-only and dynamic fees | ~500 |
| VaultInfrastructure | Vault factory + UserVault | ~960 |
| VFIDETrust | ProofLedger + Seer + BurnRouter | ~400 |
| VFIDESecurity | SecurityHub + Guards | ~300 |
| VFIDECommerce | Merchant + Escrow | ~500 |
| VFIDEFinance | Treasury contracts | ~200 |
| VFIDEBenefits | Rewards system | ~200 |
| VFIDEPresale | Fair launch presale | ~600 |
| DAO + Timelock | Governance | ~400 |
| Council contracts | Election + Management | ~500 |
| DevReserveVesting | Founder vesting | ~300 |
| SystemHandover | Dev→DAO transition | ~100 |
| BadgeNFT + Registry | Achievement system | ~500 |
| SharedInterfaces | Common types | ~300 |

**Total: ~5,500+ lines of audited Solidity**

### 12.2 Technical Stack

| Component | Technology |
|-----------|------------|
| Language | Solidity 0.8.30 |
| Network | zkSync Era (EVM compatible) |
| Framework | Foundry |
| Compiler | solc with via-IR optimization |
| EVM Version | Cancun |
| Testing | Foundry (unit + fuzz + invariant) |

### 12.3 Security Measures

| Measure | Implementation |
|---------|----------------|
| Reentrancy Protection | OpenZeppelin ReentrancyGuard |
| Access Control | Custom modifier patterns |
| Overflow Protection | Solidity 0.8.x native |
| Time Manipulation | Block.timestamp with tolerances |
| Flash Loan Protection | 7-day time-weighted scoring |
| Formal Verification | Planned |

### 12.4 Gas Optimization

| Technique | Benefit |
|-----------|---------|
| CREATE2 Deployment | Predictable vault addresses |
| via-IR Compilation | Optimized bytecode |
| Packed Structs | Reduced storage slots |
| Batched Operations | Lower per-tx overhead |
| Cached Lookups | Reduced SLOAD costs |

### 12.5 Test Coverage

| Category | Tests |
|----------|-------|
| Unit Tests | 150+ |
| Fuzz Tests | 30+ |
| Integration Tests | 20+ |
| **Total** | **193 passing** |

---

## 13. Roadmap

### Phase 1: Foundation (Q4 2025)
- [x] Core smart contract development
- [x] Comprehensive testing (193 tests)
- [x] Security audit preparation
- [ ] External security audit
- [ ] zkSync Era testnet deployment

### Phase 2: Launch (Q1 2026)
- [ ] Presale launch
- [ ] Mainnet deployment
- [ ] DEX liquidity provision
- [ ] Initial user onboarding
- [ ] Badge NFT launch

### Phase 3: Growth (Q2-Q3 2026)
- [ ] Merchant onboarding program
- [ ] Mobile app development
- [ ] Fiat on-ramp integration
- [ ] Cross-chain bridge exploration
- [ ] Partnership announcements

### Phase 4: Maturity (Q4 2026+)
- [ ] System handover to DAO
- [ ] Council elections
- [ ] Advanced governance features
- [ ] Ecosystem expansion
- [ ] Enterprise solutions

---

## 14. Conclusion

VFIDE represents a fundamental reimagining of blockchain economics through the lens of behavioral trust. By making reputation measurable, consequential, and rewarding, the ecosystem creates natural incentives for good behavior while progressively marginalizing bad actors.

### Key Takeaways

1. **Trust Matters** — ProofScore makes reputation a first-class citizen, affecting fees, governance, and access

2. **Security by Default** — Personal smart vaults provide institutional-grade protection for every user

3. **Fair Economics** — Dynamic fees reward loyalty and penalize bad behavior, creating sustainable tokenomics

4. **Progressive Decentralization** — Structured transition from developer control to community governance

5. **Complete Commerce** — Built-in escrow, merchant registry, and dispute resolution enable trustless trade

### The VFIDE Promise

In a world where trust is scarce and fraud is common, VFIDE offers a different path: **earn your reputation, and the system rewards you**. Bad actors face increasing costs until participation becomes uneconomical. Good actors enjoy reduced fees, enhanced privileges, and growing influence.

This is not just another token. It's a new model for blockchain communities — one where behavior builds value, and value builds trust.

---

## Appendix A: Contract Addresses

*To be populated after deployment*

| Contract | Address |
|----------|---------|
| VFIDEToken | TBD |
| VaultInfrastructure | TBD |
| Seer (ProofScore) | TBD |
| ProofLedger | TBD |
| SecurityHub | TBD |
| DAO | TBD |
| DAOTimelock | TBD |
| VFIDEPresale | TBD |
| DevReserveVesting | TBD |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **ProofScore** | Behavioral reputation score (0-100%) |
| **Vault** | Personal smart contract wallet |
| **Seer** | ProofScore calculation engine |
| **ProofLedger** | Immutable event log |
| **Guardian** | Trusted party for vault recovery |
| **PanicGuard** | Time-based vault lock |
| **Escrow** | Held payment awaiting release |
| **Fatigue** | Voting power reduction from frequent voting |
| **Handover** | Transition from dev to DAO control |
| **Soulbound** | Non-transferable (NFT term) |

---

## Appendix C: References

1. ERC-20: Token Standard — https://eips.ethereum.org/EIPS/eip-20
2. EIP-2612: Permit — https://eips.ethereum.org/EIPS/eip-2612
3. ERC-5192: Soulbound — https://eips.ethereum.org/EIPS/eip-5192
4. zkSync Era — https://era.zksync.io/
5. Foundry — https://book.getfoundry.sh/

---

*This whitepaper is for informational purposes only and does not constitute financial advice. Always do your own research before participating in any cryptocurrency project.*

**© 2025 VFIDE. All rights reserved.**
