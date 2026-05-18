'use client';

import { useLeaderboard } from '@/hooks/useHeadhunterHooks';

export function LeaderboardTab() {
  const currentDate = new Date();
  const currentYear = BigInt(currentDate.getFullYear());
  const currentQuarter = BigInt(Math.floor(currentDate.getMonth() / 3) + 1);
  const { leaderboard, isLoading } = useLeaderboard(currentYear, currentQuarter);

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Leaderboard</h3>
          <p className="text-gray-400">Showing top 20 headhunters</p>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading leaderboard…</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div key={`${entry.address}-${entry.rank}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-white font-semibold">#{entry.rank} {entry.isCurrentUser ? 'You' : entry.address}</div>
                  <div className="text-xs text-gray-400">Users: {entry.userReferrals} • Merchants: {entry.merchantReferrals}</div>
                </div>
                <div className="text-cyan-300 font-bold">{entry.points} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
