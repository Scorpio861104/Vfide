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

function applyTokens(tokens: ThemeTokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--vf-accent',           tokens.accent);
  root.style.setProperty('--vf-accent-fg',        tokens.accentFg);
  root.style.setProperty('--vf-accent-secondary', tokens.accentSecondary);
  root.style.setProperty('--vf-border-radius',    tokens.borderRadius);
  root.style.setProperty('--vf-card-bg',          tokens.cardBg);
  root.style.setProperty('--vf-card-border',      tokens.cardBorder);
  root.style.setProperty('--vf-font-scale',       tokens.fontScale);
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
