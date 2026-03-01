import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware: per-request CSP nonce injection.
 *
 * This middleware generates a cryptographically random nonce for every request
 * and injects it into:
 *  - The `Content-Security-Policy` response header (replacing `'unsafe-inline'`)
 *  - The `x-nonce` request header so that `app/layout.tsx` can read it via
 *    `headers()` and pass it to inline `<script>` / `<style>` tags.
 *
 * `'unsafe-eval'` is still required for WalletConnect/RainbowKit bundle loading
 * and is retained until those dependencies support a hash-based alternative.
 */
export function middleware(request: NextRequest) {
  // Generate a fresh nonce for this request (base64url, 128 bits of entropy)
  // Using btoa + String.fromCharCode instead of Buffer for Edge Runtime compatibility
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

  const csp = [
    "default-src 'self'",
    // nonce covers Next.js hydration scripts; 'unsafe-eval' kept for WalletConnect/RainbowKit
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
    "upgrade-insecure-requests",
  ].join('; ');

  // Clone the request and attach the nonce so layout.tsx can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set the nonce-based CSP header on the response
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Apply to all routes except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico, manifest.json, robots.txt, sitemap.xml
     *  - Public asset files
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
