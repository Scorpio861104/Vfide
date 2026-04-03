'use client';

import { Shield, TrendingUp, Users, Wallet } from 'lucide-react';

export function EcosystemTab({ isConnected }: { isConnected: boolean }) {
  const allocations = [
    { name: 'Council Operations', percentage: 40, amount: '7.4M VFIDE', icon: Users },
    { name: 'Merchant Service Fees', percentage: 25, amount: '4.6M VFIDE', icon: Wallet },
    { name: 'Referral Work Fees', percentage: 20, amount: '3.7M VFIDE', icon: TrendingUp },
    { name: 'Operations', percentage: 15, amount: '2.8M VFIDE', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* Ecosystem Overview */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-4 sm:p-6 md:p-8 ring-effect">
        <div className="flex items-center gap-4 mb-6">
          <Users className="w-12 h-12 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Ecosystem Vault</h2>
            <p className="text-zinc-400">Funds council operations, verified service fees, and growth initiatives</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">18.5M</div>
            <div className="text-sm text-zinc-400">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">11%</div>
            <div className="text-sm text-zinc-400">Of Transfer Fees</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">42.1M</div>
            <div className="text-sm text-zinc-400">Total Distributed</div>
          </div>
        </div>
      </div>

      {/* Allocation Breakdown */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Allocation Breakdown</h3>
        <div className="space-y-4">
          {allocations.map((alloc, idx) => (
            <div key={idx} className="p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <alloc.icon size={20} className="text-cyan-400" />
                  <span className="text-zinc-100 font-bold">{alloc.name}</span>
                </div>
                <span className="text-cyan-400 font-bold">{alloc.amount}</span>
              </div>
              <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                  style={{ width: `${alloc.percentage}%` }}
                />
              </div>
              <div className="text-right text-xs text-zinc-400 mt-1">{alloc.percentage}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified work payout snapshot */}
      {isConnected && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-4">Verified Work Payouts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900 rounded-lg">
              <div className="text-zinc-400 text-sm mb-1">Merchant Service Fees</div>
              <div className="text-2xl font-bold text-cyan-400">0 USDC</div>
              <button className="mt-3 w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed">
                No Payout Available
              </button>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg">
              <div className="text-zinc-400 text-sm mb-1">Referral Work Fees</div>
              <div className="text-2xl font-bold text-cyan-400">0 USDC</div>
              <button className="mt-3 w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed">
                No Payout Available
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
