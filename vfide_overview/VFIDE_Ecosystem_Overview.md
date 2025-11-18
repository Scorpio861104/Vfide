
# VFIDE Ecosystem – Master Systems Overview & Scrutiny Model

> **Status:** Design master spec based on everything we’ve built and agreed so far.  
> **Goal:** Explain *every* system, what it does, how it connects, and how scrutiny / protection works at each layer.

---

## 1. High‑Level Mental Model

VFIDE is not “just a token.” It is a **trust‑centric financial ecosystem** made of modular smart‑contract “Lego blocks,” UX layers, and social rules, all glued together by **ProofScore** (your Trust Intelligence System).

Think of it in four stacked layers:

1. **Base Asset & Flow Layer** – VFIDE token, presale contracts, vaults, staking, burns, Sanctum, merchant settlements.
2. **Protection & Recovery Layer** – Vault separation, GuardianLock, PanicGuard, Chain‑of‑Return, Next‑of‑Kin, withdrawal friction, ProofLedger.
3. **Trust & Intelligence Layer** – ProofScore engine, Seer advisor, Dark Trust simulator, risk levels, flags, behavior scoring.
4. **Governance & Culture Layer** – DAO, Scroll of Laws, Academy, Earnables (badges/scrolls/relics), Break‑the‑Chain bounty, legal and social commitments.

**Scrutiny** runs through *all four layers*:  
- Code scrutiny (audits, tests, bounties).  
- Economic scrutiny (anti‑whale, vesting, controlled unlocks).  
- Behavioral scrutiny (ProofScore, flags, logs).  
- Governance scrutiny (DAO oversight, public reporting).

Everything is designed to be **transparent, explainable, and fair**, with explicit protections against rug pulls, whales, reckless devs, and user mistakes.

---

## 2. Core Asset: VFIDE Token

### 2.1 Supply & Distribution

- **Total supply:** `200,000,000 VFIDE`
- **Presale allocation:** `75,000,000 VFIDE` across three tiers (all priced in stablecoins):
  - **Founding Scrolls** – $0.03  
  - **Oath Takers** – $0.05  
  - **Public Presale** – $0.07  
- **Public listing reference price:** $0.10
- **Developer reserve:** `40,000,000 VFIDE`
  - Locked in a dedicated **Dev Vesting Vault**.
  - **3‑month cliff**, then **36‑month linear unlock**.
  - Single beneficiary: **you**, no “hidden team wallets.”
  - No emergency rug switches, no pausing / canceling vesting after deployment.
- Remaining supply divided across:
  - **Staking & ecosystem rewards**
  - **Sanctum / charity and impact pool**
  - **Liquidity & strategic reserves**

### 2.2 Token Properties

- **Chain:** L2 (intended: zkSync or Arbitrum; final choice at deployment).
- **Standard:** ERC‑20 compatible with added protections at the ecosystem level (not via magic token tricks).
- **No tax gimmicks baked into the token** – risk, fees, and splits are managed by higher‑level modules (like the Trust Intelligence layer and vault flows), not by weird token logic that breaks CEX/DEX integrations.

### 2.3 Tokenomics Philosophy

- Presale tiers are **simple and honest**: no hidden multipliers, no mystery boxes.
- Dev tokens are explicitly locked and fully transparent.
- Burns and Sanctum contributions are **rule‑based** and **documented** (users can see why burns happen and where funds go).

### 2.4 Scrutiny on the Token Layer

- Token contract is **minimal and audited**, avoiding unnecessary complexity.
- All allocations and vestings are **on‑chain**, viewable in the Dev Vesting Vault.
- External auditors + community can easily verify:
  - Total supply and circulating supply.
  - Remaining locked tokens and unlock schedules.
  - Dev holdings vs public float.

---

## 3. Presale & Launch System

The presale is a **separate, modular contract** that sells VFIDE in clearly defined stages and sends purchased tokens into user vaults/wallets according to the rules.

### 3.1 Presale Tiers

1. **Founding Scrolls (Tier 1)**  
   - Price: $0.03 (in stablecoin equivalent).  
   - Supply: Subset of the 75M presale pool.  
   - Lock rules: Longer lock / vest commitment to reward early faith.

2. **Oath Takers (Tier 2)**  
   - Price: $0.05.  
   - Medium‑length lock.  
   - Designed for users who learn and commit a bit later, but still early.

