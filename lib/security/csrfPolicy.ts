const CSRF_EXEMPT_API_PATHS = [
  '/api/auth',
  '/api/auth/challenge',
  '/api/health',
] as const;

export function isCsrfExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_API_PATHS.some((path) => path === pathname);
}

export { CSRF_EXEMPT_API_PATHS };