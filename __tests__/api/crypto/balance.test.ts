import { NextRequest } from 'next/server';
import { GET } from '@/app/api/crypto/balance/[address]/route';

jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(),
  isAddress: jest.fn(),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
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
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
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
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
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

describe('/api/crypto/balance/[address]', () => {
  const { isAddress } = require('viem');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { query } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return balance for valid address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      isAddress.mockReturnValue(true);
      query.mockResolvedValue({ rows: [{ token: 'VFIDE', balance: '1000' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/0x123');
      const response = await GET(request, { params: Promise.resolve({ address: '0x1111111111111111111111111111111111111123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.balances).toBeDefined();
    });

    it('should return 400 for invalid address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      isAddress.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/invalid');
      const response = await GET(request, { params: Promise.resolve({ address: 'invalid' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = { status: 429, json: async () => ({ error: 'Rate limit exceeded' }) };
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/0x123');
      const response = await GET(request, { params: Promise.resolve({ address: '0x1111111111111111111111111111111111111123' }) });

      expect(response.status).toBe(429);
    });

    it('should return 401 when authenticated address is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: {} });
      isAddress.mockImplementation((value: string) => value === '0x1111111111111111111111111111111111111123');

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/0x1111111111111111111111111111111111111123');
      const response = await GET(request, { params: Promise.resolve({ address: '0x1111111111111111111111111111111111111123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for address ownership mismatch', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });
      isAddress.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/crypto/balance/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
      const response = await GET(request, { params: Promise.resolve({ address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }) });

      expect(response.status).toBe(403);
    });
  });
});
