# DB-04 requireAuth Route Inventory (2026-05-03)

Remaining API routes using direct requireAuth calls (should be migrated to standardized wrapper usage). Current count: 0.

No remaining `app/api` route handlers call `requireAuth` directly.

Focused validation refresh (2026-05-03):

- Direct requireAuth route hits: 0
- Route handlers using withAuth wrapper: 193

Command used:

rg -n "requireAuth\\(" app/api --glob "**/route.ts" | cut -d: -f1 | sort -u

Additional validation command:

rg -n "withAuth\\(" app/api --glob "**/route.ts" | wc -l
