/**
 * Next.js Proxy for Security Headers, Request Size Limits, and Content-Type Validation
 *
 * This proxy (formerly middleware):
 * 1. Adds nonce to CSP headers for inline scripts/styles
 * 2. Enforces request size limits to prevent DoS attacks
 * 3. Validates Content-Type headers to prevent MIME confusion attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateContentType } from './lib/api/contentTypeValidation';
import { validateCSRF } from './lib/security/csrf';

/**
 * Maximum request body sizes by endpoint type
 */
const MAX_BODY_SIZES = {
  // API routes - enforce strict limits
  api: {
    default: 100 * 1024, // 100KB for most API calls
    small: 10 * 1024, // 10KB for simple operations
    medium: 100 * 1024, // 100KB for messages, groups
    large: 1 * 1024 * 1024, // 1MB for file uploads
  },
  // Pages - no body size limits (GET requests)
  pages: Infinity,
};

/**
 * Generate a random nonce for CSP
 */
function generateNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

function asOrigin(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;

  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function getConnectSrcAllowlist(): string {
  const allowlist = new Set<string>([
    "'self'",
    'https://*.walletconnect.com',
    'https://*.walletconnect.org',
    'wss://*.walletconnect.com',
    'wss://*.walletconnect.org',
  ]);

  const configuredOrigins = [
    asOrigin(process.env.NEXT_PUBLIC_RPC_URL),
    asOrigin(process.env.RPC_URL),
    asOrigin(process.env.NEXT_PUBLIC_API_URL),
    asOrigin(process.env.NEXT_PUBLIC_WEBSOCKET_URL),
    asOrigin(process.env.NEXT_PUBLIC_WS_URL),
    asOrigin(process.env.NEXT_PUBLIC_APP_URL),
    asOrigin(process.env.NEXT_PUBLIC_EXPLORER_URL),
    asOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN),
  ];

  for (const origin of configuredOrigins) {
    if (origin) {
      allowlist.add(origin);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    allowlist.add('http://localhost:*');
    allowlist.add('ws://localhost:*');
    allowlist.add('http://127.0.0.1:*');
    allowlist.add('ws://127.0.0.1:*');
  }

  return [...allowlist].join(' ');
}

function buildCsp(nonce: string): string {
  const connectSrc = getConnectSrcAllowlist();

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://vercel.live https://*.walletconnect.com https://*.walletconnect.org`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://*.walletconnect.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === 'production' ? ["upgrade-insecure-requests"] : []),
  ].join('; ');
}

function applySecurityHeaders(response: NextResponse, nonce: string, csp: string): NextResponse {
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

/**
 * Determine if the request origin is allowed for CORS.
 * Self-origin and configured app URLs are permitted.
 */
function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;

  const allowed = new Set<string>();

  // Always allow the configured app URL
  const appUrl = asOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (appUrl) allowed.add(appUrl);

  // Allow Vercel preview deployments
  if (origin.endsWith('.vercel.app')) allowed.add(origin);

  // Allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      allowed.add(origin);
    }
  }

  return allowed.has(origin) ? origin : null;
}

/**
 * Get appropriate body size limit for the request
 */
function getBodySizeLimit(pathname: string): number {
  // Pages don't have body size limits
  if (!pathname.startsWith('/api')) {
    return MAX_BODY_SIZES.pages;
  }

  // Small payloads
  if (pathname.match(/\/(auth|balance|fees|price|health|leaderboard|friends)/)) {
    return MAX_BODY_SIZES.api.small;
  }

  // Large payloads (file uploads)
  if (pathname.includes('/attachments')) {
    return MAX_BODY_SIZES.api.large;
  }

  // Medium payloads (messages, groups, proposals)
  if (pathname.match(/\/(messages|groups|proposals|sync|errors)/)) {
    return MAX_BODY_SIZES.api.medium;
  }

  // Default for other API routes
  return MAX_BODY_SIZES.api.default;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function proxy(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // --- CORS for API routes ---
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigin = getAllowedOrigin(origin);

    // Handle preflight OPTIONS
    if (request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 204 });
      if (allowedOrigin) {
        preflightResponse.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      }
      preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
      preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      preflightResponse.headers.set('Access-Control-Max-Age', '86400');
      return preflightResponse;
    }

    // For non-preflight requests, we set CORS headers on the response below.
    // Store the allowed origin to attach later.
    if (allowedOrigin) {
      request.headers.set('x-cors-origin', allowedOrigin);
    }
  }

  // Check request body size for write operations (POST, PUT, PATCH, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');

    if (contentLength) {
      const bodySize = parseInt(contentLength, 10);
      const maxSize = getBodySizeLimit(pathname);

      // Enforce size limit
      if (!isNaN(bodySize) && bodySize > maxSize) {
        const response = NextResponse.json(
          {
            error: 'Request payload too large',
            message: `Request size ${formatBytes(bodySize)} exceeds maximum allowed size of ${formatBytes(maxSize)}`,
            maxSize,
            receivedSize: bodySize,
          },
          {
            status: 413, // 413 Payload Too Large
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          }
        );
        return applySecurityHeaders(response, nonce, csp);
      }
    }

    // Validate Content-Type for write operations
    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
      return applySecurityHeaders(contentTypeError, nonce, csp);
    }

    // Validate CSRF token for state-changing operations
    const csrfError = validateCSRF(request);
    if (csrfError) {
      return applySecurityHeaders(csrfError, nonce, csp);
    }
  }

  // Pass nonce into downstream request headers for app/layout.tsx
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = applySecurityHeaders(NextResponse.next({
    request: { headers: requestHeaders },
  }), nonce, csp);

  // Attach CORS headers for API responses
  const corsOrigin = request.headers.get('x-cors-origin');
  if (corsOrigin) {
    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Configure which routes should use this proxy
export const config = {
  matcher: [
    /*
     * Match all request paths including API routes
     */
    '/(.*)',
  ],
};