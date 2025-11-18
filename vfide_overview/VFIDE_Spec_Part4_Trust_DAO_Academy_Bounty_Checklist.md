
# VFIDE – System Spec (Part 4: Seer/Trust, DAO, Academy, Earnables, Bounty, Checklist)

This document is Part 4 of the VFIDE ecosystem spec. It covers:

14. Seer / ProofScore trust system
15. DAO & governance
16. Academy & Earnables
17. Break-the-Chain bounty
18. Frontends & Scroll of Laws
19. Builder checklist

---

## 14. Seer / Trust & ProofScore System

Seer is the user-facing name for the trust system: ProofScore plus explanations and simulations. Most computation is off-chain, driven by on-chain data and log events.

### 14.1 Inputs to ProofScore

- **Token movements:**
  - Frequency and size of transfers.
  - Trend (accumulating vs constantly dumping).
  - Use of vaults for large transfers instead of bare EOAs.

- **Vault behavior:**
  - Frequency of `WithdrawalRequested` and `WithdrawalExecuted` events.
  - How often large withdrawals occur compared to total holdings.
  - Whether user respects cooldowns and uses vault instead of risky patterns.

- **Guardian and recovery usage:**
  - Count of GuardianLock activations and releases.
  - Number of recovery initiations and completions (rare but serious events).
  - Next-of-Kin transfers.

- **PanicGuard interactions:**
  - How often user ends up under user-specific panic state.
  - Whether they repeatedly cause patterns that trigger PanicGuard logic.

- **Staking behavior:**
  - Average staking duration.
  - Fraction of holdings staked over time.
  - Stability vs constant “in-out” speculation.

- **DAO participation:**
  - Number of proposals voted on.
  - Long-term consistency of participation (not necessarily which side they choose).

- **Academy & Earnables:**
  - Completed Academy levels.
  - Earned badges/scrolls/relics: early supporter, bug hunter, long-term holder, etc.

### 14.2 Off-Chain Trust Scoring Service

**Module:** backend `trust_scoring` service.

**Process**

1. Indexer loads on-chain events and builds user behavior profiles.
2. For each user (identified by primary vault or profile):
   - Compute sub-scores:
     - `stabilityScore` – long-term consistent holding and use of vaults.
     - `safetyScore` – correct use of guardians, vaults, low incidence of risky events.
     - `participationScore` – staking, DAO voting, Academy completion.
     - `incidentImpact` – negative weight for recoveries, repeated GuardianLock, repeated panic states.

3. Combine values into a ProofScore on a 0–1000 scale, using a documented formula, for example:

```text
ProofScore = 200
   + stabilityScore    * w1
   + safetyScore       * w2
   + participationScore* w3
   - incidentImpact    * w4
```

- Weights `w1–w4` are constants published in Scroll of Laws.
- Changes to weights can only be made via a DAO proposal and timelock.

4. Map ProofScore to risk category:

- 0–199: Critical
- 200–399: High
- 400–599: Moderate
- 600–799: Good
- 800–1000: Excellent

5. Store history so frontends can show trust trends over time.

### 14.3 Optional On-Chain TrustSignals

**File:** `contracts/trust/TrustSignals.sol`

- Simple contract that stores a compact `riskLevel` or `trustTier` for addresses.
- Updated periodically by a trusted updater contract authorized by DAO.
- Used by other on-chain modules that need a simple risk indicator without heavy computation.

### 14.4 Seer Advisory Service

**Module:** backend `advisory` service.

**Purpose**

Convert scores and events into clear, actionable explanations and suggestions, for example:

- “Your trust level is GOOD because you use vaults for large withdrawals, stake consistently, and have no recent recovery events.”
- “To improve your trust level, consider: setting guardians, extending staking duration, completing the Vault Safety Academy lesson.”

**Inputs**

- Current ProofScore + risk category.
- Recent ProofLedger events for the user.
- Staking, DAO, and Academy status.

**Outputs**

- Short explanation for the Trust page.
- List of recommended actions.
- Data for Dark Trust simulator.

### 14.5 Dark Trust Simulator

- Frontend feature that lets the user simulate “what if” actions.
- Example scenario inputs:
  - “Execute a withdrawal 5x larger than usual during low liquidity.”
  - “Trigger two recoveries in 3 months.”
- Backend recalculates a hypothetical ProofScore using same formula without committing it.
- Frontend displays estimated score change and explanation.

