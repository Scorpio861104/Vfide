/**
 * Gas Price Service
 * 
 * Aggregates gas price data from multiple sources for reliable estimation.
 * Provides real-time gas prices, historical data, and optimal timing recommendations.
 */

// ==================== TYPES ====================

export interface GasPriceLevel {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedWait: number; // seconds
  confidence: number; // 0-1
}

export interface GasPriceData {
  timestamp: number;
  chainId: number;
  slow: GasPriceLevel;
  normal: GasPriceLevel;
  fast: GasPriceLevel;
  instant: GasPriceLevel;
  baseFee: bigint;
  nextBaseFee: bigint;
  congestion: 'low' | 'medium' | 'high' | 'critical';
  utilizationPercent: number;
}

export interface GasPriceHistory {
  timestamp: number;
  baseFee: number; // gwei
  normal: number; // gwei
}

export interface OptimalTimingRecommendation {
  currentPrice: number; // gwei
  estimatedOptimalPrice: number; // gwei
  estimatedTime: number; // seconds until optimal
  savingsPercent: number;
  confidence: number; // 0-1
  recommendation: string;
  urgency: 'wait' | 'ok-to-proceed' | 'send-now';
}

// ==================== CACHE ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<GasPriceData>>();
const historyCache = new Map<string, CacheEntry<GasPriceHistory[]>>();

const CACHE_TTL = 12000; // 12 seconds
const HISTORY_CACHE_TTL = 60000; // 1 minute

// ==================== GAS PRICE SERVICE ====================

class GasPriceService {
  private etherscanApiKey: string | undefined;
  private lastFetchTime: Map<number, number> = new Map();
  private minFetchInterval = 10000; // 10 seconds between fetches

  constructor() {
    this.etherscanApiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  }

