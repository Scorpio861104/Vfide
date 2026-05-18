# Seer Control Matrix (Executable Mapping)

Status: Draft v1
Last validated: 2026-03-13
Source policy: docs/SEER_CONSTITUTION.md

## Legend

- Enforced: Control is directly implemented on-chain.
- Partial: Some enforcement exists, but not fully aligned with constitution language.
- Gap: No direct on-chain enforcement found.

## A. Governance and Authority Controls

| Control ID | Constitutional Control | Contract / Function Evidence | Status | Notes / Next Action |
|---|---|---|---|---|
| GOV-01 | Seer policy changes must be DAO-governed | contracts/VFIDETrust.sol:348 setThresholds, contracts/VFIDETrust.sol:339 setDecayConfig, contracts/VFIDETrust.sol:410 setDecentralizationWeights | Enforced | Core Seer policy knobs are `onlyDAO`. |
| GOV-02 | Seer module wiring must be governed | contracts/VFIDETrust.sol:271 setModules, contracts/VFIDETrust.sol:283 setSeerSocial, contracts/VFIDETrust.sol:293 setSeerAutonomous | Enforced | Governance-controlled integration points. |
| GOV-03 | No owner bypass for runtime governance hooks | contracts/GovernanceHooks.sol:47 onlyDAO, contracts/GovernanceHooks.sol:60 setDAO | Enforced | Previously tightened to DAO-only caller. |
| GOV-04 | SeerGuardian/Autonomous policy changes must be DAO-controlled | contracts/SeerGuardian.sol:176 setModules, contracts/SeerGuardian.sol:190 setThresholds; contracts/SeerAutonomous.sol:838 daoSetRateLimit | Enforced | Guardian and autonomous controls gated by DAO. |
| GOV-05 | Timelock mandatory for material Seer policy updates | Seer modules are `onlyDAO`; timelock dependency is external to Seer contracts | Partial | Enforce by requiring DAO = timelock-controlled governance at deployment and documenting invariant. |
| GOV-06 | Class-based change windows (A/B/C) | contracts/SeerPolicyGuard.sol: delay constants + `schedulePolicyChange(...)`/`consume(...)`; contracts/VFIDETrust.sol guarded setters (`setThresholds`, `setDecayConfig`, `setOperatorLimits`, `setDecentralizationWeights`, `setPolicyVersion`) call policy guard | Enforced | Minimum delays (A: 7d, B: 72h, C: 24h) are enforced in policy guard and consumed by Seer setters. |
| GOV-07 | Emergency changes auto-expire unless ratified | contracts/SeerAutonomous.sol:784 daoOverride, contracts/SeerAutonomous.sol:801 daoRemoveOverride | Partial | Override exists, but no mandatory auto-expiry timer for emergency actions. |

## B. Trust Scoring and Explainability

| Control ID | Constitutional Control | Contract / Function Evidence | Status | Notes / Next Action |
|---|---|---|---|---|
| SCORE-01 | Action-specific trust outputs | contracts/SeerView.sol:162 getTrustLevel; contracts/DAO.sol:195 _eligible; contracts/MerchantPortal.sol:247 minForMerchant usage | Enforced | Governance and merchant eligibility are action-scoped. |
| SCORE-02 | Score updates must be auditable | contracts/VFIDETrust.sol:90 ScoreSet event, contracts/VFIDETrust.sol:745 _recordHistory, contracts/VFIDETrust.sol:1296 getScoreHistory | Enforced | On-chain history with reason hash + events. |
| SCORE-03 | Explainability for score changes | contracts/VFIDETrust.sol:1031 ScoreDisputeRequested, contracts/VFIDETrust.sol:1045 requestScoreReview(reason), contracts/VFIDETrust.sol:1078 resolveScoreDispute | Partial | Human reason stored; reason code taxonomy not standardized yet. |
| SCORE-04 | No hidden score channels | contracts/VFIDETrust.sol:374 addScoreSource, contracts/VFIDETrust.sol:410 setDecentralizationWeights | Partial | Sources are explicit, but no canonical published source registry/version hash requirement on-chain. |
| SCORE-05 | Bound score mutation risk | contracts/VFIDETrust.sol:699 reward (maxSingle + daily operator limits), contracts/VFIDETrust.sol:718 setOperatorLimits | Enforced | Operator abuse bounded by per-call/per-day limits. |

## C. Rehabilitation and Fairness

| Control ID | Constitutional Control | Contract / Function Evidence | Status | Notes / Next Action |
|---|---|---|---|---|
| FAIR-01 | Recovery path from penalties | contracts/SeerGuardian.sol:358 daoRehabilitateUser, contracts/SeerGuardian.sol:314 daoOverrideRestriction | Enforced | Explicit rehabilitation and override path exists. |
| FAIR-02 | Penalties should decay over time | contracts/VFIDETrust.sol:339 setDecayConfig, contracts/VFIDETrust.sol:1185 getDecayAdjustedScore, contracts/VFIDETrust.sol:1228 applyDecay | Enforced | Inactivity decay toward neutral implemented. |
| FAIR-03 | Appeals/disputes must exist | contracts/VFIDETrust.sol:1045 requestScoreReview, contracts/VFIDETrust.sol:1094 fileAppeal, contracts/VFIDETrust.sol:1115 resolveAppeal | Enforced | On-chain appeal and dispute channels implemented. |
| FAIR-04 | Appeal SLA (72h/14d) | No SLA timers/enforcement found | Gap | Add timestamp-based deadlines and status breach events. |
| FAIR-05 | Equal policy application | Deterministic threshold checks (Seer/DAO/Council modules) | Partial | Deterministic in code, but no formal invariant tests for cross-context equality yet. |

