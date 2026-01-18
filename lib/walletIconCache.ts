/**
 * Wallet Icon Caching Utility
 * 
 * Phase 1 Enhancement: Cache wallet icons locally to reduce external requests
 * 
 * This utility provides:
 * - In-memory cache for wallet icons
 * - Automatic cache invalidation after 24 hours
 * - Fallback to original URL if caching fails
 */

// Type import for React
import * as React from 'react';
import { CACHE_TTL, CACHE_LIMITS } from './walletConstants';

interface CachedIcon {
  data: string; // base64 encoded image
  timestamp: number;
  url: string;
}

class WalletIconCache {
  private cache: Map<string, CachedIcon> = new Map();
  private readonly CACHE_DURATION = CACHE_TTL.ICONS;
  private readonly MAX_CACHE_SIZE = CACHE_LIMITS.ICONS;

  /**
   * Get a cached icon or fetch and cache it
   */
  async getIcon(url: string): Promise<string> {
    // Return original URL if caching is disabled or URL is invalid
    if (!url || typeof window === 'undefined') {
      return url;
    }

    // Check if icon is in cache and still valid
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Try to fetch and cache the icon
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return url; // Return original URL if fetch fails
      }

      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);

      // Store in cache
      this.cache.set(url, {
        data: base64,
        timestamp: Date.now(),
        url,
      });

      // Cleanup old entries if cache is too large
      this.cleanupCache();

      return base64;
    } catch (error) {
      // If caching fails, return original URL
      console.warn('Failed to cache wallet icon:', error);
      return url;
    }
  }

  /**
   * Convert blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Remove oldest entries if cache exceeds max size
   */
  private cleanupCache() {
    if (this.cache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // Sort by timestamp and remove oldest entries
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
    toRemove.forEach(([url]) => this.cache.delete(url));
  }

  /**
   * Clear all cached icons
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      cacheDuration: this.CACHE_DURATION,
    };
  }

  /**
   * Preload common wallet icons
   */
  async preloadCommonIcons(urls: string[]) {
    const promises = urls.map((url) => this.getIcon(url).catch(() => url));
    await Promise.allSettled(promises);
  }
}

// Export singleton instance
export const walletIconCache = new WalletIconCache();

/**
 * React hook for using cached wallet icons
 */
export function useCachedWalletIcon(url: string | undefined): string | undefined {
  const [cachedUrl, setCachedUrl] = React.useState<string | undefined>(url);

  React.useEffect(() => {
    if (!url) {
      setCachedUrl(undefined);
      return;
    }

    walletIconCache
      .getIcon(url)
      .then(setCachedUrl)
      .catch(() => setCachedUrl(url));
  }, [url]);

  return cachedUrl;
}
