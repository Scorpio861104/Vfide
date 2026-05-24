'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LOCALE,
  getBrowserLocale,
  getHtmlLang,
  persistLocale,
  SupportedLocale,
} from '@/lib/i18n';

/** RTL locales — extend as new locales are added to SUPPORTED_LOCALES */
const RTL_LOCALES = new Set<SupportedLocale>([
  'ar-SA',
]);

function applyDocumentLocale(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  const lang = locale.split('-')[0];
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.documentElement.setAttribute('data-locale', locale);
}

/**
 * useLocale — shared locale state hook.
 *
 * - Reads from localStorage / cookie / navigator.language on mount.
 * - Persists changes to localStorage, cookie, and document attributes.
 * - Keeps <html lang="…"> and <html dir="…"> in sync for screen readers
 *   and browser spell-check. RTL-ready for Arabic / Hebrew expansion.
 */
export function useLocale(): [SupportedLocale, (locale: SupportedLocale) => void] {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  // Hydrate from stored / browser locale on mount
  useEffect(() => {
    const resolved = getBrowserLocale();
    setLocaleState(resolved);
    applyDocumentLocale(resolved);
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    persistLocale(next);       // → localStorage + cookie + document.cookie
    applyDocumentLocale(next); // → <html lang dir data-locale>
    setLocaleState(next);
  }, []);

  return [locale, setLocale];
}
