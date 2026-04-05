/**
 * LazyComponents — Dynamic imports for heavy components
 *
 * On a $60 Android phone, loading 2MB of JS for a page the user
 * hasn't visited yet kills the experience. These wrappers ensure
 * heavy components are only loaded when needed.
 *
 * Rules:
 *   - Any component > 500 LOC gets a lazy wrapper
 *   - Media components (Reels, Live, Voice) always lazy
 *   - PieMenu enhancements lazy (not needed on first render)
 *   - Fallback shows a minimal skeleton, not a spinner
 */
'use client';

import dynamic from 'next/dynamic';
import type React from 'react';

// ── Skeleton fallbacks (fast, lightweight, no animation library) ─────────

function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
      <div className="h-32 bg-white/3 rounded-xl mb-2" />
      <div className="h-3 bg-white/5 rounded w-2/3" />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse p-4 bg-white/2 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-white/5" />
            <div className="flex-1"><div className="h-3 bg-white/5 rounded w-24" /><div className="h-2 bg-white/3 rounded w-16 mt-1" /></div>
          </div>
          <div className="h-3 bg-white/5 rounded w-full mb-1.5" />
          <div className="h-3 bg-white/5 rounded w-4/5" />
        </div>
      ))}
    </div>
  );
}

function FullScreenSkeleton() {
  return <div className="fixed inset-0 bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" /></div>;
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-white/5 rounded-lg" />
      {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-white/3 rounded-lg" />)}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-4 bg-white/5 rounded w-1/4" />
      <div className="h-10 bg-white/3 rounded-xl" />
      <div className="h-4 bg-white/5 rounded w-1/3" />
      <div className="h-10 bg-white/3 rounded-xl" />
      <div className="h-10 bg-white/5 rounded-xl w-1/2" />
    </div>
  );
}

// ── Helper: wrap dynamic import with proper loading state ────────────────

function lazyLoad(
  importFn: () => Promise<{ default: any }>,
  fallback: React.ReactNode = <CardSkeleton />
) {
  const LazyComponent = dynamic(importFn as any, {
    loading: () => <>{fallback}</>,
    ssr: false,
  }) as any;
  return LazyComponent;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SOCIAL COMPONENTS (heaviest — media handling)
// ═══════════════════════════════════════════════════════════════════════════

export const LazyReelsViewer = lazyLoad(
  () => import('@/components/social/ProductReels').then(m => ({ default: m.ReelsViewer })),
  <FullScreenSkeleton />
);

export const LazyLiveViewer = lazyLoad(
  () => import('@/components/social/LiveSelling').then(m => ({ default: m.LiveViewer })),
  <FullScreenSkeleton />
);

export const LazyMarketVibesCapture = lazyLoad(
  () => import('@/components/social/MarketVibes').then(m => ({ default: m.MarketVibesCapture })),
  <FullScreenSkeleton />
);

export const LazyVoiceNoteRecorder = lazyLoad(
  () => import('@/components/social/VoiceNote').then(m => ({ default: m.VoiceNoteRecorder })),
  <div className="h-10 w-10 animate-pulse bg-white/5 rounded-full" />
);

export const LazyAIProductListing = lazyLoad(
  () => import('@/components/social/AIProductListing').then(m => ({ default: m.AIProductListing })),
  <FullScreenSkeleton />
);

export const LazyCreatorDashboard = lazyLoad(
  () => import('@/components/social/CreatorDashboard').then(m => ({ default: (m as any).CreatorDashboard ?? (m as any).default })),
  <TableSkeleton />
);

// ═══════════════════════════════════════════════════════════════════════════
//  MERCHANT COMPONENTS (data-heavy)
// ═══════════════════════════════════════════════════════════════════════════

export const LazySeasonalTrends = lazyLoad(
  () => import('@/components/analytics/SeasonalTrends').then(m => ({ default: (m as any).SeasonalTrends ?? (m as any).default })),
  <TableSkeleton />
);

export const LazyPeerMediation = lazyLoad(
  () => import('@/components/merchant/disputes/PeerMediation').then(m => ({ default: (m as any).PeerMediation ?? (m as any).default })),
  <CardSkeleton />
);

export const LazyMerchantTraining = lazyLoad(
  () => import('@/components/merchant/training/MerchantTraining').then(m => ({ default: (m as any).MerchantTraining ?? (m as any).default })),
  <FullScreenSkeleton />
);

// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGATION ENHANCEMENTS (not needed on first paint)
// ═══════════════════════════════════════════════════════════════════════════

export const LazyPieMenuEnhancements = lazyLoad(
  () => import('@/components/navigation/PieMenuEnhancements').then(m => ({ default: m.ProofScoreRing as any })),
  null
);

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORT SKELETONS (for use in page-level Suspense boundaries)
// ═══════════════════════════════════════════════════════════════════════════

export { CardSkeleton, FeedSkeleton, FullScreenSkeleton, TableSkeleton, FormSkeleton };
