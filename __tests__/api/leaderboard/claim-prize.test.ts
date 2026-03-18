import { NextRequest } from 'next/server';
import { POST } from '@/app/api/leaderboard/claim-prize/route';

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler: Function) => handler),
}));

describe('/api/leaderboard/claim-prize', () => {
  describe('POST', () => {
    it('should return 403 - monthly competition prizes are not available (Howey compliance)', async () => {
      const request = new NextRequest('http://localhost:3000/api/leaderboard/claim-prize', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          monthYear: '2024-01',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('not available');
    });
  });
});
