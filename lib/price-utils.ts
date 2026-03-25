/**
 * VFIDE token price utilities
 * 
 * For testnet: Uses a default display price
 * For mainnet: Will integrate Chainlink/DEX price feeds
 */

// Default price for display
export const DEFAULT_VFIDE_PRICE = 0.05;

/**
 * Format a numeric price for display.
 * Defaults to USD with 2 decimal places.
 */
export function formatPrice(value: number, currency: string = 'USD'): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  }

  return `${safeValue.toFixed(2)} ${currency}`.trim();
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
export function vfideToUsd(amount: number | string, pricePerToken: number = DEFAULT_VFIDE_PRICE): string {
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
  pricePerToken: number = DEFAULT_VFIDE_PRICE
): { vfide: string; usd: string } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return {
    vfide: numAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    usd: vfideToUsd(numAmount, pricePerToken),
  };
}
