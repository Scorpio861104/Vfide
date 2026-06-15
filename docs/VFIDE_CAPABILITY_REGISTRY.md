# VFIDE Capability Registry

**The capability-level tracker.** Where `VFIDE_SYSTEMS_CERTIFICATION_TRACKER.md` rolls up to *systems*, this
registry tracks the unit that actually earns certification under `VFIDE_VERIFICATION_STANDARD.md`: the
**capability** — every function, permission, workflow, engine, automation, and integration, *each independently*.

Guiding lesson: **systems don't fail; capabilities fail.** "Recovery" doesn't break — "recovery expiration during
active inheritance while a guardian is unreachable and proof-of-life is challenged" breaks. This registry exists so
that *that* level of reality is what gets tracked, without relying on memory, assumptions, or marketing language.

## The three certification levels

```
Level 1 — Capability Certification   (this registry)
   Create Recovery must pass all 14 stages.
        ↓
Level 2 — System Certification        (the systems tracker)
   Recovery = all recovery capabilities certified + integration verified.
        ↓
Level 3 — Platform Certification      (VFIDE Launch Readiness — future doc)
   Every system certified + every cross-system integration + every critical workflow.
```

## Legend — the 14-stage status line

Each capability carries a 14-token status, one token per stage of the verification chain:

```
Position:  1  2  3  4  5  6  7  8  9  A  B  C  D  E
  1 Contracts          5 Database          9 User Journey       D Grandmother
  2 Contract Security  6 Permissions/Roles A Edge Case Matrix   E Certification
  3 Backend Services   7 Frontend/UI       B Adversarial
  4 API Layer          8 Workflow          C Cross-System Integration

Token:  Y = passed (condition met + EVIDENCE)
        ~ = partial — substantive but not fully met
            · at stage 1: code EXISTS but correctness not yet source-audited (exists-unaudited)
            · at stage 2: adversarial source + executable model done, COMPILED BYTECODE RUN PENDING
        . = not yet assessed against this standard
        - = N/A / deliberately absent (see "deliberate non-capabilities")

Deployment Path (DP) — a second, orthogonal axis: is this capability actually expected to ship?
        ACTIVE   = on the deployed path (in CONTRACT_ADDRESSES / live route, exercised by the running app)
        LEGACY   = implemented in a superseded contract (e.g. UserVaultLegacy) NOT in the active config
        PLANNED  = named/conceptual; no implementing code found
        REMOVED  = deliberately deleted (non-custodial invariant) — absence is the security property
        UNKNOWN  = exists but active-path status unverified
DP is shown on flagged rows; an UNLISTED DP means ACTIVE (verified on the deployed path). The two axes are
independent: a capability can be `Y` (verified) yet LEGACY (a well-tested old mechanism that won't ship), or `~`
(exists) yet PLANNED. **Certification follows the ACTIVE path; LEGACY/PLANNED capabilities are not launch
targets.**
```

**The governing rule (never relaxed): a token is never `Y` from assumption.** A stage is `Y` only when its
condition is met *and* evidence exists. If it wasn't verified → `.`. If partial → `~`. This is what makes the
registry worth trusting; the moment a `Y` can mean "probably fine," the registry is worthless.

### Four honest capability states you'll see below
- **Audited (core):** signature like `Y ~ . . . Y . . . Y Y ~ . .` — source-correct, on-chain permission verified,
  edge+adversarial matrices complete, **bytecode pending** (stage 2 `~`), full-stack stages not yet assessed.
- **Exists-unaudited:** `~ . . . . . . . . . . . . .` — code is present (existence confirmed by grep/read) but
  nothing has been verified against the standard yet.
- **Not built / planned:** `. . . . . . . . . . . . . .` — named capability with no implementing code found.
- **Deliberately absent:** `- - - - - - - - - - - - - -` — intentionally not built because it would violate the
  non-custodial invariant. *This is a verified design property, not a gap.*

---

