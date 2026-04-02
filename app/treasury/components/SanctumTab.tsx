'use client';

import { Heart } from 'lucide-react';

export function SanctumTab({ isConnected }: { isConnected: boolean }) {
  const charities = [
    { name: 'Education Foundation', allocation: 40, totalReceived: '850,000 VFIDE', status: 'active' },
    { name: 'Environmental Fund', allocation: 30, totalReceived: '620,000 VFIDE', status: 'active' },
    { name: 'Healthcare Initiative', allocation: 20, totalReceived: '410,000 VFIDE', status: 'active' },
    { name: 'Community Development', allocation: 10, totalReceived: '205,000 VFIDE', status: 'active' },
  ];

  const pendingDisbursements = [
    { id: 1, charity: 'Education Foundation', amount: '50,000 VFIDE', approvals: 2, required: 3 },
    { id: 2, charity: 'Environmental Fund', amount: '30,000 VFIDE', approvals: 1, required: 3 },
  ];

  return (
    <div className="space-y-8">
      {/* Sanctum Overview */}
      <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-xl p-4 sm:p-6 md:p-8 ring-effect">
        <div className="flex items-center gap-4 mb-6">
          <Heart className="w-12 h-12 text-pink-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Sanctum Charity Vault</h2>
            <p className="text-zinc-400">~3% of all transfer fees fund charitable causes</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-pink-400">2.1M</div>
            <div className="text-sm text-zinc-400">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">4</div>
            <div className="text-sm text-zinc-400">Active Charities</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">2.08M</div>
            <div className="text-sm text-zinc-400">Total Distributed</div>
          </div>
        </div>
      </div>

      {/* Registered Charities */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Registered Charities</h3>
        <div className="space-y-4">
          {charities.map((charity, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <Heart size={20} className="text-pink-400" />
                </div>
                <div>
                  <div className="text-zinc-100 font-bold">{charity.name}</div>
                  <div className="text-xs text-zinc-400">Allocation: {charity.allocation}%</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-cyan-400 font-bold">{charity.totalReceived}</div>
                <div className="text-xs text-green-400">Active</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Disbursements */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Pending Disbursements</h3>
        {!isConnected ? (
          <div className="text-center py-8 text-zinc-400">
            Connect wallet to view and approve disbursements
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDisbursements.map((disb) => (
              <div key={disb.id} className="p-4 bg-zinc-900 rounded-lg border border-yellow-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-zinc-100 font-bold">{disb.charity}</div>
                    <div className="text-cyan-400 font-bold">{disb.amount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">{disb.approvals}/{disb.required} Approvals</div>
                    <div className="text-xs text-zinc-400">Multi-sig required</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors">
                    Approve
                  </button>
                  <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
