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
let missingRedisWarningLogged = false;
const memoryRateBuckets = new Map<string, { count: number; resetAt: number }>();
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPruneTime = Date.now();

function pruneExpiredBuckets(): void {
  const now = Date.now();
  if (now - lastPruneTime < PRUNE_INTERVAL_MS) return;
  lastPruneTime = now;

  for (const [key, bucket] of memoryRateBuckets) {
    if (now >= bucket.resetAt) {
      memoryRateBuckets.delete(key);
    }
  }
}

function parseWindowMs(window: typeof RATE_LIMITS[RateLimitType]['window']): number {
  const match = /^(\d+)([smhd])$/.exec(window);
  if (!match) return 60_000;
  const [, valuePart, unitPart] = match;
  const value = Number.parseInt(valuePart ?? '1', 10);
  const unit = unitPart ?? 'm';
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60_000;
  if (unit === 'h') return value * 3_600_000;
  return value * 86_400_000;
}

function memoryRateLimit(identifier: string, type: RateLimitType): {
  success: boolean;
  remaining: number;
  reset: number;
} {
  pruneExpiredBuckets();
  const config = RATE_LIMITS[type];
  const windowMs = parseWindowMs(config.window);
  const now = Date.now();
  const key = `${identifier}:${type}`;
  const existing = memoryRateBuckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    memoryRateBuckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: Math.max(config.requests - 1, 0), reset: resetAt };
  }

  const nextCount = existing.count + 1;
  const success = nextCount <= config.requests;
  if (success) {
    memoryRateBuckets.set(key, { count: nextCount, resetAt: existing.resetAt });
  }

  return {
    success,
    remaining: Math.max(config.requests - Math.min(nextCount, config.requests), 0),
    reset: existing.resetAt,
  };
}

function hasRedisConfiguration(): boolean {
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

  if (!hasRedisConfiguration()) {
    if (!missingRedisWarningLogged) {
      missingRedisWarningLogged = true;
      logger.warn('[RateLimit] Redis not configured; using in-memory fallback limiter.');
    }
    const result = memoryRateLimit(identifier, type);
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
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toString(),
            },
          }
        ),
      };
    }
    return { success: true };
  }

  try {
    const upstash = getUpstashLimiters();
    if (!upstash) {
      throw new Error('Rate limiter unavailable: Redis client initialization failed');
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