## Core Ownership — the vault (largest blast radius)
Audited via source + `ownershipInvariants.ts`; manifest §1.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Vault Creation                         Y ~ . . ~ Y . . . Y Y ~ . .
Vault Access / read                    Y ~ . . . Y . . . Y Y . . .
Asset Deposit                          Y ~ . ~ . Y ~ . . Y Y ~ . .
Asset Withdrawal (signed intent)       Y ~ . ~ . Y ~ . . Y Y ~ . .
Ownership Transfer                     Y ~ . . . Y . . . Y Y ~ . .
Ownership Verification                 Y ~ . . . Y . . . Y Y . . .
Ownership Override Prevention          Y ~ . . . Y . . . Y Y Y . .
Spend / transfer limits                Y ~ . . . Y . . . Y Y . . .
Active-wallet rotation                 Y ~ . . . Y . . . Y Y ~ . .
Vault recovery hooks                   Y ~ . . . Y . . . Y Y ~ . .
Guardian Lock (non-freezing)           ~ . . . . . . . . . . . . .
```
Note: Guardian Lock exists as a contract but is `~` (exists-unaudited at this granularity) — and by the
non-custodial invariant it *cannot* freeze/seize user funds; that boundary is what the audits enforce.

## Recovery & Continuity
Audited via `recoveryModel.ts`; manifest §2. **Deployment-path verification done this pass** (see finding below):
the ACTIVE continuity path is heir-commitments + proof-of-life in `CardBoundVault`/`CardBoundVaultInheritanceManager`
(in `CONTRACT_ADDRESSES`); the successor / next-of-kin / "chain of return" naming is the **LEGACY `UserVaultLegacy`**
mechanism, verified by `verify-{next-of-kin,chain-of-return}` scripts but **not on the deployed path**.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E   DP
— Guardians (active vault path) —
Guardian Creation                      Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 2 — timelocked add, owner-cancellable)
Guardian Removal                       Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 2 — last-guardian protected, threshold auto-clamp)
Guardian Replacement                   Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 2 — maturity-gated trustee promotion FIXED)
Guardian Threshold Changes             Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 2 — zero-redundancy guard verified)
Guardian Vote                          Y ~ . . . Y . . . Y Y . . .   ACTIVE
— Recovery (active vault path) —
Create Recovery                        Y ~ . . . Y . . . Y Y ~ . .   ACTIVE
Cancel Recovery                        Y ~ . . . Y . . . Y Y . . .   ACTIVE
Recovery Challenge                     Y ~ . . . Y . . . Y Y ~ . .   ACTIVE
Trustee logic                          Y ~ . . . Y . . . Y Y . . .   ACTIVE
Recovery Expiration                    Y ~ . . . Y . . . Y Y . . .   ACTIVE
Recovery Claim lifecycle               Y ~ . . . Y . . . Y Y ~ . .   ACTIVE
Recovery permissions                   Y ~ . . . Y . . . Y Y . . .   ACTIVE
Recovery notifications                 . . . . . . . . . . . . . .   UNKNOWN  (no impl confirmed)
Recovery UI                            . . . . . . ~ . . . . . . .   ACTIVE   (surface exists, unaudited)
— Proof-of-Life (active vault path) —
Proof-of-Life Ping / set wallet        Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (setProofOfLifeWallet; Audit 1 — snapshot-protected, admin-gated)
Proof-of-Life Challenge                Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 1 — owner-override defeats collusion)
Proof-of-Life Resolution               Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 1 — recovery timer-freeze verified)
— Active inheritance (heir-based) —
Heir Configuration (propose/confirm)   Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 4 — 30d cooldown, heirs must be guardians, version-binding)
Heir Config Guardian-Quorum Veto       Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 4 — cancel-threshold bypass via stale votes FIXED)
Inheritance Claim (initiate)           Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 3 — commit-reveal binds bps, replay-protected)
Inheritance Finalization (claim share) Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (Audit 3 — proportional split, div-by-zero brick FIXED)
Recovery ↔ inheritance exclusion       Y ~ . . . Y . . . Y Y Y . .   ACTIVE
— Successor / Next-of-Kin / Chain of Return (LEGACY UserVaultLegacy) —
Successor Registration (setNextOfKin)  ~ . . . . Y . . . . . . . .   LEGACY
Successor Removal                      . . . . . . . . . . . . . .   LEGACY
Chain of Return — Trigger (request)    ~ . . . . . . . . . . . . .   LEGACY   (requestInheritance, UserVaultLegacy)
Chain of Return — Review               . . . . . . . . . . . . . .   LEGACY
Chain of Return — Approval             ~ . . . . Y . . . . . . . .   LEGACY   (approveInheritance, UserVaultLegacy)
Chain of Return — Execution            ~ . . . . . . . . . . . . .   LEGACY   (finalizeInheritance, UserVaultLegacy)
— Continuity Lock (not built) —
Continuity Lock Creation               . . . . . . . . . . . . . .   PLANNED  (no code, no script)
Continuity Lock Modification           . . . . . . . . . . . . . .   PLANNED
Continuity Lock Expiration             . . . . . . . . . . . . . .   PLANNED
```

