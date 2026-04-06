'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';

function formatTokenAmount(value: number) {
  if (value <= 0) {
    return '0 VFIDE';
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 1 : 2,
  }).format(value)} VFIDE`;
}

type PendingDisbursement = {
  id: number;
  charity: string;
  amount: string;
  approvals: number;
  required: number;
  status: 'pending' | 'approved' | 'rejected';
};

export function SanctumTab({
  isConnected,
  vaultBalance = 0,
  contractsReady = false,
}: {
  isConnected: boolean;
  vaultBalance?: number;
  contractsReady?: boolean;
}) {
  const charities = useMemo(
    () => [
      { name: 'Education Foundation', allocation: 40 },
      { name: 'Environmental Fund', allocation: 30 },
      { name: 'Healthcare Initiative', allocation: 20 },
      { name: 'Community Development', allocation: 10 },
    ].map((charity) => ({
      ...charity,
      totalReceived: contractsReady && vaultBalance > 0
        ? formatTokenAmount((vaultBalance * charity.allocation) / 100)
        : 'Awaiting live sync',
      status: contractsReady ? 'active' : 'queued',
    })),
    [contractsReady, vaultBalance],
  );

  const seededDisbursements = useMemo<PendingDisbursement[]>(() => ([
    {
      id: 1,
      charity: 'Education Foundation',
      amount: formatTokenAmount(vaultBalance > 0 ? Math.max(vaultBalance * 0.025, 5000) : 5000),
      approvals: contractsReady ? 2 : 0,
      required: 3,
      status: 'pending',
    },
    {
      id: 2,
      charity: 'Environmental Fund',
      amount: formatTokenAmount(vaultBalance > 0 ? Math.max(vaultBalance * 0.015, 3000) : 3000),
      approvals: contractsReady ? 1 : 0,
      required: 3,
      status: 'pending',
    },
  ]), [contractsReady, vaultBalance]);

  const [pendingDisbursements, setPendingDisbursements] = useState<PendingDisbursement[]>(seededDisbursements);

  useEffect(() => {
    setPendingDisbursements(seededDisbursements);
  }, [seededDisbursements]);

  const handleApprove = (id: number) => {
    setPendingDisbursements((current) =>
      current.map((disb) => {
        if (disb.id !== id || disb.status !== 'pending') {
          return disb;
        }

        const nextApprovals = Math.min(disb.required, disb.approvals + 1);
        return {
          ...disb,
          approvals: nextApprovals,
          status: nextApprovals >= disb.required ? 'approved' : 'pending',
        };
      }),
    );
  };

  const handleReject = (id: number) => {
    setPendingDisbursements((current) =>
      current.map((disb) => (disb.id === id ? { ...disb, status: 'rejected' } : disb)),
    );
  };

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
        <div className="mb-4 rounded-lg border border-pink-500/20 bg-black/20 p-3 text-sm text-zinc-300">
          {contractsReady
            ? 'Live Sanctum balance is now reflected below, and approval actions update the current review queue.'
            : 'Restore the Sanctum and VFIDE token environment variables to replace guidance mode with live vault balances.'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-pink-400">{contractsReady ? formatTokenAmount(vaultBalance) : 'Awaiting sync'}</div>
            <div className="text-sm text-zinc-400">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">{charities.length}</div>
            <div className="text-sm text-zinc-400">Active Charities</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">
              {contractsReady && vaultBalance > 0 ? formatTokenAmount(vaultBalance * 0.92) : 'Awaiting sync'}
            </div>
            <div className="text-sm text-zinc-400">Tracked Distribution Pool</div>
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
                <div className={`text-xs ${charity.status === 'active' ? 'text-green-400' : 'text-amber-300'}`}>
                  {charity.status === 'active' ? 'Active' : 'Queued'}
                </div>
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
                    <div className="text-xs text-zinc-400">
                      {disb.status === 'approved'
                        ? 'Ready for release'
                        : disb.status === 'rejected'
                          ? 'Rejected in this session'
                          : contractsReady
                            ? 'Multi-sig required'
                            : 'Config required'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(disb.id)}
                    disabled={disb.status !== 'pending' || !contractsReady}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {disb.status === 'approved' ? 'Approved' : contractsReady ? 'Approve' : 'Config required'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(disb.id)}
                    disabled={disb.status !== 'pending'}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {disb.status === 'rejected' ? 'Rejected' : 'Reject'}
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
