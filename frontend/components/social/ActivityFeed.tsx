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
import { formatAddress } from '@/lib/messageEncryption';
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
  const [isClient, setIsClient] = useState(false);

  // Handle SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!userAddress || !isClient || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(`vfide_activity_feed_${userAddress}`);
      if (stored) {
        setActivities(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load activity feed:', e);
      setActivities([]);
    }
  }, [userAddress, isClient]);

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
          <Activity className="w-5 h-5 text-[#00F0FF]" />
          <h3 className="font-bold text-[#F5F3E8]">Activity Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#50C878]" />
          <span className="text-sm text-[#A0A0A5]">
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
                ? 'bg-[#00F0FF] text-[#0A0A0F]'
                : 'bg-[#2A2A3F] text-[#A0A0A5] hover:bg-[#3A3A4F]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="p-8 bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl text-center">
          <Activity className="w-12 h-12 text-[#6B6B78] mx-auto mb-3 opacity-50" />
          <p className="text-[#6B6B78]">No activity yet</p>
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
                  className="p-4 bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl hover:border-[#3A3A4F] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
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
                      <p className="text-sm text-[#A0A0A5] mb-2">
                        {activity.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#6B6B78]">
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
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(`vfide_activity_feed_${userAddress}`);
    const activities: ActivityItem[] = stored ? JSON.parse(stored) : [];
    
    const newActivity: ActivityItem = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    activities.unshift(newActivity);
    
    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(100);
    }
    
    localStorage.setItem(`vfide_activity_feed_${userAddress}`, JSON.stringify(activities));
  } catch (error) {
    console.error('Failed to add activity:', error);
  }
}