3. **Public Presale (Tier 3)**  
   - Price: $0.07.  
   - Shortest lock or vest, more accessible and closer to listing price.

After presale, liquidity is added and **public listing** is aimed at $0.10 reference.

### 3.2 Locking & Claiming

- Purchases during presale are recorded against **user vaults** (not loose wallets).  
- Unlock schedule per tier is deterministic and publicly documented.
- No manual dev overrides to “unlock for friends.”

### 3.3 Anti‑Whale & Fairness Controls

- **Per‑address and per‑tier caps** can be applied (exact thresholds defined at deployment) to avoid massive concentration in a single presale wallet.
- Presale contract can include logic to:
  - Stop further purchases when tier cap is reached.
  - Enforce minimum/maximum purchase amounts.

### 3.4 Scrutiny on Presale

- Full presale configuration (prices, caps, tier supplies) is visible on‑chain and mirrored in the **Scroll of Laws** and the website.
- Audits confirm:
  - No hidden minting paths.
  - No way for dev to bypass tiers or price rules.
- The DAO and community can later **analyze presale distributions** to see if any address behavior looks suspicious, feeding into **ProofScore**.

---

## 4. Wallets, Vaults & Flow Architecture

VFIDE separates **identity/control (wallet)** from **fund storage (vaults)** to reduce attack surface and improve recovery.

### 4.1 Wallet Concept

- A **wallet** is a user’s *identity and control point*:
  - Stores permissions.
  - Holds guardians, Next‑of‑Kin, trusted addresses.
  - Connects to the dApp UI (Wallet Dashboard).

Wallets are meant to be **replaceable**: if one key is compromised, the Chain‑of‑Return and guardian systems help move funds to a safe vault or new wallet.

### 4.2 Vault Concept

- A **vault** is where the actual **VFIDE funds live**.
- Vaults can be:
  - Personal vaults (user’s primary funds).  
  - Dev Vesting Vault.  
  - Sanctum Vault.  
  - Merchant settlement vaults.  
  - Staking vaults.

Core principle: **Vaults are strict**. Some functions can be locked to “vault only,” enforcing that big moves must go through the more protected path.

### 4.3 System Exemptions & Vault Enforcement

At deployment, we configure:

- `setSystemExempt` – defines which system contracts are allowed to bypass certain friction layers (e.g., staking pool, DAO treasury) without weakening safety for regular users.
- `setVaultOnly` – defines which operations are *only* permitted from vaults (e.g., large withdrawals, high‑risk transfers).
- `setVaultFactory` – central factory that creates vaults with the proper template and protections.

These settings *freeze* the architecture and are chosen carefully **once**, to avoid a “god mode” contract that can later be abused.

### 4.4 Withdrawal Friction Layer

- Large withdrawals or transfers from vaults can be subject to:
  - Time delays (cooldown).
  - Multi‑guardian approval (if configured).
  - Extra checks from the Trust Intelligence (if connected).
- Purpose is to **catch mistakes and hacks before funds vanish**.

### 4.5 Scrutiny on Wallet/Vault Layer

- Architecture diagrams and docs (this spec) align with on‑chain code.
- Vault templates are audited separately.
- The mapping between wallets and vaults is transparent on‑chain, enabling forensic visibility for the community and auditors.
- Abuses (e.g., suspicious withdrawals) are logged in **ProofLedger**.

---

## 5. Protection & Recovery Systems

This is where VFIDE becomes very different from typical tokens. Protection is a first‑class design goal.

### 5.1 GuardianLock

- Users can assign **guardians** (trusted addresses) to their wallet/vault.
- Guardians can:
  - **Trigger a soft freeze** (GuardianLock) when something looks wrong.
  - Approve recovery processes and Chain‑of‑Return migrations.
- GuardianLock is **configurable**:
  - Number of guardians required for action.
  - Scope of freeze (full vault, specific functions, or transfers above a threshold).

**Scrutiny:**  
- Guardian actions are fully on‑chain and visible.
- You cannot silently act as a guardian for users; they must assign you.

### 5.2 PanicGuard System

- Global and per‑user **risk triggers** that can:
  - Temporarily tighten withdrawal rules.
  - Require additional confirmations.
  - Alert the user via the dApp UI.
