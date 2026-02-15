import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateContentType } from './lib/api/contentTypeValidation';
import { validateCSRF } from './lib/security/csrf';

const generateNonce = () => {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  let binary = '';
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const buildCsp = (nonce: string) => {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://vercel.live',
    'https://*.walletconnect.com',
    'https://*.walletconnect.org',
  ];

  const styleSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://fonts.googleapis.com',
  ];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    "img-src 'self' data: blob: https://*.walletconnect.com https://fonts.gstatic.com https://avatars.githubusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss://*.walletconnect.com wss://*.walletconnect.org ws://localhost:* https://*.walletconnect.com https://*.walletconnect.org https://*.base.org https://*.polygon.technology https://*.zksync.io https://*.alchemy.com https://*.infura.io https://sepolia.base.org https://mainnet.base.org",
    "frame-src 'self' https://*.walletconnect.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'report-uri /api/security/csp-report',
  ];

  if (process.env.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
};

const MAX_BODY_SIZES = {
  api: {
    default: 100 * 1024,
    small: 10 * 1024,
    medium: 100 * 1024,
    large: 1 * 1024 * 1024,
  },
  pages: Infinity,
};

const getBodySizeLimit = (pathname: string): number => {
  if (!pathname.startsWith('/api')) {
    return MAX_BODY_SIZES.pages;
  }

  if (pathname.match(/\/(auth|balance|fees|price|health|leaderboard|friends)/)) {
    return MAX_BODY_SIZES.api.small;
  }

  if (pathname.includes('/attachments')) {
    return MAX_BODY_SIZES.api.large;
  }

  if (pathname.match(/\/(messages|groups|proposals|sync|errors)/)) {
    return MAX_BODY_SIZES.api.medium;
  }

  return MAX_BODY_SIZES.api.default;
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');

    if (contentLength) {
      const bodySize = parseInt(contentLength, 10);
      const maxSize = getBodySizeLimit(pathname);

      if (!isNaN(bodySize) && bodySize > maxSize) {
        return NextResponse.json(
          {
            error: 'Request payload too large',
            maxSize,
          },
          {
            status: 413,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          }
        );
      }
    } else if (pathname.startsWith('/api/')) {
      // Reject API requests without Content-Length to prevent size bypass
      return NextResponse.json(
        { error: 'Content-Length header required' },
        { status: 411 }
      );
    }

    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
      return contentTypeError;
    }

    const csrfError = validateCSRF(request);
    if (csrfError) {
      return csrfError;
    }
  }

  const nonce = generateNonce();
  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  response.headers.set('X-XSS-Protection', '1; mode=block');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
