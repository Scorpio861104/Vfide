# Storage Layout Regression Check — Status: Not Applicable (Yet)

## Context

The v19.x audit series flagged "storage-layout regression check" as a deferred item. This document explains why it's deferred and under what conditions it would become required.

## What a storage layout regression check is

When a Solidity contract is upgradeable via a proxy (Transparent Proxy, UUPS, etc.), the storage layout of the implementation contract MUST remain compatible across upgrades. Specifically:

- New state variables can only be appended at the end
- Existing variables cannot be reordered, renamed in a way that changes their slot, or have their types changed
- Inherited contracts contribute to the layout in declaration order; changing the inheritance order is a breaking change

Violating any of these silently corrupts state. Variables that "should" hold the user's balance start reading random bits. Funds appear to vanish.

A storage-layout regression check tools this: it dumps the slot layout of every contract via `forge inspect <Contract> storageLayout` (or hardhat equivalent), persists it as a baseline, and on every PR diffs the new layout against the baseline, failing the CI if any incompatible change is detected.

## Why VFIDE doesn't need this today

**VFIDE contracts are NOT proxied.** Every production contract is deployed at a fixed address with immutable bytecode. There is no upgrade path. The system is designed around the "decentralized after handover" model: once SystemHandover executes (~6 months post-launch), no entity can upgrade contracts, and before handover the developer EOA also doesn't upgrade — it transfers ownership to DAOTimelock.

This is a deliberate architectural choice, documented in:
- `KEY_MANAGEMENT_PLAN.md`
- `docs/operations/SYSTEM_HANDOVER_RUNBOOK.md`
- The README's "non-custodial" guarantees

Non-upgradeable contracts cannot have storage layout regressions. Each deployment is a fresh contract at a fresh address; old storage stays where it is in the old contract; new contracts have whatever layout they have.

## When this would become required

Three scenarios would change this:

### 1. Migration to upgradeable proxies

If at some future point VFIDE adopts an upgradeable proxy pattern for some subset of contracts (e.g. a feature-flag manager that's expected to evolve), THAT specific contract would need:

- A storage-layout baseline captured at deploy
- A CI check that fails any PR introducing an incompatible change
- A migration path documented in the runbook

The existing immutable contracts would be unaffected and continue to not need this check.

### 2. Migration to a Diamond / EIP-2535 pattern

If we adopt a Diamond pattern for any new contract surface (multiple facets sharing storage), the storage layout becomes part of the cross-facet contract. Same check applies.

### 3. State migration via redeploy + SSTORE2

If we ever do a "soft upgrade" (deploy a new contract and migrate state into it via something like SSTORE2 or external scripts), the migration script needs its own correctness check — but that's a one-shot validation, not a CI gate.

## How to implement when needed

When the migration to proxies happens, add this to `package.json`:

```json
{
  "scripts": {
    "storage-layout:capture": "hardhat run scripts/capture-storage-layout.ts",
    "storage-layout:check": "hardhat run scripts/check-storage-layout.ts"
  }
}
```

The capture script writes `.storage-layouts/<Contract>.json` for every proxied contract.
The check script reads each baseline, runs hardhat's storage-layout introspection, diffs them, exits non-zero on any incompatible change.

Wire `npm run storage-layout:check` into CI as a required check on every PR that touches proxied contracts.

A starting reference implementation: <https://docs.openzeppelin.com/upgrades-plugins/1.x/api-hardhat-upgrades#validate-upgrade>. OpenZeppelin's `validateUpgrade` does exactly this for OZ-style proxies.

## Status

✅ **Not applicable today.** All production contracts are immutable.
🔵 **Required if:** any contract migrates to a proxy pattern. Add the check at the same PR that introduces the proxy.

## See also

- `KEY_MANAGEMENT_PLAN.md` — overall topology, including the non-upgradeable design choice
- `docs/operations/SYSTEM_HANDOVER_RUNBOOK.md` — what changes (and doesn't) at handover
- `MICRO_CHUNK_RISK_BACKLOG.md` — track this if proxy migration is ever proposed
