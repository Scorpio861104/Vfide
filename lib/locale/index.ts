/**
 * Locale Engine — Universal formatting for every market
 * 
 * Auto-detects user locale from browser. Formats currency, dates, numbers
 * in the user's native format. Supports RTL detection.
 * 
 * A user in Tokyo sees ¥1,500. A user in Lagos sees ₦12,000. 
 * A user in Portland sees $12.50. Same product, same data, native display.
 * 
 * Usage:
 *   import { formatCurrency, formatDate, formatNumber, getUserLocale } from '@/lib/locale';
 *   
 *   formatCurrency(12.50, 'USD')        // "$12.50" (US) or "12,50 $US" (France)
 *   formatCurrency(1500, 'JPY')         // "¥1,500" (US) or "1.500 ¥" (Germany)
 *   formatDate(Date.now())              // "Apr 2, 2026" (US) or "2 avr. 2026" (France)
 *   formatNumber(1234567.89)            // "1,234,567.89" (US) or "1.234.567,89" (Germany)
 */

// ── Locale Detection ────────────────────────────────────────────────────────

let cachedLocale: string | null = null;

export function getUserLocale(): string {
  if (cachedLocale) return cachedLocale;
  if (typeof navigator !== 'undefined') {
    cachedLocale = navigator.language || navigator.languages?.[0] || 'en-US';
  } else {
    cachedLocale = 'en-US';
  }
  return cachedLocale;
}

export function setUserLocale(locale: string): void {
  cachedLocale = locale;
}

export function isRTL(locale?: string): boolean {
  const l = locale || getUserLocale();
  const lang = l.split('-')[0];
  return ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'].includes(lang);
}

export function getDirection(locale?: string): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

// ── Currency Formatting ─────────────────────────────────────────────────────

// Maps common stablecoins/tokens to display currencies
const TOKEN_DISPLAY_CURRENCY: Record<string, string> = {
  'USDC': 'USD',
  'USDT': 'USD',
  'DAI': 'USD',
  'VFIDE': 'USD', // Display as USD equivalent by default
};

// Locale → default fiat currency (for users who haven't set a preference)
const LOCALE_CURRENCY: Record<string, string> = {
  'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
  'en-NG': 'NGN', 'en-GH': 'GHS', 'en-KE': 'KES', 'en-ZA': 'ZAR',
  'ja': 'JPY', 'ja-JP': 'JPY',
  'ko': 'KRW', 'ko-KR': 'KRW',
  'zh': 'CNY', 'zh-CN': 'CNY', 'zh-TW': 'TWD',
  'de': 'EUR', 'de-DE': 'EUR', 'de-AT': 'EUR', 'de-CH': 'CHF',
  'fr': 'EUR', 'fr-FR': 'EUR', 'fr-CA': 'CAD',
  'es': 'EUR', 'es-ES': 'EUR', 'es-MX': 'MXN', 'es-AR': 'ARS', 'es-CO': 'COP',
  'pt': 'EUR', 'pt-BR': 'BRL', 'pt-PT': 'EUR',
  'id': 'IDR', 'id-ID': 'IDR',
  'th': 'THB', 'th-TH': 'THB',
  'vi': 'VND', 'vi-VN': 'VND',
  'tr': 'TRY', 'tr-TR': 'TRY',
  'ar': 'SAR', 'ar-SA': 'SAR', 'ar-EG': 'EGP', 'ar-AE': 'AED',
  'hi': 'INR', 'hi-IN': 'INR',
  'bn': 'BDT', 'bn-BD': 'BDT',
  'ru': 'RUB', 'ru-RU': 'RUB',
  'pl': 'PLN', 'pl-PL': 'PLN',
  'uk': 'UAH', 'uk-UA': 'UAH',
  'sw': 'KES', 'sw-KE': 'KES', 'sw-TZ': 'TZS',
};

// Zero-decimal currencies (no cents)
const ZERO_DECIMAL = new Set([
  'JPY', 'KRW', 'VND', 'IDR', 'CLP', 'PYG', 'UGX', 'RWF',
  'GNF', 'XOF', 'XAF', 'KMF', 'DJF', 'BIF', 'MGA', 'VUV',
]);

export function getDefaultCurrency(locale?: string): string {
  const l = locale || getUserLocale();
  return LOCALE_CURRENCY[l] || LOCALE_CURRENCY[l.split('-')[0]] || 'USD';
}

export function formatCurrency(
  amount: number | string,
  currency?: string,
  options?: { locale?: string; compact?: boolean; showCode?: boolean }
): string {
  const locale = options?.locale || getUserLocale();
  const curr = currency || getDefaultCurrency(locale);
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return '—';

  const isZeroDecimal = ZERO_DECIMAL.has(curr);

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
      ...(options?.compact ? { notation: 'compact' } : {}),
    });

    let formatted = formatter.format(num);

    if (options?.showCode && !formatted.includes(curr)) {
      formatted += ` ${curr}`;
    }

    return formatted;
  } catch {
    // Fallback for unsupported currencies
    return `${num.toFixed(isZeroDecimal ? 0 : 2)} ${curr}`;
  }
}

/**
 * Format a VFIDE token amount with USD equivalent.
 * Shows: "$12.50" primary, "25.0 VFIDE" secondary
 */
export function formatTokenWithFiat(
  tokenAmount: number | string,
  tokenPrice: number,
  options?: { locale?: string; displayCurrency?: string }
): { fiat: string; token: string } {
  const num = typeof tokenAmount === 'string' ? parseFloat(tokenAmount) : tokenAmount;
  const fiatAmount = num * tokenPrice;
  const curr = options?.displayCurrency || getDefaultCurrency(options?.locale);

  return {
    fiat: formatCurrency(fiatAmount, curr, options),
    token: `${num.toLocaleString(options?.locale || getUserLocale(), { maximumFractionDigits: 2 })} VFIDE`,
  };
}

// ── Number Formatting ───────────────────────────────────────────────────────

export function formatNumber(
  value: number | string,
  options?: { locale?: string; decimals?: number; compact?: boolean }
): string {
  const locale = options?.locale || getUserLocale();
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '—';

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 2,
    ...(options?.compact ? { notation: 'compact' } : {}),
  }).format(num);
}

export function formatPercent(
  value: number,
  options?: { locale?: string; decimals?: number }
): string {
  const locale = options?.locale || getUserLocale();
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 1,
  }).format(value / 100);
}

// ── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(
  timestamp: number | Date | string,
  style: 'short' | 'medium' | 'long' | 'relative' = 'medium',
  locale?: string
): string {
  const l = locale || getUserLocale();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (style === 'relative') {
    return formatRelativeTime(date, l);
  }

  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  }[style];

  return new Intl.DateTimeFormat(l, options).format(date);
}

function formatRelativeTime(date: Date, locale: string): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffSec < 3600) return rtf.format(-Math.floor(diffSec / 60), 'minute');
    if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), 'hour');
    if (diffSec < 2592000) return rtf.format(-Math.floor(diffSec / 86400), 'day');
    if (diffSec < 31536000) return rtf.format(-Math.floor(diffSec / 2592000), 'month');
    return rtf.format(-Math.floor(diffSec / 31536000), 'year');
  } catch {
    // Fallback
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }
}

// ── Barrel ───────────────────────────────────────────────────────────────────

export const locale = {
  get: getUserLocale,
  set: setUserLocale,
  isRTL,
  direction: getDirection,
  currency: formatCurrency,
  tokenWithFiat: formatTokenWithFiat,
  number: formatNumber,
  percent: formatPercent,
  date: formatDate,
  defaultCurrency: getDefaultCurrency,
};
