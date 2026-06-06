# Internal / Non-User-Facing Pages Audit

**Branch:** `mainnet-readiness/full-slither-clean`
**Scope:** Audit of all 136 pages in `app/` to identify routes that should NOT be discoverable by end users (search engines, public nav links) and to verify they have proper:
1. **`robots.ts` disallow** — to keep crawlers out
2. **Per-page `robots: { index: false }` metadata** — defense-in-depth via HTML `<meta>` tag
3. **Runtime authorization gate** — for owner / operator / per-user pages
4. **Sitemap exclusion** — not advertised in `sitemap.xml`
5. **Public nav exclusion** — not linked from BottomTabBar / TopNav

## Audit method

Built `tmp/audit_internal_pages.py` which:
- Reads the `app/robots.ts` disallow list
- Walks each candidate internal page's `page.tsx` and `layout.tsx`
- Checks for `export const metadata` containing `robots: { index: false }` or equivalent (including via `buildPageMetadata({ robots: { index: false } })`)
- Reports gaps

Categorized 24 internal pages across 7 categories: owner-only, operator-only, internal-dev, demo-only, testnet-only, redirect-shim, coming-soon, auth-required, sensitive (paper-wallet).

## Initial findings

| Status | Count |
|---|---|
| Already covered by both `robots.ts` AND per-page noindex meta | 13 |
| Covered by `robots.ts` only (no explicit `<meta>`) | 9 |
| **Not covered at all** | **2** |
| Covered by per-page meta only (not in robots, by design) | 1 (`/theme`) |

### The two true gaps

1. **`/agent`** — Coming-soon placeholder for cash-agent operator workflow. Was missing from `robots.ts` disallow list. The `app/agent/layout.tsx` already had `robots: { index: false }` via `buildPageMetadata`, but the robots.txt-level block was missing.

2. **`/theme`** *(initially flagged, then re-classified)* — On first inspection it looked like a design-system showcase, but reading `app/theme/page.tsx` confirmed it's a real user-facing visual customization page (presets / preview / advanced theme editor) listed in the user nav under Account → Theme. It correctly has `robots: { index: false }` (per-user state, not worth indexing) but should remain crawlable for share/bookmark — so it should NOT be in `robots.txt` disallow.

### Information-disclosure issue: `/api-coverage`

While auditing, found that **`/api-coverage` had no production gate**. The page is a live API testing dashboard that:
- Exposes the entire VFIDE API endpoint inventory (every route, every method)
- Lets any visitor send arbitrary requests to those endpoints with custom JSON bodies
- Was reachable in production with no authorization check

This is an information-disclosure surface. Although `robots.ts` blocked search engines from indexing it, anyone with the URL could enumerate the API surface and replay requests against live infrastructure.

## Fixes applied

### 1. `robots.ts` disallow update

Added `/agent/` to the disallow list:

```diff
           '/verifier/',      // Operator-only trusted-verifier console
           '/splitter/',      // Operator-only revenue splitter inspector
+          '/agent/',         // Coming-soon placeholder (cash-agent operator workflow)
```

Final disallow now covers 24 paths: API internals, Next.js internals, all auth-gated user pages, owner-only admin surfaces, operator tooling, demo/testnet/internal-dev surfaces, and legacy redirect shims.

### 2. Per-page `robots: { index: false }` metadata (defense-in-depth)

Added explicit per-page noindex metadata to 9 pages that previously relied only on `robots.ts`:

| File | Change |
|---|---|
| `app/admin/layout.tsx` | Added `robots: { index: false, follow: false, googleBot: { index: false, follow: false } }` |
| `app/control-panel/layout.tsx` | Same |
| `app/dashboard/layout.tsx` | Same |
| `app/vault/layout.tsx` | Same |
| `app/live-demo/layout.tsx` | Same |
| `app/testnet/layout.tsx` | Added `robots: { index: false, follow: false }` to `buildPageMetadata` call |
| `app/verifier/layout.tsx` | **New file** — added with `buildPageMetadata({ robots: { index: false, follow: false } })` |
| `app/api-coverage/layout.tsx` | **New file** — added with same |
| `app/inheritance/layout.tsx` | **New file** — added with same |
| `app/demo/layout.tsx` | **New file** — added with same (cascades to `demo/crypto-social`) |

This is defense-in-depth: even if `robots.txt` is unreachable (rare but possible: CDN edge errors, agent that ignores `robots.txt` policy), the HTML `<meta name="robots" content="noindex, nofollow">` tag is still served on the page itself and is honored independently by all major crawlers.

### 3. Production gate for `/api-coverage`

Refactored `app/api-coverage/page.tsx` from a client component to a **server component that calls `notFound()` in production** unless explicitly opted in via env:

```tsx
// app/api-coverage/page.tsx (NEW server-side gate)
import { notFound } from 'next/navigation';
import ApiCoverageClient from './ApiCoverageClient';

export const dynamic = 'force-dynamic';

export default function ApiCoveragePage() {
  const isProd = process.env.NODE_ENV === 'production';
  const explicitlyEnabled = process.env.NEXT_PUBLIC_ENABLE_API_COVERAGE === 'true';

  if (isProd && !explicitlyEnabled) {
    notFound();
  }

  return <ApiCoverageClient />;
}
```

