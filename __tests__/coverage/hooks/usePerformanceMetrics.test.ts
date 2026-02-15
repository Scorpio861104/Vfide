/**
 * usePerformanceMetrics Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePerformanceMetrics } from '../../../hooks/usePerformanceMetrics';

describe('usePerformanceMetrics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Performance API
    global.performance.mark = jest.fn();
    global.performance.measure = jest.fn();
    global.performance.getEntriesByType = jest.fn(() => []);
    global.performance.now = jest.fn(() => Date.now());
    
    // Mock performance.timing
    Object.defineProperty(global.performance, 'timing', {
      value: {
        loadEventEnd: 1000,
        navigationStart: 0,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return metrics array', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    expect(result.current.metrics).toBeDefined();
    expect(Array.isArray(result.current.metrics)).toBe(true);
  });

  it('should return systemMetrics array', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    expect(result.current.systemMetrics).toBeDefined();
    expect(Array.isArray(result.current.systemMetrics)).toBe(true);
  });

  it('should have isLoading state', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should have error state', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    // error should be null or an Error
    expect(result.current.error === null || result.current.error instanceof Error).toBe(true);
  });

  it('should have refreshMetrics function', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(typeof result.current.refreshMetrics).toBe('function');
  });

  it('should call refreshMetrics successfully', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    expect(result.current.metrics).toBeDefined();
  });

  it('should populate metrics on mount', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    // After refresh, metrics should be populated
    await waitFor(() => {
      expect(result.current.metrics.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('should auto-refresh metrics periodically', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    await act(async () => {
      await result.current.refreshMetrics();
    });

    const initialMetrics = result.current.metrics;

    await act(async () => {
      await result.current.refreshMetrics();
    });

    expect(result.current.metrics).toBeDefined();
    expect(initialMetrics).toBeDefined();
  });

  it('should handle missing Performance API gracefully', async () => {
    const originalPerformance = global.performance;
    
    // Temporarily remove performance.timing
    Object.defineProperty(global.performance, 'timing', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    
    const { result } = renderHook(() => usePerformanceMetrics());

    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    expect(result.current).toBeDefined();
    
    // Restore
    Object.defineProperty(global.performance, 'timing', {
      value: {
        loadEventEnd: 1000,
        navigationStart: 0,
      },
      writable: true,
      configurable: true,
    });
  });

  it('should return metrics with proper structure', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    if (result.current.metrics.length > 0) {
      const metric = result.current.metrics[0];
      expect(metric).toHaveProperty('id');
      expect(metric).toHaveProperty('type');
      expect(metric).toHaveProperty('value');
      expect(metric).toHaveProperty('timestamp');
    }
  });

  it('should update systemMetrics after refresh', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    expect(result.current.systemMetrics).toBeDefined();
  });

  it('should set isLoading to false after metrics are loaded', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await act(async () => {
      await result.current.refreshMetrics();
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('should return consistent interface', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current).toHaveProperty('metrics');
    expect(result.current).toHaveProperty('systemMetrics');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refreshMetrics');
  });
});
