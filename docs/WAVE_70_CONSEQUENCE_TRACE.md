# VFIDE Wave 70 — Consequence Engine Integration (Trace Map)

Added the one structured consequence surface the prior waves hadn't: a **cause→effect→action Opportunity
Center** (Phase 6) and a **cause→effect→mitigation Risk Center** (Phase 7) in Merchant HQ. **Wired into
the existing HQ route, no standalone files, no new engines.** Verified: typecheck **0 errors**, nav **0
broken**, **64 tests passing across 6 suites**.

## Honest audit: most of Wave 70 was already done in Waves 68–69
Builder Record, Extraction Index, Merchant Health, Commerce Health, and Stability Bonding already produce
outcomes (lending terms, discovery ranking, HQ sections, bonding preview) — wired and tested in 68/69.
The genuinely missing piece this wave: those HQ sections each had a **flat `action` string**, not the
**structured cause/effect/action** Phases 6 and 7 require, and there was **no consolidated Opportunity or
Risk Center**. That's what was built.

## Built — Opportunity Center (Phase 6)
`opportunityCenter: Opportunity[]` where `Opportunity = { signal, cause, effect, action }`. Composed from
already-computed signals (no new computation):
- **Lending** — cause: ProofScore + Builder qualify you; effect: up to N VFIDE at X-Y bps; action: open lending.
- **Builder Record** — one entry per unconfigured contribution area (verify / governance / recovery / continuity).
- **Merchant Health** — one per health growth signal.
- **Stability Bonding** — available bonding → lower fees / better lending / more visibility.

## Built — Risk Center (Phase 7)
`riskCenter: Risk[]` where `Risk = { signal, level, cause, effect, mitigation }`. Covers every Phase 7
risk type, each only firing when the data supports it:
| Risk | Fires when | Mitigation |
|---|---|---|
| Extraction | index ≥ 3000 (level scales) | reduce rapid sell/rebuy; recovers ~90d |
| Trust / Fraud | disputes upheld > 0 | resolve disputes, confirm deliveries |
| Delivery | reliability 'concerning' | confirm shipments w/ tracking |
| Commerce (Merchant Health) | per health risk signal | per-signal action |
| Preparedness | no continuity plan | set successor + emergency operator |
| Recovery | no recovery configured | add recovery guardians |
Every extraction/risk entry reaffirms **ownership is never affected** — friction is discretionary only.

**Proven by runtime test** (`__tests__/api/merchant-hq.test.ts`): every opportunity has cause/effect/action;
every risk has cause/effect/mitigation/level; with no continuity/recovery configured the Preparedness +
Recovery risks surface; ProofScore 7200 surfaces a Lending opportunity.

## PHASE 9 — Consequence trace (signal → consumers → opportunities/warnings → runtime evidence)
| Signal | Inputs | Consumers | Opportunities | Warnings | Runtime evidence |
|---|---|---|---|---|---|
| **Builder Record** | merchant/gov/recovery/continuity | lending, whale, discovery, standing, command center, HQ | lending terms, growth, **HQ Opportunity Center** | — | HQ + discovery tests |
| **Extraction Index** | indexed transfers ← swaps | lending, whale, standing, HQ, override ledger | — | **HQ Risk Center** (discretionary friction; ownership safe) | HQ test |
| **Merchant Health** | composite | HQ, **discovery ranking** | **HQ Opportunity Center** (growth) | **HQ Risk Center** (decline) | health + discovery + HQ tests |
| **Merchant Trust** | disputes/refunds/verification | discovery, HQ, health | — | **HQ Risk Center** (disputes) | discovery + HQ tests |
| **Market Impact** | share-of-liquidity | (engine ready; no live magnitudes) | — | — | unit test only (honestly orphan pending on-chain feed) |
| **Stability Bonding** | computeBondBenefits | HQ preview | **HQ Opportunity Center** | — | HQ test |

**No orphan consequences** except **Market Impact**, which is honestly still awaiting real on-chain
transfer magnitudes (documented, not force-wired to fake data).

## FINAL — "What participant outcome changes because each signal exists?"
| Signal | Outcome |
|---|---|
| Builder Record | Better lending, visibility, emergency eligibility; HQ shows *why* + the action to grow it |
| Extraction Index | Extraction costs discretionary services (never tokens); HQ Risk Center explains why + how to recover |
| Merchant Health | Lifts a healthy store's discovery rank; HQ surfaces growth opportunities + decline risks |
| Merchant Trust | Reliable merchants rank higher; HQ Risk Center flags upheld disputes + mitigation |
| Stability Bonding | Participants see concrete benefits of voluntary commitment (preview now; active on bond) |
| Market Impact | (Pending real magnitudes — the one honest gap) |

## Honest caveats
- Built + typecheck-clean + handler/unit-tested against your repo; **not run against a live DB/chain/browser**.
- The Opportunity/Risk Center composes existing signals — it adds **no** new DB queries beyond Wave 69's HQ load.
- **Market Impact remains the one orphan**: its engine is correct but needs real on-chain transfer
  magnitudes to produce live output; I did not wire it to placeholder data.
- Stability Bonding stays a preview until the on-chain bond contract ships (behind your audit gate).

## Bottom line
Merchant HQ now has a structured Opportunity Center and Risk Center: every opportunity carries cause →
effect → action, every risk carries cause → effect → mitigation, all composed from signals HQ already
consumes and proven by a runtime handler test. The only signal without a live consequence is Market
Impact, which honestly awaits an on-chain data feed rather than being wired to fabricated numbers.
