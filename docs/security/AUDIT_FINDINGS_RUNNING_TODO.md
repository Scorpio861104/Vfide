# Audit Findings Running Todo

Source backlog: `VFIDE_AUDIT_FINDINGS_AND_FIXES.md`

Rule: exactly one item may be `IN_PROGRESS` at a time.

## Current focus

- IN_PROGRESS: BATCH-G (zip ID evidence reconciliation and residual triage)
- LAST_COMPLETED: BATCH-F, BATCH-E/#485/#486, BATCH-E/#523, BATCH-E/#521, BATCH-E/#524, BATCH-D, BATCH-C/#105, CODE-47, BATCH-C/#62/#91/#95/#138/#72/#93/#92, CODE-46, CODE-41/#45, AUTH-ROUTES, ZIP-#29, ZIP-#307, ZIP-#391, ZIP-#416, ZIP-#392, ZIP-#393, ZIP-#327/#328, and ZIP-#415

## Batch G - Reconciliation reopened (2026-05-04)

- Cross-check result: `ZIP_524_ID_EVIDENCE_MAP.md` contains noisy false-positive references (e.g., color hex and incidental `#<digit>` text), so map `Ref Count` cannot be used as closure proof.
- Strict check (map numeric IDs vs exact `#<id>` tracker references): 220 mapped numeric IDs, 30 explicitly linked, 190 missing explicit tracker linkage.
- Immediate triage queue (first unresolved IDs): #1, #2, #3, #4, #27, #28, #30, #31, #32, #33.
- Rule remains: only mark `DONE_*` with code/test evidence plus explicit ID-level tracker reference.
- BATCH-G/#27 — DONE_VALIDATED — finding is explicitly marked `(RETRACTED)` in the zip evidence map.
- BATCH-G/#28 — DONE_VALIDATED — finding is explicitly marked `(RETRACTED)` in the zip evidence map.
- BATCH-G/#30 — DONE_FIXED — hardened `websocket-server/src/index.ts` internal `POST /event` bridge: constant-time secret verification (`crypto.timingSafeEqual`) and bounded request body (`MAX_EVENT_BODY_BYTES=64KiB`) with HTTP 413 on overflow.
- BATCH-G/#31 — DONE_VALIDATED — websocket auth path already enforces production fail-closed behavior when revocation backend is unavailable.
- BATCH-G/#32 — DONE_FIXED — `lib/db.ts::query` no longer wraps user-context queries in automatic `BEGIN/COMMIT`; now uses dedicated client with session-scoped `set_config(..., false)` and best-effort `RESET app.current_user_address` on release.
- BATCH-G/#33 — DONE_FIXED — `lib/db.ts::getClient` no longer monkey-patches `client.query`; user context is applied once on checkout and cleared on release, reducing brittle control-flow side effects.
- BATCH-G/#38 — DONE_VALIDATED — websocket chat topic handling is explicitly canonicalized via `chatTopic(addrA, addrB)` with lowercasing + stable sort and authorization checks on subscribe/broadcast paths.
- BATCH-G/#39 — DONE_FIXED — `app/api/auth/route.ts` anomaly analysis path now uses awaited `analyzeActivity(...)` with guarded try/catch instead of naked `.then(...)` continuation.
- BATCH-G/#40 — DONE_FIXED — explicit request schemas added for two POST surfaces lacking strict parsing (`app/api/subscriptions/route.ts` and `app/api/merchant/installments/route.ts`) using `zod4` safeParse validation.
- BATCH-G/#42 — DONE_VALIDATED — token fee-router telemetry already preserves revert bytes in `ExternalCallFailed("rv", reason)`; context code + raw reason are emitted without halting transfers.
- BATCH-G/#1 — DONE_FIXED — primary deployment scripts no longer silently default critical bootstrap roles/sinks to `deployer.address` on non-local networks. `scripts/deploy-full.ts` now requires explicit `BOOTSTRAP_*` env addresses (or explicit `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true` for local/testing), and `scripts/deploy-lending.ts` no longer falls back DAO to deployer outside local/testing.
- BATCH-G/#4 — DONE_FIXED — bootstrap fragility reduced at the deployment layer: non-local deploys now fail fast when governance/admin/sink bootstrap addresses are omitted instead of silently deploying with deployer-owned temporary recipients.
- BATCH-G/#2 — DONE_FIXED — reduced finance/oracle coupling in live operational contracts by switching transactional/gating score reads from `seer.getScore(...)` to `seer.getCachedScore(...)` across `MerchantPortal`, `VFIDECommerce`, `VFIDETermLoan`, `FraudRegistry`, and `EcosystemVault`; `SystemHandover` council-average check now also uses cached scores.
- BATCH-G/#3 — DONE_FIXED — Seer hot-path usage reduced in live contracts by routing repeated runtime reads through the cache-aware getter instead of forcing full score recomputation on each operational path.
- BATCH-G/#48 — DONE_VALIDATED — mapped to DB-01: RLS self-insert policy + `FORCE ROW LEVEL SECURITY` migration are present; the reported `USING(true)`/inactive-RLS gap is closed.
- BATCH-G/#63 — DONE_VALIDATED — mapped to P2-H-01: production proxy-header trust now fails closed unless `VFIDE_TRUST_PROXY_HEADERS=true`; rate limiting is not silently disabled when the env is unset.
- BATCH-G/#64 — DONE_VALIDATED — websocket auth path revalidates token/user revocation and no longer relies on a permissive secret-rotation fallback for revoked-session acceptance.
- BATCH-G/#65 — DONE_VALIDATED — `app/api/merchant/returns/route.ts` no longer swallows inventory-restock failures: restock updates execute inside the main handler flow and any query failure bubbles to the outer catch, returning HTTP 500 rather than silently succeeding.
- BATCH-G/#66 — DONE_VALIDATED — combined issue now covered by ZIP-#29 (`typescript.ignoreBuildErrors=false`) plus the auth-route inventory closure (`AUTH-ROUTES`, `DB-04`); broken-import/auth-wrapper regressions are no longer silently deployable.
- BATCH-G/#67 — DONE_VALIDATED — current vault bootstrap no longer hard-codes owner-as-sole-guardian. `CardBoundVault` constructor requires an explicit guardian array + threshold, and `VaultHub.completeGuardianSetup()` refuses completion until the vault has at least 2 guardians, threshold >= 2, and an independent non-owner guardian.
- BATCH-G/#68 — DONE_FIXED — `contracts/Seer.sol` now composes operator rewards/punishments as an overlay on the computed baseline score instead of mutating the automated/manual baseline itself; DAO-set, dispute-resolution, and decay paths explicitly replace the visible score by resetting that overlay. Focused validation passed in `npx hardhat test test/contracts/SeerEcosystem.test.ts`, including a new regression for rewarding a user with no DAO-set baseline.
- BATCH-G/#69 — DONE_FIXED — `OwnerControlPanel` queued governance actions now expire after `GOVERNANCE_ACTION_EXPIRY=30 days`; stale actions are deleted and revert with `OCP_ActionExpired(expiredAt)` instead of remaining executable forever.
- BATCH-G/#79 — DONE_VALIDATED — mapped to ABI-01..ABI-05 tracker items: ABI parity checks and runtime/indexer compatibility fixes are in place for the previously mismatched surfaces.
- BATCH-G/#80 — DONE_FIXED — `lib/indexer/service.ts` now indexes only finalized blocks (`INDEXER_CONFIRMATION_DEPTH`) and rewinds/clears a short block window (`INDEXER_REORG_REWIND_BLOCKS`) before each poll to tolerate short reorgs; focused regression test updated and passing in `__tests__/lib/indexer-service.test.ts`.
- NEXT_IN_PROGRESS: residual unmapped ZIP IDs from exact tracker cross-check

