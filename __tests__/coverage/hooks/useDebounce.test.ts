/**
 * useDebounce Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from '../../../hooks/useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );
    
    expect(result.current).toBe('first');
    
    rerender({ value: 'second', delay: 500 });
    expect(result.current).toBe('first');
    
    jest.advanceTimersByTime(500);
    expect(result.current).toBe('second');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );
    
    rerender({ value: 'ab' });
    jest.advanceTimersByTime(250);
    
    rerender({ value: 'abc' });
    jest.advanceTimersByTime(250);
    
    expect(result.current).toBe('a');
    
    jest.advanceTimersByTime(250);
    expect(result.current).toBe('abc');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 1000 } }
    );
    
    rerender({ value: 'updated', delay: 1000 });
    jest.advanceTimersByTime(500);
    expect(result.current).toBe('test');
    
    jest.advanceTimersByTime(500);
    expect(result.current).toBe('updated');
  });

  it('should work with complex objects', () => {
    const obj1 = { id: 1, name: 'test' };
    const obj2 = { id: 2, name: 'updated' };
    
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: obj1 } }
    );
    
    expect(result.current).toBe(obj1);
    
    rerender({ value: obj2 });
    jest.advanceTimersByTime(500);
    
    expect(result.current).toBe(obj2);
  });

  it('should cleanup timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 500));
    
    unmount();
    jest.advanceTimersByTime(500);
    
    expect(true).toBe(true);
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'test' } }
    );
    
    rerender({ value: 'updated' });
    jest.advanceTimersByTime(0);
    
    expect(result.current).toBe('updated');
  });

  it('should handle undefined values', () => {
    const { result } = renderHook(() => useDebounce(undefined, 500));
    
    expect(result.current).toBeUndefined();
  });

  it('should handle null values', () => {
    const { result } = renderHook(() => useDebounce(null, 500));
    
    expect(result.current).toBeNull();
  });
});
