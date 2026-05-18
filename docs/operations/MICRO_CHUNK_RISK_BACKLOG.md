# VFIDE Micro-Chunk Risk Backlog

Date: 2026-03-30
Scope: architecture chunking, failure-mode enumeration, strict risk backlog, Chunk 1 and Chunk 2 deep checks

## Micro-Chunk Map

1. Auth, Session, Request Integrity
2. API Authorization and Ownership Boundaries
3. Abuse Controls (Rate Limits, Lockouts, Replay)
4. Vault Custody and Recovery Path
5. Token Transfer Policy and Fee/Burn Routing
6. Governance and Timelock Control Plane
7. Bridge Cross-Chain Delivery and Refund Safety
8. Commerce, Merchant Registry, and Escrow Flows
9. Seer Scoring, Guardian, and Autonomous Enforcement
10. Treasury and Ecosystem Distribution
11. Deployment, Handover, and Role Rotation
12. WebSocket Realtime Transport and ACL

## Failure Modes by Chunk

### 1) Auth, Session, Request Integrity
- Replay of signed login payloads or challenge reuse.
- Missing or inconsistent CSRF checks on state-changing endpoints.
- Host/domain mismatch causing SIWE validation bypass or false reject.
- Cookie scope/flags misconfiguration leading to token exposure.

### 2) API Authorization and Ownership Boundaries
- Endpoint accepts authenticated user but skips ownership check.
- Admin-only endpoint relying on env var list without chain verification.
- Route-level auth drift between similar handlers.

### 3) Abuse Controls (Rate Limits, Lockouts, Replay)
- Rate limiter fail-open on backend outage.
- In-memory fallback weak under horizontal scale.
- Weak client identifier collision or spoofing reducing protection.

### 4) Vault Custody and Recovery Path
- Guardian threshold misconfiguration enabling premature recovery.
- Recovery nonce/candidate mismatch leading to replay or stale approvals.
- SecurityHub lock state not enforced in all critical vault actions.

### 5) Token Transfer Policy and Fee/Burn Routing
- Sink mismatch causing transfer reverts or wrong destination.
- Circuit-breaker and bypass flags diverging from intended behavior.
- Anti-whale preview vs actual accounting drift under fee logic.

### 6) Governance and Timelock Control Plane
- Emergency path bypassing intended dual-approval/timelock.
- Expired queued actions still executable.
- Policy setters not consistently delay-protected.

### 7) Bridge Cross-Chain Delivery and Refund Safety
- Missing destination confirmation allowing refund double-spend.
- Pending remote/module changes applied before delay.
- Emergency withdraw path abuse under compromised owner key.

### 8) Commerce, Merchant Registry, and Escrow Flows
- Merchant suspension/delist states not uniformly enforced in pay flow.
- Escrow authorization boundary bypass (DAO vs authorized escrow).
- Timeout/dispute transitions enabling inconsistent settlement.

### 9) Seer Scoring, Guardian, and Autonomous Enforcement
- Cross-operator score manipulation through distributed caps.
- PolicyGuard or SeerAutonomous module change abuse.
- Score history/snapshot edge cases impacting governance weight.

### 10) Treasury and Ecosystem Distribution
- Allocation updates causing underflow of required buckets.
- Work reward payout controls bypassing expected manager checks.
- Operations withdrawal cooldown/limits inconsistently enforced.

### 11) Deployment, Handover, and Role Rotation
- EOA ownership retained longer than intended.
- Handover sequence incomplete or armed without finalization evidence.
- Environment/address drift between contracts and frontend ABIs.

### 12) WebSocket Realtime Transport and ACL
- Upgrade origin allowlist misconfiguration in production.
- Topic ACL reload failure leaving stale permissions.
- Auth timeout or message validation bypass under malformed frames.

## Strict Risk Todo Backlog

- R-001 [high] Replace rate-limit fail-open behavior with controlled fail-closed mode for auth/write classes.
- R-002 [high] Add explicit test coverage proving proxy-based CSRF validation executes for representative POST/PATCH/DELETE API routes.
- R-003 [high] Add regression tests for SIWE domain derivation under reverse proxy host/header configurations.
- R-004 [high] Add authorization consistency tests for owner/admin boundaries on mutable API endpoints.
- R-005 [high] Run focused invariant review for vault recovery approvals, nonce handling, and lock enforcement.
- R-006 [high] Run focused invariant review for governance emergency paths and timelock replacement flows.
- R-007 [high] Run bridge delivery-confirmation and refund race tests under reordered message delivery.
- R-008 [medium] Harden client identifier strategy for rate limiting (reduce spoof/collision susceptibility).
- R-009 [medium] Add CORS behavior tests around proxy response header attachment on API requests.
- R-010 [medium] Verify merchant/escrow state-machine transitions via scenario matrix tests.
- R-011 [medium] Verify ecosystem treasury payout guards and manager boundaries through focused tests.
- R-012 [medium] Validate websocket ACL reload and origin policy behavior under production config permutations.
- R-013 [high] Gate hosted checkout status mutations behind a signed intent or authenticated principal to prevent unauthenticated invoice state tampering.
- R-014 [high] Add integrity protection (auth or signed telemetry token) on security event ingest endpoints to prevent event poisoning.
- R-015 [medium] Add authorization tests for all mutable API handlers that intentionally remain public and document rationale.
- R-016 [high] Add failure-policy controls for rate limiter errors (fail-closed for auth/write/claim, configurable fail-open only for low-risk read).
- R-017 [medium] Replace placeholder rate-limit tests with behavior tests that invoke withRateLimit and assert 429/Retry-After semantics.
- R-018 [medium] Add focused recovery scenario tests for VaultHub and UserVaultLegacy (nonce replay, candidate mismatch, stale approvals, guardian cancellation edge-cases).