## Zip Evidence Reconciliation (2026-05-03)

- Source of truth for unresolved work: `files (2).zip` checklist unchecked items.
- Execution plan: `docs/security/ZIP_524_REMEDIATION_BATCHES.md`.
- Immediate queue (Batch A deploy blockers): #415, #307, #391, #416, #392, #393, #327, #328, #325, #326, #345.
- Rule: `DONE_*` requires code/test evidence and explicit ID-level reference.

## Recent Batch Verifications (2026-05-03 session)

The following findings were verified as already DONE via code inspection:

- AUTH-ROUTES — DONE_FIXED — `npm run -s auth:routes:unmigrated` returns `TOTAL_UNMIGRATED_AUTH_ROUTES=0`
- ZIP-#29 — DONE_FIXED — `next.config.ts` now sets `typescript.ignoreBuildErrors=false`; project typecheck remains clean

- P2-C-01 — DONE_FIXED (middleware.ts exists, re-exports proxy.ts; security middleware runs in production)
- P2-C-02 — DONE_FIXED (CSRF cookie httpOnly is false; double-submit pattern properly implemented)
- P2-H-01 — DONE_FIXED (getRequestIp utility centralizes proxy header handling; fail-closed in production unless VFIDE_TRUST_PROXY_HEADERS=true; ESLint rules prevent direct header reads)
- P2-H-05 — DONE_FIXED (verifyToken calls isTokenRevoked + isUserRevoked with proper timestamp comparison; circuit breaker pattern for Redis failures)
- P2-H-10 — DONE_FIXED (violations endpoint: user-submitted severity hardcoded to 'low', ipAddress server-derived via getRequestIp, auth required on GET/POST)
- CODE-41/#45 — DONE_FIXED — `app/api/merchant/installments/route.ts` no longer masks DB errors with empty-row fallbacks; regression coverage added in `__tests__/api/merchant/installments.test.ts`; evidence captured in `docs/security/CODE41_DB_ERROR_SWALLOW_VERIFICATION_2026-05-04.md`
- CODE-46 — DONE_FIXED — root `__mocks__/` files relocated to `test/mocks/`; Jest mappings updated in `jest.config.cjs` and `jest.hardhat.cjs`; evidence captured in `docs/security/CODE46_MOCK_SURFACE_RELOCATION_VERIFICATION_2026-05-04.md`
- CODE-47 — DONE_FIXED — `postinstall` now runs through CI-aware guard script; local installs still run `validate:env`; evidence captured in `docs/security/CODE47_POSTINSTALL_CI_GUARD_VERIFICATION_2026-05-04.md`
- BATCH-C/#62 — DONE_FIXED — `app/api/merchant/orders/route.ts` no longer trusts `tx_hash` for payment state and blocks `tx_hash` PATCH updates outside verified confirm flow
- BATCH-C/#95 — DONE_FIXED — `app/api/crypto/payment-requests/[id]/route.ts` now requires and verifies `txHash` for `completed`, failing closed when unverifiable
- BATCH-C/#138 — DONE_FIXED — `app/api/merchant/withdraw/route.ts` now enforces confirmed net balance before withdrawal creation
- BATCH-C/#91 — DONE_FIXED — added `/api/crypto/transfer` route with explicit non-custodial-safe 501 contract (no missing-route/module failure)
- BATCH-C/#92/#72/#93 — DONE_VALIDATED — payment-request/checkout `[id]` route handlers load and resolve params inside authenticated route closures; focused tests passing; evidence captured in `docs/security/BATCHC_API_INTEGRITY_VERIFICATION_2026-05-04.md`
- BATCH-C/#105 — DONE_FIXED — `app/api/merchant/orders/route.ts` now enforces server-authoritative catalog pricing (`merchant_products` + `merchant_product_variants`), rejecting customer-driven price injection
- BATCH-E/#524 — DONE_FIXED — critical verify suite command added (`contract:verify:all:critical:local`) and wired into `scripts/validate-deployment.ts`; evidence captured in `docs/security/BATCHE_VERIFY_SUITE_WIRING_2026-05-04.md`
- BATCH-E/#521 — DONE_FIXED — `scripts/validate-deployment.ts` now discovers real deployment manifest formats (`DEPLOYMENT_FILE`, `.deployments/<network>.json`, and root `deployments-*.json`) for the on-chain owner/dao/admin drift check; evidence captured in `docs/security/BATCHE_521_ONCHAIN_OWNERSHIP_VALIDATION_2026-05-04.md`
- BATCH-E/#523 — DONE_FIXED — added real-contract fee-burn verification (`scripts/verify-fee-burn-router-invariants-real.ts`) and wired local critical run to execute both mock + real checks; evidence captured in `docs/security/BATCHE_523_REAL_FEE_BURN_VERIFICATION_2026-05-04.md`
- BATCH-E/#485 — DONE_VALIDATED — existing Hardhat test suite provides comprehensive permit, fee-routing, vault-recovery, and governance-lifecycle coverage; no gaps identified
- BATCH-E/#486 — DONE_FIXED — `test/hardhat/integration-deploy-governance.test.ts` added: deploy stack (ProofLedger→Seer→VaultHub→AdminMultiSig) + Seer timelocked DAO handover + VaultHub 2-step ownership handover; all 3 real-EVM tests pass; script excluded from generated/ via run-hardhat-node-tests.sh

