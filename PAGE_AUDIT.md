# Page Audit — Naming & Necessity

_Generated: $(date -u)_  
Branch: `mainnet-readiness/full-slither-clean`  
Scope: every `page.tsx` under `app/` (136 total)

## TL;DR

The page tree is **largely well-engineered**. Most apparent duplicates are intentional redirect shims (4–5 lines each) that exist to preserve back-links into a consolidated hub page. There are, however, **6 concrete issues** worth fixing.

| # | Issue | Severity | Recommendation |
|---|---|:---:|---|
| 1 | `/theme-manager` & `/theme-showcase` are dead routes (no inbound links, replaced by `/theme`) | **medium** | Convert to redirect shims → `/theme`, or delete |
| 2 | `/scan` page exists but PieMenu's "QR" button points to `/merchant` instead | **medium** | Fix PieMenu link to `/scan` |
| 3 | `/live-demo`, `/api-coverage`, `/demo/crypto-social` — internal demo pages with no nav links and no robots block | low | Add to `robots.ts` disallow + document in code as `/* internal */` |
| 4 | `/verifier` and `/splitter` are owner-tools without inbound nav (intentional, but invisible to operators) | low | Add to "Tools" group in `navigationItems.ts`, or document the access path |
| 5 | `/agent` page exists but is marked `comingSoon: true` in nav — the page IS live | low | Decide: ship it (drop `comingSoon`) or stub it |
| 6 | `/merchant` (singular) vs `/merchants` (plural) — both legitimate but confusable | informational | Consider rename (e.g. `/merchant-directory`) — **not required**, both are linked correctly |

Everything else is clean. **No orphaned files, no `.unused`/`.bak` debris, no casing violations, no conflicting routes, no broken imports.**

---

## Methodology

1. Enumerated all 136 `page.tsx` files under `app/`.
2. Indexed 1,943 source files (`.ts/.tsx/.js/.jsx/.json/.md/.mdx`, excluding `node_modules`, `.next`, `coverage`, `__tests__`, `.test.*`).
3. For each route, counted external references (string literals, `<Link href>`, `router.push(...)`).
4. Cross-checked against:
   - `components/navigation/navigationItems.ts` (canonical nav)
   - `components/navigation/TopNav.tsx`, `BottomTabBar.tsx`, `MoreSheet.tsx`
   - `components/navigation/PieMenu*.tsx`
   - `app/sitemap.ts`
   - `app/robots.ts`
   - `next.config.ts` redirects
5. 107/136 pages are referenced in nav or sitemap; the remaining 29 are dynamic routes (`[slug]`/`[id]`) or intentional shims.

---

## Categorized findings

### ✅ Category A: Intentional redirect shims (4–5 lines each) — KEEP

These exist on purpose to preserve back-links into a consolidated hub. The architectural decision is documented inline in the codebase (see `/social-hub/page.tsx` header comment block).

| Shim route | Target | Reason |
|---|---|---|
| `/social` | `/social-hub?tab=analytics` | Was the analytics surface |
| `/social-messaging` | `/social-hub?tab=messages` | Was the DM surface |
| `/social-payments` | `/social-hub?tab=pay` | Was the pay-friends surface |
| `/feed` | `/social-hub` | Was a separate feed |
| `/setup` | `/settings?tab=account` | Was the account-setup surface |
| `/paper-wallet` | `/wallet` (env-gated) | Security-gated in `next.config.ts` |
| `/stealth` | `/docs` | EIP-5564 not yet shipped (per `next.config.ts`) |

**Verdict:** All correct. No action.

### ⚠️ Category B: Dead duplicate pages (no nav, no shim) — FIX

#### B1. `/theme-manager` and `/theme-showcase`
- `/theme` is the canonical theme page (`navigationItems.ts:247` — comment says *"T1-4: Theme merged — one entry for /theme (the canonical theme page)"*).
- `/theme-manager` (253 lines) and `/theme-showcase` (265 lines) are **older variants** with overlapping functionality but no inbound nav links — only string-matched in `TopNav.MORE_MATCH` for active-state highlighting.
- Search confirmed: zero `<Link href="/theme-manager">` in the entire codebase.

**Recommendation:** Convert both to redirect shims pointing to `/theme`, or delete outright. Recommend **redirect shims** (consistent with the `/social-*` pattern) so any external bookmarks still work.

#### B2. `/scan` doc-comment is wrong
- The page header says *"Reached via: PieMenu long-press → 'Scan QR' quick action"*.
- Actual `PieMenuEnhancements.tsx:97`: `{ id: 'qr', ..., href: '/merchant', color: '#22C55E' }` — points to `/merchant`, **not** `/scan`.
- Result: the scanner page is unreachable from the UI.

**Recommendation:** Fix the PieMenu entry's `href` to `/scan`.

### 🔍 Category C: Dev/internal pages without robots block — HARDEN

These are "real" pages but only used by ops/devs/QA, not part of the user-facing nav. They should be excluded from search-engine indexing.

