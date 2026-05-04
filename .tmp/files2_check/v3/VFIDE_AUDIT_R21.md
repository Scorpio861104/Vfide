# VFIDE Audit — Round 21 Findings (Remaining Slices)

**Date**: 2026-05-02
**Scope**: ~15 production contracts, deploy script adversarial review, governance/settings frontend, 4 future contracts (sample), test infrastructure
**New findings**: #415 — #468 (54 findings)
**Updated cumulative count**: ~468

This round closes out the remaining unaudited contract surface and re-examines the deploy scripts now that AdminMultiSig wiring (#391) is the headline issue. **Major correction below**: prior finding #306 had the treasury EOA-vs-contract direction reversed. The actual deploy bug is the inverse — and still a deploy blocker.

---

## CRITICAL — Deploy script corrections and additions

### #415. CORRECTION to #306 — VFIDEToken constructor requires treasury to be a CONTRACT, not an EOA; `deploy-full.ts` passes deployer EOA
**Severity**: CRITICAL — DEPLOY BLOCKER
**Location**: `VFIDEToken.sol:261-263` (constructor) and `scripts/deploy-full.ts:120-127`

The constructor at line 261-263:

```solidity
// Harden treasury custody: require a contract (multisig/DAO), not an EOA.
assembly { size := extcodesize(treasury) }
if (size == 0) revert VF_NotContract();
```

The constructor REQUIRES `treasury` to be a contract. But `deploy-full.ts:123` passes:

```typescript
await deploy(
    "VFIDEToken",
    book.DevReserveVestingVault,
    deployer.address,   // treasury (receives 150 M)  <-- EOA!
    ...
);
```

`deployer.address` is an EOA. Constructor reverts with `VF_NotContract` at deploy time.

**Prior finding #306 had this backwards.** The protocol design wants treasury to be a contract (multisig/DAO/AdminMultiSig). The deploy script is incompatible with the constructor's check.

**Fix options**:
1. Deploy AdminMultiSig BEFORE VFIDEToken, pass `book.AdminMultiSig` as treasury. Recommended; aligns with #391 wiring.
2. Deploy a Treasury contract first (Gnosis Safe or simple multisig), pass that.
3. Remove the EOA check and pass `deployer.address` (REJECTED — undermines the security intent).

The script ordering currently deploys VFIDEToken in Layer 1 BEFORE AdminMultiSig in Layer 8. To fix, AdminMultiSig must be reordered to Layer 1, before VFIDEToken.

This finding supersedes #306 in priority; both are about the same deploy blocker, but the correct understanding is critical for fixing it.

### #416. `transfer-governance.ts` doesn't transfer ownership of 11+ governed contracts
**Severity**: CRITICAL
**Location**: `scripts/transfer-governance.ts`

Comprehensive list of contracts the script does NOT transfer ownership/DAO of:

- **VaultHub** — owner stays as deployer (referenced in #270)
- **ProofScoreBurnRouter** — owner stays as deployer (referenced in #328, #347)
- **EcosystemVault** — owner stays as deployer (referenced in #252)
- **SanctumVault** — owner stays as deployer (Ownable inheritance per #248, even if unused, the slot exists)
- **DevReserveVestingVault** — DAO field stays as deployer (#208 cross-ref)
- **FeeDistributor** — admin stays as deployer (no setAdmin call exists in transfer script)
- **StablecoinRegistry** — governance stays as deployer
- **PayrollManager** — DAO stays as deployer (despite setDAO with 48h timelock available)
- **LiquidityIncentives** — DAO stays as deployer
- **EmergencyControl** — DAO stays as deployer (referenced in #364)
- **CircuitBreaker** — DEFAULT_ADMIN_ROLE stays as deployer (#387)
- **VFIDEAccessControl** (if instantiated separately) — DEFAULT_ADMIN_ROLE stays as deployer
- **AdminMultiSig** itself — never wired as governance for any of the above (#391)

**Fix**: extend `transfer-governance.ts` with explicit ownership/DAO transfers for each. The list of needed lines (post-AdminMultiSig deployment, post-48h timelocks):

```typescript
// VaultHub - has setDAO with timelock
await vaultHub.setDAO(addrs.adminMultisig);

// ProofScoreBurnRouter - Ownable; transfer + accept (2-step)
await burnRouter.transferOwnership(addrs.adminMultisig);
// AdminMultiSig must call .acceptOwnership() via proposal

// EcosystemVault - 3 roles
await ecosystemVault.transferOwnership(addrs.adminMultisig);
await ecosystemVault.setManager(addrs.adminMultisig);
await ecosystemVault.setDAO(addrs.adminMultisig);

// SanctumVault - Ownable inheritance
await sanctumVault.transferOwnership(addrs.adminMultisig);

// DevReserveVestingVault - DAO is immutable! Cannot rotate. NOTE THIS.
// Document as known limitation.

// FeeDistributor - setAdmin (CRITICAL; no current call)
await feeDist.setAdmin(addrs.adminMultisig);

// StablecoinRegistry - has 48h timelock setGovernance
await stableReg.setGovernance(addrs.adminMultisig);

// PayrollManager - 48h timelock setDAO
await payroll.setDAO(addrs.adminMultisig);

// LiquidityIncentives - direct setDAO
await liqIncentives.setDAO(addrs.adminMultisig);

// EmergencyControl - direct setModules
await emergencyControl.setModules(addrs.adminMultisig, breaker, ledger);

// CircuitBreaker - grant DEFAULT_ADMIN_ROLE; revoke from deployer
await circuitBreaker.grantRoleWithReason(DEFAULT_ADMIN_ROLE, addrs.adminMultisig, "rotation");
await circuitBreaker.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
```

This is roughly 30-50 new lines of script. Without these, the AdminMultiSig is wired only for the contracts that the script already touches (Token via OCP, DAO, Seer, FraudRegistry, MerchantPortal, FlashLoan, TermLoan, GovernanceHooks).

### #417. DevReserveVestingVault.DAO is `immutable`; cannot be rotated
**Severity**: HIGH
**Location**: `DevReserveVestingVault.sol:37, 80`

```solidity
address public immutable DAO;
...
constructor(..., address _dao) {
    ...
    DAO = _dao;
}
```

Set at deploy. Cannot be changed. `deploy-full.ts:117` passes `deployer.address`. Therefore deployer is permanent DAO of the dev reserve vault.

DAO of this vault can:
- `setVestingStart` (within 30-day backdate)
- `pauseClaims` (and unpause)
- `emergencyFreeze` (irreversible by DAO; beneficiary can unpause)

If deployer key is compromised, attacker can call emergencyFreeze and the only recovery is the beneficiary calling pauseClaims(false) — the beneficiary IS deployer in deploy-full.

If beneficiary key is also compromised (likely same key), full DOS on vesting claims forever.

**Fix**: change DAO from `immutable` to a settable variable with timelock; add setDAO function. OR: deploy with AdminMultiSig as DAO from the start (requires AdminMultiSig deployed before DevReserveVestingVault, currently in Layer 1).

### #418. apply-full.ts assertEmergencyControllerUnset is the right idea but won't catch silent failure
**Severity**: MEDIUM
**Location**: `scripts/apply-full.ts:75-96`

The check tries to call `emergencyController()` view on each monitored contract; if it returns non-zero, the script throws. Good defensive programming — the goal is to ensure no emergency controller is wired post-deploy.

However: if the view function reverts (e.g., contract doesn't have one), the script silently skips. Good fallback. But if a future upgrade adds an emergencyController() that returns zero by default, then is set later by an attacker between apply-full.ts runs, the check passes today but misses the threat tomorrow.

**Fix**: this is a runtime check, not a deploy check. Better to add a continuous monitoring task that runs the same check periodically (e.g., daily cron) and alerts on non-zero. Document this in the runbook.

---

## VFIDEAccessControl

### #419. `revokeRoleWithReason` doesn't validate `account != address(0)`
**Severity**: LOW
**Location**: `VFIDEAccessControl.sol:115-124`
**Description**: `grantRoleWithReason` checks `account != address(0)` (line 102). `revokeRoleWithReason` does not. OZ's `_revokeRole` no-ops on zero address, but the inconsistency suggests a copy-paste oversight.
**Fix**: Add the same check.

### #420. `batchGrantRole` and `batchRevokeRole` have no upper bound on accounts.length
**Severity**: MEDIUM
**Description**: Caller passes arbitrary array. Gas-bound only. With a 30M gas block, ~5,000 grants per block possible. Not exploitable but no protection against accidental "1M-element array" mistakes.
**Fix**: Cap at 100 per call:
```solidity
require(accounts.length <= 100, "VFIDEAccessControl: too many");
```

### #421. `batchGrantRole` skips the "with reason" logging pattern
**Severity**: MEDIUM
**Description**: `grantRoleWithReason` emits `RoleGrantedWithReason` event for audit trail. `batchGrantRole` calls `_grantRole` directly, skipping this event. Bypasses the audit pattern.
**Fix**: Require a reason parameter on batch grant; emit per-account `RoleGrantedWithReason` events.

### #422. No expiration on `pendingAdminAt`
**Severity**: LOW
**Description**: `transferAdminRole` queues a pending admin with 48h timelock; no explicit expiration. If apply is delayed indefinitely, the queued transfer can be applied at any time.
**Fix**: Add expiration (e.g., 30 days from queue):
```solidity
require(block.timestamp <= pendingAdminAt + 30 days, "expired");
```

### #423. DEFAULT_ADMIN_ROLE is sole admin of all 3 sub-roles — no separation of duties
**Severity**: MEDIUM
**Description**: Constructor sets `DEFAULT_ADMIN_ROLE` as admin of `EMERGENCY_PAUSER_ROLE`, `CONFIG_MANAGER_ROLE`, `TREASURY_MANAGER_ROLE`. A single key with admin role can grant any sub-role to any address. No separation between "who can grant treasury access" vs "who can grant emergency pauser access."
**Fix**: Split admin authority by role; have separate sub-admins for each role. Or: document that this is intentional centralization.

### #424. `hasAnyRole` and `hasAllRoles` loop unbounded externally; gas-DoS via large input array
**Severity**: LOW
**Description**: View functions but called via gas-paying callers (e.g., other contracts using these for role checks). Large `roles` array = high gas.
**Fix**: Document or cap input length.

---

## VFIDESecurity (4 contracts)

### #425. GuardianRegistry: DAO can override user's guardian preferences instantly
**Severity**: HIGH
**Location**: `VFIDESecurity.sol:86-87, 121-128`
**Description**: `addGuardian`, `removeGuardian`, `setThreshold` all accept `msg.sender == dao || msg.sender == vault`. DAO can unilaterally modify any user's guardian configuration without the user's consent.

```solidity
if (msg.sender != dao && msg.sender != vault) revert SEC_NotDAO();
```

A captured DAO key can:
1. Add malicious guardian to a target's vault
2. Remove the target's real guardians
3. Set threshold to 1 with the malicious guardian
4. Cast lock vote with the malicious guardian → vault locked

**Fix**: Restrict to vault-only (`msg.sender == vault`). If DAO admin override is needed for emergencies, gate it through a 7-day timelock with public visibility.

### #426. GuardianRegistry: threshold > guardianCount silently clamped on read instead of being rejected
**Severity**: LOW
**Location**: `VFIDESecurity.sol:140`
**Description**: `guardiansNeeded` clamps `needed = n` if threshold exceeds count. Hides misconfiguration.
**Fix**: Either reject in `setThreshold` (already done at line 125), OR emit warning event when clamping.

### #427. GuardianLock: DAO can unlock any vault and cancel any in-progress vote
**Severity**: HIGH
**Description**: `unlock` and `cancel` are `onlyDAO` (lines 239, 252). DAO can override the guardian community's lock decisions.

The contract notes "Guardians cannot unlock unilaterally to prevent compromised guardian from overriding the lock." This is good. But the DAO has full unilateral power, which is the same problem from a different angle.

**Fix**: Per the user's "no freeze" principle, the philosophy should be: only the user (via vault address calling unlock) can unlock their own vault. DAO override path should be removed, OR require user-vault co-signature.

### #428. PanicGuard: `reportRisk` lets DAO quarantine ANY vault for up to maxDuration (30 days default)
**Severity**: HIGH
**Location**: `VFIDESecurity.sol:354-356`
**Description**: DAO unilaterally quarantines any vault. Vault is locked from transfers until quarantine expires. ABSOLUTE_MAX_QUARANTINE = 90 days.

Per user's "no freeze" principle, this is direct violation: DAO can freeze any user's funds for up to 90 days.

**Fix**: Either remove `reportRisk` entirely, or require user notification + 7-day pre-quarantine challenge window.

### #429. PanicGuard: `setGlobalRisk(true)` is single-DAO-key kill-switch
**Severity**: CRITICAL
**Location**: `VFIDESecurity.sol:432-437`
**Description**: `globalRisk = true` halts all transfers if SecurityHub is checking it (note: SecurityHub was removed per line 528). Currently dormant if no consumer checks it. But the function exists and can be wired in future.

**Fix**: Document that this should never be wired. Or: require committee co-signature.

### #430. PanicGuard: `vaultHub` setting is instant via setHub
**Severity**: MEDIUM
**Description**: DAO can swap vaultHub address instantly. Affects selfPanic which queries vaultHub.vaultOf. A wrong vaultHub returns address(0) → selfPanic reverts on `require(vault != address(0))`. So users lose access to selfPanic.
**Fix**: Add 24h timelock on setHub.

### #431. EmergencyBreaker: `setDAO` instant, no timelock
**Severity**: HIGH
**Location**: `VFIDESecurity.sol:483-487`
**Description**: DAO can rotate DAO role to any address instantly. Captured DAO can transfer to attacker.
**Fix**: 48h timelock on setDAO.

### #432. EmergencyBreaker: `toggle` activation has 0 cooldown (already known via #363)
**Severity**: CRITICAL
**Cross-ref**: #363, R19

### #433. PanicGuard: `selfPanic` requires vault registration via VaultHub.registerVault
**Severity**: MEDIUM
**Description**: User can only selfPanic if their vault was registered via VaultHub→PanicGuard call. If integration breaks, user-controlled emergency stop is unavailable.
**Fix**: Allow direct registration on first selfPanic call (with 1-hour grace + cooldown):
```solidity
if (vaultCreationTime[vault] == 0) {
    vaultCreationTime[vault] = block.timestamp;
}
```

Or fall back to checking vault age via VaultHub.

---

## ProofLedger

### #434. `MAX_LOGS_PER_BLOCK = 50` per logger — bottleneck for high-throughput logging
**Severity**: LOW
**Location**: `ProofLedger.sol:31, 105`
**Description**: 50 events per logger per block. With multiple high-volume contracts (VaultHub, MerchantPortal), genuine emissions can hit cap and silent-revert via the require.
**Fix**: Either raise to 500, or have callers wrap in try/catch to handle gracefully.

### #435. setLogger and setDAO have 48h timelocks — strong defense, no issues
**Severity**: ACKNOWLEDGED

---

## PayrollManager

### #436. DAO `emergencyWithdraw` to ANY address (with 7-day timelock)
**Severity**: HIGH
**Location**: `PayrollManager.sol:351-394`
**Description**: DAO can drain any stream's balance to any address. 7-day timelock provides defense, but no constraint on `to`. Stream is effectively confiscatable by DAO with 7-day notice.
**Fix**: Restrict `to` to either `payer` (refund) or `payee` (pay-out); reject arbitrary recipients:
```solidity
require(to == s.payer || to == s.payee, "PM: invalid recipient");
```
This preserves DAO's ability to "force-resolve" disputes but prevents seizure.

### #437. `pauseStream` by either party but `resumeStream` only by payer or DAO — payee can pause but not resume
**Severity**: MEDIUM
**Location**: `PayrollManager.sol:239-273`
**Description**: Asymmetric. Payee can pause to lock in accrued amount. Then must wait for payer (or DAO) to resume. If payer is uncooperative, stream is stuck.
**Fix**: Allow either party to resume (matching pause symmetry), OR add a 7-day auto-resume if the pauser doesn't object.

### #438. `setSeer` no timelock
**Severity**: MEDIUM
**Description**: DAO can swap seer instantly. New seer's reward function will be called on every withdrawal.
**Fix**: 48h timelock.

### #439. `setSupportedToken` no timelock
**Severity**: MEDIUM
**Description**: DAO can disable a supported token instantly. Existing streams keep working but no new streams in that token. If disabling is malicious (e.g., during a dispute), affects user choice.
**Fix**: 24h timelock.

### #440. Stream `expiryTime = block.timestamp + MAX_STREAM_DURATION` — hardcoded 365 days, no extension
**Severity**: MEDIUM
**Description**: Streams cannot exceed 365 days. For long-term employment (multi-year contracts), users must create successive streams. Each restart loses the original creation reward.
**Fix**: Add `extendStream(streamId, additionalSeconds)` callable by payer with optional payee co-sign.

### #441. No upper bound on `ratePerSecond`
**Severity**: LOW
**Description**: Rate can be set arbitrarily high. Multiplied by elapsed time can overflow uint256 in extreme cases (rate near uint256.max). Practically unreachable but worth bounding.
**Fix**: Cap rate at 1e30 (1 trillion tokens/sec, more than universe-supply-equivalent).

### #442. `claimable` adds `pausedAccrued` post-resume — check sequencing carefully
**Severity**: LOW
**Description**: Lines 440-456: when paused, returns `pausedAccrued`. When resumed, returns `pausedAccrued + (timeDelta * rate)`. The `lastWithdrawTime` is set to `block.timestamp` on resume (line 267), so timeDelta starts fresh. pausedAccrued persists until `withdraw` is called (line 418-420). Correct.

### #443. `pauseStream` re-callable on already-paused stream reverts
**Severity**: ACKNOWLEDGED

### #444. `cancelStream` doesn't run for streams that are paused
**Severity**: LOW
**Description**: If stream is paused, `claimable()` returns `pausedAccrued`. `cancelStream` settles this and returns remainder to payer. Works correctly.
**Fix**: Add test coverage; verify edge case.

### #445. `claimExpiredStream` payee gets capped at `claimable()` which respects expiry
**Severity**: ACKNOWLEDGED

---

## ServicePool

### #446. `pause()` halts all `claimPayment` and `batchClaim` with no timelock
**Severity**: HIGH
**Location**: `ServicePool.sol:392-393`
**Description**: ADMIN_ROLE pauses; affects `whenNotPaused` modifier on claim functions. Workers can't claim during pause. No timelock. Single role-holder can halt pool indefinitely.
**Fix**: Either:
- Remove `Pausable` (per "no freeze" principle); or
- Add 48h timelock on pause()

### #447. `sweepUnclaimed` to admin-chosen `to` address — admin can self-direct after 180 days
**Severity**: MEDIUM
**Location**: `ServicePool.sol:329-367`
**Description**: After 180-day claim window, admin can sweep unclaimed to ANY address. Worker pay routes to admin's choice.
**Fix**: Restrict `to` to a known protocol address (e.g., FeeDistributor or treasury), or burn.

### #448. `emergencyWithdraw` "above committed" pattern is sound
**Severity**: ACKNOWLEDGED
**Description**: Withdraws only `balance > totalCommitted`, protecting worker claims. Good design.

### #449. `_recordContribution` score has no per-call upper bound
**Severity**: MEDIUM
**Description**: Child contracts decide score. Untrusted child = unlimited score. Internal function relies on caller correctness.
**Fix**: Document clearly that child contracts must validate score ranges. Add a child-side max-score variable.

### #450. `batchClaim` cap of 50 periods is reasonable
**Severity**: ACKNOWLEDGED

### #451. Period rollover (`_advancePeriodIfNeeded`) handles multi-period skips correctly
**Severity**: ACKNOWLEDGED

---

## RevenueSplitter

### #452. Distribute uses balance snapshot — anyone can front-run by donating
**Severity**: LOW
**Description**: `distribute` reads `IERC20(token).balanceOf(address(this))` (line 49). A donor can call distribute right after sending tokens; their donation distributes per the splits. Not an attack, just a public API surface.
**Fix**: Document; or restrict distribute to authorized callers.

### #453. `updatePayees` checks total = 100% but doesn't validate non-overlapping accounts
**Severity**: LOW
**Description**: Same account can appear twice with different shares. Sums correctly to 100% but distributes twice to that account. Probably intentional.

---

## DutyDistributor

### #454. Daily cap (`maxPointsPerUserPerDay`) silently drops votes that would exceed it
**Severity**: LOW
**Location**: `DutyDistributor.sol:105`
**Description**: `if (userDailyPoints[voter] + pointsPerVote > maxPointsPerUserPerDay) return;` — silent return, no event. Voter has no signal that their vote didn't earn points.
**Fix**: Emit `DailyPointsCapped(voter, attemptedPoints)` event.

### #455. Lifetime cap (`maxPointsPerUser`) similarly silent
**Severity**: LOW
**Description**: `if (userPoints[voter] + pointsPerVote <= maxPointsPerUser)` — wrapped in conditional, no event when cap exceeded.
**Fix**: Emit event.

---

## VFIDECommerce / MerchantRegistry / CommerceEscrow

### #456. `MerchantRegistry.dao`, `token`, `vaultHub`, `seer` are immutable — no rotation path
**Severity**: HIGH
**Location**: `VFIDECommerce.sol:43-47`
**Description**: All four are `immutable`. Cannot be changed post-deploy. If DAO is compromised, no rotation. If vaultHub upgrades, MerchantRegistry can't follow. Severely limits long-term flexibility.
**Fix**: Convert immutables to settable with 48h timelock. The "immutable for security" argument is weak when there's no escape hatch for legitimate upgrades.

### #457. `_noteRefund` and `_noteDispute` accept calls from `authorizedEscrow` OR `dao` — DAO can manipulate counters
**Severity**: MEDIUM
**Description**: DAO can call `_noteRefund` repeatedly to push refund count over `autoSuspendRefunds`, force-suspending a merchant. No timelock or proof of refund.
**Fix**: Restrict to `authorizedEscrow` only; remove DAO direct path. DAO should only resolve disputes via `resolve`.

### #458. `CommerceEscrow.resolve` is `onlyDAO` — single key resolution
**Severity**: MEDIUM
**Description**: DAO unilaterally decides dispute outcomes. No multi-arbiter, no appeal. Per the user's "no freeze" principle, this is also a manifestation of DAO power: DAO can route any disputed escrow to either party.
**Fix**: For high-value disputes (e.g., > 10K VFIDE), require arbiter co-signature OR community vote.

### #459. `markFunded` re-validates vault ownership at call time (good) — but no check that funds actually arrived
**Severity**: LOW
**Description**: `safeTransferFrom` would revert if balance/allowance fail. So this is implicitly handled.
**Fix**: None needed; documenting.

### #460. Escrow ID arithmetic is via `++escrowCount` — overflow at 2^256-1; not a concern
**Severity**: ACKNOWLEDGED

---

## EscrowManager (deprecated)

### #461. EscrowManager `release`, `refund`, `claimTimeout`, `raiseDispute` still operational despite createEscrow being deprecated
**Severity**: LOW
**Location**: `EscrowManager.sol:142-148, 155-204`
**Description**: `createEscrow` reverts with `ESC_Deprecated` (line 148). But existing escrows (created in V13 era) can still progress. The contract is partial-deprecation, not full.
**Fix**: Document the migration plan. Are there any V13-era escrows that need draining? If so, document the wind-down procedure. If not, deprecate the entire contract by also reverting `release`/`refund` after a clearly-communicated date.

---

## DevReserveVestingVault

### #462. `emergencyFreeze` has no DAO unfreeze path
**Severity**: HIGH
**Location**: `DevReserveVestingVault.sol:185-190`
**Description**: DAO calls `emergencyFreeze` → `claimsPaused = true`. DAO has no `emergencyUnfreeze`. Beneficiary can call `pauseClaims(false)` to unpause (line 178). But if beneficiary key is also compromised (likely same key as DAO at deploy), no recovery.
**Fix**: Add `emergencyUnfreeze` callable by DAO with co-signature requirement (e.g., AdminMultiSig 3/5). Or document the recovery path explicitly.

### #463. `setVestingStart` allows DAO to backdate up to 30 days
**Severity**: MEDIUM
**Description**: 30 days backdate × 5-year vest = ~1.6% of total allocation can be unlocked instantly via backdating. Plus the cliff is 60 days, so backdate within 30 days doesn't yet unlock anything (cliff hasn't elapsed). Safe by design.

### #464. `BENEFICIARY` and `DAO` are immutable — no rotation
**Severity**: HIGH
**Description**: Both are `immutable`. If beneficiary loses key, vesting unclaimable forever. If DAO is compromised, can't be rotated. (Per #417.)
**Fix**: Add timelocked rotation for DAO; add `proposeBeneficiaryUpdate` with multi-month delay (this is a major change).

### #465. Vested amount calculation rounds down per unlock; last unlock covers the remainder
**Severity**: ACKNOWLEDGED
**Description**: Verified correct. Last unlock covers 20-token rounding remainder.

---

## LiquidityIncentives

### #466. `addPool` calls `vfideToken.setWhaleLimitExempt(lpToken, true)` in try/catch
**Severity**: LOW
**Location**: `LiquidityIncentives.sol:114`
**Description**: Best-effort exemption. If token's setWhaleLimitExempt rejects (e.g., not authorized), exemption silently fails; LP transfers may hit whale limits later.
**Fix**: Either require success (revert if exemption fails), OR document and add post-deploy verification.

---

## StablecoinRegistry

### #467. Decimals enforced at 1-18 range — outside conventional 6/8/18 — no real impact
**Severity**: ACKNOWLEDGED

### #468. All operations have 48h timelocks — strong defense
**Severity**: ACKNOWLEDGED

---

## GovernanceHooks

### #469. Single-key DAO can call `reportGovernanceAbuse` to punish any user
**Severity**: MEDIUM
**Location**: `GovernanceHooks.sol:145-159`
**Description**: DAO can mark any user as "governance abuser" → -50 score via Seer. No proof required; no challenge window.
**Fix**: Add 48h challenge window OR require multi-sig DAO co-signature.

### #470. `onProposalQueued` REVERTS if SeerGuardian flags blocked — bricks DAO timelock execution
**Severity**: HIGH
**Location**: `GovernanceHooks.sol:103-113`
**Description**: If SeerGuardian's `isProposalBlocked` returns true, `onProposalQueued` reverts. Called by DAO before execution. Reverts mean DAO cannot execute the proposal, period.

If SeerGuardian is compromised or buggy, ALL DAO proposals can be blocked. DAO has no ability to override.

**Fix**: Wrap the check in try/catch; treat reverts as "not blocked":
```solidity
if (address(guardian) != address(0)) {
    try guardian.isProposalBlocked(id) returns (bool blocked, string memory reason) {
        if (blocked) revert GH_ProposalBlocked(reason);
    } catch {
        // Guardian failure: don't block
    }
}
```

### #471. `onVoteCast` REVERTS if voter is "restricted" by SeerGuardian
**Severity**: HIGH
**Description**: Similar concern. SeerGuardian can block any voter. Compromised SeerGuardian can disenfranchise any subset of voters.
**Fix**: Wrap in try/catch; emit warning event but don't block.

### #472. `transferOwnership` is single-step; no acceptance pattern
**Severity**: LOW
**Description**: Direct transfer with no 2-step accept. Wrong address = ownership lost.
**Fix**: Use OZ Ownable2Step pattern.

---

## VFIDEBridge (future)

### #473. `maxBridgeAmount` and `dailyBridgeLimit` mutable; owner-only
**Severity**: MEDIUM
**Description**: Owner can set arbitrary limits without timelock. Owner could set `maxBridgeAmount = 0` to halt all bridging.
**Fix**: 48h timelock on these setters.

### #474. `bridgeFee` mutable up to some implicit cap
**Severity**: MEDIUM
**Description**: Owner sets fee without timelock. Can be set to manipulative levels.
**Fix**: Hard-cap fee at 100 bps (1%); add 48h timelock.

### #475. `refundWindowCosigner` pattern is good defense but cosigner can be the same as owner
**Severity**: LOW
**Description**: Defense relies on cosigner being a different key. Configuration discipline matters.
**Fix**: Require cosigner != owner in setter.

### #476. LayerZero OApp inherits owner controls; bridge inherits all upstream LayerZero risks
**Severity**: INFO
**Description**: Bridge depends on LayerZero security. Trust model is shared.

---

## SeerAutonomous (future)

### #477. `daoOverride(subject)` with arbitrary `expiry` — DAO can grant immunity
**Severity**: HIGH
**Location**: `SeerAutonomous.sol:986-1000`
**Description**: DAO can override restrictions for any subject indefinitely (expiry param). Subject becomes immune to enforcement.
**Fix**: Cap expiry at 30 days max.

### #478. `daoSetRateLimit` no timelock
**Severity**: MEDIUM
**Description**: DAO can change rate limits per restriction level instantly.
**Fix**: 24h timelock.

### #479. `riskOracle.getRiskScore` is wrapped in try/catch (good)
**Severity**: ACKNOWLEDGED
**Description**: Oracle failure doesn't block user actions. Correct fail-open behavior.

### #480. `setOperator` instantly grants beforeAction calling rights
**Severity**: MEDIUM
**Description**: Anyone can be added as operator instantly. Operator can call beforeAction on arbitrary subjects.
**Fix**: 48h timelock.

---

## Frontend governance / settings

### #481. `SuggestionsTab.tsx`, `DiscussionsTab.tsx` use hardcoded mock data
**Severity**: MEDIUM
**Location**: `app/governance/components/SuggestionsTab.tsx:64-200+`, `DiscussionsTab.tsx:46-180+`
**Description**: All suggestions and discussions are local React state with hardcoded examples. No backend integration. UI shows fake data; users' submissions don't persist.
**Fix**: Either connect to a real backend (Postgres + API routes) OR clearly mark as "demo data" in the UI.

### #482. `CreateProposalTab.tsx` calls `onPropose` callback but parent component handling not verified
**Severity**: LOW
**Description**: The handler chain depends on parent. Sanitization happens in this component (good — `sanitizeString` calls). On-chain proposal eventually goes through wagmi. Trust chain is OK if parent passes a correct on-chain handler.
**Fix**: Document the expected `onPropose` signature; add type-level enforcement.

### #483. `app/settings/page.tsx` is a links-only page — no real settings UI
**Severity**: INFO
**Description**: Settings page just links to `/vault/settings`, `/security-center`, `/notifications`. The actual settings live elsewhere.
**Fix**: None needed; design choice.

### #484. `app/vault/settings/page.tsx` mounts `VaultSettingsPanel` and `GuardianManagementPanel`
**Severity**: INFO
**Description**: Real settings UI lives in components. Components were not audited in this round.

---

## Test infrastructure

### #485. 316 test files exist; mock-heavy approach
**Severity**: HIGH
**Description**: Frontend tests use jest mocks (`vi.mock`, `jest.mock`). Earlier rounds noted "tests use jest mocks rather than real EVM." This means tests verify component logic but not on-chain behavior. Critical contract bugs (like the permit struct hash, the ecosystemMinBps inflation, the AdminMultiSig wiring gap) wouldn't be caught by these tests.
**Fix**: Add a separate test suite that runs against a forked mainnet (or hardhat local with full deploy). Test scenarios:
- Permit signature flow end-to-end
- Token transfer with router computing fees
- Vault recovery rotation
- DAO proposal lifecycle
- Multi-step deploy + transfer-governance + apply-full

### #486. No integration test that runs deploy-full + transfer-governance end-to-end
**Severity**: HIGH
**Description**: Without an end-to-end deploy test, the kind of bugs in #415 (treasury contract type) are caught only at production deploy time.
**Fix**: Add `npm run test:integration:deploy` that runs the full deploy + handover sequence on a fresh hardhat instance, with assertions like:
- After deploy: every Ownable contract's owner is one of {AdminMultiSig, OCP, immutable beneficiary}
- After deploy: every DAO field is one of {DAO contract, AdminMultiSig}
- No "leftover" deployer addresses in any role

---

## Cross-cutting observations from R21

### 1. Many "DAO can do X" findings collapse to "deployer can do X" until #391 is fixed

Most DAO functions in the audited contracts (PanicGuard.reportRisk, EmergencyBreaker.toggle, FraudRegistry.confirmFraud, GuardianRegistry.addGuardian, etc.) become equivalent to "deployer can do X" because the deployer is the DAO at deploy. The wiring fix (#391) is the lever that converts "deployer power" into "AdminMultiSig council power" across the protocol.

### 2. Multiple instant admin/DAO setters exist throughout the codebase

Pattern: `setX` is called once at deploy with deployer EOA, then needs to be rotated to a real governance contract. Many of these have no timelock on the setter (relying on the next setter to be careful). Once the system is in steady state with AdminMultiSig as DAO, instant setters become attack vectors if AdminMultiSig is compromised.

Consistent fix: every DAO/admin setter should have 24-48h timelock by default. Audit every setter.

### 3. Guardian/lock asymmetry persists across multiple contracts

GuardianLock requires DAO to unlock. PanicGuard requires DAO to clear quarantines. CardBoundVault requires guardian threshold to unpause (per Round 15). Each contract has slightly different rules for "who can undo what."

Recommended consolidation: pick a consistent rule. The user-friendly rule is "the user (vault) can always undo restrictions on their own funds; DAO can only impose, not undo without user co-sign."

### 4. Future contracts have similar centralization issues to current ones

VFIDEBridge, SeerAutonomous, MainstreamPayments — all the "future" contracts I sampled have DAO-instant-setters and DAO-override patterns. When these get deployed, expect another round of "must wire to AdminMultiSig" work.

### 5. Test coverage is the biggest blind spot

316 test files but no end-to-end deploy test. The kinds of bugs that this audit found (deploy script mismatch, missing wrappers, ownership not transferred) are exactly what end-to-end tests would catch.

---

## Updated cumulative count after Round 21

~468 findings.

- **Critical**: ~46 (added 3: #415, #416, #429)
- **High**: ~84 (added 8)
- **Medium**: ~118 (added 20)
- **Low**: ~96 (added 12)
- **Info/Acknowledged**: ~124 (added 11)

## Updated top 10 priorities (with R21)

1. **Fix #415 — VFIDEToken treasury must be a contract; deploy AdminMultiSig FIRST in deploy-full.ts** (deploy blocker, replaces prior #306 framing)
2. **Fix #307 — VFIDEToken permit struct hash deadline missing**
3. **#391 — Wire AdminMultiSig: comprehensive ownership/DAO transfers (R20)**
4. **#416 — Update transfer-governance.ts to cover 11+ missing contracts**
5. **#392 — Lower EMERGENCY_APPROVALS to 4-of-5 in AdminMultiSig**
6. **#393 — Make veto require quorum in AdminMultiSig**
7. **#345 — Cap ecosystemMinBps inflation at original totalFee**
8. **#363-#367 — Consolidate halt mechanisms (pick ONE)**
9. **#470, #471 — Wrap GovernanceHooks SeerGuardian calls in try/catch (don't brick DAO)**
10. **#436 — Restrict PayrollManager.emergencyWithdraw recipient to {payer, payee}**

The R21 changes affect priorities 1, 4, 9, and 10. Items #392 and #393 from R20 stay critical because AdminMultiSig brittleness compounds with #391 wiring.

## What's STILL unaudited after R21

- **MainstreamPayments** (1352 LOC) — large future contract; high economic surface
- **CouncilElection** (575), **CouncilManager** (449), **CouncilSalary** (240) — full audit needed
- **Badge contracts**: BadgeManager (542), BadgeRegistry (335), BadgeQualificationRules (92), VFIDEBadgeNFT (448) — full audit
- **Subscription/Benefits/Enterprise** future contracts: SubscriptionManager (564), VFIDEBenefits (210), VFIDEEnterpriseGateway (420)
- **Seer family rest**: SeerGuardian (645), SeerSocial (736), SeerWorkAttestation (436), SeerView (232), SeerPolicyGuard (213), SeerAutonomousLib (~)
- **Validate scripts**: validate-deployment.ts, validate-mainnet-env.ts, validate-phase1-dry-run.ts, validate-signoff-tests.ts
- **Verify scripts** (~30 scripts): verify-card-bound-vault-security.ts, verify-fee-burn-router-invariants.ts, verify-merchant-payment-escrow-invariants.ts, etc.
- **Indexer service code** — only metadata-level findings (#79, #80) so far
- **Detailed frontend hooks audit** — only sampled
- **Detailed VFIDESecurity tests** — security-critical contracts deserve real coverage tests

## Suggested follow-ups (next round)

If a R22 is needed, prioritize:
- **MainstreamPayments + Badge family** — large untouched economic surface
- **Verify scripts** — these are the protocol's continuous-monitoring layer; if THEY have bugs, monitoring is broken
- **Indexer service** — handles all the on-chain → DB translation
- **Detailed test of #415 fix path** — deploy AdminMultiSig first, deploy VFIDEToken second, verify constructor passes

*End of Round 21.*