## BATCH-F findings (code hygiene and residuals)

- BATCH-F/#29 — DONE_FIXED (prior) — `next.config.ts` sets `typescript.ignoreBuildErrors=false`; typecheck clean
- BATCH-F/#41/#45 — DONE_FIXED (prior) — DB error swallowing fixed in installments route
- BATCH-F/#46 — DONE_FIXED (prior) — `__mocks__/` relocated to `test/mocks/`
- BATCH-F/#47 — DONE_FIXED (prior) — postinstall CI-aware guard
- BATCH-F/#353 — DONE_FIXED — `VFIDEToken._transfer` now calls `IProofScoreBurnRouter.recordBurn(_burnAmt)` (try/catch, no-halt) after `_applyBurn`; daily cap tracking in ProofScoreBurnRouter now accurately reflects token-side burns
- BATCH-F/#357 — DONE_VALIDATED — ID not present in ZIP_524_ID_EVIDENCE_MAP.md (391 IDs mapped); treated as phantom/stale finding
- BATCH-F/#37 — DONE_VALIDATED — EcosystemVault.sol is 1,415 lines; EIP-170 runtime size gate (`scripts/verify-contract-size-buffer.ts`) enforces hard limit and near-limit buffer; contract is below EIP-170 runtime byte cap
- BATCH-F/#43 — DONE_VALIDATED — MerchantPortal.sol is 1,132 lines (below original 1,349 due to prior refactors); size gate covers all contracts; oversized-line-count is a style/complexity finding, not a security gap — no active bypass of EIP-170 byte ceiling
- BATCH-F/#419 — DONE_VALIDATED — `app/checkout/[id]/page.tsx` already POSTs `{ action: 'pay', tx_hash: hash }` to the merchant backend on success; `PayContent.tsx` is an unauthenticated customer-facing pay-link component — payment is settled on-chain via MerchantPortal.payWithIntent; no merchant DB auth context available in that component
- BATCH-F/#420 — DONE_VALIDATED — `useEscrow` is documented as a legacy-name compatibility shim routing to current MerchantPortal direct-settlement flow (v6); file header explains removal of CommerceEscrow in v6 and that `createEscrow` routes to `payWithIntent` — this is intentional, not an inadvertent duplicate
- BATCH-F/#421 — DONE_FIXED — `PaymentInterface.tsx` (merchant-context POS widget) now calls `/api/merchant/payments/confirm` fire-and-forget after a successful `payMerchant` transaction to record the confirmed payment off-chain for reconciliation, webhooks, and receipts
- BATCH-F/#454/#455 — DONE_FIXED — `DAOTimelock.cancel` and `cleanupExpired` now use `onlyAdminOrSelf` modifier (callable by admin OR by the timelock itself, covering DAO-queued cancellation proposals); both functions also call `_notifyDaoCancelledIfTracked` which tries `IDAOCancellationTracker(admin).expireQueuedProposal(proposalId)` so the DAO proposal state is cleared on cancellation/expiry

## Queue

