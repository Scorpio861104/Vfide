import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/proposals/route';

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
  proposalSchema: {},
}));

describe('/api/proposals', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return list of proposals', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockProposals = [
        {
          id: 1,
          title: 'Proposal 1',
          description: 'Description 1',
          status: 'active',
          votes_for: 100,
          votes_against: 50,
        },
      ];

      query.mockResolvedValue({ rows: mockProposals });

      const request = new NextRequest('http://localhost:3000/api/proposals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.proposals).toHaveLength(1);
    });

    it('should filter by status', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/proposals?status=active');
      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.any(Array)
      );
    });
  });

  describe('POST', () => {
    it('should create proposal successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          title: 'New Proposal',
          description: 'Description',
          proposer: '0x123',
        },
      });

      query.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'New Proposal',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Proposal',
          description: 'Description',
          proposer: '0x123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.proposal).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
