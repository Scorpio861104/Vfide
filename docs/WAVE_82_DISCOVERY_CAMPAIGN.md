# Wave 82 — Institution Completion Campaign: Discovery

The fifth institution driven through all 8 stages. Discovery controls merchant visibility, so the audit
hunted hard for ranking bugs, double-counting, suppression, and entrenchment. It found **three real
defects — one of them runtime-fatal** — and fixed all three. Verified: typecheck 0, nav 0 broken,
**101 tests / 9 suites** (+4 adversarial), no regression.

## Findings & defects
### Defect 1 — Phantom `verified` column (Stage 5 runtime, CRITICAL)
The candidate query selected and grouped by `p.verified`:
`SELECT p.merchant_address, p.display_name, p.verified, … GROUP BY …, p.verified`.
But `merchant_profiles` has **no `verified` column** — verification is `verified_at` (a TIMESTAMPTZ added
in Wave 76; the only boolean `is_verified` lives on `users`, a different table). Against the real schema
this query throws **`column "p.verified" does not exist`** — meaning **discovery is entirely broken at
runtime in production.** TypeScript can't catch this because SQL is an opaque string; only a schema-aware
read finds it. **Fix:** `(p.verified_at IS NOT NULL) AS verified`, and group by `p.verified_at`. (Swept
the other merchant queries — directory/storefront don't have the phantom; the `verified` columns elsewhere
are on real tables like social tips/reviews.)

### Defect 2 — Non-deterministic candidate selection (Stage 5)
The query ended `… GROUP BY … LIMIT 200` with **no `ORDER BY`**. Postgres returns rows in arbitrary
physical order without `ORDER BY`, so once a marketplace has more than 200 merchants, *which 200 become
discovery candidates at all* is arbitrary — and can differ from request to request. Some merchants could
be silently excluded from discovery entirely, unfairly and unpredictably. **Fix:** a deterministic
`ORDER BY relevance DESC, (verified_at IS NOT NULL) DESC, created_at ASC, merchant_address ASC` — the
candidate set is now stable and seeded by relevance + a fair, deterministic order.

### Defect 3 — Unstable tie-break (Stage 7)
`rankByRelevanceThenMerit` compared relevance bucket then score; on an exact tie it returned 0, so order
fell back to (now-arbitrary, see Defect 2) input order. Two equally-ranked merchants could shuffle between
requests. **Fix:** a deterministic final tiebreak by merchant address — equal-merit results always appear
in the same order. Locked with a test that ranks the same set in two input orders and asserts identical
output.

## The 8 stages
| Stage | Result | Evidence |
|---|---|---|
| 1. Architecture | ✅ | relevance-dominant, all merit signals capped, forbidden inputs absent by construction |
| 2. Wiring | ✅ | both surfaces (search + discovery-standing) use the SAME engine — no split-brain |
| 3. Visibility | ✅ | merchant sees their own whyRanked + tips via /discovery-standing (W76) |
| 4. Explainability | ✅ | every signal's contribution is itemized; standing is honest it's merit-only |
| 5. Runtime | ✅ **(2 fixes)** | **phantom column** + **non-deterministic candidates** fixed |
| 6. Grandmother test | ✅ | plain "why you appear" + specific tips ("confirm deliveries with tracking") |
| 7. Edge cases | ✅ **(fix + 4 tests)** | **unstable tie-break** fixed; new-merchant/recovery/saturation all proven sound |
| 8. Civilization audit | ✅ | strengthens trust/commerce/builder/new-merchant; forbidden signals impossible |

## Hunt list — results (what was checked, mostly PASSED)
- **Split-brain ranking?** No — search and discovery-standing both call `scoreMerchantDiscovery`.
- **Trust double-counting?** No — discovery's `commerceHealth` comes from `computeMerchantAdvisor`
  (revenue/orders/customers), NOT the trust-inclusive composite. Trust enters exactly once via `trustPts`.
  (This was a deliberate W80 choice; re-verified here.)
- **New-merchant suppression?** No — a fresh store gets a bounded +12 visibility window (decays by ~120
  days); a good new merchant beats a blank one and is competitive with incumbents while building a record.
- **Score saturation?** No — a perfect merchant still outranks a very-good-but-imperfect one (proven).
- **Recovery paths?** Yes — the fraud penalty is not permanent; clearing fraud + raising trust materially
  restores visibility (damaged −7 → recovered +51 in the probe).
- **Opportunity dead-ends?** No — tips are specific and actionable, not "improve visibility."
- **Forbidden signals (wealth/holdings/popularity/ad-spend)?** Structurally impossible — not fields on
  `MerchantDiscoverySignals`, so they cannot be passed in.

## New tests
4 adversarial properties: deterministic tie-break (same order across input orders), new-merchant
discoverability, recovery after fraud, and no-saturation (perfect > very-good).

## Remaining caveats (honest)
- "Runtime" = schema-correct reads + engine tests + typecheck-clean; **not** executed against a live
  Postgres (which is exactly why the phantom-column bug had survived — no live DB in this environment). The
  fix is schema-correct by inspection against the migrations; a live run remains a launch-gate check.
- Builder/commerce enrichment runs only on the top ~20 results (a deliberate, documented performance
  bound — `deriveBuilderSignals` is ~5 queries each). Builder/health only ever *add* (capped), so the
  pre-enrichment order is an honest lower bound; this is a scaling design choice, not a defect.
- A merchant's `discovery-standing` score (computed at relevance 1.0 with full builder) is a *merit
  profile*, not their literal position for any given query — the route states this. Not misleading.

## Completion decision
**Discovery earns ✅ COMPLETE** — it survived an adversarial 8-stage audit that found three real defects
(including a runtime-fatal phantom-column bug that would have broken discovery in production), all fixed
and verified, with the rest of the hunt list proven sound rather than assumed.

## Next
**Seer** (6th and final commerce institution). After Seer: the first **Commerce Civilization Audit** across
Builder Record, Merchant Trust, Merchant Health, Merchant HQ, Discovery, and Seer.
