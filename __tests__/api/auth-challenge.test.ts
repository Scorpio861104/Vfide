import { NextRequest } from 'next/server';
import { POST as createChallenge } from '@/app/api/auth/challenge/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('viem', () => ({
  isAddress: jest.fn(),
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

describe('/api/auth/challenge', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { isAddress } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    isAddress.mockReturnValue(true);
  });

  it('creates SIWE challenge payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 8453,
      }),
      headers: { host: 'vfide.io' },
    });

    const response = await createChallenge(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('Sign in to VFIDE');
    expect(data.message).toContain('Nonce:');
    expect(data.message).toContain('Chain ID: 8453');
  });
});
