# VFIDE Architecture Decisions

**Phase.** Phase 0 — Architectural Reconciliation
**Date.** 2026-05-15
**Status.** RATIFIED 2026-05-15

This document captures architectural decisions discovered during the contract-to-frontend audit. Each decision has:
- The ambiguity observed
- My best-practice analysis
- My recommendation
- Vanta's sign-off status

**Once signed off, subsequent wiring work proceeds based on these decisions.**

---

## Source of truth: PRODUCTION_SET.md

The first useful finding: `contracts/PRODUCTION_SET.md` is the canonical source of truth for what deploys to mainnet. It explicitly lists each contract's deployment status and flags ambiguities. Decisions below cite it where applicable.

---

## Decision 1: Merchant identity — MerchantRegistry vs MerchantPortal

### Observation

Two contracts both manage merchant state:

- **MerchantRegistry** (in `contracts/VFIDECommerce.sol`, 9 fns)
  - Pure identity registry: tracks `Status` enum (NONE/ACTIVE/SUSPENDED/DELISTED), refund/dispute counters with 90-day decay, off-chain metadata hash
  - 9 functions: `addMerchant`, `setMetaHash`, `delistMerchant`, `unsuspendMerchant`, `info`, `setAuthorizedEscrow`, `clearAuthorizedEscrow`, plus internal strike helpers

- **MerchantPortal** (in `contracts/MerchantPortal.sol`, 43 fns)
  - Full payment processing: `pay`, `payInPerson`, `payInvoice`, `payOnline`, `paySubscription`, `payWithIntent`, `processPayment`, refund flows
  - Also has its own `registerMerchant`/`deregisterMerchant`/`suspendMerchant` with separate `MerchantInfo` struct and `merchants` mapping

### Analysis against best-practice criteria

| Criterion | MerchantRegistry | MerchantPortal |
|---|---|---|
| Audit-fix comments | 13 | 15 |
| References from other contracts | 1 (its own interface only) | 8 (CardBoundVault, EscrowManager, StablecoinRegistry, MerchantCompetitionPool, etc.) |
| Test coverage | 4 test files | 5 test files |
| Production status | Deployed at Layer 11 (per PRODUCTION_SET.md) | Deployed (per PRODUCTION_SET.md) |
| Frontend usage | 0 functions wired | 7 functions wired (existing) |

**The two contracts are NOT duplicates and they do NOT coordinate.** MerchantPortal does not call MerchantRegistry. They track merchants independently with no synchronization. This is the architectural drift.

### Interpretation

The most likely history: MerchantRegistry was the original identity registry — built early, focused, minimal. MerchantPortal was added later for full payment processing and accidentally grew its own merchant-tracking layer instead of routing through MerchantRegistry. The result is two parallel systems that should be one.

**The two contracts have different jobs that should not be combined:** identity is one concern, payment is another. But the duplicate merchant state IS a problem.

### Recommendation

**Keep both contracts. Refactor MerchantPortal to call MerchantRegistry for identity state instead of maintaining its own.**

Specifically:
- MerchantRegistry remains the canonical identity source. It owns `Status`, `metaHash`, refund/dispute counters.
- MerchantPortal's `MerchantInfo` struct gets reduced to payment-specific fields only (payout address, accepted tokens, fee config). Identity-related fields are removed.
- `registerMerchant` in MerchantPortal becomes a thin wrapper that calls MerchantRegistry's `addMerchant`.
- Status checks in payment paths route through MerchantRegistry.
- Strike counting (`_noteRefund`, `_noteDispute`) moves to be called by MerchantPortal during refund/dispute events.

**Sign-off needed:** This is a non-trivial refactor. The lower-cost alternative is "leave both as-is, document that they're parallel, wire the frontend separately to both." That accepts the drift but doesn't require contract changes.

**My honest recommendation:** Document the drift in the backlog, wire the frontend to both as parallel surfaces for now (so the frontend works against the deployed contracts), and refactor the contracts in a Tier 2 cleanup pass. The frontend work is bounded; the contract refactor is risk. Better to ship working wiring now and fix the contract-level drift after Tier 1 stabilizes.

### Status

[ ] Vanta: refactor MerchantPortal to call MerchantRegistry (slower, cleaner)
[ ] Vanta: wire frontend to both as parallel surfaces, defer refactor (faster, accepts drift)
[ ] Vanta: other approach (please describe)

---

## Decision 2: Payment escrow — CommerceEscrow vs EscrowManager

### Observation

Two contracts handle payment escrow:

- **CommerceEscrow** (in `contracts/VFIDECommerce.sol`, 10 fns)
- **EscrowManager** (in `contracts/EscrowManager.sol`, 23 fns)

### ⚠️ CORRECTED 2026-05-15 — Original recommendation was wrong.

