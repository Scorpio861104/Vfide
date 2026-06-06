/**
 * Encrypted Storage Module
 * Provides secure encrypted storage that never writes sensitive data
 * (JWT tokens, private keys, secrets) to localStorage directly.
 *
 * All sensitive values are stored server-side in httpOnly cookies or
 * encrypted in memory. localStorage is only used for non-sensitive
 * UI preferences (theme, locale, last-visited-route).
 */

/**
 * Safe keys permitted in localStorage — must never include auth tokens,
 * private keys, or any cryptographic material.
 */
const SAFE_KEYS = new Set([
  'theme',
  'locale',
  'last-route',
  'sidebar-collapsed',
  'notifications-seen',
]);

export function safeSetItem(key: string, value: string): void {
  if (!SAFE_KEYS.has(key)) {
    throw new Error(
      `[EncryptedStorage] Attempt to write potentially sensitive key "${key}" to localStorage is blocked.`
    );
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently ignore storage quota errors
  }
}

export function safeGetItem(key: string): string | null {
  if (!SAFE_KEYS.has(key)) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently ignore
  }
}
