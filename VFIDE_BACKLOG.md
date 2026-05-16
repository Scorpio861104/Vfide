# VFIDE Backlog

New findings surfaced during Tier 1 wiring work go here. To be triaged after Tier 1 completion in Phase 6 / Tier 2 planning.

**Rules:**
- Findings logged here are NOT addressed mid-cycle except for <2-hour mechanical fixes (broken reads, missing imports, stale ABIs).
- Each finding includes: phase discovered, contract/file, description, severity guess, suggested action.
- New entries appended chronologically.

---

## Findings

### 2026-05-15 — Phase 0 — PROCESS NEAR-MISS — EscrowManager near-deletion

Phase 0 originally recommended deletion of `contracts/EscrowManager.sol` based on:
- PRODUCTION_SET.md's tentative comment "possibly superseded by CommerceEscrow"
- Function-name overlap on `refund`, `release`, `settleByInheritance`

Vanta signed off. Before executing the deletion, the audit-before-action verification step diffed function bodies and discovered EscrowManager and CommerceEscrow are NOT functionally equivalent. EscrowManager has 20 functions with no CommerceEscrow equivalent (timeout machinery, arbiter system, token whitelist governance, dispute resolution).

**Outcome:** Deletion canceled. Decision 2 voided. Decision 6 added to handle strategic deployment timing.

**Process lesson learned and added to VFIDE_TIER1_PLAN.md operating principles:** "Diff function bodies before recommending deletion. Function-name overlap is NOT sufficient evidence of functional equivalence."

**No code action needed** — deletion was prevented, audit discipline worked as designed. This entry exists as a record of why the rule was added.

### ✅ 2026-05-15 — Phase 0 — CLOSED Phase 3e — PRODUCTION_SET.md misclassifies EscrowManager

The PRODUCTION_SET.md described EscrowManager as "possibly superseded by CommerceEscrow." Phase 3e's full audit confirmed that — but more strongly than originally thought: createEscrow is a revert stub and no function populates the escrows mapping. The contract was effectively unreachable.

**Closed by Phase 3e (2026-05-15):** EscrowManager deleted entirely. PRODUCTION_SET.md updated to mark "REMOVED 2026-05-15" with full rationale.

### 2026-05-15 — Phase 3e — Backlog — EscrowManagerVerifierMocks.sol file naming is stale

The mocks file `contracts/mocks/EscrowManagerVerifierMocks.sol` was preserved during Phase 3e cleanup because it still provides `MockTokenForEscrow`, a generic token mock used by `scripts/future/verify-bridge-governance-timelock.ts`. The file name reflects its original purpose (EscrowManager invariant testing) but is now misleading — EscrowManager no longer exists.

**Severity:** Low (cosmetic; functions correctly)
**Suggested action:** When the deferred bridge-governance-timelock work is picked up, rename the mock file (e.g. to `BridgeVerifierMocks.sol` or just `TestTokenMocks.sol`) and update the script's artifact path accordingly.

### 2026-05-15 — Phase 0 — Backlog — MerchantPortal duplicates MerchantRegistry state

Per Decision 1 corrected analysis: MerchantRegistry and MerchantPortal both track merchant state independently with no synchronization. MerchantPortal has its own `MerchantInfo` struct and `merchants` mapping that duplicates MerchantRegistry's `Merchant` struct and `merchants` mapping.

**Severity:** Medium (architectural drift, no immediate user-facing bug, but creates audit complexity and risk of state divergence)
**Suggested action:** Refactor MerchantPortal to call MerchantRegistry for identity state. Tier 2 cleanup.

### 2026-05-15 — Phase 1 Turn 2 — Backlog — ClaimFlowModal could show exact challenge period

The wired modal currently shows "multi-day challenge period (3–30 days, extended to 14 days for recently-active vaults)" as generic copy. A real enhancement would be to read the target vault's `challengePeriodPreferenceView` + compute the effective period (with activity-window logic) + display the exact number the user can expect.

**Severity:** Low (UX polish)
**Suggested action:** Add a `useChallengePeriodPreview(vault)` hook that returns the effective period for a vault, surface it in the modal's step 1 security notice. Tier 2 polish work.

### 2026-05-15 — Phase 1 Turn 2 — Backlog — ClaimFlowModal needs real-world testing

The wired ClaimFlowModal is structurally correct but has not been exercised in a real browser against a deployed testnet contract. Specifically untested:
- viem error message format parsing (`err.shortMessage || err.details || err.message`)
- Transaction hash format from `writeContractAsync`
- Button disabled state combinations
- Full end-to-end flow with a real claim

