/**
 * Secure Random Utilities
 *
 * Provides cryptographically secure random ID generation to replace
 * insecure Math.random() usage throughout the codebase.
 */

/**
 * Generate a cryptographically secure hex string.
 * @param bytes Number of random bytes (default 8, producing 16 hex chars)
 */
export function secureHex(bytes: number = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure prefixed ID.
 * Format: `{prefix}_{timestamp}_{hex}`
 * @param prefix The prefix for the ID (e.g. 'tip', 'msg', 'group')
 */
export function secureId(prefix: string): string {
  return `${prefix}_${Date.now()}_${secureHex(5)}`;
}

/**
 * Generate a cryptographically secure invite code using alphanumeric chars.
 * @param length Length of the code (default 8)
 */
export function secureInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsLen = chars.length; // 62
  // Rejection sampling to eliminate modulo bias
  // 256 % 62 = 8, so values >= 248 cause bias
  const limit = 256 - (256 % charsLen); // 248
  const result: string[] = [];
  while (result.length < length) {
    const randomBytes = new Uint8Array(length - result.length + 4); // extra bytes to reduce loops
    crypto.getRandomValues(randomBytes);
    for (const b of randomBytes) {
      if (result.length >= length) break;
      if (b < limit) {
        result.push(chars[b % charsLen]!);
      }
    }
  }
  return result.join('');
}
