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

function applyDocumentLocale(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  const lang = locale.split('-')[0] ?? 'en';
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.documentElement.setAttribute('data-locale', locale);
}

function readStoredLocale(): SupportedLocale {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;
  // Try the shared key first (written by LocaleProvider), then the legacy key
  const stored =
    localStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem('locale');
  return stored ? normalizeLocale(stored) : normalizeLocale(
    typeof navigator !== 'undefined' ? navigator.language : undefined
  );
}

/**
 * useLocale — shared locale state hook.
 *
 * Reads from localStorage on mount (shared key with LocaleProvider).
 * Writing via setLocale updates BOTH storage systems so all consumers
 * (translation maps and formatting functions) stay in sync.
 */
export function useLocale(): [SupportedLocale, (locale: SupportedLocale) => void] {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  // Hydrate from stored locale on mount
  useEffect(() => {
    const resolved = readStoredLocale();
    setLocaleState(resolved);
    applyDocumentLocale(resolved);
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    // Write to BOTH storage keys so LocaleProvider + hooks/useLocale stay in sync
    localStorage.setItem(STORAGE_KEY, next);
    persistLocale(next); // writes legacy 'locale' key + cookie
    applyDocumentLocale(next);
    setLocaleState(next);
    // Notify LocaleProvider (context lives in a different React tree branch)
    // via a storage event so it re-reads and updates formatCurrency/formatDate etc.
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: next,
      storageArea: localStorage,
    }));
  }, []);

  return [locale, setLocale];
}
