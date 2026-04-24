# VFIDE Protocol — Pre-Professional-Audit Review
## Phase 2: Backend / API / WebSocket — Consolidated Report

**Prepared by:** Claude (Anthropic)
**Date:** April 21, 2026
**Commit under review:** `Vfide-main__6_.zip` (dated 2026-04-20)
**Scope:** Next.js API routes (120 total), WebSocket server, auth/security libraries, DB/migration layer, secret hygiene
**Status:** Session 8 complete. ~75 files read depth-first; ~45 remaining. Recommending handoff to professional audit from here.

---

## 0. Read This First

Phase 2 covers the web-facing backend: API routes under `app/api/`, the WebSocket server under `websocket-server/`, the cryptographic/security libraries under `lib/security/` and `lib/auth/`, the database access layer, migrations, and secret management.

This is separate from Phase 1 (smart contracts) at `/mnt/user-data/outputs/VFIDE_Phase1_Audit_Consolidated.md`.

**Codebase statistics (Phase 2 scope):**

| Measure | Value |
|---|---|
| API route files (`route.ts`) | 120 |
| `lib/auth/` modules | 7 |
| `lib/security/` modules | 13 |
| Migration files | 109 |
| `init-db.sql` size | 9.6 KB |
| `.env.*.example` files | 5 (~37 KB total) |
| WebSocket server | 1 package (877 LOC src) |
| Sentry configs | 3 (client/server/edge) |

**Read with depth:** `proxy.ts`, `next.config.ts`, `vercel.json`, `app/api/auth/route.ts`, `app/api/auth/challenge/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/revoke/route.ts`, `app/api/messages/route.ts`, `app/api/quests/claim/route.ts`, `app/api/security/webhook-consumer-example/route.ts`, `app/api/security/2fa/initiate/route.ts`, `app/api/security/csp-report/route.ts`, `app/api/security/recovery-fraud-events/route.ts`, `app/api/security/violations/route.ts`, `app/api/security/keys/route.ts`, `app/api/security/anomaly/route.ts`, `app/api/security/logs/route.ts` (partial), `lib/auth/rateLimit.ts`, `lib/auth/jwt.ts`, `lib/auth/cookieAuth.ts`, `lib/auth/middleware.ts`, `lib/auth/tokenRevocation.ts`, `lib/security/csrf.ts`, `lib/security/csrfPolicy.ts`, `lib/security/webhookVerification.ts`, `lib/security/webhookConsumerGuard.ts`, `lib/security/siweChallenge.ts`, `lib/security/accountProtection.ts`, `lib/security/keyDirectory.ts`, `lib/security/urlValidation.ts`, `lib/security/errorSanitizer.ts` (partial), `lib/db.ts`, `lib/validateProduction.ts`, `migrations/20260121_234000_add_row_level_security.sql`, `init-db.sql` (sampled), `.env.example` + `.env.local.example` (sampled), `websocket-server/src/auth.ts`, `websocket-server/src/index.ts`, `websocket-server/src/schema.ts`, `websocket-server/src/rateLimit.ts`.

---

## 1. Findings Summary

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 8 |
| Medium | 11 |
| Low | 10 |
| **Total** | **31** |

---

## 2. Executive Summary

The most consequential finding in Phase 2 is architectural, not code-level: **the security middleware Next.js is supposed to run on every request doesn't run at all** (P2-C-01). The file at the project root is named `proxy.ts` with an exported `proxy()` function; Next.js's convention requires `middleware.ts` with an exported `middleware()` function. The result: CSRF validation, CSP nonce injection, body-size limits, Content-Type validation, and CORS origin enforcement that the file claims to provide are not actually enforced on any of the 120 API routes.

Compounding this, the CSRF library itself is misconfigured — the token cookie is set `httpOnly: true` (P2-C-02), which blocks the client JavaScript from reading it for the double-submit pattern to work. A server-side endpoint returns the token in JSON, which makes the httpOnly flag cosmetic.

Rate limiting has multiple structural issues (P2-H-01, P2-H-02, P2-M-06): user-controlled headers determine the rate-limit key, in-memory fallbacks are per-process in serverless, and Redis errors fail-open. Account-lock heuristics (P2-H-03) can be weaponized as a DoS against any user by an unauthenticated attacker sending failed auth attempts for that user's address.

The token-revocation system has a structural gap (P2-H-05): the `/api/auth/revoke?revokeAll=true` endpoint writes a user-level revocation key to Redis, but `verifyToken` never reads that key — so "revoke all sessions" is a silent no-op. The WebSocket server has a separate but related gap (P2-H-08) — it doesn't check token revocation at all, so logout doesn't terminate WebSocket sessions.

Row-Level Security policies exist but are likely fully bypassed (P2-H-04) because the application connects as a role with `BYPASSRLS` implicit (postgres superuser or schema owner). The RLS migration is scaffolding that provides zero defense-in-depth in a typical deployment.

Two half-built features warrant mention: **2FA** (P2-H-06) has a code-initiate endpoint with zero code-verify endpoint — either dead or silently allowing everything. And **recovery fraud events** (P2-H-07) are stored in-memory with a public unauthenticated GET endpoint, broadcasting real-time attack intelligence to the internet.

Positive observations: JWT handling, SIWE challenge consumption, webhook HMAC verification, the security-logs route, key directory signature verification, and the DB layer's AsyncLocalStorage per-request context are all well-designed. The WebSocket server's upgrade handshake, origin allowlist, trust-proxy-off default, production-no-wildcard-origin check, and double-layer topic ACL enforcement are solid architecture.

**Priority sequence for fixes:**
1. Rename `proxy.ts` → `middleware.ts` (P2-C-01). Single rename, massive security-control restoration. 5 minutes.
2. Remove `httpOnly` from CSRF cookie OR switch to Origin/Referer check (P2-C-02).
3. Fix revocation plumbing (P2-H-05 + P2-H-08): `verifyToken` must consult user-level revocation; WS must check revocation.
4. Add or remove 2FA path (P2-H-06): don't leave half-built.
5. Authenticate GET on recovery-fraud-events; persist to DB (P2-H-07).
6. Pin rate-limit ingress (P2-H-01), fix fail-open on Redis errors (P2-H-02).
7. Fix account-lock DoS (P2-H-03): don't lock on target-address-spamming without trusted-ingress IP.
8. Create non-BYPASSRLS app role (P2-H-04).
9. Commission professional audit.

---

## 3. Findings — Critical

### P2-C-01 — Security middleware (`proxy.ts`) never runs in production

**Files:** `/proxy.ts` (whole file), `next.config.ts:74` (stale comment), absence of `/middleware.ts` at project root.

Next.js App Router's middleware convention is `middleware.ts` at the project root with an exported `middleware` function (or `default` export) and a `config` object. This project has `proxy.ts` at the root with an exported `proxy` function. No `middleware.ts` exists at the project root. No file imports `proxy.ts` outside tests (`__tests__/api/proxy-*.test.ts` import it directly for unit testing, but Next.js's runtime never loads it).

The `next.config.ts` comment on line 74 says: "Security headers excluding CSP (nonce-based CSP is enforced in `proxy.ts`, with `middleware.ts` kept as a compatibility shim)" — but there is no `middleware.ts` compatibility shim at the root.

**What proxy.ts is supposed to do but isn't:** CSRF token validation (lines 156-160), request body size enforcement (lines 121-148), Content-Type validation (lines 150-154), CSP nonce generation and injection (lines 101-102, 163-169), server-side CORS origin allowlist (lines 99-119, 171-176), nonce propagation to downstream request headers.

**Consequences on all 120 API routes:** Zero CSRF enforcement. Any authenticated user's browser will attach the JWT cookie on cross-site POST requests. An attacker page on `evil.com` submitting a crafted POST to `/api/messages`, `/api/quests/claim`, `/api/endorsements`, etc., will have the request authenticated. Only routes with orthogonal protections (encrypted payloads, signed intents, HMAC) are safe. Plus: no body-size limits (DoS via oversized JSON), no Content-Type validation (MIME confusion), no nonce-based CSP, no server-side CORS allowlist enforcement.

**Remediation:**
1. Rename `proxy.ts` → `middleware.ts`, rename exported `proxy` → `middleware`. Keep the existing `config.matcher` block as-is.
2. Remove the misleading "compatibility shim" comment from `next.config.ts:74`.
3. Add a staging integration test that verifies actual request-level behavior: a POST without CSRF token to `/api/messages` must return 403, a POST with 2MB body must return 413, a page response must contain `x-nonce` header.
4. Update `__tests__/api/proxy-*.test.ts` to import from the new filename. Add integration tests — the unit tests as-is validate the function in isolation, which is exactly how this bug escaped review.

### P2-C-02 — CSRF double-submit cookie is `httpOnly`, breaking the pattern

**Files:** `lib/security/csrf.ts:32-40` (setCSRFTokenCookie), `lib/security/csrf.ts:133-143` (getCSRFTokenForClient).

Double-submit cookie CSRF pattern requires: (1) server sets a random token in a cookie, (2) client JavaScript reads the cookie and places the token in a custom header on mutating requests, (3) server validates that cookie and header match. Step 2 requires the cookie to be readable by JavaScript — i.e., NOT `httpOnly`.

This implementation sets `httpOnly: true` on the CSRF cookie (line 34). JavaScript cannot read httpOnly cookies. To compensate, `getCSRFTokenForClient()` reads the cookie on the server and returns it in a JSON response (line 135). Any client — including an attacker's iframe — that can make a GET request to `/api/csrf` can fetch the token.

The httpOnly flag adds zero security (attacker has a documented endpoint to fetch the token), and the double-submit pattern is structurally broken — the cookie serves no purpose since the token is available via JSON endpoint anyway. **Even if P2-C-01 is fixed and `validateCSRF` runs, the CSRF gate is circumventable** by any page that can fetch `/api/csrf` — and since `/api/csrf` is in the CSRF-exempt path list (`csrfPolicy.ts:4`), cross-origin requests to it will succeed if the server doesn't enforce Origin (which it doesn't per P2-C-01).

**Remediation options:**

*Option A — Fix the double-submit pattern properly:*
1. Remove `httpOnly: true` from the CSRF cookie.
2. Ensure `/api/csrf` validates Origin/Referer headers against a strict allowlist before returning the token.
3. Ensure the CSRF cookie has `SameSite=Strict` (already set).

*Option B — Switch to a simpler pattern for a JWT-based app (recommended):*
1. Remove the CSRF cookie entirely.
2. On every state-changing request, validate either `Origin` header matches allowed origins, OR `Referer` header is from an allowed origin.
3. Plus rely on the auth JWT cookie being `SameSite=Strict`.

Option B is simpler, has no client-side JavaScript dependency, and is standard for SPAs with same-site cookies.

---

## 4. Findings — High Severity

### P2-H-01 — Rate limit identifier is user-spoofable

**File:** `lib/auth/rateLimit.ts:139-152`.

`getClientIdentifier` reads IP from `cf-connecting-ip`, `x-real-ip`, or `x-forwarded-for` headers in that priority order. All three are attacker-controllable headers. They are authoritative only if the application is strictly behind a trusted proxy (Cloudflare / Vercel edge) that strips or validates them on ingress. This project's deployment configuration (`vercel.json`) doesn't declare ingress assumptions, and no code validates that requests actually came through a trusted proxy.

**Exploitation:** Attacker sets a different value in `cf-connecting-ip` (or rotates through `x-real-ip`, `x-forwarded-for` variations) on each request. The rate limit key includes a UA-hash, but the UA is also attacker-controlled. Effective rate limit: unbounded.

**Impact:** All rate-limit tiers are bypassable. The `auth` tier (10/min) is the most serious: a brute-force attacker against the SIWE challenge or the signature-verify step has no rate-limiting barrier. Other sensitive tiers: `claim` (5/hour for reward claims — an attacker-farmer rotates headers to claim repeatedly), `write` (30/min for state-changing operations).

**Remediation:**
1. If deployed on Vercel: trust only the Vercel-provided `x-vercel-forwarded-for` header and reject requests without it.
2. If deployed behind Cloudflare: trust `cf-connecting-ip` only when `CF-Worker` or similar CF-injected header is present, and reject otherwise.
3. If self-hosted: use the socket-level IP via `request.ip` (framework-specific) and ignore user-controlled headers entirely.
4. In the fallback case (dev/test), log a warning that rate limits are not enforceable and require explicit opt-in.

### P2-H-02 — In-memory rate limit fallback is per-process; Redis errors fail open

**File:** `lib/auth/rateLimit.ts:37, 174-202, 236-240`.

Two issues in one file:

**(a) Per-process fallback.** When Upstash Redis is unconfigured, rate limits fall back to a local `Map`. In serverless deployments (Vercel, Lambda), each function instance has its own memory. Effective rate limit = declared_limit × concurrent_instances. For a heavily-trafficked auth endpoint with 20 concurrent functions, "10 req/min" becomes 200 req/min.

**(b) Redis error fails open.** Line 236-240: `catch (error) { ... return { success: true }; }`. If Upstash has transient errors, rate limiting is bypassed entirely for the duration. An attacker who can trigger Upstash throttling (or waits for a natural outage) has unlimited requests.

**Remediation:**
1. Make the in-memory fallback a fail-safe default only for local dev. In production (`NODE_ENV === 'production'`), if Redis is unconfigured, *reject* requests with 503 rather than allow through an unenforced rate limit.
2. On Redis error, fall back to the in-memory limiter (graceful degradation) rather than allowing through. Log to alerting.
3. Document the operational requirement: rate limiting requires Upstash Redis in production.

### P2-H-03 — Account-lock heuristics are weaponizable as DoS against any user

**File:** `lib/security/accountProtection.ts:171-276`.

The account-lock logic fires on 5+ failed auth attempts in 10 minutes (line 227), 4+ key rotations (line 239), 3+ high-risk payments AND 2+ distinct IPs (line 251), or 3+ distinct IPs in 10 minutes for any event (line 263).

An attacker who knows a target's wallet address can send 5 failed SIWE auth POSTs against `/api/auth` with that target address and invalid signatures. Each failure calls `recordSecurityEvent(targetAddress, {type: 'auth_fail', ...})`. After 5, `lockAccount` fires — target locked for 30 minutes. Combined with P2-H-01 (IP spoofing via headers), the attacker can also trigger `distinctIps >= 3` from a single origin by rotating `cf-connecting-ip`.

