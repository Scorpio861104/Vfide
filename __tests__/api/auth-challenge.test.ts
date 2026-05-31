import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/security/siweChallenge', () => ({
  createSiweChallenge: jest.fn(async () => ({
    nonce: 'test-nonce-12345',
    message:
      'vfide.io wants you to sign in with your Ethereum account:\n0x1234567890123456789012345678901234567890\n\nSign in to VFIDE\n\nURI: https://vfide.io\nVersion: 1\nChain ID: 8453\nNonce: test-nonce-12345\nIssued At: 2024-01-01T00:00:00.000Z',
    issuedAt: '2024-01-01T00:00:00.000Z',
    expiresAt: '2024-01-01T00:10:00.000Z',
  })),
  getRequestIp: jest.fn(() => '127.0.0.1'),
  resolveTrustedAuthDomain: jest.fn(() => 'vfide.io'),
}));

jest.mock('viem', () => ({
  isAddress: jest.fn(() => true),
}));

import { POST as createChallenge } from '@/app/api/auth/challenge/route';

describe('/api/auth/challenge', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { isAddress } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    isAddress.mockReturnValue(true);
    process.env.NEXT_PUBLIC_CHAIN_ID = '8453';
    process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS = '8453,84532';
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
