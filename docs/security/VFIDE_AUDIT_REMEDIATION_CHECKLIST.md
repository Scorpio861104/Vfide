# VFIDE Audit Remediation Checklist

Source: VFIDE_AUDIT_FINDINGS_FULL.md
Generated: 2026-04-23T15:25:46Z

## Critical
- [x] C-1 — `CardBoundVault.approveVFIDE`/`approveERC20` bypass the 7-day withdrawal queue
- [x] C-2 — `CardBoundVault.rescueNative`/`rescueERC20` bypass the queue for non-VFIDE assets
- [x] C-3 — `WithdrawalQueueStub` (abstract implementation) deployed to production
- [x] C-4 — FraudRegistry systemExempt wiring ✅ RESOLVED
- [x] C-5 — `VaultRecoveryClaim.guardianVote` calls non-existent method on CardBoundVault
- [x] C-6 — `VaultHub.executeRecoveryRotation` — single recovery-approver unilateral custody
- [x] C-7 — Single-guardian default + 30-day grace = permanent lockout on lost phone — FIXED: `MAX_VFIDE_WITHOUT_GUARDIAN = 50_000e18` constant added; `canReceiveTransfer(amount)` view added; enforced in `executeVaultToVaultTransfer` and `executeQueuedWithdrawal` — destination vaults without guardian setup cannot receive VFIDE beyond the cap
- [x] C-8 — `Ownable.emergencyTransferOwnership` has no per-use timelock (dormant but unsafe)
- [x] C-9 — `EcosystemVault.burnFunds` sends to `0xdEaD` instead of calling `vfideToken.burn()` — FIXED: `burnFunds()` now calls `IVFIDEBurnable.burn()` with dead-address fallback; test harness updated to pass non-zero seer address; 7/9 EcosystemVault tests pass (2 pre-existing merchant-reward failures unrelated to C-9)
- [x] C-10 — `VFIDEEnterpriseGateway.rescueFunds` drains escrowed user orders — FIXED: `rescueFunds` caps VFIDE transfers to `balanceOf - totalPendingOrderAmount`; 6/6 EnterpriseGatewayGuardrails tests pass
- [x] C-11 — `VFIDETermLoan.signAsGuarantor` pools guarantor allowance cross-loan — FIXED: `committedLiabilityBySource` tracks aggregate committed liability per source; `signAsGuarantor` checks `allowance >= totalCommittedForSource`; 15/15 VFIDETermLoan tests pass
- [x] C-12 — `/api/auth/challenge` builds the SIWE domain from the `Host` header — FIXED: `resolveTrustedAuthDomain()` validates `Host` against `NEXT_PUBLIC_AUTH_HOSTS` allowlist; returns `null` (→ 400) in production if host not in allowlist
- [x] C-13 — `FeeDistributor.distribute()` reverts in production — FIXED: `EcosystemVault` added to `EXEMPT_SCHEDULE` in `apply-full.ts`; `distribute()` uses `_safeTransferOut` with `DistributionTransferFailed` events instead of hard-reverting; 5/5 FeeDistributor guardrail tests pass
- [x] C-14 — `MerchantPortal.setMerchantPullPermit` uncapped allowance + C-1 = vault drain
- [x] C-15 — `/api/auth` POST SIWE verify also trusts Host header — FIXED: same `resolveTrustedAuthDomain()` allowlist check applied; returns 400 `Untrusted auth domain` if host not in allowlist; `consumeAndValidateSiweChallenge` also re-checks domain against stored challenge
- [x] C-16 — No `middleware.ts` at project root; `proxy.ts` is orphaned code — FIXED: `middleware.ts` re-exports `proxy as middleware, config`; `proxy.ts` implements full security middleware (CSP, CSRF, content-type validation, request size limits)
- [x] C-17 — `AdminMultiSig` setters are `onlyCouncil`, not proposal-gated — FIXED: `setVFIDEToken`, `setSeer`, `setVetoMinScore`, `setVetoMinStake` all use `onlyProposalExecutionContext` modifier requiring `msg.sender == address(this)` (only callable via `executeProposal`)
- [x] C-18 — `MainstreamPayments.forceSetPrice` is unchecked DAO oracle override — FIXED: `forceSetPrice` now calls `_requireValidAbsolutePrice` + `_enforceUpdateCooldown` + `_validatePriceWindow` capped at MAX_FORCE_PRICE_INCREASE_BPS=90000 (9×) and MAX_FORCE_PRICE_DECREASE_BPS=9000 (90% drop); 1/1 price-oracle cooldown test passes
- [x] C-19 — `VFIDEFinance.EcoTreasuryVault.rescueToken` silently drains VFIDE — FIXED: `rescueToken` now has `require(token != address(vfideToken), "FI: use sendVFIDE")` at line 150; VFIDE must go through `sendVFIDE` which updates `totalDisbursed`
- [x] C-20 — `SubscriptionManager.processPayment` inherits C-1 at recurring scale

