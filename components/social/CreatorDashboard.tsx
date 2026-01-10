'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

/**
 * CreatorDashboard - Comprehensive analytics and earnings management for creators
 */

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Earnings Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Earnings</div>
          <div className="text-2xl font-bold mb-1">{stats.totalEarnings} ETH</div>
          <div className="text-sm text-gray-500">${usdEarnings} USD</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tips</div>
          <div className="text-2xl font-bold">{stats.totalTips}</div>
          <div className="text-sm text-green-600">+12 this week</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Content Unlocks</div>
          <div className="text-2xl font-bold">{stats.totalUnlocks}</div>
          <div className="text-sm text-green-600">+3 this week</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Subscribers</div>
          <div className="text-2xl font-bold">{stats.totalSubscribers}</div>
          <div className="text-sm text-green-600">+8 this week</div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                💰
              </div>
              <div>
                <div className="font-medium">Tips</div>
                <div className="text-sm text-gray-500">{stats.totalTips} transactions</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">1.15 ETH</div>
              <div className="text-sm text-gray-500">47%</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                🔓
              </div>
              <div>
                <div className="font-medium">Content Unlocks</div>
                <div className="text-sm text-gray-500">{stats.totalUnlocks} unlocks</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">0.80 ETH</div>
              <div className="text-sm text-gray-500">33%</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                ⭐
              </div>
              <div>
                <div className="font-medium">Subscriptions</div>
                <div className="text-sm text-gray-500">{stats.totalSubscribers} active</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">0.50 ETH</div>
              <div className="text-sm text-gray-500">20%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Supporters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Supporters</h3>
          <div className="space-y-3">
            {stats.topSupporters.map((supporter, index) => (
              <div key={supporter.address} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div>
                    <div className="font-medium">{supporter.displayName}</div>
                    <div className="text-sm text-gray-500">{supporter.address}</div>
                  </div>
                </div>
                <div className="font-semibold">{supporter.amount} ETH</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {stats.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {tx.type === 'tip' ? '💰' : tx.type === 'unlock' ? '🔓' : '⭐'}
                  </div>
                  <div>
                    <div className="font-medium capitalize">{tx.type}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">+{tx.amount} ETH</div>
                  <div className="text-sm text-gray-500">{tx.from}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Claim Earnings */}
      <div className="bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Available to Claim</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Withdraw your earnings to your wallet
            </p>
          </div>
          <button className="px-6 py-3 bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg text-white font-medium transition-all">
            Claim {stats.totalEarnings} ETH
          </button>
        </div>
      </div>
    </div>
  );
}
