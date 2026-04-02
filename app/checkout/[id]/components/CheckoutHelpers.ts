export function isUsdAnchoredDisplay(code: string): boolean {
  return ['USD', 'USDC', 'USDT', 'DAI', 'BUSD'].includes(code.toUpperCase());
}

export function formatEstimatedLocalCurrency(amount: number, currency: string): string | null {
  if (isUsdAnchoredDisplay(currency)) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch { return null; }
}
