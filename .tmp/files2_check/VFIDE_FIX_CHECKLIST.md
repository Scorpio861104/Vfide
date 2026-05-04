# VFIDE — Priority Fix Checklist (v3 — post-R22)

Companion to `VFIDE_AUDIT_FINDINGS.md`, `VFIDE_AUDIT_R21.md`, and `VFIDE_AUDIT_R22.md`.

**Updated 2026-05-02** with Round 22 additions and the #48 RLS retraction.

---

## 🚨 Pre-mainnet blockers (cannot deploy without these)

- [ ] **#415** — Reorder `deploy-full.ts`: deploy `AdminMultiSig` in Layer 1 (BEFORE VFIDEToken). Pass `book.AdminMultiSig` as treasury arg to VFIDEToken. Constructor requires treasury to be a contract; current EOA fails. **(SUPERSEDES #306)**
- [ ] **#307** — Add `deadline` to `VFIDEToken.permit()` struct hash.
- [ ] **#391** — Wire AdminMultiSig: transferOwnership/setDAO of every governed contract.
- [ ] **#416** — Update `transfer-governance.ts` to cover the 11+ missing ownership transfers.
- [ ] **#392** — Lower `EMERGENCY_APPROVALS` from 5 to 4 in `AdminMultiSig`.
- [ ] **#393** — Make `vetoProposal` require quorum.
- [ ] **#327, #328** — Reorder timelocked operations in transfer-governance.ts.
- [ ] **#325, #326** — Add OCP wrappers for 8 token apply* functions and 4 module setters.
- [ ] **#345** — Cap `ecosystemMinBps` shortfall fill at original totalFee in `ProofScoreBurnRouter.computeFees`.

## 🔥 Halt/freeze mechanisms — Tier 1 removals

- [ ] **#346** — Delete `Pausable` from `ProofScoreBurnRouter`.
- [ ] **#347** — Make `ProofScoreBurnRouter.token` immutable.
- [ ] **#311** — Delete `circuitBreaker` flag and state from `VFIDEToken`.
- [ ] **#311** — Delete `emergencyBreaker` check at `VFIDEToken._transfer:938-940`.
- [ ] **#311 cross** — Wrap `FeeDistributor.receiveFee` call in try/catch in `_transfer`.

## 🛡 Tier 2 — Restrict admin powers

- [ ] **#315** — Hardcode `systemExempt` list; remove runtime add/remove on token.
- [ ] **#308, #313** — Wrap seer hooks in try/catch (advisory only).
- [ ] **#425** — VFIDESecurity GuardianRegistry: restrict to vault-only.
- [ ] **#427** — VFIDESecurity GuardianLock: remove DAO unilateral unlock.
- [ ] **#428** — Remove or gate `PanicGuard.reportRisk`.
- [ ] **#429** — Document or remove `PanicGuard.setGlobalRisk`.
- [ ] **#493** — TerminalRegistry: restrict deactivation to merchant; DAO uses different flag.

## 🏛 Tier 3 — Vault-level fixes

- [ ] **#280** — `CardBoundVault.pause()` requires guardian threshold + auto-unpause 7d.
- [ ] **#272-#274** — `VaultHub.executeRecoveryRotation` requires vault-side approval.
- [ ] **#271** — Delete `VaultRecoveryClaim` verifier-only path.
- [ ] **#285** — Pause `UserVaultLegacy` factory.

## 🧠 Score system fixes (Seer)

- [ ] **#151, #177** — `Seer.setScore` must update `lastActivity` AND push history.
- [ ] **#159, #178** — `Seer.resolveScoreDispute` must update `lastActivity`.
- [ ] **#152** — `applyDecay` must be reversible on subsequent positive activity.
- [ ] **#179** — Wrap `SeerAutonomous` hooks so reverts don't brick DAO.
- [ ] **#509** — SeerGuardian.autoCheckProposer: use absolute threshold, not relative to minForGovernance.
- [ ] **#510** — SeerGuardian: timelock on proposalFlagDelay; cap delay at 30 days.
- [ ] **#511** — SeerGuardian.daoOverride: cap expiry at 30 days.
- [ ] **#512** — SeerWorkAttestation: require 2-of-N verifier signatures for attestation.

## 🌐 Frontend / API critical

- [ ] **~~#48~~** — RETRACTED. RLS wiring is correct; no fix needed.
- [ ] **#62, #95, #138** — Server-verify all `tx_hash` claims on-chain.
- [ ] **#105** — Server reads price from product catalog; never trust customer-supplied price.
- [ ] **#91** — Implement 5 missing endpoints.
- [ ] **#92** — Fix module-load failures in `/api/crypto/payment-requests` routes.
- [ ] **#72, #93** — Fix `params` outside `withAuth` closure.
- [ ] **#79** — Regenerate indexer ABI; reindex from genesis.
- [ ] **#481** — Connect SuggestionsTab/DiscussionsTab to real backend OR mark demo data.

