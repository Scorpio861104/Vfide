# Wave 79 — Institution Completion Campaign: Merchant Trust

The second institution driven through all 8 stages. The adversarial audit ("try to break it") found a
**significant defect plus two more real issues** — exactly what the campaign exists to surface. Verified:
typecheck 0, nav 0 broken, **89 tests / 9 suites** (10 new trust-engine tests), no regression.

## Headline defect — split-brain trust (Stage 2 wiring + Stage 7 consistency)
The merchant-trust formula was **duplicated across 4 API routes with TWO different formulas**:
| Surface | Old formula | Clean verified merchant |
|---|---|---|
| HQ | `70 − upheld·20 − refunded·5` (verification ignored) | 70 |
| Storefront transparency | `70 − upheld·20 − refunded·5` (verification ignored) | 70 |
| Discovery-standing | `70 − upheld·20 − refunded·5` (verification ignored) | 70 |
| **Discovery ranking** | `50 + verified·15 − upheld·20 − refunded·5` | **65** |

So the **same merchant** saw trust **70** in their HQ and on the customer storefront, but discovery
**ranked** them on **65** — and verification was **invisible to 3 of the 4 surfaces** (a verified and an
unverified clean merchant both showed 70). This is the precise failure mode flagged: "discovery rankings
become questionable, customer confidence becomes questionable." Trust was not a single source of truth.

**Fix:** one canonical engine — `lib/seer/merchantTrust.ts` (`computeMerchantTrust`) — now drives **all
four routes**. Every surface computes the SAME value for the same inputs, locked by a consistency test.
The reconciled formula: `BASE 55 + verified·15 + track-record(≤12) − upheld·20 − refunds·5 + delivery(±10)`.
A clean verified merchant reads 70 everywhere (matches the old HQ value); a clean unverified merchant
reads 55 (correctly lower — what verification was supposed to mean).

## Two more issues the hunt surfaced (and fixed)
**Missing trust input (Stage 7):** the old formula rewarded only the *absence* of disputes — a merchant
with 500 confirmed payments and 0 disputes scored **identically** to one with 2 payments and 0 disputes.
Proven operation didn't count. **Fixed:** a bounded "proven track record" signal (confirmed-payment
volume, capped at +12) — so sustained reliable trade lifts trust, but volume can't *buy* trust past the cap.

**Trust stagnation (Stage 7):** upheld disputes carried a fixed penalty with nothing to offset them, so a
merchant with several upheld disputes was pinned near 0 **forever** — no path back even after reform. For
an institution serving financially-excluded users, permanent damnation is a real flaw. **Fixed:** the
track-record signal gives a gradual, **earned** rebuild path (e.g. 3 upheld → 10; after 300 clean payments
→ 22) — wrongdoing isn't erased, but consistent good behavior slowly restores standing.

## The 8 stages
| Stage | Result | Evidence |
|---|---|---|
| 1. Architecture | ✅ | trust computation existed (but duplicated — see defect) |
| 2. Wiring | ✅ **(fixed)** | **split-brain formula** unified into one canonical engine across 4 routes |
| 3. Visibility | ✅ | storefront MerchantTrustPanel (customers) + HQ payload (merchants) |
| 4. Explainability | ✅ | engine returns `factors[]`; transparency `plainSummary` |
| 5. Runtime | ✅ | schema-correct reads (verified_at, disputes, confirmed payments); 89 tests |
| 6. Grandmother test | ✅ | plain labels building/established/strong — same thresholds engine-wide |
| 7. Edge cases | ✅ **(hardened + 2 fixes)** | missing-input + stagnation fixed; bad inputs ignored, score ∈ [0,100] |
| 8. Civilization audit | ✅ | trust feeds Discovery ranking, Customer confidence, Merchant HQ, Health composite |

## Consistency, proven
- Clean verified merchant: **70 on every surface** (was 70 HQ / 65 discovery). Test asserts it.
- Verification now reflected everywhere: unverified 55 vs verified 70 (was invisible to 3/4 surfaces).
- The storefront transparency panel's own `trustLabel` thresholds (≥80 strong, ≥55 established) **match
  the engine's** — checked, so there is no second drift between score and label.

## Honest caveats
- "Runtime" = schema-correct DB reads + exhaustive engine edge-tests + typecheck-clean; **not** exercised
  against a live Postgres/browser (a launch-gate check). New reads fail soft to safe defaults if a table
  is absent.
- One deliberate, documented design choice (not a defect): upheld-dispute penalties do **not** time-decay
  — disputes are historical facts, and the rebuild path is via earned clean volume rather than the passage
  of time. If VFIDE later wants recency-weighting, that's a governance tuning, flagged here for visibility.
- Each route now does ~2 extra cheap COUNT reads (verification + confirmed payments) — acceptable;
  consistent with the existing per-route read pattern.

## Result
**Merchant Trust is VFIDE's second ✅ Complete institution** — earned by surviving an adversarial 8-stage
audit that found a real split-brain defect (plus two more), fixed all three, and proved consistency with
tests. The campaign process is now repeatable: two institutions in, two real defect sets found and fixed.

## Next in campaign order
**Merchant Health** (3rd). Then Merchant HQ, Discovery, Seer — after which the six commerce institutions
get a **Commerce Civilization Audit**.
