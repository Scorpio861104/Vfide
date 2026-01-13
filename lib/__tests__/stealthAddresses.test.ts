/**
 * Stealth Addresses Tests
 */

import {
  StealthMetaAddress,
  StealthAddress,
  StealthPayment,
  PrivacyProfile,
} from '../stealthAddresses';

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
