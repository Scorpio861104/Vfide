'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useAccount } from 'wagmi';
import { useProofScore } from '@/hooks/useProofScore';
import { ProofScoreRing } from '@/components/ui/ProofScoreRing';
import { ProofScoreSimulator } from '@/components/proofscore/ProofScoreSimulator';

const TIERS = [
  { range: '0–3,499', label: 'Risky',      note: 'Start building trust through activity and secure behaviour.',     color: 'border-red-500/30    bg-red-500/5'    },
  { range: '3,500–4,999', label: 'Low Trust', note: 'Consistent usage helps you cross into the Neutral band.',       color: 'border-orange-500/30 bg-orange-500/5' },
  { range: '5,000–5,399', label: 'Neutral',  note: 'New-user default. Governance access opens just above.',          color: 'border-yellow-500/30 bg-yellow-500/5' },
  { range: '5,400–5,599', label: 'Governance', note: 'Unlocks on-chain voting for proposals.',                       color: 'border-blue-500/30   bg-blue-500/5'   },
  { range: '5,600–6,999', label: 'Trusted',  note: 'Merchant registration and lower transfer fees available.',       color: 'border-emerald-500/30 bg-emerald-500/5' },
  { range: '7,000–7,999', label: 'Council',  note: 'Eligible for council election and leadership roles.',            color: 'border-purple-500/30 bg-purple-500/5' },
  { range: '8,000–10,000', label: 'Elite',   note: 'Minimum fee (0.25%) and ability to endorse other users.',        color: 'border-amber-500/30  bg-amber-500/5'  },
];

function getTierLabel(score: number): string {
  if (score >= 8000) return 'Elite';
  if (score >= 7000) return 'Council';
  if (score >= 5600) return 'Trusted';
  if (score >= 5400) return 'Governance';
  if (score >= 5000) return 'Neutral';
  if (score >= 3500) return 'Low Trust';
  return 'Risky';
}

export default function ProofScorePage() {
  const { isConnected } = useAccount();
  const { score, burnFee, isLoading } = useProofScore();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">ProofScore</h1>
            <p className="text-white/60">Your on-chain reputation. Understand what affects it, simulate any score, and learn how to improve.</p>
          </div>

          {/* Live score card (wallet connected) */}
          {isConnected && (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6 flex flex-col sm:flex-row items-center gap-6">
              {isLoading ? (
                <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
              ) : (
                <ProofScoreRing score={score} size="lg" />
              )}
              <div className="text-center sm:text-left">
                <div className="text-sm text-cyan-300 font-semibold uppercase tracking-widest mb-1">Your Score</div>
                <div className="text-5xl font-bold text-white mb-1">{isLoading ? '—' : score.toLocaleString()}</div>
                <div className="text-lg font-semibold text-cyan-400 mb-2">{isLoading ? '' : getTierLabel(score)}</div>
                <div className="text-sm text-white/50">Transfer fee: <span className="text-emerald-400 font-semibold">{isLoading ? '—' : `${burnFee.toFixed(2)}%`}</span></div>
              </div>
            </div>
          )}

          {/* Tier reference table */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Tier overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {TIERS.map((tier) => (
                <div key={tier.range} className={`rounded-2xl border p-4 ${tier.color}`}>
                  <div className="text-xs text-white/40 font-mono mb-1">{tier.range}</div>
                  <h3 className="text-base font-bold text-white">{tier.label}</h3>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{tier.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Simulator + tips */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Simulator &amp; tips</h2>
            <ProofScoreSimulator />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