No on-chain writes; this is educational only.

---

## 15. DAO & Governance

### 15.1 VFIDEGovernor

**File:** `contracts/dao/VFIDEGovernor.sol`  
**Purpose:** Core governance contract.

**Design**

- Based on a Governor pattern with:
  - Voting power derived primarily from VFIDE holdings (and possibly staked balance).
  - Optional gating that proposals must be created or sponsored by DAOMembership members.

**Responsibilities**

DAO can:

- Adjust FeeRouter config within allowed ranges.
- Adjust PanicGuard global parameters: `maxWithdrawalDuringPanic`, duration limits.
- Approve Sanctum disbursements.
- Manage list of authorized emitters in ProofLedger.
- Approve new vault templates in VaultFactory.
- Adjust any on-chain TrustSignals settings.
- Manage certain parameters of staking rewards if encoded on-chain.

Major architectural changes requiring new contracts are done via new deployments and community migration, not silent upgrades.

### 15.2 TimelockController

**File:** `contracts/dao/TimelockController.sol`

- Mediates execution of all configuration-changing actions.
- Each successful proposal schedules an operation with a delay (e.g., 48–72h).
- Delay cannot be set below an enforced minimum.
- Users can monitor forthcoming changes and respond if they disagree (social or market actions).

### 15.3 DAOMembership

**File:** `contracts/dao/DAOMembership.sol`  
**Purpose:** Keep track of core council members (e.g., 12 seats).

**State**

```solidity
address[] members;
mapping(address => bool) isMember;
address owner; // DAO sets membership changes
```

**Functions**

- `addMember(address account)` – only DAO.
- `removeMember(address account)` – only DAO.
- `listMembers()` – view.

Off-chain logic can enforce minimum ProofScore or other conditions before nominating someone for membership; actual membership changes are done via on-chain proposals.

---

## 16. Academy & Earnables

### 16.1 Academy

Implementation is mostly off-chain (frontend + backend), but it influences on-chain behavior.

**Backend tables**

```text
Table: academy_lessons
  id, name, description, module, order_index

Table: academy_progress
  user_address, lesson_id, completed_at, score, etc.
```

**Flows**

- User completes lessons in the dApp (videos, reading, interactive tasks).
- Frontend reports completion to backend.
- Backend verifies and records progress.
- When key milestones are reached (e.g., “Vault Safety 100% complete”), backend triggers on-chain reward if applicable:

  - Either by instructing user to call a “claimAchievement” function on EarnableCollection.
  - Or by using a minimal minting service that the user must approve once.

Completion of safety lessons is a positive factor for ProofScore.

### 16.2 EarnableCollection

**File:** `contracts/earnables/EarnableCollection.sol`  
**Purpose:** Mint soulbound badges, scrolls, and relics reflecting achievements and trust milestones.

**Design**

- Use ERC-1155 or ERC-721 with transfer overridden to prevent transfers:
  - Only mint (by authorized roles) and burn (optional) allowed.
- IDs map to specific achievements:

  - Badges:
    - Flamekeeper – early presale supporter.
    - Oathbound – completed initial VFIDE introduction and commitment.
    - Purifier – participated in security testing or code review.
    - Bountybreaker – found a valid vulnerability.
    - Chainsworn – long-term holder or staker.
  - Scrolls:
    - Protection Scroll – configured guardians and passed vault safety lesson.
    - Next-of-Kin Scroll – properly set up inheritance.
  - Relics:
    - Rare items for multi-year contributions.

**Minting controls**

- Only specific addresses (academy backend signer, bounty module, DAO) may mint specific IDs.
- All mints emit events for full transparency.

**Events**

```solidity
event EarnableMinted(address indexed to, uint256 indexed id, uint256 amount);
event EarnableBurned(address indexed from, uint256 indexed id, uint256 amount);
```

Earnables may grant small positive contributions to ProofScore formulas, clearly documented.

---

## 17. Break-the-Chain Bounty Program

### 17.1 Purpose

Encourage ethical hackers and security researchers to inspect VFIDE and report vulnerabilities.

### 17.2 On-Chain BountyVault (Optional)

**File:** `contracts/bounty/BountyVault.sol`

**State**

- `IERC20 vfide;`
- `uint256 totalBountyPool;`
- `address owner;` // DAO

**Functions**

