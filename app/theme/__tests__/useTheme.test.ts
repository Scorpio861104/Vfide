/**
 * app/theme/__tests__/useTheme.test.ts
 * Smoke test: verify useTheme hook loads and doesn't crash on client
 */

import { renderHook, act } from '@testing-library/react';
import { useTheme, THEME_PRESETS } from '@/hooks/useTheme';

describe('useTheme', () => {
  it('should load with default preset', () => {
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.activePresetId).toBe('default-dark');
    expect(result.current.presets).toHaveLength(3);
    expect(result.current.isDirty).toBe(false);
  });

  it('should have all 3 presets', () => {
    expect(THEME_PRESETS).toHaveLength(3);
    expect(THEME_PRESETS.map(p => p.id)).toEqual([
      'default-dark',
      'high-contrast',
      'creator-neon',
    ]);
  });

  it('should apply preset on click', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.applyPreset('high-contrast');
    });
    
    expect(result.current.activePresetId).toBe('high-contrast');
    expect(result.current.isDirty).toBe(false);
  });

  it('should allow custom token override', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.updateCustomToken('accent', '#ff0000');
    });
    
    expect(result.current.customTokens.accent).toBe('#ff0000');
    expect(result.current.isDirty).toBe(true);
  });
});