## Chunk 1 Deep Check (Completed)

Target: Auth, Session, Request Integrity

Evidence reviewed:
- app/api/auth/challenge/route.ts
- app/api/auth/route.ts
- lib/auth/cookieAuth.ts
- lib/auth/middleware.ts
- lib/security/csrf.ts
- lib/security/csrfPolicy.ts
- proxy.ts

Focused tests executed:
- npx jest __tests__/api/auth.test.ts __tests__/api/auth-challenge.test.ts __tests__/security/siweChallenge.test.ts --runInBand
- Result: 3 suites passed, 22 tests passed, 0 failed

Validated controls:
- SIWE challenge storage/consume path includes replay protection and request fingerprint checks.
- Auth cookies are httpOnly, secure in production, sameSite strict.
- CSRF validation is centralized through proxy for state-changing API methods with scoped exemptions.

Findings from Chunk 1:
- F1-1 [high] Rate limiting currently fails open on errors in lib/auth/rateLimit.ts (returns success true in catch block).
- F1-2 [medium] Proxy-based CSRF coverage is strong by design, but route-level regression tests proving global enforcement are missing.

## Next Chunk

Chunk 2 execution target: API Authorization and Ownership Boundaries

Immediate deep-check tasks:
1. Build a list of mutable API routes and map auth/ownership guard usage.
2. Identify routes that mutate user-scoped or admin-scoped data without explicit ownership/admin checks.
3. Run focused route tests for any suspect endpoints and convert confirmed issues into backlog items.

## Chunk 2 Deep Check (Completed)

Target: API Authorization and Ownership Boundaries

Evidence reviewed:
- app/api/merchant/checkout/[id]/route.ts
- app/api/security/guardian-attestations/route.ts
- app/api/security/next-of-kin-fraud-events/route.ts
- app/api/security/qr-signature-events/route.ts
- app/api/security/recovery-fraud-events/route.ts
- app/api/security/csp-report/route.ts
- app/api/security/webhook-consumer-example/route.ts

Inventory method:
- Enumerated all mutable route handlers.
- Mapped files with explicit requireAuth/requireOwnership/requireAdmin/withAuth guards.
- Isolated mutable files with no explicit guard for triage.

Findings from Chunk 2:
- F2-1 [high] Hosted checkout PATCH endpoint is intentionally unauthenticated and permits invoice status mutation (view and pending_confirmation) using only payment link id and client-provided tx_hash. This allows third-party workflow tampering and operational confusion if link ids are discovered.
- F2-2 [high] Multiple security telemetry ingest endpoints accept unauthenticated writes without signature verification, allowing low-cost event poisoning and noisy fraud dashboards despite rate limits.
- F2-3 [low] CSP report endpoint is intentionally public and constrained by schema/content-type/rate-limit; risk is primarily log noise, not privilege escalation.

Validated non-findings in Chunk 2:
- Webhook consumer example validates replay/signature before accept.
- Auth challenge and auth login endpoints are public by design and validated by SIWE cryptographic checks.

## Next Chunk

Chunk 3 execution target: Abuse Controls (Rate Limits, Lockouts, Replay)

Immediate deep-check tasks:
1. Model fail-open and distributed fallback behavior in rate limiting and lockout paths.
2. Add focused tests to simulate limiter backend failure and assert expected control posture.
3. Propose policy split (fail-closed for auth/write, fail-open for low-risk read) with test-backed acceptance criteria.

## Chunk 3 Deep Check (Completed)

Target: Abuse Controls (Rate Limits, Lockouts, Replay)

Evidence reviewed:
- lib/auth/rateLimit.ts
- lib/security/accountProtection.ts
- __tests__/security/rate-limiting.test.ts
- lib/security/__tests__/accountProtection.test.ts

Focused tests executed:
- npx jest __tests__/security/rate-limiting.test.ts lib/security/__tests__/accountProtection.test.ts --runInBand
- Result: 2 suites passed, 53 tests passed, 0 failed

Findings from Chunk 3:
- F3-1 [high] Rate limiter returns success on internal errors (fail-open) for all classes, including auth/write/claim, creating a defensive control gap during backend failures.
- F3-2 [medium] Existing rate-limit test suite is largely policy/constant assertions and does not verify real enforcement behavior through withRateLimit request flows.

Validated controls in Chunk 3:
- Account-protection path has DB-unavailable fallback and lock escalation behavior covered by focused tests.
- Security lock severity escalation is implemented and test-covered in fallback mode.

## Next Chunk

Chunk 4 execution target: Vault Custody and Recovery Path

Immediate deep-check tasks:
1. Trace forced recovery and guardian approval/nonces across VaultHub and legacy vault paths.
2. Verify lock checks are consistently enforced before critical transfers/execute flows.
3. Build a stale-approval and replay scenario matrix and map missing tests.

