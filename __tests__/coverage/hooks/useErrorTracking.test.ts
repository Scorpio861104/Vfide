/**
 * useErrorTracking Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useErrorTracking } from '../../../hooks/useErrorTracking';

// Mock storage
jest.mock('@/lib/storage', () => ({
  safeGetJSON: jest.fn(() => []),
  safeSetJSON: jest.fn(),
}));

// Mock performance dashboard config
jest.mock('@/config/performance-dashboard', () => ({
  ErrorCategory: {
    NETWORK: 'network',
    VALIDATION: 'validation',
    AUTH: 'auth',
    UNKNOWN: 'unknown',
  },
}));

describe('useErrorTracking Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty errors array', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      expect(result.current.errors).toEqual([]);
    });

    it('should have errorStats property', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      expect(result.current.errorStats).toBeDefined();
      expect(result.current.errorStats.total).toBe(0);
    });
  });

  describe('Adding Errors', () => {
    it('should add error with addError', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Test error',
          category: 'network' as any,
          severity: 'high',
          url: '/test',
        });
      });
      
      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].message).toBe('Test error');
    });

    it('should auto-generate id and timestamp', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Test error',
          category: 'network' as any,
          severity: 'high',
          url: '/test',
        });
      });
      
      expect(result.current.errors[0].id).toBeDefined();
      expect(result.current.errors[0].timestamp).toBeDefined();
    });

    it('should add multiple errors', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Error 1',
          category: 'network' as any,
          severity: 'low',
          url: '/test1',
        });
        result.current.addError({
          message: 'Error 2',
          category: 'validation' as any,
          severity: 'medium',
          url: '/test2',
        });
      });
      
      expect(result.current.errors).toHaveLength(2);
    });
  });

  describe('Clearing Errors', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Test',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
      });
      
      expect(result.current.errors).toHaveLength(1);
      
      act(() => {
        result.current.clearErrors();
      });
      
      expect(result.current.errors).toHaveLength(0);
    });
  });

  describe('Resolving Errors', () => {
    it('should resolve error by id', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Test',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
      });
      
      const errorId = result.current.errors[0].id;
      
      act(() => {
        result.current.resolveError(errorId);
      });
      
      expect(result.current.errors[0].resolved).toBe(true);
    });
  });

  describe('Filtering Errors', () => {
    it('should filter by severity', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Low',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
        result.current.addError({
          message: 'High',
          category: 'network' as any,
          severity: 'high',
          url: '/test',
        });
      });
      
      const highErrors = result.current.filterBySeverity('high');
      
      expect(highErrors).toHaveLength(1);
      expect(highErrors[0].message).toBe('High');
    });

    it('should filter by category', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Network',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
        result.current.addError({
          message: 'Validation',
          category: 'validation' as any,
          severity: 'low',
          url: '/test',
        });
      });
      
      const networkErrors = result.current.filterByCategory('network' as any);
      
      expect(networkErrors).toHaveLength(1);
      expect(networkErrors[0].message).toBe('Network');
    });
  });

  describe('Searching Errors', () => {
    it('should search errors by message', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Network timeout',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
        result.current.addError({
          message: 'Validation failed',
          category: 'validation' as any,
          severity: 'low',
          url: '/test',
        });
      });
      
      const found = result.current.searchErrors('timeout');
      
      expect(found).toHaveLength(1);
      expect(found[0].message).toContain('timeout');
    });
  });

  describe('Exporting Errors', () => {
    it('should export as JSON', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Test',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
      });
      
      const exported = result.current.exportErrors('json');
      
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export as CSV', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Test',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
      });
      
      const exported = result.current.exportErrors('csv');
      
      expect(typeof exported).toBe('string');
      expect(exported).toContain('ID,Category,Severity');
    });
  });

  describe('Error Stats', () => {
    it('should calculate total errors', () => {
      const { result } = renderHook(() => useErrorTracking());
      
      act(() => {
        result.current.addError({
          message: 'Error 1',
          category: 'network' as any,
          severity: 'low',
          url: '/test',
        });
        result.current.addError({
          message: 'Error 2',
          category: 'network' as any,
          severity: 'high',
          url: '/test',
        });
      });
      
      expect(result.current.errorStats.total).toBe(2);
    });
  });
});
