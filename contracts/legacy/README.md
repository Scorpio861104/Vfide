# Quarantined Contracts (Legacy / Orphaned)

## VFIDESecurity.sol

This 673-line file contains the legacy modules from the pre-v17 architecture:

- `SecurityHub` — central halt/pause/lock controller
- `GuardianLock` — third-party freeze on user vaults
- `PanicGuard` — emergency multisig pause

All three were **removed from the production codebase** in the non-custodial transition
because they violated the protocol's core design principle: **no entity (DAO, team,
multisig, guardian, or contract) can freeze, lock, or seize user funds.** A user's
vault is protected only by the user's own chosen guardians via the CardBoundVault
recovery rotation flow.

## Why is this file kept

1. **Audit history.** The file documents what was removed and why; reviewers comparing
   v17 against earlier audit reports can see the deleted surface.
2. **Hardhat artifact compatibility.** A small number of older test scripts still
   reference `getContractFactory("VFIDESecurity")` for ABI-existence smoke tests
   (`test/contracts/RemainingContracts.test.ts` line 128). Those tests verify the
   ABI compiles but never instantiate the contracts at runtime in production paths.

## Why it is NOT in `contracts/` (production)

No production contract imports or references it. `scripts/deploy-full.ts` does not
deploy it. The Hardhat compiler will still compile this file (path is auto-discovered
under `contracts/`), but no code path in production uses these modules.

If you fully drop legacy test compatibility, this file can be deleted entirely.
