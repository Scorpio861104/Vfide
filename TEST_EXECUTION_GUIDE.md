# Test Execution Guide

Canonical testing references live under `docs/testing/`.

Primary entry points:

- `docs/testing/TESTING.md`
- `docs/testing/TESTING_STRATEGY.md`
- `docs/testing/E2E_TESTING.md`
- `docs/testing/A11Y_TESTING.md`

## Quick Commands

```bash
npm run test
npm run test:security
npm run test:onchain
npm run test:onchain:generated
npm run test:security:all
npm run test:e2e
npm run test:ci
```

## Security and Onchain Policy

- `npm run test:security:all` is the blocking gate for security readiness.
- `npm run test:onchain` is the blocking core onchain lane.
- `npm run test:onchain:generated` is a non-blocking generated-smoke lane.

## Flaky Test Policy

- Do not silently retry in blocking lanes (`test:security:all`, `test:onchain`, `test:integration`, `validate:production`).
- If a test is flaky, tag and quarantine it into a non-blocking lane with an owner and target fix date.
- Require a linked issue and root-cause note before quarantine.
- Remove quarantine only after three consecutive clean runs in CI and one local reproduction run.
- Track flaky counts and quarantine age as release-readiness inputs.
