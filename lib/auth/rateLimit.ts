/**
 * Rate Limiting Module
 * Provides distributed rate limiting using Upstash Redis
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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

// Create rate limiter instances (one per limit type)
let upstashLimiters: Map<RateLimitType, Ratelimit> | null = null;

function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getUpstashLimiters(): Map<RateLimitType, Ratelimit> | null {
  if (upstashLimiters !== null) return upstashLimiters;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      // Create a separate Ratelimit instance per type so per-endpoint limits are enforced
      upstashLimiters = new Map(
        (Object.keys(RATE_LIMITS) as RateLimitType[]).map((type) => {
          const cfg = RATE_LIMITS[type];
          return [
            type,
            new Ratelimit({
              redis,
              limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window),
              analytics: true,
              prefix: `vfide:ratelimit:${type}`,
            }),
          ];
        })
      );

      logger.info('[RateLimit] Using Upstash Redis');
      return upstashLimiters;
    } catch (_error) {
      logger.error('[RateLimit] Failed to initialize Upstash Redis');
    }
  }

  return null;
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
  const identifier = getClientIdentifier(request);
  const config = RATE_LIMITS[type];

  try {
    if (!isRedisConfigured()) {
      return { success: true };
    }

    const upstash = getUpstashLimiters();
    if (!upstash) {
      logger.warn('[RateLimit] Redis configured but limiter unavailable; allowing request');
      return { success: true };
    }
    // Use the per-type Upstash limiter so endpoint-specific limits are enforced
    const result = await upstash.get(type)!.limit(`${identifier}:${type}`);

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
    logger.error('[RateLimit] Error:', error as Error);
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
