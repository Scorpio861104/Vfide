/**
 * Client-side auth utilities.
 *
 * VFIDE uses same-origin httpOnly cookies, so JavaScript cannot and should not
 * read the auth token. Keep requests same-origin and let the browser attach
 * cookies automatically.
 */

/**
 * @deprecated Do not use. Kept for backward compatibility only.
 * No Authorization header is required for same-origin cookie auth.
 */
export function getAuthHeaders(): Record<string, string> {
  return {};
}