> **FINDING (deployment-path verification, evidenced):** VFIDE contains **two** continuity/inheritance systems.
> The **ACTIVE** one — deployed via `CONTRACT_ADDRESSES`, audited — is `CardBoundVault` +
> `CardBoundVaultInheritanceManager`, using **heir-commitments + proof-of-life** (`setProofOfLifeWallet`,
> `heirCommitmentByGuardian`, `initiateInheritanceClaim`, `claimHeirShare`). The **LEGACY** one is
> `UserVaultLegacy` (inside `contracts/legacy/VaultInfrastructure.sol`, **absent from `CONTRACT_ADDRESSES`**),
> using `setNextOfKin` / `requestInheritance` / `approveInheritance` / `finalizeInheritance` — and it is precisely
> this legacy contract that `scripts/verify-next-of-kin-inheritance.ts` and `scripts/verify-chain-of-return-timelock.ts`
> load and exercise (`artifacts/contracts/legacy/VaultInfrastructure.sol/UserVaultLegacy.json`). **The
> "Successor / Next-of-Kin / Chain of Return" naming therefore maps to LEGACY code that is not on the deployment
> path.** Contributors must build continuity features on the active heir + proof-of-life mechanism, not on
> `setNextOfKin`. *Confirmable to certainty by checking which vault the deploy script instantiates; the address
> config + the `CardBoundVault` "primary vault" comment + the heir-based active manager already make it clear.*
>
> **NOW CONFIRMED + CANONICALIZED:** `scripts/deploy-full.ts` deploys the CardBoundVault stack (25 refs) and
> `UserVaultLegacy` **0 times** — the LEGACY determination is definitive, not inferred. The full ACTIVE/LEGACY/
> PLANNED/REMOVED breakdown with exact function names is locked in **`VFIDE_CONTINUITY_ARCHITECTURE.md`** (the
> canonical reference contributors check before any continuity work).
>
> **AUDIT 1 (Proof-of-Life) COMPLETE** — `CONTINUITY_AUDIT_1_PROOF_OF_LIFE.md`. 32-scenario adversarial+edge
> matrix (`__tests__/audit/proofOfLifeContinuity.test.ts`) + executable model; mechanism robust (living owner
> defeats false claims even vs full guardian collusion); 1 LOW finding (stale timer comment) FIXED + retested.
> PoL rows above advanced to evidenced stages 1/6/10/11/12/13 (stage 2 `~` bytecode-pending; full-stack `.`).
>
> **AUDIT 2 (Guardian Management) COMPLETE** — `CONTINUITY_AUDIT_2_GUARDIAN_MANAGEMENT.md`. 20-scenario matrix
> (`__tests__/audit/guardianManagement.test.ts`) + model; verified change-timelock veto, last-guardian
> protection, threshold auto-clamp + zero-redundancy guard, guardian-death handling, and SINGLE-INSTANCE recovery
> (resolves the Audit-1 overlapping-recovery flag). **1 MEDIUM-LOW finding FIXED**: guardian-maturity requirement
> documented but unenforced on trustee promotion → now enforced (`CBV_GuardianImmature`, post-setup, bootstrap
> exempt). Guardian rows advanced to evidenced stages 1/6/10/11/12/13 (stage 2 `~`; full-stack `.`).
>
> **AUDIT 3 (Inheritance Claims) COMPLETE** — `CONTINUITY_AUDIT_3_INHERITANCE_CLAIMS.md`. 15-scenario matrix
> (`__tests__/audit/inheritanceClaim.test.ts`) + model; verified commit-reveal binds basisPoints (over-claim
> cryptographically impossible), replay protection, and proportional distribution that NEVER over-pays (sum ==
> balance even when over-subscribed). **1 LOW finding FIXED**: division-by-zero brick when all revealing heirs
> committed 0 bps → `totalRevealed == 0` guard added (degenerate-config safety; not attacker-reachable). Claim
> rows advanced to evidenced stages 1/6/10/11/12/13 (stage 2 `~`; full-stack `.`).
>
> **AUDIT 4 (Heir Configuration) COMPLETE** — `CONTINUITY_AUDIT_4_HEIR_CONFIGURATION.md`. 16-scenario matrix
> (`__tests__/audit/heirConfiguration.test.ts`) + model; verified owner-only + claim-blocked propose/confirm, 30d
> cooldown, heirs-must-be-guardians, version binding, guardian-removed-during-cooldown, and guardian-quorum veto.
> **1 MEDIUM-LOW finding FIXED**: the guardian cancel-vote threshold was bypassable because votes were keyed by the
> reusable config version (live version only advances on confirm) — a cancelled-then-reproposed config inherited
> the stale tally, letting a sub-threshold minority cancel a legitimate proposal. Fixed by keying votes to a
> monotonic `configProposalNonce`. Config rows advanced to evidenced stages 1/6/10/11/12/13 (stage 2 `~`).
>
> **CONTINUITY CAMPAIGN COMPLETE (Audits 1–4):** all five success-criteria capabilities (Proof-of-Life, Guardian
> Management, Inheritance Claim, Distribution, Heir Configuration) have had a full source+model audit under the
> find→fix→retest→re-audit rule. **4 real contract fixes** delivered. Every row at evidenced stages 1/6/10/11/12/13;
> **stage 2 (compiled bytecode) is the single remaining boundary** to all-14-`Y` certification — reached when the
> hardhat harness runs against the bytecode (solc env) confirming these fixes + the full state machine. Full audit
> suite: 525 tests / 20 suites green.