- INFRA-01 (Blocker) — DONE_FIXED — Added root `middleware.ts` entrypoint so Next.js executes nonce/CORS/CSRF/size enforcement logic from `proxy.ts`
- INFRA-02 (Blocker) — DONE_VALIDATED — Runtime CSP is nonce-based in middleware path and static config uses strict fallback (no `unsafe-eval`)
- INFRA-03 (Blocker) — DONE_FIXED — Chain-aware contract addresses at runtime
- TOKEN-01 (Critical) — DONE_VALIDATED — Vault-to-owner scoring resolution already present
- TOKEN-02 (Medium) — DONE_VALIDATED — Scoring address already cached in `_transfer`
- TOKEN-03 (Critical) — DONE_VALIDATED — Two-stage emergency pause (`emergency_pauseAll` + `emergency_confirmPauseAll`) implemented
- FRAUD-01 (Critical) — DONE_VALIDATED — Complaint epoching implemented and incremented in `clearFlag`
- FRAUD-02 (Critical) — DONE_VALIDATED — Penalty cursor advances only on success with failure event emission
- FRAUD-03 (Critical) — DONE_VALIDATED — Escrow recipient owner snapshot + release by snapshot owner vault
- VAULT-01 (Medium) — DONE_VALIDATED — Destination vault code hash snapshot check enforced
- BRIDGE-01 (High) — DONE_FIXED — Owner manual refund window now requires cosigner-backed proposal/approval
- BRIDGE-02 (High) — DONE_VALIDATED — `finalizeStaleBridgeRefund` enforces bridge systemExempt invariant
- FAUCET-01 (Medium) — DONE_VALIDATED — Production boot guard blocks unsafe local signer enablement
- FAUCET-02 (Medium) — DONE_VALIDATED — Claim route returns tx hash immediately (no receipt wait)
- FAUCET-03 (High) — DONE_VALIDATED — Batch claim skips ETH-fail recipients and tracks pending gas top-ups
- FAUCET-04 (Low) — DONE_FIXED — Referral depth limited to one hop in faucet claim flows
- DB-01 (Blocker) — DONE_VALIDATED — users self-insert RLS policy + FORCE RLS migration present
- DB-02 (High) — DONE_VALIDATED — permissive users_read_public removed/replaced by authenticated policy
- DB-03 (Blocker) — DONE_VALIDATED — user_portfolios table + RLS migration present
- DB-04 (High) — DONE_FIXED — direct `requireAuth` route usage removed from `app/api`; inventory count now 0 in `docs/security/DB04_REQUIREAUTH_ROUTE_INVENTORY_2026-05-03.md`
- API-01 (High) — DONE_VALIDATED — analytics portfolio route wrapped with ownership enforcement
- API-02 (Medium) — DONE_VALIDATED — Address wrapper forwards via in-process handler (no internal HTTP fetch)
- API-03 (Medium) — DONE_VALIDATED — No unbounded manual body parsing; Zod request schema enforced
- ABI-01 (Critical) — DONE_VALIDATED — ABI parity check passes and stale ABI set removed
- ABI-02 (Critical) — DONE_VALIDATED — orphan ABI imports removed from runtime index
- ABI-03 (Critical) — DONE_VALIDATED — legacy BurnRouter alias removed; ProofScoreBurnRouter canonical
- ABI-04 (Blocker) — DONE_VALIDATED — payment fee quote uses ProofScoreBurnRouter.computeFees
- ABI-05 (Blocker) — DONE_VALIDATED — escrow hook migrated to MerchantPortal compatibility shim
- ABI-06 (Medium) — DONE_VALIDATED — legacy ABI branches constrained behind card-bound-only runtime
- ABI-07 (Low) — DONE_VALIDATED — future contract slots not active in current runtime surface
- WALLET-01 (High) — DONE_VALIDATED — embedded auth stubs throw hard (no random address generation)
- WALLET-02 (High) — DONE_VALIDATED — `useVFIDEWallet` fail-closed fallback avoids crash hazard
- WS-01 (High) — DONE_FIXED — Redis rate limiter uses single pipeline request for INCR+EXPIRE
- WS-02 (Medium) — DONE_FIXED — Missing topic ACL now fail-closed (no non-production allow-missing mode)
- WS-03 (Medium) — DONE_VALIDATED — Chat/presence topic auth no longer depends only on ACL snapshot
- AUTH-01 (Low) — DONE_VALIDATED — EIP-1271 guard enforced in CI (`check:eip1271` script + `validate:production`)
- AUTH-02 (Medium) — DONE_VALIDATED — `verifyToken` revocation backend failures handled by circuit breaker (no re-throw)
- DEAD-01 (Low) — DONE_FIXED — ShoppablePost/PurchaseProofEvent wired in UnifiedActivityFeed + ShareProductToFeed payload fixed for /api/activities schema (regression test added)

---

## Phase 2/3 findings (from zip audit files)

Source: `files.zip` → VFIDE_REMAINING_WORK.md / VFIDE_Phase2_Audit.md / VFIDE_Phase3_Audit.md
Source: `files (1).zip` → VFIDE_AUDIT_FINDINGS.md / VFIDE_FIX_CHECKLIST.md

### Critical findings — all DONE

- P2-C-01 — DONE_FIXED — middleware.ts exists at project root, re-exports proxy.ts; Next.js security middleware now runs on all requests
- P2-C-02 — DONE_FIXED — CSRF cookie httpOnly is false; double-submit pattern properly implemented with SameSite=strict and proper validation

### Mainnet Blockers

