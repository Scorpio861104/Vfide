import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/crypto/rewards/[userId]/claim/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
}));

describe('/api/crypto/rewards/[userId]/claim', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireOwnership } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should claim rewards successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireOwnership.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123', id: '1' } });

      query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 1, amount: '100', status: 'pending', source_contract: null, onchain_reward_id: null }],
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({
          rewardIds: [1, 2],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      requireOwnership.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      expect(response.status).toBe(401);
    });
  });
});
