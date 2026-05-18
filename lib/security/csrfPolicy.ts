const CSRF_EXEMPT_API_PATHS = [
  // Auth bootstrap endpoints. `/api/auth` is exempt because it is used to establish
  // the session cookie itself after SIWE signature verification.
  '/api/auth',
  '/api/auth/challenge',
  '/api/health',
  '/api/csrf',
  // API-CSRF-1 FIX: USSD gateway uses X-USSD-Gateway-Token header (timing-safe equal),
  // not browser session cookies. Cannot include CSRF cookie. Has its own auth.
  '/api/ussd',
  // API-CSRF-1 FIX: Browsers auto-send CSP violation reports without cookies.
  // Reports are unauthenticated by design and sanitized at the route level.
  '/api/security/csp-report',
  // API-PERF-1 FIX: Browser RUM emissions (lib/performance.ts) sent via keepalive POST
  // during page unload — cannot include CSRF cookie. Origin-validated by proxy.ts CORS,
  // rate-limited by route, schema-validated. Diagnostic write only.
  '/api/performance/metrics',
] as const;

/** Prefixes that are exempt (e.g. webhook routes with their own HMAC auth) */
const CSRF_EXEMPT_PREFIXES = [
  '/api/security/webhook-',
  '/monitoring',
] as const;

export function isCsrfExemptPath(pathname: string): boolean {
  if (CSRF_EXEMPT_API_PATHS.some((path) => path === pathname)) return true;
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

export { CSRF_EXEMPT_API_PATHS };