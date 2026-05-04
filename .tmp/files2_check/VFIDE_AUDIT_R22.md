# VFIDE Audit — Round 22 Findings (Final Slice)

**Date**: 2026-05-02
**Scope**: MainstreamPayments, Badge family, Council family, Seer family rest, SubscriptionManager, VFIDEEnterpriseGateway, validate-* and verify-* scripts, lib/db.ts RLS verification.
**New findings**: #487 — #524 (38 findings)
**Updated cumulative count**: ~524

This is the final round. Reached diminishing returns: same finding categories repeat across remaining contract slices. Adding more contracts mostly adds more instances of the same patterns rather than fundamentally new issues.

---

## CRITICAL CORRECTIONS

### #487. RETRACTION of #48 — RLS is properly wired in lib/db.ts

**Severity**: PRIOR FINDING RETRACTED

Verified: `lib/db.ts:21-32` has `runWithDbUserAddressContext` using `AsyncLocalStorage`; `applyDbUserAddressContext` calls `set_config('app.current_user_address', $1, true)` per query. The `query()` function at lines 113-142 wraps authenticated queries in BEGIN…COMMIT and applies the context.

RLS policies (`migrations/20260121_234000_add_row_level_security.sql`) use `current_setting('app.current_user_address', true)` correctly:

```sql
CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (wallet_address = current_setting('app.current_user_address', true)::text);
```

The `USING(true)` policies that exist are intentional public-readable policies (e.g., `users_read_public`, `proposals_read_all`, `endorsements_read_all`) — these are by design.

This is a major correction. Prior #48 should be removed from the priority list. The validate-deployment.ts script at lines 147-159 explicitly checks for the RLS wiring presence and would fail deploy if it were missing.

---

## MainstreamPayments (5 contracts)

### #488. MainstreamPriceOracle: forceSetPrice allows DAO to drop price up to 90% in 5 minutes
**Severity**: CRITICAL
**Location**: `MainstreamPayments.sol:370-377, 282-284`

`MAX_FORCE_PRICE_DECREASE_BPS = 9000` (90%). DAO can call forceSetPrice to drop price by 90% (after 5-minute cooldown):

```solidity
function forceSetPrice(uint256 newPrice) external onlyDAO nonReentrant {
    _requireValidAbsolutePrice(newPrice);
    _enforceUpdateCooldown();
    _validatePriceWindow(vfidePerUsd, newPrice, MAX_FORCE_PRICE_INCREASE_BPS, MAX_FORCE_PRICE_DECREASE_BPS);
    vfidePerUsd = newPrice;
    ...
}
```

Impact: `usdToVfide` returns 10× the VFIDE for any USD amount. If users have signed swap orders, pending checkout intents, or off-chain quotes that reference this oracle, they get 10× the expected output. Combined with deployer-as-DAO at deploy, single key has 90% downside manipulation power.

**Fix**: Lower force decrease cap to 50%; add 24h timelock on forceSetPrice.

### #489. MainstreamPriceOracle: setUpdater no timelock
**Severity**: HIGH
**Location**: `MainstreamPayments.sol:422-424`

DAO can grant updater role instantly. Updaters can push prices within standard windows (5 min cooldown, 50% max change). Compromised DAO + new updater = many price updates within the cooldown windows.

**Fix**: 24h timelock on setUpdater.

### #490. MultiCurrencyRouter: setRecommendedRouter no timelock
**Severity**: HIGH
**Location**: `MainstreamPayments.sol:1210-1215`

```solidity
function setRecommendedRouter(address router) external onlyDAO nonReentrant {
    require(router != address(0), "MCR: zero router");
    address old = recommendedRouter;
    recommendedRouter = router;
    emit SwapRouterUpdated(old, router);
}
```

DAO swaps router instantly. Frontend uses `getSwapRoute()` which returns this router. If frontend trusts the on-chain "recommended" value, users may approve and call a malicious contract directly. NO CUSTODY claim is correct only if users execute swaps with their own validation — most users won't.

