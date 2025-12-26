/**
 * Price utilities for VFIDE token
 */

// Default VFIDE price in USD (based on public tier presale)
export const DEFAULT_VFIDE_PRICE = 0.10;

// Convert VFIDE amount to USD value
export function vfideToUsd(amount: number | string, pricePerToken: number = DEFAULT_VFIDE_PRICE): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 0;
  return numAmount * pricePerToken;
}

// Format USD value with proper formatting
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format VFIDE amount with commas
export function formatVfide(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0';
  return new Intl.NumberFormat('en-US').format(numAmount);
}