## Inheritance / Next-of-Kin
Manifest §1.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Initiate inheritance                   Y ~ . . . Y . . . Y Y ~ . .
Living-owner VETO                      Y ~ . . . Y . . . Y Y Y . .
CLAIM window                           Y ~ . . . Y . . . Y Y ~ . .
MEMORIAL window                        Y ~ . . . Y . . . Y Y . . .
COOLDOWN enforcement                   Y ~ . . . Y . . . Y Y . . .
Non-guardian-initiate rejection        Y ~ . . . Y . . . Y Y Y . .
```

## Governance
Audited individually: `DAO.sol`, `DAOTimelock.sol`, `CouncilElection.sol`, `AdminMultiSig.sol`,
`OwnerControlPanel.sol`, `EmergencyControl.sol`. Manifest §4/§6/§7.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Proposal Creation                      Y ~ . . . Y . . . Y Y ~ . .
Proposal Voting (score-weighted)       Y ~ . . . Y . . . Y Y ~ . .
Quorum + pass                          Y ~ . . . Y . . . Y Y . . .
Proposal Execution (timelock-only)     Y ~ . . . Y . . . Y Y Y . .
Emergency quorum rescue                Y ~ . . . Y . . . Y Y . . .
Timelock Queue                         Y ~ . . . Y . . . Y Y ~ . .
Timelock Execute (delay-gated)         Y ~ . . . Y . . . Y Y Y . .
Timelock delay floor                   Y ~ . . . Y . . . Y Y . . .
Timelock cancel / requeue              Y ~ . . . Y . . . Y Y . . .
Treasury Proposal (DAO-gated)          Y ~ . . . Y . . . Y Y ~ . .
Council Election — vote                Y ~ . . . Y . . . Y Y ~ . .
Council Election — seat (top-voted)    Y ~ . . . Y . . . Y Y ~ . .
Council Election — term limits         Y ~ . . . Y . . . Y Y . . .
Council Election — refresh (#503)      Y ~ . . . Y . . . Y Y . . .
MultiSig Approval / execute            Y ~ . . . Y . . . Y Y ~ . .
MultiSig allowlist bound               Y ~ . . . Y . . . Y Y Y . .
MultiSig community veto                Y ~ . . . Y . . . Y Y . . .
OwnerControlPanel guardrails           Y ~ . . . Y . . . Y Y ~ . .
EmergencyControl (timelocked)          Y ~ . . . Y . . . Y Y ~ . .
```

## Trust — ProofScore & Fraud
Audited: `Seer.sol` score framework, `ProofScoreBurnRouter.sol`, `FraudRegistry.sol`, `FraudJury.sol`.
Manifest §3/§9.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
ProofScore Calculation                 Y ~ . . . Y . . . Y Y ~ . .
Score Source Registration              Y ~ . . . Y . . . Y Y . . .
Source Weighting (sum ≤ 100%)          Y ~ . . . Y . . . Y Y . . .
Anti-capture on-chain floor            Y ~ . . . Y . . . Y Y . . .
Behavioral-only (no wealth)            Y ~ . . . Y . . . Y Y . . .
Fee Adjustment (curve 5%→0.25%)        Y ~ . . . Y . . . Y Y ~ . .
DAO setScore (rate+magnitude cap)      Y ~ . . . Y . . . Y Y . . .
Visibility Adjustment                  ~ . . . . . . . . . . . . .
Fraud report (spam-resistant)          Y ~ . . . Y . . . Y Y . . .
Fraud jury (commit-reveal 2/3)         Y ~ . . . Y . . . Y Y ~ . .
Fraud consequence (no fund seize)      Y ~ . . . Y . . . Y Y Y . .
Appeals / DAO veto-only                Y ~ . . . Y . . . Y Y ~ . .
Restitution / forgiveness (TTL)        Y ~ . . . Y . . . Y Y . . .
External score-source contracts        - - - - - - - - - - - - - -
```
Note: Visibility Adjustment `~` — visibility/discovery effects live in `lib/seer/discovery.ts` (exists,
unaudited). External score-source contracts `-` (N/A): **none exist yet**; each must clear the full chain before
the DAO may add it.

## Seer — autonomous advisory + enforcement boundary
Enforcement boundary audited (`seerModel.ts`, manifest §5). The advisory "detection" capabilities below were
grep-checked: **no `detectOpportunity`/`detectRisk`/`detectExtraction` functions exist** — related advisory
engines live in `lib/seer/` (`merchantHealth`, `merchantAdvisor`, `marketStability`, etc.), unaudited.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Enforcement boundary (observe→discard) Y ~ . . . Y . . . Y Y Y . .
Restriction-level escalation           Y ~ . . . Y . . . Y Y ~ . .
Score adjustment (bounded)             Y ~ . . . Y . . . Y Y . . .
Work attestation (timelocked)          Y ~ . . . Y . . . Y Y . . .
Fail-open on hook revert (SEER-04)     Y ~ . . . Y . . . Y Y Y . .
Fraud Signal Generation                Y ~ . . . Y . . . Y Y ~ . .
Risk Detection (advisory)              ~ . . . . . . . . . . . . .
Visibility Recommendation (advisory)   ~ . . . . . . . . . . . . .
Fee Recommendation (advisory)          ~ . . . . . . . . . . . . .
Opportunity Detection                  . . . . . . . . . . . . . .
Extraction Detection                   . . . . . . . . . . . . . .
Escrow Recommendation                  - - - - - - - - - - - - - -
```
Note: Risk/Visibility/Fee recommendations `~` — backed by unaudited `lib/seer/` engines. Opportunity / Extraction
Detection `.` — **named but no implementing code found** (not built as named). Escrow Recommendation `-`
(deliberately absent — escrow holds were removed for non-custodiality).

