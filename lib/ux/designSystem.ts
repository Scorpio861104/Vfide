/**
 * Design System Tokens
 * 
 * Consistent design tokens for colors, typography, spacing, and animations.
 */

// ==================== COLORS ====================

export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Secondary accent
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#7B61FF',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },

  // Success states
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning states
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error states
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic colors
  semantic: {
    background: {
      light: '#ffffff',
      dark: '#0a0a0b',
    },
    surface: {
      light: '#f9fafb',
      dark: '#18181b',
    },
    text: {
      light: '#111827',
      dark: '#f9fafb',
    },
    muted: {
      light: '#6b7280',
      dark: '#a1a1aa',
    },
    border: {
      light: '#e5e7eb',
      dark: '#27272a',
    },
  },

  // Crypto-specific colors
  crypto: {
    ethereum: '#627eea',
    bitcoin: '#f7931a',
    usdc: '#2775ca',
    usdt: '#26a17b',
    matic: '#8247e5',
    base: '#0052ff',
    arbitrum: '#28a0f0',
    optimism: '#ff0420',
    zksync: '#8b8dfc',
    bnb: '#f3ba2f',
  },
} as const;

// ==================== TYPOGRAPHY ====================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ==================== SPACING ====================

export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
} as const;

// ==================== BORDER RADIUS ====================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ==================== SHADOWS ====================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Colored shadows
  glow: {
    primary: '0 0 20px rgba(59, 130, 246, 0.5)',
    secondary: '0 0 20px rgba(139, 92, 246, 0.5)',
    success: '0 0 20px rgba(34, 197, 94, 0.5)',
    error: '0 0 20px rgba(239, 68, 68, 0.5)',
  },
} as const;

// ==================== ANIMATIONS ====================

export const animation = {
  duration: {
    instant: '50ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
    slowest: '1000ms',
  },

  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  keyframes: {
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    ping: {
      '75%, 100%': { transform: 'scale(2)', opacity: '0' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '.5' },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
      '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
    shimmer: {
      from: { backgroundPosition: '200% 0' },
      to: { backgroundPosition: '-200% 0' },
    },
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    fadeOut: {
      from: { opacity: '1' },
      to: { opacity: '0' },
    },
    slideUp: {
      from: { transform: 'translateY(10px)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
      from: { transform: 'translateY(-10px)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: '0' },
      to: { transform: 'scale(1)', opacity: '1' },
    },
  },
} as const;

// ==================== Z-INDEX ====================

export const zIndex = {
  behind: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  max: 9999,
} as const;

// ==================== BREAKPOINTS ====================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ==================== COMPONENT TOKENS ====================

export const components = {
  button: {
    sizes: {
      xs: { height: '1.75rem', px: '0.5rem', fontSize: '0.75rem' },
      sm: { height: '2rem', px: '0.75rem', fontSize: '0.875rem' },
      md: { height: '2.5rem', px: '1rem', fontSize: '0.875rem' },
      lg: { height: '2.75rem', px: '1.5rem', fontSize: '1rem' },
      xl: { height: '3rem', px: '2rem', fontSize: '1.125rem' },
    },
    variants: {
      primary: {
        bg: colors.primary[600],
        color: '#ffffff',
        hoverBg: colors.primary[700],
        activeBg: colors.primary[800],
      },
      secondary: {
        bg: colors.gray[100],
        color: colors.gray[900],
        hoverBg: colors.gray[200],
        activeBg: colors.gray[300],
      },
      outline: {
        bg: 'transparent',
        color: colors.primary[600],
        border: colors.primary[600],
        hoverBg: colors.primary[50],
      },
      ghost: {
        bg: 'transparent',
        color: colors.gray[600],
        hoverBg: colors.gray[100],
      },
      danger: {
        bg: colors.error[600],
        color: '#ffffff',
        hoverBg: colors.error[700],
        activeBg: colors.error[800],
      },
    },
  },

  input: {
    sizes: {
      sm: { height: '2rem', fontSize: '0.875rem', px: '0.75rem' },
      md: { height: '2.5rem', fontSize: '0.875rem', px: '0.75rem' },
      lg: { height: '2.75rem', fontSize: '1rem', px: '1rem' },
    },
    states: {
      default: {
        border: colors.gray[300],
        bg: '#ffffff',
      },
      focus: {
        border: colors.primary[500],
        ring: colors.primary[100],
      },
      error: {
        border: colors.error[500],
        ring: colors.error[100],
      },
      disabled: {
        bg: colors.gray[100],
        color: colors.gray[400],
      },
    },
  },

  card: {
    variants: {
      default: {
        bg: '#ffffff',
        border: colors.gray[200],
        shadow: shadows.sm,
      },
      elevated: {
        bg: '#ffffff',
        border: 'transparent',
        shadow: shadows.lg,
      },
      outlined: {
        bg: 'transparent',
        border: colors.gray[200],
        shadow: 'none',
      },
    },
  },

  badge: {
    variants: {
      primary: { bg: colors.primary[100], color: colors.primary[800] },
      secondary: { bg: colors.secondary[100], color: colors.secondary[800] },
      success: { bg: colors.success[100], color: colors.success[800] },
      warning: { bg: colors.warning[100], color: colors.warning[800] },
      error: { bg: colors.error[100], color: colors.error[800] },
      gray: { bg: colors.gray[100], color: colors.gray[800] },
    },
  },
} as const;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get CSS custom property value
 */
export function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Set CSS custom property value
 */
export function setCssVar(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(name, value);
}

/**
 * Generate CSS variable declarations from tokens
 */
export function generateCssVars(
  tokens: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const vars: Record<string, string> = {};

  Object.entries(tokens).forEach(([key, value]) => {
    const varName = prefix ? `${prefix}-${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      Object.assign(vars, generateCssVars(value as Record<string, unknown>, varName));
    } else {
      vars[`--${varName}`] = String(value);
    }
  });

  return vars;
}

/**
 * Create a consistent class name generator
 */
export function createClassNames(componentName: string) {
  return {
    root: `vfide-${componentName}`,
    element: (name: string) => `vfide-${componentName}__${name}`,
    modifier: (name: string) => `vfide-${componentName}--${name}`,
  };
}

// ==================== THEME TYPE ====================

export interface Theme {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  animation: typeof animation;
  zIndex: typeof zIndex;
  breakpoints: typeof breakpoints;
  components: typeof components;
}

export const defaultTheme: Theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  zIndex,
  breakpoints,
  components,
};

export default defaultTheme;
