/**
 * Unified Activity Feed
 * 
 * Seamlessly displays social interactions and crypto transactions
 * in a single, coherent feed.
 */

'use client';

import { motion } from 'framer-motion';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Award,
    DollarSign,
    Gift,
    Heart,
    Lock,
    MessageCircle,
    TrendingUp,
    Unlock,
    Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// ==================== TYPES ====================

type ActivityType =
  | 'post'
  | 'comment'
  | 'like'
  | 'tip_sent'
  | 'tip_received'
  | 'content_purchased'
  | 'content_sold'
  | 'endorsement_reward'
  | 'token_reward'
  | 'payment_sent'
  | 'payment_received'
  | 'achievement';

interface UnifiedActivity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  actor: {
    address: string;
    name: string;
    avatar: string;
  };
  recipient?: {
    address: string;
    name: string;
    avatar: string;
  };
  amount?: string;
  currency?: 'ETH' | 'VFIDE';
  content?: string;
  metadata?: {
    postId?: string;
    commentId?: string;
    txHash?: string;
    contentType?: string;
    achievementName?: string;
  };
}

interface UnifiedActivityFeedProps {
  userAddress?: string;
  filter?: 'all' | 'social' | 'financial';
  limit?: number;
  className?: string;
}

type ActivityApiItem = {
  id?: number | string;
  activity_type?: string | null;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  user_address?: string | null;
  user_username?: string | null;
  user_avatar?: string | null;
  data?: unknown;
};

const safeParseData = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : null;
};

const normalizeActivityType = (value?: string | null, data?: Record<string, unknown> | null): ActivityType => {
  const type = value?.toLowerCase() ?? '';
  if (type.includes('post')) return 'post';
  if (type.includes('comment')) return 'comment';
  if (type.includes('like')) return 'like';
  if (type.includes('tip')) {
    const direction = String(data?.direction ?? data?.flow ?? '').toLowerCase();
    if (type.includes('sent') || direction === 'sent') return 'tip_sent';
    if (type.includes('received') || direction === 'received') return 'tip_received';
    return 'tip_received';
  }
  if (type.includes('content')) {
    const direction = String(data?.direction ?? '').toLowerCase();
    if (type.includes('sold') || direction === 'sold') return 'content_sold';
    return 'content_purchased';
  }
  if (type.includes('endorse')) return 'endorsement_reward';
  if (type.includes('reward')) return 'token_reward';
  if (type.includes('payment') || type.includes('transfer') || type.includes('transaction')) {
    if (type.includes('sent')) return 'payment_sent';
    if (type.includes('received')) return 'payment_received';
    return 'payment_received';
  }
  if (type.includes('achievement')) return 'achievement';
  return 'achievement';
};

// ==================== COMPONENT ====================

