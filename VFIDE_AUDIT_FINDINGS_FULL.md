# VFIDE Protocol — Consolidated Security Audit Findings

**Audit scope:** 7-stage adversarial audit of Solidity contracts, API routes, deployment wiring, environment files, and Next.js middleware.

**Coverage:** ~50% of the 109-contract Solidity surface (by LOC of safety-relevant contracts), ~15% of the 120 API routes (18 routes spot-checked), deployment wiring, 6 `.env.*.example` files, Next.js middleware verification.

**Uncovered:** ~50% of Solidity surface (detailed in §8), ~85% of API routes, websocket server, 101 frontend pages (~220K TS/TSX LOC), test coverage gaps.

**Running totals:**
- **20 Critical** (C-1 through C-20; C-4 resolved → **19 unresolved**)
- **52 High** (H-1 through H-52)
- **41 Medium** (M-1 through M-41)
- **27 Low / Informational** (L-1 through L-27)
- **~140 total findings**

---

## Table of Contents

1. [Critical findings](#1-critical-findings)
2. [High findings](#2-high-findings)
3. [Medium findings](#3-medium-findings)
4. [Low / Informational findings](#4-low--informational-findings)
5. [Priority-1 fix list](#5-priority-1-fix-list)
6. [Deployment wiring status](#6-deployment-wiring-status)
7. [API route auth-coverage summary](#7-api-route-auth-coverage-summary)
8. [Residual audit surface](#8-residual-audit-surface)
9. [Recommendations](#9-recommendations)

---

## 1. Critical findings

### C-1 — `CardBoundVault.approveVFIDE`/`approveERC20` bypass the 7-day withdrawal queue

**Status:** Open
**File:** `contracts/CardBoundVault.sol` L347, L358
**Impact:** Complete vault drain by any compromised admin/signer.

The `approveVFIDE` and `approveERC20` functions bypass the 7-day withdrawal queue. An attacker who compromises an admin key approves their own address, then calls `VFIDEToken.transferFrom`, which auto-creates an attacker vault and drains funds instantly. This invalidates the core marketing claim that "withdrawals require 7 days."

**Fix:** Either gate `approveVFIDE`/`approveERC20` through the withdrawal queue (amount + recipient + 7-day wait), or cap approved amounts at the vault's daily transfer limit.

---

### C-2 — `CardBoundVault.rescueNative`/`rescueERC20` bypass the queue for non-VFIDE assets

**Status:** Open
**File:** `contracts/CardBoundVault.sol`
**Impact:** Instant drain of stablecoins and other ERC20 balances.

The "rescue" functions bypass the withdrawal queue for all non-VFIDE tokens. Stablecoins held in a vault (USDC, USDT) can be drained immediately.

**Fix:** Route rescue through the withdrawal queue or restrict to a DAO multisig with its own timelock.

---

### C-3 — `WithdrawalQueueStub` (abstract implementation) deployed to production

**Status:** Open
**File:** `contracts/DeployPhase1Infrastructure.sol:27`
**Impact:** Dead / dangerous contract in production path.

`DeployPhase1Infrastructure.sol:27` deploys `WithdrawalQueueStub`, which has admin-settable user balances. This is scaffolding that should not be in the production deploy path.

**Fix:** Replace with the real `WithdrawalQueue` contract before any mainnet deployment.

---

### C-4 — FraudRegistry systemExempt wiring ✅ RESOLVED

**Status:** Resolved via `apply-phase2.ts` L24-29 (propose → 48h → confirm flow)
**File:** `scripts/apply-all.ts`, `scripts/apply-phase2.ts`

---

### C-5 — `VaultRecoveryClaim.guardianVote` calls non-existent method on CardBoundVault

**Status:** Open
**File:** `contracts/VaultRecoveryClaim.sol:332`
**Impact:** Entire VRC recovery system is dead code for production vaults.

`VaultRecoveryClaim.guardianVote` (L332) calls `isGuardianMature()`, but that method only exists on `UserVaultLegacy` (`VaultInfrastructure.sol:270`), NOT on `CardBoundVault` (the primary vault). Every guardian vote against a CardBoundVault will revert, making the entire recovery flow unusable.

**Fix:** Add `isGuardianMature()` to CardBoundVault, or update VaultRecoveryClaim to use a method that exists on CBV.

---

### C-6 — `VaultHub.executeRecoveryRotation` — single recovery-approver unilateral custody

**Status:** Open
**File:** `contracts/VaultHub.sol:469`
**Impact:** Structural custody hole.

`VaultHub.executeRecoveryRotation` (L469) gates only on `isRecoveryApprover`. No challenge period. No guardian verification at the hub layer. Compromise of one recovery-approver key = unilateral custody over any vault in the system.

**Fix:** Require guardian co-signature at the hub layer, add a challenge period (e.g., 72 hours) where vault owner can cancel, or require M-of-N recovery approvers.

---

### C-7 — Single-guardian default + 30-day grace = permanent lockout on lost phone

**Status:** Open
**File:** `contracts/VaultHub.sol` L494-495 (creation code), `GUARDIAN_SETUP_GRACE = 30 days`
**Impact:** Breaks the core "recovery without seed phrases" promise.

The default `_creationCode` sets single-guardian mode with a 30-day `GUARDIAN_SETUP_GRACE` period. A user who loses their wallet in month 1 (before guardian setup is complete) cannot recover. This is the inverse of the intended design: for the African market-seller demographic VFIDE targets, lost-phone scenarios are the primary risk.

**Fix:** Make guardian onboarding non-optional during vault setup, OR shorten the grace period, OR require at least 2 guardians to be active before the vault can hold > N VFIDE.

---

### C-8 — `Ownable.emergencyTransferOwnership` has no per-use timelock (dormant but unsafe)

**Status:** Open / Dormant
**File:** `contracts/SharedInterfaces.sol:361`
**Impact:** Instant ownership takeover if ever activated.

`Ownable.emergencyTransferOwnership` has no per-use timelock. Compromise of `emergencyController` = instant ownership of any Ownable contract. Currently dormant because no deploy script calls `setEmergencyController`. But the contract code does not enforce "must remain zero" — a future admin can turn this on without realizing the timelock gap.

**Fix:** Add a per-use timelock (e.g., 7-day delay between `emergencyTransferOwnership` call and actual ownership change), or add a compile-time `require(emergencyController == address(0))` guard.

---

### C-9 — `EcosystemVault.burnFunds` sends to `0xdEaD` instead of calling `vfideToken.burn()`

**Status:** Open
**File:** `contracts/EcosystemVault.sol:1091`
**Impact:** Deflationary narrative is false for this burn path.

`EcosystemVault.burnFunds` (L1091) sends tokens to `0xdEaD` instead of calling `vfideToken.burn()`. Comment claims VFIDEToken has no burn function, but `VFIDEToken.burn()` exists at L358. The total supply is unchanged by the dead-address transfer — only the tokens are parked, not burned. The "deflationary" narrative is false for this path.

**Fix:** Replace `safeTransfer(DEAD_ADDRESS, amount)` with `vfideToken.burn(amount)`.

---

### C-10 — `VFIDEEnterpriseGateway.rescueFunds` drains escrowed user orders

**Status:** Open
**File:** `contracts/VFIDEEnterpriseGateway.sol:306-308`
**Impact:** DAO can take every user's pending-order funds.

```solidity
function rescueFunds(address _token, uint256 _amount, address _to) external onlyDAO nonReentrant {
    IERC20(_token).safeTransfer(_to, _amount);
}
```

No amount bounds check, no token restriction. DAO can `rescueFunds(vfide, totalEscrowedBalance, daoWallet)` and take every pending-order fund.

**Fix:** Require `balance - sumOfPendingOrders >= _amount`, or restrict `_token` to non-VFIDE tokens only.

---

### C-11 — `VFIDETermLoan.signAsGuarantor` pools guarantor allowance cross-loan

**Status:** Open
**File:** `contracts/VFIDETermLoan.sol:357-358`
**Impact:** Lenders believe they have coverage they don't have.

`signAsGuarantor` only checks `vfideToken.allowance(approvalSource, termLoan) >= liabilityPerGuarantor`. The allowance is a single shared VFIDE bucket, not scoped per loan. A user signing on to 10 loans with 100 VFIDE liability each needs just 100 VFIDE of approval to pass the check — effectively guaranteeing 1,000 VFIDE of aggregate risk with 100 VFIDE of actual capacity. If only one defaults, the first extraction drains the bucket; subsequent defaults silently fail in the `try`/`catch` at L681-684.

**Fix:** Maintain a per-guarantor `committedLiability` map and require `allowance >= sum(all active liabilities)` at sign time.

---

### C-12 — `/api/auth/challenge` builds the SIWE domain from the `Host` header

**Status:** Open
**File:** `app/api/auth/challenge/route.ts:34`
**Impact:** SIWE phishing via Host-header spoofing.

```typescript
const hostHeader = request.headers.get('host') || 'vfide.io';
```

The Host header is attacker-controlled. A phishing page proxying through `evil.com` causes the server to issue SIWE challenges saying "evil.com wants you to sign in." Many users won't notice the domain mismatch.

**Fix:** Hardcode the expected domain from an env var (`process.env.SITE_DOMAIN`) and reject requests with mismatched Host.

---

### C-13 — `FeeDistributor.distribute()` reverts in production

**Status:** Open
**File:** `scripts/transfer-governance.ts` L184-189, `scripts/apply-full.ts` L38-42
**Impact:** Fee distribution mechanism fundamentally broken on any network.

`transfer-governance.ts` L184-189 wires FD destinations as `sanctum → SanctumVault`, `daoPayroll → EcosystemVault`, `merchantPool → EcosystemVault`, `headhunterPool → EcosystemVault`. But `apply-full.ts` L38-42 `EXEMPT_SCHEDULE` only covers `FeeDistributor`, `FraudRegistry`, `VFIDEFlashLoan` — NOT `EcosystemVault`. EcosystemVault isn't a sink, isn't whitelisted, isn't a VaultHub-registered vault. First transfer to it reverts with `Token_NotVault`, taking down the whole `distribute` call. Every fee subsequently accumulates at the FeeDistributor address with no way to release it except a code upgrade.

**Fix:** Add `EcosystemVault` to the exemption schedule (propose → wait 48h → confirm), or make it a VaultHub-registered vault.

---

### C-14 — `MerchantPortal.setMerchantPullPermit` uncapped allowance + C-1 = vault drain

**Status:** Open
**File:** `contracts/MerchantPortal.sol:597-606`
**Impact:** Phishing-assisted full vault drain.

`setMerchantPullPermit(merchant, maxAmount, expiresAt)` accepts `maxAmount = type(uint256).max` and unbounded `expiresAt`. Combined with C-1 (CardBoundVault.approveVFIDE bypasses the queue), a phished user can be tricked into signing a transaction that (a) grants MerchantPortal an unlimited scoped permit and (b) approves MerchantPortal for unlimited VFIDE. The merchant (or anyone who compromises the merchant key) can then drain the vault via `processPayment` with no queue, no guardian cancel, no daily limit.

**Fix:** Cap `maxAmount` at the vault's `dailyTransferLimit` and cap `expiresAt` at a maximum duration (e.g., 90 days).

---

### C-15 — `/api/auth` POST SIWE verify also trusts Host header

**Status:** Open
**File:** `app/api/auth/route.ts:113`
**Impact:** Same as C-12 — SIWE phishing.

Same host-header-trust pattern as C-12, but on the verification side. Because both sides trust the Host header, a phishing proxy on `evil.com` issues a challenge with `domain="evil.com"`, the user signs, and the verify happily accepts because the header is the same on both requests. The attacker's proxy now holds a SIWE signature valid against the real backend.

**Fix:** Both routes must use a hardcoded expected domain from env var, and reject requests whose Host doesn't match.

---

### C-16 — No `middleware.ts` at project root; `proxy.ts` is orphaned code

**Status:** Open
**File:** `proxy.ts` exists but is not Next.js middleware; `middleware.ts` does not exist at root
**Impact:** 81 POST API routes have zero CSRF protection; CSP/body limits/CORS are all dormant.

`next.config.ts:74` claims "CSP is enforced in `proxy.ts`, with `middleware.ts` kept as a compatibility shim" — but `find . -name 'middleware*'` returns only `lib/auth/middleware.ts` (an auth helper). `proxy.ts` exports `proxy`, not `middleware`, so Next.js never calls it. Consequences:

- **81 POST routes** have ZERO CSRF protection (no route individually calls `verifyCSRFToken`).
- **CSP nonce** is not set on any response.
- **Request body size limits** (10KB/100KB/1MB tiers in `proxy.ts`) are not enforced.
- **Content-Type validation** is not enforced.
- **CORS origin allowlist** is not enforced.

Static headers (X-Frame-Options, HSTS) that are set at `next.config.ts:75-114` DO work — those go through the built-in `headers()` hook. But everything dynamic is dormant.

**Fix:** `mv proxy.ts middleware.ts` and rename the export from `proxy` to `middleware` (or `export default`). Then smoke-test every POST route for breakage.

---

### C-17 — `AdminMultiSig` setters are `onlyCouncil`, not proposal-gated

**Status:** Open
**File:** `contracts/AdminMultiSig.sol:126-149`
**Impact:** Any single council member can freeze governance.

`setVFIDEToken` (L126), `setSeer` (L133), `setVetoMinScore` (L140), `setVetoMinStake` (L146) all bypass the proposal → approval → execute flow. Any single council member can:
- Replace the VFIDE token (breaks fallback stake checks).
- Replace the Seer oracle (redirect community-veto eligibility to an attacker contract).
- Set `vetoMinScore = 0` (any Sybil wallet can community-veto).
- Set `vetoMinStake = 0` (same, for token-balance fallback).

Attack: compromise 1 out of 5 council keys → `setVetoMinScore(0)` → rent 1000 zero-balance wallets → veto every legitimate council proposal → governance permanently frozen. Recovery requires electing a new council, which the frozen council controls.

**Fix:** Gate these setters behind the normal proposal flow (`require(msg.sender == address(this))`), routed through `executeProposal`.

---

### C-18 — `MainstreamPayments.forceSetPrice` is unchecked DAO oracle override

**Status:** Open
**File:** `contracts/MainstreamPayments.sol:333-339`
**Impact:** One DAO action captures the entire USD→VFIDE oracle.

```solidity
function forceSetPrice(uint256 newPrice) external onlyDAO nonReentrant {
    require(newPrice > 0, "PO: zero price");
    vfidePerUsd = newPrice;
    lastUpdateTime = block.timestamp;
    emit PriceUpdated(...);
}
```

Comment admits the 50% sanity check was removed to allow DAO recovery. A single malicious DAO proposal → oracle price set to arbitrary value → every USD-denominated checkout computes wrong VFIDE amount. User overpays 1000× or merchant receives 0.001×.

**Fix:** Cap the force at ±10× current price, OR require multi-sig committee co-approval, OR apply a 48-hour timelock specifically to force-set.

---

### C-19 — `VFIDEFinance.EcoTreasuryVault.rescueToken` silently drains VFIDE

**Status:** Open
**File:** `contracts/VFIDEFinance.sol:110-115`
**Impact:** DAO treasury drain hidden from on-chain accounting.

`rescueToken(token, to, amount)` accepts `token == vfideToken`. Unlike `sendVFIDE` (L95) which updates `totalDisbursed`, `rescueToken` doesn't touch accounting counters. `getTreasurySummary` still shows the full balance after a drain. A malicious/compromised DAO extracts VFIDE while the books show nothing wrong.

**Fix:** `require(token != address(vfideToken), "FI: use sendVFIDE")` in `rescueToken`.

---

### C-20 — `SubscriptionManager.processPayment` inherits C-1 at recurring scale

**Status:** Open
**File:** `contracts/SubscriptionManager.sol:289`
**Impact:** Approval phishing compounded over recurring intervals.

`processPayment` requires userVault to have approved SubscriptionManager. Per C-1, `CardBoundVault.approveVFIDE` bypasses the 7-day withdrawal queue. Once the allowance is set, it's consumed per period with no opportunity for the user to reconsider. Combined with `modifySubscription` (L194) where the subscriber can change amount/interval, an attacker who phishes a user into a large allowance can repeatedly pull funds each interval.

**Fix:** Fixing C-1 (make `approveVFIDE` subject to queue or daily-limit checks) also resolves C-20.

---

## 2. High findings

### H-1 — `CardBoundVault.cancelQueuedWithdrawal` doesn't refund `spentToday`
`contracts/CardBoundVault.sol:567-580`. User loses daily budget on cancel.

### H-2 — `FraudRegistry.setDAO` instant transfer, no two-step accept
`contracts/FraudRegistry.sol:335`. Should use propose→accept pattern.

### H-3 to H-7 — Reentrancy findings (most protected by nonReentrant; CEI violations)
- `VaultRecoveryClaim._executeRecovery`/`finalizeExecution`
- `VFIDETermLoan.extractFromGuarantors`
- `EcosystemVault.creditMerchantReferral`/`creditUserReferral`/`payExpense`
- `UserVaultLegacy.transferVFIDE`
- `VFIDEEnterpriseGateway.createOrder`

### H-9 — `ProofScoreBurnRouter.computeFees` precision loss
`contracts/ProofScoreBurnRouter.sol:532-617`. Multiplication-after-division.

### H-10 — `VFIDEToken._transfer` asymmetric vault↔owner resolution
`contracts/VFIDEToken.sol:1112`. Only sender-side via `_resolveFeeScoringAddress`.

### H-11 — Contract size violations (EIP-170 deploy blocker)
`Seer`, `BadgeManager`, `VFIDETrust` exceed 24,576 bytes. **Will not deploy on mainnet as-is.**

### H-19 — FeeDistributor systemExempt ✅ RESOLVED
Covered by `apply-full.ts` L38-42.

### H-20 — Pool destinations systemExempt → UPGRADED to C-13

### H-24 — `VFIDETermLoan.claimDefault` penalizes guarantors pre-extraction
`contracts/VFIDETermLoan.sol:594-626`. Guarantors hit with unresolvedDefaults and score punishment before any extraction is attempted.

### H-25 — `VFIDETermLoan.unresolvedDefaults` is collective punishment
`contracts/VFIDETermLoan.sol:730-732`. Only decrements when the borrower repays. Honest guarantors who fully pay their share remain blocked from future guaranteeing.

### H-26 — `VFIDEEnterpriseGateway` users can't self-cancel pending orders
`contracts/VFIDEEnterpriseGateway.sol:313`. Only oracle/DAO can refund. If both go silent, user funds stuck forever.

### H-27 — `VFIDEEnterpriseGateway.configureStableSettlement` trusts arbitrary DEX router
`contracts/VFIDEEnterpriseGateway.sol:181-197`. Malicious router via DAO can block settlements.

### H-28 — `OwnerControlPanel.vault_freezeVault` contradicts non-custodial claim
`contracts/OwnerControlPanel.sol:820-829`. Owner reports severity 100 to PanicGuard for 30 days = effective freeze.

### H-29 — `BridgeSecurityModule.setBlacklist` contradicts non-custodial claim for cross-chain
`contracts/BridgeSecurityModule.sol:230`. Owner can blacklist any user from using the bridge.

### H-30 — `CircuitBreaker.BLACKLIST_MANAGER_ROLE` still exists
Role/counter naming signals centralized control. Rename to `SECURITY_ALERT_ROLE` for narrative coherence.

### H-31 — `/api/subscriptions` has no auth
`app/api/subscriptions/route.ts:154`. POST accepts `body.address` without JWT check. Anyone can spoof/enumerate any user's subscriptions.

### H-32 — `/api/push/subscribe` accepts arbitrary URL → SSRF vector
`app/api/push/subscribe/route.ts:11`. `endpoint: z.string().url()`. Attacker can register internal metadata URLs.

### H-33 — `/api/media/[...key]` naive `\.\.` regex bypass
`app/api/media/[...key]/route.ts:30`. Defeatable; dev-only but still exposed on dev boxes.

### H-34 — `Seer.calculateOnChainScore` underflow on weight > 100
`contracts/Seer.sol:596`. `uint256 automatedWeight = 100 - totalWeight` — single DAO-added bad score source bricks token transfers when `policyLocked`.

### H-35 — Duplicate of C-10 (counted once in C list)

### H-36 — `transfer-governance.ts` maps 3 of 4 FD destinations to same address
`scripts/transfer-governance.ts:184-189`. `daoPayroll`, `merchantPool`, `headhunterPool` all → same EcosystemVault. Pointless separation + commingled accounting.

### H-37 — `apply-full.ts` has no step wiring `emergencyController`
Dormant C-8. Safety is accidental. Add explicit assertion that `emergencyController` must remain zero.

### H-38 — Restatement of C-11 in H tier (lender UI vs reality mismatch)

### H-39 — JWT default secret in `.env.local.example`
`JWT_SECRET=local-dev-only-change-me-32-chars-min`. Developers who copy verbatim and expose dev servers have forgeable tokens.

### H-40 — `DAOTimelock.queuedIds` never pruned in execute paths
`contracts/DAOTimelock.sol:109-179`. Only `cancel` removes IDs. Cap `queuedIds.length < 500` hits on lifetime total, so protocol governance ossifies permanently at 500 queued operations.

### H-41 — `VFIDEFlashLoan.lenderList` DoS via 1-wei spam registration
`contracts/VFIDEFlashLoan.sol:187-203`, `MAX_LENDERS = 500`. Attacker registers 500 wallets with 1 wei each on a cheap L2, permanently consumes the cap.

### H-42 — `SystemHandover.arm()` never called = dev retains governance indefinitely
`contracts/SystemHandover.sol:69-76`. Contract doesn't self-arm. No on-chain enforcement. Marketing implies decentralization; reality is dev keys remain live.

### H-43 — `DAOTimelock.execute` swallows target revert reason
`contracts/DAOTimelock.sol:128`. `require(ok, "exec failed")`. Bubble up `r` for debuggability.

### H-44 — `MainstreamPayments.updatePrice` has no cooldown between updates
`contracts/MainstreamPayments.sol:317-321`. Updater compromise = walk price 1.5× per block → 10× in ~5 blocks.

### H-45 — `MainstreamPayments.reportSourcePrice` accepts any price, no aggregation
`contracts/MainstreamPayments.sol:409-415`. Single source = single point of failure.

### H-46 — `EmergencyControl.cancelRecovery` allows any single committee member to veto
`contracts/EmergencyControl.sol:540`. One compromised/colluding member can indefinitely cancel every recovery proposal.

### H-47 — `VaultRegistry.setEmailRecovery/setPhoneRecovery/setUsername` first-come-first-served
`contracts/VaultRegistry.sol:207,232,258`. Attacker who knows target's email can pre-register `keccak256(email)` to attacker's vault, permanently blocking the target from using email recovery.

### H-48 — `VaultRegistry` recovery hashes are unsalted keccak256 → privacy leak
`contracts/VaultRegistry.sol:183,256`. Phone numbers are 10-12 digits; all 220M Nigerian numbers brute-forceable in hours. `searchByPhone(hash)` then reveals the vault address — de-anonymizing users on-chain. For a protocol targeting populations where privacy is a safety issue, this is serious.

### H-49 — `CouncilElection.setCouncil` is `onlyDAO` — no on-chain election
`contracts/CouncilElection.sol:137`. DAO hands in an address array; contract accepts. No vote counting. "CouncilAppointment," not "CouncilElection" — documentation misleading.

### H-50 — `TempVault` on production deploy list but single-owner custody
`contracts/PRODUCTION_SET.md:52`, `contracts/TempVault.sol:48`. Contract's own comment warns against production use. Either remove from list or replace with multi-sig-controlled SanctumVault.

### H-51 — `SubscriptionManager.emergencyCancel` gives DAO unilateral kill
`contracts/SubscriptionManager.sol:213`. No timelock. No subscriber notification. Should require tripped breaker or panic-guard signal, not plain `onlyDAO`.

### H-52 — Remaining untouched contracts with red-flag patterns
Stage 7 red-flag scan flagged StablecoinRegistry (6 hits), PayrollManager (4), plus 3 large SeerX contracts (~2200 LOC total) completely unaudited. These need full pass before paid audit.

---

## 3. Medium findings

- **M-20** — `VFIDEEnterpriseGateway._settle` silently swallows Seer reward failures (L246). Emit event on catch.
- **M-21** — `VFIDEEnterpriseGateway.createOrder` uses naked `transferFrom` not `safeTransferFrom` (L147). Breaks on USDT-like tokens.
- **M-22** — `VFIDEEnterpriseGateway._swapToStable` doesn't zero allowance before `approve` (L258). Risk for tokens requiring `approve(0)` first.
- **M-23** — `DAO.vote` stores `scoreSnapshot[voter] = weight + 1` with no overflow guard (L509). Safe at uint16 scale but note for future.
- **M-24** — `DAO` admin transfer may lack two-step accept (didn't verify setter).
- **M-25** — `/api/proposals` uses DB-cached `proof_score >= 50` for eligibility (L308). Not on-chain. Stale-cache risk + suspiciously low threshold.
- **M-26** — `/api/merchant/checkout/[id]` PATCH 'pay' accepts arbitrary tx_hash (L122-130). No on-chain verification. DOS-able pending confirmations.
- **M-27** — `/api/push/subscribe` silently swallows DB failures (L53). User thinks subscribed but may not be.
- **M-28** — `.env.local.example` uses Binance hot-wallet address as VFIDE placeholder. Dev may mistake for real. Use `0x0000…`.
- **M-29** — Multiple `.catch(() => ({ rows: [...] }))` fallbacks hide DB outages (`user/state`, `stats/protocol`). Availability strategy OK, but attacker-induced latency returns zeroed values.
- **M-30** — Duplicate of H-24 in M tier for tracking.
- **M-31** — MerchantPortal double-approval UX. User must set both Portal permit AND vault approval; phishing-friendly.
- **M-32** — `/api/ussd` has no gateway authentication. Currently stubbed (no real tx), but if payment triggering is added, critical.
- **M-33** — `VFIDEFlashLoan.setFeeRate` front-runnable (L218-222). Lender mempool-watches and sets feeRate=100 before borrower's flashLoan. Use `flashLoan(lender, receiver, amount, maxFeeBps, data)`.
- **M-34** — `SanctumVault.deposit` rewards ProofScore for any amount > 0 (L263-265). 1-wei spam farms score.
- **M-35** — `VFIDEFlashLoan.deposit` duplicate `fraudRegistry` staticcall (L188, L190). Gas waste.
- **M-36** — `MainstreamPayments.updatePrice` no per-updater rate-limit (L313).
- **M-37** — `EmergencyControl.addMember` via foundation has no MAX_MEMBERS cap (L199-216).
- **M-38** — `CouncilElection.candidateList` capped at 200 (L105). First-come-first-served locks out later qualified candidates.
- **M-39** — `CouncilElection._eligible` uses live `seer.getScore` not snapshot (L253). Council members can be booted mid-term by Seer operator punish. Political pressure vector.
- **M-40** — `VFIDEFinance.setNotifier` is immediate single-step DAO (L76-80). Notifier can call `noteVFIDE` with any amount to inflate `totalReceived`.
- **M-41** — `SubscriptionManager.processPayment` silently swallows Seer reward calls (L293-294). Emit event on catch.

---

## 4. Low / Informational findings

- **L-17** — `DevReserveVestingVault.emergencyFreeze` is DAO-only pause (L178-183). Acceptable governance.
- **L-18** — 33 API routes lack `requireAuth`; most intentionally public. See §7 for case-by-case.
- **L-19** — `VFIDEEnterpriseGateway` requires `_oracle != _dao` but not `_oracle != _merchantWallet` (L87).
- **L-20** — `DAO.proposalCount` monotonically increases; no reset path. Fine as IDs.
- **L-21** — `VFIDETermLoan.repay` / `claimDefault` MEV race. Borrower always wins; not exploitable for theft.
- **L-22** — `DAOTimelock.emergencyReduceDelay` only affects future queues (L85-99). Already-queued ops keep original eta.
- **L-23** — `SystemHandover.setLedger` is `onlyDev` with no `notArmed` gate (L168). Minor log-tampering vector.
- **L-24** — `AdminMultiSig.vetoProposal` sets status=Vetoed on single council-member call (L287). One council member unilaterally vetos. Intentional? Document.
- **L-25** — `EmergencyControl.addMember/removeMember` by DAO takes effect immediately (L204-206). Justified.
- **L-26** — Duplicate of M-35.
- **L-27** — Duplicate of H-43.

---

## 5. Priority-1 fix list

Fix these 10 items first. They collapse the most expensive audit findings and remove the non-custodial-narrative contradictions.

1. **C-1 + C-14** — approveVFIDE bypass + unbounded merchant permit. Both exploit the same underlying hole; fix together.
2. **C-5** — VRC broken on CBV (missing `isGuardianMature`).
3. **C-6** — VaultHub unilateral recovery approver.
4. **C-7** — Single-guardian 30-day window = permanent lockout. Enforce multi-guardian at vault creation.
5. **C-9** — Fake burn in EcosystemVault. 1-line fix.
6. **C-10** — EnterpriseGateway.rescueFunds drains escrow. Add `sumOfPendingOrders` guard.
7. **C-11** — Guarantor allowance pooling. Per-guarantor `committedLiability` tracking.
8. **C-12 + C-15** — SIWE Host-header. 2-line fix across both endpoints.
9. **C-13** — FeeDistributor reverts. Add EcosystemVault to EXEMPT_SCHEDULE.
10. **C-16** — `mv proxy.ts middleware.ts` and rename export. Smoke-test 81 POST routes after.
11. **H-11** — EIP-170 contract-size blockers on Seer, BadgeManager, VFIDETrust. Split before mainnet.

---

## 6. Deployment wiring status

### System exemptions

| Contract | Status |
|---|---|
| FeeDistributor | ✅ `apply-full.ts` L38-42 proposes + confirms |
| FraudRegistry | ✅ `apply-phase2.ts` L24-29 propose + confirm |
| VFIDEFlashLoan | ✅ `apply-full.ts` L38-42 (third in schedule) |
| EcosystemVault | ❌ **Missing — causes C-13** |

### Treasury/sink wiring

| Sink | Status |
|---|---|
| `treasurySink` | ✅ `transfer-governance.ts:57` propose + `apply-full.ts` apply |
| `sanctumSink` | ✅ `transfer-governance.ts:66` propose + `apply-full.ts` apply |

### FeeDistributor destinations (per `transfer-governance.ts:184-189`)

| Name | Destination | Notes |
|---|---|---|
| sanctum | SanctumVault | Works via sanctumSink |
| daoPayroll | EcosystemVault | ❌ Reverts (C-13) |
| merchantPool | EcosystemVault | ❌ Reverts (C-13) + H-36 (same address) |
| headhunterPool | EcosystemVault | ❌ Reverts (C-13) + H-36 (same address) |

### Governance handover

- `SystemHandover.arm()` — no script calls this (H-42).
- `emergencyController` — no script sets this (safe by accident — C-8 / H-37).

---

## 7. API route auth-coverage summary

**120 total routes; 18 spot-checked**

### Intentionally public (14 routes — OK)

- `stats/protocol`, `loans`, `crypto/fees`, `crypto/price`
- `auth/challenge`, `auth/route` (SIWE — but see C-12/C-15)
- `badges/metadata/[badge]/[tokenId]`, `referral`, `community/stories`
- `leaderboard/headhunter`, `csrf`, `platform/categories`
- `security/csp-report`, `health`
- `merchant/checkout/[id]` (public invoice view)
- `merchant/directory`, `merchant/coupons/validate`

### Problematic (9 routes)

| Route | Finding |
|---|---|
| `ussd` | M-32 (no gateway auth) |
| `user/state` | Privacy leak — enumerates wallet → score/merchant/loan data |
| `subscriptions` | H-31 (no auth; spoof/enumerate) |
| `pos/charge` | Low risk stub, unauth |
| `media/[...key]` | H-33 (dev-only weak traversal guard) |
| `auth/challenge` | C-12 (host-header SIWE) |
| `auth/route` | C-15 (host-header SIWE) |
| `merchant/checkout/[id]` PATCH | M-26 (arbitrary tx_hash) |
| `push/subscribe` | H-32 (SSRF via endpoint URL) |

### OK on auth (examples from wider spot-check)

- `friends`, `enterprise/orders`, `endorsements`, `errors`, `activities`, `gamification`, `messages/*`, `attachments/*`, `proposals`, `notifications/preferences`, `seer/analytics/rollup` (admin), `indexer/poll` (CRON_SECRET)

### Global issue

**C-16** — no middleware means none of the ~81 POST routes have CSRF, regardless of auth status. Fixing C-16 is a prerequisite before declaring any route "secure."

---

## 8. Residual audit surface

### Unaudited contracts (estimated 50% of safety-relevant LOC)

| Contract | Lines | Notes |
|---|---|---|
| Seer (rest) | ~800 of 1318 | setScore, reward, punish, operator allowlist, decay weights, history buffer, dispute flow |
| SeerAutonomous | 1222 | Automated action guard |
| SeerGuardian | 575 | Mutual DAO oversight |
| SeerSocial | 630 | Social scoring |
| SeerWorkAttestation | 322 | Work attestation |
| SeerView | 232 | View functions |
| SeerPolicyGuard | 102 | Policy enforcement |
| MerchantPortal (rest) | ~1050 of 1159 | ~20 additional entry points |
| MainstreamPayments (rest) | ~850 of 1253 | Session, spend, recording |
| VFIDECommerce | 260 | Commerce logic |
| VFIDEBenefits | 210 | Benefits layer |
| VFIDEBadgeNFT | — | Badge NFT |
| BadgeManager | — | EIP-170 blocked (H-11) |
| BadgeQualificationRules | — | Qualification |
| BadgeRegistry | — | Badge registry |
| CouncilManager | 439 | Council mgmt |
| CouncilSalary | 190 | Council comp |
| GovernanceHooks | 161 | Hook layer |
| PayrollManager | — | 4 red-flag hits |
| DutyDistributor | — | Distribution |
| EscrowManager | — | Escrow |
| RevenueSplitter | — | Revenue split |
| Pools | — | Liquidity pools |
| LiquidityIncentives | — | LP incentives |
| VFIDEAccessControl | — | Access |
| VFIDEReentrancyGuard | — | Reentrancy |
| VFIDESecurity | — | Security module |
| StablecoinRegistry | 174 | 6 red-flag hits |
| VFIDEPriceOracle | — | Price oracle |
| VFIDEBridge | — | Bridge |
| ServicePool | 351 | Service pool |

### Other unaudited surface

- **WebSocket server** (`websocket-server/src/index.ts`, 22.7 KB) — auth flow, topic ACLs, rate limits, reconnection handling.
- **~102 API routes** — only 18 of 120 spot-checked. Extrapolating my hit rate (~5 findings per 8 routes), expect 50-70 more API findings.
- **101 frontend pages** (~220K TS/TSX LOC) — XSS, CSRF, secret exposure, localStorage misuse, auth bypass.
- **Tests (464 files)** — no coverage-gap analysis done. Critical paths may be under-tested.
- **hardhat.config.ts full review** — gas settings, compiler optimizer runs, networks allowlist, Etherscan verification.

---

## 9. Recommendations

### Before paid audit

1. **Fix the 19 unresolved Criticals.** Every auditor-hour spent re-finding these is a wasted dollar. The priority-1 list in §5 covers the 10 most leveraged fixes.
2. **Resolve EIP-170 blockers.** Split Seer, BadgeManager, VFIDETrust into sub-contracts. These don't deploy on mainnet as-is.
3. **Do a dedicated API-auth sweep.** Review the remaining ~102 unaudited routes against a standard checklist: (a) requireAuth or intentionally public, (b) CSRF protection (depends on C-16 fix), (c) input validation, (d) authorization beyond authentication (ownership checks), (e) rate limiting.
4. **Run Slither/Foundry/Echidna in a fresh env.** My audit used a cached Slither output because solc download was blocked. A clean Slither run + Foundry fuzzing + Echidna will find more issues.
5. **Rewrite the non-custodial narrative OR remove freeze/blacklist code.** Currently the code has multiple paths that contradict the non-custodial claim (H-28, H-29, H-30, H-50). Pick one and make everything consistent.

### During paid audit

- Focus auditors on the Seer stack, the commerce rail (MerchantPortal, SubscriptionManager, MainstreamPayments), governance takeover paths (DAO + Timelock + CouncilElection + AdminMultiSig), and cross-contract invariants (especially around VFIDEToken._transfer vault resolution).
- Require Foundry invariant tests for the ProofScore burn-fee formula, the withdrawal queue, and the guarantor liability accounting.
- Require Certora or similar formal specs for VaultHub recovery and the fee-distribution flow.

### Launch phase

- Don't mainnet-deploy until Criticals are closed AND a paid audit has reviewed the fixes.
- Arm SystemHandover on deploy day with a reasonable timestamp; publicly document the handover schedule.
- Set `emergencyController` to `address(0)` in deploy scripts with an explicit assertion.
- Run a testnet bug bounty for 4-6 weeks before mainnet.

---

*End of consolidated findings.*
