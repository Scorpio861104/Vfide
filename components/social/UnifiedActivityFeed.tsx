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
    DollarSign,
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

// ==================== MOCK DATA ====================

const generateMockActivities = (): UnifiedActivity[] => [
  {
    id: 'a1',
    type: 'tip_received',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    actor: {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      name: 'Alex Rivera',
      avatar: '👨‍💼',
    },
    amount: '5',
    currency: 'VFIDE',
    content: 'Great post! Really insightful.',
    metadata: {
      postId: 'post_123',
      txHash: '0xabc...def',
    },
  },
  {
    id: 'a2',
    type: 'post',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    actor: {
      address: '0x123...456',
      name: 'You',
      avatar: '👤',
    },
    content: 'Just completed my 100th transaction on VFIDE! The platform is incredibly smooth.',
  },
  {
    id: 'a3',
    type: 'content_sold',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    actor: {
      address: '0x123...456',
      name: 'You',
      avatar: '👤',
    },
    recipient: {
      address: '0x789...abc',
      name: 'Sara Chen',
      avatar: '👩‍🎤',
    },
    amount: '10',
    currency: 'VFIDE',
    metadata: {
      contentType: 'Premium Article',
    },
  },
  {
    id: 'a5',
    type: 'achievement',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    actor: {
      address: '0x123...456',
      name: 'You',
      avatar: '👤',
    },
    metadata: {
      achievementName: 'Social Butterfly',
    },
  },
  {
    id: 'a6',
    type: 'tip_sent',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    actor: {
      address: '0x123...456',
      name: 'You',
      avatar: '👤',
    },
    recipient: {
      address: '0xabc...def',
      name: 'Emma Wilson',
      avatar: '👩‍🔬',
    },
    amount: '3',
    currency: 'VFIDE',
    content: 'Amazing content!',
    metadata: {
      postId: 'post_456',
      txHash: '0x123...abc',
    },
  },
];

// ==================== COMPONENT ====================

export function UnifiedActivityFeed({
  filter = 'all',
  limit = 20,
  className = '',
}: Omit<UnifiedActivityFeedProps, 'userAddress'>) {
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch(`/api/activity?user=${userAddress}&filter=${filter}&limit=${limit}`);
      // const data = await response.json();
      
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      let mockData = generateMockActivities();
      
      // Filter if needed
      if (filter === 'social') {
        mockData = mockData.filter(a => ['post', 'comment', 'like', 'achievement'].includes(a.type));
      } else if (filter === 'financial') {
        mockData = mockData.filter(a => !['post', 'comment', 'like', 'achievement'].includes(a.type));
      }
      
      setActivities(mockData.slice(0, limit));
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, limit]);

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
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getActivityColor(activity.type)} flex items-center justify-center text-white shrink-0`}>
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
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full">
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
