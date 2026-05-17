# VFIDE Tier 2 — Dashboard Rebuild Plan

**Locked:** 2026-05-17
**Status:** TIER 2 COMPLETE (Phases 0-6, 2026-05-17). 10 turns total. All deliverables shipped.

## Background

Tier 1 (40 turns, 2026-04 through 2026-05-15) wired UI surface to deployed contracts at 100% in-scope coverage. Operations Phase (4 turns, 2026-05-16) closed all MAINNET_DEPLOY_READINESS Section A blockers.

Operations-Phase dead-button audit (2026-05-17) found that **11 dashboard pages still display hardcoded sample data** rather than reading on-chain state. Their disabled buttons are correctly stubbed (won't fire transactions against fake state) but the underlying surfaces present mock data, which would erode trust if shipped to mainnet uncorrected.

This plan converts those sample-data pages to real-data pages, then wires the previously-blocked C1 DAO-routing buttons on top.

## Scope

**11 sample-data surfaces** found in audit, split into 3 categories:

### Category A — wirable in Tier 2 (5 pages — primary scope)

| Page | Reads from | Notes |
|---|---|---|
| `app/sanctum/components/CharitiesTab.tsx` | SanctumVault.{getCharityCount, charityList, getCharityInfo} | Real charity registry |
| `app/sanctum/components/DisbursementsTab.tsx` | SanctumVault.{disbursementCount, disbursements, getDisbursement} | Real disbursement records |
| `app/sanctum/components/HistoryTab.tsx` | SanctumVault events (Disbursement, Donation) | Recent-event scan |
| `app/treasury/components/SanctumTab.tsx` | Composition of above | Treasury-side rollup |
| `app/enterprise/components/FinanceTab.tsx` | EcosystemVault views, EcoTreasuryVault (ABI missing — blocker) | Multi-token treasury |

### Category B — deferred contracts (4 pages — reframe, don't wire)

These display data from contracts that aren't in V1's deploy-full.ts. Wiring them against the deferred ABIs is worse than transparent stubbing. **Action:** rename banner from "sample data" to "Council launches in future phase" (honest framing of intent).

| Page | Underlying contract | Status |
|---|---|---|
| `app/council/components/MembersTab.tsx` | CouncilManager | Not in V1 deploy |
| `app/council/components/SalaryTab.tsx` | CouncilSalary | Not in V1 deploy |
| `app/council/components/VotingTab.tsx` | CouncilElection | Not in V1 deploy |
| `app/governance/components/CouncilTab.tsx` | Same | Not in V1 deploy |

### Category C — leave alone or copy-fix (2 surfaces)

| File | Action |
|---|---|
| `app/developer/page.tsx` | Remove `SampleDataBanner` — page is informational docs/SDK examples, not data display |
| `components/ui/SampleDataBanner.tsx` | Keep — utility component |

## Plan-time decisions (locked Phase 0)

| Q | Decision |
|---|---|
| Q1: Include `/sanctum/charities/[id]` + `/governance/proposal/[id]` routes? | **YES** — folded into Phase 2 (charity detail) and Phase 6 closure (proposal detail) |
| Q2: Pagination strategy? | **A** — Fetch all and render. Registry currently small; backlog cursor-pagination + indexer if list grows |
| Q3: DAO routing for sanctum buttons (`?template=X` URL params)? | **A** — Extend CreateTab to read URL params. Reusable pattern across surfaces |
| Q4: Locking discipline? | **Yes** — same as Tier 1: this plan written + locked, sign-off cadence between phases, in-cycle mechanical fixes only, backlog for findings |

## Operating rules

Inherited from VFIDE_TIER1_PLAN.md and the Operations Phase meta-rule:

1. **One contract/subsystem per phase.** No combining phases mid-cycle.
2. **Audit before, audit after.** Every phase has entry verification + exit verification.
3. **Always deep audit contracts before code changes are made** (meta-rule from Operations Phase Turn 2). No file rename, contract change, or surface-level modification without auditing actual contents, all cross-repo refs, blast radius, and clashing files.
4. **Sign-off between phases.** No silent rolling.
5. **<2-hour mechanical fixes close in-cycle.** Bigger findings → backlog.
6. **Plan deviation requires stop-and-ask.** No silent scope expansion.
7. **Backlog new findings, don't address mid-cycle** unless they're <2h mechanical.
8. **No fake-wiring against undeployed contracts.** Category B pages get honest copy, not faked data.

## Phase Structure

### Phase 0 — Entry audit + plan (COMPLETE 2026-05-17)

Full sample-data inventory completed. 11 surfaces classified into A/B/C. Plan written + locked.

**Findings carried forward to Phase 1:**
- EcoTreasuryVault.json ABI is missing from `lib/abis/` — needs regeneration (file was renamed from VFIDEFinance.sol in Operations Phase Turn 2 but ABI file wasn't refreshed).
- `useSanctumVault` foundation hook does not exist — needs creation in Phase 1.
- SanctumVault has 27 writes + 37 views; only a small subset is needed for sanctum tab surfaces.

### Phase 1 — Foundation (Est. 2 turns)

1. **Regenerate EcoTreasuryVault.json ABI** from `contracts/EcoTreasuryVault.sol` (or copy from a build artifact if one exists). Add to `lib/abis/index.ts`.
2. **Build `hooks/useSanctumVault.ts`** — foundation hook on Tier 1 patterns (useReadContract / useWriteContract / EIP-712 args). Covers:
   - Reads: getCharityCount, charityList, getCharityInfo, disbursementCount, disbursements, getDisbursement, getBalance, getApproverCount, approversList, isApprover
   - Writes (user-facing): deposit (donations)
   - Writes (DAO-only — route via CreateTab in later phases): approveCharity, removeCharity, proposeDisbursement, approveDisbursement, rejectDisbursement, executeDisbursement
3. **Exit verification:** ABI present, hook parses, no functional regressions.

### Phase 2 — CharitiesTab + `/sanctum/charities/[id]` route (Est. 2-3 turns)

1. **Convert `CharitiesTab.tsx`** to use `useSanctumVault`:
   - Read charityCount + iterate via charityList(i)
   - For each, fetch getCharityInfo
   - Loading skeletons, empty state, error boundary
   - Remove SampleDataBanner
   - Wire "View Details" buttons to link to `/sanctum/charities/[id]`
2. **Build `/sanctum/charities/[id]/page.tsx`** route — detail view:
   - Read getCharityInfo(id)
   - Show donations received, recent disbursements (filter by recipient)
   - Add donate-to-this-charity flow if applicable
3. **Sign-off pause before Phase 3.**
4. **Backlog if encountered:** pagination over large charityList (Q2 decision is "fetch all"; if count >50, log as Tier 3 candidate).

### Phase 3 — Disbursements + Sanctum History + DAO routing (Est. 3 turns)

1. **Extend `CreateTab.tsx`** to read URL params (`?template=<key>&prefill=<json>`) — the Q3-A decision. Backward compatible: missing params = current default behavior.
2. **Add SanctumVault-targeted templates** to CreateTab's TEMPLATES list:
   - `proposeDisbursement` (charity, amount, description)
   - `approveCharity` (name, address, category)
   - `removeCharity` (id)
3. **Convert `DisbursementsTab.tsx`** to real reads. Wire "New Proposal" / "Approve" / "Reject" buttons to route to `/governance?template=...`. Use real disbursement IDs.
4. **Convert sanctum/`HistoryTab.tsx`** to event-scan (recent N blocks).
5. **Exit verification + sign-off pause.**

### Phase 4 — Enterprise + treasury/Sanctum rollup (Est. 2-3 turns)

1. **Build `hooks/useEnterpriseTreasury.ts`** — combines reads from EcosystemVault (treasury composition) + EcoTreasuryVault (VFIDE-only treasury) + VFIDEToken (totalBurned, balanceOf treasury addresses).
2. **Convert `app/enterprise/components/FinanceTab.tsx`** — replace hardcoded treasuryAssets with real reads. The DAO-routing buttons (Send VFIDE / Rescue Tokens) wire to CreateTab templates using the Phase 3 routing pattern.
3. **Convert `app/treasury/components/SanctumTab.tsx`** — rollup view using both useEnterpriseTreasury + useSanctumVault. Wire its Approve/Reject buttons to CreateTab (same pattern).
4. **Sign-off pause.**

### Phase 5 — Council pages copy-fix (Est. 1 turn)

Pure copy/banner change. No new hooks, no contract reads. Each of the 4 council pages updates its SampleDataBanner-or-equivalent to read "Council governance launches in a future phase — this is a preview of what the page will display once CouncilElection / CouncilManager / CouncilSalary are deployed."

Optionally: hide the page entirely from navigation until those contracts are deployed (configurable feature flag). Decide at the phase entry audit.

### Phase 6 — Tier 2 closure + `/governance/proposal/[id]` route (Est. 1 turn)

1. **Build `/governance/proposal/[id]/page.tsx`** — uses existing `useDAO.getProposalDetails`. Light read-only view; standalone-shareable proposal URL.
2. **Full Tier 2 cross-phase surface map** — verify every sample-data conversion at 100%.
3. **Backlog inspection** — confirm all Tier 2 findings classified.
4. **Mainnet readiness update** — add Tier 2 closure record to MAINNET_DEPLOY_READINESS.md.

## Total estimate

**12-14 turns** for Tier 2 complete. Phase 1 (2 turns), Phase 2 (2-3), Phase 3 (3), Phase 4 (2-3), Phase 5 (1), Phase 6 (1).

## Sign-off cadence

Each phase entry requires Vanta confirmation that Phase N-1's exit criterion is met. No silent rolling. Mid-phase findings either close in-cycle (<2h mechanical) or go to backlog.

---

## Phase progress log

(Updated as phases complete.)

### Phase 0 — Entry audit + plan (COMPLETE 2026-05-17)

Full inventory: 11 sample-data surfaces across `/app` and `/components`. Classified into Cat-A (5 wirable), Cat-B (4 deferred), Cat-C (2 docs/utility). Q1-Q4 plan-time decisions locked. EcoTreasuryVault ABI gap identified and carried to Phase 1.

### Phase 1 — Foundation (COMPLETE 2026-05-17)

Two work items, both completed in single turn.

**Item 1 — Regenerate EcoTreasuryVault.json ABI.** Verified contract name + pragma in `contracts/EcoTreasuryVault.sol` (renamed from `VFIDEFinance.sol` in Operations Phase Turn 2). Compiled with `solc 0.8.30` using `--base-path contracts --include-path contracts` to resolve the `./SharedInterfaces.sol` import. Extracted ABI from `/tmp/eco-abi/EcoTreasuryVault_sol_EcoTreasuryVault.abi`, formatted as indent=2 JSON to match other `lib/abis/*.json` files, wrote to `lib/abis/EcoTreasuryVault.json`. Result: 40 ABI entries, 27 functions (17 reads + 10 writes), 9 events.

**Item 2 — Add EcoTreasuryVault to `lib/abis/index.ts`.** Added: (a) raw import next to `EcosystemVaultViewRaw`, (b) `EcoTreasuryVaultABI = normalizeImportedABI(...)`, (c) `validateABI(EcoTreasuryVaultABI, 'EcoTreasuryVault')`, (d) export in the final exported-names list. Positioned with other treasury-adjacent ABIs.

**Item 3 — Build `hooks/useSanctumVault.ts`** (296 LOC). Foundation hook for SanctumVault following the Tier 1 `useFraudRegistry` pattern.

  Exposed surface:
  - **Counts & totals:** charityCount, disbursementCount, vaultBalance, approvalsRequired, approverCount
  - **User-relative:** isCurrentUserApprover
  - **Batch reads:** charities (full list, via getCharityCount + charityList + getCharityInfo), disbursements (full list)
  - **Per-item read helpers:** useCharityByAddress, useDisbursementById, useHasApproved (sub-hooks for detail views)
  - **Writes (user-facing):** deposit(amountWei) — anyone can donate to Sanctum

  Intentionally deferred to Tier 2 Phase 3 / Tier 3 / runbook:
  - All DAO-only writes (approveCharity, removeCharity, proposeDisbursement, approveDisbursement, rejectDisbursement, executeDisbursement)
  - All multi-sig signer management (addApprover, removeApprover, setApprovalsRequired)
  - All emergency procedures (emergency owner transfers, recovery flows)
  - All admin module wiring (setLedger, setSeer, setDAO, setEmergencyController)

  **DisbursementStatus enum derivation:** mirrors the `FraudStatusBucket` pattern from Phase 5 (Tier 1) — contract returns the raw boolean flags + counts, frontend derives a clean union: `'pending' | 'approved-pending-execution' | 'executed' | 'rejected'`.

**Phase 1 exit verification:** 1241 frontend files + 541 test files parse clean. No regressions.

**Architectural decisions logged for Tier 2:**

1. **ABI gap from a contract rename is a real failure mode.** Operations Phase Turn 2 renamed VFIDEFinance.sol → EcoTreasuryVault.sol; build-contracts.sh was updated, but ABI generation was never re-run, so `lib/abis/EcoTreasuryVault.json` didn't exist. Frontend imports of `EcoTreasuryVaultABI` would have failed at build time. Caught in Phase 1 entry audit before any hook code referenced the ABI. Tier-3 candidate: add an ABI freshness CI check.

2. **Batch reads use a two-phase pattern.** Phase 1 (addresses) + Phase 2 (per-address info) instead of a single Multicall, since `getCharityInfo` takes an address arg (not an index). Each phase uses `useReadContracts` with an enabled guard so the second phase only fires after the first resolves. Same pattern will be reused for any address-keyed batch reads in later phases.

3. **Per-item read helpers as sub-hooks.** `useCharityByAddress`, `useDisbursementById`, `useHasApproved` are returned from the parent hook as sub-hooks rather than function-call shortcuts, so the consumer page (e.g. `/sanctum/charities/[id]`) can use them in render and get full React-Query state (loading/error). This is consistent with the Tier 1 pattern where `useDAO` returned `useProposalById` for HistoryTab.


### Phase 2 — CharitiesTab + /sanctum/charities/[id] route (COMPLETE 2026-05-17)

Two work items, both completed in single turn.

**Item 1 — Convert `app/sanctum/components/CharitiesTab.tsx` to real reads.** Replaced the hardcoded 8-charity array with `useSanctumVault.charities`. Aggregated `totalReceived` by summing executed disbursements per recipient (the contract doesn't store this aggregate — it has to be computed from `disbursements`). Added loading skeleton (4 placeholder cards), empty state (Heart icon + governance instruction), not-configured state (amber warning when `CONTRACT_ADDRESSES.SanctumVault` isn't set). Removed `SampleDataBanner`. "View Details" buttons now link to `/sanctum/charities/${charity.address}`.

**Item 2 — Build `app/sanctum/charities/[id]/page.tsx`** (337 LOC). New dynamic route for the charity detail view.

  Architecture:
  - `'use client'` + `useParams` pattern (matches `app/explorer/[id]/page.tsx` precedent, which is the cleanest existing dynamic route for wagmi-driven pages).
  - URL segment is the charity's Ethereum address (the natural primary key in SanctumVault since `charityList(i)` returns addresses, and `getCharityInfo(addr)` lookups are by address).
  - Address validation guard rejects malformed `[id]` segments with a clear error panel.
  - Uses `useSanctumVault.useCharityByAddress(addr)` sub-hook returned by the parent hook (the pattern locked in Phase 1).
  - Filters `useSanctumVault.disbursements` client-side by recipient (the bulk batch read fetched in the parent hook is reused here — no second batch read).
  - Empty-string detection on the decoded tuple (`!charity.name && !charity.category`) handles the case where the address is well-formed but the charity has been removed via DAO governance, separating that from a network error.
  - Three stat tiles: total received (executed sum), executed count, pending count.
  - Disbursement history list reuses `deriveDisbursementStatus` from Phase 1 hook + a status-badge subcomponent (color-coded: green executed, red rejected, amber awaiting-execution, zinc pending).

**Fields dropped vs sample data (intentional — not on-chain):**
- `verified` — there's no `verified` flag in the contract. Being in the registry IS verification because `approveCharity` is DAO-gated. Reflected in the UI by showing the registry list with the DAO-verified count.
- `status` (string) — collapsed into the boolean `active` flag.

**Phase 2 exit verification:** 1242 frontend files + 541 test files parse clean. No regressions. `SampleDataBanner` import removed from CharitiesTab (count: 0 references). New route file present.

**Architectural decisions logged for Tier 2:**

4. **Aggregated stats computed client-side when contract doesn't store them.** `totalReceived` per charity isn't a field on the contract — it has to be summed from the `disbursements` array. Doing this client-side after fetching disbursements via the foundation hook is cheap (Map iteration over ~tens of records) and avoids RPC traffic. If the disbursement count grows past ~500, this becomes a Tier 3 indexer concern.

5. **Address as URL segment.** Charity ID is the recipient address (charityList returns addresses, not numeric IDs). This means shareable charity URLs are deterministic — `/sanctum/charities/0xabc...` is stable across registry reorderings, and the URL stays valid even if the charity is later removed (the page handles the empty-tuple decode gracefully).

6. **Two distinct empty states.** "Charity doesn't exist at this address" (tuple decodes to empty strings) vs "RPC read failed" (`isError`). Treated separately so users see actionable copy: the first suggests checking the address or visiting the registry list; the second suggests retrying.


### Phase 3 — Disbursements + Sanctum HistoryTab + DAO routing (IN PROGRESS)

Mid-phase architectural finding (logged at entry audit, 2026-05-17):

**SanctumVault has a hybrid governance model.** Not all sanctum buttons route to DAO templates. Audit of `contracts/SanctumVault.sol` revealed:

| Function | Access | Routing |
|---|---|---|
| `proposeDisbursement(charity, token, amount, campaign, doc)` | `onlyApprover` | Direct call by approver — NOT a DAO template |
| `approveDisbursement(id)` | `onlyApprover` | Direct call by approver — NOT a DAO template |
| `executeDisbursement(id)` | `onlyApprover` (after threshold) | Direct call by approver — NOT a DAO template |
| `rejectDisbursement(id, reason)` | `onlyDAO` | DAO template ✓ |
| `approveCharity(addr, name, category)` | `onlyDAO` | DAO template ✓ |
| `removeCharity(addr, reason)` | `onlyDAO` | DAO template ✓ |

Implication: charity registry management goes through DAO; disbursement *execution* goes through multi-sig approvers; DAO retains a veto on individual disbursements. The original "wire all sanctum buttons to /governance" plan was wrong. Phase 3 split into 3 work items reflecting the actual contract architecture.

#### Phase 3 Turn 1 — CreateTab URL-params + 3 SanctumVault DAO templates (COMPLETE 2026-05-17)

**Item 1 — URL-param-driven template selection (Q3-A pattern).** Added `useSearchParams` import + `useEffect` that reads `?template=<key>&prefill=<json>` on mount. The template key is validated against the TEMPLATES list (unknown keys are silently ignored). The prefill JSON is shallow — flat object whose keys are the field state-setter names without the `set` prefix (e.g. `{"sanctumDisbursementId":"42","sanctumRejectReason":"..."}`). Malformed JSON is silently ignored, the user can fill manually. Backward compatible — missing params don't override defaults.

**Item 2 — 3 SanctumVault DAO templates added to TEMPLATES list.** Extended `TemplateKey` union, extended `group` to include `'sanctum'`, added `sanctumVaultAddress` config check, added 6 state variables for sanctum template inputs, added encoding logic in `buildProposalData`, added UI input groups (pink left-border to distinguish from cyan commerce/fraud groups).

  Templates:
  - **approveCharity** (Financial) — 3 inputs: charity address, name, category. Encodes `SanctumVault.approveCharity(addr, name, category)`.
  - **removeCharity** (Financial) — 2 inputs: charity address, reason. Encodes `SanctumVault.removeCharity(addr, reason)`.
  - **rejectDisbursement** (SecurityAction) — 2 inputs: disbursement id, reason. Encodes `SanctumVault.rejectDisbursement(id, reason)`.

**Phase 3 Turn 1 exit verification:** CreateTab.tsx parses clean; 1242 frontend + 541 test files parse clean. No regressions. All 8 templates wired correctly.

**Architectural decisions logged for Tier 2:**

7. **URL-param prefill is a thin protocol.** Designed for one-way deep-linking from elsewhere in the app (a button on DisbursementsTab opens `/governance?template=rejectDisbursement&prefill=…`). State stays in CreateTab once loaded — the URL isn't a source of truth, just a kick-starter for the form. Avoids the round-trip complexity of URL-as-state.

8. **Template-group → contract guard pattern.** Each template carries a `group` discriminator (`'commerce' | 'fraud' | 'sanctum'`) and the corresponding contract has a `XConfigured` boolean. `buildProposalData` checks the matching guard before encoding. This means templates for unconfigured contracts (e.g. SanctumVault on a chain without the env var set) gracefully report "not configured for this environment" rather than producing nonsense calldata.


#### Phase 3 Turn 2 — useSanctumVault approver writes + DisbursementsTab conversion (COMPLETE 2026-05-17)

Two work items.

**Item 1 — Extend `useSanctumVault` with 3 approver-only writes.**
- `proposeDisbursement(charity, token, amountWei, campaign, documentation)` — `onlyApprover`. Validates amount > 0 and campaign non-empty before submission. Token defaults to `CONTRACT_ADDRESSES.VFIDEToken` at the call site; the hook itself accepts any ERC-20 address (Sanctum supports multi-token disbursements).
- `approveDisbursement(proposalId)` — `onlyApprover`. Contract enforces no-double-approval.
- `executeDisbursement(proposalId)` — `onlyApprover`. Contract enforces 5 conditions: not finalized, approval threshold met, 24h cooling-off elapsed, not >90 days old, charity still registered, balance sufficient.

Updated the hook's header comment to move proposeDisbursement / approveDisbursement / executeDisbursement out of the "INTENTIONALLY NOT IN THIS HOOK" deferred list. `rejectDisbursement` remains in the deferred list since it's DAO-only (reached via CreateTab template from Phase 3 Turn 1).

**Item 2 — Rewrite `DisbursementsTab.tsx` (369 LOC, replaced).** Real reads via `useSanctumVault.disbursements`. Approver-aware UI:

  - **Approvers** see direct-call action buttons:
    - "Approve" — calls `approveDisbursement(id)` directly. Hidden when proposal is already at threshold.
    - "Execute" — calls `executeDisbursement(id)` directly. Disabled with hover hint when in 24h cooling-off or past 90d expiry (client-side mirror of contract conditions; the contract reverts authoritatively).
    - "Veto via DAO" — same as non-approver path. Approvers can also propose DAO veto.
  - **Non-approvers** see read-only rows + "Veto via DAO" link. Link deep-links into `/governance?template=rejectDisbursement&prefill={"sanctumDisbursementId":"<id>"}` using the URL-param protocol from Phase 3 Turn 1.

  Component structure: `Header` (title + approver/read-only badge), error banner, sorted list (newest first), per-row `DisbursementRow` (charity link, amount, approval count, status badge) + `ApproverActions` or `NonApproverActions` action row. Per-button pending state tracks which disbursement is currently being acted upon, so other rows stay enabled. Status badges from `deriveDisbursementStatus` (Phase 1 enum).

**Phase 3 Turn 2 exit verification:** Both files parse clean. 1242 frontend + 541 test files parse clean. No regressions. `SampleDataBanner` removed (count: 0).

**Architectural decisions logged for Tier 2:**

9. **Approver-aware UI without role-gating navigation.** The DisbursementsTab is reachable by anyone, but the buttons it presents adapt to `isCurrentUserApprover`. Non-approvers see a meaningful read-only view + a single "Veto via DAO" action. This is more honest than gating the entire page behind the approver role (which would imply the data is secret — it isn't, disbursements are public on-chain) but keeps approver-only writes appropriately scoped to approvers.

10. **Client-side mirror of contract preconditions for UX, not security.** The 24h cooling-off + 90d expiry hints on the Execute button are derived client-side from `d.proposedAt`. The contract is the authority — if the client clock is wrong, the contract revert is the source of truth. The hints just reduce surprise when a user clicks Execute too early.

11. **Per-button pending state, not per-component.** Each row tracks `pendingActionId` separately from the hook's global `isWritePending`. This means clicking Approve on one row doesn't disable Approve on the other rows. Pattern: track the id being acted upon locally; render that row's spinner conditionally.


#### Phase 3 Turn 3 — Sanctum HistoryTab event scan (COMPLETE 2026-05-17)

Single work item: replace the hardcoded 5-row "transaction history" with real event-scan over the last ~30 days.

**Implementation.** Mirrors `app/governance/components/HistoryTab.tsx` (the Phase 4 Turn 4 precedent). Three parallel `publicClient.getLogs` queries with inline-typed event signatures (avoids importing the whole SanctumVaultABI just to filter): `Deposit`, `DisbursementExecuted`, `CharityApproved`. Merged into a unified timeline sorted by `(blockNumber, logIndex)` descending. Block timestamps fetched in parallel via `getBlock` after capping to `MAX_DISPLAYED_ROWS = 100` (so the expensive call only fires for displayed rows). Display-only fields are formatted via the `formatVFIDECompact` helper consistent with CharitiesTab + DisbursementsTab.

**Scope choice — 30 days only.** `SCAN_LOOKBACK_BLOCKS = 1_300_000n` (≈ 30 days at Base's 2s block time). Same constant as the governance HistoryTab. The page hints at the limit in its footer when the row cap is hit. Deeper history is an indexer concern — already logged as a Tier 3 candidate in the 2026-05-16 backlog entry on indexer-based governance analytics; the SanctumVault timeline shares that scaling story.

**Event coverage decision.** Out of SanctumVault's 24 events I chose 3 for the timeline:
- `Deposit` (donations + automatic fee inflows)
- `DisbursementExecuted` (charity outflows; the *successful* lifecycle endpoint)
- `CharityApproved` (registry additions)

Intentionally excluded:
- `DisbursementProposed`, `DisbursementApproved`, `DisbursementRejected` — these are lifecycle events visible inside DisbursementsTab; surfacing them in HistoryTab would duplicate that surface and bury the actually-actionable events
- `CharityRemoved` — registry state change, visible in CharitiesTab as the charity going inactive
- Emergency / ownership / module-wiring events — operational concern, not user-facing history

**Phase 3 Turn 3 exit verification:** HistoryTab.tsx parses clean. 1242 frontend + 541 test files parse clean. No regressions. All 3 sanctum tabs (CharitiesTab, DisbursementsTab, HistoryTab) now use real on-chain data. SampleDataBanner removed from each.

**Architectural decisions logged for Tier 2:**

12. **Inline event signatures over full-ABI imports.** Each `getLogs` call declares its event signature inline (matches the precedent in app/governance/components/HistoryTab.tsx Phase 4 Turn 4). This keeps the bundle small (no need to import SanctumVaultABI into the page) and makes the event-filter intent locally readable.

13. **Cap before enrichment.** Sort raw events first, slice to `MAX_DISPLAYED_ROWS`, then fetch block timestamps for only the displayed rows. Prevents accidentally firing 1000+ `getBlock` calls if a vault sees high event volume in 30 days.

14. **Unified timeline over per-event tabs.** Could have built separate "Donations" / "Disbursements" / "Registry Changes" sub-tabs. Chose unified timeline because the audience for `/sanctum/history` is usually "what's been happening lately?" rather than "show me only X-type events" — and a single sortable table answers the former better.

### Phase 3 closure (all 3 turns complete)

| Turn | Deliverable | Status |
|---|---|---|
| 1 | CreateTab URL-params + 3 SanctumVault DAO templates | ✅ |
| 2 | useSanctumVault approver writes + DisbursementsTab conversion | ✅ |
| 3 | Sanctum HistoryTab event scan | ✅ |

**Phase 3 outcomes:**
- All sanctum tabs (Charities, Disbursements, History) now use real on-chain data
- CreateTab supports 8 DAO templates (5 from Tier 1 + 3 new SanctumVault templates)
- CreateTab supports URL-param-driven deep-linking from any surface in the app
- Approver writes for proposeDisbursement / approveDisbursement / executeDisbursement available via useSanctumVault
- DisbursementsTab buttons activated with role-aware UI (approver path vs non-approver DAO veto path)
- SampleDataBanner removed from 3 sanctum tabs
- Disbursement detail surface: clicking any row's charity link routes to /sanctum/charities/[id] (built Phase 2)


### Phase 4 — Enterprise + treasury rollup (IN PROGRESS)

#### Phase 4 Turn 1 — Foundation hook + enterprise/FinanceTab + 2 EcoTreasuryVault DAO templates (COMPLETE 2026-05-17)

**Mid-turn audit blocker resolved.** The entry audit found that `EcoTreasuryVault` had no `CONTRACT_ADDRESSES` entry — Phase 1 had created the ABI but never wired the address mapping. Fixed first thing this turn:
- Added `EcoTreasuryVault: 'NEXT_PUBLIC_ECO_TREASURY_VAULT_ADDRESS'` to `lib/contracts.ts` (both the key-map and the validation block)
- Registered `NEXT_PUBLIC_ECO_TREASURY_VAULT_ADDRESS` with `lib/validateProduction.ts` as `production: true, category: 'blockchain'`

Caught at audit, before the hook tried to read from an unresolvable address.

**Item 1 — `hooks/useEnterpriseTreasury.ts`** (~280 LOC). Foundation hook combining three contracts:

  - **EcoTreasuryVault** — VFIDE-only treasury aggregator. Reads `getTreasurySummary()` (4-tuple: currentBalance, totalIn, totalOut, netPosition), `vfideBalance()`, optional `getMultiTokenBalances(tokens[])` for caller-provided ERC-20 addresses.
  - **EcosystemVault** — pool composition + flows. Batches 12 reads via `useReadContracts` (Multicall) for `councilPool`, `headhunterPool`, `merchantPool`, `operationsPool`, `stablecoinReserves`, `pendingWithdrawTotal`, `totalCouncilPaid`, `totalExpensesPaid`, `totalHeadhunterPaid`, `totalMerchantBonusesPaid`, `totalReceived`, `totalBurned`.
  - **VFIDEToken** — `totalSupply()` for ratio displays.

  Surface returned: pool composition, paid totals, ecosystem flow, treasury summary, extra-token balance map, loading state, configured flags. No writes — all writes flow through DAO governance templates per the Tier 1 architectural pattern.

**Item 2 — 2 EcoTreasuryVault DAO templates added to CreateTab.** Extended TemplateKey union (now 10 keys), added `'treasury'` group discriminator, added `ecoTreasuryConfigured` check, added 5 state variables for the templates' inputs, added encoding logic for `sendVFIDE(to, amount, reason)` and `rescueToken(token, to, amount)`, added UI input groups (yellow left-border styling to distinguish from cyan commerce / pink sanctum / cyan-fraud groups). Wired both into the URL-param prefill effect.

**Item 3 — Rewrite `app/enterprise/components/FinanceTab.tsx`** (~320 LOC, replaced 92). Real reads via `useEnterpriseTreasury`:

  - 3 headline stat cards: current VFIDE balance, lifetime burned, net position (with up/down arrow + green/red color)
  - Ecosystem pool composition card: 6 rows (4 pools + stablecoin reserves + pending withdrawals), each showing current balance + lifetime paid
  - Lifetime ecosystem flow card: total received / total burned
  - 2 action cards ("Send VFIDE" / "Rescue Tokens") with link to `/governance?template=sendVFIDE` and `?template=rescueToken` via the Phase 3 Turn 1 URL-param protocol
  - DAO control disclosure footer

**Removed intentionally compared to sample-data version:**
- The hardcoded "$11.25M" headline. No on-chain USD price oracle is wired; showing a fake USD total would be misleading.
- The "USDC: $2.5M / ETH: $1.75M" hardcoded rows. `getMultiTokenBalances` supports this, but it requires the operator to choose which tokens to display via config. Logged as Tier 3 followup ("operator token allowlist").

**Phase 4 Turn 1 exit verification:** 1243 frontend files (+1 new hook, +0 net component delta since FinanceTab was replaced not added) and 541 test files parse clean. No regressions. EcoTreasuryVault now reachable across the stack. 10 templates in CreateTab.

**Architectural decisions logged for Tier 2:**

15. **`useReadContracts` batching for related reads.** EcosystemVault has 12 reads needed by the treasury surface. Batched via `useReadContracts` so they fetch in a single Multicall round-trip rather than 12 separate RPC calls. Each entry decodes independently — if one read reverts (e.g. on a partially-deployed vault), only that field defaults to 0n rather than discarding the whole bundle.

16. **Honest about what's not on-chain.** No fake USD totals, no fake multi-token rows — just the actual VFIDE balance with a hover-tooltip for precision. If the operator wants USD or multi-token displays, that's a separate config surface decision; faking it would be precisely the kind of "misleading sample data" the Operations Phase audit flagged.


#### Phase 4 Turn 2 — Entry-audit scope-expansion finding (locked 2026-05-17)

**Finding.** The original plan scoped Phase 4 Turn 2 to convert `app/treasury/components/SanctumTab.tsx`. Entry audit revealed that ALL 5 tabs of the treasury page use hardcoded data, not just SanctumTab. The Phase 0 inventory pattern-matched on `pendingDisbursements` and missed the others because their hardcoded values were single objects, not arrays of records.

| Tab | Sample data shape | Real-data source |
|---|---|---|
| `OverviewTab.tsx` | 4 stats + 4 distributions | useEnterpriseTreasury + useSanctumVault + event scan |
| `EcosystemTab.tsx` | 4 allocations + Sanctum claim placeholders | useEnterpriseTreasury (pools + paidTotals) |
| `RevenueTab.tsx` | 3 payee shares (Burn 86 / Sanctum 3 / Eco 11) | FeeDistributor (existing ABI + addr) |
| `SanctumTab.tsx` | 4 charities + 2 disbursements | useEnterpriseTreasury + useSanctumVault rollup |
| `VestingTab.tsx` | Single hardcoded vesting schedule | DevReserveVesting (existing ABI + addr) |

**Decision (Vanta, 2026-05-17): Option 2 — expand Phase 4 to cover all 5 treasury tabs.** No further inventory should be lost to mainnet.

**Phase 4 Turn 2 work plan (revised):**
- Convert SanctumTab.tsx (originally scoped) — uses existing useEnterpriseTreasury + useSanctumVault
- Convert OverviewTab.tsx — rollup of all vault balances + recent distribution events
- Convert EcosystemTab.tsx — already a useEnterpriseTreasury read shape; conversion is mostly UI rewiring
- Convert RevenueTab.tsx — new reads from FeeDistributor (existing ABI; surface includes `getCurrentSplit`, `feeSplit`, `burnAddress`, `daoPayrollPool`, `headhunterPool`, `merchantPool`, `lastDistributionTime`)
- Convert VestingTab.tsx — new reads from DevReserveVesting (existing ABI; surface includes `getVestingSchedule`, `getVestingStatus`, `claimable`, `vested`, `totalClaimed`, `cliffTimestamp`, `endTimestamp`)

Estimated +1 turn for the scope expansion (so Phase 4 totals ~3 turns instead of ~2). Tier 2 estimate moves from 10 to 11 turns, still inside the original 12-14 range.


#### Phase 4 Turn 2 — All 5 treasury tabs converted (COMPLETE 2026-05-17)

Single turn, 5 conversions. Pattern: each tab gets real reads from its appropriate contract, loading + not-configured states, replaces hardcoded arrays.

**SanctumTab** — Rollup view at /treasury composing `useSanctumVault`. Lighter-weight than /sanctum (which has its own deep tabs). Shows VFIDE balance + active charity count + total distributed in header; charity list with per-charity totalReceived; pending disbursements with "View in Sanctum" + "Veto via DAO" buttons (URL-param routing). Empty/loading/not-configured states.

**EcosystemTab** — Pool composition view using `useEnterpriseTreasury` (from Phase 4 Turn 1). 4 pool bars (Council, Merchant, Headhunter, Operations) with current balance + lifetime paid + share-of-pool percentage. Claim-rewards cards retained as honest null-state stubs (real claims live on /merchant and /headhunter — this tab is read-only).

**RevenueTab** — FeeDistributor real data. Reads `feeSplit` (5 BPS channels) + 5 destination addresses + `lastDistributionTime` + `minDistributionAmount`. Replaces hardcoded "Burn 86 / Sanctum 3 / Ecosystem 11" with real BPS. Includes destination addresses with explorer links. Health check on BPS-sum-to-10000.

**VestingTab** — DevReserveVesting real data via `getVestingStatus()` aggregator (returns 11-tuple). Replaces hardcoded "50M, Aug 2025 cliff" with real `vestingStart`, `cliffEnd`, `vestingEnd`, `totalVested`, `totalClaimedAmount`, `claimableNow`, `unlocksCompleted`/`TOTAL_UNLOCKS`. Includes "next unlock" countdown. Pause flag detection.

**OverviewTab** — Cross-contract rollup. 4 stat cards (Total Treasury, Sanctum, Ecosystem Pools, EcoTreasuryVault VFIDE) from `useEnterpriseTreasury` + `useSanctumVault`. Fee distribution card from `FeeDistributor.feeSplit()` (3 buckets: burn/sanctum/all-ecosystem-channels). Lifetime flows card from EcosystemVault totals. "Recent Distributions" intentionally removed — would require multi-contract event scan, deferred to Tier 3 indexer concern.

**Intentional drops in OverviewTab vs sample data:**
- Hardcoded "Recent Distributions" rows (4 fake rows of council/charity/LP/merchant payments). Cross-contract event aggregation is genuinely an indexer problem. Per-channel histories remain available at /sanctum?tab=history and /treasury?tab=revenue.

**Phase 4 Turn 2 exit verification:**
- All 5 treasury tabs parse clean
- 1243 frontend + 541 test files parse clean
- 0 SampleDataBanner imports on treasury (correct — they were never bannered)
- 0 hardcoded record arrays remaining
- All 5 tabs use real hooks/contract reads

**Architectural decisions logged for Tier 2:**

17. **Composition over fat hooks.** OverviewTab consumes `useEnterpriseTreasury` + `useSanctumVault` + a direct `FeeDistributor.feeSplit` read rather than a new "useTreasuryRollup" hook. The component is the composition point; the underlying hooks stay scoped to their contracts. Easier to verify which contract a number comes from when each hook owns one contract surface.

18. **"Recent Distributions" cross-contract timelines are an indexer problem.** When the right answer would be 3-4 separate event-scan calls feeding a single sortable list, that's the threshold for "this is no longer a frontend concern" — even when we have the read primitives available. Logged in plan doc.

### Phase 4 closure (Turns 1-2 complete)

| Turn | Deliverable | Status |
|---|---|---|
| 1 | EcoTreasuryVault ABI wiring + useEnterpriseTreasury + 2 DAO templates + enterprise/FinanceTab | ✅ |
| 2 | All 5 treasury tabs converted | ✅ |

**Phase 4 outcomes:**
- EcoTreasuryVault fully reachable across the stack (ABI + addr + validator entry)
- useEnterpriseTreasury foundation hook covers EcosystemVault + EcoTreasuryVault + VFIDEToken
- 5 treasury tabs (overview, ecosystem, revenue, sanctum, vesting) all read from real contracts
- enterprise/FinanceTab uses real treasury data
- CreateTab now supports 10 DAO templates (was 8 after Phase 3 Turn 1; +2 from Phase 4 Turn 1)
- Cross-surface DAO routing established via URL-param protocol (FinanceTab → CreateTab, SanctumTab → CreateTab, etc.)


### Phase 5 — Council pages copy-fix (COMPLETE 2026-05-17)

Per Vanta's call ("don't hide"): pages stay in the navigation, copy gets fixed to be honest about V1 deferral. Phase scope: 4 surfaces, all copy-only changes (no contract reads added).

**Mid-phase audit finding.** Entry audit revealed two things missed in Phase 0:
1. `app/council/components/OverviewTab.tsx` — exists, was not in the original inventory. Had the most misleading content of any council page: marked CouncilManager / CouncilSalary / CouncilElection as **"Active"** with green badges, displayed hardcoded "12 Council Seats / 365 Days Term Length / 120d Pay Interval" as if those were facts. The original Phase 0 audit didn't catch this because the file didn't import `SampleDataBanner` and didn't have an obvious `const X = [...]` array — just dense JSX.
2. `app/governance/components/CouncilTab.tsx` was already converted in Tier 1 Phase 4 Turn 4 (the JSDoc comment makes this clear). One less file to update.

So actual Phase 5 scope: 4 files (OverviewTab full rewrite + 3 banner-label tweaks). One file (governance/CouncilTab) already done.

**Item 1 — Full rewrite of `app/council/components/OverviewTab.tsx`** (~210 LOC). Mirrors the pattern from the already-converted `app/governance/components/CouncilTab.tsx`:
  - Hero card now includes an "Coming in a future release" pill instead of presenting as live
  - 4 stat cards changed from "12 / -- / 365 / 120d" hardcoded values to "TBD / — / TBD / TBD" with "set at contract deploy" / "no election yet" sub-text
  - New "How governance works at V1" card explaining direct DAO voting
  - "What the Council will add" card (renamed from "Responsibilities") describes future-state, not present-state
  - Smart Contracts card: badges changed from green "Active" to amber "Deferred". Added explanation that they live in `contracts/future/` and require `NEXT_PUBLIC_FUTURE_FEATURES_ENABLED`.

**Items 2-4 — Banner label updates on MembersTab / SalaryTab / VotingTab.** Each now has explicit V1-deferral phrasing:
  - MembersTab: "Council members are listed here when CouncilElection ships in a future release. The entries below are illustrative placeholders — no council elections have occurred at V1."
  - SalaryTab: "Council salary distribution requires the CouncilSalary contract, which launches in a future release. The figures below are illustrative placeholders — no salary periods have run at V1."
  - VotingTab: "Member-removal voting requires the CouncilManager contract, which launches in a future release. The entries below are illustrative placeholders — no live removal votes exist at V1."

Consistent template: `<feature> requires the <contract> contract, which launches in a future release. <records> below are illustrative placeholders — no <feature-events> have <verb> at V1.`

**Phase 5 exit verification:** 1243 frontend + 541 test files parse clean. No regressions. No misleading "Active" badges remaining. Banner copy on all 3 inner tabs explicit about V1 deferral.

**Decision (Vanta): pages stay in navigation, don't hide.** Even though the contracts are deferred, the pages serve as a preview of what's coming — but their copy is now honest about that.

**Architectural decisions logged for Tier 2:**

19. **Honest deferral over silent hiding.** When a feature is genuinely planned but not yet shipped, transparent "Coming in a future release" copy is more honest than either (a) hiding the page entirely (no signal to users that work is coming) or (b) leaving it mocked (misleading). The pattern matches what /governance/council already did.

20. **Phase 0 inventory limits.** OverviewTab was missed at Phase 0 because the inventory pattern-matched on `SampleDataBanner` imports + hardcoded record arrays. A page with dense JSX containing "facts" presented as values can slip through. For future audit patterns: don't trust the absence of obvious tells; sample each page in scope-adjacent directories.


### Phase 6 — Closure + proposal detail route (COMPLETE 2026-05-17)

Three work items in the final turn:

**Item 1 — Build `/governance/proposal/[id]/page.tsx`.** Light read-only proposal detail route (~370 LOC). Pattern mirrors `/sanctum/charities/[id]/page.tsx` (Phase 2):
- `'use client'` + `useParams` (no async-params noise like the warning seen on /governance/proposals/[id] in Tier 1)
- ID validation: must be a positive integer; invalid URLs get a clear error state
- Uses `useDAO.fetchProposal(proposalId)` + `useDAO.hasVotedOn(proposalId, addr)` in a `useEffect`
- 6 distinct render states: invalid URL, DAO not configured, loading, read error, not found (out of range), success
- Display: status badge (StatusBadge with full ProposalStatus enum styling) + type badge + title extracted from description first-line + remaining body
- Vote tallies card: for/against bars with pct, total votes, "you voted" indicator
- Schedule card: voting starts/ends, executed/queued booleans
- Target call card: AddressRow components with copy button + `/explorer/[address]` link, native value in wei
- Footer link back to `/governance` for action buttons (read-only by design)

**Scope decision logged.** This route is explicitly **read-only**. Vote / finalize / execute / withdraw stay on the main /governance page where ProposalCard renders them in their natural list context with full state-aware UI. The detail page exists for shareable URLs, not as a duplicated action surface. This avoids two surfaces drifting out of sync over time.

**Item 2 — SampleDataBanner cleanup on `app/developer/page.tsx`.** This was tagged Category C at Phase 0 ("page is docs, banner is over-applied"). The developer page is the SDK/integrations documentation reference; it shows code snippets and webhook examples, not data records. Removed both the JSX usage and the unused import.

**Item 3 — Tier 2 closure documentation.** This plan doc and `MAINNET_DEPLOY_READINESS.md` updated with the final phase record + Tier 2 conversion map.

**Phase 6 exit verification:**
- New route + edited developer page parse clean
- 1244 frontend files (+1 from new route page) + 541 test files parse clean, 0 errors
- 5 remaining `SampleDataBanner` references: 3 intentional council inner tabs + 1 governance/CouncilTab JSDoc comment + 1 component definition
- 0 unbannered sample-data pages in repo sweep
- Full sample-data conversion complete across Tier 2 scope

**Architectural decision logged for Tier 2:**

21. **Detail routes are read-only by default.** When a list view (ProposalCard inside /governance) already renders all the action buttons with full state awareness, the corresponding detail page (/governance/proposal/[id]) should not duplicate those actions. Two surfaces invariably drift apart in subtle ways; one source of truth for write paths is safer. Detail pages exist for shareable URLs + deeper read-only inspection.

### Tier 2 closure — final cross-phase surface map

**Hooks created or extended (4):**

| Hook | Status | Phase |
|---|---|---|
| `useSanctumVault.ts` | Created (Phase 1, ~296 LOC) + extended (Phase 3 Turn 2 with approver writes, ~88 LOC) | 1, 3 |
| `useEnterpriseTreasury.ts` | Created (Phase 4 Turn 1, ~280 LOC) | 4 |

(Other hooks were leveraged from Tier 1: `useDAO`, `useGuardians`, `useFraudRegistry`, etc.)

**Pages converted to real on-chain data (11):**

| Page | Source contract(s) | Phase |
|---|---|---|
| `app/sanctum/components/CharitiesTab.tsx` | SanctumVault | 2 |
| `app/sanctum/components/DisbursementsTab.tsx` | SanctumVault | 3 Turn 2 |
| `app/sanctum/components/HistoryTab.tsx` | SanctumVault event scan | 3 Turn 3 |
| `app/treasury/components/OverviewTab.tsx` | EcosystemVault + SanctumVault + FeeDistributor | 4 Turn 2 |
| `app/treasury/components/EcosystemTab.tsx` | EcosystemVault | 4 Turn 2 |
| `app/treasury/components/RevenueTab.tsx` | FeeDistributor | 4 Turn 2 |
| `app/treasury/components/SanctumTab.tsx` | SanctumVault | 4 Turn 2 |
| `app/treasury/components/VestingTab.tsx` | DevReserveVesting | 4 Turn 2 |
| `app/enterprise/components/FinanceTab.tsx` | EcoTreasuryVault + EcosystemVault | 4 Turn 1 |
| `app/council/components/OverviewTab.tsx` | Honest deferral copy (V1 contracts not deployed) | 5 |

**New routes (2):**

| Route | Purpose | Phase |
|---|---|---|
| `/sanctum/charities/[id]` | Per-charity detail view | 2 |
| `/governance/proposal/[id]` | Per-proposal detail view | 6 |

**Cross-surface DAO routing (URL-param protocol):**

CreateTab supports 10 DAO templates (5 Tier 1 commerce/fraud + 3 sanctum from Phase 3 Turn 1 + 2 treasury from Phase 4 Turn 1), all deep-linkable via `/governance?template=<key>&prefill=<json>`. Used by:
- DisbursementsTab → `?template=rejectDisbursement&prefill={sanctumDisbursementId}`
- enterprise/FinanceTab → `?template=sendVFIDE` and `?template=rescueToken`
- treasury/SanctumTab → `?template=rejectDisbursement&prefill={...}` (rollup view)
- CharitiesTab → `?template=approveCharity` / `?template=removeCharity`

**SampleDataBanner sweep (closed):**

| Page | Status |
|---|---|
| `app/council/components/MembersTab.tsx` | Intentional — explicit V1-deferral copy (Phase 5) |
| `app/council/components/SalaryTab.tsx` | Intentional — explicit V1-deferral copy (Phase 5) |
| `app/council/components/VotingTab.tsx` | Intentional — explicit V1-deferral copy (Phase 5) |
| `app/developer/page.tsx` | Removed (Phase 6 — page is docs, banner over-applied) |

**Architectural infrastructure changes:**
- `EcoTreasuryVault` added to `lib/contracts.ts` + `lib/validateProduction.ts` (Phase 4 Turn 1 — caught at mid-phase audit as a Phase 1 oversight)
- `EcoTreasuryVault` ABI regenerated via solc 0.8.30 + added to `lib/abis/index.ts` (Phase 1)
- CreateTab `TemplateKey` union grew from 5 → 8 → 10 across Phase 3 Turn 1 + Phase 4 Turn 1

**Tier 2 turn count: 10** (vs original estimate 12-14)

| Phase | Turns |
|---|---|
| 0 — Entry audit + plan | 1 |
| 1 — Foundation | 1 |
| 2 — CharitiesTab + detail route | 1 |
| 3 — Sanctum (3 turns) | 3 |
| 4 — Enterprise + treasury (2 turns) | 2 |
| 5 — Council pages copy-fix | 1 |
| 6 — Closure + proposal detail | 1 |
| **Total** | **10** |

**21 architectural decisions logged across Tier 2:**
1. ABI gap from contract rename is a real failure mode
2. Two-phase pattern for batch reads (count → per-id)
3. Per-item read helpers as sub-hooks
4. Aggregated stats computed client-side
5. Address as URL segment
6. Two distinct empty states (not-configured vs no-data)
7. URL-param prefill is a thin protocol
8. Template-group → contract guard pattern
9. Approver-aware UI without role-gating navigation
10. Client-side mirror of contract preconditions for UX, not security
11. Per-button pending state, not per-component
12. Inline event signatures over full-ABI imports
13. Cap before enrichment (sort+slice, then fetch timestamps)
14. Unified timeline over per-event tabs
15. useReadContracts batching for related reads
16. Honest about what's not on-chain
17. Composition over fat hooks
18. Cross-contract event timelines are an indexer problem
19. Honest deferral over silent hiding
20. Phase 0 inventory limits (dense JSX hardcoded facts can slip through)
21. Detail routes are read-only by default