## Treasury cluster
Manifest §8.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
FeeDistributor — distribute            Y ~ . . . Y . . . Y Y ~ . .
FeeDistributor — split (==100%)        Y ~ . . . Y . . . Y Y . . .
RevenueSplitter — distribute           Y ~ . . . Y . . . Y Y . . .
EcoTreasuryVault — sendVFIDE           Y ~ . . . Y . . . Y Y ~ . .
EcoTreasuryVault — rescue (no skim)    Y ~ . . . Y . . . Y Y . . .
No-drain-primitive invariant           Y ~ . . . Y . . . Y Y Y . .
```

## Onboarding — furthest along the full-stack chain (with Commerce)
Fix docs + app-layer Jest evidence.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Wallet Creation (wizard)               . - . . . ~ ~ ~ ~ Y Y . ~ .
Guardian Setup (non-skippable)         . - . . . Y Y Y ~ Y Y ~ Y .
Recovery Setup honesty                 . - . . . Y Y Y ~ Y Y ~ Y .
Quest — self-evident steps             - - Y Y Y Y ~ ~ . Y Y ~ ~ .
Quest — db-verified steps              - - Y Y Y Y ~ ~ . Y Y ~ ~ .
Quest — attested (on-chain) steps      ~ ~ Y Y Y Y ~ ~ . Y Y ~ ~ .
Attestation 3-state contract           ~ ~ Y Y Y Y - ~ . Y Y ~ Y .
First Purchase (guided)                . . . . . . ~ ~ ~ . . ~ ~ .
First Merchant Setup (guided)          . . . . . . ~ ~ ~ . . ~ ~ .
```
Note: First Purchase / First Merchant Setup `~`/`.` — the *guided* flows compose certified Commerce but the
guided journeys themselves are unaudited (flagged in the systems tracker).

## Commerce — per prior certification (headline rows); operational sub-capabilities pending granular cert
Headline groups went through the broader gate discipline (prior cert). Stage E is `~` on all because **stage 2
(bytecode) is pending**. The finer operational sub-capabilities are listed honestly as components not yet
*individually* re-certified at this granularity (no-inheritance rule).

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Variants (headline)                    Y ~ Y Y Y Y Y Y Y Y Y Y Y ~
Bundles (headline)                     Y ~ Y Y Y Y Y Y Y Y Y Y Y ~
Shipping (headline)                    Y ~ Y Y Y Y Y Y Y Y Y Y Y ~
Tax (headline)                         Y ~ Y Y Y Y Y Y Y Y Y Y Y ~
Returns/refunds/exchanges (headline)   Y ~ Y Y Y Y Y Y Y Y Y Y Y ~
Employees / workforce (headline)       Y ~ Y Y Y Y Y Y Y Y Y Y Y ~
POS (headline)                         Y ~ Y Y Y Y Y Y Y Y Y Y Y ~
Discovery (headline)                   Y ~ Y Y Y Y ~ Y Y Y Y Y Y ~
  ├─ Product Creation                  ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Product Editing                   ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Variant Checkout                  ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Shipping Rate Selection           ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Shipping Label Creation           ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Order Fulfillment                 ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Refund Processing                 ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Exchange Processing               ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ Employee Scheduling               ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  ├─ POS Checkout                      ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
  └─ Register Open/Close               ~ ~ ~ ~ ~ ~ ~ ~ ~ . . ~ . .
```
Note: the sub-capabilities are `~` (exist as part of mature, gate-certified Commerce) but their A/B/D/E cells are
`.` because they were **not run through the matrix individually** at this granularity. This is the no-inheritance
rule made visible: a certified parent does not auto-certify its children's per-capability matrices.

## Social & Communication
Reputation inputs certified (off-chain, no compile boundary). Messaging/reviews/evidence grep-confirmed present,
unaudited.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Endorsements (abuse-resistant)         - - Y Y Y Y Y Y Y Y Y Y Y Y
Friend / group graph                   - - Y Y Y Y Y Y Y Y Y Y Y Y
Reputation Adjustments → ProofScore    - - Y Y Y Y ~ Y Y Y Y Y Y ~
Messaging                              - - ~ ~ ~ ~ ~ ~ . . . . . .
Merchant Messaging                     - - ~ ~ ~ ~ ~ ~ . . . . . .
Evidence Submission                    - - ~ ~ ~ ~ ~ ~ . . . . . .
Review Creation                        - - ~ ~ ~ ~ ~ ~ . . . . . .
Review Appeals                         . . . . . . . . . . . . . .
```
Note: Messaging/Merchant Messaging (`app/social-messaging`, `app/api/messages`), Evidence (`app/api/disputes`),
Review Creation (`app/api/merchant/reviews`) all `~` — code exists, unaudited against the standard. Review
Appeals `.` — no distinct implementing code confirmed.

