import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/activities/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  activitySchema: {},
}));

describe('/api/activities', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user activities', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockActivities = [
        {
          id: 1,
          user_address: '0x123',
          activity_type: 'transaction',
          description: 'Sent 10 ETH',
          created_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValue({ rows: mockActivities });

      const request = new NextRequest('http://localhost:3000/api/activities?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activities).toHaveLength(1);
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });

  describe('POST', () => {
    it('should create activity successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x123',
          activityType: 'transaction',
          description: 'Sent 10 ETH',
        },
      });

      query.mockResolvedValue({
        rows: [{
          id: 1,
          activity_type: 'transaction',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x123',
          activityType: 'transaction',
          description: 'Sent 10 ETH',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activity).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