- Example triggers:
  - High‑risk transaction patterns detected by Trust Intelligence.
  - Abnormal on‑chain activity (sudden mass sell‑offs, suspected exploit).

**Scrutiny:**  
- PanicGuard criteria are documented and versioned.  
- Changes to global PanicGuard settings are controlled by the **DAO** and clearly logged.

### 5.3 Chain‑of‑Return Protocol

- Recovery mechanism if a user loses access to a wallet or suspects compromise.
- Uses a combination of:
  - Guardian approvals.
  - Identity proofs (off‑chain but confirmed through DAO / community processes if necessary).
  - Controlled migrations from compromised wallet/vault to a new secure vault.

**Scrutiny:**  
- Recovery operations are time‑locked and public.  
- The DAO can see every recovery and investigate suspicious ones.  
- Rules for approvals are defined in the Scroll of Laws.

### 5.4 Next‑of‑Kin System

- Allows users to designate **heirs** for their VFIDE holdings.
- After predefined conditions (time without activity, guardian agreement, DAO mediation if needed), funds can be transferred to Next‑of‑Kin vaults.

**Scrutiny:**  
- Next‑of‑Kin designations are recorded on‑chain in a way that keeps the relationships visible but does not expose unnecessary personal data.
- Trigger rules and processes are publicly documented.

### 5.5 ProofLedger

- **Behavioral ledger** for key events:
  - Freezes, unfreezes, PanicGuard activations.
  - Large withdrawals.
  - DAO votes related to user disputes.
  - Bounty / exploit reports.
- ProofLedger feeds into **ProofScore** and is viewable by the user in their profile and by the community in aggregated form.

---

## 6. Trust Intelligence: ProofScore, Seer & Dark Trust

The Trust Intelligence System is the **brain** of VFIDE. It scores behavior, not identity.

### 6.1 ProofScore

- A numerical **trust score** per wallet/vault/user profile, powered by on‑chain behavior and verified events.
- Inputs include:
  - Transaction history (frequency, size, patterns).  
  - Voluntary verifications (e.g., time‑locked commitments, participation in Academy, DAO voting).  
  - Flags from PanicGuard or ProofLedger.  
  - Long‑term consistency (no sudden panic dumping, no repeated suspicious recoveries).

Outputs of ProofScore:

- **Access levels** – which features or limits apply (e.g., staking multipliers, merchant trust rating).
- **Risk classifications** – more friction if risk is high.
- **Reputation visuals** – sigil ring animation, color/brightness, medallion status in the UI.

### 6.2 Seer Advisor

- Front‑end AI assistant (backed by rules and models) that:
  - Explains the user’s ProofScore in plain language.
  - Recommends actions to improve it (e.g., avoid risky patterns, finish Academy lessons).
  - Highlights risk before critical actions (“This transfer looks unusual compared to your history”).

### 6.3 Dark Trust Simulator

- Sandbox mode where users can **simulate “bad behavior”** and see what would happen to their ProofScore and privileges.
- Purpose: education and transparency—users can’t claim “I didn’t know dumping into a low‑liquidity pool would hurt my trust profile.”

### 6.4 Scrutiny on Trust Intelligence

- Scoring rules and weightings are **documented and versioned**.  
- Changes to ProofScore logic require DAO review and approval after launch.  
- The engine cannot secretly blacklist or shadow‑ban people; all classifications are visible in the UI and ProofLedger.
- Users can appeal bad scores through **DAO governance**, with structured dispute processes.

---

## 7. Governance & DAO

VFIDE transitions into a **community‑governed system** where your role becomes just one seat among many.

### 7.1 DAO Composition

- DAO starts with **you + early guardian members**, then transitions to community‑selected members based on **ProofScore metrics**, not popularity contests alone.
- Target model: **12 members** (or similar) with weighted voting that favors high ProofScore participants.

### 7.2 DAO Powers

- Adjusting **Trust Intelligence parameters** within predefined bounds.
- Managing **Sanctum Fund allocations** (approved charities, impact projects).
- Overseeing **PanicGuard global settings**.
- Approving **protocol upgrades** (if any upgradability is retained, or orchestrating v2 deployments).
- Running the **Break‑the‑Chain bounty program** and responding to vulnerability reports.
- Handling **disputes** (e.g., contested recoveries, accusations of fraud).

