import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/health', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.npm_package_version = '1.2.0';
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_CHAIN_ID = '84532';
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = 'test-project-id';
  });

  describe('GET', () => {
    it('should return health status with 200 when all checks pass', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'ok',
        version: '1.2.0',
        environment: 'test',
        checks: {
          env: true,
          nextjs: true,
        },
      });
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.memory).toHaveProperty('used');
      expect(data.memory).toHaveProperty('total');
      expect(data.memory).toHaveProperty('external');
    });

    it('should return 503 when environment variables are missing', async () => {
      withRateLimit.mockResolvedValue(null);
      delete process.env.NEXT_PUBLIC_CHAIN_ID;

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.checks.env).toBe(false);
    });

    it('should return rate limit error when rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it('should include memory metrics in response', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.memory).toBeDefined();
      expect(typeof data.memory.used).toBe('number');
      expect(typeof data.memory.total).toBe('number');
      expect(typeof data.memory.external).toBe('number');
      expect(data.memory.used).toBeGreaterThan(0);
      expect(data.memory.total).toBeGreaterThan(0);
    });

    it('should include uptime in response', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should default to version 1.2.0 when npm_package_version is not set', async () => {
      withRateLimit.mockResolvedValue(null);
      delete process.env.npm_package_version;

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.version).toBe('1.2.0');
    });

    it('should default to development when NODE_ENV is not set', async () => {
      withRateLimit.mockResolvedValue(null);
      delete process.env.NODE_ENV;

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.environment).toBe('development');
    });

    it('should have valid ISO timestamp', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });
});
