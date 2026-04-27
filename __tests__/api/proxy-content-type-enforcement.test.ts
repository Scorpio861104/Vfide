import { NextRequest } from 'next/server';
import { proxy } from '../../middleware';

describe('proxy content-type enforcement coverage', () => {
  const csrfToken = 'csrf-test-token';

  it('rejects missing Content-Type on write API requests', async () => {
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
  });

  it('rejects unsupported Content-Type on default write API endpoints', async () => {
    const request = new NextRequest('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'content-length': '2',
      },
      body: '{}',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(415);
    expect(payload.error).toBe('Unsupported Content-Type');
    expect(payload.allowedContentTypes).toContain('application/json');
  });

  it('accepts multipart/form-data on /api/attachments/upload when CSRF is valid', () => {
    const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=----vfide-test',
        'content-length': '32',
        cookie: `csrf_token=${csrfToken}`,
        'x-csrf-token': csrfToken,
      },
      body: '--',
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-nonce')).toBeTruthy();
  });

  it('rejects JSON Content-Type on /api/attachments/upload', async () => {
    const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '2',
      },
      body: '{}',
    });

    const response = proxy(request);
    const payload = await response.json();

    expect(response.status).toBe(415);
    expect(payload.error).toBe('Unsupported Content-Type');
    expect(payload.allowedContentTypes).toContain('multipart/form-data');
  });
});
