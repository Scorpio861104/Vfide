import { NextRequest } from 'next/server';
import { POST } from '@/app/api/security/2fa/initiate/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/security/2fa/initiate', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SENDGRID_API_KEY: 'test-sendgrid-key',
      SENDGRID_FROM_EMAIL: 'noreply@vfide.app',
      SENDGRID_FROM_NAME: 'VFIDE',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    } as Response);
    withRateLimit.mockResolvedValue(null);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 when authenticated address is malformed', async () => {
    requireAuth.mockResolvedValue({ user: { address: 'not-an-address' } });

    const request = new NextRequest('http://localhost:3000/api/security/2fa/initiate', {
      method: 'POST',
      body: JSON.stringify({
        method: 'email',
        destination: 'user@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(query).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid email destination format', async () => {
    requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
    query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com' }] });

    const request = new NextRequest('http://localhost:3000/api/security/2fa/initiate', {
      method: 'POST',
      body: JSON.stringify({
        method: 'email',
        destination: 'not-an-email',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid email destination format');
  });

  it('returns 400 when destination exceeds maximum length', async () => {
    requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

    const oversizedDestination = `${'a'.repeat(321)}@example.com`;
    const request = new NextRequest('http://localhost:3000/api/security/2fa/initiate', {
      method: 'POST',
      body: JSON.stringify({
        method: 'email',
        destination: oversizedDestination,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
    expect(query).not.toHaveBeenCalled();
  });

  it('normalizes destination and succeeds for verified email', async () => {
    requireAuth.mockResolvedValue({ user: { address: ' 0x1111111111111111111111111111111111111123 ' } });
    query
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/security/2fa/initiate', {
      method: 'POST',
      body: JSON.stringify({
        method: 'email',
        destination: ' User@Example.com ',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, email FROM users WHERE wallet_address = $1',
      ['0x1111111111111111111111111111111111111123']
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO two_factor_codes'),
      expect.arrayContaining([1, 'email', 'user@example.com'])
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
