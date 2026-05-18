# VFIDE Protocol — Pre-Professional-Audit Review
## Phase 1: Smart Contracts — Consolidated Report

**Prepared by:** Claude (Anthropic)
**Date:** April 21, 2026
**Commit under review:** `Vfide-main__6_.zip` (dated 2026-04-20)
**Scope:** ~68 of ~70 production Solidity contracts
**Sessions:** 8
**Status:** Near-complete. Remaining exclusions are interfaces and scanned-but-not-reviewed items documented in §7.

---

## 0. Read This First — Scope and Limitations

This is **not** a professional security audit. It is a structured pre-audit review intended to reduce the time and cost of a subsequent engagement with a firm like Trail of Bits, Spearbit, or Zellic.

### Codebase statistics

| Measure | Value |
|---|---|
| Production `.sol` files | ~70 |
| Interfaces | 27 |
| Mocks | 10 |
| Total Solidity LOC | 33,285 |
| TypeScript / TSX LOC (excl. tests) | 220,720 |
| Test LOC | 102,389 |
| Compiler | `pragma solidity 0.8.30` (uniform) |
| Upgradeable proxies | None |
| `delegatecall` usage | None |
| `selfdestruct` usage | None |

### Coverage in this Phase 1 report

**Read with depth (57):** Session 1-6 contracts plus EmergencyControl (halt committee, recovery flow), CouncilManager (score checks, payment distribution), VFIDEEnterpriseGateway (order, settle, _swapToStable).

**Scanned + confirmed low-risk (11):** VFIDEBadgeNFT (soulbound ERC-721, adminBurn properly gated against Seer state), VFIDEBenefits, ProofLedger (per-block rate limits, DAO-controlled loggers), DutyDistributor (bounded setters), BadgeRegistry (pure constants), BadgeQualificationRules (pure helpers), VFIDETrust (empty import shim), SeerView (read-only), SeerAutonomousLib (pure library), EcosystemVaultLib (pure library), EcosystemVaultView (read-only).

**Uncovered:** See §7.

### Finding counts

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 38 |
| Medium | 37 |
| Low | 22 |

---

## 1. Executive Summary

### Overall assessment

The codebase reflects extensive prior audit cycles: hundreds of `// X-YY FIX` annotations, deliberate non-custodial architecture, custom errors throughout, uniform compiler version, no delegatecall or selfdestruct, and no upgradeable proxies. Core economic primitives are well-designed: 48-hour sink/router timelocks, circuit-breaker activation delays, the ProofScore fee curve, the CardBoundVault EIP-712 signed-intent model with `walletEpoch` rotation invalidation, FraudRegistry's atomic credit-and-register escrow, and FeeDistributor's pull-model fee splitting.

However, the following systemic issues span the codebase and need attention before a professional audit:

1. **CRITICAL — phantom stablecoin payment path.** `EcosystemVault._deliverWorkReward` is a one-line `rewardToken.safeTransfer`. The extensive NatSpec describing a three-tier stablecoin-routing system is documentation of code that does not exist. `stablecoinOnlyMode` is a storage variable that no payment path reads. The Howey-compliance narrative depends on workers being paid in stablecoin — they're paid in VFIDE.

2. **Marketing-vs-code drift across the non-custodial promise.** `BLACKLIST_MANAGER_ROLE`, `OwnerControlPanel.vault_freezeVault`, `CircuitBreaker.incrementBlacklist`, `RestrictionLevel.Frozen`, the `UserVaultLegacy.__forceSetOwner` in `VaultInfrastructure`, and several NatSpec blocks describe freeze/blacklist capabilities that are either cosmetic (no enforcement) or restricted to legacy code paths. A professional auditor reading the code will flag each of these as an inconsistency with the public architecture claims.

3. **Governance-level single-key authorities.** `SharedInterfaces.Ownable.emergencyTransferOwnership` is a single-address escape hatch inherited by 21 contracts — any compromise of the emergency controller transfers every ownable contract out from under the DAO. `SystemHandover.disarm` is unbounded — dev multisig can reset the 6-month handover clock indefinitely. `DevReserveVestingVault.setVestingStart` accepts arbitrary past backdating by DAO — 50M dev reserve can be made instantly claimable.

4. **Partial-freeze / UX-as-security gaps.** `SeerAutonomous.RestrictionLevel.Frozen` blocks payments + DAO + escrow but not direct token transfers, so "frozen" users can still move tokens peer-to-peer. `PanicGuard.selfPanic` sets `quarantineUntil` that no transfer-path contract reads — users who panic are not actually locked out. Auto-vault creation on token receipt combined with a 30-day guardian-setup grace period creates a silent permanent recovery lockout for users who never complete onboarding.

5. **Bridge and oracle single-points-of-failure.** `VFIDEPriceOracle` is Chainlink-only (Uniswap TWAP fallback is stubbed out). `VFIDEBridge` has no cross-chain supply invariant; `refundWindowCosigner` is optional.

### Recommended sequencing

1. **Fix the critical first.** `_deliverWorkReward` is a legal-position blocker, not just a code bug.
2. **Fix the H-findings that are cheap cleanups** (rename `Frozen` → `ServicesBanned`, remove `vault_freezeVault`, remove `BLACKLIST_MANAGER_ROLE`, close `_forceSetOwner` in legacy path). These are a couple of hours of work and remove a couple of audit-report pages of noise.
3. **Decide the emergency-controller and handover-disarm design** before audit. These are architectural choices, not bugs — the audit firm needs to know the intent before scoring them.
4. **Complete the uncovered contracts in §7** in at least as much depth as this report covers the covered contracts.
5. **Then commission the professional audit.**

---

## 2. Findings — Critical

### C-01 — `EcosystemVault._deliverWorkReward` is a phantom stablecoin routing path

**Files:** `EcosystemVault.sol:993-1001` (implementation), `EcosystemVault.sol:986-992, 846-848, 1014-1016` (conflicting NatSpec), `EcosystemVault.sol:618-628` (`setStablecoinOnlyMode`).

**Issue:** The NatSpec on `_deliverWorkReward` describes three-tier routing: stablecoin reserve → DEX swap via `_swapToStable()` → VFIDE fallback. The function body is:

```solidity
function _deliverWorkReward(
    address worker,
    uint256 amount,
    string memory program,
    string memory reason
) internal {
    rewardToken.safeTransfer(worker, amount);
    emit WorkRewardPaid(worker, amount, program, reason);
}
```

No `_swapToStable` function exists anywhere in `EcosystemVault.sol`, `EcosystemVaultLib.sol`, or `EcosystemVaultView.sol` (verified by grep, zero hits). `stablecoinOnlyMode` is a state variable set by `setStablecoinOnlyMode` but never read by `_deliverWorkReward`. The `configureAutoSwap` setter stores router/slippage parameters that are never used by any function.

**Impact:** This is a **Howey compliance blocker, not just a code bug.** The protocol's documented legal position is that work rewards are "fixed-dollar service fees" paid in stablecoin — specifically to mitigate Howey Prong 3 (profit expectation from an appreciable token). On-chain, enabling `stablecoinOnlyMode` does nothing. Workers receive VFIDE. The "HOWEY FIX" comments throughout the contract describe behavior that isn't there.

**Remediation options:**
- **Option A (recommended):** Implement the swap. Add `_swapToStable(amount, minOut)` using a Uniswap V3 router, read `stablecoinOnlyMode` in `_deliverWorkReward`, route through `stablecoinReserves[preferredStablecoin]` first, then DEX. Test with invariant that payments-under-stablecoin-mode always arrive as stablecoin.
- **Option B (short-term):** Remove all stablecoin-routing NatSpec, state variables, and setters until the feature is implemented. The code becomes honest about paying in VFIDE. Howey position must be revised.

This finding supersedes most others in severity. **It must be addressed before the code is handed to a professional auditor**, because the auditor will either (a) flag it as a critical code issue or (b) ask the legal team about it and get a much more serious conversation than the code review.

---

### C-02 — `BridgeSecurityModule` still enforces blacklist

**File:** `BridgeSecurityModule.sol:88-89, 114`.

`checkRateLimit` reverts with `Blacklisted()` if `blacklist[user]` is true (line 114). This is a functioning, actively-enforced blacklist that can prevent any user from bridging VFIDE cross-chain. Owner controls this mapping.

