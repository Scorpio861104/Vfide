
# VFIDE – End‑to‑End Builder Specification  
**Version:** 1.0 (Master Build Spec)  
**Goal:** Give a senior dev or team everything needed to build VFIDE from the ground up, with no guesswork.

> This document describes contracts, services, databases, frontends, security practices, deployment flow, and governance for the VFIDE ecosystem. It is written so a capable team can start from zero and arrive at the intended system.

---

## 1. Core Vision & Principles

VFIDE is a **trust‑centric financial ecosystem**, not just a token. Everything is built around:

1. **Protection first** – users should be hard to rug, hard to hack, and hard to lose everything by mistake.
2. **Transparency** – all important rules are on‑chain and documented in human language.
3. **Predictable tokenomics** – clear supply, vesting, burns, and charity allocations.
4. **Behavior‑based trust** – reputation is earned by on‑chain behavior and participation, not marketing.
5. **Gradual decentralization** – system starts under tight, transparent control and progressively moves into DAO governance.

From a builder’s perspective, think in four layers:

1. **Base Asset Layer** – VFIDE token, presale, vaults, staking, burns, Sanctum, merchant payment flows.
2. **Protection Layer** – vault separation, GuardianLock, PanicGuard, Chain‑of‑Return, Next‑of‑Kin, withdrawal friction.
3. **Trust & Scoring Layer** – ProofScore engine, Trust Advisor, Dark Trust simulator, ProofLedger.
4. **Governance & Culture Layer** – DAO, Scroll of Laws, Academy, Earnables, bounties, legal + social commitments.

Everything below defines how to implement these layers.

---

## 2. Technical Stack Overview

### 2.1 Blockchain & Tools

- **Target network:** Ethereum Layer‑2 (zkSync or Arbitrum; final choice set before deployment).
- **Smart contract language:** Solidity `^0.8.20` to `^0.8.30` range (lock exact pragma when finalized).
- **Development framework:** Hardhat + TypeScript.
- **Testing:** Hardhat + Foundry (forge) for fuzzing is recommended.
- **Static analysis:** Slither + additional linters (solhint).
- **Contract standards:**
  - ERC‑20 (VFIDE token).
  - ERC‑721 or ERC‑1155 for Earnables (badges, scrolls, relics), with soulbound mechanics.
  - Governance standard similar to OpenZeppelin Governor with customizations.

### 2.2 Backend & Services

- **Language:** Node.js (TypeScript).
- **Services (microservice or modular monolith):**
  1. **Indexer Service** – reads chain events, normalizes data.
  2. **Trust Scoring Service** – computes ProofScore using rules and formulas.
  3. **Advisory Service** – generates human‑readable messages based on scores and events.
  4. **Notification Service** – emails / push / webhooks for risk events, freezes, etc.
  5. **DAO/Reporting Service** – generates reports and dashboards.

### 2.3 Frontend

- **Framework:** React (Next.js or plain Vite React).
- **Styling:** Tailwind CSS.
- **Wallet Integration:** wagmi + viem (or ethers.js) for EVM.
- **UI aesthetic:** dark parchment base, gold highlights, Cinzel‑style heading font, modern but “ancient scroll” theming.

### 2.4 Storage

- **User profiles & metadata:** Postgres.
- **Cache & queues:** Redis.
- **Logs:** Append‑only logging to S3‑style storage + centralized log system (e.g., Loki, ELK, or similar).

---

## 3. Repository & Project Structure

A recommended mono‑repo layout:

```text
vfide/
  contracts/
    token/
    presale/
    vaults/
    guardians/
    trust/
    dao/
    staking/
    sanctum/
    merchant/
    earnables/
    interfaces/
    libraries/
  backend/
    indexer/
    trust_scoring/
    advisory/
    notifications/
    dao_reporting/
    shared/
  frontend/
    webapp/          # main dApp
    merchant_portal/
    docs_site/       # Laws, Academy, etc.
  infra/
    hardhat/
    foundry/
    docker/
    k8s/
  tests/
    unit/
    integration/
    fuzz/
  docs/
    specs/
    threat_models/
```

