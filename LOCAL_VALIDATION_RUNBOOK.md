# Local Validation Runbook

## Purpose
This runbook defines the minimum local validation lane before opening or merging release-impacting changes.

## Required Validation Commands
Run the following commands from the repository root:

1. npm run test:security:all
2. npm run test:ci
3. npm run validate:production

## Recommended Additional Checks
- npm run lint
- npm run type-check
- npm run build

## Sign-off Notes
Record command results and any exceptions in the active issue or PR before requesting review.

When running `npm run validate:production` in local/frontend-only mode, environment warnings are expected if production env vars are intentionally unset. Treat warnings as informational unless the command reports an explicit failure.