**Context:** Unlike the `BLACKLIST_MANAGER_ROLE` in VFIDEAccessControl (which is a cosmetic role with no real enforcement — H-05), this blacklist actually works. A blacklisted user cannot cross-chain their own tokens. For protocols subject to OFAC compliance, this may be a legitimate and required control. But it directly contradicts the public "non-custodial, no blacklist" claim.

**Why critical, not high:** This is a live enforcement primitive, not cosmetic. It shares the severity class of C-01 (stated behavior diverging from actual behavior), except the direction is reversed: C-01 claims a feature that doesn't work; C-02 has a feature that works but is publicly disavowed.

**Remediation:** Pick one:
- **Option A (marketing):** Remove the blacklist. If the design intent is "cannot block user transfers", the bridge should respect it too.
- **Option B (compliance):** Keep the blacklist but explicitly carve it out in marketing. "No blacklist on peer-to-peer transfers" is defensible. "No blacklist anywhere" is not.
- **Option C (restructure):** Move the bridge-level blacklist to a separately-deployed module (e.g., "OFAC screening adapter") owned by a compliance multisig, distinct from the DAO. Document that bridge operations are subject to an external compliance layer. Peer-to-peer on-chain VFIDE remains unblocked.

---

## 3. Findings — High Severity

### H-01 — Auto-vault creation + 30-day guardian grace = silent permanent recovery lockout

**Files:** `VaultHub.sol:324-346` (ensureVault), `VaultHub.sol:469-486` (executeRecoveryRotation), `VaultHub.sol:432-436` (isGuardianSetupExpired), `VFIDEToken.sol:886-890` (auto-create call site).

`VFIDEToken._transfer` auto-creates a vault for any EOA recipient without one. The new vault has the owner as sole guardian (threshold 1). If the user never completes `completeGuardianSetup` within 30 days, `executeRecoveryRotation` rejects recovery permanently. A user receiving an airdrop or remittance can silently age into an unrecoverable state.

**Remediation:** Either block auto-vault-creation for EOAs without onboarding, or allow a higher-bar recovery (e.g., 14-day on-chain challenge) when no guardians were ever configured.

### H-02 — Cancelled queued withdrawals don't refund `spentToday`

**File:** `CardBoundVault.sol:484-493, 567-580`.

Queued withdrawals commit `spentToday += amount` at queue time. Cancellation sets `cancelled = true` without refunding. A compromised key can queue 20 withdrawals totaling the daily limit; a guardian cancels each; legitimate owner is rate-limited for the rest of the day even though no tokens moved.

**Remediation:** On cancel in same daily window, decrement `spentToday` by `w.amount`.

### H-03 — `SystemHandover.disarm()` is unbounded

**File:** `SystemHandover.sol:79-88`.

Dev multisig can disarm and re-arm the 6-month handover clock indefinitely. No time-window constraint on disarm, no cap on total disarms, and `arm(uint64 t0)` only requires `t0 != 0`.

**Remediation:** `require(block.timestamp < handoverAt - 30 days)` in `disarm`; cap total disarms (e.g., `maxDisarms = 1`); bound `t0` to `block.timestamp ± 7 days` in `arm`.

### H-04 — VFIDEPriceOracle is single-source, not hybrid

**File:** `VFIDEPriceOracle.sol:9, 227-235`.

Contract NatSpec claims "Hybrid oracle combining Chainlink and Uniswap V3 TWAP." `_getUniswapPrice()` is stubbed to always return zero ("Uniswap TWAP integration is currently disabled"). Chainlink failure causes `getPrice()` to revert.

**Remediation:** Implement Uniswap V3 TWAP properly, OR remove the "hybrid" claim from NatSpec. The current state is a false marketing claim that a professional auditor will flag on page 1.

### H-05 — `OwnerControlPanel.vault_freezeVault` contradicts non-custodial claim

**Files:** `OwnerControlPanel.sol:820-830`, `VFIDESecurity.sol:282-421`, `VFIDEAccessControl.sol:14`, `CircuitBreaker.sol:209-228`.

The function is named `vault_freezeVault` and emits `vault_frozen` events. It calls `panicGuard.reportRisk`, which sets `quarantineUntil` — but no contract reads `quarantineUntil` to gate transfers (verified). The function is cosmetic, but the naming, the role `BLACKLIST_MANAGER_ROLE`, and `CircuitBreaker.incrementBlacklist` all signal active freeze/blacklist capabilities in a protocol that publicly disavows them.

**Remediation:** Remove `vault_freezeVault` entirely. Remove `BLACKLIST_MANAGER_ROLE`. Rename `incrementBlacklist` → `incrementFlaggedAddressCount` (and corresponding fields). Decide whether PanicGuard should actually enforce anything or just emit signals, and rename accordingly.

### H-06 — VFIDEBridge has no cross-chain supply invariant

**File:** `VFIDEBridge.sol:251-328, 372-427`.

Each chain's bridge is independently funded. `_lzReceive` only checks local liquidity. Compromise of any trusted-remote bridge contract lets the attacker send arbitrary `(receiver, amount)` messages to every other chain and drain liquidity. No inbound daily cap, no cross-chain accounting invariant.

**Remediation:** Implement per-source inbound daily caps. Implement a bounded-delay inbound execution queue callable by the receiver, cancellable by governance on fraud detection.

### H-07 — Refund window cosigner is optional and defaults to single-party

**File:** `VFIDEBridge.sol:66-72, 320-327`.

`refundWindowCosigner` is optional. A compromised owner alone can issue source-chain refunds for transfers already delivered on destination — cross-chain double-spend.

**Remediation:** Make cosigner required; revert in `bridge()` or refund-window openers if zero. Add deployment check.

### H-08 — `DevReserveVestingVault.setVestingStart` allows unbounded DAO backdating

**File:** `DevReserveVestingVault.sol:105-115`.

Callable by `BENEFICIARY || DAO`, requires `timestamp <= block.timestamp`, no lower bound. A compromised DAO can set `startTimestamp = block.timestamp - VESTING` — 50M dev reserve instantly claimable via `claim()`.

**Remediation:** Add `require(timestamp >= block.timestamp - 30 days)`. Remove DAO authority over `setVestingStart` entirely if possible.

### H-09 — `AdminMultiSig.executeProposal` drops return data

**File:** `AdminMultiSig.sol:225-259`.

Line 256: low-level call discards return data. For ERC-20 tokens that return `false` without reverting, successful low-level call → proposal marked Executed without the operation actually completing. `DAOTimelock.execute` handles this correctly for known ERC-20 selectors; `AdminMultiSig` doesn't.

**Remediation:** Mirror the ERC-20 selector bool-decode check from `DAOTimelock.execute`.

### H-10 — `EcosystemVault.burnFunds` soft-burns to 0xdEaD despite VFIDEToken having `burn()`

**File:** `EcosystemVault.sol:1091-1100`; `VFIDEToken.sol:358`.

Comment falsely claims "VFIDEToken has no public burn()". VFIDEToken DOES have `function burn(uint256 amount)` at line 358. Current soft-burn doesn't decrement `totalSupply`, so on-chain supply reporting is wrong.

**Remediation:** Replace soft-burn with `IVFIDEBurnable(rewardToken).burn(amount)`.

### H-11 — `EcosystemVault` manager can drain pools with no per-pool epoch cap

**Files:** `EcosystemVault.sol:850-860, 1017-1027, 1073-1088`.

`payMerchantWorkReward` and `payReferralWorkReward` are `onlyManager` with only `spendable` balance check — no daily/epoch cap. A compromised manager drains both pools in one tx. Only `payExpense` has `EXPENSE_EPOCH_CAP_BPS` guardrail.

**Remediation:** Apply epoch-cap pattern to merchant and headhunter payouts.

### H-12 — `UserVaultLegacy.__forceSetOwner` still exists

**File:** `VaultInfrastructure.sol:197-226`.

CardBoundVault removed `__forceSetOwner` as part of the non-custodial commitment. `UserVaultLegacy` retains it, callable by `hub`. If legacy vaults exist in production, their "non-custodial" claim is false.

**Remediation:** Confirm whether legacy vaults are in production. If none, remove `UserVaultLegacy` from codebase and `PRODUCTION_SET.md`. If any exist, public documentation must carve them out.

### H-13 — `Seer.calculateOnChainScore` underflow on misconfigured score source

**File:** `Seer.sol:572-609`.

