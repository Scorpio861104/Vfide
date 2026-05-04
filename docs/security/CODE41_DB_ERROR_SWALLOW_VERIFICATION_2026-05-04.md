# CODE-41/#45 Verification (2026-05-04)

Finding addressed:

- #45: stop swallowing DB errors in API routes (specifically merchant installments route pattern)

## What was verified

1. `app/api/merchant/installments/route.ts` GET/POST/PATCH handlers catch DB errors and return explicit `500` responses, not empty fallback datasets.
2. No `query(...).catch(() => ({ rows: [] }))` pattern remains under `app/api` routes.
3. A focused regression test now asserts GET returns `500` when the DB query rejects.

## Commands used

```bash
rg -n "query\([^\n]*\)\.catch\(" app/api --glob "**/route.ts"
rg -n "\.catch\(\s*\(\)\s*=>\s*\(\{\s*rows:\s*\[\]\s*\}\)\s*\)" app/api --glob "**/route.ts"
```

## Current inventory outcome

- `query(...).catch(...)` occurrences in API routes: 1
- Remaining occurrence is best-effort analytics update in `app/api/merchant/products/route.ts` (view count increment), not a primary read/write response path fallback.
- Empty-row fallback swallow pattern for DB calls: 0

## Evidence references

- Route: `app/api/merchant/installments/route.ts`
- Regression test: `__tests__/api/merchant/installments.test.ts`
