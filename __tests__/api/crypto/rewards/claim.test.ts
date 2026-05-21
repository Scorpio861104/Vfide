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
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
  withOwnership: jest.fn((_extractor: any, handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
}));

// Prevent the route from making real RPC calls to the blockchain during tests
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    readContract: jest.fn().mockResolvedValue(true),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  isAddress: jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  isAddress: jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
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

    it('should skip unsupported on-chain reward verifiers and still claim rewards', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: '11111111-1111-1111-1111-111111111111',
            amount: '25',
            reward_type: 'quest',
            source_contract: '0x9999999999999999999999999999999999999999',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ id: '11111111-1111-1111-1111-111111111111', amount: '25' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({
          rewardIds: ['11111111-1111-1111-1111-111111111111'],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.claimed).toBe(1);
    });
  });
});
