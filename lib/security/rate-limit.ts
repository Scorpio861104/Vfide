/**
 * Rate Limiting Middleware
 * 
 * Implements distributed rate limiting using Redis for API protection.
 * Supports IP-based and user-based limits with configurable windows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from '../infrastructure/redis';

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyPrefix?: string;    // Redis key prefix
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
}

// Default rate limit configurations per endpoint
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,
  },
  
  // Badge endpoints - moderate
  '/api/badges/auto-mint': {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 10,
  },
  '/api/badges/events': {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 30,
  },
  
  // General API - lenient
  default: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 100,
  },
};

/**
 * Rate limiter middleware
 */
export async function rateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  // Use default config if not provided
  const endpoint = request.nextUrl.pathname;
  const limitConfig = config || RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  
  // Get identifier (IP address or user ID from token)
  const identifier = getIdentifier(request);
  
  // Create Redis key
  const key = `ratelimit:${limitConfig.keyPrefix || endpoint}:${identifier}`;
  
  try {
    // Get current count
    const currentCount = await CacheService.incr(
      key,
      Math.ceil(limitConfig.windowMs / 1000)
    );
    
    // Check if limit exceeded
    if (currentCount > limitConfig.maxRequests) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again later.`,
          retryAfter: Math.ceil(limitConfig.windowMs / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + limitConfig.windowMs).toString(),
            'Retry-After': Math.ceil(limitConfig.windowMs / 1000).toString(),
          },
        }
      );
    }
    
    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': limitConfig.maxRequests.toString(),
      'X-RateLimit-Remaining': (limitConfig.maxRequests - currentCount).toString(),
      'X-RateLimit-Reset': (Date.now() + limitConfig.windowMs).toString(),
    };
    
    // Return null to indicate rate limit check passed
    return null;
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - don't block requests if Redis is down
    return null;
  }
}

/**
 * Get identifier for rate limiting (IP or user ID)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      // Extract user ID from JWT (implement JWT verification)
      const userId = extractUserIdFromJWT(authHeader);
      if (userId) {
        return `user:${userId}`;
      }
    } catch {
      // Fall through to IP-based identification
    }
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Extract user ID from JWT token (placeholder - implement with actual JWT lib)
 */
function extractUserIdFromJWT(authHeader: string): string | null {
  try {
    // TODO: Implement with jsonwebtoken library
    // const token = authHeader.replace('Bearer ', '');
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    // return decoded.userId;
    return null;
  } catch {
    return null;
  }
}

/**
 * Rate limiter HOF for API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Check rate limit
    const limitResponse = await rateLimit(req, config);
    if (limitResponse) {
      return limitResponse;
    }
    
    // Proceed to actual handler
    return handler(req);
  };
}
