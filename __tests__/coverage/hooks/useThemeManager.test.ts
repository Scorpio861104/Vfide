/**
 * useThemeManager Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useThemeManager } from '../../../hooks/useThemeManager';

// Mock config/theme-manager
const mockPalette = {
  primary: '#3B82F6',
  secondary: '#6B7280',
  background: '#FFFFFF',
  foreground: '#000000',
};

jest.mock('@/config/theme-manager', () => ({
  ThemeMode: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
  DEFAULT_THEME_SETTINGS: {
    mode: 'system',
    theme: 'default',
    colorDensity: 'comfortable',
    borderRadius: 'medium',
    disableAnimations: false,
    highContrast: false,
    palette: {},
  },
  THEME_PRESETS: {
    default: { name: 'Default', palette: { primary: '#3B82F6' } },
    dark: { name: 'Dark', palette: { primary: '#3B82F6' } },
  },
  getThemeFromMode: jest.fn((mode: string) => mode === 'dark' ? 'dark' : 'light'),
  generateCSSVariables: jest.fn(() => ({})),
  mergeThemePalettes: jest.fn((a: any, b: any) => ({ ...a, ...b })),
  validateThemeSettings: jest.fn(() => true),
  exportThemeAsJSON: jest.fn(() => '{}'),
  importThemeFromJSON: jest.fn(() => ({})),
}));

describe('useThemeManager Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-mode');
  });

  it('should initialize with settings', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.settings).toBeDefined();
  });

  it('should have currentTheme property', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.currentTheme).toBeDefined();
  });

  it('should have currentMode property', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.currentMode).toBeDefined();
  });

  it('should set theme', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('dark' as any);
    });
    
    expect(result.current.settings.theme).toBe('dark');
  });

  it('should set mode', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setMode('dark' as any);
    });
    
    expect(result.current.settings.mode).toBe('dark');
  });

  it('should persist settings to localStorage', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('dark' as any);
    });
    
    const stored = localStorage.getItem('vfide_theme_settings');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).theme).toBe('dark');
  });

  it('should set high contrast mode', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setHighContrast(true);
    });
    
    expect(result.current.settings.highContrast).toBe(true);
  });

  it('should set color density', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setColorDensity('compact' as any);
    });
    
    expect(result.current.settings.colorDensity).toBe('compact');
  });

  it('should set border radius', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setBorderRadius('large' as any);
    });
    
    expect(result.current.settings.borderRadius).toBe('large');
  });

  it('should disable animations', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setDisableAnimations(true);
    });
    
    expect(result.current.settings.disableAnimations).toBe(true);
  });

  it('should reset to default', () => {
    const { result } = renderHook(() => useThemeManager());
    
    act(() => {
      result.current.setTheme('dark' as any);
    });
    
    act(() => {
      result.current.resetToDefault();
    });
    
    expect(result.current.settings.theme).toBe('default');
  });

  it('should export theme as string', () => {
    const { result } = renderHook(() => useThemeManager());
    
    const exported = result.current.exportTheme();
    
    expect(typeof exported).toBe('string');
  });

  it('should have presets property', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.presets).toBeDefined();
  });

  it('should have config property', () => {
    const { result } = renderHook(() => useThemeManager());
    
    expect(result.current.config).toBeDefined();
  });

  it('should save and load custom themes', () => {
    const { result } = renderHook(() => useThemeManager());
    
    let savedTheme: any;
    act(() => {
      savedTheme = result.current.saveCurrentTheme('My Theme', 'Custom theme');
    });
    
    expect(savedTheme).toBeDefined();
    expect(savedTheme.name).toBe('My Theme');
    
    const savedThemes = result.current.getSavedThemes();
    expect(savedThemes).toHaveLength(1);
  });

  it('should initialize safely when storage is unavailable', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    try {
      const { result } = renderHook(() => useThemeManager());
      expect(result.current.settings).toBeDefined();
    } finally {
      getItemSpy.mockRestore();
    }
  });
});
