/**
 * Rate Limiting Module
 * Provides distributed rate limiting using Upstash Redis or in-memory fallback
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // Strict limits for auth endpoints to prevent brute force
  auth: { requests: 10, window: '1m' as const },
  
  // Standard API endpoints
  api: { requests: 100, window: '1m' as const },
  
  // Write operations (POST, PUT, DELETE)
  write: { requests: 30, window: '1m' as const },
  
  // Reward claiming - very strict
  claim: { requests: 5, window: '1h' as const },
  
  // File uploads
  upload: { requests: 10, window: '1m' as const },
  
  // Search/read-heavy operations
  read: { requests: 200, window: '1m' as const },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

// In-memory fallback when Redis is not configured
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  
  async limit(identifier: string, config: { requests: number; window: string }): Promise<{
    success: boolean;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const windowMs = this.parseWindow(config.window);
    const key = `${identifier}:${config.window}`;
    
    const entry = this.store.get(key);
    
    if (!entry || entry.resetTime < now) {
      // New window
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return { success: true, remaining: config.requests - 1, reset: now + windowMs };
    }
    
    if (entry.count >= config.requests) {
      return { success: false, remaining: 0, reset: entry.resetTime };
    }
    
    entry.count++;
    return { success: true, remaining: config.requests - entry.count, reset: entry.resetTime };
  }
  
  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smh])$/);
    if (!match || !match[1] || !match[2]) return 60000; // Default 1 minute
    
    const value = parseInt(match[1], 10);
    if (isNaN(value) || !isFinite(value) || value <= 0) {
      return 60000; // Default 1 minute
    }
    
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60000;
      case 'h': return value * 3600000;
      default: return 60000;
    }
  }
  
  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

let upstashRedis: Redis | null = null;
const upstashLimiters = new Map<RateLimitType, Ratelimit>();
let inMemoryLimiter: InMemoryRateLimiter | null = null;

function getUpstashLimiter(type: RateLimitType): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!upstashRedis) {
    try {
      upstashRedis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('[RateLimit] Using Upstash Redis');
    } catch (_error) {
      console.warn('[RateLimit] Failed to initialize Upstash Redis, using in-memory fallback');
      upstashRedis = null;
      return null;
    }
  }

  const existing = upstashLimiters.get(type);
  if (existing) return existing;

  const config = RATE_LIMITS[type];
  const limiter = new Ratelimit({
    redis: upstashRedis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: 'vfide:ratelimit',
  });

  upstashLimiters.set(type, limiter);
  return limiter;
}

function getInMemoryLimiter(): InMemoryRateLimiter {
  if (inMemoryLimiter) return inMemoryLimiter;

  inMemoryLimiter = new InMemoryRateLimiter();

  // Cleanup old entries every 5 minutes (store ref to prevent module-reload leaks)
  if (typeof setInterval !== 'undefined') {
    const cleanupInterval = setInterval(() => inMemoryLimiter?.cleanup(), 300000);
    // Unref the timer so it doesn't prevent Node.js process exit
    if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
      cleanupInterval.unref();
    }
  }

  console.log('[RateLimit] Using in-memory rate limiting');
  return inMemoryLimiter;
}

/**
 * Get client identifier for rate limiting
 * Only trust headers set by infrastructure (Cloudflare edge, Vercel platform).
 * x-forwarded-for / x-real-ip are trivially spoofable and excluded.
 */
export function getClientIdentifier(request: NextRequest): string {
  // Cloudflare's header is set at the edge and cannot be spoofed by the client
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  // Next.js/Vercel platform IP via header (request.ip removed in Next.js 16)
  const platformIp = request.headers.get('x-vercel-forwarded-for');

  const ip = cfConnectingIp || platformIp || 'unknown';

  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const hash = simpleHash(userAgent);

  return `${ip}:${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

/**
 * Apply rate limiting to a request
 */
export async function rateLimit(
  request: NextRequest,
  type: RateLimitType = 'api'
): Promise<{ success: boolean; response?: NextResponse }> {
  const limiter = getUpstashLimiter(type);
  const identifier = getClientIdentifier(request);
  const config = RATE_LIMITS[type];
  
  try {
    let result;
    
    if (limiter) {
      // Upstash Ratelimit (per-type limiter)
      result = await limiter.limit(`${identifier}:${type}`);
    } else {
      result = await getInMemoryLimiter().limit(`${identifier}:${type}`, config);
    }
    
    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: 'Too many requests',
            retryAfter,
          },
          { 
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': config.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': result.reset.toString(),
            },
          }
        ),
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    // On error, fail closed - deny the request
    return { success: false };
  }
}

/**
 * Rate limit middleware helper
 */
export async function withRateLimit(
  request: NextRequest,
  type: RateLimitType = 'api'
): Promise<NextResponse | null> {
  const result = await rateLimit(request, type);
  if (result.success) return null;

  // Fail-closed: if `rateLimit` returned { success: false } without a
  // response (e.g. internal error), return 503 instead of null (which
  // would let the request through).
  return result.response || NextResponse.json(
    { error: 'Service temporarily unavailable' },
    { status: 503 }
  );
}
