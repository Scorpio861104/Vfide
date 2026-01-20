/**
 * Request Size Limit Middleware and Configuration
 * 
 * This module provides utilities to enforce request size limits across API routes
 * to prevent large payload DoS attacks and ensure efficient resource utilization.
 * 
 * Security Benefits:
 * - Prevents large payload DoS attacks
 * - Protects against memory exhaustion
 * - Reduces bandwidth abuse
 * - Enforces consistent limits across all endpoints
 * 
 * @module lib/api/requestSizeLimit
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Request size limits by endpoint type
 */
export const REQUEST_SIZE_LIMITS = {
  // Tiny payloads (auth, simple operations)
  TINY: 1 * 1024, // 1KB - Auth tokens, simple requests
  
  // Small payloads (most API calls)
  SMALL: 10 * 1024, // 10KB - Most JSON payloads
  
  // Medium payloads (complex data)
  MEDIUM: 100 * 1024, // 100KB - Messages, groups, proposals
  
  // Large payloads (file uploads, images)
  LARGE: 1 * 1024 * 1024, // 1MB - User avatars, small files
  
  // Extra large payloads (special cases)
  XLARGE: 5 * 1024 * 1024, // 5MB - Documents, larger files
  
  // Default for unspecified endpoints
  DEFAULT: 100 * 1024, // 100KB
} as const;

/**
 * Get Content-Length from request headers
 */
function getContentLength(request: NextRequest): number | null {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) {
    return null;
  }
  
  const size = parseInt(contentLength, 10);
  return isNaN(size) ? null : size;
}

/**
 * Middleware to enforce request size limits
 * 
 * @param request - Next.js request object
 * @param maxSize - Maximum allowed size in bytes
 * @returns Response if limit exceeded, null if OK
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const sizeCheck = enforceSizeLimit(request, REQUEST_SIZE_LIMITS.SMALL);
 *   if (sizeCheck) return sizeCheck;
 *   // Process request...
 * }
 * ```
 */
export function enforceSizeLimit(
  request: NextRequest,
  maxSize: number = REQUEST_SIZE_LIMITS.DEFAULT
): NextResponse | null {
  const contentLength = getContentLength(request);
  
  // If no Content-Length header, we can't enforce at this stage
  // The body reading will handle oversized payloads
  if (contentLength === null) {
    return null;
  }
  
  if (contentLength > maxSize) {
    return NextResponse.json(
      {
        error: 'Request payload too large',
        message: `Request size ${contentLength} bytes exceeds maximum allowed size of ${maxSize} bytes (${formatBytes(maxSize)})`,
        maxSize,
        receivedSize: contentLength,
      },
      {
        status: 413, // 413 Payload Too Large
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60', // Suggest retry after 60 seconds
        },
      }
    );
  }
  
  return null;
}

/**
 * Safe body reading with size limit enforcement
 * 
 * This function reads the request body while enforcing a size limit,
 * preventing memory exhaustion from oversized payloads.
 * 
 * @param request - Next.js request object
 * @param maxSize - Maximum allowed size in bytes
 * @returns Parsed JSON object or error response
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const result = await readBodyWithSizeLimit(request, REQUEST_SIZE_LIMITS.MEDIUM);
 *   if ('error' in result) {
 *     return NextResponse.json(result, { status: result.status });
 *   }
 *   const data = result;
 *   // Process data...
 * }
 * ```
 */
