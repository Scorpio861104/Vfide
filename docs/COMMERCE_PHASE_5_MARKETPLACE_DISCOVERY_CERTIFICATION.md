# Commerce Operations · Phase 5 — Marketplace Discovery · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 58-scenario matrix. Verdict up front: **Phase 5 — Marketplace Discovery is CERTIFIED
(ranking engine) — with one honest, documented integration gap: the public marketplace UI does not yet consume
the ranked discovery endpoint.** This is the **last Commerce Operations phase.**

Unlike Phase 4 (a genuine build), this phase is closest to the E-Commerce sub-phases: reading the code showed
**the ranking engine already exists and is mature** — the master-audit line "VFIDE has trust signals; lacks a
relevance/ranking engine" was out of date. So Phase 5 is verification + adversarial hardening of an existing
engine, not a rebuild — and the value added is the **anti-manipulation matrix** the gate discipline demands.

## Build — what was found
A principled, already-built discovery stack (Waves 63/69/76/82):
- **`lib/seer/discovery.ts`** — `scoreMerchantDiscovery` + `rankByRelevanceThenMerit`. The design is sound by
  construction: **relevance is bucketed and dominates** (trust cannot lift a merchant out of a lower relevance
  tier); merit signals are **capped** (trust ≤30, delivery ≤20, health ≤10, **Builder ≤8 so contribution can
  never dominate**, verified +5, new-merchant ≤12 decaying, local-distance ≤10 and opt-in); **fraud is a
  protective penalty ≤60** that reduces visibility, never ownership; and **forbidden inputs (wealth, holdings,
  followers, paid promotion) are structurally impossible — they are not fields on the signal type.** Every
  result is **explainable** (itemized contributions).
- **`app/api/discovery/route.ts`** — composes the engine over REAL, server-derived signals (relevance from a
  keyword match; trust/fraud/delivery/age from DB reads; Builder + commerce-health enriched only for the top
  results, and only ever additive). No client-supplied ranking input.
- **`app/api/merchant/discovery-standing/route.ts`** + **`components/merchant/MerchantDiscoveryStanding.tsx`** —
  a merchant's own "why do I rank, how do I improve" transparency panel.
- An existing engine test (`lib/seer/__tests__/discovery.test.ts`, 21 scenarios) already covered the core
  properties.

**Nothing in the engine needed rebuilding.** What was missing for certification under the gate discipline: a
**deeper adversarial matrix** (the named edges: spam/keyword-stuffing, fake merchants, ranking manipulation,
review/dispute attacks, category abuse) and **route-level tests** of the real ranking path.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (58 executing scenarios)
**Honesty constraint (as throughout):** the engine is pure functions (run directly); the route is tested against
a mocked DB keyed by SQL content (so it exercises real composition, not mock call-ordering). All pass (after
one fix to a TEST — below).

**Existing engine matrix — 21 scenarios** (`lib/seer/__tests__/discovery.test.ts`): relevance dominance,
no-wealth-input, capped Builder, fraud suppression, new-merchant protection + decay, explainability, thin-data
honesty, local distance bounded/opt-in, commerce health, and the Wave 82 adversarial audit.

**New anti-manipulation matrix — 31 scenarios** (`__tests__/commerce/discoveryRanking.test.ts`):
- *Relevance gate un-buyable (A1–A4):* higher bucket always wins; zero relevance ⇒ zero score; **keyword-
  stuffing to max relevance still can't escape the fraud penalty within a tier**; bucket boundary math.
- *Cap enforcement (B1–B4):* maxed Builder can't overcome a trust deficit; Builder ≤8, trust ≤30; **stacking
  every positive signal can't jump a relevance tier**.
- *Fraud suppression / review-dispute attacks (C1–C4):* high fraud heavily suppresses; a single low signal
  doesn't destroy a strong merchant; monotonic suppression; score never negative.
- *Fake-merchant resistance (D1–D3):* a zero-signal new "fake" can't outrank an established honest store; the
  new-merchant window is bounded, not dominance; verification is +5, not a paywall.
- *New-merchant fairness + decay (E1–E3); determinism (F1–F2, no order-based manipulation); forbidden signals
  structurally impossible (G1–G2); local proximity bounded/opt-in (H1–H3); explainability (I1–I3); recovery &
  monotonicity (J1–J3).*

