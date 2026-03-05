# VFIDE System Feature Review Tracker

Status date: 2026-03-03

This tracker is for feature-by-feature deep review discussions.
Each feature section is reviewed for:
- Product intent & user flow
- Contract/API implementation
- Security model
- Failure modes & edge cases
- Test coverage
- Open risks and recommended hardening

## Review Queue (System-Wide)

1. Vault System (creation, transfer controls, guardians)
2. Chain of Return (owner recovery)
3. Next of Kin Inheritance
4. ProofScore & Trust (Seer + social)
5. Fee/Burn Router + Treasury allocation
6. Ecosystem work rewards (merchant/referral)
7. Merchant & payment flows
8. Escrow lifecycle
9. Governance & DAO/timelocks
10. Owner Control Panel governance guardrails
11. Badge & achievement system
12. API security/authz surface
13. Social/messaging and attachment flows
14. Cross-chain/bridge and multi-chain operations
15. Privacy/stealth/time-lock/multisig specialty modules
16. Observability/performance/ops safety

## Current Snapshot

### Surface inventory confirmed
- Frontend route surface is broad under app/* including governance, vault, merchant, security, social, and operations dashboards.
- Contract surface includes core finance/security/governance modules under contracts/*.
- API surface includes auth, security telemetry, rewards, quests, messaging, groups, attachments, notifications, and analytics endpoints under app/api/*.
- API test surface is substantial under __tests__/api/*.

### Recently verified security checks in repo
- OwnerControlPanel guardrail local verifier passes.
- Chain of Return timelock local verifier passes.
- Next of Kin inheritance local verifier passes.
- Combined governance safety local verifier passes.

## Session-by-Session Review Log

### Feature 1: Vault System
Status: Pending
Notes:
- Start with UserVault transfer model, pending tx approvals, cooldowns, abnormal thresholds, and execute restrictions.
- Then assess Hub/Registry forced recovery logic and ownership transitions.
- Deploy-size mitigation applied: UserVault creation bytecode moved to provider contract, removing the prior VaultInfrastructure size warning during compile.
- New hardening in `contracts/VaultHub.sol`:
	- `setModules` now rejects zero-address updates for core dependencies (`vfideToken`, `securityHub`, `dao`).
	- `setVFIDE` and `setDAO` now reject zero-address assignments.
- Added regression checks in `__tests__/contracts/VaultHub.test.ts` for zero-address setter rejections.
- Additional lightweight-vault hardening (historical, now retired) previously landed in `contracts/VaultHubLite.sol` / `UserVaultLite`:
	- `UserVaultLite` constructor now rejects zero core addresses.
	- `setGuardian` now prevents duplicate guardian addresses across slots (prevents approval-count inconsistencies).
	- CREATE2 salt now uses stable user-only salt helper for deterministic prediction parity between deployment and `predictVaultAddress`.
- Added regression checks in legacy suite `__tests__/contracts/VaultHubLite.test.ts` for duplicate-guardian rejection and deterministic prediction behavior.
- Vault-system correctness fixes applied:
	- `contracts/UserVault.sol`: inheritance guardian-cancel voting now uses dedicated `cancelApprovals`/`cancelVoted` accounting (no overlap with inheritance-finalization approvals).
	- `contracts/UserVault.sol`: simplified guardian maturity gate in recovery request path (`require(isGuardianMature(...))`) for clarity and auditability.
	- `contracts/VaultHub.sol`: forced recovery approvals are now bound to a single candidate owner per vault nonce (`recoveryCandidateForNonce`), preventing candidate mismatch during multi-approver flow.
	- `contracts/VaultRegistry.sol`: replaced `_hasGuardians` placeholder with real guardian-count tracking (`guardianCountOfVault`), and added collision-safe phone recovery mapping updates.
- Added regression checks in:
	- `__tests__/contracts/UserVault.test.ts`
	- `__tests__/contracts/VaultHub.test.ts`
	- `__tests__/contracts/VaultRegistry.test.ts`
- Validation run: compile + focused suites passed (`136/136`) across the three vault feature test files above.

### Feature 2: Chain of Return
Status: Reviewed + aligned
Notes:
- Canonical path alignment completed: `VaultHub` deploys `contracts/UserVault.sol`, and Chain-of-Return local verifier now targets `artifacts/contracts/UserVault.sol/UserVault.json`.
- Active vault recovery flow now enforces a 7-day minimum finalize timelock (`RECOVERY_MIN_DELAY`) in addition to guardian-threshold checks.
- Hook decoding alignment completed in `hooks/useVaultRecovery.ts` for current `UserVault` tuple orders:
	- `getRecoveryStatus`: `(proposedOwner, approvals, threshold, expiryTime, active)`
	- `getInheritanceStatus`: `(active, approvals, threshold, expiryTime, denied)`
- Added hook regression check in `__tests__/hooks/useVaultRecoveryReal.test.ts` to prevent tuple-order drift.
- Validation run: compile + hook suite + chain-of-return local verifier all passed.

### Feature 3: Next of Kin
Status: Reviewed + aligned
Notes:
- Canonical path alignment completed: Next-of-Kin local verifier now targets `artifacts/contracts/UserVault.sol/UserVault.json`.
- Active `contracts/UserVault.sol` inheritance flow now enforces:
	- minimum finalize timelock (`INHERITANCE_MIN_DELAY`),
	- guardian-count snapshot thresholding,
	- guardian-change lock while inheritance is active,
	- active-claim outflow locks on owner transfer/execute paths (recovery or inheritance active).
- Verifier flow aligned with production function authz (`finalizeInheritance` called by Next of Kin).
- Validation run: compile + local chain-of-return verifier + local next-of-kin verifier all passed.

### Feature 4: ProofScore & Trust (Seer + social)
Status: Partially reviewed
Notes:
- Mitigated social-state consistency risk: `SeerView` now resolves endorsement and mentor reads from `SeerSocial` whenever `Seer.seerSocial` is configured, while preserving existing frontend-facing method signatures.
- Added `SeerSocial` read helpers (`getEndorserCount`, `getEndorserAt`) to support extension-backed endorsement enumeration.
- Hardened operator reward accounting in `Seer`: reward daily window now tracks per-operator-per-subject (using existing storage), removing stale-counter behavior across subjects.
- Added and validated local verifier: `npm run contract:verify:proofscore-trust:local`.
- Sixth-pass setter-bound hardening in `contracts/VFIDETrust.sol`:
	- `Seer.setBadge` now rejects zero subject addresses and rejects already-expired active badge expiries.
	- `Seer.setBadgeBatch` now enforces the same expiry validity and rejects zero addresses in batch inputs.
	- `ProofScoreBurnRouterPlus.setModules` now requires both Seer and treasury addresses to be non-zero.
	- `ProofScoreBurnRouterPlus.setPolicy` now enforces internal bps consistency so configured burn/reward + high-trust boost/low-trust penalty paths cannot exceed `maxTotalBps`.
- Added regression checks in `__tests__/contracts/VFIDETrust.test.ts` for zero-subject badge setting and out-of-bounds router policy.
- Validation run: compile + targeted tests passed (`63/63`) across:
	- `__tests__/contracts/VFIDETrust.test.ts`
	- `__tests__/contracts/BadgeManager.test.ts`
- Deploy-size mitigation applied for `contracts/VFIDETrust.sol` in Hardhat override (`metadata.bytecodeHash = "none"`), removing prior Seer runtime code-size warning during targeted compile validation.
- Final Seer size-fix follow-up applied: removed unused public mapping getter `operatorRewardDayStart` from `Seer`, and kept `VFIDETrust` on size-focused compiler override (`runs=0`, `viaIR=true`, `metadata.bytecodeHash="none"`).
- Validation run: full clean compile + focused tests passed (`63/63`) across `__tests__/contracts/VFIDETrust.test.ts` and `__tests__/contracts/BadgeManager.test.ts` with no size warnings emitted.
- Remaining discussion: endorsement anti-abuse economics and governance bounds for social policy tuning.

### Feature 5: Fee/Burn Router + Treasury allocation
Status: Partially reviewed
Notes:
- Fixed stale-snapshot fee scoring risk in `ProofScoreBurnRouter`: when score history is stale beyond the window, router now falls back to current `Seer` score instead of stale snapshot.
- Aligned split-ratio helper with runtime split semantics (40/10/50) to avoid operator/UI drift.
- Added and validated local invariant verifier: `npm run contract:verify:fee-burn-router:local`.
- Remaining discussion: governance bounds for sustainability/adaptive-fee knobs and sink-address operational controls.

### Feature 6: Ecosystem work rewards (merchant/referral)
Status: Partially reviewed
Notes:
- Fixed pool-isolation risk in `EcosystemVault`: legacy `payExpense` and `burnFunds` now debit only `operationsPool` after `allocateIncoming`, preventing silent depletion of merchant/referral work-reward reserves.
- Added accounting consistency updates: `totalExpensesPaid` and `totalBurned` now increment at spend/burn time; council distributions now increment `totalCouncilPaid`.
- Updated vault health aggregate to include `operationsPool` and tracked legacy outflows in `totalIn`, keeping health totals internally coherent.
- Added and validated local invariant verifier: `npm run contract:verify:ecosystem-work-rewards:local`.
- Remaining discussion: emergency owner timelock-withdraw policy boundaries relative to reserved pool guarantees.
- Fourth-pass setter-bound hardening: `contracts/LiquidityIncentives.sol` now enforces non-zero unstake cooldown floor (`MIN_UNSTAKE_COOLDOWN`) alongside existing max cooldown bound, preventing accidental/no-cooldown anti-flash-loan bypass configuration.
- Seventh-pass setter hardening in `contracts/VFIDEBenefits.sol`:
	- `setAuthorizedCaller` now rejects zero address assignments.
	- `rewardTransaction` now rejects zero buyer/merchant addresses.
- Added regression checks in `__tests__/contracts/VFIDEBenefits.test.ts` for both guardrails.

### Feature 7: Merchant & payment flows
Status: Partially reviewed
Notes:
- Fixed escrow conflict-of-interest gap: `EscrowManager.resolveDisputePartial` now rejects calls from dispute principals (`buyer` / `merchant`), matching full-dispute resolution neutrality.
- Added local merchant/payment/escrow invariant verifier to exercise dispute and timeout lifecycle safety: `npm run contract:verify:merchant-payment-escrow:local`.
- Remaining discussion: explicit governance policy for DAO/arbiter split on partial resolutions in high-value disputes.
- Fourth-pass setter-bound hardening in `contracts/VFIDEEnterpriseGateway.sol`:
	- `setOracle` and `setMerchantWallet` now reject zero-address assignments.
	- `configureStableSettlement` now requires non-zero router/stablecoin when enabled and rejects setting settlement stablecoin to the core VFIDE token address.
- Added regression checks in existing test suite for the above guards (`__tests__/contracts/VFIDEEnterpriseGateway.test.ts`).

### Feature 9: Governance & DAO/timelocks
Status: Partially reviewed
Notes:
- Third-pass setter-bound hardening applied to governance-adjacent modules:
	- `contracts/CouncilElection.sol`: tighter bounds in `setParams` and `setTermLimits` for term duration, candidate windows, voting windows, council-size constraints, and cooldown policy.
	- `contracts/MerchantPortal.sol`: bounded swap path length and stricter swap config sanity checks (non-zero nodes, bounded bps, bounded slippage).
	- `contracts/GovernanceHooks.sol`: setter guards now enforce non-zero DAO and non-zero Seer module addresses.
	- `contracts/DutyDistributor.sol`: points-config setters now enforce hard bounds and internal consistency constraints.
- Validation run: compile + focused contract tests all passed (`128/128`) across:
	- `__tests__/contracts/CouncilElection.test.ts`
	- `__tests__/contracts/MerchantPortal.test.ts`
	- `__tests__/contracts/GovernanceHooks.test.ts`
	- `__tests__/contracts/DutyDistributor.test.ts`
- Follow-up fix included replacing deprecated Solidity `years` denomination with day-based constants in `CouncilElection` for compiler compatibility.
- Additional fourth-pass validation run after subsequent setter hardening remained green:
	- compile passed,
	- `__tests__/contracts/VFIDEEnterpriseGateway.test.ts` and `__tests__/contracts/LiquidityIncentives.test.ts` passed (`39/39`).
- Fifth-pass hardening added governance-safety guards in `contracts/SanctumVault.sol`:
	- `removeApprover` now prevents reducing approvers below `approvalsRequired` (avoids disbursement deadlock).
	- emergency recovery cancel/execute now require existing request IDs (`requestedAt != 0`).
	- emergency recovery requests now require non-zero token address.
- Fifth-pass hardening added treasury rescue input validation in `contracts/VFIDEFinance.sol` (`rescueToken` now rejects zero token address).
- Added regression checks in existing suites:
	- `__tests__/contracts/SanctumVault.test.ts` (threshold-violation removal + emergency request-id/token guards),
	- `__tests__/contracts/VFIDEFinance.test.ts` (zero-token rescue rejection).
- Validation run: compile + focused tests passed (`41/41`) for:
	- `__tests__/contracts/SanctumVault.test.ts`
	- `__tests__/contracts/VFIDEFinance.test.ts`
- Seventh-pass governance hardening in `contracts/CouncilManager.sol`:
	- `setModules` now rejects all-zero/no-op updates (`CM: no updates`).
	- `ModulesSet` now emits effective module addresses after applying updates (prevents misleading zero-address event payloads).
- Added regression check in `__tests__/contracts/CouncilManager.test.ts` for all-zero `setModules` rejection.
- Combined seventh-pass validation run passed (`159/159`) across:
	- `__tests__/contracts/VFIDEBenefits.test.ts`
	- `__tests__/contracts/CouncilManager.test.ts`
	- `__tests__/contracts/VFIDETrust.test.ts`
	- `__tests__/contracts/BadgeManager.test.ts`
- Full clean compile sweep (`hardhat clean` + compile) still reports deploy-size warnings on:
- Follow-up size-mitigation pass resolved both previously reported warnings:
	- `contracts/VFIDETrust.sol` (`Seer`) no longer emits over-size warning,
	- `contracts/DeployPhases3to6.sol` (`DeployPhase3`) no longer emits over-size warning.
- Additional validation after latest hardening pass remained green:
	- `__tests__/contracts/StablecoinRegistry.test.ts`
	- `__tests__/contracts/VaultHub.test.ts`
	- combined result `84/84`.
- Final deploy-size stabilization:
	- `contracts/DeployPhases3to6.sol` received a final bytecode trim (custom-error migration + compact event strings + non-essential verification helper removal),
	- clean compile now emits no size warnings.
- Revalidation pass (March 5, 2026):
	- baseline compile, forced compile, and clean rebuild all reported `0` Solidity warnings,
	- no active contract-size warning or declaration-shadow warning was reproducible,
	- current optimization overrides in `hardhat.config.ts` remain sufficient for warning-free compile output.
- Governance timelock guardrail follow-up (March 5, 2026):
	- Patched `contracts/DAOTimelock.sol` to reject zero-address queue targets in queue paths (prevents malformed/no-op or burn-target queue entries).
	- Added Feature 9 verifier: `scripts/verify-feature9-governance-timelock.ts` + local harness `scripts/verify-feature9-governance-local.sh`.
	- Added npm scripts:
		- `contract:verify:feature9:governance`
		- `contract:verify:feature9:governance:local`
	- Validation run passed:
		- `npx hardhat compile`
		- `npm run -s contract:verify:feature9:governance:local`

### Feature 15: Privacy/stealth/time-lock/multisig specialty modules
Status: Partially reviewed
Notes:
- Hardening in `contracts/StablecoinRegistry.sol`:
	- `addStablecoin` now enforces decimal bounds (`1..18`) and non-empty/max symbol length bounds.
	- `setAllowed` now rejects zero token address.
	- `setTreasury` now rejects zero treasury address.
- Added regression checks in `__tests__/contracts/StablecoinRegistry.test.ts` for empty-symbol and zero-treasury rejections.

### Feature 14: Cross-chain/bridge and multi-chain operations
Status: Partially reviewed
Notes:
- Hardened `VFIDEBridge` sensitive owner controls to schedule/apply with `CONFIG_TIMELOCK_DELAY`:
	- security module updates,
	- max bridge amount,
	- bridge fee,
	- fee collector,
	- emergency withdraw execution.
- Added explicit cancel paths for all pending bridge config/withdraw actions to reduce operator error risk.
- Blocked emergency withdrawal of core `vfideToken` bridge liquidity (`emergencyWithdraw` now only for non-core token rescue).
- Added and validated local verifier: `npm run contract:verify:bridge-governance:local`.
- Remaining discussion: whether pause/unpause should remain immediate emergency powers or move to constrained guardian/timelock governance.
- Fifth-pass bridge security hardening: `contracts/BridgeSecurityModule.sol#setRequiredOracles` now rejects zero threshold to prevent disabling oracle consensus checks.
- Additional bridge-security setter hardening in `contracts/BridgeSecurityModule.sol`:
	- `setUserLimits` now rejects zero limits and enforces `hourly <= daily`.
	- `setWhitelist` and `setBlacklist` now reject zero-address users.
- Added new targeted test suite: `__tests__/contracts/BridgeSecurityModule.test.ts`.
- Validation run: focused suites passed (`21/21`) for legacy `__tests__/contracts/VaultHubLite.test.ts` and `__tests__/contracts/BridgeSecurityModule.test.ts`.

(Features 8-16: Pending deep review)

### Feature 12: API security/authz surface
Status: Partially reviewed
Notes:
- Completed unbounded-input scan on high-traffic API endpoints (`activities`, `attachments/upload`, `errors`).
- Hardened `app/api/activities/route.ts` with explicit payload bounds:
	- `activityType` max length,
	- `title` max length,
	- `description` max length,
	- `data` object-only + max serialized bytes.
- Hardened `app/api/attachments/upload/route.ts` with strict request shape and bounds:
	- JSON object parsing/validation,
	- required `fileType` and `fileSize`,
	- filename and URL max lengths,
	- URL parse + protocol allowlist (`http/https`),
	- file size lower/upper bounds,
	- validation before DB user lookup.
- Added regression tests for both hardened endpoints:
	- `__tests__/api/activities.test.ts` (oversized title/data rejection),
	- `__tests__/api/attachments/upload.test.ts` (invalid protocol and zero-size file rejection).
- Validation run: targeted API tests passed (`18/18`).
- Second-pass hardening completed on remaining input-boundary surfaces:
	- `app/api/performance/metrics/route.ts` GET now enforces positive limits and bounds metric filter length.
	- `app/api/messages/route.ts` PATCH now enforces `messageIds` as positive integers only.
- Added second-pass regressions:
	- `__tests__/api/performance/metrics.test.ts` (invalid limit + oversized metric filter),
	- `__tests__/api/messages.test.ts` (invalid `messageIds` element types).
- Validation run: second-pass targeted API tests passed (`24/24`).
- Additional endpoint hardening completed:
	- `app/api/security/violations/route.ts`: GET `limit` now enforces positive integer and caps to bounded max.
	- `app/api/friends/route.ts`: GET now enforces bounded `limit`/`offset`, validates `status` against allowlist, and applies SQL `LIMIT/OFFSET`.
- Added regressions:
	- `__tests__/api/security/violations.test.ts` (non-positive limit rejection + max-limit capping).
	- `__tests__/api/friends.test.ts` (invalid status rejection, invalid pagination rejection, and limit cap behavior).
- Validation run: targeted API suites passed (`15/15`) for the two files above.
- Auth/ownership alignment follow-up completed:
	- `lib/auth/middleware.ts` now exports shared request token resolution (`Authorization` header first, then HTTPOnly cookie) via `getRequestAuthToken`, and `verifyAuth` now uses this centralized path.
	- `app/api/auth/logout/route.ts` and `app/api/auth/revoke/route.ts` now use the shared resolver to keep header/cookie auth handling consistent.
	- `app/api/attachments/upload/route.ts` and `app/api/attachments/[id]/route.ts` now resolve uploader ownership with case-insensitive wallet matching (`LOWER(wallet_address) = LOWER($1)`) to avoid checksum/case mismatch false negatives.
	- Updated regression suite `__tests__/api/auth/revoke.test.ts` to cover the shared token resolver path.
- Validation run: targeted auth + attachment suites passed (`19/19`) across:
	- `__tests__/api/auth/logout.test.ts`
	- `__tests__/api/auth/revoke.test.ts`
	- `__tests__/api/attachments/upload.test.ts`
	- `__tests__/api/attachments/id.test.ts`