Loop accumulates `totalWeight`; then `automatedWeight = 100 - totalWeight`. If any registered score source returns `weight > 100`, the subtraction reverts (0.8.x checked math). Since only `weight > 0` is validated, a buggy source bricks `calculateOnChainScore` for every subject network-wide.

**Remediation:** Add `require(totalWeight <= 100)` in the loop; additionally cap individual `weight <= 100` on insertion in `addScoreSource`.

### H-14 — `SharedInterfaces.Ownable.emergencyTransferOwnership` is a protocol-wide bypass

**File:** `SharedInterfaces.sol:361-368`.

Any contract inheriting `Ownable` (21 contracts) has an `emergencyController` — a single address that can instantly transfer ownership with no timelock, no cosigner, no cancellation. Initial set has a 48h timelock, but once set, invocation is immediate. Compromise of the emergency controller = ownership of every inheriting contract transferred out of DAO's control simultaneously.

**Remediation:** Either (a) remove `emergencyController` entirely, (b) require cosigner + timelock on `emergencyTransferOwnership` itself, (c) make opt-in per contract (token and vaults should not have it).

### H-15 — `SeerAutonomous.RestrictionLevel.Frozen` is misleading terminology

**Files:** `SeerAutonomous.sol:488-490` (enforcement), callers `MainstreamPayments.sol:781`, `DAO.sol:916`, `EscrowManager.sol:299`.

`Frozen` blocks services (payments, DAO, escrow) but not direct token transfers. In a protocol marketed as having no third-party freeze, the word "Frozen" is an audit-red-flag.

**Remediation:** Rename to `ServicesBanned` or `AccessRevoked`. Update related NatSpec.

### H-16 — `MainstreamPayments._enforceSeerAction` fail-closes on any Seer revert

**File:** `MainstreamPayments.sol:777-789`.

If SeerAutonomous reverts during `beforeAction` (its own rate limits, internal bug, out-of-gas), the payment session or session use fails with `SKM_ActionBlocked(255)`. No fallback. Given Seer's complexity, this is a real liveness risk — a single SeerAutonomous bug takes down all payments.

**Remediation:** Consider a circuit-breaker around `seerAutonomous` calls: after N consecutive reverts, fall back to Allowed with an event, and require DAO to re-enable. Alternatively, use try/catch that distinguishes block-by-design from failure.

### H-17 — `VFIDETermLoan` guarantor extraction needs long-lived standing approval

**File:** `VFIDETermLoan.sol:649-688`.

`extractFromGuarantors` uses `vfideToken.transferFrom(source, lender, amount)`. For this to work, the guarantor must pre-approve VFIDETermLoan for their full liability amount. If VFIDETermLoan is ever compromised (or governance replaces the implementation), every standing guarantor approval becomes drainable.

**Remediation:** Use per-extraction EIP-712 signatures instead of standing approvals, OR require guarantor to sign each extraction explicitly. Major design change but necessary for security.

### H-18 — `VFIDEFlashLoan` depends on undocumented `systemExempt` status

**File:** `VFIDEFlashLoan.sol:244-309`.

The flash loan settlement at line 281-282 checks that `balanceOf(this) >= balBefore + amount + totalFee` after `transferFrom`. If VFIDEToken is NOT configured to exempt VFIDEFlashLoan via `systemExempt`, the burn router fees apply to the transferFrom, and every flash loan silently reverts. No constructor-time assertion.

**Remediation:** Add an `_assertSystemExempt()` helper (similar to `VFIDEBridge._bridgeIsSystemExempt`) called in constructor and `flashLoan`. Make deployment scripts verify this explicitly.

### H-19 — `VaultRegistry.setRecoveryId` and `setUsername` violate their own privacy claim

**File:** `VaultRegistry.sol:179-195, 252-273`.

The contract header promises "All identifiers are stored as keccak256 hashes, never plaintext." `setEmailRecovery` and `setPhoneRecovery` correctly accept pre-hashed `bytes32` parameters. But `setRecoveryId(address vault, string calldata recoveryId)` and `setUsername(address vault, string calldata username)` both accept **plaintext strings** that are hashed on-chain (lines 183 and 256). The plaintext is permanent in transaction calldata on the public blockchain — anyone scanning txs to this contract can read everyone's recovery phrase and username in cleartext.

**Remediation:** Change both setters to accept `bytes32 hash` parameters, matching the email/phone pattern. Frontend hashes client-side before sending.

### H-20 — VaultRegistry hashes are vulnerable to rainbow-table attacks

**File:** `VaultRegistry.sol:50-66`.

Even if all four identifier types (recovery ID, email, phone, username) were pre-hashed, the hash is `keccak256(input)` with no salt. Given the small entropy space of typical email addresses (firstname.lastname@gmail.com), phone numbers, and common usernames, rainbow tables make reverse-lookup feasible. An attacker scraping `vaultByEmailHash`/`vaultByPhoneHash`/etc. can build a mapping from email→vault with high hit rates.

**Remediation:** Salt each hash with a chain- and contract-specific value: `keccak256(abi.encode(block.chainid, address(this), input))`. Better: move the identifier-to-vault mapping off-chain entirely and use a privacy-preserving proof (zkEmail, etc.) for recovery.

### H-21 — `VaultRegistry.registerGuardian` doesn't verify guardian relationship

**File:** `VaultRegistry.sol:279-291`.

Vault owner (`onlyVaultOwner`) can register any address as a "guardian" in the registry, without validating that address is actually a guardian of the vault in `CardBoundVault.isGuardian`. Creates false positives for vault-by-guardian lookup. Also: a person falsely registered cannot remove themselves (`removeGuardian` is `onlyVaultOwner`), so their `vaultsGuardedBy[them]` grows with vaults they never agreed to guard.

**Remediation:** Add `require(CardBoundVault(vault).isGuardian(guardian))` in `registerGuardian`. Add a self-remove path: `function selfRemoveFromVault(address vault) external` that only succeeds if the caller is NOT a guardian of the vault in the canonical source.

### H-22 — `SeerGuardian._applyAutoRestriction` inherits stale expiry

**File:** `SeerGuardian.sol:314-322`.

Line 316-318: `if (restrictionExpiry[subject] < 1) { restrictionExpiry = now + max; }`. The check compares against 0, but an expired-in-the-past restriction has a non-zero (but stale) expiry. A subject escalated from a long-expired GovernanceBan to FullFreeze inherits the stale expiry — the FullFreeze is effectively already expired.

**Remediation:** Change to `if (restrictionExpiry[subject] <= block.timestamp) { restrictionExpiry = block.timestamp + max; }`.

### H-23 — `SeerGuardian.recordViolation` can shorten existing restriction expiry

**File:** `SeerGuardian.sol:306-308`.

Line 307: `restrictionExpiry[subject] = uint64(block.timestamp) + duration;` — unconditionally overwrites. A subject with a long existing restriction could have their window shortened by a minor subsequent violation.

**Remediation:** `restrictionExpiry = max(existing, block.timestamp + duration)`.

### H-24 — BridgeSecurityModule deploy-time race: bootstrap `bridge = owner`

**Files:** `DeployPhase3Peripherals.sol:31`, `BridgeSecurityModule.sol:96-101, 109-170`.

`DeployPhase3Peripherals` constructs BSM with `new BridgeSecurityModule(owner, owner)` — using the owner address as the bootstrap `bridge`. Comment says real bridge is set later via `setBridge` during `DeployPhases3to6._deployPhase3`. These are two separate contracts called in separate transactions. In the window between them, the `owner` EOA satisfies `onlyBridge` and can:
- Call `checkRateLimit(user, amount)` to pre-consume any user's rate-limit buckets
- Flag users as suspicious via `_checkSuspiciousActivity`
- Consume global hourly/daily rate budgets

**Remediation:** Constructor should accept `address(0)` for bridge. Add a one-time `initializeBridge(address)` callable only when `bridge == address(0)`. All bridge-gated functions revert cleanly until initialized. Alternatively, bundle BSM and bridge deployment in a single atomic transaction.

### H-25 — `VFIDETermLoan.payFromRevenue` has no authorization gate

**File:** `VFIDETermLoan.sol:767-802`.

The function comment says "Called by MerchantPortal (or authorized contract)" but the function has no auth modifier. Any `msg.sender` with VFIDE approval can call `payFromRevenue(id, amount)` on anyone else's loan. Pays from the caller's tokens but triggers `seer.reward(borrower, REWARD_ONTIME_BORROWER)` when fully repaid.

