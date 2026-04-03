'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original headhunter page

export function LeaderboardTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <Trophy className="w-5 h-5 text-amber-400" />
    Q{stats.currentQuarterNumber} Leaderboard
    </h2>

    <div className="space-y-3">
    {leaderboard.map((entry) => (
    <div
    key={entry.rank}
    className={`p-3 sm:p-4 rounded-xl border transition-all ${
    entry.isCurrentUser
    ? 'bg-amber-400/10 border-amber-400'
    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-700'
    }`}
    >
    <div className="flex items-start justify-between gap-2">
    <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
    {/* Rank Badge */}
    <div
    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 ${
    entry.rank === 1 ? 'bg-amber-400 text-zinc-950' :
    entry.rank === 2 ? 'bg-zinc-400 text-zinc-950' :
    entry.rank === 3 ? 'bg-amber-600 text-white' :
    'bg-zinc-700 text-zinc-400'
    }`}
    >
    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
    </div>

    {/* Address & Stats */}
    <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 mb-1 flex-wrap">
    <span className="font-mono text-white font-semibold text-sm sm:text-base truncate">
    {entry.isCurrentUser ? 'You' : entry.address}
    </span>
    {entry.isCurrentUser && (
    <span className="px-2 py-0.5 bg-amber-400 text-zinc-950 text-xs font-bold rounded shrink-0">YOU</span>
    )}
    </div>
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-zinc-400">
    <span className="whitespace-nowrap">{entry.points} pts</span>
    <span className="hidden sm:inline">•</span>
    <span className="whitespace-nowrap">{entry.userReferrals} users</span>
    <span className="hidden sm:inline">•</span>
    <span className="whitespace-nowrap">{entry.merchantReferrals} merchants</span>
    </div>
    </div>
    </div>

    {/* Recognition */}
    <div className="text-right shrink-0">
    <div className="text-lg sm:text-2xl font-bold text-emerald-500">
    {entry.rank <= 20 ? '🏆' : '—'}
    </div>
    <div className="text-xs text-zinc-400 whitespace-nowrap">Badge eligible</div>
    </div>
    </div>
    </div>
    ))}
    </div>

    <div className="mt-6 text-center text-sm text-zinc-400">
    Showing top 20 headhunters • Updated every hour
    </div>
  </div>
  </div>
    </div>
  );
}