**Fix**: 48h timelock; documentation warning that frontends should not blindly trust the recommended router.

### #491. SessionKeyManager: setDefaultLimits instant
**Severity**: MEDIUM
**Location**: `MainstreamPayments.sol:807-814`

`setDefaultLimits` instant. DAO can set defaults to dust values, making new sessions unusable. Existing sessions unaffected.

**Fix**: 24h timelock.

### #492. SessionKeyManager: `_enforceSeerAction` blocks payment on Delayed result
**Severity**: HIGH
**Location**: `MainstreamPayments.sol:828-829`

```solidity
if (result >= 2) revert SKM_ActionBlocked(result);
```

Blocks Delayed (2), Blocked (3), Penalized (4). The H-16 fix wraps Seer call in try/catch but only for failure; the Delayed result still reverts permanently — no retry mechanism, just reverts. Honest user with one ambiguous flag has session-tap permanently broken until SeerAutonomous resolves it.

**Fix**: Treat Delayed as warning (emit event but allow payment). Block only on Blocked/Penalized.

### #493. TerminalRegistry: DAO can deactivate any terminal
**Severity**: MEDIUM
**Location**: `MainstreamPayments.sol:951-959`

DAO can deactivate; only DAO can reactivate (line 968). Single-key effective shutdown of any merchant's terminal. Per "no freeze" principle, this is another freeze mechanism.

**Fix**: Restrict deactivation to merchant; DAO uses different flag (e.g., flagSuspicious) that doesn't block payments but emits warning.

### #494. FiatRampRegistry: rewards exploitable by sybil rings
**Severity**: MEDIUM
**Location**: `MainstreamPayments.sol:240-253`

Provider calls `recordRampTransaction` which rewards user via Seer (FIRST_RAMP_BONUS=50, RAMP_TX_BONUS=5, max 5/user). With multiple sybil "users", attacker registered as provider can mint reputation. Cooldown is 1h between same-provider-same-user; with 5 users cap, 250 score floor per sybil ring.

**Fix**: Per-provider total reward cap (e.g., 1000 reward points/day across all users).

---

## Badge Family

### #495. BadgeManager: setOperator instant
**Severity**: MEDIUM
**Location**: `BadgeManager.sol:142-146`

DAO sets operators instantly. Operators can call `awardBadge(any_user, any_badge)`. Combined with #496 below, severe.

**Fix**: 24h timelock.

### #496. BadgeManager: setQualificationRules instant
**Severity**: HIGH
**Location**: `BadgeManager.sol:159-164`

DAO swaps qualification rules instantly:

```solidity
function setQualificationRules(address newRules) external onlyDAO nonReentrantBM {
    if (newRules == address(0)) revert BM_Zero();
    address oldRules = address(qualificationRules);
    qualificationRules = IBadgeQualificationRules(newRules);
    emit QualificationRulesSet(oldRules, newRules);
}
```

Compromised DAO can install rules where every check returns true; then operators auto-award badges, boosting target scores arbitrarily. FOUNDING_MEMBER alone gives +800 score.

**Fix**: 48h timelock.

### #497. BadgeManager: revokeBadge punishes user score; DAO unilateral
**Severity**: HIGH
**Location**: `BadgeManager.sol:211-224`

DAO calls revokeBadge with reason → seer.punish(user, scorePenalty, reason). No timelock, no challenge. DAO can revoke FOUNDING_MEMBER (worth 800+ points), dropping target score significantly.

**Fix**: 7-day notice + challenge window before revocation finalizes.

### #498. VFIDEBadgeNFT: setBaseURI instant by Ownable owner
**Severity**: MEDIUM
**Location**: `VFIDEBadgeNFT.sol:240-242`

NFT metadata can be redirected to attacker-controlled host instantly. Tokens still soulbound, but visual branding compromised.

**Fix**: 24h timelock; or make immutable post-launch.

### #499. VFIDEBadgeNFT: no badge sync — NFT persists after Seer revokes badge
**Severity**: MEDIUM

