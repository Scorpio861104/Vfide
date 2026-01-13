/**
 * StorageService - Centralized localStorage management
 * 
 * Provides type-safe, consistent access to localStorage with:
 * - Typed storage keys
 * - TTL (time-to-live) support
 * - Max items limit for array storage
 * - Safe JSON parsing
 * - SSR compatibility
 * - Quota handling
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Storage Keys - Centralized key management
// ============================================================================

export const STORAGE_KEYS = {
  // User preferences
  SETTINGS: 'vfide:settings',
  THEME: 'vfide_theme',
  LOCALE: 'vfide_locale',
  
  // Auth & session
  API_TOKEN: 'vfide_api_token',
  WALLET_SESSION: 'walletSession',
  
  // Notifications
  NOTIFICATIONS: 'vfide_notifications',
  NOTIFICATIONS_READ: 'vfide_notifications_read',
  
  // Social & messaging
  MESSAGES: 'vfide_messages',
  FRIENDS: 'vfide_friends',
  BLOCKED_USERS: 'vfide_blocked_users',
  
  // Profile & gamification
  PROFILE: 'vfide_profile',
  GAMIFICATION: 'vfide_gamification',
  
  // Analytics & tracking
  ANALYTICS_EVENTS: 'vfide_analytics_events',
  ONBOARDING_COMPLETE: 'vfide-setup-complete',
  
  // Network
  NETWORK_WARNING_DISMISSED: 'vfide-network-warning-dismissed',
  
  // Stories
  MY_STORIES: 'vfide_my_stories',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ============================================================================
// Storage Item Wrapper with Metadata
// ============================================================================

interface StorageItem<T> {
  value: T;
  timestamp: number;
  ttl?: number; // Time-to-live in milliseconds
}

// ============================================================================
// StorageService Class
// ============================================================================

class StorageServiceClass {
  private prefix = 'vfide_';

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get an item from storage with type safety
   */
  get<T>(key: StorageKey, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;

      const item: StorageItem<T> = JSON.parse(raw);
      
      // Check if item has expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return defaultValue;
      }

      return item.value ?? defaultValue;
    } catch {
      // If parsing fails, try to return raw value for backwards compatibility
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          // If it's not a StorageItem wrapper, return as-is
          if (!('value' in parsed && 'timestamp' in parsed)) {
            return parsed as T;
          }
        }
      } catch {
        // Ignore
      }
      return defaultValue;
    }
  }

  /**
   * Set an item in storage with optional TTL
   */
  set<T>(key: StorageKey, value: T, options?: { ttl?: number }): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        ttl: options?.ttl,
      };
      localStorage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
        // Try again after cleanup
        try {
          const item: StorageItem<T> = {
            value,
            timestamp: Date.now(),
            ttl: options?.ttl,
          };
          localStorage.setItem(key, JSON.stringify(item));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Remove an item from storage
   */
  remove(key: StorageKey): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all VFIDE-related storage items
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(this.prefix) || key.startsWith('vfide'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get storage usage info
   */
  getUsage(): { used: number; available: number; percentage: number } {
    if (typeof window === 'undefined') {
      return { used: 0, available: 0, percentage: 0 };
    }

    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }
      // Approximate localStorage limit is 5MB
      const available = 5 * 1024 * 1024;
      return {
        used,
        available,
        percentage: Math.round((used / available) * 100),
      };
    } catch {
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Handle quota exceeded by removing old/expired items
   */
  private handleQuotaExceeded(): void {
    if (typeof window === 'undefined') return;

    try {
      // First, remove expired items
      const expiredKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;

          const item = JSON.parse(raw);
          if (item.ttl && item.timestamp && Date.now() - item.timestamp > item.ttl) {
            expiredKeys.push(key);
          }
        } catch {
          // Not a JSON item, skip
        }
      }
      expiredKeys.forEach(key => localStorage.removeItem(key));

      // If still need space, remove analytics events (they're least critical)
      if (localStorage.getItem(STORAGE_KEYS.ANALYTICS_EVENTS)) {
        localStorage.removeItem(STORAGE_KEYS.ANALYTICS_EVENTS);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Append to an array in storage with max items limit
   */
  append<T>(key: StorageKey, item: T, options?: { maxItems?: number }): boolean {
    const current = this.get<T[]>(key, []);
    const updated = [...current, item];
    
    // Apply max items limit
    if (options?.maxItems && updated.length > options.maxItems) {
      updated.splice(0, updated.length - options.maxItems);
    }
    
    return this.set(key, updated);
  }

  /**
   * Get raw value without wrapper (for backwards compatibility)
   */
  getRaw(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Set raw value without wrapper (for backwards compatibility)
   */
  setRaw(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const StorageService = new StorageServiceClass();

// ============================================================================
// useLocalStorage Hook
// ============================================================================

interface UseLocalStorageOptions {
  ttl?: number;
  maxItems?: number;
}

export function useLocalStorage<T>(
  key: StorageKey,
  initialValue: T,
  options?: UseLocalStorageOptions
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    return StorageService.get(key, initialValue);
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prevValue => {
      const valueToStore = value instanceof Function ? value(prevValue) : value;
      
      // Apply maxItems if it's an array
      let finalValue = valueToStore;
      if (Array.isArray(finalValue) && options?.maxItems && finalValue.length > options.maxItems) {
        finalValue = finalValue.slice(-options.maxItems) as unknown as T;
      }
      
      StorageService.set(key, finalValue, { ttl: options?.ttl });
      return finalValue;
    });
  }, [key, options]);

  // Remove the item
  const removeValue = useCallback(() => {
    StorageService.remove(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const item = JSON.parse(e.newValue);
          setStoredValue(item.value ?? initialValue);
        } catch {
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ============================================================================
// Export for backwards compatibility
// ============================================================================

export default StorageService;
