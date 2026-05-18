/**
 * LocaleProvider — React context for locale-aware rendering
 * 
 * Auto-detects user locale on mount. Provides formatting functions
 * and RTL direction to all children.
 * 
 * Add to CoreProviders (Tier 1) so it's available everywhere.
 * 
 * Usage:
 *   const { formatCurrency, formatDate, isRTL, displayCurrency } = useLocale();
 *   <span>{formatCurrency(12.50)}</span>   // "$12.50" or "¥1,500" etc.
 */
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  getUserLocale, setUserLocale, isRTL, getDirection, getDefaultCurrency,
  formatCurrency as fmtCurrency,
  formatTokenWithFiat as fmtTokenFiat,
  formatNumber as fmtNumber,
  formatPercent as fmtPercent,
  formatDate as fmtDate,
} from './index';

interface LocaleContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  formatCurrency: (amount: number | string, currency?: string) => string;
  formatCurrencyCompact: (amount: number | string, currency?: string) => string;
  formatTokenWithFiat: (tokenAmount: number | string, tokenPrice: number) => { fiat: string; token: string };
  formatNumber: (value: number | string, decimals?: number) => string;
  formatNumberCompact: (value: number | string) => string;
  formatPercent: (value: number) => string;
  formatDate: (timestamp: number | Date | string, style?: 'short' | 'medium' | 'long' | 'relative') => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const CURRENCY_STORAGE_KEY = 'vfide.display-currency';
const LOCALE_STORAGE_KEY = 'vfide.user-locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState(getUserLocale);
  const [displayCurrency, setDisplayCurrencyState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CURRENCY_STORAGE_KEY) || getDefaultCurrency();
    }
    return 'USD';
  });

  // Sync locale preference
  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) {
      setCurrentLocale(stored);
      setUserLocale(stored);
    }
  }, []);

  const setLocale = useCallback((l: string) => {
    setCurrentLocale(l);
    setUserLocale(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
    // Auto-update currency if user hasn't explicitly set one
    if (!localStorage.getItem(CURRENCY_STORAGE_KEY)) {
      const newCurrency = getDefaultCurrency(l);
      setDisplayCurrencyState(newCurrency);
    }
  }, []);

  const setDisplayCurrency = useCallback((c: string) => {
    setDisplayCurrencyState(c);
    localStorage.setItem(CURRENCY_STORAGE_KEY, c);
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale: currentLocale,
    setLocale,
    displayCurrency,
    setDisplayCurrency,
    isRTL: isRTL(currentLocale),
    direction: getDirection(currentLocale),
    formatCurrency: (amount, currency) =>
      fmtCurrency(amount, currency || displayCurrency, { locale: currentLocale }),
    formatCurrencyCompact: (amount, currency) =>
      fmtCurrency(amount, currency || displayCurrency, { locale: currentLocale, compact: true }),
    formatTokenWithFiat: (tokenAmount, tokenPrice) =>
      fmtTokenFiat(tokenAmount, tokenPrice, { locale: currentLocale, displayCurrency }),
    formatNumber: (value, decimals) =>
      fmtNumber(value, { locale: currentLocale, decimals }),
    formatNumberCompact: (value) =>
      fmtNumber(value, { locale: currentLocale, compact: true }),
    formatPercent: (value) =>
      fmtPercent(value, { locale: currentLocale }),
    formatDate: (timestamp, style) =>
      fmtDate(timestamp, style, currentLocale),
  }), [currentLocale, displayCurrency, setLocale, setDisplayCurrency]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
