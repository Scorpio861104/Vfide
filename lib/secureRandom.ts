/**
 * Cryptographically Secure Random ID Generator
 *
 * Uses crypto.getRandomValues() for secure randomness.
 * Never use Math.random() for IDs that could be guessable.
 */

/**
 * Generate a cryptographically secure random ID with an optional prefix.
 *
 * @param prefix - Short label prepended to the ID (e.g. 'alert', 'tx', 'msg')
 * @returns A string in the form `${prefix}_${hex}` (e.g. "alert_a3f9c1…")
 */
export function secureId(prefix: string): string {
  const bytes = new Uint8Array(16); // 128-bit entropy
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${hex}`;
}
