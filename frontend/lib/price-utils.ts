/**
 * VFIDE token price utilities
 * 
 * For testnet: Uses presale tier prices
 * For mainnet: Will integrate Chainlink/DEX price feeds
 */

// Presale prices per tier
export const PRESALE_PRICES = {
  founding: 0.05,  // $0.05 per VFIDE
  oath: 0.08,      // $0.08 per VFIDE
  public: 0.10,    // $0.10 per VFIDE
};

// Default price for display (public tier)
export const DEFAULT_VFIDE_PRICE = 0.10;

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
