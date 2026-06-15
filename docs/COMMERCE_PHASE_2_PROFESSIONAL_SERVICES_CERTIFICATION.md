# Commerce Operations · Phase 2 — Professional Services · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 58-scenario matrix. Verdict up front: **Phase 2 — Professional Services is CERTIFIED
for the engagement/milestone acceptance orchestration — with an explicit, documented blockchain boundary: the
on-chain CommerceEscrow fund/release/dispute transactions are wallet actions this layer records and directs but
does NOT sign.** This phase is a different shape from Phase 1 (E-Commerce): not deterministic pricing, but the
**subjective-acceptance lifecycle** — staged work, per-milestone escrow, and the hard rule **silence =
acceptance**. That lifecycle is built and tested end-to-end at the orchestration layer.

## Build — the composition thesis, realized
Per the PS build spec, professional services is *agree scope → fund → staged work → client accepts each stage
→ money releases per stage → disputes are per-stage*, and the governing fact is that **`CommerceEscrow` is
whole-amount/single-shot** — so **a milestone maps to one escrow, and an engagement orchestrates N**. No
contract change; pure orchestration over an audited primitive.

The Phase-1 foundation already existed (the money-free slice): `service_engagements` /
`engagement_milestones` / `milestone_deliverables` / `retainer_accounts` tables + an engagements route doing
create / propose / accept / add_milestone / cancel. **What was missing — and what Phase 2 built — is the
acceptance + release lifecycle**: linking the escrow, submitting deliverables, the accept/reject decision, the
silence=acceptance keeper, and engagement completion.

Built (typecheck-clean, git-applicable):
- **`lib/commerce/milestoneEngine.ts`** — the pure state machine + decisions: `canTransition` (the spec §4
  machine: draft→defined→funded→submitted→accepted→released, plus in_dispute/refunded/cancelled),
  `canFund`/`canSubmit` gates, `decideAccept` (→ release), `decideReject` (reasoned reject required → dispute),
  `acceptanceDeadline`, **`autoAcceptIfElapsed` (silence = acceptance)**, `engagementComplete`.
- **`app/api/merchant/milestones/route.ts`** — the lifecycle broker: `link_escrow` (client funds on-chain,
  records escrow_id; defined→funded), `deliver` (provider submits; funded→submitted, starts the window,
  versioned deliverables, resubmission clears prior rejection), `accept` (client; →accepted, escrow_action=
  release), `reject` (client, reason required; →in_dispute, escrow_action=dispute), `confirm_release`
  (records the confirmed on-chain release; accepted→released; completes the engagement when all released).
- **`app/api/merchant/milestones/auto-release/route.ts`** — the **silence=acceptance keeper**: a
  CRON_SECRET-guarded sweep that auto-accepts submitted milestones past their window and returns the escrow ids
  whose release is now due.
- **Event types** — six `MILESTONE_*` events added to both the `VfideEventType` union and `EVENT_ROUTES`.
- **UI** — `app/merchant/engagements/page.tsx`: role-aware (provider vs client) lifecycle management, wired to
  both routes; a detail mode added to the engagements GET (milestones per engagement). Linked in the nav.

## BLOCKCHAIN BOUNDARY (honest — the analogue of 1C/1D's external boundaries)
Server code **cannot sign the client's or provider's on-chain transactions.** Funding the escrow, releasing it,
and opening a dispute are wallet actions on `CommerceEscrow` (`release(id)` is callable by the buyerOwner=client
or DAO; `dispute(id,reason)`; `resolve(id,buyerWins)` by DAO). So this layer:
- **records the lifecycle decision** (accepted / rejected / auto-accepted) and the **escrow linkage**, and
- **returns the `escrow_action`** (`release` / `dispute`) the wallet must execute — it does not move funds.
For an **absent client**, silence=acceptance records the acceptance decision, and the actual on-chain release is
realized by the DAO/relayer or the escrow's `settleByInheritance`/continuity path (Waves 90–96) — again, not
signed here. The `released` status is set only once the on-chain release is confirmed (`confirm_release`). This
is the honest line: the **orchestration + acceptance semantics are certified**; the **fund movement is the
audited contract's job, triggered by a wallet**, not by this server.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (58 executing scenarios)
**Honesty constraint (as throughout):** no live Postgres → state machine extracted to pure functions and run as
tests, plus both routes (lifecycle + keeper) tested against a mocked DB. Every scenario executed and passed.

