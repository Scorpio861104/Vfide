import { stripDecryptedContentForStorage } from '@/lib/messageEncryption';

describe('Message storage hardening', () => {
  it('removes decryptedContent before persistence', () => {
    const input = [
      {
        id: 'm1',
        encryptedContent: 'ciphertext-1',
        decryptedContent: 'super secret plaintext',
        verified: true,
      },
      {
        id: 'm2',
        encryptedContent: 'ciphertext-2',
        decryptedContent: 'another secret',
        verified: false,
      },
    ];

    const sanitized = stripDecryptedContentForStorage(input);

    expect(sanitized).toHaveLength(2);
    expect(Object.prototype.hasOwnProperty.call(sanitized[0], 'decryptedContent')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(sanitized[1], 'decryptedContent')).toBe(false);
    expect((sanitized[0] as any).encryptedContent).toBe('ciphertext-1');
    expect((sanitized[1] as any).encryptedContent).toBe('ciphertext-2');
  });
});
