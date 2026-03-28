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
