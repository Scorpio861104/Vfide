# ZIP 524 Remediation Batches

Generated: 2026-05-03

This plan converts unresolved items from `files (2).zip` (`VFIDE_FIX_CHECKLIST.md`) into execution batches that can be worked and validated in order.

## Ground truth

- Canonical backlog source: zip checklist unchecked items.
- Highest-risk queue: "Pre-mainnet blockers" in the checklist.
- Current tracker alignment target: `docs/security/AUDIT_FINDINGS_RUNNING_TODO.md`.

## Priority queue (execution order)

1. Batch A - Deploy blockers
2. Batch B - Governance/control-plane safety
3. Batch C - Frontend/API critical integrity
4. Batch D - Timelock coverage expansion
5. Batch E - Test and verification hardening
6. Batch F - Code hygiene and residual medium/low items

## Actionable batches

### Batch A - Deploy blockers (ship gate)

IDs:

- #415, #307, #391, #416, #392, #393, #327, #328, #325, #326, #345

Deliverables:

- Deploy path always creates/wires `AdminMultiSig` before token deployment.
- Permit hashing includes `deadline` and corresponding tests pass.
- Governance transfer script covers all ownership/DAO transfers with no omissions.
- Emergency threshold/quorum behavior matches policy (`EMERGENCY_APPROVALS=4`, veto quorum).

Validation:

- Run focused deploy/script tests for governance transfer and ownership handoff.
- Run compile + contract unit tests covering permit and fee math paths.

### Batch B - Governance/control-plane safety

IDs:

- #346, #347, #311, #315, #308, #313, #425, #427, #428, #429, #493

Deliverables:

- Freeze/halt mechanics reduced to intended minimal set.
- Advisory hooks fail-open where required and cannot brick execution.
- Guardian/registry controls constrained to vault-compatible boundaries.

Validation:

- Unit tests proving no unilateral freeze path outside approved governance.
- Invariant tests for token transfer path and hook failure behavior.

### Batch C - Frontend/API critical integrity

IDs:

- #62, #95, #138, #105, #91, #92, #72, #93, #79, #481

Deliverables:

- Server-side on-chain verification for payment/settlement claims.
- Missing/broken API endpoints restored or explicitly retired with UI updates.
- Route-closure/module-load failures eliminated.
- Indexer ABI/runtime parity restored and reindex procedure documented.

Validation:

- API integration tests for each repaired endpoint.
- End-to-end payment flow tests requiring verified tx linkage.

### Batch D - Timelock coverage expansion

IDs:

- Timelock checklist cluster (e.g. #236, #240, #262, #273, #298, #302, #348, #349, #365, #376, #430, #431, #438, #439, #446, #473, #474, #478, #480, #488, #489, #490, #491, #495, #496, #498, #502, #505, #506, #510, #517, #518, #520)

Deliverables:

- Setter/admin operations moved behind explicit timelock/cooldown guards.
- Fee and oracle admin actions enforce documented hard caps.

Validation:

- Contract tests asserting pre-delay revert and post-delay success.
- Governance script simulation for queued/apply/cancel lifecycle.

### Batch E - Test and verification hardening

IDs:

- #485, #486, #521, #523, #524

Deliverables:

- Real-EVM tests for permit, fee routing, recovery, governance lifecycle.
- Deploy integration test with post-deploy on-chain validation phase.
- Parallel verify script and `verify:all` npm script wired into deployment validation.

Validation:

- CI path executes full verification suite and fails hard on drift.

### Batch F - Code hygiene and residuals

IDs:

- #29, #41, #45, #46, #47, #353, #357, #37, #43, #419, #420, #421, #454, #455

Deliverables:

- Build/deploy cannot ignore TypeScript import/runtime failures.
- DB errors are surfaced and logged safely, not silently swallowed.
- Dead code and oversized hot-path contracts are reduced/refactored.

Validation:

- Lint/type gates strict in CI and local validation scripts.
- Regression tests added for previously swallowed-failure paths.

## Tracker sync policy

- Keep exactly one `IN_PROGRESS` item in `AUDIT_FINDINGS_RUNNING_TODO.md`.
- Only mark `DONE_*` when both are present:
  - code/test evidence in repo,
  - explicit ID-level reference in tracker/docs.
- Use this batch file as the source for selecting the next `IN_PROGRESS` item.
