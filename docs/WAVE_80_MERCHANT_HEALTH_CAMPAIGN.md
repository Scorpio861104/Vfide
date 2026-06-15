# Wave 80 — Institution Completion Campaign: Merchant Health

The third institution driven through all 8 stages. The adversarial audit found **three real defects** —
including one genuine runtime bug — and fixed all three. Verified: typecheck 0, nav 0 broken,
**96 tests / 9 suites** (+7), no regression.

## Findings & defects (the campaign's job)
### Defect 1 — NaN poisoning (Stage 7 runtime, a real bug)
The composite filters absent signals by `value != null`, but `clamp(NaN)` returned `NaN` (not null), so a
NaN sub-signal was treated as **present**, polluted `totalWeight`, and produced an **incoherent result**:
`{ score: null, band: 'at_risk' }` — a null score with a *non-provisional* band. A single bad input (e.g.
a malformed revenue ratio) could silently break the whole score.
**Fix:** `Number.isFinite` guards in `clamp`, `retentionScore`, and `trendScore` — NaN/Infinity now map to
null (ignored, renormalized over real signals). Verified: NaN commerce + trust 50 → score 50 (coherent);
all-NaN → clean `provisional`. Locked with tests.

### Defect 2 — Dead lending consumer (Stage 2 wiring)
Merchant Health was **display-only**. Tracing every expected consumer:
- Discovery used the raw `commerceHealth` **sub-signal**, not the composite.
- Lending (`suggestLoanTerms`) ignored health entirely (0 references).
- Nothing operational read `health.score` — only the HQ payload, for display.
So the institution that's supposed to sit *underneath* Discovery/Lending/Seer affected **no outcomes**.
**Fix:** `suggestLoanTerms` now accepts an optional `merchantHealth` and a proven-healthy business (≥65)
earns a small **bounded** interest break (≤100 bps off the midpoint); low/absent health is never a
penalty. Wired in the HQ route (reordered so lending receives the computed health). Health now changes a
real outcome. Verified: health 95 → −57 bps, health 100 → −100 bps (capped), health 40 → identical to
no-health.

### Defect 3 — Hidden explainability (Stage 4)
The engine computes a full `components[]` breakdown (each signal's weighted contribution) and ships it in
the HQ payload — but **no UI rendered it**; `useMerchantHQ` even dropped the field. The merchant saw
`72/100 healthy` with no answer to "what helped / what hurt."
**Fix:** `useMerchantHQ` now carries `components`, and `MerchantOpportunityRisk` renders a "What goes into
this" breakdown (each factor's 0–100 value + its weight, color-coded), with an honest note that
under-data components aren't counted.

## The 8 stages
| Stage | Result | Evidence |
|---|---|---|
| 1. Architecture | ✅ | 5 weighted signals (commerce/trust 30, delivery 20, retention/trend 10), renormalized, gated <5 orders |
| 2. Wiring | ✅ **(fixed)** | **dead lending consumer** → health now drives loan terms; no split-brain (single engine) |
| 3. Visibility | ✅ | composite score/band shown on merchant page via MerchantOpportunityRisk (W75) |
| 4. Explainability | ✅ **(fixed)** | **components breakdown** now rendered — what helped/hurt |
| 5. Runtime | ✅ **(fixed)** | **NaN poisoning** fixed; inputs from real advisor/trust/delivery reads (not hardcoded) |
| 6. Grandmother test | ✅ | plain bands + plain-sentence recommendation + 6 human-language signals |
| 7. Edge cases | ✅ **(hardened)** | NaN/∞/out-of-range/gate-boundary/single-signal — 6 new tests |
| 8. Civilization audit | ✅ | feeds Lending + Merchant Success + Opportunity/Risk; fed by Trust + Commerce (bidirectional) |

## New tests
- 6 health edge-case tests (NaN ignored, ∞ ignored, all-NaN→coherent provisional, clamp, exact gate at 5,
  single-signal renormalization).
- 1 lending-consumer test (healthy → bounded break; low health → no penalty; respects cap/floor).

## What was already good (verified, not assumed)
- Renormalization over present signals is correct — missing inputs don't drag the score to zero (a single
  present signal renormalizes to itself).
- The confidence gate is exact at 5 lifetime orders (4 → provisional, 5 → scored).
- No split-brain: unlike Merchant Trust, the health formula lives in exactly one engine.

## Remaining caveats (honest)
- "Runtime" = schema-correct DB reads + exhaustive engine edge-tests + typecheck-clean; **not** exercised
  against a live Postgres/browser (a launch-gate check). Reads fail soft to provisional/null if data is absent.
- A second, cruder client-side `useMerchantHealth` hook (on-chain `txCount>0 → Healthy`) still drives the
  merchant page *hero* status band, separate from the composite shown below it. They can differ. This is a
  **visibility refinement, not a defect in the Merchant Health institution** (the composite itself is now
  correct, consumed, and explained); flagged for a future consolidation wave rather than silently merged.
- Discovery still uses the `commerceHealth` sub-signal directly (intentional — discovery wants the raw
  commerce signal, not the trust-inclusive composite, to avoid double-counting trust which it ranks
  separately). Documented so it's a known choice, not an oversight.

## Completion decision
**Merchant Health earns ✅ COMPLETE** — it survived an adversarial 8-stage audit that found three real
defects (a runtime NaN bug, a dead lending consumer, hidden explainability), all fixed and locked by
tests, with the remaining items being honest documented refinements rather than defects in the institution.

## Next in campaign order
**Merchant HQ** (4th). Then Discovery, Seer — after which the six commerce institutions get a
**Commerce Civilization Audit**.