## Chunk 4 Deep Check (Completed)

Target: Vault Custody and Recovery Path

Evidence reviewed:
- contracts/VaultHub.sol
- contracts/VaultInfrastructure.sol
- contracts/CardBoundVault.sol
- test/hardhat/SecurityFixes.test.ts

Findings from Chunk 4:
- F4-1 [medium] Recovery-path test depth is sparse: current coverage confirms council approval wiring but does not exercise replay/stale-approval/candidate-mismatch and cancellation edge-cases across full lifecycle transitions.
- F4-2 [low] Inheritance cancellation path in legacy vault is guardian-gated but lacks guardian maturity enforcement symmetry used by approval paths, increasing governance-noise/grief surface rather than direct fund-theft risk.

Validated controls in Chunk 4:
- Forced recovery flow in VaultHub uses nonce tracking and candidate consistency checks before finalization.
- Critical token movement and execute paths in legacy and card-bound vaults enforce locked/frozen gates.

## Next Chunk

Chunk 5 execution target: Token Transfer Policy and Fee/Burn Routing

Immediate deep-check tasks:
1. Re-verify sink validation and fallback routing across transfer, preview, and expected-net paths.
2. Check emergency flag expiry synchronization behavior and edge cases around bypass flags.
3. Map remaining scenario-test gaps for anti-whale + fee-routing interactions.

## Chunk 5 Deep Check (Completed)

Target: Token Transfer Policy and Fee/Burn Routing

Evidence reviewed:
- contracts/VFIDEToken.sol
- contracts/ProofScoreBurnRouter.sol
- test/hardhat/VFIDEToken.test.ts
- test/hardhat/SecurityGuardrails.test.ts

Focused tests executed:
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/VFIDEToken.test.ts test/hardhat/SecurityGuardrails.test.ts
- Result: 14 suites passed, 30 tests passed, 0 failed

Findings from Chunk 5:
- F5-1 [high] Fee routing in VFIDEToken transfer path is fail-open on burn router errors: when computeFeesAndReserve reverts (for example router paused/misconfigured), token catches and logs ExternalCallFailed but continues transfer with full gross amount and no fee deductions.
- F5-2 [high] Burn sink policy mismatch can disable fee deductions operationally: ProofScoreBurnRouter allows non-zero dedicated burnSink addresses, while VFIDEToken only accepts burn sink outputs equal to treasury/sanctum (or zero), causing a revert in fee branch that is currently swallowed by the same fail-open catch.
- F5-3 [medium] Current focused tests validate normal fee-path parity and preview behavior, but do not include a regression asserting expected behavior when burn router reverts under policyLocked (where operators likely expect fee enforcement to remain strict).

Validated controls in Chunk 5:
- Anti-whale projected checks and persisted daily accounting are aligned to expected net flow under active fee routing.
- Emergency bypass flags are independent and auto-expire via sync logic, with focused test coverage.
- Router computeFees and computeFeesAndReserve parity is covered for identical inputs.

## Backlog Additions (Chunk 5)

- R-019 [high] Enforce fail-closed fee routing when burn router computation reverts (or explicitly revert transfers when policyLocked and fee path is unavailable).
- R-020 [high] Reconcile burn sink policy between VFIDEToken and ProofScoreBurnRouter to prevent sink mismatch from silently downgrading to zero-fee transfers.
- R-021 [medium] Add transfer-path tests for paused/misconfigured burn router behavior under policyLocked and non-policyLocked modes.

## Next Chunk

Chunk 6 execution target: Governance and Timelock Control Plane

Immediate deep-check tasks:
1. Trace emergency and fast-path governance execution routes versus queued timelock routes.
2. Verify policy setter and module replacement functions are consistently delay-protected.
3. Build a focused matrix for cancellation, expiry, and replay of queued operations.

## Chunk 6 Deep Check (Completed)

Target: Governance and Timelock Control Plane

Evidence reviewed:
- contracts/DAOTimelock.sol
- contracts/DAO.sol
- contracts/SeerPolicyGuard.sol
- contracts/EmergencyControl.sol
- contracts/SystemHandover.sol

Focused tests executed:
- npx jest __tests__/governance/governance-timelock-operations-audit.test.ts --runInBand
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/SystemHandoverSecurity.test.ts
- Result: 2 suites passed, 59 tests passed, 0 failed

Findings from Chunk 6:
- F6-1 [high] DAO emergency dual-approval can collapse to single-admin approval in bootstrap mode: when emergencyApprover is a contract, admin self-approval is explicitly allowed in approveEmergencyQuorumRescue and approveEmergencyTimelockReplacement, reducing intended two-party control for emergency actions.
- F6-2 [medium] DAOTimelock executeBySecondary does not mirror ERC20 false-return validation in execute, so token calls that return false (without revert) may be treated as successful and mark operations done.
- F6-3 [medium] Governance emergency paths are validated mostly by source-pattern Jest assertions; focused on-chain execution-path tests for full emergency lifecycle (initiate/approve/cancel/execute with bootstrap approver modes) are limited.

