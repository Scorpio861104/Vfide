# Contract Emergency Runbook

This runbook covers emergency actions for VFIDE production contracts.

## Trigger Conditions

Use this runbook when any of the following occur:

- Critical smart-contract bug or exploit suspicion
- Unauthorized admin action or key compromise
- Vault funds stuck or draining unexpectedly
- Seer/ProofLedger reporting corrupted or malicious data
- Commerce payment settlement discrepancy affecting funds

## Immediate Response (First 15 Minutes)

1. Freeze further admin changes.
2. Verify the incident is real using on-chain state, event logs, and application telemetry.
3. Notify the incident channel and assign:
   - Incident commander
   - On-chain operator
   - Communications owner
4. If active risk exists, execute the smallest available containment action:
   - Pause via EmergencyBreaker or CircuitBreaker
   - Disable affected route or webhook at the app layer
   - Revoke compromised signer/session credentials

## Contract-Level Containment Actions

### EmergencyBreaker / CircuitBreaker

- Pause affected functions first, not the whole system, when granular pause exists.
- Record tx hash, block number, signer, and rationale.

### SecurityHub / PanicGuard

- Trigger guardian safety mode if vault recovery or guardian logic is being abused.
- Validate guardian quorum before any irreversible action.

### VaultHub / VaultInfrastructure

- Stop new vault creation if deterministic vault logic is implicated.
- Do not migrate or sweep funds until the root cause is confirmed.

### Commerce / Merchant Flow

- Disable merchant settlement confirmations if event verification is suspect.
- Pause webhook dispatch if duplicate or forged settlements are being observed.

## Key Compromise Procedure

If any deployer/admin signer is suspected compromised:

1. Stop using the key immediately.
2. Revoke ownership/roles via AdminMultiSig or handover process where available.
3. Rotate:
   - DEPLOYER_PRIVATE_KEY
   - JWT secrets
   - webhook secrets
   - Redis/API credentials used by privileged infrastructure
4. Replace signer references in deployment and ops env files.
5. Record the rotation timestamp and evidence.

## Recovery and Validation

Before resuming operations:

1. Reproduce the issue in staging or local fork if possible.
2. Confirm mitigation on-chain.
3. Run:
   - `npm run build`
   - `npx hardhat compile`
   - focused contract tests for affected contracts
4. Verify explorer/source sync for any hotfix deployment.
5. Publish a short internal incident summary.

## Evidence Checklist

Capture all of the following:

- block number and chain id
- affected contract addresses
- tx hashes for pause/revoke/rotate actions
- screenshots or logs of alerts
- exact commands run
- operator identity and approval evidence

## Exit Criteria

The incident can be closed when:

- active exploitation is contained
- compromised access has been rotated or removed
- affected contracts are verified safe or replaced
- stakeholder communication is complete
- postmortem owner and deadline are assigned
