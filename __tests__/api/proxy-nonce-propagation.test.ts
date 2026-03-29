import { NextRequest } from 'next/server';
import { proxy } from '../../proxy';

describe('proxy nonce propagation consistency', () => {
  function assertNonceParity(response: Response): string {
    const nonce = response.headers.get('x-nonce');
    const csp = response.headers.get('Content-Security-Policy');

    expect(nonce).toBeTruthy();
    expect(csp).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);

    return nonce as string;
  }

  it('sets matching x-nonce and CSP nonce on normal route pass-through responses', () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      method: 'GET',
    });

    const response = proxy(request);
    const nonce = assertNonceParity(response);

    expect(nonce.length).toBeGreaterThan(10);
  });

  it('sets matching x-nonce and CSP nonce on content-type rejection responses', async () => {
    const request = new NextRequest('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: {
        'content-length': '2',
      },
      body: '{}',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(415);
    expect(payload.error).toBe('Missing Content-Type header');
    assertNonceParity(response);
  });

  it('sets matching x-nonce and CSP nonce on CSRF rejection responses', async () => {
    const request = new NextRequest('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '2',
      },
      body: '{}',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.code).toBe('CSRF_TOKEN_INVALID');
    assertNonceParity(response);
  });
});
