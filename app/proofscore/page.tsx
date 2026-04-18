'use client';

import { Footer } from '@/components/layout/Footer';
import { useAccount } from 'wagmi';
import { useProofScore } from '@/hooks/useProofScore';
import { ProofScoreRing } from '@/components/ui/ProofScoreRing';

const TIERS = [
  { range: '0–3999', label: 'Emerging', note: 'Build trust with consistent activity and secure behavior.' },
  { range: '4000–6999', label: 'Trusted', note: 'Unlock broader platform access and lower-friction flows.' },
  { range: '7000–10000', label: 'Elite', note: 'Highest trust band for governance and premium operations.' },
];

function getTierLabel(score: number): string {
  if (score >= 7000) return 'Elite';
  if (score >= 4000) return 'Trusted';
  return 'Emerging';
}

export default function ProofScorePage() {
  const { isConnected } = useAccount();
  const { score, burnFee, isLoading } = useProofScore();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">ProofScore</h1>
            <p className="text-white/60">Understand how VFIDE reputation works and what unlocks as your score improves.</p>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <div key={tier.range} className="rounded-2xl border border-white/10 bg-white/3 p-5">
                <div className="text-sm text-cyan-300 font-semibold">{tier.range}</div>
                <h2 className="text-xl font-bold text-white mt-1">{tier.label}</h2>
                <p className="text-sm text-gray-400 mt-2">{tier.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