export function UnifiedActivityFeed({
  userAddress,
  filter = 'all',
  limit = 20,
  className = '',
}: UnifiedActivityFeedProps) {
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: '0',
      });

      if (userAddress) {
        params.set('userAddress', userAddress);
      }

      const response = await fetch(`/api/activities?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      const items: ActivityApiItem[] = Array.isArray(data.activities) ? data.activities : [];
      const mapped: UnifiedActivity[] = items.map((activity) => {
        const meta = safeParseData(activity.data);
        const type = normalizeActivityType(activity.activity_type, meta);
        const actorName = activity.user_username ?? activity.user_address ?? 'Unknown';
        const recipient = (meta?.to as string | undefined) ?? (meta?.recipient as string | undefined);
        const recipientName = (meta?.recipientName as string | undefined) ?? recipient ?? 'Recipient';

        const unified: UnifiedActivity = {
          id: String(activity.id ?? `${activity.activity_type}-${activity.created_at}`),
          type,
          timestamp: activity.created_at ? new Date(activity.created_at) : new Date(),
          actor: {
            address: activity.user_address ?? '0x0',
            name: actorName,
            avatar: activity.user_avatar ?? '👤',
          },
          recipient: recipient
            ? {
                address: recipient,
                name: recipientName,
                avatar: (meta?.recipientAvatar as string | undefined) ?? '👤',
              }
            : undefined,
          amount: (meta?.amount as string | undefined) ?? (meta?.value as string | undefined),
          currency: (meta?.currency as UnifiedActivity['currency']) ?? (meta?.token as UnifiedActivity['currency']),
          content: (meta?.content as string | undefined) ?? activity.description ?? undefined,
          metadata: {
            postId: meta?.postId as string | undefined,
            commentId: meta?.commentId as string | undefined,
            txHash: meta?.txHash as string | undefined,
            contentType: meta?.contentType as string | undefined,
            achievementName: meta?.achievementName as string | undefined,
          },
        };

        return unified;
      });

      let filtered = mapped;
      if (filter === 'social') {
        filtered = mapped.filter((activity) => ['post', 'comment', 'like', 'achievement'].includes(activity.type));
      } else if (filter === 'financial') {
        filtered = mapped.filter((activity) => !['post', 'comment', 'like', 'achievement'].includes(activity.type));
      }

      setActivities(filtered.slice(0, limit));
    } catch (error) {
      console.error('Failed to load activities:', error);
      setError('Unable to load activity feed.');
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, limit, userAddress]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'post':
        return <MessageCircle className="w-4 h-4" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4" />;
      case 'like':
        return <Heart className="w-4 h-4" />;
      case 'tip_sent':
        return <ArrowUpRight className="w-4 h-4" />;
      case 'tip_received':
        return <ArrowDownLeft className="w-4 h-4" />;
      case 'content_purchased':
        return <Unlock className="w-4 h-4" />;
      case 'content_sold':
        return <Lock className="w-4 h-4" />;
      case 'endorsement_reward':
        return <Award className="w-4 h-4" />;
      case 'token_reward':
        return <Gift className="w-4 h-4" />;
      case 'payment_sent':
        return <ArrowUpRight className="w-4 h-4" />;
      case 'payment_received':
        return <ArrowDownLeft className="w-4 h-4" />;
      case 'achievement':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityType): string => {
    switch (type) {
      case 'post':
      case 'comment':
        return 'from-blue-500 to-cyan-500';
      case 'like':
        return 'from-pink-500 to-red-500';
      case 'tip_received':
      case 'payment_received':
      case 'content_sold':
      case 'endorsement_reward':
      case 'token_reward':
        return 'from-green-500 to-emerald-500';
      case 'tip_sent':
      case 'payment_sent':
      case 'content_purchased':
        return 'from-purple-500 to-blue-500';
      case 'achievement':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getActivityText = (activity: UnifiedActivity): string => {
    switch (activity.type) {
      case 'post':
        return 'posted';
      case 'comment':
        return 'commented';
      case 'like':
        return 'liked a post';
      case 'tip_sent':
        return `tipped ${activity.recipient?.name} ${activity.amount} ${activity.currency}`;
      case 'tip_received':
        return `received ${activity.amount} ${activity.currency} tip from ${activity.actor.name}`;
      case 'content_purchased':
        return `purchased ${activity.metadata?.contentType}`;
      case 'content_sold':
        return `sold ${activity.metadata?.contentType} to ${activity.recipient?.name}`;
      case 'endorsement_reward':
        return `sent ${activity.amount} ${activity.currency} endorsement reward`;
      case 'token_reward':
        return `earned ${activity.amount} ${activity.currency} tokens`;
      case 'payment_sent':
        return `sent ${activity.amount} ${activity.currency}`;
      case 'payment_received':
        return `received ${activity.amount} ${activity.currency}`;
      case 'achievement':
        return `unlocked "${activity.metadata?.achievementName}" achievement`;
      default:
        return 'performed an action';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {error && (
        <div className="text-sm text-red-400">{error}</div>
      )}
      {activities.map((activity, idx) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all group"
        >
          <div className="flex gap-3">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-full bg-linear-to-br ${getActivityColor(activity.type)} flex items-center justify-center text-white shrink-0`}>
              {getActivityIcon(activity.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm text-zinc-100">
                  <span className="font-semibold">{activity.actor.name}</span>
                  <span className="text-zinc-400 ml-1">{getActivityText(activity)}</span>
                </p>
                <span className="text-xs text-zinc-500 whitespace-nowrap">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>

              {/* Additional Content */}
              {activity.content && (
                <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{activity.content}</p>
              )}

              {/* Amount Badge */}
              {activity.amount && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-linear-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full">
                  <DollarSign className="w-3 h-3 text-purple-400" />
                  <span className="text-xs font-bold text-purple-400">
                    {activity.amount} {activity.currency}
                  </span>
                </div>
              )}

              {/* Transaction Hash */}
              {activity.metadata?.txHash && (
                <a
                  href={`https://etherscan.io/tx/${activity.metadata.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-block"
                >
                  View on Etherscan →
                </a>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {activities.length === 0 && (
        <div className="p-12 text-center">
          <Users className="w-12 h-12 text-zinc-500 mx-auto mb-3 opacity-50" />
          <p className="text-zinc-400">No activities yet</p>
        </div>
      )}
    </div>
  );
}
