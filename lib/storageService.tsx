/**
 * Centralized localStorage service with error handling, SSR safety, and type safety
 * Eliminates duplicate localStorage code across components
 */

import React from 'react';

type StorageKey = 
  | `vfide_notifications_${string}`
  | `vfide_activity_feed_${string}`
  | `vfide_endorsements_${string}`
  | `vfide_badges_${string}`
  | `vfide_friends_${string}`
  | `vfide_groups_${string}`
  | `vfide_group_messages_${string}`;

interface StorageServiceOptions {
  maxItems?: number;
  ttl?: number; // Time to live in milliseconds
}

export class StorageService {
  /**
   * Safely get item from localStorage with SSR check
   */
  static get<T>(key: StorageKey, defaultValue: T): T {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue;

      const parsed = JSON.parse(stored);
      
      // Check TTL if present
      if (parsed._ttl && Date.now() > parsed._ttl) {
        this.remove(key);
        return defaultValue;
      }

      return parsed._data !== undefined ? parsed._data : parsed;
    } catch (error) {
      console.error(`[StorageService] Failed to get ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Safely set item in localStorage with SSR check
   */
  static set<T>(key: StorageKey, value: T, options?: StorageServiceOptions): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      let data: any = value;

      // Apply max items limit if specified and value is array
      if (options?.maxItems && Array.isArray(value)) {
        data = value.slice(0, options.maxItems);
      }

      // Add TTL if specified
      const toStore = options?.ttl 
        ? { _data: data, _ttl: Date.now() + options.ttl }
        : data;

      localStorage.setItem(key, JSON.stringify(toStore));
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('[StorageService] Storage quota exceeded');
        this.clearOldest();
      } else {
        console.error(`[StorageService] Failed to set ${key}:`, error);
      }
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  static remove(key: StorageKey): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[StorageService] Failed to remove ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all VFIDE-related storage
   */
  static clearAll(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('vfide_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('[StorageService] Failed to clear all:', error);
    }
  }

  /**
   * Get storage usage info
   */
  static getUsageInfo(): { used: number; available: number; percentUsed: number } {
    if (typeof window === 'undefined') {
      return { used: 0, available: 0, percentUsed: 0 };
    }

    try {
      let used = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Most browsers allow 5-10MB, we'll use 5MB as conservative estimate
      const available = 5 * 1024 * 1024;
      const percentUsed = (used / available) * 100;

      return { used, available, percentUsed };
    } catch (error) {
      console.error('[StorageService] Failed to get usage info:', error);
      return { used: 0, available: 0, percentUsed: 0 };
    }
  }

  /**
   * Clear oldest items when quota exceeded
   */
  private static clearOldest(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      const vfideKeys = keys.filter(k => k.startsWith('vfide_'));
      
      // Sort by access time (if available) or just clear first item
      if (vfideKeys.length > 0) {
        localStorage.removeItem(vfideKeys[0]);
        // Cleared oldest item for space
      }
    } catch (error) {
      console.error('[StorageService] Failed to clear oldest:', error);
    }
  }

  /**
   * Check if storage is available
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const test = '_storage_test_';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Batch get multiple keys
   */
  static getBatch<T>(keys: StorageKey[], defaultValue: T): Record<string, T> {
    const result: Record<string, T> = {};
    keys.forEach(key => {
      result[key] = this.get(key, defaultValue);
    });
    return result;
  }

  /**
   * Batch set multiple keys
   */
  static setBatch(items: Array<{ key: StorageKey; value: any; options?: StorageServiceOptions }>): boolean {
    try {
      items.forEach(({ key, value, options }) => {
        this.set(key, value, options);
      });
      return true;
    } catch (error) {
      console.error('[StorageService] Batch set failed:', error);
      return false;
    }
  }
}

/**
 * React hook for localStorage
 */
export function useLocalStorage<T>(key: StorageKey, defaultValue: T, options?: StorageServiceOptions) {
  const [value, setValue] = React.useState<T>(() => {
    return StorageService.get(key, defaultValue);
  });

  const setStoredValue = React.useCallback((newValue: T | ((prev: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      StorageService.set(key, valueToStore, options);
    } catch (error) {
      console.error(`[useLocalStorage] Failed to set ${key}:`, error);
    }
  }, [key, value, options]);

  return [value, setStoredValue] as const;
}
