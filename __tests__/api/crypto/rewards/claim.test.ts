import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/crypto/rewards/[userId]/claim/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

// Prevent the route from making real RPC calls to the blockchain during tests
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    readContract: jest.fn().mockResolvedValue(true),
  })),
  http: jest.fn(),
  isAddress: jest.fn().mockReturnValue(true),
}));

jest.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
  polygon: { id: 137, name: 'Polygon' },
  polygonAmoy: { id: 80002, name: 'Polygon Amoy' },
  zkSync: { id: 324, name: 'zkSync Era' },
  zkSyncSepoliaTestnet: { id: 300, name: 'zkSync Sepolia Testnet' },
}));

describe('/api/crypto/rewards/[userId]/claim', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should claim rewards successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, amount: '100', reward_type: 'quest', source_contract: null }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 1, amount: '100' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({
          rewardIds: ['1', '2'],
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
      requireAuth.mockResolvedValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated wallet does not own requested userId', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });
      query.mockResolvedValueOnce({ rows: [{ wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({ rewardIds: ['11111111-1111-1111-1111-111111111111'] }),
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      expect(response.status).toBe(403);
    });

    it('should return 401 when authenticated address is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: {} });
      query.mockResolvedValueOnce({ rows: [{ wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({ rewardIds: ['1'] }),
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      expect(response.status).toBe(401);
    });

    it('should return 400 for malformed JSON payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON body');
    });

    it('should return 400 when payload is not a JSON object', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify(['1', '2']),
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });
  });
});
