'use client';

import { ArrowRight, TrendingUp } from 'lucide-react';

export function RevenueTab() {
  const payees = [
    { name: 'Burn Address', share: 86, description: 'Deflationary burn' },
    { name: 'Sanctum Vault', share: 3, description: 'Charity fund' },
    { name: 'Ecosystem Vault', share: 11, description: 'Operations & rewards' },
  ];

  return (
    <div className="space-y-8">
      {/* Revenue Splitter Overview */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 sm:p-6 md:p-8 ring-effect">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="w-12 h-12 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Revenue Splitter</h2>
            <p className="text-zinc-400">Automatically distributes transfer fees to designated recipients</p>
          </div>
        </div>
      </div>

      {/* Revenue Flow */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Fee Flow</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="p-4 bg-zinc-900 rounded-lg text-center">
            <div className="text-zinc-100 font-bold">Transfer Fees</div>
            <div className="text-xs text-zinc-400">0.25% - 5%</div>
          </div>
          <ArrowRight className="text-cyan-400" />
          <div className="p-4 bg-zinc-900 rounded-lg text-center">
            <div className="text-zinc-100 font-bold">BurnRouter</div>
            <div className="text-xs text-zinc-400">Calculates splits</div>
          </div>
          <ArrowRight className="text-cyan-400" />
          <div className="p-4 bg-zinc-900 rounded-lg text-center">
            <div className="text-zinc-100 font-bold">RevenueSplitter</div>
            <div className="text-xs text-zinc-400">Distributes</div>
          </div>
        </div>
      </div>

      {/* Payees */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Distribution Recipients</h3>
        <div className="space-y-4">
          {payees.map((payee, idx) => (
            <div key={idx} className="p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-zinc-100 font-bold">{payee.name}</div>
                  <div className="text-xs text-zinc-400">{payee.description}</div>
                </div>
                <div className="text-2xl font-bold text-cyan-400">{payee.share}%</div>
              </div>
              <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    payee.name === 'Burn Address' ? 'bg-orange-500' :
                    payee.name === 'Sanctum Vault' ? 'bg-pink-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${payee.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
