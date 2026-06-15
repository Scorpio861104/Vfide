# VFIDE Wave 76 — Customer Trust & Discovery Visibility

Surfaced three tested-but-invisible engines the Wave 75 audit flagged (each at 0 UI consumers). **All
wired into existing pages, no new architecture.** Verified: typecheck 0, nav 0 broken, **75 tests / 8
suites** (+2).

## Priority 1 — Customer Trust Transparency (DONE)
- **`/api/merchant/[address]/transparency`** — PUBLIC (no auth) endpoint composing trust/delivery/dispute/
  continuity via `buildTransparencyPanel`. Answers: who is this merchant, can I trust them, will they
  deliver, what happens if something goes wrong.
- **`components/merchant/MerchantTrustPanel.tsx`** — renders it on the public storefront
  (`StoreClient.tsx`), so a CUSTOMER sees the grandmother answer before buying.
- Runtime bug avoided: `merchant_profiles` has no `is_verified` column — verification is a `verified_at`
  timestamp (checked the migration); fixed before it could throw.
- Transparency engine: **0 → real UI consumers** (endpoint + panel + storefront). Handler-tested (2 tests).

## Priority 2 — Discovery Explainability (DONE)
- **`/api/merchant/discovery-standing`** — a merchant's OWN `whyRanked` (the itemized breakdown search
  uses) + improvement tips, computed from their real signals (merit-only, relevance held at 1).
- **`components/merchant/MerchantDiscoveryStanding.tsx`** — on the merchant page: why you rank, each
  signal's contribution, how to improve, and the anti-pay-to-win note.
- `whyRanked` was returned only inside search results → now a merchant can see their own ranking factors.

## Priority 3 — Seer Explainability (DONE)
- **`components/seer/SeerStandingExplainer.tsx`** — feeds the already-built `MarketStandingPanel` (deep
  plain-language explainability: Builder Record + Extraction, how it decays, "never touches your tokens")
  with live `useMarketStanding` data, rendered on the Seer page.
- `MarketStandingPanel` had **0 UI consumers** despite being the Seer's strongest explainability surface —
  now visible. Makes the Seer feel like an advisor, not a judge.

## The visibility ledger (before → after)
| Engine | UI consumers before | after |
|---|---|---|
| Merchant Transparency Panel | 0 | endpoint + storefront panel |
| Discovery whyRanked | 0 (search-only) | merchant discovery-standing page |
| MarketStandingPanel (Seer) | 0 | Seer page |
(Plus Wave 75: Merchant HQ Opportunity/Risk Center 0 → merchant page.)

## Honest caveats
- New endpoints/components are typecheck-clean + (transparency) handler-tested, but **not run against a
  live DB/browser** — they render real data at runtime (a launch-gate check).
- All new reads were checked against the real schema (`verified_at`, `customer_address`, shipment
  statuses); each fails soft to honest defaults if a table is absent.

## Bottom line
The three highest-value cohesion gaps from the Wave 75 audit are closed: customers can now see merchant
trust, merchants can see why they rank and how to improve, and the Seer's deep explainability is on its
page. VFIDE moves from "systems that exist" toward "systems participants can actually understand" — by
surfacing intelligence that was already built and tested, not by adding anything new.