**Route matrix — 6 scenarios** (`__tests__/api/discovery-route.test.ts`, mocked DB by SQL pattern):
- *L1* ranked + explainable results; *L2* **a fraud-flagged merchant ranks below a clean one through the REAL
  route path**; *L3* relevance dominates at the route level; *L4* `high_reliability` filter narrows; *L5*
  browse-all ranks by merit; *L6* empty candidates → empty list (no crash).

**Result: 58/58 pass.** Full regression: **490 tests / 19 suites green**, typecheck 0, nav 0.

### The one fix this turn
A new scenario (E3) asserted the new-merchant boost is still nonzero at 119 days; it actually rounds to 0 at
~116 days (the decay reaches zero a few days before the 120-day window edge). Fixed the TEST to the real decay
boundary (nonzero at 100d, zero by 120d). The engine's decay is correct; my boundary assumption was off.

## Integration & abuse-resistance (the point of this phase)
- **Trust signals → discovery:** ✅ ProofScore/operational trust, delivery reliability, fraud risk, Builder
  Record, and commerce health all feed ranking with the right CAPS and the fraud PENALTY — proven to demote
  bad actors and reward honest ones without letting any single signal dominate.
- **Un-gameable by design:** ✅ relevance-gating (can't buy past relevance), capped merit (can't dominate via
  Builder/verification), server-only signals (no client-supplied rank), and forbidden wealth/social/paid inputs
  that the type cannot even express. Keyword-stuffing, fake merchants, and signal-stacking are all shown
  insufficient to beat the protective ordering.
- **Recovery is possible:** ✅ clearing fraud + raising trust materially restores visibility (not a permanent
  shadow-ban) — consistent with VFIDE's non-punitive, ownership-preserving stance.

## Grandmother — can people discover, and can a merchant see why they rank?  ✅ (with a gap)
- ✅ A merchant sees their discovery standing + itemized "why" + concrete improvement tips
  (`MerchantDiscoveryStanding`, wired to `/api/merchant/discovery-standing`).
- ⚠️ The **public marketplace page (`app/marketplace`) currently queries `/api/merchant/products` with
  client-side filtering — it does NOT yet consume `/api/discovery`'s ranked, explainable results.** The ranking
  engine and its merchant-facing transparency are complete and tested; wiring the consumer marketplace surface
  to the ranked endpoint is the remaining integration. Documented here, not hidden.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build | ✅ mature engine verified; adversarial + route matrices added |
| Functional / Edge-Case | ✅ 21 existing + 31 new engine scenarios |
| Adversarial | ✅ keyword-stuffing, fake-merchant, signal-stacking, review-attack, order-manipulation all resisted |
| Integration | ✅ trust/fraud/delivery/builder/health compose with correct caps + fraud penalty (engine + real route path) |
| Grandmother | ✅ merchant standing transparency; ⚠️ public marketplace UI not yet wired to ranked discovery |
| **Phase 5 — ranking engine & abuse-resistance** | ✅ **CERTIFIED** |
| **Phase 5 — public marketplace UI wiring** | ⚠️ **documented gap (engine ready; UI consumes the old product list)** |

## Residual honesty notes
- "Tested" = pure-logic + mocked-DB execution; **not** live Postgres. The route's signal-reader SQL
  (shipments/disputes/payments/builder) should be confirmed against a real DB.
- **The public marketplace UI does not yet consume `/api/discovery`** (it uses `/api/merchant/products` +
  client-side filters). This is the single most important follow-up: the ranked, abuse-resistant, explainable
  results exist and are tested, but a shopper browsing `/marketplace` is not yet seeing them. Wiring this is a
  UI task, not an engine change.
- **Relevance is a SQL `LIKE` keyword match**, not full-text/trigram search; the engine consumes a 0..1
  relevance either way, but production relevance quality would improve with Postgres FTS/trigram (the route
  comments note this intended swap).
- **Category abuse** (a merchant mis-tagging a product's category to appear in unrelated searches) is mitigated
  by relevance being computed from name/description/category text match + the fraud penalty, but there is no
  explicit category-integrity check; that is a possible future hardening.

## Commerce Operations — campaign status after Phase 5
All five phases are now addressed: **Phase 1 (E-Commerce, 1A–1F) ✅ · Phase 2 (Professional Services) ✅
(orchestration; on-chain = wallet/DAO boundary) · Phase 3 (Workforce) ✅ · Phase 4 (Physical Retail) ✅ · Phase
5 (Marketplace Discovery) ✅ (ranking engine; public-UI wiring documented as the remaining follow-up).** The
gate discipline held throughout: each phase reached a 50+ scenario matrix, an adversarial pass that repeatedly
caught real issues, and an honest boundary where one existed.
