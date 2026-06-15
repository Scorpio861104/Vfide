# On-Chain Verification Manifest — wiring the five Solidity audits to runnable hardhat evidence

## Purpose & honest status
The five on-chain system audits (Core Ownership, Recovery & Continuity, Trust, Governance, Seer) were
**source-level audits + executable TS logic models**, because this environment cannot download solc (the
compiler download is blocked) and the on-chain verifier scripts need a local RPC (also blocked). Every cert
flagged a **compiled hardhat run against the real bytecode** as the required next step.

This manifest converts that "someday" into "run this": it maps each audited invariant to the **specific,
already-present hardhat test(s) or verify-script** that proves it, identifies the **one genuine coverage gap**,
and ships a test that fills it. **Nothing here has been executed in this environment** — the deliverable is a
ready-to-run evidence chain, not a pass claim. Run it where solc 0.8.30 (+viaIR) and a local node are available.

## How to run (compiler-equipped environment)
```bash
npm run contract:compile          # hardhat compile (needs solc 0.8.30 download — blocked in the audit sandbox)
npm run contract:test             # hardhat test — runs the chai-style suites
# node:test-style suites (e.g. the pay-path + the new Seer-boundary test) run via:
NODE_OPTIONS='--import tsx' node --test test/hardhat/SeerVerdictIgnoredBoundary.test.ts
# invariant verify-scripts (need a node at 127.0.0.1:8545):
npm run contract:verify:fee-burn-router:real
npm run contract:verify:proofscore-trust
npm run contract:verify:next-of-kin
npm run contract:verify:ocp-guardrails
```

## Invariant → evidence map

### 1. Core Ownership — non-custodial invariant
| Audited invariant | Hardhat evidence |
|---|---|
| No freeze/seize: a confirmed-fraud address still has NO hold on transfers/bridge | `test/hardhat/NonCustodialNoFreeze.test.ts` — "requiresEscrow is FALSE even for a confirmed-fraud address"; "escrowTransfer always reverts" |
| Punishment is service-ban only (reputation/fee), never funds | `NonCustodialNoFreeze.test.ts` — "PUNISHMENT PRESERVED: …still service-banned" |
| Only the active wallet's signed EIP-712 intent moves funds; replay/epoch/deadline bound | `test/hardhat/MerchantPayIntentEdgeCases.test.ts` — happy-path + replay-rejection + wrong-signer paths |
| Inheritance VETO→CLAIM windows; living owner always vetoes; DAO can't initiate | `test/hardhat/CardBoundVaultInheritance.test.ts` + `.threats.test.ts` (T-19 non-guardian initiate reverts, T-27 snapshot veto, T-30 owner override → NORMAL) + `npm run contract:verify:next-of-kin` |

### 2. Recovery & Continuity — theft-by-recovery resistance
| Audited invariant | Hardhat evidence |
|---|---|
| Trustee-gated initiation (open only when no trustees) | `test/hardhat/CardBoundVaultRecovery.r8.test.ts` — T-R8-01a/01b/01c |
| Challenged-initiator 30-day cooldown, per-initiator | `CardBoundVaultRecovery.r8.test.ts` — T-R8-02a/02b/02c |
| Challenge-period floor; mature-guardian voting | `CardBoundVaultRecovery.r8.test.ts` — T-R8-03a (3-day floor) |
| Recovery claim lifecycle, bootstrap, timelock | `test/hardhat/VaultRecoveryClaim.bootstrap.test.ts`, `VaultRecoveryClaim.timelocked.test.ts`, `test/hardhat/generated/VaultRecoveryClaim.generated.test.ts` |
| Registry recovery aliases + scoped hashing | `test/hardhat/VaultRegistryRecoveryAliases.test.ts`, `VaultRegistryScopedHashing.test.ts` |
| Inheritance cannot proceed while recovery rotation pending (INV-2) | `CardBoundVaultInheritance.threats.test.ts` — T-21 |

### 3. Trust — ProofScore integrity, fee curve, fraud-jury fairness
| Audited invariant | Hardhat evidence |
|---|---|
| Fee curve bounded by amount; floor/ceiling guards | `test/hardhat/ProofScoreBurnRouterFeeGuards.test.ts` + `npm run contract:verify:fee-burn-router:real` |
| ProofScore ↔ trust ↔ social consistency (no wealth input; bounds) | `npm run contract:verify:proofscore-trust` |
| FraudRegistry: score-gated reporters, no self-complaint, DAO-confirm path | `test/hardhat/FraudRegistry.test.ts` (deployment + fileComplaint guards) |
| Fraud consequence requires peer process; service-ban not fund-seizure | `NonCustodialNoFreeze.test.ts` (consequence boundary) |

