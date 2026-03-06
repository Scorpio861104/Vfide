import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/crypto/fees/route';

jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(),
  formatGwei: jest.fn((value) => (Number(value) / 1e9).toString()),
}));

jest.mock('viem/chains', () => ({
  base: { id: 8453 },
  baseSepolia: { id: 84532 },
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/crypto/fees', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { createPublicClient } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_IS_TESTNET = 'true';
  });

  describe('GET', () => {
    it('should return gas fee estimates', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        estimateMaxPriorityFeePerGas: jest.fn().mockResolvedValue(BigInt(1000000000)), // 1 gwei
        getGasPrice: jest.fn().mockResolvedValue(BigInt(20000000000)), // 20 gwei
      };
      createPublicClient.mockReturnValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/crypto/fees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fees).toHaveProperty('slow');
      expect(data.fees).toHaveProperty('standard');
      expect(data.fees).toHaveProperty('fast');
      expect(data.timestamp).toBeDefined();
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/fees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });

    it('should handle RPC errors gracefully', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        estimateMaxPriorityFeePerGas: jest.fn().mockRejectedValue(new Error('RPC error')),
        getGasPrice: jest.fn().mockRejectedValue(new Error('RPC error')),
      };
      createPublicClient.mockReturnValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/crypto/fees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fees).toBeDefined(); // Should return fallback values
    });

    it('should return different fee tiers', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        estimateMaxPriorityFeePerGas: jest.fn().mockResolvedValue(BigInt(1000000000)),
        getGasPrice: jest.fn().mockResolvedValue(BigInt(20000000000)),
      };
      createPublicClient.mockReturnValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/crypto/fees');
      const response = await GET(request);
      const data = await response.json();

      expect(data.fees.slow).toBeDefined();
      expect(data.fees.standard).toBeDefined();
      expect(data.fees.fast).toBeDefined();
      expect(Number(data.fees.fast.maxPriorityFeePerGas)).toBeGreaterThan(Number(data.fees.slow.maxPriorityFeePerGas));
    });

    it('should include timestamp in response', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        estimateMaxPriorityFeePerGas: jest.fn().mockResolvedValue(BigInt(1000000000)),
        getGasPrice: jest.fn().mockResolvedValue(BigInt(20000000000)),
      };
      createPublicClient.mockReturnValue(mockClient);

      const beforeTimestamp = Date.now();
      const request = new NextRequest('http://localhost:3000/api/crypto/fees');
      const response = await GET(request);
      const data = await response.json();
      const afterTimestamp = Date.now();

      expect(data.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(data.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should use fallback gas price when RPC returns non-positive gas price', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        estimateMaxPriorityFeePerGas: jest.fn().mockResolvedValue(BigInt(1000000000)),
        getGasPrice: jest.fn().mockResolvedValue(BigInt(0)),
      };
      createPublicClient.mockReturnValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/crypto/fees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Number(data.fees.slow.maxFeePerGas)).toBeGreaterThan(0);
      expect(Number(data.fees.standard.maxFeePerGas)).toBeGreaterThan(0);
      expect(Number(data.fees.fast.maxFeePerGas)).toBeGreaterThan(0);
    });
  });
});
