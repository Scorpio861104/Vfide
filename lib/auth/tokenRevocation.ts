/**
 * Token Revocation and Blacklist System
 * 
 * Provides JWT token revocation capabilities using Redis for storage
 * Implements a secure token blacklist to handle compromised tokens
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// Initialize Redis client (will use environment variables)
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  logger.error('[Token Revocation] Failed to initialize Redis:', error as Error);
}

/**
 * In-memory fallback for development/testing
 * NOT suitable for production with multiple server instances
 */
const memoryBlacklist = new Map<string, number>();

/**
 * Token blacklist key prefix
 */
const BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * Maximum age for blacklist entries (30 days in seconds)
 * After this, tokens expire naturally anyway
 */
const BLACKLIST_TTL = 30 * 24 * 60 * 60;

/**
 * Add a token to the blacklist
 * @param tokenHash - SHA-256 hash of the token
 * @param expiresAt - Unix timestamp when token expires naturally
 * @param reason - Reason for revocation (optional)
 */
export async function revokeToken(
  tokenHash: string,
  expiresAt: number,
  reason?: string
): Promise<void> {
  const key = `${BLACKLIST_PREFIX}${tokenHash}`;
  const now = Math.floor(Date.now() / 1000);
  
  // Calculate TTL (time until token expires naturally)
  const ttl = Math.max(expiresAt - now, 60); // Minimum 60 seconds

  const value = JSON.stringify({
    revokedAt: now,
    expiresAt,
    reason: reason || 'manual_revocation',
  });

  if (redis) {
    try {
      await redis.setex(key, ttl, value);
      logger.info(`[Token Revocation] Token blacklisted until ${new Date(expiresAt * 1000).toISOString()}`);
    } catch (error) {
      logger.error('[Token Revocation] Redis error:', error as Error);
      // Fallback to memory
      memoryBlacklist.set(tokenHash, expiresAt);
    }
  } else {
    // Use memory fallback
    memoryBlacklist.set(tokenHash, expiresAt);
    logger.warn('[Token Revocation] Using in-memory blacklist (not suitable for production)');
  }
}

/**
 * Check if a token is revoked
 * @param tokenHash - SHA-256 hash of the token
 * @returns true if token is revoked, false otherwise
 */
export async function isTokenRevoked(tokenHash: string): Promise<boolean> {
  const key = `${BLACKLIST_PREFIX}${tokenHash}`;

  if (redis) {
    try {
      const result = await redis.get(key);
      return result !== null;
    } catch (error) {
      logger.error('[Token Revocation] Redis error during check:', error as Error);
      // Fallback to memory
      return memoryBlacklist.has(tokenHash);
    }
  } else {
    // Use memory fallback
    const expiresAt = memoryBlacklist.get(tokenHash);
    if (!expiresAt) return false;

    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      // Token expired naturally, remove from memory
      memoryBlacklist.delete(tokenHash);
      return false;
    }

    return true;
  }
}

/**
 * Revoke all tokens for a specific user
 * @param userAddress - User's wallet address
 * @param reason - Reason for revocation
 */
export async function revokeUserTokens(
  userAddress: string,
  reason: string = 'security_revocation'
): Promise<void> {
  const key = `${BLACKLIST_PREFIX}user:${userAddress.toLowerCase()}`;
  const now = Math.floor(Date.now() / 1000);

  const value = JSON.stringify({
    revokedAt: now,
    reason,
  });

  if (redis) {
    try {
      // Store user revocation with long TTL
      await redis.setex(key, BLACKLIST_TTL, value);
      logger.info(`[Token Revocation] All tokens revoked for user: ${userAddress}`);
    } catch (error) {
      logger.error('[Token Revocation] Redis error during user revocation:', error as Error);
    }
  } else {
    logger.warn('[Token Revocation] User-wide revocation requires Redis in production');
  }
}

/**
 * Check if all tokens for a user are revoked
 * @param userAddress - User's wallet address
 * @returns Revocation info or null
 */
export async function isUserRevoked(userAddress: string): Promise<{
  revoked: boolean;
  revokedAt?: number;
  reason?: string;
} | null> {
  const key = `${BLACKLIST_PREFIX}user:${userAddress.toLowerCase()}`;

  if (redis) {
    try {
      const result = await redis.get(key);
      if (!result) return null;

      const parsed = JSON.parse(result as string);
      return {
        revoked: true,
        revokedAt: parsed.revokedAt,
        reason: parsed.reason,
      };
    } catch (error) {
      logger.error('[Token Revocation] Redis error during user check:', error as Error);
      return null;
    }
  }

  return null;
}

/**
 * Create a SHA-256 hash of a token for storage
 * @param token - JWT token
 * @returns SHA-256 hash as hex string
 */
export async function hashToken(token: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for environments without Web Crypto API
    const { createHash } = await import('crypto');
    return createHash('sha256').update(token).digest('hex');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clean up expired entries from memory blacklist
 * Should be called periodically (e.g., every hour)
 */
export function cleanupMemoryBlacklist(): void {
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;

  for (const [tokenHash, expiresAt] of memoryBlacklist.entries()) {
    if (now > expiresAt) {
      memoryBlacklist.delete(tokenHash);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`[Token Revocation] Cleaned up ${cleaned} expired entries from memory`);
  }
}

/**
 * Get revocation statistics (for monitoring)
 */
export async function getRevocationStats(): Promise<{
  memoryBlacklistSize: number;
  redisAvailable: boolean;
}> {
  return {
    memoryBlacklistSize: memoryBlacklist.size,
    redisAvailable: redis !== null,
  };
}

// Set up periodic cleanup (every hour)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryBlacklist, 60 * 60 * 1000);
}
