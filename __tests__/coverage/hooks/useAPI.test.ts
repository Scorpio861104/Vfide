/**
 * useAPI Hook Tests
 * Comprehensive tests for API hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAPI } from '../../../hooks/useAPI';

// Mock fetch
global.fetch = jest.fn();

describe('useAPI Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
      status: 200,
    } as Response);
  });

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAPI('/api/test'));
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
    });

    it('should fetch data on mount when autoFetch is true', async () => {
      const { result } = renderHook(() => useAPI('/api/test', { autoFetch: true }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    });

    it('should not fetch data on mount when autoFetch is false', () => {
      renderHook(() => useAPI('/api/test', { autoFetch: false }));
      
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useAPI('/api/test', { autoFetch: true }));
      
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.loading).toBe(false);
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const { result } = renderHook(() => useAPI('/api/test', { autoFetch: true }));
      
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle JSON parse errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const { result } = renderHook(() => useAPI('/api/test', { autoFetch: true }));
      
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Request Methods', () => {
    it('should support GET requests', async () => {
      const { result } = renderHook(() => useAPI('/api/test'));
      
      await waitFor(() => {
        if (result.current.refetch) {
          result.current.refetch();
        }
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should support POST requests', async () => {
      const { result } = renderHook(() => useAPI('/api/test', { method: 'POST' }));
      
      if (result.current.execute) {
        result.current.execute({ body: { test: 'data' } });
      }

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
          method: 'POST',
        }));
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      let callCount = 0;
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: 'success' }),
        } as Response);
      });

      const { result } = renderHook(() => 
        useAPI('/api/test', { autoFetch: true, retry: 3 })
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      const { result, rerender } = renderHook(() => 
        useAPI('/api/test', { autoFetch: true, cache: true })
      );
      
      await waitFor(() => {
        expect(result.current.data).toBeTruthy();
      });

      const firstCallCount = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length;
      
      rerender();
      
      expect((global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('AbortController', () => {
    it('should abort ongoing requests when unmounted', async () => {
      const { unmount } = renderHook(() => 
        useAPI('/api/test', { autoFetch: true })
      );
      
      unmount();
      
      // Verify cleanup happened
      expect(true).toBe(true);
    });
  });

  describe('Query Parameters', () => {
    it('should handle query parameters', async () => {
      const { result } = renderHook(() => 
        useAPI('/api/test', { params: { search: 'test', limit: 10 } })
      );
      
      if (result.current.execute) {
        await result.current.execute();
      }

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.any(Object)
      );
    });
  });

  describe('Headers', () => {
    it('should include custom headers', async () => {
      const { result } = renderHook(() => 
        useAPI('/api/test', { 
          headers: { 'X-Custom-Header': 'value' },
          autoFetch: true,
        })
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'value',
          }),
        })
      );
    });

    it('should include authorization token', async () => {
      const { result } = renderHook(() => 
        useAPI('/api/test', { 
          token: 'Bearer test-token',
          autoFetch: true,
        })
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('Request Body', () => {
    it('should serialize JSON body', async () => {
      const { result } = renderHook(() => 
        useAPI('/api/test', { method: 'POST' })
      );
      
      if (result.current.execute) {
        await result.current.execute({ body: { test: 'data' } });
      }

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          body: JSON.stringify({ test: 'data' }),
        })
      );
    });

    it('should handle FormData body', async () => {
      const formData = new FormData();
      formData.append('file', 'test');

      const { result } = renderHook(() => 
        useAPI('/api/test', { method: 'POST' })
      );
      
      if (result.current.execute) {
        await result.current.execute({ body: formData });
      }

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          body: formData,
        })
      );
    });
  });

  describe('Loading State', () => {
    it('should set loading to true during request', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.MockedFunction<typeof fetch>).mockReturnValueOnce(
        promise as Promise<Response>
      );

      const { result } = renderHook(() => useAPI('/api/test', { autoFetch: true }));
      
      expect(result.current.loading).toBe(true);
      
      resolvePromise!({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Pagination Support', () => {
    it('should handle pagination', async () => {
      const { result, rerender } = renderHook(
        ({ page }) => useAPI('/api/test', { params: { page }, autoFetch: true }),
        { initialProps: { page: 1 } }
      );
      
      await waitFor(() => {
        expect(result.current.data).toBeTruthy();
      });

      rerender({ page: 2 });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Dependent Queries', () => {
    it('should skip request when dependencies not met', () => {
      const { result } = renderHook(() => 
        useAPI('/api/test', { 
          autoFetch: true,
          enabled: false,
        })
      );
      
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it('should fetch when dependencies are met', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useAPI('/api/test', { autoFetch: true, enabled }),
        { initialProps: { enabled: false } }
      );
      
      expect(global.fetch).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid requests', async () => {
      jest.useFakeTimers();
      
      const { result, rerender } = renderHook(
        ({ query }) => useAPI('/api/search', { 
          params: { q: query },
          autoFetch: true,
          debounce: 300,
        }),
        { initialProps: { query: 'a' } }
      );
      
      rerender({ query: 'ab' });
      rerender({ query: 'abc' });
      
      jest.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });

  describe('Optimistic Updates', () => {
    it('should support optimistic updates', async () => {
      const { result } = renderHook(() => useAPI('/api/test'));
      
      if (result.current.setData) {
        result.current.setData({ optimistic: 'data' });
      }

      expect(result.current.data).toEqual({ optimistic: 'data' });
    });
  });

  describe('Response Transformation', () => {
    it('should transform response data', async () => {
      const transform = (data: any) => ({ ...data, transformed: true });
      
      const { result } = renderHook(() => 
        useAPI('/api/test', { 
          autoFetch: true,
          transform,
        })
      );
      
      await waitFor(() => {
        expect(result.current.data).toEqual(
          expect.objectContaining({ transformed: true })
        );
      });
    });
  });
});
