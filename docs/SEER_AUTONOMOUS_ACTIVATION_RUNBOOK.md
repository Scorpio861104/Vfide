# Seer Autonomous Activation Runbook

## Purpose

Enable pre-action Seer automation across governance and commerce modules with explicit, auditable governance execution.

Targets:
- `DAO.setSeerAutonomous(address)`
- `EscrowManager.setSeerAutonomous(address)`
- `SessionKeyManager.setSeerAutonomous(address)`
- Optional: `Seer.setSeerAutonomous(address)`

## Generate Activation Calldata

Use the helper script to produce exact calldata for each target.

```bash
SEER_AUTONOMOUS_ADDRESS=0x... \
DAO_ADDRESS=0x... \
ESCROW_MANAGER_ADDRESS=0x... \
SESSION_KEY_MANAGER_ADDRESS=0x... \
SEER_ADDRESS=0x... \
RPC_URL=https://... \
npm run -s ops:seer:activation:plan
```

Notes:
- `SEER_ADDRESS` is optional. Include it if Seer core should also cascade to autonomous logic.
- `RPC_URL` is optional but recommended to print authorized-caller checks from live chain state.

## Governance Execution Path

1. Execute the DAO setter call via timelock.
- `DAO.setSeerAutonomous(...)` is `onlyTimelock`.

2. Execute Escrow and Session setters via each module's `dao()` authority.
- `EscrowManager.setSeerAutonomous(...)` requires `msg.sender == escrow.dao()`.
- `SessionKeyManager.setSeerAutonomous(...)` requires `msg.sender == session.dao()`.

3. If enabling Seer core cascade, execute `Seer.setSeerAutonomous(...)` via `seer.dao()` authority.

## Post-Activation Checks

Verify on-chain values:
- `DAO.seerAutonomous()` equals deployed SeerAutonomous address.
- `EscrowManager.seerAutonomous()` equals deployed SeerAutonomous address.
- `SessionKeyManager.seerAutonomous()` equals deployed SeerAutonomous address.
- Optional: `Seer.seerAutonomous()` equals deployed SeerAutonomous address.

Then run local watcher verification:

```bash
npm run -s contract:verify:seer:watcher:local
```

## Rollback

If any module needs immediate rollback, set `seerAutonomous` to zero address using the same authorized governance path for that module.

Recommended rollback order:
1. `DAO.setSeerAutonomous(address(0))`
2. `EscrowManager.setSeerAutonomous(address(0))`
3. `SessionKeyManager.setSeerAutonomous(address(0))`
4. Optional: `Seer.setSeerAutonomous(address(0))`
