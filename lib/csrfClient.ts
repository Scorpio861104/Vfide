/**
 * Client-side CSRF helper (double-submit-cookie pattern).
 *
 * The proxy sets a JS-readable `csrf_token` cookie and requires the same value
 * in the `x-csrf-token` header on state-changing requests to /api/* (see
 * lib/security/csrf.ts). Same-origin fetches send the cookie automatically; this
 * helper supplies the matching header so those requests pass CSRF validation.
 */

const CSRF_COOKIE = 'csrf_token';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

/**
 * Resolve the current CSRF token, fetching a fresh one if the cookie is absent
 * (the proxy sets the cookie on any /api/* response).
 */
export async function getCsrfToken(): Promise<string | null> {
  let token = readCookie(CSRF_COOKIE);
  if (!token && typeof window !== 'undefined') {
    try {
      await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
    } catch {
      // Even on failure the proxy sets the cookie on its response; re-read below.
    }
    token = readCookie(CSRF_COOKIE);
  }
  return token;
}

/**
 * Build headers for a JSON state-changing request, including the CSRF token.
 */
export async function csrfHeaders(
  base?: Record<string, string>,
): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  return {
    'Content-Type': 'application/json',
    ...(base ?? {}),
    ...(token ? { 'x-csrf-token': token } : {}),
  };
}
