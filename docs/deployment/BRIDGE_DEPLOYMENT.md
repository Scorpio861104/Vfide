# Bridge Deployment Checklist

Use this checklist before enabling any bridge or cross-chain settlement path.

## Pre-flight

1. Confirm the target chain IDs, RPC URLs, and deployed contract addresses.
2. Verify relayer/operator wallets have the correct roles and enough gas.
3. Run local compile, typecheck, and focused tests for touched paths.
4. Dry-run any deployment or config script first.
5. Simulate bridge calls where tooling supports it.

## Validation

- Verify token allowlists and rate limits.
- Confirm pause or emergency-stop controls are configured.
- Check event indexing and monitoring are active.
- Validate destination vault or recipient addresses on testnet first.

## Launch

- Start with the smallest allowed transfer amount.
- Record tx hashes, block numbers, and owner sign-off evidence.
- Monitor for delayed settlement, replay risk, or fee anomalies.

## Rollback Readiness

- Keep pause roles available.
- Document the disable path and the exact config values to revert.
- Do not proceed live if any required env var or contract address is missing.
