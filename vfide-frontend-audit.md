# VFIDE Frontend End-to-End Audit Report

**Date:** March 31, 2026  
**Scope:** Full-stack frontend system — Next.js app, API routes, WebSocket client, auth, security layers, architecture  
**Codebase snapshot:** 79 pages, ~85 API route files, ~60 hooks, ~50 component directories, WebSocket server  
**Verdict:** **CONDITIONAL PASS — Deploy-blocking issues remain (3 Critical, 5 High)**

---

## Executive Summary

VFIDE's frontend is an ambitious, feature-rich Next.js application with genuinely strong security fundamentals in several areas — parameterized SQL throughout, robust SIWE authentication with challenge-binding, httpOnly JWT cookies, Zod validation at API boundaries, rate limiting on every route, and a well-configured CSP. However, the audit uncovered three critical gaps that undermine these defenses: CSRF protection exists as dead code (never enforced), the root `middleware.ts` referenced throughout the codebase is entirely missing, and a client-side auth helper tries to read an httpOnly cookie (which is impossible by design), creating a confusing auth flow. Additionally, every single page (79/79) is a client component, which nullifies Next.js server component advantages and inflates bundle size dramatically.

---

## Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| **Critical** | 3 | Must fix before deploy |
| **High** | 5 | Should fix before deploy |
| **Medium** | 8 | Fix in next sprint |
| **Low** | 6 | Improvements |

---

## Critical Findings

### C-1: CSRF Protection Is Completely Unenforced (Dead Code)

**Files:** `lib/security/csrf.ts`, `lib/security/csrfClient.ts`, `lib/security/csrfPolicy.ts`, `app/api/csrf/route.ts`

A complete double-submit cookie CSRF system exists — token generation, cookie setting, timing-safe comparison, exempt path list, client-side fetch helper — but **none of it is wired in**:

- Zero API routes call `validateCSRF()` or `verifyCSRFToken()`
- Zero client components import `withCsrfHeaders` or `fetchCsrfToken` from `csrfClient.ts`
- There is no root `middleware.ts` to enforce CSRF globally (see C-2)

Any authenticated browser session is vulnerable to cross-site request forgery on every state-changing endpoint (POST/PUT/PATCH/DELETE). An attacker page could submit forged requests to `/api/messages`, `/api/friends`, `/api/merchant/*`, etc., using the victim's automatically-included httpOnly auth cookie.

**Remediation:** Create a root `middleware.ts` that calls `validateCSRF()` on all state-changing requests to `/api/*`, or add `validateCSRF(request)` to every POST/PUT/PATCH/DELETE handler. Ensure every client-side fetch for mutations includes the `x-csrf-token` header via `withCsrfHeaders()`.

---

### C-2: Root `middleware.ts` Is Missing

**Referenced in:** `next.config.ts` (lines 84–87), `app/layout.tsx` (CSP nonce comment)

The Next.js config explicitly states: *"Per-request nonce injection is handled by middleware.ts, which sets the Content-Security-Policy header with 'nonce-{nonce}' for every HTML response."* The root layout reads `x-nonce` from headers and injects it into a `<meta>` tag. But **no `middleware.ts` file exists** at the project root.

This means:

- **CSP nonces are never generated.** The `nonce` variable in the layout is always an empty string. The `<meta property="csp-nonce">` tag is never rendered. The static CSP header in `next.config.ts` has no `nonce-*` directive, so inline scripts rely on source-list matching only.
- **CSRF middleware never runs** (see C-1).
- **No global request interception** for security headers, auth checks, or redirects.

**Remediation:** Create `/middleware.ts` with:
1. Nonce generation via `crypto.randomUUID()` and injection into CSP header
2. `validateCSRF()` call for state-changing API requests
3. Set `x-nonce` response header for the layout to consume

---

### C-3: `getAuthHeaders()` Client Helper Is Dead Code (httpOnly Cookie Mismatch)

**Files:** `lib/auth/client.ts`, `lib/auth/cookieAuth.ts`

The server sets the auth cookie with `httpOnly: true`:
```
response.cookies.set('vfide_auth_token', token, { httpOnly: true, ... })
```