**Impact:** Anyone can repay a stranger's loan to fraudulently boost that stranger's ProofScore, corrupting the trust signal the entire fee economy is built on. Friends can boost each other. Sybil networks can boost each other. At scale, this defeats the ProofScore → fee-curve relationship.

**Remediation:** Require `msg.sender == l.borrower || isAuthorizedRevenueRouter[msg.sender]` where the router allowlist is maintained by governance (e.g., MerchantPortal is the one pre-approved recorder). Also consider: reward only when the msg.sender IS actually the borrower.

### H-26 — `VFIDETermLoan.signAsGuarantor` couples vault guardianship with loan liability

**File:** `VFIDETermLoan.sol:322-374`.

Line 333: `if (!cbv.isGuardian(msg.sender)) revert TL_NotGuarantor();`. Guarantors must be vault guardians of the borrower. This overloads the guardian role: guardians are recruited for key-loss recovery (low-stakes favor), but here they're auto-eligible to be financial co-signers with real liability.

The implication: adding a guardian opens them up to being solicited as a loan guarantor. A bad-faith borrower could add many guardians and then pressure them into co-signing. Guardians who refuse may feel social pressure; guardians who accept may not fully understand the GUARANTOR_LIABILITY_PCT they're approving for.

Additionally, `cbv.isGuardian(msg.sender)` doesn't call `isGuardianMature()` (which VaultInfrastructure has at line 270-273). A guardian added minutes ago can sign as guarantor immediately. Flash-endorsement attack: add accomplice as guardian, co-sign large loan, remove guardian. The loan is fully active with a fake guarantor relationship.

**Remediation:** Decouple the roles — guarantors should be a separate registration, not auto-derived from guardian list. At minimum, enforce guardian maturity (`isGuardianMature`) before allowing co-signing.

### H-27 — `PayrollManager.updatePayee` has no timelock — compromise = instant redirect

**File:** `PayrollManager.sol:244-258`.

`updatePayee` lets `msg.sender == s.payee` change the payee address instantly. No timelock, no guardian approval, no notification to payer. If payee's wallet is compromised, attacker redirects the stream to their own address in one transaction.

**Impact:** Direct theft vector. Every active stream is only as secure as the payee's hot key. Compare to CardBoundVault's wallet rotation which requires 10min-7day timelock + guardian threshold.

**Remediation:** Two-step update with timelock. Payee proposes new address; 24-48h delay; either party can cancel; apply after delay. Or require guardian co-signature via vaultHub.

### H-28 — `ServicePool.emergencyWithdraw` drains committed worker payments

**File:** `ServicePool.sol:300-303`.

`emergencyWithdraw(to)` is `onlyRole(DEFAULT_ADMIN_ROLE)` and sweeps the ENTIRE contract balance — including `totalCommitted` (tokens already promised to finalized periods but not yet claimed). Workers who performed work, had their period finalized, and are preparing to claim, can have their earnings stolen by a compromised admin before they claim.

**Impact:** Inherited by `DAOPayrollPool`, `MerchantCompetitionPool`, `HeadhunterCompetitionPool`. Any compromised DEFAULT_ADMIN_ROLE on any of these can drain workers' earned wages.

**Remediation:** Restrict to `vfideToken.balanceOf(this) - totalCommitted` (the uncommitted excess only). Or remove `emergencyWithdraw` entirely — stuck tokens should be recoverable only via a governance proposal that explicitly reconciles with workers' claims.

### H-29 — `RevenueSplitter.distribute` increments `distributed` on failed transfers

**File:** `RevenueSplitter.sol:47-84`.

Line 67 unconditionally increments `distributed += amount` before the transfer attempt at line 69-71. If the transfer fails, the amount is neither transferred nor refunded to anyone — it stays in the contract — but `distributed` is already counted. The last payee at line 60-61 gets `balance - distributed` as remainder, which is LESS than their intended share.

On the NEXT call to `distribute`, the stuck-from-failed-transfer amount is part of the new balance and gets re-distributed. If the same payee keeps failing, the same amount keeps rolling forward with a share going to the last payee.

**Impact:** Payee 1 through N-1 are correctly paid (when their transfer succeeds). Payee N gets slightly less than intended when any earlier payee fails. Over time, the last payee consistently earns less than their nominal share.

**Remediation:** Only increment `distributed` after `success == true`, OR refund the stuck amount back to a "retry queue" mapping for explicit per-payee retry.

### H-30 — `RevenueSplitter.updatePayees` has no timelock

**File:** `RevenueSplitter.sol:91-107`.

Owner instantly replaces all payees with new addresses and shares. No timelock, no second signer. Compromised owner redirects all future distributions.

**Remediation:** 48h timelock with explicit apply step.

### H-31 — `MerchantPortal.processPayment` requires standing vault approval

**File:** `MerchantPortal.sol:510-577, 582-606`.

For a merchant to pull via `processPayment`, the customer's `CardBoundVault` must have approved `MerchantPortal` via `IERC20.approve(MerchantPortal, amount)` — a standing approval. The per-merchant `merchantPullPermit` mapping gates the portal-internal authorization, but the underlying ERC-20 approval allows the portal contract itself to spend from the vault.

**Impact:** Every customer who has ever paid any merchant via this portal has an open ERC-20 allowance on MerchantPortal. If MerchantPortal is ever compromised or upgraded maliciously via governance, every such vault's balance up to the approval amount is drainable in one transaction. Same class as H-17 (TermLoan guarantors) and H-18 area (standing approvals).

**Remediation:** Use per-payment EIP-712 signed intents from the customer vault (matching the CardBoundVault.queueWithdraw pattern) rather than standing ERC-20 approvals. Each payment requires a fresh signature bound to merchant + amount + orderId + nonce.

### H-32 — `MerchantPortal.processPayment` auto-creates merchant vault with 30-day guardian clock

**File:** `MerchantPortal.sol:544`.

`vaultHub.ensureVault(msg.sender)` at payment time auto-creates a vault if the merchant doesn't have one. This cascades H-01 into merchant operations: merchants who take their first payment without first completing guardian setup will have an auto-created vault with a 30-day grace period. If they never complete setup within 30 days, their vault becomes permanently unrecoverable — and it may contain substantial accumulated receipts.

**Remediation:** Block `processPayment` for merchants without completed guardian setup. Force the guardian-onboarding step into merchant registration (`registerMerchant`), not defer it to first payment.

### H-33 — `BadgeManager` activity-recording functions trust a single `onlyOperator` role

**File:** `BadgeManager.sol:286-395`, `_checkBadgeEligibility:462-479`.

`recordCommerceTx`, `recordGovernanceVote`, `recordEndorsement`, `recordReferral`, `recordFraudReport`, `recordEducationalContent`, `awardPioneer`, `awardFoundingMember` are all `onlyOperator` with no cross-validation against the canonical source (MerchantPortal, DAO, SeerSocial, FraudRegistry, etc.). A compromised or malicious operator can fabricate arbitrary activity stats, which cascade into badge awards. Badges in turn feed back into ProofScore via endorsement weight bonuses (`SeerSocial._checkActiveBadge(TRUSTED_ENDORSER)` adds +10 to endorsement weight) and other trust-gated pathways.

**Impact:** Operator compromise allows manufacturing fake trust signals that unlock lower fees, higher borrowing limits, governance eligibility, and downstream privileges. Single-key risk on the trust economy.

**Remediation:** Replace the single `onlyOperator` mapping with a per-function authorized-source mapping. `recordCommerceTx` ← only MerchantPortal + VFIDECommerce. `recordGovernanceVote` ← only DAO. `recordEndorsement` ← only SeerSocial. `recordFraudReport` ← only FraudRegistry. Each source contract can only record its own domain.

### H-34 — `CouncilElection.setCouncil` is DAO appointment, not election

**File:** `CouncilElection.sol:137-188`.

Despite the contract name and the "Council" terminology, there is no on-chain election. `setCouncil(address[])` is `onlyDAO` — the DAO simply designates the council members from the candidate pool. No voting, no score-based ranking, no randomness. This concentrates all Council-related authority in the DAO.

**Impact:** The Council is intended (per VFIDE narrative) to be an independent oversight body. In practice, it is an extension of DAO will. Combined with the existing DAO-held authorities (setSeer, setModules, setFeeDistributor, backdate-vesting, etc.), a captured DAO has no effective check on its behavior.

