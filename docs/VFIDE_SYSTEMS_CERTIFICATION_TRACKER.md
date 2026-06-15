# VFIDE Systems Certification Tracker

*Supersedes the "civilization / institutions" framing for audit-tracking purposes.* The civilization model was
a useful way to **group** large areas during the audits; it is a poor way to **track certification**. This
document answers the only four questions that matter for that:

1. What systems exist in VFIDE?
2. Which are certified?
3. Which are not?
4. Which should be audited next?

> Note: retiring the *language* here does not require ripping out `lib/civilization/*` or the institution UI —
> that's a separate product decision. This is about how we track audit status, not the app's information
> architecture.

---

## Two axes — read this before trusting any status icon

There is a real distinction that a single status icon hides, and conflating them is exactly the kind of
overstatement this tracker exists to avoid:

- **Certification status (this tracker's bar):** has the system been through the *gate discipline* —
  Build → Functional → Edge-Case → Adversarial → Integration → Grandmother → Certification, with a **50+
  executing-scenario matrix**? This is a high, specific bar. **Commerce, Social, and Onboarding now clear it**
  (🟢); the remaining systems are 🟢-pending-compiled-verification or ⚠️ with a documented boundary — see each
  section. (This line started as "today only Commerce clears it"; the tracker has since converged — the bar
  didn't move, the systems caught up.)
- **Build maturity:** how much of the system actually exists and works. Several un-certified systems are very
  mature (Ownership Core, Recovery, Trust) — that maturity is real and is noted, but maturity is **not**
  certification.

A third, historical note: the **earlier hostile security audits** (141–180+ findings across passes on the
contracts/core) were rigorous, but they were a *finding-driven* methodology, not the per-system gate discipline
with a scenario matrix. So a system can be "security-audited before" and still be 🔴 here. I am keeping these
separate on purpose so the tracker doesn't claim more than is true in either direction.

### Legend (certification status)
- 🔴 **Not Certified** — not yet through the gate discipline (may still be mature / prior-security-audited)
- 🟡 **Auditing** — gate discipline in progress
- 🟢 **Certified** — passed the full gate discipline (50+ scenario matrix, all gates)
- ⚠️ **Certified with Known Boundary** — certified, with a documented external/architectural boundary

> **Methodology:** the bar these icons measure against is defined in **`VFIDE_VERIFICATION_STANDARD.md`** (the
> 14-stage chain: Contracts → Contract Security → Backend → API → Database → Permissions → Frontend → Workflow →
> User Journey → Edge Case → Adversarial → Cross-System → Grandmother → Certification). That document is *how* we
> certify; this tracker is *what* is certified at the **system** level (Level 2). The **capability** level (Level
> 1) — every function/permission/workflow tracked individually with its own 14-stage status — lives in
> **`VFIDE_CAPABILITY_REGISTRY.md`**; per the no-inheritance rule, a system here may go 🟢 only when every
> capability beneath it is certified *and* its integration is verified. Per the standard's calibration, today's
> certs are strongest at the contract/model + edge + adversarial stages (456 modeled scenarios), with **stage 2
> (compiled bytecode verification) the universal open boundary** and full-stack/per-capability coverage strongest
> for Commerce and the Onboarding core.

Each system also carries a **Maturity** note (Mature / Partial / Thin / Unknown) and **Evidence** (what was
actually found in the codebase, so existence is grounded, not assumed).

---

## 1. Commerce — 🟢 CERTIFIED (the one group fully through the discipline)

| System | Cert | Evidence / notes |
|---|---|---|
| E-Commerce | 🟢 | 1A Variants · 1B Digital Delivery · 1C Shipping · 1D Tax · 1E Bundles & Discounts · 1F Returns & Exchanges. ~50–60 scenarios each; certs `COMMERCE_PHASE_1*`. |
| Professional Services | ⚠️ | Engagement/milestone orchestration + silence=acceptance certified (58 scenarios). **Boundary:** on-chain escrow fund/release/dispute is a wallet/DAO action, not signed server-side. `COMMERCE_PHASE_2_*`. |
| Workforce (RBAC) | 🟢 | Staff authorization engine + per-tx/daily caps enforced (59 scenarios). `COMMERCE_PHASE_3_*`. Boundary now largely closed by Physical Retail wiring the gate into the POS sale. |
| Physical Retail (POS) | 🟢 | Real POS sale composing pricing (1A/1D/1E) + the staff gate (3) + per-location inventory; registers + cash reconciliation (50 scenarios). `COMMERCE_PHASE_4_*`. |
| Marketplace Discovery | 🟢 / ⚠️ | Ranking engine certified — relevance-gated, capped merit, fraud-penalized, explainable, abuse-resistant (58 scenarios). `COMMERCE_PHASE_5_*`. **Documented gap:** the public `/marketplace` UI still queries `/api/merchant/products` and does not yet consume `/api/discovery`. |

Maturity: **Mature.** This is the reference depth every other group should be brought to.

---

## 2. Core Ownership — ⚠️ CERTIFIED WITH KNOWN BOUNDARY (non-custodial logic proven at source; on-chain re-verification pending) · Maturity: **Mature**

| System | Cert | Evidence |
|---|---|---|
| Vault | ⚠️ | `contracts/vault/CardBoundVault.sol` (+ ~15 facet/manager/deployer/init-chunk contracts), `VaultHub.sol`, `VaultRegistry.sol`. |
| Ownership Rules | ⚠️ | CardBoundVault intents/intent-validator; non-custodial invariant ("no freeze/seize/blacklist") is enforced by *absence of code*. |
| Wallet Management | ⚠️ | Vault ↔ owner binding via VaultHub; card-bound model. |
| Asset Protection | ⚠️ | Withdrawal/payment queue managers (`CardBoundVaultWithdrawalQueueManager`, `...PaymentQueueManager`). |
| Non-Custodial Controls | ⚠️ | This is THE foundational invariant. Prior hostile audits touched it; **not** gate-certified. |

Note: prior security audits covered much of this (14 inheritance safety properties, oracle recovery-gap, etc.),
so maturity is high — but "non-custodial by absence of code" is precisely the kind of invariant that is easy to
*accidentally* violate when adding features, and absence is hard to prove. A dedicated gate audit here is the
highest-stakes item in the whole tracker. **Now done at the source level:** non-custodial invariant proven
(immutable facet + no selfdestruct + owner-signed-intent-only exits + rescue-cannot-touch-VFIDE + owner-vetoable
inheritance), 37 invariant scenarios. **Boundary:** not compiled/run on-chain here — a hardhat run is the
required next step. Evidence: `CORE_OWNERSHIP_CERTIFICATION.md`.

> **CROSS-CUTTING GATE — Ownership ↔ Commerce Boundary (REQUIRED · CRITICAL, blocks final platform certification).**
> The seam between Core Ownership (above) and Commerce (§1) — how vaults, the spending wallet, merchants, recovery,
> inheritance, and spending interact end-to-end — is now its own dedicated campaign: `OWNERSHIP_COMMERCE_BOUNDARY_
> AUDIT.md`. **OC Audit 1 (foundational architecture) is complete:** ground truth traced from source — the vault
> is the sole asset store, the `activeWallet` is a spending *authority* (signing key) that never holds funds (NOT a
> second ownership layer), and merchant settlement is **direct vault→merchant** (the intuitive vault→wallet→
> merchant three-hop does not exist). Wallet compromise is blast-radius-bounded and fully recoverable. No
> critical/high findings. 21-scenario matrix (`__tests__/audit/ownershipCommerceBoundary.test.ts`).
> **ALL 8 CAPABILITIES NOW CERTIFIED (source+model):** Cap1 funding (rescue can't touch VFIDE), Cap2 authority
> (direct spend = activeWallet sig only), Cap3 two spending channels (direct + subscription allowance-pull), Cap4
> debit-card model, Cap5 spending controls, Cap6 wallet-compromise matrix (3-key model, no escalation), Cap7
> continuity interaction (vault assets inherited; freezes bind direct fully, subscription partially), Cap8 direct
> settlement. 5 audits, 102 scenarios. Findings (all documented, none blocking): recovery doesn't revoke
> subscription allowances; recovery-abort griefing in the unseparated key posture (mitigated by separation);
> subscriptions continue through inheritance VETO/CLAIM. **GATE STATUS: 🟢-pending-compiled-verification** — proven
> sound at source+model; the hardhat harness run flips the stage-2 boundary. This gate is GREEN for final platform
> certification once stage-2 completes.

---

## 3. Recovery & Continuity — ⚠️ CERTIFIED WITH KNOWN BOUNDARIES (theft-resistance proven at source; single-guardian = weak config; on-chain re-verification pending) · Maturity: **Mature**

| System | Cert | Evidence |
|---|---|---|
| Recovery | ⚠️ | `VaultRecoveryClaim.sol`, `CardBoundVaultInheritanceManager.sol`. |
| Guardians | ⚠️ | `SeerGuardian.sol`; guardian-approval flow (the prior `/multisig`→`/guardians` work). |
| Proof of Life | ⚠️ | Inheritance windows are real: VETO=30d, CLAIM=90d, MEMORIAL=365d, COOLDOWN=30d. |
| Inheritance | ⚠️ | CardBoundVault inheritance state machine (prior audit confirmed 14 safety properties). |
| Continuity | ⚠️ | `app/api/merchant/continuity` + `useContinuityStatus`. |
| Business Continuity | ⚠️ | `app/api/merchant/business-transfer` (business transfer flow). |

Mature and prior-security-audited; not yet gate-certified with a scenario matrix.

---

**Audited (source + 42 scenarios):** recovery resists theft — trustee-gated initiation, mature-guardian
threshold (snapshot), owner/PoL challenge window (extended to 30d for active/under-protected vaults),
finalization grace vs mempool race, verifier path disabled, forceSetOwner removed (H-8). Business continuity
(succession) mirrors it. **Finding:** single-guardian recovery is a single point of failure (recommend ≥2).
**Cross-audit:** zero guardians = UNRECOVERABLE, sharpening Onboarding Finding A. Evidence:
`RECOVERY_CONTINUITY_CERTIFICATION.md`.

## 4. Trust — ⚠️ CERTIFIED WITH KNOWN BOUNDARIES (ProofScore (incl. per-source machinery)/fee-curve/appeals/merchant-trust gate-audited; FraudRegistry+FraudJury fraud process gate-audited & non-custodial; individual external source contracts = audit-before-add boundary) · Maturity: **Mature**

| System | Cert | Evidence |
|---|---|---|
| ProofScore | ⚠️ | Core protocol mechanism (0–10000, NEUTRAL=5000); `ProofScoreBurnRouter.sol`, fee-curve logic. **Per-source machinery gate-audited & un-buyable** (`PROOFSCORE_SOURCES_CERTIFICATION.md`, model + 21 scenarios) — bounded per-source weights sum-capped at 100%, anti-capture on-chain floor, behavioral-only automated score (no wealth input), neutral default, DAO setScore rate+magnitude-capped. |
| Builder Record | ⚠️ | `lib/seer/marketStability/builderRecord.ts` — *exercised + capped* during Discovery (Phase 5), but not audited as its own system. |
| Merchant Trust | ⚠️ | `lib/seer/merchantTrust.ts` — *exercised* in Discovery ranking (Phase 5); partially validated, not dedicated-audited. |
| Trust Transparency | ⚠️ | `lib/seer/merchantTransparency.ts` + `MerchantDiscoveryStanding` — the "why you rank" panel; touched in Phase 5. |
| Trust Appeals | ⚠️ | `FraudRegistry.sol` + `FraudJury.sol` **gate-audited & non-custodial** (`FRAUDREGISTRY_CERTIFICATION.md`, model + 22 scenarios) — fraud punished by signal+score+service-ban only (never funds), peer-jury 2/3 supermajority confirms (DAO veto-only), 90-day decay + restitution. (User-facing end-to-end appeals UX still to be confirmed separately.) |

Honest note: Phase 5 *used* Merchant Trust / Builder Record / Transparency as discovery inputs and tested them
in that context — so they are partially validated — but none has had a dedicated gate audit. ProofScore itself
(the protocol's spine) has not.

---

**Audited (source + 39 scenarios):** ProofScore can't be bought or set (weighted DAO-authorized sources,
≤100% weight, NEUTRAL default, behavioral-only — no wealth input); even the DAO is bounded (±5%/call,
anti-capture min on-chain weight). Fee curve (5%→0.25%) uses a TIME-WEIGHTED score with min(live,cached) — can't
farm score to dodge fees, and a fraud flag raises the fee instantly. FraudJury = peer supermajority to punish,
DAO can only show leniency, quorum-failure→dismissed. **No new findings.** Evidence: `TRUST_CERTIFICATION.md`.

**Audited — FraudRegistry + FraudJury fraud process (source + 22 scenarios):** the full fraud surface was
gate-audited at depth. The crux holds — a confirmed fraud flag's ONLY consequences are a risk signal, a Seer
score penalty (→ higher fees), and a service ban; **funds are NEVER held, delayed, or seized — the flagged user
keeps every token in their own vault.** `escrowTransfer` is a no-op ABI stub (the former 30-day hold was
removed); `confirmFraud` only sets `isFlagged=true` (moves no funds); `rescueExcessTokens` recovers only
accidentally-sent excess, never the accused's vault. Condemnation requires a peer jury: `confirmFraud` is onlyDAO
but **requires `fraudJury.isConfirmed(target)`** when a jury is wired — the DAO can veto/dismiss but can NEVER
confirm alone (no-jury fallback = 48h appeal window). FraudJury uses commit-reveal (no bandwagoning), JURY_QUORUM=5,
CONFIRM_SUPERMAJORITY_PCT=66%, quorum-failure→Dismissed (fail-safe to leniency). Accusation is spam-resistant
(MIN_REPORTER_SCORE, one/reporter/target/epoch, no self-report, escalating reporter bond on dismissed complaints).
Forgiveness: SIGNAL_TTL=90d auto-expiry; restitution clears the flag. **No new findings** (residual: vestigial
"escrow" comments referencing the removed hold — cosmetic). Evidence: `FRAUDREGISTRY_CERTIFICATION.md` + on-chain
`FraudRegistry` / `NonCustodialNoFreeze`.

**Audited — ProofScore per-source machinery (source + 21 scenarios):** the score's individual SOURCE framework
was gate-audited at depth, completing the Trust group's spine. The score is **un-buyable by construction**:
`addScoreSource` (onlyDAO) bounds each source's weight ≤ 100 AND rejects any addition that pushes the SUM of
active weights over 100 — no single source can dominate. An anti-capture floor (`setDecentralizationWeights`)
stops a captured DAO reducing on-chain (community) weight below `MIN_ONCHAIN_WEIGHT_WITH_SOURCES` once sources
exist. Aggregation (`calculateOnChainScore`) is a clamped weighted average that defaults to NEUTRAL for unknown
subjects and **skips reverting or out-of-range (>1000) sources** so a bad source can't poison it. The automated
component (`calculateAutomatedScore`) is **purely behavioral** — vault existence, earned badges, decaying peer
endorsements — with **NO wealth/balance input** (holding more tokens does not raise the score). Even the DAO's
direct `setScore` is range-clamped (F-64), rate-limited to 1/hour/subject (S-04), and magnitude-capped per call
(F-16). This is the foundation every governance/election audit relies on: votes and seats are weighted by a score
money cannot buy. **No new findings** (boundary: each individual external source contract should be audited on its
own before the DAO adds it — the framework bounds whatever they return). Evidence:
`PROOFSCORE_SOURCES_CERTIFICATION.md` + on-chain Seer/ProofScore suites.

## 5. Seer — ⚠️ CERTIFIED WITH KNOWN BOUNDARIES (enforcement boundary + risk/incentive/opportunity engines certified) · Maturity: **Mature**

| System | Cert | Evidence |
|---|---|---|
| Opportunity Engine | ⚠️ | `lib/seer/merchantAdvisor.ts`, `Seer.sol`/`SeerAutonomous.sol`. |
| Risk Engine | ⚠️ | `lib/seer/marketStability/*` (extractionIndex, marketImpact, stabilityPolicy) — partly exercised by prior stability work. |
| Incentive Engine | ⚠️ | `LiquidityIncentives.sol`, `lib/seer/marketStability/stabilityBonding.ts`, `DutyDistributor.sol`. |
| Forecasting | ⚠️ | `SeerView.sol` / market-standing route; needs verification of what "forecasting" actually computes. |
| Visibility Engine | 🟢* | This IS the discovery ranking engine (`lib/seer/discovery.ts`) — certified in Commerce Phase 5. *(\*Certified under Commerce, listed here for completeness.)* |

Seer is large and partially overlaps Commerce (Discovery) and Trust. Only the Visibility/Discovery slice is
certified.

---

**Audited (boundary model + REAL engines run directly, 36 scenarios):** the crux — CardBoundVault._enforceSeerAction
calls Seer to OBSERVE then DISCARDS the verdict, so NO Seer verdict (any level incl. Frozen) can block a
withdrawal/payment/transfer, and a Seer outage can't brick the vault (SEER-04). Consequences land on
reputation/fee/visibility/discretionary-services, never funds. Risk engine (extractionIndex) keys on BEHAVIOR
not wealth + DECAYS; stability policy's tokenTransferEffect is the literal type 'none — ownership is sovereign';
bonding is opt-in/on-chain-verified/unfarmable/releases-to-owner. Appealable (subject→DAO) + timelocked policy.
**No new findings.** Evidence: `SEER_CERTIFICATION.md`.

## 6. Governance — ⚠️ CERTIFIED WITH KNOWN BOUNDARIES (all core contracts gate-audited & non-custodial: DAO, DAOTimelock, OwnerControlPanel, AdminMultiSig, CouncilElection, EmergencyControl; on-chain re-verification pending) · Maturity: **Mature**

| System | Cert | Evidence |
|---|---|---|
| DAO | ⚠️ | `DAO.sol` **gate-audited & non-custodial** (`DAO_CERTIFICATION.md`, model + 25 scenarios) + `DAOTimelock.sol` **gate-audited** (`DAOTIMELOCK_CERTIFICATION.md`, model + 25 scenarios); `app/api/dao`. |
| Voting | ⚠️ | `CouncilElection.sol` **gate-audited & non-custodial** (`COUNCILELECTION_CERTIFICATION.md`, model + 24 scenarios); `app/api/proposals`. |
| Treasury | ⚠️ | `EcoTreasuryVault.sol` + `RevenueSplitter.sol` + `FeeDistributor.sol` **gate-audited & drain-resistant** (`TREASURY_CERTIFICATION.md`, model + 20 scenarios) — no arbitrary-drain primitive, splits sum to 100%, changes 72h-timelocked, ecosystem (not user) funds. |
| Appeals | ⚠️ | `FraudJury.sol` (arbiter/jury) — overlaps Trust Appeals. |
| Oversight | ⚠️ | `OwnerControlPanel.sol` **gate-audited & non-custodial** (`OWNERCONTROLPANEL_CERTIFICATION.md`, model + 22 scenarios); `AdminMultiSig.sol` **gate-audited & non-custodial** (`ADMINMULTISIG_CERTIFICATION.md`, model + 26 scenarios); `GovernanceHooks.sol`, `EmergencyControl.sol` (EmergencyControl flag CLEARED). |

Contracts exist and are substantial; the end-to-end flows (propose → vote → timelock → execute, treasury
disbursement, council salary/election) have not been gate-audited. `EmergencyControl.sol` deserves specific
scrutiny against the non-custodial invariant.

---

**Audited (source + 30 scenarios):** the EmergencyControl flag is CLEARED — it toggles only a GLOBAL protocol
breaker (halted/toggle), has no vault reach, GuardianLock/PanicGuard exist only in legacy, and the vault does
NOT consult the breaker (a halt cannot trap user withdrawals). Voting is ProofScore-weighted, NOT token-weighted
→ a flash loan buys zero votes; vault+SeerGuardian eligibility; timing/grace/fatigue protections. Execution is
quorum-floored + timelock-only. **No new findings.** Evidence: `GOVERNANCE_CERTIFICATION.md`.

**Audited — OwnerControlPanel (source + 22 scenarios):** the 1603-line "owner control panel" was gate-audited
against the non-custodial invariant. Verdict: **no fund-reaching capability.** It passes through calls to SYSTEM
contracts only; `vault_freezeVault`/`vault_cancelDAORecovery`/DAO-recovery selectors were removed outright from
the ABI; the per-vault custodial setters (`setWithdrawalCooldown`/`setLargeTransferThreshold`/
`setAbnormalTransactionThreshold`) are dead interface remnants invoked 0 times; `vault_reportRisk` is a signal to
PanicGuard, not a freeze. ~44 timelock gates + 23 propose/confirm pairs; `governanceDelay` bounded [24h, 30d]
with anti-rug reduction (rate-limited, can't cut >half); fee policy delegates to the burnRouter's [10%, 95%]
bounds; two-step ownership. **No new findings.** Evidence: `OWNERCONTROLPANEL_CERTIFICATION.md` + on-chain
`OwnerControlPanelGuardrails335to337` / `QueueConsistency329` / `verify-owner-controlpanel-guardrails`.

**Audited — AdminMultiSig (source + 26 scenarios):** the 3/5 council multisig was gate-audited. Its
`executeProposal` makes a low-level `target.call`, but that call is **bounded on every axis**: a proposal's
(target, selector) must BOTH be allowlisted (enforced at creation AND re-verified at execution, #406); 3/5
approvals (4/5 emergency); type timelocks (CONFIG 24h / CRITICAL 48h / EMERGENCY 1h); a 24h ProofScore-gated
(≥5000, sybil-resistant) community veto window; 30-day expiry; gas-capped with bool-return verification (H-09).
Self-governance is airtight (every setter `onlyProposalExecutionContext`; council replacement needs a 4/5
EMERGENCY proposal). **Non-custodial** — no fund custody, no freeze/seize; the allowlisted reach can only do
what the vault/OCP architecture already permits any owner (which excludes freeze/seize). **No new findings.**
Evidence: `ADMINMULTISIG_CERTIFICATION.md` + on-chain `AdminMultiSigSecurity`.

**Audited — DAOTimelock (source + 25 scenarios):** the governance timelock was gate-audited. Core guarantee
holds: a queued op executes only if queued + not-done + delay-elapsed (`>= eta`) + not-expired (`eta + 7d`), with
double-execution impossible. Global risk LENGTHENS the wait (+6h, fail-open on PanicGuard outage), never
shortens it. The delay has a hard 24h floor and **cannot be collapsed** — `setDelay` is onlyTimelockSelf bounded
[24h, 30d], and `emergencyReduceDelay` can at most halve once (≥24h, 50% cap, 24h cooldown, one-shot until a
30-day reset). Params (admin/delay/executor/ledger/panicGuard) change only through the timelock itself; the
backup executor adds +3 days (never rushes); `requeueExpired` restarts the full delay. Permissionless execution
is limited to a queued self-`setAdmin` (deadlock recovery). **Non-custodial.** **No new findings.** Evidence:
`DAOTIMELOCK_CERTIFICATION.md` + on-chain `DAOTimelockExecutionFlow`.

**Audited — DAO.sol (source + 25 scenarios):** the proposal/voting core was gate-audited. Votes are
**ProofScore-weighted, not token-weighted** — weight is a snapshot frozen at proposal-creation time (DAO-05) via
`seer.getScoreAt`, and a 1-day `votingDelay` means a flash loan (or any just-in-time score pump) buys **zero**
votes. No double-voting; votes in the final 30-min grace are rejected (anti-front-run); eligibility is
score-gated. A minority **cannot pass**: quorum needs score-total ≥ minVotes (5000) AND unique voterCount ≥
minParticipation AND for > against, and minVotes can never fall below `ABSOLUTE_MIN_QUORUM` (500, DAO-02). Seer
can block a malicious proposal at finalization (mutual oversight). Execution is **timelock-only** — a passed
proposal is queued via `timelock.queueTxFromDAO` (never self-executes); `markExecuted` is onlyTimelock (DAO-07,
no admin soft-veto); expired queued proposals can't execute (DAO-12); param setters are onlyTimelock. Emergency
quorum rescue is bounded (≥10% of current, ≥500). **Non-custodial.** **No new findings.** Evidence:
`DAO_CERTIFICATION.md` + on-chain `DAOTimelockExecutionFlow` / `DAOAdminTransferGuardrail` / `GovernanceHooks`.

**Audited — CouncilElection.sol (source + 24 scenarios):** the council-seat election was gate-audited. Votes are
**ProofScore-weighted, snapshot-frozen** at election-start (`seer.getScoreAt`) — tokens buy zero votes and
post-open score pumps gain nothing. Sybil-resistant: candidate AND voter must clear `minCouncilScore` at the
snapshot, so fresh default-score vaults can't vote or run. No double-voting. **Only genuine winners are seated** —
a proposed slate must consist of actual top-voted candidates (`_isTopVotedCandidate`), so an arbitrary set can't
be seated even by the DAO; seating is timelocked (72h appoint delay). **Term-limited** (1 consecutive term, 365d
term + 365d cooldown) — no entrenchment. **Capture-resistant removal** (#503): `refreshCouncil` is permissionless
and must check ALL members, so the DAO can't selectively purge. Params are onlyDAO (route through the certified
DAO → timelock). **Non-custodial by construction** (no value transfers; ReentrancyGuard intentionally omitted).
**No new findings.** Evidence: `COUNCILELECTION_CERTIFICATION.md` + on-chain `CouncilElectionVoting`.

**Audited — Treasury cluster (source + 20 scenarios):** `EcoTreasuryVault` / `RevenueSplitter` / `FeeDistributor`
were gate-audited. Unlike the other governance contracts these HOLD funds — but **ecosystem/protocol funds, not
user-vault funds** — so the question is drain-resistance. Verdict: **no arbitrary-drain primitive.** Every outflow
either routes to pre-validated payees/pools by shares that MUST sum to 100% (FeeDistributor: dao+merchants+
headhunters == MAX_BPS, none over MAX_SINGLE_BPS; RevenueSplitter: payee shares == 10000, no zero-shares; full
balance always accounted, last sink gets the remainder — nothing skimmable), or is a DAO-gated discretionary
disbursement (`EcoTreasuryVault.sendVFIDE`, routes through the certified DAO → timelock), or is a rescue of
NON-treasury tokens (the treasury's own VFIDE is excluded — no skim). Split/destination/rescue changes are all
72h-timelocked; distribute is nonReentrant + rate-limited + pausable. **No path reaches a user vault. No new
findings.** Evidence: `TREASURY_CERTIFICATION.md` + on-chain `EcoTreasuryVaultNotifierTimelock` /
`EcoTreasuryVaultModuleExpiry` / `RevenueSplitter` / `FeeDistributorGuardrails`.

## 7. Social & Communication — 🟢 CERTIFIED (reputation inputs abuse-resistant; off-chain, no compile boundary) · Maturity: **Mature**

| System | Cert | Evidence |
|---|---|---|
| Messaging | 🟢 | `app/api/messages`, `SeerSocial.sol`. |
| Reviews | 🟢 | `app/api/merchant/reviews`. |
| Evidence Sharing | 🟢 | `app/api/attachments` (dispute evidence thread). |
| Reputation | 🟢 | `app/api/endorsements`, `app/api/community`, `friends`, `groups`. |

Reviews + reputation feed Trust/Discovery, so abuse-resistance here (fake reviews, endorsement rings) matters
to systems already certified — a reason to prioritize it alongside Trust.

---

**Audited (model + real reviews route, 34 scenarios):** reviews are DISPLAY-ONLY (don't feed Trust/ProofScore)
with no-self-review + one-per-product + server-computed verified flag; endorsements feed score but are
Sybil-resistant (ONLY score≥7000 may endorse → a fresh-account ring yields ZERO bonus), CAPPED (15%), and
DECAY; messaging is E2E-encrypted + rate-limited + blockable; evidence is uploader-scoped. **No new findings.**
Evidence: `SOCIAL_COMMUNICATION_CERTIFICATION.md`.

## 8. Developer Platform — 🔴 NOT A PRODUCT (does not exist yet; merchant webhooks 🟢 certified within it) · Maturity: **Thin** (verify scope)

| System | Cert | Evidence |
|---|---|---|
| SDK | 🔴 | **No `sdk`/`packages` directory found** — an SDK may not exist yet (verify before claiming it as a system). |
| APIs | 🔴 | The ~60 route groups under `app/api/*` are the de-facto API surface; no published/versioned API contract found. |
| Integrations | 🔴 | `app/api/enterprise`, `app/api/platform`, `VFIDEEnterpriseGateway.sol`, `VFIDEBridge.sol`. |
| Documentation | 🔴 | `app/developer` page exists; depth/coverage unverified. |

This is the group where the taxonomy most outruns the code: confirm what actually exists before auditing. Don't
list an SDK as a system until one exists.

---

**Grounded (no model — nothing to certify as a product):** NO SDK, NO public/third-party API keys, NO
dev docs/OpenAPI, NO third-party auth path — all API auth is session/JWT for VFIDE's own frontend. The ~161 API
routes are the app's backend, not a published product. **Real & certified within it:** merchant webhooks
(SSRF-hardened incl. alternate-form-IP + CGNAT defenses, 256-bit signed secret shown-once + encrypted-at-rest,
clean event enum). Rate-limiting infra is real (156 routes) but app-internal. `security/keys` is the encryption
key directory (Social), NOT dev keys. Evidence: `DEVELOPER_PLATFORM_ASSESSMENT.md`.

## 9. Onboarding — 🟢 CERTIFIED WITH VERIFICATION BOUNDARY (safety-critical core: protection-setup non-skippable + quest farm closed + automatic on-chain attestation, all with tests; remaining = compiled verification + deeper validation of some persona-specific guided flows) · Maturity: **Mature**

| System | Cert | Evidence |
|---|---|---|
| New User | ⚠️ | `app/onboarding` (page + layout + loading/error states). |
| New Merchant | ⚠️ | Merchant setup flows exist across `app/merchant/*`; a dedicated onboarding path needs mapping. |
| New Customer | ⚠️ | Buyer first-run; needs verification. |
| Education | ⚠️ | `app/seer-academy` (repositioned earlier as a Knowledge Library). |
| First Purchase | ⚠️ | Composes Commerce (certified) — but the *guided first-purchase* flow itself is unaudited. |
| First Recovery | ⚠️ | Composes Recovery (uncertified) — the *guided first-recovery* setup is unaudited and high-stakes. |

`app/onboarding` exists, plus onboarding quests and the academy — so there's real surface to audit, but the
end-to-end "can a brand-new financially-excluded user actually set up a vault and make a first purchase"
journey has not been validated to Commerce depth.

---

**Audited (source + 37 scenarios) — safety-critical core CERTIFIED:** the VaultSetupWizard (vault→spend
limits→guardians→recovery) is real, mounted, and auto-launched. Both original findings are now RESOLVED with
tests, and the attestation follow-up is complete — this is what earns the 🟢 on the core:

- (A) Guardian/recovery skip path — **FIXED.** `useWizardState.tsx` adds `guardianRiskAcknowledged` + derived
  `recoveryConfigured`/`recoverySafe`; `skip()` refuses recovery chapters until recovery is safe; `GuardiansChapter`
  adds an explicit risk-acknowledgment interstitial; `DoneChapter` gives an honest recap (amber "Recovery is not
  set up" banner unless configured). A silently-skipped, falsely-"protected" funded vault is no longer reachable.
  (`docs/FIX_GUARDIAN_SETUP_NONSKIPPABLE.md`.)
- (B) Self-asserted quest rewards — **FIXED + ATTESTED.** `lib/quests/onboardingVerification.ts` classifies each
  step as `self-evident` / `db` / `attested`; the route 422s unverified steps. The on-chain-truth steps (deposit,
  vote) now route through `lib/quests/onchainAttestation.ts` — a server-side viem reader with a three-state
  contract: **confirmed** (chain proves it → grant), **not-found** (chain read OK, absent → deny, fail closed —
  the farm defense), **unavailable** (chain unreadable → retryable 503, never a false denial). 9 dedicated
  attestation tests; route integrated; full suite green (465 across 19 suites). (`docs/FIX_ONBOARDING_QUEST_VERIFICATION.md`,
  `docs/FIX_ONBOARDING_ATTESTATION_PATH.md`.)

**Remaining (verification boundary — why it's 🟢-with-boundary, not unqualified 🟢):**
- Compiled verification of the attestation's underlying reads (`vaultOf` / `balanceOf` / `hasVotedAnyProposal` —
  plain public getters), shared with every other system.
- Some **persona-specific guided flows** (a dedicated merchant onboarding path; the guided first-recovery setup)
  were *mapped, not deeply audited* — see the rows above. The 🟢 covers the safety-critical wizard + quest
  integrity, not a claim that every persona's end-to-end guided journey has been validated to Commerce depth.

Evidence: `ONBOARDING_CERTIFICATION.md` + the three fix docs above.

## 10. Recommended next audit — an honest disagreement worth considering

You proposed **Onboarding or Trust**, on the grounds that they're what every user touches first. That argument
is strong and I don't want to wave it away: for a protocol whose *mission* is the financially-excluded, a
perfect system nobody can use fails the mission. Adoption-weighted, Onboarding is the right answer.

But I'd put one alternative in front of you before you decide, because I think it has a stronger claim on pure
**risk-weighting**: **Core Ownership (the vault / non-custodial controls).**

The reasoning:
- It is the **load-bearing invariant**. Everything I just certified in Commerce — every POS sale, every
  escrow-backed milestone, every refund — sits *on top of* the vault. If funds can be frozen, seized, or drained
  in the ownership core, none of the Commerce certifications mean anything. A defect there doesn't degrade a
  feature; it invalidates the whole value proposition.
- The invariant is **"non-custodial by absence of code,"** which is elegant but is exactly the kind of property
  that's easy to *accidentally* break when adding features (we already saw, in the Commerce work, how adding a
  `middleware.ts` could threaten an architectural invariant). Absence is hard to prove and easy to erode.
- A vault defect is **catastrophic and irreversible** (funds); an onboarding defect is **recoverable** (it's a
  conversion/comprehension problem you can fix and re-ship).

So the honest framing is a genuine tradeoff:
- **Risk-weighted → Core Ownership first.** Catastrophic blast radius; it underwrites everything else.
- **Adoption-weighted → Onboarding first.** Highest-frequency touchpoint; the mission depends on it.
- **Trust** sits in between and is partly de-risked already (Phase 5 exercised Merchant Trust / Builder /
  Transparency), so it's a *lower* marginal-value next step than either of the above.

My recommendation: **Core Ownership next**, then **Onboarding**. Certify the foundation everything rests on,
then certify the front door everyone enters through. But this is a judgment call about your current risk posture
and goals as much as a technical one — if your immediate priority is adoption/retention rather than
funds-safety assurance, Onboarding first is entirely defensible. Your call; I've given you my honest read rather
than just agreeing.

---

## Status summary

| Group | Cert | Maturity | Next-audit priority |
|---|---|---|---|
| Commerce | 🟢 / ⚠️ | Mature | done (1 follow-up: wire `/marketplace` to `/api/discovery`) |
| Core Ownership | ⚠️ | Mature | source-certified; **on-chain hardhat run = required follow-up** |
| Onboarding | 🟢 | Mature | safety-critical core CERTIFIED (protection non-skippable + quest farm closed + on-chain attestation, 3-state model, 9 tests, suite green); boundary = compiled verification + deeper persona-flow validation |
| Recovery & Continuity | ⚠️ | Mature | source-certified; single-guardian finding + no-guardian-unrecoverable consequence |
| Trust | ⚠️ | Mature | ProofScore (incl. per-source machinery, un-buyable) + fee/appeals/merchant-trust gate-audited; FraudRegistry+FraudJury non-custodial; individual external source contracts = audit-before-add boundary |
| Governance | ⚠️ | Mature | all core contracts gate-audited & non-custodial (DAO, DAOTimelock, OwnerControlPanel, AdminMultiSig, CouncilElection, EmergencyControl) + Treasury cluster drain-resistant; on-chain re-verification = remaining boundary |
| Social & Communication | 🟢 | Mature | reputation inputs certified (reviews display-only; endorsements Sybil-resistant/capped/decaying) |
| Seer | ⚠️ | Mature | enforcement boundary + risk/incentive/opportunity engines certified; SeerAutonomous compiled run + advisor engines depth = follow-ups |
| Developer Platform | 🔴 | Not built | not a product (no SDK/public-keys/docs); merchant webhooks 🟢 certified; rate-limit infra real but app-internal |

**Bottom line:** Commerce is certified to depth; **Core Ownership is now source-certified ⚠️ (non-custodial invariant proven; on-chain hardhat re-verification is the pending boundary).** Everything else is honestly 🔴/🟡 for
*certification*, regardless of how mature it is. The next highest-value gate audit is **Core Ownership** on risk
grounds (or **Onboarding** if adoption is your immediate priority) — and every system above should ultimately be
brought to the same 50+-scenario, adversarially-tested, boundary-honest depth as Commerce Operations.
