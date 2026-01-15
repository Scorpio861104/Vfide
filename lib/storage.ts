/**
 * Safe localStorage operations with error handling
 * Prevents crashes in private browsing mode, quota exceeded errors, and SecurityError
 * 
 * Usage:
 * - Use safeGetItem/safeSetItem for string values
 * - Use safeGetJSON/safeSetJSON for objects
 * - Always provide sensible default values
 */

/**
 * Safely get string item from localStorage
 * @param key - Storage key
 * @param defaultValue - Default value if operation fails
 * @returns Stored value or default
 */
export function safeGetItem(key: string, defaultValue = ''): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    return localStorage.getItem(key) ?? defaultValue;
  } catch (error) {
    // SecurityError in private browsing, QuotaExceededError, etc.
    console.warn(`localStorage.getItem failed for key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely set string item in localStorage
 * @param key - Storage key
 * @param value - Value to store
 * @returns true if successful, false otherwise
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // QuotaExceededError, SecurityError in private browsing, etc.
    console.warn(`localStorage.setItem failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Safely remove item from localStorage
 * @param key - Storage key
 * @returns true if successful, false otherwise
 */
export function safeRemoveItem(key: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`localStorage.removeItem failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Safely get parsed JSON from localStorage
 * @param key - Storage key
 * @param defaultValue - Default value if operation fails
 * @returns Parsed value or default
 */
export function safeGetJSON<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    // JSON parse error, SecurityError, etc.
    console.warn(`localStorage.getItem/JSON.parse failed for key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely set JSON value in localStorage
 * @param key - Storage key
 * @param value - Value to store
 * @returns true if successful, false otherwise
 */
export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // JSON stringify error, QuotaExceededError, SecurityError, etc.
    console.warn(`localStorage.setItem/JSON.stringify failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Safely clear all localStorage
 * @returns true if successful, false otherwise
 */
export function safeClear(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    localStorage.clear();
    return true;
  } catch (error) {
    console.warn('localStorage.clear failed:', error);
    return false;
  }
}

/**
 * Check if localStorage is available
 * @returns true if localStorage is available and working
 */
export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage usage information
 * @returns Storage info object with used/total space (approximate)
 */
export function getStorageInfo(): { available: boolean; estimatedUsed?: number; estimatedTotal?: number } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { available: false };
    }

    // Estimate storage usage
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += key.length + (localStorage[key]?.length || 0);
      }
    }

    // Most browsers allow ~5-10MB for localStorage
    return {
      available: true,
      estimatedUsed: used,
      estimatedTotal: 5 * 1024 * 1024 // 5MB estimate
    };
  } catch {
    return { available: false };
  }
}
