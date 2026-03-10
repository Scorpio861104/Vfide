import { NextRequest } from 'next/server';
import { POST as createChallenge } from '@/app/api/auth/challenge/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('viem', () => ({
  isAddress: jest.fn(),
}));

describe('/api/auth/challenge', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { isAddress } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    isAddress.mockReturnValue(true);
  });

  it('creates SIWE challenge payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 8453,
      }),
      headers: { host: 'vfide.io' },
    });

    const response = await createChallenge(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('Sign in to VFIDE');
    expect(data.message).toContain('Nonce:');
    expect(data.message).toContain('Chain ID: 8453');
  });
});