This document primarily defines **what each folder must contain** and how modules interact.

---

## 4. Smart Contract Architecture (On‑Chain Core)

### 4.1 VFIDE Token Contract

**File:** `contracts/token/VFIDE.sol`  

**Responsibilities**

- Standard ERC‑20 with:
  - `totalSupply = 200,000,000 VFIDE` fixed.
  - Minting only in constructor to predefined addresses:
    - Presale/Distribution Vault.
    - Dev Vesting Vault.
    - Staking/Rewards Vault.
    - Sanctum Vault.
    - Liquidity/Reserve Vault(s).
- No transfer taxes or complex hooks at token level.
- Pausing, if any, must be extremely constrained or removed entirely after launch.

**Key Requirements**

- Use OpenZeppelin ERC20 as base.
- Constructor receives configuration struct:
  - addresses for each initial holder.
  - allocation amounts.
- After deployment, `mint` function is disabled; no further supply increase allowed.

**Security Constraints**

- No upgradability for the token contract (immutable).  
- Contract fully verified on block explorer.

---

### 4.2 Presale Contract

**File:** `contracts/presale/VFIDEPresale.sol`  

**Responsibilities**

- Manage three tiers of presale:
  - Tier 1: **Founding Scrolls** – price 0.03 USD equivalent.
  - Tier 2: **Oath Takers** – price 0.05 USD equivalent.
  - Tier 3: **Public Presale** – price 0.07 USD equivalent.
- Accept stablecoin deposits (e.g., USDC) and record allocations in VFIDE.
- Enforce tier caps and per‑address limits.
- Enforce locking rules per tier.

**Key Data Structures**

```solidity
struct TierConfig {
    uint256 priceInUsd;       // 3, 5, 7 cents * 1eX
    uint256 maxTokens;        // tier supply cap
    uint256 minContribution;  // in stablecoin
    uint256 maxContribution;  // in stablecoin
    uint64  startTime;
    uint64  endTime;
    uint64  vestingStart;     // when claim or vesting starts
    uint64  vestingDuration;  // duration for unlock
}
```

- Mapping `tierId => TierConfig` (tierId = 1,2,3).
- Mapping `user => UserPurchase` storing total contributions per tier.

**Main Flows**

1. `purchase(tierId, amountStablecoin)`
   - Validates active tier, min/max, and cap.
   - Transfers stablecoin from user.
   - Records purchased VFIDE amount calculated from price.
2. `claim()`
   - After vesting start, user can claim vested portion of their VFIDE.
   - Calls into a vault system or issues VFIDE to user’s vault/wallet depending on chosen path.

**Admin Controls**

- Owner (multisig) can:
  - Configure tier times and caps before presale starts.
  - Recover mistakenly sent tokens (with restrictions).
- After presale ends and initial distribution is complete, some controls are locked to prevent misuse.

**Security Constraints**

- Hard limit: total tokens sold across tiers cannot exceed 75,000,000 VFIDE.
- No backdoor for arbitrary token distribution from presale.

---

### 4.3 Vault System

**Files:**
- `contracts/vaults/VaultFactory.sol`
- `contracts/vaults/StandardVault.sol`
- `contracts/vaults/DevVestingVault.sol`
- `contracts/vaults/SanctumVault.sol`
- `contracts/vaults/StakingVault.sol`
- `contracts/vaults/MerchantVault.sol`
- `contracts/vaults/VaultController.sol`

#### 4.3.1 Vault Concept

A vault is a contract that **holds assets** on behalf of a user or system, enforcing rules:

- Withdrawal friction (delays, limits).
- Guardian approvals (for some actions).
- PanicGuard overrides (for global emergencies).

#### 4.3.2 VaultFactory

- Deploys `StandardVault` instances with proper configuration.
- Tracks mapping `owner => vaults[]`.
- Only approved templates (whitelisted by governance) can be deployed.

#### 4.3.3 StandardVault

