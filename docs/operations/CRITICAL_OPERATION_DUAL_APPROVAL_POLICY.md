# Critical Operation Dual Approval Policy

## Operations Requiring Dual Approval

- Mainnet deployment, emergency pause, production rollback, and signing-key rotation.
- Any operation that can impact custody, funds flow, or governance rights.

## Required Approval Roles

- One `operator` approval from the executing operations owner.
- One `reviewer` approval from an independent security or engineering lead.
- Approvals must be from distinct individuals.

## Evidence Requirements

- Signed operation identifier and operation type.
- Individual approval timestamps.
- Explicit decision outcome (`proceed` or `abort`).
- Immutable evidence references for each approval.

## Execution Checklist

1. Confirm operation type is in policy scope.
2. Capture approvals from both required roles.
3. Validate distinct approver identities.
4. Attach evidence references before execution.
5. Store latest signoff artifact in `audit/critical-operation-signoff.latest.json`.
