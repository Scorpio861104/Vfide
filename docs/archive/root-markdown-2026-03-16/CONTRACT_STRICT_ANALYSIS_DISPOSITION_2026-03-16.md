# Contract Strict Analysis Disposition (2026-03-16)

## Scope
- Command: `npm run -s contract:analyze:strict`
- Result: FAIL (exit code 255)
- Analyzer summary: 1198 contracts analyzed, 1050 findings

## Progress Delta (Current Session)
- Reduced total findings by 210 (1260 -> 1050).
- `locked-ether` detector count reduced to 0 by adding `rescueNative` in CardBoundVault.
- `reentrancy-benign` reduced from 20 to 0 by reordering policy guard consumption, checks-effects-interactions updates, and targeted rationale suppressions for intentional integration flows.
- `missing-zero-check` reduced from 11 to 0 by adding zero checks plus rationale-based suppressions for intentional nullable modules.
- `uninitialized-local` reduced from 3 to 0 by initializing local `result` values in Seer enforcement helpers.
- `reentrancy-no-eth` reduced from 6 to 0 by applying effects-before-interactions ordering in affected functions.
- `reentrancy-events` reduced from 5 to 0 by moving external-policy hook calls to function tails.
- Latest continuation pass reduced total findings by 17 (1178 -> 1161) with targeted `calls-loop` suppressions for intentional, read-heavy loop call sites in SeerView, VaultRegistry, CouncilManager, CouncilSalary, and SubscriptionManager.
- Second continuation pass reduced total findings by 111 (1161 -> 1050) with targeted `calls-loop` suppressions in VFIDETrust, BadgeManager, DeployPhase1, VFIDEFinance, OwnerControlPanel, and VaultInfrastructure.

## Detector Frequency Baseline (1178 Snapshot)
- timestamp: 47
- low-level-calls: 42
- dead-code: 40
- shadowing-local: 38
- unindexed-event-address: 26
- reentrancy-benign: 20
- immutable-states: 20
- constable-states: 16
- calls-loop: 14
- missing-zero-check: 11
- cyclomatic-complexity: 11
- events-maths: 10
- cache-array-length: 9
- missing-inheritance: 8
- costly-loop: 8
- unused-state: 7
- assembly: 7
- reentrancy-no-eth: 6
- reentrancy-events: 5
- unused-return: 4
- uninitialized-local: 3
- events-access: 3
- locked-ether: 2
- too-many-digits: 1
- redundant-statements: 1

## Current High-Priority Detector Snapshot
- timestamp: 47
- low-level-calls: 42
- dead-code: 40
- shadowing-local: 38
- unindexed-event-address: 26
- reentrancy-benign: 0
- reentrancy-no-eth: 0
- missing-zero-check: 0
- uninitialized-local: 0
- locked-ether: 0
- calls-loop: still present (materially reduced, not yet eliminated)

## Disposition Categories

### Category A: Release-Blocking Pending Engineering Decision
- reentrancy-no-eth
- reentrancy-benign
- reentrancy-events
- missing-zero-check
- uninitialized-local
- calls-loop on state-changing paths

Action:
- Assign owner per contract group.
- Either patch and test, or document why pattern is safe in this implementation.
- Add explicit test assertions for each accepted pattern.

### Category B: Design-Pattern Findings (Likely Acceptable With Rationale)
- timestamp (timelocks, expiry windows, cooldown logic)
- low-level-calls (SafeERC20 wrappers and controlled external call points)
- assembly (signature recovery)
- unindexed-event-address
- events-maths

Action:
- Add code-level comments and governance rationale where needed.
- If accepted, track with internal risk-acceptance entries tied to contract/function.

### Category C: Maintainability/Gas Hygiene (Non-blocking for Security)
- dead-code
- shadowing-local
- immutable-states
- constable-states
- cache-array-length
- cyclomatic-complexity
- costly-loop
- unused-state
- unused-return
- redundant-statements
- too-many-digits
- missing-inheritance

Action:
- Queue as hardening backlog.
- Tackle opportunistically while touching affected modules.

## Gate-Unblock Plan
1. Produce a finding-level allowlist file for Category B/C with rationale.
2. Patch Category A findings or explicitly convert to Category B with justification and tests.
3. Re-run strict analysis and verify reduced findings and no Category A unresolved.
4. Re-run full `security:gate` and record pass/fail delta.

## Internal Verification Notes
- This disposition is based on internal static-analysis evidence only.
- No external audit sign-off is assumed or required in this workflow.
