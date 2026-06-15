# Fix — Marketplace now uses the fair discovery ranking (Commerce Phase 5 follow-up)

## Why
Commerce Phase 5 certified the discovery ranking engine (`lib/seer/discovery.ts`, served by `/api/discovery`):
relevance-first, fraud-penalized, Builder-capped, **no wealth / holdings / paid signal**, and fully explainable.
But the public marketplace (`app/marketplace/page.tsx`) fetched `/api/merchant/products` and **never called
`/api/discovery`** — so buyers were getting an arbitrary product order, not the fair ranking the protocol
promises. The certified engine existed but wasn't reaching the people it was built for.

## The wiring gap (why it wasn't a one-line swap)
`/api/discovery` ranks **merchants** (`results: [{ merchantAddress, score, relevanceBucket, whyRanked, … }]`),
while the marketplace renders a **product grid** (`{ products: [...] }`). A naive endpoint swap would have broken
the page. The correct integration orders the *product grid by each product's merchant's fair standing*,
preserving the product-card UI.

## What changed
- **New `lib/marketplace/discoveryOrdering.ts`** — two pure, tested helpers:
  - `buildMerchantRank(results)` → a `merchantAddress(lowercased) → rank-index` map (0 = best fair standing),
    outage-safe (null/empty → empty map).
  - `orderProductsByMerchantRank(products, rank)` → orders products so higher-ranked merchants surface first.
    **Invariants:** it only ever RE-ORDERS (never filters/hides — output length always equals input);
    it's STABLE (server's within-merchant order preserved); unranked merchants fall to the end; and ordering
    uses **only** the merchant's fair rank — price/wealth never participate.
- **`app/marketplace/page.tsx`** — alongside the existing products fetch, it now fetches `/api/discovery` in
  parallel (tracking the same search query) and, when the user sorts by **relevance** (the default), orders the
  grid via `orderProductsByMerchantRank`. Discovery is **advisory ordering only**: if it fails or returns
  nothing, the grid keeps its default order, so a discovery outage can never hide products.

## Why this design (and what it deliberately does NOT do)
- It **activates the certified fair ranking** on the surface buyers actually use, without rewriting the product
  grid or the product/merchant data model.
- It is **fail-open on visibility**: discovery re-orders, never gates. This matches the non-extraction ethos —
  the worst case is the old (arbitrary) order, never a hidden merchant.
- It does **not** change `/api/merchant/products` or `/api/discovery` themselves (both already audited). The
  price-sort and category/price filters are unchanged; only the relevance order now reflects fair standing.

## Verification
- `tsc --noEmit`: **0 errors**.
- New test `__tests__/audit/discoveryOrdering.test.ts` — **12 scenarios, all pass**: higher-ranked-first,
  never-drops-products, empty-rank-no-op, unranked-last, stable-within-merchant, case-insensitive, and
  price-never-participates.
- Full campaign suite: **271/271** green across 10 suites. (The 8 unrelated pre-existing proxy/health API test
  failures in the base are untouched by this change.)

## Follow-ups
- `/api/discovery`'s relevance is currently a `LIKE`-based match (the route notes a production deployment can
  swap in Postgres FTS/trigram); the engine consumes a 0..1 relevance either way. That swap is a separate
  enhancement, not required for fair ordering.
- A future refinement could surface each merchant's `whyRanked` explanation in the product card (the data is
  already returned by `/api/discovery`), making the fair ranking visible to buyers, not just applied.
