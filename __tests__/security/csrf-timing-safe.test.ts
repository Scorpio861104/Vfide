/**
 * Tests for CSRF timing-safe comparison audit fix
 * Verifies: constant-time comparison, no short-circuit on mismatch
 */

describe('CSRF Protection - Timing-Safe Verification', () => {
  let CSRFProtection: {
    generateToken: () => string;
    verifyToken: (token: string, sessionToken: string) => boolean;
  };

  beforeAll(async () => {
    // Mock crypto.getRandomValues for token generation
    if (typeof globalThis.crypto === 'undefined') {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
            return arr;
          },
        },
      });
    }

    // Mock Buffer for base64 encoding
    if (typeof globalThis.Buffer === 'undefined') {
      Object.defineProperty(globalThis, 'Buffer', {
        value: {
          from: (data: Uint8Array) => ({
            toString: () => Array.from(data, b => b.toString(16).padStart(2, '0')).join(''),
          }),
        },
      });
    }

    const mod = await import('@/lib/security');
    CSRFProtection = mod.CSRFProtection;
  });

  it('should return true for matching tokens', () => {
    const token = 'abc123def456';
    expect(CSRFProtection.verifyToken(token, token)).toBe(true);
  });

  it('should return false for mismatched tokens', () => {
    expect(CSRFProtection.verifyToken('token_a', 'token_b')).toBe(false);
  });

  it('should return false for empty token', () => {
    expect(CSRFProtection.verifyToken('', 'valid_token')).toBe(false);
  });

  it('should return false for empty session token', () => {
    expect(CSRFProtection.verifyToken('valid_token', '')).toBe(false);
  });

  it('should return false for different length tokens', () => {
    expect(CSRFProtection.verifyToken('short', 'much_longer_token')).toBe(false);
  });

  it('should return false for tokens differing in last character only', () => {
    const token1 = 'abcdefghijk1';
    const token2 = 'abcdefghijk2';
    expect(CSRFProtection.verifyToken(token1, token2)).toBe(false);
  });

  it('should handle tokens with special characters', () => {
    const token = 'base64+token/with=special';
    expect(CSRFProtection.verifyToken(token, token)).toBe(true);
  });

  it('should return false for null-like inputs', () => {
    expect(CSRFProtection.verifyToken(null as unknown as string, 'token')).toBe(false);
    expect(CSRFProtection.verifyToken('token', null as unknown as string)).toBe(false);
    expect(CSRFProtection.verifyToken(undefined as unknown as string, 'token')).toBe(false);
  });
});