The lock returns 423 Locked. The legitimate user cannot authenticate until the window expires. Repeat every 30 minutes to keep them out indefinitely. No unlock path exists other than waiting out the window. No SMS recovery, no guardian attestation, no alternative flow.

**Remediation:**
- Don't lock on auth-failures counted by target address; count by authenticated-session/source IP (but only after P2-H-01 is fixed — trusted ingress IP).
- Use exponential backoff (doubling delay) instead of a hard lock, so legitimate users face minor friction while attackers are slowed exponentially.
- If hard locks are required, add a user-initiated unlock path (signed message from a guardian, 2FA confirmation, email/SMS out-of-band).
- Make the response not reveal whether the account is locked vs. signature was wrong — currently responses differ, giving the attacker feedback.

### P2-H-04 — RLS policies likely bypassed by application connection role

**Files:** `migrations/20260121_234000_add_row_level_security.sql` (entire file), `lib/db.ts:37-56` (pool connection setup).

Row-Level Security policies are enabled on `users`, `messages`, `friendships`, `user_rewards`, `proposals`, `endorsements`. The policies rely on `current_setting('app.current_user_address', true)::text` matching the requesting user. The application correctly sets this via `applyDbUserAddressContext` (db.ts:19).

**The problem:** RLS policies are bypassed entirely if the connecting role has the `BYPASSRLS` privilege or is the table owner. PostgreSQL superusers (`postgres`) and schema owners have this by default. The migration doesn't create a dedicated non-privileged application role, doesn't `REVOKE` `BYPASSRLS`, and doesn't document which role the application must connect as for RLS to apply.

If `DATABASE_URL` uses the default `postgres` superuser (documented dev fallback at `db.ts:40-44`: `postgresql://postgres:postgres@localhost:5432/vfide_testnet`), and production typically uses an equivalent owner role, **RLS provides zero defense in depth**.

**Remediation:**
1. Create a dedicated `vfide_app` Postgres role with minimal privileges.
2. `ALTER ROLE vfide_app NOBYPASSRLS;` explicitly.
3. Grant only needed table permissions (SELECT/INSERT/UPDATE/DELETE, no owner-level).
4. Document that `DATABASE_URL` must connect as `vfide_app` in production.
5. Add a startup check: query `SELECT current_user, (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user)`; fail boot if the role bypasses RLS.

### P2-H-05 — `revokeAll` writes a user-level key that is never read

**Files:** `app/api/auth/revoke/route.ts:64-69`, `lib/auth/tokenRevocation.ts:87-125`, `lib/auth/jwt.ts:143-160`.

The revoke endpoint accepts `revokeAll: true`. When set, it calls `revokeUserTokens(authAddress, reason)` which writes Redis key `token:blacklist:user:{address}` with 30-day TTL. The endpoint returns `{ success: true, message: 'All tokens for your account have been revoked' }`.

But `verifyToken` in `jwt.ts` only checks the per-token-hash revocation:

```typescript
const tokenHash = await hashToken(token);
const revoked = await isTokenRevoked(tokenHash);  // checks token:blacklist:{hash}
if (revoked) { return null; }
```

It never calls `isUserRevoked(payload.address)`. The user-level revocation key is written to Redis but never read. Consequence: "Revoke all sessions" / "Logout everywhere" returns success but has **zero effect** on existing tokens. Tokens already issued continue to authenticate until their natural 24h expiry.

This specifically defeats the security-response workflow for a compromised account: "the user's phone was stolen, revoke all their tokens" — does nothing.

**Remediation:** In `verifyToken`, after JWT decode succeeds, also call `isUserRevoked(payload.address)` and compare its `revokedAt` timestamp to the token's `iat`. If `revokedAt > iat * 1000`, reject the token.

```typescript
const userRev = await isUserRevoked(payload.address);
if (userRev && payload.iat && userRev.revokedAt > payload.iat) {
  return null;
}
```

### P2-H-06 — 2FA endpoint has no verifier; the feature is half-built

**Files:** `app/api/security/2fa/initiate/route.ts` (exists), `app/api/security/2fa/route.ts` (does NOT exist), full-codebase grep of `two_factor_codes`.

`/api/security/2fa/initiate` generates a 6-digit code via `crypto.randomInt`, hashes with SHA-256, stores in `two_factor_codes` table with 5-minute TTL, sends via SendGrid. Good primitives.

But no endpoint reads the `two_factor_codes` table. A full-codebase grep for `two_factor_codes` returns only this one file. There is no `/api/security/2fa/verify` route, no `/api/security/2fa/route.ts`, no reference to the table from any other code path. Codes are written and then expire unused.

Implication: either (a) the feature is dead and any UI claiming "2FA enabled" is misleading, or (b) some flow gates sensitive action behind 2FA and unconditionally allows it because the verification path doesn't exist. If any admin or high-value operation is claimed to be 2FA-protected, that protection is illusory.

**Remediation:**
- If 2FA is intended: build `POST /api/security/2fa/verify` that accepts a code, hashes, compares against the row, enforces attempt counts (e.g., 5 wrong attempts = invalidate code), deletes on success, and sets a short-lived `2fa_verified` flag tied to the user's session for downstream gates.
- If 2FA is not intended for this release: remove `/api/security/2fa/initiate`, drop the `two_factor_codes` migration, and remove any UI/docs claiming 2FA is available.

Leaving a half-built auth feature in place is worse than not shipping it — auditors and users will assume it works.

### P2-H-07 — `GET /api/security/recovery-fraud-events` has no authentication

**File:** `app/api/security/recovery-fraud-events/route.ts:115-150`.

The GET endpoint is rate-limited but has no `requireAuth` call. Any anonymous caller can fetch the recent recovery-fraud event stream:

```http
GET /api/security/recovery-fraud-events?sinceMinutes=1440&limit=500
```

The response includes vault addresses, proposed new owners, approval counts, threshold, and whether the recovery attempt is still active. This is a real-time attack-intelligence feed. An attacker can:
1. Watch for which vaults are being targeted by competing attackers (avoid collisions).
2. Identify which vaults have active watcher networks (avoid those).
3. Deduce vault values from attempt-frequency patterns.
4. Enumerate proposed-owner addresses of ongoing attacks to set up frontrunning on the RecoveryManager contract.

Additionally, the store is in-memory only (line 26) — process-scoped `RecoveryFraudEvent[]` array, capped at 1000 entries. In serverless/multi-replica deployments, events fragment across instances. On cold start, all events are lost. This is the literal signal that someone is trying to steal a vault, silently fragmenting and discarding.

**Remediation:**
1. Require auth on GET. Scope results to vaults the caller owns or guards.
2. Persist events to a database table instead of in-memory.
3. On POST, verify the caller has standing to report on the named vault (owner / guardian / watcher).
4. Consider moving this to a server-sent-events stream bound to subscription rather than open polling.

### P2-H-08 — WebSocket server does not check JWT revocation

**File:** `websocket-server/src/auth.ts:33-60`, `websocket-server/src/index.ts:299-308`.

The HTTP API's `verifyToken` (`lib/auth/jwt.ts`) checks token revocation via `isTokenRevoked(tokenHash)`. The WebSocket's `verifyJWT` does not — it only verifies the JWT signature and claims.

Consequences:
1. User logs out → HTTP revokes token → WebSocket session continues until natural JWT expiry (24h).
2. User clicks "Revoke all devices" → same as above — plus the bug in P2-H-05 means even the HTTP side doesn't honor user-level revocation.
3. Attacker steals a token and connects via WebSocket → user cannot terminate the session by revoking the token.

The WebSocket receives sensitive real-time data (notifications, chat, presence, proposal updates). Maintaining an attacker's WebSocket session past token revocation is equivalent to the user never being able to log out for WS purposes.

**Remediation:**
1. Import or replicate `isTokenRevoked` and `isUserRevoked` in the WebSocket `auth.ts`. Call both during `authenticateClient`.
2. Add periodic revocation re-checks for long-lived connections: every 5 minutes, check if the session's token has been revoked, and if so, close with 4001.
3. Consider publishing revocation events on a Redis pub/sub channel that WebSocket servers subscribe to, for immediate session termination on logout.

### P2-H-09 — Three more `security/*` routes leak data via unauthenticated GET (same pattern as P2-H-07)

**Files:** `app/api/security/guardian-attestations/route.ts:184-262`, `app/api/security/next-of-kin-fraud-events/route.ts`, `app/api/security/qr-signature-events/route.ts`.

Same anti-pattern as P2-H-07. All three routes require auth on POST but NOT on GET, and all three use per-process in-memory `const store: T[] = []` arrays. All three expose sensitive security telemetry without requiring a caller to authenticate.

**Guardian attestations** (the worst of the three): GET with `?mode=summary` returns top owners and top guardians system-wide. GET with `?guardian=0xFOO` returns every active attestation naming that guardian. An attacker can enumerate the full owner↔guardian relationship graph for the protocol. For financial sovereignty in emerging markets this is the primary reconnaissance surface:

1. Identify every address's guardian set (for social-engineering the weakest guardian).
2. Identify guardians-of-many (for concentrated compromise).
3. Identify addresses with no or few guardians (easiest recovery attacks, since threshold is low).

**Next-of-kin fraud events** and **QR signature events** are smaller attack surfaces individually but reveal active-monitoring signals the same way P2-H-07 does for recovery fraud: attackers learn what's being watched and what's not.

All three also inherit the in-memory-store problem: events fragment across serverless instances, evict oldest at small caps, and are lost on cold start. Legitimate operators cannot depend on these endpoints as fraud surveillance in any realistic deployment.

**Remediation:** Apply P2-H-07's remediation to all four routes:
1. Require auth on GET. For guardian-attestations, scope summary queries to admins only; scope guardian-lookup queries to the authenticated address's own attestation set (owner of the vault OR the guardian named).
2. Persist to DB (new tables: `security_recovery_fraud_events`, `security_guardian_attestations`, `security_next_of_kin_fraud_events`, `security_qr_signature_events`).
3. On POST, verify the caller has standing to report on the named vault/owner.

### P2-H-10 — `POST /api/security/violations` is a user-writable audit table with attacker-controlled `ipAddress`

**File:** `app/api/security/violations/route.ts:93-138`.

Authenticated endpoint allows ANY user to write a security violation for their own account with arbitrary `violationType`, arbitrary severity ('low'|'medium'|'high'|'critical'), arbitrary description up to 2000 chars, AND arbitrary `ipAddress` string supplied in the request body (line 131 inserts `ipAddress ?? null` directly — never derived from the actual request).

Attack scenarios this enables:

1. **Fake exculpatory evidence.** User plans fraudulent activity, then posts "critical" violations claiming IP X.X.X.X (an innocent party's IP) attempted unauthorized access. Months later when charged, user points to the audit trail as proof they were hacked.
2. **False incriminating evidence against third parties.** User logs violations naming a specific IP. If dispute resolution consults this table to identify attack sources, the user has planted bad data against a chosen victim's IP.
3. **Table flooding.** User logs up to rate-limit (30/min) for extended periods, filling `security_violations` with their own rows, degrading legitimate audit for real violations.
4. **Severity inflation for social proof.** User posts 'critical' violations repeatedly; if UI surfaces these, it creates appearance of attack activity useful for support-ticket escalation plays.

The rate-limit tier is `api` (more permissive than `write`) — too generous for a state-modifying endpoint writing to an audit table.

**Remediation:**
1. If this endpoint is meant for user-visible reporting: derive `ipAddress` server-side via `getRequestIp(request.headers)` from `lib/security/requestContext.ts`. Constrain `severity` to `'low'` for user-submitted reports; only admin/service tokens can log higher severities.
2. If this is meant for internal services: require a machine-auth token (like `webhook-replay-metrics` does at line 61), not user JWT.
3. Change rate limit from `api` to `write`.
4. Consider: user-submitted reports should go to a separate `user_submitted_security_reports` table, not the `security_violations` audit table read by internal systems.

### P2-H-11 — `validateEnvironment()` is never invoked; all fail-fast boot checks are dead code

**File:** `lib/startup-validation.ts` (entire file), absence of any importer in the app boot path.

The file exports `validateEnvironment()` with a comprehensive set of production fail-fast checks:
- Redis is required in production (line 60-67, `CRITICAL: UPSTASH_REDIS_REST_URL...required in production`).
- JWT_SECRET must be ≥32 characters (line 53-57).
- JWT_SECRET cannot contain default strings (`change-me`, `your-secret-here`, `secret`, `default`) (line 38-51).
- `PREV_JWT_SECRET !== JWT_SECRET` check to prevent the common rotation mistake (line 72-76).
- Throws hard in production runtime (line 96-101).

But a full-codebase grep for `validateEnvironment` or `startup-validation` (excluding tests and the file itself) returns zero matches. No `instrumentation.ts`, no root layout call, no `middleware.ts` invocation. **None of these checks ever run.**

Consequence: you can deploy to production with:
- `JWT_SECRET=test` — 4-byte secret, every JWT signed with it is trivially crackable.
- `JWT_SECRET=your-secret-here` — default placeholder accepted.
- `JWT_SECRET=change-me-please` — also accepted (the length check fires only in the dead validator).
- `PREV_JWT_SECRET=<same-as-JWT_SECRET>` — rotation silently broken.
- No Redis at all — combined with P2-H-02 (rate limit fallback fails open), rate limiting is off.

`lib/auth/jwt.ts:21` does fail fast if `JWT_SECRET` is *missing*, but it performs no length, entropy, or default-value check. So a deployer who sets any non-empty value passes.

**Remediation:**
1. Create `instrumentation.ts` at the project root (Next.js 13.4+ hook for server boot) and call `validateEnvironment()` there:
   ```typescript
   // instrumentation.ts
   export async function register() {
     if (process.env.NEXT_RUNTIME === 'nodejs') {
       const { validateEnvironment } = await import('@/lib/startup-validation');
       validateEnvironment();
     }
   }
   ```
2. Add an equivalent call in `websocket-server/src/index.ts` before `server.listen` — the WS server is a separate process and must validate independently.
3. Expand the default-secrets blacklist: add `test`, `password`, `admin`, `12345678`, `placeholder`, `example`, `dev`, `local`.
4. Add minimum-entropy check: reject any JWT_SECRET where `Set(secret.split('')).size < 16` (too few unique chars) or where Shannon entropy is low.
5. Add an integration test that boots the app with `JWT_SECRET=test` and asserts it crashes.

### P2-H-12 — USSD endpoint has no telco-gateway authentication and returns deceptive "payment submitted" text for a mock flow

**File:** `app/api/ussd/route.ts` (entire file, esp. lines 47-48, 70-91).

USSD (Unstructured Supplementary Service Data) is the phone-based menu interface users access by dialing short codes like `*483*1#`. It's critical for the emerging-market demographic VFIDE targets — users without smartphones or data plans still have USSD access. A telco gateway (Africa's Talking, Hubtel, MNO-operated) POSTs session state to this endpoint on every menu navigation.

