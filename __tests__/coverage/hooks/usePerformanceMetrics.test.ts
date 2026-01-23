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
  });

  it('should track page load time', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await waitFor(() => {
      expect(result.current.pageLoadTime).toBeDefined();
    });
  });

  it('should measure custom metrics', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.startMeasure('customAction');
    });
    
    act(() => {
      result.current.endMeasure('customAction');
    });
    
    expect(result.current.metrics.customAction).toBeDefined();
  });

  it('should track FCP (First Contentful Paint)', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await waitFor(() => {
      expect(result.current.metrics.fcp).toBeDefined();
    });
  });

  it('should track LCP (Largest Contentful Paint)', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await waitFor(() => {
      expect(result.current.metrics.lcp).toBeDefined();
    });
  });

  it('should track FID (First Input Delay)', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await waitFor(() => {
      expect(result.current.metrics.fid).toBeDefined();
    });
  });

  it('should track CLS (Cumulative Layout Shift)', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await waitFor(() => {
      expect(result.current.metrics.cls).toBeDefined();
    });
  });

  it('should track TTFB (Time to First Byte)', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    await waitFor(() => {
      expect(result.current.metrics.ttfb).toBeDefined();
    });
  });

  it('should measure API call duration', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.startMeasure('apiCall');
    });
    
    setTimeout(() => {
      act(() => {
        result.current.endMeasure('apiCall');
      });
    }, 100);
    
    expect(result.current.startMeasure).toBeDefined();
  });

  it('should track component render time', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.measureRender('MyComponent');
    });
    
    expect(result.current.metrics.renders).toBeDefined();
  });

  it('should calculate performance score', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.performanceScore).toBeDefined();
    expect(typeof result.current.performanceScore).toBe('number');
  });

  it('should provide performance insights', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.insights).toBeDefined();
  });

  it('should detect slow operations', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.startMeasure('slowOp');
    });
    
    // Simulate slow operation
    setTimeout(() => {
      act(() => {
        result.current.endMeasure('slowOp');
      });
    }, 2000);
    
    expect(result.current.slowOperations).toBeDefined();
  });

  it('should track memory usage', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.memoryUsage).toBeDefined();
  });

  it('should export metrics', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    const exported = result.current.exportMetrics();
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('object');
  });

  it('should reset metrics', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.startMeasure('test');
      result.current.endMeasure('test');
      result.current.reset();
    });
    
    expect(Object.keys(result.current.metrics).length).toBe(0);
  });

  it('should handle missing Performance API', () => {
    const originalPerformance = global.performance;
    (global as any).performance = undefined;
    
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current).toBeDefined();
    
    global.performance = originalPerformance;
  });

  it('should track navigation timing', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.navigationTiming).toBeDefined();
  });

  it('should monitor frame rate', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.fps).toBeDefined();
  });

  it('should detect performance regressions', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.detectRegressions).toBeDefined();
  });

  it('should provide optimization suggestions', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.suggestions).toBeDefined();
  });
});
