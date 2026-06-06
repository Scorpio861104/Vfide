# Upstream-Blocked Vulnerability Chains

**Last reviewed:** 2026-05-16 (Operations Phase post-Tier-1 cleanup)

This document tracks `npm audit` findings that cannot currently be resolved without upstream package updates from third parties. Each entry includes the chain, exposure assessment, and re-check guidance.

## State after Operations Phase Turn 5 (build-warnings cleanup)

`npm audit` reports **5 moderate, 0 high** remaining vulnerabilities. All 5 entries fall into the two chains below.

---

## 1. `color-string` (ReDoS) via `@metamask/jazzicon`

```
color-string  <1.5.5  (moderate, GHSA-257v-vj4p-3w2h)
  ↑ color  <=0.11.4
    ↑ @metamask/jazzicon  *
```

- **Vulnerability:** Regular Expression Denial of Service when parsing malformed CSS color strings.
- **Where used:** `@metamask/jazzicon` renders identicons (the small geometric avatars) for connected wallet addresses. The vulnerable code path requires user-controlled color strings to be parsed; jazzicon only feeds deterministic, internally-generated colors to `color`. **Practical exploitability: very low.**
- **Fix path:** None available downstream. Requires `@metamask/jazzicon` to update its `color` dependency. The upstream package has not released an update.
- **Re-check:** Re-run `npm audit` whenever upgrading wallet packages. Verify with `npm ls color-string`.
- **Alternative if exposure increases:** Swap `@metamask/jazzicon` for a different identicon library (e.g. `blockies-ts`, `@davatar/react`).

## 2. `postcss` (XSS) bundled inside `next`

```
postcss  <8.5.10  (moderate, GHSA-qx2v-qp2m-jg93)
  ↑ next  9.3.4-canary.0 - 16.3.0-canary.5
```

- **Vulnerability:** XSS via unescaped `</style>` in PostCSS's CSS stringify output.
- **Where used:** Next.js bundles its own copy of PostCSS at `node_modules/next/node_modules/postcss` for its internal build pipeline. The top-level `postcss` dependency was updated to 8.5.10 by `npm audit fix`, but Next.js's bundled copy is still 8.4.31.
- **Exposure:** **Build-time only.** PostCSS does not run in the served application — it runs during `next build`. An attacker would need to inject malicious CSS into the build pipeline, which would require write access to the codebase or its build inputs. Already a critical breach at that point.
- **Fix path:** Next.js team must update their bundled PostCSS. `npm audit`'s suggested fix (downgrade to `next@9.3.3`) is far worse than the vulnerability and would be a massive regression.
- **Re-check:** After every Next.js update. Run `npm ls postcss` to verify bundled version.

---

## Cleanup history

| Date | Action | Result |
|---|---|---|
| 2026-05-16 | Initial Vercel build flagged 15 vulnerabilities (10 moderate, 5 high) | Baseline |
| 2026-05-16 | `npm audit fix` (non-breaking) | 8 fixed: Next.js 16.2.4→16.2.6, basic-ftp, fast-uri, fast-xml-builder, fast-xml-parser, hono, ip-address, postcss (top-level), uuid |
| 2026-05-16 | `npm install @vercel/blob@latest` (breaking, audited safe) | Resolved undici via @vercel/blob v0.27→v2.3.3. Single usage site (`app/api/avatar/route.ts`) audited; all 4 options used (`access`, `contentType`, `addRandomSuffix`, `cacheControlMaxAge`) still supported in v2 API. |
| 2026-05-16 | Remaining 5 documented here as upstream-blocked | Closed |

## Operating policy

- Run `npm audit` on every dependency change.
- If new vulnerabilities appear with `severity: critical` or `severity: high`, prioritize as a release blocker.
- For new `moderate` findings: audit the usage site to assess practical exploitability. If exploitable, fix; if not exploitable, document here.
- Do not run `npm audit fix --force` blindly — it can introduce major-version regressions (e.g., suggesting `next@9.3.3` when on 16.x).
