/**
 * Next.js Middleware for Security Headers, Request Size Limits, and Content-Type Validation
 * 
 * This middleware:
 * 1. Adds nonce to CSP headers for inline scripts/styles
 * 2. Enforces request size limits to prevent DoS attacks
 * 3. Validates Content-Type headers to prevent MIME confusion attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateContentType } from './lib/api/contentTypeValidation';

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
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Buffer.from(buffer).toString('base64');
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

export function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  
  // Check request body size for write operations (POST, PUT, PATCH, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength) {
      const bodySize = parseInt(contentLength, 10);
      const maxSize = getBodySizeLimit(pathname);
      
      // Enforce size limit
      if (!isNaN(bodySize) && bodySize > maxSize) {
        return NextResponse.json(
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
      }
    }
    
    // Validate Content-Type for write operations
    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
      return contentTypeError;
    }
  }
  
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
     * Match all request paths including API routes
     */
    '/(.*)',
  ],
};