## ⏱ Timelocks to add (currently instant)

- [ ] **#236** — `FeeDistributor.setAuthorizedFeeSource` — 48h
- [ ] **#240** — `sweepOrphanBalance` — 48h
- [ ] **#262** — `VFIDEFlashLoan.setSeer`, `setFeeDistributor` — 48h
- [ ] **#273** — `VaultHub.setRecoveryApprover` — 48h
- [ ] **#298** — `EcosystemVault.setManager` — 48h
- [ ] **#302** — `EcosystemVault` executor whitelist — 24h
- [ ] **#308** — `VFIDEToken.setSeerAutonomous` — 48h
- [ ] **#348** — `ProofScoreBurnRouter.setSustainability` — 24h cooldown
- [ ] **#349** — `setMicroTxFeeCeiling`, `setMicroTxUsdCap` — 24h
- [ ] **#365** — `EmergencyControl.setThreshold` — 24h
- [ ] **#376** — `CircuitBreaker.updatePriceOracle` — 24h
- [ ] **#430** — `PanicGuard.setHub` — 24h
- [ ] **#431** — `EmergencyBreaker.setDAO` — 48h
- [ ] **#438** — `PayrollManager.setSeer` — 48h
- [ ] **#439** — `PayrollManager.setSupportedToken` — 24h
- [ ] **#446** — `ServicePool.pause` — 48h (or remove)
- [ ] **#473** — `VFIDEBridge.setMaxBridgeAmount`, `dailyBridgeLimit` — 48h
- [ ] **#474** — `VFIDEBridge.setBridgeFee` — 48h, hard-cap at 100 bps
- [ ] **#478** — `SeerAutonomous.daoSetRateLimit` — 24h
- [ ] **#480** — `SeerAutonomous.setOperator` — 48h
- [ ] **#488** — `MainstreamPriceOracle.forceSetPrice` — 24h timelock + cap decrease at 50%
- [ ] **#489** — `MainstreamPriceOracle.setUpdater` — 24h
- [ ] **#490** — `MultiCurrencyRouter.setRecommendedRouter` — 48h
- [ ] **#491** — `SessionKeyManager.setDefaultLimits` — 24h
- [ ] **#495** — `BadgeManager.setOperator` — 24h
- [ ] **#496** — `BadgeManager.setQualificationRules` — 48h
- [ ] **#498** — `VFIDEBadgeNFT.setBaseURI` — 24h
- [ ] **#502** — `CouncilElection.cancelModules` — add cancellation
- [ ] **#505** — `CouncilSalary.setCouncilElection` — 48h
- [ ] **#506** — `CouncilSalary.reinstate` — 7-day timelock
- [ ] **#510** — `SeerGuardian.proposalFlagDelay` setter — 24h
- [ ] **#517** — `SubscriptionManager.setFraudRegistry` — 24h
- [ ] **#518** — `VFIDEEnterpriseGateway.setOracle` — 48h
- [ ] **#520** — `VFIDEEnterpriseGateway.rescueFunds` — 48h or restrict recipient

## 🛠 Halt mechanism consolidation (#363-#367)

Pick ONE; remove the others:

