# Professional Services Operations — Build Spec (Commerce Operations Phase 1)

Turns the Category-7 gap from the Commerce Operations Master Audit into something buildable. It defines the
engagement / retainer / milestone / deliverable / acceptance data model, maps the orchestration surface onto
VFIDE's **existing, already-audited** primitives (with an explicit reuse-vs-new column), and specifies the
acceptance + dispute state machine — including auto-release-on-silence and milestone-scoped disputes.

**Governing fact established by reading the code (not assumed):** `CommerceEscrow` is **whole-amount,
single-shot**. The `Escrow` struct holds one `amount` and one `State { NONE, OPEN, FUNDED, RELEASED, REFUNDED,
DISPUTED, RESOLVED }`; `release(id)`/`refund(id)`/`dispute(id)`/`resolve(id,buyerWins)` act on the entire
escrow. There is **no native tranching**. This single fact drives the whole design: **a milestone maps to one
CommerceEscrow, and an engagement orchestrates N of them.** This is reuse, not extension — no new custody
surface, no change to an audited contract.

---

## 1. The composition thesis (why this is mostly orchestration, not greenfield custody)
Professional-services work is: *agree on scope → fund → do staged work → client accepts each stage → money
releases per stage → disputes are per-stage.* Every primitive for that already exists except the object that
**sequences** it:

| PS concept | Maps onto (existing) | Mechanism |
|---|---|---|
| Engagement funding for a milestone | `CommerceEscrow.open` + `executeFundEscrow` | one escrow per milestone, funded by the client vault |
| Client accepts a milestone | `CommerceEscrow.release(id)` (callable by **buyerOwner** = client) | release sends that milestone's funds to the provider vault |
| Client rejects a milestone | `CommerceEscrow.dispute(id, reason)` | **already milestone-scoped** — each escrow is independent, so disputing one milestone cannot touch another's funds |
| Arbitration | `CommerceEscrow.resolve(id, buyerWins)` (DAO, 7-day arbiter timelock for high value) | binary client/provider outcome per milestone |
| Provider trust signal | `MerchantRegistry` / ProofScore / FraudRegistry (`useMerchantRegistry`,`useFraudRegistry`) | provider reputation shown at hire + gates dispute lock period |
| Billing artifact | `merchant_invoices` (+ items, tax, due_date, status machine) | an engagement issues invoices per milestone or retainer draw |
| Continuity through provider/client absence | `settleByInheritance` on escrow + merchant continuity / proof-of-life (Waves 90–96) | a milestone in flight survives either party going dark |
| Scheduling (optional) | `merchant/bookings` | kickoff / review calls |

**What is genuinely new:** the **Engagement orchestration layer** — an object that holds scope + the ordered
list of milestones, opens/links one escrow per milestone, drives acceptance windows and auto-release, and
sequences retainer draws. Plus deliverable artifacts and the acceptance state machine. That's the build.