export async function readBodyWithSizeLimit<T = unknown>(
  request: NextRequest,
  maxSize: number = REQUEST_SIZE_LIMITS.DEFAULT
): Promise<T | { error: string; status: number }> {
  try {
    // First check Content-Length header
    const contentLength = getContentLength(request);
    if (contentLength !== null && contentLength > maxSize) {
      return {
        error: 'Request payload too large',
        status: 413,
      };
    }
    
    // Read body as text first to check actual size
    const text = await request.text();
    const actualSize = new Blob([text]).size;
    
    if (actualSize > maxSize) {
      return {
        error: `Request body size ${actualSize} bytes exceeds maximum allowed size of ${maxSize} bytes (${formatBytes(maxSize)})`,
        status: 413,
      };
    }
    
    // Parse JSON
    try {
      return JSON.parse(text) as T;
    } catch (_parseError) {
      return {
        error: 'Invalid JSON in request body',
        status: 400,
      };
    }
  } catch (_error) {
    return {
      error: 'Failed to read request body',
      status: 500,
    };
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Endpoint-specific size limit configuration
 * 
 * Maps API route patterns to their appropriate size limits
 */
export const ENDPOINT_SIZE_LIMITS: Record<string, number> = {
  // Auth endpoints - tiny payloads
  '/api/auth': REQUEST_SIZE_LIMITS.TINY,
  
  // Crypto operations - small payloads
  '/api/crypto/balance': REQUEST_SIZE_LIMITS.TINY,
  '/api/crypto/fees': REQUEST_SIZE_LIMITS.TINY,
  '/api/crypto/price': REQUEST_SIZE_LIMITS.TINY,
  '/api/crypto/payment-requests': REQUEST_SIZE_LIMITS.SMALL,
  '/api/crypto/transactions': REQUEST_SIZE_LIMITS.SMALL,
  '/api/crypto/rewards': REQUEST_SIZE_LIMITS.SMALL,
  
  // Messaging - medium payloads (messages can be longer)
  '/api/messages': REQUEST_SIZE_LIMITS.MEDIUM,
  
  // Groups - medium payloads
  '/api/groups': REQUEST_SIZE_LIMITS.MEDIUM,
  
  // Proposals - medium payloads
  '/api/proposals': REQUEST_SIZE_LIMITS.MEDIUM,
  
  // Attachments/files - large payloads
  '/api/attachments': REQUEST_SIZE_LIMITS.LARGE,
  
  // User profiles - medium payloads
  '/api/users': REQUEST_SIZE_LIMITS.MEDIUM,
  
  // Activities - small payloads
  '/api/activities': REQUEST_SIZE_LIMITS.SMALL,
  
  // Notifications - small payloads
  '/api/notifications': REQUEST_SIZE_LIMITS.SMALL,
  
  // Analytics - small payloads
  '/api/analytics': REQUEST_SIZE_LIMITS.SMALL,
  
  // Leaderboard - tiny payloads
  '/api/leaderboard': REQUEST_SIZE_LIMITS.TINY,
  
  // Badges - small payloads
  '/api/badges': REQUEST_SIZE_LIMITS.SMALL,
  
  // Quests - small payloads
  '/api/quests': REQUEST_SIZE_LIMITS.SMALL,
  
  // Friends - tiny payloads
  '/api/friends': REQUEST_SIZE_LIMITS.TINY,
  
  // Gamification - small payloads
  '/api/gamification': REQUEST_SIZE_LIMITS.SMALL,
  
  // Endorsements - small payloads
  '/api/endorsements': REQUEST_SIZE_LIMITS.SMALL,
  
  // Security - tiny payloads
  '/api/security': REQUEST_SIZE_LIMITS.TINY,
  
  // Sync - medium payloads
  '/api/sync': REQUEST_SIZE_LIMITS.MEDIUM,
  
  // Errors - medium payloads
  '/api/errors': REQUEST_SIZE_LIMITS.MEDIUM,
  
  // Health check - tiny payload
  '/api/health': REQUEST_SIZE_LIMITS.TINY,
  
  // Performance metrics - small payloads
  '/api/performance': REQUEST_SIZE_LIMITS.SMALL,
};

/**
 * Get the appropriate size limit for a given API route
 * 
 * @param pathname - Request pathname (e.g., "/api/messages")
 * @returns Size limit in bytes
 */
export function getSizeLimitForEndpoint(pathname: string): number {
  // Find matching endpoint pattern
  for (const [pattern, limit] of Object.entries(ENDPOINT_SIZE_LIMITS)) {
    if (pathname.startsWith(pattern)) {
      return limit;
    }
  }
  
  // Return default if no match found
  return REQUEST_SIZE_LIMITS.DEFAULT;
}

/**
 * High-level middleware that combines size check with appropriate limits
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const sizeCheck = checkRequestSize(request);
 *   if (sizeCheck) return sizeCheck;
 *   // Process request...
 * }
 * ```
 */
export function checkRequestSize(request: NextRequest): NextResponse | null {
  const pathname = new URL(request.url).pathname;
  const sizeLimit = getSizeLimitForEndpoint(pathname);
  return enforceSizeLimit(request, sizeLimit);
}
