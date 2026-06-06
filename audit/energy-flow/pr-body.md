## Summary

Focused follow-up for the user-reported gap: the prior audit did not explicitly trace the repo's "energy line and flow."

What I found:

- No literal implemented `energy` subsystem exists on `main` — exact `energy` references are only archived prose.
- I therefore audited the closest implemented line/flow surfaces, especially `FeeFlowRiver`, which is the visible economic flow line on the landing page.
- Confirmed defect: `FeeFlowRiver` described each fee as routed into five pools, but the animation modeled each fee as one weighted-random particle going to a single pool. That approximated percentages over time but did not represent the actual per-fee fan-out.

Fixes:

- Replaced weighted-random pool selection with `calculateFeeFlowSplit(totalFee)`.
- Each fee event now fans out into all five canonical pools.
- Preserves cents after rounding by assigning residual cents to the largest pool.
- Added regression coverage in `__tests__/fee-flow-river.test.ts`.
- Also carried the existing minimal lint fix on `scripts/card-bound-vault-initcode-chunks.ts` because clean lint on `main` required it.
- Captured focused audit evidence under `audit/energy-flow/`.

## Verification

```text
CI=true npx jest __tests__/fee-flow-river.test.ts --runInBand --silent=false
PASS __tests__/fee-flow-river.test.ts
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total

npm run typecheck
> tsc --noEmit

npm run lint
> eslint . --ext .ts,.tsx --cache --cache-location .eslintcache
```

Final diff review found no generated/cache artifacts.