- Holds VFIDE and optionally whitelisted tokens.
- Exposes:

```solidity
function deposit(address token, uint256 amount) external;
function requestWithdrawal(address token, uint256 amount) external;
function executeWithdrawal(uint256 requestId) external;
function cancelWithdrawal(uint256 requestId) external;
```

- Each withdrawal request:
  - Is stored with timestamp.
  - Subject to cooldown (configurable, e.g., 24–72 hours).
  - Subject to guardian hooks and PanicGuard rules.

#### 4.3.4 DevVestingVault

- Holds exactly 40,000,000 VFIDE at deployment.
- Config:
  - 3‑month cliff from `vestingStart`.
  - Linear vesting over 36 months.
- Only beneficiary (the founder) can withdraw vested amount.
- No function to change beneficiary after deployment.

#### 4.3.5 VaultController

- Central access control for functions that must be **vault‑only**.
- Exposes:

```solidity
function setSystemExempt(address system, bool exempt) external onlyOwner;
function setVaultOnly(address target, bool vaultOnly) external onlyOwner;
function setVaultFactory(address factory) external onlyOwner;
function isVault(address addr) external view returns (bool);
function isSystemExempt(address addr) external view returns (bool);
```

Usage example:

- Staking contract may require deposits to come only from a vault, unless it is flagged as `systemExempt` for internal operations.
- Large transfers of VFIDE may require the caller to be a vault (not a bare wallet) if `vaultOnly` is set for specific flows.

**Deployment Requirement:**  
These settings (`setSystemExempt`, `setVaultOnly`, `setVaultFactory`) must be configured once, documented, and then either locked or placed under strict DAO control with timelocks.

---

### 4.4 Guardians & Recovery

**Files:**
- `contracts/guardians/GuardianRegistry.sol`
- `contracts/guardians/GuardianLock.sol`
- `contracts/guardians/ChainOfReturn.sol`
- `contracts/guardians/NextOfKin.sol`

#### 4.4.1 GuardianRegistry

- Maps `user => guardian set`.
- Guardian set may include:
  - Known friends/family.
  - Trusted institutions (optional).
- Each guardian has a weight or simple “1 vote” depending on design.

#### 4.4.2 GuardianLock

- Implements **soft freeze** logic:
  - Guardians can call `triggerLock(userVault)`.
  - Locked vault cannot execute high‑risk actions (withdraw, transfer above thresholds) until unlocked.
- Unlock requires:
  - Guardian quorum.
  - Or predefined time delay plus user confirmation.

#### 4.4.3 ChainOfReturn

- Handles wallet compromise or loss.
- Flow:
  1. User or guardian initiates recovery request.
  2. Guardian approvals are collected.
  3. After time delay, funds are migrated from old vault/wallet to a new vault controlled by same owner.
- Events emitted for every step for ProofLedger consumption.

#### 4.4.4 NextOfKin

- Allows user to register `nextOfKinVault` and conditions:
  - Inactivity duration.
  - Guardian quorum to confirm event.
- When conditions are met, controlled transfer from user vault to Next‑of‑Kin vault.

---

### 4.5 ProofLedger & Trust Scoring Support

**Files:**
- `contracts/trust/ProofLedger.sol`
- `contracts/trust/TrustSignals.sol` (optional)

#### 4.5.1 ProofLedger

- On‑chain event logger for important actions:
  - Freezes/unfreezes.
  - Recovery events.
  - Large withdrawals.
  - PanicGuard activations.
  - DAO dispute resolutions.
- Emits structured events (e.g. `event ActionLogged(address user, uint8 actionType, bytes32 metadataHash);`).
- Backend indexer consumes these events to feed Trust Scoring Service.

#### 4.5.2 TrustSignals (Optional)

- Could expose minimal on‑chain trust signals (like “level” or “flag”) derived from ProofScore.
- Most heavy calculation is off‑chain, but some simplified outputs may be anchored on‑chain periodically (e.g., aggregated flag bits).

---

### 4.6 DAO Governance

