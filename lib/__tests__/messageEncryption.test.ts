import {
  decryptGroupMessage,
  encryptGroupMessage,
} from '../messageEncryption';

beforeAll(() => {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require('crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
  }
});

type EcKeyHex = {
  publicSpkiHex: string;
  privatePkcs8Hex: string;
};

async function generateEcDhKeyHex(): Promise<EcKeyHex> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey']
  );

  const publicSpki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privatePkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicSpkiHex: Buffer.from(publicSpki).toString('hex'),
    privatePkcs8Hex: Buffer.from(privatePkcs8).toString('hex'),
  };
}

describe('group message encryption', () => {
  const sign = async (message: string): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return Buffer.from(digest).toString('hex');
  };
  const verify = async (message: string, signature: string): Promise<boolean> => {
    const expected = await sign(message);
    return signature === expected;
  };

  it('encrypts one payload per member and allows each member to decrypt', async () => {
    const alice = await generateEcDhKeyHex();
    const bob = await generateEcDhKeyHex();
    const carol = await generateEcDhKeyHex();

    const plaintext = 'Top-secret group update';
    const encrypted = await encryptGroupMessage(
      plaintext,
      'grp_42',
      [alice.publicSpkiHex, bob.publicSpkiHex, carol.publicSpkiHex],
      sign
    );

    const parsed = JSON.parse(encrypted);
    expect(parsed.v).toBe(2);
    expect(parsed.groupId).toBe('grp_42');
    expect(typeof parsed.groupSig).toBe('string');
    expect(parsed.groupSig.length).toBeGreaterThan(0);
    expect(Object.keys(parsed.encryptedForMembers)).toHaveLength(3);
    expect(encrypted).not.toContain(plaintext);

    const bobDecrypted = await decryptGroupMessage(
      encrypted,
      bob.privatePkcs8Hex,
      bob.publicSpkiHex,
      verify
    );

    expect(bobDecrypted.message).toBe(plaintext);
    expect(bobDecrypted.groupId).toBe('grp_42');
    expect(bobDecrypted.verified).toBe(true);

    const carolDecrypted = await decryptGroupMessage(
      encrypted,
      carol.privatePkcs8Hex,
      `0x${carol.publicSpkiHex}`,
      verify
    );

    expect(carolDecrypted.message).toBe(plaintext);
    expect(carolDecrypted.verified).toBe(true);
  });

  it('rejects empty member lists', async () => {
    await expect(encryptGroupMessage('hello', 'grp', [], sign)).rejects.toThrow(
      'Group encryption requires at least one recipient public key'
    );
  });

  it('supports decrypting legacy v1 group payloads for backward compatibility', async () => {
    const groupId = 'legacy_group';
    const message = 'legacy message';
    const ts = Date.now();
    const nonce = 'abc123nonce';
    const signature = await sign(`VFIDE_GROUP_ENCRYPT:${groupId}:${message}:${ts}:${nonce}`);

    const legacyPayload = JSON.stringify({
      v: 1,
      groupId,
      ts,
      nonce,
      sig: signature,
      msg: Buffer.from(message, 'utf8').toString('base64'),
    });

    const decrypted = await decryptGroupMessage(
      legacyPayload,
      '00'.repeat(100),
      '11'.repeat(100),
      verify
    );

    expect(decrypted.groupId).toBe(groupId);
    expect(decrypted.message).toBe(message);
    expect(decrypted.timestamp).toBe(ts);
    expect(decrypted.verified).toBe(true);
  });

  it('rejects decryption when member key is not included in payload', async () => {
    const alice = await generateEcDhKeyHex();
    const bob = await generateEcDhKeyHex();
    const mallory = await generateEcDhKeyHex();

    const encrypted = await encryptGroupMessage(
      'hidden',
      'grp_99',
      [alice.publicSpkiHex, bob.publicSpkiHex],
      sign
    );

    await expect(
      decryptGroupMessage(
        encrypted,
        mallory.privatePkcs8Hex,
        mallory.publicSpkiHex,
        verify
      )
    ).rejects.toThrow('Failed to decrypt group message');
  });
});
