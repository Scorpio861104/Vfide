'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Award, TrendingDown, Sparkles, ExternalLink } from 'lucide-react';

import { useProofScore } from '@/hooks/useProofScore';
import { HIGH_TRUST_THRESHOLD, LOW_TRUST_THRESHOLD } from '@/lib/constants';
import { ChapterShell } from '../ChapterShell';

interface ProofScoreChapterProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Explainer-only chapter: shows the user's current ProofScore (if any),
 * what it means, how fees scale, and how to start building it. No
 * on-chain action — pressing "Got it" advances to the recap.
 */
export function ProofScoreChapter({ onComplete, onSkip }: ProofScoreChapterProps) {
  const { score, tierName, burnFee, isLoading } = useProofScore();

  const scoreDisplay = useMemo(() => {
    if (isLoading) return '…';
    if (typeof score !== 'number') return '5000';
    return score.toLocaleString();
  }, [isLoading, score]);

  const feeDisplay = useMemo(() => {
    if (typeof burnFee !== 'number') return '—';
    return `${burnFee.toFixed(2)}%`;
  }, [burnFee]);

  return (
    <ChapterShell
      chapter="proofScore"
      description="Building trust matters. ProofScore reflects responsible behavior across the ecosystem and can improve fees, participation, and merchant confidence."
      onPrimary={onComplete}
      onSkip={onSkip}
      primaryLabel="Continue"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            icon={Award}
            color="text-purple-300"
            label="Your ProofScore"
            value={scoreDisplay}
            sub={tierName ?? 'Neutral'}
          />
          <Stat
            icon={TrendingDown}
            color="text-emerald-300"
            label="Current burn fee"
            value={feeDisplay}
            sub="Paid by you on each transfer"
          />
          <Stat
            icon={Sparkles}
            color="text-accent"
            label="Score range"
            value="0–10,000"
            sub="5,000 is neutral"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
          <p className="mb-2 font-semibold text-white">How fees scale</p>
          <ul className="space-y-1.5 text-xs">
            <li>
              <span className="font-semibold text-emerald-300">≥ 8,000:</span> 0.25% burn fee
            </li>
            <li>
              <span className="font-semibold text-accent">{LOW_TRUST_THRESHOLD + 1}–{HIGH_TRUST_THRESHOLD - 1}:</span> sliding — up to 5% at the low end, as low as 0.25% approaching the top
            </li>
            <li>
              <span className="font-semibold text-amber-300">4,000–4,999:</span> Higher fee — build trust to bring it down
            </li>
            <li>
              <span className="font-semibold text-pink-300">&lt; 4,000:</span> 5% maximum — reserved for new or risky accounts
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-accent">
          <p className="font-semibold text-white">Your first payment</p>
          <p className="mt-1 text-white/80">
            Positive participation improves your standing over time. Complete payments, build trusted
            interactions, and use protocol features responsibly to strengthen your score.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30"
            >
              Browse merchants <ExternalLink size={12} aria-hidden />
            </Link>
            <Link
              href="/proofscore"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              Full ProofScore page <ExternalLink size={12} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </ChapterShell>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: typeof Award;
  color: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <Icon className={color} size={16} aria-hidden />
        <p className="text-xs uppercase tracking-wider text-white/60">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50">{sub}</p>
    </div>
  );
}
