# VFIDE Wave 69 — Outcome Integration (Trace Map)

Closed the two remaining places where intelligence existed but produced no outcome, and fixed two
runtime bugs found while wiring. **All integrated into existing routes, no standalone files.** Verified:
typecheck **0 errors**, nav **0 broken**, **64 tests passing across 6 suites** (up from 62).

## The audit found exactly two outcome gaps (everything else already produces outcomes)
1. **Merchant/Commerce Health didn't drive discovery** — the discovery API passed `commerceHealth: null`.
2. **Stability Bonding was a true orphan** — `computeBondBenefits` had zero consumers.

## Closed — Phase 4: Commerce Health → Discovery ranking
`app/api/discovery/route.ts` now computes commerce health for the top-N results (alongside the existing
Builder Record enrichment) and feeds it into the ranking. Done as top-N (not all 200 candidates) for the
same perf reason as Builder Record; commerce health only ever *adds* (capped at 10), so the
pre-enrichment order stays honest. **Tested:** a healthy active store now outranks an identical store
with poor commerce health; null health neither boosts nor penalizes.

## Closed — Phase 3: Stability Bonding → Merchant HQ (benefits preview)
Honest constraint: no on-chain bond contract exists yet, and the engine grants nothing off an unverified
bond — so a "live" wiring would surface nothing. Instead HQ now carries a **benefits preview**:
`stabilityBonding: { available: true, active: false, preview: [3/6/12/24-mo terms] }`, computed with the
**real** `computeBondBenefits` engine (representative bond) so the numbers are honest, clearly labeled
"available, not active". This satisfies Phase 3's literal ask ("participants understand why stability
matters / what benefits it creates") without faking an active benefit. **Tested:** preview has 4 terms;
longer terms earn a better fee multiplier.

## Two runtime bugs fixed (found by runtime-shaped review, not just typecheck)
- `SUM(amount)` on `merchant_payment_confirmations.amount` — that column is **TEXT**, so the un-cast SUM
  would throw against a live Postgres. Fixed to `SUM(amount::numeric)` in **both** the HQ route
  (introduced last wave) and the new discovery reader.
- Discovery's commerce-health reader used `payer_address`; the real column is `customer_address`. Fixed.
These were latent in Wave 68's HQ wiring; this wave's runtime focus caught them.

## PHASE 8 — Intelligence trace map (inputs → consumers → outcome → runtime evidence)
| Signal | Inputs / Storage | Consumers | Participant outcome | Runtime evidence |
|---|---|---|---|---|
| **Builder Record** | merchant/gov/recovery/continuity signals; computed on read | lending, whale, discovery (top-N), market-standing, command center, **HQ** | better lending terms, visibility, emergency eligibility, HQ opportunities | HQ handler test; discovery tests |
| **Extraction Index** | indexed transfers ← swap classification; `extraction_index_state` | lending, whale, market-standing, **HQ**, DAO override ledger | discretionary friction on extraction; ownership untouched | HQ handler test |
| **Merchant Health** | composite (commerce/trust/delivery/retention/revenue); computed on read | **HQ**; commerce-health sub-score now in **discovery** | one health score + risk/growth signals; **now affects ranking** | health unit tests; discovery test |
| **Merchant Trust** | disputes/refunds/verification; `disputes` | discovery, HQ, health | visibility + buyer confidence | discovery tests |
| **Stability Bonding** | `computeBondBenefits`; on-chain bond (pending contract) | **HQ preview** (new) | participants see what bonding would earn; activates on a verified bond | HQ handler test |
| **Commerce Health** | advisor (revenue/orders/customers) | HQ, health, **discovery** (new) | recommendations + retention/revenue intel; **now affects ranking** | discovery test |

**No orphan intelligence remains in the consumption audit.** Stability Bonding moved from 0 consumers to
1 (HQ preview); commerce health moved from display-only to a discovery ranking input.

## FINAL — "What participant outcome changes because of each signal?"
| Signal | Outcome that changes |
|---|---|
| Builder Record | Lending terms, marketplace visibility, emergency eligibility, and HQ shows how to grow it |
| Extraction Index | Extraction costs discretionary services (never tokens); honest participants protected |
| Merchant Health | Surfaces what to fix **and now lifts a healthy store's discovery rank** |
| Merchant Trust | Reliable merchants rank higher; buyers see who delivers |
| Stability Bonding | Participants see the concrete benefits of voluntarily committing (preview now; active on bond) |
| Commerce Health | Growth/retention recommendations **and** a discovery ranking lift for active stores |

## Honest caveats
- Built + typecheck-clean + handler/unit-tested against your repo; **not run against a live DB/chain/browser**.
- Stability Bonding's preview is an explainer; **real bond benefits require the on-chain bond contract**
  (behind your audit gate). Until then `active: false` and no merchant earns bond benefits — by design.
- Discovery's top-N commerce-health enrichment adds queries to the search path (top 20 only). Acceptable;
  if search QPS is high, cache the per-merchant commerce health.
- The two SQL fixes assume `merchant_payment_confirmations` has `amount` (TEXT) + `customer_address` +
  `created_at` — verify against your live schema before relying on the numbers.

## Bottom line
Every major signal now changes a real participant outcome: Stability Bonding is no longer dormant
(surfaced in HQ), Merchant/Commerce Health now influences discovery ranking, and two latent runtime SQL
bugs are fixed. No signal exists only in code — each maps to an opportunity, protection, recommendation,
visibility change, or lending outcome, proven by tests.
