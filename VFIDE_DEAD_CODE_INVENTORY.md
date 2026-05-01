# VFIDE — Dead Code & Cleanup Inventory

A consolidated inventory of code that is broken, unreachable, deprecated, mislabeled, or pending removal across the v7 codebase. Items are grouped by removal class so a single PR can address each group cleanly. Severity reflects priority for cleanup — none of these are exploits in themselves, but the cumulative noise makes the codebase harder to audit and easier to break in maintenance.

---

## Classification

- **Class A — Active hazard.** Code that's broken or wrong AND can be reached. Remove or fix urgently.
- **Class B — Mislabeled or stale.** Code that works but documents/exposes things it shouldn't. Rename or relocate.
- **Class C — Dead-but-imported.** Code that's unreachable from any production path but still increases audit surface. Delete.
- **Class D — Documentation residue.** Code comments and naming that reference removed features. Cosmetic cleanup.
- **Class E — Deferred / future.** Code intentionally not deployed. Should be quarantined behind a feature flag.

---

## Section 1 — Active hazards (Class A)

These are real problems, not just clutter. They've all been flagged in prior audit passes.

### 1.1 `MerchantPortal.pay()` and `processPayment()` — broken-on-arrival in vault custody model

**Files:** `contracts/MerchantPortal.sol:622, 779`

Both functions call `safeTransferFrom(customerVault, ...)` against vaults that have no allowance and cannot grant one in real-time (the only allowance path is `CardBoundVault.approveVFIDE` with a 7-day timelock). Every call reverts on `ERC20InsufficientAllowance`.

**Resolution:** replaced by `payWithIntent` in the merchant-payment fix plan. Old functions can stay during transition for any pre-allowance flows but should hard-revert once the new path ships and no callers remain.

```diff
 function pay(address merchant, address token, uint256 amount, string calldata orderId)
     external nonReentrant returns (uint256 netAmount)
 {
+    revert MERCH_LegacyPathRemoved();
-    if (!merchants[merchant].registered) revert MERCH_NotRegistered();
-    // ... etc
 }
```

Same treatment for `processPayment(...)` once you confirm there are no on-chain callers.

### 1.2 `EscrowManager.createEscrow(address, address, uint256, string)` — broken-on-arrival

**File:** `contracts/EscrowManager.sol:143`

Same problem: `safeTransferFrom(msg.sender, ...)` requires the buyer's EOA to hold tokens and have approved EscrowManager. Neither is true in the vault model.

**Resolution:** hard-revert. Replaced by `submitEscrowIntent` per the escrow fix plan.

```diff
 function createEscrow(address, address, uint256, string calldata) external returns (uint256) {
-    require(merchant != address(0) && token != address(0), "zero address");
-    // ... full body
+    revert ESC_LegacyPathRemoved();
 }
```

### 1.3 `proxy.ts` / `middleware.ts` — missing entirely

**File expected:** repo root `proxy.ts` (Next.js 16 convention)

The static CSP at `next.config.ts:80` is strict (`default-src 'self'` blocks all inline scripts). The `app/layout.tsx:17` reads an `x-nonce` header. Without `proxy.ts`, no nonce is set, no inline script is allowed, the page is blank in production. CSRF, content-length, content-type validation, and CORS that lived in the old `proxy.ts` are also gone.

**Resolution:** recover from git history (`git show <pre-v6>:proxy.ts > proxy.ts`), add nonce-CSP injection, deploy. Three audit passes have flagged this.

### 1.4 `useEscrow.ts` is misleadingly named after a removed contract

**File:** `lib/escrow/useEscrow.ts`

The hook is named after the deleted `CommerceEscrow` contract. Since v6 it's actually an instant-payment shim routing through `MerchantPortal.pay()`. The name lies about what it does.

**Resolution:** after the merchant-payment fix lands, this file becomes the dual-mode hook. Rename to `usePayment.ts` (or keep `useEscrow.ts` and accept the legacy name — the latter is fine if you document it).

### 1.5 33 API routes still don't use `withAuth`

**Pattern:** `requireAuth` followed by direct `query()` calls; the RLS context is set by an implicit fallback in `lib/db.ts:35` that re-extracts the JWT from `headers()` per query.

**Examples** (33 total — incomplete list):
- `app/api/analytics/portfolio/[address]/route.ts`
- `app/api/proposals/route.ts`
- `app/api/quests/claim/route.ts`
- `app/api/merchant/{digital,loyalty,expenses,coupons,webhooks,customers,receipts,installments,orders,returns,locations,subscriptions,staff}/route.ts`
- `app/api/remittance/beneficiaries/route.ts`
- `app/api/enterprise/orders/route.ts`

