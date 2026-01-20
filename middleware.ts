/**
 * Next.js Middleware for Content Security Policy with Nonce Support
 * This middleware adds a nonce to the CSP header for inline scripts/styles
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a random nonce for CSP
 */
function generateNonce(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Buffer.from(buffer).toString('base64');
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Generate nonce for this request
  const nonce = generateNonce();
  
  // Store nonce in request for use in pages
  response.headers.set('x-nonce', nonce);
  
  // Only modify CSP if it exists and we need inline scripts
  const csp = response.headers.get('Content-Security-Policy');
  if (csp) {
    // Add nonce to script-src if needed
    const modifiedCSP = csp
      .replace(
        "script-src 'self'",
        `script-src 'self' 'nonce-${nonce}'`
      )
      .replace(
        "style-src 'self'",
        `style-src 'self' 'nonce-${nonce}'`
      );
    
    response.headers.set('Content-Security-Policy', modifiedCSP);
  }
  
  return response;
}

// Configure which routes should use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
