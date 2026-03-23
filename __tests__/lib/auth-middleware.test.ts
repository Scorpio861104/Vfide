import { NextRequest, NextResponse } from 'next/server';

const mockVerifyToken = jest.fn();
const mockExtractToken = jest.fn();
const mockGetAuthCookie = jest.fn();

function loadMiddleware() {
  jest.resetModules();

  jest.doMock('@/lib/auth/jwt', () => ({
    verifyToken: mockVerifyToken,
    extractToken: mockExtractToken,
  }));

  jest.doMock('@/lib/auth/cookieAuth', () => ({
    getAuthCookie: mockGetAuthCookie,
  }));

  return require('@/lib/auth/middleware') as typeof import('@/lib/auth/middleware');
}

describe('auth middleware admin checks', () => {
  const adminAddress = '0x1234567890123456789012345678901234567890';
  const otherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ADMIN_ADDRESS: adminAddress,
      ADMIN_ADDRESSES: '',
    };
    delete process.env.OCP_ADDRESS;
    delete process.env.RPC_URL;
    delete process.env.NEXT_PUBLIC_RPC_URL;

    mockExtractToken.mockReturnValue('test-token');
    mockVerifyToken.mockResolvedValue({ address: adminAddress });
    mockGetAuthCookie.mockResolvedValue(null);
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('returns 403 when env-admin fails on-chain verification', async () => {
    process.env.OCP_ADDRESS = '0x9999999999999999999999999999999999999999';
    process.env.RPC_URL = 'https://rpc.example';
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        result: `0x000000000000000000000000${otherAddress.slice(2)}`,
      }),
    });

    const { requireAdmin } = loadMiddleware();
    const request = new NextRequest('http://localhost:3000/api/admin', {
      headers: { authorization: 'Bearer test-token' },
    });

    const result = await requireAdmin(request);

    const response = result as NextResponse;
    expect(response.status).toBe(403);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://rpc.example',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('allows admin when on-chain owner matches', async () => {
    process.env.OCP_ADDRESS = '0x9999999999999999999999999999999999999999';
    process.env.RPC_URL = 'https://rpc.example';
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        result: `0x000000000000000000000000${adminAddress.slice(2)}`,
      }),
    });

    const { requireAdmin } = loadMiddleware();
    const request = new NextRequest('http://localhost:3000/api/admin', {
      headers: { authorization: 'Bearer test-token' },
    });

    const result = await requireAdmin(request);

    expect(result).toEqual({
      user: expect.objectContaining({ address: adminAddress }),
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to env-admin check when on-chain config is absent', async () => {
    const { requireAdmin } = loadMiddleware();
    const request = new NextRequest('http://localhost:3000/api/admin', {
      headers: { authorization: 'Bearer test-token' },
    });

    const result = await requireAdmin(request);

    expect(result).toEqual({
      user: expect.objectContaining({ address: adminAddress }),
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});