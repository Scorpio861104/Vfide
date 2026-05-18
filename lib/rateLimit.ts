/**
 * Simple in-memory rate limiter for API routes
 * 
 * For production, consider using:
 * - Upstash Redis rate limiter
 * - Vercel KV with sliding window
 * - CloudFlare rate limiting
 */

import { NextResponse } from 'next/server';
import { getRequestIp } from '@/lib/security/requestContext';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs?: number;  // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number;  // Max requests per window (default: 100)
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  errorResponse?: NextResponse;
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, API key)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const { windowMs = 60000, maxRequests = 100 } = config;
  const now = Date.now();
  const key = identifier;

  // Get or create entry
  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Check if over limit
  const remaining = Math.max(0, maxRequests - entry.count);
  const success = entry.count <= maxRequests;
  const retryAfter = success ? undefined : Math.ceil((entry.resetTime - now) / 1000);

  return {
    success,
    remaining,
    resetTime: entry.resetTime,
    retryAfter,
    errorResponse: success ? undefined : NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': retryAfter?.toString() ?? '60',
        }
      }
    ),
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  return getRequestIp(request.headers).ip;
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