The client helper `getAuthHeaders()` tries to read it via `document.cookie`:
```
const token = getCookie('vfide_auth_token'); // Always returns null
```

httpOnly cookies **cannot** be read by JavaScript — this is the entire point. `getAuthHeaders()` always returns `{}`, so the `Authorization` header is never set.

Auth still works because the browser automatically includes httpOnly cookies in same-origin requests, and the server-side `getRequestAuthToken()` falls back to cookie extraction. But this creates two problems:

1. **Confusion for developers**: The auth flow appears to use bearer tokens but actually relies entirely on automatic cookie inclusion.
2. **18+ call sites** (merchant portal, checkout, store pages) call `getAuthHeaders()` thinking they're attaching auth. If any cross-origin API call is added, auth will silently break.

**Remediation:** Remove `getAuthHeaders()` entirely. Since auth cookies are same-origin httpOnly cookies, they're automatically included. Ensure all `fetch()` calls use `credentials: 'same-origin'` (the default) and remove the dead `Authorization` header merging.

---

## High Findings

### H-1: All 79 Pages Are Client Components — No Server Components Used

Every `page.tsx` in the `/app` directory starts with `'use client'`. This means:

- **Zero server-side rendering benefit** — all page logic, state, and data fetching happens client-side
- **Massive JavaScript bundle** — the entire page tree ships to the browser, including pages like `admin/page.tsx` (3,033 lines), `governance/page.tsx` (2,582 lines), and `guardians/page.tsx` (2,490 lines)
- **SEO degradation** — content is not available to crawlers on first paint
- **Slower initial load** — users download and parse all component code before seeing content

For a DeFi application, this is particularly impactful since many pages (dashboard, explorer, docs, about, legal) could be partially or fully server-rendered.

**Remediation:** Refactor data-display pages to server components. Extract interactive sections into client component children. Target: at minimum, `about`, `docs`, `legal`, `explorer`, `dashboard` should have server-rendered shells.

---

### H-2: Monster Page Components (3,000+ Lines)

Several page components are enormous monoliths with dozens of `useState`/`useEffect` calls:

| Page | Lines | useState/useEffect calls |
|------|-------|--------------------------|
| `admin/page.tsx` | 3,033 | ~42 |
| `governance/page.tsx` | 2,582 | ~35 |
| `guardians/page.tsx` | 2,490 | ~30 |
| `vault/recover/page.tsx` | 1,308 | ~20 |

These are untestable, unmaintainable, and cause full re-renders on any state change. Each should be decomposed into focused sub-components with their own state management.

**Remediation:** Break each monolith into a container component + 5–10 focused child components. Extract shared logic into custom hooks.

---

### H-3: Only 1 `loading.tsx` and 1 `not-found.tsx` for 79 Pages

Next.js uses `loading.tsx` for Suspense fallbacks during route transitions. With only one at the root level, navigating between any of the 79 pages shows either nothing or a generic spinner. Users get no loading feedback specific to the page they're entering.

Similarly, only 6 `Suspense` boundaries exist across the entire app, meaning large client-side data fetches have no intermediate loading states.

**Remediation:** Add `loading.tsx` to at minimum the 10 most complex route groups (dashboard, governance, merchant, admin, vault, guardians, escrow, payroll, council, marketplace).

---

### H-4: Image Optimization Allows Any HTTPS Origin

**File:** `next.config.ts` line 67

```typescript
{ protocol: 'https', hostname: '**' }
```

The `remotePatterns` config allows image optimization for **any HTTPS hostname**. This turns Next.js's image optimizer into an open proxy — attackers can use your server to fetch and resize arbitrary external images, consuming bandwidth and compute.

**Remediation:** Remove the wildcard pattern. Keep only the specific trusted domains already listed (GitHub avatars, Vercel storage, Unsplash, Cloudflare IPFS, AWS). For user-generated images, proxy through a dedicated image service.

---

### H-5: Admin Page Ships Full UI Code to All Browsers

**File:** `app/admin/page.tsx`

The admin page performs a client-side `isOwner` check and shows "Access Denied" to non-owners. However, since it's a client component, the entire 3,033 lines of admin UI code — including ABI fragments, batch action logic, emergency pause controls, and ownership transfer forms — are shipped to every browser. An attacker can read the full admin functionality from the bundle.