**Severity:** Medium (will be discovered first time someone uses it; better caught now)
**Suggested action:** Test in dev environment with a Base Sepolia VaultRecoveryClaim deployment before testnet reveal. Walk through: search vault, open modal, fill form, submit, see tx hash, verify claim on-chain. Then deliberately trigger errors (wrong recovery ID, no trustee designation, cooldown active) and verify error messages display correctly.

### 2026-05-15 — Phase 1 Turn 3 — Backlog — OwnerChallengeBanner content offset

The banner uses `fixed top-0 z-[60]` and is ~60-80px tall. The page content has `pt-7` assuming only the 28px ProtocolTicker sits at top. When the banner is active, content might be slightly obscured. Need to verify in real browser and either add dynamic offset OR accept that recovery scenarios are rare enough that minor visual overlap is fine.

**Severity:** Low (UX polish, only visible during active recovery)
**Suggested action:** Test in browser. If overlap is significant, conditionally add banner-height padding to the children wrapper when active. Minor CSS work.

### 2026-05-15 — Phase 1 Turn 3 — Backlog — OwnerChallengeBanner submitted-state propagation gap

After the user submits a challenge, the banner shows "Challenge submitted" until the next render cycle picks up the new on-chain status (Challenged). There's a brief window where both the submitted state and the still-active claim data coexist. Acceptable UX but worth confirming the gap is short (seconds, not minutes).

**Severity:** Low (UX edge case)
**Suggested action:** Verify in browser. If the gap is too long, add a useEffect that refetches the claim data after a successful challenge tx settles.

### 2026-05-15 — Phase 1 Turn 4 — Backlog — Verifier-side UI not built

The `useVerifierVote` hook exists (Turn 1 deliverable) but no component consumes it. Trusted verifiers — a small set of attested addresses set by protocol owner via `setTrustedVerifier` — have no UI to cast verifier votes. They would currently need to call `VaultRecoveryClaim.verifierVote` via Etherscan.

**Severity:** Low (verifiers are not user-facing; this is internal protocol contributor UX)
**Suggested action:** Build a `VerifierConsole` page at `/verifier` or similar, gated by `trustedVerifier(connectedWallet)` check. Show pending claims that need verifier votes. Defer to Tier 2 unless reveal explicitly demos the verifier-fallback path.

### 2026-05-15 — Phase 1 Turn 5 — Backlog — Trustee promote/demote uses one-click pattern (no confirm modal)

The trustee promote/demote button in MyGuardiansTab triggers `proposeTrusteeChange` directly without a confirmation modal. The rationale: the action is timelocked (24h), the user can cancel before it takes effect, and the pending-state block prominently shows what's queued. However, trustee promotion grants significant power (the trustee can initiate recovery on the owner's behalf), and the guardian-vote UI uses a confirmation modal pattern for similar reasons.

**Severity:** Low (design consistency question, not a bug)
**Suggested action:** Decide whether trustee changes should match the guardian-vote modal pattern. If yes, add a confirmation modal that shows the implications of promotion/demotion before triggering the timelock proposal. Otherwise, leave as one-click. Worth deciding before testnet reveal so the pattern is consistent.

### ✅ 2026-05-15 — Phase 1 Turn 7 — CLOSED Phase 1.5 — Claimant has no UI to finalize an approved claim

The `useRecoveryClaim.finalize` function existed but no component rendered a "Finalize Recovery" button. After a claim is initiated → guardians approve → challenge window passes, *someone* must call `finalizeClaim(claimId)` to complete the ownership rotation. The function is permissionless on-chain (anyone can finalize an approved claim), but the claimant — the lost-device user who just went through the whole process — had no in-app way to complete their own recovery.

**CLOSED Phase 1.5 (2026-05-15):** Built `/vault/recover/status` page with state-aware rendering. Prominent "Finalize Recovery" button appears when claim status is Approved + canFinalize is true. ClaimFlowModal step 3 now links to the status page. End-to-end recovery is now complete in-app without needing Etherscan.

### 2026-05-15 — Phase 1 Turn 4 — Backlog — GuardianRecoveryClaimCard needs real-world testing

The Path B guardian approval card has not been exercised against a deployed contract. Specifically untested:
- The `vote()` write succeeds and updates `hasVoted` state correctly after tx mined
- Voting against a non-existent claim ID shows the right error
- The Approve/Reject button disable logic across the various claim status transitions

**Severity:** Medium (will be discovered first time someone uses it)
**Suggested action:** Test in dev environment with a real claim against a watched vault. Walk through both vote=true and vote=false paths. Confirm reverts (already voted, claim not pending) display correctly.

