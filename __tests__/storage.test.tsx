/**
 * Browser Storage Tests
 * Tests localStorage/sessionStorage handling, quota management, and fallbacks
 */

import { StorageService, useLocalStorage } from '@/lib/storageService';
import { renderHook, act } from '@testing-library/react';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Basic Operations', () => {
    it('gets and sets values', () => {
      const key = 'vfide_notifications_test' as any;
      const value = { test: 'data' };
      
      StorageService.set(key, value);
      const retrieved = StorageService.get(key, {});
      
      expect(retrieved).toEqual(value);
    });

    it('returns default value when key does not exist', () => {
      const key = 'vfide_notifications_nonexistent' as any;
      const defaultValue = { default: true };
      
      const result = StorageService.get(key, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });

    it('removes values', () => {
      const key = 'vfide_notifications_test' as any;
      StorageService.set(key, { data: 'test' });
      
      StorageService.remove(key);
      
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('clears all VFIDE-related storage', () => {
      localStorage.setItem('vfide_test1', 'value1');
      localStorage.setItem('vfide_test2', 'value2');
      localStorage.setItem('other_key', 'value3');
      
      StorageService.clearAll();
      
      expect(localStorage.getItem('vfide_test1')).toBeNull();
      expect(localStorage.getItem('vfide_test2')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('value3');
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stores values with TTL', () => {
      const key = 'vfide_notifications_ttl' as any;
      const value = { test: 'data' };
      const ttl = 5000; // 5 seconds
      
      StorageService.set(key, value, { ttl });
      
      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored._ttl).toBeDefined();
      expect(stored._data).toEqual(value);
    });

    it('retrieves non-expired values', () => {
      const key = 'vfide_notifications_ttl' as any;
      const value = { test: 'data' };
      
      StorageService.set(key, value, { ttl: 5000 });
      
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      const retrieved = StorageService.get(key, null);
      expect(retrieved).toEqual(value);
    });

    it('removes expired values', () => {
      const key = 'vfide_notifications_ttl' as any;
      const value = { test: 'data' };
      
      StorageService.set(key, value, { ttl: 5000 });
      
      act(() => {
        jest.advanceTimersByTime(6000);
      });
      
      const retrieved = StorageService.get(key, null);
      expect(retrieved).toBeNull();
    });
  });

  describe('Array Limiting', () => {
    it('limits array size when maxItems is specified', () => {
      const key = 'vfide_notifications_limited' as any;
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      
      StorageService.set(key, items, { maxItems: 50 });
      
      const retrieved = StorageService.get(key, []);
      expect(retrieved).toHaveLength(50);
    });

    it('does not limit non-array values', () => {
      const key = 'vfide_notifications_object' as any;
      const value = { large: 'object', with: 'many', keys: true };
      
      StorageService.set(key, value, { maxItems: 2 });
      
      const retrieved = StorageService.get(key, {});
      expect(retrieved).toEqual(value);
    });
  });

  describe('Quota Management', () => {
    it('reports storage usage', () => {
      // Add some data
      for (let i = 0; i < 10; i++) {
        localStorage.setItem(`test_${i}`, 'x'.repeat(1000));
      }
      
      const usage = StorageService.getUsageInfo();
      
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.available).toBeGreaterThan(0);
      expect(usage.percentUsed).toBeGreaterThan(0);
    });

    it('handles quota exceeded errors', () => {
      const key = 'vfide_notifications_large' as any;
      
      // Mock quota exceeded error
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      setItemSpy.mockImplementationOnce(() => {
        throw quotaError;
      });
      
      const result = StorageService.set(key, { data: 'test' });
      
      // Should handle gracefully
      expect(result).toBe(false);
      
      setItemSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles JSON parse errors', () => {
      const key = 'vfide_notifications_corrupt' as any;
      localStorage.setItem(key, 'invalid json{');
      
      const result = StorageService.get(key, { default: true });
      
      expect(result).toEqual({ default: true });
    });

    it('handles missing localStorage gracefully', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const key = 'vfide_notifications_test' as any;
      const result = StorageService.get(key, { default: true });
      
      expect(result).toEqual({ default: true });
      
      getItemSpy.mockRestore();
    });
  });

  describe('Storage Availability', () => {
    it('checks if storage is available', () => {
      const isAvailable = StorageService.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('handles unavailable storage', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      
      const isAvailable = StorageService.isAvailable();
      expect(isAvailable).toBe(false);
      
      setItemSpy.mockRestore();
    });
  });

  describe('Batch Operations', () => {
    it('gets multiple keys at once', () => {
      const keys = [
        'vfide_notifications_1',
        'vfide_notifications_2',
        'vfide_notifications_3',
      ] as any[];
      
      keys.forEach((key, i) => {
        StorageService.set(key, { value: i });
      });
      
      const results = StorageService.getBatch(keys, null);
      
      expect(Object.keys(results)).toHaveLength(3);
      expect(results[keys[0]]).toEqual({ value: 0 });
    });
  });
});

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default value', () => {
    const { result } = renderHook(() =>
      useLocalStorage('vfide_notifications_hook' as any, { initial: true })
    );
    
    expect(result.current[0]).toEqual({ initial: true });
  });

  it('reads existing value from storage', () => {
    const key = 'vfide_notifications_existing' as any;
    const existingValue = { existing: true };
    localStorage.setItem(key, JSON.stringify(existingValue));
    
    const { result } = renderHook(() =>
      useLocalStorage(key, { initial: false })
    );
    
    expect(result.current[0]).toEqual(existingValue);
  });

  it('updates value and storage', () => {
    const key = 'vfide_notifications_update' as any;
    const { result } = renderHook(() =>
      useLocalStorage(key, { count: 0 })
    );
    
    act(() => {
      result.current[1]({ count: 5 });
    });
    
    expect(result.current[0]).toEqual({ count: 5 });
    
    const stored = JSON.parse(localStorage.getItem(key)!);
    expect(stored).toEqual({ count: 5 });
  });

  it('updates value with function', () => {
    const key = 'vfide_notifications_function' as any;
    const { result } = renderHook(() =>
      useLocalStorage(key, { count: 0 })
    );
    
    act(() => {
      result.current[1]((prev) => ({ count: prev.count + 1 }));
    });
    
    expect(result.current[0]).toEqual({ count: 1 });
  });

  it('handles storage errors gracefully', () => {
    const key = 'vfide_notifications_error' as any;
    const { result } = renderHook(() =>
      useLocalStorage(key, { value: 'test' })
    );
    
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockImplementation(() => {
      throw new Error('Storage full');
    });
    
    act(() => {
      result.current[1]({ value: 'new' });
    });
    
    // Should not throw error
    expect(result.current[0]).toEqual({ value: 'new' });
    
    setItemSpy.mockRestore();
  });

  it('applies TTL option', () => {
    jest.useFakeTimers();
    
    const key = 'vfide_notifications_ttl_hook' as any;
    const { result } = renderHook(() =>
      useLocalStorage(key, { value: 'test' }, { ttl: 5000 })
    );
    
    act(() => {
      result.current[1]({ value: 'updated' });
    });
    
    const stored = JSON.parse(localStorage.getItem(key)!);
    expect(stored._ttl).toBeDefined();
    
    jest.useRealTimers();
  });

  it('applies maxItems option for arrays', () => {
    const key = 'vfide_notifications_max' as any;
    const { result } = renderHook(() =>
      useLocalStorage(key, [], { maxItems: 3 })
    );
    
    act(() => {
      result.current[1]([1, 2, 3, 4, 5]);
    });
    
    // The value in state will be all 5, but stored value should be limited
    const stored = StorageService.get(key, []);
    expect(stored).toHaveLength(3);
  });
});

describe('Private Browsing Mode', () => {
  it('handles storage disabled in private mode', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockImplementation(() => {
      throw new Error('SecurityError: localStorage is disabled');
    });
    
    const key = 'vfide_notifications_private' as any;
    const result = StorageService.set(key, { test: 'data' });
    
    expect(result).toBe(false);
    
    setItemSpy.mockRestore();
  });

  it('returns default values when storage unavailable', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    getItemSpy.mockImplementation(() => {
      throw new Error('SecurityError');
    });
    
    const key = 'vfide_notifications_test' as any;
    const result = StorageService.get(key, { fallback: true });
    
    expect(result).toEqual({ fallback: true });
    
    getItemSpy.mockRestore();
  });
});
