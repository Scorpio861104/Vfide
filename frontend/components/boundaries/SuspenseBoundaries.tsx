import { Suspense } from 'react';
import { 
  MessageListSkeleton, 
  FriendListSkeleton, 
  GroupListSkeleton,
  AchievementListSkeleton,
  SkeletonCard,
} from '@/components/ui/Skeleton';

/**
 * Pre-configured Suspense boundaries for common components
 */

export function MessagesSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<MessageListSkeleton count={5} />}>
      {children}
    </Suspense>
  );
}

export function FriendsSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FriendListSkeleton count={6} />}>
      {children}
    </Suspense>
  );
}

export function GroupsSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<GroupListSkeleton count={4} />}>
      {children}
    </Suspense>
  );
}

export function AchievementsSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AchievementListSkeleton count={6} />}>
      {children}
    </Suspense>
  );
}

export function DashboardSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SkeletonCard className="col-span-full" />}>
      {children}
    </Suspense>
  );
}

export function GenericSuspense({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback || <SkeletonCard />}>
      {children}
    </Suspense>
  );
}
