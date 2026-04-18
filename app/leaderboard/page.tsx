'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { RefreshCcw, Trophy } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useLeaderboard, useUserRank } from '@/hooks/useLeaderboard';
import { AllTab } from './components/AllTab';
import { MonthTab } from './components/MonthTab';
import { WeekTab } from './components/WeekTab';

type TabId = 'all' | 'month' | 'week';

const TAB_LABELS: Record<TabId, string> = { all: 'All Time', month: 'This Month', week: 'This Week' };
const TAB_IDS: TabId[] = ['all', 'month', 'week'];

export default function LeaderboardPage() {
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
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-white">
                ProofScore Leaderboard
              </h1>
              <p className="text-white/60">Top contributors in the ecosystem</p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-300"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
              <p className="mb-2 text-sm text-gray-400">Total Participants</p>
              <p className="text-3xl font-bold text-white">{totalParticipants}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
              <p className="mb-2 text-sm text-gray-400">Average Score</p>
              <p className="text-3xl font-bold text-white">{averageScore}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
              <p className="mb-2 text-sm text-gray-400">Top Score</p>
              <p className="text-3xl font-bold text-white">{topScore}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
              <p className="mb-2 text-sm text-gray-400">Your Rank:</p>
              <p className="text-3xl font-bold text-white">#{rank ?? '—'}</p>
            </div>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <Trophy size={14} />
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'all' && <AllTab entries={entries} />}
          {activeTab === 'month' && <MonthTab entries={entries} />}
          {activeTab === 'week' && <WeekTab entries={entries} />}
        </div>
      </div>
      <Footer />
    </>
  );
}
