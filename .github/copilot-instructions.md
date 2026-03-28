# VFIDE Copilot Workspace Instructions

## Deployment Safety First

Before any deployment or live on-chain transaction, do as much validation as possible in-repo and off-chain first.

Required workflow for any deploy-related request:

1. Gather prerequisites and validate all required inputs (addresses, RPC, roles, balances, env vars).
2. Run dry-run mode first whenever supported.
3. Run relevant compile/type/lint checks for touched code.
4. Run focused tests for changed deploy or contract paths.
5. Simulate contract calls before signing where tooling supports simulation.
6. Provide a short pre-deploy readiness summary that includes:
   - What was validated
   - What could not be validated and why
   - Remaining operational risks
7. Only then proceed to live deployment/transaction execution.

If critical inputs are missing, do not attempt deployment. Request the missing inputs and continue with all possible non-destructive validation in the meantime.

## Testnet Distribution Policy

When provisioning VFIDE to testers on testnet:

1. Do not use presale flows.
2. Prefer vault-compatible distribution under vault-only mode.
3. Use dry-run first, then live execution after checks.
4. Prefer idempotent top-up behavior over one-time blind transfers.
