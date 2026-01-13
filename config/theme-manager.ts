/**
 * Theme Manager Configuration
 * Advanced theme system with custom colors, palettes, and persistence
 */

// ============================================
// ENUMS
// ============================================

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum ThemeName {
  DEFAULT = 'default',
  OCEAN = 'ocean',
  FOREST = 'forest',
  SUNSET = 'sunset',
  MIDNIGHT = 'midnight',
  AURORA = 'aurora',
  CYBERPUNK = 'cyberpunk',
  MINIMAL = 'minimal',
}

export enum ColorDensity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum BorderRadius {
  SQUARE = 'square',
  ROUNDED = 'rounded',
  PILL = 'pill',
}

// ============================================
// INTERFACES
// ============================================

export interface Color {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ThemePalette {
  primary: Color;
  secondary: Color;
  accent: Color;
  success: Color;
  warning: Color;
  error: Color;
  info: Color;
  neutral: Color;
}

export interface ThemeColor {
  light: string;
  dark: string;
}

export interface ThemeFont {
  sans: string;
  serif: string;
  mono: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface ThemeRadius {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeShadow {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeTransition {
  fast: string;
  normal: string;
  slow: string;
}

export interface ThemeSettings {
  mode: ThemeMode;
  theme: ThemeName;
  customPalette?: Partial<ThemePalette>;
  colorDensity: ColorDensity;
  borderRadius: BorderRadius;
  disableAnimations: boolean;
  highContrast: boolean;
  useSystemPreference: boolean;
}

export interface ThemeConfig {
  mode: ThemeMode;
  theme: ThemeName;
  palette: ThemePalette;
  fonts: ThemeFont;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadows: ThemeShadow;
  transitions: ThemeTransition;
  colorDensity: ColorDensity;
  borderRadius: BorderRadius;
  disableAnimations: boolean;
  highContrast: boolean;
  cssVariables: Record<string, string>;
}

export interface ThemePreset {
  id: ThemeName;
  name: string;
  description: string;
  palette: ThemePalette;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
  isDark: boolean;
}

export interface SavedTheme extends ThemeSettings {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}

// ============================================
// PRESETS
// ============================================

const DEFAULT_PALETTE: ThemePalette = {
  primary: {
    '50': '#f0f9ff',
    '100': '#e0f2fe',
    '200': '#bae6fd',
    '300': '#7dd3fc',
    '400': '#38bdf8',
    '500': '#0ea5e9',
    '600': '#0284c7',
    '700': '#0369a1',
    '800': '#075985',
    '900': '#0c3d66',
    '950': '#051e3e',
  },
  secondary: {
    '50': '#faf5ff',
    '100': '#f3e8ff',
    '200': '#e9d5ff',
    '300': '#d8b4fe',
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
    '900': '#581c87',
    '950': '#3f0f5c',
  },
  accent: {
    '50': '#fdf2f8',
    '100': '#fce7f3',
    '200': '#fbcfe8',
    '300': '#f8b4d9',
    '400': '#f472b6',
    '500': '#ec4899',
    '600': '#db2777',
    '700': '#be185d',
    '800': '#9d174d',
    '900': '#83103b',
    '950': '#500724',
  },
  success: {
    '50': '#f0fdf4',
    '100': '#dcfce7',
    '200': '#bbf7d0',
    '300': '#86efac',
    '400': '#4ade80',
    '500': '#22c55e',
    '600': '#16a34a',
    '700': '#15803d',
    '800': '#166534',
    '900': '#145231',
    '950': '#052e16',
  },
  warning: {
    '50': '#fffbeb',
    '100': '#fef3c7',
    '200': '#fde68a',
    '300': '#fcd34d',
    '400': '#fbbf24',
    '500': '#f59e0b',
    '600': '#d97706',
    '700': '#b45309',
    '800': '#92400e',
    '900': '#78350f',
    '950': '#451a03',
  },
  error: {
    '50': '#fef2f2',
    '100': '#fee2e2',
    '200': '#fecaca',
    '300': '#fca5a5',
    '400': '#f87171',
    '500': '#ef4444',
    '600': '#dc2626',
    '700': '#b91c1c',
    '800': '#991b1b',
    '900': '#7f1d1d',
    '950': '#4f0f0f',
  },
  info: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a',
    '950': '#172554',
  },
  neutral: {
    '50': '#f9fafb',
    '100': '#f3f4f6',
    '200': '#e5e7eb',
    '300': '#d1d5db',
    '400': '#9ca3af',
    '500': '#6b7280',
    '600': '#4b5563',
    '700': '#374151',
    '800': '#1f2937',
    '900': '#111827',
    '950': '#030712',
  },
};

const OCEAN_PALETTE: ThemePalette = {
  primary: {
    '50': '#f0f9ff',
    '100': '#e1f5fe',
    '200': '#b3e5fc',
    '300': '#81d4fa',
    '400': '#4fc3f7',
    '500': '#29b6f6',
    '600': '#039be5',
    '700': '#0288d1',
    '800': '#0277bd',
    '900': '#01579b',
    '950': '#004d7a',
  },
  secondary: {
    '50': '#e0f2f1',
    '100': '#b2dfdb',
    '200': '#80cbc4',
    '300': '#4db6ac',
    '400': '#26a69a',
    '500': '#009688',
    '600': '#00897b',
    '700': '#00796b',
    '800': '#00695c',
    '900': '#004d40',
    '950': '#003d33',
  },
  accent: {
    '50': '#e1f5fe',
    '100': '#b3e5fc',
    '200': '#81d4fa',
    '300': '#4fc3f7',
    '400': '#29b6f6',
    '500': '#03a9f4',
    '600': '#039be5',
    '700': '#0288d1',
    '800': '#0277bd',
    '900': '#01579b',
    '950': '#004d7a',
  },
  success: {
    '50': '#e8f5e9',
    '100': '#c8e6c9',
    '200': '#a5d6a7',
    '300': '#81c784',
    '400': '#66bb6a',
    '500': '#4caf50',
    '600': '#43a047',
    '700': '#388e3c',
    '800': '#2e7d32',
    '900': '#1b5e20',
    '950': '#0d3818',
  },
  warning: {
    '50': '#fff8e1',
    '100': '#ffecb3',
    '200': '#ffe082',
    '300': '#ffd54f',
    '400': '#ffca28',
    '500': '#fbc02d',
    '600': '#f9a825',
    '700': '#f57f17',
    '800': '#f57c00',
    '900': '#e65100',
    '950': '#bf360c',
  },
  error: {
    '50': '#ffebee',
    '100': '#ffcdd2',
    '200': '#ef9a9a',
    '300': '#e57373',
    '400': '#ef5350',
    '500': '#f44336',
    '600': '#e53935',
    '700': '#d32f2f',
    '800': '#c62828',
    '900': '#b71c1c',
    '950': '#7f0000',
  },
  info: {
    '50': '#e3f2fd',
    '100': '#bbdefb',
    '200': '#90caf9',
    '300': '#64b5f6',
    '400': '#42a5f5',
    '500': '#2196f3',
    '600': '#1e88e5',
    '700': '#1976d2',
    '800': '#1565c0',
    '900': '#0d47a1',
    '950': '#0d35b3',
  },
  neutral: {
    '50': '#fafafa',
    '100': '#f5f5f5',
    '200': '#eeeeee',
    '300': '#e0e0e0',
    '400': '#bdbdbd',
    '500': '#9e9e9e',
    '600': '#757575',
    '700': '#616161',
    '800': '#424242',
    '900': '#212121',
    '950': '#0a0a0a',
  },
};

const SUNSET_PALETTE: ThemePalette = {
  primary: {
    '50': '#fef3c7',
    '100': '#fde68a',
    '200': '#fcd34d',
    '300': '#fbbf24',
    '400': '#f97316',
    '500': '#f97316',
    '600': '#ea580c',
    '700': '#c2410c',
    '800': '#92400e',
    '900': '#78350f',
    '950': '#451a03',
  },
  secondary: {
    '50': '#fef2f2',
    '100': '#fee2e2',
    '200': '#fecaca',
    '300': '#fca5a5',
    '400': '#f87171',
    '500': '#ef4444',
    '600': '#dc2626',
    '700': '#b91c1c',
    '800': '#7f1d1d',
    '900': '#7f1d1d',
    '950': '#4f0f0f',
  },
  accent: {
    '50': '#fef3c7',
    '100': '#fde68a',
    '200': '#fcd34d',
    '300': '#fbbf24',
    '400': '#f59e0b',
    '500': '#d97706',
    '600': '#ca8a04',
    '700': '#a16207',
    '800': '#854d0e',
    '900': '#78350f',
    '950': '#451a03',
  },
  success: {
    '50': '#dcfce7',
    '100': '#bbf7d0',
    '200': '#86efac',
    '300': '#4ade80',
    '400': '#22c55e',
    '500': '#16a34a',
    '600': '#15803d',
    '700': '#166534',
    '800': '#145231',
    '900': '#052e16',
    '950': '#0a2818',
  },
  warning: {
    '50': '#fef08a',
    '100': '#fde047',
    '200': '#facc15',
    '300': '#eab308',
    '400': '#ca8a04',
    '500': '#a16207',
    '600': '#854d0e',
    '700': '#713f12',
    '800': '#54340e',
    '900': '#422006',
    '950': '#3f1f12',
  },
  error: {
    '50': '#fee2e2',
    '100': '#fecaca',
    '200': '#fca5a5',
    '300': '#f87171',
    '400': '#f87171',
    '500': '#dc2626',
    '600': '#b91c1c',
    '700': '#991b1b',
    '800': '#7f1d1d',
    '900': '#7f1d1d',
    '950': '#3e0606',
  },
  info: {
    '50': '#dbeafe',
    '100': '#bfdbfe',
    '200': '#93c5fd',
    '300': '#60a5fa',
    '400': '#3b82f6',
    '500': '#2563eb',
    '600': '#1d4ed8',
    '700': '#1e40af',
    '800': '#1e3a8a',
    '900': '#0c2d6b',
    '950': '#082f49',
  },
  neutral: {
    '50': '#f8fafc',
    '100': '#f1f5f9',
    '200': '#e2e8f0',
    '300': '#cbd5e1',
    '400': '#94a3b8',
    '500': '#64748b',
    '600': '#475569',
    '700': '#334155',
    '800': '#1e293b',
    '900': '#0f172a',
    '950': '#020617',
  },
};

export const THEME_PRESETS: Record<ThemeName, ThemePreset> = {
  [ThemeName.DEFAULT]: {
    id: ThemeName.DEFAULT,
    name: 'Default',
    description: 'Clean and professional theme with blue primary color',
    palette: DEFAULT_PALETTE,
    preview: { primary: '#0ea5e9', secondary: '#a855f7', accent: '#ec4899' },
    isDark: true,
  },
  [ThemeName.OCEAN]: {
    id: ThemeName.OCEAN,
    name: 'Ocean',
    description: 'Aquatic theme with blues and teals',
    palette: OCEAN_PALETTE,
    preview: { primary: '#29b6f6', secondary: '#009688', accent: '#03a9f4' },
    isDark: true,
  },
  [ThemeName.SUNSET]: {
    id: ThemeName.SUNSET,
    name: 'Sunset',
    description: 'Warm orange and red tones',
    palette: SUNSET_PALETTE,
    preview: { primary: '#f97316', secondary: '#ef4444', accent: '#d97706' },
    isDark: true,
  },
  [ThemeName.MIDNIGHT]: {
    id: ThemeName.MIDNIGHT,
    name: 'Midnight',
    description: 'Deep purple and indigo theme',
    palette: DEFAULT_PALETTE, // Uses same but different styling
    preview: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#d946ef' },
    isDark: true,
  },
  [ThemeName.FOREST]: {
    id: ThemeName.FOREST,
    name: 'Forest',
    description: 'Green and nature-inspired palette',
    palette: DEFAULT_PALETTE, // Uses same but different styling
    preview: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
    isDark: true,
  },
  [ThemeName.AURORA]: {
    id: ThemeName.AURORA,
    name: 'Aurora',
    description: 'Pink and cyan inspired by northern lights',
    palette: DEFAULT_PALETTE,
    preview: { primary: '#06b6d4', secondary: '#ec4899', accent: '#f97316' },
    isDark: true,
  },
  [ThemeName.CYBERPUNK]: {
    id: ThemeName.CYBERPUNK,
    name: 'Cyberpunk',
    description: 'Neon and high-contrast futuristic theme',
    palette: DEFAULT_PALETTE,
    preview: { primary: '#00ff88', secondary: '#ff00ff', accent: '#00ffff' },
    isDark: true,
  },
  [ThemeName.MINIMAL]: {
    id: ThemeName.MINIMAL,
    name: 'Minimal',
    description: 'Monochromatic minimal theme',
    palette: DEFAULT_PALETTE,
    preview: { primary: '#6b7280', secondary: '#9ca3af', accent: '#d1d5db' },
    isDark: true,
  },
};

// ============================================
// DEFAULT SETTINGS
// ============================================

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: ThemeMode.SYSTEM,
  theme: ThemeName.DEFAULT,
  colorDensity: ColorDensity.MEDIUM,
  borderRadius: BorderRadius.ROUNDED,
  disableAnimations: false,
  highContrast: false,
  useSystemPreference: true,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getThemeFromMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === ThemeMode.SYSTEM) {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'dark';
  }
  return mode as 'light' | 'dark';
}

export function generateCSSVariables(
  palette: ThemePalette,
  colorDensity: ColorDensity
): Record<string, string> {
  const densityMap = {
    [ColorDensity.LOW]: 0.8,
    [ColorDensity.MEDIUM]: 1,
    [ColorDensity.HIGH]: 1.2,
  };

  const multiplier = densityMap[colorDensity];

  return {
    '--color-primary-50': palette.primary['50'],
    '--color-primary-100': palette.primary['100'],
    '--color-primary-200': palette.primary['200'],
    '--color-primary-300': palette.primary['300'],
    '--color-primary-400': palette.primary['400'],
    '--color-primary-500': palette.primary['500'],
    '--color-primary-600': palette.primary['600'],
    '--color-primary-700': palette.primary['700'],
    '--color-primary-800': palette.primary['800'],
    '--color-primary-900': palette.primary['900'],
    '--color-secondary-500': palette.secondary['500'],
    '--color-secondary-600': palette.secondary['600'],
    '--color-accent-500': palette.accent['500'],
    '--color-accent-600': palette.accent['600'],
    '--color-success-500': palette.success['500'],
    '--color-warning-500': palette.warning['500'],
    '--color-error-500': palette.error['500'],
    '--color-info-500': palette.info['500'],
    '--opacity-multiplier': multiplier.toString(),
  };
}

export function getContrastColor(hexColor: string): 'white' | 'black' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function generatePaletteFromColor(baseColor: string): Partial<Color> {
  // Simplified palette generation from base color
  return {
    '50': adjustBrightness(baseColor, 0.95),
    '100': adjustBrightness(baseColor, 0.90),
    '200': adjustBrightness(baseColor, 0.75),
    '300': adjustBrightness(baseColor, 0.60),
    '400': adjustBrightness(baseColor, 0.30),
    '500': baseColor,
    '600': adjustBrightness(baseColor, -0.20),
    '700': adjustBrightness(baseColor, -0.40),
    '800': adjustBrightness(baseColor, -0.60),
    '900': adjustBrightness(baseColor, -0.80),
    '950': adjustBrightness(baseColor, -0.90),
  };
}

function adjustBrightness(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const r = Math.max(0, Math.min(255, Math.round(rgb.r * (1 + percent))));
  const g = Math.max(0, Math.min(255, Math.round(rgb.g * (1 + percent))));
  const b = Math.max(0, Math.min(255, Math.round(rgb.b * (1 + percent))));

  return rgbToHex(r, g, b);
}

export function mergeThemePalettes(
  base: ThemePalette,
  overrides: Partial<ThemePalette>
): ThemePalette {
  return {
    primary: overrides.primary || base.primary,
    secondary: overrides.secondary || base.secondary,
    accent: overrides.accent || base.accent,
    success: overrides.success || base.success,
    warning: overrides.warning || base.warning,
    error: overrides.error || base.error,
    info: overrides.info || base.info,
    neutral: overrides.neutral || base.neutral,
  };
}

export function validateThemeSettings(settings: Partial<ThemeSettings>): boolean {
  if (settings.mode && !Object.values(ThemeMode).includes(settings.mode)) {
    return false;
  }
  if (settings.theme && !Object.values(ThemeName).includes(settings.theme)) {
    return false;
  }
  if (
    settings.colorDensity &&
    !Object.values(ColorDensity).includes(settings.colorDensity)
  ) {
    return false;
  }
  if (
    settings.borderRadius &&
    !Object.values(BorderRadius).includes(settings.borderRadius)
  ) {
    return false;
  }
  return true;
}

export function exportThemeAsJSON(theme: SavedTheme): string {
  return JSON.stringify(theme, null, 2);
}

export function importThemeFromJSON(json: string): SavedTheme | null {
  try {
    const parsed = JSON.parse(json);
    if (
      parsed.id &&
      parsed.name &&
      parsed.mode &&
      parsed.theme &&
      validateThemeSettings(parsed)
    ) {
      return parsed as SavedTheme;
    }
  } catch {
    return null;
  }
  return null;
}
