/**
 * Design Tokens - Unified Visual System
 * 
 * This file defines the single source of truth for all visual styling.
 * Use these tokens throughout the application for consistency.
 * 
 * MIGRATION GUIDE:
 * - Replace `gray-*` with `zinc-*` (zinc is our standard neutral)
 * - Replace `slate-*` with `zinc-*` for consistency
 * - Use semantic color classes (e.g., `bg-panel` instead of `bg-zinc-900`)
 * - Use CSS variable-based classes when available
 */

// ==========================================
// COLOR PALETTE
// ==========================================

export const colors = {
  // Primary accent (cyan)
  accent: {
    DEFAULT: '#00F0FF',
    light: '#5BFAFF',
    dark: '#0080FF',
    glow: 'rgba(0, 240, 255, 0.3)',
    subtle: 'rgba(0, 240, 255, 0.08)',
  },
  
  // Secondary accents
  green: {
    DEFAULT: '#00FF88',
    glow: 'rgba(0, 255, 136, 0.3)',
  },
  purple: {
    DEFAULT: '#A78BFA',
    glow: 'rgba(167, 139, 250, 0.3)',
  },
  gold: {
    DEFAULT: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.3)',
  },
  
  // Status colors
  status: {
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  
  // Backgrounds (dark theme)
  bg: {
    dark: '#08080A',
    darker: '#050507',
    panel: '#0F0F14',
    panelElevated: '#16161D',
    panelHover: '#1C1C26',
  },
  
  // Text colors
  text: {
    primary: '#F8F8FC',
    secondary: '#A8A8B3',
    muted: '#6B6B78',
  },
  
  // Borders
  border: {
    DEFAULT: '#1F1F2A',
    accent: 'rgba(0, 240, 255, 0.2)',
  },
  
  // Glass morphism
  glass: {
    bg: 'rgba(15, 15, 20, 0.6)',
    border: 'rgba(255, 255, 255, 0.08)',
    highlight: 'rgba(255, 255, 255, 0.05)',
  },
} as const;

// ==========================================
// STANDARD NEUTRAL: ZINC
// All components should use zinc-* for grays
// ==========================================

export const neutralScale = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
} as const;

// ==========================================
// TYPOGRAPHY
// ==========================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    display: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.02em' }],
    base: ['1rem', { lineHeight: '1.75' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
  },
} as const;

// ==========================================
// SPACING
// ==========================================

export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
} as const;

// ==========================================
// BORDER RADIUS
// ==========================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
  // Semantic
  button: '0.75rem',  // 12px
  card: '0.875rem',   // 14px
  input: '0.625rem',  // 10px
} as const;

// ==========================================
// SHADOWS
// ==========================================

export const shadows = {
  glow: '0 0 60px -12px rgba(0, 240, 255, 0.4)',
  card: '0 8px 32px -8px rgba(0, 0, 0, 0.5)',
  elevated: '0 24px 80px -20px rgba(0, 0, 0, 0.6)',
  glowAccent: '0 0 60px -12px rgba(0, 240, 255, 0.5)',
  glowGreen: '0 0 60px -12px rgba(0, 255, 136, 0.5)',
  glowPurple: '0 0 60px -12px rgba(167, 139, 250, 0.5)',
} as const;

// ==========================================
// TRANSITIONS
// ==========================================

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// ==========================================
// Z-INDEX SCALE
// ==========================================

export const zIndex = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  popover: 300,
  tooltip: 400,
  toast: 500,
} as const;

// ==========================================
// UTILITY CLASS MAPPINGS
// For migration from inconsistent classes
// ==========================================

/**
 * Maps legacy gray classes to standardized zinc classes
 * Use this when migrating components
 */