**Pure-logic matrix — 40 scenarios** (`__tests__/commerce/milestoneEngine.test.ts`):
- *Transitions (A1–A8):* the full machine, no skipping funded, released terminal, dispute resolution paths.
- *Funding gate (B1–B3):* defined+no-escrow fundable, non-defined blocked, no double-fund.
- *Submission gate (C1–C4):* funded submittable, unfunded blocked, resubmission while submitted.
- *Accept (D1–D3):* submitted→release action, non-submitted blocked, no-escrow blocked.
- *Reject (E1–E3):* reasoned reject→dispute, **empty reason invalid**, non-submitted blocked.
- *Silence = acceptance (F1–F7):* deadline math, not-before-window, **auto-accept once elapsed**, exact-deadline,
  non-submitted never auto, no-deadline safety, no-escrow safety.
- *Completion (G1–G6):* all-released complete, in-flight not, cancelled ignored, all-cancelled not, empty not,
  refunded blocks.
- *Adversarial (H1–H6):* no release without submission, no reject after accept, no double auto-release, no
  second escrow, disputed can't be plain-accepted, released is terminal.

**Route matrix — 18 scenarios** (`__tests__/api/merchant-milestones.test.ts`, mocked DB):
- *link_escrow (I1–I3):* client funds, provider-blocked, no double-fund.
- *deliver (J1–J3):* submit→deadline set, client-blocked, unfunded-blocked.
- *accept/reject (K1–K5):* accept→release action, reject→dispute action, provider-blocked, empty-reason→400,
  non-submitted→409.
- *confirm_release (L1–L2):* records release + completes engagement; pre-acceptance blocked.
- *not-found/forbidden (M1–M2):* unknown→404, stranger→403.
- *keeper (N1–N3):* secret-gated (401 without), sweeps elapsed→auto-accept + release-due ids, no-due→0.

**Result: 58/58 pass.** Full regression: **379 tests / 16 suites green**, typecheck 0, nav 0.

## Integration
- **CommerceEscrow:** ✅ one escrow per milestone; accept→release, reject→dispute map to the audited contract
  calls; the layer never tranches or custodies.
- **Disputes:** ✅ a milestone-scoped reject opens a dispute on that escrow only — other milestones' funds are
  untouched (the spec's "milestone-scoped for free" property).
- **Continuity (Waves 90–96):** ✅ an in-flight milestone survives either party going dark — silence=acceptance
  handles an absent client; `settleByInheritance` handles the on-chain side; documented, not re-implemented.
- **Invoices / ProofScore / events:** ✅ invoices already tagged to engagements (foundation); milestone events
  flow through the ecosystem event bus; provider reputation is the existing MerchantRegistry/ProofScore.

## Grandmother — can a non-technical provider/client run staged work?  ✅
- ✅ `app/merchant/engagements` is role-aware: a provider creates an engagement, adds milestones, proposes; a
  client accepts, links a funded escrow, accepts/rejects deliverables; the provider submits deliverables. The
  review-window/auto-accept is shown. The screen states plainly that funding/release are wallet actions and
  tells the wallet which escrow call to make. Linked in the merchant nav.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build | ✅ acceptance state machine + lifecycle routes + keeper + events + UI |
| Functional / Edge-Case | ✅ 40 pure-logic scenarios |
| Adversarial | ✅ no release-without-submission, no double auto-release, reasoned-reject enforced |
| Integration | ✅ one-escrow-per-milestone, milestone-scoped disputes, continuity-aware |
| Grandmother | ✅ role-aware engagements UI |
| **Phase 2 — orchestration & acceptance** | ✅ **CERTIFIED** |
| **Phase 2 — on-chain fund movement** | ⛔ **wallet/DAO action (documented boundary; not signed server-side)** |

Per the discipline, **Phase 3 (Workforce) may begin** — Phase 2's orchestration scope is certified and its
blockchain boundary documented.

## Residual honesty notes
- "Tested" = pure-logic + mocked-DB execution; **not** live Postgres, and **not** an on-chain integration test.
  The escrow linkage assumes the recorded `escrow_id` corresponds to a real funded CommerceEscrow for that
  client/provider/amount — a production hardening is to **verify the escrow on-chain** (parties, amount, state)
  at `link_escrow` rather than trusting the client-supplied id. Noted, not yet built (needs a chain read).
- `confirm_release` trusts the caller that the on-chain release happened; a chain watcher confirming the
  `Released` event before flipping to `released` is the stronger posture.
- The keeper auto-accepts on silence but does not itself release funds (boundary above); a DAO/relayer must act
  on `release_due_escrow_ids`. Wiring that relayer is out of scope here.
- Retainer and hourly_capped engagement types have schema + creation but the draw-down lifecycle
  (`retainer_accounts` draws) is not yet built — fixed_milestone is the certified path; retainer/hourly are a
  follow-up sub-phase.
