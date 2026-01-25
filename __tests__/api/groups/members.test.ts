import { NextRequest } from 'next/server';
import { GET } from '@/app/api/groups/members/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/groups/members', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return group members', async () => {
      withRateLimit.mockResolvedValue(null);

      query.mockResolvedValue({
        rows: [
          {
            user_address: '0x1111111111111111111111111111111111111123',
            username: 'user1',
            role: 'member',
            joined_at: new Date().toISOString(),
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/groups/members?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(1);
    });

    it('should return 400 when groupId is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/groups/members');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });
});
