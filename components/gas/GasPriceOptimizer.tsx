'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fuel,
  TrendingDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  BellOff,
  RefreshCw,
  ChevronDown,
  Info,
  Zap,
} from 'lucide-react';
import { useChainId } from 'wagmi';
import {
  gasPriceService,
  GasPriceData,
  GasPriceHistory,
  OptimalTimingRecommendation,
} from '@/lib/services/gasPriceService';
import { safeLocalStorage } from '@/lib/utils';

// ==================== TYPES ====================

type SpeedLevel = 'slow' | 'normal' | 'fast' | 'instant';

interface GasPriceOptimizerProps {
  gasLimit?: number;
  ethPrice?: number;
  onSelectGasPrice?: (maxFeePerGas: bigint, maxPriorityFeePerGas: bigint) => void;
  compact?: boolean;
}

// ==================== STORAGE ====================

const ALERT_STORAGE_KEY = 'vfide-gas-alert-settings';

interface AlertSettings {
  enabled: boolean;
  threshold: number; // gwei
}

function loadAlertSettings(): AlertSettings {
  if (typeof window === 'undefined') return { enabled: false, threshold: 30 };
  try {
    const stored = safeLocalStorage.getItem(ALERT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { enabled: false, threshold: 30 };
  } catch {
    return { enabled: false, threshold: 30 };
  }
}

function saveAlertSettings(settings: AlertSettings): void {
  if (typeof window === 'undefined') return;
  safeLocalStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(settings));
}

// ==================== SUB-COMPONENTS ====================

