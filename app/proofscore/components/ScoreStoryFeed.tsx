'use client';

import { RefreshCw } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useScoreHistory, type ScoreEvent } from '@/hooks/useScoreHistory';
import { formatDistanceToNow } from 'date-fns';

const KIND_META: Record<string, { label: string; color: string; icon: string }> = {
  payment:     { label: 'Payment',         color: 'text-emerald-400', icon: '💳' },
  loan_repaid: { label: 'Loan Repaid',     color: 'text-blue-400',    icon: '🏦' },
  endorsement: { label: 'Endorsement',     color: 'text-purple-400',  icon: '🤝' },
  identity:    { label: 'Identity Verify', color: 'text-yellow-400',  icon: '🪪' },
  dispute:     { label: 'Dispute',         color: 'text-orange-400',  icon: '⚠️' },
  fraud_flag:  { label: 'Fraud Flag',      color: 'text-red-500',     icon: '🚩' },
  decay:       { label: 'Score Decay',     color: 'text-slate-400',   icon: '📉' },
  initial:     { label: 'Account Created', color: 'text-slate-300',   icon: '🌱' },
  unknown:     { label: 'Score Update',    color: 'text-slate-400',   icon: '📊' },
};

function ScoreSparkline({ events }: { events: ScoreEvent[] }) {
  if (events.length < 2) return null;
  const scores = events.map(e => e.newScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const w = 200, h = 48;
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * w;
        const y = h - ((s - min) / range) * h;
        return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />;
      })}
    </svg>
  );
}

function EventRow({ event }: { event: ScoreEvent }) {
  const meta = KIND_META[event.kind] ?? KIND_META.unknown;
  const sign = event.delta >= 0 ? '+' : '';
  const deltaColor = event.delta > 0 ? 'text-emerald-400' : event.delta < 0 ? 'text-red-400' : 'text-slate-400';
  const timeAgo = event.timestamp
    ? formatDistanceToNow(new Date(event.timestamp * 1000), { addSuffix: true })
    : 'Long ago';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-700/50 last:border-0">
      <span className="text-2xl w-8 shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
          <span className={`text-xs font-bold ${deltaColor}`}>{sign}{event.delta}</span>
        </div>
        <div className="text-xs text-slate-500">{timeAgo}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-mono text-slate-300">{event.newScore.toLocaleString()}</div>
        {event.txHash && (
          <a
            href={`https://basescan.org/tx/${event.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            tx ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function ScoreStoryFeed() {
  const { address } = useAccount();
  const { events, isLoading, isIllustrative, refetch } = useScoreHistory(address);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-200">Score History</h3>
          {isIllustrative && (
            <span className="text-xs text-amber-400">Illustrative — connect wallet for live data</span>
          )}
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {events.length >= 2 && (
        <div className="mb-3 flex justify-center">
          <ScoreSparkline events={events} />
        </div>
      )}

      <div className="space-y-0">
        {isLoading ? (
          <div className="text-center py-6 text-slate-500 text-sm">Loading history…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">No score events found</div>
        ) : (
          events.map((e, i) => <EventRow key={i} event={e} />)
        )}
      </div>
    </div>
  );
}