**The original Phase 0 analysis recommended deletion of EscrowManager based on a tentative comment in PRODUCTION_SET.md and a high-level read. Vanta signed off on that recommendation. Before executing the deletion, the verification step (mandatory per the plan) caught the error.**

### What the verification revealed

Function-body comparison between EscrowManager and CommerceEscrow shows they are NOT the same contract. They share only 3 functions (`refund`, `release`, `settleByInheritance`) and provide meaningfully different escrow products:

**CommerceEscrow** — Simple e-commerce escrow for everyday merchant payments:
- Lifecycle: `open` → `markFunded` → `release` / `refund` / `dispute` → `resolve`
- 10 functions total
- Per the comment in VFIDECommerce.sol: "Standard e-commerce escrow for MerchantPortal payments. Simpler state-machine (OPEN→FUNDED→RELEASED)."

**EscrowManager** — Complex escrow with arbiter system for high-value/custom trades:
- 20 functions that have no equivalent in CommerceEscrow:
  - Timeout machinery: `buyerClaimTimeout`, `checkTimeout`, `claimTimeout`, `notifyTimeout`, `timeoutResolve`
  - Arbiter system: `proposeArbiterChange`, `executeArbiterChange`, `cancelArbiterChange`
  - Token whitelist governance: `setTokenWhitelist`, `applyTokenWhitelist`, `cancelTokenWhitelist`
  - DAO governance hooks: `setDAO`, `applyDAO`, `cancelDAO`
  - Vault hub + Seer integration: `setVaultHub`, `setSeerAutonomous`
  - Dispute resolution: `raiseDispute`, `resolveDispute`, `resolveDisputePartial`
  - Creation: `createEscrow`

The PRODUCTION_SET.md language "possibly superseded by `CommerceEscrow`" was tentative for a reason. The supersession is not real.

### Corrected recommendation

**Do not delete EscrowManager. It provides functionality that CommerceEscrow does not.**

Update PRODUCTION_SET.md to remove the "possibly superseded" language and document the actual distinction: CommerceEscrow is the simple-flow escrow for merchant payments; EscrowManager is the timeout/arbiter-based escrow for high-value/custom trades. Both should remain in source.

The remaining question — whether EscrowManager deploys at v1 or v1.1 — is a strategic question (do v1 users need arbiter-based escrow?), not a duplicate-deletion question.

### Status

[X] Original Decision 2 sign-off (delete EscrowManager) — VOIDED 2026-05-15
[X] Corrected Decision 2: Do not delete. Document the distinction. Strategic deployment timing deferred to Decision 6.

### Process lesson

The original analysis used function name overlap as a proxy for functional equivalence. That was insufficient. **Before recommending any contract deletion, the methodology now requires diffing function bodies and parameter signatures, not just function names.** This rule is being added to VFIDE_TIER1_PLAN.md.

---

## Decision 6: EscrowManager deployment timing (NEW)

### Question

EscrowManager is a real contract with real functionality, distinct from CommerceEscrow. Per PRODUCTION_SET.md, EscrowManager is currently NOT in the v1 deploy set. CommerceEscrow IS deployed at Layer 11.

Should EscrowManager deploy at v1, defer to v1.1, or be removed from the strategic roadmap?

### Analysis

- v1 use case for EscrowManager: high-value or custom trades that need timeout-based dispute resolution, arbiters, or token whitelist governance.
- v1 reality: testnet reveal targets small merchant payments (hair salons, market sellers, etc.) — these are the CommerceEscrow use case, not the EscrowManager use case.
- Arbiter-based escrow is most relevant for: real estate, B2B contracts, services with disputed deliverables. None of these are v1 targets.

### Recommended for sign-off

**Defer EscrowManager to v1.1.** Keep the contract in source — don't delete, don't deploy at v1.

Justification:
- CommerceEscrow covers v1 use cases
- EscrowManager is real, working code with substantial design investment — preserve it
- Adding arbiter-based escrow at v1 increases the testnet reveal scope without addressing what the reveal users need
- v1.1 is the appropriate moment when high-value trades or arbiter use cases become real

### Status

[X] **SIGNED OFF 2026-05-15 — Option (b): Deploy EscrowManager at v1 alongside CommerceEscrow.** Both contracts in v1 deploy set. Phase 3 expanded to wire both. Justification: comprehensive system at testnet reveal supports the full credibility pitch; deferring core financial primitives to v1.1 creates narrative gaps with sophisticated users.

---

## Decision 3: Recovery flows — Path A vs Path B

### Observation

Two recovery systems exist:

- **Path A: Wallet rotation** — vault's own `proposeWalletRotation`, `approveWalletRotation`, `finalizeWalletRotation` flow. Currently wired (`useVaultRecovery.ts`). Simpler.
- **Path B: VaultRecoveryClaim** — full state machine with guardian votes, verifier votes, claim reasoning, evidence hashes, challenge windows, R-8 trustee additions. Currently unreachable.

### Analysis