- `fundBounty(uint256 amount)` – DAO moves VFIDE into BountyVault.
- `payBounty(address researcher, uint256 amount, bytes32 reportId)`
  - Only DAO/timelock.
  - Transfer `amount` VFIDE to `researcher`.
  - Emit `BountyPaid(researcher, amount, reportId)`.
  - Log via ProofLedger actionType 12.

**Event**

```solidity
event BountyPaid(address indexed researcher, uint256 amount, bytes32 reportId);
```

### 17.3 Off-Chain Process

- Public bounty rules:
  - In-scope contracts and severity rating.
  - Reporting channels.
  - Reward bands per severity.
- Post-mortems where possible, reinforcing transparency and culture of scrutiny.

---

## 18. Frontends & Scroll of Laws

### 18.1 Main dApp

**Core routes**

- `/` – overview.
- `/wallet` – vaults, balances, deposits, withdrawals, guardians.
- `/trust` – ProofScore, explanation, Dark Trust simulator.
- `/stake` – staking controls and history.
- `/dao` – proposals, votes, results.
- `/sanctum` – Sanctum balances, disbursement history, charts.
- `/academy` – lessons and progress.
- `/earnables` – badges/scrolls/relics display.
- `/merchant` – info and link to merchant portal.
- `/laws` – Scroll of Laws.
- `/legal` – risks and disclaimers.

Frontend uses contracts and backend APIs described in Parts 1–3.

### 18.2 Merchant Portal

- `/merchant/dashboard` – revenue, payments list, trust labels for customers.
- `/merchant/checkout` – generate QR/invoice, show status.
- `/merchant/settings` – update metadata, settlement vault, contact info.

### 18.3 Scroll of Laws

- Human-readable specification that corresponds 1:1 with contracts:
  - Token supply and allocations.
  - Governance rules and timelocks.
  - Vault and guardian behavior.
  - PanicGuard rules.
  - Fees, Sanctum splits, burn logic.
  - ProofScore formulas and weights.
  - Bounty process.

Changes to these laws must happen in public through DAO proposals.

---

## 19. Builder Checklist (Full Ecosystem)

A development team can consider VFIDE correctly implemented when all of these are delivered and verified:

1. **Token & Supply**
   - Immutable VFIDE ERC-20 with 200M supply and correct initial allocations.

2. **Presale**
   - Three-tier VFIDEPresale with correct prices, caps, vesting, and on-chain accounting.
   - No way to exceed 75M presale allocation.

3. **Vaults & Controller**
   - VaultFactory, StandardVault, DevVestingVault implemented and audited.
   - VaultController enforcing vault-only flows and system exemptions.

4. **Guardians & Recovery**
   - GuardianRegistry, GuardianLock, ChainOfReturn, NextOfKin fully wired.
   - Recovery and inheritance flows tested end-to-end, including delays and approvals.

5. **PanicGuard**
   - Global and per-user panic controls influencing vault withdrawals.
   - Events and logs proving when and why panic states are used.

6. **ProofLedger / EVT**
   - Action logging contract used consistently by protection, treasury, bounty, and governance modules.

7. **Staking**
   - StakingPool contract with predictable reward math and event logging.
   - Staking behavior visible to trust scoring.

8. **Fees / Burns / Sanctum**
   - FeeRouter splitting protocol fees between Sanctum, burns, ops, and staking.
   - SanctumVault with controlled, DAO-approved disbursements.
   - BurnManager performing transparent, logged burns.

9. **Merchants**
   - MerchantRegistry and MerchantSettlement supporting VFIDE payments.
   - Events integrated into merchant dashboards and trust indicators.

10. **Seer / ProofScore**
    - Off-chain trust_scoring and advisory services fully functional and documented.
    - Dark Trust simulator available to users.

11. **DAO & Governance**
    - VFIDEGovernor, TimelockController, DAOMembership deployed and controlling critical parameters.
    - Proposals, votes, and executions visible on-chain and in the UI.

12. **Academy & Earnables**
    - Academy backend tracking lessons and tying into EarnableCollection.
    - Earnables minted based on clear criteria and visible in the dApp.

13. **Bounty & Culture**
    - Bounty program (with or without on-chain BountyVault) live and documented.
    - Security findings and responses linked back to ProofLedger and public posts.

14. **Frontends & Scroll of Laws**
    - Main dApp, merchant portal, and docs site implemented.
    - Scroll of Laws published and aligned with actual contracts.

Once all of the above are in place, VFIDE exists as a complete, coherent ecosystem that matches the design intent of this spec.