### 7.3 Governance Safeguards

- No single person can:
  - Mint new tokens beyond total supply.
  - Seize user funds without following published processes.
  - Unilaterally turn off GuardianLock, PanicGuard, or other protections.
- DAO voting is **on‑chain and transparent**, with:
  - Proposal texts.
  - Voting records.
  - Execution results.

### 7.4 Scrutiny in Governance

- DAO is itself subject to scrutiny:
  - Activity and attendance of DAO members is tracked.
  - DAO decisions feed into a **DAO reputation profile** visible to the community.
- If the community loses faith, they can collectively **migrate liquidity and adoption** to improved versions or forks (social consensus is part of VFIDE’s defense).

---

## 8. Economic Systems: Staking, Burns, Sanctum, Merchant Flows

### 8.1 Staking System

- Users can stake VFIDE into **staking vaults** to earn rewards.
- Rewards are funded from:
  - Allocated staking pool from supply.  
  - A portion of ecosystem fees or buy‑backs (if enabled later).

Staking characteristics:

- Longer stakes and higher ProofScore may lead to better rewards.
- Staking is non‑custodial: users stake from their vaults and can see their positions and lock durations.

**Scrutiny:**  
- Staking contracts are fully audited.  
- Emission schedules are known in advance and controlled by smart contracts, not off‑chain promises.

### 8.2 Burns & Supply Curve

- VFIDE uses **burns** to slowly reduce supply and signal long‑term commitment.
- When particular events occur (e.g., certain fee flows, Sanctum splits, or protocol actions), a portion can be **burned**.
- The “curve forecast” of supply over time is modeled and published so users can see likely future circulating supply bands under different scenarios.

**Scrutiny:**  
- Burn transactions are transparent and tagged in ProofLedger.
- No arbitrary minting; burns are one‑way.

### 8.3 Sanctum Fund (Charity & Impact)

- A dedicated **Sanctum Vault** holds VFIDE and/or stablecoins for charitable use and real‑world impact.
- A chosen percentage of certain flows (fees, optional donations, campaign proceeds) go into Sanctum.
- Rough target split we’ve discussed conceptually: e.g., 25% to Sanctum, 75% to burn, or similar—exact numbers to be finalized and encoded.

**Scrutiny:**  
- Sanctum disbursements are:
  - On‑chain.  
  - Tracked per campaign or project.  
  - Governed by the DAO (charity selection, size, and cadence).

### 8.4 Merchant Portal & Fair Trade

- Merchants can accept VFIDE (and possibly other tokens) via a **Merchant Portal** with:
  - Simple point‑of‑sale UI.
  - Instant trust assessment using ProofScore.
  - Optional instant conversion to stablecoins via integrated DEX/CEX routes (front‑end flow, not protocol‑level magic).

Merchant benefits:

- Low/no protocol fee for payments (protocol doesn’t gouge merchants).
- Trust‑enhanced risk scores for customers (allowing merchants to tweak policies).

**Scrutiny:**  
- Merchant smart contracts (settlement vaults, payment routers) are audited and limited in authority.
- Merchants cannot manipulate ProofScore; they only consume it.

---

## 9. Developer & /dev Systems

### 9.1 Developer Reserve & Vesting Vault

Already described above, but key points:

- **40M VFIDE** in a locked vault contract.
- 3‑month cliff, then linear unlock over 36 months.
- No hidden admin functions to speed it up.

### 9.2 /dev Portal & SDK

- Documentation, code examples, and SDKs for:
  - Integrating VFIDE payments.
  - Reading ProofScore and trust signals.
  - Building third‑party vault templates or tools (where allowed).

**Scrutiny:**  
- Open‑source SDKs where possible.
- Clear license terms.  
- Sample contracts audited before being promoted to the community.

### 9.3 Break‑the‑Chain Bounty

- Formal **bug bounty system**:
  - Incentivizes white‑hat hackers to find vulnerabilities in VFIDE contracts and architecture.
  - Managed via the DAO and Sanctum / dedicated bounty pools.

**Scrutiny:**  
- All paid bounties are logged, with public post‑mortems when feasible.  
- Encourages culture of **aggressive self‑critique** rather than secrecy.

---

## 10. Academy, Scroll of Laws, Legal & Culture

### 10.1 VFIDE Academy

