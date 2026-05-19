# VFIDE V1 Scope

**Superseded.** This file is retained as a pointer; do not edit.

The authoritative V1 specification now lives in three documents:

1. **`contracts/PRODUCTION_SET.md`** — the canonical inventory of every
   deployable contract, with explicit deploy-script disposition and dated
   rename/move/defer records.
2. **`AUDIT_CLOSURE_REPORT.md`** — what changed between the audit
   campaign (2026-05-14) and the current snapshot, with the full
   accepted-design list.
3. **`MAINNET_DEPLOY_READINESS.md`** — the deploy-day punch list and
   sign-off checklist.

## Why this file was superseded

The previous contents of this file (an early, simplified statement of
intent) drifted out of sync with the implemented system:

- It listed 4 in-scope V1 contracts; the actual mainnet deploy set
  is ~28 contracts (see `PRODUCTION_SET.md`).
- It described a 7-tier discrete fee model; the implemented fee curve
  in `ProofScoreBurnRouter._calculateLinearFee` is a continuous linear
  interpolation between `LOW_SCORE_THRESHOLD=4000` (max fee 5%) and
  `HIGH_SCORE_THRESHOLD=8000` (min fee 0.25%).
- It listed `SanctumVault.sol` as deferred; it is deployable and listed
  in `PRODUCTION_SET.md`.
- It listed `GovernanceCouncil.sol` and `TrustScorePassport.sol` as
  planned; the council contracts live in `contracts/future/`
  (CouncilElection, CouncilManager, CouncilSalary), and `TrustScorePassport`
  is also in `contracts/future/`.

The **primary fee split (40% burn / 10% Sanctum / 50% Ecosystem)** does
still hold and is implemented in `ProofScoreBurnRouter.getEffectiveBurnRate`
at the line emitting `burnBps = totalBps * 40 / 100`. The 50% ecosystem
share is then further redistributed by `FeeDistributor` across 5
channels (35/20/15/20/10) — see `FeeDistributor.feeSplit` in the constructor.

## V1 complete definition (current)

V1 mainnet launch is complete when every item in
`MAINNET_DEPLOY_READINESS.md § D — Sign-off checklist` is checked.
