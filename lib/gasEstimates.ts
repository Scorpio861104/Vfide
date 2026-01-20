/**
 * Gas Price Estimation
 * 
 * Phase 4: Show gas price estimates during network operations
 */

import { CACHE_TTL } from './walletConstants';

export interface GasEstimate {
  slow: string;
  standard: string;
  fast: string;
  chainId: number;
  timestamp: number;
}

const gasCache = new Map<number, GasEstimate>();

/**
 * Fetch gas prices from RPC
 */
export async function fetchGasPrice(rpcUrl: string, chainId: number): Promise<GasEstimate | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_gasPrice',
        params: [],
      }),
    });

    const data = await response.json();
    
    if (data.result) {
      // Convert hex to gwei
      const gasPriceWei = parseInt(data.result, 16);
      if (isNaN(gasPriceWei) || !isFinite(gasPriceWei)) {
        throw new Error('Invalid gas price from RPC');
      }
      
      const gasPriceGwei = gasPriceWei / 1e9;
      
      // Estimate slow, standard, fast (rough approximation)
      const estimate: GasEstimate = {
        slow: (gasPriceGwei * 0.8).toFixed(2),
        standard: gasPriceGwei.toFixed(2),
        fast: (gasPriceGwei * 1.2).toFixed(2),
        chainId,
        timestamp: Date.now(),
      };
      
      gasCache.set(chainId, estimate);
      return estimate;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to fetch gas price:', error);
    return null;
  }
}

/**
 * Get cached gas price
 */
export function getCachedGasPrice(chainId: number): GasEstimate | null {
  const cached = gasCache.get(chainId);
  
  // Cache valid for configured TTL
  if (cached && Date.now() - cached.timestamp < CACHE_TTL.GAS_PRICE) {
    return cached;
  }
  
  return null;
}

/**
 * Format gas price for display
 */
export function formatGasPrice(gwei: string): string {
  const num = parseFloat(gwei);
  if (isNaN(num) || !isFinite(num)) {
    return '0 Gwei';
  }
  
  if (num < 1) {
    return `${num.toFixed(2)} Gwei`;
  }
  if (num < 100) {
    return `${num.toFixed(1)} Gwei`;
  }
  return `${Math.round(num)} Gwei`;
}
