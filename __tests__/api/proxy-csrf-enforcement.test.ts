import { NextRequest } from 'next/server';
import { proxy } from '../../middleware';

describe('proxy CSRF enforcement coverage', () => {
  const jsonHeaders = {
    'content-type': 'application/json',
    'content-length': '2',
  };

  it('rejects write requests to non-exempt API routes without CSRF token', async () => {
    const request = new NextRequest('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: jsonHeaders,
      body: '{}',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      code: 'CSRF_TOKEN_INVALID',
    });
  });

  it('allows exempt pre-auth endpoint /api/auth without CSRF token', () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      headers: jsonHeaders,
      body: '{}',
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-nonce')).toBeTruthy();
  });

  it('does not exempt /api/auth/revoke from CSRF enforcement', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
      method: 'POST',
      headers: jsonHeaders,
      body: '{}',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      code: 'CSRF_TOKEN_INVALID',
    });
  });

  it('allows non-state-changing methods without CSRF token', () => {
    const request = new NextRequest('http://localhost:3000/api/messages', {
      method: 'GET',
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-nonce')).toBeTruthy();
  });
});
