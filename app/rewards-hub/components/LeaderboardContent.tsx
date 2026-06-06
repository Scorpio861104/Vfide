'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { RefreshCcw, Trophy } from 'lucide-react';
import { useLeaderboard, useUserRank } from '@/hooks/useLeaderboard';
import { AllTab } from '@/app/leaderboard/components/AllTab';
import { MonthTab } from '@/app/leaderboard/components/MonthTab';
import { WeekTab } from '@/app/leaderboard/components/WeekTab';

type TabId = 'all' | 'month' | 'week';

const TAB_LABELS: Record<TabId, string> = { all: 'All Time', month: 'This Month', week: 'This Week' };
const TAB_IDS: TabId[] = ['all', 'month', 'week'];

export default function LeaderboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const { entries = [], totalParticipants = 0, refetch } = useLeaderboard();
  const { rank } = useUserRank();

  const averageScore = useMemo(() => {
    if (!entries.length) {
      return 0;
    }

    return Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length);
  }, [entries]);

  const topScore = entries[0]?.score ?? 0;

  return (
      <div className="relative pb-8">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
        </div>
        <div className="relative container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="badge-live"><span className="badge-live-dot" />Rankings</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
                  <Trophy size={32} className="text-amber-400" />ProofScore Leaderboard
                </span>
              </h1>
              <p className="text-white/50">Top contributors in the ecosystem</p>
            </div>
            <button onClick={() => refetch()}
              className="btn-premium-ghost flex items-center gap-2 self-start">
              <RefreshCcw size={16} />Refresh
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="analytics-card p-5">
              <p className="mb-2 text-sm text-white/40">Total Participants</p>
              <p className="text-3xl font-bold text-white">{totalParticipants}</p>
            </div>
            <div className="analytics-card p-5">
              <p className="mb-2 text-sm text-white/40">Average Score</p>
              <p className="text-3xl font-bold text-white">{averageScore}</p>
            </div>
            <div className="analytics-card p-5">
              <p className="mb-2 text-sm text-white/40">Top Score</p>
              <p className="text-3xl font-bold text-amber-400">{topScore}</p>
            </div>
            <div className="analytics-card p-5">
              <p className="mb-2 text-sm text-white/40">Your Rank</p>
              <p className="text-3xl font-bold text-accent">#{rank ?? '—'}</p>
            </div>
          </div>

          <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 -mx-4 px-4 mb-8 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {TAB_IDS.map(id => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                  <Trophy size={14} />{TAB_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'all' && <AllTab entries={entries} />}
          {activeTab === 'month' && <MonthTab entries={entries} />}
          {activeTab === 'week' && <WeekTab entries={entries} />}
        </div>
      </div>
  );
}

