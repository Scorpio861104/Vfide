/**
 * Client-side Authentication Utilities
 *
 * Provides helpers for attaching auth headers to fetch requests.
 * Reads the auth token from cookies (set during login) so that
 * components can simply call getAuthHeaders() when making API calls.
 */

const AUTH_COOKIE_NAME = 'vfide_auth_token';

/**
 * Read a cookie value by name (client-side only).
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Return headers with the Authorization bearer token attached.
 *
 * Usage:
 * ```ts
 * fetch('/api/endpoint', { headers: getAuthHeaders() })
 * // or merge with other headers:
 * fetch('/api/endpoint', { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
 * ```
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getCookie(AUTH_COOKIE_NAME);
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