**Files:**
- `contracts/dao/VFIDEGovernor.sol`
- `contracts/dao/TimelockController.sol`
- `contracts/dao/DAOMembership.sol`

#### 4.6.1 Governance Model

- Start with controlled governance (founder + selected early guardians).
- Over ~6 months, transition to community‑weighted governance based on:
  - Token holdings.
  - ProofScore‑based adjustments or membership gating (through DAOMembership contract).

#### 4.6.2 VFIDEGovernor

- Based on OpenZeppelin Governor with customizations:
  - Proposal creation requires:
    - Minimum VFIDE voting power and/or membership status.
  - Voting power could combine:
    - Token balance.
    - Staked balance.
    - Adjustments derived from off‑chain ProofScore (locked into DAOMembership contract via periodic updates).

#### 4.6.3 TimelockController

- All critical protocol actions go through timelock, giving community time to review.
- Example delayed actions:
  - Change PanicGuard thresholds.
  - Adjust Sanctum allocation percentages.
  - Approve contract upgrades or new vault templates.

#### 4.6.4 DAOMembership

- Manages list of **active DAO members** (e.g., 12 council seats).
- Seats can be:
  - Initially appointed.
  - Later rotated based on ProofScore, contribution, and votes.

---

### 4.7 Staking & Rewards

**Files:**
- `contracts/staking/StakingPool.sol`
- `contracts/staking/StakingRewardsDistributor.sol`

**Key Features**

- Users stake VFIDE from vaults into staking pools.
- Rewards derived from:
  - Dedicated staking allocation.
  - Optional flows from protocol fees or buybacks.

**Functions**

- `stake(amount)`
- `unstake(amount)`
- `claimRewards()`
- Multipliers based on lock duration and/or trust level (values provided by backend or encoded as parameters at stake creation; actual trust score reading handled by off‑chain service).

---

### 4.8 Sanctum & Burns

**Files:**
- `contracts/sanctum/SanctumVault.sol`
- `contracts/sanctum/BurnManager.sol`

**SanctumVault**

- Holds funds reserved for charity and impact.
- Only DAO‑approved transactions can send funds out, with event logging.

**BurnManager**

- Receives portions of protocol fees or directed funds.
- Calls token contract’s `transfer` to a burn address or uses a `burn` function if available.

**Rules**

- Split examples (exact numbers decided before deployment and encoded):
  - X% to Sanctum.
  - Y% to burns.
  - Z% to ecosystem operations or staking.

---

### 4.9 Merchant System

**Files:**
- `contracts/merchant/MerchantRegistry.sol`
- `contracts/merchant/MerchantSettlement.sol`

**MerchantRegistry**

- Stores merchant profiles:
  - Merchant vault address.
  - Metadata hash (off‑chain profile).
  - Status (approved, suspended, etc.).

**MerchantSettlement**

- Handles payments from users to merchants:
  - Takes VFIDE payments.
  - Optionally routes through a DEX for immediate stablecoin conversion (via integration, not custom swap router logic, whenever possible).
  - Emits events for each payment for indexer and reporting.

---

### 4.10 Earnables: Badges, Scrolls, Relics

**Files:**
- `contracts/earnables/EarnableCollection.sol`

**Implementation**

- Use ERC‑1155 or multiple ERC‑721 contracts with soulbound restriction (no transfers, only mint and burn).
- Each earnable ID corresponds to a badge/scroll/relic:
  - Example: `1 = Flamekeeper`, `2 = Oathbound`, etc.
- Minting controlled by backend service or governance contract based on conditions:
  - Completion of Academy lessons.
  - Participation in governance.
  - Bug bounty contributions.

---

## 5. Off‑Chain Services & Trust System

### 5.1 Indexer Service

**Purpose:** Capture on‑chain data into Postgres.

- Connect to blockchain via RPC and websockets.
- Subscribe to events from:
  - VFIDE token.
  - Vaults.
  - Guardians.
  - ProofLedger.
  - DAO.
  - Merchant contracts.
