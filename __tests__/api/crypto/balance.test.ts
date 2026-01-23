import { NextRequest } from 'next/server';
import { GET } from '@/app/api/crypto/balance/[address]/route';

jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(),
  isAddress: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn(),
  getClientIdentifier: jest.fn(),
  getRateLimitHeaders: jest.fn(),
}));

describe('/api/crypto/balance/[address]', () => {
  const { createPublicClient, isAddress } = require('viem');
  const { checkRateLimit, getClientIdentifier } = require('@/lib/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return balance for valid address', async () => {
      getClientIdentifier.mockReturnValue('test-client');
      checkRateLimit.mockReturnValue({ success: true });
      isAddress.mockReturnValue(true);

      const mockClient = {
        getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
        readContract: jest.fn().mockResolvedValue(BigInt('5000000000000000000')),
      };
      createPublicClient.mockReturnValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/0x123');
      const response = await GET(request, { params: { address: '0x123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.balance).toBeDefined();
    });

    it('should return 400 for invalid address', async () => {
      getClientIdentifier.mockReturnValue('test-client');
      checkRateLimit.mockReturnValue({ success: true });
      isAddress.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/invalid');
      const response = await GET(request, { params: { address: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('should return 429 for rate limit exceeded', async () => {
      getClientIdentifier.mockReturnValue('test-client');
      checkRateLimit.mockReturnValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/0x123');
      const response = await GET(request, { params: { address: '0x123' } });

      expect(response.status).toBe(429);
    });
  });
});
