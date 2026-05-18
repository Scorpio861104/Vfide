import { createHmac } from 'node:crypto';
import { dispatchWebhook } from '../webhooks/merchantWebhookDispatcher';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}));

describe('merchantWebhookDispatcher retry signature hardening', () => {
  const { query } = require('@/lib/db');
  const { lookup } = require('dns/promises');
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = 'this_is_a_test_key_with_sufficient_length_12345';

    // Endpoint select result
    query.mockImplementation((sql: string) => {
      if (sql.includes('FROM merchant_webhook_endpoints')) {
        return Promise.resolve({
          rows: [
            {
              id: 1,
              url: 'https://hooks.example.com/vfide',
              secret: 'merchant-secret',
              secret_encrypted: null,
              secret_iv: null,
              events: ['payment.completed'],
              status: 'active',
              failure_count: 0,
            },
          ],
        });
      }

      // All update/insert paths succeed
      return Promise.resolve({ rows: [] });
    });

    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('recomputes timestamp-bound signature on retry attempts', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network fail'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'ok',
      });

    global.fetch = mockFetch as unknown as typeof fetch;

    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_700_000_000_000)
      .mockReturnValueOnce(1_700_000_031_000)
      .mockReturnValue(1_700_000_031_000);

    await dispatchWebhook('0x1111111111111111111111111111111111111111', 'payment.completed', {
      order_id: 'order-1',
      amount: '1000',
    });

    // Wait for fire-and-forget deliveries and retry sleep
    await new Promise((resolve) => setTimeout(resolve, 1800));

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const firstHeaders = (mockFetch.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers;
    const secondHeaders = (mockFetch.mock.calls[1]?.[1] as { headers: Record<string, string> }).headers;
    const requestBody = (mockFetch.mock.calls[0]?.[1] as { body: string }).body;

    expect(firstHeaders['X-Webhook-Timestamp']).not.toEqual(secondHeaders['X-Webhook-Timestamp']);

    const firstExpected =
      'v1=' + createHmac('sha256', 'merchant-secret').update(`${firstHeaders['X-Webhook-Timestamp']}.${requestBody}`).digest('hex');
    const secondExpected =
      'v1=' + createHmac('sha256', 'merchant-secret').update(`${secondHeaders['X-Webhook-Timestamp']}.${requestBody}`).digest('hex');

    expect(firstHeaders['X-Webhook-Signature']).toBe(firstExpected);
    expect(secondHeaders['X-Webhook-Signature']).toBe(secondExpected);

    nowSpy.mockRestore();
  });
});