**Resolution:** codemod sprint to migrate each route to `withAuth` (or `withOwnership` for routes that authorize against an address parameter). The wrapper is defined; callers haven't all moved yet.

---

## Section 2 — Mislabeled or stale (Class B)

These compile and may even work, but they're in the wrong place or expose things they shouldn't.

### 2.1 Future-contract ABIs imported into main `lib/abis/index.ts`

**File:** `lib/abis/index.ts:11,19,20,21,115,123,124,125,191,199,249,258,259,260`

```typescript
import VFIDEBadgeNFTABI from './VFIDEBadgeNFT.json'
import CouncilElectionABI from './CouncilElection.json'
import CouncilSalaryABI from './CouncilSalary.json'
import SubscriptionManagerABI from './SubscriptionManager.json'
import VFIDECommerceABI from './VFIDECommerce.json'  // also legacy
```

All five reference contracts in `contracts/future/` (declared not deployment-ready). The address-side gating worked (these are no longer in the main `CONTRACT_ENV_VAR_MAP`), but the ABI re-exports give any consumer access to call into the contracts if they obtain an address by other means.

**Resolution:** move imports + re-exports to `lib/contracts/future-contracts.ts` (the existing feature-flag-gated module). Remove from `lib/abis/index.ts`. Codemod consumers from `@/lib/abis` to `@/lib/contracts/future-contracts`.

### 2.2 `SeerAutonomous` in main address registry

**File:** `lib/contracts.ts:80, 179`

```typescript
SeerAutonomous: 'NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS',
// ...
SeerAutonomous: validateContractAddress(process.env.NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS, 'SeerAutonomous', chainId),
```

Per `contracts/future/SeerAutonomous.sol` — explicitly deferred ("needs behavioral tuning" per spec §20.1). Should be in the future-contracts module.

**Resolution:** same as 2.1.

### 2.3 `CardBoundVault.approveVFIDE` / `approveERC20` / `applyTokenApproval`

**File:** `contracts/CardBoundVault.sol:499, 513, 524`

These are the 7-day-timelocked token approval functions that don't actually solve real-time merchant payment (which is why we need the intent path). They're not WRONG — they exist for things like long-term spender authorization to a known contract — but they're effectively dead in practice because no real flow can wait 7 days.