- Persist into normalized database tables:
  - `users`, `vaults`, `transactions`, `ledger_events`, `dao_votes`, `stakes`, `merchant_payments`, etc.

### 5.2 Trust Scoring Service (ProofScore Engine)

**Inputs:**

- Historical transactions.
- Ledger events (locks, recoveries, large withdrawals, PanicGuard triggers).
- Participation:
  - Staking history.
  - DAO voting.
  - Academy completion.
- Time factors (length of participation, inactivity patterns).

**Outputs:**

- A numeric **ProofScore** per user/vault, e.g. 0–1000.
- Risk levels (e.g., `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

**Behavior Examples:**

- Long‑term, consistent, non‑abusive users: high score.
- Repeated use of recovery flows, frequent panic actions, heavy dumping into thin liquidity: lower score.
- Solvers of bounties, early supporters, educators: score bonuses.

Scores are periodically recomputed and stored in database, with optional hashes anchored to chain via `TrustSignals`.

### 5.3 Advisory Service

- Converts numeric scores and events into human‑readable messages:
  - Explains why a user’s ProofScore is what it is.
  - Suggests steps to improve it (e.g., “avoid repeated large withdrawals in short windows,” “finish Academy level 2 to unlock feature X”).
- Provides text displayed in the **Trust / Seer page**.

### 5.4 Notification Service

- Sends alerts for:
  - GuardianLock triggers.
  - PanicGuard state changes.
  - Large or unusual withdrawals.
  - Next‑of‑Kin threshold approaching, etc.

### 5.5 DAO & Reporting Service

- Generates routine reports for community:
  - Supply charts.
  - Burn logs.
  - Sanctum disbursement reports.
  - Governance decisions and their impacts.

---

## 6. Frontend Applications

### 6.1 Main dApp: Wallet Dashboard

**Routes**

- `/` – Overview.
- `/wallet` – Balances, vaults, transfers.
- `/trust` – ProofScore, Trust Advisor, Dark Trust simulator.
- `/stake` – Staking UI.
- `/dao` – Governance UI.
- `/sanctum` – Charity and burns.
- `/academy` – Lessons.
- `/earnables` – Badges/scrolls/relics.
- `/merchant` – Merchant info and link to merchant portal.
- `/laws` – Scroll of Laws.
- `/legal` – risk and legal disclaimers.

**Key Screens**

- **Wallet page:** show:
  - Connected address, associated vaults.
  - Balances, lock timers, withdrawal requests.
  - Buttons to deposit, request withdrawal, manage guardians.

- **Trust page:** show:
  - ProofScore and risk band.
  - List of ledger events (why score changed).
  - Advisory messages and recommended actions.
  - Dark Trust simulator (simulated actions and their hypothetical score impact).

- **DAO page:** show:
  - Proposals (active, pending, executed).
  - Voting interface.
  - DAO member list and participation stats.

- **Academy page:** track lesson completion; on completion, make backend call that eventually triggers on‑chain earnable mint.

### 6.2 Merchant Portal

**Routes**

- `/merchant/dashboard`
- `/merchant/checkout`
- `/merchant/settings`

**Features**

- Generate payment requests / QR codes.
- View past VFIDE payments, conversions, and settlement status.
- View customers’ trust level indicators (privacy‑respecting, non‑personal).

### 6.3 Docs & Laws Site

- Statically rendered documentation with:
  - Simplified overview for regular users.
  - Detailed specs for developers and auditors.
  - Scroll of Laws with links to specific contracts and proposals.

---

## 7. Security & Testing Regimen

### 7.1 Testing

- **Unit tests:** 100% coverage on:
  - Token.
  - Presale.
  - Vaults (including edge cases).
  - Guardians & recovery flows.
  - Staking, Sanctum, burns.
- **Integration tests:** End‑to‑end flows:
  - User registers vault, sets guardians, buys presale, stakes, participates in DAO, triggers recovery, etc.
- **Fuzz tests:** Foundry tests targeting:
  - Vault withdrawals.
  - GuardianLock / Chain‑of‑Return.
  - Presale purchase logic.
  - Staking accounting.

### 7.2 Static Analysis

- Run Slither on every contract.
- Fix high and medium findings. Document any accepted low‑risk ones.

### 7.3 External Audits

- At least one reputable audit firm must review:
  - Token.
  - Presale.
  - Vaults.
  - Guardians & recovery.
  - DAO.
  - Staking & Sanctum.
  - Merchant contracts.

### 7.4 Bug Bounty (Break‑the‑Chain)

- Before mainnet, open testnet bounty.
- After mainnet, maintain continuous bounty.
- Publish clear steps for reporting and reward tiers.

---

## 8. Deployment & Environment Strategy

### 8.1 Environments

- **Local:** Hardhat network, full test coverage.
- **Testnet:** Chosen L2 testnet or compatible testnet; full deployment with dummy values.
- **Mainnet:** Production deployment with real parameters.

### 8.2 Deployment Scripts

In `infra/hardhat/deploy/`:

1. Deploy VFIDE token with initial allocations.
2. Deploy VaultFactory, VaultController, standard vault templates.
3. Deploy DevVestingVault and transfer dev allocation.
4. Deploy SanctumVault, staking vaults, merchant vault templates.
5. Deploy Presale with tier configs.
6. Deploy GuardianRegistry, GuardianLock, ChainOfReturn, NextOfKin.
7. Deploy ProofLedger and optional TrustSignals.
8. Deploy DAO contracts (Governor, Timelock, DAOMembership).
9. Deploy Staking, BurnManager, MerchantRegistry, MerchantSettlement.
10. Wire contracts together (set factory, exemptions, vault‑only, roles).

Produce a JSON map of all addresses and save it for backend/frontend config.

---

## 9. Governance Transition Plan

1. **Launch Phase (0–3 months):**
   - Limited, transparent control by founder + multisig.
   - No arbitrary changes outside of published plan.

2. **Transition Phase (3–9 months):**
   - Onboard initial DAO members.
   - Gradual handoff of parameter control to DAO (PanicGuard, Sanctum allocations, etc.).

3. **Mature Phase (9+ months):**
   - Founder becomes one seat in DAO, not a super‑admin.
   - DAO fully controls governance modules and long‑term evolution.

---

## 10. Culture, Academy & Earnables Implementation Notes

- **Academy:** Implement as content pages with backend that tracks completion milestones in Postgres.
- After significant milestones, backend initiates a transaction (either by a signing service or user‑triggered) to mint appropriate Earnables on‑chain.
- **Earnables** DO NOT provide hidden financial returns; any functional benefit (e.g., small ProofScore bonus) must be clearly documented.

---

## 11. Deliverables Checklist for a Build Team

To consider VFIDE “built from the bottom up” according to this spec, a team must deliver:

1. **Smart Contracts**
   - All modules in section 4 implemented, tested, and audited.
   - Contract addresses published and verified.

2. **Backend Services**
   - Indexer, Trust Scoring Service, Advisory Service, Notification Service, DAO/Reporting Service.
   - CI/CD pipelines and monitoring.

3. **Frontends**
   - Main dApp: Wallet, Trust, Staking, DAO, Sanctum, Academy, Earnables, Merchant views, Laws, Legal.
   - Merchant Portal: payment flows and dashboards.
   - Documentation site: overview, specs, Scroll of Laws.

4. **Security & Governance**
   - Full testing suite.
   - Published audit reports.
   - Bug bounty program.
   - Live DAO with timelock and governance processes.

5. **Documentation**
   - Technical docs for each module.
   - Runbooks for recovery, upgrades (if any), and emergency procedures.
   - Public documentation for users and merchants.

---

## 12. Usage of This Document

This specification is meant to be handed to:

- Smart contract developers.
- Backend and frontend engineers.
- DevOps and security engineers.
- Auditors and reviewers.

They should treat this as the **target blueprint**. Any deviation or simplification should be documented so the final system remains aligned with VFIDE’s core principles of protection, transparency, and trust‑based behavior.