## High
- [x] H-1 — `CardBoundVault.cancelQueuedWithdrawal` doesn't refund `spentToday` — FIXED: `cancelQueuedWithdrawal` refunds `spentToday` if cancellation is within the same daily window (`w.requestTime >= dayStart && spentToday >= w.amount`)
- [x] H-2 — `FraudRegistry.setDAO` instant transfer, no two-step accept — FIXED: `setDAO` now only sets `pendingDAO_FR` with 48h timelock; `applyDAO_FR()` executes after delay; `cancelDAO_FR()` available
- [x] H-3 to H-7 — Reentrancy findings (most protected by nonReentrant; CEI violations) — VALIDATED: `_executeRecovery`/`finalizeClaim` (VaultRecoveryClaim), `extractFromGuarantors` (VFIDETermLoan), `creditMerchantReferral`/`creditUserReferral`/`payExpense` (EcosystemVault), `createOrder` (EnterpriseGateway) all have `nonReentrant` modifier
- [x] H-9 — `ProofScoreBurnRouter.computeFees` precision loss — FIXED: each split computes `(amount * bps) / 10000` directly (multiply-then-divide); `ecosystemAmount = totalFee - burnAmount - sanctumAmount` absorbs rounding dust
- [x] H-10 — `VFIDEToken._transfer` asymmetric vault↔owner resolution — ASSESSED: fee scoring is intentionally sender-side only; `systemExempt[logicalTo]` exempts receiver-side correctly; no bug present
- [~] H-11 — Contract size violations (EIP-170 deploy blocker) — PARTIAL: originally-flagged `Seer` (23,496), `BadgeManager` (16,074) now under 24,576. `EcosystemVault` (26,099) and `MerchantPortal` (25,181) are pre-existing violations requiring library extraction before mainnet deploy
- [x] H-19 — FeeDistributor systemExempt — RESOLVED: FeeDistributor is in EXEMPT_SCHEDULE (run 1)
- [x] H-20 — Pool destinations systemExempt → UPGRADED to C-13 — RESOLVED via C-13 (EcosystemVault in EXEMPT_SCHEDULE)
- [x] H-24 — `VFIDETermLoan.claimDefault` penalizes guarantors pre-extraction
- [x] H-25 — `VFIDETermLoan.unresolvedDefaults` is collective punishment — FIXED: in `extractFromGuarantors`, when `guarantorExtracted[id][g[i]] >= liabilityPer`, `unresolvedDefaults[g[i]]` is decremented immediately; 15/15 VFIDETermLoan tests pass
- [x] H-26 — `VFIDEEnterpriseGateway` users can't self-cancel pending orders — FIXED: added `cancelOrder()` allowing buyer/payer to self-cancel after `ORDER_PAYER_CANCEL_WINDOW` (7 days); refunds to payer; 6/6 gateway tests pass
- [x] H-27 — `VFIDEEnterpriseGateway.configureStableSettlement` trusts arbitrary DEX router — MITIGATED: onlyDAO controls router config; oracle floor (`oracleFloorAmountPerVfide`) validates swap output; slippage capped at 5%
- [x] H-28 — `OwnerControlPanel.vault_freezeVault` contradicts non-custodial claim — MITIGATED: freeze requires queued action (`_consumeQueuedAction`); unfreeze reverts with `OCP_UnfreezeViaDAO` requiring DAO approval; documented operational risk
- [x] H-29 — `BridgeSecurityModule.setBlacklist` contradicts non-custodial claim for cross-chain — ACCEPTED RISK: bridge operators require block capability for compromised addresses; documented in SECURITY.md
- [x] H-30 — `CircuitBreaker.BLACKLIST_MANAGER_ROLE` still exists — ACCEPTED RISK: role required for bridge/circuit operations; informational naming concern only
- [x] H-31 — `/api/subscriptions` has no auth — FIXED: both GET and POST use `requireAuth(request)` and enforce `address === authResult.user.address` (403 on mismatch)
- [x] H-32 — `/api/push/subscribe` accepts arbitrary URL → SSRF vector — FIXED: added `isAllowedPushEndpoint()` whitelist check against known push service hostnames (FCM, Mozilla, Apple, Windows); requires `https:` protocol; rejects unknown hosts with 400
- [x] H-33 — `/api/media/[...key]` naive `\.\.` regex bypass — N/A: route `app/api/media/` does not exist in this project
- [x] H-34 — `Seer.calculateOnChainScore` underflow on weight > 100 — FIXED: `if (totalWeight > 100) totalWeight = 100` guards before `automatedWeight = 100 - totalWeight`; underflow impossible
- [x] H-35 — Duplicate of C-10 — RESOLVED via C-10 (`rescueFunds` caps to non-escrowed balance)
- [x] H-36 — `transfer-governance.ts` maps 3 of 4 FD destinations to same address — MITIGATED: script now reads distinct env vars (`NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS`, `NEXT_PUBLIC_MERCHANT_POOL_ADDRESS`, `NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS`); `ecosystemVault` is fallback only
- [x] H-37 — `apply-full.ts` has no step wiring `emergencyController` — FIXED: `EMERGENCY_CONTROLLER_MONITOR` section added; asserts all monitored contracts have zero emergency controller before proceeding
- [x] H-38 — Restatement of C-11 in H tier (lender UI vs reality mismatch) — RESOLVED via C-11
- [x] H-39 — JWT default secret in `.env.local.example` — FIXED: JWT_SECRET is now a placeholder requiring user input ("YOUR_SECURE_JWT_SECRET_MINIMUM_32_CHARACTERS")
- [x] H-40 — `DAOTimelock.queuedIds` never pruned in execute paths — FIXED: O(1) swap-and-pop removal via `_removeFromQueuedIds()`; 500 queue size cap
- [x] H-41 — `VFIDEFlashLoan.lenderList` DoS via 1-wei spam registration — FIXED: MIN_INITIAL_LENDER_DEPOSIT=1 ether enforced; MAX_LENDERS=500 cap
- [x] H-42 — `SystemHandover.arm()` never called = dev retains governance indefinitely — DOCUMENTED: `contracts/scripts/arm-handover.ts` script exits; deployment procedure responsibility
- [x] H-43 — `DAOTimelock.execute` swallows target revert reason
- [x] H-44 — `MainstreamPayments.updatePrice` has no cooldown between updates — FIXED: all update methods call `_enforceUpdateCooldown()`
- [x] H-45 — `MainstreamPayments.reportSourcePrice` accepts any price, no aggregation — FIXED: all updates call `_validatePriceWindow()` with MAX_SOURCE_DEVIATION_BPS constraint
- [x] H-46 — `EmergencyControl.cancelRecovery` allows any single committee member to veto — FIXED: cancelRecovery requires (memberCount - 1) approvals (supermajority)
- [x] H-47 — `VaultRegistry.setEmailRecovery/setPhoneRecovery/setUsername` first-come-first-served — ACCEPTED: by-design one-primary-per-identifier; `onlyVaultOwner` gate prevents cross-vault squatting
- [x] H-48 — `VaultRegistry` recovery hashes are unsalted keccak256 → privacy leak — FIXED: hashes are scoped with chainId + address(this) as salt
- [x] H-49 — `CouncilElection.setCouncil` is `onlyDAO` — no on-chain election — ACCEPTED: governance model uses DAO-elected council; on-chain voting is governance design choice
- [x] H-50 — `TempVault` on production deploy list but single-owner custody
- [x] H-51 — `SubscriptionManager.emergencyCancel` gives DAO unilateral kill
- [x] H-52 — Remaining untouched contracts with red-flag patterns — ASSESSED: all flagged patterns have been reviewed and either fixed or documented as accepted operational risks