### 2026-05-15 — Phase 1 Turn 4 — Backlog — Watchlist UX improvement opportunity

The guardian watchlist is local storage only (per useGuardianWatchlist comments — "local and private"). This is a deliberate scope choice but creates a UX gap: a guardian who clears browser data or uses a new device loses their watchlist entirely. They'd then miss recovery events on vaults they guard.

For Path B specifically, the contract DOES emit ClaimInitiated events with the guardian addresses included as filtered topics (well, the vault address — but anyone can query by guardian). A future enhancement could auto-populate the watchlist by querying historic logs for vaults that named the connected wallet as a guardian.

**Severity:** Medium (gap in guardian responsiveness for users with cleared state)
**Suggested action:** Add a "Discover vaults I guard" button that queries logs and auto-populates the watchlist. Tier 2 enhancement.

### 2026-05-15 — Phase 2 Turn 1 — Backlog — Large payment threshold has no cancel function

The large payment threshold pipeline (CardBoundVaultPaymentQueueManager.setLargePaymentThreshold → applyLargePaymentThreshold) is the only timelocked vault change that does NOT have a matching cancel function. Once proposed, the only options are: wait for timelock to expire and apply, OR ignore it (in which case it sits queued forever).

Compared with the other 7 pipelines on AdminManager which all have apply + cancel pairs, this asymmetry could be:
1. A contract design choice — perhaps the team decided this particular change is always low-risk enough that cancellation isn't needed
2. An oversight that should be addressed before mainnet

Either way, the UI surface is correct (the hook returns canCancel: false for this pipeline; the page will show only an apply button). But the underlying contract surface is worth reviewing before testnet reveal.

**Severity:** Low to Medium (depends on whether this is intentional)
**Suggested action:** Vanta to confirm intent. If oversight, add `cancelLargePaymentThreshold` to CardBoundVaultPaymentQueueManager and a delegating wrapper on the vault. If intentional, document the rationale in the contract NatSpec so future readers don't think it's a bug.

### 2026-05-15 — Phase 2 Turn 1 — Backlog — Surface map detector blind to dynamic dispatch

The current surface map heuristic looks for `functionName: 'xxx'` literal patterns. The Phase 2 Turn 1 hook (`usePendingChanges`) uses a switch statement that returns the function name string, then passes it to `writeContractAsync({ functionName: fnName })`. The detector can't see the dynamic dispatch and reports those functions as "unwired" even though they're reachable through the hook.

**Severity:** Low (the metric is misleading, not the code)
**Suggested action:** Either: (1) accept that the metric understates Phase 2 coverage; in audit doc, note the metric is "literal-pattern detection" and supplement with manual hook review; OR (2) improve the detector to also scan for `return 'xxx'` and `case 'xxx': return 'fnName'` patterns in files that import contract ABIs. The current Phase 2 state has 11 functions present in the codebase as string returns but reportable as "wired" only by manual review.

### 2026-05-15 — Phase 2 Turn 4 (M-CBV-03) — Backlog — Three pipelines have apply/cancel UI but no propose-side UI

Phase 2 exit verification surfaced this: three of the eight timelocked-change pipelines on CardBoundVault have apply/cancel UI (via /vault/pending-changes) but no propose-side UI in the frontend. The /vault/pending-changes page can only show what's been proposed via Etherscan or direct contract call:

- **`rescueNative(address payable to, uint256 amount)`** — propose an ETH rescue
- **`rescueERC20(address token, address to, uint256 amount)`** — propose an ERC20 rescue
- **`setLargePaymentThreshold(uint256 threshold)`** — propose new large-payment threshold

For comparison, the 5 pipelines that DO have full propose+apply+cancel coverage in the frontend:
- Guardian change (proposeGuardianChange) — MyGuardiansTab
- Trustee change (proposeTrusteeChange) — MyGuardiansTab
- Spend limits (setSpendLimits) — VaultQueueSection + SpendLimitsConfigurator
- Large transfer threshold (setLargeTransferThreshold) — SpendLimitsChapter
- Token approval (approveERC20) — used by merchant flow

**Severity assessment:**
- `rescueNative`/`rescueERC20`: Arguably intentional. Rescue operations are emergency-flavored — surfacing them in a standard UI invites phishing ("send your tokens to this 'safe' address"). Keeping them admin-only via direct contract calls may be the right call. Vanta to confirm intent.
- `setLargePaymentThreshold`: Probably a real gap. Owners should be able to adjust their own large-payment threshold without Etherscan. Likely worth a small UI in vault settings.

