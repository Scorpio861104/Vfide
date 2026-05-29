'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  persistLocale,
  SupportedLocale,
} from '@/lib/i18n';

/** RTL locales — extend as new locales are added to SUPPORTED_LOCALES */
const RTL_LOCALES = new Set<SupportedLocale>(['ar-SA']);

// Shared storage key — must match LocaleProvider so both systems stay in sync
const STORAGE_KEY = 'vfide.user-locale';

/**
 * Custom event name used to broadcast locale changes within the same tab.
 *
 * Why a CustomEvent instead of StorageEvent?
 * window.dispatchEvent(new StorageEvent(...)) is NOT delivered to
 * window.addEventListener('storage', ...) listeners in the SAME tab —
 * the native storage event only fires across tabs/windows. A named
 * CustomEvent works reliably within the same browsing context.
 */
const LOCALE_EVENT = 'vfide:locale-changed';

function applyDocumentLocale(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  const lang = locale.split('-')[0] ?? 'en';
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.documentElement.setAttribute('data-locale', locale);
}

function readStoredLocale(): SupportedLocale {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;
    const stored =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('locale');
    return stored
      ? normalizeLocale(stored)
      : normalizeLocale(
          typeof navigator !== 'undefined' ? navigator.language : undefined,
        );
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * useLocale — shared locale state hook.
 *
 * Reads from localStorage on mount (shared key with LocaleProvider).
 * Writing via setLocale:
 *   1. Updates React state immediately (re-renders this component)
 *   2. Persists to localStorage
 *   3. Fires `vfide:locale-changed` CustomEvent so ALL other useLocale
 *      consumers (including useT) update in the same tab
 *   4. Fires a cross-tab StorageEvent so LocaleProvider's storage listener
 *      also picks up the change in other tabs/windows
 */
export function useLocale(): [SupportedLocale, (locale: SupportedLocale) => void] {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  // Hydrate from stored locale on mount
  useEffect(() => {
    const resolved = readStoredLocale();
    setLocaleState(resolved);
    applyDocumentLocale(resolved);
  }, []);

  // Re-render when another component calls setLocale (same tab)
  useEffect(() => {
    function onLocaleChanged(e: Event) {
      const next = (e as CustomEvent<SupportedLocale>).detail;
      if (next) {
        setLocaleState(next);
        applyDocumentLocale(next);
      }
    }
    window.addEventListener(LOCALE_EVENT, onLocaleChanged);
    return () => window.removeEventListener(LOCALE_EVENT, onLocaleChanged);
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    // 1. Update React state immediately
    setLocaleState(next);
    applyDocumentLocale(next);

    // 2. Persist to both storage keys
    localStorage.setItem(STORAGE_KEY, next);
    persistLocale(next); // writes legacy 'locale' key + cookie

    // 3. Broadcast within same tab via CustomEvent (works where StorageEvent doesn't)
    window.dispatchEvent(new CustomEvent<SupportedLocale>(LOCALE_EVENT, { detail: next }));

    // 4. Notify LocaleProvider's cross-tab storage listener (other tabs/windows)
    // StorageEvent from dispatchEvent is NOT received by 'storage' listeners in the
    // same tab — LocaleProvider in the same tab gets it via LOCALE_EVENT above.
    // We still fire it for completeness (multi-tab scenario).
    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: next,
          storageArea: localStorage,
        }),
      );
    } catch {
      // Some browsers block synthetic StorageEvents — LOCALE_EVENT is the reliable path
    }
  }, []);

  return [locale, setLocale];
}
