'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { TrendingUp, Loader2, Calendar } from 'lucide-react';

interface ActivityEntry {
  id: string;
  type: string;
  created_at: string;
}

function getWeekLabel(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function GrowthTab() {
  const { address } = useAccount();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/activities?userAddress=${address}&limit=200`)
      .then((r) => r.json())
      .then((data) => setActivities(data.activities ?? []))
      .finally(() => setLoading(false));
  }, [address]);

  const weeklyBuckets = activities.reduce<Record<string, number>>((acc, a) => {
    const label = getWeekLabel(new Date(a.created_at));
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const weeks = Object.entries(weeklyBuckets).slice(-8);
  const maxCount = Math.max(...weeks.map(([, v]) => v), 1);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to see your activity growth.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Weekly Activity Trend</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : weeks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No activity data yet.</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {weeks.map(([label, count]) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs text-gray-500">{count}</p>
                <div
                  className="w-full rounded-t bg-cyan-500/60"
                  style={{ height: `${(count / maxCount) * 100}%`, minHeight: '4px' }}
                />
                <p className="text-[10px] text-gray-600 rotate-45 mt-1 origin-left">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Actions</p>
          <p className="text-2xl font-bold text-white">{activities.length}</p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Active Weeks</p>
          <p className="text-2xl font-bold text-white">{Object.keys(weeklyBuckets).length}</p>
        </div>
      </div>
    </div>
  );
}