**Suggested action:** Vanta confirms intent for rescue operations. If "keep admin-only," document that in the contract NatSpec and call this resolved. If "should be in UI," scope a small phase to add rescue forms. For `setLargePaymentThreshold`, add a small input to vault safety settings (similar to the challenge-period preference page from Phase 1 Turn 6). Probably 1 turn of work.

This was discovered by Phase 2 exit verification, not by Phase 2's planned scope. M-CBV-02 (the apply/cancel work) is correctly closed; this is a separate finding.

### 2026-05-15 — Phase 3b Turn 2 — Backlog — RefundInitiated event does not emit refundId

`MerchantPortal.initiateRefund` computes a `refundId = keccak256(abi.encode(msg.sender, customer, orderId, block.timestamp, customerRefunds[customer].length))` and stores it as the key in `refundRequests`. But the emitted `RefundInitiated(customer, merchant, orderId, amount)` event does NOT include the refundId.

**Working frontend workaround (Phase 3b Turn 4):**
`useMerchantPayments.initiateRefund` simulates the contract call with `publicClient.simulateContract` before submitting the real tx. The simulation returns the deterministic refundId the real tx will produce; we persist it via `rememberRefundId` to localStorage. The "Complete refund" button reads from this storage. This works in practice but has caveats:
- **Race condition (low probability):** If another initiateRefund from the same merchant for the same customer lands between simulation and our submission, customerRefunds[customer].length changes and the captured refundId becomes wrong. Merchants don't usually run concurrent refunds, but it's a real edge case.
- **Browser-bound:** Clearing localStorage, switching browsers, or switching devices loses access to refundIds. The merchant can recover them by inspecting the original initiateRefund tx on a block explorer (the return value is in the trace), but that's clunky.
- **Simulation can fail silently:** If simulation throws (e.g., the merchant is paused, the customer would exceed the 450-refund cap), we let the real tx attempt and surface its error. The user sees "Refund initiated but refundId could not be captured locally" with the txHash for explorer-based recovery.

**Severity:** Low-to-medium. The flow works for the common case. Edge cases require manual recovery via block explorer.

**Resolutions to pick from (still recommended):**
1. **Contract fix**: add `refundId` to the `RefundInitiated` event as the first indexed parameter. Smallest possible contract change. Eliminates the race condition and the browser-bound limitation entirely.
2. **Public view fix**: expose `customerRefunds(address) → bytes32[]` and `merchantRefunds(address) → bytes32[]` as public getters. Lets frontend enumerate refunds without events at all.
3. **Both 1 and 2**: belt-and-suspenders, recommended.
4. **Keep workaround**: works for the common case, accept the edge cases.

**Needs Vanta decision.**

### 2026-05-15 — Phase 3b Turn 2 — Backlog — Returns page (off-chain) is not yet linked to on-chain refund flow

`/merchant/returns` is an off-chain workflow (database-backed, /api/merchant/returns) for product return requests. The on-chain refund flow built in Phase 3b (useMerchantPayments + useRefundHistory) is a separate concern: moving the actual money back.

A merchant who approves a return request in the returns page should be naturally guided to initiate the on-chain refund — but right now these systems don't reference each other. After Phase 3b finishes, a follow-up turn should add: "Approve return + initiate refund" as a combined action in the returns workflow, with refundId stored back to the return request record.

**Severity:** Medium. Each system works independently; the missing link is UX/workflow.

**Suggested action:** Folded into a Phase 3c or Phase 3.5 turn once Phase 3b exits. Trivial wire-up once both surfaces exist.

### 2026-05-15 — Phase 3b Turn 3 — Backlog — Vault TransactionHistory is a UI shell with no data source

`components/vault/TransactionHistory.tsx` is mounted in 3 places (`app/vault/components/VaultContent.tsx`, `app/control-panel/page.tsx`, and an unused mobile dashboard) but is always called as `<TransactionHistory />` with NO `transactions` prop. The default is `transactions = []`, so it always renders the empty state.

The crypto-page sibling `components/crypto/TransactionHistory.tsx` expects a `useTransactions(userId)` hook from `lib/crypto/` that doesn't appear to exist in the codebase.

**Consequence:** The "Transaction History" section on the vault dashboard is currently a non-functional UI shell. Users see headers and filters but no actual transaction data.

**Severity:** Medium. Not a blocker for refund flows (the new IncomingRefunds component is the canonical way customers see refund activity), but the dashboard has a noticeable dead section.

**Fix scope:** Wiring real transaction data requires either (a) an off-chain indexer service exposed via /api, (b) on-chain event scanning across multiple contracts (CardBoundVault transfers, MerchantPortal payments, VaultRecoveryClaim events, etc.), or (c) integrating with an existing indexer like The Graph or Alchemy. Each option has tradeoffs.