export const grayToZincMap: Record<string, string> = {
  // Background colors
  'bg-gray-50': 'bg-zinc-50',
  'bg-gray-100': 'bg-zinc-100',
  'bg-gray-200': 'bg-zinc-200',
  'bg-gray-300': 'bg-zinc-300',
  'bg-gray-400': 'bg-zinc-400',
  'bg-gray-500': 'bg-zinc-500',
  'bg-gray-600': 'bg-zinc-600',
  'bg-gray-700': 'bg-zinc-700',
  'bg-gray-800': 'bg-zinc-800',
  'bg-gray-900': 'bg-zinc-900',
  'bg-gray-950': 'bg-zinc-950',
  // Slate to zinc
  'bg-slate-50': 'bg-zinc-50',
  'bg-slate-100': 'bg-zinc-100',
  'bg-slate-200': 'bg-zinc-200',
  'bg-slate-300': 'bg-zinc-300',
  'bg-slate-400': 'bg-zinc-400',
  'bg-slate-500': 'bg-zinc-500',
  'bg-slate-600': 'bg-zinc-600',
  'bg-slate-700': 'bg-zinc-700',
  'bg-slate-800': 'bg-zinc-800',
  'bg-slate-900': 'bg-zinc-900',
  'bg-slate-950': 'bg-zinc-950',
  // Text colors - gray to zinc
  'text-gray-50': 'text-zinc-50',
  'text-gray-100': 'text-zinc-100',
  'text-gray-200': 'text-zinc-200',
  'text-gray-300': 'text-zinc-300',
  'text-gray-400': 'text-zinc-400',
  'text-gray-500': 'text-zinc-500',
  'text-gray-600': 'text-zinc-600',
  'text-gray-700': 'text-zinc-700',
  'text-gray-800': 'text-zinc-800',
  'text-gray-900': 'text-zinc-900',
  // Text colors - slate to zinc
  'text-slate-50': 'text-zinc-50',
  'text-slate-100': 'text-zinc-100',
  'text-slate-200': 'text-zinc-200',
  'text-slate-300': 'text-zinc-300',
  'text-slate-400': 'text-zinc-400',
  'text-slate-500': 'text-zinc-500',
  'text-slate-600': 'text-zinc-600',
  'text-slate-700': 'text-zinc-700',
  'text-slate-800': 'text-zinc-800',
  'text-slate-900': 'text-zinc-900',
  // Border colors
  'border-gray-500': 'border-zinc-500',
  'border-gray-600': 'border-zinc-600',
  'border-gray-700': 'border-zinc-700',
  'border-gray-800': 'border-zinc-800',
  'border-slate-500': 'border-zinc-500',
  'border-slate-600': 'border-zinc-600',
  'border-slate-700': 'border-zinc-700',
  'border-slate-800': 'border-zinc-800',
};

/**
 * Semantic class recommendations
 * Instead of using raw Tailwind colors, use these semantic classes
 */
export const semanticClassMap: Record<string, string> = {
  // Backgrounds
  'bg-zinc-900': 'bg-panel',
  'bg-zinc-800': 'bg-panel-elevated',
  'bg-zinc-950': 'bg-dark',
  // Text
  'text-white': 'text-text-primary',
  'text-zinc-300': 'text-text-secondary',
  'text-zinc-400': 'text-text-secondary',
  'text-zinc-500': 'text-text-muted',
  // Borders
  'border-zinc-700': 'border-border',
  'border-zinc-800': 'border-border',
};

/**
 * Hardcoded hex colors to Tailwind semantic equivalents
 * Use these as a reference when migrating legacy code
 */
export const hexToSemanticMap: Record<string, string> = {
  // Primary accent (cyan)
  '#00F0FF': 'cyan-400',         // Main accent
  '#5BFAFF': 'cyan-300',         // Light accent
  '#0080FF': 'blue-500',         // Dark accent / secondary
  
  // Success / teal
  '#00FF88': 'emerald-400',      // Success green
  '#4ECDC4': 'teal-400',         // Teal accent
  
  // Purple / violet
  '#A78BFA': 'violet-400',       // Purple accent
  
  // Gold / amber
  '#FFD700': 'amber-400',        // Gold accent
  '#F59E0B': 'amber-500',        // Warning
  
  // Backgrounds
  '#0D0D0F': 'zinc-950',         // Page background
  '#08080A': 'zinc-950',         // Dark background
  '#0F0F14': 'zinc-900',         // Panel background
  '#16161D': 'zinc-900/80',      // Elevated panel
  '#1C1C26': 'zinc-800/80',      // Hover state
  '#2A2A2F': 'zinc-800',         // Card background
  '#3A3A3F': 'zinc-700',         // Border
  
  // Text
  '#F5F3E8': 'zinc-100',         // Primary text
  '#F8F8FC': 'zinc-50',          // Bright text
  '#A0A0A5': 'zinc-400',         // Muted text
  '#6B6B78': 'zinc-500',         // Very muted text
  
  // Borders
  '#1F1F2A': 'zinc-800',         // Default border
};

/**
 * CSS class replacements for literal hex colors
 * Search/replace these patterns in component files
 */
export const hexToClassMap: Record<string, string> = {
  // Backgrounds
  'bg-[#0D0D0F]': 'bg-zinc-950',
  'bg-[#08080A]': 'bg-zinc-950',
  'bg-[#2A2A2F]': 'bg-zinc-800',
  'bg-[#00F0FF]': 'bg-cyan-400',
  
  // Text
  'text-[#F5F3E8]': 'text-zinc-100',
  'text-[#F8F8FC]': 'text-zinc-50',
  'text-[#A0A0A5]': 'text-zinc-400',
  'text-[#0D0D0F]': 'text-zinc-950',
  'text-[#00F0FF]': 'text-cyan-400',
  
  // Borders
  'border-[#3A3A3F]': 'border-zinc-700',
  'border-[#00F0FF]': 'border-cyan-400',
  
  // Hover states
  'hover:text-[#F5F3E8]': 'hover:text-zinc-100',
  'hover:bg-[#2A2A2F]': 'hover:bg-zinc-800',
};
