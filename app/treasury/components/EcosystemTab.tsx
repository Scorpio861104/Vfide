'use client';

import { useMemo } from 'react';
import { Shield, TrendingUp, Users, Wallet } from 'lucide-react';

function formatTokenAmount(value: number) {
  if (value <= 0) {
    return '0 VFIDE';
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 1 : 2,
  }).format(value)} VFIDE`;
}

export function EcosystemTab({
  isConnected,
  vaultBalance = 0,
  contractsReady = false,
}: {
  isConnected: boolean;
  vaultBalance?: number;
  contractsReady?: boolean;
}) {
  const allocations = useMemo(
    () => [
      { name: 'Council Operations', percentage: 40, icon: Users },
      { name: 'Merchant Service Fees', percentage: 25, icon: Wallet },
      { name: 'Referral Work Fees', percentage: 20, icon: TrendingUp },
      { name: 'Operations', percentage: 15, icon: Shield },
    ].map((alloc) => ({
      ...alloc,
      amount: contractsReady && vaultBalance > 0
        ? formatTokenAmount((vaultBalance * alloc.percentage) / 100)
        : 'Awaiting live sync',
    })),
    [contractsReady, vaultBalance],
  );

  const payoutCards = [
    {
      label: 'Merchant Service Fees',
      amount: contractsReady && vaultBalance > 0 ? formatTokenAmount(vaultBalance * 0.08) : '0 VFIDE',
    },
    {
      label: 'Referral Work Fees',
      amount: contractsReady && vaultBalance > 0 ? formatTokenAmount(vaultBalance * 0.06) : '0 VFIDE',
    },
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
        <div className="mb-4 rounded-lg border border-cyan-500/20 bg-black/20 p-3 text-sm text-zinc-300">
          {contractsReady
            ? 'This tab now derives its allocation cards from the live ecosystem vault balance when contract reads are available.'
            : 'Restore the Ecosystem vault environment variables to replace guidance mode with live routed balances.'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">{contractsReady ? formatTokenAmount(vaultBalance) : 'Awaiting sync'}</div>
            <div className="text-sm text-zinc-400">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">11%</div>
            <div className="text-sm text-zinc-400">Of Transfer Fees</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">
              {contractsReady && vaultBalance > 0 ? formatTokenAmount(vaultBalance * 0.6) : 'Awaiting sync'}
            </div>
            <div className="text-sm text-zinc-400">Managed Distribution Window</div>
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
            {payoutCards.map((card) => (
              <div key={card.label} className="p-4 bg-zinc-900 rounded-lg">
                <div className="text-zinc-400 text-sm mb-1">{card.label}</div>
                <div className="text-2xl font-bold text-cyan-400">{card.amount}</div>
                <button
                  type="button"
                  disabled={!contractsReady}
                  className="mt-3 w-full rounded-lg bg-zinc-700 py-2 font-bold text-zinc-500 disabled:cursor-not-allowed"
                >
                  {contractsReady ? 'Review Queue' : 'No Payout Available'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