The original client implementation was moved verbatim to `app/api-coverage/ApiCoverageClient.tsx` (renamed default export). Behavior:

- **Development / preview:** Dashboard renders normally for the team.
- **Production (default):** Returns 404 — the API endpoint inventory is not exposed and no requests can be replayed.
- **Production with explicit opt-in:** If an operator sets `NEXT_PUBLIC_ENABLE_API_COVERAGE=true` (e.g. for a smoke-test environment), the dashboard works.

This closes the information-disclosure gap while preserving the dev-time utility.

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| `jest` full suite | **9051 pass / 0 fail / 164 skipped / 16 todo** |
| Audit script (`tmp/audit_internal_pages.py`) | All 24 internal pages now have noindex meta or robots block (or both) |
| Runtime gate audit (`tmp/audit_gates.py`) | `/admin` (UnauthorizedUI), `/control-panel` (OwnerGuard), `/verifier` (on-chain `trustedVerifier` check) all gated |
| Public nav link audit | No internal pages linked from BottomTabBar / TopNav nav lists |
| Sitemap inclusion check | `app/sitemap.ts` is whitelist-based; only public marketing pages listed |
| External link to internals from public pages | Only one cross-link found — control-panel internally links to `/verifier` and `/splitter`, both behind owner gate |

## Categorization summary

### Owner-only (server-side gate required, not indexed)
- `/admin` — server-side OwnerGuard via `UnauthorizedUI` component ✓
- `/control-panel` — `OwnerGuard` wrapper ✓

### Operator-only (on-chain or env gate, not indexed)
- `/verifier` — gated on `trustedVerifier(address)` on-chain check ✓
- `/splitter` — public `distribute()` is by-design (anyone can trigger payout; split %s set by owner) ✓
- `/api-coverage` — **NEW** production 404 gate added ✓

### Coming-soon placeholders (not indexed; show ComingSoonPage with requirements + alternative)
- `/agent` ✓
- `/multisig` ✓

### Auth-required user surfaces (not indexed; require connected wallet)
- `/dashboard`, `/wallet`, `/vault`, `/settings`, `/me`, `/profile`, `/notifications`, `/security-center`, `/inheritance`, `/hardware-wallet` — all in robots.ts + per-layout noindex meta

### Sensitive (key material)
- `/paper-wallet` — generates private keys client-side; not indexed; in robots.ts

### Demo / testnet / dev (not indexed)
- `/live-demo` — marketing showcase (kept accessible for prospects)
- `/demo/crypto-social` — internal demo
- `/testnet` — self-redirects on mainnet chains
- `/api-coverage` — production-gated to 404

### Redirect shims (not indexed; preserve old links)
- `/theme-manager` → `/theme`
- `/theme-showcase` → `/theme?tab=preview`
- `/disputes` → `/governance?tab=disputes`
- `/elections` → `/governance?tab=elections`

### User-facing but noindexed (per-user state, no SEO value)
- `/theme` — visual customization page; in user nav, but no public-content payoff for indexing

## Files changed

```
M  app/admin/layout.tsx              (+5 robots meta)
M  app/control-panel/layout.tsx      (+5 robots meta)
M  app/dashboard/layout.tsx          (+5 robots meta)
M  app/live-demo/layout.tsx          (+5 robots meta)
M  app/testnet/layout.tsx            (+1 robots flag)
M  app/vault/layout.tsx              (+5 robots meta)
M  app/robots.ts                     (+1 disallow entry: /agent/)
M  app/api-coverage/page.tsx         (refactored: server-side production gate)
A  app/api-coverage/ApiCoverageClient.tsx   (moved client implementation)
A  app/api-coverage/layout.tsx       (NEW: noindex meta)
A  app/verifier/layout.tsx           (NEW: noindex meta)
A  app/inheritance/layout.tsx        (NEW: noindex meta)
A  app/demo/layout.tsx               (NEW: noindex meta — cascades to crypto-social)
A  tmp/audit_internal_pages.py       (analyzer; not committed)
A  tmp/audit_gates.py                (analyzer; not committed)
```

## Remaining considerations (out of scope, not blockers)

1. **`/demo/crypto-social`** — cascades from new `/demo/layout.tsx` noindex meta; doesn't need its own. Could optionally also add a production 404 gate like `/api-coverage` if the team decides it's not for prospects.
2. **`/headhunter`, `/fraud`, `/appeals`** — these were initially flagged as "operator-sounding" but are genuinely user-facing (bug-bounty leaderboard, file-a-complaint, submit-an-appeal). Correctly NOT noindexed.
3. **Server-side gate on `/multisig` and `/agent`** — currently they show a `ComingSoonPage` regardless of who visits. That's fine for a placeholder, but if either becomes real, follow `/admin`'s server-side guard pattern.

---

**End of report.**