## Developer Platform — 🔴 at system level (not a complete product)
Grep-checked: webhook route + dev-portal shell exist; API keys are *embedded* (no first-class route);
SDK-auth/docs-search not found.

```
                                       1 2 3 4 5 6 7 8 9 A B C D E
Webhook Registration                   - - ~ ~ ~ ~ ~ . . . . . . .
Event Delivery                         - - ~ ~ ~ . . . . . . . . .
API Key Creation (embedded only)       - - ~ ~ . . . . . . . . . .
SDK Authentication                     . . . . . . . . . . . . . .
Documentation Search                   . . . . . . . . . . . . . .
```
Note: Webhook Registration / Event Delivery `~` (`app/api/merchant/webhooks` + `security/webhook-replay-metrics`,
unaudited). API Key Creation `~` but **embedded** in product/withdraw routes — no dedicated capability surface.
SDK Authentication / Documentation Search `.` — **not built**.

---

## Ownership ↔ Commerce Boundary — CERTIFICATION GATE (REQUIRED · CRITICAL)

**This is a platform-certification gate, not a backlog.** VFIDE's thesis is *Ownership Protected → Commerce
Enabled*; the vault↔wallet↔merchant boundary is the seam the whole ecosystem rests on. **No final platform
certification until this campaign (`OWNERSHIP_COMMERCE_BOUNDARY_AUDIT.md`) is complete.** Stage legend identical
to the rest of this registry; DP = ACTIVE.

```
Capability                              1 2 3 4 5 6 7 8 9 A B C D E   DP       Notes
Ownership/Spending Separation (Cap 4)   Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 1 — wallet=signing authority, NOT an asset store)
Merchant Settlement Path (Cap 8)        Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 1 — DIRECT vault→merchant; no wallet hop)
Spending Controls (Cap 5)               Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 1 — per-tx + daily caps, large-payment queue, Seer)
Wallet-Compromise Blast Radius (Cap 6)  Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 4 — 3-key model; no compromise escalates; recovery-abort tension documented)
Vault Funding (Cap 1)                   Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 2 — ERC20-in; rescue CANNOT touch VFIDE; ownership retained)
Spend Authority — who can trigger (Cap2)Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 3 — direct spend = activeWallet sig ONLY; not admin/guardian/DAO)
Wallet Spending Types (Cap 3)           Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 3 — two channels: direct signed + subscription allowance-pull)
Continuity ↔ Commerce Interaction (Cap7)Y ~ . . . Y . . . Y Y Y Y .   ACTIVE   (OC Audit 5 — vault assets inherited; freezes bind direct fully, sub partially)
```

