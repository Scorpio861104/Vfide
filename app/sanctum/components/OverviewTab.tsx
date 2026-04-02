'use client';

import { CheckCircle, Shield, Sparkles, Users } from 'lucide-react';

import { GlassCard } from '@/components/ui/GlassCard';

export function OverviewTab() {
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
            { step: '1', title: 'Fee Collection', desc: '10% of all VFIDE transaction fees flow to The Sanctum' },
            { step: '2', title: 'Charity Registration', desc: 'DAO approves vetted charitable organizations' },
            { step: '3', title: 'Proposal Creation', desc: 'Council members propose disbursements to charities' },
            { step: '4', title: 'Multi-Sig Approval', desc: 'Required approvers sign off on disbursement' },
            { step: '5', title: 'Execution', desc: 'Funds transferred transparently on-chain' },
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
        <h2 className="text-2xl font-bold text-white mb-6">Governance & Security</h2>
        <div className="space-y-4">
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold">Multi-Signature Required</span>
            </div>
            <p className="text-sm text-gray-400">
              All disbursements require approval from multiple trusted signers before execution.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold">DAO Oversight</span>
            </div>
            <p className="text-sm text-gray-400">
              Community votes on charity additions, removals, and major policy changes.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold">Full Transparency</span>
            </div>
            <p className="text-sm text-gray-400">
              All donations and disbursements recorded permanently on-chain.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Current Balance */}
      <div className="lg:col-span-2 bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-2xl p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Current Sanctum Balance</div>
          <div className="text-5xl font-bold text-pink-400 mb-4">45,230 VFIDE</div>
          <div className="text-sm text-gray-400">Ready for disbursement to approved charities</div>
        </div>
      </div>
    </div>
  );
}