Two separate problems:

**Problem 1: No ingress authentication.** The route accepts any POST claiming to be a USSD session. No IP allowlist, no shared-secret validation, no HMAC. Real USSD gateways sign their requests (Africa's Talking uses a shared key in headers; MNO-direct integrations use IP allowlisting). This implementation accepts:

```http
POST /api/ussd
Content-Type: application/x-www-form-urlencoded

sessionId=attacker-forged&phoneNumber=254712345678&text=1*SHOP001*1000000*1
```

…as if it came from the real telco. An attacker can:
1. Simulate a payment session from any phone number to any merchant.
2. Log entries at line 77 record `254712***` — a dispute-resolution process later would see `254712***` as the apparent originator, implicating a real phone that was never involved.
3. Flood the endpoint with sessions — no per-phone rate limit (only generic IP-based `write` tier at line 71), which treats all telco-forwarded traffic as one IP.

**Problem 2: The "payment submitted" response lies.** Lines 47-48:

```typescript
return `END Payment of ${parts[2]} VFIDE to ${parts[1]} submitted.\nYou will receive an SMS confirmation.`;
```

No database write. No transaction enqueue. No SMS dispatch. No on-chain call. The route returns a static string claiming the payment worked. For a user relying on USSD because they have no other payment rail, this is actively dangerous:

- User sends `*483*1*SHOP001*1000#` expecting a real transfer.
- Response says "Payment submitted, SMS incoming."
- No SMS arrives. No money moves.
- User doesn't know whether to retry. Merchant sees no payment but user claims they paid.
- If retried, UI still says "submitted" — user may attempt multiple times assuming previous attempts failed silently.

For an emerging-market financial sovereignty product, this is the worst possible mode: a critical-user-path that looks like it works and silently does nothing.

**Remediation:**

Immediately:
1. Return a provisional response until the feature works: `CON Payment flow coming soon. Press 0 to exit.`
2. Do not claim "SMS confirmation" until SMS dispatch is wired.

Before enabling the real flow:
1. Add gateway authentication. For Africa's Talking: validate the `X-AfricasTalking-Signature` header (HMAC over canonical body with a shared secret in env). For MNO-direct: IP-allowlist the gateway's known source IPs.
2. Derive `phoneNumber` from the authenticated gateway payload only — never accept it as an overrideable body field.
3. Implement per-phone-number rate limiting (distinct from per-IP — the telco gateway's IP is shared across all users).
4. Implement per-phone session state storage (current menu level, pending transaction) in Redis with short TTL, not reconstructed from `text` field alone.
5. Gate the final payment submit step behind a second OTP via SMS — the user enters the OTP in USSD, the server confirms, then submits.
6. Hash phone numbers for logging instead of prefix truncation. A 7-char prefix of a 12-digit phone number leaks country code + mobile network + subscriber range prefix — partial reconstruction via external data is often feasible.

### P2-H-13 — Session key service is a client-side-only permissions record, misleadingly named "session key"

**File:** `lib/sessionKeys/sessionKeyService.ts` (entire file, 'use client' at line 1).

The name "session key" implies the ERC-4337 / smart-account pattern: a cryptographic keypair with limited on-chain permissions that can sign transactions on the user's behalf within bounded constraints. This implementation is not that. It is a browser-local permissions log with no cryptographic or on-chain enforcement. Six separate problems compound:

**(1) State lives in user-controllable browser storage.** Line 111-119: `sessionStorage` or `localStorage` (when `NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS=true`). Any attacker with XSS, a malicious browser extension, or dev tools can:
- Edit permissions in storage to bump limits to uint256 max.
- Rewrite `callsUsed` back to 0 to reset the counter.
- Flip `isActive: false` back to `true` to resurrect a revoked session.
- Skip `validateCall` entirely and have the app sign without the pre-check.

Any permission check that lives in the same storage the attacker controls provides zero security.

**(2) `keyAddress` is a fake Ethereum address with no private key.** Line 236-237:

```typescript
const keyAddress = keccak256(toBytes(`${sessionId}-key`)).slice(0, 42) as Address;
```

Nobody has the private key to this address — it is simply a hash. If any code path treats `keyAddress` as a transaction signer it will fail silently (no signature produced) or tokens sent to this address are permanently unrecoverable. The inline comment at line 236 — `"in production, use proper key derivation"` — acknowledges the problem but was not fixed before shipping.

**(3) Session ID derived from `Math.random()`.** Line 232-233. Non-CSPRNG; Chrome/Firefox use xorshift128+ which is publicly broken (a few consecutive outputs reveal the full state). An attacker observing session creation timing can reconstruct the ID.

**(4) `validateCall` is client-side code.** Line 291-366 runs in the user's browser. Any attacker with script-level access in the same origin can skip it by calling the signing function directly.

**(5) Token-amount extraction is incomplete.** Line 181-202 handles only `approve(address,uint256)` (selector `0x095ea7b3`) and `transfer(address,uint256)` (`0xa9059cbb`). Misses:
- `transferFrom(address,address,uint256)` → `0x23b872dd` — bypass the amount limit.
- `permit(...)` EIP-2612 → `0xd505accf` — meta-approvals with arbitrary amounts.
- `increaseAllowance(address,uint256)` / `decreaseAllowance(address,uint256)` — standard extensions.

A permission capping `maxTokenAmountPerCall` protects against calls using the two covered selectors. Any call using a different selector to the same token contract bypasses the amount check entirely (only `maxCalls` and `maxValuePerCall` apply).

**(6) Persistent mode exposes permissions to XSS indefinitely.** Line 114: when `NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS=true`, permissions survive browser restarts. A single XSS injection at any point in the user's session history extracts all pre-approved permission records — including their `maxTotalValue` limits and target contract addresses.

**Impact:** If the app UI uses `validateCall` to decide whether to skip a confirmation prompt (the natural design), an attacker who tampers with `localStorage` can make any transaction appear pre-approved, causing the app to sign without user review. Users reading "session keys with spending limits" in the product UI will believe the limits are enforced — they aren't.

**Remediation:**

Short term (if this feature is client-only UX convenience, not security):
1. Rename. Don't call it "session keys" and don't describe it as a security feature. Call it "pre-approval records" or similar. The UI must make clear that every transaction still requires wallet approval regardless of pre-approvals.
2. Replace `Math.random()` with `crypto.getRandomValues()`.
3. Remove `keyAddress` (it isn't used as a real address). Or if it's displayed in UI, label it as "permission record ID" not "key address".
4. Expand token-amount extraction to all common ERC-20 selectors or default to rejecting unknown selectors when amount limits are set.
5. Default to session-scoped storage (not persistent). Remove the `NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS` flag or gate it behind explicit user opt-in with a dire warning.

Long term (if session keys are intended as a security feature):
1. Implement properly via ERC-4337 user operations with a smart account (e.g., Safe{Core} modules, ZeroDev kernel). The session key must be a real keypair, signed authorizations must be on-chain, and the smart-account contract enforces permissions at call time. The browser cannot be trusted to enforce.
2. Alternatively, wait for EIP-7702 deployment and use native account-abstraction.
3. In all cases: the browser is the adversary's potential residence, not a trusted enclave.

### P2-H-14 — `sanitizeText` in `lib/auth/validation.ts` is a naive script-tag-only filter providing false XSS security

**File:** `lib/auth/validation.ts:29`.

```typescript
const sanitizeText = (val: string) => val.replace(/<script[^>]*>.*?<\/script>/gi, '').trim();
```

This is called from the `safeText`, `shortText`, `safeTextMax`, `shortTextRange`, `sendMessageSchema.content`, `sendGroupMessageSchema.content`, `createProposalSchema.description`, `createNotificationSchema.message`, `endorsementSchema.message`, `activitySchema.description`, and every other "safe" schema in the 350-line file. The name and exports make it look like the project's centralized XSS defense.

It is not. The regex only strips paired `<script>...</script>` tags. It accepts, with zero obstruction, every standard XSS vector:

- Event-handler attributes: `<img src=x onerror="alert(1)">`
- SVG: `<svg onload="alert(1)">`
- iframe javascript URI: `<iframe src="javascript:alert(1)">`
- Anchor javascript URI: `<a href="javascript:alert(1)">click</a>`
- Unclosed scripts: `<script/>` or `<script src=evil.js>` (no closing tag — regex requires `</script>`)
- Nested bypass: `<scr<script></script>ipt>alert(1)</script>` — after the inner pair strips, becomes `<script>alert(1)</script>` (a new script).
- Style injection: `<style>@import url(evil.com/pwn.css)</style>`
- Data URIs, Object tags, Form tags with malicious `action`, CSS expression() in older browsers.

Grep shows nothing currently imports this file (`lib/auth/validation.ts` has no importers outside itself). So the immediate exploitation surface is limited. But the file's documentation (`"Centralized validation for all API endpoints"`) is an invitation for future developers to adopt it — at which point every `safeText`-sanitized field becomes an XSS source.

**Worse than unsafe — misleading.** A developer seeing `z.string().transform(sanitizeText)` and reading the header comment will reasonably conclude that XSS is handled at the input layer. They may skip escaping at the render layer as a result. The net outcome is an app with less XSS defense than if no sanitization existed, because developers stopped escaping output.

**Remediation:**

Option A (preferred) — Remove all input-layer sanitization:
1. Delete the `sanitizeText` transform. Store strings verbatim.
2. Escape at render. React does this automatically for `{variable}` in JSX. For any use of `dangerouslySetInnerHTML`, use DOMPurify with a strict allowlist.
3. Never trust "sanitized" strings stored in the DB.

Option B — If a real input-layer HTML sanitizer is wanted (for rich-text fields the user composes as HTML): use DOMPurify server-side (e.g., via `isomorphic-dompurify`). Document clearly that it's an allowlist-based HTML sanitizer intended only for fields that will be rendered as HTML.

In either case, rename to avoid the "safe" prefix: `safeText` implies the output is safe to render anywhere, which no input-layer transform can guarantee.

### P2-H-15 — Two parallel migration runners with incompatible `schema_migrations` schemas

**Files:** `lib/migrations/index.ts` + `lib/migrations/cli.ts` (exposed via `npm run migrate:up`), `scripts/migrate.ts` (invoked as `npx tsx scripts/migrate.ts`).

The project has two independent migration systems:

**Runner A — `lib/migrations/`:**
- Detects `CREATE INDEX CONCURRENTLY`, `REINDEX CONCURRENTLY`, `VACUUM`, `CLUSTER` via `requiresNonTransactionalExecution` (line 41-44).
- For migrations containing those, runs statement-by-statement outside a transaction.
- Otherwise wraps the whole migration in `BEGIN/COMMIT/ROLLBACK`.
- Creates and uses `schema_migrations (name TEXT, applied_at TIMESTAMPTZ)` with `idx_schema_migrations_name`.
- Inserts `INSERT INTO schema_migrations (name, applied_at) VALUES ($1, NOW())`.

**Runner B — `scripts/migrate.ts`:**
- Wraps every migration unconditionally in `BEGIN ... client.query(sql) ... COMMIT`.
- No CONCURRENTLY detection.
- Creates and uses `schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)`.
- Inserts `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`.

Two immediate problems:

1. **The two runners have mutually incompatible `schema_migrations` table definitions.** Runner A tracks migrations by `name`; Runner B tracks by `version`. If an operator runs one first and switches, the second's INSERT fails because the expected column doesn't exist. Neither runner drops or alters the tracking table — they just assume it matches their convention.
2. **Runner B will fail on the one concurrent-index migration.** `20260130_120000_add_reward_verification_columns.sql` contains `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_rewards_source_contract`. Postgres rejects CONCURRENTLY inside a transaction. Runner B wraps everything in a transaction. Result: this specific migration is unapplicable via `scripts/migrate.ts`.

The scripts directory at `scripts/migrate.ts:7-12` documents itself as the runner (`npx tsx scripts/migrate.ts`). But `package.json` exposes `npm run migrate:up` pointing to `lib/migrations/cli.ts`. An operator following one doc or the other runs different code. A CI pipeline using one and local dev using the other produces divergent `schema_migrations` state.

**Remediation:**
1. Pick one runner, delete the other. The `lib/migrations/` implementation is the more mature one (CONCURRENTLY detection, rollback support, statement splitter handling dollar-quoted blocks and comments) — keep it.
2. Remove `scripts/migrate.ts` entirely. Update any README/deployment-runbook references.
3. If both need to coexist during a migration period: standardize on a single `schema_migrations` schema; make both runners read and write the same columns.

### P2-H-16 — Anomaly detection records activity but never analyzes it; detection code is dead

**File:** `lib/security/anomalyDetection.ts:116-138` (analyzeActivity), grep across codebase.

The module exports a detection pipeline: `analyzeActivity` → `checkLocationAnomaly` (≥3 unique IPs) → `checkDeviceAnomaly` (≥4 unique user-agents) → `checkRapidRequests` (≥50 req/min). Each returns an `AnomalyAlert` with severity and `suspiciousActivities` list.

But a full-codebase grep for `analyzeActivity` (excluding tests and the file itself) returns zero matches. The only caller of the module is `app/api/security/anomaly/route.ts`, which calls `recordActivity` (storing events) and `getAnomalyStats` (returning aggregate counts) — never `analyzeActivity`. No route, library, or scheduled job ever runs the detection.

Two compounding issues:

1. **The alert object has a wrong field.** Lines 179, 208, 234:
   ```typescript
   userAddress: activities[0]?.endpoint || 'unknown',
   ```
   The `userAddress` field in the alert is populated from `activities[0].endpoint` — the URL path of the first recorded activity, not the user's wallet address. If alerts ever fired, they'd report `userAddress: '/api/security/anomaly'` (or similar endpoint paths). Clear sign this code was never run end-to-end.

2. **`clearActivityHistory` is also dead.** Intended to reset history after a security action (e.g., after a password reset, clear the pre-reset activity so the new session's IP doesn't trigger "location change"). Never called.

The anomaly-detection system accumulates data in Redis (or in-memory fallback) with no analytical outcome. Disk/memory consumed for no purpose, and users get no protection from the threats the code purports to detect.

**Remediation:**
1. Wire `analyzeActivity` into the auth flow: call it after successful SIWE verification; on alert, record to `security_account_events` (via the existing `recordSecurityEvent` in `accountProtection.ts`) and consider step-up auth or account lock.
2. Fix the `userAddress` field bug — it should be the input `userAddress` parameter, not `activities[0].endpoint`.
3. Wire `clearActivityHistory` to fire on successful password reset / key rotation / guardian recovery.
4. If the detection system isn't ready to be enabled: remove `recordActivity` calls from `/api/security/anomaly` (don't accumulate data the system doesn't use). Remove the public `getAnomalyStats` endpoint so users aren't misled into thinking anomalies are being monitored.

### P2-H-17 — Three parallel IP-extraction implementations; only one is correct

**Files:** `lib/security/requestContext.ts:34-65` (correct), `lib/auth/rateLimit.ts:139-152` (bypassed — P2-H-01), `lib/security/anomalyDetection.ts:289-299` (bypassed).

```typescript
// anomalyDetection.ts:289-299 — third copy of the broken pattern
export function getClientIP(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}
```

Trusts user-controllable headers unconditionally. Same issue as P2-H-01 and P2-M-12, just in a different file. The correct `requestContext.ts::getRequestIp` defaults to fail-closed in production unless `VFIDE_TRUST_PROXY_HEADERS=true` is set.

Given that the anomaly detection code is dead (P2-H-16), this specific copy isn't being exploited today. But the pattern indicates a systemic issue: every developer who needs "what's the client IP" writes their own extraction, none of them know about `requestContext.ts`, and the broken pattern proliferates.

**Remediation:**
1. Delete `getClientIP` in `anomalyDetection.ts`. Import from `requestContext.ts`.
2. Delete `getClientIdentifier`'s IP logic in `rateLimit.ts`. Same import.
3. Grep the codebase for every other reinvention of this pattern (`x-forwarded-for`, `cf-connecting-ip`, `x-real-ip`) and route all of them through `getRequestIp`.
4. Add an ESLint rule forbidding direct reads of those headers outside `lib/security/requestContext.ts`.

---

## 5. Findings — Medium

### P2-M-01 — `vercel.json` empty `headers: []` may override `next.config.ts` headers

**File:** `vercel.json:8`.

`vercel.json` declares `"headers": []`. Depending on Vercel's merge strategy, this empty array may suppress security headers declared in `next.config.ts`.

**Remediation:** Remove the `"headers": []` line from `vercel.json`. Verify in staging with `curl -I` that expected headers are present.

### P2-M-02 — SIWE challenge IP/UA binding is user-hostile without security value

**File:** `lib/security/siweChallenge.ts:200-206`.

Challenge records capture IP and user-agent; `consumeAndValidateSiweChallenge` rejects the sign-in if either changes. IP comes from user-controlled headers (P2-H-01), so it blocks zero real attackers — while breaking mobile users switching WiFi→cellular and users updating their browser mid-flow. The 5-minute TTL + `getdel` atomicity already provide sufficient replay/race protection.

**Remediation:** Remove IP and UA binding. Rely on nonce (128-bit entropy), domain, chain-id, 5-minute TTL, atomic consume-and-delete.

### P2-M-03 — `users_read_public USING (true)` makes read-side RLS meaningless

**File:** `migrations/20260121_234000_add_row_level_security.sql:22-24`.

`CREATE POLICY users_read_public ... USING (true)` allows any user to SELECT any row from `users`. OR-combined with `users_read_own`, net effect is unrestricted reads. Same pattern for `proposals_read_all` (line 146) and `endorsements_read_all` (line 160). The inline comment "sensitive fields handled by application" is the exact anti-pattern RLS is supposed to replace.

**Remediation:** (a) Restrict column-level access via GRANT, (b) replace the broad policies with views projecting only public fields, or (c) explicitly document these tables as non-RLS-protected and remove the misleading policy.

### P2-M-04 — `verifyOnChainAdmin` silently downgrades to env-var-only when RPC unset

**File:** `lib/auth/middleware.ts:143-171`.

Line 148: `return ADMIN_ADDRESSES.has(address.toLowerCase())` — silent fallback to env-var check. The F-19 FIX (on-chain admin verification) is defeated in any deployment missing `OCP_ADDRESS` or `RPC_URL`.

**Remediation:** In production, fail-closed when those vars are missing. Log a startup error.

### P2-M-05 — `verifyOnChainAdmin` has no fetch timeout

**File:** `lib/auth/middleware.ts:151-160`.

`fetch(rpcUrl, ...)` without `signal: AbortSignal.timeout(N)`. Slow/hanging RPC stalls admin checks indefinitely.

**Remediation:** Wrap with `AbortSignal.timeout(3000)`.

### P2-M-06 — WebSocket rate limiter is in-memory per-instance

**File:** `websocket-server/src/rateLimit.ts:1-63`, `websocket-server/src/index.ts:106-114`.

The comment acknowledges "For production deployments with multiple server replicas, replace this with a Redis-backed implementation." Each replica has its own per-IP buckets. Cluster-wide limit = per-replica × replica count.

**Remediation:** Replace with Upstash Redis-backed sliding window, same pattern as `lib/auth/rateLimit.ts`.

### P2-M-07 — WebSocket `TOPIC_ACL_ALLOW_MISSING=true` is fail-open

**File:** `websocket-server/src/index.ts:39, 234-279`.

This env var silently allows all topics to any authenticated user when the ACL snapshot is missing. If mistakenly set in production (or if the snapshot file is inaccessible and this flag is true), authenticated users can subscribe to any topic including private chats between other users (`chat.{userA}.{userB}`).

**Remediation:** Remove this env-var, or gate to non-production only (check `NODE_ENV !== 'production'`).

### P2-M-08 — CSP report violations stored in-memory only in production

**File:** `app/api/security/csp-report/route.ts:24-26, 147-149`.

Comment at line 24 states "in production, use database" — TODO at line 147-149 (`// await sendToSentry(record);`) commented out and never implemented. Violations are lost on instance cycling.

**Remediation:** Persist to a `csp_violations` table (append-only, retention-bounded), or forward to Sentry's existing CSP endpoint via the already-configured Sentry SDK.

### P2-M-09 — Key directory accepts arbitrary `algorithm` string from client

**Files:** `app/api/security/keys/route.ts:34, 109, 165`.

Zod schema permits any non-empty string for `algorithm`. Server stores whatever client provides. Downstream consumers reading keys via GET receive this string and (presumably) switch encryption logic based on it. Attacker publishing `algorithm: "PLAINTEXT"` or `algorithm: "ROT13"` could cause messages encrypted to that user to be trivially decrypted, or cause the recipient's client to reject messages entirely (DoS).

**Remediation:** Server-side allowlist: `algorithm: z.literal('ECDH-P256-SPKI').optional()`.

### P2-M-10 — `/api/auth/challenge` defaults chainId to 8453 (Base mainnet)

**File:** `app/api/auth/challenge/route.ts:33`.

`const chainId = body.chainId ?? 8453;` — hardcoded Base mainnet fallback. A client that omits chainId gets a mainnet challenge regardless of deployment environment. On testnet/staging, mainnet-bound challenges could be replayed on mainnet.

**Remediation:** Default to `parseInt(process.env.NEXT_PUBLIC_CHAIN_ID)` rather than hardcoded `8453`. Reject the request if neither is available.

### P2-M-11 — POST to `/api/security/recovery-fraud-events` accepts fraud reports on any vault

**File:** `app/api/security/recovery-fraud-events/route.ts:61-106`.

Beyond the public-read issue (P2-H-07), POST does require auth but does not verify the authenticated user has standing to report on the named `vault`. Authenticated attacker can flood the in-memory store with fake fraud events for arbitrary vaults, evicting real fraud signals (line 99 evicts oldest when > 1000 events).

**Remediation:** Verify the caller is the vault's owner, a registered guardian, or a RecoveryManager watcher before accepting the report.

### P2-M-12 — Two parallel IP-extraction implementations with divergent trust models

**Files:** `lib/security/requestContext.ts:34-65` (correct), `lib/auth/rateLimit.ts:139-152` (bypassed).

`lib/security/requestContext.ts::getRequestIp` is implemented correctly:
- Defaults to fail-closed in production: returns `{ ip: 'unknown', source: 'proxy-headers-untrusted' }` unless `VFIDE_TRUST_PROXY_HEADERS=true` is explicitly set.
- Validates IP shape via `node:net` `isIP`.
- Handles IPv6-mapped-IPv4, port suffixes, bracket notation.

`lib/auth/rateLimit.ts::getClientIdentifier` (the one P2-H-01 flags) is implemented independently and trusts `cf-connecting-ip`/`x-real-ip`/`x-forwarded-for` unconditionally. Same project, same threat model, two different implementations.

The `requestContext.ts` pattern is the fix. The rate limiter should use it. Also audit every other caller of IP in the codebase (`app/api/security/violations/route.ts:131` takes IP from body; account protection logs IP from events; SIWE challenge binds IP) and route them all through the single helper.

**Remediation:** Delete `getClientIdentifier` in `lib/auth/rateLimit.ts` and use the shared `getRequestIp` helper. Having two IP-extraction implementations means one gets fixed and the other doesn't.

### P2-M-13 — Error sanitizer is well-designed but never invoked from API routes

**Files:** `lib/security/errorSanitizer.ts` (all 230 LOC), all 120 API routes.

`lib/security/errorSanitizer.ts` maps internal error messages to safe user-facing strings, redacts PII (wallet addresses, IPs, SSNs, card numbers) for logging, and tags severity. File-level comment says: "Maps internal/technical errors to user-friendly messages to prevent information disclosure (M-4 mitigation)."

A grep across the codebase finds only two importers: the sanitizer itself and `lib/optimization/errorHandling.ts`. **Zero API routes use it.** The M-4 mitigation is documentation, not enforcement.

Most routes happen to return hardcoded safe strings (`{ error: 'Failed to revoke token' }`) — which avoids leaks by accident. But inconsistently:
- `app/api/security/2fa/initiate/route.ts:191` returns `{ error: message }` where message is `sendError.message` from SendGrid/Twilio — upstream error text flows through unfiltered.
- Several routes do `return NextResponse.json({ error: error.message })` in catch blocks, exposing raw internal messages.

Additionally, `getUserFriendlyMessage` at line 174-176 passes short unknown errors (<100 chars, no slash, no 'localhost') through verbatim — leaking Postgres error codes, Solidity revert strings, JWT library messages.

**Remediation:**
1. Add shared helper `lib/api/errorResponse.ts`:
   ```typescript
   import { handleErrorWithLogging } from '@/lib/security/errorSanitizer';
   export function apiError(error: unknown, context?: string, status = 500) {
     return NextResponse.json({ error: handleErrorWithLogging(error, context) }, { status });
   }
   ```
2. Replace ad-hoc `{ error: error.message }` with `apiError(error, 'context')`.
3. Remove the short-error passthrough in `getUserFriendlyMessage`. Default to the safe fallback unless a pattern matches.
4. Add an ESLint rule forbidding `error.message` in `NextResponse.json` bodies.

### P2-M-14 — `validateProduction.ts` strict checks only fire under CI/Vercel

**File:** `lib/validateProduction.ts:131, 138, 187`.

The strict production validator gates most checks behind `strictProduction = isProduction && isCI && !frontendOnly`, where `isCI = process.env.CI === 'true' || process.env.VERCEL === '1'`. A self-hosted production deployment with `NODE_ENV=production` but no CI env markers bypasses:

- HTTPS enforcement on `NEXT_PUBLIC_APP_URL` (line 236-239).
- Localhost-blocking on `NEXT_PUBLIC_APP_URL` (line 242-244).
- Chain-ID integer validation and runtime-vs-deployment match check (lines 191-208).
- Vault implementation validation (line 210-218).
- Testnet-in-production warning (line 230-232).

A self-hoster who runs `npm run validate` locally (which passes, because they're in dev) then deploys via `docker run -e NODE_ENV=production ...` without CI/Vercel markers gets none of these checks.

**Remediation:** Drop the `isCI` gate. If `NODE_ENV === 'production'`, run the strict checks unconditionally. The `frontendOnly` escape hatch is sufficient for pure-frontend deployments; `isCI` adds nothing except a loophole.

### P2-M-15 — `validateProduction.ts` permits production deploys with no Redis configured

**File:** `lib/validateProduction.ts:286-299`.

```typescript
if (redisConfigured.length === 0) {
  result.warnings.push('⚠️  Redis is not configured - rate limiting will run in degraded mode');
}
```

Totally-absent Redis is a warning, not an error. Combined with:
- P2-H-02: rate-limit fallback to in-memory per-process Map + fail-open on Redis errors.
- P2-H-11: `startup-validation.ts` (which does require Redis) is never invoked.

Net result: a production deploy with no Redis config passes `validateProduction` with warnings, boots without calling `validateEnvironment`, and runs with effectively no rate limiting. Every auth-tier endpoint becomes unbounded.

**Remediation:** In `validateProduction.ts`, make missing Redis an error (not a warning) when `isProduction && !frontendOnly` — regardless of the `isCI` gate.

### P2-M-16 — `dispatchWebhook` DNS TOCTOU allows SSRF via DNS rebinding

**File:** `lib/webhooks/merchantWebhookDispatcher.ts:94-127, 272`.

The SSRF guard resolves the webhook hostname once (line 112) and blocks private IPs. The subsequent `fetch` call (line 272) resolves the hostname AGAIN. A malicious DNS authoritative server controlled by a registered merchant can return a public IP on the first lookup and `127.0.0.1` (or another internal address) on the second. This is a classic DNS rebinding attack — the security check passes but the actual connection hits internal infrastructure.

Attack scenario: a merchant registers `webhook.attacker.com` which:
- First query: returns `93.184.216.34` (public, passes SSRF check).
- Subsequent queries (within seconds): returns `127.0.0.1` (internal).

The `fetch` connects to `127.0.0.1:443` from the VFIDE backend with full webhook payload, expecting to find whatever internal service listens there (metrics, admin, database proxy). The response body is captured (line 289) and logged to `merchant_webhook_deliveries` (truncated to 1000 chars at line 349) — merchant can later read what the internal service responded.

The attack is realistic because (a) registering a webhook URL is a merchant-self-service flow, and (b) DNS responses with short TTLs are unremarkable — attacker doesn't need any special infra beyond a custom DNS record.

**Remediation:**
1. Pre-resolve the hostname to an IP, validate the IP, then call `fetch` against the IP with the `Host` header manually set:
   ```typescript
   const ip = (await lookup(hostname, { verbatim: true })).address;
   if (isBlockedIpAddress(ip)) return { ok: false, error: '...' };
   const url = new URL(parsed);
   url.hostname = ip;
   await fetch(url, { headers: { host: hostname, ... }, /* TLS SNI workaround may be required */ });
   ```
   Note: Node's `fetch` may not honor a custom `Host` header for TLS SNI. A custom https.Agent with `lookup` that caches the first result for the duration of the request is an alternative.
2. Alternative: use a dedicated egress proxy (ngrok/smokescreen/squid) that enforces the IP allowlist at the network layer, not the application layer.

### P2-M-17 — `decryptSecretFromEndpoint` silently falls back to plaintext webhook secrets

**File:** `lib/webhooks/merchantWebhookDispatcher.ts:144-170`.

```typescript
function decryptSecretFromEndpoint(endpoint: WebhookEndpoint): string {
  if (endpoint.secret_encrypted && endpoint.secret_iv) {
    // ...decrypt using AES-256-GCM
    return decrypted;
  }
  return endpoint.secret;  // plaintext fallback
}
```

If the migration to encrypted storage fails partway (DB error in `encryptAndPersistSecretIfNeeded`, concurrent write race, deploy rolled back before migration completes), the system silently continues delivering with plaintext secrets. The AES-256-GCM encryption code is well-implemented, but the fallback makes its presence optional rather than required.

**Remediation:**
1. In production, reject plaintext fallback:
   ```typescript
   if (process.env.NODE_ENV === 'production' && !endpoint.secret_encrypted) {
     throw new Error(`Webhook endpoint ${endpoint.id} has no encrypted secret`);
   }
   ```
2. Run a one-time migration script that encrypts all existing plaintext secrets, verifies each, then sets `secret = NULL`. After this, the `endpoint.secret` column can be dropped from the schema.
3. Add a periodic monitoring query: `SELECT COUNT(*) FROM merchant_webhook_endpoints WHERE secret_encrypted IS NULL AND secret IS NOT NULL` — alert if nonzero.

### P2-M-18 — Proposal eligibility threshold of `proof_score >= 50` is trivially low

**File:** `app/api/proposals/route.ts:307-315`.

```typescript
const proofScore = Number(proposer.proof_score ?? 0);
const canPropose = proposer.is_council_member || proofScore >= 50;
```

Based on Phase 1 context (ProofScore scales to 10,000+; neutral is ~5,000; high-trust is 8,000+), a threshold of 50 is essentially "has done anything at all." Attackers can Sybil by creating new addresses, performing whatever minimal action bumps proof_score to 50 (signup, first transaction, any interaction), and immediately gain proposal-creation rights.

This enables governance spam: one attacker creates 100 addresses, each proposes 5 bogus proposals, governance UI is overwhelmed, notification systems receive 500 notifications for every council member. Voters can't distinguish real from spam proposals.

**Remediation:**
- Set the threshold to a meaningful trust level — e.g., `proofScore >= 5000` (neutral) as minimum, `>= 7000` ideal.
- Add separate checks: minimum account age (≥30 days), minimum number of endorsements received, etc.
- Add a per-proposer rate limit (max 5 proposals per week per proposer address) independent of IP-based rate limiting.

### P2-M-19 — Proposal title and description have no upper length bound

**File:** `app/api/proposals/route.ts:16-17`.

```typescript
title: z.string().trim().min(1),
description: z.string().trim().min(1),
```

No `.max(...)`. The body-size limit (Next.js default, typically 1MB) is the only constraint. An attacker posts a proposal with a 500KB title and 500KB description. The DB stores it, the `ORDER BY created_at DESC LIMIT 100` query returns all fields including the massive text, frontend renders it, UI breaks.

Repeat 5 times — every proposal list query in the app pulls >2.5MB of text. Governance UI becomes unusable for legitimate users.

**Remediation:** Add `title: z.string().trim().min(1).max(200)` and `description: z.string().trim().min(1).max(10000)`.

### P2-M-20 — Stream creation does not validate temporal or amount consistency

**File:** `app/api/streams/route.ts:11-19, 82-119`.

The `createStreamSchema` validates each field individually but never checks:
- `endTime > startTime` — a stream with `startTime = "2099-01-01"` and `endTime = "2010-01-01"` is accepted. If withdraw logic uses `ratePerSecond × (now - startTime)`, the negative duration could underflow in certain JS arithmetic paths.
- `totalAmount ≈ ratePerSecond × (endTime - startTime)` — these three fields are inherently related. A stream with `totalAmount = 1, ratePerSecond = 1000, duration = 10000s` claims a 1-unit total but the rate-based withdraw would compute 10,000,000 units available.
- `startTime >= now - 1h` — allowing far-past start times means the recipient can claim the full amount immediately ("stream started 5 years ago").

Whether any of these leads to real fund movement depends on the withdraw logic (not shown in this route — presumably a separate endpoint or on-chain). At minimum, the data gets written to the DB in inconsistent state.

**Remediation:** Add cross-field validation to the Zod schema:
```typescript
.refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: 'endTime must be after startTime',
})
.refine(data => {
  const durationSec = (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 1000;
  const computed = data.ratePerSecond * durationSec;
  const tolerance = computed * 0.01; // 1%
  return Math.abs(computed - data.totalAmount) <= tolerance;
}, { message: 'totalAmount must equal ratePerSecond × duration' })
.refine(data => new Date(data.startTime).getTime() >= Date.now() - 3600_000, {
  message: 'startTime cannot be more than 1 hour in the past',
});
```

### P2-M-21 — `POST /api/referral` is unauthenticated and allows referral-link generation for arbitrary addresses

**File:** `app/api/referral/route.ts:34-54`.

No `requireAuth` call. Any caller can POST `{ address: "0xVICTIM" }` and receive a referral link that credits the victim. Exploitation paths:

1. **Referral fraud amplification.** If referral rewards are capped per referrer (anti-sybil), an attacker generates links for an innocent third party and spams the links. The victim receives unexplained signups attributed to their address and may hit caps through no action of their own.
2. **Support-team confusion.** A victim contacting support saying "I never distributed a referral link, why do I have 50 pending referrals?" creates ambiguity in fraud workflows.
3. **Marketing list poisoning.** Attacker creates a spreadsheet of competitor addresses and systematically generates referral links for each — floods the competitor's accounts with referral events.

**Remediation:** Require authentication. The authenticated user's address IS the referrer — no need to accept `address` in the body.
```typescript
const authResult = await requireAuth(request);
if (authResult instanceof NextResponse) return authResult;
const address = authResult.user.address.toLowerCase();
```

### P2-M-22 — USSD phone-number log truncation is insufficient for PII minimization

**File:** `app/api/ussd/route.ts:77`.

```typescript
logger.info(`[USSD] Session ${sessionId} from ${phoneNumber.slice(0, 7)}*** with input: ${text}`);
```

Showing the first 7 characters of a phone number leaks:
- Country code (first 1-3 digits — `254` = Kenya, `234` = Nigeria)
- Mobile network code (next 2-3 digits — `712` in Kenya = Safaricom)
- First digit of the subscriber part

For a 10-12 digit phone number, 7 chars can narrow a user to a specific network + geographic region + ~1000 possible subscribers. Combined with session timing data (also logged) and occasional correlation with other records, phone numbers can be recovered from logs in many cases.

**Remediation:** Hash the phone number with `LOG_IP_HASH_SALT` (same salt used for IPs) and log the hash. Don't log the raw number at all:

```typescript
const phoneHash = hashIp(phoneNumber); // reuse the existing helper
logger.info(`[USSD] Session ${sessionId} from phone=${phoneHash} with input: ${text}`);
```

### P2-M-23 — Messages hard-delete allows unrecoverable evidence destruction with no counterparty signal

**File:** `app/api/messages/delete/route.ts:98-100`.

```typescript
if (hardDelete) {
  await query(`DELETE FROM messages WHERE id = $1`, [messageId]);
  return NextResponse.json({ success: true, permanent: true });
}
```

Any authenticated message sender can permanently remove their own sent messages from the database, with no soft-delete tombstone, no audit trail, no recipient-side proof that the message existed. Scenario: Alice sends Bob an incriminating or abusive message. Bob reads it but hasn't yet screenshotted or copied the text. Alice `hardDelete`s. Bob's cached copy is the only surviving evidence — frontend cache clears, DB row is gone, no server-side record exists.

Standard chat systems (Telegram, Signal, WhatsApp) expose "delete for me" (client-only) and "delete for everyone" (soft-delete with a visible placeholder remaining). Neither destroys the audit record. VFIDE's `hardDelete` destroys the record entirely.

In a financial sovereignty and merchant-commerce context this is a concrete legal/compliance risk: merchants receiving payment-dispute messages could wipe those messages after the fact; harassers could delete threats after a recipient reports but before support reviews.

**Remediation:**
1. Remove the `hardDelete` flag. Always soft-delete with a `is_deleted=true, content='[Message deleted]'` pattern (which lines 102-106 already implement for the soft case).
2. If hard-delete is truly required (right-to-erasure compliance), limit it to: (a) admin-only action after support review, or (b) a scheduled purge 30+ days after soft-delete during which period the counterparty can report/export.
3. Consider preserving a cryptographic hash of the original content (hash only, not plaintext) so disputes can prove message existence even after content removal.

### P2-M-24 — Custom-image message reactions accept arbitrary HTTP/HTTPS URLs with no host allowlist

**File:** `app/api/messages/reaction/route.ts:151-170`.

```typescript
const parsedUrl = new URL(normalizedImageUrl);
if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
  throw new Error('Invalid protocol');
}
```

Any authenticated user can attach a reaction to a message using an image URL pointing anywhere on the internet. Risks:

1. **Tracking pixels.** A malicious reactor uses `https://attacker.com/pixel?user=<recipient_id>` as an image URL. When the recipient's browser renders the reaction UI, it fetches the "image" — confirming the recipient viewed the message, their IP, user-agent, and referer. In emerging markets on limited data plans, a proliferation of tracking-pixel reactions is both a privacy attack and a data-cost attack.
2. **`http:` allowed.** Mixed-content rules will block the load on HTTPS pages, but the security intent (always-TLS) is undermined at the schema level.
3. **No content-type or size check on the actual response.** The URL can point to anything — a 50MB file, an HTML document, or a redirect chain. The frontend will try to load it as an image.
4. **No image URL max length** — `z.string().trim().min(1).optional()` at line 24 has no `.max()`. A 10MB URL string can be POSTed and stored per reaction.

**Remediation:**
1. Restrict `protocol` to `https:` only.
2. Add `.max(2048)` on the URL string.
3. Maintain an allowlist of acceptable image hosts (the project's own S3 CDN, known reputable sources). Any URL outside the allowlist is rejected.
4. Alternatively: require custom reaction images to be uploaded through a VFIDE-owned endpoint that proxies and re-hosts the image — the stored `image_url` is always a VFIDE CDN URL, no third-party URLs ever stored.

### P2-M-25 — `init-db.sql` mounted as docker-compose schema despite being marked DEPRECATED

**File:** `docker-compose.yml:17`, `init-db.sql:3-7`.

`docker-compose.yml:17` bind-mounts `./init-db.sql` into Postgres's `/docker-entrypoint-initdb.d/` — Postgres runs this SQL on first container init, establishing the schema for local Docker deployments.

But `init-db.sql:3-7` declares itself deprecated:

```sql
-- DEPRECATED:
-- This bootstrap file is retained for local legacy compatibility only.
-- The authoritative schema is in /migrations and should be applied via migrations.
-- Running this file directly can create an incompatible messages schema.
```

The compose file does not run the migrations in `migrations/` — it only loads `init-db.sql`. Developers running `docker compose up` get the deprecated schema, not the migration-based schema that production uses. Consequences:

1. **Local behavior diverges from production.** A bug encountered in local dev may not reproduce in production (or vice versa) because the schemas differ in subtle ways — e.g., the `messages` table in `init-db.sql:22-31` uses `sender_id INTEGER REFERENCES users(id)`, which may not match a migration-applied version with different FK constraints or added columns.
2. **RLS policies (from `20260121_234000_add_row_level_security.sql`) are not applied in Docker.** Developers test behavior without RLS, then hit issues when production enforces RLS.
3. **The 108 other migrations are also skipped.** Every schema change since the initial bootstrap is missing.

**Remediation:** Replace the `init-db.sql` bind-mount with a script that runs migrations:

```yaml
postgres:
  # ... existing ...
  volumes:
    - postgres_data:/var/lib/postgresql/data
    # Mount a script that waits for DB readiness and applies all migrations
    - ./scripts/docker-init-migrations.sh:/docker-entrypoint-initdb.d/00-migrations.sh:ro
    - ./migrations:/tmp/migrations:ro
```

Where the shell script iterates over migration files in timestamp order. Alternatively, run migrations from a one-shot service in compose that depends on Postgres health.

### P2-M-26 — docker-compose JWT_SECRET and POSTGRES_PASSWORD passed via environment variables rather than Docker secrets

**File:** `docker-compose.yml:13, 36, 38`.

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
# ...
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}
DATABASE_URL: postgresql://vfide_user:${POSTGRES_PASSWORD}@postgres:5432/vfide_db
```

The file uses env-var fail-fast (`${VAR:?error}` syntax) — good in that it refuses to start without the values set. But the values end up in the process environment of each container, visible via:

- `docker inspect vfide-postgres` / `docker inspect vfide-websocket` (any user in the `docker` group).
- `/proc/<pid>/environ` on the host.
- Docker API introspection.
- Any sidecar container sharing the pod/network namespace.

The file's own comment (line 10-12) explicitly warns: `"SECURITY: Do NOT use this default password in any non-local environment. Set POSTGRES_PASSWORD via Docker secrets or a secrets manager (e.g. AWS Secrets Manager)."` — but the file itself doesn't demonstrate how.

**Remediation:** Convert to Docker secrets:

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  postgres_password:
    file: ./secrets/postgres_password.txt

services:
  postgres:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
  websocket:
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
    secrets:
      - jwt_secret
```

And update the app code to read `JWT_SECRET` from either the env var or `JWT_SECRET_FILE` (pattern common in official Docker images).

### P2-M-27 — WebSocket `MessageSchema.payload` accepts any record/string and is echoed back

**File:** `websocket-server/src/schema.ts:45-49`, `websocket-server/src/index.ts:583-592`.

Schema:
```typescript
const MessageSchema = z.object({
  v: z.literal(CURRENT_PROTOCOL_VERSION).optional(),
  type: z.literal('message'),
  payload: z.record(z.string(), z.unknown()).or(z.string()),
});
```

Handler echoes the payload back:
```typescript
case 'message':
  ws.send(JSON.stringify({
    type: 'message',
    payload: { from: getClientLabel(client), data: msg.payload, timestamp: Date.now() },
  }));
```

Combined with the 8KB payload cap, this is a reflection vector — attacker-controlled data comes back via the same WS connection wrapped in a `"data"` field. Whether this is exploitable depends on the frontend's handling of `msg.payload.data`. If the frontend:
- Renders `data` as HTML anywhere → XSS via attacker's own reflection.
- Passes `data` to `eval` or `Function()` → code execution.
- Deserializes `data` as structured JSON for an expected schema → schema-confusion attacks.

Even without a direct exploit, the echo is useless as a feature (it tells the sender what they already know) and a surface area liability. Review whether the `message` case needs to exist at all.

**Remediation:**
1. Tighten `MessageSchema.payload` to the specific shape of messages the WS actually forwards — if this is intended for chat, it should be `{ conversationId: string, text: string, ... }` with Zod validation per field.
2. If the `message` type has no legitimate use beyond testing, remove the handler. Clients should use dedicated typed messages (chat, presence, etc.), not a generic echo channel.
3. The `subscribe`/`unsubscribe`/topic-ACL architecture looks well-formed. Route real feature payloads through typed message kinds, not via this freeform echo.

### P2-M-28 — 191 of 192 `CREATE INDEX` statements in forward migrations lack CONCURRENTLY

**Files:** All 109 migration files except `20260130_120000_add_reward_verification_columns.sql`.

A count across all forward (`.sql`, non-`.down.sql`) migrations:

- Total `CREATE INDEX` statements: **192**
- With `CONCURRENTLY`: **1** (the `idx_user_rewards_source_contract` index — also correctly uses `IF NOT EXISTS`)
- Without `CONCURRENTLY` (blocking): **191**

Non-concurrent `CREATE INDEX` takes an ACCESS EXCLUSIVE lock on the table for the duration of the index build. For tables created in the same migration file, the table is empty and the lock is instantaneous — harmless. For indexes added to *existing* production tables (every migration after the table's introduction), the index build locks writes for seconds-to-minutes depending on table size.

For a payments system with live user traffic, every such migration deployment pauses writes on the affected table. For large tables (`messages`, `activities`, `analytics_events`, `security_account_events`) the pause can exceed the application's request timeout, causing widespread request failures.

The migration runner (`lib/migrations/index.ts`) already supports CONCURRENTLY correctly — detects it, runs the statement outside a transaction. The issue is that the migration content was written without using it.

**Remediation:**
1. Review each `CREATE INDEX` in `migrations/*.sql`. For any index on a table that existed in a prior migration (not newly created in the same file), rewrite to `CREATE INDEX CONCURRENTLY IF NOT EXISTS`.
2. Leave non-concurrent for indexes on tables created in the same migration file (table is empty, lock is instant).
3. Add a CI lint step that detects `CREATE INDEX` without `CONCURRENTLY` on any table not also `CREATE TABLE`-d in the same migration.
4. Document in a migration-author runbook: "Every `CREATE INDEX` on an existing table MUST use CONCURRENTLY."

Given the mature production system Phase 1 describes (72+ contracts, 120 API routes, multi-chain deployment), this is a meaningful operational concern — not theoretical.

### P2-M-29 — Logger ships raw context objects to Sentry without application-layer sanitization

**File:** `lib/logger.ts:100-107, 117-130`.

```typescript
// warn()
Sentry.captureMessage(message, {
  level: 'warning',
  extra: normalizeContext(context),
});

// error()
Sentry.captureException(error, {
  extra: { message, ...normalizeContext(context) },
});
```

The logger forwards full context objects to Sentry. Current protection: `sentry.server.config.ts::beforeSend` filters `event.extra` keys by substring match on `"SECRET"`/`"API_KEY"`/`"PASSWORD"`/`"PRIVATE_KEY"`/`"DATABASE_URL"`. What IS NOT filtered:

- Error **messages** themselves. If an error is constructed with `new Error(\`Failed to transfer to ${recipientAddress} amount ${amount}\`)`, the wallet address and amount ride in `error.message` → Sentry → reviewable by anyone with Sentry access.
- Context values that don't match the sensitive-keys substring filter. A context `{ transactionHash, userAddress, email, phoneNumber }` has none of the filtered keywords — all those identifiers ship to Sentry verbatim.
- Primitive values passed as `context` are wrapped as `{ value: String(context) }` (line 53). If a developer does `logger.error('Query failed', { query: 'SELECT ... WHERE email = user@example.com ...' })`, the email goes through.
- `console.error(..., error)` at line 117 dumps the raw error object to stdout — captured by log aggregators (Datadog, CloudWatch) with full contents even if Sentry filters something.

The logger also does not integrate with `lib/security/requestContext.ts::getRequestCorrelationContext` — so log entries lack a request ID, making cross-service tracing harder and making targeted log deletion for GDPR "right to erasure" requests impractical.

**Remediation:**
1. Add application-layer scrubbing before the Sentry call: strip Ethereum addresses (`0x[0-9a-f]{40}`), transaction hashes (`0x[0-9a-f]{64}`), email addresses, phone numbers, and user-agent prefixes from `message` and `context`.
2. Integrate request correlation: logger methods should optionally accept a `requestId` or read it from an AsyncLocalStorage context (similar to how `lib/db.ts` uses AsyncLocalStorage for user address).
3. Consider an allowlist approach rather than substring-match blocklist: only known-safe context keys are serialized; everything else is redacted.

---

## 6. Findings — Low

### P2-L-01 — `extractToken` accepts tokens without `Bearer ` prefix

**File:** `lib/auth/jwt.ts:168-177`. RFC 6750 requires `Bearer <token>`.

### P2-L-02 — Dead session-fixation primitive exported from cookieAuth.ts

**File:** `lib/auth/cookieAuth.ts:128-163`.

`migrateToHttpOnlyCookies` accepts arbitrary tokens from the request body and sets them as auth cookies. No route currently imports this function, but it is exported. If wired to a route without CSRF, it's a session-fixation primitive: attacker forces victim to install the attacker's token as the victim's auth cookie.

**Remediation:** Remove the function.

### P2-L-03 — In-memory SIWE challenge store is per-process

**File:** `lib/security/siweChallenge.ts:21, 80-81, 92-94`.

Availability concern: in serverless with multiple instances, a user who requests a challenge on instance A but submits the signed message to instance B gets "Challenge not found".

### P2-L-04 — `safeQuery` `?` substitution handles only one placeholder per clause

**File:** `lib/db.ts:122-140`.

`clause.replace('?', '$N')` replaces only the first `?`. Multi-placeholder clauses produce runtime errors. Not SQL-injection (params still go through pg parameterization), but a correctness footgun.

### P2-L-05 — `.env.local.example` sets a known JWT_SECRET placeholder value

**File:** `.env.local.example:16`. `JWT_SECRET=local-dev-only-change-me-32-chars-min`. Developers copying the file may leave this string in staging/preview deployments.

### P2-L-06 — WebSocket session ID uses Math.random(), not crypto RNG

**File:** `websocket-server/src/index.ts:431, 450`.

`Math.random().toString(36).slice(2, 8)` — non-cryptographic 6-char randomness. Used for logging/routing, not security, so not a direct issue. But `crypto.randomUUID()` is the idiomatic replacement.

### P2-L-07 — SIWE challenge domain binds to user-controlled Host header

**File:** `app/api/auth/challenge/route.ts:34`.

`const hostHeader = request.headers.get('host') || 'vfide.io';` — user-supplied Host becomes the SIWE domain binding. TLS SNI enforces this in practice, but for defense-in-depth:

**Remediation:** Validate Host against an env-var allowlist (`ALLOWED_SIWE_DOMAINS=vfide.io,app.vfide.io,testnet.vfide.io`) before accepting.

### P2-L-08 — `ALLOWED_DOMAINS` includes `localhost` and `127.0.0.1` in production code

**File:** `lib/security/urlValidation.ts:13-19`.

Hardcoded allowlist includes localhost and loopback. In production, a redirect to these resolves to the user's own machine — low impact for most users, but if the user has locally-running services (admin consoles, dev tools), an open-redirect on vfide.io could be chained to load URLs against localhost.

**Remediation:** Load allowlist from env var; or gate localhost entries behind `NODE_ENV !== 'production'`.

### P2-L-09 — `addAllowedDomain` is runtime-mutable dead code

**File:** `lib/security/urlValidation.ts:141-151`.

No callers. Input validation is minimal (blocks only `*` and `..`). If wired to a user-facing endpoint in the future, an attacker could expand the open-redirect allowlist at runtime.

**Remediation:** Remove the function.

### P2-L-10 — `/api/auth/revoke` does not verify token ownership for the Authorization-header case

**File:** `app/api/auth/revoke/route.ts:55-89`.

When `revokeAll: false`, the endpoint revokes whatever token authenticated the request. If a user presents different tokens in the Authorization header vs. cookie, `getRequestAuthToken` prefers the header — so a user could revoke a different token than they intended. Low impact because the endpoint requires auth from cookie or header, and revocation only affects the presented token.

### P2-L-11 — Machine token comparison in `webhook-replay-metrics` is not timing-safe

**File:** `app/api/security/webhook-replay-metrics/route.ts:68`.

`return bearerToken === configuredToken;` — string `===` compare against an env-var secret is vulnerable to timing side-channels. A remote attacker can measure response-time differences to recover the token one byte at a time. Rate limiting at line 72 adds friction but does not eliminate the attack; sophisticated timing attacks can succeed despite jittered rate limits given enough samples.

**Remediation:**
```typescript
import { timingSafeEqual } from 'node:crypto';
const a = Buffer.from(bearerToken);
const b = Buffer.from(configuredToken);
return a.length === b.length && timingSafeEqual(a, b);
```

### P2-L-12 — Logout revocation TTL is hardcoded 24h, not read from token's actual `exp` claim

**File:** `app/api/auth/logout/route.ts:30-32`.

```typescript
const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24);
await revokeToken(tokenHash, expiresAt, 'logout');
```

`revokeToken` uses `expiresAt - now` as the Redis TTL. If the token being revoked was issued long ago (say, 23h ago), the revocation entry lives for another 24h — fine, covers the token. But if token expiry ever diverges from 24h (custom exp, refresh tokens), the entry could expire before the token does, resurrecting the revoked token.

The `/api/auth/revoke` route reads `authResult.user.exp` correctly (line 78). Logout should match:

```typescript
const expiresAt = authResult.user.exp ?? Math.floor(Date.now()/1000) + 86400;
```

### P2-L-13 — `LOG_IP_HASH_SALT` empty default produces predictable IP hashes

**File:** `lib/security/requestContext.ts:75-79`.

```typescript
const salt = process.env.LOG_IP_HASH_SALT || '';
```

Empty-string salt yields deterministic SHA-256 hashes across all deployments. Anyone who knows the hashing scheme can precompute a rainbow table of `sha256(':' + ip)` for every IPv4 address (~4 billion entries, feasible) and reverse hashes in logs instantly.

**Remediation:** Require `LOG_IP_HASH_SALT` to be set (≥16 bytes) in production. Fail boot if unset or < 16 bytes when `NODE_ENV === 'production'`. The startup-validation module is the right place to enforce this.

### P2-L-14 — Error sanitizer passes short unknown errors through verbatim

**File:** `lib/security/errorSanitizer.ts:174-176`.

```typescript
if (errorMessage.length < 100 && !errorMessage.includes('localhost') && !errorMessage.includes('/')) {
  return errorMessage;
}
```

Short errors without localhost/slashes pass through. This leaks:
- Postgres error codes (`23505: duplicate key value violates unique constraint`)
- Solidity revert strings (`ERC20: insufficient allowance`)
- JWT library messages (`jwt malformed`, `invalid signature`, `jwt expired`)
- File-system error codes (ENOENT, EACCES, EISDIR) when path is excluded

**Remediation:** Remove the length-based passthrough. Default to the safe fallback unless a pattern matches. Add explicit patterns for JWT errors, file-system errors, and common database errors.

### P2-L-15 — `addAllowedDomain` minimal input validation risks bypass if wired

**File:** `lib/security/urlValidation.ts:141-151` (same function flagged in P2-L-09).

The existing validation only blocks `*` and `..`. It would accept inputs like `evil.com\nvfide.io` (newline injection), `evil.com%00vfide.io` (null byte), `evil.com:@vfide.io` (userinfo), or `vfidé.io` (Unicode confusable). If this function ever gets wired to a user-facing endpoint, the allowlist becomes bypassable. Paired with removing the function (P2-L-09 remediation) this becomes moot.

### P2-L-16 — Sentry header-scrub list is narrow and case-inconsistent

**Files:** `sentry.server.config.ts:43-47`, `sentry.client.config.ts:58-61`.

Server scrubs only `authorization`, `cookie`, `x-api-key` (lowercase). Client scrubs `Authorization`, `Cookie` (capitalized). Two concerns:

1. **Inconsistent casing.** Next.js normalizes incoming headers to lowercase; browsers may serialize either way. The two configs should standardize on lowercase for predictability.
2. **Missing sensitive headers.** Neither config scrubs `x-csrf-token`, `x-auth-token`, `x-vfide-alert-signature`, `x-vfide-alert-timestamp` (webhook HMAC headers — if a webhook handler throws mid-flow, the signature gets shipped to Sentry), `proxy-authorization`, or `x-forwarded-for` (contains client IPs when proxy headers are trusted).

**Remediation:** Use a single shared scrub list imported into both configs:

```typescript
const SENSITIVE_HEADERS = [
  'authorization', 'cookie', 'x-api-key', 'x-csrf-token',
  'x-auth-token', 'x-vfide-alert-signature', 'x-vfide-alert-timestamp',
  'proxy-authorization', 'x-forwarded-for',
];
for (const h of SENSITIVE_HEADERS) {
  if (event.request?.headers) delete event.request.headers[h];
}
```

### P2-L-17 — `startup-validation` default-secrets blacklist is small

**File:** `lib/startup-validation.ts:38-44`.

Catches only 5 strings (`vfide-dev-secret-change-in-production`, `your-secret-here`, `change-me`, `secret`, `default`). Misses common bad values: `test`, `password`, `admin`, `12345678`, `placeholder`, `example`, `dev`, `local`, `development`.

Given this file is also never invoked (P2-H-11), the immediate impact is zero — but once wired, expand the list and add an entropy check.

### P2-L-18 — USSD text parsing is positional with no format validation on merchant code or amount

**File:** `app/api/ussd/route.ts:26-68`.

The `text` field is split on `*` to build the menu path. `parts[1]` is treated as a merchant code, `parts[2]` as an amount, `parts[3]` as a confirmation choice. No validation: no format check on the merchant code (could be control chars, injection strings if this becomes DB-backed), no numeric validation on the amount (accepts `"DROP"`, `"1e100"`, negative numbers), no length caps on `text` itself.

The response strings interpolate these values verbatim (lines 40, 44, 48). If an attacker sends `text=1*SHOP<script>alert(1)</script>*1*1`, the response includes the injected string. USSD is plain-text-rendered by telcos (no script execution), so this specific payload is harmless on the gateway — but once the app grows a web-based "session replay" feature, the injection becomes live.

**Remediation:** Add regex validation for merchant code (`^[A-Z0-9]{3,12}$`), numeric validation for amount (parseFloat, positive, max-bound), length cap on text (`text.length <= 128`).

### P2-L-19 — USSD has triple-fallback body parsing suggesting integration uncertainty

**File:** `app/api/ussd/route.ts:5-24`.

```typescript
const rawBody = await request.clone().text().catch(() => '');
const fromMultipart = (field: string) => rawBody.match(new RegExp(`name="${field}"\\r?\\n\\r?\\n([^\\r\\n]*)`))?.[1] || '';
const params = new URLSearchParams(rawBody);

try {
  const formData = await request.formData();
  // ...formData || params || fromMultipart
} catch {
  // ...params || fromMultipart
}
```

Three separate parsers bolted together. The regex-based multipart parser doesn't handle the standard multipart format correctly (no boundary parsing, no escaping). Each fallback is a separate codepath, leading to inconsistent behavior across Content-Type variations. The specific USSD gateway being integrated likely has one canonical format (Africa's Talking spec: `application/x-www-form-urlencoded`) — the code should assert that format and reject others with 415.

**Remediation:** Pick the expected format based on the chosen gateway's documentation. Reject other Content-Types with 415. Remove the regex multipart fallback — it's likely dead code that would produce wrong results if hit.

### P2-L-20 — Streams `token` field accepts any string up to 20 chars

**File:** `app/api/streams/route.ts:14`.

```typescript
token: z.string().trim().min(1).max(20),
```

No whitelist. Users can create streams with `token: "FAKE"`, `token: "🔥💰"`, `token: "USDC "` (trailing space bypass). If the frontend displays the token field to recipients ("You have a stream paying you 1000 of FAKE!"), recipients can be deceived about what they'll actually receive.

**Remediation:** Either enum-restrict to known tokens (`z.enum(['VFIDE', 'USDC', 'USDT'])`), validate as an on-chain token address (`z.string().regex(ADDRESS_REGEX)`), or query a token registry to confirm the value is known.

### P2-L-21 — Proposal `endsAt` has no upper bound

**File:** `app/api/proposals/route.ts:18, 326`.

```typescript
endsAt: z.coerce.date().optional(),
// ... defaults to 7 days in future:
endsAt?.toISOString() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
```

An attacker posts a proposal with `endsAt = "2099-12-31"`. The proposal stays `status = 'active'` for 76 years. `ORDER BY created_at DESC LIMIT 100` queries include it forever. Multiply by 100 attackers and the governance list is permanently dominated by fake proposals that never close.

**Remediation:** Cap the voting window at a reasonable maximum:

```typescript
endsAt: z.coerce.date().refine(
  d => d.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000,
  { message: 'Voting window cannot exceed 30 days' }
).optional(),
```

### P2-L-22 — Webhook delivery retry uses original-attempt timestamp, not per-retry

**File:** `lib/webhooks/merchantWebhookDispatcher.ts:265-285`.

```typescript
const timestamp = Math.floor(Date.now() / 1000).toString();
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  // uses `timestamp` (frozen at loop entry) for every retry
  ...
}
```

If the first delivery fails and the 30s retry is used, the `X-Webhook-Timestamp` header still shows the time of the first attempt. Consumers using a narrow skew window would reject the retry as out-of-skew.

More subtly: the timestamp is used by consumers for replay detection (build a replay key from `timestamp + signature`). If two retries produce identical timestamps but different body content (shouldn't happen — but some middleware might modify), the consumer might incorrectly dedup.

**Remediation:** Compute `timestamp` inside the retry loop. Also re-compute `signature` since it depends on timestamp.

### P2-L-23 — Health endpoint in `api` rate-limit tier may be breached by high-frequency probes

**File:** `app/api/health/route.ts:18`.

Load balancers and Kubernetes liveness probes commonly hit `/api/health` every 10-30 seconds. At 30s interval, a single prober sends 120 requests/hour — within the `api` tier (60/min = 3,600/hour) for one source. But if:
- Multiple replicas share a source IP (likely in k8s), effective rate limit per-replica is `60 / N` where N = replica count.
- External monitoring services (Pingdom, UptimeRobot, Prometheus blackbox) pile on.
- The rate-limit fallback is per-process (P2-H-02), so each replica's counter is independent — accidentally fine in practice, but undocumented behavior.

The failure mode: monitoring sees 429 responses, marks the deployment unhealthy, cascades into deployment alerts and potentially auto-remediation (rolling restart of the "unhealthy" pods).

**Remediation:** Either (a) make `/api/health` exempt from rate limiting (gate access by source IP allowlist — k8s cluster ranges, monitoring IPs), or (b) add a dedicated `health` rate-limit tier with a high cap (3600/min).

### P2-L-24 — Session key service uses `Math.random()` for session ID entropy

**File:** `lib/sessionKeys/sessionKeyService.ts:232-233`.

```typescript
const sessionId = keccak256(
  toBytes(`${owner}-${chainId}-${now}-${Math.random()}`)
).slice(0, 18);
```

`Math.random()` is not cryptographically secure. Chrome/Firefox use xorshift128+, publicly broken given a handful of consecutive outputs. Since session IDs are later used as lookup keys in `validateCall`, predictable IDs may enable attacks on multi-user app instances (though the client-side storage model of P2-H-13 already makes this non-exploitable in the current design).

**Remediation:** Use `crypto.randomUUID()` or `crypto.getRandomValues()` for session ID entropy, even in the client.

### P2-L-25 — Session key token-amount extraction covers only `approve`/`transfer`, misses common allowance/transferFrom/permit paths

**File:** `lib/sessionKeys/sessionKeyService.ts:181-202`.

The `extractErc20AmountFromCallData` helper returns `null` (unknown amount) for any selector other than `approve(address,uint256)` (`0x095ea7b3`) or `transfer(address,uint256)` (`0xa9059cbb`). Validation at line 340-363 returns `"Unable to parse token amount from calldata"` in that case — **which is fail-closed**, so permissions with `maxTokenAmountPerCall` set actually block unknown selectors. Good.

However: permissions that DON'T set `maxTokenAmountPerCall`/`maxTokenAmountTotal` don't run this extraction at all. An attacker who understands the design could craft `transferFrom(victim, attacker, amount)` calls that bypass the amount extractor because the permission has no token-amount policy — only `maxCalls` and `maxValuePerCall` limits apply. Given the per-call maxValue is wei (for ETH value), not token value, the limit doesn't protect against any ERC-20 moves.

**Remediation:** Either (a) extend `extractErc20AmountFromCallData` to cover `transferFrom`, `permit`, `increaseAllowance`, `decreaseAllowance`, or (b) document that session-key permissions do not constrain ERC-20 `transferFrom` / `permit` / allowance modifications and that permissions covering those selectors must not be granted.

### P2-L-26 — `NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS=true` stores permissions in localStorage across browser restarts

**File:** `lib/sessionKeys/sessionKeyService.ts:114`.

When this env var is set, session-key permission records persist in `localStorage` across tabs and browser restarts — accessible to any script in the origin. A single XSS at any point in the user's session history enumerates all pre-approved permission records, including target contracts and limits.

**Remediation:** Default to session-scoped storage. Remove the persistent mode OR require a per-session explicit opt-in with a prominent UI warning about the XSS implication.

### P2-L-27 — `lib/auth/validation.ts` is unused dead code that creates a false-security trap if adopted

**File:** `lib/auth/validation.ts` (all 350 LOC).

Grep across the codebase finds zero importers. The file defines 30+ Zod schemas with naive `sanitizeText` applied (P2-H-14) and with body-field `userAddress`/`fromAddress` anti-patterns (accepting auth-derivable fields as request input). Current exploitation: none (nothing imports it). Future trap: any developer searching for "validation" in the codebase will find this file and adopt it, pulling in the broken sanitizer and anti-patterns.

**Remediation:** Delete the file. If centralized validation helpers are wanted, start with a minimal shared `ethereumAddress`, `txHash`, and `username` schema and leave content-specific schemas in their respective routes.

### P2-L-28 — Messages delete route is not transactional

**File:** `app/api/messages/delete/route.ts:78-107`.

The SELECT-then-DELETE pattern is not wrapped in a transaction, unlike the edit route which uses `BEGIN/ROLLBACK/COMMIT`. Two concurrent delete requests (same message) could both pass the ownership check before either UPDATE fires. For soft delete this is idempotent and harmless. For hard delete (P2-M-23), one DELETE succeeds and the other hits a non-existent row — also idempotent. No real bug, but the inconsistency with the edit route is a maintainability concern.

**Remediation:** Wrap in a transaction for consistency with `/api/messages/edit`. Even when not strictly necessary, consistent patterns make future modifications safer.

### P2-L-29 — Docker WebSocket port binds to all interfaces

**File:** `docker-compose.yml:30-31`.

```yaml
ports:
  - "8080:8080"
```

The docker-compose default binds to `0.0.0.0:8080` — the WS port is exposed on all network interfaces of the Docker host. For local dev this is inconvenient (WSL, devcontainers, LAN-exposed if on a home network). For production behind a reverse proxy it's a misconfiguration: the proxy should be the only thing talking to the WS, and the port should be bound to `127.0.0.1` or the Docker network only.

The Postgres service (line 7) correctly binds to `127.0.0.1:5432:5432`. The WS service should match.

**Remediation:** Change `"8080:8080"` to `"127.0.0.1:8080:8080"` for compose-based local/staging deployments. Document that production (k8s, ECS, etc.) should expose WS only via the cluster's ingress controller, not at the container level.

### P2-L-30 — docker-compose lacks resource limits and log rotation

**File:** `docker-compose.yml` (entire file).

No `deploy.resources.limits`, no `logging.options`. A runaway query on Postgres consuming all host memory, or the Next.js/WS server logging gigabytes of JSON before rotation, can take down the host entirely. Production compose deployments should set:

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: 3
```

Not applicable when using Kubernetes/ECS (which set these at the orchestrator level), but relevant for any direct compose deployments.

### P2-L-31 — WebSocket Dockerfile has no HEALTHCHECK directive

**File:** `websocket-server/Dockerfile`.

The main Dockerfile declares a `HEALTHCHECK` hitting `/api/health`. The WS Dockerfile has none. Docker and Kubernetes rely on HEALTHCHECK (or container probes) to decide whether a container is ready for traffic. Without one, a crashing WS container may continue receiving connections until it's visibly failing.

**Remediation:** Add a TCP-based healthcheck:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD nc -z localhost 8080 || exit 1
```
Or an HTTP endpoint if the WS server exposes one.

### P2-L-32 — WebSocket and main Dockerfiles pin different SHA256 digests of `node:25-alpine`

**Files:** `Dockerfile:8` (digest `bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4`), `websocket-server/Dockerfile:3` (digest `cf38e1f3c28ac9d81cdc0c51d8220320b3b618780e44ef96a39f76f7dbfef023`).

Both pin `node:25-alpine`, but the digests differ. Either (a) the two files were pinned at different times and the upstream tag moved between, or (b) they're for different architectures. Either way, they describe different base-image contents — the two services are not running identical Node.js binaries.

**Remediation:** Re-pin both simultaneously against the same `docker inspect` output. Add a comment in each Dockerfile noting when the digest was last refreshed. Consider a shared `node:25-alpine@sha256:...` variable in a build-config file referenced by both, though Dockerfile doesn't support shared constants natively — a build script that validates digest consistency is an alternative.

---

## 7. Positive Observations

- **Webhook HMAC verification** (`lib/security/webhookVerification.ts`): versioned signatures (`v1=...`), HMAC-SHA256 over `timestamp.body`, timing-safe comparison via `timingSafeEqual`, skew window with hard ceiling (3600s max), atomic Redis-backed replay detection via `setIfAbsent` (NX). The consumer-example route reads raw body via `request.text()` before parsing — correct order for signature integrity.
- **SIWE challenge consumption** uses `redis.getdel` (atomic get-and-delete) — prevents parallel-verification race conditions on the same nonce.
- **JWT implementation** (`lib/auth/jwt.ts`): fail-fast on missing secret, rotation via `PREV_JWT_SECRET`, per-token revocation check (though limited — see P2-H-05), proper issuer/audience claims, 24h expiry.
- **Security logs route** (`app/api/security/logs/route.ts`) is exemplary: DB-persisted with retention policy (1–365 days), critical-alert dedup window (30s–24h), HMAC-SHA256 signed outbound webhook with timestamp replay protection, SSRF protection on webhook URL (HTTPS-only, blocks localhost/loopback/.local), AbortController fetch timeout. Other half-built security routes (recovery-fraud-events, csp-report) should follow this pattern.
- **Auth route** (`app/api/auth/route.ts`) validates SIWE nonce binding, domain, chain-id, 5-minute timestamp window, account-lock integration, security-event recording, cryptographic signature verification via `viem.verifyMessage`.
- **Messages POST** and **quests/claim** routes use Zod validation, parameterized queries, transactional operations, ownership checks, per-tier rate limiting. Messages requires encrypted-payload structure, limiting CSRF exposure incidentally.
- **DB connection layer** (`lib/db.ts`) uses `pg` with connection pooling, 30s statement timeout, SSL in production, AsyncLocalStorage for correct per-request user context (not global mutable state), required `DATABASE_URL` with explicit opt-in for dev fallback via `ALLOW_DEV_DB`.
- **RLS migration exists at all** — many projects skip this entirely. The scaffolding is there; the role-level fix (P2-H-04) and over-permissive-policy fix (P2-M-03) would make it actually enforce.
- **CSRF exemption policy** (`lib/security/csrfPolicy.ts`) is explicit and small: only pre-auth endpoints and webhook prefixes.
- **Security headers** in `next.config.ts` cover X-Frame-Options: DENY, HSTS with preload in production, strict-origin-when-cross-origin, Permissions-Policy disabling camera/mic/geolocation/payment/USB/FLoC.
- **WebSocket server** has: CORS origin allowlist on upgrade, production-rejects-wildcard-origin check (F-11 FIX), production-rejects-plain-HTTP check, 8KB payload cap, `perMessageDeflate: false` (zip-bomb mitigation), JWT verification on upgrade OR via auth message, Zod schema validation, topic ACL with double-layer enforcement (subscribe AND delivery-time at lines 333-335), auth timeout capped at 30s (WS-2 mitigation), trust-proxy defaults-off (WS-1 mitigation), TLS cert/key optional with clear warning when plain HTTP is used.
- **Key directory PUT** verifies cryptographic signature against the authenticated address, enforces self-ownership, respects account lock, records key-rotate security event, supports explicit revocation via `revoked_at IS NULL` filter, has 10-minute timestamp skew window.
- **URL validation** uses `endsWith('.${domain}')` pattern correctly (leading dot), avoiding subdomain-confusion attacks like `evil.vfide.io.attacker.com`.
- **Error sanitizer** maps raw errors to user-friendly messages to prevent info disclosure — real defense against error-based enumeration.
- **2FA initiate** uses `crypto.randomInt` (CSPRNG), stores SHA-256 hashes (not plaintext), 5-minute TTL, deletes stored code on send failure — good primitives for an otherwise non-functional feature.
- **Validate-production script** (`lib/validateProduction.ts`) has comprehensive checks: chain-id consistency, production HTTPS enforcement on app URL, S3/SendGrid/Twilio/Redis partial-configuration detection (all-or-nothing), vault-implementation string validation, frontend-only mode support for static deployments. This is the kind of preflight many projects lack.
- **Sentry session-replay has good PII hygiene**. `sentry.client.config.ts:28-32` sets `maskAllText: true` and `blockAllMedia: true` — critical for a DeFi app where session replays could otherwise expose wallet addresses, DMs, transaction details. Server config (`sentry.server.config.ts:36-66`) drops dev events unless `SENTRY_DEBUG`, scrubs sensitive env-var `extra` keys by substring match on "SECRET"/"API_KEY"/"PASSWORD"/"PRIVATE_KEY"/"DATABASE_URL", ignores noisy connection-reset errors. Client filters wallet-initiated rejection errors (`User rejected`, `User denied`) — correct, these are user choices not bugs.
- **Outbound merchant webhook dispatcher** (`lib/webhooks/merchantWebhookDispatcher.ts`) is best-in-class: HMAC-SHA256 signing with versioned `v1=...` format matching the inbound verifier, AES-256-GCM at-rest encryption of webhook secrets with unique IV and auth tag, lazy migration from plaintext, DNS-resolution SSRF protection blocking RFC1918/loopback/link-local/CGNAT/IPv6-fc/fd ranges, HTTPS-only enforcement, `redirect: 'manual'` preventing redirect-based SSRF, 10s per-attempt timeout via AbortController, 3-retry exponential backoff (1s, 5s, 30s), auto-disable at 10 consecutive failures, delivery audit log with response body truncation. DNS TOCTOU (P2-M-16) is the one meaningful gap.
- **Messages edit route** (`app/api/messages/edit/route.ts`) is exemplary defense-in-depth: Zod validation with character-class regex per field (hex, base64, Ethereum signature), encrypted-payload structural validation, ownership checked twice (auth user === userAddress, then DB message.sender === userAddress), transactional with BEGIN/ROLLBACK/COMMIT, 15-minute edit time limit, original content archived to `message_edits` table, blocks editing deleted messages.
- **Analytics GET endpoint** (`app/api/analytics/route.ts:96-174`) correctly scopes queries: per-user queries require `requireAuth` + ownership check (only the owner can read their own events); system-wide queries require `requireAdmin`. Event type validated against a closed enum of 50+ known types, preventing arbitrary type injection.
- **Streams route** (`app/api/streams/route.ts`) properly uses `requireOwnership` for both GET (on queried address) and POST (on senderAddress), and explicitly declares `runtime = 'nodejs'` — ensuring `pg` actually works (edge runtime can't do raw postgres). The endpoint/amount validation (P2-M-20) is the gap, but the auth-and-data-access skeleton is right.
- **Endorsements route** (`app/api/endorsements/route.ts`) prevents self-endorsement, enforces ownership match on `fromAddress`, transactionally creates endorsement + notification + activity records together, dedups existing endorsements before insert.
- **Health route** correctly differentiates production (`{ ok, status }` only) from non-production (includes memory, uptime, version). Prevents leaking process internals through the health check.
- **Dockerfile is well-built.** Multi-stage build, digest-pinned base image (`node:25-alpine@sha256:bdf2...`) preventing tag-swap supply-chain attacks, `npm ci` for deterministic installs, non-root `nextjs` user (UID 1001) at runtime, `npm cache clean --force` reducing final image size, explicit healthcheck wired to `/api/health`. The comments reminding to pin the digest are clear and correct.
- **docker-compose uses fail-fast env-var requirements** (`${VAR:?error must be set}`) for `JWT_SECRET` and `POSTGRES_PASSWORD` — compose refuses to start without them. Postgres port is correctly bound to `127.0.0.1` (not public). The service-dependency health gating (`depends_on: postgres: condition: service_healthy`) is the right pattern.
- **Guardian-attestation message builder** (`lib/recovery/guardianAttestation.ts`) is minimal and clean: canonical field ordering, lowercased addresses, no ambiguity. 20 lines doing one thing correctly.
- **WS inbound schema** (`websocket-server/src/schema.ts`) uses a discriminated union over `type`, topic names restricted to alphanumeric+`.`/`-`/`_` with 64-char cap, auth token bounded 10-4096 chars, Zod default-stripping of unknown fields preventing prototype pollution. The only gap is the `message` type's freeform payload (P2-M-27).
- **Messages reaction route** uses an explicit Unicode emoji regex (`/^[\p{Emoji}]+$/u`) for emoji validation and properly checks conversation participation before allowing reactions — only the sender or recipient of a message can react to it. Prevents reaction spam from uninvolved users.
- **Migration runner in `lib/migrations/index.ts` correctly handles non-transactional operations.** `requiresNonTransactionalExecution` (line 41-44) detects `CREATE INDEX CONCURRENTLY`, `REINDEX CONCURRENTLY`, `VACUUM`, `CLUSTER`. When detected, the runner splits SQL into statements and runs them one-by-one outside a transaction — the correct pattern. The statement splitter (`splitSqlStatements`) handles single/double quoted strings, line comments, block comments, and dollar-quoted blocks (for PL/pgSQL function bodies) correctly.
- **WebSocket Dockerfile uses `npm install --ignore-scripts`.** Prevents package post-install scripts from executing during build, reducing supply-chain attack surface. Also uses non-root `wsserver` user (UID 1001).
- **All 109 forward migrations are additive.** Zero `DROP TABLE`, `TRUNCATE`, `DELETE FROM`, `ALTER TABLE DROP`, `RENAME`, or column-type-change operations in forward migrations. Zero role-level operations (`CREATE ROLE`, `GRANT`, `REVOKE`). Destructive operations are correctly confined to `.down.sql` rollback files. This is defensive schema evolution done right — the professional-audit team will appreciate not having to reason about schema destruction mid-migration.

---

## 8. What Is Still Uncovered

After 8 sessions with ~75 files reviewed depth-first, coverage is sufficient for professional-audit handoff. What remains:

**Low-priority remainders (a professional firm's tooling will cover these efficiently):**

- `lib/wallet/` and `lib/embeddedWallet/` — primarily client-side wallet logic; threat model mostly overlaps with P2-H-13 (session keys). A targeted review by a firm specializing in Web3 frontend security is more productive than continuing line-by-line here.
- `lib/cryptoRateLimiting.ts`, `lib/cryptoValidation.ts` — separate from the auth rate limiter already flagged in P2-H-01/02; brief grep suggests these are scoped to on-chain-call throttling, not HTTP.
- `lib/security/csp.ts` — CSP header builder; its output is moot while `proxy.ts` doesn't run (P2-C-01). Once C-01 is fixed, verify in staging that the nonce and policy string are what this file produces.
- Sentry edge config (`sentry.edge.config.ts`) — separate from server/client configs reviewed in Session 5.
- Most remaining `app/api/*` routes follow the patterns covered (auth check + rate limit + Zod + parameterized query). A handful that weren't spot-checked: `app/api/messages/[id]/route.ts`, the specific `app/api/analytics` POST body fully, `app/api/quests/onboarding` (463 LOC, large enough to probably have something). Pattern-based scanning rather than full read is appropriate.
- Migrations beyond the RLS one — 108 additional files. All verified additive (no destructive ops). Individual content review would check for specific patterns: large NOT NULL column additions without DEFAULT, CHECK constraints that could fail on existing data, TEXT columns that should be JSONB, missing indexes on foreign keys. Professional DBA review is the right tool.
- `lib/logger.ts` (covered in this session — P2-M-29 added).
- WebSocket Dockerfile (covered Session 8 — P2-L-31, L-32 added).

**Meta:** A professional audit firm (Trail of Bits, Spearbit, Zellic, Consensys Diligence) uses automated tooling (semgrep, CodeQL, their own custom rulesets) that will catch patterns this manual review missed — and will perform dynamic testing, fuzzing, and attack-pattern simulation this review cannot. The firm's value is not in finding more of the same category of findings (the categories are well-established here); it's in combinatorial attack chains, protocol-level vulnerabilities, and assurance for disclosure to exchanges/regulators/users.

---

## 9. How to Use This Report

This is a pre-audit deliverable, not a substitute for professional audit. Commission a professional firm before mainnet. Use this report as:

1. **A cleanup to-do list** before the firm starts. Addressing the Criticals and Highs before engagement means the firm's billable hours focus on things this review couldn't find (integration testing, attack chains, novel vulnerabilities) rather than rediscovering these.
2. **A reference for the firm's onboarding.** Point them at this document during their scoping call — it tells them the architecture shape, which modules are mature vs. half-built, which classes of problem already have proposed remediations.
3. **A sanity check on firm reports.** If the professional audit doesn't flag P2-C-01 (middleware never runs) among their criticals, something is wrong with their coverage.

### Recommended remediation sequencing

Based on impact-per-effort, if you can only do N things before commissioning a firm:

**First hour (one-line fixes with enormous impact):**
1. Rename `proxy.ts` → `middleware.ts` and rename the exported `proxy` function to `middleware`. Verify in staging that CSRF, CSP nonce, and body-size limits fire. (P2-C-01)
2. Delete `scripts/migrate.ts` in favor of the `lib/migrations/` runner. Document `npm run migrate:up` as the canonical command. (P2-H-15)

**First day (clear wins before firm engagement):**
3. Wire `validateEnvironment()` into `instrumentation.ts`. Fail-fast on boot with weak/default JWT secrets. (P2-H-11)
4. Fix `verifyToken` to call `isUserRevoked()`. Fix the same in the WebSocket `authenticateClient`. (P2-H-05, P2-H-08)
5. Require auth on the four `security/*` GET endpoints that leak fraud-monitoring and guardian-relationship data. (P2-H-07, P2-H-09)
6. Either delete `/api/security/2fa/initiate` or build `/api/security/2fa/verify`. No half-built auth features. (P2-H-06)
7. Delete `scripts/migrate.ts` (already above), `migrateToHttpOnlyCookies` (P2-L-02), `lib/auth/validation.ts` (P2-L-27), `addAllowedDomain` (P2-L-09/15), and the dead `sessionKeyService.ts` "session keys" feature OR rename it to remove the security-sounding nomenclature (P2-H-13).
8. Pin rate-limit ingress (P2-H-01). Make Redis required in production via both validators. (P2-H-02, P2-M-15)
9. Create a `vfide_app` Postgres role with `NOBYPASSRLS` and switch `DATABASE_URL` to use it. (P2-H-04)
10. Fix USSD endpoint: return the "coming soon" message until the real flow exists; do not claim "payment submitted" for a mock. (P2-H-12)

**First week (cleanup batch):**
- Batch all Mediums into a single cleanup PR.
- Fix the sanitizeText false-security pattern (P2-H-14): remove the function, document that React's JSX auto-escaping is the defense.
- Replace the three parallel IP extractors with the single `getRequestIp` helper (P2-H-17, P2-M-12).
- Rewrite migration `CREATE INDEX` statements to use `CONCURRENTLY IF NOT EXISTS` where the target table pre-exists (P2-M-28).

**Before commissioning audit:**
- Address the remaining Criticals and the Highs directly callable by external attackers.
- The Lows can remain; firms expect to find Lows.
- Document in the engagement scope what this report already covered, so the firm can prioritize complementary work (dynamic testing, fuzzing, attack-chain analysis).

---

*End of Phase 2 report. Phase 3 (frontend) and Phase 4 (infra/CI/secrets) are separate work streams — or, more productively, scope into the professional audit engagement.*
