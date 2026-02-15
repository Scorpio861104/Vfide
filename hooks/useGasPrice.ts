'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChainId } from 'wagmi';

/**
 * Gas Price Monitor Hook
 * 
 * Features:
 * - Real-time gas price monitoring
 * - Low gas alerts (customizable threshold)
 * - Price history for trend analysis
 * - Auto-refresh every 15 seconds
 */

export interface GasPrice {
  low: number;      // Gwei
  standard: number; // Gwei
  fast: number;     // Gwei
  instant: number;  // Gwei
  timestamp: number;
}

export interface GasAlert {
  enabled: boolean;
  threshold: number; // Gwei - alert when standard price drops below this
  notified: boolean;
}

const STORAGE_KEY = 'vfide-gas-alert';
const POLL_INTERVAL = 15000; // 15 seconds
const HISTORY_LENGTH = 20;   // Keep last 20 readings

// Default thresholds (in Gwei) for different chains
const DEFAULT_THRESHOLDS: Record<number, number> = {
  1: 20,      // Ethereum mainnet - alert below 20 gwei
  8453: 0.01, // Base - alert below 0.01 gwei
  84532: 0.01, // Base Sepolia
  42161: 0.1, // Arbitrum
  137: 30,    // Polygon
  10: 0.01,   // Optimism
};

export function useGasPrice() {
  const chainId = useChainId();
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null);
  const [history, setHistory] = useState<GasPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<GasAlert>({
    enabled: false,
    threshold: DEFAULT_THRESHOLDS[chainId] || 20,
    notified: false,
  });
  
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const lastAlertTime = useRef<number>(0);

  // Load alert settings from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAlert(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Update threshold when chain changes
  useEffect(() => {
    setAlert(prev => ({
      ...prev,
      threshold: DEFAULT_THRESHOLDS[chainId] || 20,
      notified: false,
    }));
  }, [chainId]);

  // Trigger alert notification
  const triggerAlert = useCallback((price: GasPrice) => {
    // Check for notification permission
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⛽ Low Gas Alert!', {
        body: `Gas price is now ${price.standard.toFixed(2)} Gwei - good time to transact!`,
        icon: '/icons/gas-icon.png',
        tag: 'gas-alert',
      });
    }

    // Dispatch custom event for in-app notification
    window.dispatchEvent(new CustomEvent('gas-alert', { detail: price }));
    
    setAlert(prev => ({ ...prev, notified: true }));
  }, []);

  // Fetch gas price from RPC
  const fetchGasPrice = useCallback(async () => {
    try {
      // Use window.ethereum if available
      if (!window.ethereum) {
        throw new Error('No wallet connected');
      }

      const gasPriceHex = await window.ethereum.request({
        method: 'eth_gasPrice',
        params: [],
      });

      const gasPriceWei = parseInt(gasPriceHex, 16);
      if (isNaN(gasPriceWei) || !isFinite(gasPriceWei)) {
        throw new Error('Invalid gas price from provider');
      }
      
      const gasPriceGwei = gasPriceWei / 1e9;

      // Estimate different speed tiers
      const newPrice: GasPrice = {
        low: gasPriceGwei * 0.8,
        standard: gasPriceGwei,
        fast: gasPriceGwei * 1.2,
        instant: gasPriceGwei * 1.5,
        timestamp: Date.now(),
      };

      setGasPrice(newPrice);
      setHistory(prev => [...prev.slice(-(HISTORY_LENGTH - 1)), newPrice]);
      setError(null);

      // Check alert
      if (alert.enabled && newPrice.standard <= alert.threshold) {
        const now = Date.now();
        // Only alert once every 5 minutes
        if (now - lastAlertTime.current > 5 * 60 * 1000) {
          triggerAlert(newPrice);
          lastAlertTime.current = now;
        }
      }

      return newPrice;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch gas price';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [alert.enabled, alert.threshold, triggerAlert]);

  // Enable/disable alerts
  const setAlertEnabled = useCallback((enabled: boolean) => {
    setAlert(prev => {
      const updated = { ...prev, enabled, notified: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Request notification permission
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Update threshold
  const setAlertThreshold = useCallback((threshold: number) => {
    setAlert(prev => {
      const updated = { ...prev, threshold, notified: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Calculate trend (up, down, stable)
  const getTrend = useCallback((): 'up' | 'down' | 'stable' => {
    if (history.length < 3) return 'stable';
    
    const recent = history.slice(-3);
    const first = recent[0]?.standard ?? 0;
    const last = recent[recent.length - 1]?.standard ?? 0;
    const change = ((last - first) / first) * 100;
    
    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  }, [history]);

  // Start polling
  useEffect(() => {
    fetchGasPrice();
    
    pollInterval.current = setInterval(fetchGasPrice, POLL_INTERVAL);
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [fetchGasPrice]);

  // Format gas price for display
  const formatGwei = useCallback((gwei: number): string => {
    if (gwei < 0.01) return '< 0.01';
    if (gwei < 1) return gwei.toFixed(3);
    if (gwei < 10) return gwei.toFixed(2);
    return gwei.toFixed(1);
  }, []);

  // Estimate transaction cost in USD (assuming ETH price)
  const estimateCost = useCallback((gasLimit: number, ethPrice: number = 2500): {
    low: string;
    standard: string;
    fast: string;
  } | null => {
    if (!gasPrice) return null;
    
    const calculate = (gweiPrice: number) => {
      const ethCost = (gasLimit * gweiPrice) / 1e9;
      const usdCost = ethCost * ethPrice;
      return usdCost < 0.01 ? '< $0.01' : `$${usdCost.toFixed(2)}`;
    };
    
    return {
      low: calculate(gasPrice.low),
      standard: calculate(gasPrice.standard),
      fast: calculate(gasPrice.fast),
    };
  }, [gasPrice]);

  return {
    gasPrice,
    history,
    isLoading,
    error,
    alert,
    trend: getTrend(),
    setAlertEnabled,
    setAlertThreshold,
    formatGwei,
    estimateCost,
    refresh: fetchGasPrice,
  };
}