While on-chain calls would still fail, this exposes contract interaction patterns, function selectors, and admin workflows.

**Remediation:** Move the admin page to a server component that performs the ownership check server-side before rendering. Use `redirect()` or return a 403 before any admin UI is sent. Alternatively, use dynamic imports (`next/dynamic`) with a server-side guard.

---

## Medium Findings

### M-1: Sanitization Regex for XSS Is Insufficient

**File:** `lib/auth/validation.ts` line 30

```typescript
const sanitizeText = (val: string) => val.replace(/<script[^>]*>.*?<\/script>/gi, '').trim();
```

This only strips `<script>` tags. XSS payloads using `<img onerror=...>`, `<svg onload=...>`, `<iframe>`, `<object>`, event handlers, and CSS-based vectors are unaffected. The server-side sanitization in `lib/sanitize.ts` uses DOMPurify (which is thorough), but `sanitizeText` in the Zod validation schema is applied first and may give a false sense of safety on the server side where DOMPurify (a client library) isn't available.

**Remediation:** Replace the regex with a proper server-side HTML sanitizer (e.g., `sanitize-html` or `isomorphic-dompurify`), or strip all HTML tags with a comprehensive regex: `/<[^>]*>/g`.

---

### M-2: Dynamic SQL WHERE Clause Construction

**File:** `app/api/merchant/reviews/route.ts`, `app/api/merchant/bookings/route.ts`

While parameterized queries are used for values, `WHERE` clauses and `ORDER BY` clauses are built via string interpolation from hardcoded conditions. The `orderBy` variable in the reviews route is constructed from user input (`sort` query parameter) through a conditional chain — if the conditional chain were modified to pass user input through, it would become an injection vector.

Currently safe but fragile. The pattern should be replaced with a whitelist-map approach.

**Remediation:** Use a lookup map: `const ORDER_MAP = { newest: 'r.created_at DESC', ... }` and validate against the map keys.

---

### M-3: CSP Allows `unsafe-inline` for Styles

**File:** `next.config.ts`

The CSP includes `style-src 'self' 'unsafe-inline'`. While necessary for Tailwind/Radix runtime styles, it weakens the CSP against CSS-based injection attacks. This is a known trade-off in Tailwind projects but should be documented as accepted risk.

---

### M-4: Error Messages Leak Internal Details to Client

**Files:** Multiple page components (`vault/page.tsx`, `guardians/page.tsx`)

Patterns like `error instanceof Error ? error.message : 'Unknown error'` pass raw error messages to the UI. In production, error messages from contract calls, RPC providers, or internal logic could expose stack traces, ABI details, or infrastructure information.

**Remediation:** Map errors to user-friendly messages. Log raw errors server-side only.

---

### M-5: `DOMPurify` Is Client-Only — Server-Side Sanitization Gap

**File:** `lib/sanitize.ts`

The module is marked `'use client'`. Server-side fallback is `input.replace(/<[^>]*>/g, '')`, which is a basic tag stripper. Any API route that imports `sanitizeInput` for server-side use gets the weaker regex instead of DOMPurify. Use `isomorphic-dompurify` for consistent server/client sanitization.

---

### M-6: No Request Size Limits on API Routes

No global body-size limit is configured in Next.js or middleware. While individual routes have Zod validation, a malicious client could send arbitrarily large JSON payloads to any endpoint, consuming memory.

**Remediation:** Add a global body size limit in the (missing) middleware.ts or configure `api.bodyParser.sizeLimit` in Next.js config.

---

### M-7: Session Key Private Material in Browser Storage

**File:** `lib/sessionKeys/sessionKeyService.ts`

Session key material is stored in `localStorage` or `sessionStorage`. While session keys are time-limited and scoped, any XSS vulnerability would grant an attacker access to pre-approved transaction capabilities for the session duration.

**Remediation:** Document the risk. Consider using non-exportable `CryptoKey` objects via the Web Crypto API where possible.

---

### M-8: Service Worker Caches Root Path

**File:** `public/service-worker.js`

The service worker pre-caches `/` (the root path). For a DeFi app with dynamic content and security-sensitive state, serving a cached version of the app shell can display stale data (balances, transaction statuses) and bypass security updates.

