'use client';

import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Star, Shield, Loader2, TrendingUp } from 'lucide-react';
import { type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { tierColors, getRankIcon, getChangeIndicator } from './leaderboard-config';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
  onRefetch: () => void;
}

export function LeaderboardTable({ entries, isLoading, error, onRefetch }: LeaderboardTableProps) {
  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center mb-8">
            <p className="text-red-500 mb-4">{error.message}</p>
            <button onClick={onRefetch} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 hover:border-cyan-400">
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <p className="text-zinc-400">Loading leaderboard data...</p>
          </div>
        )}

        {/* Top 3 Podium */}
        {entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-zinc-800 border-2 border-zinc-400 rounded-xl p-3 md:p-4 text-center mt-4 md:mt-8">
              <Medal className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-zinc-400" />
              <div className="text-2xl md:text-3xl font-bold text-zinc-100 mb-1">2nd</div>
              <div className="font-mono text-xs md:text-sm text-zinc-400 truncate">{entries[1]?.address.slice(0, 6)}...</div>
              <div className="text-lg md:text-xl font-bold text-zinc-400 mt-2">{entries[1]?.score.toLocaleString()}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-2 border-amber-400 rounded-xl p-4 md:p-6 text-center -mt-2 md:-mt-4">
              <Crown className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-amber-400" />
              <div className="text-3xl md:text-4xl font-bold text-amber-400 mb-1">1st</div>
              <div className="font-mono text-xs md:text-sm text-zinc-400 truncate">{entries[0]?.address.slice(0, 6)}...</div>
              <div className="text-xl md:text-2xl font-bold text-amber-400 mt-2">{entries[0]?.score.toLocaleString()}</div>
              <div className="hidden md:flex items-center justify-center gap-1 mt-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-400">{entries[0]?.badges} badges</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-zinc-800 border-2 border-amber-600 rounded-xl p-3 md:p-4 text-center mt-4 md:mt-8">
              <Medal className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-amber-600" />
              <div className="text-2xl md:text-3xl font-bold text-zinc-100 mb-1">3rd</div>
              <div className="font-mono text-xs md:text-sm text-zinc-400 truncate">{entries[2]?.address.slice(0, 6)}...</div>
              <div className="text-lg md:text-xl font-bold text-amber-600 mt-2">{entries[2]?.score.toLocaleString()}</div>
            </motion.div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && !error && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-100 mb-2">No Rankings Yet</h3>
            <p className="text-zinc-400">Be the first to earn ProofScore points!</p>
          </div>
        )}

        {/* Full Leaderboard */}
        {entries.length > 0 && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden overflow-x-auto">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-700 text-sm text-zinc-400 font-bold">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">Address</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Tier</div>
              <div className="col-span-1 text-center">Badges</div>
              <div className="col-span-1 text-center">Change</div>
            </div>

            {entries.map((entry, index) => {
              const tierStyle = (tierColors[entry.tier] || tierColors['NEUTRAL'])!;
              return (
                <motion.div
                  key={entry.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-b border-zinc-700 hover:bg-zinc-700/30 transition-colors ${entry.rank <= 3 ? 'bg-amber-400/5' : ''}`}
                >
                  {/* Mobile */}
                  <div className="md:hidden flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8">{getRankIcon(entry.rank)}</div>
                      <div className="flex flex-col">
                        <span className="font-mono text-zinc-100 text-sm">{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</span>
                        <span className={`text-xs font-bold ${tierStyle.text}`}>{entry.tier}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{entry.score.toLocaleString()}</span>
                      {getChangeIndicator(entry.change)}
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-4">
                    <div className="col-span-1 flex items-center">{getRankIcon(entry.rank)}</div>
                    <div className="col-span-5 flex items-center">
                      <span className="font-mono text-zinc-100 text-sm truncate">{entry.address.slice(0, 10)}...{entry.address.slice(-8)}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="text-cyan-400 font-bold">{entry.score.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>{entry.tier}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      <Shield className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-100">{entry.badges}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">{getChangeIndicator(entry.change)}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-6">
          <button className="px-6 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 hover:border-cyan-400 transition-colors font-bold">
            Load More
          </button>
        </div>
      </div>
    </section>
  );
}

export function HowToClimb() {
  return (
    <section className="py-8 border-t border-zinc-700">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-cyan-400/10 border border-cyan-400/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            How to Climb the Leaderboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2"><span className="text-cyan-400 font-bold">+50-500</span><span className="text-zinc-400">Participate in governance votes</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 font-bold">+100</span><span className="text-zinc-400">Receive peer endorsements</span></div>
              <div className="flex items-start gap-2"><span className="text-amber-400 font-bold">+200</span><span className="text-zinc-400">Mentor new users</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2"><span className="text-cyan-400 font-bold">+50</span><span className="text-zinc-400">Complete daily active use</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 font-bold">+25</span><span className="text-zinc-400">Per verified transaction</span></div>
              <div className="flex items-start gap-2"><span className="text-amber-400 font-bold">+500</span><span className="text-zinc-400">Badge achievements</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