- H-11 — DONE_FIXED — Runtime sizes pass EIP-170 with processPayment compatibility restored (MerchantPortal 24,150 B; OwnerControlPanel 23,647 B; size gate passes)
- C-1 — DONE_VALIDATED — CardBoundVault currently enforces `SENSITIVE_ADMIN_DELAY = 7 days` and queues `approveVFIDE`/`approveERC20`; tracker note was stale
- F-07 — DONE_VALIDATED — MerchantPortal rejects VFIDE-style settlement tokens via `_validateSettlementToken` and `MERCH_VFIDESettlementDisabled`
- F-09 — DONE_VALIDATED — SeerGuardian restriction enum already uses `GovernanceFullBan`

### Pre-Audit Hygiene (quick wins)

- EMB-01 — DONE_VALIDATED — `lib/embeddedWallet/` is absent from the workspace
- CLIP-01 — DONE_FIXED — Paper wallet copy now shows warning and performs best-effort clipboard auto-clear after 30s (F-C-01)
- PRINT-01 — DONE_VALIDATED — Paper wallet Print action is removed and replaced by security warning text (F-C-02)
- VERIFY-01 — DONE_VALIDATED — `app/paper-wallet/components/VerifyTab.tsx` is absent
- BANNER-01 — DONE_VALIDATED — paper-wallet page already shows the offline bundle warning banner
- RAND-01 — DONE_VALIDATED — target files use `crypto.randomUUID()` / CSPRNG and no longer rely on `Math.random()`
- ENV-01 — DONE_VALIDATED — `instrumentation.ts` imports and runs `validateEnvironment()` during `register()`
- REVOKE-01 — DONE_VALIDATED — JWT verification and websocket auth both call revocation checks, including `isUserRevoked()` / `ensureNotRevoked()`
- SECAPI-01 — DONE_VALIDATED — security GET endpoints are wrapped with `withAuth`
- 2FA-01 — DONE_VALIDATED — `/api/security/2fa/initiate` has no route implementation files
- DEADLIB-01 — DONE_VALIDATED — dead auth helper files were removed from `lib/auth/`
- MIGRATE-01 — DONE_VALIDATED — `scripts/migrate.ts` is absent
- RATELIMIT-01 — DONE_VALIDATED — Shared request context IP extraction is wired through rate-limit and anomaly checks (P2-H-01,02,17)
- DNS-01 — DONE_VALIDATED — merchantWebhookDispatcher resolves and pins destination IP during dispatch (P2-M-16)
- PII-01 — DONE_VALIDATED — logger scrubbing/redaction covers Ethereum addresses, tx-like hashes, and emails before sink export (P2-M-29)
- MEDAPI-01 — DONE_VALIDATED — P2-M-18..27 controls are present (including proposer eligibility + per-proposer weekly cap in proposals API) and previously-remediated medium API items remain enforced

### Contract fixes (from VFIDE_FIX_CHECKLIST.md)

