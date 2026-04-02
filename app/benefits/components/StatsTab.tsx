'use client';

import { Clock, Coins, TrendingUp, Users } from 'lucide-react';

export function StatsTab({ isConnected = false, address }: { isConnected?: boolean; address?: string }) {
  if (!isConnected) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
        <TrendingUp className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-100 mb-2">Connect Wallet to View Stats</h3>
        <p className="text-zinc-400">Connect your wallet to see your membership statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Summary */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            G
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Gold Member</h2>
            <p className="text-zinc-400 text-sm mb-2">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                Gold Tier
              </span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                ProofScore: 68
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Coins className="text-yellow-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">52,450</div>
          <div className="text-sm text-zinc-400">VFIDE Balance</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <TrendingUp className="text-green-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">3,420</div>
          <div className="text-sm text-zinc-400">Total Earned</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Users className="text-purple-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">7</div>
          <div className="text-sm text-zinc-400">Referrals</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Clock className="text-cyan-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">145</div>
          <div className="text-sm text-zinc-400">Days Active</div>
        </div>
      </div>

      {/* Activity History */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'Governance vote cast', amount: '+10 XP', time: '2 hours ago' },
            { action: 'ProofScore increased', amount: '+5 points', time: '3 days ago' },
            { action: 'Daily check-in', amount: '+50 XP', time: '5 days ago' },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
              <div>
                <div className="text-zinc-100 text-sm">{activity.action}</div>
                <div className="text-xs text-zinc-400">{activity.time}</div>
              </div>
              <span className="text-purple-400 font-bold">{activity.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Tier Progress */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Progress to Platinum</h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">52,450 / 250,000 VFIDE</span>
            <span className="text-cyan-400">21%</span>
          </div>
          <div className="h-3 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-[#E5E4E2] w-[21%] rounded-full" />
          </div>
        </div>
        <p className="text-zinc-400 text-sm">
          You need 197,550 more VFIDE to reach Platinum tier.
        </p>
      </div>
    </div>
  );
}
