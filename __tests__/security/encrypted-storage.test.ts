/**
 * Tests for encrypted storage audit fixes
 * Verifies: no plaintext fallback, encryption-only storage, proper error handling
 */

// Mock Web Crypto API
const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();
const mockImportKey = jest.fn();
const mockDeriveKey = jest.fn();
const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
  return arr;
});

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      encrypt: mockEncrypt,
      decrypt: mockDecrypt,
      importKey: mockImportKey,
      deriveKey: mockDeriveKey,
    },
    getRandomValues: mockGetRandomValues,
  },
});

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn((key: string) => { delete store[key]; }),
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

describe('Encrypted Storage - Audit Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(store).forEach(k => delete store[k]);
  });

  describe('getEncryptedItem - no plaintext fallback', () => {
    it('should return null when no encrypted key exists (not fallback to unencrypted)', async () => {
      // Store a plaintext value under the raw key
      store['sensitiveData'] = 'plaintext_secret';
      // Do NOT store anything under encrypted_ prefix

      const { getEncryptedItem } = await import('@/lib/storage/encryptedStorage');

      const result = await getEncryptedItem('sensitiveData');

      // CRITICAL: Must return null, NOT the plaintext value
      expect(result).toBeNull();
      // Should only check encrypted_ prefix
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('encrypted_sensitiveData');
    });

    it('should return null on decryption error (not fallback to unencrypted)', async () => {
      // Store both encrypted and unencrypted
      store['encrypted_secret'] = 'corrupted_encrypted_data';
      store['secret'] = 'plaintext_fallback';

      const { getEncryptedItem } = await import('@/lib/storage/encryptedStorage');

      const result = await getEncryptedItem('secret');

      // CRITICAL: Must return null on error, NOT the plaintext fallback
      expect(result).toBeNull();
    });
  });

  describe('setEncryptedItem - no silent degradation', () => {
    it('should throw when encryption fails (not silently store plaintext)', async () => {
      // Make encryption fail
      mockImportKey.mockRejectedValueOnce(new Error('Crypto unavailable'));

      const { setEncryptedItem } = await import('@/lib/storage/encryptedStorage');

      await expect(setEncryptedItem('apiKey', 'secret123')).rejects.toThrow(
        'Refusing to store apiKey without encryption'
      );

      // Must NOT have stored plaintext
      expect(store['apiKey']).toBeUndefined();
    });
  });

  describe('isEncryptionSupported', () => {
    it('should return true when Web Crypto API is available', async () => {
      const { isEncryptionSupported } = await import('@/lib/storage/encryptedStorage');
      expect(isEncryptionSupported()).toBe(true);
    });
  });
});
