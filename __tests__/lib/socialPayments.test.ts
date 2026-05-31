import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSendPayment = jest.fn();
const mockValidateAmount = jest.fn();
const mockValidateEthereumAddress = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

jest.mock('@/lib/crypto', () => ({
  sendPayment: (...args: unknown[]) => mockSendPayment(...args),
}));

jest.mock('@/lib/cryptoValidation', () => ({
  validateAmount: (...args: unknown[]) => mockValidateAmount(...args),
  validateEthereumAddress: (...args: unknown[]) => mockValidateEthereumAddress(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

describe('socialPayments notification hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default validators to "valid"; individual tests override when needed.
    mockValidateAmount.mockReturnValue({ valid: true });
    mockValidateEthereumAddress.mockReturnValue({ valid: true });
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });

    mockSendPayment.mockResolvedValue({
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      txHash: `0x${'b'.repeat(64)}`,
      status: 'confirmed',
    });
  });

  it('does not fail tipPost when notification dispatch returns a server error', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'server error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      );

    const { tipPost } = require('@/lib/socialPayments');

    const tip = await tipPost(
      'post-1',
      '0x1111111111111111111111111111111111111111',
      '1.5',
      'VFIDE',
      'Nice post'
    );

    expect(tip.status).toBe('confirmed');
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      '[socialPayments] notification dispatch failed for tip_received: 500'
    );
  });
});