## 2. Data model (greenfield — confirmed no engagement/milestone/retainer tables exist today)
Off-chain (Postgres, mirrors VFIDE's existing merchant-table conventions; on-chain truth = the linked escrows).

### `service_engagements`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| provider_address | text | the merchant/professional (lower-cased, per existing convention) |
| client_address | text | the buyer |
| title | text | engagement name |
| scope | text | agreed scope of work (the "agreement" body) |
| terms_hash | bytes32 | keccak of the full agreed terms doc — anchors the agreement immutably (mirrors escrow `metaHash`) |
| status | enum | `draft, proposed, accepted, active, completed, cancelled, disputed` |
| engagement_type | enum | `fixed_milestone` \| `retainer` \| `hourly_capped` |
| total_amount | numeric(36,18) | sum across milestones / retainer cap |
| acceptance_window_secs | int | default auto-release window for milestones (e.g. 7 days) |
| created_at / updated_at | timestamptz | |

### `engagement_milestones`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| engagement_id | uuid fk | |
| seq | int | ordering (phase 1, 2, 3…) |
| title / description | text | |
| amount | numeric(36,18) | this milestone's escrowed value |
| escrow_id | numeric | **the linked `CommerceEscrow` id** (null until funded) |
| status | enum | see §4 state machine |
| acceptance_deadline | timestamptz | set when provider submits deliverable = now + acceptance_window |
| accepted_at / rejected_at | timestamptz | |
| reject_reason | text | |

### `milestone_deliverables`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| milestone_id | uuid fk | |
| content_hash | bytes32 | hash of the delivered artifact (file/URL/text) — proof of what was delivered, when |
| uri | text | pointer (off-chain storage); the hash is the evidence anchor |
| submitted_at | timestamptz | starts the acceptance window |
| version | int | resubmission after a reject increments this |

### `retainer_accounts` (for `retainer` engagements)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| engagement_id | uuid fk | |
| funded_escrow_id | numeric | a single funded escrow acting as the retainer balance |
| balance | numeric(36,18) | remaining undrawn |
| draw_policy | enum | `per_accepted_milestone` \| `periodic` |

**Reuse note:** invoices are **not** duplicated — an engagement *issues* `merchant_invoices` rows tagged with
`engagement_id` (one new nullable FK column on the existing table), so reporting/tax/overdue all reuse the
invoice machinery.

## 3. Orchestration surface (new API routes) — with reuse-vs-new per endpoint
All under `app/api/merchant/engagements/` (+ a client-facing mirror), following the existing route conventions
(zod schemas, `withAuth`, `withRateLimit`, role-scoped like `disputes`).

| Endpoint | Action | New vs Reuse |
|---|---|---|
| `POST /engagements` | create draft → propose to client | **NEW** (orchestration); persistence pattern reused |
| `POST /engagements/:id/accept` | client accepts terms → status `active` | **NEW** |
| `POST /engagements/:id/milestones` | provider defines milestones | **NEW** |
| `POST /engagements/:id/milestones/:mid/fund` | client funds a milestone | **REUSE** `CommerceEscrow.open`+`executeFundEscrow` (this route just brokers the existing escrow-funding intent) |
| `POST …/:mid/deliver` | provider submits deliverable → starts acceptance window | **NEW** (records `milestone_deliverables`, sets `acceptance_deadline`) |
| `POST …/:mid/accept` | client accepts → triggers escrow release | **REUSE** `CommerceEscrow.release(id)` |
| `POST …/:mid/reject` | client rejects with reason → opens dispute | **REUSE** `CommerceEscrow.dispute(id,reason)` + `disputes` API for the evidence thread |
| `POST …/:mid/auto-release` | cron/keeper: window elapsed, silence = acceptance | **NEW** trigger → **REUSE** `release(id)` (see §5) |
| `GET /engagements[/:id]` | list/detail, role-scoped view | **NEW** (read model); pattern reused from `disputes` GET |
| retainer draw | draw against funded retainer on accepted milestone | **NEW** orchestration over an existing funded escrow |

**No new Solidity is required for the core flow** — the engagement layer drives existing escrow functions. (An
*optional* future optimization is a `MilestoneEscrow` contract that holds N tranches in one escrow to cut gas
and approvals; it is explicitly **out of scope for Phase 1** and would be a separate audited build. Phase 1
ships on the audited whole-amount escrow.)

## 4. Milestone state machine (the spine)
```
            (provider defines)              (client funds)            (provider submits deliverable)
   DRAFT ───────────────────▶ DEFINED ──────────────▶ FUNDED ──────────────────────▶ SUBMITTED
                                                          │                               │
                                                          │                               │ acceptance window runs
                                                          │                               ▼
                                          (client rejects w/ reason)              ┌──────────────┐
                                   SUBMITTED ───────────────────────────────────▶│  IN_DISPUTE  │
                                          │                                       └──────┬───────┘
                            (client accepts) │                                            │ DAO resolve(buyerWins)
                                          ▼  │  (window elapses, silence)                 │
                                     ACCEPTED ◀──────(auto-release)                        │
                                          │                                  buyerWins=false│ buyerWins=true
                                          ▼ release(id)                       (provider)    │  (client)
                                     RELEASED ◀───────────────────────────────────────────┤
                                                                              REFUNDED ◀────┘
```
- **FUNDED** = the milestone's `CommerceEscrow` is in state `FUNDED`.
- **SUBMITTED** = deliverable recorded; `acceptance_deadline = now + acceptance_window_secs`.
- **ACCEPTED → RELEASED** = client calls accept → `release(id)` → funds to provider vault.
- **IN_DISPUTE** = client called reject → `dispute(id, reason)`; **scoped to this milestone's escrow only** —
  other milestones keep flowing. Resolution is DAO `resolve(id, buyerWins)`: `false` → provider (RELEASED),
  `true` → client (REFUNDED).
- Engagement `status` is derived: `active` while any milestone is open; `completed` when all are RELEASED;
  `disputed` while any milestone is IN_DISPUTE (badge only — does not freeze the others).

## 5. The hard part — subjective acceptance (specified explicitly so it isn't discovered late)
Physical escrow resolves on "did it arrive"; deliverable acceptance resolves on "did it meet spec" — subjective
and dispute-prone. The semantics that make this safe:

1. **Silence = acceptance (auto-release).** When the provider submits a deliverable, an acceptance window opens
   (`acceptance_window_secs`, default 7d). If the client neither accepts nor rejects before the deadline, a
   keeper calls the auto-release path → `CommerceEscrow.release(id)`. This protects providers from a client who
   ghosts after receiving work. *(Implementation: a cron/keeper, same shape the subscriptions dunning runner
   will need; the on-chain call is the existing `release`.)*
2. **Reject is explicit and reasoned.** A client cannot passively withhold — to stop release they must
   `reject` with a reason, which **opens a milestone-scoped dispute** (`CommerceEscrow.dispute`). This converts
   vague dissatisfaction into a concrete, arbitrable claim.
3. **Disputes freeze only the contested milestone.** Because each milestone is its own escrow, a dispute over
   phase 3 leaves phases 1, 2, and 4 fully releasable. No single argument strands the whole engagement's money.
   *(This falls out of the one-escrow-per-milestone design for free — it is the main reason to prefer it over a
   single big escrow.)*
4. **Resubmission loop.** A rejected milestone can be re-delivered (`version++`), which — if the client agrees —
   they withdraw the dispute (existing `disputes` `withdraw` action) and accept; otherwise it proceeds to DAO
   `resolve`.
5. **Dispute-lock tiering is inherited free.** `CommerceEscrow.dispute` already gates *buyer* (client) disputes
   by a ProofScore-tiered lock (`_lockPeriod`) — higher-trust clients can dispute sooner; this discourages
   reflexive disputes from low-trust accounts without any new code.
6. **Arbiter timelock inherited free.** High-value milestones get the existing 7-day `ARBITER_TIMELOCK` before
   the DAO can resolve, giving both sides time to submit evidence through the `disputes` thread.

**Acceptance-window default policy (needs sign-off, like the Preparedness day-counts):** 7d standard, longer
for high-value milestones; configurable per engagement. This is a risk-appetite value, not derived.

## 6. Continuity integration (ties Phase 1 to the Preparedness civilization)
- **Provider goes dark mid-milestone:** the milestone's escrow is unaffected; on provider death/inheritance the
  funds settle via the existing `settleByInheritance` escrow path, and merchant succession (Wave 90–96) lets a
  successor continue the engagement. A `manager` (Cat-4 RBAC) can submit deliverables on the provider's behalf
  **without owning** the business.
- **Client goes dark:** auto-release (§5.1) already covers it — provider still gets paid for accepted/elapsed
  work.
- This is why PS fits VFIDE specifically: the chargeback/ghosting/scope-dispute failure modes of traditional
  freelance platforms are each answered by an existing VFIDE primitive (escrow, ProofScore, dispute, continuity).

## 7. Build order within Phase 1
1. `service_engagements` + `engagement_milestones` + `milestone_deliverables` tables (+ `engagement_id` FK on
   `merchant_invoices`). **Greenfield, low risk.**
2. Engagement CRUD + propose/accept routes (orchestration, no money). **New, low risk.**
3. Milestone fund/deliver/accept/reject routes — thin brokers over the **existing** escrow functions. **Reuse-
   heavy.**
4. Acceptance-window keeper (auto-release) — the one new background runner. **New; shares shape with sub
   dunning.**
5. Retainer accounts + draw policy. **New orchestration over an existing funded escrow.**
6. UI: provider engagement console + client acceptance view (reuse the `disputes` role-scoped UI pattern and
   the continuity-center component conventions).

## 8. Explicit non-goals (Phase 1)
- **No `MilestoneEscrow` Solidity contract** (single-escrow-holding-N-tranches) — deferred; Phase 1 ships on the
  audited whole-amount `CommerceEscrow`, one escrow per milestone.
- No time-tracking/hourly billing engine beyond an `hourly_capped` cap (true timesheets are a later phase).
- No e-signature cryptography beyond `terms_hash` anchoring (a richer signing flow can come later).

## 9. Honesty / risk notes
- The reuse claims are grounded in the actual `CommerceEscrow` surface (`open`/`executeFundEscrow`/`release`/
  `dispute`/`resolve`/`settleByInheritance`) and the existing `merchant_invoices` + `disputes` schemas — read,
  not assumed.
- **Biggest real risk = subjective acceptance + DAO arbitration load.** One escrow per milestone multiplies the
  number of potential DAO `resolve` cases; the §5 silence-as-acceptance + ProofScore-lock + resubmission loop
  are designed to keep most milestones *out* of arbitration, but the DAO dispute-throughput should be modeled
  before launch.
- **Gas/approval cost** of one escrow per milestone is real; acceptable for Phase 1, and the optional
  `MilestoneEscrow` contract is the documented optimization path if it bites.
- This spec is design-level. No contract was modified; nothing here is claimed as implemented.
