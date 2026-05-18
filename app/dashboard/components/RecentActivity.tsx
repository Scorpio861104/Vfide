'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, ArrowDownLeft, ArrowUpRight, Award, ChevronRight, Vote } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

import { GlassCard, formatTimeAgo } from './shared';

type ActivityItem = {
  type: string;
  desc: string;
  time: string;
  icon: typeof ArrowUpRight;
  color: 'cyan' | 'emerald' | 'amber' | 'purple';
};

export function RecentActivitySection() {
  const { address } = useAccount();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!address) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/activities/${address}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setActivities(
          (data.activities || []).slice(0, 4).map((activity: { type: string; description: string; timestamp: string }) => ({
            type: activity.type,
            desc: activity.description,
            time: formatTimeAgo(new Date(activity.timestamp).getTime()),
            icon:
              activity.type === 'send'
                ? ArrowUpRight
                : activity.type === 'receive'
                  ? ArrowDownLeft
                  : activity.type === 'badge'
                    ? Award
                    : Vote,
            color:
              activity.type === 'send'
                ? 'cyan'
                : activity.type === 'receive'
                  ? 'emerald'
                  : activity.type === 'badge'
                    ? 'amber'
                    : 'purple',
          })),
        );
      } catch {
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchActivity();
  }, [address]);

  return (
    <GlassCard className="p-6" hover={false}>
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <Activity className="text-cyan-400" size={24} />
        Recent Activity
      </h2>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex animate-pulse items-center gap-4 rounded-xl bg-white/5 p-4">
              <div className="h-10 w-10 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="py-8 text-center text-white/60">No recent activity. Start transacting to see your history!</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div
              key={`${activity.type}-${activity.time}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/8 sm:gap-4 sm:p-4"
            >
              <div
                className={`shrink-0 rounded-xl p-2 ${
                  activity.color === 'cyan'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : activity.color === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : activity.color === 'amber'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-purple-500/20 text-purple-400'
                }`}
              >
                <activity.icon size={16} className="sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-white sm:text-sm">{activity.desc}</p>
                <p className="text-xs text-white/40">{activity.time}</p>
              </div>
              <ChevronRight className="text-white/20" size={16} />
            </motion.div>
          ))}
        </div>
      )}
      <div className="mt-4 text-center">
        <Link href="/explorer" className="inline-flex items-center gap-1 text-sm font-medium text-cyan-400 hover:text-cyan-300">
          View All Activity <ChevronRight size={14} />
        </Link>
      </div>
    </GlassCard>
  );
}

export { RecentActivitySection as RecentActivity };
