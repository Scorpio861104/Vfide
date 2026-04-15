# VFIDE Testing Infrastructure Audit

**Date:** April 14, 2026  
**Files examined:** jest.config.cjs, jest.setup.js, lib/__mocks__/contracts.ts, .github/workflows/*, package.json, 504 test files  

---

## Problem 1: `npm test` silently skips 48 of 504 test files

**File:** `jest.config.cjs`, `testPathIgnorePatterns`

```javascript
testPathIgnorePatterns: [
  '/test/hardhat/',       // ALL contract tests
  '/test/contracts/',     // ALL integration contract tests
  '/test/payment-system/',// ALL payment tests
  '/test/security/',      // ALL security regression tests
  '/test/integration/',   // ALL cross-contract integration tests
  '/websocket-server/test/', // ALL websocket tests
]
```

When you run `npm test` or `jest`, these 48 files are silently excluded. They exist, they look like they'd run, but they don't. The contract tests, payment tests, security regression tests, and integration tests all require their own separate commands (`test:onchain`, `test:onchain:critical`, etc.) — but those aren't part of the default test flow.

**Impact:** A developer running `npm test` sees "504 tests passed" and assumes full coverage. In reality, the most important tests (contract behavior, security regressions, payment flows) never ran.

---

## Problem 2: `test:ci` doesn't run the ABI parity check

**File:** `package.json`

```json
"test:ci": "jest --coverage --ci && npm run -s contract:verify:frontend-guardrails"
```

The ABI parity script (`contract:verify:frontend-abi-parity`) only runs in `validate:production` — which is never triggered in the CI workflow file. The CI `testing-pipeline.yml` runs `npx hardhat test` (contracts), `npx jest test/api/` (API), `npx jest test/frontend/` (frontend), but never runs `npm run test:ci` or `npm run validate:production`.

The `__tests__/abi-parity.test.ts` file (353 lines, 6 layers) IS included in the default jest run, but the standalone `scripts/verify-frontend-abi-parity.ts` is never called in CI.

**Fix:** Add `npm run contract:verify:frontend-abi-parity` to the CI pipeline, either in `testing-pipeline.yml` or in `test:ci`.

---

## Problem 3: Global wagmi mock makes all contract calls succeed silently

**File:** `jest.setup.js`, lines ~270-460

```javascript
useReadContract: jest.fn(() => ({
  data: null,
  isLoading: false,
  isSuccess: true,  // ← ALWAYS succeeds
  isError: false,
  error: null,
  refetch: jest.fn(),
})),
useWriteContract: jest.fn(() => ({
  writeContractAsync: jest.fn().mockResolvedValue('0xhash'), // ← ALWAYS returns hash
  isPending: false,
  isSuccess: false,
})),
```

Every `useReadContract` call returns `{ data: null, isSuccess: true }` regardless of what `functionName` or `abi` you pass. Every `useWriteContract` call succeeds with a mock hash. You can call a function that doesn't exist on the contract, pass wrong argument types, target a zero address — the mock says "success."

**Impact:** Tests verify UI rendering behavior around contract calls, but never verify the calls themselves are correct. This is how `isBlacklisted`, `setBlacklist`, `hasClaimed`, and 30 UserVault-only functions all passed testing for months.

**Fix:** Tests that verify contract integration should assert the args passed to `useReadContract`/`useWriteContract`:
```javascript
expect(wagmi.useReadContract).toHaveBeenCalledWith(
  expect.objectContaining({
    functionName: 'balanceOf',
    address: expect.stringMatching(/^0x/),
  })
);
```

---

## Problem 4: Global viem mock replaces cryptography with fakes

**File:** `jest.setup.js`, line ~285

```javascript
keccak256: jest.fn((bytes) => {
  const str = typeof bytes === 'string' ? bytes : Array.from(bytes).join('')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`
}),
```

This is a DJB2-style hash, NOT keccak256. Any test that depends on hash correctness (EIP-712 domain separators, permit signatures, merkle proofs, typed data signing) produces completely wrong values but passes because the mock is consistent within the test.

Also:
```javascript
parseEther: jest.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
```

This uses floating-point multiplication for ETH→wei conversion. `parseFloat("0.1") * 1e18` = `100000000000000000` in IEEE 754, but the real `parseEther("0.1")` = `100000000000000000n` exactly. For most values they agree, but edge cases (like `parseEther("0.3")`) produce different results due to floating-point representation. In a DeFi system, this kind of precision error can be the difference between a transaction succeeding and reverting.

---

## Problem 5: console.error and console.warn globally suppressed

**File:** `jest.setup.js`, bottom

```javascript
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}
```

Every `console.error` and `console.warn` in the entire codebase is silently swallowed during tests. This includes:

- React key warnings
- Contract configuration errors (`[VFIDE] Missing contract address: ...`)
- ABI validation failures
- Runtime deprecation warnings
- Unhandled promise rejection notices

If a contract read fails because the address is zero, the code logs `console.error(...)` and the test never sees it.

**Fix:** Remove the suppression entirely, or use jest's `--silent` flag only when needed. If specific warnings are noisy, suppress them per-test, not globally.

---

## Problem 6: Zero hook tests run in CardBoundVault mode

**Evidence:**
```bash
# Tests that set isCardBoundVaultMode to true:
grep -rl "isCardBoundVaultMode.*true\|cardBoundVaultMode.*true" hooks/__tests__/
# Result: 0 files

# Tests that set it to false (UserVault mode):
grep -rl "isCardBoundVaultMode.*false\|ACTIVE_VAULT_IMPLEMENTATION.*uservault" hooks/__tests__/
# Result: 6 files
```

Every hook test explicitly mocks `ACTIVE_VAULT_IMPLEMENTATION: 'uservault'` and `isCardBoundVaultMode: () => false`. The production default is `cardbound`. No hook test has ever run the code path that production uses.

**Fix:** Every hook test file needs a parallel `describe('CardBoundVault mode', ...)` block that sets `ACTIVE_VAULT_IMPLEMENTATION: 'cardbound'` and verifies CBV-specific behavior.

---

## Problem 7: Coverage thresholds track 21 of 500+ source files

**File:** `jest.config.cjs`, `collectCoverageFrom`

Coverage is collected from exactly 21 files:
- `lib/utils.ts`, `lib/price-utils.ts`
- 9 UI components (`EmptyState`, `ProgressSteps`, `Skeleton`, etc.)
- 4 hooks (`useVFIDEBalance`, `useMerchantStatus`, `useProofScore`, `useVaultHooks`)

Per-file thresholds set to 100% exist for 5 files. Everything else (the other 480+ source files) has no coverage requirement at all. You could delete the entire escrow system, guardian management, payment processing, DAO governance — coverage would still pass.

**Fix:** Either expand `collectCoverageFrom` to include all `lib/`, `hooks/`, `app/` source files, or at minimum add the critical paths: `useVaultRecovery`, `useSecurityHooks`, `useVaultHub`, `usePayment`, `useEscrow`, the admin dashboard, and all API routes.

---

## Problem 8: CI testing-pipeline.yml never runs `npm test`

**File:** `.github/workflows/testing-pipeline.yml`

The CI pipeline runs:
1. `npx hardhat test --parallel` (contract tests via Hardhat, not Jest)
2. `npx hardhat coverage` (contract coverage)
3. `npx jest test/api/` (API tests only)
4. `npx jest test/frontend/` (frontend tests only)
5. `npx hardhat test test/security/regressions.test.ts` (one security file)

It NEVER runs:
- `npm test` (the default jest command with 456 __tests__ files)
- `npm run test:ci`
- `npm run validate:production`
- The abi-parity test
- The mock parity test (Layer 6)
- Any hook-level tests

The 456 files in `__tests__/` exist and can be run locally but are not part of the CI pipeline. They could all be broken and CI would still pass.

**Fix:** Add a step in `testing-pipeline.yml`:
```yaml
- name: Run frontend unit tests
  run: npm test -- --ci --coverage
```

---

## Problem 9: Mock `lib/__mocks__/contracts.ts` was frozen at early version

**Status:** JUST FIXED this session.

The mock had 15 keys (including deleted `SecurityHub`), missing 24 keys that the real `contracts.ts` has. It also defaulted to `VAULT_HUB_ABI = [] as const` — an empty ABI — and didn't export `isCardBoundVaultMode`, `isConfiguredContractAddress`, `ACTIVE_VAULT_IMPLEMENTATION`, or `ZERO_ADDRESS`.

Tests that used this mock were testing against a contract configuration that hasn't existed for months.

---

## Problem 10: No CardBoundVault on-chain tests

```bash
find test/ -name "*CardBound*" -o -name "*cardbound*"
# Result: 0 files
```

Zero Hardhat/Forge test files for CardBoundVault — the primary vault implementation. The 777-line contract with EIP-712 signed intents, withdrawal queuing, guardian timelocking, wallet rotation, spend limits, and recovery rotation has never been tested against an actual EVM.

`VaultHubAndInfrastructure.test.ts` tests `ensureVault` (vault creation) but not any CardBoundVault operations. The generated stubs are deploy-only smoke tests.

---

## Problem 11: API tests mock the database differently

Of 95 API test files:
- 15 mock the database (`jest.mock('@/lib/db', ...)`)
- 80 don't mock it at all — but they also don't have a real database

The CI pipeline `api-tests` job provisions a real Postgres and runs `npx jest test/api/` (the `test/api/` directory, not `__tests__/api/`). But `test/api/` has only a few files, while `__tests__/api/` has 95 files that are excluded from the CI API test job.

API tests in `__tests__/api/` that don't mock the database will try to import `@/lib/db` which attempts a real Postgres connection that doesn't exist in the default jest environment. These tests either: (a) fail silently because the import is lazy, (b) pass because the code path that hits DB is never reached, or (c) are covered by the global catch-all that suppresses `console.error`.

---

## Problem 12: Slither runs with `|| true`

**File:** `.github/workflows/testing-pipeline.yml`

```yaml
- name: Run Slither
  run: |
    slither . \
      --config-file slither/slither.config.json \
      || true    # ← ALWAYS PASSES
```

Slither's exit code is suppressed. It can find critical vulnerabilities and CI still passes green. The SARIF report is uploaded as an artifact but the job never fails.

**Fix:** Remove `|| true` and either fix all Slither findings or add them to an explicit ignore list.

---

## Problem 13: E2E tests only run on `main` branch pushes

**File:** `.github/workflows/testing-pipeline.yml`

```yaml
e2e-tests:
  if: github.ref == 'refs/heads/main'
```

Playwright E2E tests only run after code is already merged to main. PRs to main don't get E2E coverage. By the time E2E runs, the code is already in production.

---

## Summary: What Actually Gets Tested

| Layer | What runs | What's missing |
|-------|-----------|----------------|
| Contract logic | Hardhat tests (15 files + 18 stubs) | CardBoundVault (0 tests), WithdrawalQueue (0), FraudRegistry (0), FeeDistributor (0) |
| Contract ↔ Frontend | ABI parity test exists but NOT in CI | Never runs automatically |
| Hook logic | 11 hook test files, all in UserVault mode | Zero CBV-mode tests |
| Component rendering | 219 render tests | Don't verify contract call correctness |
| API routes | 95 test files in __tests__/api/ | Not in CI pipeline, DB mocking inconsistent |
| Security regressions | 1 file via Hardhat in CI | Slither results suppressed |
| E2E | Playwright exists | Only runs on main, not PRs |
| Payment system | test/payment-system/ exists | Excluded from jest, not in CI |
| Integration | test/integration/ exists | Excluded from jest, not in CI |

**The gap:** There is no test anywhere in the system that connects a frontend hook's `functionName` string to the actual Solidity function. The abi-parity test would close this gap — it just needs to be enforced in CI.
