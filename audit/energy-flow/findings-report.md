# Energy / Line-and-Flow Focused Audit

## Scope discovery

The user called out that the prior audit did not cover the repository's "energy line and flow." A literal `energy` implementation was not present on `main`: exact code/text search found only archived prose in `docs/archive/root-legacy/VFIDE_AUDIT_FUNDING_NOTES.md`, where "energy" is used as ordinary language, not as a product subsystem.

Because no `energy` route/module/service exists, the audit expanded to the closest implemented "line and flow" surface: fee-flow visualization, utility hooks, marketplace grid, onboarding flow, recovery claim flow, and adjacent flow-named UI. Evidence is captured in:

- `audit/energy-flow/curated-scope.txt`
- `audit/energy-flow/text-domain-references.raw`
- `audit/energy-flow/text-domain-files.txt`
- `audit/energy-flow/flow-adjacent-files-dump.txt`

## Confirmed finding: FeeFlowRiver modeled each fee as one weighted-random outflow

`app/components/FeeFlowRiver.tsx` states that every fee is accounted for and routes into five canonical pools. The original animation spawned one particle per fee and selected one pool by weighted lottery. That approximated the target percentages over many particles, but it did not represent the actual per-fee split: each fee should fan into burn, sanctum, payroll, merchant, and referral pools.

### Fix

- Replaced the weighted-random pool picker with `calculateFeeFlowSplit(totalFee)`.
- Each displayed fee event now creates one split particle per canonical pool.
- The helper conserves cents after rounding by assigning residual cents to the largest pool.
- Added `__tests__/fee-flow-river.test.ts` to verify canonical percentages and cent conservation.

## Reviewed but not changed

- No literal energy route/API/service/data model/contract was found.
- `hooks/useUtilityHooks.ts` is contract utility read/write hook coverage, not energy-utility marketplace logic.
- `app/marketplace/components/ProductGridCard.tsx`, onboarding flow, claim flow modal, and grid navigation did not expose an energy-specific data path to fix in this pass.

## Verification plan

Run focused Jest for the new split helper, then TypeScript and lint because the exported helper changes a client component module.
