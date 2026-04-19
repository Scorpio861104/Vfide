/**
 * VFIDE token price utilities
 *
 * Price must be sourced from a live oracle or DEX feed.
 * No hardcoded default is provided; callers must supply a current price.
 */

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  GHS: 'en-GH',
  NGN: 'en-NG',
  KES: 'en-KE',
  INR: 'en-IN',
  ZAR: 'en-ZA',
  BRL: 'pt-BR',
};

const ESTIMATED_USD_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  GHS: 15.4,
  NGN: 1540,
  KES: 129,
  INR: 83,
  ZAR: 18.5,
  BRL: 5.7,
};

/**
 * Format a numeric price for display.
 * Defaults to USD with 2 decimal places.
 */
export function formatPrice(value: number, currency: string = 'USD'): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const normalizedCurrency = currency.toUpperCase();

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[normalizedCurrency] || 'en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${safeValue.toFixed(2)} ${normalizedCurrency}`.trim();
  }
}

export function convertUsdToCurrency(amountUsd: number, currency: string = 'USD'): number {
  const normalizedCurrency = currency.toUpperCase();
  const rate = ESTIMATED_USD_EXCHANGE_RATES[normalizedCurrency] ?? 1;
  return amountUsd * rate;
}

export function formatConvertedUsd(amountUsd: number, currency: string = 'USD'): string {
  return formatPrice(convertUsdToCurrency(amountUsd, currency), currency);
}

/**
 * Parse a formatted price string back to a number.
 */
export function parsePrice(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Convert VFIDE amount to USD string
 */
export function vfideToUsd(amount: number | string, pricePerToken: number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount) || numAmount === 0) return '$0.00';
  
  const usdValue = numAmount * pricePerToken;
  
  if (usdValue >= 1000000) {
    return `$${(usdValue / 1000000).toFixed(2)}M`;
  } else if (usdValue >= 1000) {
    return `$${(usdValue / 1000).toFixed(1)}K`;
  } else if (usdValue >= 1) {
    return `$${usdValue.toFixed(2)}`;
  } else {
    return `$${usdValue.toFixed(4)}`;
  }
}

/**
 * Format VFIDE amount with USD value
 */
export function formatVfideWithUsd(
  amount: number | string,
  pricePerToken: number
): { vfide: string; usd: string } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return {
    vfide: numAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    usd: vfideToUsd(numAmount, pricePerToken),
  };
}
