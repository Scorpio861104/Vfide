# Local Validation Runbook

This runbook defines the reproducible local validation flow for VFIDE.

## Prerequisites

- Node.js and npm installed
- Dependencies installed with `npm install`
- Environment configured (`.env` / `.env.local` as needed)

## Fast Validation (Recommended)

Run the blocking security gate:

```bash
npm run test:security:all
```

This command runs:

- `npm run test:security` (Jest-based security suites)
- `npm run test:onchain` (core Hardhat suites under `test/hardhat`, excluding generated stubs)

## Lane Split Policy

- Blocking lane: `npm run test:onchain`
- Non-blocking generated lane: `npm run test:onchain:generated`

Generated onchain smoke stubs are intentionally separated because some contracts require linked libraries, dependency-aware constructor arguments, or deployment settings that are not universal for literal smoke deployment.

## Extended Validation

Use these for broader confidence before release:

```bash
npm run typecheck
npm run lint
npm run test:ci
```

## Advanced Contract Validation

The current blocking lane covers deterministic unit/integration behavior. For high-risk contract changes, add an invariant/fuzz pass before deployment:

```bash
# Reserved for future invariant suite
# npx hardhat test test/invariants/**/*.ts
```

Priority invariant targets:

- vault accounting cannot underflow or over-distribute
- reward allocation basis points sum correctly
- timelock and ownership transitions cannot bypass required delays
- burn/distribution flows preserve total accounting constraints

## Generated Stub Refresh

When contract artifacts or constructors change, regenerate stubs:

```bash
npm run test:stubs:generate
npm run test:onchain:generated
```

## Expected Outcomes

- `npm run test:security:all` should pass for merge readiness.
- `npm run test:onchain:generated` should be monitored for artifact drift, but is non-blocking.

## Troubleshooting

- If only generated stubs fail, verify `test/hardhat/generated/generation-report.json` for skipped unsupported contracts and reasons.
- If core onchain fails, treat as a blocking regression and fix before release.