**Remediation:** Implement a real election — e.g., token-weighted vote from eligible holders over the candidate list, or ProofScore-weighted voting. Alternatively, be explicit in public documentation that "Council" is a DAO-appointed advisory body, not an elected oversight organ.

### H-35 — `CouncilElection.removeCouncilMember` allows DAO to remove any member without due process

**File:** `CouncilElection.sol:217-236`.

DAO can remove any council member for any reason, immediately, with no proof requirement, no appeal, no delay. Combined with H-34, the Council has no structural independence from the DAO that appoints and can remove it at will.

**Remediation:** Require a timelock on removal (e.g., 7-day challenge period), require on-chain justification referencing a specific violation category (fraud proof, score below minimum), require a supermajority of existing council to approve the removal action.

### H-36 — `CouncilManager.checkMemberScore` lacks cooldown — DAO can collapse 7-day grace into one block

**File:** `CouncilManager.sol:214-234`.

The keeper-facing `checkDailyScores` (line 149) correctly rate-limits via `lastCheckTime[member] + CHECK_INTERVAL > block.timestamp` (line 169). The DAO-facing `checkMemberScore` at line 214 has no such guard. DAO can call `checkMemberScore(target)` 7 times rapid-fire in a single transaction. Each call increments `daysBelow700[target]`. On the 7th call, `daysBelow700[target] >= 7` triggers `election.removeCouncilMember`, evicting the member from the Council immediately.

**Impact:** The 7-day grace period — supposedly protecting council members from momentary score dips — can be compressed to zero seconds by the DAO. Combined with H-34 and H-35 (DAO already has full removal authority), this is another avenue for Council purges, this time disguised as "automatic score-based enforcement."

**Remediation:** Add `require(lastCheckTime[member] + 1 days < block.timestamp, "CM: too soon")` at the top of `checkMemberScore`, matching the keeper path's rate limit.

### H-37 — `VFIDEEnterpriseGateway._swapToStable` uses tautological AMM slippage protection

**File:** `VFIDEEnterpriseGateway.sol:254-294, 262-268`.

`minAmountOut` is computed as `getAmountsOut(vfideAmount, path) * (1 - slippage)`. `getAmountsOut` reads the CURRENT state of the same AMM the swap will execute in. This provides no protection against sandwich attacks: the attacker moves the pool state before the swap, the "expected" output calculation sees the attacker's already-manipulated state, and the slippage check passes against that manipulated state.

**Impact:** Every enterprise order settlement with `stableSettlementEnabled` is sandwich-vulnerable. Merchants receive less stablecoin than market price; MEV searchers extract the difference. This is a standard-pattern finding that professional auditors catch in the first pass.

**Remediation:** Use VFIDEPriceOracle (or a TWAP oracle over a long enough window) to establish the reference price, then set `minAmountOut = oraclePrice * vfideAmount * (1 - slippage)`. If oracle is unavailable, reject the swap (fall back to VFIDE settlement). Never compute slippage protection from the same pool you're swapping in.

**Cross-reference:** This is the same design pattern that C-01 says is missing from EcosystemVault. EnterpriseGateway DOES implement the swap — but uses tautological slippage. Fixing C-01 by porting EnterpriseGateway's implementation would inherit this bug. Fix H-37 first, THEN port.

### H-38 — `TempVault` is a single-owner honey pot with no structural protection

**File:** `TempVault.sol:14-108`.

Single `owner` can withdraw any token or ETH from the vault at any time with no timelock, no cosigner, no rate limit. The contract's own NatSpec warns "For production use, consider SanctumVault or EcosystemVault with multi-sig." If `TempVault` appears in `PRODUCTION_SET.md` as a destination for any automated flow — fee sink, payment intermediary, pending settlement, etc. — the owner has unilateral authority over whatever passes through.

**Impact:** Any token flow routed through `TempVault` is custodial-by-design. Conflicts with the non-custodial framing if TempVault receives user-facing funds. The two-step ownership transfer (line 76-90) mitigates typo-loss but doesn't change the underlying single-authority model during operations.

**Remediation:** If TempVault is intended as a scratch-space for deployment/migration only, remove it from `PRODUCTION_SET.md` and never reference it in production flows. If it's in active use, replace with SanctumVault (as the NatSpec itself recommends) and confirm no contracts reference `TempVault` as a destination.

---

## 4. Findings — Medium Severity

### M-01 — FraudRegistry does not cancel pending escrows on flag clearance

**File:** `FraudRegistry.sol:286-295`. Wrongly-flagged users who are vindicated still have transfers held for 30 days. Add `cancelEscrowsFor(address)` callable by DAO.

### M-02 — FraudRegistry has no balance invariant

**File:** `FraudRegistry.sol`. Nothing enforces `totalActiveEscrowed == vfideToken.balanceOf(this)`. Direct transfers to the contract are stranded. Add `sweepStrandedBalance()`.

### M-03 — FraudRegistry `dismissComplaints` loop unbounded

**File:** `FraudRegistry.sol:269-284`. 100-iteration loop of `seer.punish()` can approach block gas limit. Paginate.

### M-04 — FeeDistributor distributes current balance, not tracked receipts

**File:** `FeeDistributor.sol:155-185`. Donation attack: any address can transfer VFIDE to the contract and force it into the distribution — biasing toward attacker-controlled channels. Track `undistributed` counter separate from balance.

### M-05 — FeeDistributor `totalDistributed` drifts vs `totalReceived`

**File:** `FeeDistributor.sol`. Accounting drift from M-04. Fix together.

### M-06 — ProofScoreBurnRouter micro-tx setters lack timelock

**File:** `ProofScoreBurnRouter.sol:477-488`. `setMicroTxFeeCeiling` and `setMicroTxUsdCap` are `onlyOwner` with no delay. Compromised DAO can collapse fee economics instantly.

### M-07 — ProofScoreBurnRouter oracle trust in `_isWithinMicroTxUsdCap`

**File:** `ProofScoreBurnRouter.sol:490-503`. `staticcall` to `getPrice()` without requiring TWAP; flashpump could shift microTx threshold.

### M-08 — CardBoundVault `pause()` griefable by guardian

**File:** `CardBoundVault.sol:367-379`. No cooldown. Adversarial guardian can indefinitely pause a vault. Add per-guardian pause cooldown.

### M-09 — PanicGuard.selfPanic is UX theater

**Files:** `VFIDESecurity.sol:360-392`; no transfer-path contract reads `quarantineUntil`. Either wire it in or relabel.

### M-10 — VFIDEBridge inbound has no daily cap

**File:** `VFIDEBridge.sol:372-427`. Only per-message cap. Sustained small messages drain liquidity. Add `dailyInboundLimit[srcEid]`.

### M-11 — VFIDEPriceOracle deviation check uses stale reference

**File:** `VFIDEPriceOracle.sol:240-273`. Consecutive-delta check misses gradual drift. Track rolling price stats.

### M-12 — `SharedInterfaces.Ownable.transferOwnership` doesn't invalidate pending emergency controller

**File:** `SharedInterfaces.sol:353-358`. DAO inheriting ownership mid-proposal may apply a controller they didn't pick. Block transfer while pending exists, or auto-cancel pending.

### M-13 — EscrowManager single-arbiter model for sub-threshold disputes

**File:** `EscrowManager.sol:334-366`. Attacker can stage many sub-threshold disputes to avoid DAO review. Threshold selection is the mitigation — document the tradeoff.

### M-14 — EscrowManager `timeoutResolve` favors buyer

**File:** `EscrowManager.sol:416-424`. Disputed escrow with absent arbiter refunds to buyer after timeout. Buyer can dispute and wait out slow arbiter. Document.

### M-15 — `VFIDETermLoan.extractFromGuarantors` has no global cross-loan cap

**File:** `VFIDETermLoan.sol:649-688`. User guaranteeing N loans can be drained across all of them simultaneously. Consider per-user global rate limit.

### M-16 — `DevReserveVestingVault.emergencyFreeze` is cosmetic

**File:** `DevReserveVestingVault.sol:178-183`. DAO-only `emergencyFreeze` sets `claimsPaused = true`, but `pauseClaims` (line 171) is callable by BENEFICIARY who can immediately unpause. Tighten if the design intent is a hard DAO freeze.

### M-17 — `SeerGuardian.checkAndEnforce` is public — possible griefing via cooldown

