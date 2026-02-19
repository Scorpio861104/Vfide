import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/users/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/optimization/apiOptimization', () => ({
  parsePaginationParams: jest.fn(),
  createPaginatedResponse: jest.fn(),
  addCacheHeaders: jest.fn((response) => response),
  filterFields: jest.fn((obj) => obj),
  parseFieldsParam: jest.fn(),
}));

jest.mock('@/lib/optimization/monitoring', () => ({
  trackApiCallSimple: jest.fn(),
}));

describe('/api/users', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { parsePaginationParams, createPaginatedResponse, parseFieldsParam } = require('@/lib/optimization/apiOptimization');
  const mockAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return paginated users list', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });
      parsePaginationParams.mockReturnValue({ page: 1, limit: 10 });
      parseFieldsParam.mockReturnValue(null);

      const mockUsers = [
        {
          id: '1',
          wallet_address: '0x1234567890123456789012345678901234567890',
          username: 'user1',
          display_name: 'User One',
          proof_score: 100,
          reputation_score: 50,
          is_council_member: false,
          is_verified: true,
        },
      ];

      query
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      createPaginatedResponse.mockReturnValue({
        data: mockUsers,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      });

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
    });

    it('should support search parameter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });
      parsePaginationParams.mockReturnValue({ page: 1, limit: 10 });
      parseFieldsParam.mockReturnValue(null);

      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      createPaginatedResponse.mockReturnValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/users?search=test');
      const response = await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE username ILIKE $1'),
        expect.arrayContaining(['%test%'])
      );
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });
      parsePaginationParams.mockReturnValue({ page: 1, limit: 10 });
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch users');
    });

    it('should order users by proof_score descending', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });
      parsePaginationParams.mockReturnValue({ page: 1, limit: 10 });
      parseFieldsParam.mockReturnValue(null);

      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      createPaginatedResponse.mockReturnValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/users');
      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY proof_score DESC'),
        expect.any(Array)
      );
    });

    it('should support field filtering', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });
      parsePaginationParams.mockReturnValue({ page: 1, limit: 10 });
      parseFieldsParam.mockReturnValue(['wallet_address', 'username']);

      const mockUsers = [{ wallet_address: '0x1111111111111111111111111111111111111123', username: 'user1' }];
      query
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      createPaginatedResponse.mockReturnValue({
        data: mockUsers,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      });

      const request = new NextRequest('http://localhost:3000/api/users?fields=wallet_address,username');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';

    it('should create new user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });

      const newUser = {
        id: '1',
        wallet_address: mockAddress,
        username: 'newuser',
        display_name: 'New User',
        bio: 'Hello',
        avatar_url: 'https://example.com/avatar.png',
      };

      query
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ rows: [newUser] }); // Insert result

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          wallet_address: mockAddress,
          username: 'newuser',
          display_name: 'New User',
          bio: 'Hello',
          avatar_url: 'https://example.com/avatar.png',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.wallet_address).toBe(mockAddress);
      expect(data.user.username).toBe('newuser');
    });

    it('should update existing user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });

      const existingUser = {
        id: '1',
        wallet_address: mockAddress,
        username: 'olduser',
      };

      const updatedUser = {
        ...existingUser,
        username: 'updateduser',
      };

      query
        .mockResolvedValueOnce({ rows: [existingUser] }) // Existing user
        .mockResolvedValueOnce({ rows: [updatedUser] }); // Update result

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          wallet_address: mockAddress,
          username: 'updateduser',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.username).toBe('updateduser');
    });

    it('should return 400 when wallet_address is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      // Auth returns empty address which is now rejected at auth level with 401
      requireAuth.mockResolvedValue({ user: { address: '' } });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ username: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should lowercase wallet address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });

      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ wallet_address: mockAddress.toLowerCase() }] });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          wallet_address: mockAddress.toUpperCase(),
        }),
      });

      await POST(request);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockAddress.toLowerCase()])
      );
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ wallet_address: mockAddress }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create/update user');
    });

    it('should handle partial updates', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: mockAddress } });

      const existingUser = {
        id: '1',
        wallet_address: mockAddress,
        username: 'user',
        bio: 'old bio',
      };

      query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValueOnce({ rows: [{ ...existingUser, bio: 'new bio' }] });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          wallet_address: mockAddress,
          bio: 'new bio',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