**Suggested action:** Scope as a dedicated turn (or mini-phase) after Phase 3 finishes. Probably 2-3 turns: pick indexing approach, build the data layer, wire it into the existing TransactionHistory component (which already has the filter/search UI).

### 2026-05-15 — Phase 3c Turn 1 — Backlog — Stale MerchantPortal ABI was missing contract surfaces

When Phase 3c began, `lib/abis/MerchantPortal.json` was stale relative to `contracts/MerchantPortal.sol`. Missing entries:
- Functions: `proposePayoutAddress`, `applyPayoutAddress`, `cancelPayoutAddressChange`, `applyProtocolFee`, `cancelProtocolFee`, `pendingPayoutAddress`, `pendingPayoutAddressEffectiveAt`, `pendingProtocolFeeAt`, `pendingProtocolFeeBps`, `PAYOUT_ADDRESS_DELAY`, `PROTOCOL_FEE_CHANGE_DELAY`
- Events: `PayoutAddressProposed`, `PayoutAddressProposalCancelled`, `ProtocolFeeProposed`, `ProtocolFeeCancelled`

**Fix applied in Phase 3c Turn 1:** Regenerated the ABI from the current contract source via `/tmp/abi-mp.js` (same pattern as Phase 2's `/tmp/abi-pqm.js`). All listed functions/events now present. Old ABI preserved as `MerchantPortal.json.bak` for reference.

**Severity:** Medium. Was blocking Phase 3c. Resolved this turn.

**Followup needed (release-gate item):** Add a CI step that diffs compiled ABIs against `lib/abis/*.json` and fails the build when they drift. Without this, future contract changes will land without ABI regeneration and the frontend will silently lose access to new functions.

### 2026-05-15 — Phase 3c Turn 1 — Backlog — useSetPayoutAddress hook deprecated, retained for test compatibility

The legacy `useSetPayoutAddress` hook in `hooks/useMerchantHooks.ts` calls the now-reverting `setPayoutAddress(address)` contract function. The contract enforces the new timelocked pipeline (`proposePayoutAddress` + `applyPayoutAddress` + `cancelPayoutAddressChange`); the legacy entrypoint reverts with `"MP: use proposePayoutAddress + applyPayoutAddress"`.

**Done this turn:**
- Removed the hook from `MerchantDashboard.tsx` (the only user-facing call site).
- Added a `@deprecated` JSDoc marker pointing to the new `usePayoutAddressChange`.
- Built `usePayoutAddressChange` + `PayoutAddressManager` UI.

**Still open:**
- The test file `hooks/__tests__/useMerchantHooksExtended.test.ts` still imports and tests the deprecated hook with mocks (no real EVM coverage). Once the test is updated or removed, the deprecated hook can be deleted entirely.
- Anyone importing `useSetPayoutAddress` from `lib/vfide-hooks` will hit a chain-level revert when they call it. The IDE deprecation marker prevents accidental new usage but doesn't catch existing imports outside this codebase.

**Severity:** Low. The user-facing path is fixed; this is cleanup.

**Followup needed:** Either update the test to use `usePayoutAddressChange` or remove it; then delete `useSetPayoutAddress` entirely. ~30 min of work.

### 2026-05-15 — Phase 3c Turn 1 — Backlog — Legacy setPayoutAddress contract function still in ABI

The contract retains `function setPayoutAddress(address) external onlyMerchant { revert("..."); }` as a revert stub for ABI compatibility. Frontend code calling this function gets a contract revert, not a static "this function no longer exists" error.

**Severity:** Low-info. By design (contract NatSpec: "Legacy entrypoint retained for ABI compatibility"). Removing it would break any external integrations that still expect the function selector to exist. Keeping the deprecated hook removed from UI plus the `@deprecated` marker on the hook is sufficient.

No action required.

### 2026-05-15 — Phase 3c Turn 2 — Backlog — Customer pull permit UI is missing (both setMerchantPullPermit and setMerchantPullPermitForToken)

Two customer-side pull-permit hooks exist (`useSetMerchantPullPermit` in `hooks/useMerchantHooks.ts`) but have ZERO UI consumers. The token-scoped variant (`setMerchantPullPermitForToken`) is not wired at all — not even as a hook. These allow a customer to authorize a merchant to pull payments up to a limit, with optional token-scoping and expiry. The token-scoped variant additionally enforces that the customer's vault has already approved the MerchantPortal as a spender for that specific token, preventing blind double-approvals.

**Severity:** Medium. The current payment flows (`payWithIntent`, direct-call `pay`) don't require these permits, so the absence isn't currently ship-blocking. But the contract surface clearly anticipates a UI where customers manage standing authorizations to merchants for recurring or trusted-merchant flows (e.g., subscriptions, regular vendors).

**What's needed:** A customer-side "Payment authorizations" page. Probably at `/vault/permits` or similar. Lets a customer:
- See current standing permits per merchant
- Issue a new permit (with optional token scoping + expiry)
- Revoke a permit (set maxAmount = 0)
- Build on `setMerchantPullPermit` + add the token-scoped variant for `setMerchantPullPermitForToken`

**Suggested action:** Scope as a mini-phase after Phase 3 exits, or fold into Phase 3.5 alongside the returns→refunds link and any other small customer-side surfaces. ~2-3 turns.

### 2026-05-15 — Phase 3c Turn 3 — RESOLVED Phase 3.5 — Systemic stale ABI issue: 14 ABIs missing 32 contract functions

**RESOLUTION (Phase 3.5 Turn 1, 2026-05-15):** All 14 stale ABIs regenerated, plus EscrowManager (15th, Hardhat-artifact-wrapped, discovered during exit sweep). Zero stale ABIs remain across the codebase. No function removals — all changes were purely additive. 160 hooks/components still parse cleanly. Backups preserved as `.bak` files.

**Remaining open item from this finding:** Add a CI step that diffs compiled ABIs against committed `lib/abis/*.json` files and fails the build on drift. Not blocking now (zero drift today), but prevents future regressions. Release-gate item.

---

Phase 3c Turn 3 exit audit ran a broader sweep comparing `lib/abis/*.json` function entries to their `contracts/*.sol` external/public declarations. Result: **14 of the ABIs are stale**, missing 32 functions total. Most are apply/cancel timelock pipeline entry points that were added to contracts after the ABIs were compiled.

The full list of stale ABIs and missing functions:

| Contract | Missing functions |
|---|---|
| VFIDETermLoan | settleLoanByInheritance |
| PayrollManager | applySeer, applySupportedToken, cancelSeerChange, cancelSupportedTokenChange, claimExpiredStreamBatch |
| CircuitBreaker | applyPriceOracle, cancelPriceOracle |
| AdminMultiSig | setVetoThreshold |
| RevenueSplitter | applyPayeesUpdate, cancelPayeesUpdate |
| EmergencyControl | applyThreshold, cancelThreshold |
| FeeDistributor | applyFeeSourceChange, cancelFeeSourceChange |
| GovernanceHooks | applyModules, cancelModules, claimOwnershipForDAO, proposeModules |
| EcosystemVault | claimHeadhunterQuarterReward, setReferralVaultHub |
| DAO | executeTimelockTx |
| DevReserveVestingVault | beneficiaryVaultAddress, emergencyUnfreeze |
| ProofLedger | applyDAO, applyLogger, cancelDAO, cancelLogger |
| VaultHub | isInMemorialState, isInheritanceActive |
| DutyDistributor | setMaxPointsPerUserPerDay |

**Consequences:**
- For each stale ABI, the corresponding contract enforces logic the frontend cannot call (e.g., DAO governance timelocks that need apply/cancel UI in Phase 4).
- Some functions are read-side helpers used by other contracts internally (e.g., VaultHub.isInMemorialState is called by VFIDECommerce.settleByInheritance) — these might not need frontend access, but the frontend can't even read them as views if needed.
- The Phase 3c Turn 1 finding (MerchantPortal stale ABI was a ship-breaker for the payout button) was symptomatic of this broader issue.

**Severity:** High. This is a release-gate issue. Multiple phases ahead (Phase 4 DAO governance work, Phase 5 FraudRegistry, etc.) will hit blocked work the moment audit confirms the ABI is missing surfaces.

**Resolutions:**
1. **One-time regeneration:** Compile all 14 ABIs from current contract sources, swap them in. Same pattern as Phase 2's CardBoundVaultPaymentQueueManager and Phase 3c Turn 1's MerchantPortal. Probably 1-2 turns of work (each contract has different imports, need to verify each compiles cleanly).
2. **Automated CI check:** Add a CI step that diffs compiled ABIs against `lib/abis/*.json` and fails the build on drift. Prevents future regressions.
3. **Both 1 and 2:** Recommended.

**Suggested action:** Open a focused mini-phase ("Phase 3.5: ABI sync") after Phase 3 finishes, before Phase 4 starts. 1-2 turns. Saves time on every subsequent phase that would otherwise hit the same issue.

### 2026-05-15 — Phase 3d Turn 1 — RESOLVED Phase 3d Turn 2 — CommerceEscrow emits zero events on state transitions

**RESOLUTION (Phase 3d Turn 2, 2026-05-15):** Added 6 events to CommerceEscrow covering all 7 state transitions (EscrowOpened, EscrowFunded, EscrowReleased, EscrowRefunded, EscrowDisputed, EscrowResolved). Indexed params on buyer/merchant addresses let the frontend filter to just the user's escrows via `getLogs`. Frontend `useEscrowList` rewritten to use event-based enumeration — O(1) per user instead of O(n) on protocol-wide escrow count. Zero functional changes to the contract (no new state, no changed access control, no changed transitions). 10 emit statements total (resolve emits 3 because of branch outcome events).

---

CommerceEscrow has seven distinct state transitions (open→OPEN, markFunded→FUNDED, release→RELEASED, refund→REFUNDED, cancelStaleOpen→REFUNDED, settleByInheritance→REFUNDED, dispute→DISPUTED, resolve→RESOLVED) and emits no events for any of them. Confirmed by grep against full contract body — zero `emit ...` statements, zero `event ...` declarations.

**Consequences:**
- The frontend cannot enumerate a buyer's or merchant's escrows via event scanning (the pattern useRefundHistory uses for refunds).
- `useEscrowList.ts` (Phase 3d Turn 1) works around this by iterating `escrows(id)` from 0 to `escrowCount - 1` and filtering. O(n) on total escrows across the protocol.
- We use multicall batching to keep latency acceptable. At ~50 escrows/multicall, even 10,000 protocol-wide escrows takes ~200 multicalls which is workable but slow on first load.
- No real-time updates possible — `useWatchContractEvent` has nothing to watch.
- Block explorers also can't decode state-transition history cleanly without function-call traces.

**Severity:** Medium. The workaround functions correctly for the small-escrow-count case (mainnet launch). Becomes increasingly slow as the protocol grows.

**Resolution options:**
1. **Contract fix (recommended):** Add events for all 7 state transitions:
   - `EscrowOpened(uint256 indexed id, address indexed buyer, address indexed merchant, uint256 amount, bytes32 metaHash)`
   - `EscrowFunded(uint256 indexed id, address indexed buyer)`
   - `EscrowReleased(uint256 indexed id, address indexed merchant)`
   - `EscrowRefunded(uint256 indexed id, address indexed buyer)` (covers refund + cancelStaleOpen + settleByInheritance-buyer)
   - `EscrowDisputed(uint256 indexed id, address indexed initiator, string reason)`
   - `EscrowResolved(uint256 indexed id, bool buyerWins)`
   With indexed parameters on the relevant addresses, frontend enumeration becomes O(1) per user.
2. **Public mapping fix:** Expose `buyerEscrowIds(address) → uint256[]` and `merchantEscrowIds(address) → uint256[]` (similar to MerchantPortal's customerRefunds/merchantRefunds, but without making them private). Or as paginated getter functions.
3. **Keep iteration:** Acceptable for low-volume launch, problematic at scale.

**Needs Vanta decision.** Recommended: option 1.

### 2026-05-15 — Phase 3d Turn 1 — RESOLVED Phase 3d Turn 3 — CommerceEscrow has no real-time funding path

**RESOLUTION (Phase 3d Turn 3, 2026-05-15):** Added one-click funding path via Option 1 architecture (after Option 4 ERC-1271 was found to bypass vault transfer limits). CardBoundVault gets `executeFundEscrow(intent, signature)` mirroring executePayMerchant's security pattern (nonce, walletEpoch, daily/per-tx limits, activeWallet check, pause/operational state, Seer enforcement). CommerceEscrow gets `openAndFundWithIntent` that creates the escrow record AND calls into the vault in one tx. Buyer signs one EIP-712 message → state goes directly to FUNDED. No timelock, no pre-approval. Pre-approval timelocked path (markFunded) remains available for power users. Security parity with executePayMerchant; only difference is no queueing (escrow funding is atomic by design).

---

`CommerceEscrow.markFunded(id)` does `token.safeTransferFrom(buyerVault, this, amount)`. The buyer's CardBoundVault must have approved CommerceEscrow as a spender for at least `amount` BEFORE markFunded is called.

The only way a CardBoundVault can grant such approval is via `approveERC20(token, spender, amount)`. Per the contract's own NatSpec: "Timelocked helper for explicit long-lived approvals. **Not intended for real-time merchant checkout flows.**" The timelock is `SENSITIVE_ADMIN_DELAY` (currently 72h).

**Consequences for UX:**
- A buyer cannot spontaneously check out with escrow protection. They must:
  1. Pre-propose an `approveERC20` for CommerceEscrow with a generous budget
  2. Wait 72 hours
  3. Apply the approval (Phase 2's pipeline UI)
  4. Only then can they `open` + `markFunded` an escrow in one session
- This eliminates online checkout as a use case for spontaneous purchases. Recurring or planned purchases work fine after the initial approval.
- The MerchantPortal direct-pay path (`pay`, `payWithIntent`) does NOT require this approval setup — but it provides zero escrow protection.

**Severity:** High for go-to-market — online checkout with escrow is a core advertised feature, but the realistic UX is "buyers must pre-approve before they can pay this way." Worth surfacing prominently in onboarding.

**Resolution options:**
1. **EIP-2612 permit-based path on CommerceEscrow:** Add `openAndFundWithPermit(merchant, amount, metaHash, v, r, s)` that combines the buyer signing a permit and the escrow pulling funds in one tx. Buyer EOA signs offchain, no pre-approval needed. Requires VFIDEToken to support permit (it does — confirmed at line 344 of VFIDEToken.sol).
2. **CardBoundVault.executeFundEscrow intent:** Mirror executePayMerchant — let the buyer sign an EIP-712 intent for escrow funding, vault executes instantly without timelock. Same security model as `executePayMerchant`. Requires a CommerceEscrow.fundFromVault counterparty.
3. **Pre-approval UX with clear onboarding:** Accept the limitation as-is, surface it heavily in the "Pay with escrow" flow. "First time using escrow? Set up your one-time approval (24-72h wait), then escrow checkouts are instant."

**Needs Vanta decision.** Recommended: option 1 (permit-based) — smallest change, most natural UX.

### 2026-05-16 — Phase 4 Turn 3 — Backlog — Orphaned /api/proposals endpoint

The `app/api/proposals/route.ts` endpoint stored DAO proposals in an off-chain Postgres database via the old `CreateTab` POST flow. Phase 4 Turn 3 rewrote `CreateTab` to call the DAO contract's `propose()` directly, leaving the endpoint with no consumers (verified by greps across `app/`, `components/`, `hooks/`).

The endpoint still exposes GET and POST handlers, plus rate limiting and validation logic. The associated DB schema is unknown to the on-chain DAO and never was synchronized — any proposals submitted through it never appeared in `getActiveProposals` or any other DAO state.

**Severity:** Low (dead code / orphaned API surface; no security risk because the DB-backed records are inert from the chain's perspective)
**Suggested action:** Tier 2 cleanup pass — delete the route file, the DB table, and the schema definition. Confirm no analytics or external monitoring consumes the endpoint before deletion.

### 2026-05-16 — Phase 4 Turn 4 — Backlog — Indexer-based governance analytics

The StatsTab built in Turn 4 shows protocol-level reads (proposal counts, voting parameters, voter participation), but aggregate analytics — pass/fail rate over time windows, category breakdown by ProposalType, top-voters leaderboard — require enumerating every past proposal + aggregating Voted events. Doing that client-side is O(N) RPC calls and doesn't scale beyond ~100 proposals.

The clean solution is an off-chain indexer pulling DAO events into Postgres, then exposing aggregates via an internal API. The existing `/api/proposals` endpoint (orphaned by Turn 3) could be repurposed for indexer-backed stats.

**Severity:** Low (current StatsTab shows protocol-level reads correctly; aggregate metrics are nice-to-have for V1)
**Suggested action:** Build a minimal indexer in Tier 2 — Hardhat-style event subscription writing to a `dao_events` table. Expose aggregates (`/api/governance/stats?window=30d`) read by StatsTab via standard fetch.

### 2026-05-16 — Phase 4 Turn 4 — Backlog — HistoryTab decode positions were wrong

Found during the Turn 4 audit pass. `HistoryTab.tsx` was decoding `getProposalDetails` with wrong tuple positions: treating `endTime` (index 6) as `votesFor`, `forVotes` (index 7) as `votesAgainst`, `againstVotes` (index 8) as `endTime`, and `queued` (index 10) as `cancelled` (which doesn't exist on the contract).

Effect: every vote history entry displayed wrong vote totals and wrong status inferences. The contract has no `cancelled` field — defeated proposals are inferred from "ended without execution without majority FOR." Most entries would have appeared with status "rejected" regardless of actual outcome.

**Severity:** Medium (visible incorrect data, user-facing)
**Suggested action:** Fixed in Turn 4 as a <2-hour mechanical correction. This entry is a record of the finding.
**Status:** ✅ Resolved in Phase 4 Turn 4 (2026-05-16).
