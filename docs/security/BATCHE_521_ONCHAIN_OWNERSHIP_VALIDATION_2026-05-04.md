# Batch E #521 Verification (2026-05-04)

Finding addressed:

- #521: add an on-chain post-deploy ownership/DAO validation phase to `scripts/validate-deployment.ts`

## What changed

`scripts/validate-deployment.ts` now discovers deployment manifests from:

1. `DEPLOYMENT_FILE=<path>` when explicitly provided
2. `.deployments/<network>.json`
3. the most recent root manifest matching `deployments(-solo)-*.json`

It also supports both manifest shapes:

- plain address book JSON
- `{ "addresses": { ... } }`

The on-chain ownership/DAO drift check now becomes usable with the repo's real deployment artifact patterns instead of only one hardcoded manifest path.

## Validation

Command run:

```bash
npx tsc --noEmit --ignoreConfig --target es2022 --module nodenext --moduleResolution nodenext --esModuleInterop --skipLibCheck scripts/validate-deployment.ts
```

Result:

- Passed with no output.

## Notes

- The check still requires `RPC_URL` and `DEPLOYER_ADDRESS` to execute live ownership drift validation.
- If no manifest is present, the script reports a warning and explains how to enable the check with `DEPLOYMENT_FILE`.
