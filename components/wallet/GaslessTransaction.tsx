'use client';
import { log } from '@/lib/logging';

/**
 * Gasless Transaction UI Component
 * 
 * Shows sponsorship status and enables gasless transactions
 * when a paymaster is available.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type Address, type Hex, formatEther } from 'viem';
import {
  Zap,
  Sparkles,
  Loader2,
  Info,
  RefreshCcw,
  Gift,
} from 'lucide-react';
import { usePaymaster, type SponsorshipResult } from '@/lib/paymaster/paymasterService';

// ==================== TYPES ====================

export interface GaslessBannerProps {
  /** Target contract address */
  targetContract?: Address;
  /** Transaction call data */
  callData?: Hex;
  /** Transaction value */
  value?: bigint;
  /** Callback when sponsorship status changes */
  onSponsorshipChange?: (sponsored: boolean) => void;
  /** Custom class name */
  className?: string;
}

export interface GaslessStatusProps {
  /** Whether to show compact version */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ==================== GASLESS BANNER ====================

export function GaslessBanner({
  targetContract,
  callData,
  value,
  onSponsorshipChange,
  className = '',
}: GaslessBannerProps) {
  const { canSponsor, isAvailable, isLoading } = usePaymaster();
  const [sponsorship, setSponsorship] = useState<SponsorshipResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!targetContract || !callData || !isAvailable) {
      setSponsorship(null);
      return;
    }

    const checkSponsorship = async () => {
      setChecking(true);
      try {
        const result = await canSponsor(targetContract, callData, value);
        setSponsorship(result);
        onSponsorshipChange?.(result.sponsored);
      } finally {
        setChecking(false);
      }
    };

    checkSponsorship();
  }, [targetContract, callData, value, canSponsor, isAvailable, onSponsorshipChange]);

  if (!isAvailable || isLoading) {
    return null;
  }

  if (checking) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Checking for gas sponsorship...</span>
      </div>
    );
  }

  if (!sponsorship) {
    return null;
  }

  if (sponsorship.sponsored) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          flex items-center gap-3 px-4 py-3 
          bg-linear-to-r from-green-50 to-emerald-50 
          dark:from-green-900/20 dark:to-emerald-900/20
          border border-green-200 dark:border-green-800
          rounded-xl ${className}
        `}
      >
        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
          <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-green-700 dark:text-green-300">
            🎉 Gas fees sponsored!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            This transaction is free • No gas required
          </p>
        </div>
        {sponsorship.estimatedSavingsWei && (
          <div className="text-right">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Saving
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {parseFloat(formatEther(sponsorship.estimatedSavingsWei)).toFixed(6)} ETH
            </p>
          </div>
        )}
      </motion.div>
    );
  }

  // Not sponsored
  return (
    <div className={`flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`}>
      <Info className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-gray-500">
        {sponsorship.reason || 'Gas fees apply for this transaction'}
      </span>
    </div>
  );
}

// ==================== GASLESS STATUS ====================

export function GaslessStatus({ compact = false, className = '' }: GaslessStatusProps) {
  const { stats, isAvailable, isLoading, refresh } = usePaymaster();

  if (!isAvailable) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const usedPercentage = stats.dailyLimitWei > 0
    ? Number((stats.dailyUsedWei * BigInt(100)) / stats.dailyLimitWei)
    : 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Zap className="w-4 h-4 text-green-500" />
        <span className="text-sm">
          {parseFloat(formatEther(stats.remainingToday)).toFixed(4)} ETH remaining today
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">Gas Sponsorship</h3>
        </div>
        <button
          onClick={refresh}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCcw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Sponsored Today</p>
          <p className="text-2xl font-bold">{stats.transactionsSponsored}</p>
          <p className="text-sm text-gray-500">transactions</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Value Saved</p>
          <p className="text-2xl font-bold">
            {parseFloat(formatEther(stats.totalSponsored)).toFixed(4)}
          </p>
          <p className="text-sm text-gray-500">ETH</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Daily Limit</span>
          <span>{usedPercentage}% used</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usedPercentage}%` }}
            className={`h-full rounded-full ${
              usedPercentage > 80 ? 'bg-red-500' : usedPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {parseFloat(formatEther(stats.remainingToday)).toFixed(4)} ETH remaining
        </p>
      </div>
    </div>
  );
}

// ==================== GASLESS TOGGLE ====================

export interface GaslessToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  available?: boolean;
  className?: string;
}

export function GaslessToggle({ enabled, onToggle, available = true, className = '' }: GaslessToggleProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <Zap className={`w-5 h-5 ${enabled ? 'text-green-500' : 'text-gray-400'}`} />
        <div>
          <p className="font-medium text-sm">Gasless Transaction</p>
          <p className="text-xs text-gray-500">
            {available ? 'Sponsored gas available' : 'Not available for this transaction'}
          </p>
        </div>
      </div>
      <button
        onClick={() => available && onToggle(!enabled)}
        disabled={!available}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
          ${!available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <motion.div
          animate={{ x: enabled ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        />
      </button>
    </div>
  );
}

export default GaslessBanner;
