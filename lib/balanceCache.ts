/**
 * Balance Caching Utility
 * 
 * Phase 3: Cache wallet balances to reduce RPC calls
 */

import { CACHE_TTL, CACHE_LIMITS } from './walletConstants';

interface CachedBalance {
  address: string;
  chainId: number;
  balance: string;
  formatted: string;
  symbol: string;
  timestamp: number;
}

const balanceCache = new Map<string, CachedBalance>();

/**
 * Generate cache key
 */
function getCacheKey(address: string, chainId: number): string {
  return `${address}-${chainId}`;
}

/**
 * Get cached balance
 */
export function getCachedBalance(
  address: string,
  chainId: number,
  ttl: number = CACHE_TTL.BALANCE
): CachedBalance | null {
  const key = getCacheKey(address, chainId);
  const cached = balanceCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (Date.now() - cached.timestamp > ttl) {
    balanceCache.delete(key);
    return null;
  }
  
  return cached;
}

/**
 * Set cached balance
 */
export function setCachedBalance(
  address: string,
  chainId: number,
  balance: string,
  formatted: string,
  symbol: string
): void {
  const key = getCacheKey(address, chainId);
  
  balanceCache.set(key, {
    address,
    chainId,
    balance,
    formatted,
    symbol,
    timestamp: Date.now(),
  });
  
  // Cleanup old entries if cache exceeds limit
  if (balanceCache.size > CACHE_LIMITS.BALANCE) {
    cleanupBalanceCache();
  }
}

/**
 * Clear balance cache
 */
export function clearBalanceCache(address?: string, chainId?: number): void {
  if (address && chainId) {
    const key = getCacheKey(address, chainId);
    balanceCache.delete(key);
  } else {
    balanceCache.clear();
  }
}

/**
 * Cleanup old cache entries
 */
function cleanupBalanceCache(): void {
  const _now = Date.now();
  const entries = Array.from(balanceCache.entries());
  
  // Sort by timestamp and remove oldest 20%
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = Math.floor(entries.length * 0.2);
  
  for (let i = 0; i < toRemove; i++) {
    const entry = entries[i];
    if (entry) {
      balanceCache.delete(entry[0]);
    }
  }
}

/**
 * Get cache statistics
 */
export function getBalanceCacheStats() {
  return {
    size: balanceCache.size,
    entries: Array.from(balanceCache.values()),
  };
}
