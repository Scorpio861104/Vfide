import { NextRequest } from 'next/server';
import { proxy } from '../../proxy';

describe('proxy request-size enforcement coverage', () => {
  const csrfToken = 'csrf-size-token';

  it('rejects /api/auth writes above small-tier limit', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(10 * 1024 + 1),
      },
      body: '{}',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      error: 'Request payload too large',
      maxSize: 10 * 1024,
      receivedSize: 10 * 1024 + 1,
    });
  });

  it('allows /api/auth writes exactly at small-tier limit', () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(10 * 1024),
      },
      body: '{}',
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-nonce')).toBeTruthy();
  });

  it('rejects /api/attachments/upload writes above large-tier limit', async () => {
    const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=----vfide-size',
        'content-length': String(1024 * 1024 + 1),
      },
      body: '--',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      error: 'Request payload too large',
      maxSize: 1024 * 1024,
      receivedSize: 1024 * 1024 + 1,
    });
  });

  it('allows /api/attachments/upload at large-tier limit when CSRF is valid', () => {
    const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=----vfide-size',
        'content-length': String(1024 * 1024),
        cookie: `csrf_token=${csrfToken}`,
        'x-csrf-token': csrfToken,
      },
      body: '--',
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-nonce')).toBeTruthy();
  });

  it('does not apply API body limits to non-API paths', () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(1024 * 1024 * 10),
      },
      body: '{}',
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-nonce')).toBeTruthy();
  });
});
