# Seer Reason Code Registry and Migration Plan

Status: Draft v1
Last updated: 2026-03-13

## Purpose

This document introduces machine-readable reason codes for Seer watcher actions while preserving existing string-based events for backward compatibility.

## Event Migration Strategy

1. Keep legacy events unchanged (string reasons remain emitted).
2. Emit new reason-code events in parallel.
3. Indexers and analytics can migrate to reason-code events incrementally.
4. Once all consumers migrate, legacy string-only parsing can be deprecated at the application layer.
5. Internal enforcement paths now pass explicit reason codes in SeerAutonomous/SeerGuardian; string-to-code inference is retained only where reason text is dynamic.

## New Code Events

- `SeerAutonomous`
  - `RestrictionAppliedCode(address subject, RestrictionLevel level, uint16 reasonCode, string reason)`
  - `ChallengeResolvedCode(address subject, bool upheld, uint16 reasonCode, string reason)`
- `SeerGuardian`
  - `AutoRestrictionAppliedCode(address subject, RestrictionType rtype, uint16 reasonCode, string reason)`
  - `PenaltyAppliedCode(address subject, uint16 scorePenalty, uint16 reasonCode, string reason)`
  - `DAOActionFlaggedCode(uint256 proposalId, uint16 reasonCode, string concern)`
- `Seer (VFIDETrust)`
  - `ScoreReasonCode(address subject, uint16 reasonCode, int16 delta, address actor)`

## Canonical Reason Codes (v1)

### SeerAutonomous (100-series)

- `100`: `critical_score`
- `101`: `very_low_score`
- `102`: `low_score`
- `103`: `below_rate_threshold`
- `120`: `repeated_pattern_violation`
- `121`: `pattern_violation`
- `122`: `suspicious_pattern`
- `123`: `pattern_detected`
- `130`: `oracle_high_risk`
- `131`: `oracle_medium_risk`
- `140`: `progressive_unfreeze`
- `0`: unknown/unmapped reason

### SeerGuardian (300-series / 400-series)

- `300`: `auto_low_score`
- `301`: `auto_very_low_score`
- `302`: `auto_critical_score`
- `303`: `auto_score_recovered`
- `320`: violation `SuspiciousTransfer`
- `321`: violation `RapidScoreDrop`
- `322`: violation `SpamActivity`
- `323`: violation `FailedRecovery`
- `324`: violation `GovernanceAbuse`
- `400`: `Auto: proposer near threshold`
- `401`: `Auto: proposer has violations`
- `450`: manual `seerFlagProposal(...)` concern code
- `0`: unknown/unmapped reason (reserved fallback)

### Seer Core Score Changes (500-series)

- `500`: manual DAO score set (`setScore`)
- `501`: operator reward path (`reward`)
- `502`: operator punish path (`punish`)
- `503`: dispute-approved score adjustment (`resolveScoreDispute`)

## Consumer Migration Checklist

1. Subscribe to both legacy and code events during transition.
2. Prefer `reasonCode` for analytics and alerting.
3. Use `reason` text only for human display and backward compatibility.
4. Track unknown code `0` as schema drift and open policy update if it grows.

## Next Upgrades

1. Move from string-to-code lookup to explicit enum parameters in internal contract calls.
2. Add contract tests asserting code emissions for representative paths.
3. Version this registry via `setPolicyVersion(...)` to keep policy and code registry synchronized.