Validated controls in Chunk 6:
- Timelock delay setter and admin setter are self-call gated via onlyTimelockSelf.
- Emergency delay reduction in DAOTimelock is bounded (one-shot flag, cooldown, and minimum bound).
- Queued operation expiry and cleanup/requeue controls exist with explicit tracking caps.
- SystemHandover enforces armed+mature execution and one-time authority burn.

## Backlog Additions (Chunk 6)

- R-022 [high] Remove or hard-bound bootstrap self-approval path for DAO emergency approvals (or require a separate independent signer even when emergencyApprover is a contract).
- R-023 [medium] Add return-value parity checks in DAOTimelock executeBySecondary for ERC20-style calls, matching execute behavior.
- R-024 [medium] Add on-chain governance emergency lifecycle tests covering contract approver bootstrap mode, cancellation races, and execution authorization boundaries.

## Next Chunk

Chunk 7 execution target: Bridge Cross-Chain Delivery and Refund Safety

Immediate deep-check tasks:
1. Trace bridge tx identity, delivery-confirmation, and refund state transitions for replay/double-finalization exposure.
2. Verify pending remote/peer/module updates are consistently timelocked and cancellation-safe.
3. Build adversarial message-order scenarios for delivery confirmation versus refund eligibility.

---

## Pre-Chunk 7 Workspace Triage (2026-03-30)

### External Audit Cross-Reference (VFIDE_Deep_Audit_2026.md — March 29 2026)

An external audit document (7C, 9H, 11M) was found in the workspace (`.audit_unpack/VFIDE_Deep_Audit_2026.md`).
All critical findings in scope were cross-checked against current code.

**Critical findings already remediated in code:**

| ID | Title | Status |
|----|-------|--------|
| C-04 | Bridge Refund Double-Spend: No Cross-Chain Delivery Confirmation | FIXED — `_lzReceive` calls `_sendDeliveryConfirmation()` immediately after releasing tokens; `MSG_TYPE_BRIDGE_CONFIRMATION` handler closes refund window via `_confirmBridgeDelivery()`. VFIDEBridgeGuardrails.test.ts: 3/3 pass. |
| C-05 | FeeDistributor.setDestination() — Instant Redirect, No Timelock | FIXED — setDestination now creates a PendingDestinationChange with DESTINATION_CHANGE_DELAY; executeDestinationChange and cancelDestinationChange complete the pattern. |
| C-07 | FeeDistributor Burn Channel Doesn't Actually Burn | FIXED — FeeDistributor.distribute() calls `vfideToken.burn(toBurn)` (actual supply-reduction burn), not safeTransfer. |

**Findings that map to existing backlog items:**

| ID | Title | Backlog Ref |
|----|-------|-------------|
| C-01 | Burn Sink Validation Gap — Silent Fee Theft via BurnRouter | → R-020 (F5-2) |
| C-03 | Router Pause Creates Transfer DoS with No Graceful Degradation | → R-019 (F5-1) |
| C-02 | VaultHub.setModules() Bypasses F-20 SecurityHub Timelock | not yet in backlog — add as R-025 |
| C-06 | SIWE Challenge Store Is In-Memory — Breaks Multi-Instance Auth | API layer; note in Chunk 1/3 scope |

### New Backlog Item from Triage

- R-025 [resolved] VaultHub.setModules() can bypass SecurityHub timelock — VALIDATED NOT A VULNERABILITY. The setModules() function is intentionally disabled (line 97-100) with explicit revert "VH: use individual setters". All module updates (setSecurityHub, setVFIDE, setProofLedger, setDAO) follow the individual schedule/apply pattern with 48h SECURITY_HUB_CHANGE_DELAY. No bypass path exists.

### Workspace Deletions — Confirmed Intentional

- `__tests__/contracts/*.test.ts` (31 files): Migrated to `test/hardhat/` on-chain Hardhat test suite.
- `lib/callSystem.ts`, `lib/communitiesSystem.ts`, `lib/eciesEncryption.ts`, `lib/mediaSharing.ts`, `lib/offlineQueue.ts`, `lib/transactionRetry.ts`: Feature removals; no remaining imports in app/lib/components.
- Root markdown files `05-VaultInfrastructure.md` through `13-VFIDESecurity.md`: Old audit doc fragments cleaned up.

### New Infrastructure Confirmed Safe

- `migrations/20260329_120000_sync_state.sql`: Adds sync_state table for offline-first sync; idiomatic UP/DOWN pattern.
- `scripts/backup-db.sh` / `npm run migrate:up`: DB ops tooling; review on deploy prep but not a security blocker.
- `test/hardhat/FeeDistributorGuardrails.test.ts`: 3/3 pass (burns, destination-timelock, cancel).
- `test/hardhat/VFIDEBridgeGuardrails.test.ts`: Ready for Chunk 7 execution.

### Triage Verdict

Workspace is **clean to proceed with Chunk 7**. No broken imports, no regressions from deletions.
Large zip archives (`Vfide-full-repo-audit-complete.zip`, `newaudit.zip`, `.audit_unpack/`) added to .gitignore.

---

## Chunk 7 Deep Check (Completed)

Scope: Bridge Cross-Chain Delivery and Refund Safety
Date: 2026-03-30
Contract: contracts/VFIDEBridge.sol (784 lines)

