'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useHeadhunterStats, useReferralLink } from '@/hooks/useHeadhunterHooks';

export function DashboardTab() {
  const { isConnected } = useAccount();
  const { currentYearPoints, estimatedRank, currentYearNumber, currentQuarterNumber } = useHeadhunterStats();
  const { referralLink, qrCodeUrl } = useReferralLink();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(referralLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-3">Referral Dashboard</h2>
          <p className="text-gray-300">Connect your wallet to participate in the Headhunter Competition, track your rank, and copy your invite link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-bold text-white">Referral Dashboard</h2>
        <p className="text-gray-300">Invite trusted users and merchants to climb the seasonal leaderboard in the Headhunter Competition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="text-sm text-gray-400">Current Points</div>
          <div className="text-3xl font-bold text-white mt-2">{currentYearPoints}</div>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="text-sm text-gray-400">Estimated Rank</div>
          <div className="text-3xl font-bold text-cyan-300 mt-2">#{estimatedRank}</div>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="text-sm text-gray-400">Season</div>
          <div className="text-3xl font-bold text-white mt-2">Q{currentQuarterNumber} {currentYearNumber}</div>
        </div>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-3">
        <h3 className="text-xl font-bold text-white">Referral Link</h3>
        <p className="text-sm text-gray-300 break-all">{referralLink}</p>
        <p className="text-xs text-gray-500">QR preview: {qrCodeUrl}</p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 font-semibold text-cyan-300"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
