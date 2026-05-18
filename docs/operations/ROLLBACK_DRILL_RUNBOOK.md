# Rollback Drill Runbook

This runbook defines standard rollback drill criteria for high-impact release paths.

## Rollback Triggers

Trigger rollback execution when one or more of the following occur during rollout:

- Core governance invariant checks fail.
- Seer watcher verification reports a regression.
- Security gate or onchain lane fails after deployment wiring changes.
- Runtime validation detects blocking user-impacting behavior.

## Rollback Command Matrix

Use this command sequence for rollback drills and real rollback readiness checks:

```bash
npm run -s contract:verify:governance-safety:local
npm run -s contract:verify:merchant-payment-escrow:local
npm run -s contract:verify:seer:watcher:local
npm run -s test:security:all
```

## Drill Execution

1. Pick at least three rollback scenarios (governance regression, seer regression, security regression).
2. Execute the command matrix for each scenario.
3. Record scenario duration and evidence artifact links in `audit/rollback-drill.latest.json`.
4. Confirm each scenario meets the target rollback-time objective.

## Post-Rollback Validation

After rollback simulation completes:

- Verify all rollback scenarios are marked `pass`.
- Verify each scenario includes evidence links (logs, test summaries, or CI job references).
- Re-run release stop/go checks before resuming rollout candidate progression.
