'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Lock, Loader2, CheckCircle, AlertCircle, TrendingUp, Briefcase, Zap } from 'lucide-react';

interface UserState {
  address: string;
  proofScore: number;
  isMerchant: boolean;
  badges: string[];
  activeLoanCount: number;
  unresolvedDefaults: number;
}

interface ProtocolStats {
  totalUsers: number;
  totalVolume: string;
  averageProofScore: number;
  activeLenders: number;
  activeLoans: number;
}

export function VaultTab() {
  const { address } = useAccount();
  const [state, setState] = useState<UserState | null>(null);
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/user/state?address=${address}`).then((r) => r.json()),
      fetch('/api/stats/protocol').then((r) => r.json()),
    ])
      .then(([s, p]) => {
        setState(s);
        setStats(p);
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view vault status.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  const scoreColor = (state?.proofScore ?? 0) >= 700 ? 'text-green-400' : (state?.proofScore ?? 0) >= 400 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Proof score */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
            <TrendingUp size={18} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Proof Score</p>
            <p className={`text-3xl font-bold ${scoreColor}`}>{state?.proofScore ?? '—'}</p>
          </div>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
            style={{ width: `${Math.min(((state?.proofScore ?? 0) / 1000) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{state?.proofScore ?? 0} / 1000</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={14} className="text-purple-400" />
            <p className="text-xs text-gray-400">Merchant Status</p>
          </div>
          {state?.isMerchant ? (
            <span className="inline-flex items-center gap-1 text-green-400 text-sm font-semibold">
              <CheckCircle size={12} /> Active Merchant
            </span>
          ) : (
            <span className="text-gray-500 text-sm">Not a merchant</span>
          )}
        </div>
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-yellow-400" />
            <p className="text-xs text-gray-400">Active Loans</p>
          </div>
          <p className="text-2xl font-bold text-white">{state?.activeLoanCount ?? 0}</p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-red-400" />
            <p className="text-xs text-gray-400">Unresolved Defaults</p>
          </div>
          <p className={`text-2xl font-bold ${(state?.unresolvedDefaults ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}>{state?.unresolvedDefaults ?? 0}</p>
        </div>
      </div>

      {/* Badges */}
      {state?.badges && state.badges.length > 0 && (
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-3">Active Badges</p>
          <div className="flex flex-wrap gap-2">
            {state.badges.map((b) => (
              <span key={b} className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/20">{b}</span>
            ))}
          </div>
        </div>
      )}

      {/* Protocol context */}
      {stats && (
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-3">Network Overview</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs">Total Users</p><p className="text-white font-semibold">{stats.totalUsers.toLocaleString()}</p></div>
            <div><p className="text-gray-500 text-xs">Avg Proof Score</p><p className="text-white font-semibold">{stats.averageProofScore}</p></div>
            <div><p className="text-gray-500 text-xs">Active Lenders</p><p className="text-white font-semibold">{stats.activeLenders}</p></div>
            <div><p className="text-gray-500 text-xs">Active Loans</p><p className="text-white font-semibold">{stats.activeLoans}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
