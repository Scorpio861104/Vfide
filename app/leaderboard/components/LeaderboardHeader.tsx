'use client';

import { Trophy, Users, TrendingUp, Crown, RefreshCw } from 'lucide-react';

interface LeaderboardHeaderProps {
  totalParticipants: number;
  avgScore: number;
  topScore: number;
  userRank: number | undefined;
  timeframe: 'all' | 'month' | 'week';
  setTimeframe: (tf: 'all' | 'month' | 'week') => void;
  isLoading: boolean;
  onRefetch: () => void;
}

export function LeaderboardHeader({
  totalParticipants, avgScore, topScore, userRank,
  timeframe, setTimeframe, isLoading, onRefetch,
}: LeaderboardHeaderProps) {
  return (
    <>
      <section className="py-12 bg-gradient-to-b from-zinc-800 to-zinc-900 border-b border-zinc-700">
        <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-effect">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-(family-name:--font-display) font-bold text-zinc-100 mb-2">
              ProofScore Leaderboard
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 font-(family-name:--font-body)">
              Top contributors in the VFIDE ecosystem
            </p>
            <div
              className="flex flex-wrap justify-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 mt-4"
              aria-label="Leaderboard progression: Compete, then Climb, then Lead"
            >
              <span>Compete</span>
              <span className="text-amber-400">→</span>
              <span>Climb</span>
              <span className="text-amber-400">→</span>
              <span>Lead</span>
            </div>
            {userRank && (
              <div className="mt-4 inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/30 rounded-lg px-4 py-2">
                <span className="text-zinc-400">Your Rank:</span>
                <span className="text-cyan-400 font-bold">#{userRank}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center ring-effect">
              <Users className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold text-zinc-100">{totalParticipants.toLocaleString()}</div>
              <div className="text-sm text-zinc-400">Total Participants</div>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center ring-effect">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <div className="text-2xl font-bold text-zinc-100">{avgScore.toLocaleString()}</div>
              <div className="text-sm text-zinc-400">Average Score</div>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center ring-effect">
              <Crown className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <div className="text-2xl font-bold text-amber-400">{topScore.toLocaleString()}</div>
              <div className="text-sm text-zinc-400">Top Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeframe Filter */}
      <section className="py-4 bg-zinc-900/90 border-b border-zinc-700 sticky top-20 z-40 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'month', 'week'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ring-effect ${
                    timeframe === tf
                      ? 'bg-cyan-400 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {tf === 'all' ? 'All Time' : tf === 'month' ? 'This Month' : 'This Week'}
                </button>
              ))}
            </div>
            <button
              onClick={onRefetch}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 hover:border-cyan-400 transition-colors disabled:opacity-50 ring-effect"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-sm">Refresh</span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