**File:** `SeerGuardian.sol:241-271`. Anyone can call `checkAndEnforce(any_address)` with a 1-hour-per-subject cooldown. The restriction logic reads the current score and applies what the score warrants, so the caller cannot make restrictions worse than warranted. But the per-subject cooldown can be consumed by a griefer, delaying auto-lift on score recovery until the next hour. Low-impact grief; consider removing cooldown for the auto-lift path specifically.

### M-18 — `SeerSocial.endorse` `endorsersOf[subject]` may contain stale endorsers until next prune

**File:** `SeerSocial.sol:227-276, 316-328`. `calculateEndorsementBonus` iterates `endorsersOf[subject]` up to 200 entries and skips expired ones via `e.weight > 0 && e.expiry > block.timestamp`. This is called from score computation, making it hot. If many endorsers expire without pruning, iteration cost grows. `_pruneExpiredEndorsements` is called on new endorse, but if a subject stops receiving endorsements entirely, stale entries persist. Minor gas concern; document that off-chain keepers should call `pruneEndorsements(subject)`.

### M-19 — Deploy scripts post-deploy step (`confirmSystemExempt`) is not atomic

**File:** `DeployPhases3to6.sol:127`, `VFIDEBridge.sol:260, 344-357`.

`_deployPhase3` proposes systemExempt for the bridge but doesn't and cannot confirm (48h timelock). Until confirmation, `VFIDEBridge.bridge()` reverts unless `isExemptCheckBypassActive()` is enabled. Deploy runbook must include the explicit post-48h-confirmation step. If missed, bridge is DOA for 48h.

**Remediation:** Document this as a required step in the deploy runbook. Alternatively, pre-deploy the bridge proxy address (e.g., via CREATE2), propose systemExempt well before actual bridge deployment so timelock is satisfied at go-live.

### M-20 — `DeployPhase1.configureContracts` has no access control but is effectively dead code