> **OC AUDIT 1 (Foundational Architecture) COMPLETE** — `OWNERSHIP_COMMERCE_BOUNDARY_AUDIT.md`. 21-scenario matrix
> (`__tests__/audit/ownershipCommerceBoundary.test.ts`) + model. **Ground truth traced (no assumptions):** the
> VAULT is the sole asset store; the `activeWallet` is a SPENDING AUTHORITY that never holds funds (not a second
> ownership layer); settlement is **DIRECT vault→merchant** (the assumed vault→wallet→merchant three-hop is
> architecturally incorrect — corrected here). Wallet compromise is blast-radius-bounded (per-tx + daily caps,
> large-payment queue) and fully recoverable (wallet rotation bumps epoch + clears the queue). **No critical/high
> findings** — boundary sound. Rows above at evidenced stages 1/6/10/11/12/13 (stage 2 `~`).
>
> **OC AUDIT 2 (Vault Funding, Cap 1) COMPLETE** — 12-scenario matrix (`__tests__/audit/vaultFunding.test.ts`) +
> model. Assets enter as plain ERC20 balance (no deposit fn); the 50K pre-guardian cap is a vault-to-vault SOFT
> cap (raw transfers not interceptable — comment clarified). **Ownership retained:** `rescueERC20` double-guards
> against VFIDE (propose + apply) so a compromised admin cannot drain it; stray/native rescue is timelocked +
> guardian-cancellable. No critical/high findings. Cap 1 row at evidenced stages 1/6/10/11/12/13 (stage 2 `~`).
>
> **OC AUDIT 3 (Spend Authority + Spending Types, Caps 2 & 3) COMPLETE** — 22-scenario matrix
> (`__tests__/audit/spendingChannels.test.ts`) + model. **TWO spending channels:** (1) DIRECT spend
> (merchant/peer/escrow) authorized ONLY by the activeWallet signature (not admin/guardian/DAO/attacker/portal),
> bounded by per-tx/daily/epoch/Seer, severed by recovery; (2) SUBSCRIPTION pull (allowance-based, admin-set +
> timelocked + guardian-cancellable to establish, bounded by allowance + amount/interval + vault-pinning), which
> deliberately does NOT use the vault's daily limit. **1 MEDIUM finding (documented, not auto-fixed):** recovery
> severs the direct channel but not subscription allowances (a walletEpoch binding was rejected as it would break
> legitimate rotations; remediation is operational + a team design decision). Caps 2 & 3 at stages 1/6/10/11/12/13.
>
> **OC AUDIT 4 (Wallet-Compromise Matrix, Cap 6) COMPLETE** — 29-scenario matrix
> (`__tests__/audit/walletCompromise.test.ts`) + model. THREE-key model (hot activeWallet / config admin / account
> identity ownerOfVault). **Universal guarantees under EVERY compromise:** limits never raise instantly (7d),
> VFIDE never rescuable, config never instant, ownership never seized — no compromise escalates; worst case is
> bounded spend at the daily limit until recovery. SIM swap compromises nothing on-chain. **1 MEDIUM finding
> (documented):** recovery-abort griefing in the UNSEPARATED default (a single-key compromise can abort recovery),
> already mitigated by key separation; enhancement options noted. Cap 6 at stages 1/6/10/11/12/13.
>
> **OC AUDIT 5 (Continuity ↔ Commerce Interaction, Cap 7) COMPLETE — CAMPAIGN CAPSTONE** — 15-scenario matrix
> (`__tests__/audit/continuityCommerce.test.ts`) + model. Inheritance distributes VAULT assets (no wallet assets
> exist); proof-of-life is reactive/guardian-gated (spending doesn't refresh it); recovery cancels the claim +
> clears the direct queue. **1 LOW-MEDIUM finding:** the inheritance freeze + recovery bind the DIRECT channel fully
> but the SUBSCRIPTION channel escapes both (continues through VETO/CLAIM, settles at MEMORIAL; allowance survives
> recovery) — documented, with optional earlier-cancellation enhancements for the team. Cap 7 at stages 1/6/10/11/12/13.
>
> **★ GATE STATUS: GREEN — pending stage-2 (compiled bytecode). ★** All 8 capabilities certified at source+model
> level. The DIRECT spending channel is comprehensively governed (activeWallet-only, limit-bounded, inheritance-frozen,
> recovery-severed, non-seizable); the SUBSCRIPTION channel is a deliberately distinct, self-bounded surface, now
> documented as such. Running the compiled hardhat harness (`ONCHAIN_VERIFICATION_MANIFEST.md`) flips every stage-2 `~`.

---

## Queued capability campaigns — Wave 97 set ✅ ALL THREE COMPLETE (Waves 98–100)

Surfaced by the Ownership ↔ Commerce gate as architectural assumptions inside KNOWN systems; each received the full
find→fix→retest→re-audit + scenario-matrix discipline. **All three are now certified at source+model
(stages 1/6/10/11/12/13).** Tracked in `VFIDE_MASTER_COMPLETION_TRACKER.md` (Waves 98–100).
- **Subscription Commerce System Audit** — ✅ **COMPLETE** (`SUBSCRIPTION_COMMERCE_AUDIT.md`, 15 scenarios). Subscriber-sovereign authority (merchant CANNOT raise the amount; resume doesn't retro-bill); full pull state machine (timing/fraud/pinning/allowance+balance/grace/auto-cancel/N-H12 anti-spam); CEI + nonReentrant + try/catch seer; batch bounded + isolated. **No critical/high findings.** Properties documented: aggregate allowance, two-channel bypass, subscriber-controlled terms. Stages 1/6/10/11/12/13.
- **Key Separation Audit** — ✅ **COMPLETE** (`KEY_SEPARATION_AUDIT.md`, 16 scenarios). Default is UNSEPARATED; separation is OPTIONAL and is the OC-4 mitigation. **MEDIUM finding:** the posture is invisible in the product — three-key model unexplained, separation not guided in onboarding, the weekly `RecoverySplitReminder` event + `splitAdminFromActive` re-separation flow are contract-only (no UI consumer). Recommendation: security-center Key-Posture card + onboarding step + surface the reminder. Stages 1/6/10/11/12/13.
- **Ownership Identity Architecture Audit** — ✅ **COMPLETE** (`OWNERSHIP_IDENTITY_ARCHITECTURE_AUDIT.md`, 14 scenarios). Three domains certified; no-escalation proven for every domain pair; admin two-step transfer; identity↔spending divergence safe. **Also CORRECTED OC-3:** recovery DOES sever subscriptions (vaultOf clear → pull reverts "no user vault"); downgraded MEDIUM→LOW. Stages 1/6/10/11/12/13.

> **Continuity reconciliation (Wave 97):** the continuity *capability audits* (Proof-of-Life, Guardian Management,
> Heir Configuration, Inheritance Claim + Distribution) are COMPLETE — `CONTINUITY_AUDIT_1..4`. Continuity Lock and
> Chain of Return are **REQUIRED FUTURE BUILD** (no code today), not pending audits.

---

## Deliberate non-capabilities — PERMANENT LAUNCH GATE (DP = REMOVED)

**This is a launch-gate section, not a backlog.** The capabilities below are intentionally `-`/REMOVED because
building them would violate VFIDE's founding invariant: **protection must never require surrendering ownership.**
Their **absence is a verified security property**, confirmed by the `NonCustodialNoFreeze` suite and source greps.

**Launch gate:** if any future change *adds* one of these, certification is BLOCKED and the change must be
rejected or escalated — a contributor "fixing" a perceived gap here would silently convert VFIDE from
non-custodial to custodial. These are not features waiting to be built; they are features verified to be *absent*.

- **Emergency Lock / fund freeze** — removed; no contract can freeze a user's vault.
- **Blacklist / address-block on funds** — removed; a flagged address still controls its vault.
- **Fraud Escrow / hold** — `escrowTransfer` is a no-op stub; confirmed fraud never holds funds.
- **Escrow Adjustment / Escrow Recommendation** — no fund-escrow primitive exists to adjust or recommend.
- **Force-recovery / admin seize** — removed; recovery is trustee/guardian-gated, never admin-unilateral.

To enforce this gate mechanically over time, the no-freeze/no-seize properties should remain covered by the
`NonCustodialNoFreeze` hardhat suite (and its compiled run), so a regression that reintroduces any of them fails
CI rather than shipping.

The standard's stage 13 (Grandmother) is *strengthened* by these absences: there is no "we can freeze your funds
to protect you" surface that could be abused or misunderstood.

---

## Measurable readiness — uncertainty as a number

Enumerated this pass (functional-capability census of the audited core + listed surfaces; **not yet** the full
~143-page / ~161-route micro-enumeration):

| State | Count (approx.) | Meaning |
|---|---|---|
| **Audited (core)** | ~78 | source-correct + on-chain perms + edge/adversarial matrices; **stage 2 bytecode pending** |
| **Exists-unaudited** (`~` at stage 1) | ~26 | code present, *nothing* verified against the standard yet |
| **Not built / planned** (all `.`) | ~8 | named capability, no implementing code found |
| **Deliberately absent** (`-`, non-custodial) | ~6 | verified non-features; absence is the security property |
| **Fully certified (stage E = `Y`)** | **0** | none — stage 2 (compiled bytecode) blocks final certification across the board |

**By deployment path (the second axis — what's actually expected to ship):**

| Deployment Path | Count (approx.) | Meaning for certification |
|---|---|---|
| **ACTIVE** | ~100 | on the deployed path — *these* are the certification targets |
| **LEGACY** | ~6 | `UserVaultLegacy` successor/next-of-kin/chain-of-return — **not launch targets**, do not build on |
| **PLANNED** | ~11 | named/conceptual, no code (Continuity Lock, SDK auth, Seer detections, external score-sources) |
| **REMOVED** | ~6 | deliberate non-custodial absences — launch-gate-protected |
| **UNKNOWN** | ~2 | exists, active-path status unverified (e.g. Recovery notifications) |

The deployment-path axis is what the Recovery/Continuity verification just sharpened: certification effort should
target ACTIVE capabilities only. Spending audit budget on LEGACY `setNextOfKin` would certify code that isn't
shipping — the column now makes that mistake impossible to make by accident.

Two numbers tell the whole story:
- **0 capabilities are fully certified** today — honestly, because stage 2 is open everywhere. That is not failure;
  it is the registry refusing to let a green imply more than is true.
- **~78 capabilities flip their stage-2 `~`→`Y` with ONE action** — the compiled hardhat run in a `solc`-0.8.30
  environment, walked by `ONCHAIN_VERIFICATION_MANIFEST.md`. That single run is by far the largest available
  advance, and it is the *only* lever that moves dozens of capabilities at once.

The rest of the path is per-capability, full-stack work: take each `~`/`.` capability through stages 3–9 and 12–13
with evidence. The registry now makes that finite and countable instead of vague.

## Coverage boundary (honest)

Enumerated: the audited protocol core + the capability families Vanta listed + grep-grounded existence for
Social, Developer Platform, and Seer advisories. **Not yet enumerated** as individual rows:
- Every one of the ~143 pages / ~161 API routes as its own capability.
- The full Merchant-OS sub-system surface beyond the Commerce sub-rows shown.
- Per-institution capability sets (the seven named institutions).

These are the next population sweep. The framework absorbs them unchanged: one honest status line each.

## How to maintain

1. When a capability advances a stage, flip its token (`.`→`~`→`Y`) **and attach evidence**. A flipped token
   without evidence is the exact false completion the standard forbids.
2. A system may go 🟢 in the systems tracker **only when every capability row beneath it is `Y` through stage E
   AND its stage-C integration is `Y`** (no-inheritance rule).
3. The **universal lever**: every stage-2 `~` flips to `Y` with the one compiled hardhat run. Do that first.
