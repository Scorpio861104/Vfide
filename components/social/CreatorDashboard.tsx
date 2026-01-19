'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { TrendingUp, Users, Unlock, Gift, Sparkles } from 'lucide-react';

/**
 * CreatorDashboard - Comprehensive analytics and earnings management for creators
 */

// Animated number counter
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    if (decimals > 0) return latest.toFixed(decimals);
    return Math.round(latest).toLocaleString();
  });
  const [displayValue, setDisplayValue] = useState('0');
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [rounded]);
  
  return <motion.span>{prefix}{displayValue}{suffix}</motion.span>;
}

interface CreatorStats {
  totalEarnings: string;
  totalTips: number;
  totalUnlocks: number;
  totalSubscribers: number;
  topSupporters: Array<{
    address: string;
    displayName: string;
    amount: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: 'tip' | 'unlock' | 'subscription';
    amount: string;
    from: string;
    timestamp: Date;
  }>;
}

export function CreatorDashboard() {
  const { address } = useAccount();
  const [stats, setStats] = useState<CreatorStats>({
    totalEarnings: '0',
    totalTips: 0,
    totalUnlocks: 0,
    totalSubscribers: 0,
    topSupporters: [],
    recentTransactions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [ethPrice] = useState(2500); // Mock ETH price in USD
  const [showClaimCelebration, setShowClaimCelebration] = useState(false);
  const { playSuccess, playNotification } = useTransactionSounds();

  useEffect(() => {
    const loadStats = async () => {
      if (!address) return;

      setIsLoading(true);
      try {
        // Mock data - in production, fetch from API
        setStats({
          totalEarnings: '2.45',
          totalTips: 127,
          totalUnlocks: 18,
          totalSubscribers: 42,
          topSupporters: [
            { address: '0x742d...bEb', displayName: 'CryptoWhale', amount: '0.85' },
            { address: '0x1234...567', displayName: 'NFTCollector', amount: '0.52' },
            { address: '0x9876...321', displayName: 'DeFiFan', amount: '0.38' },
          ],
          recentTransactions: [
            {
              id: '1',
              type: 'tip',
              amount: '0.05',
              from: '0x742d...bEb',
              timestamp: new Date(Date.now() - 1000 * 60 * 15),
            },
            {
              id: '2',
              type: 'subscription',
              amount: '0.12',
              from: '0x1234...567',
              timestamp: new Date(Date.now() - 1000 * 60 * 60),
            },
            {
              id: '3',
              type: 'unlock',
              amount: '0.10',
              from: '0x9876...321',
              timestamp: new Date(Date.now() - 1000 * 60 * 120),
            },
          ],
        });
      } catch (error) {
        console.error('Failed to load creator stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [address]);

  const usdEarnings = (parseFloat(stats.totalEarnings) * ethPrice).toFixed(2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <motion.div 
          className="rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-purple-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Claim Celebration Overlay */}
      <AnimatePresence>
        {showClaimCelebration && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <motion.div
                className="text-8xl mb-4"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                💰
              </motion.div>
              <p className="text-3xl font-bold text-white">Earnings Claimed!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Earnings Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: 'Total Earnings', value: stats.totalEarnings, suffix: ' ETH', sub: `$${usdEarnings} USD`, icon: '💰', color: 'purple' },
          { label: 'Total Tips', value: stats.totalTips, suffix: '', sub: '+12 this week', icon: '💝', color: 'pink' },
          { label: 'Content Unlocks', value: stats.totalUnlocks, suffix: '', sub: '+3 this week', icon: '🔓', color: 'blue' },
          { label: 'Subscribers', value: stats.totalSubscribers, suffix: '', sub: '+8 this week', icon: '⭐', color: 'yellow' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, borderColor: `rgba(var(--${stat.color}-500), 0.5)` }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              <motion.span
                className="text-2xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                {stat.icon}
              </motion.span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {typeof stat.value === 'string' ? (
                <AnimatedNumber value={parseFloat(stat.value)} suffix={stat.suffix} decimals={2} />
              ) : (
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              )}
            </div>
            <motion.div 
              className="text-sm text-green-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              {stat.sub}
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Breakdown */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
        <div className="space-y-4">
          {[
            { icon: '💰', label: 'Tips', count: stats.totalTips, amount: '1.15', pct: 47, color: 'purple' },
            { icon: '🔓', label: 'Content Unlocks', count: stats.totalUnlocks, amount: '0.80', pct: 33, color: 'blue' },
            { icon: '⭐', label: 'Subscriptions', count: stats.totalSubscribers, amount: '0.50', pct: 20, color: 'green' }
          ].map((item, index) => (
            <motion.div 
              key={item.label}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className={`w-10 h-10 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900/20 flex items-center justify-center`}
                  whileHover={{ scale: 1.1, rotate: 10 }}
                >
                  {item.icon}
                </motion.div>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-gray-500">{item.count} transactions</div>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-${item.color}-500 rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <div>
                  <div className="font-semibold">{item.amount} ETH</div>
                  <div className="text-sm text-gray-500">{item.pct}%</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Supporters */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-lg font-semibold mb-4">Top Supporters</h3>
          <div className="space-y-3">
            {stats.topSupporters.map((supporter, index) => (
              <motion.div 
                key={supporter.address} 
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="text-2xl"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.8 + index * 0.15 }}
                  >
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </motion.div>
                  <div>
                    <div className="font-medium">{supporter.displayName}</div>
                    <div className="text-sm text-gray-500">{supporter.address}</div>
                  </div>
                </div>
                <motion.div 
                  className="font-semibold"
                  whileHover={{ scale: 1.1 }}
                >
                  {supporter.amount} ETH
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {stats.recentTransactions.map((tx, index) => (
              <motion.div 
                key={tx.id} 
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.05)', borderRadius: 8 }}
              >
                <div className="flex items-center gap-3 p-2">
                  <motion.div 
                    className="text-2xl"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                  >
                    {tx.type === 'tip' ? '💰' : tx.type === 'unlock' ? '🔓' : '⭐'}
                  </motion.div>
                  <div>
                    <div className="font-medium capitalize">{tx.type}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <motion.div 
                    className="font-semibold text-green-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                  >
                    +{tx.amount} ETH
                  </motion.div>
                  <div className="text-sm text-gray-500">{tx.from}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Claim Earnings */}
      <motion.div 
        className="bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Available to Claim</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Withdraw your earnings to your wallet
            </p>
          </div>
          <motion.button 
            className="px-6 py-3 bg-linear-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ boxShadow: ['0 0 0px rgba(139, 92, 246, 0)', '0 0 20px rgba(139, 92, 246, 0.5)', '0 0 0px rgba(139, 92, 246, 0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            onClick={() => {
              setShowClaimCelebration(true);
              playSuccess();
              setTimeout(() => setShowClaimCelebration(false), 3000);
            }}
          >
            <Sparkles className="w-4 h-4" />
            Claim {stats.totalEarnings} ETH
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
