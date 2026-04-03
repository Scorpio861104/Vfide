'use client';

import { useMemo, useState } from 'react';
import { getAllBadges, getBadgeCategories, type BadgeMetadata } from '@/lib/badge-registry';

type ViewMode = 'all' | 'earned';
type DisplayBadge = Partial<BadgeMetadata> & {
  name: string;
  category: string;
  rarity: string;
  description: string;
  points: number;
};

function getBadgeLabel(badge: DisplayBadge): string {
  return badge.displayName || badge.name.replace(/_/g, ' ');
}

export function CollectionTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [search, setSearch] = useState('');

  const allBadges = useMemo(() => getAllBadges() as DisplayBadge[], []);
  const categories = useMemo(() => getBadgeCategories(), []);
  const earnedBadges = useMemo<DisplayBadge[]>(() => [], []);

  const visibleBadges = useMemo(() => {
    const source = viewMode === 'earned' ? earnedBadges : allBadges;
    const query = search.trim().toLowerCase();

    if (!query) return source;

    return source.filter((badge) => {
      const haystack = [
        getBadgeLabel(badge),
        badge.name,
        badge.category,
        badge.rarity,
        badge.description,
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [allBadges, earnedBadges, search, viewMode]);

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Badge Collection</h2>
            <p className="text-gray-400 mt-1">Track progress, rarities, and category coverage across VFIDE.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Total Badges</div>
              <div className="text-2xl font-bold text-white">{allBadges.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Categories</div>
              <div className="text-2xl font-bold text-white">{categories.length}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                viewMode === 'all'
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:text-white'
              }`}
            >
              All Badges ({allBadges.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('earned')}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                viewMode === 'earned'
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:text-white'
              }`}
            >
              Earned ({earnedBadges.length})
            </button>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search badges"
            className="w-full md:max-w-xs rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/40 focus:outline-none"
          />
        </div>
      </div>

      {visibleBadges.length === 0 ? (
        <div className="bg-white/3 border border-dashed border-white/10 rounded-2xl p-10 text-center">
          <h3 className="text-2xl font-bold text-white">No Badges Found</h3>
          <p className="text-gray-400 mt-2">Try adjusting your search or filters to find matching badge progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleBadges.map((badge) => (
            <div key={badge.name} className="rounded-2xl border border-white/10 bg-white/3 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{getBadgeLabel(badge)}</h3>
                  <p className="text-sm text-gray-400">{badge.category}</p>
                </div>
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {badge.rarity}
                </span>
              </div>
              <p className="text-sm text-gray-300">{badge.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-300 font-semibold">{badge.points} pts</span>
                <span className="text-gray-500">Pending unlock</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
