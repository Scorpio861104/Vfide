'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Award, TrendingDown, Sparkles, ExternalLink } from 'lucide-react';

import { useProofScore } from '@/hooks/useProofScore';
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
      description="ProofScore is your trust score on the protocol. The higher it is, the lower your fees and the more features open up — and you build it by transacting, paying back loans, and getting endorsements."
      onPrimary={onComplete}
      onSkip={onSkip}
      primaryLabel="Got it"
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
            color="text-cyan-300"
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
              <span className="font-semibold text-cyan-300">5,000–7,999:</span> 2.5% sliding down with trust
            </li>
            <li>
              <span className="font-semibold text-amber-300">4,000–4,999:</span> Higher fee — build trust to bring it down
            </li>
            <li>
              <span className="font-semibold text-pink-300">&lt; 4,000:</span> 5% maximum — reserved for new or risky accounts
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-cyan-100">
          <p className="font-semibold text-white">Your first payment</p>
          <p className="mt-1 text-white/80">
            Each completed payment, on-time loan repayment, and merchant endorsement nudges your
            score up. Find a merchant, scan their QR or open their checkout link, and pay.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30"
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
