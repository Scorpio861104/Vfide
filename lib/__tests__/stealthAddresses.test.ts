/**
 * Stealth Addresses Tests
 */

import {
  StealthMetaAddress,
  StealthAddress,
  StealthPayment,
  PrivacyProfile,
  encryptStealthKeys,
  decryptStealthKeys,
} from '../stealthAddresses';

// Polyfill Web Crypto API for jsdom test environment
beforeAll(() => {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    // Node.js 18+ exposes webcrypto via require('crypto')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require('crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
  }
});

describe('StealthMetaAddress interface', () => {
  it('defines meta address structure', () => {
    const metaAddress: StealthMetaAddress = {
      spendingPubKey: '0x04' + '1'.repeat(128),
      viewingPubKey: '0x04' + '2'.repeat(128),
      prefix: 'st:eth:',
    };
    expect(metaAddress.prefix).toBe('st:eth:');
    expect(metaAddress.spendingPubKey).toBeDefined();
    expect(metaAddress.viewingPubKey).toBeDefined();
  });

  it('has correct public key format', () => {
    const metaAddress: StealthMetaAddress = {
      spendingPubKey: '0x041234567890',
      viewingPubKey: '0x04abcdef1234',
      prefix: 'st:eth:',
    };
    expect(metaAddress.spendingPubKey.startsWith('0x04')).toBe(true);
    expect(metaAddress.viewingPubKey.startsWith('0x04')).toBe(true);
  });
});

describe('StealthAddress interface', () => {
  it('defines stealth address structure', () => {
    const stealthAddr: StealthAddress = {
      address: '0x1234567890123456789012345678901234567890',
      ephemeralPubKey: '0x04' + 'a'.repeat(128),
      viewTag: '0x12',
    };
    expect(stealthAddr.address).toBeDefined();
    expect(stealthAddr.ephemeralPubKey).toBeDefined();
    expect(stealthAddr.viewTag).toBe('0x12');
  });
});

describe('StealthPayment interface', () => {
  it('defines payment structure', () => {
    const payment: StealthPayment = {
      id: 'payment-1',
      stealthAddress: '0x1234567890123456789012345678901234567890',
      ephemeralPubKey: '0x04abc',
      amount: '1.5',
      token: 'ETH',
      timestamp: Date.now(),
      claimed: false,
    };
    expect(payment.id).toBe('payment-1');
    expect(payment.claimed).toBe(false);
    expect(payment.txHash).toBeUndefined();
  });

  it('tracks claimed payments with tx hash', () => {
    const payment: StealthPayment = {
      id: 'payment-2',
      stealthAddress: '0xabcd',
      ephemeralPubKey: '0x04def',
      amount: '2.0',
      token: 'USDC',
      timestamp: Date.now(),
      claimed: true,
      txHash: '0x' + 'f'.repeat(64),
    };
    expect(payment.claimed).toBe(true);
    expect(payment.txHash).toBeDefined();
  });
});

describe('PrivacyProfile interface', () => {
  it('defines privacy profile structure', () => {
    const profile: PrivacyProfile = {
      metaAddress: {
        spendingPubKey: '0x04abc',
        viewingPubKey: '0x04def',
        prefix: 'st:eth:',
      },
      receivedPayments: [],
      sentPayments: [],
    };
    expect(profile.metaAddress).toBeDefined();
    expect(profile.receivedPayments).toEqual([]);
    expect(profile.sentPayments).toEqual([]);
  });

  it('tracks multiple payments', () => {
    const payment1: StealthPayment = {
      id: '1',
      stealthAddress: '0x111',
      ephemeralPubKey: '0x04a',
      amount: '1.0',
      token: 'ETH',
      timestamp: 1000,
      claimed: true,
    };
    const payment2: StealthPayment = {
      id: '2',
      stealthAddress: '0x222',
      ephemeralPubKey: '0x04b',
      amount: '2.0',
      token: 'ETH',
      timestamp: 2000,
      claimed: false,
    };
    const profile: PrivacyProfile = {
      metaAddress: {
        spendingPubKey: '0x04',
        viewingPubKey: '0x04',
        prefix: 'st:eth:',
      },
      receivedPayments: [payment1],
      sentPayments: [payment2],
    };
    expect(profile.receivedPayments.length).toBe(1);
    expect(profile.sentPayments.length).toBe(1);
  });
});

describe('encryptStealthKeys / decryptStealthKeys', () => {
  const testAddress = '0xAbCd1234567890AbCd1234567890AbCd12345678';
  const testKeys = {
    metaAddress: {
      spendingPubKey: 'aabbcc' + '00'.repeat(30),
      viewingPubKey: 'ddeeff' + '11'.repeat(30),
      prefix: 'st:eth:0x',
    } as StealthMetaAddress,
    spendingPrivKey: '01'.repeat(32),
    viewingPrivKey: '02'.repeat(32),
  };

  beforeEach(() => {
    // Provide a minimal localStorage stub
    const store: Record<string, string> = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => store[k] ?? null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { store[k] = v; });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((k) => { delete store[k]; });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('encrypts keys into an opaque ciphertext (not plain JSON)', async () => {
    const stored = await encryptStealthKeys(testKeys, testAddress);
    const parsed = JSON.parse(stored);
    expect(parsed.encrypted).toBe(true);
    expect(parsed.iv).toBeDefined();
    expect(parsed.ciphertext).toBeDefined();
    // The stored blob must not contain the raw private key hex
    expect(stored).not.toContain(testKeys.spendingPrivKey);
    expect(stored).not.toContain(testKeys.viewingPrivKey);
  });

  it('round-trips: decrypt(encrypt(keys)) === keys', async () => {
    const stored = await encryptStealthKeys(testKeys, testAddress);
    const recovered = await decryptStealthKeys(stored, testAddress);
    expect(recovered.spendingPrivKey).toBe(testKeys.spendingPrivKey);
    expect(recovered.viewingPrivKey).toBe(testKeys.viewingPrivKey);
    expect(recovered.metaAddress.spendingPubKey).toBe(testKeys.metaAddress.spendingPubKey);
    expect(recovered.metaAddress.viewingPubKey).toBe(testKeys.metaAddress.viewingPubKey);
  });

  it('migrates legacy plain-text storage transparently', async () => {
    // Simulate the old plain-text format
    const legacy = JSON.stringify(testKeys);
    const recovered = await decryptStealthKeys(legacy, testAddress);
    expect(recovered.spendingPrivKey).toBe(testKeys.spendingPrivKey);
    expect(recovered.viewingPrivKey).toBe(testKeys.viewingPrivKey);
  });

  it('fails to decrypt with a different address (wrong derived key)', async () => {
    const stored = await encryptStealthKeys(testKeys, testAddress);
    await expect(decryptStealthKeys(stored, '0x0000000000000000000000000000000000000000'))
      .rejects.toThrow();
  });
});
