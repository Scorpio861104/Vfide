import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/proposals/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  checkOwnership: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  createProposalSchema: {
    safeParse: jest.fn(),
  },
}));

describe('/api/proposals', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, checkOwnership } = require('@/lib/auth/middleware');
  const { createProposalSchema } = require('@/lib/auth/validation');

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

    it('should clamp oversized offset to 10000', async () => {
      withRateLimit.mockResolvedValue(null);
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest('http://localhost:3000/api/proposals?limit=50&offset=999999');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [50, 10000]
      );
    });

    it('should return 400 for invalid limit parameter', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/proposals?limit=10abc');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid proposerId format', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/proposals?proposerId=not-an-address');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return degraded response when database auth fails', async () => {
      withRateLimit.mockResolvedValue(null);
      const dbAuthError = Object.assign(new Error('password authentication failed for user "postgres"'), {
        code: '28P01',
      });
      query.mockRejectedValue(dbAuthError);

      const request = new NextRequest('http://localhost:3000/api/proposals?limit=5&offset=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        proposals: [],
        total: 0,
        limit: 50,
        offset: 0,
        degraded: true,
      });
    });
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: '{"proposerAddress":"0x1111111111111111111111111111111111111123"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('JSON object');
    });

    it('should create proposal successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      checkOwnership.mockReturnValue(true);
      createProposalSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          proposerAddress: '0x1111111111111111111111111111111111111123',
          title: 'New Proposal',
          description: 'Description',
        },
      });

      query.mockResolvedValueOnce({ rows: [{ id: 1, is_council_member: false, proof_score: 100 }] });
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'New Proposal',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify({
          proposerAddress: '0x1111111111111111111111111111111111111123',
          title: 'New Proposal',
          description: 'Description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.proposal).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
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

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(createProposalSchema.safeParse).not.toHaveBeenCalled();
    });
  });
});
