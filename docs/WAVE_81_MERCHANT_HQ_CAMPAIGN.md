# Wave 81 — Institution Completion Campaign: Merchant HQ

The fourth institution driven through all 8 stages. Merchant HQ is where Builder Record, Merchant Trust,
and Merchant Health converge — so the audit hunted for incoherence between them. It found **two real
defects** and fixed both. Verified: typecheck 0, nav 0 broken, **97 tests / 9 suites** (+1), no regression.

## Findings & defects
### Defect 1 — Conflicting dual-health on one page (Stage 2 wiring + Stage 6 grandmother)
The merchant page rendered **two different health systems from two different data sources**:
- `MerchantHeadquartersHero` (status band) and `MerchantHQ`'s `HealthPanel` (headline pill) used the crude
  on-chain hook **`useMerchantHealth`** (`txCount > 0 → "Healthy"`; a 5-state string).
- `MerchantOpportunityRisk` used the audited composite **`useMerchantHQ`** (0–100 score, weighted signals).

Concrete contradiction: a merchant with 1 transaction but low trust/delivery saw **"Healthy"** in the hero
and HealthPanel, but **"at_risk" (~35/100)** in the section below — on the same page. That's a direct
logical conflict and a Grandmother-Test failure (a non-technical merchant can't reconcile "healthy" vs
"at risk").
**Fix:** the Hero's "Business Health" signal and the HealthPanel headline now read the **composite**
Merchant Health (the institution audited and completed in Wave 80). The crude on-chain state is kept only
as a fallback while the composite is still loading. All three surfaces now show the same number/band.
Verified by tracing: Hero → composite, HealthPanel → composite, OpportunityRisk → composite.

### Defect 2 — "Action" that just restates the cause (Stage 7 / opportunity-without-action)
HQ's Merchant-Health opportunities and risks were built as
`{ cause: signal.message, action: signal.message }` — the **same sentence in both fields**. The UI showed
the observation twice ("Revenue is down — review pricing" as both *Why* and *→ action*), so a
data-driven opportunity technically had an action field but created no *distinct* next step. This is the
"opportunity systems that don't create action" failure the campaign was told to hunt.
**Fix:** `MerchantHealthSignal` now carries a separate **observation** (`message`) and a **distinct
next-step** (`action`). Each of the six health signals got a real, different action (e.g. observation:
"Delivery reliability is low." → action: "Confirm shipments with tracking and follow up on any deliveries
not yet received."). `topRecommendation` now uses the actionable step, not the observation. Locked with a
test asserting `action !== message` for every signal.

## The 8 stages
| Stage | Result | Evidence |
|---|---|---|
| 1. Architecture | ✅ | HQ aggregation API (8 readers, 11 real queries) + page components |
| 2. Wiring | ✅ **(fixed)** | **dual-health conflict** resolved — Hero/HealthPanel now use the composite |
| 3. Visibility | ✅ | all 3 completed institutions (Builder/Trust/Health) surface in HQ |
| 4. Explainability | ✅ | composite components breakdown (W80) + cause→effect→action centers |
| 5. Runtime | ✅ | no hardcoded payload inputs; the flagged zeros are catch-fallback defaults |
| 6. Grandmother test | ✅ **(fixed)** | one coherent health reading; plain language; no contradiction |
| 7. Edge cases | ✅ **(fixed)** | **action≠cause** enforced; opportunity/risk centers require action/mitigation (no dead-ends) |
| 8. Civilization audit | ✅ | HQ coherently presents Builder + Trust + Health; each links to its institution |

## New test
- Asserts every Merchant-Health signal has a non-empty `action` that is **distinct** from its `message`,
  and that `topRecommendation` is populated (locks Defect 2).

## What was already good (verified, not assumed)
- **No split-brain in the aggregation:** unlike Merchant Trust, HQ computes each metric once via the
  canonical engines (health, trust, builder, lending) — it doesn't re-derive them.
- **Opportunity/Risk centers can't have structural dead-ends:** the TypeScript types require `action`
  (opportunities) and `mitigation` (risks), so every entry carries a next step.
- **The two "Opportunities" surfaces are complementary, not duplicates:** `MerchantHQ.OpportunityCenter`
  is a static *feature directory* (Loyalty, Subscriptions, Suppliers — navigation), while
  `MerchantOpportunityRisk.opportunityCenter` is *personalized intelligence* (cause→effect→action from
  real signals). Different purposes; kept both, documented.

## Remaining caveats (honest)
- "Runtime" = schema-correct DB reads + engine tests + typecheck-clean; **not** exercised against a live
  Postgres/browser (a launch-gate check). HQ readers fail soft to safe defaults if a table is absent.
- The crude `useMerchantHealth` hook still exists and powers the HealthPanel's *activity rows* and the
  Trust/Customer/Continuity sub-panels (which read on-chain/continuity state it's well-suited for). Only
  the conflicting *health headline* was switched to the composite. Fully retiring the crude hook in favor
  of one unified data source is a reasonable future consolidation, flagged rather than forced here — the
  contradiction (the actual defect) is resolved.

## Completion decision
**Merchant HQ earns ✅ COMPLETE** — it survived an adversarial 8-stage audit that found two real defects (a
cross-component health contradiction and a redundant-action bug), both fixed and verified, with the
remaining item being an honest documented consolidation rather than a defect.

## Next in campaign order
**Discovery** (5th). Then Seer — after which the six commerce institutions get a **Commerce Civilization
Audit**.