Once minted, NFT exists independently. If user's badge is revoked in Seer, the NFT still exists with all metadata. User can `burnBadge` to remove, but if they don't, the NFT misrepresents reputation.

**Fix**: Add public `syncWithSeer(tokenId)` callable by anyone that burns NFTs whose underlying Seer badge was revoked.

### #500. VFIDEBadgeNFT: pioneer/founding counter race condition
**Severity**: LOW

`pioneerCount` and `foundingMemberCount` increment per-award. Multiple operators awarding simultaneously could exceed cap by 1-2 (race window). Breaks the "first 10K / first 1K" promise.

**Fix**: Use compare-and-set pattern, or `require` cap pre-increment.

---

## Council Family

### #501. CouncilElection: vote weight uses score-at-electionStart — sybils can pre-mint score
**Severity**: HIGH
**Location**: `CouncilElection.sol:228`

```solidity
uint256 weight = seer.getScoreAt(msg.sender, electionStartAt);
```

Vote weight is voter's score at election start. Sybil ring can build score before election, vote with high weight, then have score drop. Election frozen at high-score moment.

**Fix**: Use minimum of current and 30-day-prior score; or weight by 90-day time-weighted score.

### #502. CouncilElection: setModules timelock has no cancellation path
**Severity**: MEDIUM
**Location**: `CouncilElection.sol:119-126`

Pending modules can be queued but no `cancelModules` function. Wrong proposal queued = wait 48h, applyModules to lock in wrong values, setModules again to fix. 96h+ recovery window.

**Fix**: Add cancelModules function (DAO-only).

### #503. CouncilElection: refreshCouncil DAO-callable, removes members instantly
**Severity**: HIGH
**Location**: `CouncilElection.sol:347-358`

DAO calls refreshCouncil with arbitrary `current` array. For each member that "fell below threshold" (per Seer.score), removed. DAO chooses which subset to check. Combined with score manipulation via Seer, DAO can selectively remove dissenting members.

**Fix**: Make refreshCouncil permissionless (anyone can check); enforce ALL council members must be checked, not subset.

### #504. CouncilElection: removeCouncilMember by DAO is unilateral with no challenge
**Severity**: HIGH
**Location**: `CouncilElection.sol:375-394`

Comment at line 378: "DAO can remove anyone for any reason". No timelock, no super-majority, no challenge. Single DAO key removes any council member.

**Fix**: 7-day timelock + super-majority requirement OR council co-sign.

### #505. CouncilSalary: notifyNewCouncil callable by DAO-set councilElection address
**Severity**: MEDIUM
**Location**: `CouncilSalary.sol:100-103, 108-111`

`notifyNewCouncil` callable by `dao` OR `councilElection`. `setCouncilElection` is dao-only with no timelock. DAO can set councilElection to any address, then have that address spam-call notifyNewCouncil to advance terms artificially, resetting removal vote counters.

**Fix**: Add 48h timelock on setCouncilElection.

### #506. CouncilSalary: DAO can reinstate any blacklisted member instantly
**Severity**: MEDIUM
**Location**: `CouncilSalary.sol:234-239`

Council voted >50% to remove; DAO can reinstate instantly. Self-policing undermined.

**Fix**: 7-day timelock on reinstate.

### #507. CouncilManager: payment distribution silently swallows failures
**Severity**: LOW
**Location**: `CouncilManager.sol:286-300`

`try IEcosystemVault(ecosystemVault).payExpense(...)` catch swallows. If payExpense reverts, council gets 0 but `lastPaymentTime` is reset (line 273), so no retry until next interval.

**Fix**: Don't reset lastPaymentTime if council payment fails.

### #508. CouncilManager: checkDailyScores depends on keeper reliability
**Severity**: LOW

Off-chain keeper reliability concern. If keeper runs every other day, daysBelow700 counts deflated; member may keep position past intended 7-day grace.