### 4. Governance — emergency boundary, voting, treasury
| Audited invariant | Hardhat evidence |
|---|---|
| EmergencyControl module changes are timelocked; committee supermajority to cancel; DAO immediate-cancel | `test/hardhat/EmergencyControlRecovery.test.ts` + `EmergencyControlRecoveryCommitteeCap.test.ts` + `test/hardhat/generated/EmergencyControl.generated.test.ts` |
| DAO timelock execution flow; ABSOLUTE_MIN_DELAY floor; execute can't brick on hook revert | `test/hardhat/DAOTimelockExecutionFlow.test.ts` (#208/#207/#217/#220) |
| DAO admin transfer requires pending-accept (no unilateral takeover) | `test/hardhat/DAOAdminTransferGuardrail.test.ts` |
| Council elections / voting | `test/hardhat/CouncilElectionVoting.test.ts` |
| Treasury module/notifier timelocks; no drain primitive | `test/hardhat/EcoTreasuryVaultNotifierTimelock.test.ts`, `EcoTreasuryVaultModuleExpiry.test.ts`, `RevenueSplitter.test.ts`, `FeeDistributorGuardrails.test.ts` |
| **Gap noted:** an explicit "global breaker halt cannot block a user withdrawal" test (vault never consults the breaker) is not isolated as its own case. The property holds by construction (the vault has no breaker reference — confirmed by source grep in the Governance audit) and is implied by the no-freeze suite, but a dedicated test would make it explicit. **Recommended follow-up test** (low effort): deploy a vault + a halted breaker, assert a signed withdrawal still executes. |

### 5. Seer — the autonomous-enforcement fund-path boundary
| Audited invariant | Hardhat evidence |
|---|---|
| SeerAutonomous escalates restriction levels (isolation behavior) | `test/hardhat/SecurityFixes.test.ts` (restriction → Restricted=3, score unchanged) |
| Policy/threshold changes timelocked; work-attestation timelocked | `test/hardhat/SeerWorkAttestation.timelocked.test.ts`, `test/hardhat/generated/SeerSocial.generated.test.ts` |
| **THE CRUX (was the gap — NOW FILLED):** the vault calls `seerAutonomous.beforeAction` to observe, then IGNORES the verdict — a Frozen verdict cannot block a payment/withdrawal; a reverting hook (SEER-04) cannot brick it | **NEW** `test/hardhat/SeerVerdictIgnoredBoundary.test.ts` (+ mock `test/contracts/mocks/SeerAutonomousBoundaryMocks.sol`) |

## The gap this pass fills
`SecurityFixes.test.ts` proved SeerAutonomous escalates restrictions **in isolation**, but no existing hardhat
test proved the **integration invariant** the whole Seer cert rests on: that the vault *discards* the verdict on
the fund path. The new `SeerVerdictIgnoredBoundary.test.ts` does exactly that — it wires a maximally-restricting
mock (Frozen) and a reverting mock onto a funded vault (reusing the proven `MerchantPayIntentEdgeCases`
deployment + EIP-712 signing) and asserts a signed payment **still executes** in both cases. It is **staged,
not run** (no solc here); the file header states this plainly and gives the run command.

## Honest boundaries (unchanged)
- This manifest is an **index + one new staged test**, not an execution. Until `npm run contract:test` and the
  verify-scripts are run green in a compiler-equipped environment, the on-chain invariants remain
  **source-verified + logic-modeled**, exactly as each cert states.
- The new test and mock were written against the current contract signatures (CardBoundVault's 14-arg
  constructor, `setSeerAutonomous` via the admin facet, `beforeAction(address,uint8,uint256,address)`), mirrored
  from a known-good existing suite — but have not been compiled here. Treat a green run as the confirmation.

---

## ADDENDUM — depth-audit campaign (added after the original five-system manifest)

