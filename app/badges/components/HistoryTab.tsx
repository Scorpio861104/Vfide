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

export function HistoryTab() {
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
      .then((data) => {
        const sorted = (data.badges ?? []).slice().sort(
          (a: Badge, b: Badge) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
        );
        setBadges(sorted);
      })
      .catch(() => setError('Failed to load badge history'))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Award size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view your badge history.</p>
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
        <p className="text-gray-400">No badges earned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {badges.map((badge, i) => (
        <div key={i} className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            {badge.badge_icon ?? '🏅'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm">{badge.badge_name}</p>
            <p className="text-gray-400 text-xs mt-0.5 truncate">{badge.badge_description}</p>
          </div>
          <p className="text-gray-500 text-xs whitespace-nowrap flex-shrink-0">
            {new Date(badge.earned_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
