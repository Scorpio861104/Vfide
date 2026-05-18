'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Loader2, TrendingUp, Flame, Heart, Activity } from 'lucide-react';

interface ProtocolStats {
  totalUsers: number;
  totalMerchants: number;
  totalTransactions: number;
  totalVolume: string;
  totalBurned: string;
  totalDonated: string;
  averageProofScore: number;
  activeLenders: number;
  activeLoans: number;
  defaultRate: number;
}

export function TreasuryTab() {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/stats/protocol')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Volume', value: stats ? `${parseFloat(stats.totalVolume).toLocaleString()} VFIDE` : '—', icon: <TrendingUp size={14} className="text-cyan-400" /> },
          { label: 'Total Transactions', value: stats?.totalTransactions.toLocaleString() ?? '—', icon: <Activity size={14} className="text-purple-400" /> },
          { label: 'Total Burned', value: stats ? `${parseFloat(stats.totalBurned).toLocaleString()} VFIDE` : '—', icon: <Flame size={14} className="text-orange-400" /> },
          { label: 'Total Donated', value: stats ? `${parseFloat(stats.totalDonated).toLocaleString()} VFIDE` : '—', icon: <Heart size={14} className="text-red-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-xs text-gray-400">{s.label}</p></div>
            <p className="text-lg font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-green-400" />
          <h3 className="text-white font-semibold text-sm">Protocol Health</h3>
        </div>
        {stats ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Active Lenders</p>
              <p className="text-sm text-white font-semibold">{stats.activeLenders}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Active Loans</p>
              <p className="text-sm text-white font-semibold">{stats.activeLoans}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Default Rate</p>
              <p className={`text-sm font-semibold ${stats.defaultRate > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                {(stats.defaultRate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Total Merchants</p>
              <p className="text-sm text-white font-semibold">{stats.totalMerchants.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Total Members</p>
              <p className="text-sm text-white font-semibold">{stats.totalUsers.toLocaleString()}</p>
            </div>

            {/* default rate gauge */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Loan Health</span>
                <span>{(100 - stats.defaultRate * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-green-500 to-cyan-500"
                  style={{ width: `${100 - stats.defaultRate * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No data available.</p>
        )}
      </div>
    </div>
  );
}