## D. Enforcement Invariants

| Control ID | Constitutional Control | Contract / Function Evidence | Status | Notes / Next Action |
|---|---|---|---|---|
| INV-01 | No silent deny/lock/punish | contracts/SeerGuardian.sol:74 AutoRestrictionApplied, contracts/SeerAutonomous.sol:84 AutoEnforced, contracts/VFIDETrust.sol:90 ScoreSet | Enforced | Core enforcement actions emit events. |
| INV-02 | No immutable exile | contracts/SeerGuardian.sol:126 maxRestrictionDuration, contracts/SeerGuardian.sol:227 auto-lift logic | Partial | Practical bounded restrictions exist; permanent-ban process not codified as constitutional rule. |
| INV-03 | No reward duplication | contracts/DAO.sol:310 conditional reward path when hooks absent | Enforced | DAO vote reward duplication path fixed. |
| INV-04 | Governance restrictions enforced in execution flow | contracts/DAO.sol:338 quorum includes participation, contracts/DAO.sol:209 non-zero target requirement | Enforced | Proposal lifecycle consistency tightened. |
| INV-05 | Restriction challenges for severe actions | contracts/SeerAutonomous.sol:98 ChallengeCreated, contracts/SeerAutonomous.sol:737 resolveChallenge | Enforced | Challenge path present for severe restrictions. |

## E. Domain-Specific Trust Controls

| Control ID | Constitutional Control | Contract / Function Evidence | Status | Notes / Next Action |
|---|---|---|---|---|
| DOMAIN-01 | Governance trust gating | contracts/DAO.sol:195 _eligible, contracts/DAO.sol:250 vote, contracts/DAO.sol:206 propose | Enforced | Eligibility + guardian restriction checks applied. |
| DOMAIN-02 | Merchant/payment trust gating | contracts/MerchantPortal.sol:247 seer.minForMerchant, contracts/app/api/crypto/payment-requests/route.ts high-risk controls | Partial | Contract-side merchant gating is strong; API controls are off-chain and need policy mapping. |
| DOMAIN-03 | Recovery trust controls | contracts/SeerGuardian.sol restrictions + violation tracking | Partial | Recovery-specific trust policy outputs not yet fully explicit in dedicated module. |
| DOMAIN-04 | Operational trust/abuse tracking | contracts/SeerGuardian.sol:250 recordViolation, contracts/SeerAutonomous.sol pattern tracking | Enforced | Violation and pattern systems implemented. |
| DOMAIN-05 | Social trust (endorse/mentor) bounded and abuse-resistant | contracts/SeerSocial.sol:164 setEndorsementPolicy, contracts/SeerSocial.sol:194 endorse caps/cooldowns, contracts/SeerSocial.sol:347 setMentorConfig | Enforced | Strong cap/cooldown/threshold model. |

## F. Transparency and Reporting

| Control ID | Constitutional Control | Contract / Function Evidence | Status | Notes / Next Action |
|---|---|---|---|---|
| TRANS-01 | Public parameter visibility | Public state vars across Seer modules (thresholds, weights, limits) | Enforced | On-chain transparency for current values. |
| TRANS-02 | Versioned policy hash publication | contracts/VFIDETrust.sol:106 PolicyVersionUpdated, contracts/VFIDETrust.sol:431 setPolicyVersion | Enforced | Policy hash + URI now published on-chain via DAO-governed setter. |
| TRANS-03 | Change rationale and rollback metadata | Reason strings/events partially available | Partial | Add structured metadata schema for governance proposals and post-change reports. |
| TRANS-04 | Monthly fairness/safety metrics | Not on-chain | Gap | Implement off-chain reporting job and publish signed monthly reports. |

## G. Validation and Security Testing Controls

| Control ID | Constitutional Control | Contract / Function Evidence | Status | Notes / Next Action |
|---|---|---|---|---|
| TEST-01 | Invariant tests for penalty bounds and decay | Decay and penalty code exists, but constitution-specific invariant suite not explicit | Partial | Add dedicated invariant tests for caps, monotonicity, expiry, and challenge flow. |
| TEST-02 | Adversarial simulations (Sybil/collusion/reputation farming) | No explicit simulation harness mapped in this matrix | Gap | Add simulation test pack and CI stage. |
| TEST-03 | Canary/rollback triggers for high-risk policy changes | No explicit canary mechanism found in Seer contracts | Gap | Define rollout guard process in governance runbook + automated monitoring thresholds. |

## Immediate Implementation Backlog (Priority)

1. Add policy class and delay enforcement process around Seer updates (Class A/B/C) with timelock evidence.
2. Add standardized reason code registry for score changes, denies, and restrictions.
3. Add SLA-aware appeal status fields and breach events.
4. Add governance process requirement that every Class A/B Seer change must call `setPolicyVersion(...)` in the same proposal bundle.
5. Add Seer-focused invariant/adversarial test suite and CI gate.

## Verification Scope Notes

- This matrix maps constitutional controls to currently discoverable contracts/functions in the repository.
- Some controls are process/policy controls and require off-chain governance runbooks in addition to on-chain code.
- Timelock enforcement for Seer modules depends on deployment topology (DAO ownership and execution path).
