# Local Validation Runbook

## Purpose
Use this runbook before any release, deployment dry-run, or production sign-off.

## Baseline Environment Checks
1. Install dependencies: `npm install`
2. Validate required environment: `npm run validate:env`
3. Confirm Node/npm engine compatibility from `package.json`

## Local Validation Command Matrix
Run the following in order:

```bash
npm run typecheck
npm run lint
npm run test:security:all
npm run test:ci
npm run build
```

## Release Readiness Notes
- Treat any failing security or CI test as a stop-ship signal.
- Re-run `npm run test:security:all` after security-sensitive changes.
- Re-run `npm run test:ci` after route, API, or contract ABI changes.
- Document any temporary exceptions in the release sign-off artifact.
