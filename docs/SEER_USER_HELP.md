# Seer User Help Guide

## What Seer Is

Seer is VFIDE's trust and safety system. It helps decide whether an action should proceed, be warned, delayed, or blocked based on on-chain behavior and policy.

Seer does not permanently label users. It is designed for explainability, safety, and recovery.

## What Users Can See

1. ProofScore status
- Your score and trust level (low, medium, high trust contexts).

2. Eligibility outcomes
- Whether you meet thresholds for governance and merchant/payment actions.

3. Reason-coded events
- Machine-readable reason codes (with human-readable reasons) for major trust decisions.

## Why Actions May Be Delayed or Blocked

Common causes include:
- Critical or very low trust score states.
- Detected suspicious patterns (for example repeated abuse-like activity).
- Governance or commerce actions attempted while restricted.
- Risk escalation from security or pattern monitors.

## What To Do If Seer Blocks You

1. Capture evidence
- Wallet address used.
- Transaction hash (or attempted action context).
- Timestamp and network.
- Any reason code and error text shown.

2. Submit dispute or appeal information
- Include your evidence and concise explanation.
- Use the exact reason code when available to speed triage.

3. Follow recovery path
- Continue compliant activity.
- Avoid repeat violations during review windows.
- Re-check eligibility after restriction windows or resolution.

## Fast Reason Code References

SeerAutonomous examples:
- `100`: critical_score
- `101`: very_low_score
- `120`: repeated_pattern_violation
- `121`: pattern_violation
- `130`: oracle_high_risk

SeerGuardian examples:
- `300`: auto_low_score
- `301`: auto_very_low_score
- `324`: governance abuse violation
- `450`: manual proposal concern flag

Seer core score-change examples:
- `500`: DAO manual score set
- `501`: operator reward
- `502`: operator punish
- `503`: dispute-approved adjustment

For the full canonical list, see `docs/SEER_REASON_CODE_REGISTRY.md`.

## User Rights and Expectations

Users should be able to:
- Understand why a trust decision occurred.
- Challenge adverse outcomes with evidence.
- Follow a defined recovery path.

Policy and transparency baseline:
- `docs/SEER_CONSTITUTION.md`
- `docs/SEER_CONTROL_MATRIX.md`

## Activation and Operations (Team/Internal)

For governance operators enabling Seer automation across modules:
- `docs/SEER_AUTONOMOUS_ACTIVATION_RUNBOOK.md`
