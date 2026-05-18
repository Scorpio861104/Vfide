'use client';

import { useState, useEffect } from 'react';
import { Loader2, Award } from 'lucide-react';
import { useAccount } from 'wagmi';

type Badge = {
  badge_name: string;
  badge_description: string;
  badge_icon?: string;
  badge_rarity?: string;
  earned_at: string;
};

const RARITY_COLORS: Record<string, string> = {
  legendary: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  epic: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  rare: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  common: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

export function CollectionTab() {
  const { address } = useAccount();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    fetch(`/api/badges?userAddress=${address}`)
      .then((r) => r.json())
      .then((data) => setBadges(data.badges ?? []))
      .catch(() => setError('Failed to load badges'))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Award size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view your badge collection.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Award size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">You haven&apos;t earned any badges yet.</p>
        <p className="text-gray-500 text-sm mt-1">Complete quests and milestones to earn badges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">{badges.length} badge{badges.length !== 1 ? 's' : ''} earned</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((badge, i) => {
          const rarity = (badge.badge_rarity ?? 'common').toLowerCase();
          const colorClass = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
          return (
            <div key={i} className="bg-white/3 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {badge.badge_icon ?? '🏅'}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass} capitalize`}>
                  {rarity}
                </span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{badge.badge_name}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{badge.badge_description}</p>
              </div>
              <p className="text-gray-500 text-xs mt-auto">
                Earned {new Date(badge.earned_at).toLocaleDateString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
