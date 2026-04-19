# VFIDE Governance Handover

Reference for handing ownership and DAO roles from the deployer EOA to a Gnosis Safe and eventually fully on-chain governance.

---

## Why a Gnosis Safe?

All `setDAO(...)` role holders (`FraudRegistry`, `Seer`, `GovernanceHooks`, `MerchantPortal`, `VFIDETermLoan`) are set to a single **DAO address**. If that address is an EOA, member rotation requires a contract upgrade. If that address is a **Gnosis Safe**, member join/leave becomes a Safe signer swap — zero on-chain contract interaction required.

---

## Setup: Point All DAO Roles at a Gnosis Safe

1. Create a Gnosis Safe on Base (or the target network) with your founding signers.
2. Set `NEXT_PUBLIC_DAO_ADDRESS` in your `.env` to the Safe address.
3. Run the governance transfer script:
   ```bash
   npx hardhat run scripts/transfer-governance.ts --network baseSepolia
   ```
   This wires `FraudRegistry`, `Seer`, `GovernanceHooks`, `MerchantPortal`, and other role holders to the Safe address (some with 48-hour timelocks).

---

## Cycling DAO Members (Safe Signer Rotation)

Because the DAO address is a Gnosis Safe:

- **Add a member:** Add their wallet as a signer in the Safe UI.
- **Remove a member:** Remove their wallet as a signer in the Safe UI.
- **Change threshold:** Adjust required signatures in Safe settings.

No on-chain VFIDE contract interaction is needed for any of these operations.

---

## Deployer Ownership Exit Path

| Step | Action | Notes |
|------|--------|-------|
| 1 | `VFIDEToken.transferOwnership(ocp)` | Already scripted in `transfer-governance.ts` |
| 2 | `OwnerControlPanel.acceptOwnership()` | OCP must call within 7 days |
| 3 | `OwnerControlPanel.transferOwnership(safe)` | Transfer OCP owner to Gnosis Safe |
| 4 | Safe accepts OCP ownership | Deployer EOA no longer holds any privileged role |
| 5 | *(Long-term)* Transfer OCP owner → `DAOTimelock` | All parameter changes require on-chain vote + timelock delay |

> **Note:** `renounceOwnership()` is permanently disabled on `VFIDEToken`. Ownership is transferred, never abandoned.

---

## DAOTimelock Admin Handover

After `transfer-governance.ts` runs, `DAOTimelock.setAdmin(dao)` is scheduled but not yet executed. After the timelock delay passes:

```bash
timelock.execute(setAdminTxId)
```

Once executed, the `DAO` contract (or Safe acting as DAO proposer) becomes the sole timelock admin. The deployer EOA can no longer queue or cancel timelock transactions.

---

## Long-Term: Full On-Chain Governance

After ~6 months of stable operation:

1. Run `SystemHandover` to transfer remaining admin roles to `DAOTimelock`.
2. All protocol changes must then go through the on-chain proposal → vote → timelock → execute flow.
3. The Gnosis Safe continues to serve as the emergency multisig for circuit-breaker actions only.

---

## Role Inventory

| Role | Current Holder (post-handover) | Mechanism |
|------|-------------------------------|-----------|
| `VFIDEToken` owner | `OwnerControlPanel` → Safe | 2-step transfer |
| `OwnerControlPanel` owner | Gnosis Safe | Direct transfer |
| `FraudRegistry` DAO | Gnosis Safe | `setDAO(safe)` |
| `Seer` DAO | Gnosis Safe | `proposeDAOChange(safe)` (48 h) |
| `GovernanceHooks` DAO | Gnosis Safe | `setDAO(safe)` |
| `MerchantPortal` DAO | Gnosis Safe | `setDAO(safe)` |
| `VFIDETermLoan` DAO | Gnosis Safe | `setDAO(safe)` |
| `DAOTimelock` admin | `DAO` contract | `setAdmin(dao)` via timelock |
| `FeeDistributor` treasury sink | `FeeDistributor` | `setTreasurySink()` (48 h) |
| `SanctumVault` sanctum sink | `SanctumVault` | `setSanctumSink()` (48 h, optional) |

---

## Emergency Controls

The Gnosis Safe retains emergency access through:

- `EmergencyControl` — pause/unpause modules
- `CircuitBreaker` — halt token transfers globally
- `SeerGuardian` — override autonomous Seer decisions

These are intentionally kept under multisig control and are **not** handed to the DAOTimelock, as they must execute without delay in an incident.

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Full deployment step-by-step |
| [ENV_CONTRACT_ADDRESS_MATRIX.md](./ENV_CONTRACT_ADDRESS_MATRIX.md) | Env var reference |
| [SECURITY.md](./SECURITY.md) | Security posture and incident response |