Focused tests executed:
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/VFIDEBridgeGuardrails.test.ts
- Result: 1 suite, 3 tests passed, 0 failed

Tests covered:
1. Peer sync on applyTrustedRemote: trustedRemotes[chainId] and _setPeer are set atomically on apply.
2. Refund window closed by delivery confirmation: after source bridge() + destination _lzReceive() + confirmation callback, bridgeRefundableAfter[txId] = 0 and btx.executed = true; claimBridgeRefund reverts.
3. Refund path for undelivered transactions: after 7 days with no delivery, user reclaims amountAfterFee.

Architecture review: lock-on-source / release-on-destination model. Confirmation uses a reverse MSG_TYPE_BRIDGE_CONFIRMATION LayerZero message. All config changes (trustedRemote, securityModule, fee, maxBridgeAmount, feeCollector, emergencyWithdraw) follow the 48h schedule/apply/cancel pattern. Two-step ownership with 7-day expiry.

Findings from Chunk 7:

- F7-1 [high] Delivery confirmation ETH balance dependency allows complete delivery DoS. _lzReceive() calls _sendDeliveryConfirmation() immediately after releasing tokens (line 366); if address(this).balance < fee.nativeFee, _sendDeliveryConfirmation reverts with ConfirmationSendFailed(), rolling back the entire _lzReceive transaction. Tokens are not released to the receiver and the LayerZero message stays in the retry queue blocked until the bridge contract receives native ETH. Any destination bridge with a depleted ETH balance freezes all incoming bridge deliveries from that chain. No graceful fallback path exists (adminMarkBridgeExecuted requires the txId to be known but it is never recorded on the destination side — BridgeTransaction records only exist on the source).

- F7-2 [medium] Bridge fee not refunded on stuck transactions. bridge() deducts fee = (amount * bridgeFee) / 10000 and immediately sends it to feeCollector (line 234); BridgeTransaction.amount stores amountAfterFee. claimBridgeRefund (line 722) returns btx.amount which is amountAfterFee — the user does not recover the bridge fee even if the destination bridge never executes. At bridgeFee=10 bps (0.1%) on 100,000 VFIDE this is 100 VFIDE per stuck transaction.

- F7-3 [medium] Pending config updates have no staleness expiry. setTrustedRemote, setSecurityModule, setBridgeFee, setMaxBridgeAmount, setFeeCollector all create pending changes with effectiveAt = now + 48h but no maximum-age bound. A pending update scheduled months ago can be applied at any future time. This means an admin could schedule an update, decide to leave it pending, and apply it far outside the original operational window — a forgotten attacker-controlled pending change (e.g. from a compromised key that was later rotated) would remain executable indefinitely unless explicitly cancelled.

- F7-4 [low] Confirmation message type decode uses raw assembly without length guard. _decodeMessageType (line 767) uses assembly calldataload on payload.offset without checking payload.length >= 2. A zero-length or 1-byte payload would be accepted without revert, returning messageType = 0 (which hits the `messageType != MSG_TYPE_BRIDGE_TRANSFER` revert path). In the current call path _lzReceive validates payload enough before calling this, but if the decoding logic is reused the missing guard could mask malformed messages.

Validated controls in Chunk 7:
- Double-claim prevented at two independent levels: btx.executed flag AND bridgeRefundableAfter deletion — both checked in claimBridgeRefund.
- Confirmation-then-refund race: _confirmBridgeDelivery silently ignores already-executed txIds; claimBridgeRefund requires !btx.executed — no double-spend path.
- Replay protection: processedInboundGuids[_guid] prevents LayerZero GUID replay.
- Trusted remote peer sync: applyTrustedRemote calls _setPeer atomically with trustedRemotes update.
- VFIDE withdrawal guard: emergencyWithdraw hard-blocks the VFIDE token address.
- Ownership renounce disabled; two-step ownership transfer with 7-day expiry.
- Rate limit integration: security module checked before any token lock.

## Backlog Additions (Chunk 7)

- R-026 [high] Fund and maintain minimum ETH balance in each bridge contract to sustain delivery confirmations; or refactor _sendDeliveryConfirmation to emit a best-effort event and NOT revert _lzReceive on insufficient ETH — instead mark delivery as confirmed and allow admin to backfill confirmation messaging separately. The confirm path failing should not block token release.
- R-027 [medium] Consider refunding bridge fee on claimBridgeRefund (or document the no-refund behavior prominently in user-facing interfaces so users understand the economic risk of 7-day stuck transactions).
- R-028 [medium] Add an expiry bound (e.g. 30 days) to all pending config updates — if not applied within the expiry window, the update is automatically invalidated. This prevents stale scheduled changes from being unexpectedly applied during an incident recovery period.

## Next Chunk

Chunk 8 execution target: Commerce, Merchant Registry, and Escrow Flows

Immediate deep-check tasks:
1. Trace escrow open → dispute → resolution path for conflict-of-interest and state machine bypass.
2. Verify merchant registration ProofScore gating and bypass conditions.
3. Check whether dispute resolution can be triggered by the same party that created the escrow.

## Chunk 8 Deep Check (Completed)

Scope: Commerce, Merchant Registry, and Escrow Flows
Date: 2026-03-30
Contracts: contracts/VFIDECommerce.sol, contracts/EscrowManager.sol, contracts/MerchantPortal.sol

