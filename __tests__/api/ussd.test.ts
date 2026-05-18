/// <reference types="jest" />

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

function buildAuthorizedUSSDRequest(text: string): Request {
  const form = new URLSearchParams();
  form.set('sessionId', text ? 'xyz789' : 'abc123');
  form.set('phoneNumber', text ? '+233555000001' : '+233555000000');
  form.set('text', text);

  return new Request('http://localhost:3000/api/ussd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-ussd-gateway-token': 'test-gateway-token',
    },
    body: form.toString(),
  });
}

async function loadPostHandler() {
  jest.resetModules();
  process.env.ALLOW_MOCK_USSD = 'true';
  process.env.USSD_GATEWAY_TOKEN = 'test-gateway-token';

  const module = await import('../../app/api/ussd/route');
  return module.POST;
}

describe('/api/ussd', () => {
  it('rejects requests without gateway token', async () => {
    const POST = await loadPostHandler();

    const form = new URLSearchParams();
    form.set('sessionId', 'unauth-1');
    form.set('phoneNumber', '+233555000999');
    form.set('text', '');

    const request = new Request('http://localhost:3000/api/ussd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const response = await POST(request as any);
    const text = await response.text();

    expect(response.status).toBe(401);
    expect(text).toContain('END Unauthorized gateway.');
  });

  it('rejects requests with incorrect gateway token', async () => {
    const POST = await loadPostHandler();

    const form = new URLSearchParams();
    form.set('sessionId', 'unauth-2');
    form.set('phoneNumber', '+233555000998');
    form.set('text', '1');

    const request = new Request('http://localhost:3000/api/ussd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-ussd-gateway-token': 'wrong-token',
      },
      body: form.toString(),
    });

    const response = await POST(request as any);
    const text = await response.text();

    expect(response.status).toBe(401);
    expect(text).toContain('END Unauthorized gateway.');
  });

  it('returns the main USSD menu for a new session', async () => {
    const POST = await loadPostHandler();
    const request = buildAuthorizedUSSDRequest('');

    const response = await POST(request as any);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('CON Welcome to VFIDE');
    expect(text).toContain('1. Pay Merchant');
  });

  it('confirms a merchant payment flow', async () => {
    const POST = await loadPostHandler();
    const request = buildAuthorizedUSSDRequest('1*SHOP001*25*1');

    const response = await POST(request as any);
    const text = await response.text();

    expect(text).toContain('END VFIDE USSD payments are coming soon. No payment was submitted.');
  });
});
