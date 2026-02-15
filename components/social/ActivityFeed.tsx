'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  MessageCircle,
  DollarSign,
  Award,
  UserPlus,
  Users,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { formatAddress as _formatAddress } from '@/lib/messageEncryption';
import { secureId } from '@/lib/secureRandom';
import { UserDisplay } from '@/components/common/UserDisplay';

interface ActivityItem {
  id: string;
  type: 'message' | 'payment' | 'endorsement' | 'friend_added' | 'badge_earned' | 'group_joined';
  user: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  userAddress: string;
}

export function ActivityFeed({ userAddress }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | ActivityItem['type']>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const normalizeType = (value?: string | null): ActivityItem['type'] => {
      const type = value?.toLowerCase() ?? '';
      if (type.includes('message')) return 'message';
      if (type.includes('payment') || type.includes('transfer') || type.includes('transaction')) return 'payment';
      if (type.includes('endorse')) return 'endorsement';
      if (type.includes('friend')) return 'friend_added';
      if (type.includes('badge')) return 'badge_earned';
      if (type.includes('group')) return 'group_joined';
      return 'message';
    };

    const loadActivities = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/activities?userAddress=${userAddress}&limit=50&offset=0`);
        if (!response.ok) throw new Error('Failed to fetch activities');
        const data = await response.json();
        const items = Array.isArray(data.activities) ? data.activities : [];
        const mapped = items.map((activity: Record<string, unknown>) => ({
          id: String(activity.id ?? `${activity.activity_type}-${activity.created_at}`),
          type: normalizeType(activity.activity_type ?? activity.type),
          user: activity.user_address ?? activity.user_username ?? 'Unknown',
          content: activity.description ?? activity.title ?? 'Activity',
          timestamp: activity.created_at ? new Date(activity.created_at).getTime() : Date.now(),
          metadata: activity.data ?? activity.metadata ?? undefined,
        })) as ActivityItem[];

        if (isMounted) {
          setActivities(mapped);
        }
      } catch (e) {
        console.error('Failed to load activity feed:', e);
        if (isMounted) {
          setActivities([]);
          setError('Unable to load activity feed.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, [userAddress]);

  const getIcon = (type: ActivityItem['type']) => {
    const iconMap = {
      message: MessageCircle,
      payment: DollarSign,
      endorsement: Award,
      friend_added: UserPlus,
      badge_earned: Award,
      group_joined: Users,
    };
    const IconComponent = iconMap[type];
    return <IconComponent className="w-4 h-4" />;
  };

  const getColor = (type: ActivityItem['type']) => {
    const colorMap = {
      message: '#00F0FF',
      payment: '#50C878',
      endorsement: '#A78BFA',
      friend_added: '#FFD700',
      badge_earned: '#FF8C42',
      group_joined: '#00F0FF',
    };
    return colorMap[type];
  };

  const filteredActivities = useMemo(() => {
    const filtered = filter === 'all' 
      ? activities 
      : activities.filter(a => a.type === filter);
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [activities, filter]);

  const filterOptions: Array<{ value: 'all' | ActivityItem['type']; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'message', label: 'Messages' },
    { value: 'payment', label: 'Payments' },
    { value: 'endorsement', label: 'Endorsements' },
    { value: 'friend_added', label: 'Friends' },
    { value: 'badge_earned', label: 'Badges' },
    { value: 'group_joined', label: 'Groups' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-zinc-100">Activity Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-zinc-400">
            {activities.length} activities
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              filter === option.value
                ? 'bg-cyan-400 text-zinc-950'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
          <Activity className="w-12 h-12 text-zinc-500 mx-auto mb-3 opacity-50" />
          <p className="text-zinc-500">Loading activity…</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
          <Activity className="w-12 h-12 text-zinc-500 mx-auto mb-3 opacity-50" />
          <p className="text-red-400">{error}</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
          <Activity className="w-12 h-12 text-zinc-500 mx-auto mb-3 opacity-50" />
          <p className="text-zinc-500">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map((activity) => {
              const color = getColor(activity.type);
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <div style={{ color }}>{getIcon(activity.type)}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <UserDisplay address={activity.user} />
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${color}20`,
                            color: color,
                          }}
                        >
                          {activity.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">
                        {activity.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// Export memoized version for better performance
export default React.memo(ActivityFeed);

// Helper function to add activity
export function addActivity(
  userAddress: string,
  activity: Omit<ActivityItem, 'id' | 'timestamp'>
) {
  if (!userAddress) return;

  const newActivity: ActivityItem = {
    id: secureId('activity'),
    timestamp: Date.now(),
    ...activity,
  };

  if (typeof window !== 'undefined') {
    try {
      const key = `vfide_activity_feed_${userAddress}`;
      const existing = localStorage.getItem(key);
      const items = existing ? (JSON.parse(existing) as ActivityItem[]) : [];
      const nextItems = [newActivity, ...items].slice(0, 100);
      localStorage.setItem(key, JSON.stringify(nextItems));
    } catch (error) {
      console.error('Failed to store activity locally:', error);
    }
  }

  const titleMap: Record<ActivityItem['type'], string> = {
    message: 'Message',
    payment: 'Payment',
    endorsement: 'Endorsement',
    friend_added: 'Friend Added',
    badge_earned: 'Badge Earned',
    group_joined: 'Group Joined',
  };

  const reporter = typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : null;
  if (!reporter) return;

  void reporter('/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddress,
      activityType: activity.type,
      title: titleMap[activity.type] ?? 'Activity',
      description: activity.content,
      data: activity.metadata ?? {},
    }),
  }).catch((error) => {
    console.error('Failed to add activity:', error);
  });
}
