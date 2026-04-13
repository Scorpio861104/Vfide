# Local Validation Runbook

## Purpose
This runbook defines the minimum local validation lane before opening or merging release-impacting changes.

## Required Validation Commands
Run the following commands from the repository root:

1. npm run test:security:all
2. npm run test:ci

## Recommended Additional Checks
- npm run lint
- npm run type-check
- npm run build

## Sign-off Notes
Record command results and any exceptions in the active issue or PR before requesting review.