function CongestionBadge({ level }: { level: GasPriceData['congestion'] }) {
  const config = {
    low: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Low' },
    medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Medium' },
    high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'High' },
    critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Critical' },
  };

  const { color, label } = config[level];

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${color}`}>
      {label} Congestion
    </span>
  );
}

function GasSpeedOption({
  speed,
  gwei,
  estimatedWait,
  cost,
  selected,
  onSelect,
}: {
  speed: SpeedLevel;
  gwei: number;
  estimatedWait: number;
  cost: { eth: string; usd: string };
  selected: boolean;
  onSelect: () => void;
}) {
  const speedConfig = {
    slow: { icon: '🐢', label: 'Slow', color: 'text-blue-400' },
    normal: { icon: '🚗', label: 'Normal', color: 'text-green-400' },
    fast: { icon: '🚀', label: 'Fast', color: 'text-yellow-400' },
    instant: { icon: '⚡', label: 'Instant', color: 'text-orange-400' },
  };

  const { icon, label, color } = speedConfig[speed];

  const formatWait = (seconds: number): string => {
    if (seconds < 60) return `~${seconds}s`;
    return `~${Math.round(seconds / 60)}m`;
  };

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-3 rounded-xl border transition-all text-left ${
        selected
          ? 'bg-yellow-500/20 border-yellow-500/50'
          : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        <span className={`text-xs font-medium ${color}`}>{formatWait(estimatedWait)}</span>
      </div>
      <div className="text-sm font-bold text-white mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{gwei.toFixed(1)} <span className="text-xs text-gray-400">gwei</span></div>
      <div className="text-xs text-gray-500 mt-1">{cost.usd}</div>
    </motion.button>
  );
}

function MiniGasChart({ history }: { history: GasPriceHistory[] }) {
  if (history.length === 0) return null;

  const max = Math.max(...history.map((h) => h.normal));
  const min = Math.min(...history.map((h) => h.normal));
  const range = max - min || 1;

  // Sample every nth point to reduce chart complexity
  const sampledHistory = history.filter((_, i) => i % Math.ceil(history.length / 50) === 0);

  const points = sampledHistory
    .map((h, i) => {
      const x = (i / (sampledHistory.length - 1)) * 100;
      const y = 100 - ((h.normal - min) / range) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  const currentPrice = history[history.length - 1]?.normal || 0;
  const avgPrice = history.reduce((sum, h) => sum + h.normal, 0) / history.length;
  const trend = currentPrice < avgPrice ? 'down' : 'up';

  return (
    <div className="relative h-16">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {/* Gradient fill */}
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={trend === 'down' ? '#22c55e' : '#f59e0b'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trend === 'down' ? '#22c55e' : '#f59e0b'} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#chartGradient)"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={trend === 'down' ? '#22c55e' : '#f59e0b'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 text-xs text-gray-500">24h ago</div>
      <div className="absolute bottom-0 right-0 text-xs text-gray-500">Now</div>
    </div>
  );
}

function TimingRecommendation({ recommendation }: { recommendation: OptimalTimingRecommendation }) {
  const urgencyConfig = {
    wait: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    'ok-to-proceed': { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
    'send-now': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  };

  const { icon: Icon, color, bg } = urgencyConfig[recommendation.urgency];

  return (
    <div className={`p-3 rounded-xl border ${bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${color} shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm ${color} font-medium`}>{recommendation.recommendation}</p>
          {recommendation.savingsPercent > 5 && (
            <p className="text-xs text-gray-400 mt-1">
              Potential savings: up to {recommendation.savingsPercent.toFixed(0)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function GasPriceOptimizer({
  gasLimit = 21000,
  ethPrice = 2500,
  onSelectGasPrice,
  compact = false,
}: GasPriceOptimizerProps) {
  const chainId = useChainId();
  const [gasPrice, setGasPrice] = useState<GasPriceData | null>(null);
  const [history, setHistory] = useState<GasPriceHistory[]>([]);
  const [recommendation, setRecommendation] = useState<OptimalTimingRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedLevel>('normal');
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(loadAlertSettings);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Fetch gas prices
  const fetchData = useCallback(async () => {
    try {
      const [priceData, historyData, timingData] = await Promise.all([
        gasPriceService.getCurrentPrices(chainId),
        gasPriceService.getHistoricalPrices(chainId, 24),
        gasPriceService.getOptimalTiming(chainId),
      ]);

      setGasPrice(priceData);
      setHistory(historyData);
      setRecommendation(timingData);
      setError(null);
      setLastRefresh(Date.now());

      // Check alert
      if (alertSettings.enabled) {
        const currentGwei = Number(priceData.normal.maxFeePerGas) / 1e9;
        if (currentGwei <= alertSettings.threshold) {
          triggerAlert(currentGwei);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gas prices');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, alertSettings.enabled, alertSettings.threshold]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Trigger alert notification
  const triggerAlert = useCallback((gwei: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⛽ Low Gas Alert!', {
        body: `Gas is now ${gwei.toFixed(1)} gwei - good time to transact!`,
        icon: '/icons/gas-icon.png',
        tag: 'gas-alert',
      });
    }
  }, []);

  // Toggle alert
  const toggleAlert = useCallback(() => {
    const newSettings = { ...alertSettings, enabled: !alertSettings.enabled };
    setAlertSettings(newSettings);
    saveAlertSettings(newSettings);

    if (newSettings.enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [alertSettings]);

  // Handle speed selection
  const handleSpeedSelect = useCallback(
    (speed: SpeedLevel) => {
      setSelectedSpeed(speed);
      if (gasPrice && onSelectGasPrice) {
        onSelectGasPrice(gasPrice[speed].maxFeePerGas, gasPrice[speed].maxPriorityFeePerGas);
      }
    },
    [gasPrice, onSelectGasPrice]
  );

  // Calculate costs for each speed level
  const costs = useMemo(() => {
    if (!gasPrice) return null;

    return {
      slow: gasPriceService.calculateCost(gasLimit, gasPrice.slow.maxFeePerGas, ethPrice),
      normal: gasPriceService.calculateCost(gasLimit, gasPrice.normal.maxFeePerGas, ethPrice),
      fast: gasPriceService.calculateCost(gasLimit, gasPrice.fast.maxFeePerGas, ethPrice),
      instant: gasPriceService.calculateCost(gasLimit, gasPrice.instant.maxFeePerGas, ethPrice),
    };
  }, [gasPrice, gasLimit, ethPrice]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !gasPrice) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchData}
          className="mt-3 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!gasPrice || !costs) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 ${compact ? 'cursor-pointer hover:bg-zinc-800/50' : ''}`}
        onClick={compact ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Fuel className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              Gas Optimizer
              <CongestionBadge level={gasPrice.congestion} />
            </h3>
            <p className="text-xs text-gray-400">
              Updated {Math.round((Date.now() - lastRefresh) / 1000)}s ago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alert Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleAlert();
            }}
            className={`p-2 rounded-lg transition-colors ${
              alertSettings.enabled
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
            title={alertSettings.enabled ? 'Disable low gas alerts' : 'Enable low gas alerts'}
          >
            {alertSettings.enabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchData();
            }}
            className="p-2 bg-zinc-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Expand/Collapse for compact mode */}
          {compact && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Speed Options */}
              <div className="grid grid-cols-4 gap-2">
                {(['slow', 'normal', 'fast', 'instant'] as SpeedLevel[]).map((speed) => (
                  <GasSpeedOption
                    key={speed}
                    speed={speed}
                    gwei={Number(gasPrice[speed].maxFeePerGas) / 1e9}
                    estimatedWait={gasPrice[speed].estimatedWait}
                    cost={costs[speed]}
                    selected={selectedSpeed === speed}
                    onSelect={() => handleSpeedSelect(speed)}
                  />
                ))}
              </div>

              {/* Chart */}
              {history.length > 0 && (
                <div className="p-3 bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-400">24h Gas Trend</span>
                    {history.length > 1 && history[history.length - 1] && history[0] && (
                      <span className={`text-xs font-medium flex items-center gap-1 ${
                        history[history.length - 1]!.normal < history[0]!.normal
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {history[history.length - 1]!.normal < history[0]!.normal ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {Math.abs(
                          ((history[history.length - 1]!.normal - history[0]!.normal) /
                            history[0]!.normal) *
                            100
                        ).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <MiniGasChart history={history} />
                </div>
              )}

              {/* Timing Recommendation */}
              {recommendation && <TimingRecommendation recommendation={recommendation} />}

              {/* Base Fee Info */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Base Fee: {(Number(gasPrice.baseFee) / 1e9).toFixed(2)} gwei
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Priority: {(Number(gasPrice[selectedSpeed].maxPriorityFeePerGas) / 1e9).toFixed(1)} gwei
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GasPriceOptimizer;
