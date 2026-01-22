/**
 * useErrorTracking Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useErrorTracking } from '../../../hooks/useErrorTracking';

// Mock Sentry
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setContext: jest.fn() })),
}));

describe('useErrorTracking Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  it('should track errors', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Test error'));
    });
    
    expect(console.error).toHaveBeenCalled();
  });

  it('should categorize errors', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Network error'), { 
        category: 'network' 
      });
    });
    
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].category).toBe('network');
  });

  it('should track error frequency', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Error 1'));
      result.current.trackError(new Error('Error 2'));
      result.current.trackError(new Error('Error 3'));
    });
    
    expect(result.current.errorCount).toBe(3);
  });

  it('should deduplicate similar errors', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Same error'));
      result.current.trackError(new Error('Same error'));
      result.current.trackError(new Error('Same error'));
    });
    
    expect(result.current.uniqueErrors.length).toBeLessThan(3);
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Test'));
      result.current.clearErrors();
    });
    
    expect(result.current.errors).toHaveLength(0);
  });

  it('should provide error summary', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Network'));
      result.current.trackError(new Error('Validation'));
    });
    
    expect(result.current.summary).toBeDefined();
    expect(result.current.summary.total).toBe(2);
  });

  it('should track error context', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Test'), { 
        context: { userId: '123', action: 'submit' }
      });
    });
    
    expect(result.current.errors[0].context).toBeDefined();
  });

  it('should handle error boundaries', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    const errorInfo = { componentStack: 'Component stack' };
    
    act(() => {
      result.current.trackError(new Error('Boundary error'), { errorInfo });
    });
    
    expect(result.current.errors).toHaveLength(1);
  });

  it('should track error severity', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Critical'), { severity: 'high' });
      result.current.trackError(new Error('Minor'), { severity: 'low' });
    });
    
    const highSeverity = result.current.errors.filter(e => e.severity === 'high');
    expect(highSeverity).toHaveLength(1);
  });

  it('should provide error stats', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Error 1'));
      result.current.trackError(new Error('Error 2'));
    });
    
    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.totalErrors).toBe(2);
  });

  it('should limit error storage', () => {
    const { result } = renderHook(() => 
      useErrorTracking({ maxErrors: 5 })
    );
    
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.trackError(new Error(`Error ${i}`));
      }
    });
    
    expect(result.current.errors.length).toBeLessThanOrEqual(5);
  });

  it('should export error logs', () => {
    const { result } = renderHook(() => useErrorTracking());
    
    act(() => {
      result.current.trackError(new Error('Test'));
    });
    
    const exported = result.current.exportErrors();
    expect(exported).toBeDefined();
    expect(Array.isArray(exported)).toBe(true);
  });
});
