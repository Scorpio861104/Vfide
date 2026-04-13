'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { BarChart2, Loader2, Activity, MessageSquare, Users, Star } from 'lucide-react';

interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export function OverviewTab() {
  const { address } = useAccount();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [posts, setPosts] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/activities?userAddress=${address}&limit=100`).then((r) => r.json()),
      fetch('/api/community/posts').then((r) => r.json()),
    ])
      .then(([a, c]) => {
        setActivities(a.activities ?? []);
        const myPosts = (c.posts ?? []).filter((p: { author?: string }) => p.author?.toLowerCase() === address.toLowerCase());
        setPosts(myPosts.length);
      })
      .finally(() => setLoading(false));
  }, [address]);

  const byType = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';

  const stats = [
    { label: 'Total Activities', value: activities.length, icon: <Activity size={16} className="text-cyan-400" /> },
    { label: 'Community Posts', value: posts, icon: <MessageSquare size={16} className="text-purple-400" /> },
    { label: 'Endorsements', value: byType['endorsement'] ?? 0, icon: <Star size={16} className="text-yellow-400" /> },
    { label: 'Top Activity', value: topType, icon: <Users size={16} className="text-green-400" /> },
  ];

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart2 size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view your social overview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center py-10">
            <Loader2 size={22} className="text-cyan-400 animate-spin" />
          </div>
        ) : stats.map((s) => (
          <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">{s.icon}<p className="text-xs text-gray-400">{s.label}</p></div>
            <p className="text-xl font-bold text-white capitalize">{s.value}</p>
          </div>
        ))}
      </div>

      {!loading && activities.length > 0 && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-3">Activity Breakdown</p>
          <div className="space-y-2">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <p className="text-xs text-gray-400 w-28 capitalize">{type}</p>
                <div className="flex-1 bg-white/5 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-cyan-500"
                    style={{ width: `${(count / activities.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 w-6 text-right">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
