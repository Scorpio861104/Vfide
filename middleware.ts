/**
 * Next.js Middleware — Global Security Enforcement
 *
 * This middleware runs before every request and enforces:
 *  1. CSRF validation on state-changing API requests (POST/PUT/PATCH/DELETE)
 *  2. Security headers injection (CSP nonce generation)
 *
 * WHY THIS EXISTS:
 *   lib/security/csrf.ts had a fully implemented validateCSRF() function
 *   and lib/security/csrfPolicy.ts had exempt path configuration,
 *   but neither was ever wired into the request pipeline.
 *   This middleware is the missing glue.
 *
 * @see lib/security/csrf.ts       — CSRF token generation and verification
 * @see lib/security/csrfPolicy.ts — Exempt path configuration
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Paths that are exempt from CSRF validation.
 * Keep in sync with lib/security/csrfPolicy.ts.
 */
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth',
  '/api/auth/challenge',
  '/api/health',
  '/api/csrf',
]);

const CSRF_EXEMPT_PREFIXES = [
  '/api/security/webhook-',
] as const;

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ];

  if (process.env.NODE_ENV !== 'production') {
    directives[1] = `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`;
  }

  return directives.join('; ');
}

function applySecurityHeaders(response: NextResponse, nonce: string): void {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('x-nonce', nonce);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCsrfExempt(pathname: string): boolean {
  if (CSRF_EXEMPT_PATHS.has(pathname)) return true;
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Timing-safe comparison of two strings.
 * Falls back to constant-time loop when crypto.subtle is unavailable.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    const left = bufA[i] ?? 0;
    const right = bufB[i] ?? 0;
    result |= left ^ right;
  }
  return result === 0;
}

// ─── Middleware ────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = makeNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  applySecurityHeaders(response, nonce);

  // ── 1. CSRF validation on state-changing API requests ─────────────────────
  if (
    pathname.startsWith('/api/') &&
    STATE_CHANGING_METHODS.has(request.method) &&
    !isCsrfExempt(pathname)
  ) {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || !timingSafeCompare(cookieToken, headerToken)) {
      const errorResponse = NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
      applySecurityHeaders(errorResponse, nonce);
      return errorResponse;
    }
  }

  return response;
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

/**
 * Only run middleware on API routes and pages — skip static assets.
 */
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