| Route | Purpose | Currently in `robots.ts`? |
|---|---|:---:|
| `/api-coverage` | Internal endpoint coverage tracker | ❌ |
| `/live-demo` | Marketing demo page | ❌ (also in sitemap?? — check) |
| `/demo/crypto-social` | Marketing demo page | ❌ |
| `/testnet` | Faucet hub (auto-redirects on mainnet, but URL is still hit-able) | ❌ |
| `/theme-showcase` | Designer showcase | ❌ |

**Recommendation:** Add `/api-coverage`, `/demo/`, `/live-demo`, `/testnet`, `/theme-showcase` to `app/robots.ts` disallow list. (`/live-demo` should *not* be in the public sitemap either — verify.)

### ✅ Category D: Owner/admin tools (gated) — KEEP

These are intentionally hidden from public nav and are protected by wallet-owner checks at runtime. Already in `robots.ts`.

| Route | Gating | Notes |
|---|---|---|
| `/admin` | server-side owner check | Renders "Only the protocol owner can access this page" otherwise |
| `/control-panel` | `useAccount()` + ownership check | |
| `/multisig` | wallet-gated | |
| `/inheritance/*` | per-user auth | |
| `/security-center` | per-user auth | |
| `/me`, `/profile`, `/notifications`, `/wallet` | per-user auth | |

**Verdict:** All correct.

### 🤔 Category E: Owner-tools without nav (intentional but undiscoverable)

#### E1. `/verifier` (19,331 bytes — substantial page)
- Doc-comment: *"This page is for trusted verifiers (a small set of protocol-attested addresses) who act as a fallback quorum for vault recovery claims."*
- Zero nav links. Operators must know the URL.

#### E2. `/splitter`
- Reads any user-supplied `RevenueSplitter` deployment.
- Zero nav links. Merchants must know the URL.

**Recommendation:** Either (a) add to a "Tools" submenu (gated for relevant addresses), or (b) leave as-is and ensure they are documented in `/docs` and `/support`. **No code change required if (b) is the policy** — but document it.

### 🟡 Category F: Page exists but flagged `comingSoon`

#### F1. `/agent`
- `navigationItems.ts:155`: `{ id: 'agent', label: 'AI Agent', href: '/agent', icon: Cpu, color: '#10B981', comingSoon: true }`
- The page itself (`app/agent/page.tsx`) is implemented (3,000+ bytes).
- Inconsistency: nav says "coming soon", page is live.

**Recommendation:** Decide which is true. Either drop `comingSoon: true` from nav, or replace `/agent/page.tsx` with a "Coming soon" stub.

### 🟢 Category G: Singular/plural pairs (legitimate but confusable)

| Singular | Plural | Verdict |
|---|---|---|
| `/merchant` (merchant's own dashboard) | `/merchants` (public directory of merchants) | Both linked correctly. Confusable but standard pattern (`/profile` vs `/profiles` in many apps). **Keep.** |
| `/subscriptions` (user's subscriptions) | `/merchant/subscriptions` (merchant-issued subscription products) | Different scope. **Keep.** |

### 🟢 Category H: Naming consistency

- All directory names are kebab-case ✅
- No camelCase / PascalCase / snake_case violations in URL paths ✅
- Dynamic params (`[id]`, `[slug]`, `[code]`, `[userId]`, `[tokenId]`, `[badge]`) are consistent ✅
- Route groups (`(commerce)`, `(marketing)`) used appropriately ✅
- All pages have `loading.tsx` and `error.tsx` (own or inherited) per prior `FRONTEND_AUDIT.md`

---

## Recommended changes (concrete)

### Priority 1 — bug fix
1. **`components/navigation/PieMenuEnhancements.tsx:97`** — change `href: '/merchant'` → `href: '/scan'` for the QR entry, OR rename the entry to "Merchant" if the redirect to `/merchant` is intentional. (The icon is `<QrCode>` so `/scan` is almost certainly the intended target.)

### Priority 2 — dead code cleanup
2. Replace `app/theme-manager/page.tsx` (253 lines) with a 5-line redirect shim → `/theme`.
3. Replace `app/theme-showcase/page.tsx` (265 lines) with a 5-line redirect shim → `/theme`.

### Priority 3 — SEO hardening
4. Add to `app/robots.ts` disallow:
   - `/api-coverage/`
   - `/live-demo/`
   - `/demo/`
   - `/testnet/`
   - `/theme-showcase/` (will become a redirect after #3, but belt-and-braces)
5. Verify `app/sitemap.ts` does **not** contain any of the disallowed routes.

### Priority 4 — consistency
6. Resolve `/agent` `comingSoon` mismatch (decide live-or-stub).

### Priority 5 — discoverability (optional)
7. Document `/verifier` and `/splitter` URLs in `/docs` and `/support`, OR add a gated "Operator Tools" submenu.

---

## Out of scope

- Renaming `/merchant` ↔ `/merchants` would be disruptive (breaks existing links, SEO) for marginal clarity benefit. Not recommended.
- Removing `/social`/`/setup`/`/feed` redirect shims would break old back-links and bookmarks. Keep them.
