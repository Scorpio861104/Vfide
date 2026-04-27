import { NextRequest } from 'next/server';
import { proxy } from '../../proxy';

describe('proxy connect-src restrictions', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function getDirective(csp: string, name: string): string {
    const directive = csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `));

    if (!directive) {
      throw new Error(`Missing ${name} directive in CSP: ${csp}`);
    }

    return directive;
  }

  it('does not allow generic protocol wildcards in connect-src', () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      method: 'GET',
    });

    const response = proxy(request);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    const connectSrc = getDirective(csp as string, 'connect-src');

    expect(connectSrc).not.toMatch(/(?:^|\s)https:(?:\s|$)/);
    expect(connectSrc).not.toMatch(/(?:^|\s)ws:(?:\s|$)/);
    expect(connectSrc).not.toMatch(/(?:^|\s)wss:(?:\s|$)/);
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('https://*.walletconnect.com');
    expect(connectSrc).toContain('wss://*.walletconnect.org');
  });

  it('includes configured runtime origins in connect-src allowlist', () => {
    process.env.NEXT_PUBLIC_RPC_URL = 'https://sepolia.base.org';
    process.env.NEXT_PUBLIC_WEBSOCKET_URL = 'wss://ws.vfide.io/socket';
    process.env.NEXT_PUBLIC_API_URL = 'https://api.vfide.io';

    const request = new NextRequest('http://localhost:3000/dashboard', {
      method: 'GET',
    });

    const response = proxy(request);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    const connectSrc = getDirective(csp as string, 'connect-src');

    expect(connectSrc).toContain('https://sepolia.base.org');
    expect(connectSrc).toContain('wss://ws.vfide.io');
    expect(connectSrc).toContain('https://api.vfide.io');
  });
});
