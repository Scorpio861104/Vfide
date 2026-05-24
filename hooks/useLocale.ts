'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LOCALE,
  getBrowserLocale,
  persistLocale,
  SupportedLocale,
} from '@/lib/i18n';

/**
 * useLocale — shared locale state hook.
 * Reads from localStorage/cookie/navigator on mount,
 * and persists changes across all storage surfaces.
 */
export function useLocale(): [SupportedLocale, (locale: SupportedLocale) => void] {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(getBrowserLocale());
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    persistLocale(next);
    setLocaleState(next);
  }, []);

  return [locale, setLocale];
}
