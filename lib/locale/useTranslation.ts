'use client';

import { useMemo } from 'react';
import { getUserLocale } from '@/lib/locale';
import en from './translations/en.json';

type TranslationMap = Record<string, string>;

const translationCache: Record<string, TranslationMap> = { en: en as TranslationMap };

async function loadTranslations(lang: string): Promise<TranslationMap> {
  if (translationCache[lang]) return translationCache[lang];

  try {
    let mod: { default: TranslationMap };
    switch (lang) {
      case 'fr': mod = await import('./translations/fr.json'); break;
      case 'pt': mod = await import('./translations/pt.json'); break;
      case 'sw': mod = await import('./translations/sw.json'); break;
      case 'es': mod = await import('./translations/es.json'); break;
      case 'ha': mod = await import('./translations/ha.json'); break;
      case 'ar': mod = await import('./translations/ar.json'); break;
      case 'hi': mod = await import('./translations/hi.json'); break;
      default: return en;
    }
    translationCache[lang] = mod.default;
    return mod.default;
  } catch {
    return en;
  }
}

export function useTranslation() {
  const locale = getUserLocale();
  const lang = locale.split('-')[0] ?? 'en';

  const translations: TranslationMap = useMemo(() => {
    if (!translationCache[lang] && lang !== 'en') {
      void loadTranslations(lang);
    }
    return translationCache[lang] || (en as TranslationMap);
  }, [lang]);

  function t(
    key: string,
    fallbackOrParams?: string | Record<string, string>,
    maybeParams?: Record<string, string>,
  ): string {
    const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
    const params = typeof fallbackOrParams === 'string' ? maybeParams : fallbackOrParams;

    let text = translations[key] || en[key as keyof typeof en] || fallback || key;
    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        text = text.split(`{${paramKey}}`).join(value);
      }
    }
    return text;
  }

  return { t, locale, lang };
}
