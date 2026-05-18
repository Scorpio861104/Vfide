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
import React, { useCallback, useEffect, useState } from 'react';
import { useChainId } from 'wagmi';
import { getExplorerLink } from '@/components/ui/EtherscanLink';
import { ShoppablePost } from './ShoppablePost';
import { PurchaseProofEvent } from './PurchaseProofEvent';

// ==================== TYPES ====================

type ActivityType =
  | 'product_share'
  | 'purchase_proof'
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
    productName?: string;
    productPrice?: string;
    productImage?: string;
    productType?: 'physical' | 'digital' | 'service';
    merchantSlug?: string;
    merchantName?: string;
    merchantAddress?: string;
    merchantProofScore?: number;
    buyerName?: string;
    buyerProofScore?: number;
  };
}

interface UnifiedActivityFeedProps {
  userAddress?: string;
  filter?: 'all' | 'social' | 'financial';
  limit?: number;
  className?: string;
}

// ==================== COMPONENT ====================

const SOCIAL_TYPES: ActivityType[] = ['post', 'comment', 'like', 'product_share', 'purchase_proof'];
const FINANCIAL_TYPES: ActivityType[] = [
  'tip_sent', 'tip_received',
  'content_purchased', 'content_sold',
  'payment_sent', 'payment_received',
];

interface ApiActivity {
  id: number;
  activity_type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  created_at: string;
  user_address?: string;
  user_username?: string;
  user_avatar?: string;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapApiActivity(a: ApiActivity): UnifiedActivity {
  const address = a.user_address ?? '';
  const data = a.data ?? {};
  return {
    id: String(a.id),
    type: a.activity_type as ActivityType,
    timestamp: new Date(a.created_at),
    actor: {
      address,
      name: a.user_username ?? (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Unknown'),
      avatar: a.user_avatar ?? '',
    },
    content: a.description || a.title || undefined,
    amount: typeof data.amount === 'string' ? data.amount : undefined,
    currency: data.currency === 'ETH' || data.currency === 'VFIDE' ? data.currency : undefined,
    metadata: {
      txHash: toOptionalString(data.txHash),
      contentType: toOptionalString(data.contentType),
      achievementName: toOptionalString(data.achievementName),
      productName: toOptionalString(data.productName),
      productPrice: toOptionalString(data.productPrice),
      productImage: toOptionalString(data.productImage),
      productType:
        data.productType === 'physical' || data.productType === 'digital' || data.productType === 'service'
          ? data.productType
          : undefined,
      merchantSlug: toOptionalString(data.merchantSlug),
      merchantName: toOptionalString(data.merchantName),
      merchantAddress: toOptionalString(data.merchantAddress),
      merchantProofScore: toOptionalNumber(data.merchantProofScore),
      buyerName: toOptionalString(data.buyerName),
      buyerProofScore: toOptionalNumber(data.buyerProofScore),
    },
  };
}

function renderSocialCommerceActivity(activity: UnifiedActivity): React.ReactElement | null {
  if (activity.type === 'product_share') {
    const productName = activity.metadata?.productName;
    const productPrice = activity.metadata?.productPrice;
    const merchantSlug = activity.metadata?.merchantSlug;
    const merchantName = activity.metadata?.merchantName;
    const merchantAddress = activity.metadata?.merchantAddress;

    if (!productName || !productPrice || !merchantSlug || !merchantName || !merchantAddress) {
      return null;
    }

    return (
      <ShoppablePost
        product={{
          id: activity.id,
          name: productName,
          price: productPrice,
          compareAtPrice: null,
          description: activity.content,
          imageUrl: activity.metadata?.productImage,
          merchantSlug,
          merchantName,
          merchantAddress,
          merchantProofScore: activity.metadata?.merchantProofScore,
          productType: activity.metadata?.productType,
        }}
        postedBy={{
          address: activity.actor.address,
          name: activity.actor.name,
          proofScore: activity.metadata?.buyerProofScore ?? 0,
        }}
        timestamp={activity.timestamp.getTime()}
        caption={activity.content}
      />
    );
  }

  if (activity.type === 'purchase_proof') {
    const productName = activity.metadata?.productName;
    const merchantName = activity.metadata?.merchantName;
    const merchantSlug = activity.metadata?.merchantSlug;
    const amount = activity.amount ?? activity.metadata?.productPrice;
    if (!productName || !merchantName || !merchantSlug || !amount) {
      return null;
    }

    return (
      <PurchaseProofEvent
        buyer={{
          address: activity.actor.address,
          name: activity.metadata?.buyerName ?? activity.actor.name,
          proofScore: activity.metadata?.buyerProofScore ?? 0,
        }}
        merchant={{
          name: merchantName,
          slug: merchantSlug,
          proofScore: activity.metadata?.merchantProofScore ?? 0,
        }}
        productName={productName}
        amount={amount}
        timestamp={activity.timestamp.getTime()}
      />
    );
  }

  return null;
}

export function UnifiedActivityFeed({
  filter = 'all',
  limit = 20,
  className = '',
}: Omit<UnifiedActivityFeedProps, 'userAddress'>) {
  const chainId = useChainId();
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      const res = await fetch(`/api/activities?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { activities: ApiActivity[] };
      const mapped = (json.activities ?? []).map(mapApiActivity);
      const filtered =
        filter === 'social'
          ? mapped.filter((a) => SOCIAL_TYPES.includes(a.type))
          : filter === 'financial'
          ? mapped.filter((a) => FINANCIAL_TYPES.includes(a.type))
          : mapped;
      setActivities(filtered);
    } catch {
      setActivities([]);
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
      case 'product_share':
        return <MessageCircle className="w-4 h-4" />;
      case 'purchase_proof':
        return <Unlock className="w-4 h-4" />;
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
      case 'product_share':
      case 'comment':
        return 'from-blue-500 to-cyan-500';
      case 'purchase_proof':
        return 'from-emerald-500 to-teal-500';
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
      case 'product_share':
        return 'shared a product';
      case 'purchase_proof':
        return 'completed a purchase';
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
        >
          {renderSocialCommerceActivity(activity) ?? (
            <div className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all group">
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
                      href={getExplorerLink(chainId, activity.metadata.txHash, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-block"
                    >
                      View on Etherscan →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
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
