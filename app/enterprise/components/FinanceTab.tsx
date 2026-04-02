'use client';

import { Shield, TrendingUp, Zap } from 'lucide-react';

export function FinanceTab() {
  const treasuryAssets = [
    { token: 'VFIDE', balance: '100,000,000', value: '$7,000,000' },
    { token: 'USDC', balance: '2,500,000', value: '$2,500,000' },
    { token: 'ETH', balance: '500', value: '$1,750,000' },
  ];

  return (
    <div className="space-y-8">
      {/* Finance Overview */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="w-12 h-12 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Treasury Finance</h2>
            <p className="text-zinc-400">Protocol treasury management and multi-token tracking</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">$11.25M</div>
            <div className="text-sm text-zinc-400">Total Treasury Value</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">3</div>
            <div className="text-sm text-zinc-400">Token Types</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">DAO</div>
            <div className="text-sm text-zinc-400">Controlled By</div>
          </div>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Treasury Assets</h3>
        <div className="space-y-4">
          {treasuryAssets.map((asset, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {asset.token.charAt(0)}
                </div>
                <div>
                  <div className="text-zinc-100 font-bold">{asset.token}</div>
                  <div className="text-xs text-zinc-400">{asset.balance}</div>
                </div>
              </div>
              <div className="text-cyan-400 font-bold">{asset.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Treasury Actions */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Treasury Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-900 rounded-lg">
            <Zap className="text-cyan-400 mb-3" size={24} />
            <div className="text-zinc-100 font-bold mb-1">Send VFIDE</div>
            <div className="text-xs text-zinc-400 mb-3">DAO-approved disbursements</div>
            <button className="w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed">
              DAO Only
            </button>
          </div>
          <div className="p-4 bg-zinc-900 rounded-lg">
            <Shield className="text-purple-400 mb-3" size={24} />
            <div className="text-zinc-100 font-bold mb-1">Rescue Tokens</div>
            <div className="text-xs text-zinc-400 mb-3">Recover accidentally sent tokens</div>
            <button className="w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed">
              DAO Only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
