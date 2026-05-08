# Quarantined Deploy Scripts (Pre-v17 / Legacy)

These scripts were broken by the non-custodial transition that removed `SecurityHub`,
`GuardianLock`, and `PanicGuard` from the production token. They reference contracts
and functions that no longer exist on `VFIDEToken` (`applySecurityHub`, `setSecurityHub`,
`SecurityHub` factory). Running any of them will revert at deployment time or attempt
to call non-existent functions.

| File                          | Status   | Specific breakage                                                                  |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `deploy-solo.ts.broken`       | BROKEN   | Uses `getContractFactory("contracts/VFIDESecurity.sol:SecurityHub")` — orphaned.    |
| `apply-wiring.ts.broken`      | BROKEN   | Calls `token.applySecurityHub()` — function was removed from VFIDEToken.            |
| `deploy-wizard.sh.broken`     | BROKEN   | Orchestrates the two scripts above; cascades their failures.                       |

## Use these instead

For a complete production deployment use **`scripts/deploy-full.ts`** plus the
governance handover script **`scripts/transfer-governance.ts`**, then verify with
the 22 `scripts/verify-*.ts` invariants listed under `npm run contract:verify:all`.

`scripts/deploy-full.ts` covers ~30 contracts but does **not** include
StablecoinRegistry, CircuitBreaker, VFIDEPriceOracle, ServicePool, RevenueSplitter,
VFIDEFinance, or DutyDistributor — deploy those separately as needed.

## Do not delete

These files are kept for historical reference only. Deleting them is fine if you
don't need that history; the `.broken` suffix exists so they cannot be picked up
by any test runner, lint pass, or `find … -name "*.ts"`-style script.
