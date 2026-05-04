import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/crypto/transfer/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (request: NextRequest, user: { address: string }) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      const { requireAuth } = require('@/lib/auth/middleware');
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      return handler(request, authResult.user);
    };
  },
  requireAuth: jest.fn(),
}));

describe('/api/crypto/transfer', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({
      user: { address: '0x1111111111111111111111111111111111111111' },
    });
  });

  it('returns 501 with explicit wallet-signature requirement for valid requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/crypto/transfer', {
      method: 'POST',
      body: JSON.stringify({
        to: '0x2222222222222222222222222222222222222222',
        amount: '1.5',
        currency: 'VFIDE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(501);
    expect(data.success).toBe(false);
    expect(data.requiresClientWalletSignature).toBe(true);
  });

  it('returns 401 when unauthenticated', async () => {
    requireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const request = new NextRequest('http://localhost:3000/api/crypto/transfer', {
      method: 'POST',
      body: JSON.stringify({
        to: '0x2222222222222222222222222222222222222222',
        amount: '1.5',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
