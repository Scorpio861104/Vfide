const CSRF_EXEMPT_API_PATHS = [
  '/api/auth',
  '/api/auth/challenge',
  '/api/health',
  '/api/csrf',
] as const;

/** Prefixes that are exempt (e.g. webhook routes with their own HMAC auth) */
const CSRF_EXEMPT_PREFIXES = [
  '/api/security/webhook-',
] as const;

export function isCsrfExemptPath(pathname: string): boolean {
  if (CSRF_EXEMPT_API_PATHS.some((path) => path === pathname)) return true;
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

export { CSRF_EXEMPT_API_PATHS };