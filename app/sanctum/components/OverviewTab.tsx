'use client';

/**
 * SanctumOverviewTab — charity & impact fund overview.
 *
 * The Sanctum is VFIDE's on-chain charity fund (SanctumVault.sol):
 *   - Receives 20% of all protocol fees by default (FeeDistributor.sol: sanctumBps=2000, DAO-adjustable)
 *   - Accepts voluntary donations from any address
 *   - Disburses ONLY to DAO-approved charitable organisations
 *   - NOT a token reward system; NOT a buyer-fraud reimbursement pool
 *   - NOT related to token listings or holdings
 *
 * Balance is read live from SanctumVault.getBalance(VFIDEToken).
 */

import { CheckCircle, Shield, Sparkles, Users } from 'lucide-react';
import { useSanctumVault } from '@/hooks/useSanctumVault';
import { GlassCard } from '@/components/ui/GlassCard';

function formatVFIDE(wei: bigint): string {
  const n = Number(wei) / 1e18;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function OverviewTab() {
  const { vaultBalance, configured } = useSanctumVault();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
      {/* How It Works */}
      <GlassCard className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/5">
            <Sparkles className="w-5 h-5 text-pink-400" />
          </div>
          How The Sanctum Works
        </h2>
        <div className="space-y-6">
          {[
            {
              step: '1',
              title: 'Fee Collection',
              desc: '20% of all VFIDE transaction fees flow automatically to The Sanctum — 10% via ProofScoreBurnRouter (sanctumBps = 1000/10000) and 10% via FeeDistributor (sanctumBps = 2000/10000). The DAO may adjust these splits within protocol bounds.',
            },
            {
              step: '2',
              title: 'Charity Registration',
              desc: 'DAO approves vetted charitable organisations via on-chain vote — no charity is added without community consensus',
            },
            {
              step: '3',
              title: 'Disbursement Proposals',
              desc: 'Sanctum approvers propose transfers to registered charities, specifying an amount and campaign purpose',
            },
            {
              step: '4',
              title: 'Multi-Sig Approval',
              desc: 'A threshold of approvers must sign each disbursement before it can execute',
            },
            {
              step: '5',
              title: 'On-Chain Execution',
              desc: 'Funds transfer transparently on-chain directly to the charity wallet — every disbursement is permanently recorded',
            },
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="w-8 h-8 bg-pink-500/20 text-pink-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                {item.step}
              </div>
              <div>
                <div className="text-white font-bold">{item.title}</div>
                <div className="text-sm text-gray-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Governance */}
      <GlassCard className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Governance &amp; Security</h2>
        <div className="space-y-4">
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold">Multi-Signature Required</span>
            </div>
            <p className="text-sm text-gray-400">
              All disbursements require approval from multiple trusted signers before execution.
              The DAO retains full veto authority.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold">DAO Oversight</span>
            </div>
            <p className="text-sm text-gray-400">
              Community votes on charity additions, removals, and major policy changes.
              Disbursements can only go to DAO-approved charitable organisations.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold">Charity-Only Disbursements</span>
            </div>
            <p className="text-sm text-gray-400">
              The Sanctum does not hold tokens for investors, pay staking rewards, or reimburse
              individual users. Every disbursement goes to a registered charitable organisation.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Live Balance */}
      <div className="lg:col-span-2 bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-2xl p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Current Sanctum Balance</div>
          {configured ? (
            <div className="text-5xl font-bold text-pink-400 mb-4">
              {formatVFIDE(vaultBalance)} VFIDE
            </div>
          ) : (
            <div className="text-2xl font-bold text-gray-500 mb-4">
              Contract not deployed on this network
            </div>
          )}
          <div className="text-sm text-gray-400">
            Available for disbursement to DAO-approved charities
          </div>
        </div>
      </div>
    </div>
  );
}
