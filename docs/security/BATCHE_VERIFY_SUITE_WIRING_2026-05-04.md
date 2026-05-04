# Batch E Verify Suite Wiring (2026-05-04)

Finding addressed:

- #524: verify scripts were not enforced by deployment validation.

## Changes applied

1. Added consolidated critical verify suite script:
   - `contract:verify:all:critical:local`
   - File: `package.json`
2. Wired this suite into deployment gate:
   - `scripts/validate-deployment.ts` now runs `npm run -s contract:verify:all:critical:local` as a critical Tier 1 check.

## Verification

- Script key exists and package parses:
  - `node -e "const p=require('./package.json'); console.log(Boolean(p.scripts['contract:verify:all:critical:local'])?'ok':'missing')"`
- `validate-deployment.ts` parse/execution path remains valid (script runs and returns status).

## Notes

- This resolves the deployment-gate integration gap for the critical local verify suite.
- Remaining Batch E items to evaluate separately:
  - #521 (on-chain post-deploy ownership/DAO validation pass)
  - #523 (real Seer/Token verify path parallel to mock-based router invariant check)