- [ ] Delete `VaultHub.pause()` (#270).
- [ ] Delete `ProofScoreBurnRouter.pause()` (#346, also Tier 1).
- [ ] Make `CircuitBreaker` signal-only.
- [ ] Keep `EmergencyBreaker.toggle()` BUT require committee co-signature (#363).

## 🔍 FraudRegistry hardening

- [ ] **#371** — Raise `MIN_REPORTER_SCORE` to 6500-7000.
- [ ] **#372** — Extend appeal window to 7 days; two-step `confirmFraud`.
- [ ] **#374** — `rescueStuckEscrow` sends to original sender.
- [ ] **#380** — Add user-callable refund trigger.
- [ ] **#381** — Add paginated `getPendingEscrows` view.

## 📊 GovernanceHooks fixes

- [ ] **#469** — Add 48h challenge window to `reportGovernanceAbuse`.
- [ ] **#470** — Wrap `guardian.isProposalBlocked` in try/catch.
- [ ] **#471** — Wrap `guardian.canParticipateInGovernance` in try/catch.
- [ ] **#472** — Use OZ Ownable2Step for transferOwnership.

## 💰 PayrollManager / ServicePool / SubscriptionManager fixes

- [ ] **#436** — Restrict `PayrollManager.emergencyWithdraw` recipient to {payer, payee}.
- [ ] **#437** — Allow either party to resume stream.
- [ ] **#440** — Add `extendStream` so users aren't capped at 365 days.
- [ ] **#447** — Restrict `ServicePool.sweepUnclaimed` recipient.
- [ ] **#449** — Document/enforce per-call score upper bound.
- [ ] **#515** — `SubscriptionManager.emergencyCancel`: require subscriber consent.
- [ ] **#516** — Increase `MAX_FAILED_PAYMENTS` to 7; add 24h cooldown between failed-payment increments.

## 🏗 Treasury / Vesting / Council fixes

- [ ] **#417** — Make `DevReserveVestingVault.DAO` settable with timelock.
- [ ] **#462** — Add `emergencyUnfreeze` to DevReserveVestingVault.
- [ ] **#464** — Add timelocked rotation for BENEFICIARY in DevReserveVestingVault.
- [ ] **#456** — Convert MerchantRegistry immutables to settable with 48h timelock.
- [ ] **#501** — CouncilElection: vote weight uses min(current, 30-day-prior) score.
- [ ] **#503** — `refreshCouncil` permissionless; check ALL members.
- [ ] **#504** — `removeCouncilMember`: 7-day timelock + super-majority.

## 🌉 Bridge / Enterprise / Mainstream Payments

- [ ] **#473, #474** — VFIDEBridge timelocks + fee cap.
- [ ] **#475** — VFIDEBridge: require cosigner != owner.
- [ ] **#477** — Cap `SeerAutonomous.daoOverride` expiry at 30 days.
- [ ] **#480** — SeerAutonomous.setOperator timelock.
- [ ] **#488** — MainstreamPriceOracle force-decrease cap 90% → 50% + timelock.
- [ ] **#492** — SessionKeyManager: treat Delayed as warning, not block.
- [ ] **#494** — FiatRampRegistry: per-provider total reward cap.
- [ ] **#519** — VFIDEEnterpriseGateway._swapToStable: finally-block pattern for approve revoke.

## 🎖 Badge family fixes

- [ ] **#496** — `BadgeManager.setQualificationRules` 48h timelock.
- [ ] **#497** — `BadgeManager.revokeBadge` 7-day notice + challenge.
- [ ] **#499** — Add public `VFIDEBadgeNFT.syncWithSeer(tokenId)` for revoked badges.
- [ ] **#500** — Pioneer/founding counter atomic compare-and-set.

## 🧪 Test infrastructure

- [ ] **#485** — Add real-EVM test suite covering: permit flow, ecosystemMinBps, vault recovery, DAO proposal lifecycle.
- [ ] **#486** — Add end-to-end deploy integration test.
- [ ] **#521** — Add on-chain post-deploy validation phase to validate-deployment.ts.
- [ ] **#523** — Add parallel verify script using real Seer/Token, not mocks.
- [ ] **#524** — Add `verify:all` npm script; invoke from validate-deployment.ts.

## 🧹 Code hygiene

- [ ] **#29** — Remove `typescript: { ignoreBuildErrors: true }` from `next.config.ts`.
- [ ] **#41, #45** — Stop swallowing DB errors.
- [ ] **#46** — Move `__mocks__/*` out of production build.
- [ ] **#47** — Make `postinstall` CI-aware.
- [ ] **#353, #357** — Remove dead code in `ProofScoreBurnRouter`.
- [ ] **#37, #43** — Split oversized contracts.
- [ ] **#419** — Add `account != address(0)` check to `revokeRoleWithReason`.
- [ ] **#420** — Cap `batchGrantRole`/`batchRevokeRole` at 100 accounts.
- [ ] **#421** — Add reason logging to `batchGrantRole`.
- [ ] **#454, #455** — Emit events on DutyDistributor cap-hit silent drops.

---

## Suggested order of operations (by sprint)

**Sprint 1 (deploy blockers):** #415, #307, #391, #392, #393

**Sprint 2 (critical centralization):** #325-#328, #345, #416, halt consolidation

**Sprint 3 (Tier 1 freeze removal):** #311, #346, #347, #315 + Seer fixes

**Sprint 4 (vault fixes):** #271, #272-#274, #280, #285

**Sprint 5 (frontend/API):** #62, #91, #92, #95, #105, #138, #481 (skip #48 — retracted)

**Sprint 6 (timelocks + GovernanceHooks):** all timelock items, #470, #471

**Sprint 7 (vesting, treasury, payroll):** #417, #436, #456, #462, #464

**Sprint 8 (testing):** #485, #486, #521, #523, #524

**Sprint 9 (R22-specific):** #488, #496, #497, #501-#506, #515, #518

**Ongoing:** complete unaudited slices if/when needed (SeerSocial/View/PolicyGuard, VFIDEBenefits, BridgeSecurityModule, indexer)

---

*Reference `VFIDE_AUDIT_FINDINGS.md`, `VFIDE_AUDIT_R21.md`, and `VFIDE_AUDIT_R22.md` for description, exact location, and detailed fix for each item.*
