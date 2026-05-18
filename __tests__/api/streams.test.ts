import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/streams/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/streams off-chain preview semantics', () => {
  const { query } = require('@/lib/db');
  const { requireOwnership } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireOwnership.mockResolvedValue({ ok: true });
  });

  it('GET returns explicit off-chain preview metadata', async () => {
    const wallet = '0x1234567890123456789012345678901234567890';
    query.mockResolvedValue({ rows: [] });

    const request = new NextRequest(`http://localhost:3000/api/streams?address=${wallet}&role=sender`);
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      streams: [],
      total: 0,
      source: 'offchain-preview',
      onchainBacked: false,
    });
    expect(payload.warning).toContain('off-chain previews');
  });

  it('POST creates preview-only stream metadata', async () => {
    const sender = '0x1234567890123456789012345678901234567890';
    const recipient = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const start = new Date(Date.now() + 60_000).toISOString();
    const end = new Date(Date.now() + 3_660_000).toISOString();

    query.mockResolvedValue({
      rows: [
        {
          id: 1,
          sender_address: sender,
          recipient_address: recipient,
          token: 'USDC',
          total_amount: '360',
          rate_per_second: '0.1',
          start_time: start,
          end_time: end,
          withdrawn: '0',
          is_paused: false,
          status: 'preview',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/streams', {
      method: 'POST',
      body: JSON.stringify({
        senderAddress: sender,
        recipientAddress: recipient,
        token: 'USDC',
        totalAmount: 360,
        ratePerSecond: 0.1,
        startTime: start,
        endTime: end,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.source).toBe('offchain-preview');
    expect(payload.onchainBacked).toBe(false);
    expect(payload.warning).toContain('preview record only');
    expect(payload.stream.status).toBe('preview');
  });
});
