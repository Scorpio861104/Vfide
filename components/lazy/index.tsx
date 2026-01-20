'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// Social Components - Lazy loaded with loading states
export const MessagingCenter = dynamic(
  () => import('@/components/social/MessagingCenter').then(mod => ({ default: mod.MessagingCenter })),
  {
    loading: () => (
      <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <Skeleton height={24} className="w-1/3 mb-2" />
          <Skeleton height={16} className="w-1/2" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton height={60} width={200} rounded="lg" />
            </div>
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const FriendsList = dynamic(
  () => import('@/components/social/FriendsList').then(mod => ({ default: mod.FriendsList })),
  {
    loading: () => (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
            <Skeleton width={40} height={40} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={16} className="w-3/5" />
              <Skeleton height={12} className="w-2/5" />
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
);

export const GroupMessaging = dynamic(
  () => import('@/components/social/GroupMessaging').then(mod => ({ default: mod.GroupMessaging })),
  {
    loading: () => (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Skeleton width={48} height={48} rounded="full" />
              <div className="flex-1 space-y-2">
                <Skeleton height={18} className="w-4/5" />
                <Skeleton height={14} className="w-2/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
);

export const EndorsementsBadges = dynamic(
  () => import('@/components/social/EndorsementsBadges').then(mod => ({ default: mod.EndorsementsBadges })),
  {
    loading: () => (
      <div className="p-4">
        <Skeleton height={24} className="w-2/5 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} height={80} rounded="lg" />
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const ActivityFeed = dynamic(
  () => import('@/components/social/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })),
  {
    loading: () => (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-3 p-3 bg-zinc-900 rounded-lg">
            <Skeleton width={40} height={40} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={14} className="w-full" />
              <Skeleton height={12} className="w-3/4" />
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
);

// Gamification Components
export const UserStatsWidget = dynamic(
  () => import('@/components/gamification/GamificationWidgets').then(mod => ({ default: mod.UserStatsWidget })),
  {
    loading: () => (
      <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
        <Skeleton height={20} className="w-1/3 mb-3" />
        <Skeleton height={8} className="w-full mb-2" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const AchievementsList = dynamic(
  () => import('@/components/gamification/GamificationWidgets').then(mod => ({ default: mod.AchievementsList })),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Skeleton width={48} height={48} rounded="full" />
              <div className="flex-1 space-y-2">
                <Skeleton height={16} className="w-4/5" />
                <Skeleton height={12} className="w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
);

// Dashboard Components
export const VaultDisplay = dynamic(
  () => import('@/components/dashboard/VaultDisplay'),
  {
    loading: () => (
      <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
        <Skeleton height={28} className="w-1/3 mb-4" />
        <div className="space-y-3">
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </div>
      </div>
    ),
  }
);

export const AssetBalances = dynamic(
  () => import('@/components/dashboard/AssetBalances'),
  {
    loading: () => (
      <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
        <Skeleton height={24} className="w-1/4 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
              <Skeleton width={40} height={40} rounded="full" />
              <div className="flex-1 ml-3 space-y-2">
                <Skeleton height={16} className="w-1/2" />
                <Skeleton height={12} className="w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

// Modal Components - Load only when needed
export const TransactionModal = dynamic(
  () => import('@/components/modals/TransactionModal'),
  { ssr: false }
);

export const DepositModal = dynamic(
  () => import('@/components/modals/DepositModal'),
  { ssr: false }
);

export const WithdrawModal = dynamic(
  () => import('@/components/modals/WithdrawModal'),
  { ssr: false }
);

export const SwapModal = dynamic(
  () => import('@/components/modals/SwapModal'),
  { ssr: false }
);

// Heavy Charts - Load only when visible
export const PerformanceChart = dynamic(
  () => import('@/components/charts/PerformanceChart'),
  {
    loading: () => (
      <div className="w-full h-64 flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800">
        <Skeleton height={200} className="w-full" />
      </div>
    ),
    ssr: false,
  }
);

export const AllocationChart = dynamic(
  () => import('@/components/charts/AllocationChart'),
  {
    loading: () => (
      <div className="w-full h-64 flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800">
        <Skeleton width={200} height={200} rounded="full" />
      </div>
    ),
    ssr: false,
  }
);
