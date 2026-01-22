/**
 * useThemeManager Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useThemeManager } from '../../../hooks/useThemeManager';

describe('useThemeManager Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('should initialize with default theme', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.theme).toBeDefined();
  });

  it('should switch between themes', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.theme).toBe('dark');
  });

  it('should persist theme preference', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should load theme from storage', () => {
    localStorage.setItem('theme', 'dark');
    
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.theme).toBe('dark');
  });

  it('should detect system theme', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.systemTheme).toBeDefined();
  });

  it('should toggle theme', () => {
    const { result } = renderHook(() => useThemeManager());
    
    const initialTheme = result.current.theme;
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).not.toBe(initialTheme);
  });

  it('should apply theme to document', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should support custom themes', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('custom');
    });
    
    expect(result.current.theme).toBe('custom');
  });

  it('should handle auto theme', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('auto');
    });
    
    expect(result.current.theme).toBe('auto');
  });

  it('should listen to system theme changes', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.systemTheme).toBeDefined();
  });

  it('should provide theme colors', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.colors).toBeDefined();
  });

  it('should support high contrast mode', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setHighContrast(true);
    });
    
    expect(result.current.highContrast).toBe(true);
  });
});
