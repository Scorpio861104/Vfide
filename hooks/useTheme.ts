'use client';

/**
 * useTheme — VFIDE theme engine
 *
 * Manages three built-in presets plus a fully-customisable "Custom" slot.
 * Theme tokens are applied as CSS custom properties on <html> so every
 * Tailwind utility that references them (--accent, --accent-fg, etc.) updates
 * instantly without a page reload.
 *
 * Persistence: localStorage key `vfide-theme` stores the active preset id
 * and any custom overrides.
 */

import { useCallback, useEffect, useState } from 'react';

export interface ThemeTokens {
  accent: string;
  accentFg: string;
  accentSecondary: string;
  borderRadius: string;
  cardBg: string;
  cardBorder: string;
  fontScale: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  swatches: string[];
  tokens: ThemeTokens;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default-dark',
    name: 'Default Dark',
    description: 'Balanced contrast for daily use across payments, social features, and dashboards.',
    swatches: ['#06b6d4', '#6366f1', '#e4e4e7'],
    tokens: { accent: '#06b6d4', accentFg: '#09090b', accentSecondary: '#6366f1', borderRadius: '0.75rem', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.08)', fontScale: '1' },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Sharper separation between text and background for accessibility-focused browsing.',
    swatches: ['#ffffff', '#00e5ff', '#fbbf24'],
    tokens: { accent: '#00e5ff', accentFg: '#000000', accentSecondary: '#fbbf24', borderRadius: '0.5rem', cardBg: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(255,255,255,0.18)', fontScale: '1.05' },
  },
  {
    id: 'creator-neon',
    name: 'Creator Neon',
    description: 'Brighter accent treatment for demo sessions, screenshots, and marketing previews.',
    swatches: ['#ec4899', '#a855f7', '#22d3ee'],
    tokens: { accent: '#ec4899', accentFg: '#ffffff', accentSecondary: '#a855f7', borderRadius: '1.25rem', cardBg: 'rgba(236,72,153,0.05)', cardBorder: 'rgba(236,72,153,0.15)', fontScale: '1' },
  },
];

const DEFAULT_PRESET = THEME_PRESETS[0] as ThemePreset;
const STORAGE_KEY = 'vfide-theme';

interface PersistedTheme {
  presetId: string;
  customTokens?: Partial<ThemeTokens>;
}

function findPreset(id: string): ThemePreset {
  return THEME_PRESETS.find(p => p.id === id) ?? DEFAULT_PRESET;
}

/** Parse a #rrggbb or #rgb hex string into [r, g, b] integers. Returns null for non-hex (rgba, hsl, etc). */
function hexToRgb(hex: string): [number, number, number] | null {
  const s = hex.trim();
  // Expand 3-char shorthand: #abc → #aabbcc
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  if (m3) return [parseInt(m3[1]!+m3[1]!, 16), parseInt(m3[2]!+m3[2]!, 16), parseInt(m3[3]!+m3[3]!, 16)];
  const m6 = /^#([0-9a-f]{6})$/i.exec(s);
  if (!m6) return null;
  const n = parseInt(m6[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function applyTokens(tokens: ThemeTokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // ── vf-* namespace (internal / PreviewTab inline styles) ──────────────
  root.style.setProperty('--vf-accent',           tokens.accent);
  root.style.setProperty('--vf-accent-fg',        tokens.accentFg);
  root.style.setProperty('--vf-accent-secondary', tokens.accentSecondary);
  root.style.setProperty('--vf-border-radius',    tokens.borderRadius);
  root.style.setProperty('--vf-card-bg',          tokens.cardBg);
  root.style.setProperty('--vf-card-border',      tokens.cardBorder);
  root.style.setProperty('--vf-font-scale',       tokens.fontScale);

  // ── Live app CSS vars — Tailwind accent utilities read these ───────────
  // Primary accent family
  root.style.setProperty('--accent', tokens.accent);
  const rgb = hexToRgb(tokens.accent);
  if (rgb) {
    const [r, g, b] = rgb;
    // light = blend toward white (add ~40% white)
    root.style.setProperty('--accent-light',  `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`);
    // dark = blend toward black (subtract ~30%)
    root.style.setProperty('--accent-dark',   `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`);
    // glow = rgba at 30% opacity
    root.style.setProperty('--accent-glow',   `rgba(${r}, ${g}, ${b}, 0.30)`);
    // subtle = rgba at 8% opacity
    root.style.setProperty('--accent-subtle',    `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty('--accent-grid-line', `rgba(${r}, ${g}, ${b}, 0.03)`);
    root.style.setProperty('--accent-dot',       `rgba(${r}, ${g}, ${b}, 0.15)`);
  }

  // Secondary accent (maps to --accent-purple slot used by gradient classes)
  root.style.setProperty('--accent-purple', tokens.accentSecondary);
  const rgb2 = hexToRgb(tokens.accentSecondary);
  if (rgb2) {
    const [r2, g2, b2] = rgb2;
    root.style.setProperty('--accent-purple-glow', `rgba(${r2}, ${g2}, ${b2}, 0.30)`);
  }

  // Derived semantic vars that reference the accent colour
  if (rgb) {
    const [r, g, b] = rgb;
    // --shadow-glow: large ambient glow used on hero cards and active states
    root.style.setProperty('--shadow-glow',   `0 0 60px -12px rgba(${r}, ${g}, ${b}, 0.40)`);
    // --border-accent: thin glowing border ring on interactive cards
    root.style.setProperty('--border-accent', `rgba(${r}, ${g}, ${b}, 0.20)`);
  }
}

export interface UseThemeReturn {
  activePresetId: string;
  activePreset: ThemePreset;
  effectiveTokens: ThemeTokens;
  customTokens: Partial<ThemeTokens>;
  isDirty: boolean;
  applyPreset: (presetId: string) => void;
  updateCustomToken: <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => void;
  resetToPreset: () => void;
  presets: ThemePreset[];
}

export function useTheme(): UseThemeReturn {
  const [activePresetId, setActivePresetId] = useState<string>('default-dark');
  const [customTokens, setCustomTokens] = useState<Partial<ThemeTokens>>({});

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: PersistedTheme = JSON.parse(raw);
        setActivePresetId(saved.presetId ?? 'default-dark');
        setCustomTokens(saved.customTokens ?? {});
      }
    } catch { /* corrupt storage — stay on defaults */ }
  }, []);

  // Apply tokens whenever preset or custom overrides change
  useEffect(() => {
    const preset = findPreset(activePresetId);
    const merged: ThemeTokens = { ...preset.tokens, ...customTokens };
    applyTokens(merged);
  }, [activePresetId, customTokens]);

  const applyPreset = useCallback((presetId: string) => {
    setActivePresetId(presetId);
    setCustomTokens({});
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ presetId, customTokens: {} }));
  }, []);

  const updateCustomToken = useCallback(<K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => {
    setCustomTokens(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ presetId: activePresetId, customTokens: next }));
      return next;
    });
  }, [activePresetId]);

  const resetToPreset = useCallback(() => {
    setCustomTokens({});
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ presetId: activePresetId, customTokens: {} }));
  }, [activePresetId]);

  const activePreset: ThemePreset = findPreset(activePresetId);
  const effectiveTokens: ThemeTokens = { ...activePreset.tokens, ...customTokens };
  const isDirty = Object.keys(customTokens).length > 0;

  return { activePresetId, activePreset, effectiveTokens, customTokens, isDirty, applyPreset, updateCustomToken, resetToPreset, presets: THEME_PRESETS };
}
