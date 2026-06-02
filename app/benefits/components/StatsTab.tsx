'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { Clock, Coins, TrendingUp, Users } from 'lucide-react';
import { formatEther } from 'viem';
import { useVFIDEBalance } from '@/hooks/useVFIDEBalance';
import { useProofScore, getScoreTierObject } from '@/hooks/useProofScore';
import { useHeadhunterStats } from '@/hooks/useHeadhunterHooks';

export function StatsTab({ isConnected = false, address }: { isConnected?: boolean; address?: `0x${string}` }) {
  const { balance, isLoading: balLoading } = useVFIDEBalance(address);
  const { score, isLoading: scoreLoading } = useProofScore(address);
  const { currentYearPoints } = useHeadhunterStats();

  const tierObj = getScoreTierObject(score ?? 0);
  const displayBalance = typeof balance === 'bigint'
    ? parseFloat(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '—';

  if (!isConnected) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
        <TrendingUp className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-100 mb-2">Connect Wallet to View Stats</h3>
        <p className="text-zinc-400">Connect your wallet to see your membership statistics</p>
        <div className="mt-6 flex justify-center">
          <VfideConnectButton size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Summary */}
      <div className="bg-gradient-to-br from-accent/10 to-blue-900/20 border border-accent/30 rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-accent to-blue-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            {tierObj.label.charAt(0)}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">
              {scoreLoading ? '…' : tierObj.label} Member
            </h2>
            <p className="text-zinc-400 text-sm mb-2">
              ProofScore: <span className="font-semibold" style={{ color: tierObj.color }}>{scoreLoading ? '…' : (score ?? 0).toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Coins className="text-yellow-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">{balLoading ? '…' : displayBalance}</div>
          <div className="text-sm text-zinc-400">VFIDE Balance</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <TrendingUp className="text-green-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">{scoreLoading ? '…' : (score ?? 0).toLocaleString()}</div>
          <div className="text-sm text-zinc-400">ProofScore</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Users className="text-purple-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">{currentYearPoints ?? '—'}</div>
          <div className="text-sm text-zinc-400">Referral Points (YTD)</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Clock className="text-blue-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100" style={{ color: tierObj.color }}>
            {scoreLoading ? '…' : tierObj.label}
          </div>
          <div className="text-sm text-zinc-400">Membership Tier</div>
        </div>
      </div>
    </div>
  );
}