- Structured lessons walking users through:
  - Wallet and vault setup.
  - GuardianLock, PanicGuard, Chain‑of‑Return, Next‑of‑Kin.
  - Trust Intelligence and ProofScore.
  - Presale, staking, and merchant usage.
- Completing lessons can **improve ProofScore** and unlock cosmetic Earnables (badges, scrolls, relics).

### 10.2 Earnables: Badges, Scrolls, Relics

- **Badges** – medallions for milestones (Flamekeeper, Oathbound, Purifier, Vowed, Watcher, Unsealer, Sealbearer, Bountybreaker, Chainsworn, Fortresswill, etc.).
- **Scrolls** – soulbound achievements and protections (Protection Scroll, Next‑of‑Kin Scroll, Hundred Scroll, Flame Scroll, etc.).
- **Relics** – rare glyphs linked to deeper contribution or long‑term trust history.

These have **no scammy financial gimmicks**; they represent **history and trust**, not secret yield.

**Scrutiny:**  
- Earnables logic is transparent; no hidden boosts that create unfair financial advantage without disclosure.
- Cosmetic vs functional effects are clearly explained.

### 10.3 Scroll of Laws & Legal Pages

- **Scroll of Laws (/laws)** – canonical on‑chain + off‑chain specification of:  
  - Economic rules.  
  - Governance rules.  
  - Protection system behavior.  
  - Code upgrade policies (if any).  
- **Legal & Risk Page** – explains:
  - That VFIDE is not marketed as a regulated security.  
  - That users must understand crypto risk.  
  - That there’s no protocol‑level KYC, but centralized exchanges may require it.

**Scrutiny:**  
- Laws are **short enough to read**, but detailed enough to bind the culture.  
- The DAO cannot secretly change foundational promises without visible governance and time delays.

---

## 11. Scrutiny: How Everything Is Kept Honest

This section ties everything together and explicitly answers “how scrutiny works.”

### 11.1 Code Scrutiny

- **Monster‑mode testing** with:
  - Unit tests and fuzz tests (Hardhat/Foundry).  
  - Static analysis (Slither and others).  
  - Coverage targeting critical paths (vaults, guardians, vesting, presale).  
- **External audits** by at least one reputable firm **before** mainnet launch.
- **Bug bounty program** (Break‑the‑Chain) active from early launch.

### 11.2 Transparency Scrutiny

- All important contracts are verified on the explorer (Etherscan‑style).  
- The website and Academy explain each contract in human terms, linking to the source.
- The **Wallet Dashboard** shows:
  - Your vaults and balances.  
  - Your ProofScore.  
  - Any active flags (GuardianLock, PanicGuard).  
  - Vesting and lock timers.

### 11.3 Economic Scrutiny

- No hidden pre‑mines: allocations and vesting visible in the Dev Vault and token distribution charts.
- Presale results are analyzable on‑chain – addresses, amounts, tiers.
- Burn events and Sanctum allocations are tagged and explained.

### 11.4 Behavioral Scrutiny

- ProofLedger captures key actions and risk events.
- ProofScore summarizes behavior into a single, explainable metric.
- Seer explains *why* your score is what it is and how to improve it.

### 11.5 Governance Scrutiny

- DAO decisions are on‑chain with visible history.
- No single dev can override DAO votes once the governance phase is active.
- The community can see:
  - Who voted and how.  
  - Execution transactions.  
  - Any changes to risk parameters or Trust Intelligence weights.

### 11.6 Cultural Scrutiny

- Academy, Laws, and Earnables create a culture where:
  - Transparency is normal.
  - Questioning decisions is encouraged.
  - Users are rewarded (socially and via ProofScore) for responsible behavior.

---

## 12. What This Document Represents

This file is your **canonical design overview** of the VFIDE ecosystem based on our previous work and agreements:

- Every major **module** is identified and explained.
- **Scrutiny** mechanisms at each layer are spelled out:
  - Code → audits, tests, bounties.  
  - Economic → transparent allocations, burns, vesting.  
  - Behavioral → ProofScore, ProofLedger, PanicGuard.  
  - Governance → DAO, on‑chain votes, public logs.  
  - Cultural → Academy, Laws, Earnables.

If you spot **any missing module or changed decision**, we can update this spec and treat the updated version as the new master reference for your devs, auditors, and community.
