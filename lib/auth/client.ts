/**
 * Client-side auth helpers.
 *
 * Auth tokens are stored in HttpOnly cookies (set by cookieAuth.ts) which
 * are NOT accessible via document.cookie.  The browser sends them
 * automatically with every same-origin request, so API calls need no
 * explicit Authorization header.
 *
 * To check whether the current user is authenticated, call the server-side
 * verification endpoint (GET /api/auth) which reads the HttpOnly cookie
 * on the server and returns the session status.
 */

// ---------------------------------------------------------------------------
// Cached auth state (avoids repeated round-trips to /api/auth)
// ---------------------------------------------------------------------------
let _cachedAuth: { address: string; expiresAt: number } | null = null;
let _pendingCheck: Promise<string | null> | null = null;

/**
 * Check authentication status by calling the server-side auth endpoint.
 * Returns the authenticated wallet address (truthy) or null.
 *
 * Results are cached until the token's server-reported expiry so
 * repeated synchronous-looking call-sites can `await` cheaply.
 */
export async function getAuthToken(): Promise<string | null> {
  // Return cached result if still valid (with 30-second margin)
  if (_cachedAuth && Date.now() < (_cachedAuth.expiresAt * 1000 - 30_000)) {
    return _cachedAuth.address;
  }

  // De-duplicate concurrent calls
  if (_pendingCheck) return _pendingCheck;

  _pendingCheck = (async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include', // Sends HttpOnly cookies automatically
      });

      if (!res.ok) {
        _cachedAuth = null;
        return null;
      }

      const data = await res.json();
      if (data.valid && data.address) {
        _cachedAuth = {
          address: data.address,
          expiresAt: data.expiresAt || Math.floor(Date.now() / 1000) + 300,
        };
        return data.address;
      }

      _cachedAuth = null;
      return null;
    } catch {
      _cachedAuth = null;
      return null;
    } finally {
      _pendingCheck = null;
    }
  })();

  return _pendingCheck;
}

/**
 * Build headers for authenticated API requests.
 *
 * Because the auth token lives in an HttpOnly cookie the browser attaches
 * it automatically to every same-origin request.  No Authorization header
 * is required -- just return an empty object so existing call-sites that
 * spread `...getAuthHeaders()` keep working.
 */
export function getAuthHeaders(): HeadersInit {
  return {};
}

/**
 * Clear the cached auth status.
 * Call this on logout so subsequent checks hit the server.
 */
export function clearAuthCache(): void {
  _cachedAuth = null;
  _pendingCheck = null;
}
