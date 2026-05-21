import { NextRequest, NextResponse } from 'next/server';
import { GET, PUT } from '@/app/api/security/keys/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
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
  };
});

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('viem', () => ({
  isAddress: jest.fn(),
  verifyMessage: jest.fn(),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
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
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}));

describe('/api/security/keys', () => {
  const { query } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { isAddress, verifyMessage } = require('viem');

  const address = '0x1234567890123456789012345678901234567890';
  const encryptionPublicKey = 'ab'.repeat(100);

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    isAddress.mockReturnValue(true);
  });

  it('GET returns key entry for a valid address', async () => {
    query.mockResolvedValue({
      rows: [{
        address,
        encryption_public_key: encryptionPublicKey,
        algorithm: 'ECDH-P256-SPKI',
        proof_signature: '0xsignature',
        proof_timestamp: `${Date.now()}`,
        updated_at: new Date().toISOString(),
      }],
    });

    const request = new NextRequest(`http://localhost:3000/api/security/keys?address=${address}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.address).toBe(address);
    expect(data.encryptionPublicKey).toBe(encryptionPublicKey);
  });

  it('PUT rejects publishing key for another address', async () => {
    requireAuth.mockResolvedValue({ user: { address } });

    const request = new NextRequest('http://localhost:3000/api/security/keys', {
      method: 'PUT',
      body: JSON.stringify({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        encryptionPublicKey,
        signature: '0xsignature',
        timestamp: Date.now(),
      }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(403);
  });

  it('PUT stores key on valid signed payload', async () => {
    requireAuth.mockResolvedValue({ user: { address } });
    verifyMessage.mockResolvedValue(true);
    query.mockResolvedValue({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/security/keys', {
      method: 'PUT',
      body: JSON.stringify({
        address,
        encryptionPublicKey,
        signature: '0xsignature1234567890',
        timestamp: Date.now(),
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(verifyMessage).toHaveBeenCalled();
    expect(query).toHaveBeenCalled();
  });

  it('PUT rejects invalid signatures', async () => {
    requireAuth.mockResolvedValue({ user: { address } });
    verifyMessage.mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/security/keys', {
      method: 'PUT',
      body: JSON.stringify({
        address,
        encryptionPublicKey,
        signature: '0xsignature1234567890',
        timestamp: Date.now(),
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Signature');
  });

  it('PUT returns auth response when unauthenticated', async () => {
    requireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const request = new NextRequest('http://localhost:3000/api/security/keys', {
      method: 'PUT',
      body: JSON.stringify({
        address,
        encryptionPublicKey,
        signature: '0xsignature1234567890',
        timestamp: Date.now(),
      }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(401);
  });
});
