import { NextRequest, NextResponse } from 'next/server';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://vercel.live https://*.walletconnect.com https://*.walletconnect.org`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https: https://*.walletconnect.com https://*.walletconnect.org https://*.base.org https://*.polygon.technology https://*.zksync.io",
    "frame-src 'self' https://*.walletconnect.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // Constant-time XOR comparison — always processes all bytes
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

function validateCsrfInMiddleware(request: NextRequest): NextResponse | null {
  const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (!stateChangingMethods.has(request.method)) {
    return null;
  }

  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return null;
  }

  if (request.nextUrl.pathname.startsWith('/api/auth/') || request.nextUrl.pathname === '/api/health') {
    return null;
  }

  const cookieToken = request.cookies.get('csrf_token')?.value;
  const headerToken = request.headers.get('x-csrf-token') || undefined;

  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return NextResponse.json(
      {
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_INVALID',
      },
      { status: 403 },
    );
  }

  return null;
}

export function middleware(request: NextRequest): NextResponse {
  const csrfFailure = validateCsrfInMiddleware(request);
  if (csrfFailure) {
    return csrfFailure;
  }

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