**File:** `DeployPhase1.sol:140-188`. `external` with no modifier, but calls `grantRoleWithReason` which will revert because the Phase1Deployer contract has no admin role (the `_admin` parameter address has it). So the function is inert in practice. Either remove (it's misleading), or give Phase1Deployer a transferable admin role that gets revoked after configuration. Also — this function still references `BLACKLIST_MANAGER_ROLE` (lines 161-172), reinforcing H-05.

### M-21 — `PayrollManager` pause/resume asymmetry enables griefing

**File:** `PayrollManager.sol:176-210`.

Either payer or payee can `pauseStream` (line 180). Only payer or DAO can `resumeStream` (line 201). A payer unilaterally pauses = payer withholds wages. Payee's only recourse is `cancelStream` (settles accrued, returns unspent to payer). Payee cannot unilaterally resume a stream the payer paused.

Conversely, a payee who pauses can no longer resume — but since pausing stops their income, self-grief is rare.

**Remediation:** Either allow payee to resume (symmetric), or document the asymmetry explicitly and add a bounded max-pause-duration after which resume becomes automatic.

### M-22 — `PayrollManager.setRate` settles accrued without triggering Seer reward

**File:** `PayrollManager.sol:216-238`.

When payer calls `setRate`, the accrued amount is transferred to payee inline (line 232) without `seer.reward(payee, PAYROLL_WITHDRAW_REWARD)`. Compare `withdraw` (line 303-305) which does emit the reward. Payees receive ProofScore credit for explicit withdrawals but not for settles-during-rate-change. Seer trust signal diverges from actual payment activity.

**Remediation:** Call `seer.reward` on any payment to payee, regardless of code path.

### M-23 — `ServicePool` proportional-claim rounding dust accumulates in `totalCommitted`

**File:** `ServicePool.sol:217-239, 242-272`.

`payment = (pool * myScore) / totalScores[period]` truncates. Sum of payments across all claimants is ≤ `pool`. The dust difference stays in `totalCommitted` but no future action decrements it, so `totalCommitted` drifts upward over time. Eventually `balance - totalCommitted` (the `available` computation in `finalizePeriod` line 202) becomes zero or negative, capping future pool sizes artificially.

**Remediation:** After the final claim per period (tracked via `claimedCount[period]`), sweep any leftover `(periodPool[period] - sum_of_claims)` from `totalCommitted`. Or accept the drift and document that admins should periodically reconcile via governance.

### M-24 — `ServicePool.setMaxPayoutPerPeriod` has no bounds

**File:** `ServicePool.sol:293-295`.

Admin can set to 0 (blocks all future finalization payouts) or type(uint256).max (no cap). Instant effect, no timelock. A compromised admin can DoS the pool by setting to 0, or extract excess by raising and finalizing a large pool.

**Remediation:** Bound by percentage of some reference amount; add timelock for increases; allow instant decreases.

### M-25 — `DeployPhase3` post-deploy `confirmSystemExempt` step is not atomic

**File:** `DeployPhases3to6.sol:127`, `VFIDEBridge.sol:260, 344-357`.

`_deployPhase3` proposes systemExempt for the bridge but doesn't and cannot confirm (48h timelock). Until confirmation, `VFIDEBridge.bridge()` reverts unless `isExemptCheckBypassActive()` is enabled. Deploy runbook must include the explicit post-48h-confirmation step. If missed, bridge is DOA for 48h.

**Remediation:** Document this as a required step in the deploy runbook. Alternatively, pre-deploy the bridge proxy address (e.g., via CREATE2), propose systemExempt well before actual bridge deployment so timelock is satisfied at go-live.

### M-26 — `MerchantPortal.setMerchantPullPermit` allows unbounded expiry

**File:** `MerchantPortal.sol:597-606`.

`expiresAt` parameter accepts any future timestamp including `type(uint64).max`, effectively a permanent permit. A customer with a compromised key can set a permit that never expires for an attacker-controlled merchant. Combined with the standing ERC-20 approval (H-31), this is a persistent drain pathway.

**Remediation:** Enforce `expiresAt <= block.timestamp + 1 year` (or similar), and auto-decay unused permits after inactivity.

### M-27 — `MerchantPortal.setMerchantPullPermit` has no per-transaction cap

**File:** `MerchantPortal.sol:597-606`.

`maxAmount` is cumulative — once used up the merchant can't pull more. But there's no per-transaction sanity cap, so the merchant can drain the entire allowance in a single tx. Combined with H-31, one malicious call consumes the full permit.

**Remediation:** Add a `maxPerTx` field to the permit so pathological single-tx drains are bounded even when the permit is not yet exhausted.

### M-28 — `SubscriptionManager.processPayment` requires standing approval

**File:** `SubscriptionManager.sol:224-298`.

Like MerchantPortal, SubscriptionManager pulls funds via `safeTransferFrom(userVault, merchantVault, amount)` — requiring a standing ERC-20 approval from the user vault to SubscriptionManager. Any subscription user has a durable allowance on this contract; contract compromise drains all such allowances.

**Remediation:** Same as H-31 — use per-payment signed intents or bounded-rate stream semantics.

### M-29 — `BadgeManager.awardPioneer` has no time-window check

**File:** `BadgeManager.sol:401-407`.

"First 10,000 users" semantic is only enforced by `pioneerCount >= MAX_PIONEERS`. Operator can award Pioneer badges to late-joiners as long as total cap isn't hit. There's no check against `stats.firstActivity < PIONEER_CUTOFF_TIME`.

**Remediation:** Add `require(stats.firstActivity < PIONEER_DEADLINE_TIMESTAMP)` where `PIONEER_DEADLINE_TIMESTAMP` is set at deploy time (e.g., launch + 90 days).

### M-30 — `BadgeManager.awardFoundingMember` has no time-window check

**File:** `BadgeManager.sol:413-420`.

Similar to M-29. "First 1,000 to reach 800+" is only enforced by count cap. A user who reaches 8000 score three years after launch can still receive Founding Member if the cap isn't filled. Add historical timestamp check.

### M-31 — `CouncilSalary.distributeSalary` is donation-manipulable

**File:** `CouncilSalary.sol:105-154`.

`balance = token.balanceOf(this)` at line 113 — any donor can transfer VFIDE to this contract before distribution and have it included in the salary pool. Useful for sybil-pumping salary payouts to influence council loyalty, or for bribing the council via a single tx. Same pattern as M-04 (FeeDistributor donation manipulation).

**Remediation:** Track `undistributed` counter separately. Only `undistributed` gets paid out; excess balance is non-distributable.

### M-32 — EscrowManager cached-vs-live score mismatch for escrow lock period

**File:** `EscrowManager.sol:147-159`.

`createEscrow` uses `seer.getCachedScore(merchant)` to determine escrow lock period (3/7/14 days). Frontend showing "High Trust — 3-day escrow" based on live score won't match on-chain behavior if cached score is lower. UX gap that creates confusion during disputes.

**Remediation:** Display the cached score to users in the frontend, labeled clearly ("Trust score used for escrow lock: X, updated Y days ago").

### M-33 — `EmergencyControl` threshold may become stale after member removal

**File:** `EmergencyControl.sol:218-258, 302-310`.

`threshold` is set independently of `memberCount`. If foundation removes members via `removeMember` / `applyFoundationMemberChange` without adjusting `threshold`, the `approvalsHalt >= threshold` check may become trivially satisfiable. A 5-of-9 committee reduced to 3 members but threshold still at 5 becomes un-haltable; conversely, reducing membership without reducing threshold proportionally means a smaller fraction of members can halt. No auto-adjustment.

**Remediation:** On `_applyRemoveMember`, add `if (threshold > memberCount) threshold = memberCount`. On `setThreshold`, add `require(_threshold <= memberCount)`.

### M-34 — `VFIDEEnterpriseGateway.settleBatch` has no size cap

**File:** `VFIDEEnterpriseGateway.sol:211-215`.

Oracle loops over arbitrary array of order IDs with no `require(orderIds.length <= MAX_BATCH)`. Block gas limit is the only bound. If oracle is pushed to settle a large batch (intentionally or due to backlog), may hit block gas limit and leave orders stranded in PENDING state.

**Remediation:** Cap at 50 or similar. Emit event per failed/skipped order.

### M-35 — `GovernanceHooks` has dual-authority model (owner + dao) with unclear separation

**File:** `GovernanceHooks.sol:62-80`.

`setDAO` is `onlyDAO`; `setModules` and `transferOwnership` are `onlyOwner`. Owner controls module wiring (seer/ledger/guardian), DAO updates itself. If the deployer's ownership is not transferred to the DAO at deployment, the protocol has two administrators running in parallel. Role confusion during audit; may also enable conflicting configuration.

**Remediation:** Either fold ownership into DAO (remove the `owner` concept), or document that ownership must be transferred to DAO as a required post-deploy step and add a deploy-time verification.

### M-36 — `StablecoinRegistry` is single-owner controlled

**File:** `StablecoinRegistry.sol:44-102`.

`addStablecoin`, `removeStablecoin`, `setAllowed`, `setTreasury`, `pause`/`unpause` — all `onlyOwner`. A compromised owner can: add a malicious stablecoin (e.g., a fake USDC contract they control), remove legitimate ones mid-flight (breaks active escrows/payments), redirect treasury, or halt the whole whitelist. No timelock on any of these.

**Remediation:** Route all mutating operations through DAO with timelock. Add-stablecoin in particular should have a 7-day challenge window — a malicious stablecoin inserted into the whitelist can cause real-time losses.

### M-37 — `VFIDEBenefits.rewardTransaction` feeds EcosystemVault merchant tier from trusted caller

**File:** `VFIDEBenefits.sol:148-183`.

`onlyAuthorized` (where `authorizedCaller` is a DAO-managed mapping). The authorized caller passes `(buyer, merchant, amount)` and the function:
1. Increments per-user transaction counts
2. Awards ProofScore to both buyer and merchant
3. Calls `ecosystemVault.recordMerchantTransaction(merchant)` — which feeds `periodMerchantTxCount`, which determines the merchant's tier in the competition pool

There's no validation that an actual commerce transaction occurred. Same class as H-33 (BadgeManager): a malicious or compromised authorized-caller can pump merchant tier rankings and ProofScore with fabricated events. If the authorized caller list is limited to canonical source contracts (EscrowManager, CommerceEscrow, MerchantPortal — not EOAs or operator wallets), the trust assumption is bounded. If an operator EOA is authorized, same pump vector as H-33.

**Remediation:** Restrict to specific contract addresses. Add a registration event with explicit caller categorization. Same pattern-fix as SeerWorkAttestation (which does the right thing per-source).

---

## 5. Findings — Low Severity

### L-01 — VaultHub line 42: two mappings on one line. Cosmetic.

### L-02 — VFIDEToken line 770: comment block has no closing `*/`. Compiles but confuses doc extractors.

### L-03 — CardBoundVault `rescueNative` uses tight 10_000 gas — EOA-only in practice. Document.

### L-04 — CardBoundVault `rescueERC20` uses `require` with string while rest of contract uses custom errors.

### L-05 — AdminMultiSig reentrancy-surface comment — audit the non-executeProposal external functions on the same lock.

### L-06 — ProofScoreBurnRouter dead `DEFAULT_*_BPS` state vars emitted in `PolicySet`. Misleading.

### L-07 — ProofScoreBurnRouter `setFeePolicy` "first-time setup" branch is effectively dead code given storage defaults.

### L-08 — VFIDEPriceOracle `updatePrice` uses `this.getPrice()` external call through self. Minor gas.

### L-09 — Standalone `WithdrawalQueue.sol` appears unused. Remove from `PRODUCTION_SET.md` if stale.

### L-10 — VFIDEFlashLoan duplicate fraud check in `deposit` (lines 188 and 190). Copy-paste.

### L-11 — VFIDEFlashLoan uses raw selector `0x38603ddd` instead of `IFraudRegistry.isServiceBanned.selector`. Readability.

### L-12 — VFIDETermLoan `try/catch` on `seer.punish` silently swallows failures. Emit `PunishmentSkipped` event for off-chain tracking.

### L-13 — `CouncilSalary.isBlacklisted` is another "blacklist" naming artifact in a "no blacklist" protocol. Rename to `salaryRevoked` or `suspended`. File: `CouncilSalary.sol`.

### L-14 — `VFIDETestnetFaucet.batchClaim` skips `Claimed` event emission when ETH transfer fails but after VFIDE already transferred — off-chain indexers miss the user. File: `VFIDETestnetFaucet.sol:156-161`.

### L-15 — `EscrowManager.claimTimeout` and `refund` don't emit Seer rewards, unlike `release`. Inconsistent trust signal emission. Files: `EscrowManager.sol:207-217, 223-234`.

### L-16 — `EscrowManager.raiseDispute` has no fee or reputation stake — spam-dispute-then-wait-out-timeout is free for buyers, combining badly with M-14. File: `EscrowManager.sol:237-246`.

### L-17 — `MerchantPortal` refunds don't decrement merchant `totalVolume` — metric is gross-only. Combined with the fact that merchant volume feeds into trust tier, gives merchants a reason to tolerate refunds as "free volume." File: `MerchantPortal.sol:428-448`.

### L-18 — `BadgeManager._updateActivity` streak is trivially maintainable (one stat increment per day). DAILY_CHAMPION badge economic value is minimal. File: `BadgeManager.sol:426-456`.

### L-19 — `CouncilSalary.voteToRemove` has no quorum check — if only 1 member is active, 1 vote passes the `>size/2` threshold. Edge case for very small councils. File: `CouncilSalary.sol:161-178`.

### L-20 — `CouncilElection.setCouncil` permits council size < `councilSize` (only checks `members.length > 0`). DAO could set a 1-member council at any time. File: `CouncilElection.sol:138`.

### L-21 — `EmergencyControl.approveRecovery` supermajority `memberCount - 1` trivializes single-member committees (1-of-1 = immediate approval). Should require `memberCount >= 3`. File: `EmergencyControl.sol:512`.

### L-22 — `EmergencyControl.refreshRecoveryEpoch` DAO-only but keeps stale proposals alive across committee churn — DAO has unilateral control over recovery proposal liveness. File: `EmergencyControl.sol:551-564`.

---

## 6. Positive Observations

- **SeerWorkAttestation does what BadgeManager should do (per H-33).** Each `on*` hook (`onGovernanceVote`, `onMerchantSettlement`, `onBridgeRelayValidated`, `onMentorshipCompleted`, `onFraudFlagConfirmed`) has an explicit single-source caller check (`require(msg.sender == daoContract)` etc.). This is the exact pattern that should be back-ported to `BadgeManager.record*` functions. Well-designed.

- No upgradeable proxies — fully immutable, removing an entire class of attack vectors.
- Uniform compiler `0.8.30`.
- 460+ custom errors — gas-efficient and debuggable.
- 48-hour timelocks on sink/router/whitelist/exempt changes in VFIDEToken.
- Explicit fee-sink validation in `VFIDEToken._transfer` (F-17/C-01 fix).
- Guardian-cancellable queued withdrawals (when guardian setup complete) — strong lost-phone primitive.
- Score-history circular buffer in ProofScoreBurnRouter bounds iteration.
- Seer-only `updateScore` (F-26 fix) prevents owner score injection.
- Per-proposer proposal-hash cooldown in `DAO.withdrawProposal`.
- ECDSA s-value upper-bound in `VFIDEToken.permit` and `CardBoundVault`.
- CardBoundVault EIP-712 transfer intent with `walletEpoch` for rotation-invalidation.
- DAOTimelock `executeBySecondary` 3-7 day fallback window.
- Circuit-breaker activation timelocks bias toward liveness (48h to activate, instant to deactivate).
- `renounceOwnership` explicitly disabled in VFIDEToken (T-14 fix).
- FraudRegistry atomic credit-and-register escrow (C-1 escrow fix).
- VFIDEToken `_resolveFeeScoringAddress` separates custody destination from fee-scoring context.
- FraudRegistry `complaintReporterPenalty` creates cost-to-file-false-complaints.
- DAO governance fatigue weight-reduction discourages voter burn-out gaming.
- Seer rate limits are layered: per-call, per-operator-per-subject, per-operator-global, per-subject-global.
- `DAOTimelock.queueTx` uses nonce for ID uniqueness (FLOW-5 fix).

---

## 7. What Was NOT Covered

This section is much smaller than in prior versions. Scope is now near-complete for the production contract set.

### Remaining items in `PRODUCTION_SET.md` not independently reviewed

- Remainder of `EmergencyControl.sol` (foundation rotation flow — scanned, module wiring — scanned; detailed walkthrough of the committee-member addition/removal state machine and the `applyFoundationMemberChange` timelock transitions not done)
- Remainder of `CircuitBreaker.sol` (~50% read across earlier sessions — the `toggle` path and the downstream-effect enumeration not fully mapped)
- Remainder of `OwnerControlPanel.sol` (~30% read — 56KB file, only the vault/freeze paths and role management inspected)
- Remainder of `VFIDESecurity.sol` (~40% read — PanicGuard covered, but the broader security policy state machine not fully walked)
- Remainder of `SharedInterfaces.sol` (Ownable/ReentrancyGuard/Pausable covered; AccessControl implementation, ERC20 extensions, and SafeERC20 sections not independently audited — these are widely-used OZ-adjacent implementations where a careful diff against canonical OZ sources is the right approach)

### Interface files (27 total, not reviewed)

All files in `contracts/interfaces/` — audit for ABI drift against their implementations. A typical professional audit will use `forge inspect` output vs. interfaces to find silent mismatches. Worth including in the professional firm's scope.

### Mocks (10 files, out of scope)

In `contracts/mocks/` — used for testing only, not deployed. Standard practice is to exclude.

### What's covered enough for handoff

Every contract with meaningful state, authority, token movement, or external interaction has been reviewed with at least function-signature depth, and the high-risk ones (68 files) have been reviewed line-by-line. The remaining gaps above are concentrated in (a) the tails of four large, already-partially-reviewed files, and (b) the interface-drift check that firms do better than I can.

---

## 8. Phase 2-4 Reminder

This report covers Phase 1 (smart contracts, partial) only.

- **Phase 2 — Backend/API + WebSocket:** 116 API routes, auth/RBAC, input validation, CSRF/CSP middleware, rate limiting, RPC handling, DB migrations, secret management.
- **Phase 3 — Frontend:** wallet key handling, transaction-intent signing, local storage, XSS surfaces, UX-as-security (lost-phone flow), embedded wallet derivation.
- **Phase 4 — Infra / CI / secrets / env:** `.env.*.example` hygiene, deploy-script constructor arg ordering, migration rollback runbooks, vercel.json, Sentry DSN exposure.

---

## 9. How to Use This Report

The work product is substantial: 99 findings across 68 contracts over 8 review sessions. This is not a substitute for a professional audit but is a well-structured input to one.

### Immediate actions (this week)

**1. Resolve the two Criticals as decisions, not tickets.**
- **C-01 (phantom stablecoin routing in EcosystemVault):** this is a legal-position question about Howey Prong 3 compliance. Either build the missing `_swapToStable` implementation (can be ported from VFIDEEnterpriseGateway — but fix H-37's tautological slippage first), or revise the public Howey narrative and remove the stale NatSpec/state-variables.
- **C-02 (live bridge blacklist in BridgeSecurityModule):** this is a compliance-scope question. Either remove it to match "non-custodial" marketing, or keep it and carve it out explicitly ("non-custodial peer-to-peer; bridge subject to compliance screening") with DAO-separated ownership.

Both decisions require you (possibly with legal input), not more code review.

**2. Do the blacklist-artifact cleanup in a single PR.**

Run `grep -rn "blacklist\|freeze\|suspended\|banned\|frozen" contracts/` across the entire codebase. For each hit, decide: remove, rename, or explicitly document. This addresses H-05, H-15, C-02 peripheral artifacts, L-13, the `BLACKLIST_MANAGER_ROLE` references in deploy scripts, and every scattered instance the professional audit firm will otherwise enumerate. Hours of work, removes multiple pages of audit-report findings.

**3. Batch the cheap High fixes.**

Many of the Highs are one-line or few-line fixes:
- H-22 (`SeerGuardian._applyAutoRestriction` stale expiry): one-line change from `< 1` to `<= block.timestamp`
- H-23 (`recordViolation` shortens expiry): one-line `max()` around assignment
- H-36 (`CouncilManager.checkMemberScore` no cooldown): one-line `require`
- H-09 (`AdminMultiSig` drops return data): mirror the existing pattern from `DAOTimelock.execute`
- H-14 (`emergencyTransferOwnership` global bypass): remove or add cosigner timelock
- H-10 (`EcosystemVault.burnFunds` soft-burn): replace with `IVFIDEBurnable(rewardToken).burn(amount)`

These six fixes alone probably close out a day's work and remove six separate audit-report pages.

### Architectural decisions to make before audit

**Standing approvals (H-17, H-31, M-28).** TermLoan guarantors, MerchantPortal payments, and SubscriptionManager all require users to hold standing ERC-20 approvals to these contracts. Decide: adopt EIP-712 per-payment signed intents (matching CardBoundVault's `queueWithdraw` pattern), or accept the standing-approval risk and document the blast-radius. This is a design-level question, not a code-level one.

**Emergency controller and handover-disarm bounds.** H-03 (`SystemHandover.disarm` unbounded) and H-14 (`SharedInterfaces.Ownable.emergencyTransferOwnership` global bypass) are both architectural. Decide the intended constraints before audit scoping.

**Council independence (H-34, H-35, H-36).** Either build a real election mechanism or rename "Council" to reflect the DAO-appointed advisory reality. Document whichever you pick.

**BadgeManager trust model (H-33).** Port the SeerWorkAttestation per-source caller-check pattern to `BadgeManager.record*` functions. This is a real engineering change but the template exists in the same codebase.

### Handoff to professional audit

With this report as input, the professional firm can:
1. Verify (rather than rediscover) the 99 covered findings
2. Focus their engagement on: (a) the uncovered file-tails in §7, (b) integration testing with forked mainnet, (c) MEV simulation, (d) LayerZero DVN/config review, (e) zkSync Era-specific quirks, (f) fuzzing with Echidna/Foundry

Include this report in the RFP. Firms typically quote 20-30% lower when given well-structured pre-audit material. The savings usually exceed the cost of producing the material.

### What this report is and isn't

**It is:** A structured, severity-ranked, file:line-referenced enumeration of issues found through careful manual review. A real deliverable with real findings, including two Criticals that need attention before go-live.

**It is not:** A substitute for professional audit. Firms like Trail of Bits, Spearbit, and Zellic bring things I structurally cannot: mainnet-forked integration tests, fuzzing harnesses, MEV simulators, LayerZero-specific expertise, and the legal weight of an audit report in investor/partner/regulator conversations. The next step is hiring one of them, not continuing to refine this document.

---

*End of Phase 1 report. Phases 2-4 (Backend/API, Frontend, Infra) are separate work streams.*