- C-415 — DONE_FIXED — `scripts/deploy-full.ts` now deploys `AdminMultiSig` before `VFIDEToken` and passes `book.AdminMultiSig` as the treasury constructor arg
- C-306 — DONE_VALIDATED — Deploy scripts guard TREASURY_ADDRESS as deployed contract and pass it explicitly to VFIDEToken
- C-307 — DONE_VALIDATED — permit() includes deadline in struct hash and enforces expiry; regression evidence added in `test/hardhat/VFIDEToken.test.ts` (valid permit + mismatched-deadline rejection)
- C-345 — DONE_VALIDATED — computeFees shortfall redistribution is bounded so total fee never exceeds original totalFee
- C-346 — DONE_VALIDATED — ProofScoreBurnRouter no longer inherits Pausable
- C-347 — DONE_VALIDATED — ProofScoreBurnRouter token reference is immutable
- C-311 — DONE_VALIDATED — token-side circuit-breaker halts are no-op removed; FeeDistributor notify is wrapped in try/catch
- C-391 — DONE_FIXED — governance transfer script now covers additional AdminMultiSig ownership/DAO wiring surfaces (OwnerControlPanel ownership, FeeDistributor/CircuitBreaker admin role migration, Payroll/Liquidity/Sanctum/EmergencyControl/Stablecoin governance hooks)
- C-416 — DONE_FIXED — transfer-governance coverage expanded for remaining contracts and role models (VaultHub DAO proposal, VaultRegistry/VaultRecoveryClaim ownership, ServicePool-based admin-role migrations for DAO/Merchant/Headhunter pools, and faucet owner-transfer proposal flow)
- C-392 — DONE_FIXED — AdminMultiSig enforces 4-of-5 emergency approvals and refreshed regression expectations in test/contracts/AdminMultiSig.test.ts; runtime verified via `HARDHAT_DISABLE_TELEMETRY_PROMPT=true HARDHAT_DISABLE_TELEMETRY=1 npx hardhat test test/contracts/AdminMultiSig.test.ts --no-compile`
- C-393 — DONE_FIXED — AdminMultiSig veto requires quorum by proposal type and refreshed regression expectations in test/contracts/AdminMultiSig.test.ts; runtime verified via `HARDHAT_DISABLE_TELEMETRY_PROMPT=true HARDHAT_DISABLE_TELEMETRY=1 npx hardhat test test/contracts/AdminMultiSig.test.ts --no-compile` and `NODE_OPTIONS='--import tsx' npx mocha --timeout 120000 test/hardhat/AdminMultiSigSecurity.test.ts`
- C-325-328 — DONE_VALIDATED — OwnerControlPanel includes VFIDEToken apply/propose wrappers used by governance transfer flow
- C-327/#328 — DONE_FIXED — transfer-governance now blocks FINALIZE_OWNERSHIP_TRANSFER while critical timelocked DAO/module changes are still pending (token/burnRouter/seer/vaultHub/sanctum/payroll/emergencyControl/stablecoin preflight guards)
- SEER-01 — DONE_FIXED — Seer.setScore updates history and `lastActivity` before sync/logging (#151,#177)
- SEER-02 — DONE_FIXED — Seer.resolveScoreDispute updates history and `lastActivity` on approved adjustment (#159,#178)
- SEER-03 — DONE_VALIDATED — focused Seer test confirms decayed scores recover via subsequent positive activity/reward flow (#152)
- SEER-04 — DONE_FIXED — SeerAutonomous.beforeAction callers now fail open on hook revert while preserving explicit block/delay results (#179)

### Timelocks to add (VFIDE_FIX_CHECKLIST.md)

- TL-236 — DONE_FIXED — FeeDistributor fee-source auth uses 48h propose/apply/cancel timelock
- TL-240 — DONE_FIXED — VFIDEFlashLoan orphan sweep uses 48h propose/apply/cancel timelock
- TL-262 — DONE_FIXED — VFIDEFlashLoan `setSeer`/`setFeeDistributor` use 48h propose/apply/cancel timelock
- TL-273 — DONE_VALIDATED — VaultHub `setRecoveryApprover` already enforces 48h pending/apply flow
- TL-298 — DONE_VALIDATED — EcosystemVault manager changes already queue via `SENSITIVE_CHANGE_DELAY`
- TL-302 — DONE_VALIDATED — No standalone executor-whitelist surface is present in current EcosystemVault; sensitive role/config paths are timelocked
- TL-308 — DONE_FIXED — VFIDEToken `setSeerAutonomous` uses pending/apply/cancel timelock flow
- TL-348 — DONE_FIXED — ProofScoreBurnRouter.setSustainability: converted to 24h propose+apply+cancel
- TL-349 — DONE_FIXED — setMicroTxFeeCeiling, setMicroTxUsdCap: converted to 24h propose+apply+cancel
- TL-365 — DONE_FIXED — EmergencyControl.setThreshold: converted to 24h propose+apply+cancel
- TL-376 — DONE_FIXED — CircuitBreaker.updatePriceOracle: converted to 24h propose+apply+cancel

### FraudRegistry hardening

- FRAUD-EXT-01 — DONE_VALIDATED — MIN_REPORTER_SCORE=5000, pending-review appeal window enforced, and DAO confirm flow is two-step
- FRAUD-EXT-02 — DONE_FIXED — rescueStuckEscrow now enforces original-sender destination only
- FRAUD-EXT-03 — DONE_VALIDATED — processClearFlagEscrowRefunds is user-callable and chunked
- FRAUD-EXT-04 — DONE_FIXED — FraudRegistry now exposes paginated pending-escrow query

### Vault-level fixes

- VAULT-EXT-01 — DONE_FIXED — CardBoundVault guardian pause now requires threshold approvals and pause auto-expires after 7 days
- VAULT-EXT-02 — DONE_FIXED — CardBoundVault recovery execution now requires staged guardian-approved rotation before hub-triggered apply
- VAULT-EXT-03 — DONE_FIXED — VaultRecoveryClaim verifier-only finalization path removed
- VAULT-EXT-04 — DONE_VALIDATED — Legacy factory target is not present in current contracts tree (finding stale for current codebase)

### Halt mechanism consolidation

- HALT-01 — DONE_VALIDATED — VaultHub global pause/unpause are deprecated reverts, CircuitBreaker trigger path is signal-only, and EmergencyBreaker.toggle enforces two-party confirmation (or governance-threshold caller) (#363-#367, #270, #346, #366)

## Working protocol per item

1. Validate the finding in current code.
2. If valid, implement smallest safe fix.
3. Run focused tests/checks for touched paths.
4. Mark item as DONE_FIXED or DONE_VALIDATED.
5. Move next item to IN_PROGRESS.

## Core zip findings gap (discovered 2026-05-03)

The initial zip verification covered a subset and did not include all Phase-style IDs. The following core IDs are currently untracked and must be triaged.

### Critical & High Priority (Phase 2)

- P2-C-01 — DONE_FIXED — middleware.ts exists, re-exports proxy.ts; security middleware now runs on all prod requests
- P2-C-02 — DONE_FIXED — CSRF cookie httpOnly is false; double-submit pattern properly implemented
- P2-H-01 — DONE_FIXED — getRequestIp centralizes proxy-header extraction; fail-closed in production unless VFIDE_TRUST_PROXY_HEADERS=true; ESLint rules prevent direct header reads

### Frontend Findings (Phase 3)

- F-C-03 — DONE_FIXED — hosted checkout API now returns merchant display name so checkout shows merchant identity alongside recipient address; validated by focused API/UI tests
- F-H-01 — DONE_FIXED — BeginnerWizard Step 2 no longer mounts EmbeddedLogin; shows MetaMask/Coinbase download links with "temporarily disabled" notice
- F-H-02 — DONE_FIXED — lib/embeddedWallet/ directory deleted; fake cryptoHash addresses eliminated
- F-H-03 — DONE_FIXED — GenerateTab.tsx banner replaced with honest web-delivery warning (no more misleading "offline device" advice)
- F-H-04 — DONE_FIXED — VerifyTab.tsx deleted; no private key input on live web page
- F-H-05 — DONE_FIXED — UnifiedWalletModal no longer references useEmbeddedWallet; EmbeddedLogin removed
- F-H-06 — DONE_FIXED — lib/crypto.ts uses BigInt + viem formatEther/parseEther; no float64 wei arithmetic
- F-H-07 — DONE_FIXED — checkout page uses EXPLORER_BASE_BY_CHAIN map keyed by chainId; no hardcoded zkSync URL
- F-L-01 — DONE_FIXED — JSON-LD string sanitization is in place (`sanitizeJsonLdString`) and structured output is safely serialized via `safeJsonLd`
- F-L-02 — DONE_FIXED — `disconnectWallet` is a wagmi-owned no-op; legacy localStorage keys in `useWallet` aligned to `vfide_*` prefix
- F-M-01 — DONE_VALIDATED — stale: `lib/embeddedWallet/` removed
- F-M-02 — DONE_VALIDATED — stale: `lib/embeddedWallet/` removed
- F-M-03 — DONE_VALIDATED — stale: `VerifyTab.tsx` removed
- F-M-04 — DONE_VALIDATED — transaction IDs use `crypto.randomUUID()`
- F-M-05 — DONE_VALIDATED — checkout text no longer claims generic "Secured by VFIDE" trust label; now specific merchant-portal/on-chain wording
- P2-H-02 — DONE_FIXED — Redis fail-closed in production: when Redis is configured but fails, rejects with 503 instead of falling back to per-process memory. Memory fallback only for non-production. Added regression test in __tests__/rate-limit-fail-closed.test.ts
- P2-H-03 — DONE_FIXED — Account lock no longer triggered by auth_fail events; prevents target-address DoS. Only key_rotation, high-risk payments, and distinct-IP events can trigger locks
- P2-H-04 — DONE_FIXED — Dedicated vfide_app role created with NOBYPASSRLS enforced; startup check verifies connecting role for BYPASSRLS privilege (fails in production, warns in dev). Migration: 20260503_120000_create_app_role_rls_enforcement.sql. Ops: update DATABASE_URL to use vfide_app
- P2-H-05 — DONE_FIXED — verifyToken properly checks both isTokenRevoked and isUserRevoked with timestamp comparison; circuit breaker handles Redis failures gracefully
- P2-H-06 — DONE_FIXED — Half-built 2FA feature intentionally not shipped; no `/api/security/2fa/verify` endpoint implemented; `two_factor_codes` table exists but unused/no code references it (feature is disabled)
- P2-H-07 — DONE_FIXED — GET /api/security/recovery-fraud-events now requires authentication (withAuth wrapper); results scoped to caller's own events and vault participants; admin can see all. Note: events still in-memory; database persistence recommended for multi-replica deployments
- P2-H-08 — DONE_VALIDATED — websocket auth enforces token+user revocation checks (`ensureNotRevoked`) at connect time and periodic revalidation
- P2-H-09 — DONE_VALIDATED — guardian-attestations, next-of-kin-fraud-events, and qr-signature-events all require `withAuth` on GET
- P2-H-10 — DONE_FIXED — violations endpoint: user-submitted severity hardcoded to 'low', ipAddress server-derived via getRequestIp, auth required on both GET/POST, results scoped to user
- P2-H-11 — DONE_VALIDATED — validateEnvironment() called in instrumentation.ts; JWT entropy, Redis, prev-secret rotation all enforced at boot
- P2-H-12 — DONE_VALIDATED — ussd/route.ts returns provisional CON response, not deceptive END success
- P2-H-13 — DONE_FIXED — CSPRNG replaced with crypto.randomUUID(); keyAddress documented as display-only identifier; selector coverage expanded to transferFrom/permit/increaseAllowance/decreaseAllowance (sessionKeyService.ts)
- P2-H-14 — DONE_VALIDATED — lib/auth/validation.ts does not exist; finding is stale
- P2-H-15 — DONE_VALIDATED — scripts/migrate.ts does not exist; finding is stale; lib/migrations/ is the sole runner
- P2-H-16 — DONE_FIXED — analyzeActivity wired in auth/route.ts; userAddress bug fixed; clearActivityHistory now called from logout/route.ts and revoke/route.ts (revokeAll path)
- P2-H-17 — DONE_FIXED — anomalyDetection.ts::getClientIP now delegates to getRequestIp() from requestContext; no raw header reads remain
- P2-L-01 — DONE_FIXED — `extractToken` now enforces strict `Bearer <token>` format
- P2-L-02 — DONE_VALIDATED — `migrateToHttpOnlyCookies` dead session-fixation primitive removed
- P2-L-03 — DONE_FIXED — SIWE challenge storage now requires Redis in production; in-memory fallback is non-production only
- P2-L-04 — DONE_FIXED — `safeQuery` now supports multi-placeholder clauses with per-placeholder rewrites
- P2-L-05 — DONE_FIXED — `.env.local.example` no longer ships known static JWT secret placeholder
- P2-L-06 — DONE_FIXED — WebSocket session IDs use `crypto.randomUUID()`
- P2-L-07 — DONE_FIXED — SIWE domain resolved through trusted-host allowlist (`resolveTrustedAuthDomain`)
- P2-L-08 — DONE_FIXED — localhost/127.0.0.1 moved to dev-only allowed domains
- P2-L-09 — DONE_FIXED — `addAllowedDomain` runtime-mutable dead code removed
- P2-L-10 — DONE_FIXED — revoke endpoint rejects mixed header/cookie token sources for single-token revoke
- P2-L-11 — DONE_FIXED — webhook replay metrics uses `timingSafeEqual` for token comparison
- P2-L-12 — DONE_FIXED — logout revocation TTL derives from token `exp` when available
- P2-L-13 — DONE_FIXED — `LOG_IP_HASH_SALT` required in production via startup validation
- P2-L-14 — DONE_FIXED — error sanitizer removed short-message passthrough; unknowns use safe fallback
- P2-L-15 — DONE_VALIDATED — resolved by removing `addAllowedDomain`
- P2-L-16 — DONE_FIXED — Sentry sensitive-header scrubbing expanded and normalized
- P2-L-17 — DONE_FIXED — default-secret blacklist expanded with common weak placeholders
- P2-L-18 — DONE_FIXED — USSD merchant code/amount now validated with strict regex + numeric bounds
- P2-L-19 — DONE_FIXED — USSD parser now enforces accepted content-types and removed regex multipart scraping path
- P2-L-20 — DONE_FIXED — streams token now allowlisted (`STREAM_ALLOWED_TOKENS` / defaults)
- P2-L-21 — DONE_FIXED — proposal `endsAt` capped to max 30-day voting window
- P2-L-22 — DONE_FIXED — webhook timestamp/signature generated per retry attempt
- P2-L-23 — DONE_VALIDATED — health endpoint is no longer in the contested generic API rate-limit path
- P2-L-24 — DONE_FIXED — session key service uses CSPRNG (`crypto.randomUUID`) for session IDs
- P2-L-25 — DONE_FIXED — ERC-20 selector coverage expanded (`transferFrom`/`permit`/allowance ops)
- P2-L-26 — DONE_FIXED — session key permissions are now always stored in sessionStorage; persistent localStorage mode removed
- P2-L-27 — DONE_VALIDATED — stale: `lib/auth/validation.ts` no longer exists
- P2-L-28 — DONE_FIXED — messages delete route now uses transaction (`BEGIN/COMMIT/ROLLBACK` + `FOR UPDATE`)
- P2-L-29 — DONE_FIXED — WebSocket compose port bound to loopback (`127.0.0.1:8080:8080`)
- P2-L-30 — DONE_FIXED — docker-compose now defines resource limits/reservations and log rotation
- P2-L-31 — DONE_FIXED — WebSocket Dockerfile includes `HEALTHCHECK`
- P2-L-32 — DONE_FIXED — main and WebSocket Dockerfiles pin matching `node:25-alpine` digest
- P2-M-01 — DONE_FIXED — `vercel.json` no longer has empty `headers: []` override
- P2-M-02 — DONE_FIXED — SIWE challenge validation no longer enforces IP/UA binding
- P2-M-03 — DONE_FIXED — dedicated migration added to replace broad `users_read_public USING (true)` policy
- P2-M-04 — DONE_FIXED — on-chain admin verification fails closed in production when RPC/OCP vars missing
- P2-M-05 — DONE_FIXED — admin RPC fetch guarded with `AbortSignal.timeout(3000)`
- P2-M-06 — DONE_FIXED — WebSocket rate limiter uses Upstash Redis in production (in-memory only with explicit override)
- P2-M-07 — DONE_FIXED — fail-open `TOPIC_ACL_ALLOW_MISSING` behavior removed; production requires ACL path
- P2-M-08 — DONE_FIXED — CSP violations are forwarded to Sentry outside development
- P2-M-09 — DONE_FIXED — key directory `algorithm` is server-side allowlisted with `z.literal(KEY_DIRECTORY_ALGORITHM)`
- P2-M-10 — DONE_FIXED — auth challenge defaults chainId from env, not hardcoded 8453
- P2-M-11 — DONE_FIXED — fraud-event reports enforce vault ownership/auth before acceptance
- P2-M-12 — DONE_FIXED — `rateLimit.getClientIdentifier` now delegates to shared `getRequestIp`
- P2-M-13 — DONE_FIXED — centralized sanitizer helper added; API error responses no longer return raw `error.message` bodies in route handlers
- P2-M-14 — DONE_FIXED — strict production validation no longer gated by CI/Vercel-only condition
- P2-M-15 — DONE_FIXED — missing Redis is now a production error (not warning)
- P2-M-17 — DONE_FIXED — plaintext webhook-secret fallback is blocked in production
- P2-M-19 — DONE_FIXED — proposals enforce bounded title/description lengths
- P2-M-20 — DONE_FIXED — streams enforce time ordering and amount-vs-rate consistency
- P2-M-21 — DONE_FIXED — referral endpoint now requires auth (`withAuth`)
- P2-M-22 — DONE_FIXED — USSD logs phone hashes, not raw phone numbers
- P2-M-23 — DONE_FIXED — messages use soft delete with tombstone update, preserving evidence trail
- P2-M-24 — DONE_FIXED — custom image reactions enforce hostname allowlist
- P2-M-25 — DONE_FIXED — `init-db.sql` marked deprecated/legacy-only
- P2-M-26 — DONE_FIXED — docker-compose reads JWT/DB secrets via Docker secrets
- P2-M-27 — DONE_FIXED — WS message payload constrained by bounded `JsonValueSchema`
- P2-M-28 — DONE_FIXED — remaining non-concurrent index migration updated to `CREATE INDEX CONCURRENTLY IF NOT EXISTS`