  /**
   * Get current gas prices for a chain
   */
  async getCurrentPrices(chainId: number): Promise<GasPriceData> {
    const cacheKey = `gas-${chainId}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Rate limit fetches
    const lastFetch = this.lastFetchTime.get(chainId) || 0;
    if (Date.now() - lastFetch < this.minFetchInterval && cached) {
      return cached.data;
    }

    try {
      const data = await this.fetchFromMultipleSources(chainId);
      cache.set(cacheKey, { data, timestamp: Date.now() });
      this.lastFetchTime.set(chainId, Date.now());
      return data;
    } catch (error) {
      console.error('Failed to fetch gas prices:', error);
      // Return cached data if available
      if (cached) return cached.data;
      throw error;
    }
  }

  /**
   * Fetch from multiple sources for reliability
   */
  private async fetchFromMultipleSources(chainId: number): Promise<GasPriceData> {
    const sources = [
      this.fetchFromEtherscan(chainId),
      this.fetchFromProvider(chainId),
    ];

    const results = await Promise.allSettled(sources);
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<GasPriceData> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (successfulResults.length === 0) {
      throw new Error('Failed to fetch gas prices from any source');
    }

    // Return median values for accuracy
    return this.aggregateResults(successfulResults);
  }

  /**
   * Fetch from Etherscan Gas Oracle API
   */
  private async fetchFromEtherscan(chainId: number): Promise<GasPriceData> {
    // Only works for mainnet and some L2s
    if (chainId !== 1) {
      throw new Error('Etherscan only supports mainnet');
    }

    const apiKey = this.etherscanApiKey || 'YourApiKeyToken';
    const response = await fetch(
      `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`,
      { next: { revalidate: 12 } }
    );

    if (!response.ok) {
      throw new Error('Etherscan API error');
    }

    const data = await response.json();
    
    if (data.status !== '1' || !data.result) {
      throw new Error('Invalid Etherscan response');
    }

    const result = data.result;
    const baseFee = BigInt(Math.floor(parseFloat(result.suggestBaseFee) * 1e9));

    return {
      timestamp: Date.now(),
      chainId,
      slow: {
        maxFeePerGas: BigInt(Math.floor(parseFloat(result.SafeGasPrice) * 1e9)),
        maxPriorityFeePerGas: BigInt(1e9), // 1 gwei
        estimatedWait: 180,
        confidence: 0.95,
      },
      normal: {
        maxFeePerGas: BigInt(Math.floor(parseFloat(result.ProposeGasPrice) * 1e9)),
        maxPriorityFeePerGas: BigInt(1.5e9), // 1.5 gwei
        estimatedWait: 60,
        confidence: 0.9,
      },
      fast: {
        maxFeePerGas: BigInt(Math.floor(parseFloat(result.FastGasPrice) * 1e9)),
        maxPriorityFeePerGas: BigInt(2e9), // 2 gwei
        estimatedWait: 15,
        confidence: 0.85,
      },
      instant: {
        maxFeePerGas: BigInt(Math.floor(parseFloat(result.FastGasPrice) * 1.2 * 1e9)),
        maxPriorityFeePerGas: BigInt(3e9), // 3 gwei
        estimatedWait: 5,
        confidence: 0.8,
      },
      baseFee,
      nextBaseFee: baseFee, // Etherscan doesn't provide next block estimate
      congestion: this.getCongestionLevel(parseFloat(result.ProposeGasPrice)),
      utilizationPercent: 0, // Not available from Etherscan
    };
  }

  /**
   * Fetch from window.ethereum provider
   */
  private async fetchFromProvider(chainId: number): Promise<GasPriceData> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No provider available');
    }

    const gasPriceHex = await window.ethereum.request({
      method: 'eth_gasPrice',
      params: [],
    });

    const gasPrice = BigInt(gasPriceHex);
    const gasPriceGwei = Number(gasPrice) / 1e9;

    // Estimate fee history for better accuracy
    let baseFee = gasPrice;
    try {
      const feeHistory = await window.ethereum.request({
        method: 'eth_feeHistory',
        params: ['0x5', 'latest', [25, 50, 75]],
      });

      if (feeHistory?.baseFeePerGas?.length > 0) {
        baseFee = BigInt(feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1]);
      }
    } catch {
      // Fee history not supported
    }

    return {
      timestamp: Date.now(),
      chainId,
      slow: {
        maxFeePerGas: BigInt(Math.floor(Number(gasPrice) * 0.8)),
        maxPriorityFeePerGas: BigInt(1e9),
        estimatedWait: 180,
        confidence: 0.85,
      },
      normal: {
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: BigInt(1.5e9),
        estimatedWait: 60,
        confidence: 0.85,
      },
      fast: {
        maxFeePerGas: BigInt(Math.floor(Number(gasPrice) * 1.2)),
        maxPriorityFeePerGas: BigInt(2e9),
        estimatedWait: 15,
        confidence: 0.8,
      },
      instant: {
        maxFeePerGas: BigInt(Math.floor(Number(gasPrice) * 1.5)),
        maxPriorityFeePerGas: BigInt(3e9),
        estimatedWait: 5,
        confidence: 0.75,
      },
      baseFee,
      nextBaseFee: baseFee,
      congestion: this.getCongestionLevel(gasPriceGwei),
      utilizationPercent: 0,
    };
  }

  /**
   * Aggregate results from multiple sources
   */
  private aggregateResults(results: GasPriceData[]): GasPriceData {
    if (results.length === 1) return results[0]!;

    // Use median values
    const medianBigInt = (values: bigint[]): bigint => {
      const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      return sorted[Math.floor(sorted.length / 2)]!;
    };

    return {
      timestamp: Date.now(),
      chainId: results[0]!.chainId,
      slow: {
        maxFeePerGas: medianBigInt(results.map((r) => r.slow.maxFeePerGas)),
        maxPriorityFeePerGas: medianBigInt(results.map((r) => r.slow.maxPriorityFeePerGas)),
        estimatedWait: 180,
        confidence: 0.9,
      },
      normal: {
        maxFeePerGas: medianBigInt(results.map((r) => r.normal.maxFeePerGas)),
        maxPriorityFeePerGas: medianBigInt(results.map((r) => r.normal.maxPriorityFeePerGas)),
        estimatedWait: 60,
        confidence: 0.9,
      },
      fast: {
        maxFeePerGas: medianBigInt(results.map((r) => r.fast.maxFeePerGas)),
        maxPriorityFeePerGas: medianBigInt(results.map((r) => r.fast.maxPriorityFeePerGas)),
        estimatedWait: 15,
        confidence: 0.85,
      },
      instant: {
        maxFeePerGas: medianBigInt(results.map((r) => r.instant.maxFeePerGas)),
        maxPriorityFeePerGas: medianBigInt(results.map((r) => r.instant.maxPriorityFeePerGas)),
        estimatedWait: 5,
        confidence: 0.8,
      },
      baseFee: medianBigInt(results.map((r) => r.baseFee)),
      nextBaseFee: medianBigInt(results.map((r) => r.nextBaseFee)),
      congestion: results[0]!.congestion,
      utilizationPercent: results[0]!.utilizationPercent,
    };
  }

  /**
   * Determine congestion level based on gas price
   */
  private getCongestionLevel(gasPriceGwei: number): GasPriceData['congestion'] {
    if (gasPriceGwei < 20) return 'low';
    if (gasPriceGwei < 50) return 'medium';
    if (gasPriceGwei < 100) return 'high';
    return 'critical';
  }

  /**
   * Get historical gas prices for trend analysis
   */
  async getHistoricalPrices(chainId: number, hours: number = 24): Promise<GasPriceHistory[]> {
    const cacheKey = `history-${chainId}-${hours}`;
    const cached = historyCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL) {
      return cached.data;
    }

    // In production, this would fetch from a database or external API
    // For now, generate mock historical data
    const history = this.generateMockHistory(hours);
    historyCache.set(cacheKey, { data: history, timestamp: Date.now() });
    return history;
  }

  /**
   * Generate mock historical data for development
   */
  private generateMockHistory(hours: number): GasPriceHistory[] {
    const history: GasPriceHistory[] = [];
    const now = Date.now();
    const interval = 5 * 60 * 1000; // 5 minute intervals
    const points = Math.floor((hours * 60 * 60 * 1000) / interval);

    let baseFee = 25 + Math.random() * 20; // Start with random base fee

    for (let i = points; i >= 0; i--) {
      // Simulate realistic gas price fluctuations
      const hourOfDay = new Date(now - i * interval).getUTCHours();
      
      // Higher during business hours
      const businessHourMultiplier = hourOfDay >= 13 && hourOfDay <= 21 ? 1.3 : 1;
      
      // Random walk
      baseFee += (Math.random() - 0.5) * 5;
      baseFee = Math.max(10, Math.min(150, baseFee)); // Clamp between 10-150 gwei

      history.push({
        timestamp: now - i * interval,
        baseFee: baseFee * businessHourMultiplier,
        normal: baseFee * businessHourMultiplier * 1.1,
      });
    }

    return history;
  }

  /**
   * Get optimal timing recommendation
   */
  async getOptimalTiming(
    chainId: number,
    targetGasPrice?: number
  ): Promise<OptimalTimingRecommendation> {
    const [current, history] = await Promise.all([
      this.getCurrentPrices(chainId),
      this.getHistoricalPrices(chainId, 168), // 7 days
    ]);

    const currentNormalGwei = Number(current.normal.maxFeePerGas) / 1e9;
    const _target = targetGasPrice || currentNormalGwei * 0.8; // 20% savings target

    // Analyze historical patterns
    const avgPrice = history.reduce((sum, h) => sum + h.normal, 0) / history.length;
    const minPrice = Math.min(...history.map((h) => h.normal));
    const _maxPrice = Math.max(...history.map((h) => h.normal));

    // Find time patterns for low gas
    const lowGasHours = this.findLowGasHours(history);
    const hoursUntilLowGas = this.getHoursUntilLowGas(lowGasHours);

    // Calculate potential savings
    const savingsPercent = ((currentNormalGwei - minPrice) / currentNormalGwei) * 100;
    
    // Determine recommendation
    let recommendation: string;
    let urgency: OptimalTimingRecommendation['urgency'];

    if (currentNormalGwei <= avgPrice * 0.8) {
      recommendation = 'Gas prices are significantly below average. Great time to transact!';
      urgency = 'send-now';
    } else if (currentNormalGwei <= avgPrice) {
      recommendation = 'Gas prices are around average. Proceed if needed.';
      urgency = 'ok-to-proceed';
    } else {
      recommendation = `Gas prices are above average. Consider waiting ${hoursUntilLowGas}h for better rates.`;
      urgency = 'wait';
    }

    return {
      currentPrice: currentNormalGwei,
      estimatedOptimalPrice: minPrice * 1.1, // Add 10% buffer
      estimatedTime: hoursUntilLowGas * 3600, // Convert to seconds
      savingsPercent: Math.max(0, savingsPercent),
      confidence: 0.75,
      recommendation,
      urgency,
    };
  }

  /**
   * Find hours with historically low gas prices
   */
  private findLowGasHours(history: GasPriceHistory[]): number[] {
    // Group by hour of day
    const hourlyAvg = new Map<number, { sum: number; count: number }>();

    for (const h of history) {
      const hour = new Date(h.timestamp).getUTCHours();
      const current = hourlyAvg.get(hour) || { sum: 0, count: 0 };
      hourlyAvg.set(hour, { sum: current.sum + h.normal, count: current.count + 1 });
    }

    // Calculate averages and find lowest hours
    const hourlyAvgArray = Array.from(hourlyAvg.entries())
      .map(([hour, { sum, count }]) => ({ hour, avg: sum / count }))
      .sort((a, b) => a.avg - b.avg);

    // Return top 4 lowest hours
    return hourlyAvgArray.slice(0, 4).map((h) => h.hour);
  }

  /**
   * Get hours until next low gas period
   */
  private getHoursUntilLowGas(lowGasHours: number[]): number {
    const currentHour = new Date().getUTCHours();

    for (let i = 0; i < 24; i++) {
      const checkHour = (currentHour + i) % 24;
      if (lowGasHours.includes(checkHour)) {
        return i || 24; // If current hour is low gas, return 24 for next cycle
      }
    }

    return 12; // Default fallback
  }

  /**
   * Calculate transaction cost estimate
   */
  calculateCost(
    gasLimit: number,
    gasPrice: bigint,
    ethPrice: number = 2500
  ): { eth: string; usd: string } {
    const costWei = gasPrice * BigInt(gasLimit);
    const costEth = Number(costWei) / 1e18;
    const costUsd = costEth * ethPrice;

    return {
      eth: costEth.toFixed(6),
      usd: costUsd < 0.01 ? '< $0.01' : `$${costUsd.toFixed(2)}`,
    };
  }
}

// Export singleton instance
export const gasPriceService = new GasPriceService();
export default gasPriceService;
