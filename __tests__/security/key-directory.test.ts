import {
  KEY_DIRECTORY_MAX_SKEW_MS,
  buildKeyDirectorySigningMessage,
  validateKeyDirectoryPayload,
} from '@/lib/security/keyDirectory';

describe('Key directory signing', () => {
  const address = '0x1234567890123456789012345678901234567890';
  const key = `${'ab'.repeat(100)}`;

  it('builds deterministic signing message', () => {
    const ts = 1710000000000;
    const message = buildKeyDirectorySigningMessage(address, key, ts);
    expect(message).toBe(`VFIDE_KEY_DIRECTORY_V1:${address}:${key}:${ts}`);
  });

  it('rejects expired payload timestamps', () => {
    const payload = {
      address,
      encryptionPublicKey: key,
      signature: '0x1234567890abcdef1234567890abcdef1234567890',
      timestamp: Date.now() - (KEY_DIRECTORY_MAX_SKEW_MS + 1),
    };

    const result = validateKeyDirectoryPayload(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('expired');
    }
  });
});
