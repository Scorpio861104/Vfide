'use client';

/**
 * Your ProofScore (formerly the "ProofScore Leaderboard").
 *
 * Reconciled with the Trust principle: a participant's ProofScore is a personal record earned from real outcomes —
 * "never ranking, authority, or status." This view shows YOUR own score and where it sits on the tier ladder (your
 * journey), plus the scale of the community you are part of. It does NOT rank people against each other, assign a
 * rank number, or spotlight "top" individuals — that was the contradiction this replaces.
 */
export const dynamic = 'force-dynamic';

import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { useProofScore } from '@/hooks/useProofScore';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { TIERS, getTier } from '@/lib/proofScore/tiers';
import { ShieldCheck, Users } from 'lucide-react';

export default function ProofScoreStandingPage() {
  const { isConnected } = useAccount();
  const { score } = useProofScore();
  const { totalParticipants = 0 } = useLeaderboard();

  const myScore = typeof score === 'number' ? score : null;
  const myTier = myScore !== null ? getTier(myScore) : null;

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
        </div>

        <div className="relative container mx-auto max-w-3xl px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="badge-live"><span className="badge-live-dot" />Your record</span>
            </div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" style={{ color: '#fff' }}>
              <ShieldCheck size={32} className="text-emerald-400" />Your ProofScore
            </h1>
            <p className="text-white/50">Your trust, earned from real outcomes. This is your own record — it is never a ranking of you against anyone else.</p>
          </div>

          {/* Your score */}
          {isConnected && myScore !== null && myTier ? (
            <div className="analytics-card p-6 mb-6">
              <p className="text-sm text-white/40">Your score</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-5xl font-bold" style={{ color: myTier.hex }}>{myScore.toLocaleString()}</span>
                <span className="text-lg font-medium" style={{ color: myTier.hex }}>{myTier.name}</span>
              </div>
              <p className="mt-2 text-xs text-white/40">Every completed payment, fulfilled order, and honored agreement builds this. Nothing buys it.</p>
            </div>
          ) : (
            <div className="analytics-card p-6 mb-6">
              <p className="text-sm text-white/60">Connect your wallet to see your ProofScore and where it sits on the tier ladder.</p>
            </div>
          )}

          {/* Tier ladder — YOUR position, not a ranking of people */}
          <div className="analytics-card p-6 mb-6">
            <p className="text-sm text-white/40 mb-4">The tier ladder</p>
            <div className="space-y-2">
              {[...TIERS].reverse().map((t) => {
                const here = myTier?.name === t.name;
                return (
                  <div key={t.name} className="flex items-center justify-between rounded-xl px-4 py-2.5"
                    style={{ background: here ? `${t.hex}1A` : 'rgba(255,255,255,0.02)', border: `1px solid ${here ? t.hex : 'rgba(255,255,255,0.06)'}` }}>
                    <span className="text-sm font-medium" style={{ color: t.hex }}>
                      {t.name}{here && <span className="ml-2 text-xs text-white/60">— you are here</span>}
                    </span>
                    <span className="text-xs text-white/40 font-mono">
                      {t.min.toLocaleString()}{t.max === Infinity ? '+' : `–${t.max.toLocaleString()}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Community scale — context, not a ranking */}
          <div className="analytics-card p-5 flex items-center gap-3">
            <Users size={20} className="text-cyan-400" />
            <p className="text-sm text-white/60">
              You are one of <span className="font-bold text-white">{totalParticipants.toLocaleString()}</span> participants building trust on VFIDE.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