**Remediation:** Use network-first strategy for HTML pages. Only cache static assets (icons, fonts, images).

---

## Low Findings

### L-1: Zod v3/v4 Dual Installation

Both `zod` (^3.25.76) and `zod4` (npm:zod@^4.3.6) are in `package.json`. Validation modules consistently use `zod4`, but the v3 package remains a transitive dependency. This bloats the bundle.

### L-2: `Permissions-Policy` Blocks Camera/Microphone but App Has WebRTC Features

The security headers block `camera=()` and `microphone=()`, but the architecture mentions WebRTC voice/video calling. These headers would prevent those features from working.

### L-3: `X-XSS-Protection: 1; mode=block` Is Deprecated

This header is a legacy IE feature and is ignored by modern browsers. Some security scanners flag it as a potential side-channel vector. Can be safely removed.

### L-4: No `Subresource-Integrity` (SRI) for External Scripts

The CSP allows scripts from `vercel.live` and `walletconnect.com` without SRI hashes. If those CDN origins are compromised, malicious scripts would execute.

### L-5: `connect-src` Allows Broad WebSocket Origins

The CSP directive `connect-src ... wss: ws:` allows WebSocket connections to any origin. Should be restricted to the specific WebSocket server hostname.

### L-6: Missing `robots.txt` and `sitemap.xml`

No `robots.txt` or `sitemap.xml` found in `/public`. For a production DeFi application, `robots.txt` should at minimum disallow sensitive paths (`/admin`, `/control-panel`, `/api`).

---

## Strengths Identified

The audit also confirmed several strong security practices already in place:

1. **SIWE Authentication** — Full challenge-response flow with nonce binding, domain verification, chain ID validation, timestamp expiry (5 min), and replay protection via consumed challenges
2. **Parameterized SQL** — All database queries use `$1, $2...` parameterized placeholders. No raw string interpolation of user input into SQL
3. **httpOnly JWT Cookies** — Auth tokens are never exposed to JavaScript. `SameSite=strict`, `Secure` in production
4. **Rate Limiting on Every Route** — All API routes use `withRateLimit()` with tiered configurations (auth: 10/min, write: 30/min, claim: 5/hr)
5. **Auth on Every Route** — All API routes use `requireAuth()`, `requireAdmin()`, or `optionalAuth()`. No unprotected endpoints were found
6. **Admin On-Chain Verification** — `requireAdmin()` performs both env-var check AND on-chain `owner()` call via RPC
7. **JWT Secret Rotation** — Supports `PREV_JWT_SECRET` for zero-downtime rotation
8. **Token Revocation** — Redis-backed token blacklist with hash-based lookup
9. **Account Lock** — Automatic account locking after security signal accumulation
10. **WebSocket Security** — JWT auth, origin allowlist, message size limits (8 KiB), Zod schema validation, TLS enforcement in production, rate limiting
11. **Structured Data Safety** — `dangerouslySetInnerHTML` usage is limited to JSON-LD schema.org data with `</script>` injection prevention via `safeJsonLd()`
12. **Input Validation** — Zod schemas for all API inputs including Ethereum address format, transaction hashes, pagination bounds, and text sanitization
13. **Env Var Validation** — Runtime Zod validation of all environment variables with production fail-fast
14. **Error Boundaries** — Root-level ErrorBoundary with Sentry integration and graceful fallback UI
15. **Security Headers** — HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin

---

## Remediation Priority

**Before deploy (blockers):**
1. Create root `middleware.ts` with CSP nonce generation + CSRF enforcement (fixes C-1 and C-2)
2. Remove `getAuthHeaders()`, ensure `credentials: 'same-origin'` on all fetch calls (fixes C-3)
3. Remove wildcard image remote pattern (fixes H-4)

**First sprint post-deploy:**
4. Add `loading.tsx` to major route groups (H-3)
5. Server-side gate for admin page (H-5)
6. Replace `sanitizeText` regex with proper sanitizer (M-1)
7. Add request body size limits (M-6)

**Ongoing refactor:**
8. Decompose monolith pages (H-2)
9. Convert data-display pages to server components (H-1)
10. Switch to `isomorphic-dompurify` (M-5)
