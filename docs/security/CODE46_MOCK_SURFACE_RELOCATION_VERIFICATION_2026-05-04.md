# CODE-46 Verification (2026-05-04)

Finding addressed:

- #46: move test-only mocks out production build surface

## What changed

1. Relocated root mock files from `__mocks__/` to `test/mocks/`:
   - `test/mocks/uncrypto.js`
   - `test/mocks/minimatch-compat.cjs`
   - `test/mocks/sentry-nextjs.js`
   - `test/mocks/isomorphic-dompurify.js`
2. Updated Jest module alias mappings:
   - `jest.config.cjs`
   - `jest.hardhat.cjs`
3. Removed the now-empty root `__mocks__/` directory.

## Validation

Commands run:

```bash
rg -n "<rootDir>/__mocks__/|\./__mocks__/|/__mocks__/" jest*.cjs app lib hooks components __tests__ test package.json
npx jest __tests__/api/merchant/installments.test.ts --runInBand
```

Results:

- No active runtime/config alias references remain to root `__mocks__/` paths.
- Jest test execution succeeds after remap.
- Remaining `__mocks__` references are intentionally under `lib/__mocks__/` test fixtures and historical docs.

## Evidence references

- `jest.config.cjs`
- `jest.hardhat.cjs`
- `test/mocks/uncrypto.js`
- `test/mocks/minimatch-compat.cjs`
- `test/mocks/sentry-nextjs.js`
- `test/mocks/isomorphic-dompurify.js`
