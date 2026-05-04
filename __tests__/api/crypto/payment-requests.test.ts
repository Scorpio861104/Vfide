import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/crypto/payment-requests/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (request: NextRequest, user: { address?: string }) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      const { requireAuth } = require('@/lib/auth/middleware');
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      return handler(request, authResult.user);
    };
  },
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/security/accountProtection', () => ({
  getAccountLock: jest.fn().mockResolvedValue(null),
  getStepUpAndCooldownPolicy: jest.fn((amount: number) => ({
    isHighRisk: amount >= 10000,
    requiresStepUp: amount >= 10000,
    requiresDelay: amount >= 10000,
    cooldownSeconds: 300,
    hardwareWalletRecommended: true,
  })),
  recordSecurityEvent: jest.fn().mockResolvedValue({ locked: false }),
}));

jest.mock('@/lib/security/requestContext', () => ({
  getRequestIp: jest.fn(() => ({ ip: '127.0.0.1' })),
}));

describe('/api/crypto/payment-requests', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return payment requests', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            from_address: '0x1111111111111111111111111111111111111123',
            to_address: '0x2222222222222222222222222222222222222456',
            amount: '1.5',
            status: 'pending',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests?userId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests).toHaveLength(1);
    });

    it('should return 400 for malformed userId query', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests?userId=1abc');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return 401 when auth address is missing in GET', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: {} });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests?userId=1');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests', {
        method: 'POST',
        body: '{"fromUserId":1',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON body');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should create payment request', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      query.mockResolvedValueOnce({
        rows: [{ id: 1, from_address: '0x1111111111111111111111111111111111111123', to_address: '0x2222222222222222222222222222222222222456' }],
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          fromUserId: 1,
          toUserId: 2,
          amount: '1.5',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 when auth address is missing in POST', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: {} });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          fromUserId: 1,
          toUserId: 2,
          amount: '1.5',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('requires step-up authentication for high-risk amounts', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          fromUserId: 1,
          toUserId: 2,
          amount: '50000',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('still requires a valid step-up challenge payload for high-risk amounts', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests', {
        method: 'POST',
        headers: {
          'x-vfide-step-up': 'verified',
        },
        body: JSON.stringify({
          fromUserId: 1,
          toUserId: 2,
          amount: '50000',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });
});
