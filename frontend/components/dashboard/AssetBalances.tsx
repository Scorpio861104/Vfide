"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Asset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  change24h: number;
  icon?: string;
}

interface AssetBalancesProps {
  assets?: Asset[];
  className?: string;
}

const defaultAssets: Asset[] = [
  { symbol: 'VFIDE', name: 'VFIDE Token', balance: '0', value: '$0.00', change24h: 0 },
  { symbol: 'ETH', name: 'Ethereum', balance: '0', value: '$0.00', change24h: 0 },
  { symbol: 'USDC', name: 'USD Coin', balance: '0', value: '$0.00', change24h: 0 },
];

/**
 * AssetBalances Component
 * Displays user's asset balances with values and 24h changes
 */
export default function AssetBalances({ 
  assets = defaultAssets, 
  className = '' 
}: AssetBalancesProps) {
  return (
    <div className={`p-6 bg-[#0F0F14] rounded-xl border border-[#2A2A2F] ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Asset Balances</h3>
      
      <div className="space-y-3">
        {assets.map((asset, index) => (
          <motion.div
            key={asset.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-[#1A1A1F] rounded-lg hover:bg-[#2A2A2F] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              {/* Asset Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#00F0FF] to-[#FF6B9D] flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {asset.symbol.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-white">{asset.symbol}</p>
                  <p className="text-sm text-gray-400">{asset.name}</p>
                </div>
              </div>

              {/* Balance and Value */}
              <div className="text-right">
                <p className="font-semibold text-white">{asset.balance}</p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-gray-400">{asset.value}</span>
                  {asset.change24h !== 0 && (
                    <span
                      className={`flex items-center gap-0.5 ${
                        asset.change24h > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {asset.change24h > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(asset.change24h).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No assets found</p>
          <p className="text-sm mt-1">Connect your wallet to view balances</p>
        </div>
      )}
    </div>
  );
}
