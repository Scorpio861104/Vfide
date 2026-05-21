import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { GET, POST } from '../../../app/api/security/guardian-attestations/route';
import { buildGuardianAttestationMessage } from '../../../lib/recovery/guardianAttestation';

const mockVerifyMessage = jest.fn();

jest.mock('viem', () => ({
  verifyMessage: (...args: unknown[]) => mockVerifyMessage(...args),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
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
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => {
  const requireAuth = jest.fn();
  return {
    requireAuth,
    withAuth: (handler: (request: NextRequest, user: unknown) => unknown) => async (request: NextRequest, ...rest: unknown[]) => {
      const authResult = await requireAuth(request);
      if (!authResult?.user) return authResult;
      return handler(request, authResult.user, ...rest);
    },
    isAdmin: jest.fn(() => false),
    requireAuth: async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } }),
    requireOwnership: async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } }),
    requireAdmin: async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } }),
    verifyAuth: async () => ({ ok: true, user: { sub: 'test' } }),
    getRequestAuthToken: async () => null,
    optionalAuth: async () => null,
    verifyOnChainAdmin: async () => false,
    checkOwnership: () => true,
    withOwnership: (handler) => async (req, ctx) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx),
  };
});

describe('/api/security/guardian-attestations', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    mockVerifyMessage.mockResolvedValue(true);
    requireAuth.mockImplementation(async (request: NextRequest) => {
      const owner = request.headers.get('x-test-owner')?.toLowerCase();
      return { user: { address: owner ?? '0x0000000000000000000000000000000000000000' } };
    });
  });

  it('accepts valid owner-signed guardian attestation', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const owner = account.address.toLowerCase() as `0x${string}`;
    const payload = {
      version: 'vfide-guardian-attestation-v1' as const,
      owner,
      vault: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      guardian: '0x2222222222222222222222222222222222222222' as `0x${string}`,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    };

    const signature = await account.signMessage({
      message: buildGuardianAttestationMessage(payload),
    });

    const request = new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
      method: 'POST',
      body: JSON.stringify({ ...payload, signature }),
      headers: { 'x-test-owner': owner },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects invalid signature', async () => {
    mockVerifyMessage.mockResolvedValue(false);
    const account = privateKeyToAccount(generatePrivateKey());
    const request = new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
      method: 'POST',
      body: JSON.stringify({
        owner: account.address,
        vault: '0x1111111111111111111111111111111111111111',
        guardian: '0x2222222222222222222222222222222222222222',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
        signature: '0xdeadbeef',
      }),
      headers: { 'x-test-owner': account.address.toLowerCase() },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns active attestations for guardian', async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const ownerAddress = owner.address.toLowerCase() as `0x${string}`;
    const payload = {
      version: 'vfide-guardian-attestation-v1' as const,
      owner: ownerAddress,
      vault: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      guardian: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    };

    const signature = await owner.signMessage({
      message: buildGuardianAttestationMessage(payload),
    });

    await POST(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
        method: 'POST',
        body: JSON.stringify({ ...payload, signature }),
        headers: { 'x-test-owner': ownerAddress },
      })
    );

    const response = await GET(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations?guardian=0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', {
        headers: { 'x-test-owner': '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      })
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.attestations)).toBe(true);
  });

  it('returns summary telemetry in admin mode', async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const ownerAddress = owner.address.toLowerCase() as `0x${string}`;
    const payload = {
      version: 'vfide-guardian-attestation-v1' as const,
      owner: ownerAddress,
      vault: '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`,
      guardian: '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    };

    const signature = await owner.signMessage({
      message: buildGuardianAttestationMessage(payload),
    });

    await POST(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
        method: 'POST',
        body: JSON.stringify({ ...payload, signature }),
        headers: { 'x-test-owner': ownerAddress },
      })
    );

    const response = await GET(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations?mode=summary&sinceMinutes=60&limit=10')
    );

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.summary).toBeDefined();
    expect(typeof data.summary.total).toBe('number');
    expect(typeof data.summary.active).toBe('number');
    expect(Array.isArray(data.summary.topOwners)).toBe(true);
    expect(Array.isArray(data.summary.topGuardians)).toBe(true);
    expect(Array.isArray(data.events)).toBe(true);
  });
});