Focused tests executed:
- npx jest __tests__/payments/commerce-escrow-audit.test.ts --runInBand
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/generated/EscrowManager.generated.test.ts test/hardhat/ContractCoverageBackfill.test.ts
- Result: 2 suites, 62 tests passed, 0 failed

Findings from Chunk 8:

- F8-1 [high] CommerceEscrow dispute/refund paths are hard-dependent on MerchantRegistry authorizedEscrow wiring, but no in-repo initialization path was found. MerchantRegistry._noteRefund() and _noteDispute() require msg.sender == authorizedEscrow or dao. CommerceEscrow.refund() and dispute() call these hooks, so if authorizedEscrow is unset, both flows revert and dispute/refund become unavailable. Repository-wide search across contracts/scripts/tests shows no setAuthorizedEscrow wiring outside VFIDECommerce.sol, leaving this as a deployment-time footgun that can strand dispute/refund operations.

- F8-2 [medium] CommerceEscrow does not enforce SecurityHub lock state despite carrying a security module reference. The contract stores ISecurityHub_COM public security but never checks isLocked() in open(), markFunded(), release(), refund(), dispute(), or resolve(). This creates a control-plane mismatch where emergency lock posture can halt MerchantPortal flows but not CommerceEscrow state transitions.

- F8-3 [medium] Merchant can unilaterally trigger escrow funding once buyer opens escrow and has allowance in place. In CommerceEscrow.markFunded(), caller authorization allows buyer, merchant, or dao; when merchant calls, token.safeTransferFrom(e.buyerVault, address(this), e.amount) executes immediately. This is not a direct unauthorized transfer (buyer must open escrow first), but it removes buyer-side confirmation timing and can cause premature debit for stale/open orders.

Validated controls in Chunk 8:
- Merchant registration gating is enforced in MerchantRegistry.addMerchant() via vault existence and Seer score >= minScore.
- Merchant status checks are enforced during CommerceEscrow.open() (NONE/SUSPENDED/DELISTED blocked).
- EscrowManager dispute resolution has explicit conflict-of-interest guard and high-value DAO-only path.
- EscrowManager includes buyer timeout reclaim and dispute timeout fallback to avoid indefinite lock on disputed funds.

## Backlog Additions (Chunk 8)

- R-029 [high] Make MerchantRegistry authorizedEscrow wiring fail-safe: either set it atomically during CommerceEscrow deployment/init, or relax _noteRefund/_noteDispute authorization to accept the active CommerceEscrow address by construction. Add deployment and invariant tests that dispute/refund remain callable after bootstrap.
- R-030 [medium] Enforce SecurityHub lock checks in CommerceEscrow state transitions (at minimum markFunded/release/refund/resolve) so emergency lock semantics are consistent across commerce payment paths.
- R-031 [medium] Restrict CommerceEscrow.markFunded() caller to buyerOwner (or require explicit buyer confirmation signature) to prevent merchant-triggered early debit on open escrows.

## Next Chunk

Chunk 9 execution target: Seer Scoring, Guardian, and Autonomous Enforcement

Immediate deep-check tasks:
1. Validate cross-operator score update caps and aggregate daily limit invariants under multi-operator pressure.
2. Trace SeerAutonomous and policy module update paths for timelock/governance bypass opportunities.
3. Verify score-history/snapshot consistency for governance weight and anti-manipulation edge cases.

## Chunk 9 Deep Check (Completed)

Scope: Seer Scoring, Guardian, and Autonomous Enforcement
Date: 2026-03-30
Contracts: contracts/Seer.sol, contracts/SeerAutonomous.sol, contracts/SeerPolicyGuard.sol

Focused tests executed:
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/SecurityGuardrails.test.ts
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/SecurityFixes.test.ts
- Result: 2 suites, 25 tests passed, 0 failed

Findings from Chunk 9:

- F9-1 [high] Seer policy guard selector constant for operator limits is stale and does not match the live function signature. In Seer.sol, SEL_SET_OPERATOR_LIMITS is defined as keccak256("setOperatorLimits(uint16,uint16)") while the actual function is setOperatorLimits(uint16,uint16,uint32). When policyGuard is enabled, setOperatorLimits() consumes against the stale selector, so normal scheduling with the real ABI selector will not satisfy consume(). This creates an operational governance failure mode where policy-delayed operator-limit updates can be unexpectedly blocked.

- F9-2 [medium] Critical Seer module authority changes are not delay-protected by SeerPolicyGuard. setSeerAutonomous(), setPolicyGuard(), and setOperator() are DAO-only but execute immediately without policy guard scheduling/consumption. A compromised DAO signer can instantly swap enforcement modules or operator privileges before off-chain responders can react, undermining the intended delay envelope used for other high-impact Seer controls.

- F9-3 [medium] Cross-operator cap enforcement lacks focused adversarial tests. Existing Seer tests validate single-operator reward/punish paths and baseline rate limits, but no focused test matrix was found for coordinated multi-operator attempts against subjectGlobalRewardTotal/subjectGlobalPunishTotal and daily window rollover edge cases. This leaves the primary anti-collusion control (maxDailySubjectDelta) under-tested.