**Resolution:** keep for now (they're a defense-in-depth tool for unusual long-running approvals), but document explicitly in the contract header that they are NOT the merchant payment flow. Add a comment on `approveVFIDE`:

```solidity
/// @notice Approve a spender to pull VFIDE from this vault.
/// @dev SENSITIVE_ADMIN_DELAY (7 days) timelock.
///      THIS IS NOT THE MERCHANT PAYMENT FLOW — for that, use the EIP-712
///      PayIntent / EscrowIntent path on this vault. This function is for
///      one-time, long-running approvals (e.g., long-term DeFi positions).
function approveVFIDE(address spender, uint256 amount) external onlyAdmin whenNotPaused {
```

If after auditing real usage these turn out to never be used legitimately, delete them entirely. They're a footgun.

### 2.4 Wallet stack files unused but documented

**Files:** `lib/wallet/AccountButton.tsx`, `lib/wallet/VFIDEWalletProvider.tsx`, `lib/wallet/EmbeddedWalletAdapter.tsx`

Currently dead — `Web3Providers.tsx` mounts `RainbowKitProvider`. The header comment in `Web3Providers.tsx:40-45` documents the migration constraint, which is good. But three files sit there that compile but aren't used.

**Resolution:** decide. If you're sticking with RainbowKit indefinitely, delete:
```bash
git rm lib/wallet/AccountButton.tsx lib/wallet/VFIDEWalletProvider.tsx lib/wallet/EmbeddedWalletAdapter.tsx
```
If you're keeping the migration option open, leave them but make sure `tsc --noEmit` continues to clean up any references. The current state is workable; the cleanup is optional.

### 2.5 Phase-deployment scripts for things you're not deploying yet

**Files:** `scripts/deploy-phase2.ts`, `apply-phase2.ts`, `deploy-phase3.ts`, `apply-phase3.ts`, etc.

Per spec §20.1, only Phase 1 contracts are deploying initially. Phases 2-6 are future. The scripts exist and reference contracts in `contracts/future/`, which means they import ABIs that should be feature-flagged.

**Resolution:** move phase 2-6 scripts to `scripts/future/` mirroring the contract structure. They're not dead — they'll be needed eventually — but they shouldn't be in the main scripts directory pretending to be ready.

---

## Section 3 — Dead-but-imported (Class C)

These are unreachable from any rendering path but still contribute imports, type checks, and audit surface.

### 3.1 Social commerce & related components

**Directory:** `components/social/`

Substantial component set, none rendered from any page in `app/`:
- `ShoppablePost.tsx`
- `PurchaseProofEvent.tsx`
- `ShareProductToFeed.tsx`
- `SocialCommerce.tsx`
- `social-commerce-types.ts`
- `AIProductListing.tsx`
- `ActivityFeed.tsx`
- `CreatorDashboard.tsx`
- `EndorsementsBadges.tsx`
- `FriendCirclesManager.tsx`
- `FriendRequestsPanel.tsx`
- `FriendsList.tsx`
- `GlobalUserSearch.tsx`
- `GroupMessaging.tsx`
- `GroupsManager.tsx`
- (more in the directory)

**Resolution:** decide per-component. Three modes:
- **Wire in:** add to a new `app/social/` subroute or feed page if the feature is in the next sprint.
- **Stub-archive:** move to `components/_archive/social/` with a header comment explaining the archive policy. Excluded from the build but kept in source for future revival.
- **Delete:** restore from git when needed.

The "stub-archive" approach is my recommendation for ambiguous components. It signals "we built this, didn't ship it, don't have plans to ship soon" without losing the work.

### 3.2 Future-contract source files

**Directory:** `contracts/future/`

21 contract files including `BadgeManager`, `BadgeRegistry`, `CouncilElection`, `CouncilSalary`, `CouncilManager`, `MainstreamPayments`, `SeerAutonomous`, `SeerAutonomousLib`, `SeerGuardian`, `SeerPolicyGuard`, `SeerSocial`, `SeerView`, `SeerWorkAttestation`, `SubscriptionManager`, `VFIDEBadgeNFT`, `VFIDEBenefits`, `VFIDEBridge`, `VFIDEEnterpriseGateway`, `BridgeSecurityModule`, `BadgeQualificationRules`, plus `README.md`.

These are not dead in the sense of "delete forever" — they're features that will ship later. But they ARE compiled when you build the contracts package, they have ABIs generated, and those ABIs are imported into the runtime as we saw in §2.1.

**Resolution:** ensure the build pipeline excludes `contracts/future/` from the main artifact set. They should compile in a separate `npm run build:future` step that only runs when `FUTURE_FEATURES_ENABLED` is set. The README.md inside should explicitly state which contracts are ready for testnet, which need more work, and which need the wider community context (e.g., CouncilElection needs an established community) before deploying.

### 3.3 Test mocks for removed contracts

**Files:** `contracts/mocks/`
- `BridgeGovernanceVerifierMocks.sol` — for VFIDEBridge (in future/)
- `CardBoundVaultVerifierMocks.sol` — active
- `DevReserveVestingBehaviorMocks.sol` — active (DevReserveVestingVault is deployed)
- `EcosystemWorkRewardsVerifierMocks.sol` — active
- `EscrowManagerVerifierMocks.sol` — active
- `MockSeerAuto.sol` — for SeerAutonomous (in future/)
- `NextOfKinInheritanceVerifierMocks.sol` — for what?
- `OwnerControlPanelGuardrailMocks.sol` — active
- `ProofScoreBurnRouterVerifierMocks.sol` — active
- `SystemHandoverTestStubs.sol` — active
- `TestMintableToken.sol` — generic test helper

**Resolution:** move mocks for `contracts/future/` contracts into `contracts/future/mocks/`. Keep mocks for active contracts in `contracts/mocks/`. The `NextOfKinInheritanceVerifierMocks.sol` is suspicious — there's no `NextOfKin` contract in the active set. Either find what it's testing (and rename the test file accordingly) or delete it.

### 3.4 Verifier scripts for non-deploying contracts

**Files:** `scripts/verify-bridge-governance-timelock.ts`, `scripts/verify-bridge-governance-local.sh`

VFIDEBridge is in `contracts/future/` and not deploying. The verifier scripts reference it.

**Resolution:** move alongside the contracts to `scripts/future/` or gate behind `FUTURE_FEATURES_ENABLED`. They'll be needed when bridge ships.

### 3.5 Legacy ABI guards in `useSecurityHooks.ts` (verified clean in v7)

Already removed in v7 per the v7 review. Mentioning here just to confirm — `hooks/useSecurityHooks.ts` no longer imports `PanicGuardABI`, `GuardianRegistryABI`, etc. ✓

---

## Section 4 — Documentation residue (Class D)

Code that works but has comments or naming that reference removed features. Cosmetic cleanup.

### 4.1 SecurityHub references in `// REMOVED` comments

**Files:** all over `contracts/`. Examples:

```solidity
// contracts/VFIDEToken.sol:
// ── SecurityHub functions REMOVED — non-custodial, no third-party locks ──
// ── setSecurityBypass REMOVED — no SecurityHub lock checks to bypass ──
// ── SecurityHub lock check REMOVED ──────────────────────

// contracts/VaultHub.sol:
// ── SecurityHub functions REMOVED — non-custodial ──
```

These are fine as breadcrumbs for auditors ("we deliberately removed X for reason Y"), but after a few release cycles they become noise. Keep them for the next 1-2 audit cycles, then collapse into a single `SECURITY_NOTES.md` that explains the removal pattern.

**Resolution:** keep for now. Re-evaluate at v8 or v9.

### 4.2 Fee distribution comments in spec doc

Spec §4.3 mentions "40% burn, 10% Sanctum, 50% Ecosystem" with the ecosystem split as 15% / 20% / 10% / 5%. Per your decision, this should be removed from the spec since the actual splits are visible in code.

**Resolution:** done in the implementation plan (replace §4.3 with structure-only language pointing to `getCurrentSplits()`).

### 4.3 Howey-strategy renames

`LiquidityIncentives` provides "ZERO rewards" per the spec; `DutyDistributor` tracks "Duty Points" not monetary rewards; `totalBurnedToDate()` was renamed to `transactionFeesProcessed()`. These are intentional Howey-defense renames. They're fine, but the contracts deserve a header comment explaining the framing for future reviewers:

```solidity
/// @notice LiquidityIncentives — explicitly NOT a yield/staking contract.
/// @dev    Renamed from a yield-distributing design to comply with US securities
///         framing (Howey Test, Prong 3 — expectation of profits). All reward
///         emission paths are disabled. This contract exists for liquidity
///         tracking and metric purposes only.
```

**Resolution:** add header comments to `LiquidityIncentives`, `DutyDistributor`, and any other contract whose name was chosen for Howey reasons rather than function. Optional but helpful for new contributors.

### 4.4 `lib/__mocks__/contracts.ts` referencing CommerceEscrow

**File:** `lib/__mocks__/contracts.ts`

Still has a `CommerceEscrow` reference even though the contract is gone.

**Resolution:** update the mock to match the active `CONTRACT_ADDRESSES` shape.

---

## Section 5 — Deferred / future (Class E)

Things that are intentionally not active and just need clear quarantine.

### 5.1 `contracts/future/` directory

Already organized but imports leak. Per §3.2 above, the build needs to exclude this directory from main artifacts, and the ABIs need to be in `lib/contracts/future-contracts.ts` (per §2.1).

### 5.2 `app/api/enterprise/...` and `VFIDEEnterpriseGateway`

**Files:** `app/api/enterprise/orders/route.ts` (and any other enterprise routes), `contracts/future/VFIDEEnterpriseGateway.sol`

Per spec §20.1, "VFIDEEnterpriseGateway: enterprise features are post-launch." But `app/api/enterprise/orders/route.ts` exists in the main app.

**Resolution:** gate the enterprise routes behind a feature flag. Either remove them from the main API surface (move to `app/api/_future/enterprise/`) or have them all return 503 if `ENTERPRISE_ENABLED !== 'true'`.

### 5.3 `VFIDEBenefits`, `VFIDEEnterpriseGateway` — never-deployed scaffolds

Per spec §20.1: "VFIDEEnterpriseGateway, VFIDEBenefits — requires enterprise partnerships."

**Resolution:** keep in `contracts/future/`. Already correctly placed.

---

## Section 6 — Cleanup PR sequencing

Group these into PRs that can land independently.

### PR-1 — Active hazards (the merchant payment fix)

Covers §1.1, §1.2, §1.3.

- Add `payWithIntent` to `MerchantPortal`. Hard-revert old `pay()` and `processPayment()` after frontend cutover.
- Add `submitEscrowIntent` to `EscrowManager`. Hard-revert old `createEscrow`.
- Create `proxy.ts` at repo root with nonce-CSP, CSRF, content-length, content-type, CORS protection.

This is the v7 follow-up work. Already detailed in `VFIDE_PAYMENT_AND_ESCROW_FIX.md`.

### PR-2 — `withAuth` codemod sprint

Covers §1.5.

33 routes to migrate. 1-2 routes per PR, or one big codemod PR with thorough testing. Add the `withOwnership` wrapper to `lib/auth/middleware.ts` first, then migrate.

### PR-3 — Future contract quarantine

Covers §2.1, §2.2, §3.2, §3.3, §3.4, §5.1, §5.2.

Single mechanical PR:
- Move future contract ABIs to `lib/contracts/future-contracts.ts`.
- Move `SeerAutonomous` env-var entry to the same file.
- Add build-time gate that excludes `contracts/future/` from main artifacts.
- Move future-contract test mocks to `contracts/future/mocks/`.
- Move future-contract verify scripts to `scripts/future/`.
- Move phase 2-6 deploy/apply scripts to `scripts/future/`.
- Gate `app/api/enterprise/...` behind `ENTERPRISE_ENABLED` feature flag.

### PR-4 — Dead component cleanup

Covers §3.1.

- Decide per-component (wire in, archive, or delete).
- Move archived components to `components/_archive/` with a header explaining policy.
- Update `tsconfig.json` to exclude `_archive/` from typecheck (or include with a different rule).

### PR-5 — Documentation cleanup

Covers §4.1, §4.2, §4.3, §4.4.

- Update spec doc per implementation plan §10.
- Add header comments to Howey-strategy contracts.
- Update `lib/__mocks__/contracts.ts` to remove `CommerceEscrow` reference.
- Decide whether to keep or collapse "// REMOVED" comments in contracts.

### PR-6 — Vault helper cleanup (optional)

Covers §2.3.

- Either delete `approveVFIDE`/`approveERC20`/`applyTokenApproval` if usage analysis shows they're never legitimately used.
- Or add documentation header explaining they're not the merchant payment flow.

---

## Section 7 — Things NOT to remove (commonly mistaken)

A few items that LOOK like dead code but should stay:

### 7.1 `// SecurityHub REMOVED` comments

These document a deliberate design decision. Removing them creates risk that someone adds a SecurityHub-like check back in without understanding why it was removed. Keep for at least 2 more audit cycles.

### 7.2 `pendingMaxTransfer`, `pendingDailyLimit`, `pendingCooldown` state in VFIDEToken

These are the timelock staging variables. They look unused in steady state but are essential for the timelock pattern. Don't delete just because grep says "only set, never read in steady-state code."

### 7.3 `LiquidityIncentives.sol` and `DutyDistributor.sol`

Both look like they "do nothing" — that's the Howey-strategy intent. They're scaffolds that intentionally don't reward. Don't delete; they're load-bearing for the legal posture.

### 7.4 Score history circular buffers

`Seer.scoreHistory[user][50]` and `ProofScoreBurnRouter` 32-snapshot buffer LOOK like they could be smaller, but the sizes were chosen for: bounded gas (50 entries fits in a single read), score time-weighting (32 snapshots over the 7-day TWAP window). Don't shrink without modeling the gas consequences.

### 7.5 Unused-looking error declarations

Solidity custom errors that "appear unused" might actually be thrown via assembly or via `revert(bytes)` patterns. Always verify with a thorough grep before deleting any error.

---

## Section 8 — Summary table

| Group | Items | Class | Risk | Effort |
|---|---|---|---|---|
| Merchant payment fix | §1.1, §1.2, §1.3 | A | High | High |
| `withAuth` codemod | §1.5 | A | Medium | Medium |
| Future contract quarantine | §2.1, §2.2, §3.2-3.4, §5.1-5.2 | B + C + E | Low | Medium |
| Dead component cleanup | §3.1 | C | Low | Low |
| Documentation polish | §4.1-4.4 | D | None | Low |
| Vault helper review | §2.3 | B | Low | Low |
| Wallet stack decision | §2.4 | C | None | Low |
| Phase scripts relocation | §2.5 | B | None | Low |

Total dead-code surface to remove or relocate: roughly 30 contract files (mostly in `contracts/future/`), 12 frontend ABI imports, 3 wallet stack files, ~15 social components, 5 phase scripts, 2 broken contract entry-point functions, and 1 missing security-middleware file (`proxy.ts`) — plus the `withAuth` codemod across 33 routes.

The single biggest leverage point: PR-3 (future contract quarantine) takes the most files off the main audit surface for the lowest effort. The single most urgent: PR-1 (the merchant payment fix), since the protocol's commerce feature literally cannot work until that lands.
