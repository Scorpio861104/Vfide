import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('cryptoValidation gas estimation fallbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as Window & { ethereum?: unknown }).ethereum = undefined;
  });

  it('calculates gas cost from provider gas limit and gas price', async () => {
    const request = jest.fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValueOnce('0x5208')
      .mockResolvedValueOnce('0x3b9aca00');

    (window as Window & { ethereum?: unknown }).ethereum = { request };

    const { estimateGas } = await import('@/lib/cryptoValidation');

    await expect(estimateGas(
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '1'
    )).resolves.toBeCloseTo(0.000021, 9);
  });

  it('returns the default fallback estimate when provider gas estimation fails', async () => {
    const request = jest.fn<(...args: unknown[]) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('Gas estimation failed'));

    (window as Window & { ethereum?: unknown }).ethereum = { request };

    const { estimateGas } = await import('@/lib/cryptoValidation');

    await expect(estimateGas(
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '1'
    )).resolves.toBe(0.002);
  });

  it('uses the fallback gas estimate when checking ETH balance sufficiency', async () => {
    const request = jest.fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValueOnce('0xde0b6b3a7640000')
      .mockRejectedValueOnce(new Error('Gas estimation failed'));

    (window as Window & { ethereum?: unknown }).ethereum = { request };

    const { checkSufficientBalance } = await import('@/lib/cryptoValidation');

    await expect(checkSufficientBalance(
      '0x1111111111111111111111111111111111111111',
      '0.5',
      'ETH',
      true
    )).resolves.toMatchObject({
      sufficient: true,
      balance: '1',
      required: '0.502',
    });
  });
});