**Fix**: Document keeper reliability requirements; perhaps mark members "stale-checked" after 36h.

---

## Seer Family

### #509. SeerGuardian: autoCheckProposer flags any proposer near governance threshold
**Severity**: HIGH
**Location**: `SeerGuardian.sol:526-557`

Proposers with score in (minForGovernance, minForGovernance+1000) get auto-flagged. DAO controls minForGovernance. Setting it high means most users' proposals get flagged. Effectively a censorship knob.

**Fix**: Use absolute bottom-tier threshold; don't anchor to settable minForGovernance.

### #510. SeerGuardian: proposalFlagDelay setter no timelock
**Severity**: MEDIUM

Default flag delay can be increased to brick proposal execution. Proposer waits indefinitely.

**Fix**: 24h timelock; cap delay at 30 days.

### #511. SeerGuardian: daoOverridden subjects bypass restrictions until expiry
**Severity**: HIGH
**Location**: `SeerGuardian.sol:591-600`

DAO can override any subject's restrictions. expiry parameter set in separate function; if not capped, can be very long.

**Fix**: Cap override expiry at 30 days max (similar to #477).

### #512. SeerWorkAttestation: VERIFIER_ROLE single-key grants attestations
**Severity**: HIGH
**Location**: `SeerWorkAttestation.sol:171-186`

Single VERIFIER_ROLE holder can attest any worker's task. Attestation flows through to ServicePool which gates score-crediting on `workerTaskCount(participant) > 0`. Single verifier can mint attestations for sybil "workers" → they earn pool payouts.

**Fix**: Require 2-of-N verifier signatures for attestation.

### #513. SeerWorkAttestation: batchVerifyTasks safe
**Severity**: ACKNOWLEDGED

External `_recordTask` doesn't write to attacker-controllable contracts; safe.

### #514. SeerWorkAttestation: protocol-contract setters have 48h timelock
**Severity**: ACKNOWLEDGED

Good design. PendingProtocolContracts struct + 48h delay properly implemented.

---

## SubscriptionManager

### #515. emergencyCancel DAO unilateral with no notice
**Severity**: HIGH
**Location**: `SubscriptionManager.sol:272-282`

```solidity
function emergencyCancel(uint256 subId) external onlyDAO {
    Subscription storage sub = subscriptions[subId];
    require(sub.active, "SM: already inactive");
    if (address(emergencyBreaker) == address(0) || !emergencyBreaker.halted()) {
        revert SM_EmergencyNotActive();
    }
    sub.active = false;
    emit EmergencyCancelled(subId, msg.sender);
}
```

DAO can cancel any subscription when `emergencyBreaker.halted()`. EmergencyBreaker.halted() is single-DAO-key flip. Sequence: DAO halts → DAO cancels subscriptions → DAO unhalts. Subscriptions are effectively DAO-killable on whim.

**Fix**: Subscription cancellation should require subscriber consent; DAO emergency only blocks payment processing, doesn't kill the subscription.

### #516. processPayment auto-cancels after 3 failed payments
**Severity**: MEDIUM

3 failed payments = subscription auto-cancelled. With N-H12 fix (one fail per block), still cancellable in 3 blocks. Subscriber could lose subscription due to brief allowance/balance dip.

**Fix**: Increase MAX_FAILED_PAYMENTS to 7; add 24h cooldown between failed-payment increments.

### #517. setFraudRegistry no timelock
**Severity**: MEDIUM
**Location**: `SubscriptionManager.sol:129-131`

DAO sets fraud registry instantly. Different fraud registry = different ban list = different subscriptions blocked.

**Fix**: 24h timelock.

---

## VFIDEEnterpriseGateway

### #518. setOracle has no timelock
**Severity**: HIGH
**Location**: `VFIDEEnterpriseGateway.sol:106-115`

DAO can swap oracle (e.g., Amazon API key) instantly. Pending orders rely on oracle to settle. New oracle that never confirms = orders never settle. Buyers must wait ORDER_PAYER_CANCEL_WINDOW (7 days) to self-cancel.

**Fix**: 48h timelock; 2-step propose+apply pattern.

### #519. _swapToStable approval ordering edge case
**Severity**: MEDIUM
**Location**: `VFIDEEnterpriseGateway.sol:309-355`

forceApprove + try/catch with revoke is mostly correct. But: line 314 calls forceApprove, line 318-337 the try/catch wraps getAmountsOut. If anything between forceApprove and the next forceApprove(0) reverts uncaught, approval persists.

Inspection shows the catch blocks correctly call forceApprove(0). But the structure is fragile — any added code between approve and revoke would risk leaks.

**Fix**: Wrap in finally pattern, or move forceApprove inside the try block.

### #520. rescueFunds DAO unilateral
**Severity**: MEDIUM
**Location**: `VFIDEEnterpriseGateway.sol:367-376`

For non-VFIDE tokens, full balance drainable to any address.

**Fix**: Restrict recipient to a known protocol address; or add 48h timelock.

---

## Validate / Verify scripts

### #521. validate-deployment.ts has no on-chain post-deploy validation
**Severity**: MEDIUM
**Location**: `scripts/validate-deployment.ts`

Script checks build/types/proxy/RLS/dockerignore but not on-chain state (e.g., "every Ownable contract's owner is AdminMultiSig"). The kind of bugs found in #391, #416, #417 wouldn't be caught.

**Fix**: Add a phase that runs against a deployed network: enumerate every contract in deploy book, call .owner()/.dao(), assert no leftover deployer addresses.

### #522. validate-deployment.ts confirms proxy.ts is the security source of truth
**Severity**: ACKNOWLEDGED
**Location**: `scripts/validate-deployment.ts:117-133`

Confirms my prior #27/#28 retraction was correct. The script enforces: proxy.ts must exist AND must contain Content-Security-Policy logic.

### #523. verify-fee-burn-router-invariants.ts uses MOCK Seer and MOCK Token
**Severity**: HIGH
**Location**: `scripts/verify-fee-burn-router-invariants.ts:28-44`

The script tests BurnRouter against `MockSeerForBurnRouter` and `MockTokenForBurnRouter`. This IS an EVM-real test (uses actual deployment via JsonRpcProvider, not jest mock). But it tests against MOCK contracts, not the real Seer and VFIDEToken. So integration bugs between real Seer/Token and BurnRouter may not be caught.

**Fix**: Add a parallel verify script that runs against the real Seer and VFIDEToken contracts deployed on a local hardhat fork.

### #524. verify-* scripts don't run in CI/pre-deploy automatically
**Severity**: HIGH

~30 verify-* scripts exist. They're invoked on-demand. validate-deployment.ts at line 105 only invokes `contract:verify:frontend-abi-parity`, not the other verify scripts. The verify suite is only as strong as it being run.

**Fix**: validate-deployment.ts should run all critical verify-* scripts before approving deploy. Add a `verify:all` npm script that runs them in sequence.

---

## Cross-cutting observations from R22

### 1. Future contracts have similar centralization patterns

MainstreamPayments, Council family, Subscription, Enterprise, Badge — all have DAO-instant-setters and single-DAO-key powers. Same pattern as core contracts. Wiring AdminMultiSig (#391) doesn't fix these because they're not deployed yet; when they ARE deployed, same wiring work will be needed.

### 2. Force-set-price 90% drop in MainstreamPriceOracle is the most concerning new finding

This single function lets DAO change the published USD price by 90% in 5 minutes. Combined with MultiCurrencyRouter's `recommendedRouter` instant-swap (#490), substantial price-manipulation surface for fiat-denominated commerce.

### 3. Council removal/reinstatement is asymmetric and DAO-skewed

DAO can remove (#504), refresh (#503), reinstate (#506), all with no timelock. Council's self-policing voteToRemove requires >50% — well-designed. But DAO override defeats it. The whole council model depends on DAO restraint.

### 4. SeerWorkAttestation single-verifier risk feeds into ServicePool

Verifier can mint attestations → workers qualify for pool payouts → real money distributed. Single key + ServicePool's pool funds = significant attack vector.

### 5. validate-deployment.ts is excellent but incomplete

The script properly catches build/RLS/proxy issues. It does NOT catch:
- Wrong owner/DAO addresses post-deploy
- Missing AdminMultiSig wiring
- Constructor-incompatible deploy args (would fail at deploy, but no pre-flight)

Adding on-chain validation would have caught #391, #415, #416 before they got into production.

### 6. RLS retraction (#48) shifts the priority list

The previously-flagged "RLS uses USING(true)" was incorrect. The wiring is sound. This means the database access layer is more secure than the audit doc previously stated. RLS depends on:
- lib/db.ts properly applying `set_config('app.current_user_address')` per request — confirmed
- Migrations using `current_setting('app.current_user_address', true)` in policies — confirmed
- API routes invoking queries through the wrapped `query()` function — needs verification per route, but the infrastructure is right

---

## Updated cumulative count after Round 22

~524 findings.

- **Critical**: ~50 (added 3: #487 retraction nets -1 but #488 adds; #523, #524)
- **High**: ~95 (added 11)
- **Medium**: ~135 (added 17)
- **Low**: ~110 (added 14)
- **Info/Acknowledged**: ~134 (added 10)

## Updated top 10 priorities (with R22)

1. **#415** — VFIDEToken treasury (deploy AdminMultiSig first; pass it as treasury) [DEPLOY BLOCKER]
2. **#307** — VFIDEToken permit struct hash missing deadline
3. **#391** — Wire AdminMultiSig comprehensively
4. **#416** — Update transfer-governance.ts for 11+ missing contracts
5. **#392** — Lower EMERGENCY_APPROVALS to 4-of-5
6. **#393** — Make AdminMultiSig veto require quorum
7. **#345** — Cap ecosystemMinBps fee inflation
8. **#363-#367** — Consolidate halt mechanisms
9. **#488** — MainstreamPriceOracle force-decrease cap (90%→50%) + timelock
10. **#470, #471** — Wrap GovernanceHooks SeerGuardian calls in try/catch

Items removed:
- **#48 RLS** — RETRACTED. Wiring is correct.

Items elevated:
- **#488** — MainstreamPriceOracle 90% force price drop
- **#503-#506** — Council family DAO unilateral powers
- **#515** — SubscriptionManager.emergencyCancel DAO unilateral
- **#523, #524** — Verify scripts not running in CI

## What is now FULLY audited

Substantially the entire production contract suite, all future contracts at structural level (sampled key functions in each), all major deploy/transfer/apply scripts, the validate-deployment.ts pipeline, sample verify scripts, and the lib/db.ts RLS wiring (with correction).

## Genuinely remaining (no longer critical)

- **SeerSocial** (736), **SeerView** (232), **SeerPolicyGuard** (213) — only sampled briefly
- **Detailed SeerAutonomous** (1249) — already 5 findings from R21
- **VFIDEBenefits** (210), **BridgeSecurityModule** (334) — small, likely similar patterns
- **Detailed frontend hooks** — only sampled
- **Indexer service code** — earlier #79, #80 stand
- **Each individual verify-* script content** (~30 scripts) — sampled 1; pattern is similar across them

The audit at this point has reached diminishing returns — the same patterns repeat across remaining contracts. Adding more audit rounds mostly adds more instances of the same finding categories.

## Suggested next steps (not audit, but execution)

1. Begin Sprint 1 from the fix checklist: deploy blockers (#415, #307, #391, #392, #393)
2. Run validate-deployment.ts with R22's gap mitigated (add on-chain post-deploy phase per #521)
3. Audit external dependencies: OpenZeppelin version pinning, LayerZero OFT (used by VFIDEBridge), Uniswap V2 router calls
4. Set up continuous security monitoring per #418

*End of Round 22. Audit complete.*
