import { logger } from '@/lib/logger';
/**
 * Client-side CSRF Utilities
 *
 * Fetches a CSRF token from the server and builds headers
 * that include the token for state-changing requests.
 *
 * The server sets the token in a same-site cookie (automatic on fetch
 * with credentials: 'include') and also returns it in the JSON body
 * so the client can send it back via the x-csrf-token header.
 */

const CSRF_HEADER = 'x-csrf-token';

/** In-memory cache so we don't re-fetch on every request */
let cachedToken: string | null = null;

/**
 * Fetch a CSRF token from the `/api/csrf` endpoint.
 * Caches the token in memory for subsequent calls.
 *
 * @param forceRefresh - bypass cache and fetch a fresh token
 * @returns The CSRF token string, or null on failure
 */
export async function getCsrfToken(forceRefresh = false): Promise<string | null> {
  if (cachedToken && !forceRefresh) {
    return cachedToken;
  }

  try {
    const res = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include', // ensures the httpOnly cookie is set
    });

    if (!res.ok) {
      logger.error('[csrfClient] Failed to fetch CSRF token:', res.status);
      return null;
    }

    const data = (await res.json()) as { token?: string };
    cachedToken = data.token ?? null;
    return cachedToken;
  } catch (error) {
    logger.error('[csrfClient] Error fetching CSRF token:', error);
    return null;
  }
}

/**
 * Build request headers that include CSRF protection.
 *
 * For GET / HEAD requests, the token is skipped since they are
 * not state-changing.
 *
 * @param baseHeaders - existing headers to merge with
 * @param method      - HTTP method (defaults to 'GET')
 * @returns A merged headers object with x-csrf-token added when needed
 */
export async function buildCsrfHeaders(
  baseHeaders: Record<string, string> = {},
  method: string = 'GET',
): Promise<Record<string, string>> {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(method.toUpperCase())) {
    return { ...baseHeaders };
  }

  const token = await getCsrfToken();
  if (!token) {
    // Proceed without CSRF header — the server will reject if strict
    return { ...baseHeaders };
  }

  return {
    ...baseHeaders,
    [CSRF_HEADER]: token,
  };
}

/**
 * Invalidate the cached token (e.g. after a 403 CSRF error).
 * The next call to getCsrfToken / buildCsrfHeaders will fetch a fresh one.
 */
export function clearCsrfCache(): void {
  cachedToken = null;
}