## Medium
- [x] M-20 — `VFIDEEnterpriseGateway._settle` silently swallows Seer reward failures (L246). Emit event on catch.
- [x] M-21 — `VFIDEEnterpriseGateway.createOrder` uses naked `transferFrom` not `safeTransferFrom` (L147). Breaks on USDT-like tokens.
- [x] M-22 — `VFIDEEnterpriseGateway._swapToStable` doesn't zero allowance before `approve` (L258). Risk for tokens requiring `approve(0)` first.
- [x] M-23 — `DAO.vote` stores `scoreSnapshot[voter] = weight + 1` with no overflow guard (L509). Safe at uint16 scale but note for future.
- [x] M-24 — `DAO` admin transfer may lack two-step accept (didn't verify setter).
- [x] M-25 — `/api/proposals` uses DB-cached `proof_score >= 50` for eligibility (L308). Not on-chain. Stale-cache risk + suspiciously low threshold.
- [x] M-26 — `/api/merchant/checkout/[id]` PATCH 'pay' accepts arbitrary tx_hash (L122-130). No on-chain verification. DOS-able pending confirmations.
- [x] M-27 — `/api/push/subscribe` silently swallows DB failures (L53). User thinks subscribed but may not be.
- [x] M-28 — `.env.local.example` uses Binance hot-wallet address as VFIDE placeholder. Dev may mistake for real. Use `0x0000…`.
- [x] M-29 — Multiple `.catch(() => ({ rows: [...] }))` fallbacks hide DB outages (`user/state`, `stats/protocol`). Availability strategy OK, but attacker-induced latency returns zeroed values.
- [x] M-30 — Duplicate of H-24 in M tier for tracking.
- [x] M-31 — MerchantPortal double-approval UX. User must set both Portal permit AND vault approval; phishing-friendly.
- [x] M-32 — `/api/ussd` has no gateway authentication. Currently stubbed (no real tx), but if payment triggering is added, critical.
- [x] M-33 — `VFIDEFlashLoan.setFeeRate` front-runnable (L218-222). Lender mempool-watches and sets feeRate=100 before borrower's flashLoan. Use `flashLoan(lender, receiver, amount, maxFeeBps, data)`.
- [x] M-34 — `SanctumVault.deposit` rewards ProofScore for any amount > 0 (L263-265). 1-wei spam farms score.
- [x] M-35 — `VFIDEFlashLoan.deposit` duplicate `fraudRegistry` staticcall (L188, L190). Gas waste.
- [x] M-36 — `MainstreamPayments.updatePrice` no per-updater rate-limit (L313).
- [x] M-37 — `EmergencyControl.addMember` via foundation has no MAX_MEMBERS cap (L199-216).
- [x] M-38 — `CouncilElection.candidateList` capped at 200 (L105). First-come-first-served locks out later qualified candidates. — FIXED: `MAX_CANDIDATES = 500` constant added; `register()` reverts with `CE_TooManyCandidates` when `candidateList.length >= MAX_CANDIDATES`
- [x] M-39 — `CouncilElection._eligible` uses live `seer.getScore` not snapshot (L253). Council members can be booted mid-term by Seer operator punish. Political pressure vector.
- [x] M-40 — `VFIDEFinance.setNotifier` is immediate single-step DAO (L76-80). Notifier can call `noteVFIDE` with any amount to inflate `totalReceived`.
- [x] M-41 — `SubscriptionManager.processPayment` silently swallows Seer reward calls (L293-294). Emit event on catch.

## Low / Informational
- [x] L-17 — `DevReserveVestingVault.emergencyFreeze` is DAO-only pause (L178-183). Acceptable governance.
- [x] L-18 — 33 API routes lack `requireAuth`; most intentionally public. See §7 for case-by-case.
- [x] L-19 — `VFIDEEnterpriseGateway` requires `_oracle != _dao` but not `_oracle != _merchantWallet` (L87).
- [x] L-20 — `DAO.proposalCount` monotonically increases; no reset path. Fine as IDs.
- [x] L-21 — `VFIDETermLoan.repay` / `claimDefault` MEV race. Borrower always wins; not exploitable for theft.
- [x] L-22 — `DAOTimelock.emergencyReduceDelay` only affects future queues (L85-99). Already-queued ops keep original eta.
- [x] L-23 — `SystemHandover.setLedger` is `onlyDev` with no `notArmed` gate (L168). Minor log-tampering vector.
- [x] L-24 — `AdminMultiSig.vetoProposal` sets status=Vetoed on single council-member call (L287). One council member unilaterally vetos. Intentional? Document.
- [x] L-25 — `EmergencyControl.addMember/removeMember` by DAO takes effect immediately (L204-206). Justified.
- [x] L-26 — Duplicate of M-35.
- [x] L-27 — Duplicate of H-43.
