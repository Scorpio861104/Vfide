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
    if (!match) return 60000; // Default 1 minute
    
    const value = parseInt(match[1]);
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

// Create rate limiter instance
let rateLimiter: Ratelimit | InMemoryRateLimiter;
let inMemoryLimiter: InMemoryRateLimiter | null = null;

function getRateLimiter(): Ratelimit | InMemoryRateLimiter {
  if (rateLimiter) return rateLimiter;
  
  // Try to use Upstash Redis if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      
      rateLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1m'),
        analytics: true,
        prefix: 'vfide:ratelimit',
      });
      
      console.log('[RateLimit] Using Upstash Redis');
      return rateLimiter;
    } catch (_error) {
      console.warn('[RateLimit] Failed to initialize Upstash Redis, using in-memory fallback');
    }
  }
  
  // Fall back to in-memory rate limiting
  inMemoryLimiter = new InMemoryRateLimiter();
  rateLimiter = inMemoryLimiter;
  
  // Cleanup old entries every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(() => inMemoryLimiter?.cleanup(), 300000);
  }
  
  console.log('[RateLimit] Using in-memory rate limiting');
  return rateLimiter;
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
  
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
  const limiter = getRateLimiter();
  const identifier = getClientIdentifier(request);
  const config = RATE_LIMITS[type];
  
  try {
    let result;
    
    if (limiter instanceof InMemoryRateLimiter) {
      result = await limiter.limit(`${identifier}:${type}`, config);
    } else {
      // Upstash Ratelimit
      result = await limiter.limit(`${identifier}:${type}`);
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
    // On error, allow the request to proceed
    return { success: true };
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
  return result.success ? null : result.response || null;
}
