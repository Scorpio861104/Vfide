# Seer Constitution (VFIDE)

Status: Draft v1
Scope: Protocol-wide trust scoring, eligibility, and enforcement logic governed by Seer.

## 1. Mission

Seer exists to compute contextual trust for protocol actions, not to assign permanent social value to people.

Seer must improve safety, fairness, and recovery while preserving user dignity and due process.

## 2. Core Principles (Non-Negotiable)

1. Action-specific trust
- Trust must be evaluated per action domain (governance, payments, lending, recovery, access), not by a single global judgment.

2. Explainability
- Every material score change and every access denial must produce a machine-readable reason code and human-readable explanation.

3. Rehabilitation over permanent punishment
- Penalties must decay where possible.
- Good behavior must be able to restore trust over time.

4. Minimal surveillance
- Seer should use only data required for safety and protocol integrity.
- Public outputs should be minimized to least necessary disclosure.

5. Constitutional governance
- Seer parameter changes must be timelocked, auditable, and reversible through explicit process.

6. Anti-capture
- No single actor can unilaterally rewrite trust policy without delay and transparent review.

## 3. Rights of VFIDE Members

1. Right to reason
- Members can inspect why Seer changed their trust state.

2. Right to challenge
- Members can submit appeal evidence for adverse trust decisions.

3. Right to bounded penalties
- Penalty ceilings and expiry paths must be documented and enforced.

4. Right to equal policy application
- Equivalent actions under equivalent context must result in equivalent treatment.

5. Right to recovery path
- Members must have a clearly defined route to regain trust eligibility.

## 4. Trust Domains and Required Outputs

For each Seer domain, the system must provide:

1. Governance trust
- Eligibility for proposal and voting
- Restriction status and reason
- Fatigue and participation impact where applicable

2. Payment trust
- Risk tier (normal, elevated, high)
- Required controls (step-up auth, delay acknowledgement, limits)

3. Credit/lending trust
- Borrow capacity band
- Dynamic risk flags and cooldowns

4. Recovery/guardian trust
- Guardian eligibility
- Recovery risk checks and mandatory delays

5. Operational trust
- Abuse signals, violation counts, and lock status

## 5. Parameter Governance Rules

1. Timelock mandatory
- All material Seer policy changes require timelock execution.

2. Change classes
- Class A (critical): scoring weights, ban thresholds, lock conditions, appeal windows.
- Class B (important): decay rates, cooldown lengths, reward multipliers.
- Class C (operational): logging verbosity, analytics thresholds.

3. Minimum notice periods
- Class A: 7 days minimum.
- Class B: 72 hours minimum.
- Class C: 24 hours minimum.

4. Emergency lane
- Emergency restrictions may be applied rapidly only for active exploitation.
- Emergency actions must auto-expire unless ratified through standard governance.

5. Reversibility
- Every Class A/B policy change must include rollback instructions and validation checks.

## 6. Enforcement Invariants

1. No silent enforcement
- Any deny/lock/punish action must emit an event with reason code.

2. No immutable exile
- Permanent bans require extraordinary governance process and periodic review.

3. No hidden score channels
- Inputs affecting trust outcomes must be documented and testable.

4. No reward duplication
- The same user action cannot receive duplicate rewards through parallel hooks.

5. No governance bypass
- Ownership or admin privileges cannot bypass DAO-defined Seer controls outside approved emergency paths.

## 7. Appeals and Due Process

1. Appeal intake
- Appeals must include reason code, supporting evidence, and incident timestamp.

2. SLA targets
- Initial review: within 72 hours.
- Final disposition: within 14 days, unless external dependency blocks resolution.

3. Resolution outcomes
- Uphold, partially uphold, overturn, or temporary relief pending review.

4. Audit trail
- Every appeal outcome must be logged for governance oversight.

## 8. Transparency Requirements

1. Public policy spec
- Current Seer policy parameters and version hash must be published.

2. Change log
- Every Seer rule change requires: rationale, expected impact, and rollback plan.

3. Metrics
- Publish aggregate fairness and safety metrics (false-positive rate, appeal overturn rate, recidivism, abuse prevention efficacy).

## 9. Validation and Red-Team Requirements

1. Pre-deployment checks
- Unit tests for all reason codes and domain thresholds.
- Invariant tests for penalty bounds, decay behavior, and lock expiry.

2. Adversarial testing
- Sybil simulation
- Collusion simulation
- Reputation farming simulation
- Governance-capture simulation

3. Production guardrails
- Canary rollout for Class A changes.
- Automatic rollback triggers on anomaly thresholds.

## 10. Versioning and Amendment Process

1. This constitution is versioned and on-chain-governed by reference.
2. Amendments require DAO proposal, timelock delay, and explicit migration notes.
3. Emergency amendment powers are temporary and expire automatically unless ratified.

---

## Immediate v1 Implementation Checklist

1. Standardize and publish Seer reason codes across all denial/lock/restriction paths.
2. Enforce class-based timelock policy for Seer parameter changes.
3. Implement appeal record schema and event emissions.
4. Add invariants for decay, penalty caps, and reward de-duplication.
5. Publish monthly Seer transparency report with core metrics.
