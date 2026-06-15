# Developer Platform — Capability Certification (Backend Completion Campaign 10 · Wave D)

Full certification of VFIDE's developer-facing surface (merchant webhooks + the JWT-authed API). Model:
`lib/audit/developerPlatformModel.ts`; matrix: `__tests__/audit/developerPlatform.test.ts` (**162 scenarios; all
pass; typecheck 0; full audit suite 2150/38 green**). Target (150+) met.

## Calibration note (correcting the record)
The Campaign-10 framing assumed a third-party "developer API key" issuance system (scoped/revocable keys). **There
is none.** Auth is **JWT** (wallet-derived sessions). The developer surface is: (a) OUTBOUND merchant **webhooks**,
(b) the JWT-authed, rate-limited **API**, and (c) a developer **docs page** shipping a canonical secure-verification
example. This is reflected in Finding DP-1, and I audited the surface that actually exists.

## The headline: no developer credential can move funds
The decisive property answering "what is the blast radius of a leaked developer credential?" — **bounded, never
fund movement**, because the only developer-facing credentials are off-chain:
- **Non-custodial boundary (NC-*, CLOSE-01):** neither a **webhook secret** nor a **JWT session** can move vault
  funds. Fund movement requires the user's **on-chain activeWallet signature** (Campaign 3). Every webhook event
  (payment.completed, refund.*, escrow.funded/resolved) is a **notification**, never a transfer.
- **Leaked JWT (NC-jwt-*):** grants ≤**24h** API/read access and **cannot sign on-chain**.
- **Leaked webhook secret (BLAST-*):** lets an attacker **forge notifications to that ONE endpoint** — but it
  **cannot affect other merchants** (per-endpoint secrets), **cannot move funds**, and a replayed/stale forgery
  still fails replay+skew checks.

## Certified-sound properties — webhook security
- **HMAC-SHA256 signing (SIG-*, TAMP-*, HV-*):** `v1=HMAC(secret, "{timestamp}.{payload}")` binds both timestamp
  and body. Any tamper — wrong secret, altered payload, altered timestamp, truncated/flipped signature — fails
  verification, across an exhaustive tamper matrix.
- **Constant-time comparison (TAMP-04, CLOSE-02):** verification uses `timingSafeEqual` after a length check — no
  timing oracle.
- **Replay protection (SKEW-*, DEDUP-*, MSKEW-*):** a **5-minute** default skew window (`DEFAULT_MAX_SKEW_SECONDS`
  = 300, clamped to a 3600 ceiling) rejects stale/future-dated deliveries; a SHA256 **replay-key** tracked UNIQUE
  rejects a replayed delivery.
- **SSRF protection (URL-*, BLOCK-*, KBLOCK/KALLOW, NURL-*):** a merchant-supplied webhook URL must be **HTTPS**;
  **localhost / .local** are rejected; and the **resolved IP** must not be **private or loopback** (127/8, ::1,
  169.254/16, 10/8, 192.168/16, 172.16–31/12, 0.0.0.0) — verified across an exhaustive IP sweep with boundary
  checks around the 172.16–31 block. A malicious merchant cannot turn webhooks into an SSRF probe.
- **Secrets at rest + controls (CTRL-*):** webhook secrets are **encrypted at rest** (AES); endpoints can be
  **paused/disabled** (kill switch); the API is **rate-limited**.

## Findings
### DP-1 (LOW) — No third-party developer API-key platform
There is no scoped/revocable third-party API-key issuance — the developer surface is webhooks + the JWT-authed API
+ docs (FIND-DP1). If VFIDE's vision includes a full developer platform (issued keys, per-key scopes, per-key rate
limits, revocation), that is largely unbuilt. The existing surface is well-secured. **Completeness/scope gap, not a
defect. Tracked open.**

### DP-2 (LOW) — A leaked webhook secret enables forged notifications
A leaked per-endpoint signing secret lets an attacker forge notifications to that endpoint (FIND-DP2). It is
**bounded** — per-endpoint (one leak ≠ all merchants), rotatable, replay-protected, and **notification-only** (a
forged webhook moves no funds). The developer docs already demonstrate secure verification (`timingSafeEqual`).
**Recommendation:** document that merchants must treat webhooks as notifications and **verify payments on-chain**
(not trust the webhook alone, BLAST-04), plus secret-rotation guidance. **Tracked open.**

## Certification status (ledger)
**Developer Platform: Exists = Yes · Certified (src+model) = Yes (162 scenarios) · Findings = DP-1 LOW (no
third-party API-key platform), DP-2 LOW (leaked webhook secret → forged notifications, bounded) · Findings-Fixed =
No (open).** Open boundary: service e2e (live webhook delivery + the on-chain signature that actually moves funds).
