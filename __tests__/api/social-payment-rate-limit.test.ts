/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const authedUser = {
  sub: '0x1111111111111111111111111111111111111111',
  address: '0x1111111111111111111111111111111111111111',
};

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler: any) => async (request: NextRequest, context?: unknown) =>
    handler(request, authedUser, context)
  ),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/payments/verifyOnChainPayment', () => ({
  verifyOnChainPayment: jest.fn(),
  decidePaymentRecord: jest.fn(),
}));

const { withRateLimit } = jest.requireMock('@/lib/auth/rateLimit') as {
  withRateLimit: jest.Mock;
};
const { query } = jest.requireMock('@/lib/db') as { query: jest.Mock };
const { verifyOnChainPayment, decidePaymentRecord } = jest.requireMock(
  '@/lib/payments/verifyOnChainPayment'
) as {
  verifyOnChainPayment: jest.Mock;
  decidePaymentRecord: jest.Mock;
};

function jsonRequest(path: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('social payment APIs rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    verifyOnChainPayment.mockResolvedValue({ verified: true, status: 'confirmed' });
    decidePaymentRecord.mockReturnValue({
      accept: true,
      verified: true,
      verificationStatus: 'confirmed',
    });
    query.mockResolvedValue({ rows: [] });
  });

  it('short-circuits content purchase writes before verification and database work', async () => {
    const rateLimited = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    withRateLimit.mockResolvedValueOnce(rateLimited);
    const { POST } = await import('@/app/api/social/content-purchases/route');

    const response = await POST(
      jsonRequest('/api/social/content-purchases', {
        contentId: 'post-1',
        sellerAddress: '0x2222222222222222222222222222222222222222',
        currency: 'VFIDE',
        txHash: '0xabc',
      })
    );

    expect(response.status).toBe(429);
    expect(withRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), 'write');
    expect(verifyOnChainPayment).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('rate-limits public social tip reads with the api bucket', async () => {
    const rateLimited = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    withRateLimit.mockResolvedValueOnce(rateLimited);
    const { GET } = await import('@/app/api/social/tips/route');

    const response = await GET(
      new NextRequest('http://localhost:3000/api/social/tips?postId=post-1')
    );

    expect(response.status).toBe(429);
    expect(withRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), 'api');
    expect(query).not.toHaveBeenCalled();
  });

  it('rate-limits authenticated message tip reads with the api bucket', async () => {
    const rateLimited = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    withRateLimit.mockResolvedValueOnce(rateLimited);
    const { GET } = await import('@/app/api/messages/tip/route');

    const response = await GET(
      new NextRequest('http://localhost:3000/api/messages/tip?messageId=message-1')
    );

    expect(response.status).toBe(429);
    expect(withRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), 'api');
    expect(query).not.toHaveBeenCalled();
  });
});