Validated controls in Chunk 9:
- Seer enforces per-call, per-operator-subject, per-operator-global, and per-subject-global daily caps in reward()/punish().
- DAO score changes are bounded by maxDAOScoreChange and per-subject cooldown.
- Score history uses a bounded circular buffer (50 entries) and score snapshots sync to burn router via guarded try/catch.
- SeerPolicyGuard schedule/cancel/consume mechanics pass focused hardhat guardrail tests.

## Backlog Additions (Chunk 9)

- R-032 [high] Align SEL_SET_OPERATOR_LIMITS with the live function signature selector (setOperatorLimits(uint16,uint16,uint32)) and add a regression test that schedules with ABI-derived selector then successfully executes setOperatorLimits under policy guard.
- R-033 [medium] Add policy-guard delay protection (or explicit documented exception with compensating controls) for setSeerAutonomous, setPolicyGuard, and setOperator in Seer.
- R-034 [medium] Add dedicated hardhat adversarial tests for multi-operator coordinated reward/punish attempts to prove maxDailySubjectDelta enforcement and window reset behavior.

## Next Chunk

Chunk 10 execution target: Treasury and Ecosystem Distribution

Immediate deep-check tasks:
1. Verify allocation/bucket invariants and underflow-resistant accounting in treasury distribution paths.
2. Audit reward payout manager boundaries and DAO authorization checks for fund movement.
3. Validate cooldown/limit controls for operational withdrawals and emergency spend paths.

## Chunk 10 Deep Check (Completed)

Scope: Treasury and Ecosystem Distribution
Date: 2026-03-30
Contracts: contracts/EcosystemVault.sol, contracts/FeeDistributor.sol, contracts/DutyDistributor.sol

Focused tests executed:
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/EcosystemVault.test.ts test/hardhat/FeeDistributorGuardrails.test.ts test/hardhat/generated/DutyDistributor.generated.test.ts
- Result: 3 suites, 6 tests passed, 0 failed

Findings from Chunk 10:

- F10-1 [high] EcosystemVault operations spending path is manager-driven with no timelock or spend cap per call. Any active manager can call payExpense(recipient, amount, reason) and transfer arbitrary amounts out of operationsPool immediately. Owner can grant manager rights instantly via setManager(). Combined with setAllocations() (which can shift operations share to 85%), this creates a high-trust-key concentration where treasury outflows can be rapidly redirected without delay protections.

- F10-2 [medium] Emergency withdraw cap is enforced per request, not cumulatively across pending requests. requestWithdraw() checks amount <= balance * maxWithdrawBps at scheduling time, but multiple parallel requests can each satisfy the cap and later be executed after timelock, exceeding the intended aggregate outflow bound.

- F10-3 [medium] Treasury outflow control tests are shallow for privileged-path abuse. Current hardhat coverage for EcosystemVault only validates payExpense accounting ordering under swap/fallback flows; no tests were found for manager privilege abuse, withdraw request batching against maxWithdrawBps, or cooldown/timelock race scenarios.

Validated controls in Chunk 10:
- FeeDistributor destination updates are delay-protected and cancellable (guardrails pass).
- FeeDistributor burn path performs real supply burn (not burn sink transfer).
- EcosystemVault payExpense decrements operationsPool before external token transfer paths.
- EcosystemVault emergency withdrawal path includes explicit timelock and cancellable request lifecycle.

## Backlog Additions (Chunk 10)

- R-035 [high] Introduce delay and policy controls for high-impact treasury authority changes and outflows: timelock setManager/setAllocations (or route through governance timelock), and add per-epoch spend ceilings for payExpense.
- R-036 [medium] Enforce cumulative pending-withdraw limits (not only per-request maxWithdrawBps) so parallel queued withdrawals cannot exceed intended aggregate exposure.
- R-037 [medium] Add hardhat adversarial treasury tests covering manager abuse attempts, batched withdraw requests, operations cooldown boundaries, and request cancel/execute race behavior.

## Next Chunk

Chunk 11 execution target: Deployment, Handover, and Role Rotation

Immediate deep-check tasks:
1. Verify ownership handover sequencing and expiry/acceptance guarantees across core contracts.
2. Check role-rotation completeness (EOA removal, timelock/DAO ownership finalization, emergency roles).
3. Validate deployment/runtime address consistency between contracts, scripts, and frontend config.

## Chunk 11 Deep Check (Completed)

Scope: Deployment, Handover, and Role Rotation
Date: 2026-03-30
Contracts/Scripts: contracts/SystemHandover.sol, contracts/DAO.sol, contracts/DAOTimelock.sol, contracts/VFIDEAccessControl.sol, contracts/scripts/deploy-solo.ts, contracts/scripts/arm-handover.ts

Focused tests executed:
- HARDHAT_ALLOW_UNLIMITED_CONTRACT_SIZE=true npx tsx --test test/hardhat/SystemHandoverSecurity.test.ts
- npx jest __tests__/deployment/deployment-operations.test.ts --runInBand
- Result: 2 suites, 108 tests passed, 0 failed

Findings from Chunk 11:

- F11-1 [high] SystemHandover execute path is incompatible with production DAO and DAOTimelock admin setters. SystemHandover.executeHandover() directly calls dao.setAdmin(newAdmin) and timelock.setAdmin(address(dao)). In production contracts, DAO.setAdmin is onlyTimelock and DAOTimelock.setAdmin is onlyTimelockSelf, so both calls revert when invoked from SystemHandover (devMultisig caller). This can brick final handover even after countdown maturity.

- F11-2 [high] Solo deploy script seeds SystemHandover with owner placeholder addresses for dao/timelock/council and claims they can be replaced before arm(), but SystemHandover has no setter for those module addresses. deploy-solo.ts sets constructor args to owner for dao/timelock/council bootstrap, while arm-handover.ts instructs operators to replace those slots via setParams/governance proposal. No such replacement path exists in SystemHandover, creating a hard operational misconfiguration risk.

- F11-3 [medium] Handover security tests rely on permissive stubs rather than real DAO/DAOTimelock access controls. SystemHandoverSecurity.test.ts validates one-time and burn semantics with SHDAOAdminStub/SHTimelockAdminStub, so compatibility regressions against real onlyTimelock/onlyTimelockSelf constraints remain undetected.

Validated controls in Chunk 11:
- SystemHandover is one-shot and burns devMultisig on successful execution (tested).
- arm() gating and onlyDev checks are enforced.
- Deployment operations tests validate script dry-run and verifier hygiene coverage.
- VFIDEAccessControl supports atomic admin-role transfer to governance target.

## Backlog Additions (Chunk 11)

- R-038 [high] Refactor SystemHandover to execute through valid governance paths (queue/execute timelock self-calls for DAO/DAOTimelock admin changes), or redesign handover target interfaces to match live access controls.
- R-039 [high] Remove placeholder bootstrap guidance for SystemHandover or add explicit module setter/update path (timelocked) for dao/timelock/council before arm(); align deploy-solo.ts and arm-handover.ts with actual contract capabilities.
- R-040 [medium] Add integration hardhat test using real DAO + DAOTimelock contracts to prove end-to-end handover succeeds under production modifiers.

## Next Chunk

Chunk 12 execution target: WebSocket Realtime Transport and ACL

Immediate deep-check tasks:
1. Verify websocket origin allowlist enforcement and production config fallback behavior.
2. Validate ACL reload/update logic for stale-permission windows and race conditions.
3. Check auth timeout/message validation behavior against malformed frame and replay scenarios.

## Chunk 12 Deep Check (Completed)

Scope: WebSocket Realtime Transport and ACL
Date: 2026-03-30
Contracts/Services: websocket-server/src/index.ts, websocket-server/src/auth.ts, websocket-server/src/schema.ts, websocket-server/src/rateLimit.ts, lib/websocket.ts

Focused tests executed:
- npx jest __tests__/websocket --runInBand
- Result: 4 suites, 37 tests passed, 0 failed

Findings from Chunk 12:

- F12-1 [high] Topic subscription and ACL checks are acknowledge-only; no subscription state is persisted or enforced for outbound dispatch. subscribe/unsubscribe handlers validate isAuthorizedForTopic() but do not store per-session topic membership. The exported broadcast() function sends to all connected clients indiscriminately. This creates a confidentiality/integrity gap where topic-scoped delivery guarantees are not technically enforced by server state.

- F12-2 [medium] Topic ACL defaults to compatibility-mode fail-open when WS_TOPIC_ACL_PATH is not configured. isAuthorizedForTopic() returns true for all allowlisted topic prefixes when TOPIC_ACL_PATH is empty. This is operationally convenient but turns ACL into an opt-in control, increasing misconfiguration risk in production deployments that expect strict allowlists.

- F12-3 [medium] WebSocket hardening tests are primarily source-pattern assertions and do not exercise live server behavior for upgrade-origin rejection, auth-timeout disconnect, ACL refresh races, or topic authorization under real socket traffic. Current coverage can miss runtime regressions in event sequencing and state handling.

Validated controls in Chunk 12:
- Production startup blocks ALLOWED_ORIGINS=* and enforces explicit origin allowlist policy.
- Upgrade path performs origin checks, per-IP connection rate limiting, and optional early JWT verification.
- Unauthenticated sessions are timeout-closed and blocked from non-auth message types.
- Malformed JSON/schema violations are handled without process crash; rate and payload limits are enforced.
- ACL snapshot refresh failures are fail-closed when WS_TOPIC_ACL_PATH is configured (existing snapshot retained, null snapshot denies topic auth).

## Backlog Additions (Chunk 12)

- R-041 [high] Implement real topic subscription state and enforce topic-scoped outbound delivery (including ACL checks on publish path), replacing acknowledge-only subscribe/unsubscribe semantics.
- R-042 [medium] Make ACL strict-by-default in production: require WS_TOPIC_ACL_PATH (or explicit WS_ACL_MODE=compat flag) and fail startup if strict ACL config is missing.
- R-043 [medium] Add integration websocket tests with live server sockets for origin rejection, auth timeout, ACL refresh/update behavior, and topic isolation.

## Audit Status

Chunks 1-12 deep checks are complete.

Recommended follow-up execution order:
1. Address high risks first: R-038, R-039, R-041.
2. Add missing integration/adversarial tests: R-040, R-043.
3. Re-run focused signoff suites and update backlog with remediation evidence.