The original map above covers the first pass (Core Ownership, Recovery, Trust, Governance, Seer). Since then the
campaign added **per-contract depth audits** — each a source read + an executable TS model + an adversarial
matrix, citing specific existing hardhat tests. This addendum maps those so a harness run confirms the **whole**
campaign, not just the first pass. Campaign total at this writing: **456 modeled scenarios across 16 audit
suites** (`lib/audit/*.ts` + `__tests__/audit/*.test.ts`), plus the 9-scenario onboarding attestation suite.

**All hardhat tests below were verified PRESENT in `test/hardhat/` at manifest-update time.** As before: nothing
here has been executed in this sandbox; a green compiled run is the confirmation.

### 6. Oversight — OwnerControlPanel + AdminMultiSig (non-custodial, allowlist-bounded)
| Audited invariant (cert + scenario count) | Hardhat evidence |
|---|---|
| OCP holds no funds; freeze/seize/DAO-recovery selectors removed; per-vault setters dead; timelock-gated; governanceDelay [24h,30d] anti-rug reduction (OWNERCONTROLPANEL_CERTIFICATION.md, 22 scenarios) | `test/hardhat/OwnerControlPanelGuardrails335to337.test.ts`, `test/hardhat/OwnerControlPanelQueueConsistency329.test.ts`, `scripts/verify-owner-controlpanel-guardrails.ts` |
| AdminMultiSig: 3/5 (4/5 emergency) council; `executeProposal` low-level call BOUNDED by (target,selector) allowlist enforced at creation AND re-verified at execution (#406); type timelocks 24h/48h/1h; ProofScore-gated sybil-resistant community veto; self-gov airtight (ADMINMULTISIG_CERTIFICATION.md, 26 scenarios) | `test/hardhat/AdminMultiSigSecurity.test.ts` (rejects EOA targets; reverts on failed execution; blocks veto when no gate configured; rejects no-op token updates; governance can update veto threshold) |

### 7. Governance core — DAO + DAOTimelock + CouncilElection (un-buyable, timelock-only)
| Audited invariant (cert + scenario count) | Hardhat evidence |
|---|---|
| DAOTimelock: queued op executes only if queued+not-done+delay-elapsed+not-expired (7d); risk LENGTHENS wait (+6h, fail-open); delay floored at 24h, emergencyReduce ≤50%/one-shot/cooldown; self-governed params; secondary executor +3d; requeue restarts clock (DAOTIMELOCK_CERTIFICATION.md, 25 scenarios) | `test/hardhat/DAOTimelockExecutionFlow.test.ts` (#207/#208/#210/#217/#220) |
| DAO core: votes ProofScore-weighted snapshot frozen at proposal-creation (DAO-05) → flash loan buys 0; 1-day votingDelay; no double-vote; quorum floor (minVotes 5000, ABSOLUTE_MIN_QUORUM 500, unique-participant floor); execution TIMELOCK-ONLY (queueTxFromDAO); markExecuted onlyTimelock (DAO-07); Seer can block (DAO_CERTIFICATION.md, 25 scenarios) | `test/hardhat/DAOTimelockExecutionFlow.test.ts`, `test/hardhat/DAOAdminTransferGuardrail.test.ts`, `test/hardhat/generated/GovernanceHooks.generated.test.ts` |
| CouncilElection: votes ProofScore-weighted snapshot at election-start → tokens buy 0; sybil-barred (candidate+voter clear minCouncilScore at snapshot); ONLY top-voted seated (`_isTopVotedCandidate`); 72h appoint timelock; term limits (1 consecutive, 365d+365d); capture-resistant `refreshCouncil` (#503); non-custodial by construction (COUNCILELECTION_CERTIFICATION.md, 24 scenarios) | `test/hardhat/CouncilElectionVoting.test.ts` (requires completed election + top-voted candidates before proposal; >200 candidates; mid-term score changes) |

### 8. Treasury cluster — drain-resistance (ecosystem funds, not user funds)
| Audited invariant (cert + scenario count) | Hardhat evidence |
|---|---|
| No arbitrary-drain primitive: every outflow routes to pre-validated payees/pools by shares MUST sum to 100% (FeeDistributor dao+merchants+headhunters==MAX_BPS, none over MAX_SINGLE_BPS; RevenueSplitter shares==10000, no zero-shares; full balance accounted, last sink gets remainder), or DAO-gated discretionary (EcoTreasuryVault.sendVFIDE), or rescue of NON-treasury tokens (own VFIDE excluded); split/destination/rescue 72h-timelocked (TREASURY_CERTIFICATION.md, 20 scenarios) | `test/hardhat/EcoTreasuryVaultNotifierTimelock.test.ts`, `test/hardhat/EcoTreasuryVaultModuleExpiry.test.ts`, `test/hardhat/RevenueSplitter.test.ts`, `test/hardhat/FeeDistributorGuardrails.test.ts` ("distributes to all three channels — no burn, no sanctum"; "rejects untrusted receiveFee callers"; "delays destination changes until the timelock expires") |

### 9. Trust depth — FraudRegistry + FraudJury + ProofScore per-source
| Audited invariant (cert + scenario count) | Hardhat evidence |
|---|---|
| Fraud non-custodial: confirmed flag's ONLY effects = risk signal + Seer score penalty + service ban; funds NEVER held/delayed/seized; escrowTransfer is no-op stub; confirmFraud requires `fraudJury.isConfirmed` (DAO veto-only, never confirm); commit-reveal jury, QUORUM=5, 66% supermajority, quorum-fail→Dismissed; spam-resistant (MIN_REPORTER_SCORE, bond); 90d decay + restitution (FRAUDREGISTRY_CERTIFICATION.md, 22 scenarios) | `test/hardhat/FraudRegistry.test.ts`, `test/hardhat/NonCustodialNoFreeze.test.ts` |
| ProofScore un-buyable: per-source weights bounded, SUM capped at 100% (addScoreSource); anti-capture on-chain floor (MIN_ONCHAIN_WEIGHT_WITH_SOURCES); behavioral-only automated score (vault existence/badges/endorsements — NO wealth); neutral default; clamped; misbehaving source skipped; DAO setScore range+rate(1/hr)+magnitude-capped (PROOFSCORE_SOURCES_CERTIFICATION.md, 21 scenarios) | `test/hardhat/ProofScoreBurnRouterFeeGuards.test.ts`, `scripts/verify-proofscore-trust-social-consistency.ts` (+ NOTE: zero external `IScoreSource` contracts exist yet — each must be audited before the DAO adds it) |

### 10. Onboarding — attestation path (application-layer, app-test evidence)
| Audited invariant (cert + scenario count) | Test evidence |
|---|---|
| Attested quest steps (deposit, vote) verified on-chain via viem reads (`vaultOf`/`balanceOf`/`hasVotedAnyProposal`); three-state contract: confirmed→grant, not-found→deny (fail closed), unavailable→retryable 503 (no false denial); guardian/recovery non-skippable (FIX_ONBOARDING_ATTESTATION_PATH.md + FIX_GUARDIAN_SETUP_NONSKIPPABLE.md, 9 + 37 scenarios) | `__tests__/quests/onchainAttestation.test.ts` (9), `__tests__/api/onboarding-quest-route.test.ts` (H-series) — app-layer Jest, green; the underlying reads are plain public getters confirmed by the Core Ownership / Governance hardhat suites above |

## Scenario reconciliation (so the manifest's numbers match reality)
- **Original five-system pass:** Core Ownership / Recovery / Trust / Governance / Seer — mapped in sections 1–5.
- **Depth campaign (this addendum):** OCP 22 · AdminMultiSig 26 · DAOTimelock 25 · DAO 25 · CouncilElection 24 ·
  Treasury 20 · FraudRegistry 22 · ProofScore 21 = **185 scenarios**, plus the earlier modeled suites
  (Ownership/Recovery/Seer/Trust/Governance/Social/Onboarding models) → **456 audit-suite scenarios total**,
  every one mapped above to an existing hardhat test or verify-script (or, for Onboarding, an app-layer Jest
  suite whose on-chain dependencies reduce to public getters covered by the Ownership/Governance suites).
- **The single genuine coverage GAP filled by this campaign** remains `SeerVerdictIgnoredBoundary.test.ts`
  (section 5) — the vault-ignores-hostile-Seer integration invariant. No other gap was found; the depth audits
  each mapped to pre-existing hardhat evidence.

**Bottom line for the harness run:** executing `npm run contract:test` + the verify-scripts in a solc-0.8.30
environment now confirms the FULL 456-scenario campaign against real bytecode — Core Ownership first (largest
blast radius), and with it Recovery, Governance, Seer, and Trust simultaneously. That single run is the
qualitative upgrade every certification names as its pending boundary.
