# CODE-47 Verification (2026-05-04)

Finding addressed:

- #47: make `postinstall` CI-aware (avoid strict local env validation during CI/deploy installs)

## What was verified

1. `package.json` now uses a guarded postinstall entry:
   - `postinstall`: `node scripts/postinstall-validate-env.cjs`
2. `scripts/postinstall-validate-env.cjs` skips `validate:env` when CI/deployment markers are present.
3. Local developer installs still run `validate:env`.

## Evidence

- `package.json`
- `scripts/postinstall-validate-env.cjs`

## Command used

```bash
rg -n "postinstall|validate:env|postinstall-validate-env" package.json scripts/postinstall-validate-env.cjs
```