VaultRecoveryClaim is in PRODUCTION_SET.md (it deploys). Both contracts are intentional production code.

The user previously confirmed (transcript): "I want to keep everything comprehensive."

The architectural question is whether Path A and Path B serve different cases or whether one is fallback for the other. Reading both:

- Path A is invocable by the owner from their existing device, signed from the existing wallet. It's for the case where the owner has access to their device and just wants to rotate keys.
- Path B is invocable by anyone (with R-8 restrictions: trustees only for vaults that have configured trustees) and supports the case where the owner has lost their device entirely. New wallet starts the claim.

These are genuinely different use cases. Path A is "I lost confidence in my current key but I still have it." Path B is "I lost my device, I'm on a new device."

### Recommendation

**Keep both. Wire both. They serve different cases.**

Phase 1 of the plan wires Path B. Path A is already wired. Both paths converge at `VaultHub.executeRecoveryRotation` so the actual ownership rotation logic is shared.

UI should make the distinction clear when offering recovery: "I still have access to my old device" → Path A. "I lost my old device" → Path B.

### Status

[ ] Vanta: confirm wire both Path A and Path B
[ ] Vanta: migrate to one (please describe which and why)

---

## Decision 4: Other unreachable contracts — confirmed production?

All 9 of the previously-unreachable contracts from VFIDE_SYSTEM_AUDIT.md are confirmed production-listed in PRODUCTION_SET.md:

| Contract | Status |
|---|---|
| VaultRecoveryClaim | ✅ Production — Phase 1 |
| FraudRegistry | ✅ Production — Phase 5 |
| EmergencyControl | ✅ Production — Tier 3 (admin via DAO) |
| SanctumVault | ✅ Production — Tier 2 (display only) |
| ProofLedger | ✅ Production — internal-only, no user UI needed |
| DAOTimelock | ✅ Production — Phase 4 (via DAO) |
| LiquidityIncentives | ✅ Production — Tier 2 (LBP launch) |
| MerchantRegistry | ✅ Production — Phase 3 (per Decision 1) |
| CommerceEscrow | ✅ Production — Phase 3 (per Decision 2) |

EscrowManager is the only one flagged for deletion. No surprises in the rest.

---

## Decision 5: Disambiguations not yet investigated

The audit may have missed other drift. Worth a quick scan for:

- **Multiple governance contracts?** PRODUCTION_SET.md lists DAO + DAOTimelock + DutyDistributor + GovernanceHooks. Some are concrete (DAO, DAOTimelock) and some are interfaces / extension hooks. May or may not need disambiguation.
- **VFIDEFinance file naming.** PRODUCTION_SET.md explicitly flags: "file contains `EcoTreasuryVault`, not a `VFIDEFinance` contract (rename pending)". File-name vs. contract-name mismatch.
- **VaultInfrastructure.** PRODUCTION_SET.md: "Decision needed" — flagged as NOT yet in production set.

I propose addressing these in a subsequent Phase 0 turn IF needed, OR rolling them into the relevant phases (governance disambig into Phase 4, etc.) Vanta to choose.

### Status

[ ] Vanta: address remaining disambiguations now in Phase 0
[ ] Vanta: roll them into relevant later phases

---

## Summary

| # | Decision | Recommended action | Risk |
|---|---|---|---|
| 1 | Merchant identity drift | Wire to both, defer contract refactor to Tier 2 | Low (defers risk) |
| 2 | EscrowManager vs CommerceEscrow | **CORRECTED: Do NOT delete. They have different functionality.** | — |
| 3 | Recovery Path A and B | Keep and wire both | Low (already user-confirmed) |
| 4 | Other production contracts | All confirmed; wire per plan | Low |
| 5 | Remaining disambiguations | Defer to later phases | Low |
| 6 | EscrowManager deployment timing | **Defer to v1.1.** Keep in source, do not deploy at v1. | Low |

**Decision 2 was corrected during execution.** Decision 6 added to capture the strategic question that remains.

---

## Sign-off section

By signing here, Vanta ratifies the decisions and authorizes Claude to proceed accordingly.

```
[X] Decision 1: SIGNED OFF 2026-05-15 — defer merchant refactor, wire both as parallel surfaces in Phase 3
[!] Decision 2: VOIDED 2026-05-15 — original "delete EscrowManager" recommendation was wrong, see corrected analysis above
[X] Decision 3: SIGNED OFF 2026-05-15 — wire both Path A and Path B
[X] Decision 4: SIGNED OFF 2026-05-15 — production contracts confirmed
[X] Decision 5: SIGNED OFF 2026-05-15 — roll remaining disambiguations into later phases
[X] Decision 6: SIGNED OFF 2026-05-15 — Option (b): deploy EscrowManager at v1 alongside CommerceEscrow
```

**Phase 0 complete. Proceeding to Phase 1 — VaultRecoveryClaim Wiring.**
