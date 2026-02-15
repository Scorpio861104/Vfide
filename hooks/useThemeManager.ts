'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ThemeMode,
  ThemeName,
  ThemeSettings,
  ThemeConfig,
  SavedTheme,
  DEFAULT_THEME_SETTINGS,
  THEME_PRESETS,
  getThemeFromMode,
  generateCSSVariables,
  mergeThemePalettes,
  validateThemeSettings,
  exportThemeAsJSON,
  importThemeFromJSON,
  ColorDensity,
  BorderRadius,
  THEME_PRESETS as PRESETS,
  type ThemePalette,
} from '@/config/theme-manager';

const STORAGE_KEY = 'vfide_theme_settings';
const SAVED_THEMES_KEY = 'vfide_saved_themes';

interface UseThemeManagerReturn {
  // Current settings
  settings: ThemeSettings;
  currentTheme: ThemeName;
  currentMode: ThemeMode;

  // Theme config
  config: ThemeConfig;
  presets: typeof THEME_PRESETS;

  // Update functions
  setMode: (mode: ThemeMode) => void;
  setTheme: (theme: ThemeName) => void;
  setColorDensity: (density: ColorDensity) => void;
  setBorderRadius: (radius: BorderRadius) => void;
  setDisableAnimations: (disable: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setPalette: (palette: Partial<ThemePalette>) => void;

  // Theme management
  saveCurrentTheme: (name: string, description: string) => SavedTheme;
  getSavedThemes: () => SavedTheme[];
  loadSavedTheme: (id: string) => boolean;
  deleteSavedTheme: (id: string) => void;
  updateSavedTheme: (id: string, updates: Partial<SavedTheme>) => void;

  // Export/Import
  exportTheme: () => string;
  importTheme: (json: string) => boolean;
  exportAsCSS: () => string;

  // Reset
  resetToDefault: () => void;
  resetToPreset: (preset: ThemeName) => void;

  // Status
  isDirty: boolean;
  isSaved: boolean;
}

export function useThemeManager(): UseThemeManagerReturn {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_SETTINGS;
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (!storedSettings) return DEFAULT_THEME_SETTINGS;
    try {
      const parsed = JSON.parse(storedSettings);
      return validateThemeSettings(parsed) ? parsed : DEFAULT_THEME_SETTINGS;
    } catch {
      return DEFAULT_THEME_SETTINGS;
    }
  });
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => {
    if (typeof window === 'undefined') return [];
    const storedThemes = localStorage.getItem(SAVED_THEMES_KEY);
    if (!storedThemes) return [];
    try {
      return JSON.parse(storedThemes);
    } catch {
      return [];
    }
  });
  const [isDirty, setIsDirty] = useState(false);
  const isSaved = !isDirty;

  const currentPalette = useMemo(() => {
    const preset = PRESETS[settings.theme];
    const basePalette = preset.palette;
    return settings.customPalette
      ? mergeThemePalettes(basePalette, settings.customPalette)
      : basePalette;
  }, [settings.theme, settings.customPalette]);

  // Save settings to storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply theme to document
  useEffect(() => {
    const htmlElement = document.documentElement;
    const theme = settings.theme;
    const mode = getThemeFromMode(settings.mode);

    // Update data attributes
    htmlElement.setAttribute('data-theme', theme);
    htmlElement.setAttribute('data-mode', mode);
    htmlElement.setAttribute('data-density', settings.colorDensity);
    htmlElement.setAttribute('data-radius', settings.borderRadius);

    if (settings.disableAnimations) {
      htmlElement.classList.add('reduce-motion');
    } else {
      htmlElement.classList.remove('reduce-motion');
    }

    if (settings.highContrast) {
      htmlElement.classList.add('high-contrast');
    } else {
      htmlElement.classList.remove('high-contrast');
    }

    // Apply CSS variables
    const cssVars = generateCSSVariables(
      currentPalette,
      settings.colorDensity
    );

    Object.entries(cssVars).forEach(([key, value]) => {
      htmlElement.style.setProperty(key, value);
    });

    // Listen for system preference changes
    if (settings.mode === ThemeMode.SYSTEM) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Re-apply theme when system preference changes
        const newMode = getThemeFromMode(ThemeMode.SYSTEM);
        htmlElement.setAttribute('data-mode', newMode);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    return undefined;
  }, [settings, currentPalette]);

  // Build current theme config
  const config = useMemo<ThemeConfig>(() => {
    return {
      mode: settings.mode,
      theme: settings.theme,
      palette: currentPalette,
      fonts: {
        sans: 'system-ui, -apple-system, sans-serif',
        serif: 'Georgia, serif',
        mono: 'Menlo, monospace',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
        '4xl': '6rem',
      },
      radius: {
        none: '0',
        xs: '0.125rem',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      transitions: {
        fast: '150ms ease-in-out',
        normal: '300ms ease-in-out',
        slow: '500ms ease-in-out',
      },
      colorDensity: settings.colorDensity,
      borderRadius: settings.borderRadius,
      disableAnimations: settings.disableAnimations,
      highContrast: settings.highContrast,
      cssVariables: generateCSSVariables(currentPalette, settings.colorDensity),
    };
  }, [settings, currentPalette]);

  // Update handlers
  const setMode = useCallback((mode: ThemeMode) => {
    setSettings((prev) => ({ ...prev, mode }));
    setIsDirty(true);
  }, []);

  const setTheme = useCallback((theme: ThemeName) => {
    setSettings((prev) => ({ ...prev, theme, customPalette: undefined }));
    setIsDirty(true);
  }, []);

  const setColorDensity = useCallback((colorDensity: ColorDensity) => {
    setSettings((prev) => ({ ...prev, colorDensity }));
    setIsDirty(true);
  }, []);

  const setBorderRadius = useCallback((borderRadius: BorderRadius) => {
    setSettings((prev) => ({ ...prev, borderRadius }));
    setIsDirty(true);
  }, []);

  const setDisableAnimations = useCallback((disableAnimations: boolean) => {
    setSettings((prev) => ({ ...prev, disableAnimations }));
    setIsDirty(true);
  }, []);

  const setHighContrast = useCallback((highContrast: boolean) => {
    setSettings((prev) => ({ ...prev, highContrast }));
    setIsDirty(true);
  }, []);

  const setPalette = useCallback((customPalette: Partial<ThemePalette>) => {
    setSettings((prev) => ({ ...prev, customPalette }));
    setIsDirty(true);
  }, []);

  // Theme management
  const saveCurrentTheme = useCallback(
    (name: string, description: string): SavedTheme => {
      const theme: SavedTheme = {
        id: `theme_${Date.now()}`,
        name,
        description,
        mode: settings.mode,
        theme: settings.theme,
        customPalette: settings.customPalette,
        colorDensity: settings.colorDensity,
        borderRadius: settings.borderRadius,
        disableAnimations: settings.disableAnimations,
        highContrast: settings.highContrast,
        useSystemPreference: settings.useSystemPreference,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: false,
      };

      setSavedThemes((prev) => [...prev, theme]);
      localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify([...savedThemes, theme]));

      return theme;
    },
    [settings, savedThemes]
  );

  const getSavedThemes = useCallback(() => {
    return savedThemes;
  }, [savedThemes]);

  const loadSavedTheme = useCallback((id: string) => {
    const theme = savedThemes.find((t) => t.id === id);
    if (theme) {
      setSettings({
        mode: theme.mode,
        theme: theme.theme,
        customPalette: theme.customPalette,
        colorDensity: theme.colorDensity,
        borderRadius: theme.borderRadius,
        disableAnimations: theme.disableAnimations,
        highContrast: theme.highContrast,
        useSystemPreference: theme.useSystemPreference,
      });
      return true;
    }
    return false;
  }, [savedThemes]);

  const deleteSavedTheme = useCallback((id: string) => {
    setSavedThemes((prev) => prev.filter((t) => t.id !== id));
    const updated = savedThemes.filter((t) => t.id !== id);
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(updated));
  }, [savedThemes]);

  const updateSavedTheme = useCallback(
    (id: string, updates: Partial<SavedTheme>) => {
      setSavedThemes((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, ...updates, updatedAt: Date.now() }
            : t
        )
      );

      const updated = savedThemes.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
      );
      localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(updated));
    },
    [savedThemes]
  );

  // Export/Import
  const exportTheme = useCallback(() => {
    const theme: SavedTheme = {
      id: `export_${Date.now()}`,
      name: `${settings.theme}_export`,
      description: 'Exported theme',
      mode: settings.mode,
      theme: settings.theme,
      customPalette: settings.customPalette,
      colorDensity: settings.colorDensity,
      borderRadius: settings.borderRadius,
      disableAnimations: settings.disableAnimations,
      highContrast: settings.highContrast,
      useSystemPreference: settings.useSystemPreference,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: false,
    };

    return exportThemeAsJSON(theme);
  }, [settings]);

  const importTheme = useCallback((json: string) => {
    const theme = importThemeFromJSON(json);
    if (theme) {
      setSettings({
        mode: theme.mode,
        theme: theme.theme,
        customPalette: theme.customPalette,
        colorDensity: theme.colorDensity,
        borderRadius: theme.borderRadius,
        disableAnimations: theme.disableAnimations,
        highContrast: theme.highContrast,
        useSystemPreference: theme.useSystemPreference,
      });
      return true;
    }
    return false;
  }, []);

  const exportAsCSS = useCallback(() => {
    let css = ':root {\n';

    Object.entries(config.cssVariables).forEach(([key, value]) => {
      css += `  ${key}: ${value};\n`;
    });

    css += '}\n\n';
    css += '[data-theme="' + settings.theme + '"] {\n';
    Object.entries(config.palette.primary).forEach(([key, value]) => {
      css += `  --color-primary-${key}: ${value};\n`;
    });
    css += '}\n';

    return css;
  }, [config, settings]);

  // Reset functions
  const resetToDefault = useCallback(() => {
    setSettings(DEFAULT_THEME_SETTINGS);
    setIsDirty(false);
  }, []);

  const resetToPreset = useCallback((preset: ThemeName) => {
    setSettings((prev) => ({
      ...prev,
      theme: preset,
      customPalette: undefined,
    }));
    setIsDirty(true);
  }, []);

  return {
    settings,
    currentTheme: settings.theme,
    currentMode: settings.mode,
    config,
    presets: THEME_PRESETS,
    setMode,
    setTheme,
    setColorDensity,
    setBorderRadius,
    setDisableAnimations,
    setHighContrast,
    setPalette,
    saveCurrentTheme,
    getSavedThemes,
    loadSavedTheme,
    deleteSavedTheme,
    updateSavedTheme,
    exportTheme,
    importTheme,
    exportAsCSS,
    resetToDefault,
    resetToPreset,
    isDirty,
    isSaved,
  };
}
