"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fuel, TrendingUp, TrendingDown, Minus, Bell, BellOff, RefreshCw } from 'lucide-react';
import { useGasPrice } from '@/hooks/useGasPrice';

/**
 * Gas Price Alert Component
 * 
 * Features:
 * - Real-time gas price display
 * - Price trend indicator
 * - Low gas alerts
 * - Customizable threshold
 */

interface GasPriceAlertProps {
  compact?: boolean;
}

export function GasPriceAlert({ compact = false }: GasPriceAlertProps) {
  const {
    gasPrice,
    isLoading,
    error,
    alert,
    trend,
    setAlertEnabled,
    setAlertThreshold,
    formatGwei,
    refresh,
  } = useGasPrice();

  const [showSettings, setShowSettings] = useState(false);

  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-red-400', label: 'Rising' },
    down: { icon: TrendingDown, color: 'text-green-400', label: 'Falling' },
    stable: { icon: Minus, color: 'text-zinc-400', label: 'Stable' },
  };

  const TrendIcon = trendConfig[trend].icon;

  if (compact) {
    return (
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        <Fuel size={14} className="text-amber-400" />
        <span className="text-xs text-white">
          {isLoading ? '...' : gasPrice ? `${formatGwei(gasPrice.standard)} gwei` : '—'}
        </span>
        <TrendIcon size={12} className={trendConfig[trend].color} />
      </button>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Fuel className="text-amber-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Gas Price</h3>
              <div className="flex items-center gap-2">
                <TrendIcon size={14} className={trendConfig[trend].color} />
                <span className={`text-xs ${trendConfig[trend].color}`}>
                  {trendConfig[trend].label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setAlertEnabled(!alert.enabled)}
              className={`p-2 rounded-lg transition-colors ${
                alert.enabled 
                  ? 'text-amber-400 bg-amber-500/20' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {alert.enabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Gas Prices */}
      {error ? (
        <div className="p-4 text-center text-red-400 text-sm">{error}</div>
      ) : (
        <div className="p-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Low', value: gasPrice?.low, color: 'text-green-400' },
            { label: 'Standard', value: gasPrice?.standard, color: 'text-cyan-400' },
            { label: 'Fast', value: gasPrice?.fast, color: 'text-yellow-400' },
            { label: 'Instant', value: gasPrice?.instant, color: 'text-orange-400' },
          ].map(tier => (
            <div key={tier.label} className="text-center">
              <p className="text-xs text-zinc-500 mb-1">{tier.label}</p>
              <p className={`text-lg font-bold ${tier.color}`}>
                {isLoading ? '...' : tier.value ? formatGwei(tier.value) : '—'}
              </p>
              <p className="text-xs text-zinc-600">gwei</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert Settings */}
      <AnimatePresence>
        {alert.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-zinc-800"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-zinc-400">Alert when below:</span>
                <span className="text-sm font-bold text-amber-400">
                  {alert.threshold} gwei
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={alert.threshold}
                onChange={e => setAlertThreshold(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between mt-1 text-xs text-zinc-600">
                <span>1 gwei</span>
                <span>100 gwei</span>
              </div>
              
              {alert.notified && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 p-2 bg-green-500/10 rounded-lg text-center"
                >
                  <span className="text-xs text-green-400">
                    ✓ Low gas alert triggered!
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact inline gas indicator for navbar
 */
export function GasIndicator() {
  const { gasPrice, isLoading, trend, formatGwei } = useGasPrice();

  const trendColors = {
    up: 'text-red-400',
    down: 'text-green-400',
    stable: 'text-zinc-400',
  };

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Fuel size={12} className="text-amber-400" />
      <span className={isLoading ? 'text-zinc-500' : trendColors[trend]}>
        {isLoading ? '...' : gasPrice ? `${formatGwei(gasPrice.standard)}` : '—'}
      </span>
    </div>
  );
}
